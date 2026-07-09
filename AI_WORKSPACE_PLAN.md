# AI Workspace Plan — Robotics-AI

> **Purpose of this file:** This is the cross-PC, cross-assistant memory for the AI-workspace improvement effort.
> Joost works on two PCs (home + work) whose chat histories do not sync — **this repo is the only shared state**.
> If you are an AI assistant (Claude Code or GitHub Copilot) asked to continue this work: read this file fully first.
> It contains (1) the context-loading architecture both assistants must follow, (2) the findings of the
> 2026-07-09 workspace review, and (3) the phased implementation checklist with current status.

Last updated: 2026-07-09 (Claude Code session, home PC).

---

## 1. The Prime Constraint: dual-assistant context parity

Both **Claude Code** and **GitHub Copilot Chat (VS Code)** are used on this repo, on both PCs.
**Every piece of AI context must live in exactly one file, and both assistants must load it the same way.**
No content may be duplicated between assistant-specific locations, because duplicates drift.

### How each assistant loads context (verified 2026-07-09)

| Layer | Canonical location | Claude Code | GitHub Copilot |
|---|---|---|---|
| Always-on core instructions | `.github/copilot-instructions.md` | Loaded via `CLAUDE.md` which contains only `@.github/copilot-instructions.md` | Auto-loaded natively |
| On-demand skills | `.claude/skills/<name>/SKILL.md` | Native skill discovery | **Also native**: VS Code discovers project skills from `.github/skills`, **`.claude/skills`**, or `.agents/skills` (see sources below) |
| MCP servers (Loupe, Atlassian) | `.mcp.json` (Claude) + `.vscode/mcp.json` (Copilot) — two files, unavoidable, keep in sync | Project-scope `.mcp.json` at repo root | `.vscode/mcp.json` |
| Manually-invoked prompts | `.github/prompts/*.prompt.md` (Copilot `/name`) | No native equivalent (`.claude/commands` would be the mirror) | Native |
| Deep reference docs (template docs, glossaries) | Plain `.md` files in the repo, referenced **by explicit path** from the core instructions | Read on demand | Read on demand (agent mode) |

Sources for Copilot skill discovery: [VS Code — Use Agent Skills](https://code.visualstudio.com/docs/agent-customization/agent-skills), [GitHub Docs — Adding agent skills](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills).

### Rules for all future edits

1. **Skills live in `.claude/skills/` only.** `.github/skills/` currently holds identical copies — these are to be **deleted once verified** that Copilot on both PCs picks skills up from `.claude/skills/` (checklist §4 Phase 0). Until then: if you edit a skill, edit the `.claude/skills/` version and copy it to `.github/skills/` verbatim.
2. **Always-on content goes in `.github/copilot-instructions.md`**; `CLAUDE.md` stays a one-line `@`-include. Never add content to `CLAUDE.md` directly — Copilot would not see it.
3. **Any routing instruction in the core must give the explicit file path** (e.g. "read `.claude/skills/skalar-log-analysis/SKILL.md`"), never just a skill name — so an assistant without a skill loader can still follow it.
4. **Write instructions tool-neutrally.** Say "search for X in file Y", not `file_search`/`grep_search` (Copilot tool names) or `Grep`/`Glob` (Claude tool names). Say "the Atlassian MCP Confluence search tool", not `mcp_atlassian_confluence_search`.
5. **MCP definitions exist in two files** (`.mcp.json` + `.vscode/mcp.json`). When adding/changing a server, change both.
6. When a decision about this architecture is made, record it in §5 Decision Log — chats don't sync; this file does.

---

## 2. Workspace inventory (as of 2026-07-09)

- **Core instructions:** `.github/copilot-instructions.md` (~40 KB): company/product context, the 3 software parts, Sequence/SubSequence execution model, Jira/Confluence protocol, and a large Section 4 = SkalarPackSolution C# code reference.
- **Skills:** `skalar-log-analysis` (5 KB) and `skalar-feature-implementation` (18 KB), duplicated in `.claude/skills/` and `.github/skills/` (byte-identical as of today).
- **Copilot prompt files:** `.github/prompts/` — `analyze-log`, `debug-issue`, `lookup-table`, `trace-action`, `trace-sequence` (older generation, see finding F3).
- **Tools:** `Tools&Scripts/` — `fetch-project.ps1` (SVN checkout of an order's software), `Parse-SkalarTables.ps1` (XML → Sequence/SubSequence CSVs), `Process-SoftwareFolder.ps1`, `Sync-ActionCode.ps1` (sync C# action code back into the software), `SkPack_SyncCLI.exe`, `Loupe.Mcp-v0.2.0-win-x64/` (the Loupe MCP server binary + `install.ps1`), `Jira ticket scraper/` (Process-ServiceTickets.ps1 — polls Jira RB tickets, builds `Service Items/RB-XXX/` folders with description, attachments, software checkout; optional AI analysis, currently via Copilot CLI, experimental).
- **Generated artifacts:** `Sequences/` — pre-parsed Sequence/SubSequence CSVs per order and per template.
- **Case base:** `md documents/` — `AI_Issue_Resolution_Log.md`, `AI_Order_Resolution_Log.md`, `AI_Template_Issue_Log.md`, `AI_Feature_Implementation_Log.md`, `AI_Order_Approval_Log.md` + detail folders with ~25 dated write-ups of solved issues/features.
- **Template docs:** only BOD — `Template BOD/99xxxxxx 2xxxxx/docs/` (system overview, architecture, applications, actions, backups, EPA flowchart).
- **Order folders:** ~14 order workspaces (`99xxxxxx <description>/`) + 4 template folders.
- **End goals:** (a) auto-analysis of new Jira RB tickets minutes after creation, (b) lab-issue intake for colleagues testing robots, (c) AI-assisted B-robot feature implementation from a reference order or idea.

---

## 3. Review findings (2026-07-09)

### What works well — keep
- The `CLAUDE.md` → `@copilot-instructions.md` include pattern (zero-duplication core, both assistants).
- The skills pattern with progressive disclosure (description always visible, body loaded on demand).
- The `Sequences/` CSV generation — vastly cheaper to read than the raw XML.
- The `md documents/` case-base with disciplined entry templates.
- The scraper's output folder layout (`description.md`, `ticket.json`, `attachments/`, `software/`, `analysis.md`).
- The BOD `docs/` folder pattern.

### Findings (F-numbers referenced by the checklist)

- **F1 — Always-on core is too big.** ~40 KB (~10K tokens) loads every session. Section 4 (C# code reference: data layer, action framework, SSPL, diluters, WinForms gotchas) is ~60% of it and only needed for code work, not for log analysis or ticket questions. → Move Section 4 into a new `skalar-code-reference` skill.
- **F2 — Skills duplicated** in `.claude/skills/` and `.github/skills/`. Identical today, but no sync mechanism → drift is a time bomb. Copilot reads `.claude/skills` natively → delete `.github/skills` after verification on both PCs.
- **F3 — `.github/prompts/` contradicts the skills.** `analyze-log.prompt.md` tells Copilot to read .txt/.xml log exports manually; the `skalar-log-analysis` skill says use the Loupe MCP on `.glf` directly. Only Copilot sees these prompt files (Claude has no mirror). → Consolidate: fold still-useful recipes (`trace-action`, `trace-sequence`, `lookup-table`) into skills or the core; delete `analyze-log` (superseded); fold `debug-issue` into the future ticket-analysis skill.
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
- [x] Core instructions: skill references now carry explicit file paths; Atlassian tool naming made neutral; pointer to this plan added at top.
- [ ] **Work PC one-time setup:** run `Tools&Scripts/Loupe.Mcp-v0.2.0-win-x64/install.ps1`; approve the project MCP servers in Claude Code (it prompts); authenticate Atlassian MCP in Claude Code (`/mcp`).
- [ ] **Verify on both PCs** that Copilot Chat triggers skills from `.claude/skills/` (ask it a log-analysis question; check it loads the skill). May require a current VS Code and the agent-skills setting enabled.
- [ ] After verification passes on both PCs: **delete `.github/skills/`** (F2).
- [ ] Remove the now-redundant user-level `loupe` entry from `~/.claude.json` (home PC) to avoid confusion.

### Phase 1 — Restructure the core (F1, F3, F5, F6, F7, F8)
- [ ] Carve Section 4 into `.claude/skills/skalar-code-reference/SKILL.md`; leave a routing line in the core.
- [ ] Add "Workspace tooling" section to the core (F7), including the `Sequences/` CSVs as the preferred way to read sequence tables.
- [ ] Add case-base search instruction to the core (F8).
- [ ] Rewrite the "CRITICAL: SEARCH PROTOCOL" neutrally, keep the domain-prefix folder map (F5).
- [ ] Restore the Confluence guide list (F6 — needs Joost: which guides?).
- [ ] Consolidate `.github/prompts/` into skills; delete `analyze-log.prompt.md` (F3).
- [ ] Move `svn-package-upload` skill into `.claude/skills/` (F16).

### Phase 2 — Missing knowledge (F9–F12)
- [ ] Hardware + domain glossary (needs Joost input for SP-series meanings).
- [ ] `systems.md` order registry.
- [ ] `error-codes.md` per template (AI-extractable).
- [ ] Template `docs/` for Waters, Testkit, Lutum (AI-drafted, human-reviewed).

### Phase 3 — Pipelines (F13–F15)
- [ ] Scraper: decide Copilot CLI vs `claude -p`; point its prompt at the shared skills; add confidence gate; auto-log confirmed resolutions.
- [ ] `skalar-lab-issue` intake skill.
- [ ] Sequence CSV diff script.

### Phase 4 — Hygiene (F16)
- [ ] Move/remove `wt_*.png`, `Tools&Scripts/analysis.md`.
- [ ] gitignore decisions: `Service Items/*/software/`, `Lab issues/*.zip`.

---

## 5. Decision log

- **2026-07-09 — Skills canonical location = `.claude/skills/`**, because Copilot discovers that path natively; `.github/skills/` copies to be deleted after verification on both PCs. Rejected alternatives: sync script (discipline-dependent), thin wrappers in `.github/skills` (duplicate skill names confuse discovery).
- **2026-07-09 — Always-on core stays in `.github/copilot-instructions.md`** with `CLAUDE.md` as a one-line include, because Copilot cannot include other files into its instructions, but Claude can.
- **2026-07-09 — Loupe MCP referenced via installed location** (`%LOCALAPPDATA%\Skalar\Loupe.Mcp\Loupe.Mcp.exe`, per-PC `install.ps1`) rather than the repo copy, because the repo path contains `&` (`Tools&Scripts`) which risks breaking process spawning, and the home PC already uses the installed path.
- **2026-07-09 — Findings documented before implementing** (this file), because the two PCs share only the repo; chat context must be reconstructable from the repo alone.
