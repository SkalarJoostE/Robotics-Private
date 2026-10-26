# Upgrading the diluters on an installed robot

> Asked as: "upgrade the diluters on 99325813" · "what path is this order?"

Older robots carry one of several diluter software generations. The Diluter Upgrade Kit brings an order's own software to the current diluter code in place, keeping the customer's positions, calibrations and customisation. It works in stages with gates: anything it cannot handle safely stops the run and says what has to change first.

```mermaid
flowchart TD
    Q([Engineer: upgrade the diluters on order X]):::start --> PLAN["Classify the order's diluter generation<br/>diluterkit plan, read only<br/>upgrade path A to E"]:::script
    PLAN --> USE{Diluters in use?}:::decision
    USE -->|No| END1([Nothing to do]):::start
    USE -->|Yes| BLOCK{Blocking gate?}:::decision
    BLOCK -->|"Core too old"| CORE["Update the core first<br/>Update-CoreVersion.ps1"]:::script --> PLAN
    BLOCK -->|"Unknown code lineage<br/>or other blocker"| FIXFIRST[Engineer changes the order<br/>or the kit first]:::human --> PLAN
    BLOCK -->|None| SURVEY{Path B, C or D?}:::decision
    SURVEY -->|Yes| SITE["On-site survey of COM ports<br/>diluterkit survey"]:::human --> ACC
    SURVEY -->|No| ACC{Engineer reviews the<br/>acceptable gates}:::human
    ACC --> APPLY["Pre-flight checks and backup,<br/>then swap the diluter code<br/>diluterkit apply"]:::script
    APPLY --> GATES{Two headless<br/>build checks pass?}:::decision
    GATES -->|No| UNDO[Run stopped<br/>report says how to undo]:::rule
    GATES -->|Yes| REPORT[("change report, flags,<br/>FAT sheet")]:::store
    REPORT --> BUILD{Engineer presses Build<br/>in the application}:::human
    BUILD --> FAT{FAT on the robot}:::human
    FAT --> COMMIT{Engineer adds the files<br/>and commits to SVN}:::human
    REPORT -.->|"on request"| GUIDE["Engineer guide for the installer<br/>diluterkit guide, to USB"]:::script

    classDef start fill:#1b355d,stroke:#1b355d,color:#ffffff
    classDef ai fill:#e6ecf7,stroke:#1b355d,color:#16233a
    classDef script fill:#eef3fb,stroke:#6686b7,color:#16233a,stroke-dasharray:4 3
    classDef decision fill:#ffffff,stroke:#1b355d,color:#16233a
    classDef human fill:#fff3db,stroke:#ffa400,color:#16233a
    classDef rule fill:#fdecec,stroke:#b03a3a,color:#16233a
    classDef store fill:#f1f4f9,stroke:#47597a,color:#16233a
```

## Key points

- The upgrade is always done in the order's own software, never by rebuilding the robot on today's template. The installed software is the customer's system of record.
- Most gates cannot be waved through: the order has to change first. A short list may be accepted, and only after an engineer has reviewed it.
- A failed build check stops the run with undo instructions. Nothing half-upgraded is left behind silently.
- The kit never writes to SVN. The engineer commits after the in-app Build and the FAT.

## For a web version

Fit: Engineer PC. It edits order software, needs the robot application to build it, and has an on-site survey.
Needs: Workspace files; Windows scripts; SVN via VPN; Robot application; Engineer approval
Writes: the local order checkout, backed up first; SVN only by the engineer
