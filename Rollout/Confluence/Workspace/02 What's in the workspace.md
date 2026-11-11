# What's in the workspace

The workspace has four kinds of content: **instructions**, **procedures**, **scripts** and **knowledge**. It also connects to a few company systems, read-only.

## Instructions

One shared instruction file that every assistant reads first. It explains how our software works: how an application runs through the Sequence and SubSequence tables, how actions are built, which tables live in which file, what the templates are, and the naming used in order folders. It also sets the ground rules.

## Procedures (skills)

A skill is a written, step-by-step procedure for one kind of work. The assistant picks the right one from the wording of the question; nobody has to name it.

| Skill | Used for |
|---|---|
| Lab issue | A robot problem reported with an order number and usually a log: get the exact software, check known problems, diagnose |
| Log analysis | Reading a binary robot log (`.glf`) and explaining what happened |
| Service ticket | Investigating an RB or ES ticket from its text, attachments and the customer's own software; drafting a reply |
| Precedent search | "Have we built this before?": find earlier orders with a feature and describe what to copy |
| Feature interview | Asking questions one at a time until a feature request is sharp enough to search for or build |
| Feature implementation | Changing an order's tables and action code, adding racks, sequences, settings or error codes |
| Code reference | How the C# action code and the robotics application itself are structured |
| Customer software to SVN | Putting the software running at a customer onto SVN, step by step, with a person deciding each step |
| Package upload | Zipping an order's software from SVN and sending it through WeTransfer |
| Session wrap-up | Deciding what from a piece of work is worth keeping, and filing it in the right place |

## Scripts

Scripts do the mechanical work, the same way every time.

| Job | What the scripts do |
|---|---|
| **Getting software** | Check out an order or template from SVN, or install a customer's zip as its own folder; refresh it when the lab commits again |
| **Preparing it for the AI** | Build each order's one-page profile (hardware and settings), readable Sequence and SubSequence lists, and a readable copy of the action code |
| **Tickets and approvals** | Download a service ticket with all attachments and the customer's software; download and convert every document attached to a B-system order |
| **Making changes** | Add rack types and lay out trays; upgrade diluters in an order's own software; update old orders to the current robotics core; check that every new movement has a position defined |
| **Testing without hardware** | Switch a copy of an order to emulation, build it in the real application, run an analysis to the end and compare the result with a baseline |
| **Keeping knowledge current** | Rebuild the order index and the known-issues pages from SVN and Jira |

## Knowledge

| Source | What it is |
|---|---|
| **Case base** | Write-ups of solved problems: lab cases, service tickets, feature ports, order approvals and template defects. Each opens with a four-line summary (symptom, cause, fix, scope) |
| **Template Known Issues** | One page per template, generated from the Jira RMT board: every known template defect, whether it is fixed, and which SVN commit fixed it |
| **Order index cards** | One short card for each of the 1,276 delivered orders: its name, which template it came from, and every commit that added a feature |
| **Feature dossiers** | Reusable descriptions of features built before: the reference order, what to copy, what not to copy |
| **Product knowledge base** | Written by product management: methods, parameters, hardware modules, maintenance and troubleshooting. BOD is complete; the other applications follow the same model |
| **Template documentation** | System overviews and application descriptions per template, where they exist (BOD and Waters so far) |
| **Robot software** | Every software template, and any order on request, checked out from SVN |
| **Robotics core and plugin source** | For questions about how the application itself behaves |

## Connections

| System | Used for |
|---|---|
| **SVN** | Checking out order and template software. Read-only unless a person explicitly approves a commit |
| **Jira** | Reading service tickets, B-system orders and the RMT board. Never written to |
| **Confluence** | Reading the Software Setup and "in Details" guides |
| **Log reader** | A dedicated reader for the binary robot logs, which cannot be read as text |
