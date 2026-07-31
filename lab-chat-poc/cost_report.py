"""Summarize cost_log.csv into the numbers behind the "per-seat vs API key" decision.

    python cost_report.py            # per-chat breakdown + per-month totals
    python cost_report.py 2026-07    # one month
    python cost_report.py --totals   # skip the per-chat detail

Every chat turn appends one row (see cost_log.py). Two currencies of cost are tracked:
API-equivalent money, and percentage points of the subscription's 5-hour / 7-day
windows. The second one is what tells you how many seats a team would actually need.
"""

import csv
import sys
from collections import defaultdict
from pathlib import Path

from cost_log import EUR_PER_USD

LOG_PATH = Path(__file__).resolve().parent / "cost_log.csv"


def _f(value: str) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _load(month_filter: str | None) -> list[dict]:
    with LOG_PATH.open(newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    if month_filter:
        rows = [r for r in rows if (r.get("timestamp_utc") or "")[:7] == month_filter]
    return rows


def _print_chats(rows: list[dict]) -> None:
    """One block per chat: what each question cost, and the chat's total."""
    chats: dict[str, list[dict]] = defaultdict(list)
    order_seen: list[str] = []
    for row in rows:
        key = row.get("chat_id") or f"(no id) {row.get('timestamp_utc','')}"
        if key not in chats:
            order_seen.append(key)
        chats[key].append(row)

    print("\nPer-chat breakdown")
    print("=" * 72)
    for index, key in enumerate(order_seen, start=1):
        turns = sorted(chats[key], key=lambda r: int(r.get("turn") or 0))
        date = (turns[0].get("timestamp_utc") or "")[:10]
        subject = turns[0].get("order", "?")
        channel = turns[0].get("channel") or "lab"
        label = "order" if channel == "lab" else "ticket"
        questions = [t for t in turns if t.get("kind") != "wrapup"]
        print(f"\nChat {index} — {date} — {channel} — {label} {subject} — "
              f"{len(questions)} question(s)")
        for turn in turns:
            label = " ".join((turn.get("question") or "").split())
            if len(label) > 44:
                label = label[:43] + "…"
            tag = "wrap-up" if turn.get("kind") == "wrapup" else f"Q{turn.get('turn')}"
            eur = _f(turn.get("cost_eur", ""))
            print(f"    {tag:<8} {label:<46} €{eur:>7.2f}")
        total_eur = sum(_f(t.get("cost_eur", "")) for t in turns)
        five = sum(_f(t.get("five_hour_pp", "")) for t in turns)
        seven = sum(_f(t.get("seven_day_pp", "")) for t in turns)
        print(f"    {'':<8} {'total':<46} €{total_eur:>7.2f}")
        if five or seven:
            print(f"    {'':<8} subscription: 5h +{five:.2f}pp · 7-day +{seven:.2f}pp")
    print()


def _print_channels(rows: list[dict]) -> None:
    """Lab questions and helpdesk tickets are different units of work, so price them apart.

    A ticket carries scraper intake, customer software and logs; a lab question often
    does not. Averaging the two together hides exactly the difference you need to see.
    """
    by_channel: dict[str, dict] = defaultdict(lambda: {"eur": 0.0, "chats": set(), "seven": 0.0})
    for row in rows:
        bucket = by_channel[row.get("channel") or "lab"]
        bucket["eur"] += _f(row.get("cost_eur", ""))
        bucket["chats"].add(row.get("chat_id") or row.get("timestamp_utc"))
        bucket["seven"] += _f(row.get("seven_day_pp", ""))

    if len(by_channel) < 2:
        return  # nothing to compare yet

    print("By channel")
    print("-" * 72)
    print(f"{'channel':<12}{'chats':>8}{'total EUR':>12}{'EUR/chat':>11}{'7d pp/chat':>13}")
    for channel in sorted(by_channel):
        bucket = by_channel[channel]
        chats = len(bucket["chats"])
        print(f"{channel:<12}{chats:>8}{bucket['eur']:>12.2f}{bucket['eur'] / chats:>11.2f}"
              f"{bucket['seven'] / chats:>13.2f}")
    print()


def _print_months(rows: list[dict]) -> None:
    by_month: dict[str, dict] = defaultdict(lambda: {"eur": 0.0, "chats": set(), "questions": 0, "seven": 0.0})
    for row in rows:
        month = (row.get("timestamp_utc") or "")[:7]
        bucket = by_month[month]
        bucket["eur"] += _f(row.get("cost_eur", ""))
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
    _print_channels(rows)
    print(f"→ {total_chats} chats ({total_questions} questions) would have cost "
          f"€{total_eur:.2f} on the API — €{total_eur / total_chats:.2f} per chat.")

    # Only chats that actually carry limit data can support the per-seat extrapolation;
    # the pre-chat runs predate the measurement and would drag the average down.
    measured: dict[str, float] = defaultdict(float)
    for row in rows:
        key = row.get("chat_id") or row.get("timestamp_utc") or ""
        measured[key] += _f(row.get("seven_day_pp", ""))
    measured = {k: v for k, v in measured.items() if v > 0}
    seven_total = sum(measured.values())

    if measured:
        chats_per_seat = 100 / (seven_total / len(measured))
        print(f"→ {len(measured)} chat(s) with limit data used {seven_total:.1f} percentage points "
              f"of the weekly limit\n   — roughly {chats_per_seat:.0f} chats per seat per week "
              f"before that limit is reached.")
    else:
        print("→ No subscription-limit data recorded yet (the endpoint reports whole percentage\n"
              "   points, so short chats can legitimately register as 0).")
    print(f"\n(euros at {EUR_PER_USD} EUR/USD — set LAB_CHAT_EUR_PER_USD to change)")


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

    if show_chats:
        _print_chats(rows)
    _print_months(rows)


if __name__ == "__main__":
    main()
