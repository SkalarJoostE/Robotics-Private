# Installer USB Builder — Plan

> **Status: PROPOSED.** Created 2026-10-02 as a side project split off the Lab rollout conversation.
> Nothing is built. Phase 0 (ground truth) was started on 2026-10-02: the reference USB, the template
> folder, the 99435554 order folder and 40 recent order folders were inspected read-only. The
> findings are in **Phase 0 findings** below. Joost's answers of the same day are under **Decisions**.
> What remains is the list of questions for a Lab session (L1–L7).
> Owner: Joost. Users: Lab.

## Why

Every robot ships with an installer USB: the software, documentation, certificates, drivers and service
tools for that specific system. The Lab builds it by hand from a template folder, and doesn't enjoy it.
It is a fixed procedure with per-system choices: the right content depends on the template, the meters
and the tests. That kind of procedure can be scripted.

It also solves a problem in the Lab rollout. The planned log copy job on the robot PC copies `Log\`
to a network share so a lab laptop can read it. That job **must be removed before the PC ships**, and
the removal can't depend on someone remembering it. Making it a mandatory step of the delivery tool,
checked and recorded in a delivery report, takes the reliance on memory out.

## Facts established

- **Where it runs.** About 70% of orders ship with a PC on which the Lab installed the software; the
  other 30% are tested on internal PCs. **An installer USB is made in every case.**
- **The existing procedure** is `How to make an installer V2.4.pdf` (December 2022; a copy sits in the
  root of the template folder). It is **out of date**:
  - the titrator steps (Titrino 848 USB preparation, SI Analytics backup) are believed to be no longer done;
  - the reference USB already differs from it in several places (see Phase 0 findings).
- **The core has a "Prepare for delivery" menu item** (`robotics-core\SkalarRobotics\MainForm.cs:2502`).
  It deletes `Analyses`, `DeletedAnalyses`, `Log` and `Backup XML Files` from the application folder,
  and nothing else. **It is never used.** The tool should make it redundant.
- **Software source:** a fresh SVN checkout of the order, zipped. Nothing is reset or removed before
  zipping beyond what a fresh checkout already excludes.
- **Core / plugin source:** the core is the order's own `bin`; the installer (= plugins) is always the
  latest released plugin (D1).
- **Per-order certificates and run data:** the order folder, for example
  `\\fileserver\Orders\01. Orders\99435554 Portugal ROB`.
- **Template folder:** `\\fileserver\Orders\16. USB sticks\Robotics` (the guide's `L:\16. USB sticks\Robotics`).
  The Lab copies the whole folder to the USB, then deletes what doesn't apply and adds what's missing.
- **USB volume label:** `SKR` + the robot's 6-digit serial number (guide §3). 9 characters, within
  the 11-character FAT32/exFAT label limit.
- **Not found on Confluence:** a search of the Robotics spaces and SPDKB on 2026-10-02 found no
  installer, USB or delivery procedure. The PDF is the only written procedure.

### Established in Phase 0 (2026-10-02)

- **"SkalarPackage" is the Robotics Plugin release.** `\\build\Release\Robotics Plugin\Robotics Plugin
  1.79.4 Release.zip` contains exactly `Application\`, `Core\` (both empty) and
  `SkalarPackageInstaller.exe`. That is the skeleton of `01. Skalar Robotics Access`. The installer's
  file version is the plugin version (template copy 1.79.3.0; reference USB 1.78.2.0).
- **`\\build\Release\Robotics Core\<ver> Release.zip` has the same layout as the USB's `Core\bin.zip`**
  (`bin\Release\…`, 206 entries in both). Recent releases are in `…\Archive`; older ones are in the
  historical archive on `\\fileserver\Data RnD\_ARCHIEF R&D\4.PC Software\Historisch\Robotics\`.
- **The order software states its own versions and template.** Inside the application zip:
  - `binAndPluginsInfo.txt` gives `Bin: 1.142.0.0` and `Plugins: 1.78.3.0`;
  - `ApplicationInfo.txt` gives the template name (`Testkit`), frame and serial
    (`SP2000-3, sn:266643`), order and country (`99435554-PT`), and a date that was never filled in
    (`DD-MM-YYYY`).
- **The meter is derivable from the tables, and so is its serial.** `DeviceConfiguration` in
  `99435554 Profile.md` has `HachDR900`, serial `2056926`, which is exactly the certificate
  `DR3900 serial 2056926.pdf`.
- **The test kits are *not* derivable from the tables.** `MultitestRangeType` is a catalogue of
  32 Hach kits with no "in use" flag. The committed `SampleAnalysis` holds 96 leftover rows, all
  `COD LCK 1414`, while the system was certified for LCK 1414 **and** APC 114. Kit `MethodType`
  rows are all `Enabled=false`. **The signed certificate file names are the only reliable record of
  what was tested.**
- **The Lab makes two backups the guide doesn't describe as such:**
  - `<order folder>\Data\Analyses.zip` holds `Analyses` only (11.9 MB), not the whole software
    folder that guide §2.1 asks for;
  - `<order folder>\Installer Backup\<free name>.zip` is a full copy of the USB (385 MB for 99435554).
    It exists on 7 of the 11 most recent robot orders, under seven different names
    (`Installer_Backup.zip`, `backup installer.zip`, `IinstallerBackUp.zip`, `9445669 installer.zip`, …).
- **The order folder's `Pictures\`** holds 6 photos for 99435554 (`Brug`, `Manipulator`,
  `Meter & warmte blokken`, `Rekjes`, `Robot geheel`, `Serienummer robot`). The guide §6.1 list has 9
  subjects. The left and right sides of the cabinet and the back are absent.
- **No log copy job spec exists yet.** `Rollout\Access-and-Feedback-Loop.md` §4 specifies
  Claude-session capture hooks on colleagues' machines, not a scheduled task on a robot PC. No file
  under `Rollout\` mentions copying `Log\` to a share. Parked until the job is built (D6).
- **Other places checked and ruled out as sources:**
  - `\\fileserver\Orders\Orders USBs` and `USB SFA` are SFA/BV only.
  - `12. Method Entry\ROB` stops at July 2025 (99431085) and has no 9943555x+ orders.
  - `04. Certificates\Template\ROB` holds the Word templates for the test certificates (BOD, EC,
    Multitest Cal+QC, Multitest QC, pH, Turbidity) and no meter certificates.

Evidence: the reference zip (`Installer_Backup.zip`, identical in size to the copy in the order
folder's `Installer Backup\`), a fresh checkout at `99435554 POR COD testkit\` in this workspace, and
read-only listings of the share.

## Reference installer: 99435554 (Testkit / COD, serial 266643)

43 entries (30 files), 391 MB. Source: `Installer_Backup.zip`, made 2026-02-04. The **rule** column
is a *proposed* derivation, revised by Phase 0. It is not established.

| Path on USB | Comes from (verified) | Proposed rule (revised) |
|---|---|---|
| `01. …/SkalarPackageInstaller.exe` (184 MB) | Template folder's stale copy: **1.78.2.0**, while the order runs plugins **1.78.3.0** and the latest release is 1.79.4 | **Latest released plugin** from `\build\Release\Robotics Plugin\` (D1), never the template folder's copy |
| `01. …/Application/99435554 266643.zip` | Fresh checkout; the zip is named after the folder. That is what "Send to → Compressed folder" produces | `<order> <serial>.zip`, with one top folder `<order> <serial>/` (D3) |
| `01. …/Core/bin.zip` | `bin` of the fresh checkout (`bin/Release/…`) | Always. **Beta check:** if no `Robotics Core <bin version> Release.zip` exists in the release folder, its archive or the historical archive, flag it as not a release |
| `02. Documents/Manual RoboticAccess August 2023.pdf` | Template folder | Always |
| `02. Documents/SP2000 Parts and Accessories August 2023.pdf` | Template folder | Always |
| `02. Documents/Master Manual SP2000 Test kit October 2023.pdf` | Template folder | **By `ApplicationInfo.txt` template name**, through the rules table. The names don't match 1:1 (`Manual SP2000 BOD Nov 2023 II`, `COD & Permanganate`, `Weighing`) |
| `02. Documents/Meter and Probes/Hach/Hach DR3900 UserManual.pdf` | Template folder | **By `DeviceConfiguration.DeviceID`** (`HachDR900`) through the rules table. Not the whole `Hach\` folder: it also holds `TU5200` |
| `03. Certificates/CE declaration of conformity SP2000 v1.0.pdf` | Template folder | Always |
| `03. Certificates/DR3900 serial 2056926.pdf`, `Hach Locator 2022133.pdf` | **Not in the order folder, and source unknown** | By device. The serial can be checked against `DeviceConfiguration.SerialNumber` once the source is known (L2) |
| `03. Certificates/Robotic Certificate 3-99435554-0N <test>.pdf` (×2) | `Undersigned docs\certificates undersigned\` (signed). **Not** `Certificates\`, which holds the unsigned `.doc`/`.pdf` drafts under other names | `Robotic Certificate 3-<order>-*.pdf` from that folder. Anything else there (`Oud.pdf`, `Thumbs.db`) goes under *to check*. **None found = clear warning** (D5) |
| `04. Drivers/ChipiX driver.zip` | Template folder | Always |
| `04. Drivers/CP210x_Universal_Windows_Driver.zip` | Template folder | **Always** (D4) |
| `04. Drivers/hach_setup_amd64.exe` | Template folder | By device: Hach |
| `05. Tools/auto-oplijnen/…`, `05. Tools/SPD tools/…` | Template folder | Always. **But the template also has `05. Tools/LoupeClient.exe` (62 MB) and this USB doesn't**, so "whole folder" is wrong or the Lab deletes it (L1) |
| `06. Methods/LCK114 COD 150 - 1000mgl.pdf`, `LCK1414 COD 5 - 60 mgl.pdf` | **Source unknown.** The template's `06. Methods` is empty, and the order folder's `Methods\` holds unrelated Alkalinity & Acidity PDFs from 2021 | By test kit, **taken from the certificate names**. The mapping is not literal: the `APC 114` certificate got the `LCK114` PDF (L3) |

**Not on this USB, but in the guide:**
- the installation manual, which the guide makes mandatory and which **the template folder doesn't
  hold either** (L4);
- the `Drawings` and `Pictures` subfolders;
- any additional-information manual from the order's `02. Documentation\08. System documentation`;
- the special documents (Korean BOD calculation, CalCheck V3, Clay Fraction method/sensor docs).

**In the template but not chosen for this USB:** 8 other master manuals, `PBF Manual v2.pdf`,
`Barcode Manual DM4000.pdf`, the Domino printer documents, and the meter folders for Consort,
Metrohm, Mettler Toledo, MN, Orion, Sentix, Titrino, WTW and YSI. The template root also holds files
that must never be copied: `How to make an installer V2.4.pdf`, `G50i_Printer_ Setup.pdf` (a
duplicate of the one under Domino) and `Thumbs.db`.

## Phase 0 findings: where the proposed rules are weak

1. **The template folder is not a clean source, so "copy it whole, then prune" is the wrong model.**
   Its root holds the guide itself, a stray printer PDF and `Thumbs.db`. Its installer copy goes
   stale between hand updates; it was stale when this USB was made. Its `06. Methods` is empty, and
   it carries a 62 MB `LoupeClient.exe` the USB left out. **Proposal: an allowlist.** The tool
   includes only what a rule names; everything else in the template is ignored, and the report lists
   it. Copying and pruning would make every stray file in the template a USB defect.
2. **The installer and core belong to the build server, not the template.** The reference USB's
   installer (1.78.2.0) is *older* than the plugins the system was tested with (1.78.3.0). Neither
   proposed rule in the original Q1 was followed: it was simply whatever was in the template
   that day. **Decided (D1): always the latest released plugin**, read from the build server, so the choice and
   the staleness both disappear.
3. **"Derive, don't ask" works for the template and the meters, not for the tests.**
   - The template comes from `ApplicationInfo.txt`.
   - The meter, and its serial, come from `DeviceConfiguration`.
   - Test kits can't come from the tables. The kit table is a catalogue, `SampleAnalysis` is
     leftover lab data covering one of the two certified kits, and the kit `MethodType` rows are
     all disabled.
   - **The signed certificates are the record of what was tested**, so the methods rule should key
     off them, and an order without certificates gets no method PDFs.
4. **The profile can mislead the documents rule.** `Profile.md` reports `PaperbandFilterConfiguration`
   "1 of 1 enabled" on this test-kit system, which has no paperband filter: the table has no
   `Enabled` column. A PBF-manual rule built on the profile would put the wrong manual on every
   test-kit USB. Before any rule uses a table, check that the table has a real enable signal, and
   fix `Extract-SystemProfile.ps1` so it doesn't report "enabled" for tables without one.
   **Fixed 2026-10-06.** The diagnosis above was half right: the table *does* have an `Available`
   column in its schema, but no row sets it, and a DataSet leaves a null cell out of the XML. The
   script read "no value in this row" as "no enable column" and counted the row. It now takes the
   flag from the table's inline schema and counts an empty flag as off, which is how the runtime
   reads a null boolean (`SkDataRow.Field<T>` returns `default(T)`). 99435554 now reads
   "0 of 1 enabled", as do the 27 other checked-out orders and templates that had the same false
   PBF. Every `PaperbandFilterConfiguration` checked has the `Available` column, so the PBF rule
   can use it. Tables that really have no flag (`MotorConfiguration` on six older orders,
   `DeviceConfiguration` on 99341889) are now headed "N rows, no enable flag".
5. **Device IDs aren't document names.** `HachDR900` → `Hach DR3900 UserManual.pdf` needs an explicit
   row in the rules table, keyed on `DeviceID`. A folder-per-brand rule would add TU5200 to a
   DR3900 system.
6. **Certificates have a usable pattern, if the folder is right.**
   - For the robot orders sampled (99444892 … 99446786), signed test certificates are named
     `Robotic Certificate 3-<order>-NN[,] <parameter>[ Probe <serial>].pdf` in
     `Undersigned docs\certificates undersigned\`. The prefix `3-` is robots; `1-` (SFA) and `5-`
     (BV) are other product lines.
   - Separators drift (`3-99445669-04, UV in Waters`), so match on the prefix
     `Robotic Certificate 3-<order>-`.
   - Three recent robot orders (99445849, 99446247, 99446786) have **no** signed certificates. One
     of them (99446247) already has an installer backup, so either USBs ship before the certificates
     are signed or the certificates sit somewhere else. The tool must treat "no signed certificates"
     as a **clear warning** (D5), never as a silent omission.
7. **The backups the Lab really makes aren't in the plan.** `Data\Analyses.zip` and
   `Installer Backup\*.zip` are the real practice. They should become fixed steps with fixed names
   (proposed: `Data\<order> <serial> Analyses <yyyy-MM-dd>.zip`, and
   `Installer Backup\<order> SKR<serial> <yyyy-MM-dd>.zip`). The backup must also cover everything
   "Prepare for delivery" would delete. Today `Log`, `DeletedAnalyses` and `Backup XML Files`
   aren't backed up at all (L7).
8. **The log-copy-job removal can't be designed against a spec that doesn't exist.** The removal
   step needs a contract the job must follow, so that the delivery tool can find it with certainty:
   a fixed scheduled-task name and path, a fixed script location, any stored credential or mapped
   drive, and a marker file. Proposal: **this plan defines that contract**, and the log-copy job is
   built to it. The tool then removes the job by identifier. It also does a defensive sweep and
   reports any other scheduled task that references the application's `Log\` folder or the share
   path. **Parked (D6)** until the job is built.
9. **The application zip carries lab state.** A fresh checkout includes whatever the Lab committed:
   here, 96 `SampleAnalysis` rows and an unfilled `ApplicationInfo.txt` date. The plan's "nothing is
   reset" fact stands. The guide's pre-commit checks are therefore the only guard, and the report
   surfaces them (D9). The unfilled date is accepted and is not checked.
10. **Pictures can be counted, not judged.** The tool can report how many photos `Pictures\` holds
    against the guide's 9 subjects. It can't tell whether the bridge plate is among them.

## Design principles

1. **A plain tool, not an AI feature.** It runs on the robot PC or an internal PC, where Claude is not
   available. Claude helps build and maintain it.
2. **An interactive UI over a scriptable engine** (D10). The Lab gets a window that walks the
   delivery step by step. Underneath, every step is a PowerShell function that can also be run on
   its own, with the same safety shape as the workspace's existing tools (`Update-Core.bat`,
   `Import-CustomerSoftware.bat`):
   - a read-only plan first, then an explicit yes, then writes;
   - `-WhatIf` on every write.

   Phases 1–2 can run as plain scripts. The UI is needed by Phase 3.
3. **Rules in one table, not in code.** A single data file maps template / device ID / test kit to
   documents, drivers, certificates and methods. Joost maintains it; the Lab can read it.
4. **Derive, don't ask.** The template comes from `ApplicationInfo.txt`; the devices and their serials
   from `DeviceConfiguration`; the core version from `binAndPluginsInfo.txt`; the tested kits from the
   signed certificate names; the serial from the folder name. The operator only confirms.
5. **Allowlist, not copy-and-prune** (finding 1). Nothing reaches the USB unless a rule names it.
6. **Fixed order of steps.** Back up and collect before anything is deleted. The core's own cleanup
   destroys the run results the backup needs.
7. **A delivery report on the USB** (and in `Installer Backup\`): what was included, from where, at
   which SVN revision and core/plugin version; what was missing; what is *to check*; what was
   removed, including **"lab log copy job: removed ✔"**.
8. **Better nothing than wrong** (the guide's rule for methods). When a rule can't pick a document
   with confidence, the tool leaves it out and lists it under *to check*. It never guesses.

## Proposed phases

| Phase | Delivers | Writes |
|---|---|---|
| **0 — Ground truth** | *Started 2026-10-02.* Confirm today's real procedure with the Lab (the guide is from 2022). Collect 2–3 more reference USBs; the `Installer Backup\` folders make this cheap. Good candidates: 99444892 / 99445277 / 99445861 (BOD), 99445669 (Waters, five parameters), 99445796 (Soil pH/EC). Derive the rules table from them | Nothing |
| **1 — Manifest only** | `<order>` → "this is what the USB would contain, from where, and what's missing". Run it on the reference orders and diff it against their `Installer Backup\` zips. No need to wait for the Lab to make a new USB | Nothing |
| **2 — Build to a folder** | Same, assembled into a local folder; diff it against the hand-made USB | Local folder only |
| **3 — Full delivery (interactive UI)** | Write to the USB and set its label, write the backups to the order folder, run the pre-commit checks (D9), run the cleanup (plus removing the log copy job, once it exists), then orchestrate the second check (D8). Write the delivery report | USB, order folder, the PC being cleaned |

## Decisions (Joost, 2026-10-02)

| # | Question | Decision |
|---|---|---|
| D1 | Which `SkalarPackageInstaller.exe` | **The latest released plugin**: the single `Robotics Plugin <ver> Release.zip` in `\\build\Release\Robotics Plugin\` (not `Archive\`). `SkalarPackageInstaller` does install the plugins. The template folder's copy is never used. The report records the installer version next to the order's own `Plugins:` line, for information only |
| D2 | Allowlist instead of copy-and-prune | **Agreed in principle.** What the allowlist contains is to be settled with the Lab (Lab session, L1) |
| D3 | Application zip name | **`<order> <serial>.zip`** for now (what "Send to → Compressed folder" produces). The guide's long form was the original design, but it is no longer used. The SVN revision goes in the report |
| D4 | CP210x driver | **Always** |
| D5 | No signed certificates found | **Clearly warn.** Never block, never a silent omission. The warning is at the top of the plan output and of the delivery report |
| D6 | Log copy job | **Not built yet; out of scope until it is.** The removal step and its contract (finding 8) are parked. Phase 3 picks it up only if the job exists by then |
| D7 | Cover-lock bypass location | `RobotSettings.BypassCoverLock` in `SkalarPack.Robot.Tables.xml` (`false` in 99435554). It appears twice in that file; check which row the application reads before building a check on it |
| D8 | Second check (guide §6) | **Still done, and the tool orchestrates it.** Last step: remove the software and uninstall SkalarPackage, so a second person can reinstall from the USB. The tool then guides that reinstall and records the outcome (who checked, whether the installed versions match the report) in the delivery report. It follows that **the tool must not run from the folder it removes**: it runs from the workspace, the share or the USB |
| D9 | Pre-commit checks (guide §2.2) | **Wanted, read-only, listed in the report:** `RobotSettings.BypassCoverLock` is off; only Analysis, Planner and Options are visible on the main screen; each application's default `Settings` row is listed for the Lab to confirm, since "right" can't be judged statically. **The `DD-MM-YYYY` date in `ApplicationInfo.txt` is fine and is not checked.** Not yet looked up: where the main-screen visibility is stored |
| D10 | Form of the tool | **An interactive UI**, not a `.bat` menu (principle 2) |

## Open questions

### For the Lab session

- **L1** What the allowlist contains: which template documents, meter folders and tools go on which
  system. Was `05. Tools\LoupeClient.exe` left off deliberately?
- **L2** Where the meter certificates come from (`DR3900 serial 2056926.pdf`, `Hach Locator
  2022133.pdf`), and what the "Hach Locator" is.
- **L3** Where the method PDFs live; whether the signed certificate names are the right record of
  the tested kits; and who owns the kit → PDF mapping (`APC 114` → `LCK114 COD 150 - 1000mgl.pdf`).
- **L4** The installation manual: the guide makes it mandatory, and neither the template folder nor
  the USB has it. Dropped, or missing from the template?
- **L5** What else is cleaned or reset on a PC that ships with the robot (70%), and whether the tool
  only makes the USB and the backups on internal PCs (30%).
- **L6** What the Lab does about titrator methods today (Titrino 848 USB, SI Analytics backup).
- **L7** The run-data backup. Guide §2.1 says to zip the Lab's whole *working* software folder (the
  copy on the test PC that holds the runs) into the order folder's `Data\`. For 99435554 only
  `Analyses` was zipped (`Data\Analyses.zip`). Should the tool back up only `Analyses`, or also
  `Log`, `DeletedAnalyses` and `Backup XML Files`? Those four are exactly what "Prepare for
  delivery" deletes, and the lab logs help with later service cases. Also: are the fixed backup names
  in finding 7 acceptable?
