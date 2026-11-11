# Bitbucket move — cleanup assessment

> **Date:** 2026-11-11. **Status:** all decisions taken (§7). **Today's part done 2026-11-11:** personal
> material moved to `_private\` (pushed to `SkalarJoostE/Robotics-Private`), document moves and link fixes,
> filtered history pushed to `skalaranalytical/robotics-ai` `main` (332 commits, quoted hashes re-pointed),
> Joost's PC switched (`origin` = Bitbucket, `github` = old repo), bootstrapper/SETUP point at Bitbucket.
> Remaining: §8 steps 1–3, 6–7, 13–16 and the grace-period end.
> **Question:** what has to change before Robotics-AI moves to company Bitbucket as the open,
> company-wide repo that carries only what the workspace needs to do its job.
> Builds on PROJECT.md §8 entries 2026-08-07 ("moves to Bitbucket") and 2026-10-07 ("structured
> rebuild, not a move").

## 1. What is there today

| Area | Tracked files | Size | Notes |
|---|---|---|---|
| `Historical B-Feature Discovery/Index Cards` | 7,657 | 52.7 MB | 1,276 orders × ~6 files (card, revisions json/md) |
| `Tools&Scripts/` | 321 | 82.8 MB | 75 MB of it is two copies of `Loupe.Mcp.exe` (v0.2.0 and v0.3.0) |
| `md documents/` | 121 | 1.9 MB | case base, known issues, lab questions, assessments |
| `Rollout/` | 59 | 13.0 MB | 9.8 MB is the Velaris brand book PDF |
| `knowledge-base/` | 41 | 0.3 MB | Arnold's product knowledge base |
| `lab-chat-poc/` | 21 | 0.1 MB | chat POC, includes `cost_log.csv` |
| `Diluter Scan/` | 8 | 0.9 MB | fleet scan results the kit and skills read |
| root files | 12 | — | instructions, plan, changelog, setup, bootstrap |

`.git` is **355 MB**. Largest blobs ever committed: both Loupe exes (37 MB each), a customer software
zip `SW Update/SkalarRobotics_Robotic SP2000-3 (BOD+pH) (2).zip` (19 MB, deleted since but still in
history), the brand book, and the removed `Feature Catalog/` index.

Contributors: Joost (≈270 commits), Maciej (113, almost all Diluter-Upgrade-Kit), Arnold (7,
knowledge-base), Sammy (4), Cor (1). `Submit-Contributions.ps1` decides who owns a file from
**who first added it in git history**.

Local clutter (git-ignored, on this PC only): 59 order checkouts and 17 template checkouts in the
root; legacy root ticket folders `ES-200` (6.9 GB), `RB-359`, `RB-360`; legacy root `Sequences\`
(100 old CSVs; CSVs now live inside each order folder) and `Logs\`; `output\` (superseded capability
draft + `pets\`); `debug.log`; 3 stale worktrees under `.claude\worktrees\` and 9 old local branches.

## 2. Personal / decision material (proposed: not in Bitbucket)

| Item | Why it is personal | Catch |
|---|---|---|
| `Rollout/` (all 59 files) | productization project: PROJECT.md, usage plans, cost briefs, pricing, decks, brand assets, Confluence drafts, web-app design, flowcharts, replay protocol | `README.md` sends newcomers to `Rollout/PROJECT.md` first — README needs a rewrite |
| `md documents/Assessments & Plans/` | point-in-time assessments (ChatGPT/Context usage, RAG, Teamwork Graph, 4 virtual-robot docs, Installer USB plan) | `copilot-instructions.md` cites `Context Usage Assessment by Claude.md`; Installer USB Builder README probably cites its plan |
| `AI_WORKSPACE_PLAN.md` | mostly history: inventory as of July, review findings, phase checklists, decision log | it also holds the **parity rules** every maintainer needs, and `copilot-instructions.md` + `AGENTS.md` tell the AI to read it before changing any instruction file |
| `COWORK-COLLEAGUE-START.md` | one-off GitHub onboarding for Arnold's helper | GitHub-specific (device login, `SkalarJoostE/Robotics-AI`) |
| `lab-chat-poc/` | cost/limit experiment, `cost_log.csv` | it is also the only chat front door that writes `Lab Questions/` |
| `AI_CONTEXT_CHANGELOG.md` | maintenance record | useful to any future maintainer — lean keep |

## 3. Orders and templates in their own folder

Proposal: `Orders\` and `Templates\` at the root. The map below is complete for tracked code.

**Code that must change (10 files)**

- Decides the destination: `fetch-project.ps1` (default `DestinationRoot`, route by Template/99
  prefix at :234-243), `Sync-Templates.ps1:43-44,145` and `Setup-Workspace.ps1:474` (both pass the
  root explicitly, so changing fetch alone does nothing for templates).
- Looks for existing checkouts: `fetch-project.ps1:261` (refresh fast path),
  `Setup-Workspace.ps1:445` (fresh-install check), `Import-CustomerSoftware.ps1:401-439` (calls
  fetch without a destination, then expects the result at the root — breaks silently),
  `Harvest-TemplateRevisions.ps1:76,85`, Diluter kit `vendor_targets.py`, `vendor_tables.py`,
  `tests/make_fixtures.py`, `tests/test_vendor_targets.py` (skips silently when templates are missing).
- `.gitignore`: `/Template*/` happens to match `/Templates/`; `99*/` is unanchored. Replace with
  `/Orders/` and `/Templates/`.
- Recommended: `Sync-ActionCode.ps1:89` (relative `-ProjectPath` resolves against the root — add an
  Orders/Templates lookup), `Parse-SkalarTables.ps1` (stale defaults pointing at a root order and
  root `Sequences\`).

No shared "find the workspace root" helper exists: ~25 scripts compute it themselves in 7 different
ways. A small `lib\SkalarWorkspace.ps1` (root, Orders, Templates, Service Items) would make this the
last time.

**Instructions the AI acts on (~10)**: `copilot-instructions.md` (:50, :72, :427-470),
skills `skalar-lab-issue` (:44-49 tells the AI to install customer zips at the workspace root),
`skalar-feature-implementation`, `skalar-code-reference`, `skalar-svn-import`,
`skalar-feature-grilling`, `README.md`, `Tools&Scripts/README.md`, `lab-chat-poc/prompt_common.py`.
Old case write-ups quoting `Template BOD\99xxxxxx…` stay as written (historical record).

**Traps**
- Move existing checkouts with a plain move (not `svn move`), with VS/TortoiseSVN closed. Any
  checkout left in the root gets a fresh multi-GB checkout on the next fetch instead of a refresh.
- MAX_PATH: `Orders\` adds 7 characters. Longest order path today is 127; Process-SoftwareFolder
  warns at 170 and SkPack_SyncCLI adds 85–160 below that. Keep the parent name short.
- Skills use relative commands (`"Service Items\…"`, `"<order>\99…"`) that assume the AI runs from
  the root.

Other root working folders: `Service Items\` and `B-System Approvals\` are configured by their own
tools (scraper / SSO config); unaffected by the Orders move. `sso-config.example.json` has an
existing bug (`../../` but only one `../` is stripped — writes outside the workspace).

## 4. Misplaced or stale files

- `md documents/` root strays: `QC_Interval_Fix_ChangeList_99440240.md` and
  `99441966 to Template Soil Dual pHEC - Backport Plan.md` are order work (→ a Details folder);
  `BOD_Software_Setup.md` is a copy of the Confluence page (goes stale); `Testkit - Adding a New Range.md`
  is a reusable how-to (fine, or `knowledge-base/`).
- Two "Historical B-Feature Discovery" folders: root (Index Cards output) and
  `Tools&Scripts/Historical-B-Feature-Discovery/` (scripts **and** the `verified-features/` dossiers —
  knowledge living inside a tools folder).
- `Diluter Scan/` at the root next to `Tools&Scripts/Diluter-Upgrade-Analysis/`.
- `Tools&Scripts/Loupe.Mcp-v0.2.0-win-x64/` — superseded, 37 MB.
- `Engineer Guides/Rinse pump to rinse valve/images/` + `preview.html` untracked.
- `.gitignore` leftovers for folders that no longer exist (`SSO R&D Approval POC/`, `Rollout/Jira-Ticket-*.md`).
- `kb-sync.sh` messages say "GitHub".

## 5. Hosting-specific changes

`Bootstrap-RoboticsAI.bat` (clone URL), `SETUP.md` (GitHub account prerequisite),
`COWORK-COLLEAGUE-START.md`, `kb-sync.sh`, Jira scraper README, `AI_WORKSPACE_PLAN.md`.
`Submit-Contributions.ps1` and `kb-sync.sh` push to `origin` and are otherwise host-agnostic.
Arnold, Sammy and Maciej need Bitbucket write access for `contrib/*` branches.

## 6. History

Three ways to create the Bitbucket repo:

| Option | Personal files in history | Authorship / file ownership | Size |
|---|---|---|---|
| Push as-is | all of it, incl. customer zip | kept | 355 MB |
| `git filter-repo` (drop personal paths, old binaries, the zip) | gone | **kept** — `Submit-Contributions` keeps working | small |
| Fresh single commit | gone | **lost** — every file becomes Joost's | smallest |

## 7. Decisions to take

Worked through one at a time; answers recorded here as they are made.

1. GitHub after the move: retire, or keep beside Bitbucket? **Decided 2026-11-11: retire GitHub.**
   Bitbucket becomes the only company repo. Supersedes PROJECT.md 2026-10-07 ("current users keep
   working from this repo").
2. History: filtered, fresh, or as-is? **Decided 2026-11-11: filtered** (`git filter-repo` on a
   mirror clone). Drops personal paths, the old customer zip, `Feature Catalog/` and superseded
   binaries; keeps authorship so `Submit-Contributions` ownership still works. Everyone re-clones once.
3. Where personal material lives (`_private\` ignored folder, nested own repo, elsewhere).
   **Decided 2026-11-11:** `_private\` inside the workspace, git-ignored by the company repo, its own
   git repo seeded from a second filter-repo pass (personal paths only), pushed to Joost's
   **personal GitHub** (the existing `SkalarJoostE/Robotics-AI` can be renamed and reused).
4. What exactly counts as personal (Rollout, Assessments, AI_WORKSPACE_PLAN split, lab-chat-poc, COWORK).
   - 4a **Decided 2026-11-11: all of `Rollout/` → `_private\`**, including the Confluence drafts and
     Flowcharts (Confluence is where colleagues read those). README.md and `.gitignore` links to it go.
   - 4b **Decided 2026-11-11: `md documents/Assessments & Plans/` is split.**
     - `_private\`: AI Usage (ChatGPT), Context Usage, RAG, Teamwork Graph; Installer USB Builder plan
       + 5 reference-USB maps **and the tool folder `Tools&Scripts/Installer USB Builder/`** (project
       dropped); Virtual Robot Simulation Test Plan + its Review (the earlier attempt).
     - Copy into `robsimulator/docs/` (commit in that repo, during the cleanup): Virtual Robot
       Simulator Design + SSPL Surface Spike. The simulator's development log cites "design §7.3",
       "design §8". Add a header line to the Design: starting design; code and dev log are now the truth.
     - The folder and its README stay (the wrap-up skill routes future assessments there).
     - `copilot-instructions.md` keeps the batching rule and its numbers, drops the link.
   - 4c **Decided 2026-11-11: all of `AI_WORKSPACE_PLAN.md` → `_private\`** (its §1 parity rules are
     obsolete under decision 11). Replaced by a ~5-line "Maintaining the AI context" section in
     `README.md`; `CLAUDE.md`'s opening pointer and `skalar-session-wrapup` (workspace decisions →
     `_private\AI_WORKSPACE_PLAN.md` when present, otherwise "tell Joost") are updated.
   - 4d **Decided 2026-11-11: `lab-chat-poc/` → `_private\`** (last used 2026-08-20; the web app gets
     its own Bitbucket repo). `md documents/Lab Questions/` stays; its README/log say "a lab chat
     session" instead of naming the POC. README.md line about the POC goes.
   - 4e **Decided 2026-11-11: `COWORK-COLLEAGUE-START.md` stays** (Arnold's, in active use) and moves
     into `knowledge-base/` (e.g. `knowledge-base/CONTRIBUTING.md`). **Rework deferred until after the
     move** (Joost): Bitbucket login for the Cowork sandbox (no device flow like GitHub's), section E
     → `knowledge-base/_questions/`, "GitHub" wording in `kb-sync.sh`. Consequence: Arnold's helpers
     cannot push from Cowork between cut-over and that rework — tell Arnold beforehand.
   - Later, separate step after cut-over (not part of the move): slim `CLAUDE.md` (67.7 KB ≈ 17k
     tokens every session) by moving reference sections into on-demand skills, measured before/after.
5. Folder names: `Orders\` + `Templates\`, or one parent; do reference clones (`robotics-core`,
   `robotics-plugin`, firmware/simulators) move too.
   - 5a **Decided 2026-11-11: `Orders\` and `Templates\` directly in the root** (+7 / +10 characters
     against MAX_PATH; `.gitignore` becomes `/Orders/` + `/Templates/`).
   - 5b **Decided 2026-11-11:** `robotics-core`, `robotics-plugin` and `Robotic-Simulator` stay at the
     root; `roboticsonefirmware`, `fwsimulator`, `tocsimulator` move to `Reference\` (nothing in this
     repo points at them). **Found:** the simulator (`robsimulator`) finds orders by probing its parent
     folder two levels deep (`OrderSetup.cs:50-65`, `OrderController.cs:168`) — add `Orders` and
     `Templates` as bases, and prefix `Orders/` in `docs/hardware-photo-reference.md:117-122`
     (commit in that repo).
6. Shared workspace-path helper: yes/no. **Decided 2026-11-11: yes, `Tools&Scripts\lib\SkalarWorkspace.ps1`**
   (`Get-WorkspaceRoot`, `Get-OrdersRoot`, `Get-TemplatesRoot`, `Find-Checkout`), used only by the
   scripts the move touches: fetch-project, Sync-Templates, Setup-Workspace, Import-CustomerSoftware,
   Harvest-TemplateRevisions, Sync-ActionCode. Python: `ORDERS`/`TEMPLATES` next to the root in
   `diluterkit/classify.py`, used by the four kit files — Maciej's code, tell him first.
7. Misplaced docs (§4): which moves to make. **Decided 2026-11-11:**
   - `QC_Interval_Fix_ChangeList_99440240.md` → `AI Template Issue Details/` (fix 2 links).
   - `99441966 to Template Soil Dual pHEC - Backport Plan.md` → `AI Template Issue Details/`, linked
     from the 99441966 entry in `AI_Template_Issue_Log.md`.
   - `BOD_Software_Setup.md` → `knowledge-base/_sources/` (Arnold's area — tell him; fix his link).
   - `Testkit - Adding a New Range.md` → new `md documents/How-tos/` (fix links in 2 write-ups + 2 logs,
     the Assessments README row, and add a how-to row to `skalar-session-wrapup` so new ones land there).
   - Stay: `verified-features/` (27 references), `Diluter Scan/`.
   - `Parse-SkalarTables.ps1`: remove stale defaults. `.gitignore`: rewrite clean and root-anchored.
   - `Engineer Guides/`: out of scope for now (it was a test) — leave untouched.
8. Binaries: Loupe exe in git or on a share; drop v0.2.0. **Decided 2026-11-11: keep
   `Loupe.Mcp-v0.3.0-win-x64/` in the repo; v0.2.0 removed, also from history in the filter pass.**
9. Sparse checkout for the Lab: still needed once personal material is out? **Decided 2026-11-11:
   dropped** — its reason (keep rollout/prototypes/plans off lab machines) is gone with decision 4.
   The rest of the Lab design (`stable`, session-start update, role lock) is a separate later project.
11. **Decided 2026-11-11 (Joost): the workspace becomes Claude-only** — the company chose Claude.
    Copilot/Codex parity is dropped. Mechanical consequences:
    - `.github/copilot-instructions.md` (67.7 KB) becomes `CLAUDE.md` itself (`git mv`, so its history follows).
    - Removed: `AGENTS.md`, `.codex/`, `.vscode/mcp.json` + `.vscode/settings.json`, the `.agents/`
      adapter generation and Codex/VS Code checks in `Setup-Workspace.ps1` (§2b, :74, :130, :336-345,
      :501-518), Copilot/Codex registration in the Loupe `install.ps1`/`uninstall.ps1`, `.agents/` in `.gitignore`.
    - Updated: `Check-ContextChangelog.ps1` and `AI_CONTEXT_CHANGELOG.md` scope (file list), `SETUP.md`,
      `README.md`, `Tools&Scripts/README.md`, Jira scraper (unattended AI step defaults to Copilot CLI).
    - Left as is: the tool-neutral wording inside skills (harmless).
10. Order of work and cut-over (freeze GitHub, push, re-clone colleagues). Proposed sequence in §8.

## 8. Proposed sequence (decision 10)

> **Decided 2026-11-11 (revision approved):** Joost wants to move to Bitbucket **today** and keep the
> old GitHub repo live (not archived) for a few days so Arnold and Sammy can keep answering questions
> on `contrib/kb-questions` via Cowork. Proposed reorder:
> - **Today:** step 5 (personal material out) + step 4's file moves only → B (filter, push) → C (cut
>   over; Maciej and Cor re-clone). Folder restructure, Claude-only and the instruction updates
>   (steps 1–3, 6–7) follow as ordinary commits on Bitbucket — they need no history rewrite.
> - **Grace period:** GitHub stays live, `main` frozen by announcement (Arnold/Sammy only work on
>   `contrib/kb-questions`). `knowledge-base/` is not edited on Bitbucket meanwhile. Their commits are
>   brought over with `git cherry-pick` (applies each change onto the new history; keeps them as author).
> - **End of grace period:** Cowork guide reworked for Bitbucket, last cherry-pick, then archive GitHub.

**A. Prepare, on a branch of the current repo (GitHub still live, colleagues unaffected)**
1. Code: `lib\SkalarWorkspace.ps1`; the six scripts; the four diluter-kit files (after telling Maciej);
   `Parse-SkalarTables` defaults; clean `.gitignore`.
2. Claude-only: `git mv .github/copilot-instructions.md CLAUDE.md`; remove AGENTS.md, `.codex/`, `.vscode/`;
   trim `Setup-Workspace.ps1`, Loupe install/uninstall, `Check-ContextChangelog.ps1`; changelog entry.
3. Instructions and docs: `CLAUDE.md` paths, the five skills, README rewrite (newcomer path + maintainer
   section), `SETUP.md`, `Tools&Scripts/README.md`, wrap-up skill (how-to row, workspace decisions).
4. Moves: decision 7 files; `COWORK-COLLEAGUE-START.md` → `knowledge-base/`.
5. Personal material: copy to `_private\`, then `git rm` from the branch.
6. Local only: move existing checkouts into `Orders\` / `Templates\` and the three clones into
   `Reference\` (plain move, VS/TortoiseSVN closed). Delete legacy root folders after a yes:
   `ES-200`, `RB-359`, `RB-360` (all three already written up in the case base), root `Sequences\`,
   `Logs\`, `output\`, `debug.log`, `SSO R&D Approval POC\`; remove 3 stale worktrees and 9 local
   branches (all merged; `docs/99445849-lab-commissioning`'s two commits are already in main).
7. Verify: fetch-project refresh of an order in `Orders\` (no new checkout), `Sync-Templates -List`,
   `Import-CustomerSoftware` plan phase, `Setup-Workspace` doctor run, diluter-kit tests (not skipped),
   one lab-issue dry run with the AI to see it finds the profile under `Orders\`.
8. Merge the branch into `main` on GitHub; ask colleagues to send/merge anything open first.

**B. Create the repos (one sitting)**
9. `git clone --mirror` → `git filter-repo` (drop personal paths, `SW Update/`, `Feature Catalog/`,
   `Loupe.Mcp-v0.2.0-win-x64/`) → push to the new Bitbucket repo. Check size and authorship.
10. Second filter pass (keep personal paths only) → push to a **new** private GitHub repo; seed
    `_private\` from it. The old `SkalarJoostE/Robotics-AI` is **archived** (read-only safety net), not reused.

**C. Cut over**
11. This PC: `git remote set-url origin <bitbucket>`, fetch, reset to the new `main` — ignored folders
    (`Orders\`, `Templates\`, `Service Items\`, `_private\`) are untouched.
12. Bootstrap + SETUP point at Bitbucket; Bitbucket access for Maciej, Arnold, Sammy, Cor; they re-clone.
    Tell Arnold the Cowork route is down until its rework.

**D. After the move**
13. `robsimulator`: Design + Spike into `docs/`, `Orders`/`Templates` probe bases, photo-reference paths.
14. Cowork guide rework for Bitbucket. 15. Slim `CLAUDE.md`, measured. 16. Lab setup project.
