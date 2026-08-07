"""Append one row per CHAT TURN to cost_log.csv, so a lab question can be priced two
ways: in API-equivalent money, and in percentage points of the subscription limits.

Two numbers, two decisions
--------------------------
* `api_cost_usd` / `api_cost_eur` -- what this turn WOULD cost on the API at PUBLISHED
  list prices, computed from the turn's own token counts (see pricing.py). This is the
  "should we buy API access?" number, and the one to read.
* `cost_usd` / `cost_eur` -- the same figure as Claude Code's own accounting reports it.
  Kept because it is the raw observation, but do NOT use it for the decision: measured
  2026-08-06 it prices `claude-opus-5` tokens at Sonnet 5's rate card, a uniform 0.6x of
  the published Opus 5 cost. pricing.py documents the arithmetic.
* `five_hour_pp` / `seven_day_pp` -- percentage points of the 5-hour and 7-day
  subscription windows the turn consumed (see usage_limits.py). This is the "how many
  seats would we need?" number. Blank when the limit endpoint is unavailable. It is
  measured from an ACCOUNT-WIDE endpoint, so anything else running on the account during
  the turn inflates it.
* `est_plan_pp` -- the same quantity derived from this turn's own tokens instead
  (see plan_calibration.py), so concurrent work cannot contaminate it. Blank until a
  conversion has been fitted.

Per-turn cost is a DELTA, and that matters
------------------------------------------
In a multi-turn session the CLI's `total_cost_usd` is CUMULATIVE for the whole
session, while `usage` is per turn. Logging `total_cost_usd` as if it were the turn's
cost double-counts every turn after the first. `lab_chat.py` therefore subtracts the
previous result's cumulative total before calling `append_turn`.

Read it back with cost_report.py.
"""

import csv
import os
from datetime import datetime, timezone
from pathlib import Path

import plan_calibration
import pricing

LOG_PATH = Path(__file__).resolve().parent / "cost_log.csv"

# Anthropic bills in USD; we keep both columns so the report can speak euros without
# throwing the source figure away. Override for a current rate:  set LAB_CHAT_EUR_PER_USD
EUR_PER_USD = float(os.environ.get("LAB_CHAT_EUR_PER_USD", "0.92"))

FIELDS = [
    "timestamp_utc", "chat_id", "turn", "kind", "channel", "engine", "order", "model",
    "models", "status", "duration_s", "input_tokens", "output_tokens",
    "cache_read_tokens", "cache_creation_tokens", "cache_write_5m_tokens",
    "cache_write_1h_tokens", "cost_usd", "cost_eur", "api_cost_usd", "api_cost_eur",
    "five_hour_pp", "seven_day_pp", "est_plan_pp", "question",
]

# `channel` separates the two front-ends so the report can price them apart -- a helpdesk
# ticket and a lab question are different units of work. `order` holds whichever subject
# the channel uses: an order number for lab, a ticket key (or keys) for helpdesk.
CHANNELS = ("lab", "helpdesk")

QUESTION_MAX_CHARS = 120


def to_eur(usd: float | None) -> float | None:
    return None if usd is None else usd * EUR_PER_USD


def append_turn(
    chat_id: str,
    turn: int,
    kind: str,
    engine: str,
    order: str,
    model: str,
    status: str,
    cost_usd: float | None,
    usage: dict | None,
    duration_ms: float | None,
    question: str = "",
    limit_deltas: dict[str, float] | None = None,
    channel: str = "lab",
    model_usage: dict | None = None,
) -> None:
    """One row per turn. `cost_usd` must already be this turn's share, not the running total."""
    usage = usage or {}
    limit_deltas = limit_deltas or {}
    eur = to_eur(cost_usd)

    # Priced from this turn's own tokens rather than taken from the CLI, and from the
    # model that actually ran rather than the one we asked for.
    api_usd, models = pricing.price_turn(model, usage, model_usage)
    api_eur = to_eur(api_usd)
    write_5m, write_1h = pricing.split_cache_creation(usage)

    row = {
        "timestamp_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "chat_id": chat_id,
        "turn": turn,
        "kind": kind,
        "channel": channel,
        "engine": engine,
        "order": order,
        "model": model,
        "models": models,
        "status": status,
        "duration_s": round((duration_ms or 0) / 1000, 1),
        "input_tokens": usage.get("input_tokens", ""),
        "output_tokens": usage.get("output_tokens", ""),
        "cache_read_tokens": usage.get("cache_read_input_tokens", ""),
        "cache_creation_tokens": usage.get("cache_creation_input_tokens", ""),
        "cache_write_5m_tokens": write_5m,
        "cache_write_1h_tokens": write_1h,
        "cost_usd": f"{cost_usd:.6f}" if cost_usd is not None else "",
        "cost_eur": f"{eur:.6f}" if eur is not None else "",
        "api_cost_usd": f"{api_usd:.6f}" if api_usd is not None else "",
        "api_cost_eur": f"{api_eur:.6f}" if api_eur is not None else "",
        "five_hour_pp": _pp(limit_deltas.get("five_hour")),
        "seven_day_pp": _pp(limit_deltas.get("seven_day")),
        "est_plan_pp": _pp(plan_calibration.estimate_pp(
            plan_calibration.tokens_from_usage(usage), "seven_day")),
        "question": _shorten(question),
    }
    _write(row)


def _pp(value: float | None) -> str:
    return "" if value is None else f"{value:.2f}"


def _shorten(text: str) -> str:
    text = " ".join((text or "").split())
    return text if len(text) <= QUESTION_MAX_CHARS else text[: QUESTION_MAX_CHARS - 1] + "…"


def _write(row: dict) -> None:
    existing = _existing_header()

    # A long-running chat holds this module in memory from whenever it started. If the
    # code on disk gains columns mid-session, that process still has the OLD FIELDS and
    # would "migrate" the log BACKWARDS, silently dropping the new columns for every row.
    # Observed 2026-08-06. So a header that already carries everything we know about is
    # never rewritten -- we append to it in its own column order and leave the extras
    # blank, and the next process to start writes them properly.
    if existing is not None and existing != FIELDS and not set(FIELDS) - set(existing):
        with LOG_PATH.open("a", newline="", encoding="utf-8") as f:
            csv.DictWriter(f, fieldnames=existing, extrasaction="ignore").writerow(
                {field: row.get(field, "") for field in existing}
            )
        return

    if existing is not None and existing != FIELDS:
        _migrate(existing)
    new_file = not LOG_PATH.exists()
    with LOG_PATH.open("a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDS)
        if new_file:
            writer.writeheader()
        writer.writerow(row)


def _existing_header() -> list[str] | None:
    if not LOG_PATH.exists():
        return None
    with LOG_PATH.open(newline="", encoding="utf-8") as f:
        reader = csv.reader(f)
        return next(reader, None)


# Columns whose absence in an older log has a sensible default rather than a blank.
_MIGRATION_DEFAULTS = {
    "turn": "1",
    "kind": "question",
    "channel": "lab",
    "question": "(logged before this column existed)",
}


def _backfill_api_cost(row: dict) -> None:
    """Fill api_cost_* on a row written before those columns existed.

    Every input is already in the row -- the four token counts and the model -- so the
    published-rate cost is recoverable for the whole history, not just for turns logged
    from now on. Older rows have no 5m/1h cache split; treating the combined figure as
    1-hour is what makes them reconcile exactly (see pricing.split_cache_creation).
    """
    if row.get("api_cost_usd"):
        return

    def n(field: str) -> int:
        try:
            return int(float(row.get(field) or 0))
        except (TypeError, ValueError):
            return 0

    five, hour = n("cache_write_5m_tokens"), n("cache_write_1h_tokens")
    if not five and not hour:
        hour = n("cache_creation_tokens")

    usd = pricing.cost_usd(
        row.get("model") or "",
        input_tokens=n("input_tokens"),
        output_tokens=n("output_tokens"),
        cache_read_tokens=n("cache_read_tokens"),
        cache_write_5m_tokens=five,
        cache_write_1h_tokens=hour,
    )
    if usd is None:
        return
    row["api_cost_usd"] = f"{usd:.6f}"
    eur = to_eur(usd)
    row["api_cost_eur"] = f"{eur:.6f}" if eur is not None else ""
    row["cache_write_1h_tokens"] = row.get("cache_write_1h_tokens") or (hour or "")


def _migrate(old_header: list[str]) -> None:
    """Rewrite an older log into the current schema, keeping every row.

    Schema-agnostic on purpose, since the schema has now grown three times: columns that
    still exist are carried across by name, columns that vanished are dropped, and new
    ones take a default. The early POC runs are real data for the API-vs-seats case, so
    they are migrated rather than discarded -- each becomes a single-turn lab chat with no
    limit figures, since nothing was measuring limits back then.
    """
    with LOG_PATH.open(newline="", encoding="utf-8") as f:
        old_rows = list(csv.DictReader(f))

    backup = LOG_PATH.with_suffix(f".csv.{len(old_header)}col.bak")
    if not backup.exists():
        LOG_PATH.replace(backup)
    else:
        LOG_PATH.unlink()

    with LOG_PATH.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDS)
        writer.writeheader()
        for old in old_rows:
            row = {field: old.get(field, _MIGRATION_DEFAULTS.get(field, "")) for field in FIELDS}
            if not row["chat_id"]:
                row["chat_id"] = old.get("session_id", "")  # the old name for chat_id
            if not row["cost_eur"] and row["cost_usd"]:
                eur = to_eur(float(row["cost_usd"]))
                row["cost_eur"] = f"{eur:.6f}" if eur is not None else ""
            if not row["models"]:
                row["models"] = row.get("model", "")
            _backfill_api_cost(row)
            writer.writerow(row)

    print(f"[cost] migrated {len(old_rows)} rows to the current schema "
          f"(previous file kept as {backup.name})")
