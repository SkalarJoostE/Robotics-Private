# SSO-35 / 99444701 — tray handover (open)

> **Status 2026-09-24:** order created on SVN; tray work done locally on the home PC but **deliberately not
> committed** — waiting for the real SP526 tray dimensions. Redo it on the work PC with the commands below
> once the geometry is confirmed. Delete this note when the trays are committed and logged.

## What exists on SVN

| Rev | What |
|---|---|
| r40094 | `trunk/99444701 CAN SP2000-2 Dual pH EC in soil` — `svn copy` of `99441966 FIN SP2000-3 Dual pH EC in soil` @ **r40080** ("Commit after installation") |
| r40095 | app folder renamed `99441966 266681` → `99444701 2xxxxx` (serial not in any SSO-35 document) |

Nothing else was committed. Check out with `Tools&Scripts\fetch-project.ps1 -SearchTerm 99444701 -NoVerify`.

## Why the trays are not "one tray less"

99441966 uses order-specific racks for larger cups: 3× `4x9` / `fixed4x9` (RackDefinition pitch 48 mm) + `fixed2x7`
standard rack. SSO-35 (SPDQ, packing list, quote) orders different hardware:

- 2× **Tray SP526 – 60 positions** (210893128) — grid assumed **6x10**, NOT confirmed (could be 5x12)
- 1× **Calibration rack SP526 – 18 pos.** (210920462) — **2x9** per engineer
- SP526 50 ml vials

No order in the workspace has rack types for these.

## To confirm tomorrow

1. Cup grid of the 60-pos tray (cols across X × rows deep).
2. Cup pitch X/Y of both racks (mm) — goes into `RackDefinition.XDistance/YDistance` (0.1 mm units, currently
   still 480 from the Finnish tray). The designer pitch (30 mm) is only visual.

## Redo recipe (what was done and verified on the home PC)

Run from the repo root, `$sw = "99444701 CAN SP2000-2 Dual pH EC in soil\99444701 2xxxxx"`. Substitute the
confirmed grid if it is not 6x10.

```powershell
.\Tools&Scripts\Add-TrayType.ps1 -SoftwarePath $sw -Name 6x10 -Columns 6 -Rows 10 -XDistance 30 -YDistance 30 -CupDiameter 28 -TrayCount 2 -DraggableInstances 0 -FixedInstances 0 -KeepRobotSize
.\Tools&Scripts\Add-TrayType.ps1 -SoftwarePath $sw -Name 2x9 -Columns 2 -Rows 9 -XDistance 30 -YDistance 30 -CupDiameter 28 -Variant Fixed -TrayCount 1 -FixedInstances 0 -KeepRobotSize
.\Tools&Scripts\Set-TrayLayout.ps1 -SoftwarePath $sw -Racks 6x10=2,fixed2x9=1 -NoInstances   # dry-run first with -WhatIf
```

Result: both layouts = 2 sample trays (x 20) + 2x9 (x 400), y 20, canvas 625×500 → 487×443.

Then the hand edits the tools leave to a human (done by a scratch script; reproduce it):

| File | Edit |
|---|---|
| `SkalarPacks\SkalarPack.Positioning.Tables.xml` | `RackDefinition` SAMPLE #1,#2: `XPositionAmount` 4→6, `YPositionAmount` 9→10; **delete** SAMPLE #3; STANDARD #1: `YPositionAmount` 7→9 (X stays 2). Set `XDistance`/`YDistance` to the measured pitch. `Position`: **delete** SAMPLE rack 3 rows for GROUP: PH (uid 4) and GROUP: EC (uid 13). |
| `Applications.{Soil,Soil2Day,Waters,Calibration,PumpCalibration}.Tables.xml` | `msprop:TableRackType1`: `4x9`→`6x10`, `fixed4x9`→`fixed6x10`, `fixed2x7`→`fixed2x9` (only what 99441966 itself had re-pointed; Flush/Park/SyringeCheck/SoilMeasurementAndBufferAddition keep their template racks, as on the reference) |
| `Applications.TreeDatabase.Xml` (`UnboundTrays`) | A1–A100 `4x9`→`6x10`; B1–B2 `fixed4x9`→`fixed6x10`; **delete B3**; STD `fixed2x7`→`fixed2x9` |

Keep BOM + CRLF when editing. Verify with `Check-ManipulatorGeometry.ps1 -SoftwareFolder $sw -Groups "GROUP: PH","GROUP: EC"`
(was clean). Then open both robot layouts in the app, press **Build**, and check the Calibration / PumpCalibration
`SampleAnalysis` (still 108 rows = 3×36) and `CalibrationStandards` (14 = 2×7) are regenerated for the new racks —
on 99441966 the app did this itself when the binding changed.

## Lab setup items (not tray work, not done)

- `DeviceConfiguration.DeviceID` still `SP2000-3`, robot serial `266681`; `ApplicationInfo.txt` still "SP2000-3, sn: 266681"
- Finnish calibration data: EC `SlopeCC` **0.469** (fitted cell constant), meter serials, calibration history
- Taught positions/heights are the Finnish machine's
- Quote title says **Metrohm** meters; SPDQ + packing list say 4× Consort C6010 (matches the software) — documents contradict

B-feature (move down while stirring) and the pH/EC pairing fixes (r39832, r39844) come along with the r40080 copy — nothing to port.
SSO bundle: `B-System Approvals\SSO-35 99444701 SP2000-2 Dual pH,EC, Soil - Croptimistic Technology Inc - Canada\`.
