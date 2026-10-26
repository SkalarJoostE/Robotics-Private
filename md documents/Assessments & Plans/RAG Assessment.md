# RAG Assessment

> **Assessment date:** 2026-10-26
> **Scope:** where retrieval-augmented generation (RAG) fits in the Robotics-AI workspace, and whether it becomes more worthwhile if the planned web chat answers *any* robot question rather than mostly software questions.
> **Status:** assessment only. Nothing was built, indexed or configured.
> **Asked by:** Joost, after the manager asked for "some form of RAG" for the API-billed web-chat side project. IT raised the same lead on 2026-10-06 (`Rollout/PROJECT.md`, 2026-10-07 entry).

## Conclusion

**Yes, RAG fits, and it gets more worthwhile as the scope widens to any robot question.** It fits the
*written knowledge*: the product knowledge base, the case base of solved issues, the Template Known
Issues register, the feature dossiers and the 1,276 order index cards. It does **not** fit the robot
software itself, logs, action code or error-code lookups. Those need exact answers for one specific
order, which the workspace already provides through dedicated tools.

The design that follows is **two lanes behind one web page**:

1. **Knowledge lane (new, RAG).** Product, method, hardware, maintenance and "have we seen this
   before?" questions are answered from a shared search index in one AI call, citing the pages used.
2. **Order lane (exists today, would run on the server).** Questions about one order's software or a
   log run the full workflow from the flowcharts (`Rollout/Flowcharts/`), starting from the same
   search results instead of spending rounds on finding prior cases. Asked through the web page, the
   server does everything an engineer's PC does now: it checks out or refreshes that order from SVN,
   regenerates the profile and Sequence CSVs, puts the uploaded log in place and reads it through the
   log reader. RAG does not replace any of that (section 5.1).

The recommended first step is small: build the shared search over the knowledge that is already in
the repo, then measure it against past cases before any web page depends on it.

---

## 1. What RAG is, in plain terms

A language model only knows what is in its prompt. RAG puts the right material there: before the
model answers, a **search step** finds the few passages most relevant to the question and adds them
to the prompt. The model then answers from those passages and can cite them.

What makes it different from an ordinary search is that the search can work on **meaning**. Each
passage is turned into a list of numbers (an *embedding*) that represents what it is about.
Passages about similar things get similar numbers, so "the arm crashes into the rack" can find a
write-up titled "Z-axis collision with tray" even though they share no words. In practice the best
results come from **hybrid search**: meaning-based and keyword-based together, because exact terms
such as order numbers, method codes and error numbers must still match exactly.

## 2. How the workspace finds information today

The workspace already does retrieval, just not in this form. Claude Code works **agentically**: it
searches files, reads what it finds, and searches again, one tool call per step. To make that cheap
and reliable, a lot of the retrieval has been built by hand:

| Hand-built retrieval layer | What it replaces |
|---|---|
| `<order> Profile.md` and the Sequence CSVs per order | Opening four multi-MB XML files to find hardware and settings |
| The 4-line triage header on every case-base write-up | Reading whole write-ups to judge relevance (5.4:1 saving, measured) |
| `Historical B-Feature Discovery\Index Cards\` (1,276 orders) | Checking out old orders to see what they contain |
| `md documents\Template Known Issues\` (generated from Jira RMT) | Searching Jira for template defects |
| The SSO precedent shortlist in `Process-SSO-Approvals.ps1` | Hand-picking reference orders (keyword hit count, newest first) |
| The Loupe log reader | Reading binary logs as text |

Two weaknesses of this approach are documented in the workspace itself, and they are exactly what
RAG addresses:

- **Vocabulary mismatch.** The precedent skill tells the assistant to "search with several
  vocabularies" because commit messages mix Dutch and English, abbreviations and different names
  for the same hardware. The SSO README lists "flat scoring lets generic terms rank above
  distinctive ones" as a known refinement.
- **Rounds cost money.** Every tool call re-sends the whole conversation. Measured: the case base
  alone was **18.1% of everything read** across 8 lab chats, and a session's always-on context floor
  was about **71k tokens per call** (`Rollout/Token-Usage-Analysis.md`). Finding prior cases in
  several rounds is paid for again on every later round.

## 3. Inventory: where RAG fits and where it does not

| Knowledge | Size | Searched today by | RAG fit |
|---|---|---|---|
| Product knowledge base (`knowledge-base\`, Arnold Verhagen) | 34 pages, ~190 KB, 31 marked `draft` | Not wired into the assistant | **Strongest.** Written for helpdesk, lab and sales; one topic per page, a status per page, a source register. |
| Case base (`md documents\`) | 111 files, 1.7 MB | Keyword search + triage headers | **Strong.** Symptoms are described differently each time. |
| Template Known Issues | 7 pages, 0.2 MB | Read per template | **Strong**, alongside the case base |
| Order index cards | 1,276 cards, 2.4 MB | Keyword search | **Strong.** The vocabulary-mismatch problem above |
| Verified-feature dossiers | 15 files, 0.2 MB | Keyword match by template family | Good, alongside the index cards |
| Template docs (`Template BOD\...\docs`) | 13 files, 0.1 MB | Read when relevant | Good |
| Confluence (SPDKB) and Jira | — | Atlassian connection | **Do not index ourselves.** Atlassian Rovo already runs search over this content (`Teamwork Graph Assessment.md`: "do not ingest them again"). Query it from the knowledge lane instead. |
| Order software (tables, sequences, Profile.md) | per order | Pre-generated profile and CSVs, exact XML lookups | **No.** Answers must be exact for one order and one revision. "Similar" is wrong. |
| Error codes | per order | One lookup in that order's own error table | **No.** House rule: a code's meaning is never taken from another order or a template. A similarity search would return exactly that. |
| Robot logs (`.glf`) | per run | Loupe queries (time windows, counts, threads) | **No.** These are structured queries, not text search. |
| Action code (C#) | per order | Search by name in the code mirror | **No.** Exact name search is better. |

Everything in the "yes" rows totals about **5 MB of text**. That is small: one index file on disk,
rebuilt after each commit, is enough. No vector-database server is needed.

## 4. Widening the scope to any robot question

The question raised during this assessment: today the assistant mostly answers software questions,
but the same set-up could answer any question about the robots, especially with the product
manager's knowledge base moving into the workspace. Does that make RAG more viable?

**Yes, for three reasons.**

1. **The new knowledge is the kind RAG is good at.** Methods, hardware modules, maintenance,
   troubleshooting and site requirements are explanatory prose. Software questions need exact
   lookups in one order's files, which is why they are handled by tools and not by RAG. Every page
   added to the knowledge base moves a share of questions from the expensive order lane to the
   cheap knowledge lane.
2. **The knowledge base is already structured the way a RAG index wants it.** One topic per page,
   a front-matter header with `audience` and `status`, `[To verify]` marks on uncertain statements,
   a source register and a question register. Those fields become search filters and caveats in
   the answer, for example "this comes from a draft page that has not yet been reviewed".
3. **More people can be served.** The knowledge base names helpdesk, lab and sales as its readers.
   Those are the people who would use a web page and who should not need a seat or the workspace.

**What widening the scope does not change:**

- **Curated beats complete.** The raw sources behind the knowledge base (manuals, master methods in
  old and new formats) contain superseded and conflicting material, which the knowledge base
  resolves explicitly. Index the knowledge base as the primary layer. Add raw sources only as a
  clearly labelled second tier, converted locally with the converter the SSO intake already uses
  (`Tools&Scripts\Attachment AI Conversion\Convert-AttachmentBundle.py`). Those manuals are not in this workspace today; the source
  register points to a folder on the product manager's machine.
- **Software questions still need the order lane.** The knowledge base itself states that "the
  software side ... is a separate subject and is not covered here". The two lanes stay.
- **Audience.** The knowledge base marks itself as internal and excludes customers for now. If
  customers ever become readers, the index needs filtering by audience before that happens.

## 5. Proposed design

```
Question on the web page
  ├─ knowledge question  → shared search (keywords + meaning)
  │                         → top passages with source and status
  │                         → one AI call writes the answer, citing pages
  │                         → nothing good found? hand over to the order lane or an engineer
  └─ order / log question → full workflow (flowcharts 02–07)
                             prior-art step starts from the same search results
                             engineer reviews the answer before the asker sees it (stage 1)
```

The flowchart version of this is chart 11 in `Rollout/Flowcharts/`.

**The shared search tool** would be one local tool (for example an MCP server, like the Loupe log
reader) usable by Claude Code, Copilot, Codex and the web chat alike. That keeps the workspace's
rule that every assistant sees the same context.

- **Index:** the knowledge base, case base, Template Known Issues, dossiers, index cards and
  template docs.
- **Chunks:** one per heading section. Each case-base write-up's triage header is attached to every
  chunk of that write-up. This is the technique Anthropic calls *contextual retrieval*, and the
  workspace already has it by hand.
- **Results:** passages with their file path, status and date, so the answer can cite them and the
  assistant can open the full file.
- **Rebuild:** after each commit, like the Sequence CSVs.

### 5.1 The order lane on a web page

Web users will also ask about specific software: "why does 99441979 stop after sample 2?", "is the
sprayer enabled on this order?", or a ticket with a customer zip attached. For those, the web page
is only a new way in. Behind it, the same intake runs that an engineer's Claude Code session runs
today (flowcharts 02–04), unattended, on the server:

| Background step | Tool today | What the server needs for it |
|---|---|---|
| Check out or refresh the order's software | `fetch-project.ps1` | VPN to SVN, SVN credentials, disk space for every order asked about |
| Install a customer zip instead, when one is uploaded or attached | `Process-SoftwareFolder.ps1` | An upload on the web page; Windows |
| Regenerate the code mirror, Sequence CSVs and `Profile.md` | `SkPack_SyncCLI.exe`, `Parse-SkalarTables.ps1`, `Extract-SystemProfile.ps1` | Windows and the workspace tools |
| Put the log in the order's Log folder and read it | Loupe log reader | An upload on the web page; the Loupe server running |
| Fetch the ticket and its attachments (RB/ES) | `Process-ServiceTickets.ps1` | Jira read access |
| Search prior cases | Today keyword search; **with RAG the shared search** | The search index |
| Reason over the evidence, several rounds | The skills | API billing |

**What RAG changes here is one step out of seven: finding prior cases.** The software itself is never
answered from an index. It is always the exact checkout of that order at its current revision,
because a "similar" order or an older revision gives a wrong answer for this robot. That is also why
the order lane keeps its measured cost (€3.73–€6.23 per chat) and its duration (minutes rather than
seconds), while the knowledge lane is cheap and fast.

Running this for several users at once adds requirements that a single engineer's PC never had
(already listed in `Rollout/Access-and-Feedback-Loop.md` §5):

- **A queue per order.** A refresh discards local edits in that order folder, so two questions about
  the same order must not run at the same time. Questions about different orders can.
- **One always-on Windows server** with the workspace, VPN, SVN, the Loupe server and the search
  index, and someone responsible for it when it fails.
- **Read-mostly permissions.** The web lane diagnoses and drafts; it never commits, posts to Jira or
  edits order software outside its own working folder.
- **Engineer review** of order-lane answers before the asker sees them, at least at first.

### Cost reasoning

- **Measured** (`Rollout/Access-and-Feedback-Loop.md` §2): a full chat today costs **€3.73** for a
  lab question and **€6.23** for an RB/ES ticket on average, at API list prices and before the setup
  was optimised.
- **Estimate, not measured:** a knowledge-lane answer is one AI call with roughly 10–15k tokens of
  retrieved text and about 1k tokens of answer. At Opus list prices ($5 input, $25 output per million
  tokens) that is in the order of **€0.10 per answer**. Embedding the 5 MB corpus is a one-off cost of
  cents, or free with a local model.
- **Indirect saving in the order lane:** the prior-art step (step 2 of the investigation spine) starts
  with ranked results instead of several search-and-read rounds.

## 6. Risks and open decisions

| Topic | Why it matters | Proposed handling |
|---|---|---|
| **Confident wrong answers** | When the search misses the right page, the model answers fluently from the wrong one. This is the "first wrong answer kills adoption" risk in `Access-and-Feedback-Loop.md` §7. | Answers always cite their sources and show page status. "No good match" hands over instead of guessing. Engineer review stays on at first. |
| **Embedding model and data governance** | Meaning-based search needs an embedding model. A cloud one sends the indexed text to that provider. Anthropic does not offer embeddings itself. | Decide with IT: a cloud provider under the same agreement as the AI model, or a local model on the server. The corpus is small enough for local. |
| **Dutch and English** | Commit messages and some documents are Dutch. | Choose a multilingual embedding model, and keep keyword search in the mix. |
| **Freshness** | A stale index answers from old pages. | Rebuild on commit; show the page date in the answer. |
| **Draft content** | 31 of 34 knowledge-base pages are `draft`. | Show status in every answer; let reviewed and verified pages rank higher. |
| **Wrong-lane routing** | An order-specific question answered from general knowledge is wrong for that order. | Anything naming an order number, a log or a ticket goes to the order lane. |
| **Confluence** | Indexing it ourselves duplicates Rovo and goes stale. | Use Atlassian's own search through the existing connection. |

## 7. Suggested next steps

1. **Prototype the shared search** over the content already in the repo (knowledge base, case base,
   Template Known Issues, dossiers, index cards), keyword plus meaning, as a local tool.
2. **Measure it on past cases.** For each solved case in the case base, ask the original question
   and check whether the right write-up is in the top five. `Rollout/Replay-Test/PROTOCOL.md`
   already defines a replay test this can follow.
3. **Wire it into the prior-art step** of the lab and ticket skills, and compare rounds and cost
   against the logged chats in `lab-chat-poc/cost_log.csv`.
4. **Only then build the knowledge lane** of the web page, with engineer review on until answers
   prove reliable.

## Sources

- `Rollout/Token-Usage-Analysis.md` — context floor, case-base share of reading, triage-header ratio
- `Rollout/Access-and-Feedback-Loop.md` §2, §5, §7 — measured per-conversation cost, chat proof of concept, adoption risk
- `Rollout/PROJECT.md` (2026-10-07 entry) — IT's RAG suggestion
- `md documents\Assessments & Plans\Teamwork Graph Assessment.md` — Rovo already searches Jira and Confluence
- `Tools&Scripts\SSO R&D Approval\README.md` — "How retrieval works" and its known refinements
- `.claude\skills\skalar-feature-precedent\SKILL.md` — "search with several vocabularies"
- `knowledge-base\README.md` — audience, structure, status model, scope boundary
- `Rollout/Flowcharts/` — the current workflows, and chart 11 for the proposed two lanes
