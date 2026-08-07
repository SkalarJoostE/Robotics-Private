"""Published Anthropic list prices, and the cost of one turn computed from its tokens.

Why this exists
---------------
The Claude Code CLI reports a `total_cost_usd` per turn, and the POC logged it as the
"what would this have cost on the API" figure. Measured 2026-08-06, that figure is wrong
for `claude-opus-5` specifically. A single-turn probe:

    input 2 · output 14 · cache-write-1h 21,700 · cache-read 0  ->  total_cost_usd 0.130416

Opus 5's published rates ($5/$25 per MTok) give $0.21736. The reported figure reconciles
exactly -- to the last decimal -- at $3 / $15 / $6.00 / $0.30, which is Sonnet 5's card:

    21700 * 6.00e-6  +  14 * 15e-6  +  2 * 3e-6  =  0.130416

Reconciling the whole log by model shows this is a per-model gap, not a systemic one:

    claude-opus-4-8    2 rows    CLI $2.7299   published $2.7283   ratio 0.999
    claude-opus-5     20 rows    CLI $26.2631  published $43.6961  ratio 1.664

Opus 4.8 is priced correctly to a tenth of a percent. Only Opus 5 is off, and by exactly
5/3 -- every component of the card it used (input, output, cache read, cache write) is 3/5
of Opus 5's. That is the signature of a rate table that does not yet know the model and
falls back to a Sonnet-tier default, not of a mis-measurement.

Since the POC's entire question is "what would this have cost on the API", it has to use
published rates. This module computes that from the turn's own token counts, which are
per-turn, per-chat, and unaffected by anything else running on the account.

The CLI's own figure is still logged next to ours -- it is the raw observation, and
throwing it away would make the discrepancy unfalsifiable later. Re-check it with:

    python pricing.py --audit        # per-model CLI-vs-published reconciliation
"""

from __future__ import annotations

# USD per million tokens, from the published rate card (input, output).
# Prefixes, not exact keys: `_rates` does a longest-prefix match, so a date-suffixed id
# like "claude-haiku-4-5-20251001" resolves to its base model.
MODEL_RATES: dict[str, tuple[float, float]] = {
    "claude-fable-5": (10.0, 50.0),
    "claude-mythos-5": (10.0, 50.0),
    "claude-opus-5": (5.0, 25.0),
    "claude-opus-4-8": (5.0, 25.0),
    "claude-opus-4-7": (5.0, 25.0),
    "claude-opus-4-6": (5.0, 25.0),
    "claude-opus-4-5": (5.0, 25.0),
    "claude-sonnet-5": (3.0, 15.0),
    "claude-sonnet-4-6": (3.0, 15.0),
    "claude-sonnet-4-5": (3.0, 15.0),
    "claude-haiku-4-5": (1.0, 5.0),
}

# Cache pricing is a multiple of the model's input rate, not a separate published number.
CACHE_READ_MULTIPLIER = 0.10
CACHE_WRITE_5M_MULTIPLIER = 1.25
CACHE_WRITE_1H_MULTIPLIER = 2.00


def _rates(model: str) -> tuple[float, float] | None:
    """(input, output) USD per MTok for a model id, or None if we don't know it.

    Longest prefix wins so that "claude-opus-4-8" is not shadowed by a shorter key.
    An unknown model returns None rather than a guess -- a wrong rate silently corrupts
    the whole comparison, while a blank column is visibly missing.
    """
    model = (model or "").strip()
    best: tuple[float, float] | None = None
    best_len = 0
    for prefix, rates in MODEL_RATES.items():
        if model.startswith(prefix) and len(prefix) > best_len:
            best, best_len = rates, len(prefix)
    return best


def cost_usd(
    model: str,
    input_tokens: int = 0,
    output_tokens: int = 0,
    cache_read_tokens: int = 0,
    cache_write_5m_tokens: int = 0,
    cache_write_1h_tokens: int = 0,
) -> float | None:
    """List-price cost of one turn. None when the model is not in the rate card."""
    rates = _rates(model)
    if rates is None:
        return None
    input_rate, output_rate = rates
    per_token = (
        input_tokens * input_rate
        + output_tokens * output_rate
        + cache_read_tokens * input_rate * CACHE_READ_MULTIPLIER
        + cache_write_5m_tokens * input_rate * CACHE_WRITE_5M_MULTIPLIER
        + cache_write_1h_tokens * input_rate * CACHE_WRITE_1H_MULTIPLIER
    )
    return per_token / 1_000_000


def split_cache_creation(usage: dict | None) -> tuple[int, int]:
    """(5-minute, 1-hour) cache-write tokens out of a result-JSON `usage` block.

    The split matters more than it looks: a 1-hour write costs 2x the input rate against
    1.25x for a 5-minute one, and on this workload cache writes are a large share of the
    bill. Claude Code was observed writing 100% 1-hour entries (2026-08-06), which is also
    the only split under which the historical rows reconcile exactly -- so an absent
    breakdown is treated as 1-hour rather than assumed cheap.
    """
    usage = usage or {}
    total = int(usage.get("cache_creation_input_tokens") or 0)
    breakdown = usage.get("cache_creation")
    if isinstance(breakdown, dict):
        five = int(breakdown.get("ephemeral_5m_input_tokens") or 0)
        hour = int(breakdown.get("ephemeral_1h_input_tokens") or 0)
        if five or hour:
            return five, hour
    return 0, total


def price_turn(
    model: str, usage: dict | None, model_usage: dict | None = None
) -> tuple[float | None, str]:
    """(list-price USD, models-that-ran) for one turn.

    `model_usage` is the CLI's per-model breakdown (`modelUsage` in the result JSON). It
    exists so a turn that quietly fans out to a second model is priced per model instead
    of having every token billed at the main model's rate.

    One turn, one model is the common case, and it is also the accurate one: the flat
    `usage` block carries the 5m/1h cache split while `modelUsage` does not, so we price
    from `usage` and take only the model's NAME from the breakdown. With two or more
    models there is no split to be had, and their cache writes fall back to the 1-hour
    assumption documented in `split_cache_creation`.
    """
    usage = usage or {}
    models = sorted(model_usage or {})

    if len(models) > 1:
        total = 0.0
        for name in models:
            entry = model_usage[name] or {}
            part = cost_usd(
                name,
                input_tokens=int(entry.get("inputTokens") or 0),
                output_tokens=int(entry.get("outputTokens") or 0),
                cache_read_tokens=int(entry.get("cacheReadInputTokens") or 0),
                cache_write_1h_tokens=int(entry.get("cacheCreationInputTokens") or 0),
            )
            if part is None:
                return None, "+".join(models)  # one unknown model poisons the total
            total += part
        return total, "+".join(models)

    name = models[0] if models else model
    five, hour = split_cache_creation(usage)
    priced = cost_usd(
        name,
        input_tokens=int(usage.get("input_tokens") or 0),
        output_tokens=int(usage.get("output_tokens") or 0),
        cache_read_tokens=int(usage.get("cache_read_input_tokens") or 0),
        cache_write_5m_tokens=five,
        cache_write_1h_tokens=hour,
    )
    return priced, name


def describe(model: str) -> str:
    """One-line rate summary, for a report header or a sanity check."""
    rates = _rates(model)
    if rates is None:
        return f"{model}: not in the rate card"
    input_rate, output_rate = rates
    return (
        f"{model}: ${input_rate:.2f} in / ${output_rate:.2f} out / "
        f"${input_rate * CACHE_WRITE_1H_MULTIPLIER:.2f} cache-write-1h / "
        f"${input_rate * CACHE_READ_MULTIPLIER:.2f} cache-read  (per MTok)"
    )


def audit(log_path=None) -> int:
    """Reconcile the CLI's reported cost against published rates, per model.

    A ratio near 1.000 means the CLI agrees with the rate card for that model. Anything
    else means the two disagree, and the per-model grouping is what tells you whether it
    is one model's rate entry or something broader.
    """
    import csv
    from collections import defaultdict
    from pathlib import Path

    log_path = Path(log_path or Path(__file__).resolve().parent / "cost_log.csv")
    if not log_path.exists():
        print(f"No log to audit: {log_path.name} does not exist.")
        return 1

    with log_path.open(newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    by_model: dict[str, list[tuple[float, float]]] = defaultdict(list)
    for row in rows:
        def n(field: str) -> int:
            try:
                return int(float(row.get(field) or 0))
            except (TypeError, ValueError):
                return 0

        reported = row.get("cost_usd") or ""
        if not reported:
            continue
        five, hour = n("cache_write_5m_tokens"), n("cache_write_1h_tokens")
        if not five and not hour:
            hour = n("cache_creation_tokens")
        model = row.get("model") or ""
        ours = cost_usd(model, n("input_tokens"), n("output_tokens"),
                        n("cache_read_tokens"), five, hour)
        if ours:
            by_model[model].append((float(reported), ours))

    if not by_model:
        print("No priced rows with token counts to audit.")
        return 1

    print(f"{'model':<22}{'rows':>6}{'CLI $':>11}{'published $':>14}{'ratio':>8}")
    print("-" * 61)
    for model, pairs in sorted(by_model.items()):
        reported = sum(p[0] for p in pairs)
        published = sum(p[1] for p in pairs)
        flag = "" if 0.99 <= published / reported <= 1.01 else "   <- disagrees"
        print(f"{model:<22}{len(pairs):>6}{reported:>11.4f}{published:>14.4f}"
              f"{published / reported:>8.3f}{flag}")
    return 0


if __name__ == "__main__":
    import sys

    if "--audit" in sys.argv:
        sys.exit(audit())
    for name in [a for a in sys.argv[1:] if not a.startswith("--")] or sorted(MODEL_RATES):
        print(describe(name))
