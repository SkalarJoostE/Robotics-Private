# Assessing a B-system order for R&D approval

> Asked as: "assess SSO-52" · "is this B-system ready to approve?"

Orders on the SSO board ("B-System Orders") wait for R&D approval. A script downloads the order and every attachment and converts them to readable text locally: the application questionnaire, the B-features document, the workfile's SPDQ sheet, photos and any robot software. The assistant then reads all of it, cross-checks the documents against each other, finds the best reference order and writes a verdict. The approval itself stays with a person.

```mermaid
flowchart TD
    Q([Engineer: assess SSO-52]):::start --> FETCH["Download the order and attachments<br/>Process-SSO-Approvals.ps1<br/>read only against Jira"]:::script
    FETCH --> CONV["Convert every attachment locally<br/>PDF to text and page images, OCR,<br/>SPDQ sheet, Word, zips, robot software"]:::script
    CONV --> RET["Shortlist past similar orders<br/>and write the checklist"]:::script
    RET --> BUNDLE[("Approval bundle<br/>issue, attachments, readable copies,<br/>warnings list, precedent shortlist")]:::store
    BUNDLE --> READ[Read the issue and every comment<br/>the B decision is often in a comment]:::ai
    READ --> DOCS[Read every converted document<br/>check page images where flagged]:::ai
    DOCS --> WARN{Every conversion<br/>warning resolved?}:::decision
    WARN -->|"No: evidence unreadable"| NEEDS
    WARN -->|Yes| CROSS[Cross-check the documents<br/>for example the meter in the AQ<br/>against the B-features document]:::ai
    CROSS --> PREC[[Precedent search:<br/>confirm the best reference order]]:::ai
    PREC --> VERDICT{Complete and<br/>consistent?}:::decision
    VERDICT -->|Yes| READY[assessment.md<br/>Ready to approve]:::ai
    VERDICT -->|No| NEEDS[assessment.md<br/>Needs info, with the open questions]:::ai
    READY & NEEDS --> ENG{Engineer makes the<br/>approval call in Jira}:::human
    ENG --> LOGIT[Offer: log in the order approval log]:::ai

    classDef start fill:#1b355d,stroke:#1b355d,color:#ffffff
    classDef ai fill:#e6ecf7,stroke:#1b355d,color:#16233a
    classDef script fill:#eef3fb,stroke:#6686b7,color:#16233a,stroke-dasharray:4 3
    classDef decision fill:#ffffff,stroke:#1b355d,color:#16233a
    classDef human fill:#fff3db,stroke:#ffa400,color:#16233a
    classDef store fill:#f1f4f9,stroke:#47597a,color:#16233a
```

## Key points

- Two stages. The script fetches and converts with no AI involved; the assistant reasons over the result.
- Scope is never taken from a file name. The AQ, the B-features document and the workfile are read as independent evidence, so a contradiction between them shows up.
- A conversion warning does not block approval once it has been checked against the original, but unreadable evidence does.
- Neither the script nor the assistant posts to Jira or changes the issue status.

## For a web version

Fit: Good. A reviewer asks one question and gets a written verdict; the work is reading.
Needs: Workspace files; Windows scripts; Jira (read); Engineer approval
Writes: a bundle folder and assessment.md in the workspace, nothing in Jira
