"""Summarize cost_log.csv into the numbers behind the "per-seat vs API key" decision.

    python cost_report.py            # per-chat breakdown + per-month totals
    python cost_report.py 2026-07    # one month
    python cost_report.py --totals   # skip the per-chat detail

Every chat turn appends one row (see cost_log.py). Two currencies of cost are tracked:
API-equivalent money, and percentage points of the subscription's 5-hour / 7-day
windows. The second one is what tells you how many seats a team would actually need.

Money comes from `api_cost_eur` -- computed from each turn's own tokens at published list
rates (pricing.py) -- and falls back to the CLI's own `cost_eur` only for rows too old to
carry tokens. The two differ: the CLI's figure prices Opus 5 tokens at Sonnet 5's card,
a uniform 0.6x. Reports written before 2026-08-06 therefore understate by ~1.67x.
"""

import csv
import sys
from collections import defaultdict
from pathlib import Path

import plan_calibration
from cost_log import EUR_PER_USD

LOG_PATH = Path(__file__).resolve().parent / "cost_log.csv"


def _f(value: str) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _eur(row: dict) -> float:
    """A row's API-equivalent cost, preferring the published-rate figure."""
    return _f(row.get("api_cost_eur") or "") or _f(row.get("cost_eur") or "")


def _weights() -> dict[str, dict]:
    """Fitted pp-per-million-token weights per window, or {} if never calibrated."""
    return (plan_calibration.load() or {}).get("pp_per_mtok") or {}


def _est_pp(row: dict, window: str, weights: dict[str, dict]) -> float | None:
    """A row's plan cost in percentage points, derived from its own tokens.

    Used in preference to the measured `*_pp` columns at question level for two reasons:
    the endpoint reports WHOLE percentage points, so a single question almost always
    measures as 0 and tells you nothing; and its figure is account-wide, so a question
    asked while something else was running is credited with that too. The derived number
    has real resolution and belongs to the question that caused it.
    """
    per_window = weights.get(window)
    if not per_window:
        return None
    tokens = plan_calibration.tokens_from_row(row)
    return sum(
        (tokens.get(term) or 0) / 1_000_000 * float(weight)
        for term, weight in per_window.items()
    )


def _dur(seconds: float) -> str:
    seconds = int(round(seconds))
    return f"{seconds}s" if seconds < 60 else f"{seconds // 60}m {seconds % 60:02d}s"


def _reads(eur: float, seconds: float, five: float | None, seven: float | None) -> str:
    """The one-line reading: what it cost, how long, and what it ate.

    Percentages of an allowance are what make the money figure mean something -- €2.49 is
    abstract, "€2.49 and 12% of a session" is a decision.
    """
    parts = [f"€{eur:.2f}", _dur(seconds)]
    if five is not None:
        parts.append(f"{five:.0f}% of a 5-hour session" if five >= 1
                     else f"{five:.1f}% of a 5-hour session")
    if seven is not None:
        parts.append(f"{seven:.1f}% of the week")
    return " · ".join(parts)


def _produced_work(row: dict) -> bool:
    """False for a run that consumed no tokens at all.

    A turn that died on startup -- expired OAuth, a CLI that never came up -- still logs a
    row, with `status: success` and every token count at zero. Counting it as a chat adds a
    conversation that never happened and drags the per-chat average down. Measured
    2026-08-06: one such row, from the session where the OAuth token had expired.
    """
    return any(
        _f(row.get(field) or "")
        for field in ("input_tokens", "output_tokens",
                      "cache_read_tokens", "cache_creation_tokens")
    )


def _load(month_filter: str | None) -> list[dict]:
    with LOG_PATH.open(newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    if month_filter:
        rows = [r for r in rows if (r.get("timestamp_utc") or "")[:7] == month_filter]
    dropped = [r for r in rows if not _produced_work(r)]
    if dropped:
        print(f"({len(dropped)} run(s) excluded — no tokens consumed, i.e. failed before "
              f"they started)")
    return [r for r in rows if _produced_work(r)]


def _print_chats(rows: list[dict], weights: dict[str, dict]) -> None:
    """One block per chat: every question read back in plain language."""
    chats: dict[str, list[dict]] = defaultdict(list)
    order_seen: list[str] = []
    for row in rows:
        key = row.get("chat_id") or f"(no id) {row.get('timestamp_utc','')}"
        if key not in chats:
            order_seen.append(key)
        chats[key].append(row)

    print("\nEvery conversation, question by question")
    print("=" * 74)
    for index, key in enumerate(order_seen, start=1):
        turns = sorted(chats[key], key=lambda r: int(r.get("turn") or 0))
        date = (turns[0].get("timestamp_utc") or "")[:10]
        subject = turns[0].get("order", "?")
        channel = turns[0].get("channel") or "lab"
        noun = "order" if channel == "lab" else "ticket"
        questions = [t for t in turns if t.get("kind") != "wrapup"]
        print(f"\nChat {index} — {date} — {channel} — {noun} {subject} — "
              f"{len(questions)} question(s)")

        for turn in turns:
            text = " ".join((turn.get("question") or "").split())
            if len(text) > 62:
                text = text[:61] + "…"
            tag = "wrap-up" if turn.get("kind") == "wrapup" else f"Q{turn.get('turn')}"
            print(f"  {tag:<8} {text}")
            print(f"  {'':<8} {_reads(_eur(turn), _f(turn.get('duration_s')),
                                      _est_pp(turn, 'five_hour', weights),
                                      _est_pp(turn, 'seven_day', weights))}")

        total_eur = sum(_eur(t) for t in turns)
        total_s = sum(_f(t.get("duration_s")) for t in turns)
        est5 = [_est_pp(t, "five_hour", weights) for t in turns]
        est7 = [_est_pp(t, "seven_day", weights) for t in turns]
        sum5 = sum(v for v in est5 if v is not None) if any(v is not None for v in est5) else None
        sum7 = sum(v for v in est7 if v is not None) if any(v is not None for v in est7) else None
        # A one-turn chat's total is its only line -- printing it twice is just noise.
        if len(turns) > 1:
            print(f"  {'':<8} {'-' * 62}")
            print(f"  {'whole':<8} {_reads(total_eur, total_s, sum5, sum7)}")

        # The account-wide measurement, where it exists, as a cross-check on the derived
        # numbers above. It reads high whenever something else was running at the time.
        m5 = sum(_f(t.get("five_hour_pp", "")) for t in turns)
        m7 = sum(_f(t.get("seven_day_pp", "")) for t in turns)
        if m5 or m7:
            print(f"  {'':<8} (measured at the time: 5h +{m5:.0f}pp · 7-day +{m7:.0f}pp)")
    print()


def _print_channels(rows: list[dict], weights: dict[str, dict]) -> None:
    """Lab questions and helpdesk tickets are different units of work, so price them apart.

    A ticket carries scraper intake, customer software and logs; a lab question often
    does not. Averaging the two together hides exactly the difference you need to see.
    """
    by_channel: dict[str, dict] = defaultdict(
        lambda: {"eur": 0.0, "chats": set(), "5h": 0.0, "s": 0.0})
    for row in rows:
        bucket = by_channel[row.get("channel") or "lab"]
        bucket["eur"] += _eur(row)
        bucket["chats"].add(row.get("chat_id") or row.get("timestamp_utc"))
        bucket["s"] += _f(row.get("duration_s"))
        # Derived, not measured, so the two channels are compared on the same basis as
        # everything else on this report.
        bucket["5h"] += _est_pp(row, "five_hour", weights) or 0.0

    if len(by_channel) < 2:
        return  # nothing to compare yet

    print("By kind of work")
    print("-" * 74)
    print(f"{'':<16}{'chats':>7}{'EUR/chat':>11}{'time/chat':>12}{'% of a session':>17}")
    for channel in sorted(by_channel):
        bucket = by_channel[channel]
        chats = len(bucket["chats"])
        label = "lab question" if channel == "lab" else "service ticket"
        print(f"{label:<16}{chats:>7}{bucket['eur'] / chats:>11.2f}"
              f"{_dur(bucket['s'] / chats):>12}{bucket['5h'] / chats:>16.1f}%")
    print()


def _print_months(rows: list[dict], weights: dict[str, dict]) -> None:
    by_month: dict[str, dict] = defaultdict(lambda: {"eur": 0.0, "chats": set(), "questions": 0, "seven": 0.0})
    for row in rows:
        month = (row.get("timestamp_utc") or "")[:7]
        bucket = by_month[month]
        bucket["eur"] += _eur(row)
        bucket["chats"].add(row.get("chat_id") or row.get("timestamp_utc"))
        if row.get("kind") != "wrapup":
            bucket["questions"] += 1
        bucket["seven"] += _f(row.get("seven_day_pp", ""))

    print("Monthly totals (API-equivalent)")
    print("=" * 72)
    print(f"{'month':<10}{'chats':>8}{'questions':>11}{'total EUR':>12}{'EUR/chat':>11}{'7d pp':>9}")
    print("-" * 72)
    total_eur = 0.0
    total_chats = 0
    total_questions = 0
    for month in sorted(by_month):
        bucket = by_month[month]
        chats = len(bucket["chats"])
        total_eur += bucket["eur"]
        total_chats += chats
        total_questions += bucket["questions"]
        print(f"{month:<10}{chats:>8}{bucket['questions']:>11}{bucket['eur']:>12.2f}"
              f"{bucket['eur'] / chats:>11.2f}{bucket['seven']:>9.1f}")
    print("-" * 72)
    print(f"{'ALL':<10}{total_chats:>8}{total_questions:>11}{total_eur:>12.2f}"
          f"{total_eur / total_chats:>11.2f}")
    print()
    _print_channels(rows, weights)
    _print_average(rows, weights, total_chats, total_questions, total_eur)
    print(f"\n(euros at {EUR_PER_USD} EUR/USD — set LAB_CHAT_EUR_PER_USD to change)")


def _print_average(rows: list[dict], weights: dict[str, dict],
                   total_chats: int, total_questions: int, total_eur: float) -> None:
    """The headline: what one conversation costs, and how many of them fit."""
    per_chat: dict[str, dict] = defaultdict(lambda: {"eur": 0.0, "s": 0.0, "5h": 0.0, "7d": 0.0})
    for row in rows:
        key = row.get("chat_id") or row.get("timestamp_utc") or ""
        bucket = per_chat[key]
        bucket["eur"] += _eur(row)
        bucket["s"] += _f(row.get("duration_s"))
        bucket["5h"] += _est_pp(row, "five_hour", weights) or 0.0
        bucket["7d"] += _est_pp(row, "seven_day", weights) or 0.0

    n = len(per_chat) or 1
    avg_eur = total_eur / n
    avg_s = sum(b["s"] for b in per_chat.values()) / n
    avg_5h = sum(b["5h"] for b in per_chat.values()) / n
    avg_7d = sum(b["7d"] for b in per_chat.values()) / n

    print("The average conversation")
    print("=" * 74)
    print(f"  costs      {'€' + format(avg_eur, '.2f'):>8}       what it would cost to buy on the API")
    print(f"  takes      {_dur(avg_s):>8}       start to finish")
    if avg_5h > 0:
        print(f"  uses       {avg_5h:>7.1f}%       of a 5-hour session")
        print(f"             {avg_7d:>7.1f}%       of the weekly allowance")

        per_session = 100 / avg_5h
        per_week = 100 / avg_7d
        # A working day is about 1.6 five-hour windows, so the session allowance caps the
        # day well before the weekly one does unless the days are very long.
        per_day_session = per_session * (8 / 5)
        per_day_week = per_week / 5
        print()
        print(f"  →  about {per_session:>4.0f} conversations per 5-hour session")
        print(f"  →  about {per_week:>4.0f} conversations per week")
        print(f"  →  about {min(per_day_session, per_day_week):>4.0f} in a normal working day")
        print()
        if per_day_session < per_day_week:
            print("  The 5-hour window is what actually limits you, not the weekly one:")
            print(f"  a full day of work fits ~{per_day_session:.0f} conversations, while the week")
            print(f"  would allow ~{per_day_week:.0f} a day. Spreading work out does not help;")
            print("  waiting for the session window to roll over does.")
        else:
            print("  The weekly allowance is the binding limit — the 5-hour window would")
            print(f"  allow ~{per_day_session:.0f} conversations a day, but the week only supports "
                  f"~{per_day_week:.0f}.")
        print()
        print("  Derived from each conversation's own tokens, so nothing else running on")
        print("  the account distorts it — but it rests on a fitted conversion.")
        print("  Check or refresh it with:  python plan_calibration.py")
    else:
        print("\n  No allowance figures yet — fit the conversion once with:")
        print("      python plan_calibration.py --save")

    print(f"\n  ({total_chats} conversations, {total_questions} questions, "
          f"€{total_eur:.2f} total)")

    # The account-wide measurement, as a sanity check on the derived weekly rate above.
    measured: dict[str, float] = defaultdict(float)
    for row in rows:
        measured[row.get("chat_id") or row.get("timestamp_utc") or ""] += _f(
            row.get("seven_day_pp", ""))
    measured = {k: v for k, v in measured.items() if v > 0}
    if measured and avg_7d > 0:
        per_week = 100 / (sum(measured.values()) / len(measured))
        print(f"  (cross-check: the {len(measured)} chats measured directly suggest "
              f"~{per_week:.0f} per week;")
        print("   that figure counts anything else running at the time, so it reads low.)")


def main() -> None:
    # The Windows console defaults to cp1252, which cannot render € or the arrows.
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    if not LOG_PATH.exists():
        print(f"No data yet: {LOG_PATH.name} does not exist. Run a chat first.")
        return

    args = [a for a in sys.argv[1:]]
    show_chats = "--totals" not in args
    month_filter = next((a for a in args if not a.startswith("--")), None)

    rows = _load(month_filter)
    if not rows:
        print(f"No matching runs{' for ' + month_filter if month_filter else ''}.")
        return

    # Loaded once and threaded through: every percentage on the report comes from these,
    # so they must be the same set for the per-question lines and the averages.
    weights = _weights()

    if show_chats:
        _print_chats(rows, weights)
    _print_months(rows, weights)
    _nudge_refit()


def _nudge_refit() -> None:
    """Say so when the log holds measured chats the stored calibration hasn't seen.

    A clean chat only improves the numbers once it is fitted, and the fit is manual. This
    is the one place the gap is visible, so it is the right place to point it out.
    """
    stored = plan_calibration.load()
    if not stored:
        return
    with LOG_PATH.open(newline="", encoding="utf-8") as f:
        every_row = list(csv.DictReader(f))
    fresh = plan_calibration.fit(every_row).get("samples") or {}
    was = stored.get("samples") or {}
    gained = {w: fresh[w] - was.get(w, 0) for w in fresh if fresh[w] > was.get(w, 0)}
    if not gained:
        return
    most = max(gained.values())
    print(f"\n  NOTE: {most} fully-measured chat(s) have been logged since the weights were")
    print("  last fitted. Refit to fold them in:  python plan_calibration.py --save")


if __name__ == "__main__":
    main()
