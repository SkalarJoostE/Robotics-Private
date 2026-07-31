"""
Helpdesk chat -- solve RB / ES service tickets in a multi-turn session.

Name the ticket(s); the chat refreshes them through the local Jira scraper, triages the
evidence it produces, and answers. You can then correct it, ask follow-ups, and when you
type `done` it writes `Service Items\\<KEY>\\analysis.md` -- including a draft Jira reply
for YOU to send.

It never writes to Jira. Not a comment, not a transition, not a field. That is stated as
an absolute in both the opening and the wrap-up prompt, so a later message cannot talk it
into posting.

    python helpdesk_chat.py                       # asks which ticket
    python helpdesk_chat.py RB-380
    python helpdesk_chat.py RB-380,ES-212 "customer says it started after the update"

In-chat commands:
    done     finish, and offer to write the analysis document(s)
    quit     finish without writing anything
    cost     show the running cost of this chat so far

Runs on your Claude Code subscription (leave ANTHROPIC_API_KEY unset). Needs VPN for the
scraper's SVN/Jira access, and the Loupe MCP for any .glf logs.
"""

import sys

from chat_engine import MODEL, Chat, WORKSPACE_ROOT, ask_user, preflight, run_loop
from prompt_common import (
    build_ticket_prompt,
    build_ticket_wrapup_prompt,
    normalize_ticket_keys,
)

import usage_limits


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    claude = preflight()
    if not claude:
        return 1

    def arg(index: int) -> str:
        return sys.argv[index].strip() if len(sys.argv) > index else ""

    raw_keys = arg(1) or ask_user("Ticket key(s) — e.g. RB-380 or RB-380,ES-212: ")
    keys = normalize_ticket_keys(raw_keys)
    if not keys:
        print(f"No valid RB/ES ticket key in {raw_keys!r} — expected e.g. RB-380.", file=sys.stderr)
        return 2

    note = arg(2) or ask_user("Anything to add? (optional, press Enter to skip): ")

    subject = ", ".join(keys)
    destination = ("Service Items\\<KEY>\\analysis.md" if len(keys) > 1
                   else f"Service Items\\{keys[0]}\\analysis.md")

    opening = usage_limits.snapshot()
    print("\n" + "=" * 66)
    print("Skalar helpdesk chat — solve an RB/ES ticket")
    print("=" * 66)
    print(f"workspace : {WORKSPACE_ROOT}")
    print(f"ticket(s) : {subject}")
    print(f"model     : {MODEL}")
    print(f"{usage_limits.format_windows(opening)}")
    print("=" * 66)
    print("No Jira writes — findings land in analysis.md with a draft reply for you to send.")
    print("Type 'done' to finish, 'quit' to bail, 'cost' for the running total.")
    print("Refreshing the ticket takes a while; the first answer will not be instant.\n")

    chat = Chat(claude, subject, channel="helpdesk")
    return run_loop(
        chat,
        opening_prompt=build_ticket_prompt(keys, note),
        opening_label=f"solve {subject}" + (f" — {note}" if note else ""),
        wrapup_prompt=build_ticket_wrapup_prompt(keys),
        wrapup_destination=destination,
    )


if __name__ == "__main__":
    sys.exit(main())
