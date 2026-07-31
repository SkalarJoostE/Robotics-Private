# Skalar assistant chats — proof-of-concept

Multi-turn chats that run the workspace's own skills, reusing the **same context you use
interactively** — `CLAUDE.md`, all the `.claude/skills`, and the Loupe MCP from `.mcp.json`
— with zero re-implementation.

**Purpose:** find out how close an assistant-driven conversation gets to the answer you
produce by hand, and measure what it costs — in money *and* in subscription limits —
before investing in a real UI.

Two channels, one engine:

| | Launcher | Runs | Writes findings to |
|---|---|---|---|
| **Lab question** about an order | `Lab-Chat.bat` | `skalar-lab-issue` | `md documents\Lab Questions\` |
| **Helpdesk ticket** (RB / ES) | `Helpdesk-Chat.bat` | `skalar-jira-issue` | `Service Items\<KEY>\analysis.md` |

Both share [`chat_engine.py`](chat_engine.py), so they stream, cost, log and summarise
identically — only the prompts and the write destination differ. Costs are logged with a
`channel` column so the report prices the two kinds of work separately.

## Helpdesk: `Helpdesk-Chat.bat`

Name the ticket(s). The chat refreshes each one through the local Jira scraper
(`Process-ServiceTickets.ps1 -Reprocess <KEY> -EnsureBaseline -LocalIntakeOnly`), triages
the evidence it produces — `description.md`, `attachment-processing.json`, the customer
software, the SVN comparison checkout, extracted logs — checks the case base and template
known issues, and answers. Then you follow up.

```powershell
.\helpdesk_chat.py RB-380
.\helpdesk_chat.py RB-380,ES-212 "customer says it started after the update"
```

**It never writes to Jira.** No comments, no transitions, no field edits, no attachments.
That is stated as an absolute in both the opening and the wrap-up prompt, so a later
message cannot talk it into posting. It also never commits to SVN and never contacts the
customer. `done` writes `Service Items\<KEY>\analysis.md` — symptom, evidence, root cause
and confidence, verification, open questions, and a **draft** Jira reply for you to send
yourself.

By default it diagnoses rather than modifies. If you explicitly ask mid-chat for the fix to
be implemented, it may make local changes in the ticket's prepared workspace following
`skalar-feature-implementation` — but never on its own initiative.

VPN is required: the scraper needs Jira and SVN.

## Lab questions: `Lab-Chat.bat`

Double-click it (or drag a `.glf` onto it). It asks for the order number, log path and
question, answers, and then **stays open so you can follow up**:

```
you> that motor is actually disabled on this system, check again
you> which setting controls the rinse time?
you> cost
you> done
```

The same four commands work in both channels:

| Command | What it does |
|---|---|
| *(anything else)* | a follow-up question in the same session — the assistant still has everything it just read |
| `cost` | running per-question breakdown so far |
| `done` | finish, and **offer** to write the findings (never automatic) |
| `quit` | finish without writing anything |

From a terminal it is the same thing:

```powershell
.\lab_chat.py 99441979 "C:\Users\you\Downloads\robot.glf" "Run never finishes, stuck at Started"
.\lab_chat.py 99441979          # config question, no log — this is supported, see below
```

### No log is a first-class case

A question with no log is answered from the software: the Sequence/SubSequence CSVs, the
application's tables, the action code, the case base and the template's known issues. The
chat will **not** demand a log before answering. If a log would settle what is left open it
says so at the end, naming the log and what it would look for.

### What a lab chat files at the end

`done` offers to write the chat up in **`md documents\Lab Questions\`** — and nowhere else.
That folder is deliberately separate from the case base: a chat is a question that got an
answer, not a fix that was verified on a robot.

The wrap-up is barred from touching `AI_Lab_Resolution_Log.md`, the ticket/template/feature
logs, the Template Known Issues pages, the feature dossiers, `AI_WORKSPACE_PLAN.md`, memory,
or any robot software. If a chat turns out to have found something real, the entry records
that under **Escalation** and names the log it belongs in — a human confirms it and files it.
See [`md documents\Lab Questions\README.md`](../md%20documents/Lab%20Questions/README.md).

## Cost tracking — the two numbers that decide per-seat vs API

Every **turn** appends a row to `cost_log.csv` with both:

| | |
|---|---|
| **API-equivalent money** (`cost_usd` / `cost_eur`) | what that turn would cost on the API at list prices — the "should we buy API access?" number |
| **Subscription limits** (`five_hour_pp` / `seven_day_pp`) | percentage points of the 5-hour and 7-day windows the turn consumed — the "how many seats would we need?" number |

```powershell
python cost_report.py            # per-chat breakdown + monthly totals
python cost_report.py 2026-07    # one month
python cost_report.py --totals   # skip the per-chat detail
```

The per-chat view is the one to read:

```
Chat 5 — 2026-07-30 — helpdesk — ticket RB-380 — 2 question(s)
    Q1       solve RB-380                                   €   2.85
    Q2       the customer software is the newer one          €   0.41
    wrap-up  wrap-up: write the findings                     €   0.57
             total                                          €   3.83
             subscription: 5h +4.00pp · 7-day +2.00pp
```

…and below the monthly table, the channel split — a ticket carries scraper intake,
customer software and logs, so it is not the same unit of work as a lab question:

```
channel        chats   total EUR   EUR/chat   7d pp/chat
helpdesk           1        3.83       3.83         2.00
lab                4        8.05       2.01         0.50
```

Euros convert at `LAB_CHAT_EUR_PER_USD` (default 0.92) — Anthropic bills in USD, so both
columns are kept.

### How the numbers are obtained (and what to distrust)

**Money.** In a multi-turn session the CLI's `total_cost_usd` is **cumulative for the
session** while `usage` is **per turn**. A turn's own cost is therefore the *increment*
over the previous result; logging the raw total double-counts every turn after the first.
Verified 2026-07-30.

**Limits.** The result JSON carries no quota data at all, so `usage_limits.py` fetches it
from `GET /api/oauth/usage` — the endpoint behind the CLI's own `/usage` screen — and
snapshots it before and after each turn. Three things to know:

- It is an **internal, undocumented endpoint**. It can change or vanish. Every failure path
  degrades to "no limit data" and the chat carries on.
- It reports **whole percentage points**, so a short turn legitimately measures as `0.00pp`.
  Per-chat and per-week totals are meaningful; per-question ones are coarse.
- It is **rate-limited** (429 after a handful of rapid calls — measured). The module caches
  for 15s and backs off on 429, honouring `Retry-After`.

Check it any time — this prints percentages only, never the token:

```powershell
python usage_limits.py
```

### The access token

The limits call needs the OAuth token `claude` already stored on this machine. `usage_limits.py`
only ever **reads** `~/.claude/.credentials.json`; it never writes, moves or refreshes it. The
token is held for the duration of one HTTPS request to a hardcoded `api.anthropic.com` URL, is
never returned to a caller, printed, or written to `cost_log.csv`, and error text is scrubbed
before display. On a 401 it reports "run `claude` once to refresh" rather than attempting an
OAuth refresh itself — rewriting the credential store is the CLI's job.

## The other engines

| Script | Engine | Billing | Who it's for |
|---|---|---|---|
| **`lab_chat.py`** (`Lab-Chat.bat`) | Claude Code CLI, multi-turn | **Your subscription — no per-token** | Lab questions. |
| **`helpdesk_chat.py`** (`Helpdesk-Chat.bat`) | Claude Code CLI, multi-turn | Your subscription | RB/ES tickets. |
| `lab_triage_cli.py` (`run-sub.ps1`) | Claude Code CLI, one-shot | Your subscription | Scripted/unattended single questions. |
| `lab_triage.py` (`run.ps1`) | Claude Agent SDK | Per-token API key | The future multi-user shared service. |

All four share `prompt_common.py`, and the two chats share `chat_engine.py`, so behaviour is
identical — only the prompts, engine and billing differ. All default to `claude-opus-5`
(override with `LAB_CHAT_MODEL`); keep them on the same model or the billing comparison is
meaningless.

> **Licensing reality:** a subscription is scoped to one person. Anthropic does not allow
> routing many users through your subscription login. So the CLI engine is perfect for **you**;
> a real lab-facing shared chat must be per-seat or the API engine. Subscription gets us the
> prototype, not the product.

## Known caveats (things a real service would fix)

- **Runs on THIS machine's dependencies** — workspace, VPN, SVN, Loupe MCP. A production lab
  chat runs on one central always-on box so lab PCs need none of that.
- **Permissions:** the POC runs unattended (`--dangerously-skip-permissions`) so nothing blocks
  mid-answer. A lab-facing bot must tighten this to a read-mostly allowlist.
- **Log upload:** you pass a local file path; a chat UI would need a file-drop.
- **PowerShell scripts:** the agent's Bash tool is Git Bash, so the prompt tells it to invoke
  `.ps1` files via `powershell.exe -File`. Watch that it does this reliably.
- The CLI polls the same usage endpoint for its own display, so our polling shares that budget.

## Next steps if this looks good

- Wrap it in a minimal internal web page (order field + log upload + chat).
- Run it on one central machine that already has VPN/SVN/Loupe.
- Decide the billing model for multi-user (per-seat vs API) — using the two columns above.
- Start in "triage + draft" mode (you review before the lab sees it), graduate well-understood
  case types to direct answers, and promote the strongest Lab Questions entries into the case
  base so it keeps getting smarter.
