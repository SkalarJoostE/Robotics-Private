// Build branded Word documents from the Rollout Markdown sources.
//
//   cd Rollout && npm install && npm run build
//
// The Markdown files stay the source of truth; the .docx are generated artefacts
// for sharing with people who will not open a repo. Re-run after editing any source.
//
// Styling comes from ./brand.js, which mirrors the constants used by
// Capability Overview/build-capability-doc.js so the whole set looks like one family.

const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, AlignmentType, ExternalHyperlink, ShadingType,
} = require("docx");
const B = require("./brand");

const ROLLOUT = path.join(__dirname, "..");

// Which documents to build. `eyebrow` is the small label above the title.
const DOCS = [
  {
    src: path.join(ROLLOUT, "Helpdesk-Usage-Plan.md"),
    out: path.join(ROLLOUT, "Robotics-AI — Helpdesk Usage Plan.docx"),
    eyebrow: "Robotics-AI  ·  Helpdesk usage plan  ·  July 2026",
    label: "Robotics-AI — Helpdesk usage plan",
  },
  {
    src: path.join(ROLLOUT, "Lab-Usage-Plan.md"),
    out: path.join(ROLLOUT, "Robotics-AI — Lab Usage Plan.docx"),
    eyebrow: "Robotics-AI  ·  Lab usage plan  ·  July 2026",
    label: "Robotics-AI — Lab usage plan",
  },
  {
    src: path.join(ROLLOUT, "Replay-Test", "PROTOCOL.md"),
    out: path.join(ROLLOUT, "Replay-Test", "Robotics-AI — Replay and Question Test Protocol.docx"),
    eyebrow: "Robotics-AI  ·  Phase A evidence  ·  July 2026",
    label: "Robotics-AI — Replay & question test protocol",
  },
];

const PAGE_WIDTH_DXA = 10080; // Letter minus the 1080-twip side margins

// ---------------------------------------------------------------- inline text
// Handles **bold**, `code`, [text](url) and *italic*. Order matters: code is
// matched first so backtick contents are never re-parsed, bold before italic so
// ** is not mistaken for a pair of single asterisks.
const INLINE_RE = /(`[^`]+`)|(\*\*[^*]+?\*\*)|(\[[^\]]+?\]\([^)]+?\))|(\*[^*\s][^*]*?\*)/g;

function inline(text, base = {}) {
  const size = base.size ?? 21;
  const color = base.color ?? B.SOFT;
  const runs = [];
  let last = 0;
  let m;

  const plain = (s, extra = {}) => {
    if (!s) return;
    runs.push(new TextRun({
      text: s,
      font: extra.bold ? B.FONT_BOLD : B.FONT,
      size, color, ...extra,
    }));
  };

  INLINE_RE.lastIndex = 0;
  while ((m = INLINE_RE.exec(text)) !== null) {
    plain(text.slice(last, m.index), base);
    const tok = m[0];

    if (m[1]) {
      // `inline code` — monospace, slightly smaller, secondary blue
      runs.push(new TextRun({
        text: tok.slice(1, -1), font: B.FONT_MONO,
        size: size - 3, color: B.AEGEAN_DK,
      }));
    } else if (m[2]) {
      plain(tok.slice(2, -2), { ...base, bold: true, color: base.strongColor ?? B.INK });
    } else if (m[3]) {
      const cut = tok.indexOf("](");
      const label = tok.slice(1, cut);
      const href = tok.slice(cut + 2, -1);
      if (/^https?:/i.test(href)) {
        runs.push(new ExternalHyperlink({
          link: href,
          children: [new TextRun({ text: label, font: B.FONT, size, color: B.AEGEAN_DK, underline: {} })],
        }));
      } else {
        // Relative repo links mean nothing in a standalone .docx — keep the words only.
        plain(label, base);
      }
    } else if (m[4]) {
      plain(tok.slice(1, -1), { ...base, italics: true });
    }
    last = m.index + tok.length;
  }
  plain(text.slice(last), base);
  return runs.length ? runs : [new TextRun({ text: "", font: B.FONT, size, color })];
}

// ------------------------------------------------------------------- blocks
function rule() {
  return new Paragraph({
    spacing: { before: 200, after: 140 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: B.LINE } },
    children: [],
  });
}

function heading(level, text) {
  if (level === 2) {
    return new Paragraph({
      spacing: { before: 320, after: 100 },
      children: [new TextRun({ text, font: B.FONT_BOLD, bold: true, size: 27, color: B.PRUSSIAN })],
    });
  }
  return new Paragraph({
    spacing: { before: 220, after: 80 },
    children: [new TextRun({ text, font: B.FONT_BOLD, bold: true, size: 22, color: B.AEGEAN_DK })],
  });
}

function body(text) {
  return new Paragraph({
    spacing: { after: 140, line: 276 },
    children: inline(text),
  });
}

function bulletPara(text, level) {
  // Task-list markers render as boxes rather than literal "[x]".
  let prefix = null;
  const t = text.replace(/^\[([ xX])\]\s+/, (_, c) => { prefix = c.trim() ? "☑  " : "☐  "; return ""; });
  const runs = inline(t);
  if (prefix) {
    runs.unshift(new TextRun({ text: prefix, font: B.FONT_BOLD, size: 21, color: prefix === "☑  " ? B.AEGEAN_DK : B.FAINT }));
  }
  return new Paragraph({ bullet: { level }, spacing: { after: 70, line: 264 }, children: runs });
}

// Numbered steps keep the author's own numbers — simpler than a Word numbering
// definition and never renumbers something the text refers to by number.
function numberedPara(marker, text) {
  return new Paragraph({
    spacing: { after: 80, line: 264 },
    indent: { left: 360, hanging: 360 },
    children: [
      new TextRun({ text: marker.padEnd(4, " "), font: B.FONT_BOLD, bold: true, size: 21, color: B.PRUSSIAN }),
      ...inline(text),
    ],
  });
}

// Blockquotes carry the "read this bit" weight in these documents (limits,
// warnings, the framing question), so they get an Aegean rule and a tint.
function quoteParas(lines) {
  const groups = [[]];
  for (const l of lines) {
    if (l.trim() === "") groups.push([]);
    else groups[groups.length - 1].push(l);
  }
  return groups.filter(g => g.length).map((g, i, arr) => new Paragraph({
    spacing: { before: i === 0 ? 120 : 0, after: i === arr.length - 1 ? 160 : 80, line: 268 },
    indent: { left: 260, right: 160 },
    border: { left: { style: BorderStyle.SINGLE, size: 12, color: B.AEGEAN, space: 12 } },
    shading: { type: ShadingType.CLEAR, fill: B.WASH },
    children: inline(g.join(" "), { color: B.INK }),
  }));
}

function codeParas(lines) {
  return lines.map((l, i, arr) => new Paragraph({
    spacing: { before: i === 0 ? 100 : 0, after: i === arr.length - 1 ? 160 : 0, line: 240 },
    indent: { left: 200, right: 120 },
    shading: { type: ShadingType.CLEAR, fill: B.WASH },
    children: [new TextRun({
      // Word collapses runs of spaces in some viewers; NBSP keeps code indented.
      text: l.replace(/^ +/, s => " ".repeat(s.length)) || " ",
      font: B.FONT_MONO, size: 16, color: B.INK,
    })],
  }));
}

function splitRow(line) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "")
    .split(/(?<!\\)\|/).map(c => c.trim().replace(/\\\|/g, "|"));
}

function table(rows) {
  const head = rows[0];
  const bodyRows = rows.slice(1);
  const cols = head.length;

  // Column widths proportional to the longest cell in each column, so a
  // "Why it is in" column gets the room it needs and "Tier" does not.
  const weights = head.map((_, c) => {
    const longest = Math.max(head[c].length, ...bodyRows.map(r => (r[c] || "").length));
    return Math.max(longest, 6);
  });
  const total = weights.reduce((a, b) => a + b, 0);
  const widths = weights.map(w => Math.max(Math.round((w / total) * PAGE_WIDTH_DXA), Math.round(PAGE_WIDTH_DXA * 0.07)));

  const border = { style: BorderStyle.SINGLE, size: 2, color: B.LINE };
  const cell = (text, isHead, i) => new TableCell({
    width: { size: widths[i], type: WidthType.DXA },
    margins: { top: 90, bottom: 90, left: 130, right: 130 },
    shading: isHead ? { type: ShadingType.CLEAR, fill: B.PRUSSIAN } : undefined,
    borders: { top: border, bottom: border, left: border, right: border },
    children: [new Paragraph({
      spacing: { after: 0, line: 252 },
      children: isHead
        ? [new TextRun({ text, font: B.FONT_BOLD, bold: true, size: 18, color: "FFFFFF" })]
        : inline(text, { size: 18 }),
    })],
  });

  return new Table({
    width: { size: PAGE_WIDTH_DXA, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({ tableHeader: true, children: head.map((t, i) => cell(t, true, i)) }),
      ...bodyRows.map(r => new TableRow({
        children: Array.from({ length: cols }, (_, i) => cell(r[i] || "", false, i)),
      })),
    ],
  });
}

// ------------------------------------------------------------------ parser
function convert(md, cfg) {
  const lines = md.split(/\r?\n/);
  const out = [];
  let i = 0;
  let seenTitle = false;
  let inTitleBlock = false;

  while (i < lines.length) {
    const line = lines[i];

    // fenced code
    if (/^\s*```/.test(line)) {
      const buf = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      out.push(...codeParas(buf));
      continue;
    }

    // table
    if (/^\s*\|/.test(line) && /^\s*\|?[\s:-]*-[-\s:|]*$/.test(lines[i + 1] || "")) {
      const rows = [splitRow(line)];
      i += 2;
      while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(splitRow(lines[i++]));
      out.push(table(rows));
      out.push(new Paragraph({ spacing: { after: 180 }, children: [] }));
      continue;
    }

    // blockquote
    if (/^\s*>/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      out.push(...quoteParas(buf));
      continue;
    }

    // headings
    let m = line.match(/^(#{1,6})\s+(.*)$/);
    if (m) {
      const level = m[1].length;
      const text = m[2].trim();
      if (level === 1 && !seenTitle) {
        seenTitle = true;
        inTitleBlock = true;
        out.push(new Paragraph({
          spacing: { after: 60 },
          children: [new TextRun({
            text: cfg.eyebrow.toUpperCase(), font: B.FONT_BOLD, bold: true,
            size: 16, color: B.FAINT, characterSpacing: 30,
          })],
        }));
        out.push(new Paragraph({
          spacing: { after: 100 },
          children: [new TextRun({ text: text.replace(/\s*—.*$/, ""), font: B.FONT_BOLD, bold: true, size: 40, color: B.INK })],
        }));
        const sub = text.includes("—") ? text.split("—").slice(1).join("—").trim() : "";
        if (sub) {
          out.push(new Paragraph({
            spacing: { after: 120, line: 276 },
            children: [new TextRun({ text: sub, font: B.FONT, size: 24, color: B.AEGEAN_DK })],
          }));
        }
      } else {
        inTitleBlock = false;
        out.push(heading(level === 1 ? 2 : level, text));
      }
      i++;
      continue;
    }

    // horizontal rule
    if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) {
      out.push(rule());
      i++;
      continue;
    }

    // list item (supports one level of nesting)
    m = line.match(/^(\s*)[-*+]\s+(.*)$/);
    if (m) {
      inTitleBlock = false;
      out.push(bulletPara(m[2].trim(), m[1].length >= 2 ? 1 : 0));
      i++;
      continue;
    }
    m = line.match(/^\s*(\d+\.)\s+(.*)$/);
    if (m) {
      inTitleBlock = false;
      out.push(numberedPara(m[1], m[2].trim()));
      i++;
      continue;
    }

    // blank
    if (line.trim() === "") { i++; continue; }

    // Metadata lines directly under the title ("**Owner:** ..."), rendered small.
    if (inTitleBlock && /^\*\*/.test(line.trim())) {
      out.push(new Paragraph({
        spacing: { after: 40, line: 264 },
        children: inline(line.trim(), { size: 18, color: B.FAINT, strongColor: B.SOFT }),
      }));
      i++;
      continue;
    }

    // paragraph — join continuation lines
    const buf = [line.trim()];
    i++;
    while (i < lines.length && lines[i].trim() !== ""
           && !/^\s*([-*+]\s|\d+\.\s|#{1,6}\s|>|\||```)/.test(lines[i])
           && !/^\s*(---|\*\*\*|___)\s*$/.test(lines[i])) {
      buf.push(lines[i].trim());
      i++;
    }
    inTitleBlock = false;
    out.push(body(buf.join(" ")));
  }

  return out;
}

// -------------------------------------------------------------------- build
(async () => {
  for (const cfg of DOCS) {
    if (!fs.existsSync(cfg.src)) {
      console.error(`SKIP  missing source: ${cfg.src}`);
      process.exitCode = 1;
      continue;
    }
    const md = fs.readFileSync(cfg.src, "utf8");
    const doc = new Document({
      styles: { default: { document: { run: { font: B.FONT, size: 21, color: B.INK } } } },
      sections: [{
        properties: { page: { margin: B.PAGE_MARGIN } },
        headers: { default: B.header() },
        footers: { default: B.footer(cfg.label) },
        children: convert(md, cfg),
      }],
    });
    const buf = await Packer.toBuffer(doc);
    fs.writeFileSync(cfg.out, buf);
    console.log(`OK    ${path.basename(cfg.out)}  (${(buf.length / 1024).toFixed(0)} KB)`);
  }
})();
