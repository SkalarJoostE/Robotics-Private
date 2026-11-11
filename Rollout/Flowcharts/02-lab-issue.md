# A lab issue comes in

> Asked as: "99441979 stops after the second sample, here is the log" · "the lab committed again, check it"

A colleague in the lab, or at a customer install, reports a robot problem with an order number and usually a log file. The assistant gets the exact software that robot runs, checks whether the problem is already known, and always ends with a diagnosis or a best hypothesis with its reasoning. It never ends with only a request for more information.

```mermaid
flowchart TD
    Q([Colleague: order number, log, what they saw]):::start --> ASK{Order number<br/>and symptom given?}:::decision
    ASK -->|No| CLAR[Ask for what is missing]:::human --> SRC
    ASK -->|Yes| SRC{Where is the software?}:::decision

    SRC -->|On SVN| VPN{SVN reachable?}:::decision
    VPN -->|"No: VPN off"| STOP1[Stop: ask the engineer<br/>to connect the VPN]:::rule
    VPN -->|Yes| CO{Already checked out?}:::decision
    CO -->|Yes| REF["Refresh in place<br/>fetch-project.ps1<br/>logs are kept"]:::script
    CO -->|No| NEW["Check out the order<br/>fetch-project.ps1"]:::script
    SRC -->|"Customer zip"| ZIP["Install the zip as its own folder<br/>Process-SoftwareFolder.ps1<br/>never mixed with SVN"]:::script

    REF & NEW & ZIP --> POST["Same post-processing every time<br/>C# code mirror, Sequence CSVs,<br/>order Profile.md"]:::script
    POST --> PLACE[Put the log in the order's Log folder]:::ai
    PLACE --> PRIOR["One batch of lookups<br/>case base, Template Known Issues,<br/>order Profile.md"]:::ai
    PRIOR --> HASLOG{Log provided?}:::decision
    HASLOG -->|Yes| LOGA[[Log analysis flow]]:::ai
    HASLOG -->|No| SOFT[Reason from the software alone<br/>sequences, tables, action code]:::ai
    LOGA & SOFT --> DIAG[Diagnosis or best hypothesis<br/>with the reasoning]:::ai
    DIAG --> FIX{Change needed?}:::decision
    FIX -->|Yes| IMPL[[Feature implementation flow]]:::ai
    FIX -->|No| DONE
    IMPL --> DONE{Fix confirmed<br/>on the robot?}:::human
    DONE -->|Yes| LOGIT[Offer: log this lab resolution]:::ai

    classDef start fill:#1b355d,stroke:#1b355d,color:#ffffff
    classDef ai fill:#e6ecf7,stroke:#1b355d,color:#16233a
    classDef script fill:#eef3fb,stroke:#6686b7,color:#16233a,stroke-dasharray:4 3
    classDef decision fill:#ffffff,stroke:#1b355d,color:#16233a
    classDef human fill:#fff3db,stroke:#ffa400,color:#16233a
    classDef rule fill:#fdecec,stroke:#b03a3a,color:#16233a
```

## Key points

- The software is always the exact version under investigation: refreshed from SVN, or installed from the customer's zip. If SVN cannot be reached the assistant stops instead of using another copy.
- A refresh never deletes the order folder, so logs and notes stay where they were.
- When the lab says "we committed again" or "here is a new zip", the same step runs again and everything read earlier is treated as out of date.
- No log is not a dead end. The assistant answers from the software and says which log would settle what is still open.
- The resolution is filed only after the fix has been confirmed on the robot.

## For a web version

Fit: Good. The chat proof of concept already runs this flow as its Lab channel; the work is reading and reasoning.
Needs: Workspace files; Windows scripts; SVN via VPN; Log reader; File upload
Writes: refreshes the order folder, which discards local edits, so a shared service needs one queue per order
