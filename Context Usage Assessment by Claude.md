# Context Usage Assessment by Claude

> **Question:** Why does this workspace consume so much usage, even for simple questions?
> **Method:** Measured 9 real Claude Code sessions (158.4M billed tokens) from the local transcripts. Not estimated.
> **Finding:** 96% of spend is re-sent context. Every session starts at a ~61k-token floor, and only ~13k of that is our documentation.
> **Scope:** Workspace-wide (instruction files, MCP configuration, session habits). The MCP/tooling numbers are harness-specific; the session-growth mechanism is not.

Date: 2026-08-25 · Author: Claude (Opus 5) · Reproduce with `Tools&Scripts\Measure-ContextUsage.ps1`

---

## 1. How this was measured

Claude Code writes a full transcript per session to
`%USERPROFILE%\.claude\projects\C--SPD-Projects-Robotics-AI\*.jsonl`, including the exact
per-call `usage` block (`input_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`,
`output_tokens`). Everything below is read from those records.

`Tools&Scripts\Measure-ContextUsage.ps1` (added alongside this assessment) reproduces the whole
table. It is read-only and touches nothing but the transcripts.

```
powershell -NoProfile -File "Tools&Scripts\Measure-ContextUsage.ps1" -Detail
```

---

## 2. The measurement

| Session | Calls | Baseline | Mean ctx | Peak ctx | Total billed |
|---|---:|---:|---:|---:|---:|
| 1fb53abd | 241 | 61k | 191k | 298k | **45.0M** |
| 11fe1e84 | 254 | 63k | 154k | 245k | 38.1M |
| 2f2acce2 | 186 | 61k | 165k | 260k | 29.9M |
| 2498eeef | 90 | 61k | 106k | 165k | 9.3M |
| 95e8a6fc | 83 | **37k** | 109k | 183k | 8.8M |
| badfd3a9 | 81 | 61k | 110k | 165k | 8.7M |
| 5bed1b7d | 73 | 62k | 110k | 140k | 7.9M |
| 7d692c29 | 65 | 62k | 112k | 150k | 7.1M |
| 2c95f850 | 47 | 65k | 79k | 93k | 3.6M |

**Totals:** 158.4M tokens billed — **159.3M cache-read / 5.5M cache-write / 1.3M output**.
That is, **96% of everything we pay for is re-sending context we already sent.**

Two numbers explain the entire bill.

### 2a. Every session starts at ~61k tokens

That is the floor, before a single question is asked, and it is re-billed on **every turn**.
A five-turn "simple question" therefore costs ~350k tokens minimum. This is the direct answer
to why trivial questions feel expensive — they are not cheap, and cannot be at this floor.

### 2b. Context only ever grows

```
session 1fb53abd:  61k → 93k → 126k → 177k → 223k → 260k → 293k → 298k
```

Monotonic. Nothing is ever removed. Question #8 pays for the evidence gathered for questions
#1–#7, on every single turn. Mean context for that session was 191k against a 61k floor —
meaning roughly 130k of the average turn was accumulated history.

---

## 3. What is actually in the 61k floor

| Component | Tokens | Confidence |
|---|---:|---|
| MCP tool schemas (~100 tools: Atlassian ~35, Chrome ~25, Loupe 8, …) | **~40k** | **inferred by subtraction** |
| `.github/copilot-instructions.md` | 13.1k | measured (52,249 bytes) |
| Skill *descriptions* (9 skills) | 1.6k | measured (6,274 bytes) |
| Claude Code base system prompt | ~5k | estimated |
| Memory index (`MEMORY.md`) | 0.2k | measured |

**The MCP figure is inferred, not directly measured.** The supporting evidence is session
`95e8a6fc`, which started at **37k instead of 61k** with identical documentation — a 24k
difference whose only plausible variable is which MCP servers were connected. Running
`/context` in the interactive CLI will confirm the exact split.

**The headline consequence: our tool definitions cost roughly three times our documentation.**

`.mcp.json` currently loads the Atlassian server (~35 tool definitions) into *every* session,
including lab-issue, log-analysis and code-tracing work that never touches Jira or Confluence.

---

## 4. What is *not* the problem

- **Skill bodies.** Correctly architected already — only the ~1.6k of descriptions load; the
  64 KB `skalar-feature-implementation` body costs nothing until invoked. This design is right.
- **Pre-generated artifacts.** `Profile.md` (1300:1 vs the source XML), the Sequence CSVs, and
  the 4-line triage headers (5.4:1) are the best decisions in this workspace. They are the
  cheapest possible mechanism: computed once, committed, zero per-session cost.
- **Documentation size, mostly.** 13.1k of a 61k floor is 21%, and ~7% of an average turn.
  Worth trimming, but it is a second-order fix that has been getting first-order attention.
- **Loupe.** 0.04 MB across all nine sessions. Not currently a sink, despite intuition.
- **Subagents.** One Agent call across nine sessions. Not a factor either way today.

---

## 5. Ranked fixes, by measured impact

### Priority 1 — Cut the MCP tool surface (~24–40k saved on *every turn*)

Make Atlassian opt-in rather than always-on, or enable deferred tool loading so schemas load
only when needed. Projected: on a 240-call session, **6–9M tokens**.

No new architecture, no workflow change, no behavioural discipline required. Highest value,
lowest risk item on this list.

### Priority 2 — Shorter sessions (~40% on long sessions)

Because growth is monotonic, one long session is always more expensive than several short ones
doing identical work. Session `1fb53abd` averaged 191k over 241 calls. Split into four
topic-scoped sessions it would average ~110k → **~26M instead of 45M**.

Practical rule: `/clear` at the boundary between unrelated tasks. Cost: zero.

### Priority 3 — Stop re-reading images (~1.1M tokens observed)

~30 PNG reads consumed **1.1M tokens** in the deck-building sessions, averaging **84 KB
(~21k tokens) per read**. A slide screenshot is one of the most expensive things that can enter
context. Read once; do not re-read the same slide across design iterations.

### Priority 4 — Trim `copilot-instructions.md` (~8k of 13.1k)

Two sections dominate:

| Section | Bytes | Tokens | Note |
|---|---:|---:|---|
| §2 SyringeCheck XML walkthrough | 17.1 KB | 4.3k | incl. 4.6 KB raw XML duplicating `skalar-code-reference` |
| Workspace Tooling table | 16.2 KB | 4.0k | 30 rows averaging 540 chars; longest row 1,353 |

Moving both behind an on-demand skill cuts the floor ~13%. Real, but fourth — a 13% fix sitting
behind a 40% one.

---

## 6. Where the real architectural win is

Priorities 1–4 are tuning. The structural issue is that **a full investigation carries every
piece of evidence it ever gathered through every subsequent turn.** A ticket investigation that
runs intake → log diagnosis → code trace → conclusion pays for the raw Loupe output and the Jira
attachments while it is reasoning about C# code that has nothing to do with them.

The fix is a context boundary at each phase, with a compact hand-off:

1. Phase 1 (intake + log analysis) writes a strict **`investigation-state.md`**, 1–3 KB:
   established facts, identifiers (order, revision, action number, sequence row), **evidence
   pointers** (log file + timestamp range, not the log content), and rejected hypotheses.
2. Phase 2 (code trace) starts in a **fresh context** with only that checkpoint, and reopens
   primary evidence only where it must.

The critical detail is that the checkpoint carries **pointers, not just conclusions** — the same
principle that makes `case-base-search` return file paths rather than answers. A checkpoint that
drops a subtle timing detail sends the next phase after the wrong thing, and we pay for two
investigations instead of one. Pointers keep the compaction reversible.

*(The checkpoint/phase-isolation framing here comes from a review Joost shared during this
session; the "evidence pointers" element in particular is stronger than what I originally
proposed and is adopted rather than restated.)*

**Subagents are the enforcement mechanism for this, not a separate optimization.** Their value is
context *isolation*, not cheapness — and the strongest argument for them only appears in the
measurement above: a scoped agent declaring

```yaml
tools: Read, Grep, Glob
model: haiku
```

does not load the ~40k of MCP schemas at all. Tool scoping, not documentation trimming, is what
makes a subagent cheap to start.

---

## 7. Open questions — deliberately not answered here

- **Subagent baseline is unmeasured.** No sidechain `usage` records exist in the current
  transcripts, so the break-even between "isolate into an agent" and "keep it inline" is still
  theory on both sides of the argument. `Measure-ContextUsage.ps1` should be extended to capture
  sidechain calls before we commit to an agent-heavy architecture.
- **The ~40k MCP figure needs `/context` confirmation** rather than subtraction.
- **Phase isolation should be A/B tested on real tickets** — comparable issues with and without
  checkpoint boundaries, comparing total billed input — before it becomes protocol.

Recommendation: do Priority 1 and 2 immediately (configuration and habit, requiring no
validation), and gate the Section 6 architecture behind the measurements above.
