# Context Usage Assessment by Claude

> **Question:** Why does a *single* prompt — "solve RB-380", "here is a lab log, what is wrong" —
> burn a fifth of a daily limit?
> **Method:** Every Claude Code transcript on this PC — 49 sessions, 3,149 API calls, 235 user
> prompts, 551.2M billed tokens, 2026-07-21 to 08-19. Measured, deduplicated, not estimated.
> **Finding:** One instruction costs a median of **1.55M tokens** because it spawns dozens of
> autonomous turns, and **cost grows with the square of the turn count**, not with how much is read.
> A whole lab-issue investigation gathers only ~185k tokens of evidence and bills 7.5M.
> **Scope:** Workspace-wide.

Date: 2026-08-26 (rev 3) · Author: Claude (Opus 5) · Reproduce with
`Tools&Scripts\Measure-ContextUsage.ps1 -ByPrompt -Detail`

> **Revision note — two corrections, both material.**
>
> **Counting bug (rev 1 and 2).** Claude Code writes **one JSONL record per content block**, and
> every record of the same API call repeats the same `usage` object. Summing records
> double-counts. Measured inflation on this corpus: **2.11×**. Rev 1's "158.4M" and rev 2's
> "1,125.6M" are both wrong; the true local figure is **551.2M**. All ratios survive — the absolute
> numbers do not. The script now deduplicates by `requestId`.
>
> **Wrong unit of analysis (rev 1 and 2).** Both measured *sessions* and concluded the top fix was
> `/clear` between tasks. That does not address the actual complaint: a single prompt, from a clean
> session, already costs 5–8M. Rev 3 measures **per user prompt** and the ranking changes
> completely. `/clear` drops to a minor fix.

---

## 1. How this was measured

Claude Code writes a transcript per session to `%USERPROFILE%\.claude\projects\<slug>\*.jsonl`
with the exact per-call `usage` block. `Tools&Scripts\Measure-ContextUsage.ps1` reproduces every
table here; it is read-only.

```
powershell -NoProfile -File "Tools&Scripts\Measure-ContextUsage.ps1" -ByPrompt -Detail
```

**Two terms used throughout.**

*Turn / API call* — one request to the model. One user prompt triggers many: the model calls a
tool, reads the result, calls another, and so on until it answers. **56 turns for one lab issue is
normal.** Deduplicated by `requestId`; a turn that emits thinking plus three tool calls is one turn.

*Carried* — context is re-sent in full on every turn, so a tool result is paid for on every turn
that follows it. A 5k result produced on turn 10 of a 56-turn run costs 5k × 46 = 230k. *Added* is
its first-time cost; *carried* is its real cost. They differ by two orders of magnitude.

---

## 2. The measurement

| | Value |
|---|---|
| Sessions / API calls / user prompts | 49 / 3,149 / 235 |
| Billed input | **551.2M** (+3.1M output) |
| Re-sent context (cache-read) | **97.6%** |
| Fixed floor, re-billed every turn | 174M (**31%**) |
| Evidence the run gathered itself | 378M (**69%**) |
| **Cost of one user prompt** | median **1.55M**, mean 2.35M, worst **20.8M** |

97.6% of everything paid for is context already sent. That is the whole story; the rest of this
document is about which mechanism generates it.

### 2a. The floor, and its growth

~53k average is loaded before you type anything — instructions, skill descriptions, tool schemas,
client prompt — and re-sent on every turn. It is not stable:

```
Jul 21  47k     Jul 29  55k     Aug 05  58k     Aug 12  60k     Aug 19  64k
```

**+35% in one month.** Worth knowing, but it is 31% of the bill and only ~25% of *that* is our
documentation (13.1k) — so the instructions file is about **8% of total spend**, which is far less
than the attention it has been getting.

### 2b. Context only ever grows

Monotonic in all 49 sessions without exception. No `/clear`, no compaction event, ever. Nothing has
reduced context in this workspace at any point.

---

## 3. Why one prompt is expensive — the actual mechanism

Two real lab-issue investigations, each the **only** prompt in a fresh session, so nothing is
inherited and `/clear` is irrelevant by construction:

| | `1f498711` | `6723c41e` |
|---|---:|---:|
| Turns | 56 | 36 |
| Floor | 35k | 56k |
| Peak context | 220k | 217k |
| Tool calls | 65 | 52 |
| **Evidence actually gathered** | **185k** | **162k** |
| **Billed** | **7.5M** | **4.8M** |

Read that twice. The investigation looked at **185k tokens** of logs, XML and code — and cost
**7.5M**. A 40× multiplier. Nothing was read wastefully; the material is re-sent 56 times.

The cost of a run is, to a good approximation:

$$T \;\approx\; n \cdot f \;+\; \frac{n^2}{2} \cdot g$$

where $n$ = turns, $f$ = floor, $g$ = evidence added per turn. For `1f498711`
($n=56$, $f=35\text{k}$, $g=3.3\text{k}$): $2.0\text{M} + 5.2\text{M} = 7.2\text{M}$, against 7.5M
actual.

**The quadratic term dominates, and $n$ is the only variable in it.** Same evidence, fewer turns:

| Turns | Floor cost | Accumulation | **Total** |
|---:|---:|---:|---:|
| 56 (actual) | 2.0M | 5.2M | **7.1M** |
| 40 | 1.4M | 3.7M | **5.1M** |
| 28 | 1.0M | 2.6M | **3.6M** |
| 20 | 0.7M | 1.9M | **2.5M** |

**Halving the round trips cuts the bill by half again**, and reading *less* barely matters by
comparison. The two sessions above are the natural experiment: the same investigation done in 36
turns instead of 56 cost 4.8M instead of 7.5M — **36% cheaper for the same answer**, purely from
batching more tool calls per turn (1.44 vs 1.16).

---

## 4. What fills the context

Every increase between consecutive turns, attributed to the tool that caused it:

| Tool | Calls | Added once | **Carried** | Share |
|---|---:|---:|---:|---:|
| **Bash** | 1,619 | 2,896k | **190.7M** | **47.6%** |
| Read | 222 | 1,144k | 61.9M | 15.5% |
| User turns / pasted content | 176 | 1,059k | 33.2M | 8.3% |
| Edit | 453 | 556k | 26.9M | 6.7% |
| Write | 96 | 476k | 23.9M | 6.0% |
| PowerShell | 254 | 399k | 19.3M | 4.8% |
| Grep | 71 | 207k | 9.9M | 2.5% |
| Skill invocations | 33 | 182k | 8.8M | 2.2% |
| Loupe MCP | 30 | 232k | 6.2M | 1.6% |
| Atlassian MCP | 2 | 32k | 3.2M | 0.8% |

**Shell is half of all accumulated context** — 1,619 Bash calls averaging 1.8k each. Individually
invisible, which is why no previous revision noticed. Note the *added* column throughout: the
totals are small. Nothing here is a big-payload problem. It is a **turn-count** problem, and shell
commands are what most turns are spent on.

---

## 5. What is in the floor — the MCP claim is withdrawn

Rev 1 attributed ~40k to MCP tool schemas by subtraction, citing one session that started at 37k
instead of 61k. The split reproduces here perfectly, but it is not MCP:

```
claude-desktop   n=40   baseline 47k .. 64k
sdk-cli          n=9    baseline 35k .. 38k
```

Zero overlap, and the discriminator is the **client**, not the configuration. **Six of the nine
low-baseline sessions actively call the Loupe MCP server** — MCP was connected and the session
still started at 37k. Both groups run in the same directory with the same `CLAUDE.md`, so
documentation is identical. Desktop additionally injects `mcp__Claude_Browser`,
`mcp__claude-in-chrome`, `mcp__ccd_session` and `mcp__ccd_session_mgmt`, which are **not in
`.mcp.json`** and cannot be removed by editing it.

| Component | Tokens | Confidence |
|---|---:|---|
| `.github/copilot-instructions.md` | 13.1k | measured (52,249 bytes) |
| Skill *descriptions* (9 skills) | 1.6k | measured (6,539 bytes) |
| `AGENTS.md` | 0.2k | measured |
| Client prompt + built-in tools + MCP schemas | ~38k | **not separable from transcripts** |

`/context` in the interactive CLI is the only way to split that last row. Until then, **no number
should be attached to "MCP costs us X"**, and rev 1's projected saving is withdrawn.

---

## 6. Subagents cost a full floor to start

`5b35289b/subagents/` holds 7 sidechain transcripts. Every one started at **59–60k, its parent's
floor** (parent: 59k). They billed 4.8M against the parent's 10.4M.

So a subagent is not cheap to start — but §3 explains when it still wins: it removes turns *and*
evidence from the parent, and the parent's cost in both is quadratic. Delegation pays when the
delegated work is **many turns over much evidence, returning little** — a log grind that runs 25
turns and reports three findings. It loses on a 3-turn job.

Caveat: these were full-toolset `Task` agents. Whether `tools: Read, Grep, Glob` lowers the
sidechain floor is still untested.

---

## 7. What is *not* the problem

- **Skill bodies.** Only ~1.6k of descriptions load; 185 KB of bodies cost nothing until invoked.
  This design is right and is the model for anything added to the floor.
- **Pre-generated artifacts.** `Profile.md` (1300:1 vs source XML), the Sequence CSVs, the triage
  headers (5.4:1). §4 shows them working — only 222 Read calls in 49 sessions.
- **Loupe** (1.1% of spend) and **Atlassian** (0.6%). Housekeeping, not fixes.
- **Images.** 63 image turns, 210k tokens total, 0.04% of spend. Rev 1's "1.1M from PNG reads"
  came from sessions not on this machine.
- **Reading too much.** The headline finding of §3: a full investigation reads 185k. The problem
  is not volume.
- **Documentation size, mostly.** ~8% of total spend.

---

## 8. Ranked fixes, by measured effect on one prompt

### Priority 1 — Fewer round trips per prompt (quadratic; the only large lever)

**Where the turns actually come from — measured on `1f498711`.** 45 of its 56 turns issued exactly
one tool; only 10 batched. Turns 17–27 were **eleven consecutive single Bash calls in the same
folder**, costing **1.26M** while adding 20k of evidence. The cause is structural, not careless:
the skills are written as numbered serial recipes, and are executed as written. `skalar-log-analysis`
opened with "Step 1 summary → Step 2 exceptions → Step 3 errors → Step 4 timeline" — four
independent queries against the same file, four turns.

**Implemented as a result (2026-08-26):**

- `.claude/skills/skalar-log-analysis/SKILL.md` — old Steps 1–4 merged into "Step 1: the opening
  census — issue these as one batch, in a single turn" (four Loupe calls, one turn), remaining steps
  renumbered.
- `.claude/skills/skalar-lab-issue/SKILL.md` — Step 3 now opens with an explicit **orientation
  batch**: case-base greps + `Profile.md` + the template known-issues page in one turn.
- `.github/copilot-instructions.md` — a standing batching rule near the top. Costs **263 tokens** of
  floor (15k over a 56-turn prompt) against a measured ~3.5M saving on that prompt: **230:1**.

This is deliberately fixed in the protocol rather than requested per session: a per-prompt
instruction depends on the operator remembering and the model complying, and neither is durable.

$n$ is the only variable in the dominant term. Concretely:

- **Batch independent tool calls into one turn.** The cheap session issued 1.44 tools per turn, the
  expensive one 1.16 — a 36% difference on the same task. Four sequential greps are four turns and
  four re-sends; four greps in one turn is one.
- **Make shell calls terminal, not exploratory.** One command that answers the question beats six
  that narrow toward it, and the five discarded ones are carried to the end regardless.
- **Read the committed artifacts first.** `Profile.md` and the Sequence CSVs exist so that a
  question is one read instead of a directory walk plus four greps. This is a turn-count saving
  before it is a byte saving.
- **Skills should prescribe batches, not sequences.** A protocol written as fifteen ordered steps
  produces fifteen turns. Where steps are independent, say so explicitly.

### Priority 2 — Delegate the evidence-heavy phase (§6)

Log analysis and case-base sweeps are exactly the shape that pays: many turns, much evidence,
little returned. The parent avoids both the turns and the material, and it avoids them quadratically.

### Priority 3 — Phase boundaries inside an investigation (§9)

Intake → log diagnosis → code trace, with a checkpoint between. Cuts $n$ per context and stops
phase 1's raw evidence being carried through phase 3.

### Priority 4 — `/clear` between unrelated tasks

Real but small, and **it does nothing for the single-prompt case**. `/clear` is typed by the
operator in place of a prompt; it discards the conversation so the next prompt restarts at the
floor. Files, git and the workspace are untouched. Measured usage in this workspace: **0 times in
49 sessions.** Worth adopting at topic boundaries; not the answer to "one prompt cost me 20%".

### Priority 5 — The floor

Stop the +35%/month slope: anything added to `copilot-instructions.md` should displace something or
belong in a skill body. Measure with `/context` before cutting. If trimmed, two sections dominate —
§2's SyringeCheck XML walkthrough (17.1 KB, 4.3k tok, including 4.6 KB of raw XML duplicating
`skalar-code-reference`) and the Workspace Tooling table (16.2 KB, 4.0k tok).

---

## 9. The architectural fix

**A full investigation carries every piece of evidence it ever gathered through every subsequent
turn** — 378M tokens of this corpus, most of it irrelevant to the turn paying for it. The fix is a
context boundary at each phase with a compact hand-off:

1. Phase 1 (intake + log analysis) writes a strict **`investigation-state.md`**, 1–3 KB:
   established facts, identifiers (order, revision, action number, sequence row), **evidence
   pointers** (log file + timestamp range, not the log content), and rejected hypotheses.
2. Phase 2 (code trace) starts in a **fresh context** with only that checkpoint, reopening primary
   evidence only where it must.

The checkpoint must carry **pointers, not just conclusions** — the same principle that makes
`case-base-search` return paths rather than answers. A checkpoint that drops a subtle timing detail
sends the next phase after the wrong thing and we pay for two investigations. Pointers keep the
compaction reversible.

Either mechanism implements it: a subagent per phase (automatic boundary, costs a floor), or
`/clear` plus the checkpoint file (free, manual).

*(The checkpoint/phase-isolation framing comes from a review Joost shared; the "evidence pointers"
element is stronger than what was originally proposed and is adopted rather than restated.)*

---

## 10. Open questions

- **The floor's internal split needs `/context`**, not subtraction. Rev 1's subtraction produced a
  confidently wrong answer; the honest state is a ~38k unattributed remainder.
- **Scoped subagents are unmeasured.** Whether `tools: Read, Grep, Glob` lowers the 60k sidechain
  floor is testable in one session.
- **Batching is the highest-value claim here and rests on two sessions** (36 vs 56 turns, 4.8M vs
  7.5M). It should be confirmed on a third lab issue run deliberately batched.
- **Why the floor grew 35% in a month** is not explained by file sizes; `copilot-instructions.md`
  did not grow 35%. Client updates are the likely remainder — i.e. partly not ours to control.

Recommendation: Priority 1 is the only change that alters the order of magnitude, and it costs
nothing but working style. Everything below it is worth doing and none of it is the answer.
