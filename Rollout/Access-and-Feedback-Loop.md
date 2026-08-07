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

**Last updated:** 2026-08-07 — first version, written ahead of the Helpdesk pilot conversation.

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
| **A4 — No individual access** | One shared instance behind a request channel | Occasional users who will never open a terminal. See §5 |

**Decision: seats, sized as a pilot.** Helpdesk pilot = 1–2 named people = 1–2 seats.

The reasoning is not that seats are cheaper in the abstract — it is that **per-token billing makes
pilot users cost-conscious at exactly the moment the pilot needs them to use the tool heavily enough
to produce evidence.** A Helpdesk engineer who hesitates before asking a follow-up question generates
no data. Flat cost removes that hesitation entirely.

The scale is worth stating plainly so nobody is surprised later: a single real diagnosis in this
workspace — a `.glf` log through Loupe, a case-base search, a Sequence CSV trace, some
`SkalarPackSolution` reading — is hundreds of thousands of input tokens before follow-up turns. Light
days cost pennies; heavy days do not. That variance is precisely what a seat removes.

**API keys are still the right shape for the unattended paths** — the ticket scraper's AI step
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

## 5. The chat front door (A4), staged

The idea: an always-on machine with the repo, VPN, SVN and Loupe; colleagues ask in a chat channel;
answers come back. Mechanically this is `claude -p` — Claude Code's headless mode, which loads
`CLAUDE.md`, the skills and the MCP servers exactly as an interactive session does. It is the same
unattended path already planned as `AI_WORKSPACE_PLAN.md` F13, pointed at people instead of tickets.

Three layers, only one of which is difficult:

| Layer | Effort |
|---|---|
| The machine | A VM with the workspace prerequisites. `Setup-Workspace.ps1` does most of it |
| The agent | `claude -p "<question>"` in the repo directory, capture the output |
| **The Teams bridge** | **The hard one.** Posting *out* to Teams is a webhook. Reading *in* needs an Azure app registration, a Bot Framework resource, a reachable HTTPS endpoint and tenant-admin consent — an IT project with a queue, not a Friday afternoon |

**Jira is a message bus the workspace already automates.** `Process-ServiceTickets.ps1` polls Jira on
a loop, authenticates from `jira-config.json`, has an `AiCommand` hook to shell out to a CLI, and has
a post-back path. A dedicated project or issue type where colleagues file a question is roughly a day
of work on already-running code, with no IT approval, because every credential involved is already
approved. Less pleasant than Teams. Available now.

### Why it is not a replacement for seats

1. **No back-and-forth.** The write-ups in `md documents\` are iterative — look at the log, check the
   tables, ask a follow-up. One question, one answer is a much weaker product.
2. **Concurrency.** Two people asking about the same order means two processes running
   `fetch-project.ps1` against the same folder, and that script does `svn revert -R` unconditionally.
   A queue serialised per order is a prerequisite, not a nicety.
3. **It worsens §6.1.** An always-on box that fails silently at 2am is one more thing only one person
   can fix.
4. **It is the highest-risk surface for the failure already flagged in §7** — *"first wrong answer
   kills adoption."* With a seat the user watches the reasoning and catches the wrong turn. With a bot
   they get a confident paragraph in a public channel. The confidence gate that would mitigate this
   (F13) is not built.

### The staged plan

**Stage 1 — a channel with a human backend, starting now.** A Teams channel where colleagues post
questions; a Software Engineer runs them in a real interactive session and posts the answer back. No
infrastructure, no approvals. It delivers, immediately:

- the **Arm B evidence** the replay protocol already calls the stronger arm (PROJECT.md §8,
  2026-07-29) — Lab has offered to send exactly these questions
- the real volume and shape of questions, which is what determines whether a bot is worth building
- a public record of every answer — the logging loop for the non-seat audience
- a human in the loop while the confidence gate does not exist

If the channel makes a Software Engineer the bottleneck, **that is the business case** for automating
it — with a corpus of real questions to test the unattended path against first.

**Stage 2 — Jira as transport.** Cheap, no approvals, reuses proven code.

**Stage 3 — a Teams bot**, only once Stages 1 and 2 have shown it is worth an IT ticket.

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

Licences remain the secondary line item. The headline ask is still allocated development time
(PROJECT.md §8, 2026-07-25).

---

## 8. Open items

- [ ] Confirm current Claude seat tiers and what each includes, before any number is quoted.
- [ ] Agree the inbox share path.
- [ ] Add the capture disclosure (§4) to `Helpdesk-Usage-Plan.md` and `Lab-Usage-Plan.md`.
- [ ] **At pilot start, and not before:** build the capture script and register its hooks from the
      spec in §4. Gated on the two items above — colleagues are told first, share path agreed first.
- [ ] Confirm the Bitbucket move — who authorises it, and update `SETUP.md` /
      `Bootstrap-RoboticsAI.bat` when it happens.
- [ ] Open the data-governance question with IT/security, leading with A3 as the available answer
      (already PROJECT.md §9).
- [ ] Create the Stage 1 questions channel and start collecting Arm B evidence.
- [ ] Measure whether an onboarding seed bundle on the share meaningfully beats a cold
      `Sync-Templates.ps1` run.
