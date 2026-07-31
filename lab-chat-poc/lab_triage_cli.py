"""
Lab-issue triage -- SUBSCRIPTION engine (Phase 0 proof-of-concept).

Same job as lab_triage.py, but instead of the Agent SDK + API key (per-token),
this drives the **Claude Code CLI** headlessly. It runs on whatever login the
CLI is signed in with -- i.e. your Max subscription -- so there is NO per-token
charge; the usage counts against your plan.

It runs the CLI from the workspace root, so it loads the SAME context you use
interactively: CLAUDE.md, .claude/skills/*, and the Loupe MCP from .mcp.json.

Usage (via run-sub.ps1, or directly):
    python lab_triage_cli.py 99441979 "C:\\path\\to\\robot.glf" "Stuck at Started"
    python lab_triage_cli.py 99441979

Prereq: `npm install -g @anthropic-ai/claude-code`, and be logged in
(Claude Code `/login` with your Claude account). No ANTHROPIC_API_KEY needed --
in fact, if one is set the CLI may use it and bill per-token, so unset it for
subscription use.
"""

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

from prompt_common import build_opening_prompt
from cost_log import append_turn

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
MODEL = "claude-opus-5"


def find_claude() -> str | None:
    p = shutil.which("claude")
    if p:
        return p
    # npm global on Windows installs a .cmd shim here
    candidate = Path(os.environ.get("APPDATA", "")) / "npm" / "claude.cmd"
    return str(candidate) if candidate.exists() else None


def run(order: str, log_path: str | None, description: str) -> int:
    claude = find_claude()
    if not claude:
        print(
            "ERROR: Claude Code CLI not found. Install it with:\n"
            "    npm install -g @anthropic-ai/claude-code\n"
            "then run `claude` once and sign in with your Claude account.",
            file=sys.stderr,
        )
        return 1

    if os.environ.get("ANTHROPIC_API_KEY"):
        print(
            "NOTE: ANTHROPIC_API_KEY is set -- the CLI may bill per-token instead of "
            "using your subscription. Unset it (Remove-Item Env:ANTHROPIC_API_KEY) "
            "for subscription-only use.",
            file=sys.stderr,
        )

    prompt = build_opening_prompt(order, log_path, description)

    # Headless, streaming, fully autonomous. --dangerously-skip-permissions mirrors
    # the API build's bypassPermissions so nothing blocks the run. Harden this for a
    # lab-facing tool. .cmd shims need to go through cmd.exe on Windows.
    cmd = [
        "cmd", "/c", claude,
        "-p",
        "--output-format", "stream-json",
        "--verbose",
        "--model", MODEL,
        "--dangerously-skip-permissions",
    ]

    print(f"\n=== Lab triage (subscription / Claude Code CLI) ===")
    print(f"workspace : {WORKSPACE_ROOT}")
    print(f"order     : {order}")
    print(f"log       : {log_path or '(none)'}")
    print(f"model     : {MODEL}")
    print(f"{'=' * 48}\n", flush=True)

    proc = subprocess.Popen(
        cmd,
        cwd=str(WORKSPACE_ROOT),
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
        errors="replace",
        bufsize=1,
    )
    assert proc.stdin and proc.stdout
    proc.stdin.write(prompt)
    proc.stdin.close()

    final_evt = None
    for line in proc.stdout:
        line = line.strip()
        if not line:
            continue
        try:
            evt = json.loads(line)
        except json.JSONDecodeError:
            # Non-JSON diagnostic line from the CLI -- surface it.
            print(line, flush=True)
            continue

        etype = evt.get("type")
        if etype == "assistant":
            for block in evt.get("message", {}).get("content", []):
                if block.get("type") == "text":
                    print(block.get("text", ""), end="", flush=True)
                elif block.get("type") == "tool_use":
                    print(f"\n  → {block.get('name')}", flush=True)
        elif etype == "result":
            final_evt = evt

    proc.wait()

    final_subtype = (final_evt or {}).get("subtype")
    print("\n\n" + "=" * 48)
    print(f"status: {final_subtype or ('exit ' + str(proc.returncode))}")
    if final_evt and final_evt.get("result"):
        print("\n--- DIAGNOSIS ---\n")
        print(final_evt["result"])

    # Log the API-equivalent cost for this lab question. One-shot, so it is turn 1 of
    # a one-turn chat and total_cost_usd is that turn's whole cost.
    if final_evt is not None:
        append_turn(
            chat_id=final_evt.get("session_id") or "",
            turn=1,
            kind="question",
            engine="cli-subscription",
            order=order,
            model=MODEL,
            status=final_subtype or "unknown",
            cost_usd=final_evt.get("total_cost_usd"),
            usage=final_evt.get("usage"),
            duration_ms=final_evt.get("duration_ms"),
            question=description or f"one-shot triage {order}",
        )

    return 0 if proc.returncode == 0 else proc.returncode


def main() -> None:
    if len(sys.argv) < 2:
        print(
            "Usage: python lab_triage_cli.py <order#> [<path-to-.glf>] [<symptom>]",
            file=sys.stderr,
        )
        sys.exit(2)
    order = sys.argv[1]
    log_path = sys.argv[2] if len(sys.argv) > 2 else None
    description = sys.argv[3] if len(sys.argv) > 3 else ""
    if log_path and not Path(log_path).exists():
        print(f"WARNING: log path does not exist: {log_path}", file=sys.stderr)
    sys.exit(run(order, log_path, description))


if __name__ == "__main__":
    main()
