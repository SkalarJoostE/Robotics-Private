# Robotics-AI — Access and the Feedback Loop

> **Purpose of this file:** how colleagues outside Software Engineering get access to Robotics-AI,
> and how what they ask flows back so the shared knowledge base grows instead of fragmenting.
>
> It answers open questions **§6.3 (shared state at multi-user scale)** and **§6.4 (licence tier and
> seat count)** in [PROJECT.md](PROJECT.md), and takes a position on **§6.2 (data governance)**.
> Decisions taken here are recorded in PROJECT.md §8 — this file holds the reasoning.
>
> Scope boundary: this is the *organizational* layer, like the rest of `Rollout/`. The technical
> mechanism it relies on (hooks, the capture script) is described here only to the depth a reader
> needs to evaluate it; the parity rules governing instruction files live in `AI_WORKSPACE_PLAN.md`.

**Last updated:** 2026-08-07 — revised the same day against `lab-chat-poc/`, which was built in
parallel on the other PC and lands most of what §5 originally described as future work. §2 now uses
measured cost and plan-limit data instead of estimates, and records the licensing constraint that
decides seats-vs-API; §4 defers to the `md documents\Lab Questions\` rules; §5 is rewritten around
what exists.

---

## 1. Three decisions, not one

"API calls or personal seats" sounds like a single question. It is three, and they are independent —
any option on one axis works with any option on the others. Presenting them as one invites a manager
to approve "seats" and believe the distribution and logging questions are settled too.

| Axis | The question | Who decides |
|---|---|---|
| **A — Access** | How people are billed and authenticated | Manager, finance, IT |
| **B — Distribution** | How the workspace gets onto their machine | IT, Software Engineering |
| **C — Feedback loop** | How what they ask comes back for review | Software Engineering |

---

## 2. Axis A — Access and billing

| Option | What it is | Fits when |
|---|---|---|
| **A1 — Personal seats** | Each user has their own Claude login; flat per-seat cost | Daily users. Predictable budget, per-user visibility, no per-question cost anxiety |
| **A2 — API keys** | Pay per token, one key per person, per-key spend caps | Unattended/automated paths where volume is predictable and attribution matters |
| **A3 — Cloud tenancy** (Bedrock / Vertex / Foundry) | Claude runs inside the company's own cloud account | The answer to a security objection, not a cost option. Costs more than A1; some features unavailable |
| **A4 — No individual access** | One shared instance behind a request channel | Occasional users who will never open a terminal. **Necessarily API-billed** — a shared service cannot run on one person's subscription. See §5 |

**Decision: seats for named individuals; API for anything shared.** Helpdesk pilot = 1–2 named
people = 1–2 seats.

### The licensing constraint that decides it

A subscription is **scoped to one person**. Routing several users through one subscription login is
not permitted. This is not a cost judgement, it is a hard boundary, and it settles the shape of the
whole rollout:

- A named individual who works with the assistant daily → **a seat**.
- A shared service many people talk to (the chat front door, §5) → **API**, structurally. It cannot
  be a seat no matter how few questions it handles.

`lab-chat-poc/` already reflects this: the CLI-driven chats bill against one person's subscription
and are labelled a prototype, while `lab_triage.py` runs on the Agent SDK with an API key and is
described in its own README as *"the future multi-user shared service."* Subscription gets the
prototype; it cannot be the product.

### What it costs — measured, not estimated

`lab-chat-poc/cost_log.csv` has logged every turn since 2026-07-28. Numbers below are from
`python cost_report.py --totals` over 11 conversations / 16 questions, and are **API-equivalent at
published list rates** — what this work would cost to buy on the API:

| | Per conversation | |
|---|---|---|
| **Average** | **€3.91** | 9m 44s start to finish |
| Service ticket (RB/ES) | €5.98 | 17m 33s — carries scraper intake, customer software, logs |
| Lab question | €3.45 | 8m 00s |

And what one seat actually supports, from the fitted token → plan-usage conversion
(`plan_calibration.json`):

> **~7 conversations in a working day, and the 5-hour session window is what binds — not the weekly
> allowance.** The week would permit ~12/day; the 5-hour window permits ~5 per session. Spreading
> work across the week does not help; waiting for the session window to roll over does.

Two consequences for the pitch:

1. **Seat-vs-API is no longer an argument, it is arithmetic.** A Helpdesk engineer running 3–4
   conversations a day is ~€250–330/month of API-equivalent work. Compare that against a seat price
   directly.
2. **Seat count is driven by the 5-hour window, not by headcount.** A second person is a second seat
   not because of cost but because they would otherwise contend for the same session window.

Both figures carry caveats the POC states plainly and this document inherits: the plan conversion is
fitted from 6 fully-measured chats via a deliberately conservative lower-envelope estimator (it errs
toward *too many* seats), the usage endpoint reports whole percentage points so per-chat 7-day
figures are coarse, and it should be re-fitted once more chats have run with nothing else touching
the account. **Re-run `python cost_report.py` before quoting any of this** — the log grows.

> **These are un-optimised figures.** Every logged conversation predates the context-cost analysis in
> [Token-Usage-Analysis.md](Token-Usage-Analysis.md), which found over half a session's cost paid on
> a 71k-token floor before any work started, and one skill load accounting for 31% of a session.
> Quote €3.91 as what unoptimised use costs, not as an irreducible unit cost. The **seat-count**
> argument below is unaffected — the 5-hour window tracks output and cache writes, which are exactly
> the tokens those levers move least.

> **Do not use the CLI's own cost figure.** Measured 2026-08-06, it prices `claude-opus-5` at Sonnet
> rates — out by 5/3. `pricing.py` recomputes from each turn's tokens at published rates, and that is
> what the numbers above use. `python pricing.py --audit` re-checks it.

**API keys are also the right shape for the unattended paths** — the ticket scraper's AI step
(`AI_WORKSPACE_PLAN.md` F13 / Phase 3) and anything scheduled. Volume there is predictable and
per-run attribution is genuinely useful.

**On §6.2, data governance:** customer logs, customer software and Jira content are sent to a cloud
model today. A3 exists precisely for this, and switching to it is a **configuration change, not a
redesign** — the workspace, skills and tooling are unaffected. Say this to IT/security during Phase A
rather than discovering it in Phase C.

> **Do not quote a seat price from this document.** Confirm current tiers and what each includes with
> Anthropic before any number goes on a slide.

---

## 3. Axis B — Distribution

The GitHub-account requirement is not inherent to the workspace. It is an artefact of where the repo
currently lives, and `SETUP.md` names it as the one prerequisite the bootstrapper cannot remove.

| Option | Verdict |
|---|---|
| **B1 — Company Bitbucket** | **Chosen.** Everyone already has Atlassian credentials for Jira and Confluence, and `Setup-Workspace.ps1` already clones `robotics-core` and `robotics-plugin` from Bitbucket. Deletes the personal-account problem, puts the repo under existing corporate identity, and costs one remote change plus a line in `Bootstrap-RoboticsAI.bat` |
| **B2 — Company GitHub org with SSO** | Equivalent effect; worse only because it introduces a second identity system for something Bitbucket already covers |
| **B3 — Read-only distribution from a share** | Fallback if repo access is refused outright. Loses the contribute-back path — though per §4 that path should not run through user clones anyway |

**Move before the pilot, not after.** Relocating once two Helpdesk users already have working clones
means re-cloning their machines and troubleshooting two setups instead of zero.

---

## 4. Axis C — The feedback loop

### The principle: capture cheaply, promote deliberately

The workspace has already made this call twice, and both precedents point the same way:

- `Historical-B-Feature-Discovery/Index Cards/` (cheap, machine-built, all 1,276 orders) →
  `verified-features/` (curated, human-confirmed)
- The RMT register and the planned RB/ES index → the `AI_*_Log.md` case base, promoted on use

And the merge-everything version was already **rejected**, in `AI_WORKSPACE_PLAN.md` §5 (2026-07-29):
37 verified entries buried under ~450 bulk imports would make "search the case base first" cost more
than it returns. Auto-committing colleagues' sessions into the repo is that same mistake at higher
volume, and it puts customer and site names into git — the specific reason the RB/ES index was
agreed to be git-ignored.

So: **Tier 1 captures everything, outside the repository. Tier 2 is the curated case base, and
entries reach it only when a Software Engineer decides they earned it.**

### This pattern is already running for chats — reuse it, do not reinvent it

`md documents\Lab Questions\` is the same two-tier shape, already built and already governed by
rules worth copying rather than paraphrasing:

- **The scope line is drawn on verification, not on topic.** *"A chat is not a resolution. Nobody
  confirmed the answer on the robot, no fix was verified, and the conversation may have ended on a
  hypothesis. Mixing that into the case base would dilute logs whose value depends on every entry
  being something that actually worked."*
- **One hard rule, stated as an absolute.** A chat may write **only** inside that folder — never the
  five `AI_*_Log.md` files, the Template Known Issues pages, a `verified-features` dossier,
  `AI_WORKSPACE_PLAN.md`, or memory.
- **Promotion is an explicit, human step.** When a chat finds something real, the entry records it
  under **Escalation**, naming the log it belongs in. A human confirms and files it — *"the moment an
  unverified answer becomes an institutional fact."*

**The two capture surfaces are complementary, not competing:**

| Surface | Covers | Tier 1 lands in |
|---|---|---|
| `md documents\Lab Questions\` | Chat sessions via `lab-chat-poc` | The folder itself (committed) |
| Hook capture (below) | Interactive seat sessions on a colleague's own machine | Internal-share inbox (not committed) |

They differ in where Tier 1 lives because they differ in what it contains: a Lab Questions entry is a
written-up answer a human chose to keep, whereas a raw session transcript is unfiltered and names
customers and sites. **The escalation and promotion rules should be identical, and are taken from
Lab Questions rather than invented here.**

### How it works — specification, nothing built yet

**Nothing implements this today.** A working prototype was built and verified end-to-end on
2026-08-07, then **removed from the repository on purpose** (decision, 2026-08-07): a capture
mechanism that ships in the committed settings file starts capturing on every machine that pulls,
and that must not happen before the access decision is taken and colleagues have been told. This
section is the spec, kept complete enough to rebuild from in an hour when the pilot starts.

The mechanism is two Claude Code hooks driving one PowerShell script:

| Hook | Fires | Writes |
|---|---|---|
| `UserPromptSubmit` | The moment a question is submitted | Appends the question, user, timestamp and working directory to `<inbox>\<user>\<date>_<session>.md` |
| `SessionEnd` | When the session closes | Appends a closing line and copies the full transcript (`.jsonl`) alongside |

The script reads the hook payload as JSON on stdin — `session_id`, `cwd`, `transcript_path`, and for
`UserPromptSubmit` the `prompt`.

Three design rules it must hold to:

1. **It can never break a session.** Every failure path exits 0. Unreachable share, no VPN, path not
   configured — the session continues and nothing is captured.
2. **It runs asynchronously.** The user's turn is never blocked waiting on a file write.
3. **It writes outside the repository.** Nothing it produces can be accidentally committed.

Two implementation traps, both already documented elsewhere in this workspace and both hit during the
prototype:

- **Register the hooks in exec form, not as a shell string.** `Tools&Scripts` contains an `&`, which
  a PowerShell shell-form command mis-parses. Using the hook config's `args` array spawns the
  executable directly with no shell, so the path never reaches a parser. Same trap as the Loupe MCP
  path (`AI_WORKSPACE_PLAN.md` §5, 2026-07-09).
- **PS 5.1 encoding.** Keep the script pure ASCII (PS 5.1 mis-parses non-ASCII literals in the script
  file itself) and write output with `UTF8Encoding($false)` rather than `Add-Content`, which defaults
  to the system ANSI codepage (`AI_WORKSPACE_PLAN.md` §5, 2026-07-29).

The hook config that was proven working, for reference when rebuilding:

```json
"hooks": {
  "UserPromptSubmit": [
    { "hooks": [ { "type": "command", "command": "powershell",
        "args": ["-NoProfile","-ExecutionPolicy","Bypass",
                 "-File","Tools&Scripts/Capture-SessionToInbox.ps1",
                 "-Event","UserPromptSubmit"],
        "async": true, "timeout": 15 } ] }
  ],
  "SessionEnd": [
    { "hooks": [ { "type": "command", "command": "powershell",
        "args": ["-NoProfile","-ExecutionPolicy","Bypass",
                 "-File","Tools&Scripts/Capture-SessionToInbox.ps1",
                 "-Event","SessionEnd"],
        "async": true, "timeout": 30 } ] }
  ]
}
```

It belongs in the **committed** `.claude\settings.json` when the time comes, because that is what
makes it apply to everyone who clones: no per-user setup, nothing for a colleague to remember, no
dependence on someone recalling a trigger phrase. That same property is why it is not there now.

**Location.** A local folder default (`%LOCALAPPDATA%\Skalar\Robotics-AI-Inbox`) makes the loop
observable before a share exists; production value is an internal share, set per machine via a
`ROBOTICS_AI_INBOX` environment variable. It must stay internal — transcripts contain customer and
site names.

**Full transcripts, at least at first** (decision, 2026-08-07). Question-and-answer alone is cheaper
and less sensitive, but early on the value is in seeing *where a session went wrong* — which wrong
turn it took, which skill failed to trigger, which piece of context was missing. That is invisible in
a summary. Taper to summaries once it is clear what is worth keeping.

### What colleagues are told

Not optional. A capture mechanism discovered by accident poisons adoption permanently. Both usage
plans should state it plainly, and the honest framing is available:

> Claude Code already writes a full transcript of every session to your own machine. This copies that
> transcript to an internal folder so a Software Engineer can review what was asked and add the
> worthwhile cases to the shared knowledge base. It captures your questions and Claude's answers —
> not your keystrokes, not your files. It never leaves the company network.

### Known limitation: Claude only

Hooks are a Claude Code mechanism. GitHub Copilot and Codex have no equivalent, so the loop does not
exist for a user on those. This does **not** violate the parity rule in `AI_WORKSPACE_PLAN.md` §1 —
that rule governs how *context* is loaded, and all three assistants still load identical context. But
it is a real argument for standardising the pilot on Claude Code, which is also what Axis A concluded
for unrelated reasons.

### Promotion into the repo

Reviewed inbox entries that establish something durable go into `md documents\` through the existing
`skalar-session-wrapup` route. Nothing changes about how the case base is written — only who supplies
the raw material.

The one thing that **should** come from more people than the maintainer is `verified-features/`
dossiers and case-base write-ups authored directly. That path is a pull request from a user's own
clone, which is appropriate precisely because it is rare and deliberate: a handful a month, each
worth a review. Once B1 lands, that is a Bitbucket PR against an account they already have.

---

## 5. The chat front door (A4) — the engine already exists

**This is further along than a plan.** `lab-chat-poc/` is a working multi-turn chat, in use since
2026-07-28, with 11 conversations logged. It is not a mock-up and not a parallel implementation: it
drives the workspace's own context — `CLAUDE.md`, every `.claude/skills`, the Loupe MCP from
`.mcp.json` — with no re-implementation, so an answer it gives is the answer the interactive session
would give.

Two channels, one engine (`chat_engine.py`):

| Channel | Launcher | Runs | Files findings to |
|---|---|---|---|
| Lab question about an order | `Lab-Chat.bat` | `skalar-lab-issue` | `md documents\Lab Questions\` |
| Helpdesk ticket (RB / ES) | `Helpdesk-Chat.bat` | `skalar-jira-issue` | `Service Items\<KEY>\analysis.md` |

Both are multi-turn — follow-ups keep everything already read — and both are read-mostly by
construction: the helpdesk channel **never writes to Jira**, stated as an absolute in both the
opening and wrap-up prompts so a later message cannot talk it into posting. `done` produces a
*draft* reply for a human to send.

It also carries the measurement layer §2 depends on: per-turn cost logging, live subscription-window
sampling, and a fitted token → plan-usage conversion.

### What is therefore already answered

- **Does an agent-driven conversation reach the answer a Software Engineer would?** Being tested, on
  real cases, with the write-ups in `md documents\Lab Questions\` as the record.
- **What does it cost, in money and in plan limits?** §2 — measured.
- **Does a shared service need seats or API?** Settled by licensing, not preference — see §2.

### What is actually missing

The gap is narrower and more specific than "build a bot", and the POC's own README states it:

| Gap | Note |
|---|---|
| **Transport** | Launched by `.bat` on one machine. Nothing accepts a question from elsewhere |
| **Hosting** | Runs on *this* machine's workspace, VPN, SVN and Loupe. A lab-facing service needs one central always-on box so lab PCs need none of that |
| **Permission hardening** | The POC runs `--dangerously-skip-permissions` so nothing blocks mid-answer. A lab-facing bot must tighten to a read-mostly allowlist first |
| **Billing engine** | The CLI engine bills one person's subscription and cannot be shared. `lab_triage.py` (Agent SDK + API key) is the multi-user path |
| **File drop** | A log is passed as a local path today; a chat UI needs an upload |

**Transport is still the expensive part, and Jira is still the cheap way in.** A Teams bot needs an
Azure app registration, a Bot Framework resource, a reachable HTTPS endpoint and tenant-admin
consent. `Process-ServiceTickets.ps1` already polls Jira, authenticates from `jira-config.json` and
can post back — every credential involved is already approved.

### Why it still does not replace seats

1. **Licensing.** A shared service cannot run on a subscription (§2). It is an API cost centre from
   day one, at roughly €3.91 per conversation.
2. **Concurrency.** Two people asking about the same order means two processes running
   `fetch-project.ps1` against the same folder, and that script does `svn revert -R` unconditionally.
   A queue serialised per order is a prerequisite, not a nicety.
3. **It worsens §6.1.** An always-on box that fails silently at 2am is one more thing only one person
   can fix.
4. **It is the highest-risk surface for the failure flagged in §7** — *"first wrong answer kills
   adoption."* A seat user watches the reasoning and catches the wrong turn; a channel reader gets a
   confident paragraph.

### The staged plan

**Stage 1 — triage-and-draft, with a human in front.** Colleagues send questions; the chat answers;
**a Software Engineer reviews before the asker sees it.** This is the POC's own recommended next
step, and it is the honest form of "stage 1" now that the engine exists — the review step, not the
manual running of the tool, is what mitigates §7 while no confidence gate is built. It still produces
the **Arm B evidence** the replay protocol calls the stronger arm (PROJECT.md §8, 2026-07-29), and
`md documents\Lab Questions\` is already the folder that record lands in.

**Stage 2 — graduate well-understood case types to direct answers**, keeping review on everything
else. This is where a confidence gate (F13) earns its keep.

**Stage 3 — real transport and hosting.** Jira first (cheap, approved, reuses the scraper); a central
box with VPN/SVN/Loupe; a minimal internal web page with an order field and log upload. A Teams bot
only once the earlier stages justify the IT ticket.

---

## 6. The internal file server

Three different things get called "putting the workspace on the server". They have three different
answers.

| Use | Verdict |
|---|---|
| **The Tier-1 inbox** (§4) | **Yes — best fit.** Small append-only files, no locking, no concurrency, everyone can already reach it, customer data stays inside the network, nothing new to provision |
| **An onboarding seed bundle** | **Worth measuring.** A fresh clone has the repo but none of the generated layer — `Sequences/` is git-ignored, so day one is ten SVN template checkouts over VPN plus regeneration. A share holding pre-generated `Sequences\` CSVs and the template `docs\` (including `error-codes.md`) would cut that materially. Caveat: the `Template *` folders are SVN working copies and must still be checked out locally — only the derived artefacts can be shortcut |
| **Running the workspace from the share** | **No.** See below |
| **Hosting the always-on A4 box** | **Probably not that machine.** A file server and a machine that runs an agent are different things; this one would need VPN, SVN, Python and permission to run arbitrary tooling. Ask IT for a small VM rather than putting it on infrastructure others depend on |

**Why not run it from the share.** This is the intuitive answer and it will bite:

- `fetch-project.ps1` refreshes in place with `svn revert -R` + `svn update`. Two people refreshing
  the same order simultaneously corrupts a working copy.
- Git working copies and SVN checkouts over SMB are slow and lock-prone.
- `.claude\settings.local.json`, the generated `.agents\` Codex adapters and `jira-config.json` are
  per-machine and would collide.
- `Update-CoreVersion.ps1` already needs a temporary NTFS junction to survive deep paths *locally*;
  UNC makes that worse. And `Tools&Scripts` contains an `&`, which already had to be designed around
  once (`AI_WORKSPACE_PLAN.md` §5, 2026-07-09).

**The rule: local clones, shared outputs.**

---

## 7. What to put in front of the managers

> Pilot: two Claude seats for named Helpdesk users. The repo moves to company Bitbucket, so no
> personal accounts and no new identity system. Every question and answer is captured to an internal
> folder for review — nothing enters the shared knowledge base until a Software Engineer verifies it.
> Customer data stays in the local workspace and on the internal share; if IT wants it inside our own
> cloud tenancy, that is a configuration change, not a redesign.
>
> We have measured this rather than estimated it: 11 real conversations logged since 2026-07-28, at
> **€3.91 of API-equivalent work each**, and one seat supports about **seven conversations a working
> day**. A shared service for occasional users is a separate, API-billed decision — a subscription
> cannot be shared between people.

Licences remain the secondary line item. The headline ask is still allocated development time
(PROJECT.md §8, 2026-07-25). The difference from a month ago is that the licence line is now
defensible to a finance question rather than a guess.

---

## 8. Open items

- [ ] Confirm current Claude seat tiers and what each includes, then compare against the measured
      €3.91/conversation and ~7 conversations/seat/day from §2.
- [ ] Re-run `python cost_report.py` and re-fit `plan_calibration.py` once more chats have run with
      nothing else on the account — the current fit rests on 6 fully-measured chats.
- [ ] Agree the inbox share path.
- [ ] Add the capture disclosure (§4) to `Helpdesk-Usage-Plan.md` and `Lab-Usage-Plan.md`.
- [ ] **At pilot start, and not before:** build the capture script and register its hooks from the
      spec in §4. Gated on the two items above — colleagues are told first, share path agreed first.
- [ ] Confirm the Bitbucket move — who authorises it, and update `SETUP.md` /
      `Bootstrap-RoboticsAI.bat` when it happens.
- [ ] Open the data-governance question with IT/security, leading with A3 as the available answer
      (already PROJECT.md §9).
- [ ] Harden `lab-chat-poc` permissions (drop `--dangerously-skip-permissions` for a read-mostly
      allowlist) before anyone outside Software Engineering uses it.
- [ ] Run Stage 1 — triage-and-draft with a Software Engineer reviewing before the asker sees the
      answer — and keep filing to `md documents\Lab Questions\`.
- [ ] Measure whether an onboarding seed bundle on the share meaningfully beats a cold
      `Sync-Templates.ps1` run.
