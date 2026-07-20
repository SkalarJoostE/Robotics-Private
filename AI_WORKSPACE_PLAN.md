# AI Workspace Plan — Robotics-AI

> **Purpose of this file:** This is the cross-PC, cross-assistant memory for the AI-workspace improvement effort.
> Joost works on two PCs (home + work) whose chat histories do not sync — **this repo is the only shared state**.
> If you are an AI assistant (Claude Code or GitHub Copilot) asked to continue this work: read this file fully first.
> It contains (1) the context-loading architecture all assistants must follow, (2) the findings of the
> 2026-07-09 workspace review, and (3) the phased implementation checklist with current status.

Last updated: 2026-07-20 (Codex session): added the Codex guidance, skill, and MCP adapter.

---

## 1. The Prime Constraint: cross-assistant context parity

**Claude Code**, **GitHub Copilot Chat (VS Code)**, and **Codex** are used on this repo, on both PCs.
**Every piece of AI context must live in exactly one canonical file, and all assistants must load it through a documented route.**
No content may be duplicated between assistant-specific locations, because duplicates drift.

### How each assistant loads context (Codex route verified 2026-07-20)

| Layer | Canonical location | Claude Code | GitHub Copilot | Codex |
|---|---|---|---|---|
| Always-on core instructions | `.github/copilot-instructions.md` | Loaded via `CLAUDE.md` which contains only `@.github/copilot-instructions.md` | Auto-loaded natively | `AGENTS.md` directs Codex to read the canonical file |
| On-demand skills | `.claude/skills/<name>/SKILL.md` | Native skill discovery | Native discovery from `.claude/skills`; `.vscode/settings.json` disables generated `.agents/skills` adapters to avoid duplicate names | `Setup-Workspace.ps1` generates git-ignored `.agents/skills` discovery adapters whose bodies route back to the canonical files |
| MCP servers (Loupe, Atlassian) | Same definitions in `.mcp.json` (Claude), `.vscode/mcp.json` (Copilot), and `.codex/config.toml` (Codex) — transport configs are necessarily assistant-specific; keep them in sync | Project-scope `.mcp.json` at repo root | `.vscode/mcp.json` | Project-scope `.codex/config.toml` |
| Manually-invoked prompts | **Retired 2026-07-09** — `.github/prompts/` was Copilot-only (parity violation) and contradicted the skills; all reusable workflows are now skills. Don't add prompt files; add skills. | — | — | — |
| Deep reference docs (template docs, glossaries) | Plain `.md` files in the repo, referenced **by explicit path** from the core instructions | Read on demand | Read on demand (agent mode) | Read on demand |

Sources for skill discovery: [VS Code — Use Agent Skills](https://code.visualstudio.com/docs/agent-customization/agent-skills), [GitHub Docs — Adding agent skills](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills), [Codex — Build skills](https://developers.openai.com/codex/skills), and the [Codex config reference](https://learn.chatgpt.com/docs/config-file/config-reference).

### Rules for all future edits

1. **Canonical skill bodies live in `.claude/skills/` ONLY.** Verified 2026-07-09 (home PC): with `.github` temporarily renamed, Copilot loaded the skill from `.claude/skills/` — so the `.github/skills/` mirror and `Sync-Skills.ps1` were deleted. Codex requires `.agents/skills` for repo discovery, so `Setup-Workspace.ps1` generates git-ignored metadata adapters there; each adapter contains no workflow and routes back to the canonical file. VS Code ignores `.agents/skills` through `.vscode/settings.json` to prevent duplicate Copilot names. Never hand-edit or commit generated adapters. (Re-verify Copilot once on the work PC; if its VS Code is older and doesn't discover `.claude/skills`, update VS Code.)
2. **Always-on content goes in `.github/copilot-instructions.md`**; `CLAUDE.md` stays a one-line `@`-include. Never add content to `CLAUDE.md` directly — Copilot would not see it.
3. **Any routing instruction in the core must give the explicit file path** (e.g. "read `.claude/skills/skalar-log-analysis/SKILL.md`"), never just a skill name — so an assistant without a skill loader can still follow it.
4. **Write instructions tool-neutrally.** Say "search for X in file Y", not `file_search`/`grep_search` (Copilot tool names) or `Grep`/`Glob` (Claude tool names). Say "the Atlassian MCP Confluence search tool", not `mcp_atlassian_confluence_search`.
5. **MCP definitions exist in three files** (`.mcp.json` + `.vscode/mcp.json` + `.codex/config.toml`). When adding/changing a server, change all three.
6. When a decision about this architecture is made, record it in §5 Decision Log — chats don't sync; this file does.

---

## 2. Workspace inventory (as of 2026-07-09)

- **Core instructions:** `.github/copilot-instructions.md` (~40 KB): company/product context, the 3 software parts, Sequence/SubSequence execution model, Jira/Confluence protocol, and a large Section 4 = SkalarPackSolution C# code reference.
- **Skills** (canonical in `.claude/skills/`, loaded by all three assistants): `skalar-log-analysis`, `skalar-feature-implementation`, `skalar-code-reference` (added 2026-07-09, carved from core Section 4), `svn-package-upload` (moved 2026-07-09 from Tools&Scripts), `skalar-lab-issue` (added 2026-07-15, F14 intake: fetch/refresh + log placement + hand-off to log analysis).
- **Copilot prompt files:** none — `.github/prompts/` retired 2026-07-09 (see F3 / decision log).
- **Tools:** `Tools&Scripts/` — `fetch-project.ps1` (SVN checkout of an order's software), `Parse-SkalarTables.ps1` (XML → Sequence/SubSequence CSVs), `Process-SoftwareFolder.ps1`, `Sync-ActionCode.ps1` (sync C# action code back into the software), `SkPack_SyncCLI.exe`, `Loupe.Mcp-v0.2.0-win-x64/` (the Loupe MCP server binary + `install.ps1`), `Jira ticket scraper/` (Process-ServiceTickets.ps1 — polls Jira RB tickets, builds `Service Items/RB-XXX/` folders with description, attachments, software checkout; optional AI analysis, currently via Copilot CLI, experimental).
- **Generated artifacts:** `Sequences/` — pre-parsed Sequence/SubSequence CSVs per order and per template.
- **Case base:** `md documents/` — `AI_Issue_Resolution_Log.md`, `AI_Order_Resolution_Log.md`, `AI_Template_Issue_Log.md`, `AI_Feature_Implementation_Log.md`, `AI_Order_Approval_Log.md` + detail folders with ~25 dated write-ups of solved issues/features.
- **Template docs:** only BOD — `Template BOD/99xxxxxx 2xxxxx/docs/` (system overview, architecture, applications, actions, backups, EPA flowchart).
- **Order folders:** ~14 order workspaces (`99xxxxxx <description>/`) + 4 template folders.
- **End goals:** (a) auto-analysis of new Jira RB tickets minutes after creation, (b) lab-issue intake for colleagues testing robots, (c) AI-assisted B-robot feature implementation from a reference order or idea.

---

## 3. Review findings (2026-07-09)

### What works well — keep
- The canonical `.github/copilot-instructions.md` pattern (zero-duplication core, now routed to all three assistants).
- The skills pattern with progressive disclosure (description always visible, body loaded on demand).
- The `Sequences/` CSV generation — vastly cheaper to read than the raw XML.
- The `md documents/` case-base with disciplined entry templates.
- The scraper's output folder layout (`description.md`, `ticket.json`, `attachments/`, `software/`, `analysis.md`).
- The BOD `docs/` folder pattern.

### Findings (F-numbers referenced by the checklist)

- **F1 — Always-on core is too big.** ~40 KB (~10K tokens) loads every session. Section 4 (C# code reference: data layer, action framework, SSPL, diluters, WinForms gotchas) is ~60% of it and only needed for code work, not for log analysis or ticket questions. → Move Section 4 into a new `skalar-code-reference` skill.
- **F2 — Skills duplicated** in `.claude/skills/` and `.github/skills/`. Identical today, but no sync mechanism → drift is a time bomb. Copilot reads `.claude/skills` natively → delete `.github/skills` after verification on both PCs.
- **F3 — `.github/prompts/` contradicts the skills.** `analyze-log.prompt.md` tells Copilot to read .txt/.xml log exports manually; the `skalar-log-analysis` skill says use the Loupe MCP on `.glf` directly. Only Copilot sees these prompt files (Claude has no mirror). → Consolidate: fold still-useful recipes (`trace-action`, `trace-sequence`, `lookup-table`) into skills or the core; delete `analyze-log` (superseded); fold `debug-issue` into the future ticket-analysis skill.
- **F4b — Assistants improvise when the Loupe MCP is missing (incident 2026-07-09).** With the loupe server defined in `.vscode/mcp.json` but not started, Copilot fell back to trying to parse the binary `.glf` with PowerShell instead of stopping. → Fixed: the `skalar-log-analysis` skill now opens with a mandatory hard-stop rule — if the Loupe MCP tools are unavailable, report it with fix steps and end the turn; never parse `.glf` manually. Note: VS Code does not auto-start newly added MCP servers — start `loupe` once via `MCP: List Servers` (or the Start code lens in `.vscode/mcp.json`); it needs re-approval per PC.
- **F4 — MCP asymmetry (both directions).** Copilot (`.vscode/mcp.json`) had Atlassian but no Loupe — it could not follow the log-analysis skill at all. Claude Code had Loupe only in **user-level** config on the home PC (`~/.claude.json` → `%LOCALAPPDATA%\Skalar\Loupe.Mcp\Loupe.Mcp.exe`, installed via `install.ps1`) and no Atlassian; user-level config does not sync between PCs. → Fixed 2026-07-09: root `.mcp.json` (Claude) + updated `.vscode/mcp.json` (Copilot), both defining Loupe (installed path via env var) and Atlassian (HTTP). **Per-PC one-time setup:** run `Tools&Scripts/Loupe.Mcp-v0.2.0-win-x64/install.ps1`; authenticate Atlassian MCP once per assistant.
- **F5 — Harness-specific tool names in the core.** "CRITICAL: SEARCH PROTOCOL" references `file_search`/`grep_search`/`list_dir` (Copilot names); Confluence section referenced `mcp_atlassian_confluence_search` (partially fixed 2026-07-09 → neutral wording). The domain-prefix → folder mapping table is valuable, keep it; drop the tool-specific workaround claims.
- **F6 — The promised Confluence guide list is missing.** Section 2 says "I will list some noteworthy guides here" — no list follows. Restore it (Software Setup guides, "xxx in Details" pages, the copy-an-application guide is present).
- **F7 — Tooling is invisible to the AI.** Nothing in the core mentions `fetch-project.ps1`, `Parse-SkalarTables.ps1`, `Process-SoftwareFolder.ps1`, or that `Sequences/` CSVs exist. The instructions teach grepping multi-MB XML for `<SequenceMethod>` when a CSV is available — the single easiest token saver. → Add a "Workspace tooling" section to the core: one line per tool + when to use + example invocation.
- **F8 — Case base isn't wired into any workflow.** Field issues repeat; write-ups that are 80% of the answer exist but nothing tells the AI to look. → Add to the core: "Before diagnosing any issue, search `md documents/AI_*_Log.md` and the detail folders for the order number, error code, and symptom keywords." Also: every confirmed scraper analysis should end by logging the resolution (self-improving loop).
- **F9 — Only BOD has template docs.** Waters, Testkit, Lutum/Clay Fraction have no `docs/` equivalent. → AI-draft them from a representative order per template, human-corrected.
- **F10 — No hardware glossary.** `SP2000-3/-5/-8`, `SP10`, ES-xxx vs RB-xxx numbering, manipulator counts — no legend anywhere. → One-page `docs` glossary.
- **F11 — No order/system registry.** Which order is which template, hardware particulars, open-issue status — only encoded in folder names. → Small `systems.md` registry.
- **F12 — No error-code reference.** Error codes must be looked up in `SkalarPack.GeneralTables.Tables.xml` each time. → Extract once per template into `error-codes.md`.
- **F13 — Scraper AI step uses Copilot CLI with its own prompt.** Consider `claude -p` (headless Claude Code) so the automated path shares CLAUDE.md + skills + Loupe MCP with the interactive path. Add a confidence gate (high → answer to Jira; low → "analysis attached, engineer review needed"). Whichever CLI is used, the analysis prompt must point at the same skill files (parity rule 3).
- **F14 — No lab-issue intake.** → A `skalar-lab-issue` skill: ask order number + log/workflow folder → fetch-project → Parse-SkalarTables → log-analysis workflow.
- **F15 — No feature-by-reference tooling.** For "implement X on order A like order B", a Sequence/SubSequence CSV diff between two orders shows exactly what a feature consists of. → Small diff script in `Tools&Scripts/`.
- **F16 — Hygiene.** `wt_*.png` screenshots at repo root; `Tools&Scripts/analysis.md` leftover; `Tools&Scripts/svn-package-upload/SKILL.md` sits outside any skill-discovery location; decide gitignore policy for `Service Items/*/software/` (SVN checkouts) and `Lab issues/*.zip` before the repo bloats.

---

## 4. Implementation checklist

### Phase 0 — Parity + continuity (mostly DONE 2026-07-09)
- [x] This plan document created.
- [x] Root `.mcp.json` created (Claude Code): `loupe` (stdio, `%LOCALAPPDATA%` install) + `atlassian` (HTTP).
- [x] `.vscode/mcp.json` updated (Copilot): added `loupe` alongside existing `atlassian`.
- [x] Codex adapter added 2026-07-20: root `AGENTS.md` routes to the canonical core; `.codex/config.toml` defines Loupe + Atlassian MCP; `Setup-Workspace.ps1` generates git-ignored `.agents/skills` metadata adapters that route to canonical `.claude/skills/` bodies; `.vscode/settings.json` keeps Copilot on the canonical path only.
- [x] Core instructions: skill references now carry explicit file paths; Atlassian tool naming made neutral; pointer to this plan added at top.
- [ ] **Work PC one-time setup:** follow `SETUP.md` at the repo root — run `Tools&Scripts/Setup-Workspace.ps1` (installs Loupe, generates Codex skill adapters, and checks tools/configs), then the manual steps it prints (Claude Code session restart + `/mcp` Atlassian OAuth; VS Code `MCP: List Servers` → start `loupe`; Codex trust/restart + `codex mcp login atlassian`; verify skills + Loupe on all assistants). SETUP.md/script created 2026-07-09 and extended for Codex 2026-07-20; script verified green on the home PC.
- [x] Hard-stop guard added to `skalar-log-analysis` skill (F4b).
- [x] **Home PC:** `loupe` MCP server started in VS Code and confirmed working in Copilot log analysis (2026-07-09). Work PC still needs the same one-time start (`MCP: List Servers` → `loupe` → Start).
- [x] **Verified (home PC, 2026-07-09):** Copilot discovers skills from `.claude/skills/` (rename test). `.github/skills/` mirror and `Sync-Skills.ps1` deleted (F2). Re-verify once on the work PC.
- [ ] Remove the now-redundant user-level `loupe` entry from `~/.claude.json` (home PC) to avoid confusion.

### Phase 1 — Restructure the core (F1, F3, F5, F6, F7, F8) — COMPLETE 2026-07-09
- [x] Section 4 carved into `.claude/skills/skalar-code-reference/SKILL.md` (verbatim content; search protocol rewritten tool-neutrally as "Domain Deduction"); core now has a slim routing section. Core shrank ~40 KB → ~19 KB.
- [x] "Workspace Tooling & Generated Artifacts" section added to the core (F7): Sequences/ CSVs first, fetch-project, Process-SoftwareFolder, Parse-SkalarTables, Sync-ActionCode, ticket scraper, Loupe MCP.
- [x] Past-Issue Case Base section added to the core (F8) — search `md documents/` logs before diagnosing; log new resolutions.
- [x] "Where tables live" map + application-flow tracing recipe (CSV-first, tree output, splits/merges, -1 = disabled) added to core section 2 — absorbs the useful parts of the old `lookup-table`/`trace-sequence` prompts (F5 partially: tool-specific search protocol left the core with Section 4).
- [x] Confluence guide list added to core section 2 (F6): Software Setup + In Details pages per template (Testkit, BOD parent page, Waters, Soil ×4 variants, Clay Fraction) with page IDs, provided by Joost 2026-07-09. Semantics captured: Software Setup = what Lab follows to configure an A-robot; In Details = deeper template docs; "Soil robot" usually means Soil Single pHEC (~90% of Soil systems).
- [x] `.github/prompts/` deleted entirely (F3): `analyze-log` superseded by the log-analysis skill, `trace-action` by the code-reference skill's Domain Deduction, `lookup-table`/`trace-sequence` folded into core section 2, `debug-issue` covered by case-base rule + skills (revisit in the Phase 3 ticket-analysis skill).
- [x] `svn-package-upload` moved to `.claude/skills/svn-package-upload/` (with `scripts/` and `references/`; absolute paths inside updated). Now available to all three assistants (F16 partially).

### Phase 2 — Missing knowledge (F9–F12) — started 2026-07-09
- [x] Hardware + domain glossary added directly to the core instructions (small + universally needed, so inline rather than a separate file). Covers: SP2000-N = frame size / ≈tray count, SP10 legacy (out of scope), order-name shorthand (Triple YSI, COD MN = Testkit w/ Macherey-Nagel, TSS paper weighing = out-of-scope template), A/B robots, ES-xxx = Escalation board vs RB-xxx = Robot Aftersales board, domain abbreviations, and the hardware-detection recipe (check Available/Enabled in DeviceConfiguration/MotorConfiguration/IOConfiguration/DiluterConfiguration/Probes/etc.).
- [x] ~~`systems.md` order registry~~ **Dropped (Joost, 2026-07-09)**: users state the robot type when asking, order folders are often just temporary checkouts, and the scraper derives the template from the software checkout itself. Not worth hand-maintaining.
- [x] `error-codes.md` generated for all 4 checked-out templates (BOD 92, Lutum 157, Testkit 145, Waters 99 codes) into each `Template <name>/99xxxxxx 2xxxxx/docs/`. Generator: `Tools&Scripts/Extract-ErrorCodes.py`. Log-analysis skill + core now point there first.
- [x] **Waters** template docs drafted (`Template Waters/99xxxxxx 2xxxxx/docs/`: README, 01_applications, 02_methods, 03_software_setup) from Confluence page 1263337473 + checkout + Sequence CSVs. **Shallow first draft** — Joost compared with the BOD docs and found it lacking; needs the deep-exploration pass (below). Still needs review of what's there.
- [x] **Platform knowledge from the BOD docs absorbed into skills** (2026-07-09, after reviewing the colleague-written BOD docs): (a) **major correction** — the runtime compiles code from the SkalarPacks XML into `Skalar.Pack1.dll`; `SkalarPackSolution` is only a generated developer mirror (fixed in `skalar-code-reference` skill + core section 4); (b) Units concept (regular vs ExtensionUnit) + application file anatomy (Workflow.xaml/.cleaned.txt, Calculation.mathml, Validation, TreeDatabases, dictionaries.xml, RoboticsConfig.xml hidden settings) → `skalar-code-reference`; (c) platform failure modes (Analyses.TreeDatabase.Xml corruption fix, UnhandledDump.dmp, Apply/Build backup snapshots, DeletedAnalyses recovery) + sample-state vocabulary → `skalar-log-analysis`. BOD docs themselves left untouched.
- [ ] **Deep-exploration doc passes** (deferred by Joost — "another time"): deepen Waters docs to the BOD-docs standard (per-application Settings/Tables docs, subsequence walkthroughs, file-level exploration), then Testkit and Lutum/Clay Fraction the same way. The BOD `docs/` folder is the quality benchmark; keep template docs template-specific (platform generics belong in the skills, which must stay self-contained). TSS paper weighing template: out of scope for now.

### Phase 3 — Pipelines (F13–F15)
- [ ] Scraper: decide Copilot CLI vs `claude -p`; point its prompt at the shared skills; add confidence gate; auto-log confirmed resolutions. **Also: extend to the ES (Escalation) Jira board** — scraper currently polls RB (Robot Aftersales) only; both are needed eventually (Joost, 2026-07-09).
- [x] `skalar-lab-issue` intake skill (2026-07-15): parses order number + log path + symptom from one message; runs `fetch-project.ps1` (which now auto-refreshes existing checkouts in place — svn revert + update + post-processing — instead of requiring delete-and-refetch); moves the log to `<order>\<99xxxxxx serial>\Log\`; case-base check; hands off to `skalar-log-analysis`. Core got a "PROTOCOL: LAB-ISSUE INTAKE" routing line. Same day: zip intake path added — `Process-SoftwareFolder.ps1` gained install mode (`-DestinationRoot`/`-DestinationName`: extract/copy a customer zip into the workspace like an SVN checkout, CSVs to workspace `Sequences\`, rerun = refresh from newer zip) for software that arrives as a zip (customer install / Jira attachment) instead of via SVN; skill step 1 branches on source, with folder/CSV-prefix collision guidance when both a zip and an SVN checkout of the same order exist.
- [ ] Sequence CSV diff script.

### Phase 4 — Hygiene (F16)
- [ ] Move/remove `wt_*.png`, `Tools&Scripts/analysis.md`.
- [ ] gitignore decisions: `Service Items/*/software/`, `Lab issues/*.zip`.

---

## 5. Decision log

- **2026-07-09 — Skills canonical location = `.claude/skills/`**, because Copilot discovers that path natively; `.github/skills/` copies to be deleted after verification on both PCs. Rejected alternatives: sync script (discipline-dependent), thin wrappers in `.github/skills` (duplicate skill names confuse discovery).
- **2026-07-09 — Always-on core stays in `.github/copilot-instructions.md`** with `CLAUDE.md` as a one-line include, because Copilot cannot include other files into its instructions, but Claude can.
- **2026-07-09 — Loupe MCP referenced via installed location** (`%LOCALAPPDATA%\Skalar\Loupe.Mcp\Loupe.Mcp.exe`, per-PC `install.ps1`) rather than the repo copy, because the repo path contains `&` (`Tools&Scripts`) which risks breaking process spawning, and the home PC already uses the installed path.
- **2026-07-09 (later) — Skill mirror DELETED**: the rename test proved Copilot discovers `.claude/skills/` natively on the home PC, so the `.github/skills/` mirror and `Sync-Skills.ps1` were removed the same day they were created. Single canonical skill location achieved.
- **2026-07-09 — `.github/prompts/` retired**: prompt files were Copilot-only and had drifted into contradicting the skills (manual log parsing vs. Loupe MCP). All reusable workflows are skills from now on; useful prompt content was folded into the core/skills before deletion.
- **2026-07-09 — Core restructured (Phase 1)**: Section 4 → `skalar-code-reference` skill; always-on core ~40 KB → ~19 KB. Rationale: the C# reference is only needed for code work; skills load on demand for each assistant.
- **2026-07-09 — Hard-stop policy for missing tools**: when a skill's required MCP tools are unavailable, assistants must report and stop, never improvise around binary formats (incident F4b). Apply the same pattern to future skills that depend on MCP servers.
- **2026-07-09 — Skills must be self-contained; template docs may be duplicated into them** (Joost): template folders (`Template BOD` etc.) are SVN checkouts that are NOT guaranteed to be on disk, so generic platform knowledge extracted from template docs is copied INTO the skills rather than referenced. The no-duplication parity rule applies to assistant-specific locations, not to this.
- **2026-07-09 — SkalarPackSolution correction**: the colleague-written BOD docs established that the runtime never consumes SkalarPackSolution — it compiles XML-stored code into `Skalar.Pack1.dll` on Build; the solution is a generated mirror for reading/IDE use. Core + code-reference skill corrected accordingly. When template docs and our instructions disagree, verify against the software and prefer the evidence.
- **2026-07-09 — Findings documented before implementing** (this file), because the two PCs share only the repo; chat context must be reconstructable from the repo alone.
- **2026-07-15 — fetch-project refresh discards local changes by design** (Joost): when refetching an order, local edits to the checked-out software are never worth keeping — even just opening the application dirties files and would cause conflicts. So `fetch-project.ps1`'s refresh path does `svn revert -R` + `svn update --accept theirs-full` unconditionally (after a y/n confirm; `-NoVerify` skips it). Unversioned files (logs placed in `Log\`) survive, which is the point: the old delete-and-refetch habit destroyed the log each round-trip. A menu/GUI wrapper around Tools&Scripts was considered and rejected — the streamline is removing steps (skills), not relabeling them.
- **2026-07-20 — Codex added without duplicating workflow bodies**: `AGENTS.md` is a thin bridge to `.github/copilot-instructions.md`; `.codex/config.toml` mirrors the Loupe/Atlassian MCP transports. Codex's `skills.config` was tested and found to enable/disable already-discovered skills rather than register `.claude/skills`, while current Claude Code only discovers `.claude/skills`. Therefore `Setup-Workspace.ps1` generates git-ignored `.agents/skills` adapters from canonical frontmatter; adapter bodies only route back to `.claude/skills`. `.vscode/settings.json` disables `.agents/skills` for Copilot to prevent duplicate names. Atlassian writes use approval mode `writes`; Loupe is local/read-only.
