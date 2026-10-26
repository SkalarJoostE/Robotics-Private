# Proposal: answering any robot question

> Asked as: "how often should the YSI membrane be replaced?" · "which BOD method uses seed correction?" · "have we seen a blank fail like this before?"

This chart is a proposal. Nothing on it is built yet. It shows how a web page open to everyone with access could answer any question about the robots, not only software questions. Knowledge questions are answered from a shared search over the written knowledge (RAG: retrieval-augmented generation). Questions about one order's software or a log still go through the full workflows above. Full reasoning: `md documents\Assessments & Plans\RAG Assessment.md`.

```mermaid
flowchart TD
    Q([Anyone with access asks<br/>a question on the web page]):::start --> ROUTE{What kind<br/>of question?}:::decision
    ROUTE -->|"Product, method, hardware,<br/>maintenance, seen before?"| SEARCH
    ROUTE -->|"Names an order, a log<br/>or a ticket"| AGENT

    SEARCH["Shared search, by meaning and keywords<br/>knowledge base, case base, known issues,<br/>feature dossiers, order index cards"]:::proposed
    CONF[Confluence and Jira<br/>through Atlassian's own search]:::proposed
    SEARCH --> TOP[(Best passages with<br/>source, status and date)]:::store
    CONF -.-> TOP
    TOP --> ANSWER[One AI call writes the answer<br/>and cites the pages it used]:::proposed
    ANSWER --> GOOD{Good sources found?}:::decision
    GOOD -->|Yes| OUT1([Answer with links<br/>draft pages marked as draft]):::start
    GOOD -->|No| AGENT

    AGENT[["Full workflow on the server, charts 02 to 04<br/>check out or refresh the order from SVN,<br/>profile and sequences, uploaded log through<br/>the log reader, several rounds"]]:::ai
    AGENT -.- QUEUE[One question per order at a time]:::rule
    SEARCH -.->|"prior-art step starts<br/>from the same results"| AGENT
    AGENT --> REVIEW{Engineer reviews<br/>before the asker sees it}:::human
    REVIEW --> OUT2([Answer]):::start

    classDef start fill:#1b355d,stroke:#1b355d,color:#ffffff
    classDef ai fill:#e6ecf7,stroke:#1b355d,color:#16233a
    classDef decision fill:#ffffff,stroke:#1b355d,color:#16233a
    classDef human fill:#fff3db,stroke:#ffa400,color:#16233a
    classDef store fill:#f1f4f9,stroke:#47597a,color:#16233a
    classDef rule fill:#fdecec,stroke:#b03a3a,color:#16233a
    classDef proposed fill:#e3f3ea,stroke:#1f7a4d,color:#16233a,stroke-dasharray:6 3
```

## Key points

- RAG fits the written knowledge: the product knowledge base, solved cases, known template issues, feature dossiers and order index cards. Together they are about 5 MB of text, so one index file is enough and no database server is needed.
- It does not fit the robot software, logs, action code or error codes. Those need exact answers for one order, which the existing tools give.
- A web question about one order's software still triggers the usual background work on the server: checking out or refreshing that order from SVN, regenerating its profile and sequences, and reading the uploaded log. RAG only speeds up the search for prior cases.
- A knowledge answer is one AI call, estimated at around €0.10 (not measured). A full order-lane chat costs €3.73 to €6.23 as measured.
- The more of the product knowledge base is written, the more questions the cheap lane can answer. Its pages already carry a status (draft, reviewed, verified) that the answer can show.
- When the search finds nothing good, the question goes to the full workflow or an engineer instead of getting a guess.
