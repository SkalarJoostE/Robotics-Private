# Capability Overview — handoff note

Working session: Joost is building a non-technical "what can Robotics-AI do" overview to pitch making it an official cross-department project to his manager / the planning group. Three deliverables, kept in sync:

- **Web page** (Artifact): https://claude.ai/code/artifact/bf5086de-852c-41c6-ae6a-6fe224ebffb3 — private, opens from any device signed into the same Claude account. Source: `robotics-ai-overview.html` (this folder).
- **Word doc**: `Robotics-AI Capability Overview.docx` — generated from `build-capability-doc.js` (Node + the `docx` npm package), both in this folder. Re-run with `node build-capability-doc.js "Robotics-AI Capability Overview.docx"` after editing the script.
- **Slide deck**: `Robotics-AI Capability Overview.pptx` — 11 slides, generated from `build-capability-deck.js` (Node + `pptxgenjs`, icons via `react-icons` + `sharp`). Re-run with `node build-capability-deck.js`. **This is the presented version and it carries the ask**, which the page and the doc deliberately do not: it goes further than the capability copy into the business case (why it exists, evidence, departments, rollout phases, cost, limits, the three-part ask), sourced from `../PROJECT.md`. Every slide has speaker notes — the argument, the caveats, and the answers to the questions each slide invites.

Run `npm install` in `Rollout/` once before any of the generators (`node_modules` isn't tracked; the dependencies are in `Rollout/package.json`). All three generators read `skalar-velaris-logo.png` from this directory, so keep it with them.

## Brand
Styled to `../Brand/Velaris_brandbook_v1.05.pdf` (Velaris = the parent brand of Skalar Analytical). Palette: Prussian Blue `#1B355D` (primary), Aegean Blue `#6686B7`/`#3F5A86` (secondary), Tuscan Sun `#FFA400` (accent — brand book reserves it for calls-to-action only). Word doc uses Segoe UI / Segoe UI Light (brand book mandates this for Microsoft documents, not the print-only Museo font). Web page embeds free look-alike fonts (Nunito Sans, Bitter, Bebas Neue) as data URIs since Museo is commercial and unlicensed here.

The Word doc header carries the "SKALAR — a Velaris brand" logo (extracted from `../Brand/SK_Document_format.docx`, a doc-format example Joost provided — that file's own footer said "BLUVISION", ignore that, it was leftover from an unrelated brochure).

## Decisions made this session (most recent first)
- Removed the "To make this official" CTA panel, the "Why it keeps getting better" section (folded its "case base" point into "How it knows"), all section eyebrow labels ("POWERED BY AI" etc.), and per-item "who it's for" tags — user wants it short/informative, not busy.
- Section headers simplified to single words: **AI**, **Scripts**, **How it knows**.
- Each capability is now ONE bulleted line: bold name — one-sentence description — (script filename in parens, tools section only).
- Explicitly excluded: the lab-triage cost-logger POC (`lab-chat-poc/`) — not run yet, not ready to show.
- Capability table (grid with borders) was tried and rejected as "too busy" → replaced with the one-liner bullet list above.

## Deck decisions (2026-08-11)
- **The deck is the pitch; the page and doc are the capability reference.** It reuses their vetted plain-language copy for the two capability slides and takes everything else from `../PROJECT.md`.
- **Numbers were re-counted from the workspace, not copied:** 47 write-ups (detail files across the five `md documents\AI * Details\` folders, excluding each folder's README — this also settles the 47-vs-41 inconsistency inside `PROJECT.md`, where §2 says 47 and the §8 log still says 41), 1,276 indexed orders, 12 dossiers across 6 template families.
- **The cost slide states the ceiling framing on the slide itself**, per the 2026-08-11 decision-log entry — the €3.91 / ~7-per-day figures are un-optimised and must not be quoted as a unit cost.
- **A limits slide is included and should not be cut.** Same reasoning as the usage plans: naming the weaknesses is what makes the rest credible, and it puts the security question in phase A where it is cheap.
- Excluded on the existing evidence rule: error-code extraction, and the chat POC as a *capability* (it appears only as measurement behind the cost slide).

## If continuing
Read `build-capability-deck.js` for the deck, `build-capability-doc.js` for the doc, and `robotics-ai-overview.html` for the web page. All three should stay in sync when content changes. Ask Joost what's next rather than assuming — this note is context, not a task list.
