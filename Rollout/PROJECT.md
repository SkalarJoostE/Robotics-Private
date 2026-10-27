# Robotics-AI — Productization Project

> **Purpose of this file:** the living handover document for turning the Robotics-AI workspace from
> one engineer's tooling into an officially supported, multi-department company tool.
> It owns the **organizational** layer: why, who, scope, phases, budget, governance, risks, decisions.
>
> **This is not the technical plan.** `AI_WORKSPACE_PLAN.md` at the repo root owns the AI-context
> architecture, workspace findings and the engineering checklist. Do not duplicate content between
> the two — link instead. If a decision is about *how the software works*, it goes there. If it is
> about *who uses it, who pays for it, and who maintains it*, it goes here.
>
> If you are an AI assistant asked to continue this work: read this file fully first, then
> `AI_WORKSPACE_PLAN.md`. Chat history does not sync between PCs — this repo is the only shared state.

**Last updated:** 2026-10-02 — the Lab pilot's technical design is decided (one engineer on their own laptop; `stable` branch + sparse checkout + session-start update; a role lock with drafts to a share; robot logs copied to a share; build waits for Bitbucket), and the installer-USB delivery tool split off as its own project (see §8 and [Access-and-Feedback-Loop.md](Access-and-Feedback-Loop.md) §8). Previously 2026-08-19 — cost recomputed to €4.44/conversation and the case base restated at 51 (see §8); previously 2026-08-07 — access model, distribution and the feedback loop decided, then revised the same day against `lab-chat-poc/` (measured cost/limit data, the one-person-per-subscription constraint, and the chat engine already existing). See [Access-and-Feedback-Loop.md](Access-and-Feedback-Loop.md). Closes open questions §6.3 and §6.4.

## 0. What is in this folder

| Path | What it is |
|---|---|
| `PROJECT.md` | This file — the organizational layer (why, who, scope, phases, governance, decisions). |
| [Helpdesk-Usage-Plan.md](Helpdesk-Usage-Plan.md) | What Helpdesk would actually use it for, and its stated limits. |
| [Lab-Usage-Plan.md](Lab-Usage-Plan.md) | Same, for Lab. |
| [Access-and-Feedback-Loop.md](Access-and-Feedback-Loop.md) | How colleagues get access (seats vs API vs cloud tenancy), where the repo lives, and how their questions flow back for review. Owns the reasoning behind the §8 entries dated 2026-08-07. |
| [Token-Usage-Analysis.md](Token-Usage-Analysis.md) | Where a conversation's tokens actually go, why money and the 5-hour window are driven by *different* tokens, and the ranked levers that reduce cost. Read before re-quoting any per-conversation figure — the measured ones are un-optimised. |
| `Capability Overview/` | The non-technical "what can it do" pitch material: web page (`robotics-ai-overview.html`), Word doc + its generator (`build-capability-doc.js`), and the handoff note explaining both. Start at [CAPABILITY_OVERVIEW_HANDOFF.md](Capability%20Overview/CAPABILITY_OVERVIEW_HANDOFF.md). |
| `Replay-Test/` | Phase-A evidence gathering: [PROTOCOL.md](Replay-Test/PROTOCOL.md) (how to run it defensibly), the ticket shortlist, and `RESULTS.md` once runs begin. |
| `Document Build/` | Generates branded Word versions of the plans and the protocol from their Markdown. `cd Rollout && npm install && npm run build`. The Markdown stays the source of truth — never edit a generated `.docx`. See [README.md](Document%20Build/README.md). |
| `Brand/` | Velaris brand book and the Skalar document-format example the overview is styled against. |

Anything still in `output/` is older or unrelated and is **not** part of this project — that folder is
gitignored scratch space.

---

## 1. The case in short

Robotics-AI is an AI assistant taught our robot software — the Sequence/SubSequence execution model,
the C# action code, per-template error codes, the Confluence setup guides, and a growing base of
solved cases. It has been in real use by Software Engineering since April 2026.

The argument for making it official is not "AI is useful". It is that **Software Engineer time is the
scarcest resource in the product chain**, and a large share of it is spent answering questions from
Helpdesk and Lab that the evidence already contains. Every question those departments can answer
themselves is Software Engineering capacity returned.

The two things being asked for are **allocated development time** (the real constraint) and
**Claude subscriptions** (the small, easy number). Licences without a maintainer produce shelfware,
so the time is the headline ask.

## 2. Where we are today

**Users:** 1 (Joost, Software Engineering), across two PCs. Everything below is built, working, and in daily use.

| Evidence | Figure |
|---|---|
| Documented solved cases | **51 write-ups**, 2026-04 → 2026-08-14 (~11/month) — 13 service tickets, 14 lab cases, 12 features/ports, 7 order approvals, 5 template bugs |
| Historical orders indexed for precedent search | 1,276 trunk orders |
| Verified reusable B-feature dossiers | 12, across 6 templates (BOD, Clay Fraction, Soil, Testkit, Waters, cross-template) |
| Assistant-answered lab questions | 4, since 2026-07-28 — all four judged correct (Joost, 2026-08-19), though none formally verified on a robot; see `md documents\Lab Questions\` |

**A caution on evidence.** The figure that matters is the 51 write-ups — real cases, real outcomes.
Resist padding the case with infrastructure counts (extracted error-code tables, templates checked
out, scripts written). Those are plumbing. A capability that has never demonstrably changed the
outcome of a case does not belong in a business case, and a reviewer who spots one padded number
will discount the rest.

**Working pipelines:** RB/ES ticket intake and diagnosis · lab-issue intake (order + log → diagnosis) ·
binary `.glf` log analysis via Loupe · SVN order/template checkout with Sequence CSV generation ·
historical B-feature precedent search · SSO R&D-approval intake · core-version update automation ·
multi-turn lab and helpdesk chats over the same skills, with per-turn cost and plan-limit measurement
(`lab-chat-poc/`).

**A note on the last one.** The chat is the only pipeline whose *value* is not yet demonstrated by a
case-base entry — it has answered 4 lab questions, none of them yet confirmed on a robot. By the
evidence rule below it is therefore **not** a capability to pitch. What it *is* good for right now is
measurement: it is where the seat-versus-API numbers in
[Access-and-Feedback-Loop.md](Access-and-Feedback-Loop.md) §2 come from, and that is a claim about
cost, not about capability.

**Onboarding:** `Bootstrap-RoboticsAI.bat` → double-click, installs prerequisites, clones the repo,
runs setup. Then two browser OAuth logins. See `SETUP.md`.

## 3. Scope by department

| Dept | Fit | Readiness | Notes |
|---|---|---|---|
| **Lab** | Strong | **Pilot starts here** | Already sending questions unprompted — the strongest demand signal available. Audience is less terminal-comfortable. Plan: [Lab-Usage-Plan.md](Lab-Usage-Plan.md) |
| **Helpdesk** (RB/ES) | Strong | **Ready, goes second** | Highest volume, most repeatable, clearest before/after metric. Plan: [Helpdesk-Usage-Plan.md](Helpdesk-Usage-Plan.md) |
| **Sales** | Plausible | **Not ready** | "Have we built X before?" over the order index, and A-vs-B feasibility during quoting. The index is keyed on engineer vocabulary (commit messages, folder names), not sales vocabulary — real work needed before it's usable. Deferred to phase 2. |
| **Software Engineering** | — | In use | Current home. Feature precedent, B-feature porting, SSO approvals. |

**Decision (2026-08-19, supersedes 2026-07-25): Lab goes first, alone.** One pilot at a time still
holds — two simultaneous pilots halve the attention each gets. What changed is which one leads: Lab
is already sending questions unprompted, and demand that arrives without being asked for beats any
case we could argue. Helpdesk follows, and keeps the cleaner before/after metric. See §8, 2026-08-19.

## 4. Rollout phases

### Phase A — Validate (current)
- [x] Draft usage plans for Helpdesk and Lab.
- [ ] Discovery conversations: 2–3 people per department, ~30 min. Ask what took too long last week and how long it took — **not** "would this help?".
- [x] Replay/question test designed — [Replay-Test/PROTOCOL.md](Replay-Test/PROTOCOL.md). Two arms: **A** closed RB/ES tickets replayed cold against a frozen, comment-trimmed bundle; **B** the questions Lab is sending unprompted. Arm B is the stronger evidence and leads.
- [ ] Run Arm B as Lab's questions arrive. Record the answer, the time, and — the actual metric — whether it would have saved them a trip to a Software Engineer.
- [ ] Run Arm A: Helpdesk picks 3 from the shortlist in the meeting. Record output quality vs. what actually happened, and time taken.
- [ ] Confirmation round: show the replay, not the plan. Ask each department to name a pilot person and commit their time.

**Exit criteria:** each department has either named a pilot person and committed their time, or given a specific reason not to. Enthusiasm without committed time counts as a no.

### Phase B — Pilot
- [ ] 1 department (**Lab**), 1–2 people, fixed period (suggest 6 weeks).
- [ ] Baseline metrics captured before day 1.
- [ ] Weekly check-in; log every case where it was wrong, not just where it worked.

**Exit criteria:** measured improvement on at least one agreed metric, and the pilot users want to keep it.

### Phase C — Budget & approval
- [ ] Business case with replay + pilot numbers.
- [ ] Answers ready for the three questions that always come: maintenance ownership, data governance, scope boundaries (§6).
- [ ] Ask: allocated development time + licences for the next tier of users.

### Phase D — Roll out
- [ ] Lab broadly, Helpdesk pilot starts.
- [ ] Sales exploration begins only once A–C have held up.

## 5. Metrics

To be filled from Phase A. Challenge these before collecting them — measuring the wrong thing is worse than measuring nothing.

| Dept | Measure | Baseline | After |
|---|---|---|---|
| Helpdesk | Time from ticket arrival to first informed reply | ___ | ___ |
| Helpdesk | Tickets/month escalated to Software Engineering | ___ | ___ |
| Helpdesk | Evidence-gathering time before diagnosis starts | ___ | ___ |
| Lab | Time lost/week waiting on Software Engineering for software answers | ___ | ___ |
| Lab | Time to diagnose a build/FAT blocker | ___ | ___ |
| All | Software Engineer hours returned (the headline number) | ___ | ___ |

## 6. Open questions — must be answered before Phase C

1. **Maintenance ownership.** Who supports this when Joost is away? A single-maintainer tool with twenty dependents is the standard failure mode for internal tooling. Options: named backup maintainer, a small team, or an explicit "best effort, no SLA" policy stated up front. *First step 2026-10-02: case-base review gets a second reviewer, a colleague with more robot knowledge (still to be asked). Review is not maintenance, so this question stays open. See [Access-and-Feedback-Loop.md](Access-and-Feedback-Loop.md) §8.5.*
2. **Data governance.** Customer logs, customer software and Jira content are sent to a cloud model. IT/security must be engaged **before** approval, not after. Get a written position. *Partially answered 2026-08-07: running Claude inside the company's own cloud tenancy (Bedrock / Vertex / Foundry) is a configuration change, not a redesign — lead with that when security asks. See [Access-and-Feedback-Loop.md](Access-and-Feedback-Loop.md) §2.*
3. ~~**Shared state at multi-user scale.**~~ **Answered 2026-08-07** — two-tier: hook-captured sessions to an internal-share inbox (Tier 1, outside the repo), promoted into the `md documents\` case base on review (Tier 2). See [Access-and-Feedback-Loop.md](Access-and-Feedback-Loop.md) §4. Multiple machines polling Jira remains unsolved and is deferred until more than one machine actually polls.
4. ~~**Licence tier and seat count.**~~ **Answered 2026-08-07** — seats, 1–2 for the Helpdesk pilot; API keys reserved for unattended paths. Tier still to be confirmed with Anthropic. See [Access-and-Feedback-Loop.md](Access-and-Feedback-Loop.md) §2.
5. **Scope boundary.** What this explicitly does *not* become, so expectations don't drift into "it answers tickets automatically".

## 7. Risks

| Risk | Mitigation |
|---|---|
| Overselling → first wrong answer kills adoption | Both usage plans lead with explicit limits. Frame as "well-prepared first opinion", never as an answer. |
| Polite agreement mistaken for demand | Validate with a replay demo and a request for committed time, not with plan review. |
| Bus factor of one | Open question §6.1 — must be answered before broad rollout. |
| Security objection late in the process | Engage IT/security during Phase A, not Phase C. |
| Onboarding friction | Largely solved by `Bootstrap-RoboticsAI.bat`; budget half a day with Joost for the first person per department. |
| Coverage gaps read as unreliability | BOD is deep, Waters thin, Testkit/Clay Fraction shallow. Say so up front; prioritise depth where the pilot department actually works. |
| Claiming capabilities that have never solved anything | Before a capability goes in a pitch, check the case base for a write-up where it changed the outcome. Error-code extraction failed this test on 2026-07-25 and was cut. |

## 8. Decision log

Append dated entries. Chats don't sync between PCs; this file does.

- **2026-07-25 — Helpdesk first, Lab second, Sales deferred** (Joost + Claude). Helpdesk has the highest repeatable volume and the clearest before/after metric; Sales needs index work in sales vocabulary before it's usable. Running both pilots at once was rejected — it halves the attention each gets.
- **2026-07-25 — Validate with a replay demo, not a plan review.** "Would this be helpful?" produces polite agreement that is worthless as budget evidence. Replaying closed tickets produces either "when can I have it" or a specific, useful objection.
- **2026-07-25 — Committed time is the interest signal**, not enthusiasm. A department that won't name a pilot person and free their time has not actually said yes.
- **2026-07-25 — The budget ask leads with allocated development time**, with licences as the secondary line item. Licences without a maintainer produce shelfware.
- **2026-07-25 — Usage plans state limits prominently and invite correction.** Credibility with sceptical users is worth more than a polished pitch; objections raised in the meeting are cheaper than silence afterwards.
- **2026-07-29 — The test has two arms, and the forward one leads** (Joost). Lab offered to send the questions they would ask if they had access, which is better evidence than any replay: unsolicited, genuinely what they want to know, and uncontaminated because nobody has answered them yet. Arm A (ticket replay) is kept because Helpdesk has no equivalent and because a "we already lived through this one" comparison is legible to a manager, but it must not delay Arm B. The metric for Arm B is a question put to the asker afterwards — *would this have saved you a trip to a Software Engineer, and how long a trip?* — because their sentence is worth far more in a business case than ours.
- **2026-07-29 — Replay contamination is controlled by removal, not by instruction** (Joost raised the invocation gap). Two silent failure modes were found while writing the protocol. (1) Invoking a replay with the normal "Solve issue RB-xxx" triggers `skalar-jira-issue`, whose first step refreshes the ticket from Jira — re-downloading the very comments the cut-off removed, after which the run *appears* to succeed. The protocol therefore carries a verbatim prompt block to paste as the first message of a fresh session. (2) Copying the bundle to the frozen location leaves the untrimmed original in `Service Items/<KEY>/`, where any search finds the answer; the bundle is therefore **moved**, not copied, and its absence confirmed before the run. Relying on an instruction not to look somewhere is not a control. The pipeline itself is never modified — on a live ticket, comments are among the best evidence available.
- **2026-07-29 — "R&D" is called Software Engineering in rollout material** (Joost), except where it names the SSO R&D-approval board or tool, which keeps its own name.
- **2026-07-29 — All rollout material lives under `Rollout/`** (Joost). The capability overview, its generator and the brand assets moved out of `output/`, which is gitignored scratch space — they were only in version control because they had been force-added. Left behind deliberately: `ROBOTICS_AI_CAPABILITIES_OVERVIEW.md` and the `documents/`/`pdf/` exports of it (a superseded earlier draft), and `pets/` (unrelated).
- **2026-07-25 — Capability claims must be backed by a case, not by existence** (Joost). Error-code extraction was cut from all three documents: none of the 41 write-ups then on file reference `error-codes.md`, and only 4 mention error codes at all, incidentally. The tables are a real convenience and stay in the workspace — they are just not evidence of value and must not be pitched as such. Apply the same test to every future claim.
- **2026-08-07 — Access, distribution and the feedback loop are three separate decisions**, and are presented that way. Fusing them into "API or seats?" invites a manager to approve one axis and believe the other two are settled. Reasoning for all three: [Access-and-Feedback-Loop.md](Access-and-Feedback-Loop.md).
- **2026-08-07 — Seats for named individuals, API for anything shared** (revised later the same day against `lab-chat-poc/`). 1–2 seats for the Helpdesk pilot. **The deciding factor is licensing, not cost: a subscription is scoped to one person and cannot be shared between users.** So a named daily user is a seat, and a shared service (the chat front door) is structurally an API cost centre no matter how little it is used — `lab-chat-poc/` already encodes this, with the CLI chats billing one subscription and `lab_triage.py` on the Agent SDK named as "the future multi-user shared service". The supporting cost case is now **measured rather than argued**: 11 logged conversations at **€3.91 API-equivalent each** (service ticket €5.98, lab question €3.45) — *superseded 2026-08-19: €4.44, service ticket €6.23, lab question €3.73; see the 2026-08-19 entry* — and one seat supports **~7 conversations a working day** — with the **5-hour session window binding, not the weekly allowance**, so a second person needs a second seat for contention reasons before cost ones. Both figures are conservative by construction (lower-envelope fit, errs toward too many seats) and rest on 6 fully-measured chats; re-run `cost_report.py` before quoting. API keys also remain right for the unattended paths (scraper AI step, F13). Rejected: per-user API keys with spend caps (makes pilot users cost-conscious exactly when the pilot needs heavy use to generate evidence), and cloud-tenancy-first (that answers a security objection, not a cost question). Tier still to be confirmed with Anthropic. **Tooling note:** do not use the Claude Code CLI's own cost figure — measured 2026-08-06 it prices `claude-opus-5` at Sonnet rates, out by exactly 5/3; `lab-chat-poc/pricing.py` recomputes from each turn's tokens and `--audit` re-checks it.
- **2026-08-07 — Data governance has a pre-built answer; lead with it.** Running Claude inside the company's own cloud tenancy (Bedrock / Vertex / Foundry) leaves the workspace, skills and tooling untouched — it is a configuration change. Say this to IT/security during Phase A rather than discovering it under pressure in Phase C. Some features are unavailable there, none of them load-bearing for these workflows.
- **2026-08-07 — The repo moves to company Bitbucket** (Joost: "if this becomes official it kinda has to move to Bitbucket"). Everyone already has Atlassian credentials for Jira and Confluence, and `Setup-Workspace.ps1` already clones `robotics-core` and `robotics-plugin` from Bitbucket — so this deletes the personal-GitHub-account prerequisite that `SETUP.md` currently names as the one thing the bootstrapper cannot remove, without introducing a second identity system. **Move before the pilot, not after:** relocating once two Helpdesk users have working clones means re-cloning their machines. Rejected: a company GitHub org (equivalent, but a second identity system for something Bitbucket already covers).
- **2026-08-07 — The feedback loop is two-tier, and Tier 1 lives outside the repository.** Sessions are captured by Claude Code hooks (`UserPromptSubmit` + `SessionEnd` → a small PowerShell script) to an internal-share inbox; the maintainer reviews and promotes worthwhile cases into `md documents\` through the existing `skalar-session-wrapup` route. **Auto-committing sessions into the repo was rejected** on the precedent already set in `AI_WORKSPACE_PLAN.md` §5 (2026-07-29): bulk imports buried under curated entries make "search the case base first" cost more than it returns, and session transcripts name customers and sites — the exact reason the RB/ES index was agreed to be git-ignored. Same shape as `Index Cards/` → `verified-features/`. When enabled, the hooks belong in the **committed** `.claude\settings.json` so they apply to every clone and the loop does not depend on anyone remembering a trigger phrase — which is exactly why they are **not registered yet** (see the entry below). Three hard rules on the script: it exits 0 on every failure path (a dead share must never break a session), it runs async, and it writes outside the repo. **Known limitation:** hooks are Claude-only — Copilot and Codex users get no loop. This does not breach the `AI_WORKSPACE_PLAN.md` §1 parity rule (which governs *context* loading, still identical for all three) but is a further argument for standardising the pilot on Claude Code.
- **2026-08-07 — Full transcripts first, taper to summaries later** (Joost: "transcript would be my choice, especially for the beginning"). Question-and-answer alone is cheaper and less sensitive, but the early value is in seeing *where a session went wrong* — the wrong turn, the skill that failed to trigger, the missing context — and that is invisible in a summary. **Disclosure is mandatory, not optional:** a capture mechanism discovered by accident poisons adoption permanently, so both usage plans must state it. The honest framing is available — Claude Code already writes these transcripts to the user's own machine; the hook copies them somewhere reviewable, and they never leave the company network.
- **2026-08-07 — Session capture is specified but deliberately not built** (Joost: *"I actually don't want this in the repo yet. Only when I'm actually going to implement it and have a go."* / *"lets remove the script actually, we'll make it again when the time comes"*). A working prototype — capture script plus `UserPromptSubmit` / `SessionEnd` hooks in `.claude\settings.json` — was built and verified end-to-end on 2026-08-07, then removed entirely; the repository holds **no capture code**. Rationale: the same property that makes committed hooks the right answer later — they apply to **every clone, with no per-user setup** — is what makes shipping them now wrong. Merged, they would start capturing sessions on any machine that pulls, before the access decision is taken and before a single colleague has been told, and the disclosure rule above is not one to breach by accident. A parked-but-present script was considered and also rejected: dormant code invites someone to assume it runs, and it rots against a moving hook API. What survives is the **specification** in [Access-and-Feedback-Loop.md](Access-and-Feedback-Loop.md) §4 — hook payload shape, the three design rules, the proven hook JSON, and the two implementation traps that cost time in the prototype (the `&` in `Tools&Scripts` needing exec-form hook args; PS 5.1 ASCII and UTF8-no-BOM handling). Rebuilding from that is an hour, and it happens at pilot start as a deliberate act.
- **2026-08-07 — The chat front door's engine already exists; what is staged is everything around it** (revised the same day — the first version of this entry proposed building by hand what `lab-chat-poc/` had already built on the other PC). `lab-chat-poc/` is a working multi-turn chat, in use since 2026-07-28 with 11 conversations logged, driving the workspace's own `CLAUDE.md` + `.claude/skills` + Loupe MCP with no re-implementation, across two channels (`Lab-Chat.bat` → `skalar-lab-issue`; `Helpdesk-Chat.bat` → `skalar-jira-issue`). It never writes to Jira and produces a draft reply for a human to send. So the open items are **not** the agent: they are transport (`.bat`-launched on one machine today), hosting (a central box with VPN/SVN/Loupe so lab PCs need none), permission hardening (it runs `--dangerously-skip-permissions`; a lab-facing bot needs a read-mostly allowlist), a file-drop for logs, and the API billing engine. **Stage 1 is therefore triage-and-draft** (the Software Engineer reviewing before the asker sees the answer, first planned here, was dropped on 2026-10-27, see that entry); it still yields the Arm B evidence (§8, 2026-07-29), filed to `md documents\Lab Questions\`. Stage 2 is a confidence gate (F13), so an unsure answer goes to an engineer instead of being sent. Stage 3 is real transport — **Jira first** (`Process-ServiceTickets.ps1` already polls, authenticates and posts back; every credential approved), then a central box and a minimal web page; a Teams bot last, since it needs an Azure app registration and tenant-admin consent. Still **not** a replacement for seats: it cannot run on a subscription at all (see the access entry above), concurrent `fetch-project.ps1` runs against one order corrupt a working copy, it worsens §6.1, and it is the highest-risk surface for the §7 "first wrong answer" failure.
- **2026-08-07 — Session capture and Lab Questions are two surfaces of one pattern; Lab Questions owns the rules.** `md documents\Lab Questions\` already implements Tier 1 → Tier 2 for chat sessions, and specifies it better than the access document originally did: the scope line is drawn on **verification** rather than topic (*"a chat is not a resolution"*), there is one absolute write rule (a chat may write only inside that folder — never the five `AI_*_Log.md` files, Template Known Issues, a dossier, `AI_WORKSPACE_PLAN.md`, or memory), and promotion is an explicit human step recorded under **Escalation**. Hook capture covers a different surface — interactive seat sessions on a colleague's own machine — and lands in an internal-share inbox rather than a committed folder, because a raw transcript is unfiltered and names customers and sites where a Lab Questions entry is a write-up someone chose to keep. **The escalation and promotion rules are taken from Lab Questions, not re-derived.**
- **2026-08-07 — The internal file server holds shared *outputs*, never the shared workspace.** Good for the Tier-1 inbox (small append-only files, everyone can reach it, customer data stays internal) and worth measuring as an onboarding seed bundle (`Sequences/` is git-ignored, so a fresh clone faces ten SVN template checkouts plus regeneration — though the `Template *` working copies themselves must still be checked out locally). **Not** a place to run the workspace from: `fetch-project.ps1` does `svn revert -R` unconditionally so two simultaneous refreshes corrupt a working copy; SVN/git over SMB is slow and lock-prone; `settings.local.json`, the generated `.agents\` adapters and `jira-config.json` are per-machine and would collide; and `Update-CoreVersion.ps1` already needs an NTFS junction for deep paths locally. The rule is **local clones, shared outputs**. Hosting the always-on A4 box on that server is also discouraged — ask IT for a VM rather than adding agent tooling to infrastructure others depend on.
- **2026-08-11 — The measured per-conversation cost is an upper bound on the same work, and must be quoted as one.** Consolidated into [Token-Usage-Analysis.md](Token-Usage-Analysis.md), which merges a session-level instrumentation run (previously never written down) with the three places the findings had scattered to — the log-analysis skill's retrieval rules, `AI_WORKSPACE_PLAN.md` F1/F7, and `lab-chat-poc/README.md`. Three results bear on §8's 2026-08-07 access entry. (1) **Money and the 5-hour window are driven by different tokens.** Cache reads are 94.7% of volume and 42% of the bill but contribute *nothing measurable* to plan usage (fitted freely, their weight goes negative); the window tracks output and cache writes. So terse replies barely move the money and trimming context barely buys window headroom — the two levers point at different constraints. (2) **Over half the cost is paid before any work starts.** A measured session carried a 71,151-token floor against 137 calls = 9.7M cache-read tokens ≈ $4.87, 54% of its cache reads; the workspace's own instruction files are ~9k tokens of that, the rest is harness (tool schemas, the ~250-entry deferred tool list, MCP instructions, skills listing) — much of it from *global* config that loads in every project. (3) **One skill load was 31% of a session** — 335,893 tokens pulled in to answer a one-table pricing question. Ranked levers (`/clear` between tasks, no large skill for a small lookup, subagents for bulk reading, trimming the global MCP surface) put the same work at ~$4–5 against $14.24. Consequence for the pitch: the €3.91/conversation (now €4.44) and ~7 conversations/seat/day figures were all measured *before* any of this was known, so present them as what unoptimised use costs, not as an irreducible unit cost — and do not quote a lower number until it has been measured. The seat-count argument is unaffected: seats are driven by the one-person-per-subscription rule and by window contention, and the window tracks the tokens the levers move least.

- **2026-08-19 — Per-conversation cost is €4.44, not €3.91, and the case base is 51, not 47.** Both figures were re-derived rather than re-quoted, while rebuilding the capability deck. **The cost correction came from a logging defect Joost spotted:** in the three most recent chats the `api_cost_*` column records a **running session total** rather than that turn's own cost, so `cost_report.py:143`, which sums the column, double-counts them — the symptom was a wrap-up turn appearing to cost €4.38 for writing one markdown file when it actually cost €0.94. Everything was therefore recomputed from each turn's **token counts**, which are per-turn and correct in every row: 14 conversations, **€4.44 each** (service ticket €6.23, lab question €3.73). Fix the logger before re-running `cost_report.py`. A second measurement caveat Joost raised is real and already handled: the `five_hour_pp` column comes from an account-wide endpoint, so concurrent chats land on whichever chat asked — which is exactly why plan figures come from the fitted `plan_calibration.json` and not from the raw column. The count of 51 is the write-ups in `md documents\* Details\` excluding each folder's README; it also settles the old 47-vs-41 disagreement between §2 and §8. **Still to fix elsewhere:** `Access-and-Feedback-Loop.md` §2 still says €3.91.
- **2026-08-19 — GitHub Copilot bills by the token, so "Copilot is more expensive per unit" is false and must not be argued.** Copilot moved to **AI Credits** on 2026-06-01: 1 credit = $0.01, consumed on input, output and cached tokens at each model's published API rate — the same rates `pricing.py` computes. The real argument is that **metering is the wrong instrument for this workload**, not that GitHub overcharges. At €4.44 a conversation, a €19 Copilot Business seat buys ~4 conversations a month and the company's ~20,000-credit shared pool buys ~41 for everyone — so one conversation is ~2.4% of the entire company AI budget, which is why Joost was locked out after roughly one prompt. A flat-rate subscription bills the ~5% the assistant **writes** and effectively not the ~95% it **re-reads**, which is where the gap comes from. Written up for a non-technical audience in [AI-Plan-Pricing-Explained.md](AI-Plan-Pricing-Explained.md). **On data governance this closes a question:** GitHub hosts Anthropic's models on AWS, Anthropic's own infrastructure and Google Cloud under a zero-data-retention, no-training agreement — so running Opus in Copilot **already** sends our prompts to Anthropic. Approving Claude directly is a question of which contract governs the data, not of whether the vendor sees it. Note the tension: own-tenancy hosting (Bedrock/Vertex/Foundry) answers security but returns to per-token billing, so it cannot be combined with the flat-rate cost case.

- **2026-08-19 — Lab goes first, not Helpdesk** (Joost: *"We will start with lab"*). Reverses the 2026-07-25 decision. The one-pilot-at-a-time rule is unchanged and still the reason the other waits; only the order flipped. The deciding argument is the one already recorded on 2026-07-29 — Lab sends us questions **unprompted**, and unsolicited demand is better evidence than any pitch — which was accepted then as the stronger *test* (Arm B leads Arm A) but not followed through into the pilot order. Doing so now makes the two consistent: we pilot where the questions are already arriving. Helpdesk is not dropped and still owns the cleaner before/after metric (§5), so it goes second. Consequence: §3, §4 phases B and D, and the capability deck all now lead with Lab, and the ask is a green light for a six-week Lab pilot rather than a Helpdesk one.

- **2026-10-02 — The Lab pilot is one engineer, on their own laptop, in Claude Desktop's Code tab** (Joost). Not on the PC attached to the robot. Claude Code only, so the hook- and settings-based mechanisms below apply; Copilot and Codex would get none of them. Full design: [Access-and-Feedback-Loop.md](Access-and-Feedback-Loop.md) §8.

- **2026-10-02 — A lab clone is read-only by construction, tracks `stable`, and carries only what the Lab needs** (Joost: *"sounds good, but I am very unfamiliar with how git works, so I would need help setting this up"*). The trigger was a gap the 2026-08-07 feedback-loop decision did not cover: what happens on the clone of someone who uses the workspace but never commits.
  - **What was checked.** Nothing updates such a clone except re-running `Bootstrap-RoboticsAI.bat`. And the logging skills append to the tracked `AI_*_Log.md` files. On a clone that never commits, that blocks the next `git pull` as soon as `main` changes the same log, leaves the clone silently out of date, and lets the assistant treat its own unverified entry as case-base fact.
  - **Decided:**
    - The Lab tracks a `stable` branch. Joost moves it up to `main` with one command after each promotion, because he wants an approved entry available immediately, not on a cadence.
    - A `SessionStart` hook fetches, backs up any locally changed tracked file, and resets the clone to `origin/stable`. Joost first leaned towards warn-only, and accepted back-up-then-reset once it was clear that git-ignored content (order checkouts, templates, logs, `Sequences\`) is never touched. A warning a user unfamiliar with git cannot act on leaves the clone out of date.
    - **Sparse checkout** keeps rollout material, prototypes, workspace plans and assessments off lab machines while everything stays in one repo with one context. Joost raised this himself: much of the repo is tests or documentation the Lab does not need, but he wants it in the same workspace.
    - `Bootstrap -Role Lab` writes **user-level** deny rules on tracked content, so the lock is enforced by the tool rather than an instruction, and adds a session line that redirects "offer to log it" to a draft on a share.
    - Claude's personal memory is off on lab machines (Joost: anything useful belongs in the docs, verified by him before any skill or instruction changes).
  - **Rejected:** a lab branch with files deleted (every update brings them back); a separate personal repo (loses the shared context); OneDrive for the repo (sync corrupts git working copies). Material that colleagues must not read at all goes in a git-ignored `_private\` folder, not the repo: sparse checkout hides files from the laptop, not from someone with repo read access.

- **2026-10-02 — Drafts from the Lab are visible before review, and the Lab's confirmation counts as verification** (Joost). A lab user's draft is searchable by other lab users as long as it is clearly labelled unreviewed. A Lab engineer's "fixed on the robot" counts as verified, so review becomes a check on quality, format and duplicates rather than re-verification, which is what keeps "approved means available immediately" realistic. Reviewers: Joost plus a colleague with more robot knowledge, still to be asked. That is a first step on §6.1, not an answer to it. This refines the 2026-08-07 two-tier rule for drafts written by the person who did the work; raw transcripts stay per user.

- **2026-10-02 — Robot logs reach the laptop through a copy job on the robot PC, and the delivery tool owns its removal** (Joost: *"it would be ideal if they could have at least their Log folder always available on laptop B"*).
  - **Why it's needed.** The core writes logs to `<application folder>\Log` (`MainForm.cs:4101`), which on a lab robot PC is under the Desktop checkout. Today the engineer copies the one relevant log to a share by hand, and often doesn't know which one.
  - **Decided:** a scheduled task copies every order's logs to `\\<share>\RobotLogs\<order>\`, so nobody has to pick the right log.
  - **Rejected:** Loupe Server upload (licence, hosting, and a core change that ships to customers); Windows sharing on each robot PC; running the software from the share.
  - **The job must never ship**, and the robot PC goes to the customer in about 70% of orders. Joost does not want this to rest on Lab discipline. So the job is inert off the lab network, its removal is a mandatory, verified step of an installer-USB delivery tool, and the delivery report records it.
  - **The delivery tool is its own project.** Joost proposed it because building the USB is a job the Lab dislikes. It is split off so it does not distract from the pilot: [Installer USB Builder - Plan.md](../md%20documents/Assessments%20&%20Plans/Installer%20USB%20Builder%20-%20Plan.md).

- **2026-10-02 — Building the Lab setup waits for the Bitbucket move and IT's answers** (Joost). The scripts do not care where the repo is hosted, but building first would mean re-cloning the pilot laptop and redoing permissions. IT meeting on 2026-10-06: share paths and permissions, scheduled tasks on robot PCs, Bitbucket permissions and branch restrictions (questions in [Access-and-Feedback-Loop.md](Access-and-Feedback-Loop.md) §8.8). When it is built, it is rehearsed on Joost's second PC as a stand-in lab laptop before the pilot engineer gets it.

- **2026-10-07 — Robotics-AI stays on git; Bitbucket gets a structured rebuild, not a move** (Joost, after the 2026-10-06 IT meeting). This supersedes the 2026-08-07 "repo moves to company Bitbucket" entry: current users keep working from this repo, and the Bitbucket version is rebuilt more structurally, reusing what exists here. **The share is not decided.** IT's feedback was to look at RAG (retrieval-augmented generation), which is about how the knowledge is *searched*, not where drafts are *stored*, so it does not answer the share question. It is recorded as an open lead. *Assessed 2026-10-26:* RAG fits the written knowledge (knowledge base, case base, known issues, dossiers, index cards) but not order software, logs or code; see [RAG Assessment.md](../md%20documents/Assessments%20%26%20Plans/RAG%20Assessment.md).

- **2026-10-07 — Non-git colleagues contribute through `Submit-Contributions.ps1`; what they make is theirs, what Joost made needs his approval** (Joost: *"lets try that submit-caseentries and see how it goes"*, then *"I'm fine him vibecoding some scripts for himself within robotics-ai ... its really just anything I made that his Claude wants to adjust for 'some' reason would need an approve first"*). The trigger: the product specialist's first logged entries were stuck as uncommitted edits on his clone, the exact §8.2 failure. The script sends everything he made as one `contrib/<name>-<stamp>` branch, grouped Case base / New / Own / Tools page / **Please approve**. *Own* is read from git history (who first added the file), so his scripts stay his after merging, with no list to maintain. *Please approve* is edits to anyone else's file, which need a `-Note` reason. The commit is built in a temporary index, so a refused push changes nothing. After a confirmed push the workspace resets to `origin/main` until the merge, which keeps unreviewed edits from lingering and pulls from breaking. `.gitattributes` sets `merge=union` on the `AI_*_Log.md` files, because both sides append whole entries at the end and would otherwise conflict on every review (tested). **Deliberately light** (Joost: *"Its a close colleague btw, I have daily contact with him. So it shouldnt be super strict, just make it easier for him to use"*). Nothing is locked or installed in his Claude settings. The rule is a request in the shared instructions ("before changing a file someone else made, say whose it is and ask"), and Joost's review is the approval. **Rejected for now:** a PreToolUse hook blocking edits to other people's files, and Claude Code deny rules. Both work, but they are friction a daily-contact colleague does not need. Revisit for less close users, or when the Lab design (§8.5) gets its tool-enforced lock. It runs, and the wrap-up skill offers it, only on a clone marked with `-SetupContributor` (a flag in that clone's `.git\config`, never committed; `-RemoveContributor` undoes it). The instruction text is shared, and a maintainer must never be offered it or have their own uncommitted work reset (Joost: *"So i get asked to push it to Joost as well every time?"*). The flag is the precursor of the install-time role in [Access-and-Feedback-Loop.md](Access-and-Feedback-Loop.md) §8.5. It needs collaborator write access per user. On a private personal repo, branch protection requires GitHub Pro (not checked for this account); without it, the guard is that these users never run git themselves. This is the "pull request from a user's own clone" route §4 already allowed, and it can stand in for the §8 Lab drafts-to-share route until the share exists.
- **2026-10-27 — No engineer review before the asker sees a chat answer** (Joost, reviewing the flowcharts page). This drops the reviewer in front that was planned as Stage 1 in the 2026-08-07 entry, [Access-and-Feedback-Loop.md](Access-and-Feedback-Loop.md) §5 and the RAG Assessment. Answers from the web chat, in both the knowledge lane and the order lane, go straight to the asker. The §7 "first wrong answer" risk is now carried by the answer itself (cited sources and page status, facts kept apart from inferences, asking for what is missing instead of guessing), by "no good match" handing over instead of guessing, by read-mostly permissions, and by a Software Engineer reading what was answered afterwards through the feedback loop. Stage 2 becomes the confidence gate (F13). Removed in the same change from flowchart 11 and the page's "still missing" list.

## 9. Next actions

- [ ] Schedule discovery conversations — Helpdesk (2–3 people), Lab (2–3 people).
- [ ] Select 3 closed RB/ES tickets and 2 lab cases for the replay test.
- [ ] Open the data-governance question with IT/security — lead with cloud tenancy as the available answer (§6.2).
- [ ] Agree the maintenance-ownership position with the manager.
- [ ] Harden `lab-chat-poc` permissions (read-mostly allowlist) before anyone outside Software Engineering uses it, then run Stage 1 triage-and-draft (§8, 2026-08-07).
- [ ] Confirm current Claude seat tiers with Anthropic, then compare against the measured €4.44/conversation and ~7 conversations/seat/day.
- [ ] Agree the inbox share path, then build the capture script and register its hooks from the spec in [Access-and-Feedback-Loop.md](Access-and-Feedback-Loop.md) §4 — at pilot start, after colleagues have been told.
- [ ] Add the session-capture disclosure to `Helpdesk-Usage-Plan.md` and `Lab-Usage-Plan.md`.
- [ ] Confirm who authorises the Bitbucket move; update `SETUP.md` and `Bootstrap-RoboticsAI.bat` when it happens.
- [ ] IT meeting 2026-10-06: inbox and robot-log shares, scheduled tasks on robot PCs, Bitbucket permissions ([Access-and-Feedback-Loop.md](Access-and-Feedback-Loop.md) §8.8).
- [ ] Ask the colleague to be the second case-base reviewer (§6.1, §8 2026-10-02).
- [ ] After Bitbucket: build the Lab setup (`stable` + `Publish-ToLab`, session-start update, `-Role Lab`, drafts to the share, log copy job), rehearse it on the second PC, then hand it to the pilot engineer ([Access-and-Feedback-Loop.md](Access-and-Feedback-Loop.md) §9).
