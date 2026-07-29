"""Append one row per triage run to cost_log.csv, so you can build real data on
what a "lab question" costs (at API list prices) before deciding to go the API route.

The cost figure comes straight from Claude Code's own accounting (`total_cost_usd`)
-- i.e. what the run WOULD cost on the API. On a subscription run it's informational;
that's exactly the number you want to show for the "should we pay for API?" decision.

Read it back with cost_report.py.
"""

import csv
from datetime import datetime, timezone
from pathlib import Path

LOG_PATH = Path(__file__).resolve().parent / "cost_log.csv"

FIELDS = [
    "timestamp_utc", "engine", "order", "model", "status", "duration_s",
    "input_tokens", "output_tokens", "cache_read_tokens", "cache_creation_tokens",
    "cost_usd", "session_id",
]


def append_run(
    engine: str,
    order: str,
    model: str,
    status: str,
    cost_usd: float | None,
    usage: dict | None,
    duration_ms: float | None,
    session_id: str | None,
) -> None:
    usage = usage or {}
    row = {
        "timestamp_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
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
        "session_id": session_id or "",
    }
    new_file = not LOG_PATH.exists()
    with LOG_PATH.open("a", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        if new_file:
            w.writeheader()
        w.writerow(row)

    if cost_usd is not None:
        print(f"\n[cost] logged {cost_usd:.4f} USD (API-equivalent) → {LOG_PATH.name}")
