# Robotics-AI: what it is today, and the road to a web application

> **Status:** draft for discussion, 2026-10-27 · **Owner:** Joost (Software Engineering)
> **Source of truth:** the Robotics-AI repository (`Rollout/`). This page summarises it; when the two disagree, the repository wins.
> **Companion page:** *Robotics-AI web application: architecture*.

## Summary

- **Robotics-AI** is an AI assistant that has been taught our robot software and our solved cases. Software Engineering has used it daily since April 2026 to diagnose lab and service issues, read robot logs, find earlier orders with the same feature, and prepare software changes.
- Today it runs on an engineer's PC, inside Claude Code, with the workspace, VPN, SVN and the log reader installed locally. That limits it to the few people who have that set-up.
- The next step is a **web application** where anyone with access can ask a robot question and get an answer, without installing anything. This page describes what exists today (Part 1) and the milestones to get there (Part 2). The architecture is on its own page.

---

## Part 1: What is in Robotics-AI today

### What it is

Robotics-AI is a git repository (a "workspace") that an AI assistant opens before it answers anything. It holds:

- **Instructions** that explain how our software works: the Sequence/SubSequence execution model, the action code, the tables, the templates, and the house rules.
- **Skills**: written, step-by-step procedures for each kind of work (a lab issue, a service ticket, a log, a feature port). The assistant picks the right one from the wording of the question.
- **Tools**: PowerShell and Python scripts that do the mechanical work reliably (checking out an order, building the order's profile, reading the ticket, laying out racks).
- **Knowledge**: the case base of solved issues, the known template defects, an index of every delivered order, feature dossiers and the product knowledge base.

The same instructions are loaded by Claude Code, GitHub Copilot and Codex, so the answer does not depend on which assistant someone uses. Claude Code is the main one, on the company's Claude Team plan.

### What it can do

| Kind of question | What happens | What comes out |
|---|---|---|
| **A lab issue** ("99441979 stops after the second sample, here is the log") | Gets the exact software the robot runs, checks the case base and known template issues, reads the log, reasons over the tables and code | A diagnosis, or a best hypothesis with its reasoning, and the smallest thing still needed |
| **A robot log** (`.glf`) | Queries the binary log through a dedicated log reader, starting from a fixed overview and narrowing down | A report: timeline, root cause, affected samples, recommendation |
| **An RB or ES ticket** | A scraper pulls the ticket, its attachments and the customer's own software into a local folder; the assistant diagnoses from there | An analysis with a draft Jira reply. **It never writes to Jira**; the engineer decides what to post |
| **"Have we built this before?"** | Searches the index cards of all 1,276 delivered orders and the feature dossiers | A shortlist of reference orders, then a dossier saying what to copy and what not to |
| **Building a feature into an order** | Changes tables and action code through workspace scripts, checks that every new movement has a position | A prepared change in the local checkout. Build, test and commit stay with the engineer |
| **R&D approval of a B-system order** (SSO board) | Downloads and converts every attachment, checks completeness, finds precedent orders | A written assessment: ready to approve, or the open questions |
| **Customer software to SVN** | Compares the customer's zip with SVN and stages only what the engineer decides | A staged update; committed only after an explicit yes |
| **Diluter upgrade, core update, racks and layout** | Dedicated tools that apply known procedures in place in the order's own software | A change report and a backup |

All of these are drawn step by step in the flowcharts page *How Robotics-AI Works* (Claude artifact, shared on request).

### What it knows

| Source | Size | Notes |
|---|---|---|
| Case base of solved issues | 77 detailed write-ups in five logs (lab cases, service tickets, features and ports, order approvals, template defects) | Every write-up opens with a four-line summary, so the assistant can judge relevance without reading the whole file |
| Template Known Issues | One page per template | Generated from the Jira RMT board, including which SVN commit fixed what |
| Order index cards | 1,276 delivered orders | One card per order: name, template ancestry, every feature-bearing commit |
| Feature dossiers | 14, across six template families | Reusable descriptions of B-features: reference order, what to port, what not to copy |
| Product knowledge base | 34 pages, started 2026-10-09 | Written with the product specialist for Helpdesk, Lab and Sales. BOD is complete; the other applications follow the same model. Most pages are still marked `draft` |
| Robot software | Every template, plus any order on request | Checked out from SVN; each gets a generated profile (hardware and settings) and Sequence CSVs |
| Core and plugin source | `robotics-core`, `robotics-plugin` | For questions about how the application itself behaves |
| Confluence (SPDKB) and Jira | Read through the Atlassian connection | Software Setup guides, "in Details" pages, tickets |

### How it is used today

- **Who:** Software Engineering daily. The product specialist contributes knowledge-base pages and case entries through a submission script, without needing git. A Lab pilot on one engineer's laptop is designed and waits for the Bitbucket rebuild and IT's answers.
- **Where:** on a Windows PC with the workspace, VPN, SVN and the log reader. A one-click bootstrap installs everything.
- **The chat proof of concept** (`lab-chat-poc`): a working multi-turn chat on the same instructions and skills, with a Lab channel and a Helpdesk channel. It is where the cost figures below come from, and it already contains the API-billed engine that a shared service needs.

### House rules it always follows

- Software is read only from the workspace, never from an engineer's own `C:\SPD_Projects` working copy.
- Nothing is written to Jira. Nothing is committed to SVN without the engineer saying yes in the conversation.
- An error code is looked up in that order's own error table, never in a template or another order.
- Retrofits are built in the order's own software, never by rebuilding on the current template.
- Every investigation follows the same seven steps (intake, prior cases, pre-generated summaries, log census, delegation of big searches, targeted checks, write-up), which keeps a review to about ten rounds instead of thirty-five.

### What it costs

Measured over 14 chat conversations, at API list prices, before any optimisation:

| | Per conversation |
|---|---|
| Average | €4.44 |
| RB/ES ticket | €6.23 |
| Lab question | €3.73 |

These are an upper level, not a unit price. They were measured on Claude Opus 5; the current Opus 5.5 has a lower list price ($4/$20 per million tokens instead of $5/$25), and the token analysis found that over half of a session's cost is paid on a fixed context before any work starts, which can be reduced.

---

## Part 2: Steps and milestones to the web application

### The goal

A web page, open to everyone with access, where a colleague can ask any robot question, add a log or a zip, and get an answer with its sources, without installing anything. Answers go straight to the asker; there is no engineer review in front (decided 2026-10-27).

Behind the page there are **two lanes**:

1. **Knowledge lane (new).** Product, method, hardware, maintenance and "have we seen this before?" questions are answered from a shared search over the written knowledge, in one AI call, citing the pages used. Fast, roughly €0.10 per answer (estimate, not measured).
2. **Order lane (exists today, moves to a server).** Questions about one order's software, a log or a ticket run the full workflow that an engineer's PC runs now: check out the order, build its profile, read the log, reason over several rounds. Minutes, €3.73 to €6.23 per conversation (measured).

### What already exists, and what is missing

| Already built | Still missing |
|---|---|
| The chat engine, on the same skills and tools, in two channels | The web page itself: login, question, upload, follow-ups |
| An API-billed engine (Claude Agent SDK) for a shared service | An always-on server inside the company network |
| Cost logging per turn | An API account with a spend limit, and agreement with IT on data |
| Read-mostly behaviour (no Jira writes, no commits) | Tool permissions enforced by the server, not only by instructions |
| All the knowledge, in plain files | The shared search index over that knowledge (the knowledge lane) |
| | A queue per order, so two questions about one order never collide |
| | Someone besides Joost who can keep it running |

### Milestones

Sizes are relative (S = days, M = one to two weeks, L = several weeks of one person's time). They are not a schedule; the schedule depends on how much development time is allocated.

| # | Milestone | What it delivers | Done when | Size |
|---|---|---|---|---|
| **M0** | **Decisions and access** | IT's answers on hosting, network and data; an Anthropic API account with a monthly spend limit; login method (company SSO); a named backup maintainer | Each decision is written down with its owner | S, but depends on others' calendars |
| **M1** | **Shared search prototype** | A local search tool over the knowledge base, case base, known issues, dossiers and index cards, by keywords and by meaning | On past solved cases, the right write-up is in the top five for most questions (measured with the existing replay protocol) | M |
| **M2** | **Server foundation** | A Windows server inside the network with its own copy of the workspace, the templates, SVN and Jira read-only accounts, the log reader and the search index, kept up to date automatically | An order-lane question run on the server gives the same answer as on an engineer's PC | M |
| **M3** | **Order lane as a service** | The chat engine running unattended behind an internal API: per-order queue, enforced read-mostly permissions, upload handling for logs and zips, conversation storage, cost logging | Ten real lab and ticket questions run end to end through the API, two at once, with no collisions | L |
| **M4** | **Web page MVP** | Company login, ask and follow up, upload, live progress ("checking out the order", "reading the log"), answers with sources, the knowledge lane switched on | A pilot user asks a question without help and gets an answer | M |
| **M5** | **Pilot** | One department (Lab, as already decided), one or two people, a fixed period (about six weeks), baseline captured first | Agreed measures recorded: wrong answers, cost per conversation, Software Engineer time saved. Pilot users want to keep it | L (calendar time) |
| **M6** | **Hardening and wider rollout** | A confidence gate (an unsure answer goes to an engineer instead of being sent), monitoring and alerts, Helpdesk and then Sales on the knowledge lane | Runs a month without Joost having to intervene | M |

M1 can start now and runs alongside M0. M2 needs the server from M0. M3 and M4 can partly overlap once M2 is done.

### Decisions needed

| Decision | From whom | Why it matters |
|---|---|---|
| Where the server runs, and whether it may reach SVN and Jira | IT | The order lane needs both. Inside the company network, no VPN is needed |
| Whether customer logs, customer software and ticket content may be sent to Anthropic, and on which terms | IT / management | Every order-lane answer sends them. Running Claude inside the company's own cloud account is the fallback, and it is a configuration change, not a redesign |
| Monthly API budget and spend limit | Management | A shared service is billed per conversation; it cannot run on personal seats |
| Login method and who has access | IT | The page should use the company login, not a separate account |
| Backup maintainer | Management | A service many people depend on cannot rest on one person |
| How the search turns text into "meaning" (an embedding model) | IT, advised by Software Engineering | A cloud model sends the knowledge to that provider; a local model keeps it on the server. The knowledge is small enough for local |

### Main risks

| Risk | How it is handled |
|---|---|
| A confident wrong answer puts people off for good | Every answer cites its sources and shows page status; a search with no good match hands over instead of guessing; facts, inferences and open questions are kept apart; Software Engineering reads what was answered afterwards; a confidence gate follows in M6 |
| Cost grows with use | A hard monthly spend limit on the API account; cost logged per conversation and per department; the knowledge lane answers the cheap questions |
| The server fails and nobody notices | Health checks and an alert to a channel; a backup maintainer (M0) |
| Two questions about one order corrupt its checkout | A queue per order (M3) |
| The knowledge goes stale | The server pulls the workspace and rebuilds the index after every change |
