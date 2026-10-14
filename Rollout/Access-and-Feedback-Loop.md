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

**Last updated:** 2026-10-02 — new §8 designs the Lab pilot on a colleague's own laptop: how the
clone stays current (`stable` branch, sparse checkout, a session-start update), what a lab machine may
write (a role lock, plus drafts to a share instead of the repo), how robot logs reach the laptop, and
the robot-PC ↔ laptop workflow. Open items move to §9. Previously 2026-08-07 — revised against
`lab-chat-poc/`, which was built in parallel on the other PC and lands most of what §5 originally
described as future work. §2 uses measured cost and plan-limit data, and records the licensing
constraint that decides seats-vs-API; §4 defers to the `md documents\Lab Questions\` rules; §5 is
rewritten around what exists.

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
**recomputed from each turn's token counts** over 14 costed conversations / 29 turns, and are
**API-equivalent at published list rates** — what this work would cost to buy on the API:

| | Per conversation | |
|---|---|---|
| **Average** | **€4.44** | 10m 43s start to finish |
| Service ticket (RB/ES) | €6.23 | 16m 30s — carries scraper intake, customer software, logs |
| Lab question | €3.73 | 8m 25s |

> **Do not re-derive these with `cost_report.py` until its logger is fixed.** In the three most
> recent chats the `api_cost_*` column records a **running session total** rather than that turn's
> own cost, and `cost_report.py:143` sums the column — so it double-counts them. The figures above
> come from token counts, which are per-turn and correct in every row. See PROJECT.md §8, 2026-08-19.
> These supersede the earlier €3.91 / €5.98 / €3.45.

And what one seat actually supports, from the fitted token → plan-usage conversion
(`plan_calibration.json`):

> **~7 conversations in a working day, and the 5-hour session window is what binds — not the weekly
> allowance.** The week would permit ~11/day; the 5-hour window permits ~4 per session. Spreading
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
> Quote €4.44 as what unoptimised use costs, not as an irreducible unit cost. The **seat-count**
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
2026-07-28, with 15 conversations logged. It is not a mock-up and not a parallel implementation: it
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
   day one, at roughly €4.44 per conversation.
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
| **An onboarding seed bundle** | **Worth measuring.** A fresh clone has the repo but none of the generated layer — `Sequences/` is git-ignored, so day one is ten SVN template checkouts over VPN plus regeneration. A share holding pre-generated `Sequences\` CSVs and the template `docs\` would cut that materially. Caveat: the `Template *` folders are SVN working copies and must still be checked out locally — only the derived artefacts can be shortcut |
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

> Pilot: one Claude seat for a named Lab engineer, on their own laptop (Lab goes first since
> 2026-08-19; Helpdesk follows with 1–2 seats). The repo moves to company Bitbucket, so no
> personal accounts and no new identity system. Every question and answer is captured to an internal
> folder for review — nothing enters the shared knowledge base until a Software Engineer verifies it.
> Customer data stays in the local workspace and on the internal share; if IT wants it inside our own
> cloud tenancy, that is a configuration change, not a redesign.
>
> We have measured this rather than estimated it: 14 real conversations logged since 2026-07-28, at
> **€4.44 of API-equivalent work each**, and one seat supports about **seven conversations a working
> day**. A shared service for occasional users is a separate, API-billed decision — a subscription
> cannot be shared between people.

Licences remain the secondary line item. The headline ask is still allocated development time
(PROJECT.md §8, 2026-07-25). The difference from a month ago is that the licence line is now
defensible to a finance question rather than a guess.

---

## 8. The Lab pilot on a colleague's own laptop

Decided with Joost on 2026-10-02. §4 settled *where* captured knowledge goes. This section settles
what happens on the machine of someone who **uses** the workspace but never commits to it. Nothing
here is built: building waits for the Bitbucket move and the IT answers in §8.8 (decision,
2026-10-02). The scripts do not depend on where the repo is hosted, so the move changes one URL, not
the design.

### 8.1 Who and where

- **One Lab engineer, on their own laptop.** Not the PC attached to the robot.
- **Claude Desktop, Code tab**, with the Robotics-AI folder opened as the project. That is Claude
  Code, so hooks and user-level settings apply. Still to verify on the pilot laptop: that the
  session-start hook actually fires inside the Desktop app.
- **Claude Code only** for the pilot. Copilot and Codex get none of the mechanisms below (§4, *Known
  limitation*).

### 8.2 The problem: a clone that never commits

Three things go wrong on such a clone today. Each was checked against the repo on 2026-10-02.

1. **Nothing updates it.** The only `git pull` is in `Bootstrap-RoboticsAI.bat`, which runs only when
   setup is re-run. And `main` is where Software Engineering works. Since 2026-09-01 there were 15
   commits, 5 of them to skills; a lab user tracking `main` would get unfinished skill edits as soon
   as they are pushed.
2. **The logging skills write into tracked files.** `skalar-lab-issue`, `skalar-jira-issue` and
   `skalar-svn-import` end with "offer to log it", which appends to `md documents\AI_*_Log.md`. On a
   clone that never commits, this breaks things three ways:
   - The next pull **refuses to run** as soon as `main` changes the same log. The clone then stays on
     that version and nobody notices.
   - If the reviewer promotes the draft under the same detail-file name, the leftover untracked copy
     **also aborts the pull**.
   - The assistant reads its **own unverified entry** as case-base fact next time. That breaks the
     "every entry actually worked" rule, on one machine only.
3. **Promotion depends on one person.** Drafts reach colleagues only once a reviewer commits them.
   That turns §6.1's bus factor into a daily pipeline. See §8.5 for the second reviewer.

### 8.3 What the laptop gets: one repo, sparse checkout

The workspace also holds material that has no business on a lab machine: rollout decks, the
`lab-chat-poc` prototype, workspace plans, assessments. That material must still sit **in the same
workspace** as everything else, because that is what gives it the right context on Joost's machine.

**Decision: sparse checkout.** The lab clone is told which folders to put on disk. The repo and its
branches stay the same for everyone; the excluded folders are simply absent on the laptop, so its
assistant neither loads nor searches them. It is plain git, so Bitbucket changes nothing.

| On the lab laptop | Left out |
|---|---|
| `CLAUDE.md`, `AGENTS.md`, `.github\`, `.claude\`, `.mcp.json`, `.vscode\`, `.codex\` | `Rollout\`, `lab-chat-poc\` |
| `md documents\`: the five case-base logs and their detail folders, `Template Known Issues\`, `Lab Questions\` | `AI_WORKSPACE_PLAN.md`, `md documents\Assessments & Plans\`, the loose plan and handover files at the `md documents\` root |
| `Tools&Scripts\` tools the lab workflow uses: fetch, process, profile, Loupe, core update, tray tools | `Tools&Scripts\SSO R&D Approval\`, `RMT Template Register\` builders, `Historical-B-Feature-Discovery\` (68 MB, 7,659 files; it serves the precedent search, not lab work) |

- **Status of the list:** Joost judged it "about right" (2026-10-02). The exact list is fixed when it
  is built.
- **Where it lives:** in a committed file that is re-applied on every update, so changing it is a
  commit, not a visit to the laptop.
- **Check when building:** that no instruction on the lab path points at an excluded file.

**Left out is not secret.** Anyone with read access to the repo can still open those files in
history or in Bitbucket's web view. Material that colleagues must not be able to read does not belong
in the repo at all. It goes in a git-ignored `_private\` folder inside Joost's workspace: his assistant
reads it, and he backs up that one folder separately.

Rejected:
- **A lab branch with those files deleted.** Every update of the branch would bring them back.
- **A separate personal repo.** It loses the shared context this workspace exists to provide.
- **Putting the repo in OneDrive.** Sync tools corrupt git working copies.

### 8.4 Staying current: a `stable` branch and a session-start update

- **Lab tracks `stable`, never `main`.** Software Engineering keeps working on `main`.
- **Publishing is one command on Joost's side** (`Publish-ToLab`). It shows what the lab will receive,
  separating new case-base entries from skill, instruction and tool changes, then moves `stable` up to
  `main`. Joost wants an approved entry to reach the lab immediately, so it is run after every
  promotion, not on a fixed cadence.
- **The habit this needs:** unfinished skill or tool work goes on a side branch, so it does not ship
  with the next promotion. The assistant can do that branch switching for Joost.
- **A `SessionStart` hook on the lab machine** runs `git fetch`. If any tracked file was changed
  locally, it copies those files to a timestamped backup folder. It then resets the clone to
  `origin/stable` and tells the user what it did.
  - **Never `git clean`.** Untracked files stay.
  - **Exits 0 on every failure.** With no VPN or no network the session starts on the old version,
    and says so.

**What a reset can and cannot touch.** Git manages only tracked files. Order checkouts, `Template *`
folders, an order's `Log\` folder, `Sequences\`, `Service Items\` and `B-System Approvals\` are all
git-ignored (checked with `git check-ignore`, 2026-10-02). So the lab engineer's SVN work is entirely
separate from git and an update never touches it. Tracked files change only by accident, and the role
lock (§8.5) stops the assistant causing that accident.

**Back up and reset, rather than warn only** (Joost, 2026-10-02). A warning that a user unfamiliar
with git cannot act on leaves the clone silently out of date, which is the failure this section exists
to prevent. The backup keeps the safety that warn-only was meant to give.

### 8.5 What a lab machine may write

- **A role chosen at install.** `Bootstrap-RoboticsAI.bat -Role Lab` writes **user-level** Claude
  settings that deny edits to tracked content: `md documents\`, `.claude\`, the instruction files and
  `Tools&Scripts\`. That makes it a lock enforced by the tool, not an instruction the model may or may
  not follow. It is user-level, so it never affects a Software Engineering machine.
- **The same hook adds one line to the session's context**: this is a lab machine. The skills'
  "offer to log it" then writes a **draft to the share** (§8.8) instead of the repo. A draft uses the
  same template as a case-base entry, so promoting it is copy, check, commit.
- **Claude's personal memory is turned off** on lab machines. Anything useful belongs in the shared
  documents, and it reaches Software Engineering through the captured transcripts (§4). Joost verifies
  it before any skill or instruction changes.

**Review rules** (Joost, 2026-10-02). These refine §4 for drafts written by the people who did the
work:
- **Drafts are visible to other lab users before review, clearly labelled unreviewed.** On a lab
  machine the search order is: case base first, then `Drafts\`, with the label carried into the answer.
- **A Lab engineer's "fixed on the robot" counts as verified.** A confirmed draft is therefore
  Lab-Resolution grade. Review checks quality, format and duplicates; it does not re-verify. That is
  what keeps "approved means available immediately" realistic.
- **Two reviewers:** Joost, plus a colleague with more robot knowledge (still to be asked). That is
  the first concrete step on PROJECT.md §6.1.
- **Raw transcripts stay in per-user folders.** Only drafts are shared between lab users.

### 8.6 Robot logs to the laptop

**Where the logs are.** The robot application writes Loupe logs to `<folder it runs from>\Log`
(`robotics-core\SkalarRobotics\MainForm.cs:4101`). The Lab checks the order software out to the robot
PC's Desktop, so the logs sit in `Desktop\<software>\99xxxxxx xxxxxx\Log\`, under a folder that
carries the order number. Loupe's own setting for sending logs to a server is **not** enabled in the
core.

**Today** the engineer copies the one log by hand to a network share to read it on the laptop, and
often doesn't know which log it was.

**Decision: a copy job on the robot PC.**
- A small script, installed once by double-click. Windows Task Scheduler runs it every few minutes.
- It copies new `.glf` files from every `99*\Log` folder on the Desktop to
  `\\<share>\RobotLogs\<order>\`.
- The robot keeps logging locally exactly as now. The job only copies, and catches up after a network
  drop.
- On the laptop the engineer just names the order and roughly when it happened. Every log is already
  there, and the skill finds the session by time or scans the recent ones for errors.

**Still to test:** copying the `.glf` that is still being written, which may be locked or partial.

Rejected:
- **Loupe Server upload.** It needs a Loupe Server (licence and hosting) and a core change that would
  ship to customers.
- **Windows file sharing on the robot PC.** That is per-PC setup and firewall rules, and the laptop
  would need each PC's name.
- **Running the software from the share.**

**The copy job must never ship.** The robot PC goes to the customer in about 70% of orders. Lab
discipline is not relied on, so there are three layers:
1. The job does nothing when the lab share is unreachable, so at a customer site it is inert.
2. It is removed, and its removal verified, as a mandatory step of the delivery tool.
3. The delivery report written onto the installer USB records that it was removed.

The delivery tool is a separate project:
[Installer USB Builder - Plan.md](../md%20documents/Assessments%20&%20Plans/Installer%20USB%20Builder%20-%20Plan.md).

### 8.7 The robot PC ↔ laptop workflow

The Lab commits to SVN themselves, and is expected to.

| Where | Who | Step |
|---|---|---|
| Robot PC | Engineer | Commit the software to SVN, as they already do. The log reaches the share by itself (§8.6) |
| Laptop | Engineer | One message: order number and symptom. The skill refreshes from SVN and picks up the log |
| Laptop | Assistant | Diagnoses; if a fix is needed, prepares it in the laptop's checkout, runs a compile check and shows the change |
| Laptop | Engineer | Says "commit". The assistant commits only after that explicit yes, the same rule as the SVN import |
| Robot PC | Engineer | `svn update`, Build, test |

- **One rule for the Lab:** don't edit on the robot PC while the fix is being made on the laptop, or
  the `svn update` conflicts.
- **Still to confirm:** that the headless build loop inside `Update-CoreVersion.ps1` can be run on
  its own as a compile check.
- **A side benefit:** the robot's working copy and the workspace are on different machines, so the
  "never touch `C:\SPD_Projects\`" rule holds by construction.

### 8.8 Questions for IT (meeting 2026-10-06)

| Topic | What we need |
|---|---|
| **Transcript inbox** | Full session transcripts (1–3 MB each, measured from local transcripts; roughly 5–10 MB a day for one user) plus short draft write-ups. They contain customer names, site names and log content. Each lab user writes only their own folder; Joost and the second reviewer read everything; `Drafts\` is readable by all lab users. Reachable over VPN? Backup, and retention (suggest 12 months) |
| **Robot log share** | Lab robot PCs write, the pilot laptop and Software Engineering read. Retention at least 60 days (the core keeps 30 locally, `maxLocalFileAge="30"`). Same share as the inbox or separate |
| **Robot PCs** | Domain-joined company PCs? Which account do they run under, and may it write to a share? May they run a scheduled task, or must IT install it? |
| **Bitbucket** | Who creates the repo, in which project. Permissions: Joost and the reviewer write, lab read-only; a branch restriction so only Joost pushes `stable`. Laptop authentication (as `Setup-Workspace.ps1` already does for `robotics-core`). About 130 MB of history, 78 MB of binaries in `Tools&Scripts\`: is Git LFS (their system for large files) wanted? A mirror push keeps the full history |
| **"Stack"** | Joost may have heard "Stack" mentioned. If that was Stack Overflow for Teams (an internal Q&A knowledge base), it bears on where the case base itself lives, not just on the inbox. Ask what was meant |

## 9. Open items

- [ ] Confirm current Claude seat tiers and what each includes, then compare against the measured
      €4.44/conversation and ~7 conversations/seat/day from §2.
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

Lab pilot (§8). Everything below waits for the Bitbucket move and the IT answers (§8.8):

- [ ] IT meeting 2026-10-06: inbox and robot-log share paths and permissions, scheduled tasks on
      robot PCs, Bitbucket permissions, and what "Stack" meant (§8.8).
- [ ] Ask the colleague to be second reviewer (§8.5).
- [ ] Fix the sparse-checkout list and check that no lab-path instruction points at an excluded file
      (§8.3).
- [ ] Build `Publish-ToLab` (Joost's side) and the lab `SessionStart` update hook (back up, then
      reset to `origin/stable`) (§8.4).
- [ ] Add `-Role Lab` to `Bootstrap-RoboticsAI.bat`: sparse checkout, user-level deny rules,
      memory off, hook registration (§8.5).
- [ ] Lab-role branch in the logging skills: draft to the share's `Drafts\`; search `Drafts\` after
      the case base, labelled unreviewed (§8.5).
- [ ] Build the robot-PC log copy job; test copying a `.glf` that is still being written (§8.6).
- [ ] Confirm the `Update-CoreVersion.ps1` headless build can run on its own as a compile check
      (§8.7).
- [ ] Rehearse the whole setup on Joost's second PC as a stand-in lab laptop, including that hooks
      fire in Claude Desktop, before the pilot engineer gets it (§8.1).
- [ ] Delivery tool removes the copy job: Installer USB Builder plan, separate project (§8.6).
