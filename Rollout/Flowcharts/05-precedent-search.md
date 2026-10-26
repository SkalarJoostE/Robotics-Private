# Have we built this before?

> Asked as: "have we ever built a robot that rinses the probe with KCl between samples?" · "find a reference order for a dual EC flowcell"

Most special requests (B-features) have been built for some earlier customer. The workspace keeps a searchable index card for every delivered order (about 1,275) and a growing collection of feature dossiers. The assistant searches those, the engineer picks the right reference order, and the assistant turns it into a dossier that says exactly what to copy and what not to.

```mermaid
flowchart TD
    Q([Engineer describes the feature]):::start --> GRILL{Requirement clear?}:::decision
    GRILL -->|"No: engineer starts<br/>the interview"| INT[Interview, one question at a time<br/>scope, hardware, trigger, failure, acceptance]:::human
    INT --> BRIEF{Engineer confirms<br/>the brief?}:::human
    INT -->|"Hardware does not exist"| QUOTE[Stop: this is a quoting question]:::rule
    BRIEF -->|Yes| SEARCH
    GRILL -->|Yes| SEARCH["Search the index cards<br/>1,275 orders, commit messages and names<br/>no software downloaded yet"]:::ai
    SEARCH --> SHORT[Shortlist of candidate orders<br/>with the evidence for each]:::ai
    SHORT --> GOOD{Convincing<br/>candidate?}:::decision
    GOOD -->|No| SEARCH
    GOOD -->|Yes| PICK{Engineer picks<br/>the reference order}:::human
    PICK --> HIST["Trace the order's history<br/>which template it came from,<br/>which revisions added the feature"]:::script
    HIST --> CO["Full checkout of the reference order<br/>and its template<br/>fetch-project.ps1"]:::script
    CO --> DOSS[("Feature dossier<br/>what to port, dependencies,<br/>what NOT to copy<br/>status: candidate")]:::store
    DOSS --> ADAPT[Adapt to the new order<br/>port nothing the order will not use]:::ai
    ADAPT --> IMPL[[Feature implementation flow]]:::ai
    IMPL -.->|"FAT passed or engineer confirms"| VER[Dossier promoted to verified]:::human

    classDef start fill:#1b355d,stroke:#1b355d,color:#ffffff
    classDef ai fill:#e6ecf7,stroke:#1b355d,color:#16233a
    classDef script fill:#eef3fb,stroke:#6686b7,color:#16233a,stroke-dasharray:4 3
    classDef decision fill:#ffffff,stroke:#1b355d,color:#16233a
    classDef human fill:#fff3db,stroke:#ffa400,color:#16233a
    classDef rule fill:#fdecec,stroke:#b03a3a,color:#16233a
    classDef store fill:#f1f4f9,stroke:#47597a,color:#16233a
```

## Key points

- Nothing is downloaded until the engineer has chosen the reference order. The index cards are enough to shortlist.
- The engineer verifies the choice outside the tooling, for example from photos of the built system or by opening its software.
- The dossier records what not to copy as well as what to copy: a reference order also carries other customer-specific parts.
- Dossiers grow from live work. Each port adds or updates one, and it becomes "verified" once the first port passes FAT.
- The interview step is optional and only starts when an engineer asks for it.

## For a web version

Fit: Good for the search and shortlist, which only reads the committed index cards. The checkout and dossier after the engineer's pick need SVN.
Needs: Workspace files; Windows scripts; SVN via VPN; Engineer approval
Writes: a candidate dossier in the workspace
