# Robot Test Harness Plan — Review Comments and Direction

**Review date:** 2026-08-03  
**Reviewed document:** `Robot Test Harness Plan.md`  
**Compared with:** `Virtual Robot Simulation Test Plan.md`

## Recommendation

Use **Virtual Robot Simulation Test Plan** as the authoritative implementation roadmap, and incorporate the strongest parts of **Robot Test Harness Plan** into it.

Do not implement Robot Test Harness Plan unchanged. Its incremental delivery model is good, but it treats a virtual COM port as if it can become both the hardware simulator and the main test oracle. That boundary sees low-level SSPL traffic, but not enough application context to prove that an action used the correct sample, inherited the correct sequence data, owned the right resources, or followed the intended workflow.

The recommended architecture is therefore a hybrid:

1. Keep the real application, workflows, actions, XML tables, and positioning calculations as the system under test.
2. Capture semantic events where their meaning exists: action execution, requested moves, IO operations, device calls, resource locks, and workflow state changes.
3. Execute those operations against a stateful virtual-hardware backend.
4. Use a virtual COM implementation only where it provides useful compatibility coverage, especially for proving unchanged deployed binaries or testing the real SSPL serialization path.
5. Run deterministic scenarios and assert both semantic behavior and final virtual-machine state.

In short: **use the Virtual Robot Simulation plan as the master plan; merge in the harness plan's linter and virtual-COM feasibility work.**

## Comparison

| Criterion | Robot Test Harness Plan | Virtual Robot Simulation Plan | Decision |
|---|---|---|---|
| Incremental adoption | Strong layered approach | Strong phased approach | Keep both; use one merged sequence |
| Static validation | Explicit Layer 0 linter | Trace-auditor-first approach | Add the linter to the master roadmap |
| Tests unchanged application binaries | Strong if virtual COM is viable | Possible through an interchangeable backend | Retain virtual COM as a bounded compatibility option |
| Understands action and workflow intent | Weak at the COM boundary | Semantic events are captured at application boundaries | Prefer the virtual-simulation design |
| Models physical state | Proposed, but depends on reconstructing intent from SSPL | Explicit stateful virtual machine | Prefer the virtual-simulation design |
| Tests `ProcessID` and resource ownership | Not adequately specified | Explicit lock events and wait-for analysis | Prefer the virtual-simulation design |
| Deterministic regression scenarios | Under-specified | Scenario runner, virtual time, assertions, artifacts | Prefer the virtual-simulation design |
| Long-term extensibility | Risks growing into a firmware emulator | Separates semantics, transport, physics, and visualization | Prefer the virtual-simulation design |

## What Should Be Kept from the Harness Plan

### 1. The static linter

This is useful, low-risk, and can produce value before simulation exists. It should check:

- references to actions, subsequences, motors, IO, manipulators, racks, positions, heights, settings, and devices;
- required fields after recursively resolving nested subsequences and inherited `SequenceInfo` values;
- duplicate or missing configuration rows;
- references against the runtime XML files, including extension units, rather than only a generated-code mirror;
- cross-table consistency, such as manipulator-to-motor and position-to-height relationships.

The output should distinguish definite errors from warnings. Otherwise legitimate inherited values will create false positives.

### 2. A virtual-COM feasibility spike

`DevicePool` and the serial boundary are useful seams because they could exercise the application's real SSPL transport without changing production behavior. Build this as a time-boxed proof of concept, not as a foregone architectural decision.

The spike should prove that it can:

- complete the actual `A` / chunked program / `C` exchange;
- accept representative SSPL programs from initialization and normal operation;
- return deterministic responses for position, sensors, cover lock, IO, and errors;
- preserve timing and cancellation behavior without making tests slow;
- expose all received programs and responses as test artifacts;
- coexist safely with real-hardware mode without accidental activation.

If supporting representative programs requires implementing a large part of the SSPL language, keep virtual COM for transport-contract tests and use an in-process virtual backend for the main simulator.

### 3. Layered deliverables

The plan is right to avoid starting with 3D graphics. The first useful result is automated behavioral evidence, not a visual robot model.

## Required Corrections to the Harness Plan

### The SSPL surface is larger than the plan assumes

The generated SSPL implementation includes control flow and device-specific operations, including `FOR`, `WHILE`, `INKEY`, `INPUT`, `LIFT`, `TUBEA`, `BINKEY`, `OPEN`, `WAITMS`, and diluter commands. The controller receives complete programs rather than only a small set of isolated motor commands.

Consequently, a stateful virtual COM controller needs either:

- a meaningful SSPL parser/interpreter with explicitly documented coverage, or
- a deliberately limited role as a transport-contract test double.

Calling this approximately twenty commands understates both scope and maintenance risk.

### Current emulation has some endpoint state, but no useful physical behavior

The current movement code updates `TargetPosition`, and waited moves update `Position`. Direct position reads can fall back to zero in emulation. Therefore, it is not quite accurate to say that there is no state at all.

The actual gap is that emulation does not provide continuous motion, elapsed time, sensor transitions, realistic device state, collision geometry, injected faults, or a trustworthy record of why a movement occurred.

### Coordinates cannot reliably reconstruct application intent

Inferring a rack, sample, or action by reverse-matching coordinates is ambiguous and brittle. The serial boundary cannot recover important context such as:

- action identity;
- `ProcessID` and parallel branch;
- sample or analysis row;
- inherited `SequenceInfo`;
- resource-lock owner;
- whether a move was a requested operation or a safety-generated intermediate move.

Coordinate matching can enrich a trace, but it should not be the authoritative semantic source. Emit semantic events from `ActionToExecute`, movement APIs, IO/device APIs, and the lock manager while that information still exists.

### Motor limits need an explicit source

`MotorConfiguration` contains speed, acceleration, current, direction, conversion, current position, target position, and travel height. It does not provide a complete set of mechanical minimum and maximum limits.

The simulator therefore needs a versioned machine-profile source for envelopes and geometry. That source could be derived from firmware constraints, mechanical specifications, validated positioning data, or deliberately maintained simulator configuration, but it must not be assumed to exist in `MotorConfiguration`.

### Lock and deadlock testing needs semantic instrumentation

The application tracks resource ownership by `ProcessID` and waits on centralized locks. A COM simulator sees eventual hardware commands, not threads waiting before a command is sent.

To test contention and deadlocks, instrument `CheckObjectFree`, `LockObject`, and `UnlockObject`, record wait relationships, and maintain a wait-for graph. Without this, the harness can identify timeouts but cannot reliably explain or prove application-level deadlocks.

### Regression automation needs a scenario runner

Launching the application and feeding serial replies is not sufficient for repeatable end-to-end testing. A scenario runner must also:

- create or clone an isolated analysis;
- populate application-specific settings and sample rows;
- select the method and workflow;
- start, pause, resume, stop, and finalize runs;
- detect completion without arbitrary sleeps;
- control virtual time and seeded randomness;
- collect logs, semantic traces, SSPL traffic, state snapshots, and failures;
- cleanly restore all test data;
- pin simulator, plugin, application, XML, and expectation versions.

Historical-order testing should not silently replace its plugins with newer emulation plugins, because that changes the system under test.

### Coverage claims should be measured, not predicted

Claims such as catching 85–90% of factory acceptance issues should be removed until there is data. Track simulator results against defects later found during FAT and classify misses by cause. That gives a defensible coverage metric and shows where to invest next.

## Recommended Merged Delivery Sequence

### Phase 0 — Define the contract and safety boundary

- Add an explicit Simulation mode, visibly distinct from Emulation and real hardware.
- Make real hardware the fail-safe default.
- Define the semantic event schema, virtual-machine state, scenario format, and evidence artifacts.
- Select a representative BOD configuration and a small set of known workflows and defects.

### Phase 1 — Static validation and observability

- Implement the context-aware XML/action/configuration linter.
- Add structured events at action, workflow, movement, IO/device, and lock boundaries.
- Build a trace auditor that can flag unsafe ordering and unexpected operations before full hardware simulation exists.

### Phase 2 — Time-boxed virtual-COM spike

- Capture representative SSPL programs from the pilot configuration.
- Measure grammar and command coverage rather than estimating it.
- Implement enough virtual COM behavior to run one initialization and one short workflow.
- Decide whether virtual COM remains the main transport backend or a narrower contract-testing adapter.

### Phase 3 — Stateful virtual hardware

- Model motors, manipulators, sensors, IO, cover lock, pumps, diluters, grippers, meters, and other required devices incrementally.
- Add deterministic virtual time, movement envelopes, collision zones, occupancy, liquid/cap states, and fault injection.
- Keep device models behind stable interfaces so in-process and COM transports can share state and expectations where practical.

### Phase 4 — Scenario runner and CI

- Automate test-data setup and the complete application lifecycle.
- Support assertions over semantic events, SSPL traffic, final state, timing, safety invariants, and lock ownership.
- Produce one evidence bundle per run, with a concise failure explanation.
- Establish a small blocking smoke suite and a broader scheduled regression suite.

### Phase 5 — Scale and visualize

- Add reusable profiles for robot templates and customer variants.
- Grow coverage from actual defects and FAT findings.
- Add 2D/3D visualization only when it materially helps engineers inspect trajectories, clearances, or failures.

## Decision Gates

Proceed from the proof of concept only if the pilot can demonstrate all of the following:

- one real application workflow runs without physical hardware;
- semantic trace assertions identify the action, sample, `ProcessID`, requested target, and lock owner;
- virtual state verifies final positions and relevant device/sample state;
- at least one unsafe move, one missing/unexpected operation, one injected hardware failure, and one lock problem are detected deliberately;
- the same scenario is deterministic across repeated runs;
- Simulation mode cannot accidentally address physical hardware;
- the evidence bundle is understandable without reading raw logs alone.

The virtual-COM approach has its own go/no-go gate: continue expanding it only if representative SSPL coverage is tractable and the maintenance cost is lower than using an in-process backend. Failure of that gate does not invalidate the overall simulator.

## Document Roles Going Forward

- **Virtual Robot Simulation Test Plan:** authoritative roadmap and target architecture.
- **Robot Test Harness Plan:** useful technical exploration of the linter, serial seam, and incremental test layers; revise before treating it as implementation guidance.
- **This review:** decision record explaining what to merge and why.

## Immediate Next Step

Run a short architecture-discovery and proof-of-concept iteration on one BOD workflow. Its deliverables should be:

1. an inventory of the actual SSPL programs and external device calls used by that workflow;
2. a draft semantic event schema;
3. a context-aware linter prototype;
4. a minimal trace auditor;
5. a virtual-COM feasibility result with a documented go/no-go recommendation;
6. one deterministic scenario that detects a deliberately introduced unsafe or incorrect behavior.

This produces useful validation immediately while resolving the biggest architectural uncertainty before committing to a full controller emulator.
