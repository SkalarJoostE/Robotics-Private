# Lab-issue triage — Phase 0 proof-of-concept

Headless scripts that run the **skalar-lab-issue** workflow autonomously, reusing
the **same context you use interactively** — `CLAUDE.md`, all the `.claude/skills`,
and the Loupe MCP from `.mcp.json` — with zero re-implementation.

**Purpose:** see how close a fully autonomous run gets to the diagnosis you produce
by hand, *before* investing in any chat UI.

## Two engines — same job, different billing

| Script | Engine | Billing | Who it's for |
|---|---|---|---|
| **`lab_triage_cli.py`** (`run-sub.ps1`) | Claude Code CLI, headless | **Your subscription — no per-token** | You. Basis for daily personal use. |
| `lab_triage.py` (`run.ps1`) | Claude Agent SDK | Per-token API key | The future multi-user shared service. |

They share `prompt_common.py`, so both behave identically — only the engine and
billing differ.

> **Licensing reality:** a subscription is scoped to one person. Anthropic does not
> allow routing many users through your subscription login. So the CLI engine is
> perfect for **you**; a real **lab-facing shared chat** must be per-seat or the
> API engine (per-token). Subscription gets us the prototype, not the product.

## What a run does

Given an order number + a `.glf` log + a short symptom, it:
1. Fetches/refreshes the order's software from SVN (needs VPN).
2. Places the log in the project's `Log` folder.
3. Searches the case base, then runs the log-analysis workflow.
4. Prints a diagnosis + recommended fix you can relay to the lab.

## Easiest: the clickable launchers

- **`Lab-Question.bat`** — double-click it (or drag a `.glf` onto it). It asks for the
  order number, log path, and symptom, runs the triage, prints the diagnosis, and
  logs the cost. Keeps the window open so you can read the result.
- **`Cost-Report.bat`** — double-click to see per-month totals and average per question.

Everything below is the same thing from a terminal, if you prefer typing.

## Run it on your subscription (recommended)

```powershell
# Prereqs (already done): npm install -g @anthropic-ai/claude-code  +  be signed in
# Make sure no API key is set, so it uses your subscription:
Remove-Item Env:ANTHROPIC_API_KEY -ErrorAction SilentlyContinue

cd lab-chat-poc
.\run-sub.ps1 99441979 "C:\Users\you\Downloads\robot.glf" "Run never finishes, stuck at Started"

# Config-only question, no log:
.\run-sub.ps1 99441979
```

The `total_cost_usd` you see in CLI output is **informational** (the equivalent API
cost). On a subscription login there's no per-token charge — usage counts against
your plan.

## Run it on the API (per-token) — for the multi-user path later

```powershell
$env:ANTHROPIC_API_KEY = "sk-ant-..."      # from https://platform.claude.com/
.\run.ps1 99441979 "C:\Users\you\Downloads\robot.glf" "Stuck at Started"
```

## Model

Both default to `claude-opus-4-8` (best quality — set in each script's `MODEL`).
Switch to `claude-sonnet-5` once the quality ceiling is established, to compare cost.

## Cost tracking (build the API-vs-not business case)

Every run appends one row to `cost_log.csv` with the run's **API-equivalent cost**
(`total_cost_usd` from Claude Code's own accounting — i.e. what it *would* cost on
the API at list prices) plus tokens, duration, and status. This happens
automatically on both engines; on subscription runs the cost is informational, but
it's exactly the figure you want for the "should we pay for API?" decision.

Summarize any time:

```powershell
.\.venv\Scripts\python.exe cost_report.py            # all-time + per-month
.\.venv\Scripts\python.exe cost_report.py 2026-07    # one month
```

Output gives per-month **total** and **average per question**, plus a ready pitch
line ("N lab questions cost an average of $X each"). Run a handful over a month and
you have real data to put in front of the team.

> This lives in the wrapper, not the skill: a model can't measure its own token
> usage mid-run, but the harness sees the final usage/cost JSON. If you run a lab
> question interactively in Claude Code instead of through these scripts, use the
> `/cost` command to see that session's figure.

## Known Phase-0 caveats (things a real service would fix)

- **Runs on THIS machine's dependencies** — workspace, VPN, SVN, Loupe MCP, exactly
  like your interactive setup. A production lab chat runs on one central always-on
  box so lab PCs need none of that.
- **Permissions:** the POC runs fully unattended (`--dangerously-skip-permissions` /
  `bypassPermissions`) so nothing blocks it and we see the ceiling. A lab-facing bot
  must tighten this to a read-mostly allowlist.
- **Log upload:** here you pass a local file path. A chat UI would need a file-drop.
- **PowerShell scripts:** the agent's Bash tool is Git Bash; the prompt tells it to
  invoke `.ps1` scripts via `powershell.exe -File`. Watch it does this reliably.

## Next steps if the POC looks good

- Wrap it in a minimal internal web page (order field + log upload + chat).
- Run it on one central machine that already has VPN/SVN/Loupe.
- Decide the billing model for multi-user (per-seat vs API) — subscription won't
  cover a shared service.
- Start in "triage + draft" mode (you review before the lab sees it), graduate
  well-understood case types to direct-answer, and auto-log resolved cases back
  into `md documents/` so it keeps getting smarter.
```
