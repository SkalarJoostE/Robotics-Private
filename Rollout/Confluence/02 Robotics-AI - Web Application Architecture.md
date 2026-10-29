# Robotics-AI web application: architecture

> **Status:** proposal for discussion, 2026-10-27 · **Owner:** Joost (Software Engineering)
> **Parent page:** *Robotics-AI: what it is today, and the road to a web application*.
> Nothing on this page is built yet, except where it says "exists today".

## Principles

1. **The web page is a new front door, not a new assistant.** Behind it runs the same workspace an engineer uses: the same instructions, skills, tools and knowledge. Nothing is re-implemented, so an answer on the web is the answer an engineer would get, and every improvement to the workspace improves the web app the same day.
2. **Two lanes.** Knowledge questions take a fast, cheap path through a search index. Questions about one order, a log or a ticket take the full investigation. The router sends anything that names an order number, a log or a ticket to the full path.
3. **Inside the company network.** The order lane needs SVN, Jira and Windows tools. A server inside the network reaches SVN directly, without VPN, and only talks to the outside world over HTTPS to the AI provider and Atlassian.
4. **Read-mostly, enforced by the server.** The web app diagnoses and drafts. It never posts to Jira, never commits to SVN, and never changes order software outside its own copy. These limits are set in the server's configuration, not only asked for in the instructions.
5. **Start with one server.** One Windows server can carry the pilot. Split it up only when measured load asks for it.

## Overview

```
                 ┌──────────────────────────────────────────────────────────────┐
  Colleague      │  Windows server inside the company network                   │
  (browser)      │                                                              │
     │  company  │  ┌────────────┐   ┌──────────┐                               │
     └── login ──┼─►│  Web app   │──►│  Router  │                               │
                 │  │ page + API │   └────┬─────┘                               │
                 │  └─────┬──────┘        │                                     │
                 │        │      ┌────────┴──────────────┐                      │
                 │        │      ▼                       ▼                      │
                 │        │  KNOWLEDGE LANE          ORDER LANE                 │
                 │        │  search index ──►        job queue (one per order)  │
                 │        │  one AI call             agent workers running the  │
                 │        │  with sources            workspace: skills, scripts,│
                 │        │                          log reader, search         │
                 │        │                               │                     │
                 │        ▼                               ▼                     │
                 │  ┌──────────────┐   ┌─────────────────────────────────────┐  │
                 │  │ Database     │   │ Workspace copy (git), templates,    │  │
                 │  │ conversations│   │ order checkouts, uploads            │  │
                 │  │ jobs, costs  │   └──────┬──────────────┬───────────────┘  │
                 │  └──────────────┘          │              │                  │
                 └────────────────────────────┼──────────────┼──────────────────┘
                                              ▼              ▼
                     SVN server (internal)   Jira / Confluence     Claude API
                     read-only account       read-only token       (HTTPS out)
```

## Components

| Component | Job | Built on (proposal) | Exists today? |
|---|---|---|---|
| **Web page** | Login, ask a question, add a log or zip, follow up, see live progress and the answer with its sources, see earlier conversations | A small single-page web app; answers stream in as they are written | No |
| **Web API** | Checks the login, stores conversations, accepts uploads, hands questions to the router, streams progress back | Python (FastAPI), so it can call the existing chat engine directly | No |
| **Router** | Decides the lane. Rule first: an order number, a ticket key or an attached log means the order lane. Otherwise the knowledge lane, which hands over to the order lane when it finds nothing good | Plain rules; a small, cheap model only for unclear cases | No |
| **Knowledge lane** | Searches the written knowledge, puts the best passages in front of the model, gets one answer that cites them, shows page status and date | Shared search index + one Claude API call | No (designed in the RAG Assessment) |
| **Shared search** | Finds passages by keywords and by meaning over the knowledge base, case base, known issues, dossiers, index cards and template docs. Also usable by Claude Code, Copilot and Codex, so everyone searches the same way | One index file on disk (about 5 MB of text), rebuilt after each change; exposed as a local tool server like the log reader | No |
| **Order lane: job queue** | Runs order-lane questions in the background. One question per order at a time, several orders in parallel, with a cap on how many run at once | A queue table in the database with a lock per order | No |
| **Order lane: agent worker** | Runs one investigation: the same skills and tools as an engineer's session, over several rounds, with follow-up questions in the same conversation | The chat engine from `lab-chat-poc`, on its API engine (Claude Agent SDK) instead of a personal subscription | **Partly**: the engine and its API variant exist; running unattended for many users does not |
| **Workspace copy** | The server's own clone of Robotics-AI, the templates and every order asked about | git and SVN, with the existing checkout and post-processing scripts | The scripts exist |
| **Workspace sync** | Pulls the latest workspace, refreshes templates, rebuilds the search index | A scheduled task (and later a trigger on each merge) | No |
| **Database** | Conversations and their transcripts, jobs, uploads, cost per turn, feedback | SQLite for the pilot; PostgreSQL if it outgrows it | Cost logging exists as a CSV |
| **Model access** | All AI calls | Anthropic API under a company account, with a monthly spend limit; per-department attribution | Personal subscription today |

## A question's journey

**Knowledge question** ("Which rinse vessel goes with a YSI probe?")

1. The router finds no order number, ticket or log, so it picks the knowledge lane.
2. The search returns the best passages with their file, status (`draft`, `reviewed`, `verified`) and date.
3. One AI call writes the answer from those passages and cites them.
4. If nothing good was found, the page says so and offers to run the full investigation instead of guessing.
5. Seconds, roughly €0.10 (estimate).

**Order question** ("99441979 stops after the second sample", with a log attached)

1. The router sees an order number and a log, so it picks the order lane and queues a job for order 99441979.
2. When that order is free, a worker takes the job. The page shows live progress.
3. The worker follows the lab-issue skill exactly as on an engineer's PC: refresh the order from SVN, regenerate its profile and Sequence CSVs, put the log in the order's Log folder, search prior cases (now through the shared search), read the log through the log reader, reason over tables and code.
4. The answer is written into the conversation; the colleague can ask a follow-up and the worker still has everything it read.
5. Minutes, €3.73 to €6.23 at today's measured rates.

A ticket question works the same way, with the ticket scraper as step 3's intake.

## Hosting and network

- **One Windows server (virtual machine), inside the company network.** Windows because the tools are PowerShell, the code mirror is built by `SkPack_SyncCLI.exe` and the log reader is a Windows build. Inside the network because SVN is an internal server; there it needs no VPN.
- **Outbound only:** HTTPS to the Anthropic API and to Atlassian. Nothing on the server needs to be reachable from outside the company.
- **Sizing:** the heavy work happens at the AI provider, so CPU and memory needs are modest. Disk is the real need: every order asked about stays checked out, so plan generous disk and a clean-up rule for orders not asked about in, say, 90 days.
- **Service accounts:** SVN read-only, a Jira/Confluence read-only token, the Anthropic API key. Kept in the Windows credential store, never in the repository.
- **What it does not need:** the Skalar Robotics application itself. Build and emulation tests stay on an engineer's PC.

## Security and data

- **Login:** the company login (single sign-on), so access follows existing accounts and leavers lose access automatically. Two roles at first: *asker*, and *maintainer* (Software Engineering), who can read all conversations.
- **What leaves the company:** the question, uploaded logs, relevant parts of the order software and ticket content go to the AI provider. This needs IT's written agreement, including the provider's data-retention terms. If IT prefers, Claude can run inside the company's own cloud account (AWS, Google Cloud or Microsoft); that is a configuration change.
- **Permissions:** the agent worker gets an explicit list of allowed tools and folders. It may run the read-side scripts and write only inside its own job folders. No `git push`, no `svn commit`, no Jira writes, no robot application. The proof of concept skips these checks to run unattended; the service may not.
- **Uploads are untrusted:** size limits, extracted into a fresh folder per job, never executed.
- **Answers go straight to the asker** (decided 2026-10-27). The safeguards are in the answer itself: cited sources, page status, facts kept apart from guesses, and a hand-over when nothing good was found.

## Cost control

- **A hard monthly spend limit** on the API account, and a lower one per department if wanted.
- **Cost logged per conversation**, per lane and per department, from day one (the logging exists in the proof of concept).
- **Limits per conversation:** a maximum number of rounds, and a cap on how many order-lane jobs run at once.
- **Model per lane:** the order lane runs on the current Opus model (Claude Opus 5.5), because quality matters most there. The knowledge lane may use a cheaper model (Claude Sonnet 5.5) if testing shows the answers hold up. Prompt caching keeps the fixed instructions from being paid for in full on every round.
- **The cheapest question is the one the knowledge lane answers.** Every knowledge-base page written moves questions from the €4 lane to the €0.10 lane.

## Keeping it current and learning from use

- **Sync:** the server pulls the workspace from git (the same branch the Lab pilot uses), refreshes templates and rebuilds the search index, on a schedule and after merges.
- **Feedback:** every conversation is stored with its transcript. A thumbs up/down and a comment field on each answer. Software Engineering reads them, and what proves correct is promoted into the case base through the existing review route, which in turn improves the next answer.
- **Monitoring:** a health page (SVN reachable, Jira reachable, log reader running, index age, queue length, spend this month) and an alert to a Teams channel when something fails.

## Deliberately left out of the first version

| Left out | Why |
|---|---|
| Writing to Jira, committing to SVN, changing order software | Stays with an engineer, as in the workspace's house rules |
| Builds and emulation tests in the robot application | Needs the application on Windows with a desktop session; stays on an engineer's PC |
| A Teams bot | Needs an Azure app registration and tenant-admin consent; the web page comes first |
| Customer access | The knowledge base marks itself internal; would need audience filtering first |
| Several servers, high availability | Not needed for a pilot; revisit with measured load |

## Open architecture decisions

| Decision | Options | Recommendation |
|---|---|---|
| Where the server runs | On-premises VM · company cloud with a connection to the network | **On-premises VM**: SVN and the robot-software tooling are already inside the network |
| Model provider route | Anthropic API directly · Claude inside the company's cloud account | **Anthropic API**, unless IT requires the cloud route |
| Embedding model for the search | Local model on the server · cloud provider under the same agreement | **Local**: the knowledge is small, and nothing extra leaves the company |
| Web front end | Single-page app · server-rendered pages | **Small single-page app**, for live progress streaming |
| Database | SQLite · PostgreSQL | **SQLite** for the pilot |
| Answer delivery for long order questions | Wait on the page · notify when done | **Live progress on the page**, with an e-mail or Teams notice when done as a later addition |
