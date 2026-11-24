# Demo script: Robotics-AI web app back end (Tuesday 24 Nov 2026)

Everything below was run on the work laptop on Friday 20 Nov 2026, with the results shown. About 10 minutes in
total. Each search takes 4-5 seconds, because it loads the language model first.

## Before the meeting (Tuesday morning, 5 minutes)

Open PowerShell and run these once. The build makes sure the program is current; the tests show that everything
still passes (you can mention "90 of 90" in the meeting).

```powershell
cd C:\Users\essebaggers.j\Documents\Robotics-AI\robotics-ai-web
```

```powershell
dotnet build backend/RoboticsAI.sln -c Release
```

```powershell
cd backend; dotnet test --solution RoboticsAI.sln -c Release; cd ..
```

Expected: `Build succeeded`, then `total: 90, failed: 0, succeeded: 90` after about a minute.
(The tests must be started from `backend\`, see the note at the end.)

Then make the window large, the font bigger (Ctrl + mouse wheel), and set up the session you'll demo in:

```powershell
cd C:\Users\essebaggers.j\Documents\Robotics-AI\robotics-ai-web
```

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
```

```powershell
$ix = ".\backend\RoboticsAI.Indexer\bin\Release\net10.0\RoboticsAI.Indexer.exe"
```

`$ix` is just a short name for the program, so you don't type the long path six times. The encoding line makes
dashes and the `§` sign print correctly.

## Opening (say, ~1 minute)

> "The web app is built in phases. Phase 1 lets colleagues ask general questions and get an answer with its
> sources. An answer can only be as good as the passages it is written from, so I built the search first. That part
> is finished and tested. What I'll show is the real program running on the real knowledge: the knowledge base, all
> our case write-ups, the known template issues and the 1,276 order cards. No AI writes an answer yet. That's the
> next ticket, and it needs a decision from you."

## 1. What's in the index (`estimate`)

```powershell
& $ix estimate
```

Seen on Friday:

```text
The next build only processes changed pages.
2552 pages found: 0 to process, 0 to remove.
```

Say:

> "There are about 2,550 pages. Building everything from scratch takes about 1 hour 10 minutes on the laptop's
> graphics card. After that, only changed pages are reprocessed. When someone writes a new case report, the index
> picks it up in seconds."

If it shows "1 to process" or more (someone added a page since), that's even better. Run `& $ix build` and show
that it finishes in about 8 seconds. On Friday a new page was added: `1 added, 2551 unchanged ... embedded in
00:00:07`.

## 2. A real lab question, in Dutch: turbidity QC fails although it's within limits

```powershell
& $ix search "Ik heb turbidity QCs gedraaid (10 en 400). Hij zegt QC failed ook al zijn ze binnen specs. Ligt het aan de naam?" --limit 5
```

Seen: **#1 and #2 are the 99441075 write-up** "Turbidity QC always fails, column name mismatch", and #3 is the
Waters template issue for the same bug.

Say:

> "This is close to how a colleague asked it in the lab. The answer is in a case write-up from April: the criteria
> point at a column name that doesn't exist, so the value reads as 0 and every QC fails. The search puts that
> write-up first. Look at the 'meaning #1, keyword #1' line: two different searches both ranked it first."

## 3. The empty dispenser dropdown (99444892)

```powershell
& $ix search "Ik kan geen dispenser selecteren in de syringe check sample analysis tabel" --limit 5
```

Seen: **#1 is the Lab Questions write-up for 99444892** (the empty dispenser dropdown). #5 is the BOD Software
Setup section about the same table.

Say:

> "A question the lab sent me in August. The write-up I made then comes back first. Every question we answer and
> write up makes the next one cheaper to answer."

## 4. Where is a setting? (`TitrationWithDetailedResults`)

```powershell
& $ix search "Titrationwithdetailedresults staat op true maar moet naar false. Waar vind ik dit?" --limit 5
```

Seen: **#1 is the RB-358 write-up**, the passage that names `config/RoboticsConfig.xml`.

Say:

> "This one came in as a support ticket. The answer, the file `config\RoboticsConfig.xml`, is in the passage that
> comes first."

## 5. Roles: who may see what

```powershell
& $ix search "COD titer from the standard rack" --role General --limit 5
```

```powershell
& $ix search "COD titer from the standard rack" --role Engineering --limit 5
```

Seen: as **General**, #1 is the 99446390 order-approval write-up and no feature dossier appears. As
**Engineering**, **#1 is the feature dossier** "COD titer from the CalibrationStandards (STANDARD) rack".

Say:

> "Each user gets a role: General, Support, Engineering or Admin. The feature dossiers, our implementation recipes,
> are for Engineering only, so the search leaves them out for anyone else before it ranks anything. Which
> departments get which role is one of the decisions I need from you."

## 6. What doesn't work yet (be open about it)

```powershell
& $ix search "welke sample-rekken hebben we allemaal voor een BOD-systeem" --limit 5
```

Seen: general BOD pages. The page that actually answers it, **Racks and containers**, isn't in the top 5 (or the
top 15).

```powershell
& $ix search "BOD sample racks" --limit 5
```

Seen: **#1 and #2 are Racks and containers**.

Say:

> "A natural Dutch sentence misses. The page is there, but the keyword search finds nothing in a Dutch sentence, so
> only half of the search works. The same question as three English words finds it at #1. The fix is RBTAI-43:
> before searching, a small, cheap AI model rewrites the question into short English search terms. That's part of
> the answer ticket, so it comes with the API account."

Optional second example, only if there's time:

```powershell
& $ix search "how do I replace the syringe on a diluter" --limit 5
```

Seen: the top 5 are ERP part lists. "Installing a syringe" only comes in at #14. Say: "The ERP part lists are 61% of
all passages and crowd out how-to pages. RBTAI-42 builds a test set of real questions to choose the fix, and it
doesn't need a rebuild."

## 7. Close: what I need from you (~3 minutes)

Show the status overview and go through the decisions (next section). It's a private page:
https://claude.ai/artifact/TsZPXBtJu4xDcfTEovGYe3. Share it with him from the page's Share menu before you send the
link. The same page as a file: `status-overview.html` in this folder.

## Decisions and questions to bring

(Updated 24 Nov: development runs on the Claude subscription, so none of these blocks the next step.)

1. **IT (RBTAI-34), the only real dependency.** Who at IT should I talk to, and will you introduce me? Topics: an
   app registration in Entra ID with four roles, access from outside without VPN (the Entra application proxy
   needs an Entra ID P1 licence, or whatever IT prefers), a Windows VM inside the network that can reach SVN, and
   a read-only SVN service account. If the licence costs money, who approves it?
2. **API key (RBTAI-35).** Ready by the pilot; a date is enough.
3. **Who confirms the real numbers.** Budgets (now €25 per person and €500 for the company each month), roles and
   the pilot group start as working values. Who signs them off before colleagues start?
4. **Time and priority.** How much of my week is this, next to lab and support work?

## If something goes wrong in the meeting

| Problem | What to do |
|---|---|
| Strange characters instead of dashes | You skipped the `[Console]::OutputEncoding` line; run it and try again |
| `The term '.\backend\...' is not recognized` | You're not in `robotics-ai-web`; run the `cd` line again, then the `$ix` line |
| `$ix` is empty (new window) | Run the `$ix = ...` line again; it only lasts for this window |
| A search takes much longer than 5 s | The first one after start-up can take a few seconds more; just wait |
| Different rank than above | Someone added pages since Friday. That's normal; the write-up should still be near the top |

## Notes for later (not for the meeting)

- `backend/README.md` says to run `dotnet test --solution backend/RoboticsAI.sln` from the repository root. That
  fails ("Unknown switch"), because `global.json`, which sets the test runner, sits in `backend\`. Run it from
  `backend\` instead. The README needs a one-line fix.
- The speed table in `backend/README.md` gives 1 h 50 min for a GPU build. The last full build took 1 h 10 min
  (`data/index-build.log`, 1,830 tokens/s). The table is out of date.
- `search-eval/questions.yaml` has uncommitted edits to q01 and q08 from other work. I left them as they were.
