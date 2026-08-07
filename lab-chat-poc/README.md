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
| **API-equivalent money** (`api_cost_usd` / `api_cost_eur`) | what that turn would cost on the API at **published list rates**, computed from the turn's own tokens — the "should we buy API access?" number |
| **Subscription limits** (`five_hour_pp` / `seven_day_pp`) | percentage points of the 5-hour and 7-day windows the turn consumed — the "how many seats would we need?" number |

Two supporting columns exist because the obvious source for each of those turned out to be
unreliable: `cost_usd` / `cost_eur` is the CLI's *own* cost figure, kept as the raw
observation but **not** what the report reads (it misprices Opus 5 — see below); and
`est_plan_pp` is the plan cost derived from tokens instead of measured account-wide.

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

> **Do not use the CLI's cost figure for Opus 5.** Measured 2026-08-06, `total_cost_usd`
> prices `claude-opus-5` tokens at Sonnet 5's rate card — $3/$15 per MTok instead of
> $5/$25, with cache rates scaled to match. Reconciling the whole log by model shows it is
> one model's rate entry, not a systemic problem:
>
> ```
> model                   rows      CLI $   published $   ratio
> claude-opus-4-8            2     2.7299        2.7283   0.999
> claude-opus-5             20    26.2631       43.6961   1.664   <- disagrees
> ```
>
> Opus 4.8 is right to a tenth of a percent; Opus 5 is off by exactly 5/3, the signature of
> a rate table that does not yet know the model and falls back to a Sonnet-tier default.
> `pricing.py` therefore recomputes cost from each turn's own tokens at published rates,
> and that is what `api_cost_*` and every report hold. Re-check at any time — if a future
> CLI release fixes its table, the ratio moves to 1.000 and this note can go:
>
> ```powershell
> python pricing.py --audit
> ```

**Cache writes are most of the bill.** This workload is ~95% cache reads by volume, but
cache *writes* dominate cost, and Claude Code writes **1-hour** cache entries — billed at
2× the input rate against 1.25× for 5-minute ones. The split is logged separately
(`cache_write_5m_tokens` / `cache_write_1h_tokens`) because it is the largest single lever
on the money figure. A turn that fans out to a second model is priced per model from the
result JSON's `modelUsage`, and the models that ran are recorded in `models`.

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

### Why the measured pp figure is an upper bound

The usage endpoint is **account-wide**. It has no session, chat or process dimension, so a
before/after delta is really *everything the account consumed during that turn's wall-clock
span*. Run two chats at once and each bills itself for both; an interactive Claude Code
session, Claude Desktop or claude.ai in a browser all land in the same bucket. Because
`delta()` discards negative differences, contamination can only ever **inflate** — which,
for a "how many seats do we need?" number, errs toward buying too many.

Tokens have no such problem: they come from the turn's own process. So the fix is to stop
measuring plan cost per turn and measure the **conversion** once instead:

```powershell
python plan_calibration.py          # fit from the log, show the evidence, save nothing
python plan_calibration.py --save   # store it; new turns then fill est_plan_pp
```

**One weight per token type, not one scalar.** The first version converted through money
(`est_pp = api_cost_usd × k`), which assumes the plan weights token types the way the rate
card does. Measured against the log, it doesn't — that model explains almost none of the
variance:

| model form | R² | adj R² |
|---|---|---|
| price-proportional (1 scalar) | 0.067 | — |
| output + cache_write (2 weights) | 0.633 | 0.388 |
| all three (3 weights) | 0.895 | 0.738 — but `cache_read` fits **negative** |

Cost and plan consumption are different functions of the same tokens. Cache reads are ~95%
of token volume and a large share of the bill, yet contribute nothing measurable to plan
usage — their weight goes negative whenever fitted, which is physically impossible and
means "indistinguishable from zero". Plan windows track **generation and cache writes**,
not re-reading cached context. So `cache_read` and `input` are pinned at 0 and the model is:

```
est_pp = output_tokens × w_output  +  cache_write_tokens × w_cache_write
```

**Fitted against one-sided noise.** Contamination only inflates, so the true surface lies
at or *below* every observation. Least squares splits the difference; the right estimator is
the **lower envelope** — the largest weights whose prediction never exceeds an observed
value. That is a tiny linear program solved by enumerating which chats bind. The result is
conservative by construction (it sits at or above the truth in aggregate), so it errs
toward too many seats rather than too few, and tightens as cleaner data arrives.

`plan_calibration.py` prints the per-chat **headroom** — how much of each chat's measured pp
its own tokens don't explain, i.e. the most concurrent work could have added. Chats with
zero headroom are the ones the fit rests on.

Two caveats keep it provisional: the endpoint reports **whole** percentage points, so the
7-day totals (1–3pp a chat) are coarse; and as of 2026-08-06 only 6 chats are fully
measured. **Re-fit once a few chats have run with nothing else touching the account.**

> A chat is only usable if **every** turn has a measured pp. A blank means the endpoint was
> unavailable, which is not the same as zero — summing blanks as zeros makes an unmeasured
> chat look like a large chat that consumed nothing, and that alone inverted an earlier
> version of this fit.

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

The measurement side is four small modules, each with one job:

| Module | Job |
|---|---|
| `cost_log.py` | one CSV row per turn; migrates the schema in place when it grows |
| `pricing.py` | published rate card; turns a turn's tokens into money (`--audit` re-checks the CLI against it) |
| `usage_limits.py` | reads the live subscription windows from the OAuth usage endpoint |
| `plan_calibration.py` | fits tokens → percentage points, so plan cost survives concurrent chats |

> **Editing these while a chat is open:** `cost_log.py` migrates `cost_log.csv` to whatever
> schema the *running* process holds in memory. A chat started before a schema change will
> therefore try to migrate the log **backwards** when it writes. `_write` now refuses that
> and appends to the on-disk header instead — but finish open chats before pulling changes
> if you can.

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
