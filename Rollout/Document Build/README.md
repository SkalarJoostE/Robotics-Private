# Document Build

Turns the Rollout Markdown sources into branded Word documents for people who will not open a repo.

**The Markdown stays the source of truth.** The `.docx` files are generated artefacts — edit the `.md`,
then rebuild. Never edit a generated `.docx` directly; the next build overwrites it.

## Rebuild

```bash
cd Rollout && npm install && npm run build
```

`npm install` is only needed the first time (or after a clone) — `node_modules/` is gitignored.

## What it builds

| Source | Output |
|---|---|
| `Helpdesk-Usage-Plan.md` | `Robotics-AI — Helpdesk Usage Plan.docx` |
| `Lab-Usage-Plan.md` | `Robotics-AI — Lab Usage Plan.docx` |
| `Replay-Test/PROTOCOL.md` | `Replay-Test/Robotics-AI — Replay and Question Test Protocol.docx` |

To add another document, append an entry to the `DOCS` array in `build-rollout-docs.js`.

## Files

- **`brand.js`** — the Velaris palette, fonts, letterhead and footer. Mirrors the constants in
  `../Capability Overview/build-capability-doc.js` so the whole set looks like one family. **If the brand
  changes, change it in both** — or fold that older script into this module.
- **`build-rollout-docs.js`** — a small Markdown → docx converter covering exactly what these documents
  use: headings, paragraphs, bullet and numbered lists, task boxes, GFM tables, blockquotes, fenced code,
  horizontal rules, and inline bold / italic / `code` / links.

## Deliberate conversion choices

- **Relative repo links keep their words but lose the link.** `[PROTOCOL.md](Replay-Test/PROTOCOL.md)`
  means nothing to someone reading a standalone Word file. External `http(s)` links stay clickable.
- **Numbered lists keep the author's own numbers** rather than using a Word numbering definition, so a
  step the prose refers to as "rule 2" cannot silently renumber.
- **Blockquotes get an Aegean rule and a tint.** In these documents the quotes carry the weight — the
  stated limits, the warnings, the framing question — so they are meant to catch the eye.
- **Tuscan Sun (`FFA400`) is not used.** The brand book reserves it for calls to action.
- **Column widths are proportional to the longest cell**, so a "Why it is in" column gets room and a
  "Tier" column does not.

## Checking a build

Word is not needed. To confirm nothing leaked or was dropped, unzip `word/document.xml` from the output
and compare stripped text length against the source — a healthy build lands at 100–101% (the excess is the
eyebrow and footer; any shortfall should be only the dropped relative-link URLs). Watch for literal `**`,
`` ` `` or `](` in the extracted text: that means the inline parser missed a construct.
