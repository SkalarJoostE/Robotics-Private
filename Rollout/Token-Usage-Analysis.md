# Where the tokens go — and which levers actually move the bill

> **Purpose:** one home for the "why does a single analysis chat cost €5 and eat a third of the
> 5-hour window?" question. It consolidates three measurements that previously lived in three
> unrelated files, plus a session-level breakdown that was never written down at all.
>
> **This is an operating-cost document, not a pitch document.** The seat-vs-API *decision* lives in
> [Access-and-Feedback-Loop.md](Access-and-Feedback-Loop.md) §2 and [PROJECT.md](PROJECT.md) §8
> (2026-08-07). What this file adds is that the figures quoted there are **un-optimised** — see §4.

---

## 1. Three different measurements, three different answers

The confusion this document exists to end: **token volume, money, and plan-window consumption are
three different functions of the same work**, and the biggest line item is different in each.

### 1.1 Token volume — it is all context re-reading

Recomputed 2026-08-11 from `lab-chat-poc/cost_log.csv` (28 turns across 14 chats, `claude-opus-5`):

| Token type | Tokens | Share of volume |
|---|---:|---:|
| cache **read** | 52,806,867 | **94.7%** |
| cache **write** (all 1-hour) | 2,485,551 | 4.5% |
| output | 465,829 | 0.8% |
| fresh input | 1,108 | 0.0% |

Fresh input is a rounding error. Essentially every token billed is context being re-read or
re-cached.

### 1.2 Money — it splits three ways, not one

Same rows, priced at published Opus 5 rates ($5/$25 per MTok; 1-hour cache write 2×, cache read 0.1×):

| | Cost | Share |
|---|---:|---:|
| cache read | $26.40 | 42.0% |
| cache write (1-hour) | $24.86 | 39.5% |
| output | $11.65 | 18.5% |
| input | $0.01 | 0.0% |
| **Total** | **$62.91** | |

The 95%-of-volume tier is only 42% of the bill, because cache read is the cheapest tier at 0.1×.
Cache **writes** are 4.5% of volume and nearly as expensive, because Claude Code writes **1-hour**
cache entries — billed at **2×** the input rate against 1.25× for 5-minute ones.

### 1.3 Plan window — driven by neither of the above

Measured 5-hour-window consumption per logged chat:

| Chat | Channel | 5h pp | 7d pp | API-equiv € |
|---|---|---:|---:|---:|
| `747fb02b` | helpdesk | **49** | 4 | 14.68 |
| `d49ab0ff` | lab | 43 | 2 | 11.66 |
| `ffb4dbfe` | lab | 40 | 3 | 6.59 |
| `93f96083` | helpdesk | 38 | 2 | 4.66 |
| `4537661f` | helpdesk | 32 | 3 | 7.31 |
| `0f78178f` | lab | 31 | 2 | 3.15 |
| `a3f5e59a` | lab | 24 | 2 | 2.99 |
| `c709c3cf` | lab | 14 | 1 | 1.81 |

(Chats showing 0 pp have at least one turn where the usage endpoint was unavailable — a blank is not
a zero. See the caveat in `lab-chat-poc/README.md`.)

**A problem-analysis chat consuming ~30% of the 5-hour window is the median, not an outlier.** The
range on measured chats is 14–49 pp.

The fit in `lab-chat-poc/plan_calibration.py` explains why, and it is the key insight of this
document:

```
est_pp = output_tokens × w_output  +  cache_write_tokens × w_cache_write
```

`cache_read` and `input` are pinned at **zero** — fitted freely, `cache_read`'s weight goes negative,
which is physically impossible and means "indistinguishable from zero". **Plan windows track
generation and cache writes, not re-reading cached context.** So what burns the 5-hour window is how
much the assistant *writes*: output tokens, and new context entering the cache. Every large file
opened becomes a 1-hour cache write at 2× the input rate — and counts fully against the window,
where the subsequent re-reads of it cost money but nothing against the limit.

---

## 2. Session shape — the floor and the spike

The per-turn log above says *what* was billed. This says *why*, and comes from an interactive
Claude Code session instrumented after the same question was asked there (work PC; exact date not
recorded, before 2026-08-11). Total session cost $14.24.

There is only one identity that matters:

```
cache_read  ≈  Σ (context size × number of calls)
```

There is no cache setting to tune. The only two levers are **how big the context is** and **how many
calls run against it**.

| | Value |
|---|---:|
| Tool calls in the session | 137 |
| **Context floor** (before any work) | **71,151 tokens** |
| Mean context per call | 148,209 tokens |
| Peak context | 532,366 tokens |

**The floor is what every single call pays.** 71k × 137 = 9.7M cache-read tokens ≈ **$4.87 — 54% of
all cache reads in that session, before a single file was opened.** The workspace's own instruction
files are only ~33 KB (~9k tokens) of that. The rest is harness: tool schemas, the ~250-entry
deferred tool list, MCP server instructions, and the skills listing.

**The single biggest line item was one skill load.** Answering "what does Opus 5 cost per token"
pulled in the `claude-api` skill: **335,893 tokens in one shot**.

| | |
|---|---:|
| cache write: 336k × $10/MTok | $3.36 |
| read on the 4 calls after it: ~2.1M × $0.50/MTok | $1.06 |
| **Total for one lookup** | **≈ $4.42 — 31% of the session** |

That is the whole failure mode in one number: a one-table question paid for an entire SDK reference,
once to cache it and again on every subsequent call.

---

## 3. Ranked levers

| Lever | Mechanism | Est. saving in that session |
|---|---|---|
| **`/clear` between distinct tasks** | That session did four unrelated jobs in one context. Job 3 paid cache-read on job 1's 63 KB SVN output, every log dump and every file read. A fresh session resets to the 71k floor. | **$3–5** |
| **Don't load a large skill for a small lookup** | The pricing answer needed one table, not every SDK's documentation. | **$4.4** |
| **Delegate bulk reading to a subagent** | `Positioning.cs`, `Utilities.cs`, Loupe dumps, the 63 KB SVN output — a subagent returns the conclusion and its reading never enters the main transcript, so it is never re-read. Now measured — see §3.2 for when this pays and when it does not. | $1–2 |
| **Triage headers on the case base** | The case base was **18.1% of everything read** across 8 lab chats, almost entirely whole-file reads to find out whether a write-up was relevant. Every detail file now opens with a 4-line block, so a grep hit resolves at `Read(file, limit=12)`. | 5.4:1 on retrieval — see §3.1 |
| **Batch independent tool calls** | Each round trip re-reads the whole context. Several Python/grep calls that had no dependency on each other ran one at a time. | ~$0.06 per call avoided |
| **Trim the always-on floor** | Only two MCP servers are project-level (`loupe`, `atlassian`). Chrome, computer-use, obsidian, shadcn, gdrive, gcal, windows-mcp and scheduled-tasks come from **global** config and load in every session of every project. Disabling unused ones shrinks the floor for every call, forever. | 71k → ~40k floor ≈ **$2** |
| **Sonnet 5 for routine work** | $3/$15 vs $5/$25 per MTok. | ~40% on non-hard turns |

**Realistically: the same work, in three scoped sessions, with a trimmed tool surface and no
`claude-api` load, lands around $4–5 instead of $14.**

### 3.1 The case base — the one lever that has been applied end-to-end

Measured across 8 real lab chats: **the case base was 18.1% of everything read — 51,118 tokens over
52 calls.** Almost none of that was answering a question; it was opening 4–25 KB write-ups to find
out whether they were relevant at all. Diagnosis instructions say to search the case base *first*, so
this cost is paid on essentially every fault chat.

Fixed 2026-08-12 (commits `d879adb`, `dfb77d5`): every file in a `* Details\` folder now opens with a
fixed 4-line block — `Symptom / Cause / Fix / Scope` for faults, `Goal / Approach / Outcome / Scope`
for feature, port, setup and approval work — placed after the H1 so `Read(file, limit=12)` catches it
plus the Date/Order/Template line.

| | Bytes |
|---|---:|
| Corpus before | 500,191 |
| Headers added (53 files) | 90,428 (+18%) |
| Corpus after | 590,619 |
| **Resolves from triage reads of** | **107,437** |
| **Ratio** | **5.4 : 1** |

Per folder the ratio runs 3.5:1 (`AI Template Issue Details` — short files, genuinely three-layer
causes) to 6.6:1 (`AI Feature Implementation Details` — 7–34 KB documents). A worked lookup: grep
`-9999` hits 5 files totalling 70 KB; five triage reads cost 8.6 KB and eliminate four of them on the
word "absorbance".

Two things this measurement does **not** capture, both of which matter more than the ratio:

- **The headers are only live because two instruction edits tell readers to use them** — the
  `Read(..., limit=12)`-first rule in `copilot-instructions.md`, and the born-with-a-header rule in
  `skalar-session-wrapup`. Without those the 90 KB is inert and the corpus is simply 18% bigger. An
  artefact nothing reads is a cost, not a saving.
- **A wrong header is worse than none**, because a future lookup trusts it and skips the right file.
  That is why the headers preserve self-corrections, hedges and honest status ("plan only", "not
  committed") even at the price of length. Accuracy over brevity was a deliberate call, and it is
  what the +18% bought.

### 3.2 Delegation — measured, and narrower than it looks

The header job was also the test of the "delegate bulk reading" lever, because its inline cost was
knowable: ~500 KB ≈ ~125k tokens of reading before writing a single line.

| | |
|---|---:|
| Subagents (Sonnet, one per folder) | 7 |
| Subagent tokens | **848,232** |
| Tool calls / wall clock | 114 / ~17.7 min |
| Returned to main context | 7 reports + 6 diff reviews, ~35–40k |

**Roughly 4:1 on main context, at ~6× the total token spend.** Judged on efficiency it is a loss;
judged on context headroom — the thing §2 shows actually drives cost, since every token in the main
transcript is re-read by every later call — it wins.

The rule that decides it:

> **Delegate when the input is much larger than the output you have to verify.**

Here that ratio was ~5:1 (500 KB read → 90 KB of headers, all of which was reviewed). When it
approaches 1:1 you pay the agent's tokens *and* still read everything — pure loss. That is why
diagnosing a fault does not delegate well despite looking like it should: the input is a log and some
tables, the output is a judgement, and trusting the judgement means re-reading the evidence yourself.

Two limits worth recording:

- **Model choice is not uniform.** Compression needs a model that can understand a technical
  write-up — a plausible-but-wrong `Cause:` is the failure mode that makes the case base worse.
  Retrieval is safe cheap, because its output is file paths you can open and check. Sonnet for the
  first, Haiku for the second (`.claude/agents/case-base-search.md`).
- **Agents cannot see across their own batch.** That all five template issues lacked an RMT ticket,
  and that the two `99325813` diluter write-ups contradict each other, came from reading the seven
  reports side by side — not from any agent. Cross-cutting findings stay with the orchestrator.

### What is *not* worth optimising

**Output tokens.** They were $1.91 of $14.24 in the session, and 18.5% of the logged-chat total.
Asking for terser replies barely moves the bill — **context volume is the whole game**. (Note the
asymmetry with §1.3: output is a *minor* cost lever but a *major* plan-window lever. If the binding
constraint is the 5-hour window rather than money, terseness does help.)

---

## 4. What this means for the seat-vs-API case

[Access-and-Feedback-Loop.md](Access-and-Feedback-Loop.md) §2 quotes **€3.91 per conversation** and
**~7 conversations per seat per working day**, from this same log. Both figures are honest
measurements of *how the tool was actually used* — and every one of those conversations was run
before any of §3 was known.

Two consequences, neither of which invalidates the decision:

1. **The cost figures are an upper bound on the same work, not a floor.** If the §3 levers hold at
   the ~3× the session analysis suggests, the API-equivalent cost of a conversation has real room to
   fall. Do not re-quote a lower number until it has been *measured* — but do not present €3.91 as
   an irreducible unit cost either.
2. **The seat-count argument is unaffected, and possibly strengthened.** Seats are driven by the
   5-hour window and by the one-person-per-subscription licensing rule, not by cost. Since the
   window tracks output and cache writes — the tokens the levers move *least* — trimming context
   saves money faster than it buys window headroom.

---

## 5. Where the operating rules already live

This document is the *analysis*. The rules derived from it are already enforced where the work
happens, and belong there — do not duplicate them here.

| Rule | Home |
|---|---|
| Log retrieval: census before records, never page with `offset` | [`.claude/skills/skalar-log-analysis/SKILL.md`](../.claude/skills/skalar-log-analysis/SKILL.md) — Rules 1 and 2. Measured: finding one fault by paging cost **~68,000 tokens**; `groupBy=caption` showed it in **~500**. |
| Read `Sequences\` CSVs, never grep the multi-MB XML | [`.github/copilot-instructions.md`](../.github/copilot-instructions.md) — Workspace Tooling. Recorded as F7 in [`AI_WORKSPACE_PLAN.md`](../AI_WORKSPACE_PLAN.md), "the single easiest token saver". |
| Read `Sequences\<order> Profile.md` before opening any config table | Same table. Replaces 24.7 MB of XML at ~1300:1. |
| Resolve a case-base grep hit with `Read(file, limit=12)` before opening the file | [`.github/copilot-instructions.md`](../.github/copilot-instructions.md) — Past-Issue Case Base. Measured 5.4:1 (§3.1). |
| Every new `* Details\` write-up is born with a 4-line triage header | [`.claude/skills/skalar-session-wrapup/SKILL.md`](../.claude/skills/skalar-session-wrapup/SKILL.md) — Details folders. Without this the convention decays and the headers stop being trustworthy. |
| Cheap case-base retrieval: greps, reads only headers, returns file paths | [`.claude/agents/case-base-search.md`](../.claude/agents/case-base-search.md) — Haiku; output is verifiable by opening what it names (§3.2). |
| Keep the always-on core small; heavy reference goes in on-demand skills | `AI_WORKSPACE_PLAN.md` F1 and the Phase 1 entry — core cut ~40 KB → ~19 KB by carving out `skalar-code-reference`. |
| Cache-write/limit mechanics, and the CLI's Opus 5 mispricing | [`lab-chat-poc/README.md`](../lab-chat-poc/README.md) — "Cost tracking" and "Why the measured pp figure is an upper bound". |

---

## 6. How to re-measure

```bash
python cost_report.py --totals
```

```bash
python plan_calibration.py
```

```bash
python pricing.py --audit
```

All three run from `lab-chat-poc/`. Caveats that apply to every number in this file:

- **Do not use the CLI's own cost figure.** Measured 2026-08-06, it prices `claude-opus-5` at
  Sonnet 5's rate card — out by exactly 5/3. Everything here is recomputed from each turn's own
  tokens at published rates. `pricing.py --audit` re-checks it; if a future CLI release fixes its
  table the ratio moves to 1.000.
- **The plan-usage endpoint is account-wide** and reports whole percentage points. A before/after
  delta captures everything the account did during that turn's wall-clock span, so contamination can
  only ever *inflate*. The fit is a deliberately conservative lower envelope.
- **The plan fit rests on 6 fully-measured chats.** Re-fit once more have run with nothing else
  touching the account.
- **The §2 session breakdown is a single session**, not a distribution. The floor and the
  skill-load spike are structural and will reproduce; the dollar totals will not.
