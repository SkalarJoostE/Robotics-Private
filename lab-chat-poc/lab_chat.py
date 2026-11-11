"""
Lab chat -- multi-turn triage of a lab question about one order.

Keeps ONE Claude Code session alive so you can correct it, ask a follow-up, and only
then close the chat. Every turn is priced twice -- in API-equivalent euros and in
percentage points of your subscription limits -- so the "per-seat vs API key" question
gets answered with data instead of a guess.

    python lab_chat.py                                   # asks for everything
    python lab_chat.py 99441979
    python lab_chat.py 99441979 "C:\\path\\robot.glf" "Stuck at Started"

A question with no log is fully supported: the chat answers from the software itself
and will not demand a log before helping.

In-chat commands:
    done     finish, and offer to file the chat under "md documents\\Lab Questions"
    quit     finish without filing anything
    cost     show the running cost of this chat so far

Runs on your Claude Code subscription -- leave ANTHROPIC_API_KEY unset.
For RB/ES service tickets use helpdesk_chat.py instead.
"""

import sys
from pathlib import Path

from chat_engine import MODEL, Chat, WORKSPACE_ROOT, ask_user, preflight, run_loop
from prompt_common import LAB_QUESTIONS_DIR, build_opening_prompt, build_wrapup_prompt

import usage_limits


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    claude = preflight()
    if not claude:
        return 1

    # Empty positional args are normal: the .bat passes "" for a field it does not have.
    def arg(index: int) -> str:
        return sys.argv[index].strip() if len(sys.argv) > index else ""

    order = arg(1) or ask_user("Order number (99xxxxxx): ")
    if not order:
        print("No order number given.", file=sys.stderr)
        return 2
    log_path = arg(2) or ask_user(
        "Log file (.glf) — paste the path, or leave blank if you have no log: ")
    log_path = log_path.strip('"').strip()
    if log_path and not Path(log_path).exists():
        print(f"WARNING: that log path does not exist: {log_path}", file=sys.stderr)
        if ask_user("Continue without the log? [Y/n]: ").lower().startswith("n"):
            return 2
        log_path = ""
    description = arg(3) or ask_user("Question / symptom: ")

    opening = usage_limits.snapshot()
    print("\n" + "=" * 66)
    print("Skalar lab chat — multi-turn triage")
    print("=" * 66)
    print(f"workspace : {WORKSPACE_ROOT}")
    print(f"order     : {order}")
    print(f"log       : {log_path or '(none — configuration question)'}")
    print(f"model     : {MODEL}")
    print(f"{usage_limits.format_windows(opening)}")
    print("=" * 66)
    print("Answer first, then ask follow-ups. Type 'done' to finish, 'quit' to bail, "
          "'cost' for the running total.\n")

    chat = Chat(claude, order, channel="lab")
    return run_loop(
        chat,
        opening_prompt=build_opening_prompt(order, log_path or None, description),
        opening_label=description or f"initial triage {order}",
        wrapup_prompt=build_wrapup_prompt(order),
        wrapup_destination=LAB_QUESTIONS_DIR,
    )


if __name__ == "__main__":
    sys.exit(main())
