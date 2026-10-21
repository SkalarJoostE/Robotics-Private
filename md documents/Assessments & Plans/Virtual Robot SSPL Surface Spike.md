# Virtual Robot SSPL Surface Spike

> **Goal:** Measure the full surface the order software uses to talk to the SP2000 controller, so a PSD6-style virtual robot (an SSPL interpreter and a robot-state model on a virtual COM pair, with the software in Normal mode) can be sized. Feeds `SIM-006` / `SIM-007` of `Virtual Robot Simulation Test Plan.md`.
> **Approach:** Static, read-only scan of the five standard templates (Testkit, BOD, Waters, Soil, Lutum), the outlier Template Waters ALS Canada and order 99407519 (RB-418 customer software). A small C# lexer read each `SkalarPackSolution` mirror and each `SkalarPacks\AllScripts.cs`. Results were checked against the real RB-418 `.glf` log (7 Oct 2026, 15:04–23:25, 22,198 SSPL programs) and against the plugin's own `Translator\SP2000_1` client.
> **Outcome:** The work is feasible and smaller than feared. There is one wire protocol. Every command, single-line or not, is a full program upload (`SendDirectSSPL` just calls `RunSSPL`). The language the live code actually uses is a small BASIC-like subset: about 18 op keywords plus 11 `MOTOR` sub-ops, `IF`/`WHILE`/`DEFBLOCK`/`BLOCK`/`FOR`, single-letter variables, and a seconds timer `S`. Most of `SSPLGenerated.cs` is dead code: 8–51% of its bytes are reachable, and in ALS Canada 36 of its 157 programs are called. The hard part is the **world model** (what each input bit reads, given where tubes, caps and the gripper are), not the interpreter. Device semantics such as `GRIP`, `READLEVEL`, `MOTOR(5/8)` homing arities, motion timing and the reply to `G` (overload) need a firmware spec, or must be learned from real logs.
> **Scope:** This is an assessment only; nothing was changed in any software. Findings marked **[spec]** depend on SP2000 firmware source or an SSPL manual. Whether either exists has been asked of Joost and is not yet answered. **[code]** means the finding is read from the pack or plugin source. **[log]** means it was observed in the RB-418 log.

**Date:** 2026-10-20
**Scope:** Template Testkit, BOD, Waters, Soil, Lutum, Waters ALS Canada; order 99407519 (`Service Items\RB-418\Customer software\…\99407519 246453`)
**Related:** `Virtual Robot Simulation Test Plan.md` (SIM-006/007), `Virtual Robot Simulation Test Plan - Review.md`, RB-418 `analysis.md`

**Read-me-first caveat.** The `SkalarPackSolution` mirror of 99407519 is **incomplete**. It has only 4 `Structure\` folders and 142 `.cs` files, against Testkit's 400; the gripper, motor and temperature-block code is missing from it. Every 99407519 number below comes from `SkalarPacks\AllScripts.cs`, which is complete. For that order, cite `AllScripts.cs` line numbers and not the mirror.

---

## 1. Every channel to the controller

### 1.1 Channels

| Channel | Bytes on the wire | Callers | Reply read by |
|---|---|---|---|
| `RunSSPL(code)` — program upload | `A` → chunks of ≤200 chars, each line `\r`-terminated, ending with `END\r|\r` → `C` | ~28–41 call sites per template: every `SSPLGenerated` method, and `SendDirectSSPL` | `InterpreterSSPLex(30)` for the upload, `InterpreterSSPLex(300)` for execution |
| `SendDirectSSPL(cmd)` | **Same as `RunSSPL`**: `SSPL_Functions.cs` `SendDirectSSPL(s) { RunSSPL(s); }` in all six trees [code] | `ConnectAndReset` (PORTOUT, PUMP, MAGNET, STIRRER all off), `MoveMotor`/`MOTOR(0..10)` wrappers, `GetPosition`, `FirmwareVersion`, `Pump.StopFillingWhenLevelDetected` | Same |
| `Reset()` | `\x1B` | `ConnectAndReset` | `InterpreterSSPLex(7)` |
| `Q_SSPL` / `L_SSPL` / `U_SSPL` / `R_SSPL` | `Q\r`, `L\r`, `U\r`, `R\r` (cover query, lock, unlock, reset) | `QueryLock`, `LockCover` (skipped when `RobotSettings.BypassCoverLock`), unlock calls in finalizers (U_SSPL 7–21 sites) | Three `InterpreterSSPLex(5)` (R: 5/300/5) |
| `Serial_SendStringData(str)` | Raw string | **No live caller** in any tree. Every generated `_OnPRINT2Event` handler has it commented out. ALS's dead `TitrationDemo` is the one exception | — |
| Overload answer (ALS Canada only) | `D` (continue) / `W` (quit) after the controller sends `G` | `Robots\SSPL_Serial.cs:673/682` | — |
| Plugin path (ALS Canada only) | `IRobot.Robot` → `Translator\SP2000_1`: `A`, lines ending `\n`, `END\n|\n`, `C\n` | `Robots\SP2000*.cs` (420 `rRobot.*` calls) | `SP2000_1.onDataReceived` / `CleanUpReceivedData` |

`DiscardInBuffer()` hard-casts to the pack's private `RS232DeviceEx` (`SSPL_Serial.cs:89`). That is the blocker the Review names for **DevicePool injection**. It does **not** apply to a virtual COM pair: the pack then opens `COM<PortNumber>` itself, as in production.

### 1.2 Wire protocol (pack path)

Controller → PC tokens are `\r`-terminated lines, parsed by `InterpreterSSPLex` (`SSPL_Serial.cs:571–722`, Testkit) [code]:

| Token | Meaning | Handling |
|---|---|---|
| `A` | Ready / program finished | Ends the read loop |
| `H` + `<ch>` + `<text>` | `PRINT(ch,…)` output, ch 0–3 | ch 0 is appended to `PRINT0`, which `GetStringResult("KEY")` / `GetDoubleResult` parse as `KEY=value`. ch 2 is split on `0x1E` into row/col/data and raised as `OnPRINT2Event`; no live handler uses it |
| `Q` + `0`/`1` | Cover closed / open | Sets `CoverIsClosed` |
| `R`, `U`, `L` | Cover command acks | Ends the loop |
| `P` (+ `A`) | Pause button pressed on the robot | `ProcessPause()`. Also caught asynchronously in `onDataReceived` as `P\rA\r` |
| `E` | Error | Logged only |
| `F` + text | SSPL syntax error | Logged only |
| `G` | Overload | Standard templates set a flag and log it. ALS Canada asks the user and answers `D`/`W` |
| `B`, `C`, `I`, `J`, `K`, `|` | Legacy terminal codes (INKEY, gotoxy, CLS, end of code) | Mostly ignored |
| anything else | — | Logged as **Error** `InterpreterSSPLex: Unexpected default in swithch` |

**Observed exchange [log]** (99407519, `ConnectAndReset` → `PORTOUT(1,0)`):

```
PC → A                       ctrl → A                (ready)
PC → PORTOUT(1,0)\rEND\r|\r  ctrl → PORTOUT(1,0)\r   (echo, logged as "Unexpected default")
                             ctrl → END\r            (echo, ditto)
                             ctrl → A\r              ("|" yields A, no echo)
PC → C                       ctrl → [H\r 0\r STATUS=     1\r]  (only if the program PRINTs)
                             ctrl → A\r              (program finished)
```

- **The controller echoes every uploaded line.** The pack treats each echo as an error, so the RB-418 session logged **101,654** `Unexpected default` errors for 22,198 programs (≈4.6 per program) [log]. Those errors are background noise in every log. They are also the best ground truth a simulator has for exact upload behaviour.
- `Reset` echoes `\x1B` and then sends `A` [log].
- Numbers print right-aligned in a 6-character field (`STATUS=     1`) [log]. `GetStringResult` trims them, but a byte-exact simulator should match the field.
- A waited move `MOTOR(0,14,1525,1)` returned `A` 1.36 s after `C` [log], so execution time is the move time.
- `StringCleaning` strips tabs, `^.` comments and blank lines before sending, so the controller never sees comments [code].

**Two handshake variants** [code]. Testkit, Waters, Soil, Lutum and 99407519 wait for `A` after the last chunk (`InterpreterSSPLex(30)`). BOD reads exactly one line per line sent, including the last chunk, and then sends `C`. Both work against "echo every line, `|`→`A`". A simulator that deviates (for example, no echo) would desync BOD differently from the rest.

**Two motion-wait styles** [code]. These matter for what the simulator must report *during* a move:

| Style | Templates | Bytes |
|---|---|---|
| Blocking: `MOTOR(0,m,p,1)`, controller returns `A` when the move is done | Testkit, Lutum, 99407519 | One program per move |
| Polling: `MOTOR(0,m,p,0)`, then `MOTOR(6,m,I)`+`PRINT(0,'POSITION=',I)` every 100 ms until within ±10 of target, a resend after 10 s, then `MOTOR(0,m,p,1)` | BOD, Waters, Soil (`SSPL_Functions.cs` `MoveMotor`, `if (!Emulation)` block) | 1 + N + 1 programs; **needs mid-move positions** |

### 1.3 Plugin client as a second witness

`robotics-plugin\Translator\SP2000_1.cs` independently assumes the same protocol. It checks that "reply contains command" (the echo) and completes on a trailing `A\r` or `|\rA\r`. It strips `A`/`Q`/`C`/`H` tokens from the payload. It uses `\n` line ends where the pack uses `\r` [code]. **A simulator must accept both terminators.**

---

## 2. Where SSPL text comes from

| Source | What | Sites |
|---|---|---|
| **A. `SkalarPacks\SSPL_Functions.xml.txt`** (+ `SSPL_Functions2.xml.txt` for `SSPLGenerated2`) | A dictionary of `SSPLItem {name, code, parameters, results}`, edited in the core's SSPL editor (`robotics-core\SkalarRobotics\Hardware_SSPLCtrl.cs:183–236`), which generates `Generated\SSPLGenerated.cs`: one method per item (`String.Format` the parameters → `RunSSPL` → `GetStringResult` per result) | 26 programs (Testkit, 99407519), 39 (BOD/Waters/Soil), 27 (Lutum), 157 (ALS Canada) |
| **B. Inline literals in `SSPL\SSPL_Functions.cs`** | `ConnectAndReset` `:129–140` (PORTOUT 1/2, PUMP 1–5, MAGNET 1–2, STIRRER 1–3 all off); `MOTOR(0..10)` wrappers `:386, 465, 477, 507, 521, 550, 566–567, 588, 601, 614, 626`; `FirmwareVersion` `:76` `PRINT(0,'FIRMWARE=',$)` (Testkit line numbers; the other templates are within a few lines) | 25 per standard template |
| **C. Built at run time from tables** | `CommonActions.InitVariables` (`Structure\1 - General\Tables and Functions\CommonActions.cs:222–250`) builds `ssplStopFillingWhenLevelDetected` from `ManipulatorDefinition.FillPump` → `PumpSettings` → `IOConfiguration`. Per pump it emits `READLEVEL`/`GRIP`/`PORTINBIT` + `IF A{n}={0/1}` + `PUMP OFF`/`MAGNET OFF`/`PORTOUTBIT` + `PRINT(0,'S{n}=',A{n})` + `ENDIF`. It is sent by `Pump.cs:252–256` `StopFillingWhenLevelDetected` | 1 builder per standard template |
| **D. Plugin path** (ALS Canada) | `rRobot.RunSSPL(…)` strings in `Robots\SP2000*.cs`, for example `"MOTOR(0,"+n+","+pos+","+opt+")"` | 135 literal sites |
| **E. Script dispatcher** | A unit that runs `SSPLGenerated` methods by name, and `Reset`/`R_SSPL`/`U_SSPL`/`L_SSPL` on a given port (port < 1 ⇒ `SetEmulation(true)`) | 99407519 `AllScripts.cs:40441–40460` |

Not SSPL, though they match the keyword scan: `"MOTOR"`, `"PUMP"` and `"STIRRER"` in `CommonActions.Unlock*` and `Motor.cs` are **resource-lock keys** (`MOTOR14`, …).

`DEMO_COD_SSPL_Functions.xml.txt` (194 KB, in every standard template and in 99407519) is an older, larger SSPL library, with `MoveXY`, `DiluterInit` and SP1000 code. It is **not compiled**. It is useful only as extra vocabulary evidence.

---

## 3. The language actually used

### 3.1 How much `SSPLGenerated.cs` differs

| Tree | Bytes | MD5 group | Programs | SSPL lines (no comments) | Live programs* | Live share of program bytes |
|---|---:|---|---:|---:|---:|---:|
| Testkit | 26,152 | A | 26 | 516 | 15 | 32.8 % |
| 99407519 | 26,152 | **A (identical to Testkit)** | 26 | 516 | 15 | 32.8 % |
| BOD | 34,559 | B | 39 | 541 | 12 | 18.5 % |
| Waters | 34,559 | **B (identical to BOD)** | 39 | 541 | 12 | 18.5 % |
| Soil | 34,559 | **B (identical to BOD)** | 39 | 541 | 12 | 18.5 % |
| Lutum | 29,381 | C | 27 | 567 | 17 | 51.0 % |
| Waters ALS Canada | 363,196 | D | 157 | 7,849 | 36 | 8.3 % |

\*Live = has at least one caller in `AllScripts.cs` outside the generated class.
Changed-line diffs: Testkit↔BOD 693, Testkit↔Lutum 308, BOD↔Lutum 1,001, Testkit↔ALS 14,245. Group B adds 14 `SSPLKloehn*` programs (`DILK`), all dead there. Group C adds `ReadTempSampleDataforth`/`Kuebler`.

Live programs, standard templates: `PumpON`, `PumpOFF`, `PortOutBit`, `PortInBit`, `SensorStatusCheck`, `SingleSensorStatusCheck`, `Grip`, `ReadLevelDetector`, `ToggleLevelDetector`, `ToggleMagnet`, `StirrerSpeed`, `PRESSURECHECK`. Testkit and Lutum add `HomeMotorOnIO`, `SetTemp`, `ReadTemp`; Lutum adds two temperature-sample readers. Dead in every standard tree: `ResetBoard` (the long init program with the air-pressure gripper test), `Firmware`, `MOTOR0`, `MOTOR1` and the temperature-controller status/reset/correction programs.

### 3.2 Construct counts (whole generated file)

| Construct | Testkit / 99407519 | BOD / Waters / Soil | Lutum | ALS Canada |
|---|---:|---:|---:|---:|
| `IF … ENDIF` | 58 | 57 | 70 | 881 |
| `WHILE … ENDWHILE` | 13 | 15 | 14 | 268 |
| `FOR … NEXT` | 1 | 1 | 1 | 93 |
| `DEFBLOCK … ENDBLOCK` / `BLOCK x` | 11 / 17 | 11 / 17 | 11 / 17 | 147 / 406 |
| `END` (abort) | 3 | 4 | 3 | 6 |
| Assignments / with arithmetic | 113 / 22 | 118 / 24 | 125 / 27 | 2,064 / 327 |
| Timer `S` reset / read | 14 / 21 | 12 / 19 | 15 / 23 | 89 / 290 |
| `WAITMS` / `WAIT` | 20 / 1 | 20 / 1 | 20 / 4 | 76 / 152 |
| `PRINT` | 75 | 79 | 84 | 1,243 |
| `MOTOR` | 30 | 27 | 30 | 235 |

**Live subset only:** Testkit/99407519 use 29 `IF`, 7 `WHILE`, 4 `DEFBLOCK`, 6 `BLOCK` and **no `FOR`**. BOD-family: 17 / 4 / 2 / 2. Lutum: 46 / 9 / 6 / 8. ALS Canada: 83 / 20 / 20 / 58, plus 4 `FOR`.

### 3.3 Vocabulary

| Class | Elements |
|---|---|
| Control | `IF`/`ENDIF`, `WHILE`/`ENDWHILE`, `FOR v=a TO b`/`NEXT`, `DEFBLOCK X`/`ENDBLOCK`/`BLOCK X` (single-letter named subroutines, global variables), `END` |
| Data | Variables `A`–`Z`, `A1`…`Z9`. Operators `= + - *` (no `/` seen live). Comparisons `= <> < >`. Integer and decimal literals (`MOTOR(4,2,16.8)`) |
| Strings | `$` (one string register: firmware version at start, the last `INPUT` line), `$(n)` character code, `$(n,m)` substring, `'text'` literals, `#13` character literals |
| Time | `S`: controller-incremented seconds, writable (`S=0`, `V=S+2`, `WHILE V>S`). `WAITMS(ms)`, `WAIT(s)` |
| Output | `PRINT(0, items…)`; `PRINT(P, …)` to an auxiliary port |
| Aux serial (controller as gateway) | `OPEN(p,baud,8,'N',1)`, `FLUSH(p)`, `BINKEY(p,v)`, `INKEY(p,v)`, `INPUT(p,$)` |
| IO | `PORTOUT(board,byte)`, `PORTOUTBIT(board,bit,val)`, `PORTINBIT(board,bit,var)`, `READLEVEL(n,var)`, `LEVEL(n) ON/OFF`, `GRIP(g,s,var)` |
| Actuators | `PUMP(n) ON/OFF`, `MAGNET(n) ON/OFF`, `STIRRER(n,speed)` |
| Motors | `MOTOR(sub, …)`, see 3.4 |
| Dead or legacy only | `LIFT`, `TUBEA` (old SP1000 moves), `DILK`/`DIL` (diluter via controller), and in ALS `WTWLEVEL2`, `GET`, `STRING`, `START` |

**Interpreter scope for the standard templates and 99407519:** 18 op keywords, the 11 `MOTOR` sub-ops, 6 control constructs and the expression set above. ALS Canada adds `FOR` (live), `DILK` (live, 21 uses), heavier `BLOCK` use and the `D`/`W` overload dialogue.

### 3.4 `MOTOR` sub-ops

Names are from the comments in `SSPL_Functions.cs`; the meaning of each argument is **[spec]** unless stated.

| Sub-op | Wrapper | Live in 99407519 [log] | Simulator needs |
|---|---|---|---|
| `0,m,pos,wait` | `MoveMotor` | yes (thousands) | Target, completion time, wait flag 1 blocks |
| `1,m,speed,acc` | `SetSpeedAndAcceleration` | yes | Units → motion time **[spec]** |
| `2,m,irun,istandby` | `SetRunAndStandbyCurrent` | yes | Store only. Current 0 ⇒ the motor is free to push by hand (`HomeAndGetPositions`) |
| `3,m1,m2,p1,p2` | `Move2MotorsAtTheSameTime` | yes: X/Y moves and decapper rotate+Z (`MOTOR(3,13,14,-735,1265)`) | Simultaneous move. Blocks? **[spec]** |
| `4,m,factor` | `SetCorrectionFactor` | init | Position units (steps↔mm) **[spec]** |
| `5,m,dir,move,sensor,reset[,…]` | `HomeMotor`, `HomeMotorOnIO` | yes; seen with **4, 5 and 6** arguments (`MOTOR(5,2,1,1)`, `MOTOR(5,14,1,1,1,1)`) | Homing semantics per arity **[spec]** |
| `6,m,var` | `GetPosition` | yes (`MOTOR(6,14,I)`, 161×) | Current position, **mid-move for BOD/Waters/Soil** |
| `7,m` | `MoveMotorToStoredPosition` | no | — |
| `8,m,sensor,max` | `MoveMotorTillSensor` | no caller in any tree | Low priority |
| `9,m,dir` / `10,m` | `StartMovingMotor` / `StopMovingMotor` | `10` yes (`StopMotorsImmediately`, `HomeMotorOnIO`) | Continuous run (pump motors) |

---

## 4. Plugin path versus pack path

| Tree | Robot driven by |
|---|---|
| Testkit, BOD, Waters, Soil, Lutum | **Pack only.** `SSPLBase` on `COM<PortNumber>` via `DevicePool`. No reference to `IRobot`, `RobotFactory` or `Translator` in `AllScripts.cs` [code] |
| **99407519** | **Pack only** [code + log]: categories `Skalar.Pack1.SSPLBase` and `Devices.Device` `RS232 Device (COM4)`, COM4 = `DeviceConfiguration.PortNumber` |
| Waters ALS Canada | **Plugin for normal runs.** `SP2000.ConnectAndReset` sets `bOldway=false` and uses `IRobot.Robot.Instance()` (`Robots\SP2000.cs:851–862`), and `RunSSPL` forwards to `rRobot.RunSSPL(999, code)`. Pack path only for `HomeAndGetPositions` (`bOldway=true`, `:832`) |

Both clients send the same programs over the same protocol, so **one virtual controller serves both**, as long as it accepts `\r` and `\n` line ends.

---

## 5. State the simulator must model

### 5.1 Inputs the software reads, and the world state behind each

| Read path | SSPL | Reply → meaning | World state that must drive it | Keyed to |
|---|---|---|---|---|
| `IOConfig.ReadInput` (`IOConfig.cs:49`) | `PortInBit` (3-sample debounce, 120×25 ms timeout ⇒ `STATUS=1`) / `Grip` / `ReadLevelDetector` | `"0"` = active, inverted by `InvertedSensor` | Per IO row: level reached, tube present, cylinder at end stop, … | `IOConfiguration` (`Board`, `Port`, `Grip`, `LevelDetection`, `InvertedSensor`) |
| `GetGripperStatus`, 1 sensor (`GripperDecapper.cs:189`) | `SingleSensorStatusCheck(b,p)` | `"0"` ⇒ `CAP`, else `EMPTY` | Object (cap/tube top) inside the gripper's sensing window | `GripperManipulatorConnection.Sensor1` → IO row |
| `GetGripperStatus`, 2 sensors | `SensorStatusCheck(b,p1,p2)` → `G=2·S2+S1` | `1` CLOSED (empty), `2` OPEN, `3` CAP | Jaw state + object | `Sensor1`/`Sensor2` |
| `DetectTubeInGripper` (`:235`) | 1 sensor ⇒ status = CAP; 2 sensors ⇒ `CloseGripperWithCap` | bool | As above | |
| `GetShakerStatus` | `SensorStatusCheck` upper/lower | UP/DOWN | Shaker cylinder position (lags the output) | `ShakerConfiguration` → `ShakerUpper/LowerSensor` |
| Cap flipper (`Action36x00`) | `SensorStatusCheck` ×3 pairs | per pair | Flipper/gripper/puncher positions | `CapFlipper*` IO rows |
| `HomeMotorOnIO` | `PORTINBIT(B,P,I)` loop while `MOTOR(0,M,30000,0)` runs | `STATUS=OK` | Home sensor goes to 0 when the motor reaches home | `MotorConfiguration.HomeWithIO` + `IOHomeSensor` |
| `GetPosition` | `MOTOR(6)`+`PRINT` | `POSITION=n` | Motor position (mid-move for the polling family) | `MotorConfiguration.Number` |
| `PressureCheck` | `PRESSURECHECK(port)`: aux port, `RAPS\r` | `PRESSURE=x` | Air pressure value | `RobotSettings.PressureSensorPort` (6 on 99407519) |
| Temperature blocks | `SetTemp`/`ReadTemp`: aux port, `STA`/`STB`/`THA`/`THB` | `HEATERTEMPA/B=` | Heater setpoint and actual, with a ramp | `TemperatureBoardConfiguration.PortNumber` |
| Fill stop | Dynamic program (§2 C) | `S{n}=` | Level reached in the vessel | `PumpSettings.LevelDetector` |
| Cover | `Q` | `Q 0/1` | Cover open/closed, lock | `RobotSettings.BypassCoverLock` / `RobotIsEquippedWithNewLock` |
| Firmware | `PRINT(0,'FIRMWARE=',$)` | `$` | Version string (99407519: `1088 version 5.00 714: 705:3.0 710:5.2 715:3.0`) | `DeviceConfiguration.FirmwareVersion` |

Outputs map to `PORTOUTBIT(Board,Port,bit)`, with `bit = Activate ? ActivateOutputBit : 1-ActivateOutputBit` (`IOConfig.SetOutput`), or to `PUMP`/`MAGNET`/`STIRRER`/`LEVEL`/motor by IO row type. **Polarity is a per-order table fact.** On 99407519, `SampleGripperPort` has `ActivateOutputBit=0` ("Activate = Close"), so close = `PORTOUTBIT(2,0,0)`. The log confirms this: open `(2,0,1)`, then CAP, then close `(2,0,0)` [log]. The dead `ResetBoard` program comments `PORTOUTBIT(2,P1,0)` as *OPEN GRIPPER*, which is wrong for this order. **Build the world model from the tables, never from `SSPLGenerated` comments.**

### 5.2 Worked example: the RB-418 recap/put-back gate

Order 99407519 has a **single-sensor** gripper:

```
GripperManipulatorConnection: MANIPULATOR: GRIPPER → ConnectedGripper = SampleGripperPort (out 2.0, ActivateOutputBit 0 = close)
                                                    Sensor1 = SampleGripperCapPresenceSensor (in 1.8), Sensor2 = none
Decapper: SampleDecapperBellowPort (out 2.2, ActivateOutputBit 1); Rotate motor = motor 13; Z gripper = motor 14
```

Gate `Action00x0J` (`AllScripts.cs:23513`): `proceedToExecute = GetGripperStatus(...) == "CAP"`.
→ `GetGripperStatus` (`:11086`) → `SingleSensorStatusCheck("1","8")` → program `I=0 … WHILE I<3 PORTINBIT(1,8,M) … ENDWHILE PRINT(0,'STATUS=',I2)` → `STATUS=0` ⇒ `CAP`.

| Step (error 121 path, method 64) | Software does | Simulator must answer |
|---|---|---|
| Before 121: `70x00` pickup (`:19007`) | Open (`PORTOUTBIT(2,0,1)`), Z to `BottlePickupHeight` (`MOTOR(0,14,1525,1)`, `A` after the move time), `DetectTubeInGripper` | `PORTINBIT(1,8)=0` because a capped tube top is now in the sensor window [log: 15:11:47.08 open, 15:11:48.71 `STATUS=     0` → CAP] |
| `72x00` decap (`:19325`) | Bellow clamp `PORTOUTBIT(2,2,1)`, rotate+Z `MOTOR(3,13,14,…)`, `DetectTubeInGripper` must stay CAP, else error 36/37 | After the unscrew, the **cap stays with the gripper**: sensor 1.8 stays 0 while the gripper rises. The tube stays in the bellow |
| `00x0X` reagent pickup → **error 121** | Method 64 runs | Nothing new: the state persists |
| Step 1 `00x0J` → sub 20 (cap in the decapper, `73x00` `:19485`) | `GetGripperStatus` | Must return `STATUS=0` because the gripper still holds the cap. **In Emulate this is `""` ⇒ `EMPTY`, and the gate silently skips**, which is the RB-418 gap |
| `73x00` cap | Z to cap height, rotate back, open, `DetectTubeInGripper` | Cap transferred to the tube; the tube is capped again |
| Step 2 `00x0J` → sub 21 (put back, LOCATION `COLD`, `71x00` `:19175`) | Pickup from the decapper, move, `BottleDropHeight`, open, `DetectTubeInGripper` false at `BottleDropCheckHeight` (else 39) | The tube follows the gripper while it is closed and the sensor reads it; after opening at drop height, rising clears the sensor (1.8 → 1) |

**Minimal state for this test:** gripper jaw (open/closed), object in gripper (none/cap/capped tube), tube location (rack slot / bellow / gripper), cap location (tube / gripper), bellow clamp, Z of motor 14, X/Y of motors 0/1. The rule: *sensor 1.8 reads 0 iff an object top is in the gripper window at the current Z*. This is enough to drive every `DetectTubeInGripper` in `70x00`–`73x00`. Geometry comes from the `Position`/`HeightDefinition` rows, the same ones `Check-ManipulatorGeometry.ps1` already walks. Scenario faults ("cap slips during decap", "no tube in slot", "sensor stuck at 1") are single toggles on this state.

---

## 6. Emulation bypasses: what Normal plus a virtual COM would exercise

All six trees share **8 transport bypasses** in `SSPLBase` (`OpenSerial`, `Serial_SendStringData`, `Reset`, `Q`/`L`/`U`/`R`, `RunSSPL`). Under Emulate, `RunSSPL` returns at once, so `PRINT0` is empty and every `Get*Result` is `""`/`0`. That makes `ReadInput` return true (forced), `GetGripperStatus` return `EMPTY` (1 sensor) or `""` (2 sensors), and `GetPosition` return 0. Beyond that, the robot-level gates are:

| Template | Robot gates | Sites (mirror `Structure\…` unless stated) |
|---|---:|---|
| **Testkit = 99407519** | **16** | `CommonActions.PressureCheck:860`; `IOConfig.ReadInput:51`; `Pump.PumpUntilLevelOrTime:219`, `StopFillingWhenLevelDetected:252`; `GripperDecapper.InitializeBODGripper:492`; `Action70x00:59`, `71x00:59`, `71x01:65`, `72x00:60`, `73x00:59`, `74x00:58` (gripper hardware blocks); `Action36x00:58` (cap flipper); `Shaker.ShakerDown:80`; `TemperatureBlocks.TempCheck:393`, `AnyStartAnalysisWhenReachedDone:572`; `Planner_Testkit.OccupyTemperatureBlockIfPossible:1464` (99407519: `AllScripts.cs:4043, 5703, 10875, 10908, 11389, 19024, 19192, 19342, 19502, 19700, 20407, 20586, 22645, 22821, 23725, 27116`) |
| BOD | 7 | `SSPL.MoveMotor:377` (position poll); `PressureCheck:828`; `ReadInput:51`; `PumpUntilLevelDetection:196`; `StopFilling…:234`; `InitializeBODGripper:427`; `Action71x00_BODCap:83` |
| Waters / Soil | 6 | `MoveMotor` poll; `PressureCheck`; `ReadInput`; `PumpUntilLevelDetection`; `StopFilling…`; `InitializeBODGripper` |
| Lutum | 9 | `PressureCheck:865`; `ReadInput:52`; `PumpUntilLevelDetection:220`; `StopFilling…:258`; `InitializeBODGripper:469`; `Action96x00:80`; `Action97x00:77` (fill-height detection); `TemperatureBlocks:380, 520` |
| ALS Canada | ~15 robot + ~12 duplicate transport (`HiddenForm`) | `SP2000` class (`AllScripts.cs` 1119–27697), plus ~45 titrator self-emulation lines (`Titrino848/785`, `TitroLine6000`, `BaseTitrator`) |

Separate switches the robot simulator does not touch: diluters (`DiluterConfiguration.Emulation`, PSD6 simulator), homogenizer, PBF, and meters/titrators/barcode via their own `DeviceConfiguration.OperationalMode` (Testkit 15 lines, BOD 8, Waters/Soil 9, Lutum 15). Because each device has its own flag, a **hybrid run is possible**: robot Normal on the virtual COM, diluter on the PSD6 simulator, and meters in Emulate.

**Testkit is the template Emulate hides most from** (16 gates, including all six gripper/decap actions). That is why RB-418's new method could not be proven there.

---

## 7. Verdict

### 7.1 Size

| Part | Scope (standard templates + 99407519) | Estimate* |
|---|---|---|
| Wire protocol | `A`/chunk/echo/`|`→`A`/`C`/`H`-print/`A`; `\x1B`; `Q`/`L`/`U`/`R`; `P` pause; `E`/`F`/`G` injection; `\r` and `\n` | Small |
| Interpreter | Line parser, 6 control constructs, ~6 expression forms, global variables, `S` timer, `$` register, 18 ops + 11 `MOTOR` sub-ops; **fail loudly on anything else** | ~1–1.5k lines |
| Robot-state model | Motors (position, target, timing, home sensors), IO bits from `IOConfiguration` with polarity, gripper/tube/cap/rack world, decapper bellow, shaker, level detectors, cover | ~2–3k lines; the real cost |
| Aux-port devices | Temperature controller (`STA/STB/THA/THB/RDA7/TCA`), pressure sensor (`RAPS`), Lutum Kuebler/Dataforth | Small each; protocol readable from the programs |
| Static pre-check | Before a run, parse the order's live programs plus the inline and dynamic sites and refuse unsupported syntax (the scanner behind this spike is the prototype) | Small |

\*Order-of-magnitude, from comparable code; not a plan estimate. ALS Canada would add `FOR`, `DILK`/`DIL` (diluter tunnelled through the controller) and the `D`/`W` overload reply. Treat it as a later, separate target.

### 7.2 What needs a firmware spec, and what can be inferred

| Item | From code + logs | Needs **[spec]** (or many logs) |
|---|---|---|
| Framing, echo, `|`→`A`, chunk flow, `PRINT` channel 0 format | Yes [code + log] | Exact behaviour on buffer overflow, or a line > 200 chars |
| Control flow, variables, `S`, `WAITMS` | Mostly; semantics are visible in the programs | Integer vs float, `S` resolution and rollover, variable limits, whether `BLOCK` can recurse |
| IO bits and polarity | Yes, from `IOConfiguration` + logs | Board/port numbering limits |
| Gripper and shaker sensor logic | Yes (§5) | — |
| `GRIP(g,s,v)`, `READLEVEL`, `LEVEL ON/OFF` | Only call sites | Return codes and timing **[spec]** |
| `MOTOR(5)` with 4/5/6 arguments, `MOTOR(8)`, `MOTOR(3)` blocking, speed/accel/current units → motion time | Positions yes; timing roughly from log gaps | **[spec]**; motion timing can be fitted from logs |
| Cover `Q`/`L`/`U`/`R` replies | Code expects `Q` + `0`/`1` | Confirm with a log from an order without `BypassCoverLock` (99407519 bypasses it, so its logs have no `Q` traffic) |
| `E`, `F`, `G`: when emitted, and what the controller does next | Code only | **[spec].** In the standard templates `G` is logged and **never answered**, while ALS Canada answers `D`/`W`. Whether the controller then waits (the PC would hit its 300 s timeout) is a firmware fact, and a good first fault-injection case |
| `$` register and aux-port ops (`OPEN`/`BINKEY`/`INKEY`/`INPUT`) | Usage yes | Buffering and timeout semantics **[spec]** |

### 7.3 Risks

1. **The world model, not the language.** A wrong rule for when a sensor reads 0 gives false passes as easily as Emulate does. Mitigation: derive each rule from table rows, and calibrate it against real logs. The RB-418 log alone has 2,664 `STATUS=0`→CAP events with full context.
2. **Wall-clock coupling.** The PC side times everything on real time (`SerialRead` timeouts, incubation and planner timers, BOD's 10 s resend). The simulator can make moves and heater ramps instant, but cannot compress PC-side waits. Long applications still need shortened timing tables in the sandbox copy.
3. **Per-order SSPL drift.** B-robots can edit `SSPL_Functions.xml.txt` (ALS: 157 programs). Run the static pre-check per order, and refuse rather than guess.
4. **Mirror drift.** Mirrors can be incomplete (99407519). Source the pre-check from `AllScripts.cs` or the XML, not the mirror.
5. **Two handshake and two motion-wait variants** (§1.2): each needs a golden trace.
6. **The log noise is a feature.** The 101k echo "errors" per session are the most precise record of what the controller receives and echoes. A simulator can be regression-tested by replaying the `Outgoing data` lines from a real log and comparing its echo/`A`/`PRINT` stream.

### 7.4 Recommendation for SIM-007

Go ahead with a narrow first slice on **99407519** (Testkit), because it is the template Emulate covers least:

1. A protocol + interpreter covering only the 15 live programs plus the inline and dynamic sites, verified by replaying the 7 Oct log's outgoing programs.
2. A world model limited to the single-sensor gripper, decapper bellow, motors 0/1/13/14/16, shaker sensors 2.8/2.9 and home sensor 1.3.
3. Replay the 7 Oct analysis in Normal mode on a virtual COM pair, with a scenario that removes the PHRA tubes, so that error 121 → method 64 drives `00x0J` → recap → put-back end to end. That is the RB-418 proof that Emulate could not give.

Defer `GRIP`, `READLEVEL` and `MOTOR(8)` until a firmware answer arrives; none of them is on the 99407519 path.
