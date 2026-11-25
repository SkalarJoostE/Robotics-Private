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
| D8 | 2026-11-06 | Claude writes the code, ~~in Python~~ (language: D44); every script comes with an explanation of how it works and why it was built that way. |
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
| D35 | 2026-11-06 | Front end in React. ~~Back end in Python (FastAPI).~~ Back end changed by D44. |
| D36 | 2026-11-06 | The web app's code gets its own repository in Skalar's Bitbucket. |
| D37 | 2026-11-06 | The server serves a release branch of the Robotics-AI workspace, never `main`. |
| D38 | 2026-11-06 | Start on SQLite; Joost asks IT whether Skalar runs a SQL Server to move to later. |
| D39 | 2026-11-06 | First version accepts robot logs only; customer software zips later. |
| D40 | 2026-11-06 | The agent's working record is kept about a year; conversation text indefinitely. |
| D41 | 2026-11-06 | No "Dig deeper" button: it invites clicking regardless. A better escalation may be designed later. |
| D42 | 2026-11-06 | No separate data-approval question: logs and order software already go to Anthropic in today's Robotics-AI use; the web only changes the billing route (API account). |
| D43 | 2026-11-06 | RAG is named explicitly on the Confluence pages, with its own section on the Architecture page (sources, index preparation, answering, quality check). |
| D44 | 2026-11-11 | Back end in C#, ASP.NET Core, replacing Python/FastAPI (D35): most Skalar back ends are ASP.NET, so colleagues can maintain it, and Entra login is Microsoft's own library. The Python Agent SDK is not needed for the agent: it only starts the bundled Claude Code program and exchanges JSON lines with it. The back end does the same directly (`claude -p`, `stream-json`), as `lab-chat-poc\lab_triage_cli.py` already does. The tool allowlist is set by Claude Code's flags and settings. |
| D45 | 2026-11-11 | The Claude Code version on the server is pinned and updated on purpose, because the back end depends on its command-line flags and output format. |
| D46 | 2026-11-11 | The search index is built in C# as well (local embedding model through ONNX Runtime, SQLite keyword index). Only if the embedding model proves impractical in ONNX, a small Python helper computes embeddings and nothing else. |
| D47 | 2026-11-17 | The back end follows the conventions of Skalar's `toc-be` (reference clone in `Reference\toc-be`): projects Common / Persistence / Domain / WebAPI plus tests; one model type per layer (`*Entity`, domain, `*Model`) with `ToDomain()`/`ToAPI()` mappers; controllers → providers → services → repositories; central package management, warnings as errors, `.editorconfig` enforced on build; NLog; Swashbuckle with `swagger.json` committed; xUnit v3, Moq, Reqnroll, WebApplicationFactory; EF Core with SQLite; Conventional Commits carrying the Jira key. Added beyond toc-be: ProblemDetails error responses, a mapped `/health`, IOptions configuration, Entra ID login via Microsoft.Identity.Web. |
| D48 | 2026-11-17 | Live progress to the browser goes over SignalR, as in other Skalar apps. |
| D49 | 2026-11-17 | The front end is a separate React app in this project's repo, ~~built on the published `@skalar/*` packages (Azure Artifacts feed `skalar-npm`, read access requested),~~ not inside `skalar-fe`. Package use replaced by D53. |
| D50 | 2026-11-17 | Code lives in Bitbucket `skalaranalytical/robotics-ai-web`: `backend/` and `frontend/`. Single developer, so commits go straight to `main` without branches or pull requests. The API runs locally on port 5190 (5180 is the SP2000 simulator). |
| D51 | 2026-11-17 | Work is tracked on Jira board RBTAI with components Workspace / Web app / Simulator. Tickets state the work only (Why / Done when). |
| D52 | 2026-11-24 | Three stages. **1 — self-hosted:** the full application on Joost's PC (localhost), for Joost only, with the development sign-in (RBTAI-44) until IT registers the Entra app; questions go through the chat as an end user's would, answered on Joost's Claude subscription, no API calls. **2 — in company:** anyone on the Skalar network can log in and use it. **3 — outside the company:** reachable from anywhere, login with Skalar credentials (D2, D10). |
| D53 | 2026-11-24 | The front end does not use the `@skalar/*` packages. It takes what it needs from the `skalar-fe` repository (reference clone in `Reference\skalar-fe`) into this project; anything missing is added in this project only. No pull requests to `skalar-fe` unless there is a strong reason. |
| D54 | 2026-11-24 | Every question goes through Claude Code (`claude -p`, D44), in two settings: **Knowledge** (our own system prompt, the search as its only tool, filtered by role) and **Deep dive** (the full workspace and the allowlisted scripts; a conversation moves there when a log or order comes in, D29). The back end reaches it through its own small `IAnswerEngine` interface, with a fake implementation for tests. No Anthropic SDK or `IChatClient` route: one is added behind the same interface only if stage 1 measurements (tokens and duration per question) show Claude Code's overhead matters for knowledge questions. |

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
- Whether a small step first classifies the question (part list / general knowledge / deep dive) to focus the search, and with what (local model, Haiku, or the answering model's own search tool).
- Hosting: a Windows VM inside the network; the Entra licence (D10).
