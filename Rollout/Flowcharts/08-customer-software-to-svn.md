# Putting a customer's software on SVN

> Asked as: "put this customer zip on SVN" · "commit the customer's version"

When a customer sends the software that actually runs on their robot, SVN has to be brought in line with it without losing anything. The script plans first and changes nothing, a person makes three decisions, the changes are staged in the local copy, and the commit happens only after an explicit yes.

```mermaid
flowchart TD
    Q([Engineer: put this zip on SVN]):::start --> SAFE["Check the local SVN copy is safe<br/>Import-CustomerSoftware.ps1, plan mode"]:::script
    SAFE --> SAFEOK{Copy clean and<br/>SVN reachable?}:::decision
    SAFEOK -->|"No: local edits, no VPN,<br/>or a different order"| STOP1[Stop and say why<br/>never reverts someone's work]:::rule
    SAFEOK -->|Yes| PLAN["Compare the zip with SVN<br/>plan report, changes nothing"]:::script
    PLAN --> ANY{Anything to import?}:::decision
    ANY -->|No| END1([Nothing to do]):::start
    ANY -->|Yes| THREE["Present three decisions<br/>whose program files, the customer's or SVN's<br/>which new files to add<br/>which missing files to delete"]:::ai
    THREE --> DEC{Engineer decides}:::human
    DEC --> PREVIEW["Preview, then stage in the local copy<br/>-WhatIf, then -Apply<br/>still undoable"]:::script
    PREVIEW --> MSG[Propose the commit message<br/>Customer version dd-MM-yyyy]:::ai
    MSG --> YES{Engineer: yes, commit?}:::human
    YES -->|"No, or commits in TortoiseSVN"| END2([Stops here]):::start
    YES -->|Yes| COMMIT["Commit to SVN<br/>and refresh the workspace summaries"]:::script
    COMMIT --> SVN[(SVN)]:::store
    COMMIT --> LOGIT[Offer to log it<br/>the plan report is the evidence]:::ai

    classDef start fill:#1b355d,stroke:#1b355d,color:#ffffff
    classDef ai fill:#e6ecf7,stroke:#1b355d,color:#16233a
    classDef script fill:#eef3fb,stroke:#6686b7,color:#16233a,stroke-dasharray:4 3
    classDef decision fill:#ffffff,stroke:#1b355d,color:#16233a
    classDef human fill:#fff3db,stroke:#ffa400,color:#16233a
    classDef rule fill:#fdecec,stroke:#b03a3a,color:#16233a
    classDef store fill:#f1f4f9,stroke:#47597a,color:#16233a
```

## Key points

- "Put it on SVN" allows planning and staging. The commit needs a separate, explicit yes in the conversation.
- Files missing from the zip are kept unless a person names them; new files are added only when chosen.
- If SVN holds a newer core than the customer, the assistant has to ask, because taking the customer's version would roll SVN back.
- The customer's zip is evidence and is never moved, renamed or deleted.

## For a web version

Fit: Engineer PC. It changes the system of record and every step waits on an engineer's decision.
Needs: Workspace files; Windows scripts; SVN via VPN; File upload; Engineer approval
Writes: the local SVN copy, then SVN itself after a yes
