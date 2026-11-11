"""
Lab-issue triage — Phase 0 proof-of-concept.

Runs the Skalar lab-issue workflow HEADLESSLY using the Claude Agent SDK
(Claude Code packaged as a library). It points the agent at the Robotics-AI
workspace root, so it inherits the SAME context you use interactively:
  - CLAUDE.md / .github/copilot-instructions.md (the whole robot knowledge base)
  - .claude/skills/*  (skalar-lab-issue, skalar-log-analysis, skalar-code-reference, ...)
  - .mcp.json         (the Loupe MCP server for reading .glf logs)

Goal of this POC: given an order number + a log file + a short symptom, see how
close a fully autonomous run gets to the diagnosis you produce by hand -- BEFORE
building any chat UI.

Usage (from an activated venv, or via run.ps1):
    python lab_triage.py 99441979 "C:\\path\\to\\robot.glf" "Run never finishes, stuck at Started"
    python lab_triage.py 99441979                      # config-only question, no log

Requires ANTHROPIC_API_KEY in the environment (see README.md). Every run bills
per-token against that key's Anthropic org -- it does NOT use a Claude Code
subscription.
"""

import asyncio
import os
import sys
from pathlib import Path

from claude_agent_sdk import (
    query,
    ClaudeAgentOptions,
    AssistantMessage,
    TextBlock,
    ThinkingBlock,
    ToolUseBlock,
    ResultMessage,
)

from prompt_common import build_opening_prompt
from cost_log import append_turn

# The workspace root = parent of this lab-chat-poc folder.
WORKSPACE_ROOT = Path(__file__).resolve().parent.parent

# Kept in step with the CLI engines, otherwise the two billing models are not comparable.
MODEL = "claude-opus-5"  # ceiling of quality for the POC; try claude-sonnet-5 to compare cost


async def run(order: str, log_path: str | None, description: str) -> None:
    options = ClaudeAgentOptions(
        cwd=str(WORKSPACE_ROOT),
        model=MODEL,
        # Load the project's CLAUDE.md, skills, and .mcp.json (Loupe) -- the whole point.
        setting_sources=["project", "user", "local"],
        # Pre-approve the tools a triage run needs. Bash is included so it can run
        # fetch-project.ps1 and read the case base. This is a POC on your own machine;
        # a production lab-facing bot should tighten this to a read-mostly set.
        allowed_tools=[
            "Read", "Glob", "Grep", "Bash", "WebFetch", "WebSearch", "TodoWrite",
            "mcp__loupe", "mcp__loupe__*",
            "mcp__atlassian", "mcp__atlassian__*",
        ],
        # POC: run fully unattended so we see the ceiling of what it can do.
        # Harden to "dontAsk" + a curated allowlist before exposing to the lab.
        permission_mode="bypassPermissions",
    )

    print(f"\n=== Lab triage (POC) ===")
    print(f"workspace : {WORKSPACE_ROOT}")
    print(f"order     : {order}")
    print(f"log       : {log_path or '(none)'}")
    print(f"model     : {MODEL}")
    print(f"{'=' * 24}\n", flush=True)

    final = None
    async for message in query(prompt=build_opening_prompt(order, log_path, description), options=options):
        if isinstance(message, AssistantMessage):
            for block in message.content:
                if isinstance(block, TextBlock):
                    print(block.text, end="", flush=True)
                elif isinstance(block, ThinkingBlock):
                    print("\n  [thinking…]", flush=True)
                elif isinstance(block, ToolUseBlock):
                    print(f"\n  → {block.name}", flush=True)
        elif isinstance(message, ResultMessage):
            final = message

    print("\n\n" + "=" * 24)
    if final is not None:
        print(f"status: {final.subtype}")
        # ResultMessage.result holds the final answer text for a completed run.
        if getattr(final, "result", None):
            print("\n--- DIAGNOSIS ---\n")
            print(final.result)

        usage = getattr(final, "usage", None)
        if not isinstance(usage, dict):
            usage = None
        append_turn(
            chat_id=getattr(final, "session_id", None) or "",
            turn=1,
            kind="question",
            engine="api-sdk",
            order=order,
            model=MODEL,
            status=getattr(final, "subtype", "unknown"),
            cost_usd=getattr(final, "total_cost_usd", None),
            usage=usage,
            duration_ms=getattr(final, "duration_ms", None),
            question=description or f"one-shot triage {order}",
        )
    else:
        print("No result message received (connection/process error).")


def main() -> None:
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print(
            "ERROR: ANTHROPIC_API_KEY is not set.\n"
            "Get a key from https://platform.claude.com/ and set it for this shell:\n"
            '    $env:ANTHROPIC_API_KEY = "sk-ant-..."\n'
            "Then re-run. Every run bills per-token against that key.",
            file=sys.stderr,
        )
        sys.exit(1)

    if len(sys.argv) < 2:
        print(
            "Usage: python lab_triage.py <order#> [<path-to-.glf>] [<symptom description>]",
            file=sys.stderr,
        )
        sys.exit(2)

    order = sys.argv[1]
    log_path = sys.argv[2] if len(sys.argv) > 2 else None
    description = sys.argv[3] if len(sys.argv) > 3 else ""

    if log_path and not Path(log_path).exists():
        print(f"WARNING: log path does not exist: {log_path}", file=sys.stderr)

    asyncio.run(run(order, log_path, description))


if __name__ == "__main__":
    main()
