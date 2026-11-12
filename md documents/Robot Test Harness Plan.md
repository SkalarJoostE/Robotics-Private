# Robot Test Harness — Plan

**Status:** proposal, not yet started
**Author:** drafted 2026-08-03
**Goal:** be able to implement a feature and verify it — movements, positions, locking, error paths, and non-regression across the other applications — without a physical robot.

> This document is independent of `Virtual Robot Simulation Test Plan.md` and was written without reference to it.

---

## 1. The problem, stated precisely

Emulation mode is not a fake robot. It is *no robot*.

`DeviceConfiguration.OperationalMode = Emulate` collapses to a single static flag, `SSPLBase.Emulation`, and every physical primitive becomes an early return:

| Primitive | Behaviour in emulation | Source |
|---|---|---|
| `OpenSerial` | returns 0 before `Connect()` | `SSPL_Serial.cs:194` |
| `Serial_SendStringData` | returns; command discarded | `SSPL_Serial.cs:233` |
| `Reset` | returns 0 | `SSPL_Serial.cs:248` |
| `Q_SSPL` / `L_SSPL` / `U_SSPL` / `R_SSPL` (cover) | return 0 | `SSPL_Serial.cs:265–314` |
| `RunSSPL` | fires `OnPRINT2Event(0, 0, "0")`, returns null | `SSPL_Serial.cs:340` |

That last row is the root cause. Every query answers `"0"`, so `GetPosition()` writes `mtr.Position = 0` for whichever motor it is called on (`SSPL_Functions.cs:539`).

The resulting motor state is not merely fake, it is **internally inconsistent**:

- a **waited** move (`Waitflag == 1`) snaps `mtr.Position` straight to the target — that assignment sits outside the `if (!Emulation)` guard (`SSPL_Functions.cs:432`);
- an **unwaited** move leaves `Position` untouched;
- any explicit `GetPosition()` call then **overwrites it with 0** — including the per-motor calls in `InitRobot` and `HomeAndGetPositions`.

So position is optimistic in one path, stale in another, and clobbered in a third. Beyond that there is no simulated state at all — no elapsed time, no travel limits, no sensors, no level detection.

Consequences, and this maps exactly onto what is not currently testable:

- **Positions cannot be verified.** Nothing tracks where a manipulator is, so "did the needle go to the right place" is unanswerable.
- **Timing does not exist.** Moves are instantaneous, so parallel-branch races and lock contention do not reproduce the way they do on hardware.
- **Physical rules are unenforced.** Nothing rejects an XY move made with Z below travel height, or a move beyond a motor's limits.
- **Error paths are untested.** A meter returning `ERR`, a level sensor that never triggers, a titrator timing out — none of these can be staged.
- **No regression signal.** There is no way to assert that a change to one application did not break the other twelve.

### Two findings that work in our favour

1. **Collision detection and manipulator locking already execute in emulation.** `MoveMotor` writes `mtr.TargetPosition` *outside* the `if (!Emulation)` guard (`SSPL_Functions.cs:373`), and `CollisionCheck` decides using `Max(Position, TargetPosition, ObjectLock value)` (`Motor.cs:559`). So two of three inputs are already live; only `Position` is pinned to 0. Lock and collision logic is much closer to testable than it appears.

2. **`Positioning.CalculateCoordinates()` is a pure function of table data** (`Positioning.cs:125`): `(PositionType, RackNumber, Manipulator, PosInRack, heightType) → X/Y/Z steps`, with no hardware involved. Inverting it turns raw step counts back into "SAMPLE rack 3, position 5, DispenseHeight". This is what makes assertions readable in domain terms instead of step arithmetic.

---

## 2. The seam to build on

The software reaches the robot through `DevicePool`. In `OpenSerial` (`SSPL_Serial.cs:166`):

```csharp
if (DevicePool.Instance().GetDevice("COM" + num) == null) { /* create RS232DeviceEx */ }
else { serialPort = DevicePool.Instance().GetDevice("COM" + num); }
```

If a device is already registered under that port name, the pack uses it and never constructs a real serial port. `Device` (`robotics-plugin/Device/Device.cs`) is a plain virtual-method base class — `SendString(string)`, a `DataReceived` event — and the plugin already ships `EmulateDevice : Device` as a no-op implementation.

So the injection point exists at a layer that is already an abstraction. This is not a rewrite of the robot stack.

### The SSPL surface is small and fully enumerable

This is the single most important scoping fact. The complete command vocabulary the pack emits:

| Command | Meaning |
|---|---|
| `MOTOR(0, m, pos, release)` | move to absolute position |
| `MOTOR(1, m, speed, accel)` | set speed / acceleration |
| `MOTOR(2, m, run, standby)` | set run / standby current |
| `MOTOR(3, m1, m2, p1, p2)` | simultaneous two-motor move |
| `MOTOR(4, m, factor)` | set steps→mm correction factor |
| `MOTOR(5, m, dir, moveHoming, sensor, reset)` | home |
| `MOTOR(6, m, I)` | read current position into variable |
| `MOTOR(7, m)` | move to previously stored position |
| `MOTOR(8, m, sensor, maxPos)` | move until sensor or max |
| `MOTOR(9, m, dir)` | start continuous move |
| `MOTOR(10, m)` | stop move |
| `PORTOUT(p, v)`, `PORTOUTBIT(p, bit, v)`, `PORTINBIT(p, bit, Avar)` | digital IO |
| `PUMP(n) ON\|OFF` | pump |
| `MAGNET(n) ON\|OFF` | solenoid |
| `STIRRER(n, speed)` | stirrer |
| `GRIP(a, b, Avar)` | gripper |
| `READLEVEL(n, Avar)` | level detector |
| `PRINT(0, 'LABEL=', var)` | response channel |
| `A` / chunks / `C`, `\x1B`, `Q`, `L`, `U`, `R` | handshake, reset, cover |

Roughly twenty commands. A faithful simulator is bounded work, not open-ended.

---

## 3. Plan — four layers

Each layer is independently valuable and ships on its own. Stop after any of them and you are better off than today.

### Layer 0 — Static verification (no execution)

Lint the pre-generated `Sequences\*.csv` (already produced per order and per template by `fetch-project.ps1` / `Process-SoftwareFolder.ps1`) plus the table XML.

Checks:
- `Sub method number` pointing at a subsequence that does not exist
- subsequences that are unreachable from any `MethodType`
- `Settings.MethodToRun` referencing a sequence with no matching `SequenceMethod`
- `MethodType` rows referenced by a Settings dropdown but `Enabled=false`
- a `Location` / `Manipulator` / `TargetHeight` combination used by a sequence with no matching `Position` or `HeightDefinition` row
- action numbers with no corresponding Action class in the pack
- rows with `Sequence number = -1` reported as intentionally disabled, not as errors

**Deliverable:** a PowerShell script in `Tools&Scripts\`, run per order, emitting a findings list.
**Acceptance:** run against all current templates; every finding is either a real defect or an understood exception.
**Effort:** days. No production code touched.

### Layer 1 — Virtual robot controller

A simulator process that speaks SSPL and maintains genuine state: per-motor position, speed/acceleration → elapsed time, min/max step limits from `MotorConfiguration`, homing and sensor behaviour, cover lock, IO/pump/magnet/stirrer states, gripper state, and level detectors that trigger after a plausible volume. Queries (`MOTOR(6,...)` + `PRINT`) are answered from that state instead of `"0"`.

Two connection options:

**Option A — virtual COM port pair (recommended to start).**
Use a null-modem driver (com0com or equivalent); the simulator runs as a separate process on the other end. The software opens a genuine COM port and runs in **Normal mode, not Emulate**, so *nothing* short-circuits — all polling, retry, timeout, collision and locking logic executes exactly as against hardware.
- *Advantage:* zero changes to core, plugin, or any pack. Works with every existing order unchanged, including old ones.
- *Cost:* runs in real time; requires a driver installed on the test machine.

**Option B — in-process device injection (add later, for speed/CI).**
Register a `SimulatedRobot : Device` into `DevicePool` under the expected port name before the run starts.
- *Advantage:* fast, no driver, CI-friendly.
- *Blocker to fix first:* `DiscardInBuffer()` hard-casts the device to the pack's private `RS232DeviceEx` (`SSPL_Serial.cs:89`) with no guard, so any injected device throws `InvalidCastException`. That is a few lines, but it is a **pack change** — it must go into the templates and be backported to each order under test.

**Deliverable:** simulator executable + a motor/IO state model driven from the order's own tables.
**Acceptance:** run BOD Syringe Check end to end against the simulator; motor positions in the log match what `CalculateCoordinates` predicts for each step.
**Effort:** weeks. This is the substantial piece.

### Layer 2 — Semantic trace and assertions

The simulator emits a structured JSON trace beside the Loupe log. Every move is annotated by inverting `CalculateCoordinates` — `TRANSPORT → SAMPLE rack 3 pos 5, DispenseHeight, t=14.2s`.

Assertions are then written in domain language rather than step counts:
- never move in XY with Z below travel height
- never dispense into a position that was not decapped
- two manipulators never within each other's `SafeDistance`
- no measurement while the stirrer is off
- vessel volume never exceeds capacity
- every sample reaches a terminal status

**Deliverable:** trace schema, the coordinate-inversion helper, and a rule set.
**Acceptance:** each rule is proven by deliberately breaking a sequence and seeing the rule fire.
**Effort:** ~1–2 weeks on top of Layer 1.

### Layer 3 — Regression baseline and fault injection

Run every application of a template against the simulator, store the trace as a golden file, and diff after a change. This is the "did my feature break the other applications" answer, and it is the part that scales with the number of orders.

Requires determinism, so upgrade the plugin's existing `Emulate*` classes (`EmulateMeter`, `EmulateTitrator`, `EmulateBalance`, `EmulateScanner`, `EmulateShaker`) from fixed/arbitrary values to **scripted** ones. Once values are scripted, fault injection becomes nearly free — and these are the cases that are impractical to stage physically:
- meter returns `ERR` / an out-of-range value
- level sensor never triggers
- titrator times out mid-run
- sample fails QC and triggers the retry path
- stop pressed mid-sequence

**Deliverable:** golden-trace store, a diff tool, and a scripted-device format.
**Acceptance:** a deliberate regression in one application is caught by the diff without anyone looking at it.
**Effort:** ~2 weeks on top of Layer 2.

### Optional add-on — playback viewer

Once Layer 2 exists, the trace already contains coordinates and timestamps, and tray geometry is in the tables. A 2D playback view with a scrub bar is a small amount of additional work and directly serves the "can I see it doing something weird" need.

---

## 4. What this does and does not catch

**Catches:** wrong coordinates, wrong rack or position, missing table rows, sequences wired to the wrong subsequence, manipulator collisions, deadlocks and lock contention, missed travel-height raises, ordering mistakes, unhandled error paths, and regressions in applications you did not touch.

**Does not catch:** anything analogue. Mechanical drift, a needle bent 2 mm, tubing that siphons, real liquid behaviour, a probe reading slowly because it is dirty, thermal effects. The harness validates that **the software commands the right things in the right order at the right time** — not that the physical machine obeys.

Realistic ceiling: roughly 85–90% of what a FAT currently catches. FAT does not go away; it stops being where a swapped X coordinate is discovered.

---

## 5. Risks and open questions

| Risk | Mitigation |
|---|---|
| Simulator fidelity drifts from real robot firmware behaviour | Validate Layer 1 against a real robot once, on a known application, and record the comparison |
| Option B requires a pack change that must be backported per order | Start with Option A, which needs no pack change at all |
| Golden traces become noisy and get ignored | Keep the trace schema minimal; normalise timestamps; diff semantically, not textually |
| Effort is underestimated | Layer 0 and the Layer 1 prototype are deliberately cheap and de-risk the rest before real money is spent |

**Open questions:**
- Which machine hosts the harness — a build VM with a GUI session, or an engineer's PC? The application is WinForms, so a fully headless CI run is not free.
- Do we want a `--run-analysis` CLI entry point on `SkalarRobotics.exe` for automation, or drive the existing UI?
- Should the simulator live in `robotics-plugin` (shared, versioned with releases) or as a standalone tool in this workspace?

---

## 6. Recommended first step

Two things, in order:

1. **Build the Layer 0 linter this week.** It is cheap, uses artefacts already generated, touches no production code, and will find real wiring defects immediately.
2. **Prototype Layer 1 narrowly:** virtual COM port, motors and positions only, run BOD Syringe Check end to end, and confirm the trace visits the positions `CalculateCoordinates` predicts.

That single experiment determines whether the whole approach holds, and it can be abandoned at no cost to production code.
