"""Summarize cost_log.csv into the numbers you'd show for the API-vs-not decision.

    python cost_report.py            # all-time + per-month breakdown
    python cost_report.py 2026-07    # just that month

Every "lab question" run appends one row (see cost_log.py). The cost is the
API-equivalent list-price cost of that run, straight from Claude Code's accounting.
"""

import csv
import sys
from collections import defaultdict
from pathlib import Path

LOG_PATH = Path(__file__).resolve().parent / "cost_log.csv"


def _f(x: str) -> float:
    try:
        return float(x)
    except (TypeError, ValueError):
        return 0.0


def main() -> None:
    if not LOG_PATH.exists():
        print(f"No data yet: {LOG_PATH.name} does not exist. Run a triage first.")
        return

    month_filter = sys.argv[1] if len(sys.argv) > 1 else None

    rows = []
    with LOG_PATH.open(newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            month = (r.get("timestamp_utc") or "")[:7]  # YYYY-MM
            if month_filter and month != month_filter:
                continue
            rows.append((month, _f(r.get("cost_usd", "0"))))

    if not rows:
        scope = f" for {month_filter}" if month_filter else ""
        print(f"No matching runs{scope}.")
        return

    by_month: dict[str, list[float]] = defaultdict(list)
    for month, cost in rows:
        by_month[month].append(cost)

    total = sum(c for _, c in rows)
    n = len(rows)

    print("\nLab-question cost (API-equivalent, USD)")
    print("=" * 44)
    print(f"{'month':<10}{'questions':>11}{'total':>11}{'avg/question':>14}")
    print("-" * 44)
    for month in sorted(by_month):
        costs = by_month[month]
        print(f"{month:<10}{len(costs):>11}{sum(costs):>11.2f}{(sum(costs)/len(costs)):>14.4f}")
    print("-" * 44)
    print(f"{'ALL':<10}{n:>11}{total:>11.2f}{(total/n):>14.4f}")
    print()
    print(f"→ Pitch line: {n} lab questions cost an average of "
          f"${total/n:.3f} each (${total:.2f} total) on the API.")


if __name__ == "__main__":
    main()
