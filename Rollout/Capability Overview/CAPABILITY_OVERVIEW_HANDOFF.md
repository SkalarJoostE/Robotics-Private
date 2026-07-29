# Capability Overview — handoff note

Working session: Joost is building a non-technical "what can Robotics-AI do" overview to pitch making it an official cross-department project to his manager / the planning group. Two deliverables, kept in sync:

- **Web page** (Artifact): https://claude.ai/code/artifact/bf5086de-852c-41c6-ae6a-6fe224ebffb3 — private, opens from any device signed into the same Claude account. Source: `robotics-ai-overview.html` (this folder).
- **Word doc**: `Robotics-AI Capability Overview.docx` — generated from `build-capability-doc.js` (Node + the `docx` npm package), both in this folder. Re-run with `node build-capability-doc.js "Robotics-AI Capability Overview.docx"` after editing the script; needs `npm install docx` in that folder first (not committed — `node_modules` isn't tracked). The script reads `skalar-velaris-logo.png` from its own directory, so keep the two together.

## Brand
Styled to `../Brand/Velaris_brandbook_v1.05.pdf` (Velaris = the parent brand of Skalar Analytical). Palette: Prussian Blue `#1B355D` (primary), Aegean Blue `#6686B7`/`#3F5A86` (secondary), Tuscan Sun `#FFA400` (accent — brand book reserves it for calls-to-action only). Word doc uses Segoe UI / Segoe UI Light (brand book mandates this for Microsoft documents, not the print-only Museo font). Web page embeds free look-alike fonts (Nunito Sans, Bitter, Bebas Neue) as data URIs since Museo is commercial and unlicensed here.

The Word doc header carries the "SKALAR — a Velaris brand" logo (extracted from `../Brand/SK_Document_format.docx`, a doc-format example Joost provided — that file's own footer said "BLUVISION", ignore that, it was leftover from an unrelated brochure).

## Decisions made this session (most recent first)
- Removed the "To make this official" CTA panel, the "Why it keeps getting better" section (folded its "case base" point into "How it knows"), all section eyebrow labels ("POWERED BY AI" etc.), and per-item "who it's for" tags — user wants it short/informative, not busy.
- Section headers simplified to single words: **AI**, **Scripts**, **How it knows**.
- Each capability is now ONE bulleted line: bold name — one-sentence description — (script filename in parens, tools section only).
- Explicitly excluded: the lab-triage cost-logger POC (`lab-chat-poc/`) — not run yet, not ready to show.
- Capability table (grid with borders) was tried and rejected as "too busy" → replaced with the one-liner bullet list above.

## If continuing
Read `build-capability-doc.js` for the doc structure/copy, and `robotics-ai-overview.html` for the web page. Both should stay in sync when content changes. Ask Joost what's next rather than assuming — this note is context, not a task list.
