# Robotics-AI web app — design decisions (working notes)

> Working notes for the fresh design started 2026-11-06. Not for publication; the Confluence pages are
> rewritten from this once the design is settled. The earlier "Web application plan" pages, flowchart 11
> and the RAG Assessment are **not** inputs to this design.
> Chats do not sync between PCs; this file is the shared state of the design conversation.

## Brief (Joost, 2026-11-06)

- Anyone with a Skalar work account opens a site and logs in with their work email.
- Personal dashboard: past conversations, this month's spend, remaining personal budget.
- Velaris branding.
- New chat: optional order number, upload a log or a zip; Robotics-AI does what it does today.
- General robotics questions answered through RAG over the knowledge base, to keep them cheap (asked for by the project manager, also as a learning goal).
- The model (Opus, Sonnet, …) is chosen behind the scenes by question type; the user never picks it.

## Decided

| # | Date | Decision |
|---|---|---|
| D1 | 2026-11-06 | Audience: everyone in the end; a small selected test group first. |
| D2 | 2026-11-06 | Must be reachable from outside the company network without VPN (engineers at customer sites). |
| D3 | 2026-11-06 | Login with the Skalar Microsoft 365 account (Microsoft Entra ID). Joost knows the IT contact who can register the app. |
| D4 | 2026-11-06 | Budgets differ per person; reset every calendar month; who sets them is TBD. |
| D5 | 2026-11-06 | A conversation turn that starts within budget always finishes, even if it goes over; the next one is refused. |
| D6 | 2026-11-06 | Users at their limit can request more budget. |
| D7 | 2026-11-06 | A company-wide monthly limit exists next to the personal ones. |
| D8 | 2026-11-06 | Claude writes the code, in Python; every script comes with an explanation of how it works and why it was built that way. |
| D9 | 2026-11-06 | The knowledge base is `knowledge-base\` in this workspace (WIP on a PM/product-specialist branch; changes rarely once done). Case base and Template Known Issues are candidate RAG sources too. |
| D10 | 2026-11-06 | Preferred route for outside access: Microsoft Entra application proxy (pre-authenticated, nothing opened inbound). Licence to be confirmed with IT. |
| D11 | 2026-11-06 | Budget is tracked as a ledger (one row per AI call), checked before a turn starts; the company limit is also set in the Anthropic account as a safety net. |
| D12 | 2026-11-06 | Conversations are visible to the user and to admins; a user can share a conversation with a colleague. |
| D13 | 2026-11-06 | The web version never changes anything: no SVN commits, no Jira writes, no script or software edits, no case-base logging. |
| D14 | 2026-11-06 | Not everyone may get every kind of answer: feasibility / "how would we implement this" answers are only for Software Engineering, PM and a handful of others. Role design open (round 3). |
| D15 | 2026-11-06 | A second question on an order that is busy waits, and the user sees that it is waiting. |
| D16 | 2026-11-06 | Uploads: mostly `.glf` logs; customer software zips wanted too. |
| D17 | 2026-11-06 | ~~A "this didn't help, dig deeper" button hands a cheap answer to the full agent.~~ Withdrawn, see D41. |
| D18 | 2026-11-06 | Live progress on the page first; email/Teams notification later. |
| D19 | 2026-11-06 | Money shown and budgeted in euros for now. |
| D20 | 2026-11-06 | Roles, as a working basis (details later): General (knowledge questions) · Support (+ order questions with logs/zips) · Engineering (+ feasibility and implementation detail) · Admin (+ all conversations, budgets). |
| D21 | 2026-11-06 | Support-tier answers stay operational ("the probe goes to the wrong height, check the Height table row X"), never action-code level. |
| D22 | 2026-11-06 | A General user asking "can we build X?" gets a precedent pointer ("we built something similar on order 99xxxxxx; Software Engineering must confirm"), no implementation detail. |
| D23 | 2026-11-06 | All written knowledge (knowledge base, case base incl. customer names, known issues) is available to every tier; the restriction is on drifting into implementation plans, not on information. |
| D24 | 2026-11-06 | The web stays read-only for the Engineering tier too; real changes happen in the workspace on a PC. |
| D25 | 2026-11-06 | "Read-only" means nothing outside the server's own copy changes: the worker may check out orders, extract uploads and regenerate CSVs/profiles in its own folders (fetch-project and friends), but cannot commit, write Jira, or run scripts outside an allowlist. |
| D26 | 2026-11-06 | General and Support read all written knowledge plus the order index cards. Feature dossiers are Engineering only; action code and tables are read by the agent for Support (to diagnose) and Engineering. |
| D27 | 2026-11-06 | RAG, not "whole knowledge base in every prompt"; prompt caching is used for the fixed instructions and for follow-ups. |
| D28 | 2026-11-06 | No Jira tickets on the web: escalated tickets are Software Engineering's, and Helpdesk gets its own seats. No ticket scraper on the server. |
| D29 | 2026-11-06 | A conversation that needs the full agent (e.g. a log is uploaded) moves to it in place, carrying its history; it stays there for the rest of that conversation. |
| D30 | 2026-11-06 | An order number typed in the text counts the same as one entered in the order-number field. |
| D31 | 2026-11-06 | Uploaded files are deleted after a retention period; conversation text is kept indefinitely. |
| D32 | 2026-11-06 | Shared conversations are read-only for the colleague they are shared with. |
| D33 | 2026-11-06 | The site itself is English only; answers follow the language of the question. |
| D34 | 2026-11-06 | Thumbs up/down plus optional comment on every answer, visible to admins. |
| D35 | 2026-11-06 | Front end in React. Back end in Python (FastAPI). |
| D36 | 2026-11-06 | The web app's code gets its own repository in Skalar's Bitbucket. |
| D37 | 2026-11-06 | The server serves a release branch of the Robotics-AI workspace, never `main`. |
| D38 | 2026-11-06 | Start on SQLite; Joost asks IT whether Skalar runs a SQL Server to move to later. |
| D39 | 2026-11-06 | First version accepts robot logs only; customer software zips later. |
| D40 | 2026-11-06 | The agent's working record is kept about a year; conversation text indefinitely. |
| D41 | 2026-11-06 | No "Dig deeper" button: it invites clicking regardless. A better escalation may be designed later. |
| D42 | 2026-11-06 | No separate data-approval question: logs and order software already go to Anthropic in today's Robotics-AI use; the web only changes the billing route (API account). |
| D43 | 2026-11-06 | RAG is named explicitly on the Confluence pages, with its own section on the Architecture page (sources, index preparation, answering, quality check). |

## Open

- Who manages role membership: Joost hopes to (via being made owner of the Entra app, or an admin page).
- Cost shown before an expensive question: no reliable estimate yet (lab POC is too few cases); collect real costs per question type first.
- Per-question cost cap: Joost decides later ("if a question really hits a cap, something is wrong").
- Retention period for uploads.
- The release process for the workspace branch (who releases, how).
- Phasing on the Confluence plan page is Claude's proposal, not yet confirmed by Joost.
- Who sets and approves budgets (D4, D6).
- The web app needs its own API account (Claude Console); the Team plan does not cover API usage.
- Roles: which tiers, which departments in each, what each may ask, who manages membership.
- Upload size limits.
- How the router picks a model.
- Hosting: a Windows VM inside the network; the Entra licence (D10).
