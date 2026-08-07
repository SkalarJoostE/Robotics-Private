"""The shared chat engine: one live Claude Code session, driven turn by turn.

Both front-ends use this unchanged, so they cost, log and behave identically:
  - lab_chat.py       lab questions about an order      (channel "lab")
  - helpdesk_chat.py  RB/ES ticket solving              (channel "helpdesk")

A front-end supplies three things: the opening prompt, the wrap-up prompt, and a
label for where the wrap-up writes. Everything else -- streaming, per-turn cost
deltas, subscription-limit deltas, logging, the summary -- lives here.
"""

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

import pricing
import usage_limits
from cost_log import EUR_PER_USD, append_turn, to_eur

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
MODEL = os.environ.get("LAB_CHAT_MODEL", "claude-opus-5")

QUIT_WORDS = {"quit", "exit", "q"}
DONE_WORDS = {"done", "finish", "end"}


def find_claude() -> str | None:
    found = shutil.which("claude")
    if found:
        return found
    # npm's global install on Windows drops a .cmd shim here.
    candidate = Path(os.environ.get("APPDATA", "")) / "npm" / "claude.cmd"
    return str(candidate) if candidate.exists() else None


def ask_user(prompt: str) -> str:
    try:
        return input(prompt).strip()
    except (EOFError, KeyboardInterrupt):
        return "quit"


def preflight() -> str | None:
    """Locate the CLI and warn about anything that would distort the billing figures."""
    claude = find_claude()
    if not claude:
        print("ERROR: Claude Code CLI not found. Install it with:\n"
              "    npm install -g @anthropic-ai/claude-code\n"
              "then run `claude` once and sign in.", file=sys.stderr)
        return None
    if os.environ.get("ANTHROPIC_API_KEY"):
        print("NOTE: ANTHROPIC_API_KEY is set -- the CLI may bill per token instead of using "
              "your subscription. Unset it (Remove-Item Env:ANTHROPIC_API_KEY) for subscription use.",
              file=sys.stderr)
    return claude


class Chat:
    """One live Claude Code session. `subject` is the order number or ticket key."""

    def __init__(self, claude: str, subject: str, channel: str):
        self.subject = subject
        self.channel = channel
        self.turns: list[dict] = []
        self.chat_id = ""
        self.cumulative_usd = 0.0  # the CLI reports a running total; we log deltas
        self.limits_note = ""      # why limit data is missing, if it is

        command = [
            "cmd", "/c", claude,
            "-p",
            "--input-format", "stream-json",
            "--output-format", "stream-json",
            "--verbose",
            "--model", MODEL,
            # POC: unattended so nothing blocks mid-answer. A shared deployment must
            # tighten this to a read-mostly allowlist.
            "--dangerously-skip-permissions",
        ]
        self.proc = subprocess.Popen(
            command,
            cwd=str(WORKSPACE_ROOT),
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            errors="replace",
            bufsize=1,
        )

    def ask(self, prompt: str, kind: str = "question", label: str = "") -> dict | None:
        """Send one user turn, stream the answer, price it, log it. Returns the result event."""
        before = usage_limits.snapshot()

        assert self.proc.stdin and self.proc.stdout
        message = {
            "type": "user",
            "message": {"role": "user", "content": [{"type": "text", "text": prompt}]},
        }
        try:
            self.proc.stdin.write(json.dumps(message) + "\n")
            self.proc.stdin.flush()
        except (BrokenPipeError, OSError):
            print("\n[chat] the Claude Code process has exited.", file=sys.stderr)
            return None

        result = self._stream_until_result()
        if result is None:
            return None

        after = usage_limits.snapshot()
        deltas = usage_limits.delta(before, after)
        for snap in (before, after):
            if snap.get("unavailable"):
                self.limits_note = snap["unavailable"]

        # `total_cost_usd` is cumulative across the session; the turn's own cost is the
        # increment. Logging the raw total would double-count every turn after the first.
        cumulative = result.get("total_cost_usd")
        turn_usd = None
        if isinstance(cumulative, (int, float)):
            turn_usd = max(0.0, cumulative - self.cumulative_usd)
            self.cumulative_usd = cumulative

        # The CLI's figure prices these tokens at the wrong model's card (see pricing.py),
        # so the money we show and total is recomputed from the turn's own tokens.
        usage = result.get("usage")
        model_usage = result.get("modelUsage")
        api_usd, models = pricing.price_turn(MODEL, usage, model_usage)

        self.chat_id = result.get("session_id") or self.chat_id
        turn_number = len(self.turns) + 1
        record = {
            "turn": turn_number,
            "kind": kind,
            "label": label or prompt,
            "usd": turn_usd,
            "api_usd": api_usd,
            "models": models,
            "deltas": deltas,
            "status": result.get("subtype", "unknown"),
            "duration_ms": result.get("duration_ms"),
        }
        self.turns.append(record)

        append_turn(
            chat_id=self.chat_id,
            turn=turn_number,
            kind=kind,
            channel=self.channel,
            engine=f"cli-subscription-{self.channel}",
            order=self.subject,
            model=MODEL,
            status=record["status"],
            cost_usd=turn_usd,
            usage=usage,
            duration_ms=result.get("duration_ms"),
            question=record["label"],
            limit_deltas=deltas,
            model_usage=model_usage,
        )
        self._print_turn_footer(record, after)
        return result

    def _stream_until_result(self) -> dict | None:
        """Print assistant output as it arrives; stop at this turn's result event."""
        assert self.proc.stdout
        for line in self.proc.stdout:
            line = line.strip()
            if not line:
                continue
            try:
                event = json.loads(line)
            except json.JSONDecodeError:
                print(line, flush=True)  # a plain diagnostic line from the CLI
                continue

            kind = event.get("type")
            if kind == "assistant":
                for block in event.get("message", {}).get("content", []):
                    if block.get("type") == "text":
                        print(block.get("text", ""), end="", flush=True)
                    elif block.get("type") == "tool_use":
                        print(f"\n  → {block.get('name')}", flush=True)
            elif kind == "result":
                return event
        return None  # stdout closed without a result -- the process died

    def _print_turn_footer(self, record: dict, after: dict) -> None:
        api_usd, api_eur = record["api_usd"], to_eur(record["api_usd"])
        cost = f"€{api_eur:.2f} (${api_usd:.2f})" if api_usd is not None else "cost unavailable"
        limits = usage_limits.format_delta(record["deltas"])
        seconds = (record["duration_ms"] or 0) / 1000
        print(f"\n\n[turn {record['turn']}] {cost} · {seconds:.0f}s"
              + (f" · {limits}" if limits else ""))
        if after and not after.get("unavailable"):
            print(f"           {usage_limits.format_windows(after)}")
        elif after and after.get("unavailable"):
            # Say why, rather than going silent -- a missing limits line otherwise reads
            # as a lost feature instead of a temporary outage of the usage endpoint.
            print(f"           limits: {after['unavailable']}")

    def summary(self) -> str:
        """The per-question breakdown, in the shape you actually want to read."""
        priced = [t for t in self.turns if t["api_usd"] is not None]
        total_usd = sum(t["api_usd"] for t in priced)
        lines = [
            "",
            "=" * 66,
            f"Chat summary — {self.subject} — {len(self.turns)} turn(s)",
            "=" * 66,
        ]
        for turn in self.turns:
            label = " ".join(turn["label"].split())
            if len(label) > 38:
                label = label[:37] + "…"
            eur = to_eur(turn["api_usd"])
            money = f"€{eur:>6.2f}" if eur is not None else "     ?"
            tag = "wrap-up" if turn["kind"] == "wrapup" else f"Q{turn['turn']}"
            lines.append(f"  {tag:<8} {label:<40} {money}")
        lines.append("  " + "-" * 62)
        lines.append(f"  {'total':<8} {'':<40} €{to_eur(total_usd):>6.2f}  (${total_usd:.2f})")

        # Worth surfacing: if a turn quietly fanned out to a second model, the per-model
        # rate difference is the whole reason the total is what it is.
        ran = sorted({t["models"] for t in self.turns if t["models"]})
        if ran and ran != [MODEL]:
            lines.append(f"  models that ran: {', '.join(ran)}")

        chat_deltas: dict[str, float] = {}
        for turn in self.turns:
            for window, value in turn["deltas"].items():
                chat_deltas[window] = chat_deltas.get(window, 0.0) + value
        limits = usage_limits.format_delta(chat_deltas)
        if limits:
            lines.append(f"  subscription cost of this chat: {limits}")
        elif self.limits_note:
            lines.append(f"  subscription cost of this chat: not measured ({self.limits_note})")
        else:
            # The endpoint reports whole percentage points, so a short chat really can
            # cost 0pp -- that is a measurement floor, not a missing measurement.
            lines.append("  subscription cost of this chat: under 1pp (the endpoint's resolution)")
        lines.append(f"  (euros converted at {EUR_PER_USD} EUR/USD; on a subscription the")
        lines.append("   money figure is what this WOULD have cost on the API, priced from")
        lines.append("   this chat's own tokens at published list rates — see pricing.py)")
        lines.append("=" * 66)
        return "\n".join(lines)

    def close(self) -> None:
        try:
            if self.proc.stdin:
                self.proc.stdin.close()
            self.proc.wait(timeout=10)
        except Exception:
            self.proc.terminate()


def run_loop(chat: Chat, opening_prompt: str, opening_label: str,
             wrapup_prompt: str, wrapup_destination: str) -> int:
    """The REPL both front-ends share: answer, follow up, then finish."""
    try:
        if chat.ask(opening_prompt, label=opening_label) is None:
            print("The chat ended before an answer arrived.", file=sys.stderr)
            return 1

        while True:
            reply = ask_user("\nyou> ")
            if not reply:
                continue
            lowered = reply.lower()

            if lowered in QUIT_WORDS:
                print(chat.summary())
                print("\nNothing was written.")
                return 0

            if lowered == "cost":
                print(chat.summary())
                continue

            if lowered in DONE_WORDS:
                answer = ask_user(f"Write the findings to {wrapup_destination}? [y/N]: ").lower()
                if answer.startswith("y"):
                    print()
                    chat.ask(wrapup_prompt, kind="wrapup", label="wrap-up: write the findings")
                else:
                    print("Nothing was written.")
                print(chat.summary())
                return 0

            print()
            if chat.ask(reply, label=reply) is None:
                print("The chat ended unexpectedly.", file=sys.stderr)
                return 1
    finally:
        chat.close()
