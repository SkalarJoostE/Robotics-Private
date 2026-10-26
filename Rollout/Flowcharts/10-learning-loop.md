# How answers become knowledge

> Asked as: "wrap up" · "log this ticket resolution" · "add this to the feature catalogue"

The workspace improves because finished work is written down where the next question will find it. At the end of a case the assistant proposes what to keep and where, the engineer approves the list, and the write-up goes into the matching log. Every investigation flow starts by searching those same logs.

```mermaid
flowchart TD
    DONE([Case finished]):::start --> PROPOSE[Assistant proposes what is worth keeping<br/>and where it belongs]:::ai
    PROPOSE --> OK{Engineer approves<br/>the list?}:::human
    OK -->|"No: exploration or dead end"| NOTHING([Nothing filed]):::start
    OK -->|Yes| KIND{What kind of result?}:::decision
    KIND -->|"RB/ES ticket"| T[(Ticket resolution log)]:::store
    KIND -->|"Lab, FAT or install case"| L[(Lab resolution log)]:::store
    KIND -->|"Defect in a template"| TP[(Template issue log)]:::store
    KIND -->|"B-feature built"| F[(Feature implementation log<br/>plus feature dossier)]:::store
    KIND -->|"Order or SSO assessment"| A[(Order approval log)]:::store
    KIND -->|"Change to the assistant itself"| W[(Workspace plan<br/>and context changelog)]:::store
    T & L & TP & F & A --> HEADER[Each write-up opens with a four-line summary<br/>symptom, cause, fix, scope]:::ai
    HEADER --> SHARE{Colleague's PC?}:::decision
    SHARE -->|Yes| SEND["Send to the maintainer for review<br/>Submit-Contributions.ps1"]:::script
    SHARE -->|No| GIT[(Workspace repository)]:::store
    SEND --> GIT
    GIT -.->|"Prior-art search<br/>at the start of every case"| NEXT([Next question]):::start

    classDef start fill:#1b355d,stroke:#1b355d,color:#ffffff
    classDef ai fill:#e6ecf7,stroke:#1b355d,color:#16233a
    classDef script fill:#eef3fb,stroke:#6686b7,color:#16233a,stroke-dasharray:4 3
    classDef decision fill:#ffffff,stroke:#1b355d,color:#16233a
    classDef human fill:#fff3db,stroke:#ffa400,color:#16233a
    classDef store fill:#f1f4f9,stroke:#47597a,color:#16233a
```

## Key points

- The four-line summary at the top of each write-up is what makes the case base cheap to search. A match is judged from those lines before the whole file is opened.
- Filing is by how the work arrived (ticket or lab), but every search covers all the logs.
- Nothing is filed without the engineer's OK, and filing never posts to Jira or commits to SVN.
- Colleagues who do not use git send their entries for review rather than changing the shared workspace directly.

## For a web version

Fit: Partial. The write-up can be drafted automatically, but someone has to decide what is correct before it becomes knowledge.
Needs: Workspace files; Engineer approval
Writes: the case-base logs in the workspace repository, after review
