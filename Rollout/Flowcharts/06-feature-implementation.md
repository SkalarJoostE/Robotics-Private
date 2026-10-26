# Building a feature into an order

> Asked as: "port the KCl rinse from 99412345 into 99446390" · "add a setting to switch the sprayer off"

A robot's behaviour lives in XML tables (sequences, settings, positions) and in C# action code stored inside those XML files. The assistant changes both through workspace scripts, checks that every new movement has a position to go to, and builds the code. The final build in the real application and the test on the robot stay with the engineer.

```mermaid
flowchart TD
    Q([Port list from a dossier,<br/>or a direct feature request]):::start --> MIRROR["Refresh the C# code mirror<br/>of both orders<br/>Process-SoftwareFolder.ps1"]:::script
    MIRROR --> DIFF[Compare every code location<br/>between reference and target]:::ai
    DIFF --> SORT{Each difference}:::decision
    SORT -->|"Part of this feature"| PORT[Port it]:::ai
    SORT -->|"Another customer's extra"| SKIP[Leave it out]:::ai
    PORT --> TABLES[Edit the tables<br/>sequences, settings in all three places,<br/>dropdown values, positions]:::ai
    PORT --> CODE["Edit the action code<br/>Sync-ActionCode.ps1<br/>extract, edit, write back"]:::script
    PORT --> TRAYS["Racks and layout if needed<br/>Add-TrayType / Set-TrayLayout<br/>dry run first"]:::script
    TABLES & CODE & TRAYS --> GEO["Check every new step has a position<br/>Check-ManipulatorGeometry.ps1"]:::script
    GEO --> MISS{Position missing?}:::decision
    MISS -->|Yes| ADDROW[Add the position row<br/>the lab teaches the real value]:::ai --> GEO
    MISS -->|No| VERIFY[Regenerate the mirror, re-compare,<br/>compile, run the checklist]:::ai
    VERIFY --> BUILD{Engineer presses Build<br/>in the application}:::human
    BUILD --> TEST[Optional: unattended test run<br/>in emulation, no hardware]:::script
    TEST --> FAT{Lab test / FAT}:::human
    FAT --> COMMIT{Engineer: commit to SVN?}:::human
    COMMIT -->|Yes| SVN[(SVN)]:::store

    classDef start fill:#1b355d,stroke:#1b355d,color:#ffffff
    classDef ai fill:#e6ecf7,stroke:#1b355d,color:#16233a
    classDef script fill:#eef3fb,stroke:#6686b7,color:#16233a,stroke-dasharray:4 3
    classDef decision fill:#ffffff,stroke:#1b355d,color:#16233a
    classDef human fill:#fff3db,stroke:#ffa400,color:#16233a
    classDef store fill:#f1f4f9,stroke:#47597a,color:#16233a
```

## Key points

- Every difference between the reference and the target order is sorted. Only the parts of this feature are ported, so another customer's extras do not travel along.
- A new setting goes in three places (the shared table, every application, and the settings popup). Adding it in one place only fails silently, which is why it is a checklist item.
- The geometry check catches a new movement with no position defined. On the robot that would otherwise show up as a crash or a wrong move.
- The emulation test and the in-app Build are real compiles and runs. The assistant's own compile is an earlier, cheaper check.
- Nothing is committed to SVN until the engineer says so.

## For a web version

Fit: Engineer PC. It changes order software, and the Build and emulation test drive the robot application on Windows.
Needs: Workspace files; Windows scripts; SVN via VPN; Robot application; Engineer approval
Writes: order tables and action code in the local checkout; SVN only after a yes
