# Installer USB Builder

Builds the USB sticks that go out with a robot. The design, the decisions behind it (D1–D10, U1–U17)
and what is still open are in
[`md documents\Assessments & Plans\Installer USB Builder - Plan.md`](../../md%20documents/Assessments%20&%20Plans/Installer%20USB%20Builder%20-%20Plan.md).

**Status (2026-10-07): Phase 2b.** Only the **Software upgrade USB** side function works. The other
buttons are in the window but disabled:

| Button | Phase |
|---|---|
| Check only | 1 |
| Create installer, Prepare PC for shipping, Verify installation | 3 |

## Starting it

| | |
|---|---|
| `Installer USB Builder.bat` | Opens the window. |
| `Installer USB Builder (test mode).bat` | Same window, but **nothing is written to a USB stick**. Everything up to the "nothing written above this line" step runs for real: SVN lookup and export, the zips, the core and plugin checks, assembling the content. Then the write steps are skipped. Works without a stick plugged in. |

The PC needs the SVN command-line client (TortoiseSVN's "command line client tools"), stored SVN
credentials, and access to `\\build\Release`. The first step checks all three and names whatever is
missing.

## Software upgrade USB

For R&D's own field upgrades (a Win11 upgrade, a diluter upgrade, new functionality):
1. Type the order number and press Enter. The window shows the SVN folder, the serial and the last
   commit.
2. Pick the stick. The dropdown lists removable drives only, and pre-selects the stick when exactly
   one is plugged in.
3. Press **Software upgrade USB** and pick the plugin installer. The latest release is pre-selected;
   the order's own `Plugins:` version is shown next to it.

The stick gets the plugin release zip's layout, and its label becomes the order number:

```
E:\  (label 99445669)
  SkalarPackageInstaller.exe            <- the chosen Robotics Plugin release
  Application\99445669 266698.zip       <- svn export of the order's software folder at its last commit
  Core\bin.zip                          <- svn export of the order's bin at the same revision
```

- **Application folders are recognised by content, not name:** a folder holding
  `Applications.TreeDatabase.Xml` and `SkalarPacks\`. Older orders name them `99339531`,
  `99287117 14121` or `99316128_Grond_(4x8) na service`. Some have two that share one bin
  (`99367208 216104 BOD` + `… WATERS`). The confirmation screen lists them with a checkbox each, all
  ticked, and every ticked one becomes its own zip named after the folder. Other folders in the order
  (`Titrator files`, `Methods and settings backup`, `SkalarRobotics (1)`) are left off and listed as
  information. An order without a `bin` folder in SVN is an older layout the tool refuses.
- **The serial is optional.** It is read from the folder name when present. The upgrade USB's label
  is the order number either way.
- **`binAndPluginsInfo.txt` can be missing or in the old one-line form** (just `1.132.0.0`, the bin
  version). Either is handled. The core version is always read from `bin\Release\SkalarRobotics.exe`
  as well.
- **The software is SVN only.** It comes from the order's last commit, never from `C:\SPD_Projects`,
  so commit the upgrade first. The confirmation screen shows which commit it will use.
- **A bin that is not a released core** gives a warning, not a failure (U17).
- **Nothing is written until everything is collected and checked** (U5). Then the stick is emptied,
  written and read back: every file is compared by SHA-256.
- **Cancel** works up to the "nothing written" line. Once writing starts the run completes, because
  a half-written stick is worse than a finished one.

## Headless (no window)

```powershell
.\InstallerUsbBuilder.ps1 -UpgradeUsb -OrderNumber 99445669 -Target E: [-PluginVersion 1.79.3] [-WhatIf]
.\InstallerUsbBuilder.ps1 -UpgradeUsb -OrderNumber 99445669 -Target C:\Temp\usb -TargetIsFolder   # a folder instead of a stick
.\InstallerUsbBuilder.ps1 -SmokeTest [-OrderNumber 99445669]   # builds the forms; with an order also a live test-mode run
```

Exit code: 0 Succeeded, 2 Warning, 1 Failed or Cancelled.

## Files

| File | |
|---|---|
| `InstallerUsbBuilder.Engine.ps1` | All logic, as functions that can be used on their own (dot-source it). Network check, order lookup and export, release lookup, drive listing, erase, label, write, verify, and `Invoke-IubUpgradeUsb`. |
| `InstallerUsbBuilder.ps1` | The WinForms window, the headless mode and the smoke test. The run happens in a background runspace so the window stays responsive. |

## Verified (2026-10-07, order 99445669)

- **Application zip:** file for file the same as the one on the Lab's own USB for that order (279 of
  279 files). The entry names use `/`; the .NET zip helper in Windows PowerShell 5.1 writes `\`, so
  the engine builds zips entry by entry.
- **`bin.zip`:** the same 183 files as `Robotics Core 1.143.2 Release.zip`.
- **A full run into a folder:** stale content removed, read-back identical. Took 12 s.
- **Failure paths:**
  - an unknown plugin version gives *Failed* and nothing is written;
  - a cancel before the line gives *Cancelled*;
  - `-WhatIf` leaves the target untouched;
  - `C:` and an absent drive letter are refused.

**Older layouts** (2026-10-07):
- **The application-folder rule:** checked against a sample of 47 trunk orders across all ages.
- **Full runs into a folder:**
  - 99339531 (`99339531`, no serial);
  - 99367208, both applications and BOD only;
  - test-mode runs of the same orders.

**First real stick** (99339531, 7.5 GB FAT32, Joost's PC, 2026-10-07):
- **Written and labelled `99339531` without admin rights.**
- **The installer** is identical by SHA-256.
- **Both zips** match a fresh build entry by entry (name, size, CRC).
- **Bug found and fixed:** the read-back reported the stick's own files as `extra: pplication\…`,
  because a drive root was trimmed to `E:`, which Windows reads as "the current folder on E". Every
  root now goes through `Get-IubRootPath`. Re-verified on a `subst` drive.

## Not yet verified

- **Labelling on lab and robot PCs** (plan item **U-c**). The label is tried three ways without
  admin rights (`Set-Volume`, `Win32_Volume`, the Explorer shell); on Joost's PC it worked. If all
  three fail, it's a warning saying to rename the stick by hand.
- **Where the tool lives on the share, and how new versions get there** (plan item **U-b**).
