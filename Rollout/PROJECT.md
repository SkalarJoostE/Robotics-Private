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

**Last updated:** 2026-07-25 — project started; Helpdesk and Lab usage plans drafted; error-code extraction cut from all capability claims as unevidenced (Joost).

---

## 1. The case in short

Robotics-AI is an AI assistant taught our robot software — the Sequence/SubSequence execution model,
the C# action code, per-template error codes, the Confluence setup guides, and a growing base of
solved cases. It has been in real use by R&D since April 2026.

The argument for making it official is not "AI is useful". It is that **R&D engineer time is the
scarcest resource in the product chain**, and a large share of it is spent answering questions from
Helpdesk and Lab that the evidence already contains. Every question those departments can answer
themselves is R&D capacity returned.

The two things being asked for are **allocated development time** (the real constraint) and
**Claude subscriptions** (the small, easy number). Licences without a maintainer produce shelfware,
so the time is the headline ask.

## 2. Where we are today

**Users:** 1 (Joost, R&D), across two PCs. Everything below is built, working, and in daily use.

| Evidence | Figure |
|---|---|
| Documented solved cases | 41 write-ups, 2026-04-14 → 2026-07-23 (~12/month) |
| Historical orders indexed for precedent search | 1,276 trunk orders |
| Verified reusable B-feature dossiers | 5 (all from order 99436189) |

**A caution on evidence.** The figure that matters is the 41 write-ups — real cases, real outcomes.
Resist padding the case with infrastructure counts (extracted error-code tables, templates checked
out, scripts written). Those are plumbing. A capability that has never demonstrably changed the
outcome of a case does not belong in a business case, and a reviewer who spots one padded number
will discount the rest.

**Working pipelines:** RB/ES ticket intake and diagnosis · lab-issue intake (order + log → diagnosis) ·
binary `.glf` log analysis via Loupe · SVN order/template checkout with Sequence CSV generation ·
historical B-feature precedent search · SSO R&D-approval intake · core-version update automation.

**Onboarding:** `Bootstrap-RoboticsAI.bat` → double-click, installs prerequisites, clones the repo,
runs setup. Then two browser OAuth logins. See `SETUP.md`.

## 3. Scope by department

| Dept | Fit | Readiness | Notes |
|---|---|---|---|
| **Helpdesk** (RB/ES) | Strong | **Ready to pilot** | Highest volume, most repeatable, clearest before/after metric. Plan: [Helpdesk-Usage-Plan.md](Helpdesk-Usage-Plan.md) |
| **Lab** | Strong | **Ready to pilot** | Nearly as ready; audience is less terminal-comfortable. Plan: [Lab-Usage-Plan.md](Lab-Usage-Plan.md) |
| **Sales** | Plausible | **Not ready** | "Have we built X before?" over the order index, and A-vs-B feasibility during quoting. The index is keyed on engineer vocabulary (commit messages, folder names), not sales vocabulary — real work needed before it's usable. Deferred to phase 2. |
| **R&D** | — | In use | Current home. Feature precedent, B-feature porting, SSO approvals. |

**Decision (2026-07-25): Helpdesk goes first, alone.** Two simultaneous pilots halve the attention
each gets, and Helpdesk gives the cleaner number.

## 4. Rollout phases

### Phase A — Validate (current)
- [x] Draft usage plans for Helpdesk and Lab.
- [ ] Discovery conversations: 2–3 people per department, ~30 min. Ask what took too long last week and how long it took — **not** "would this help?".
- [ ] Replay test: 3 closed RB/ES tickets + 2 lab cases, run cold. Record output quality vs. what actually happened, and time taken.
- [ ] Confirmation round: show the replay, not the plan. Ask each department to name a pilot person and commit their time.

**Exit criteria:** each department has either named a pilot person and committed their time, or given a specific reason not to. Enthusiasm without committed time counts as a no.

### Phase B — Pilot
- [ ] 1 department (Helpdesk), 1–2 people, fixed period (suggest 6 weeks).
- [ ] Baseline metrics captured before day 1.
- [ ] Weekly check-in; log every case where it was wrong, not just where it worked.

**Exit criteria:** measured improvement on at least one agreed metric, and the pilot users want to keep it.

### Phase C — Budget & approval
- [ ] Business case with replay + pilot numbers.
- [ ] Answers ready for the three questions that always come: maintenance ownership, data governance, scope boundaries (§6).
- [ ] Ask: allocated development time + licences for the next tier of users.

### Phase D — Roll out
- [ ] Helpdesk broadly, Lab pilot starts.
- [ ] Sales exploration begins only once A–C have held up.

## 5. Metrics

To be filled from Phase A. Challenge these before collecting them — measuring the wrong thing is worse than measuring nothing.

| Dept | Measure | Baseline | After |
|---|---|---|---|
| Helpdesk | Time from ticket arrival to first informed reply | ___ | ___ |
| Helpdesk | Tickets/month escalated to R&D | ___ | ___ |
| Helpdesk | Evidence-gathering time before diagnosis starts | ___ | ___ |
| Lab | Time lost/week waiting on R&D for software answers | ___ | ___ |
| Lab | Time to diagnose a build/FAT blocker | ___ | ___ |
| All | R&D engineer hours returned (the headline number) | ___ | ___ |

## 6. Open questions — must be answered before Phase C

1. **Maintenance ownership.** Who supports this when Joost is away? A single-maintainer tool with twenty dependents is the standard failure mode for internal tooling. Options: named backup maintainer, a small team, or an explicit "best effort, no SLA" policy stated up front.
2. **Data governance.** Customer logs, customer software and Jira content are sent to a cloud model. IT/security must be engaged **before** approval, not after. Get a written position.
3. **Shared state at multi-user scale.** The case base and `verified-features/` only compound if everyone commits back. Multiple machines polling Jira duplicates work. Per-user clones are fine for a pilot — this is deferred, not solved.
4. **Licence tier and seat count.** Which Claude tier per department, and how many seats at each phase.
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
- **2026-07-25 — Capability claims must be backed by a case, not by existence** (Joost). Error-code extraction was cut from all three documents: none of the 41 write-ups reference `error-codes.md`, and only 4 mention error codes at all, incidentally. The tables are a real convenience and stay in the workspace — they are just not evidence of value and must not be pitched as such. Apply the same test to every future claim.

## 9. Next actions

- [ ] Schedule discovery conversations — Helpdesk (2–3 people), Lab (2–3 people).
- [ ] Select 3 closed RB/ES tickets and 2 lab cases for the replay test.
- [ ] Open the data-governance question with IT/security.
- [ ] Agree the maintenance-ownership position with the manager.
