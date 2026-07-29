# Replay & Question Test — protocol

**Status:** draft for Joost's review. Not yet part of the workspace.
**Owner:** Joost (Software Engineering) · **Date:** 2026-07-29
**Parent:** [PROJECT.md](../PROJECT.md) Phase A · feeds the confirmation round and the Phase C business case.

---

## 1. What this is for

Phase A needs evidence that survives a sceptical reader. "Would this be helpful?" produces polite
agreement; this produces either "when can I have it" or a specific, useful objection.

**The question being tested is not "can it answer a ticket".** Reading the RB/ES threads, the pattern is
consistent: Helpdesk receives the issue, gathers evidence, escalates, and a Software Engineer produces the
diagnosis. So the real question is:

> **Can it reach the Software Engineer's answer from the same evidence Helpdesk already had in front of them?**

Every yes is Software Engineer time that did not need to be spent — which is the headline metric in
[PROJECT.md](../PROJECT.md) §5.

**What a pass does not prove.** That it is right in general, that it is safe unsupervised, or that
Helpdesk will adopt it. It proves one thing: on these cases, from this evidence, it got to the answer (or
didn't) in this much time.

## 2. Two arms

| Arm | Direction | Source | Ground truth |
|---|---|---|---|
| **A — Ticket replay** | Backward: closed RB/ES tickets, run cold | Selected shortlist, Helpdesk picks the final three | The Software Engineer's diagnosis recorded in the thread |
| **B — Lab questions** | Forward: questions Lab would actually ask | Lab is sending these unprompted | The asker's own judgement of whether it helped |

**Arm B is the stronger evidence and should be led with.** The questions are unsolicited, they are what Lab
actually wants to know, and there is no contamination to engineer around — nobody has answered them yet.
Arm A exists because Helpdesk has no equivalent yet and because a "we already lived through this one"
comparison is legible to a manager in a way an open question is not.

Do not let Arm A delay Arm B. If the Lab questions arrive first, run them first.

---

## 3. Contamination — the rule that makes results defensible

A replay is worthless if the answer is inside the evidence. Two separate leaks, two different fixes.

### 3.1 The case base

The 41 write-ups in `md documents/` are cases Robotics-AI already solved, and searching them is step one
of the normal workflow. Any case with a write-up is disqualified as a *cold* run unless the write-ups are
withheld.

- **Arm A:** the ticket shortlist already excludes all 18 tickets that appear in the case base or have a
  folder in `Service Items/`, `RB-*/`, `ES-*/`. Nothing to withhold.
- **Arm B:** if a Lab question happens to match an existing write-up, that is a *finding*, not a problem —
  it means the case base answered it. Record it as a hit and move on. Do not withhold anything in Arm B.

### 3.2 The ticket's own comments (Arm A only)

The scraper pulls current ticket text **and all comments**. On a closed ticket that includes the fix — in
RB-354 the root cause is stated in the *first* reply. Left alone, the replay reads the answer and restates
it.

**Cut-off procedure, per case:**

1. Run the scraper normally to build `Service Items/<KEY>/`.
2. **Move** the bundle to `Rollout/Replay-Test/cases/<KEY>/` — move, not copy. See the warning below.
3. In the frozen copy, trim the ticket description file to the customer report plus any Helpdesk
   clarification, and **delete every comment from the first Software Engineer diagnosis onward**.
   Attachments stay untouched — the logs and software are the evidence under test.
4. Note the cut-off point in `cases/<KEY>/CUTOFF.md`: which comment index, and who wrote it.
5. Confirm `Service Items/<KEY>/` no longer exists before the run starts.

> **Move, do not copy.** If the untrimmed bundle stays in `Service Items/<KEY>/`, the answer is still
> sitting in the workspace where a search will find it, and the whole cut-off is decorative. Relying on an
> instruction not to look there is not a control. After the test, re-scraping that ticket is one command.

**The pipeline is never modified.** No changes to `Process-ServiceTickets.ps1` or the
`skalar-jira-issue` skill. On a live ticket, comments are among the best evidence available — customer
replies, what was already tried, phone-call summaries — and crippling that to make a test cleaner would
trade the real thing for a demo of it.

**If trimming exceeds ~10 minutes per case, abandon the cut-off** and fall back to scoring only the
evidence-gathering half (download, unzip, install the customer build, read the log, find the exception)
against how long that actually took. Weaker claim, still honest. Do not build tooling for this.

### 3.3 Lab cases (if Arm A is ever extended to lab replay)

Every lab case in the case base was solved by Robotics-AI, so contamination there is total. The fix is
cleaner than for tickets: the write-up is a local file, so excluding `md documents/` for the run gives a
genuine cold start with no manual trimming. Candidates if needed: **99440436** (COM-port timeout — the log
actively misleads) and **99444244** (stuck at "Started" — subtle table binding).

Prefer Arm B over this. Real questions beat reconstructed ones.

---

## 4. Arm A — ticket replay

### 4.1 Candidate shortlist

Selected from 96 closed RB/ES tickets (2026-02-11 → 2026-07-27) after removing the 18 contaminated ones,
non-robot product lines (FlowAccess, Primacs, FORMACS, SFA), and tickets with no recorded outcome to score
against.

| Tier | Ticket | Why it is in | Ground truth | Evidence |
|---|---|---|---|---|
| **Core** | **RB-354** — Aqualyse, robot stopped mid-analysis | The clear win. BOD dual bridge — deepest coverage. Two root causes in one ticket: probe synchronisation logic, then a memory fault fixed by Core 1.141.1 → 1.141.4 | Strong — both causes stated explicitly | `BOD.zip` (204 MB) + logs |
| **Core** | **RB-343** — wash cycles for disabled parameters | Correct answer is **"nothing is wrong"**; proven by an emulation run on the customer's own backup. Tests whether it invents a bug to seem useful | Strong, unusually clean | customer backup (144 MB) |
| **Core** | **RB-337** — SP2000 LUTUM water addition | Clay Fraction — thinnest template. Conclusion was *probably hardware, not software*, on a 2018 robot | Moderate — reasoned, not a confirmed fix | `.log` + video (63 MB) |
| **Core (optional 4th)** | **RB-321** — Microbeam gripper sticks | Closed with "all the other logs finalised correctly, there isn't anything more we can do". Correct output is **"insufficient evidence"** — the sharpest test of the claim that it stops rather than guesses | Strong (negative) | 10 attachments (26 MB) |
| Alternate | **RB-326** — Anglian Water, oxygen-depletion error + botched update | Two things at once: a customer request for a different error, and a software update that was installed wrongly. Tests whether it separates them | Moderate — recorded via HubSpot notes rather than a clean root-cause statement | backup zip (181 MB) |
| Alternate | **RB-334** — InfraServ Höchst, AOX robot, dilution-only behaviour | Ten attachments across a long thread; good test of evidence handling at volume | Weak-to-moderate — closed as "the problem seems solved", root cause never stated outright | 10 attachments (78 MB) |
| Alternate | **RB-300** — Yara UK, analysis-time difference between two robots | The realistic mess: template speed difference, then a memory fault, then a hardware bug, across 20 comments and two site visits | Diffuse — spread across the thread, expensive to score | 3 attachments (1 MB), very long description |

The four core cases are deliberately **one clear win, one "no bug", one "not software", one "insufficient
evidence"**. Four wins would look cherry-picked, and three of these four reflect what Helpdesk actually
faces most.

The alternates are there so Helpdesk has genuine choice in the meeting rather than a menu of three. RB-300
is the one to reach for if someone says "show me a hard one" — but budget double the time to score it.

Caveat: the Jira query capped at 100 results and reached back to 2026-02-11, so ~2 weeks of the 180-day
window were not retrieved. Ample pool remains; this is not a complete census.

### 4.2 Who picks

**Helpdesk picks the final three from this shortlist in the meeting, or brings their own.** Pre-selecting
all three ourselves would be discounted by any reviewer — the trap [PROJECT.md](../PROJECT.md) §7 warns
about. The shortlist exists so we have rehearsed and know nothing embarrassing is in the pool.

### 4.3 How to invoke a run — do NOT use the normal route

**Typing "Solve issue RB-354" will invalidate the test.** That triggers the `skalar-jira-issue` skill,
which refreshes the ticket from Jira first — re-downloading the very comments the cut-off removed. The run
would then read the answer and appear to succeed. This is the single easiest way to waste the whole
exercise, and it fails silently.

Paste this instead, verbatim, as the **first message** of a fresh session:

```
REPLAY TEST — do not follow the normal ticket workflow.

Rules for this session:

1. Do NOT run the Jira scraper and do NOT fetch anything from Jira or the
   Atlassian MCP. This ticket has been frozen on purpose; refreshing it would
   re-download the comments containing the answer and invalidate the test.
2. Your only evidence is the bundle at:
       Rollout\Replay-Test\cases\<KEY>\
   Read everything in it, including CUTOFF.md so you know what was withheld.
   If a folder Service Items\<KEY>\ exists, STOP and tell me — it should have
   been moved before this run.
3. Otherwise work the case exactly as you normally would from that evidence:
   read the logs through Loupe, inspect the customer's software, trace the
   sequences, search the case base.
4. Produce: the symptom, the evidence you actually examined, the root cause
   with a confidence level, what remains unknown, and a draft reply. Post
   nothing anywhere.
5. If the evidence is not sufficient to reach a root cause, say so and stop.
   That is a valid and useful outcome, not a failure.
```

For a **lab** replay (§3.3), add:

```
6. Do NOT read anything under "md documents\". This case has an existing
   write-up there and reading it would hand you the answer.
```

**If it starts scraping Jira anyway, stop the session and start over** — and record it. An assistant that
ignores the framing is itself a finding worth knowing about before Helpdesk uses this unsupervised.

### 4.4 Run rules

- **Fresh session per case.** No carry-over context from a previous run or from preparing the cut-off.
- **Start the clock** when the prompt is sent; **stop it** at the written diagnosis.
- **One pass.** No re-prompting toward the known answer. If it goes wrong, that is the result.
- Record the transcript verbatim.
- The person running it should not be the person who prepared the cut-off, if that can be arranged.

---

## 5. Arm B — Lab questions

Lab is sending questions they would ask if they had access. Handle them as they arrive.

1. **Log the question verbatim** before answering, in the asker's own words. The phrasing is itself data —
   it shows the vocabulary the workspace has to support, which is exactly what
   [PROJECT.md](../PROJECT.md) §3 flags as the unsolved problem for Sales.
2. **Answer it in a fresh session**, normally, with everything available. No withholding, no special
   prompt — Arm B has nothing to hide from, so it should run exactly as a real user would run it.
3. **Time it**, and record what it needed: SVN checkout, log, template docs, case base.
4. **Take it back to the asker** and get two things:
   - Was this right? (their judgement, they know the robot)
   - Would this have saved you a trip to a Software Engineer, and roughly how long a trip?
5. **Record failures prominently**, especially coverage failures — a question about Testkit or Clay
   Fraction that lands badly is more useful than a BOD question that lands well, because it tells you where
   to invest.

The second question is the metric. "It would have saved me two hours and a wait until someone was free" is
the sentence the business case needs, in a Lab engineer's words rather than ours.

---

## 6. Scorecard

One per case, both arms. Fill in immediately after the run, before discussing it with anyone.

```
Case:                    (RB-xxx / lab question ID)
Arm:                     A (replay) / B (question)
Run by:                  Date:
Time to written answer:  ___ min       Evidence cut-off applied: yes/no

RIGHT     — what it got correct, and was it the actual root cause or an adjacent true fact?
WRONG     — what it got wrong. Quote it.
MISSED    — what a good engineer would have caught that it did not.
INVENTED  — anything asserted without evidence. Weigh this heaviest.
CONFIDENCE— did its stated confidence match how right it actually was?
STOPPED   — where it said "I don't know" or "insufficient evidence". Correctly?

Ground truth (what actually happened):

Verdict:  reached the answer / partially / no / correctly declined
Would it have saved Software Engineer time on this case?   yes / no / partly — estimate:
```

**INVENTED is the one that matters.** A wrong answer costs an hour; a confidently invented one costs trust,
and per [PROJECT.md](../PROJECT.md) §7 the first wrong answer is what kills adoption. Any case with an
INVENTED entry gets shown in the meeting whether or not it flatters us — a demo that only shows wins
invites the question of what was left out.

## 7. Reporting

Results go in `Rollout/Replay-Test/RESULTS.md` — one section per case, scorecard verbatim, no summarising
away the bad ones. The meeting shows the **replay and the questions**, not this protocol and not the usage
plans. Plans invite polite review; results invite a decision.

Aggregate only three numbers:

- cases where it reached the Software Engineer's answer, out of total
- median time to written answer vs. what it actually took at the time
- cases where it invented something

If the third number is not zero, lead with it.
