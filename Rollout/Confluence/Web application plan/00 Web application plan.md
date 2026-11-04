# Web application plan

> **Status:** proposal for discussion. The milestones below are meant to become Jira epics and tickets.

A web page where anyone with access can ask a robot question, add a log or a zip, and get an answer with its sources, without installing anything. How it would be built is on the child page **Architecture**.

## The goal

A web page, open to everyone with access, where a colleague can ask any robot question, add a log or a zip, and get an answer with its sources, without installing anything. Answers go straight to the asker; there is no engineer review in front (decided 2026-10-27).

Behind the page there are **two lanes**:

1. **Knowledge lane (new).** Product, method, hardware, maintenance and "have we seen this before?" questions are answered from a shared search over the written knowledge, in one AI call, citing the pages used. Fast, roughly €0.10 per answer (estimate, not measured).
2. **Order lane (exists today, moves to a server).** Questions about one order's software, a log or a ticket run the full workflow that an engineer's PC runs now: check out the order, build its profile, read the log, reason over several rounds. Minutes, €3.73 to €6.23 per conversation (measured).

## What already exists, and what is missing

| Already built | Still missing |
|---|---|
| The chat engine, on the same skills and tools, in two channels | The web page itself: login, question, upload, follow-ups |
| An API-billed engine (Claude Agent SDK) for a shared service | An always-on server inside the company network |
| Cost logging per turn | An API account with a spend limit, and agreement with IT on data |
| Read-mostly behaviour (no Jira writes, no commits) | Tool permissions enforced by the server, not only by instructions |
| All the knowledge, in plain files | The shared search index over that knowledge (the knowledge lane) |
| | A queue per order, so two questions about one order never collide |
| | A second maintainer who can keep it running |

## Milestones

Sizes are relative (S = days, M = one to two weeks, L = several weeks of one person's time). They are not a schedule; the schedule depends on how much development time is allocated.

| # | Milestone | What it delivers | Done when | Size |
|---|---|---|---|---|
| **M0** | **Decisions and access** | IT's answers on hosting, network and data; an Anthropic API account with a monthly spend limit; login method (company SSO); a named backup maintainer | Each decision is written down with its owner | S, but depends on others' calendars |
| **M1** | **Shared search prototype** | A local search tool over the knowledge base, case base, known issues, dossiers and index cards, by keywords and by meaning | On past solved cases, the right write-up is in the top five for most questions (measured with the existing replay protocol) | M |
| **M2** | **Server foundation** | A Windows server inside the network with its own copy of the workspace, the templates, SVN and Jira read-only accounts, the log reader and the search index, kept up to date automatically | An order-lane question run on the server gives the same answer as on an engineer's PC | M |
| **M3** | **Order lane as a service** | The chat engine running unattended behind an internal API: per-order queue, enforced read-mostly permissions, upload handling for logs and zips, conversation storage, cost logging | Ten real lab and ticket questions run end to end through the API, two at once, with no collisions | L |
| **M4** | **Web page MVP** | Company login, ask and follow up, upload, live progress ("checking out the order", "reading the log"), answers with sources, the knowledge lane switched on | A pilot user asks a question without help and gets an answer | M |
| **M5** | **Pilot** | One department (Lab, as already decided), one or two people, a fixed period (about six weeks), baseline captured first | Agreed measures recorded: wrong answers, cost per conversation, time saved for the people who answer these questions today. Pilot users want to keep it | L (calendar time) |
| **M6** | **Hardening and wider rollout** | A confidence gate (an unsure answer goes to an engineer instead of being sent), monitoring and alerts, Helpdesk and then Sales on the knowledge lane | Runs a month without the maintainer having to intervene | M |

M1 can start now and runs alongside M0. M2 needs the server from M0. M3 and M4 can partly overlap once M2 is done.

## Decisions needed

| Decision | From whom | Why it matters |
|---|---|---|
| Where the server runs, and whether it may reach SVN and Jira | IT | The order lane needs both. Inside the company network, no VPN is needed |
| Whether customer logs, customer software and ticket content may be sent to Anthropic, and on which terms | IT / management | Every order-lane answer sends them. Running Claude inside the company's own cloud account is the fallback, and it is a configuration change, not a redesign |
| Monthly API budget and spend limit | Management | A shared service is billed per conversation; it cannot run on personal seats |
| Login method and who has access | IT | The page should use the company login, not a separate account |
| Backup maintainer | Management | A service many people depend on cannot rest on one person |
| How the search turns text into "meaning" (an embedding model) | IT, with the maintainers | A cloud model sends the knowledge to that provider; a local model keeps it on the server. The knowledge is small enough for local |

## Main risks

| Risk | How it is handled |
|---|---|
| A confident wrong answer puts people off for good | Every answer cites its sources and shows page status; a search with no good match hands over instead of guessing; facts, inferences and open questions are kept apart; maintainers read what was answered afterwards; a confidence gate follows in M6 |
| Cost grows with use | A hard monthly spend limit on the API account; cost logged per conversation and per department; the knowledge lane answers the cheap questions |
| The server fails and nobody notices | Health checks and an alert to a channel; a backup maintainer (M0) |
| Two questions about one order corrupt its checkout | A queue per order (M3) |
| The knowledge goes stale | The server pulls the workspace and rebuilds the index after every change |
