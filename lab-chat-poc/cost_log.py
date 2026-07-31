"""Append one row per CHAT TURN to cost_log.csv, so a lab question can be priced two
ways: in API-equivalent money, and in percentage points of the subscription limits.

Two numbers, two decisions
--------------------------
* `cost_usd` / `cost_eur` -- what this turn WOULD cost on the API at list prices,
  straight from Claude Code's own accounting. This is the "should we buy API access?"
  number.
* `five_hour_pp` / `seven_day_pp` -- percentage points of the 5-hour and 7-day
  subscription windows the turn consumed (see usage_limits.py). This is the "how many
  seats would we need?" number. Blank when the limit endpoint is unavailable.

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

LOG_PATH = Path(__file__).resolve().parent / "cost_log.csv"

# Anthropic bills in USD; we keep both columns so the report can speak euros without
# throwing the source figure away. Override for a current rate:  set LAB_CHAT_EUR_PER_USD
EUR_PER_USD = float(os.environ.get("LAB_CHAT_EUR_PER_USD", "0.92"))

FIELDS = [
    "timestamp_utc", "chat_id", "turn", "kind", "channel", "engine", "order", "model",
    "status", "duration_s", "input_tokens", "output_tokens", "cache_read_tokens",
    "cache_creation_tokens", "cost_usd", "cost_eur", "five_hour_pp", "seven_day_pp",
    "question",
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
) -> None:
    """One row per turn. `cost_usd` must already be this turn's share, not the running total."""
    usage = usage or {}
    limit_deltas = limit_deltas or {}
    eur = to_eur(cost_usd)
    row = {
        "timestamp_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "chat_id": chat_id,
        "turn": turn,
        "kind": kind,
        "channel": channel,
        "engine": engine,
        "order": order,
        "model": model,
        "status": status,
        "duration_s": round((duration_ms or 0) / 1000, 1),
        "input_tokens": usage.get("input_tokens", ""),
        "output_tokens": usage.get("output_tokens", ""),
        "cache_read_tokens": usage.get("cache_read_input_tokens", ""),
        "cache_creation_tokens": usage.get("cache_creation_input_tokens", ""),
        "cost_usd": f"{cost_usd:.6f}" if cost_usd is not None else "",
        "cost_eur": f"{eur:.6f}" if eur is not None else "",
        "five_hour_pp": _pp(limit_deltas.get("five_hour")),
        "seven_day_pp": _pp(limit_deltas.get("seven_day")),
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


def _migrate(old_header: list[str]) -> None:
    """Rewrite an older log into the current schema, keeping every row.

    Schema-agnostic on purpose, since the schema has now grown twice: columns that still
    exist are carried across by name, columns that vanished are dropped, and new ones take
    a default. The early POC runs are real data for the API-vs-seats case, so they are
    migrated rather than discarded -- each becomes a single-turn lab chat with no limit
    figures, since nothing was measuring limits back then.
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
            writer.writerow(row)

    print(f"[cost] migrated {len(old_rows)} rows to the current schema "
          f"(previous file kept as {backup.name})")
