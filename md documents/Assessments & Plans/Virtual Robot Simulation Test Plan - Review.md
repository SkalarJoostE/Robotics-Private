# Review — Virtual Robot Simulation Test Plan

**Reviews:** `Virtual Robot Simulation Test Plan.md` (status PROPOSED, 2026-08-03)
**Review date:** 2026-08-03
**Reviewer note:** all findings below were checked against the BOD template pack, `robotics-core`, and `robotics-plugin` on disk. File:line references are to `Template BOD\99xxxxxx 2xxxxx\SkalarPackSolution\SkalarPackSolution\` unless stated otherwise.

---

## Verdict

**Adopt this plan as the plan of record.** The direction is right and the document is more complete than its alternative — non-goals, verification of the simulator itself, production isolation, and named ownership are all present and all necessary.

The findings below concern **scope realism**, not direction. Two of them (§1 and §2) describe commitments that are likely unachievable as written and should be re-scoped before Phase 0 concludes.

### What the plan gets right

- Keeping the real host, real dataset, real workflow and real `Skalar.Pack1.dll` as the system under test, and explicitly refusing to build a second workflow engine or a general physics simulator.
- The two-observation-level rule (semantic events *and* virtual hardware responses). A low-level-only emulator really would have to infer meaning from motor numbers.
- Treating an unsupported command or device as an explicit failure rather than silent success (line 544). This is the single most important anti-false-confidence rule in the document.
- The evidence claim at lines 56–58 is **correct**: a waited motor movement does set current position directly to the target. Verified at `SSPL_Functions.cs:432` — the assignment sits outside the `if (!Emulation)` guard.

One refinement to that evidence, because it affects Phase 1 (see §3). Emulated motor state is not uniformly optimistic, it is **internally inconsistent**:

| Path | Effect on `mtr.Position` |
|---|---|
| Waited move (`Waitflag == 1`) | snapped straight to target (`SSPL_Functions.cs:432`) |
| Unwaited move | left untouched |
| Any explicit `GetPosition()` | **overwritten with 0** (`SSPL_Functions.cs:539`), including per-motor calls in `InitRobot` and `HomeAndGetPositions` |

---

## Findings

Ordered by the cost they represent.

### 1. Swept-path invariants require geometry that does not exist — MATERIAL

Line 247 commits to *"The complete swept path remains outside rack, vessel, frame, and manipulator exclusion volumes"*, extended to concurrent motion at line 249.

The entire collision model in the software is the `CollisionSettings` table, whose meaningful columns are `Manipulator1`, `Manipulator2`, `SafeDistance` — one scalar per manipulator pair. The runtime check (`Structure/2 - Movements/Tables and Functions/Motor.cs:525`) is endpoint-only: it compares target positions and lock values against that scalar and never evaluates a path.

Nowhere in the tables is there rack volume, vessel volume, frame geometry, or manipulator physical dimensions. Swept-volume checking therefore requires 3D geometry authored **per template and in many cases per order** — special-rack orders such as `99397162 SP2000-5 Dual YSI - Special racks` will not share a model — sourced from mechanical drawings and maintained as hardware changes. Phase 4's "add template-specific invariant geometry" (line 477) is one bullet carrying most of that cost.

**Recommendation.** Split the invariant catalogue into two tiers, priced separately:

- **Tier A — configuration/model derived.** Finite coordinate resolution, XY-at-low-Z once modeled position exists, pairwise `SafeDistance` at endpoints, lock ownership and wait-for graph, device/vessel state consistency, and clean termination. Achievable without separately authored mechanical limits or 3D geometry.
- **Tier B — machine-profile dependent.** Mechanical motor-limit envelopes and swept volumes/exclusion zones. Mechanical limits may be authored early with provenance; defer full 3D geometry until a recurring defect class justifies it and treat that authoring as its own project with its own owner and acceptance.

This is the largest single risk reduction available to the plan.

### 2. The Phase 2 determinism exit criterion is likely unachievable — MATERIAL

Line 434 requires *"byte-equivalent normalized semantic traces"* on repeated runs.

Parallel branches execute on real OS threads: `BackgroundWorker` in `Structure/0 - SplitMergeSub/Tables and Functions/ParallelSubSequenceExecutor.cs` and `Structure/1 - General/Tables and Functions/PlanAndExecute.cs`, with 34 `Thread.Sleep`/worker sites across the pack, including `Monitor.Wait(collisionLock, 5000)` inside the collision retry loop (`Motor.cs:452`, `Motor.cs:476`).

The risk table (line 566) answers this with "deterministic scheduler/clock", but a deterministic scheduler over `BackgroundWorker` means replacing the parallel execution engine — a re-architecture of the system under test, which contradicts the plan's own governing rule (line 23).

**Recommendation.** Restate the criterion as **semantic equivalence under a defined partial order**: per-`ProcessID` event sequences must be identical; cross-branch interleaving is unconstrained and normalised out of comparison. Scope strict end-to-end determinism to single-branch scenarios in Phase 2, and make multi-branch determinism a separate, explicitly-scoped decision later.

### 3. Phase 1 and Phase 2 overlap more than the plan admits — SIGNIFICANT

Phase 1 promises invariants including "unsafe XY-at-low-Z" and "motor range" (line 403) built from *"existing logs plus minimal hooks"* (line 400) around **current emulation**, and demonstrates them by forcing an XY move below travel height (line 412).

Given the state inconsistency table above, emulated position cannot support that. Evaluating "was Z below travel height throughout this XY move" requires an independent shadow model of intended position — which is a substantial fraction of Phase 2's virtual motor backend. Phase 1 is therefore not the low-cost proof-of-value it is presented as, and 2–3 weeks looks light.

**Recommendation.** Pick one:

- (a) Move the shadow state model explicitly into Phase 1 deliverables and re-estimate; or
- (b) Restrict Phase 1 invariants to those needing no position state — unresolved coordinates, target outside motor bounds, lock leak, incompatible lock use — and move the XY-at-low-Z seeded defect to Phase 2.

Option (b) preserves the cheap-and-fast character of Phase 1 and is preferred.

### 4. A fourth injection option is missing, and it is the only zero-touch one — SIGNIFICANT

Phase 0 compares three injection approaches (lines 155–159); all require pack hooks or in-process changes. Absent: **an external simulator behind a virtual COM port pair** (com0com or equivalent), with the software running in **Normal mode** against a genuine serial port.

Why it belongs in the comparison:

- **No changes to core, plugin, or any pack.** It therefore runs against already-delivered orders unmodified — the only listed option that can reproduce a field issue without first backporting hooks into a customer's order.
- **Nothing short-circuits.** Polling, retry, timeout, collision and locking code all execute exactly as against hardware, giving the highest fidelity of any option.
- **Costs:** real-time execution speed, a driver on the test machine, and it supplies the transport layer only — no semantic events. It therefore pairs with hook-based observation rather than replacing it.

Since the plan already expects a hybrid outcome (line 161), this is a natural fourth candidate for the same Phase 0 evaluation.

### 5. Static package validation has no phase, no backlog ID, and no owner — SIGNIFICANT

It appears as level 1 of the test pyramid (line 332) — buildability, table consistency, resolvable actions, valid Sequence/SubSequence targets, required coordinates — and then never again. No phase deliverable, no row in the `SIM-001`…`SIM-034` backlog, no exit criterion.

It is the cheapest and fastest-paying item in the document: no hooks, no simulator, no mode change, no host automation. It runs against the `Sequences\*.csv` already generated per order and per template by `fetch-project.ps1` / `Process-SoftwareFolder.ps1`.

**Recommendation.** Add as `SIM-005`, Phase 0, deliverable before the architecture spike concludes. Suggested checks: dangling `Sub method number`; subsequences unreachable from any `MethodType`; `Settings.MethodToRun` with no matching `SequenceMethod`; `MethodType` referenced but `Enabled=false`; `Location`/`Manipulator`/`TargetHeight` combinations with no matching `Position` or `HeightDefinition` row; action numbers with no Action class; `Sequence number = -1` reported as intentionally disabled rather than as an error.

### 6. Two concrete facts to fold in — MINOR

**Injection option 2 has a named blocker.** `DiscardInBuffer()` hard-casts the device to the pack's private `RS232DeviceEx` with no guard (`SSPL/SSPL_Serial.cs:89`), so any device injected through `DevicePool` throws `InvalidCastException` via `Reset()`. The fix is a few lines, but it is a **pack change** requiring XML sync and per-order backport — precisely the cost the plan is trying to avoid. Name it in Phase 0 so the comparison is honest.

**The mode-representation caution (lines 139–141) is well founded, and can be made specific.** `OperationModes` is `{ Normal, Debug, Trace, Emulate }` in `robotics-plugin\Enums\Enums.cs:32`, shared with historical binaries. Appending `Simulation` is ordinal-safe because existing members keep their positions; additionally `Debug` and `Trace` appear unused and may already provide a usable slot.

### 7. Estimates — MINOR

Phases 0–3 total 10–16 weeks for BOD alone with one engineer. Once §1–§3 are addressed, **Phase 2 (4–6 weeks) is the estimate most likely to move**: virtual motors, IO, sensors, virtual clock, wait-for graph, fault injection and mode isolation is a great deal for six weeks. The plan's instruction to re-estimate after Phase 0 is the right guard; Phase 2 simply deserves to be flagged as the pressure point.

---

## Recommended edits

Keep the structure, phasing, governance and backlog. Five changes:

| # | Edit | Section | Status in the 2026-08-03 consolidation |
|---|---|---|---|
| 1 | Split the invariant catalogue into configuration/model-derived and machine-profile-dependent tiers; defer authored 3D geometry | §6 Invariant engine, Phase 4 | **Done with refinements** — adds a separate Static/Trace/Stateful capability, `NotEvaluated`, corrected dependencies, a Phase 0 limits profile, and explicit 3D deferral |
| 2 | Restate the determinism criterion as semantic equivalence under a defined partial order | Phase 2 exit criteria | **Done with refinements** — compares branch instances rather than `ProcessID` alone and preserves automatic causal edges in addition to scenario-declared ordering |
| 3 | Move position-dependent invariants out of Phase 1 and retain the 2–3 week estimate only with that rescope | Phase 1 | **Done with refinements** — moves the low-Z demonstration to Phase 2 and uses a wrong-owner unlock as the Phase 1 runtime defect |
| 4 | Add the virtual-COM-port option as a fourth Phase 0 injection candidate | "Where the implementation should live" | **Done, and improved** — demoted to transport-contract adapter with a measured go/no-go (§4, SIM-006/007) |
| 5 | Add static package validation as `SIM-005` in Phase 0 | Backlog, Phase 0 | **Done, and improved** — adds inherited `SequenceInfo` resolution and runtime-source checking |

The appendix below preserves the original replacement proposals. They were applied to the plan of
record with the refinements summarized above; the authoritative wording is now in
`Virtual Robot Simulation Test Plan.md`.

---

## Relationship to `Robot Test Harness Plan.md`

The two documents agree on the diagnosis and on the overall shape of the solution. This plan is the stronger base and should be the plan of record.

`Robot Test Harness Plan.md` contributes four things worth folding in and is otherwise superseded:

1. The virtual-COM-port injection option (§4 above).
2. The enumerated SSPL **single-command** vocabulary — roughly twenty commands (`MOTOR(0..10)`, `PORTOUT`/`PORTOUTBIT`/`PORTINBIT`, `PUMP`, `MAGNET`, `STIRRER`, `GRIP`, `READLEVEL`, `PRINT`, plus the `A`/`C` handshake, `\x1B` reset and `Q`/`L`/`U`/`R` cover commands). Useful for Phase 0's inventory (`SIM-001`).

   **Correction (2026-08-03):** this list covers only the `SendDirectSSPL` channel and must **not** be read as evidence that a virtual-COM controller is bounded work. The separate `RunSSPL` channel sends complete SSPL *programs*, and `Generated/SSPLGenerated.cs` shows they are a real language: 57 `IF`/`ENDIF`, 15 `WHILE`/`ENDWHILE`, 11 `DEFBLOCK`/`ENDBLOCK`, `FOR`/`NEXT`, named variables with arithmetic (`M=M*2`, `G=M+N`), block calls (`BLOCK J`), `WAITMS`, and a controller-incremented timer variable `S` used for timeouts (`V=S+2 ^. setting the timout to 2 seconds`). A virtual COM device must therefore be an **SSPL interpreter**, not a command responder. The consolidated plan's framing (lines 62–65) is correct and supersedes this item.
3. The static-validation check list (§5 above).
4. The observation that collision detection and lock logic **already execute** under emulation, with two of three `CollisionCheck` inputs live (`Motor.cs:559`) — relevant to how much Phase 1 can achieve without a backend.

Recommended disposition: fold those four into this plan, then retire `Robot Test Harness Plan.md` or demote it to an evidence appendix. Maintaining two overlapping plans of record is worse than either.

`SIM-005` does **not** depend on that document. It is fully specified natively in the consolidated plan — §0 component spec, test-pyramid level 1, Phase 0 deliverable and exit criterion, backlog row, `SIM-015` hardening in Phase 1, and the definition of done. Retiring `Robot Test Harness Plan.md` costs it nothing.

---

# Appendix — original replacement proposals (applied with refinements)

Anchors are quoted from the 2026-08-03 consolidation. Line numbers are hints only; match on the quoted text.

> **Disposition:** Applied to the plan of record on 2026-08-03 with refinements. This appendix is
> retained as review history and is no longer authoritative replacement text.

## Edit 2 — determinism contract

### 2a. Add to §2 "Structured event stream", after the paragraph ending *"…unless timing/ordering is itself under test."*

> ### Trace comparison and determinism contract
>
> Parallel branches execute on real OS threads — `ParallelSubSequenceExecutor` and `PlanAndExecute`
> both use `BackgroundWorker` — so cross-branch interleaving is not reproducible without replacing
> the production execution engine, which the governing rule of this plan forbids. Determinism is
> therefore defined as **semantic equivalence under a partial order**, not byte equality.
>
> - **Within a branch:** the ordered sequence of semantic events carrying the same `ProcessID` must
>   be identical between runs — same events, same order, same payload after normalization.
> - **Across branches:** interleaving is unconstrained. Comparison groups events by `ProcessID` and
>   compares each group independently.
> - **Declared ordering:** a scenario may declare required happens-before pairs (for example
>   "decap completes before the needle enters the vessel"). These are asserted as invariants; they
>   are never inferred from position in the trace.
> - **Normalized out:** wall-clock timestamps, thread IDs, virtual-time values that do not affect
>   ordering, and cross-branch event position.
> - **Never normalized:** event identity, payload, per-branch order, error and exception content,
>   and every declared happens-before pair.
>
> Strict byte equality of the normalized trace is required only for **single-branch scenarios**,
> where it is achievable and remains a useful regression signal.

### 2b. Replace the Phase 2 exit criterion (line 518)

Current:

> - Repeating a scenario produces byte-equivalent normalized semantic traces.

Replacement:

> - Repeating a scenario produces traces equivalent under the determinism contract in §2:
>   per-`ProcessID` event sequences are identical after normalization, and every scenario-declared
>   happens-before pair holds.
> - Single-branch scenarios additionally produce byte-equivalent normalized traces.

### 2c. Replace the risk row (line 656)

Current:

> | Parallel scheduling is nondeterministic | Flaky traces | Deterministic scheduler/clock and semantic ordering rules |

Replacement:

> | Parallel scheduling is nondeterministic | Flaky traces, and an exit gate that cannot be met without re-architecting the system under test | Determinism defined as semantic equivalence under a partial order (§2); byte equality required only for single-branch scenarios; cross-branch ordering asserted only where a scenario declares it |

---

## Edit 1 — invariant tiering and the machine profile

### 1a. Add at the top of §6 "Safety and consistency invariant engine", before *"The first invariant catalogue should include:"*

> Every invariant carries a **tier** that determines when it may be enabled:
>
> - **Tier A — table-derivable.** Evaluable from the package's own configuration tables plus the
>   event trace. Requires no external geometry. Tier A is the Phase 1–2 target and covers the
>   majority of the defect classes in the problem statement.
> - **Tier B — machine-profile dependent.** Requires the versioned machine profile (§3) for
>   mechanical limits, and separately authored 3D geometry for exclusion volumes.
>
> A Tier B rule must not be enabled until its input data exists and has been reviewed. Until then it
> reports **`NotEvaluated`**, never `Pass`. Reporting `Pass` for a rule whose input is absent is the
> most dangerous failure mode available to this system, and every report must show the count of
> `NotEvaluated` rules alongside pass/fail.

### 1b. Annotate the "Geometry and movement" list

> - Every logical target resolves to finite X/Y/Z coordinates. **(Tier A)**
> - Every target lies within the configured motor bounds or an explicitly approved envelope. **(Tier B — machine profile)**
> - XY movement starts only when every affected Z manipulator is at or above travel height, unless the action explicitly declares and satisfies a reviewed exception. **(Tier A)**
> - The complete swept path remains outside rack, vessel, frame, and manipulator exclusion volumes. **(Tier B — authored geometry; deferred until a concrete recurring defect class justifies the cost)**
> - Manipulator-to-manipulator separation stays above the configured safe distance. **(Tier A at move endpoints, using `CollisionSettings.SafeDistance`; Tier B for "throughout the path, including concurrent motion")**
> - A move to a sample, source, rinse, waste, maintenance, or instrument position uses the expected rack/position and target-height category. **(Tier A)**
> - Motor current and target state remain internally consistent after completion, stop, and failure. **(Tier A)**

All rules under "Resource ownership and concurrency" and "Process and hardware state" are Tier A, except any future rule requiring physical clearance.

### 1c. Add backlog rows

> | SIM-008 | Author and review the BOD machine profile: per-motor mechanical limits, collision geometry inputs, and provenance for every value | 0 | SIM-004 |
> | SIM-009 | Tier the invariant catalogue and implement `NotEvaluated` reporting for ungated Tier B rules | 1 | SIM-008 |

And update the dependency of the existing row:

> | SIM-013 | Implement first invariant rules | 1 | SIM-010–012, SIM-008 |

### 1d. Add a Phase 0 deliverable

> - Author a first BOD machine profile covering per-motor mechanical minimum/maximum limits and the
>   collision inputs the invariant engine needs. Record the provenance of every value — firmware
>   constraint, mechanical drawing, validated positioning data, measured reference robot, or
>   reviewed engineering assumption — and mark which values are assumptions rather than
>   measurements.

### 1e. Add a Phase 0 exit criterion

> - A versioned BOD machine profile exists, every value names its provenance, and a domain engineer
>   has reviewed it. Invariants depending on the profile are identified and tiered; those without
>   input data report `NotEvaluated` rather than `Pass`.

### 1f. Replace the Phase 4 per-template bullet (line 562)

Current:

> - Add template-specific invariant geometry and scenario profiles.

Replacement:

> - Author and review the template's machine profile (§3) before enabling any Tier B invariant for
>   that template; add scenario profiles. Every report must list which Tier B rules remain
>   `NotEvaluated` for this template and why.

---

## Edit 3 — Phase 1 rescope

### 3a. Replace the Phase 1 first-invariants deliverable (line 485)

Current:

> - First invariants: unresolved coordinate, motor range, unsafe XY-at-low-Z, incompatible lock use,
>   lock leak, and incomplete final state.

Replacement:

> - First invariants — Tier A only, and deliberately none that require modelled position state,
>   which emulation cannot supply: unresolved or incomplete coordinate, unresolvable logical target,
>   incompatible lock use, lock leak, lock released by a non-owning `ProcessID`, and incomplete
>   final state.
> - Position-dependent rules (motor range, unsafe XY-at-low-Z, travel-height compliance) are
>   deferred to Phase 2, where the virtual motor backend supplies modelled position. Under current
>   emulation `mtr.Position` is snapped to target on a waited move, left stale on an unwaited move,
>   and overwritten with 0 by any `GetPosition()` call, so these rules cannot be evaluated
>   meaningfully in Phase 1.

### 3b. Replace the second Phase 1 seeded-defect demonstration (line 492)

Current:

> - Force an XY move below travel height and fail the run.

Replacement:

> - Point a move at a logical location with no matching `Position` row, and show the auditor
>   reporting the unresolved target with its action, `ProcessID`, and originating Sequence/SubSequence row.

### 3c. Add to Phase 2 deliverables

> - Position-dependent invariants enabled against modelled position: unsafe XY-at-low-Z,
>   travel-height compliance, and motor range (Tier B, gated on `SIM-008`).

### 3d. Add to the Phase 2 seeded-defect set

> - Force an XY move below travel height and fail the run.

### 3e. Note on the Phase 1 estimate

Phase 1 keeps 2–3 weeks **only with this rescope**. Removing the position-dependent invariants
removes the hidden shadow-state-model work that would otherwise have been required; that capacity is
consumed by `SIM-015` (validator hardening) and `SIM-009` (tiering). Without the rescope, Phase 1
carries an unacknowledged fraction of Phase 2 and 2–3 weeks is not credible.
