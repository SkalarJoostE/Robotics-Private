# What happens when you ask a question

> Asked as: any question typed into Claude Code, GitHub Copilot or Codex inside the Robotics-AI workspace

Every assistant opens the same instruction file first, so the same question gets the same treatment whichever tool is used. The request is then matched to a skill: a written procedure for that kind of work, with its own scripts and its own rules. Anything that does not match a skill is answered from the instructions, the documentation and the software itself.

```mermaid
flowchart LR
    Q([Engineer types a question<br/>the assistant loads the shared<br/>instructions and memory]):::start --> KIND{What kind<br/>of request?}:::decision

    KIND -->|"Solve RB-380 / ES-212"| JIRA[Jira ticket flow<br/>skalar-jira-issue]:::ai
    KIND -->|"Order number + log from the lab"| LAB[Lab issue flow<br/>skalar-lab-issue]:::ai
    KIND -->|"Here is a .glf log"| LOG[Log analysis<br/>skalar-log-analysis]:::ai
    KIND -->|"Have we built X before?"| PREC[Precedent search<br/>skalar-feature-precedent]:::ai
    KIND -->|"Add this feature to order X"| IMPL[Feature implementation<br/>skalar-feature-implementation]:::ai
    KIND -->|"Assess SSO-52"| SSO[B-system approval<br/>Process-SSO-Approvals.ps1]:::script
    KIND -->|"Put this customer zip on SVN"| SVN[SVN import<br/>skalar-svn-import]:::ai
    KIND -->|"Upgrade the diluters on order X"| DIL[Diluter Upgrade Kit<br/>diluterkit plan / apply]:::script
    KIND -->|"Add a rack / fix the layout"| TRAY[Tray tools<br/>Add-TrayType / Set-TrayLayout]:::script
    KIND -->|"How does X work?"| DOC[Answer from sources<br/>Confluence, template docs,<br/>action code, robotics-core]:::ai

    JIRA & LAB & LOG & PREC & IMPL & SSO & SVN & DIL & TRAY & DOC --> OUT([Answer, write-up or prepared change<br/>for the engineer to review,<br/>then an offer to file it in the case base]):::start

    classDef start fill:#1b355d,stroke:#1b355d,color:#ffffff
    classDef ai fill:#e6ecf7,stroke:#1b355d,color:#16233a
    classDef script fill:#eef3fb,stroke:#6686b7,color:#16233a,stroke-dasharray:4 3
    classDef decision fill:#ffffff,stroke:#1b355d,color:#16233a
    classDef human fill:#fff3db,stroke:#ffa400,color:#16233a
    classDef rule fill:#fdecec,stroke:#b03a3a,color:#16233a
```

## Key points

- The instruction file is the same for all three assistants (`CLAUDE.md` points at `.github/copilot-instructions.md`), so behaviour does not depend on which tool someone uses.
- A skill is chosen from the wording of the request. The engineer does not have to name it.
- The lab and ticket flows both end up in log analysis when a log is attached; the precedent search hands over to feature implementation once a reference order is chosen.
- The same house rules hold on every path: software is read only from the workspace (never from an engineer's own `C:\SPD_Projects` copy), nothing writes to Jira, and nothing is committed to SVN without the engineer saying yes in the conversation.
