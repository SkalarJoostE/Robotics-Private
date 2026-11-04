# The investigation spine

> Asked as: any investigation, whether it arrives as a lab issue, an RB/ES ticket or a port check

A lab issue, a Jira ticket and a port verification differ only at the start and the end. The middle is always the same seven steps, in the same order. Following them keeps an investigation short and focused: known problems are found first, cheap summaries are read before raw files, and nothing is checked twice.

```mermaid
flowchart TD
    S1[1 Intake<br/>fetch or refresh the order software,<br/>place the log in the order's Log folder]:::script
    S2[2 Prior cases<br/>search the case base and the<br/>Template Known Issues page]:::ai
    S2D{Seen before?}:::decision
    S3[3 Pre-generated summaries first<br/>order Profile.md, Sequence CSVs<br/>before any raw XML]:::ai
    S4[4 Log census<br/>four Loupe queries sent together]:::ai
    S5{5 Long search ahead?<br/>a lot of material to go through}:::decision
    SUB[Hand it to a helper agent<br/>that returns only the conclusion]:::ai
    S6[6 Check each conclusion<br/>one small, specific lookup per point]:::ai
    S7[7 Write-up]:::ai
    LOGQ{Engineer: log it?}:::human
    CB[(Case base<br/>md documents logs)]:::store

    S1 --> S2 --> S2D
    S2D -->|"Yes: known fix, or<br/>template defect already fixed"| S7
    S2D -->|"No or partly"| S3 --> S4 --> S5
    S5 -->|Yes| SUB --> S6
    S5 -->|No| S6
    S6 --> S7 --> LOGQ
    LOGQ -->|Yes| CB
    CB -.->|next case starts here| S2

    classDef ai fill:#e6ecf7,stroke:#1b355d,color:#16233a
    classDef script fill:#eef3fb,stroke:#6686b7,color:#16233a,stroke-dasharray:4 3
    classDef decision fill:#ffffff,stroke:#1b355d,color:#16233a
    classDef human fill:#fff3db,stroke:#ffa400,color:#16233a
    classDef store fill:#f1f4f9,stroke:#47597a,color:#16233a
```

## Key points

- Prior cases come before any new digging. Field issues repeat, and a past write-up is often most of the answer.
- The order's `Profile.md` lists its hardware and every application's settings in about 15 KB. Building the same picture from the raw XML is many times slower and more expensive.
- Step 6 checks the conclusions one at a time, each with its own narrow lookup, for example "did the gripper reach position 3 at 10:42?". One broad search that tries to confirm everything at once returns hundreds of lines and proves none of them clearly.
- Lookups that do not depend on each other run at the same time. Lookups that depend on an earlier answer wait for it, so speed never replaces a check.
- Each resolved case is filed back into the case base, so the next similar case starts with an answer.
