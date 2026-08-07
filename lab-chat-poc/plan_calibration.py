"""Turn a turn's own tokens into "percentage points of the subscription plan".

The problem this solves
-----------------------
`usage_limits.py` measures plan consumption by snapshotting `GET /api/oauth/usage` before
and after a turn and subtracting. That endpoint is ACCOUNT-WIDE -- no session, chat or
process dimension -- so the delta is really "everything my whole account consumed during
this turn's wall-clock span". Two chats at once and each bills itself for both; an
interactive Claude Code session, Claude Desktop or claude.ai in a browser all land in the
same bucket. `delta()` drops negatives, so contamination can only ever INFLATE.

Tokens have none of that problem: they come from the turn's own CLI process. So instead of
measuring plan cost per turn, we measure the CONVERSION once and compute it per turn.

Why per token type, and not via cost
------------------------------------
The first version of this module converted through money -- `est_pp = api_cost_usd * k`,
one scalar -- which assumes the plan weights token types the way the RATE CARD does.
Measured against the log (6 fully-measured chats, 5-hour window), that assumption fails:

    model form                          R2      adj R2
    price-proportional (1 scalar)     0.067      --      <- what we used to do
    output + cache_write (2 weights)  0.633    0.388
    all three (3 weights)             0.895    0.738     <- but cache_read goes NEGATIVE

Cost and plan consumption are simply different functions of the same tokens. Cache reads
are ~95% of token volume and a large share of the bill, yet contribute nothing measurable
to plan usage -- their fitted weight goes negative whenever included, which is physically
impossible and means "indistinguishable from zero". Plan windows appear to be driven by
GENERATION (output) and by cache WRITES, not by re-reading cached context.

So the model is a weight per token type, with cache reads pinned at zero:

    est_pp = output_tokens * w_output + cache_write_tokens * w_cache_write

Fitting it against one-sided noise
----------------------------------
Contamination only ever inflates a measurement, so the true surface lies at or BELOW every
observation. Least squares ignores that and splits the difference; the right estimator is
the LOWER ENVELOPE -- the largest weights whose prediction never exceeds an observed value.
That is a small linear program, and its optimum sits at a vertex, so with two weights it is
found by enumerating pairs of binding chats (plus the axis cases). This generalises the
minimum-ratio trick the scalar version used, which is the same estimator in one dimension.

The estimate is therefore CONSERVATIVE by construction: the true weights are feasible, and
the envelope is the largest feasible choice, so in aggregate it sits at or above the truth.
For a "how many seats?" question it errs toward too many, not too few -- and it tightens as
cleaner data arrives.

    python plan_calibration.py                 # fit from the log, show the evidence
    python plan_calibration.py --save          # store it
    python plan_calibration.py --show          # print what is stored
    python plan_calibration.py --clear         # forget it
"""

from __future__ import annotations

import csv
import itertools
import json
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

CALIBRATION_PATH = Path(__file__).resolve().parent / "plan_calibration.json"
LOG_PATH = Path(__file__).resolve().parent / "cost_log.csv"

WINDOWS = ("five_hour", "seven_day")

# The token types we fit a weight for. `cache_read` and `input` are deliberately absent:
# reads fit negative (see the module docstring) and input is 5-250 tokens a chat, which is
# four orders of magnitude below the others and cannot be identified.
FITTED_TERMS = ("output", "cache_write")

# A chat qualifies only if EVERY one of its turns carries a measured pp. A blank means the
# usage endpoint was unavailable, which is not the same as zero -- summing blanks as zeros
# is what made an unmeasured chat look like a large chat that consumed nothing.
MIN_PP_FOR_FIT = 1.0


def load() -> dict | None:
    """The stored calibration, or None when nothing has been fitted yet."""
    if not CALIBRATION_PATH.exists():
        return None
    try:
        with CALIBRATION_PATH.open(encoding="utf-8") as f:
            data = json.load(f)
    except (OSError, json.JSONDecodeError):
        return None
    return data if isinstance(data, dict) else None


def save(data: dict) -> None:
    with CALIBRATION_PATH.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
        f.write("\n")


def tokens_from_usage(usage: dict | None) -> dict[str, int]:
    """The token counts this model needs, out of a result-JSON `usage` block."""
    usage = usage or {}
    creation = usage.get("cache_creation")
    if isinstance(creation, dict):
        write = int(creation.get("ephemeral_5m_input_tokens") or 0) + int(
            creation.get("ephemeral_1h_input_tokens") or 0
        )
    else:
        write = 0
    return {
        "output": int(usage.get("output_tokens") or 0),
        # 5-minute and 1-hour writes share a weight: every write observed so far has been
        # 1-hour, so there is no evidence on which to separate them.
        "cache_write": write or int(usage.get("cache_creation_input_tokens") or 0),
        "cache_read": int(usage.get("cache_read_input_tokens") or 0),
        "input": int(usage.get("input_tokens") or 0),
    }


def estimate_pp(tokens: dict[str, int] | None, window: str = "seven_day") -> float | None:
    """Plan cost of a turn in percentage points, or None if uncalibrated."""
    if not tokens:
        return None
    data = load()
    if not data:
        return None
    weights = (data.get("pp_per_mtok") or {}).get(window)
    if not isinstance(weights, dict) or not weights:
        return None
    total = 0.0
    for term, weight in weights.items():
        total += (tokens.get(term) or 0) / 1_000_000 * float(weight)
    return total


def tokens_from_row(row: dict) -> dict[str, int]:
    """The same token counts, out of a logged CSV row instead of a live result."""

    def n(field: str) -> int:
        try:
            return int(float(row.get(field) or 0))
        except (TypeError, ValueError):
            return 0

    write = n("cache_write_5m_tokens") + n("cache_write_1h_tokens")
    return {
        "output": n("output_tokens"),
        "cache_write": write or n("cache_creation_tokens"),
        "cache_read": n("cache_read_tokens"),
        "input": n("input_tokens"),
    }


def _chat_totals(rows: list[dict]) -> dict[str, dict]:
    """Per chat: summed token types, summed pp, and whether every turn was measured."""

    def n(row: dict, field: str) -> int:
        try:
            return int(float(row.get(field) or 0))
        except (TypeError, ValueError):
            return 0

    chats: dict[str, dict] = defaultdict(
        lambda: {"turns": 0, "measured": 0, "output": 0, "cache_write": 0,
                 "cache_read": 0, "input": 0, **{w: 0.0 for w in WINDOWS}}
    )
    for row in rows:
        key = row.get("chat_id") or row.get("timestamp_utc") or "(no id)"
        bucket = chats[key]
        bucket["turns"] += 1
        for term, count in tokens_from_row(row).items():
            bucket[term] += count

        # Blank is "never measured", not zero.
        raw = [(row.get(f"{w}_pp") or "").strip() for w in WINDOWS]
        if any(value != "" for value in raw):
            bucket["measured"] += 1
            for window, value in zip(WINDOWS, raw):
                try:
                    bucket[window] += float(value or 0)
                except ValueError:
                    pass
    return dict(chats)


def _envelope(points: list[tuple[list[float], float]]) -> list[float] | None:
    """Largest non-negative weights whose prediction never exceeds an observation.

    `points` is [(features, observed)] with features already in millions of tokens. The
    optimum of the underlying LP is at a vertex, so for two features it is enough to
    enumerate every pair of chats made binding, plus the two single-axis cases.
    """
    if not points:
        return None
    count = len(points[0][0])
    if count != 2:  # keep the solver honest about what it actually implements
        raise ValueError("the vertex enumeration below assumes exactly two fitted terms")

    xs = [p[0] for p in points]
    ys = [p[1] for p in points]

    def feasible(weights: list[float]) -> bool:
        if any(w < -1e-9 for w in weights):
            return False
        return all(
            sum(weights[j] * xs[i][j] for j in range(count)) <= ys[i] + 1e-9
            for i in range(len(xs))
        )

    def score(weights: list[float]) -> float:
        return sum(sum(weights[j] * x[j] for j in range(count)) for x in xs)

    best: list[float] | None = None
    for i, j in itertools.combinations(range(len(xs)), 2):
        det = xs[i][0] * xs[j][1] - xs[j][0] * xs[i][1]
        if abs(det) < 1e-12:
            continue
        a = (ys[i] * xs[j][1] - ys[j] * xs[i][1]) / det
        b = (xs[i][0] * ys[j] - xs[j][0] * ys[i]) / det
        if feasible([a, b]) and (best is None or score([a, b]) > score(best)):
            best = [a, b]
    for i in range(len(xs)):  # vertices with one weight pinned to zero
        for axis in range(count):
            if xs[i][axis] <= 0:
                continue
            candidate = [0.0, 0.0]
            candidate[axis] = ys[i] / xs[i][axis]
            if feasible(candidate) and (best is None or score(candidate) > score(best)):
                best = candidate
    return best


def fit(rows: list[dict]) -> dict:
    """Fit per-token-type weights per window, plus the evidence behind them."""
    chats = _chat_totals(rows)
    usable = {
        key: bucket
        for key, bucket in chats.items()
        if bucket["turns"] > 0 and bucket["measured"] == bucket["turns"]
    }

    result: dict = {"pp_per_mtok": {}, "samples": {}, "binding": {}, "headroom": {}}
    for window in WINDOWS:
        points, keys = [], []
        for key, bucket in sorted(usable.items()):
            if bucket[window] < MIN_PP_FOR_FIT:
                continue
            points.append(([bucket[term] / 1_000_000 for term in FITTED_TERMS], bucket[window]))
            keys.append(key)
        if len(points) < 2:
            continue
        weights = _envelope(points)
        if weights is None:
            continue
        result["pp_per_mtok"][window] = dict(zip(FITTED_TERMS, weights))
        result["samples"][window] = len(points)
        # Chats the envelope touches are the least-contaminated evidence; the headroom on
        # the others is the most that concurrent work could have added to them.
        gaps = {
            keys[i]: round(points[i][1] - sum(weights[j] * points[i][0][j]
                                              for j in range(len(weights))), 2)
            for i in range(len(points))
        }
        result["binding"][window] = [k for k, gap in gaps.items() if abs(gap) < 1e-6]
        result["headroom"][window] = gaps
    return result


def _load_rows() -> list[dict]:
    if not LOG_PATH.exists():
        return []
    with LOG_PATH.open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def _print_fit(fitted: dict, chats: dict[str, dict]) -> None:
    print("Per-chat evidence")
    print("-" * 78)
    print(f"{'chat':<11}{'turns':>6}{'meas':>6}{'output':>10}{'cache_wr':>11}"
          f"{'cache_rd':>11}{'5h pp':>8}{'7d pp':>8}")
    for key, bucket in sorted(chats.items()):
        complete = bucket["measured"] == bucket["turns"]
        flag = "" if complete else "  (partial — excluded)"
        print(f"{key[:9]:<11}{bucket['turns']:>6}{bucket['measured']:>6}{bucket['output']:>10}"
              f"{bucket['cache_write']:>11}{bucket['cache_read']:>11}"
              f"{bucket['five_hour']:>8.0f}{bucket['seven_day']:>8.0f}{flag}")

    if not fitted["pp_per_mtok"]:
        print("\nNot enough fully-measured chats to fit weights yet (need at least 2 per window).")
        return

    print("\nFitted weights — pp per MILLION tokens (lower envelope)")
    print("-" * 78)
    for window in WINDOWS:
        weights = fitted["pp_per_mtok"].get(window)
        if not weights:
            print(f"  {window:<12} no fit")
            continue
        terms = "  ".join(f"{t}={w:.1f}" for t, w in weights.items())
        print(f"  {window:<12} {terms}    (cache_read=0, input=0 — see module docstring)")
        print(f"  {'':<12} from {fitted['samples'][window]} chat(s); "
              f"binding: {', '.join(k[:8] for k in fitted['binding'][window]) or 'none'}")

    print("\n  Headroom per chat = measured pp not explained by that chat's own tokens,")
    print("  i.e. the most that concurrent work could have contributed:")
    for window in WINDOWS:
        gaps = fitted["headroom"].get(window)
        if not gaps:
            continue
        shown = "  ".join(f"{k[:8]}:{v:+.1f}" for k, v in sorted(gaps.items()))
        print(f"    {window:<11} {shown}")

    total = sum(len(v) for v in fitted["headroom"].values())
    if total < 12:
        print("\n  NOTE: this is a thin fit. The weights are an upper bound that tightens as")
        print("  cleaner data arrives — re-run --save after a few chats have run with nothing")
        print("  else touching the account.")


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    args = sys.argv[1:]

    if "--clear" in args:
        if CALIBRATION_PATH.exists():
            CALIBRATION_PATH.unlink()
            print(f"Removed {CALIBRATION_PATH.name}.")
        else:
            print("Nothing stored.")
        return 0

    if "--show" in args:
        data = load()
        print(json.dumps(data, indent=2) if data else "Nothing stored — run without --show to fit.")
        return 0

    rows = _load_rows()
    if not rows:
        print(f"No data yet: {LOG_PATH.name} is missing or empty.")
        return 1

    fitted = fit(rows)
    _print_fit(fitted, _chat_totals(rows))

    if "--save" not in args:
        print("\n(nothing saved — re-run with --save to store this)")
        return 0
    if not fitted["pp_per_mtok"]:
        print("\nNothing to save.", file=sys.stderr)
        return 1

    save({
        "pp_per_mtok": fitted["pp_per_mtok"],
        "fitted_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "method": "lower envelope over fully-measured chats; cache_read and input pinned to 0",
        "samples": fitted["samples"],
        "binding": fitted["binding"],
        "headroom": fitted["headroom"],
    })
    print(f"\nSaved to {CALIBRATION_PATH.name}. New turns will fill est_plan_pp.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
