# Web application plan

> **Status:** proposal for discussion, November 2026. How it is built is on the child page **Architecture**.

## The goal

A website where anyone with a Skalar work account can ask Robotics-AI a question about our robots, without installing anything and from anywhere, including a customer site.

## What a user gets

- **Sign in with the Skalar work account.** No separate password. Access follows the company account, so leavers lose access automatically.
- **A personal dashboard** with their past conversations, what they have spent this month, and how much of their budget is left.
- **A chat.** A question can name an order number and come with a robot log (`.glf`). Follow-up questions continue the same conversation.
- **Live progress** while a longer question runs ("checking out the order", "reading the log").
- **Sources with every answer**, so the reader can check where it came from.
- **Feedback** on every answer (thumbs up or down, optional comment).
- **Sharing:** a conversation can be shared read-only with a colleague.
- **Velaris branding.**

The user never chooses an AI model. Robotics-AI picks one per question, behind the scenes.

## Two kinds of questions

| | General questions | Order questions |
|---|---|---|
| Examples | "How often should the YSI membrane be replaced?" · "Have we seen this error before?" · "Do we support meter X?" | "99441979 stops after the second sample", with the log attached |
| How it is answered | **RAG** (retrieval-augmented generation): a search over the written knowledge (knowledge base, solved cases, known template issues, order index cards) finds the relevant passages, and one AI call writes the answer from them, citing the pages used | The same investigation Robotics-AI runs for Software Engineering today: fetch the order's software, read its configuration and the log, reason over it |
| Speed and cost | Seconds, cents | Minutes, a few euros |

RAG keeps general questions cheap: only the few relevant passages are sent to the AI, not the whole knowledge base. How it works is on the **Architecture** page.

## Who can ask what

| Role | May ask |
|---|---|
| **General** | General questions. "Can we build X?" is answered with a pointer to similar past orders and a referral to Software Engineering, never with an implementation plan. |
| **Support** (e.g. Lab, service engineers) | + order questions with logs. Answers stay practical: what happened, what to check, what to change in which table. |
| **Engineering** (Software Engineering, PM and a few others) | + feasibility and implementation detail. |
| **Admin** | + all conversations and budget management. |

Every role reads the same written knowledge. What differs is how deep an answer goes into implementation.

## What it will not do

The website never changes anything. It does not commit to SVN, write to Jira, edit scripts or change order software, for any role. Those changes stay with Software Engineering in the Robotics-AI workspace. This is enforced by the server's permissions, not only by instructions to the AI.

## Budgets

- Every person has a monthly budget in euros. Budgets can differ per person and reset every calendar month.
- There is also a company-wide monthly limit, set in the AI provider's account as a final safety net.
- The budget is checked before each question. An answer that has started always finishes, even if it goes over.
- A user who has reached their limit can request more.
- The cost of every AI call is recorded, so spend can be reported per person, per department and per kind of question.

## Data

- As in Robotics-AI today, questions, logs and relevant parts of order software are sent to Anthropic (the AI provider). The website does this through a Skalar company API account.
- Uploaded files are deleted after a retention period. Conversation text is kept, so answers can be reviewed and improved.
- Conversations are visible to the user, to colleagues they share them with, and to admins.

## Proposed phases

| Phase | Delivers |
|---|---|
| **0. Access** | IT: server, app registration for the work-account login, outside access through Microsoft. A company API account with a spend limit. |
| **1. General questions** | The RAG search index, and the website with login, dashboard, budgets and chat, answering general questions. Used by a small test group. |
| **2. Order questions** | Order numbers and log uploads, the full investigation, live progress. |
| **3. Wider use** | More users. Later: customer software uploads, e-mail or Teams notice when a long answer is ready, a cost indication per kind of question once enough real data exists. |

## Decisions still open

| Decision | With |
|---|---|
| Licence for Microsoft's outside access (Entra application proxy) | IT |
| Server and database (Skalar may already run a SQL Server) | IT |
| Monthly company budget, and who sets and approves personal budgets | Management |
| Who manages role membership | IT / project |
| Whether a single question gets a maximum cost | Project |
| Retention period for uploaded files | Project / IT |
