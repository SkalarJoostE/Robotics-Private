# Installer USB Builder — Plan

> **Status: PROPOSED.** Created 2026-10-02 as a side project split off the Lab rollout conversation.
> Nothing is built. Phase 0 (ground truth) was started on 2026-10-02: the reference USB, the template
> folder, the 99435554 order folder and 40 recent order folders were inspected read-only. The
> findings are in **Phase 0 findings** below. Joost's answers of the same day are under **Decisions**.
> **2026-10-06:** five more USBs mapped from their `Installer Backup\` zips (99444892, 99445277,
> 99445861 BOD; 99445669 Waters; 99445796 Soil), read-only. The meter certificates and method PDFs
> now have known sources, findings 11–19 are new, a **draft rules table** exists, D1 is revised
> (the order's own plugin version) and D5 is confirmed.
> Per-order maps: `Installer USB Builder - Reference USBs\usb-map-<order>.md`.
> **2026-10-07:** the UI and the Lab's workflow are designed (**How the Lab uses it**, U1–U13), plus
> a side function for R&D's own software-upgrade USBs (U14–U17, Phase 2b).
> What remains: J2 (Joost and a colleague), U-a to U-d, and a Lab session (L1, L3–L9).
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
  - `12. Method Entry\ROB` stops at July 2025 (99431085) and has no 9943555x+ orders. *(Corrected
    2026-10-06: it does hold byte-identical copies of the method PDFs still shipped, e.g.
    `Skalar Method BOD.pdf`, but it is not their source; see below.)*
  - `04. Certificates\Template\ROB` holds the Word templates for the test certificates (BOD, EC,
    Multitest Cal+QC, Multitest QC, pH, Turbidity) and no meter certificates.

### Established in Phase 0, part 2 (2026-10-06)

- **Meter and diluter calibration certificates (L2, answered)** come from
  `\\fileserver\Data\Order Serienummers\Serie nummers Skalar apparatuur\1088 SP2000 Robot\<robot serial>\`.
  Every one of them on all six USBs matches by name and size. That includes 99435554's
  `DR3900 serial 2056926.pdf` and `Hach Locator 2022133.pdf` (folder `266643`).
  - Meter certificates are named `<brand> <model> serial <serial>.pdf`. Every serial checked equals
    `DeviceConfiguration.SerialNumber`, so the tool can **verify** them, not only copy them.
  - The Hamilton PSD/6 diluter certificate is named `PSD6<serial>.pdf`. `DiluterConfiguration` has
    no serial column, so this one can be copied but not cross-checked.
  - The folder also holds files that were **not** copied: `TEIWorkSheetFile*.teiwsf`, and on 266643
    `266643ST.pdf` and `266643_Heater_ST.pdf` (L8).
- **Method PDFs (L3, mostly answered)** come from `\\fileserver\Data\master methodes nieuw\ROB\<Rnnn parameter>\`,
  for example `R232 Biochemical oxygen demand (BOD)`, `R278 Conductivity` and `R485 …` (pH).
  - The COD kit PDFs are sha-identical to `\\fileserver\Data\Lab\Robotics\External manuals\Hach\LCK114.pdf`
    and `LCK1414 COD.pdf`, renamed on the USB.
  - The Lab doesn't copy whole R-folders: `R485-522 … GOST methods.pdf` was left off. So the rules
    table names the files.
  - No colour, UV or turbidity method PDF exists. The rules table needs explicit "no method" rows.
- **The order's real template is in SVN, not `ApplicationInfo.txt`.** That file's template field is
  free text: `Dual BODD`, `BOD`, `BOD Wheaton`, `pH EC with 3 x filling needles`. The order's SVN
  copy-from path (`/templates/Template BOD/…`, `/templates/Template Soil/…`) is reliable.
- **Every `bin.zip` on the five USBs is a real core release** (1.143.2 / 1.143.5, all in `Archive\`).
  The only extras are the runtime `.store` files and `lastprj.txt`.
- **Every installer on the five USBs is 1.79.3.0**, sha-identical to the template folder's copy and
  equal to each order's own `Plugins:` line (see finding 15 and D1).
- **The volume label leaves no trace.** `SKR266694` appears only in one backup zip's file name.
- **`Pictures\` held 7, 9, 9, 12 and 14 files**, against the guide's 9 subjects.

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

## Reference installers 2–6 (2026-10-06)

Mapped read-only from each order's `Installer Backup\` zip against the template folder, the order
folder, the serial-number folder and a checkout. Full file-by-file tables:
`Installer USB Builder - Reference USBs\usb-map-<order>.md`. The share was compared before and after
the mapping: unchanged.

| Order | Template (SVN) | App zip vs SVN | Signed certs on USB | Meter / diluter certs | Methods | LoupeClient | `Data\` backup |
|---|---|---|---|---|---|---|---|
| 99435554 | Testkit | fresh checkout | 2 of 2 | DR3900, Hach Locator | 2 LCK (renamed) | no | `Analyses` only |
| 99444892 | BOD, SP2000-5 | **working copy** (r39925 + 650 `Backup XML Files`) | 2 of 2 | 2 × WTW 9310, PSD6 | BOD | yes | **whole working folder** (266 MB: `.svn`, `bin`, `Log`, `Backup XML Files`), plus an installation-time USB backup in `Installation papers\` |
| 99445277 | BOD (Wheaton), SP2000-5 | **working copy** (`Backup XML Files`, `AddIns.store`) at r39985 = HEAD | 2 of 2 | PSD6 only; none for either YSI meter | BOD | no | **both**: full working copy (884 MB) and `Analyses.zip` (10.6 MB) |
| 99445861 | BOD, SP2000-3 | exact r39942; SVN moved on (r39944, r39974) | 1 of 1, **but the superseded version** (re-signed 08-21, after the USB) | WTW 9310 | BOD | no | `Analyses` only |
| 99445669 | Waters, SP2000-2 | r40048; SVN moved on the next day (r40049 "Installer version, Color Call removed", r40050) | **0 of 5**, though all five were signed 8 h before the zip | 2 × Consort C6010, TU5200, NanoColor UV-VIS II | EC, pH (none exists for colour, UV, turbidity) | no | whole working folder (`Analyses`, `Backup XML Files`, `Log`) |
| 99445796 | Soil, SP2000-3 | exact, final commit | **0 of 2**, though signed 5 days before | 2 × Consort C6010 | 4 (pH, EC, R485-122, R278-122) | yes | `Analyses` only |

Further observations, per order in the map files:
- 99444892 got only `wtw_9310_Multi_Meter.pdf`; 99445861, with the same meter, got the whole `WTW\`
  brand folder, including EC and pH probe documents it has no use for.
- 99445669 carries `How to make an installer V2.4.pdf`, `G50i_Printer_ Setup.pdf`,
  `Barcode Manual DM4000.pdf` (no barcode reader) and `Consort C3210 - C3230.pdf` (not its meter).
  Per-device pruning did happen inside `Hach\`: TU5200 kept, DR3900 dropped.
- 99445796 got both the Soil and the Waters master manual, and its application zip is named
  `99445796ZAF SP2000-3 pH EC in soil 266699.zip`, which breaks D3. Its top folder is the expected
  `99445796 266699/`.
- 99445277's backup zip has an extra `Installer backup/` folder around the six standard folders. It
  carries the YSI 4010-1W documents but not the 2W ones, although `YSI Multilab 4010-2` is enabled.
- The PBF manual was correctly left off 99445796, whose profile then read "1 of 1 enabled". That is
  finding 4 again, fixed since in `aaec87f`.

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

Findings 11–19 come from the five additional USBs (2026-10-06).

11. **The template comes from SVN, not `ApplicationInfo.txt`.** That field is free text (`Dual BODD`,
    `BOD Wheaton`, `pH EC with 3 x filling needles`). The tool reads the order's SVN copy-from path.
    Design principle 4 is amended to match.
12. **The Lab sometimes zips the working copy.** In 2 of 5 cases (99444892, 99445277) the application
    zip carries `Backup XML Files` and runtime `.store` files. The tool's fresh-checkout rule fixes
    this by construction. But a fresh checkout is not clean either: **every BOD order carries the
    versioned AI `docs/` knowledge base** (13 markdown files, including `PENDING.md`), inherited from
    the template. `svn status` confirms it is versioned in all five BOD checkouts in the workspace,
    and on 99445277's USB it went to the customer. See J2.
13. **Missing signed certificates is the most common real defect.** 2 of 6 USBs (99445669: 0 of 5,
    99445796: 0 of 2) shipped without them, although the signed PDFs were already in
    `certificates undersigned\`. This is exactly the silent omission D5 is meant to prevent. A
    warning would have caught both. It stays a warning (J3, D5), because it is not known whether
    some systems legitimately ship without certificates (L9).
14. **A USB can go stale after it is made.**
    - 99445861's USB holds the superseded certificate: its bytes match `Oud.pdf`, re-signed 08-21.
    - SVN moved on after the USB on 99445861 and on 99445669, where the next-day commit message is
      "Installer version, Color Call removed".
    - So an `Installer Backup\` zip is not proof of what shipped (L9). The delivery report should
      record the SVN revision and each certificate's hash and date. A cheap Phase 1 by-product: a
      **re-check mode** that compares an existing backup against the order's current state.
15. **D1 would have shipped an untested plugin.** All five USBs carry 1.79.3.0, equal to the orders'
    own `Plugins:` line. 1.79.4 was released on 2026-09-07, so on 99445669 (09-09) and 99445796
    (09-16) "latest" would have put a plugin version on the USB that the system was never tested
    with. **D1 revised accordingly (J1).**
16. **The Hach driver is treated as "always".** It is on all six USBs; only two systems have a Hach
    device. One small file, so following practice costs nothing (rules table: always).
17. **Brand-folder copying and leaks confirm finding 1.**
    - `WTW\` was copied whole on one USB and as a single file on another.
    - Stray template files leaked onto 99445669.
    - A Waters manual landed on a Soil USB.
    - `LoupeClient.exe` is on 2 of 6 USBs.

    No rule produces this; an allowlist removes it.
18. **The conventions drift; the tool fixes them by construction.**
    - The application zip name broke on 99445796 (D3).
    - One backup zip has a wrapper folder.
    - Calibration certificates sit in `03. Certificates\Certificate of Calibration\` on the BOD USBs,
      and directly in `03. Certificates\` on 99435554 and 99445796.
    - The backup zips have six different names.

    Proposal: the BOD subfolder for calibration certificates everywhere (L1).
19. **Free cross-checks the tool can report.** Each one turned up a real inconsistency:
    - The meter serial in each `… serial <n>.pdf` against `DeviceConfiguration.SerialNumber`.
    - The probe serial in the signed certificate name against `Probes.SerialNumber`. On 99445861 the
      certificate says `Probe 26241375`, which is the meter's serial; `Probes` says 26160774.
    - Read certificates only from `certificates undersigned\`. The drafts of 99445861 carry a swapped
      order number (99445816). Unsigned near-duplicates in `Results\Result and certificate pdf\` must
      not match either.

## Draft rules table (from six USBs, 2026-10-06)

The proposed content of the rules data file (principle 3). The **Basis** column says how much
evidence backs each row: *practice 6/6* means all six USBs agree, *Lab* means it waits on a Lab answer.

| Key | Puts on the USB | Source | Basis |
|---|---|---|---|
| always | `Manual RoboticAccess …`, `SP2000 Parts and Accessories …` | template `02. Documents` | practice 6/6 |
| always | `CE declaration of conformity SP2000 v1.0.pdf` | template `03. Certificates` | practice 6/6 |
| always | `ChipiX driver.zip`, `CP210x_Universal_Windows_Driver.zip`, `hach_setup_amd64.exe` | template `04. Drivers` | practice 6/6, D4, finding 16 |
| always | `05. Tools\auto-oplijnen\`, `05. Tools\SPD tools\` | template | practice 6/6 |
| ? | `05. Tools\LoupeClient.exe` | template | 2/6 (L1) |
| always | `SkalarPackageInstaller.exe` at the order's `Plugins:` version | `\\build\Release\Robotics Plugin\` / `Archive\` / historical archive | D1 (revised), practice 5/5 |
| always | `Core\bin.zip` (beta check) and `Application\<order> <serial>.zip` | fresh checkout, as is (`docs/` stays in for now, J2) | D3, finding 12 |
| template **BOD** (SVN) | `Manual SP2000 BOD Nov 2023 II.pdf` | template | 3/3 |
| template **Testkit** | `Master Manual SP2000 Test kit October 2023.pdf` | template | 1/1 |
| template **Waters** | the Waters master manual | template | 1/1 |
| template **Soil** | the Soil master manual (the Waters one too?) | template | 1/1 (L1) |
| `HachDR900` | `Hach\…\Hach DR3900 UserManual.pdf` | template | 1/1 |
| `Hach TU5200` | the TU5200 manual | template | 1/1 |
| `WTW Multi 9310*` | `WTW\BOD\wtw_9310_Multi_Meter.pdf` (the probe documents?) | template | 1 of 2 USBs (L1) |
| `Consort C6010*` | `Consort C6010 - C6030.pdf`, `Consort C6010 - C6030_Manual.pdf` | template | 2/2 |
| `NanoColor UV/VIS II` | the 3 files in `MN Nano VIS II\` | template | 1/1 |
| `YSI Multilab 4010-1` | the 4010-1W quick start and manual | template | 1/1 |
| `YSI Multilab 4010-2` | ? | template | L8 |
| BOD with YSI probes | ODO cap guide, ProOBOD manual | template | 1/1; the probe make isn't in the tables (L8) |
| Waters / Soil pH–EC electrodes | the two Metrohm documents | template | the probe make isn't in the tables (L8) |
| each enabled `DeviceConfiguration` serial | `<brand> <model> serial <serial>.pdf`; **warn** when missing | serial folder `1088 SP2000 Robot\<serial>\` | 6/6, finding 19 |
| enabled diluter of type PSD6 | `PSD6*.pdf` | serial folder | 3/3 BOD |
| any other file in the serial folder | listed under *to check* | serial folder | L8 |
| always | `Robotic Certificate 3-<order>-*.pdf`; **warn** when none | `Undersigned docs\certificates undersigned\` | D5, findings 6, 13 |
| certificate `BOD` | `Skalar Method BOD.pdf` | `master methodes nieuw\ROB\R232 …` | 3/3 |
| certificate `pH` | `Skalar Method pH.pdf` | `master methodes nieuw\ROB\R485 …` | 1/1 |
| certificate `Conductivity` | `Skalar Method EC.pdf` | `master methodes nieuw\ROB\R278 Conductivity\` | 1/1 |
| certificate `pH in Soil` | `R485-122, pH in soil.pdf`, `Skalar Method pH.pdf` | `R485 …` | 1/1 (not the GOST PDF) |
| certificate `Conductivity in Soil` | `R278-122, conductivity in soil.pdf`, `Skalar Method EC.pdf` | `R278 …` | 1/1 |
| certificate `COD LCK 1414` | `LCK1414 COD.pdf` → renamed `LCK1414 COD 5 - 60 mgl.pdf` | `Data\Lab\Robotics\External manuals\Hach\` | 1/1 (L3) |
| certificate `COD APC 114` | `LCK114.pdf` → renamed `LCK114 COD 150 - 1000mgl.pdf` | same | 1/1 (L3) |
| certificate `Color`, `UV`, `Turbidity` | **no method** (explicit row, so it isn't reported as missing) | — | 1/1 |
| `PaperbandFilterConfiguration.Available` | `PBF Manual v2.pdf` | template | not yet seen on a USB (reliable since `aaec87f`) |
| never | `How to make an installer*.pdf`, root `G50i_Printer_ Setup.pdf`, `Thumbs.db`, `Barcode Manual DM4000.pdf` without a barcode device | — | findings 1, 17 |

## Design principles

1. **A plain tool, not an AI feature.** It runs on the robot PC or an internal PC, where Claude is not
   available. Claude helps build and maintain it.
2. **An interactive UI over a scriptable engine** (D10). The Lab gets a window that walks the
   delivery step by step. Underneath, every step is a PowerShell function that can also be run on
   its own, with the same safety shape as the workspace's existing tools (`Update-Core.bat`,
   `Import-CustomerSoftware.bat`):
   - a read-only plan first, then an explicit yes, then writes;
   - `-WhatIf` on every write.

   The window exists from Phase 1 (see **How the Lab uses it**).
3. **Rules in one table, not in code.** A single data file maps template / device ID / test kit to
   documents, drivers, certificates and methods. Joost maintains it; the Lab can read it.
4. **Derive, don't ask.** The template comes from the order's SVN copy-from path (finding 11; not
   `ApplicationInfo.txt`, whose template field is free text); the devices and their serials
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

## How the Lab uses it (UI design, 2026-10-07)

Worked out with Joost on 2026-10-07; the choices are recorded as U1–U12 under **Decisions**. The
starting point (U1): **the Lab only opens the tool when they are ready to make the USB.** So it is
not a dashboard to keep open during the build. It is one action, *Create installer*, followed by two
smaller ones that happen later: *Prepare PC for shipping*, and the second person's *Verify
installation*.

### Starting it

A `.bat` on the share opens the window (U2). There is nothing to install. It runs **on the robot or
test PC itself**, where the software was tested (U3), started from the share, never from the software
folder it will later remove (D8). That PC therefore needs to reach the share, `\\build` and SVN.
The tool checks all three first and says which one it can't reach, rather than failing halfway.

```
+--------------------------------------------------+
| Installer USB Builder                            |
+--------------------------------------------------+
| Order number:  [99445669        ]                |
|   99445669 Germany ROB                           |
|   sn 266698 . Waters . SP2000-2                  |
|                                                  |
| USB stick:     [E:  SanDisk 32 GB  "OLD"    v]   |
|                ! everything on E: is erased      |
|                                                  |
|        [ Check only ]   [ Create installer ]     |
|--------------------------------------------------|
| Later:  [ Prepare PC for shipping ]              |
|         [ Verify installation ]                  |
+--------------------------------------------------+
```

- **Order number:** typed or pasted. The tool shows the order folder, serial, template and frame it
  resolved, so a typo is visible before anything runs.
- **USB stick (U4):** a dropdown of **removable drives only**, pre-selected when exactly one is
  plugged in. Each entry shows its size and current label, so the Lab sees what will be erased.
  There is no stick choice in *Check only*.
- **Check only (U10)** runs the same process and opens the same results window, but writes no USB,
  no backups and deletes nothing. In Phase 1 it is the only enabled button. It stays afterwards, for
  example to check "are the certificates signed yet?" a few days before shipping.
- **The two *Later* buttons** are described below. They are disabled until their conditions are met.

### Create installer: the progress window

Every step has a spinner or a tick, plus a one-line result. *Show details* opens the full log of
what was fetched from where (U6).

```
+--------------------------------------------------+
| Creating installer - 99445669  SKR266698         |
+--------------------------------------------------+
|  v Network: share, build server, SVN             |
|  v Software checkout          r40050             |
|  v Core 1.143.2               release (Archive)  |
|  v Plugin installer 1.79.3    Archive            |
|  > Documents                  12 / 23            |
|    Certificates                                  |
|    Methods                                       |
|    Pre-commit checks                             |
|    ---------------- nothing written above ----   |
|    Backups to order folder                       |
|    Write USB                                     |
|    Verify USB                                    |
|    Report                                        |
|                                                  |
|  [ Show details v ]                [ Cancel ]    |
+--------------------------------------------------+
```

**Everything is collected and checked first, in a local staging folder (U5).** Only when nothing
critical is missing does the tool write the backups and then erase and write the stick. On *Failed*
the stick is untouched and no backup is written. *Cancel* is safe up to the line. After it, *Cancel*
is disabled and the run completes, because a half-written stick is worse than a finished one (as
built in Phase 2b).

The written half does this:
- **Backups** (U9) go to the order folder (finding 7): the run data on this PC, and a zip of exactly
  what goes on the stick.
- **Write USB:** erase the stick and set the label `SKR<serial>`.
- **Verify USB:** re-read every file on the stick and compare it with the staging folder.
- **Report:** the delivery report goes on the stick and in `Installer Backup\` (U12).

### The results window

There are three outcomes. Each item says what is wrong and where the tool looked.

```
+--------------------------------------------------+
|  WARNING - installer created                     |
|  USB E: SKR266698 written and verified           |
|  Backups saved to the order folder               |
+--------------------------------------------------+
|  ! No signed certificates found (0 of 5)         |
|      looked in: Undersigned docs\certificates... |
|  ? Metrohm electrode documents          [ Add ]  |
|  ? 266698ST.pdf (serial-number folder)  [ Add ]  |
|  i Plugin 1.79.4 is released; this system was    |
|    tested on 1.79.3 (installed: 1.79.3)          |
+--------------------------------------------------+
| [ Open report ]  [ Prepare PC for shipping > ]   |
|                                     [ Close ]    |
+--------------------------------------------------+
```

| Outcome | Meaning | Buttons |
|---|---|---|
| **Succeeded** (green) | Everything the rules name was found, the stick is written and verified | Open report, Prepare PC for shipping, Close |
| **Warning** (orange) | Installer created, but something should be looked at | Same, plus *Add* per *to check* item |
| **Failed** (red) | Something critical is missing. **Stick untouched, nothing backed up**; each item says what to fix | Open report, Retry, Close |

**Failed (U7)** means any of these:
- the SVN checkout fails;
- the order's core is not a release (beta check);
- the order's plugin version is in no archive;
- the stick is too small, a write fails, or the read-back differs;
- an enabled `DeviceConfiguration` device has no `… serial <serial>.pdf` in the serial-number folder;
- no rule names a manual for the template or for an enabled device. This is how a new meter type
  shows up: someone has to add it to the rules table.

**Warning** covers the rest:
- no signed certificates (D5);
- *to check* items (principle 8);
- a pre-commit check that needs a look (D9);
- a newer plugin release than the one installed (D1, for information).

**Items the tool can't decide (U8)** are left off the stick, following principle 8. The Lab can still
add one from the results window: *Add* copies that file to the stick and into the backup, and the
report records it as *added by operator*. Nothing has to be rerun.

### Running it again

Every run is a **full rebuild** (U11): no updating in place. Earlier backups are kept, each with a
date in its name (and the time when there are two on one day). The new report has a **"changed since
the previous backup"** section, for example `+ 5 signed certificates`, `~ software r40048 → r40050`.
This is the re-check finding 14 asks for.

### Prepare PC for shipping

Available from the results window and from the main window, and **only when a backup made by the
tool exists for this order with no run data newer than it** (U9). Concretely, no file in `Analyses`,
`DeletedAnalyses`, `Log` or `Backup XML Files` is newer than the backup. Otherwise the button says
"make the installer again first". One confirmation lists exactly what will be removed:

```
+--------------------------------------------------+
| Prepare PC for shipping - 99445669               |
|  Backup found: 2026-10-06 10:14             v    |
|  Will delete:  Analyses, DeletedAnalyses, Log,   |
|                Backup XML Files                  |
|  Then remove the software and uninstall          |
|  SkalarPackage (for the second check, D8)        |
|                                                  |
|     [ Delete and uninstall ]     [ Cancel ]      |
+--------------------------------------------------+
```

After the cleanup the tool says: *ask a colleague to install from USB SKR266698, then press Verify
installation*. Removing the log copy job joins this step once that job exists (D6). L5 settles what
else belongs here.

### Verify installation (the second check)

A second person installs from the stick, opens the tool from the share and presses *Verify
installation* (U12). The tool reads the installed core and plugin versions and compares the
installed application files with the file list and hashes in the report. Then it asks for that
person's name. The outcome (who checked, when, match or mismatch per item) is added to the report in
`Installer Backup\`, and to the copy on the stick if the stick is plugged in.

```
+--------------------------------------------------+
| Verify installation - 99445669                   |
|  v Core 1.143.2            = report              |
|  v Plugins 1.79.3          = report              |
|  v Application files       = report (r40050)     |
|  Checked by: [                ]                  |
|                               [ Record ]         |
+--------------------------------------------------+
```

### The delivery report

One self-contained **HTML** file (U12), colour-coded like the results window and printable. It goes
on the stick's root (`Delivery report <order>.html`) and next to the backup in `Installer Backup\`.
The customer will see it on the stick, so it is written as a delivery record, not as a log. Its
content is principle 7, the "changed since the previous backup" section, and the second-check
outcome. The full step log goes into the order-folder copy only.

### Under the window

**One PowerShell 5.1 script with a WinForms window (U13)**, started by the `.bat`. It is the same
stack as the workspace's other tools and needs no install on any lab or robot PC. The engine is a set
of functions the window calls, one per step, each runnable on its own with `-WhatIf` (principle 2).
The rules table is a separate data file (principle 3), so a new meter type is a data change, not a
code change.

### Side function: Software upgrade USB

For R&D's own field upgrades (a Win11 upgrade, a diluter upgrade, new functionality in an installed
system), Joost makes a much smaller USB by hand today:
1. get the latest plugins;
2. put the installer and the order's software on a stick, with no documents;
3. rename the stick to the order number.

The tool automates this with a **small side button on the same window** (U14). It reuses the order
number and the stick dropdown.

```
| Order number: [99445669   ]                      |
| USB stick:    [E:  16 GB   v]                    |
|   [ Check only ]   [ Create installer ]          |
|--------------------------------------------------|
| Later:  [ Prepare PC ]  [ Verify installation ]  |
| Other:  [ Software upgrade USB ]                 |
```

The button opens one small confirmation, then the usual progress and results windows:

```
+--------------------------------------------------+
| Software upgrade USB - 99445669                  |
|  Software:  SVN r40112, 2026-10-07, Joost        |
|             "Diluter upgrade Kloehn -> Hamilton" |
|  Plugin installer: [1.79.4 (latest)        v]    |
|      order's software says: Plugins 1.78.3       |
|  USB E: will be erased and labelled 99445669     |
|                                                  |
|          [ Create upgrade USB ]   [ Cancel ]     |
+--------------------------------------------------+
```

- **Content (U15): exactly the plugin release zip's layout, at the root of the stick.** The tool
  unpacks `Robotics Plugin <ver> Release.zip`, which gives `SkalarPackageInstaller.exe` plus empty
  `Application\` and `Core\` folders. Then it adds `Application\<order> <serial>.zip` and
  `Core\bin.zip`, built as for the delivery USB, from a fresh SVN checkout at HEAD. There are no
  documents, certificates, drivers, tools or methods.

  ```
  E:\  (label 99445669)
    SkalarPackageInstaller.exe
    Application\99445669 266698.zip
    Core\bin.zip
  ```
- **The software is SVN HEAD.** The confirmation shows the latest commit's revision, date, author and
  message, so it is visible before writing whether the upgrade commit is in. The upgrade work itself
  stays in `C:\SPD_Projects\`, which the tool never reads; whatever isn't committed isn't on the stick.
- **Plugin installer (U16):** the latest release is pre-selected, as today. The dropdown also lists
  the archive versions, in case an upgrade needs a specific one. The order's own `Plugins:` line is
  shown beside it, for information.
- **Label:** the order number (8 characters, within the label limit), not `SKR<serial>`.
- **Same safety as Create (U5):** collect and check first, then erase, write and read back.
- **Not part of it:** no backups, no delivery report, no pre-commit checks, no cleanup or second
  check. The results window is the only record.
- **Failed vs Warning (U17):** the SVN checkout or a USB write or verify problem is *Failed*. A bin
  that is not a released core is only a **warning** here ("bin 1.144.0.3 is not a released core"),
  because upgrades can legitimately use a newer or test core. On a delivery USB it stays *Failed* (U7).

It runs on whatever PC it is started on: Joost's own PC, not a robot PC.

### Still to settle for the UI

- **U-a** Should `RobotSettings.BypassCoverLock = true` be *Failed* rather than a warning? It is a
  safety setting on a machine that is about to ship. D9 lists it read-only today.
- **U-b** Where the `.bat` and the script live on the share, and how a new version gets there from
  `Tools&Scripts\` (by hand, or a small publish script).
- **U-c** Whether erasing the stick (format) and setting its label need admin rights on the robot
  PC. If they do, the fallback is to delete the stick's contents and set the label, if that works
  without admin. To verify on a real robot PC in Phase 3.
  *As built in Phase 2b:* "erase" deletes the stick's contents and never formats. The label is
  tried three ways without admin rights (`Set-Volume`, `Win32_Volume`, the Explorer shell). If all
  three fail, the result is a warning to rename the stick by hand. Not yet run on a real stick.
- **U-d** Whether every robot or test PC can actually reach the share, `\\build` and SVN. The design
  assumes it can (U3).

## Proposed phases

| Phase | Delivers | Writes |
|---|---|---|
| **0 — Ground truth** | *Started 2026-10-02. Six reference USBs mapped by 2026-10-06; draft rules table written. Left: J2 and the Lab session.* Confirm today's real procedure with the Lab (the guide is from 2022). Collect 2–3 more reference USBs; the `Installer Backup\` folders make this cheap. Good candidates: 99444892 / 99445277 / 99445861 (BOD), 99445669 (Waters, five parameters), 99445796 (Soil pH/EC). Derive the rules table from them | Nothing |
| **1 — Manifest only, in the window** | *Built 2026-10-07:* **Check only** in `Tools&Scripts\Installer USB Builder\`, with the draft rules table as `installer-rules.json`. Against the six reference USBs: 99445277 identical (31/31). Every other difference is a known finding (to-check rows, finding 17's WTW folder, finding 18's certificate subfolder, the Lab's leaks). It also adds the signed certificates missing from 99445669 and 99445796. The window with **Check only** as the only enabled button (U10): `<order>` → the progress and results windows say what the USB would contain, from where, and what's missing, and the report is written to a temporary folder. Run it on the reference orders and diff it against their `Installer Backup\` zips. No need to wait for the Lab to make a new USB, and the Lab can try the window early | Nothing (temporary report only) |
| **2 — Build to a folder** | *Check only* also keeps the staging folder and offers *Open staged folder*; diff it against the hand-made USBs | Local staging folder only |
| **2b — Software upgrade USB** | *Built 2026-10-07* in `Tools&Scripts\Installer USB Builder\` (see its README). On 99445669, the application zip has the same 279 files as the Lab's USB, and `bin.zip` matches Core 1.143.2. Test mode, the Failed and Cancel paths, and the drive refusals are verified; a real stick is not yet. The side button (U14–U17). It needs only the checkout, core, plugin and write-and-verify steps, so it can ship before Phase 3. That makes it the **first real USB write, with Joost as the operator**: a low-risk place to settle U-c (admin rights for formatting and labelling) before the Lab relies on it | The stick |
| **3 — Full delivery** | **Create installer** (backups, write the stick and its label, verify it, report), **Prepare PC for shipping** (the cleanup, plus removing the log copy job once it exists) and **Verify installation** (the second check, D8). Pre-commit checks (D9) run inside Create | USB, order folder, the PC being cleaned |

## Decisions (Joost, 2026-10-02)

| # | Question | Decision |
|---|---|---|
| D1 | Which `SkalarPackageInstaller.exe` | **The latest released plugin**: the single `Robotics Plugin <ver> Release.zip` in `\\build\Release\Robotics Plugin\` (not `Archive\`). `SkalarPackageInstaller` does install the plugins. The template folder's copy is never used. ~~The report records the installer version next to the order's own `Plugins:` line, for information only.~~ **Revised 2026-10-06 (finding 15): the order's own `Plugins:` version** from `binAndPluginsInfo.txt`, taken from `\\build\Release\Robotics Plugin\` or its `Archive\`, falling back to the historical archive. The report notes when a newer release exists. Not finding that version is a clear warning |
| D2 | Allowlist instead of copy-and-prune | **Agreed in principle.** What the allowlist contains is to be settled with the Lab (Lab session, L1) |
| D3 | Application zip name | **`<order> <serial>.zip`** for now (what "Send to → Compressed folder" produces). The guide's long form was the original design, but it is no longer used. The SVN revision goes in the report |
| D4 | CP210x driver | **Always** |
| D5 | No signed certificates found | **Clearly warn.** Never block, never a silent omission. The warning is at the top of the plan output and of the delivery report. **Confirmed 2026-10-06** after finding 13: it stays a warning, because it is not known whether some systems legitimately ship without certificates (L9) |
| D6 | Log copy job | **Not built yet; out of scope until it is.** The removal step and its contract (finding 8) are parked. Phase 3 picks it up only if the job exists by then |
| D7 | Cover-lock bypass location | `RobotSettings.BypassCoverLock` in `SkalarPack.Robot.Tables.xml` (`false` in 99435554). It appears twice in that file; check which row the application reads before building a check on it |
| D8 | Second check (guide §6) | **Still done, and the tool orchestrates it.** Last step: remove the software and uninstall SkalarPackage, so a second person can reinstall from the USB. The tool then guides that reinstall and records the outcome (who checked, whether the installed versions match the report) in the delivery report. It follows that **the tool must not run from the folder it removes**: it runs from the workspace, the share or the USB |
| D9 | Pre-commit checks (guide §2.2) | **Wanted, read-only, listed in the report:** `RobotSettings.BypassCoverLock` is off; only Analysis, Planner and Options are visible on the main screen; each application's default `Settings` row is listed for the Lab to confirm, since "right" can't be judged statically. **The `DD-MM-YYYY` date in `ApplicationInfo.txt` is fine and is not checked.** Not yet looked up: where the main-screen visibility is stored |
| D10 | Form of the tool | **An interactive UI**, not a `.bat` menu (principle 2). Worked out on 2026-10-07: see **How the Lab uses it** and U1–U13 |

### UI decisions (Joost, 2026-10-07)

| # | Question | Decision |
|---|---|---|
| U1 | Shape of the tool | **One action, not a dashboard.** The Lab opens it only when ready to make the USB: order number, *Create installer*, a progress window, then a results window that says Succeeded, Warning or Failed |
| U2 | How it starts | A **`.bat` on the share**; the order number is typed in the window |
| U3 | Where it runs | **On the robot or test PC itself**, from the share (D8) |
| U4 | Which stick | A **dropdown of removable drives**, pre-selected when exactly one is plugged in, showing size and label, with a "will be erased" warning |
| U5 | On a critical problem | **Collect and check first, write nothing.** The stick is untouched and no backup is written; the result says what to fix |
| U6 | Progress window | **Steps with a tick each, plus an expandable detail log** |
| U7 | What is *Failed* | Software, core or plugin installer missing or not a release; USB write or verify problems; a missing meter certificate; no manual rule for the template or an enabled device. Everything else is a warning |
| U8 | Items the tool can't decide | **Left off and listed as a warning**, with an *Add* button per item in the results window |
| U9 | Backups, cleanup, second check | **Backups are part of Create**. *Prepare PC for shipping* is a separate button, offered after Succeeded or Warning, and enabled only when a tool-made backup exists with no newer run data |
| U10 | The read-only mode | **A *Check only* button that stays**, the only enabled button in Phase 1 |
| U11 | Running it again | **A full rebuild every time; earlier backups are kept** (dated), and the report says what changed since the previous one |
| U12 | Second check and report | ***Verify installation*** compares the installed versions and files with the report and records the checker's name. The report is **self-contained HTML, on the stick and in `Installer Backup\`** |
| U13 | Technology | **PowerShell 5.1 + WinForms**, one script plus a rules data file, started by the `.bat` |
| U14 | Software upgrade USB: where | A **small side button on the same window**, sharing the order number and the stick dropdown |
| U15 | Software upgrade USB: content | **The plugin release zip's layout** at the stick's root (`SkalarPackageInstaller.exe`, `Application\<order> <serial>.zip`, `Core\bin.zip`), from SVN HEAD; nothing else. Label = the order number |
| U16 | Software upgrade USB: plugin | **The latest release, pre-selected, with a dropdown to pick an archive version**; the order's own `Plugins:` line is shown for information |
| U17 | Software upgrade USB: beta core | **A warning, not Failed** (upgrades can use a newer or test core). A delivery USB keeps it as Failed |

## Open questions

### For Joost

- **J1** ~~Which plugin installer?~~ **Decided 2026-10-06:** the order's own `Plugins:` version (D1 revised).
- **J2** Should the application zip leave out the AI `docs/` folder (finding 12)? It contradicts the
  "nothing removed beyond a fresh checkout" fact, so it needs a decision. Separately: should `docs/`
  be versioned inside order software at all, or only in the template?
  **2026-10-06: left in for now.** Joost is discussing it with a colleague. Until it's decided, the
  tool zips the fresh checkout as is.
- **J3** ~~Warning or explicit confirmation for missing certificates?~~ **Decided 2026-10-06:** a
  warning (D5 confirmed). Whether a missing certificate is ever intended is now part of L9.

### For the Lab session

- **L1** What the allowlist contains. The draft rules table now proposes most of it; what the Lab
  needs to settle:
  - `LoupeClient.exe` (on 2 of 6 USBs).
  - The WTW and Consort probe documents: the meter manual only, or the whole brand subfolder?
  - Whether a Soil USB also gets the Waters manual.
  - Calibration certificates always in `03. Certificates\Certificate of Calibration\` (finding 18).
- **L2** ~~Where the meter certificates come from.~~ **Answered 2026-10-06:** the serial-number
  folder (see *Established, part 2*). Still open: what the "Hach Locator" is.
- **L3** ~~Where the method PDFs live.~~ **Answered 2026-10-06:** `master methodes nieuw\ROB\` and
  `External manuals\Hach\`. Still open:
  - whether the signed certificate names are the right record of the tested kits;
  - who owns the kit → PDF mapping and the renaming (`LCK114.pdf` → `LCK114 COD 150 - 1000mgl.pdf`);
  - whether leaving out the GOST method PDF is the rule.
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
  **Evidence, 2026-10-06:** three practices across six orders.
  - `Analyses` only: 99435554, 99445861, 99445796.
  - The whole working folder: 99444892, 266 MB, including `.svn`, `bin` and gigabytes of `Log`
    uncompressed; and 99445669.
  - Both: 99445277, an 884 MB working copy plus `Analyses.zip`.

  99444892 also has an installation-time USB backup in `Installation papers\`.
- **L8** The leftovers:
  - What the `*ST.pdf` and `TEIWorkSheetFile*.teiwsf` files in the serial-number folder are, and
    whether they belong on the USB.
  - What DeviceID `YSI Multilab 4010-2` denotes, and which manuals it needs.
  - Probe documents (YSI ODO cap / ProOBOD, Metrohm electrodes) are keyed by a probe make that no
    table records: should the Lab pick them, or is there a field for it?
- **L9** The certificates and the staleness:
  - Why the 99445669 and 99445796 USBs were made without the already-signed certificates. Are
    there systems that legitimately ship without them, or were they forgotten? This decides whether
    D5's warning can ever become a block.
  - Whether 99445669's USB was redone after r40049 / r40050. In general: is the `Installer Backup\`
    zip the USB that shipped (finding 14)?
