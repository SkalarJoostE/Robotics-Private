const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  BorderStyle, TabStopType, Header, ImageRun
} = require("docx");

// Velaris brand palette (Velaris_brandbook_v1.05.pdf): Prussian Blue is the
// primary/dominant hue, Aegean Blue the secondary.
const PRUSSIAN = "1B355D";
const AEGEAN_DK = "3F5A86"; // readable text weight of Aegean on light backgrounds

const INK = "16233A";
const SOFT = "47597A";
const FAINT = "7686A3";
const LINE = "DBE2EE";

// Velaris brand rule: Microsoft documents (Word, PowerPoint) use Segoe UI —
// Museo is reserved for desktop-publishing materials (brochures/flyers).
const FONT = "Segoe UI Light";
const FONT_BOLD = "Segoe UI";

// Bold text renders in true "Segoe UI"; regular body text renders in the
// lighter "Segoe UI Light" the brand book specifies for Microsoft documents.
function txt(text, opts = {}) {
  const font = opts.font ?? (opts.bold ? FONT_BOLD : FONT);
  return new TextRun({ text, ...opts, font });
}

function spacer(size = 120) {
  return new Paragraph({ spacing: { after: size }, children: [] });
}

function eyebrow(text, color = FAINT) {
  return new Paragraph({
    spacing: { after: 60 },
    children: [new TextRun({ text: text.toUpperCase(), font: FONT_BOLD, bold: true, size: 16, color, characterSpacing: 30 })],
  });
}

function h2(text, color = PRUSSIAN) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 200, after: 80 },
    children: [new TextRun({ text, font: FONT_BOLD, bold: true, size: 27, color })],
  });
}

function para(text, opts = {}) {
  const font = opts.bold ? FONT_BOLD : FONT;
  return new Paragraph({
    spacing: { after: opts.after ?? 140, line: 276 },
    children: [new TextRun({ text, font, size: opts.size ?? 21, color: opts.color ?? SOFT, bold: opts.bold })],
  });
}

function bullet(runs) {
  const arr = Array.isArray(runs) ? runs : [txt(runs, { size: 21, color: SOFT })];
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 70, line: 264 },
    children: arr,
  });
}

// ---- Capability list: one bulleted line per item — bold name, a single-
// sentence description, and (for scripts) the filename to run.
function capItem(name, what, script, accentColor) {
  const runs = [
    new TextRun({ text: name + " — ", font: FONT_BOLD, bold: true, size: 20, color: INK }),
    new TextRun({ text: what, font: FONT, size: 19, color: SOFT }),
  ];
  if (script) {
    runs.push(new TextRun({ text: "  (", font: FONT, size: 15, color: FAINT }));
    runs.push(new TextRun({ text: script, font: "Consolas", size: 14, color: accentColor }));
    runs.push(new TextRun({ text: ")", font: FONT, size: 15, color: FAINT }));
  }
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 110, line: 260 },
    children: runs,
  });
}

function capList(rows, accentColor) {
  return rows.map(([name, what, script]) => capItem(name, what, script, accentColor));
}

function rule() {
  return new Paragraph({
    spacing: { before: 200, after: 100 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: LINE } },
    children: [],
  });
}

// Letterhead logo — "SKALAR, a Velaris brand" (verified via SK_Document_format.docx's
// own header: image at native 2688x777px / 3.459 aspect, placed top-left at ~1.93in wide).
const logoBuffer = fs.readFileSync(path.join(__dirname, "skalar-velaris-logo.png"));
const header = new Header({
  children: [
    new Paragraph({
      spacing: { after: 0 },
      children: [
        new ImageRun({
          type: "png",
          data: logoBuffer,
          transformation: { width: 184, height: 53 },
        }),
      ],
    }),
  ],
});

const doc = new Document({
  styles: {
    default: { document: { run: { font: FONT, size: 21, color: INK } } },
  },
  sections: [{
    properties: { page: { margin: { top: 1500, bottom: 1000, left: 1080, right: 1080 } } },
    headers: { default: header },
    children: [
      // ---- Title block ----
      eyebrow("Robotics-AI  ·  Capability overview  ·  July 2026", FAINT),
      new Paragraph({
        spacing: { after: 90 },
        children: [new TextRun({ text: "What Robotics-AI Can Do Today", font: FONT_BOLD, bold: true, size: 40, color: INK })],
      }),
      new Paragraph({
        spacing: { after: 160, line: 276 },
        children: [new TextRun({
          text: "An AI-assisted workspace that helps diagnose, configure and build lab-robot software faster. Some of it uses AI, some is plain scripts — both are listed below in plain language.",
          font: FONT, size: 20, color: SOFT,
        })],
      }),

      // ---- AI ----
      h2("AI", PRUSSIAN),
      para("Skills the AI loads on demand — describe the problem in plain words, it does the legwork and reports back.", { after: 100, size: 19 }),
      ...capList([
        ["Diagnose a robot from its logs", "Reads the robot's binary log file directly and explains what went wrong, in plain terms."],
        ["Solve a service ticket (RB / ES)", "Gathers the ticket, software and logs, checks past cases, and — if needed — reads the logs and traces the robot's own code to find the fault."],
        ["Help the lab with a robot in build or test", "Give an order number, a problem description, and a log if you have one; it diagnoses the same way and suggests a fix."],
        ["Build or copy a feature into a robot", "Guides adding or copying a software feature from a reference robot into another, including the code changes."],
        ["Answer questions about the robot software", "An always-available reference on how the software is built, so the knowledge isn't locked in one or two heads."],
        ["Package & deliver a software build", "Packages a finished build and uploads it for delivery to the customer in one step."],
      ], PRUSSIAN),
      spacer(140),

      // ---- SCRIPTS ----
      h2("Scripts", AEGEAN_DK),
      para("No AI, no subscription — double-click or one-line scripts the AI also uses under the hood.", { after: 100, size: 19 }),
      ...capList([
        ["Fetch a robot's software", "Checks out (or refreshes) a robot's software from the company server by order number.", "fetch-project.ps1"],
        ["Auto-collect service tickets", "Builds a ready-to-investigate folder for every new RB/ES ticket — software, logs, attachments.", "Process-ServiceTickets.ps1"],
        ["Modernise an old robot for Windows 11", "Automates the long manual procedure to get old robot software running on Windows 11.", "Update-Core.bat"],
        ["Read the robot's program as a spreadsheet", "Turns the robot's internal step-by-step program into a readable spreadsheet.", "Parse-SkalarTables.ps1"],
        ["Prepare a customer's software zip", "Prepares a software zip from a customer or ticket exactly like a fresh checkout, ready to diagnose.", "Process-SoftwareFolder.ps1"],
        ["Build an error-code lookup", "Extracts every error code and its meaning for a robot template into one lookup table.", "Extract-ErrorCodes.py"],
        ["Move code in & out of the software", "Lets an engineer edit the robot's code in normal files and sync it back into the software.", "Sync-ActionCode.ps1"],
        ["Set up a new PC in one click", "Installs and configures everything needed to use the whole workspace on a new PC.", "Bootstrap-RoboticsAI.bat"],
      ], AEGEAN_DK),
      spacer(140),

      // ---- HOW IT KNOWS ----
      h2("How it knows", PRUSSIAN),
      para("The AI has no built-in knowledge of our robots. The expertise is ours, in plain text handed to it at the right moment:", { after: 90, size: 19 }),
      bullet([txt("Always on", { bold: true, size: 19, color: INK }), txt(" — one core file loads every conversation, describing our products, systems and tools.", { size: 19, color: SOFT })]),
      bullet([txt("On demand", { bold: true, size: 19, color: INK }), txt(" — for bigger jobs it opens the matching written procedure (a \"skill\"), so it follows our method.", { size: 19, color: SOFT })]),
      bullet([txt("On request", { bold: true, size: 19, color: INK }), txt(" — instructions, docs and every solved case are plain text (.md) it reads directly, like a colleague would.", { size: 19, color: SOFT })]),
      bullet([txt("Case base", { bold: true, size: 19, color: INK }), txt(" — 30+ solved issues are written up and checked before every new diagnosis, so answers get faster over time.", { size: 19, color: SOFT })]),
      para("The expertise is ours, in editable text — improving it means writing another document, not retraining anything.", { after: 0, size: 19, color: FAINT }),
      spacer(160),

      rule(),
      new Paragraph({
        children: [
          new TextRun({ text: "Robotics-AI — internal capability overview", font: FONT, size: 16, color: FAINT }),
          new TextRun({ text: "\tInternal use · July 2026", font: FONT, size: 16, color: FAINT }),
        ],
        tabStops: [{ type: TabStopType.RIGHT, position: 9360 }],
      }),
    ],
  }],
});

Packer.toBuffer(doc).then((buf) => {
  const out = process.argv[2];
  fs.writeFileSync(out, buf);
  console.log("wrote " + out + " (" + buf.length + " bytes)");
});
