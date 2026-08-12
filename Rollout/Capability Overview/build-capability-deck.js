/**
 * Robotics-AI — non-technical capability & rollout deck.
 *
 * Content source: ../PROJECT.md (organisational layer) and robotics-ai-overview.html
 * (the vetted non-technical copy). Keep the three in sync when content changes.
 *
 *   node build-capability-deck.js "Robotics-AI Capability Overview.pptx"
 *
 * Needs pptxgenjs / react-icons / react-dom / sharp installed in ../node_modules.
 * Reads skalar-velaris-logo.png from its own directory — keep the two together.
 */

const path = require("path");
const fs = require("fs");
const PptxGenJS = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const Fi = require("react-icons/fi");

const OUT = process.argv[2] || "Robotics-AI Capability Overview.pptx";
const LOGO = path.join(__dirname, "skalar-velaris-logo.png");

/* ---------------------------------------------------------------- palette */
/* Velaris brand book v1.05. Tuscan Sun is reserved for calls to action. */
const NAVY = "1B355D"; // Prussian Blue — primary
const NAVY_D = "132845"; // deeper shade for dark slides
const AEG = "6686B7"; // Aegean Blue — secondary
const AEG_D = "3F5A86";
const SUN = "FFA400"; // Tuscan Sun — accent, CTA only
const TINT = "EDF1F8"; // card fill on light slides
const TINT_D = "24406B"; // card fill on dark slides
const GREY = "5B6B84";
const ICE = "AFC3E0";
const W = "FFFFFF";

const FONT = "Segoe UI"; // brand book mandates Segoe UI for Microsoft documents

const pres = new PptxGenJS();
pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5
pres.author = "Software Engineering";
pres.title = "Robotics-AI — Capability Overview";

const SW = 13.333;

/* ------------------------------------------------------------------ icons */
const iconCache = {};
async function icon(name, color) {
  const key = name + color;
  if (iconCache[key]) return iconCache[key];
  const svg = ReactDOMServer.renderToStaticMarkup(
    React.createElement(Fi[name], { color: "#" + color, size: 256, strokeWidth: 2 })
  );
  const buf = await sharp(Buffer.from(svg)).resize(256, 256).png().toBuffer();
  iconCache[key] = "image/png;base64," + buf.toString("base64");
  return iconCache[key];
}

/* ----------------------------------------------------------------- helpers */
const shadow = () => ({ type: "outer", color: "8FA3C0", blur: 10, offset: 2, angle: 90, opacity: 0.28 });

function lightSlide() {
  const s = pres.addSlide();
  s.background = { color: W };
  return s;
}

function darkSlide() {
  const s = pres.addSlide();
  s.background = { color: NAVY };
  return s;
}

/** Kicker + title block, used on every content slide. */
function heading(s, kicker, title, opts = {}) {
  const dark = !!opts.dark;
  s.addText(kicker.toUpperCase(), {
    x: 0.7, y: 0.42, w: 11.9, h: 0.28, margin: 0,
    fontFace: FONT, fontSize: 11, bold: true, charSpacing: 2,
    color: dark ? AEG : AEG_D,
  });
  s.addText(title, {
    x: 0.7, y: 0.74, w: opts.tw || 11.9, h: opts.th || 0.8, margin: 0,
    fontFace: FONT, fontSize: opts.ts || 32, bold: true,
    color: dark ? W : NAVY, valign: "top",
  });
}

function footer(s, dark) {
  s.addText("Robotics-AI  ·  internal capability overview  ·  August 2026", {
    x: 0.7, y: 6.92, w: 11.9, h: 0.3, margin: 0,
    fontFace: FONT, fontSize: 9, color: dark ? AEG : "9AA9BF",
  });
}

/** Card with an icon in a filled circle, a bold heading and a body line. */
async function iconCard(s, o) {
  s.addShape(pres.ShapeType.roundRect, {
    x: o.x, y: o.y, w: o.w, h: o.h, rectRadius: 0.09,
    fill: { color: o.dark ? TINT_D : TINT }, line: { color: o.dark ? TINT_D : "DCE4F0", width: 1 },
    shadow: o.dark ? undefined : shadow(),
  });
  const cx = o.x + 0.32, cy = o.y + 0.3, d = 0.52;
  s.addShape(pres.ShapeType.ellipse, {
    x: cx, y: cy, w: d, h: d,
    fill: { color: o.dark ? AEG : NAVY }, line: { color: o.dark ? AEG : NAVY, width: 0 },
  });
  s.addImage({ data: await icon(o.icon, o.dark ? NAVY : W), x: cx + 0.135, y: cy + 0.135, w: 0.25, h: 0.25 });
  const tx = cx + d + 0.24, tw = o.w - (d + 0.8);
  /* titleH must cover however many lines the heading wraps to, or the body
     runs straight through it — pass 0.58 for headings that take two lines. */
  const titleH = o.titleH || 0.3;
  const top = o.y + 0.24;
  s.addText(o.title, {
    x: tx, y: top, w: tw, h: titleH, margin: 0,
    fontFace: FONT, fontSize: 14.5, bold: true, color: o.dark ? W : NAVY, valign: "top",
  });
  s.addText(o.body, {
    x: tx, y: top + titleH + 0.06, w: tw, h: o.h - (titleH + 0.54), margin: 0,
    fontFace: FONT, fontSize: 11.5, color: o.dark ? ICE : GREY, lineSpacing: 15, valign: "top",
  });
}

/** Card led by a big number in a circle. */
function numberCard(s, o) {
  s.addShape(pres.ShapeType.roundRect, {
    x: o.x, y: o.y, w: o.w, h: o.h, rectRadius: 0.09,
    fill: { color: o.dark ? TINT_D : TINT }, line: { color: o.dark ? TINT_D : "DCE4F0", width: 1 },
    shadow: o.dark ? undefined : shadow(),
  });
  const d = 0.58;
  s.addShape(pres.ShapeType.ellipse, {
    x: o.x + 0.36, y: o.y + 0.36, w: d, h: d,
    fill: { color: o.accent || (o.dark ? SUN : NAVY) }, line: { width: 0, color: W },
  });
  s.addText(String(o.n), {
    x: o.x + 0.36, y: o.y + 0.36, w: d, h: d, margin: 0,
    fontFace: FONT, fontSize: 15, bold: true, align: "center", valign: "middle",
    color: o.accent ? NAVY : W,
  });
  s.addText(o.eyebrow, {
    x: o.x + 0.36, y: o.y + 1.08, w: o.w - 0.72, h: 0.24, margin: 0,
    fontFace: FONT, fontSize: 9.5, bold: true, charSpacing: 1.2,
    color: o.dark ? AEG : AEG_D,
  });
  s.addText(o.title, {
    x: o.x + 0.36, y: o.y + 1.34, w: o.w - 0.72, h: 0.42, margin: 0,
    fontFace: FONT, fontSize: 15, bold: true, color: o.dark ? W : NAVY, valign: "top",
  });
  s.addText(o.body, {
    x: o.x + 0.36, y: o.y + 1.82, w: o.w - 0.72, h: o.h - 2.06, margin: 0,
    fontFace: FONT, fontSize: 11.5, color: o.dark ? ICE : GREY, lineSpacing: 15, valign: "top",
  });
}

/* =========================================================== 1 · title */
function slideTitle() {
  const s = darkSlide();
  s.addShape(pres.ShapeType.roundRect, {
    x: 0.75, y: 0.6, w: 3.15, h: 1.0, rectRadius: 0.1,
    fill: { color: W }, line: { width: 0, color: W },
  });
  s.addImage({ path: LOGO, x: 0.98, y: 0.79, w: 2.7, h: 0.62 });

  s.addText("Robotics-AI", {
    x: 0.75, y: 2.5, w: 10.5, h: 1.0, margin: 0,
    fontFace: FONT, fontSize: 54, bold: true, color: W, valign: "top",
  });
  s.addText("An AI-assisted workspace for our lab-robot software", {
    x: 0.75, y: 3.55, w: 10.5, h: 0.5, margin: 0,
    fontFace: FONT, fontSize: 21, color: ICE, valign: "top",
  });
  s.addText(
    "What it does today, what it has already produced, and what it would take to make it something Helpdesk and Lab can rely on.",
    {
      x: 0.75, y: 4.35, w: 8.4, h: 0.8, margin: 0,
      fontFace: FONT, fontSize: 14, color: AEG, lineSpacing: 21, valign: "top",
    }
  );
  s.addText("Software Engineering  ·  August 2026", {
    x: 0.75, y: 6.5, w: 8.0, h: 0.3, margin: 0,
    fontFace: FONT, fontSize: 11.5, color: AEG,
  });
  s.addNotes(
    "Purpose of this deck: explain in plain language what Robotics-AI is, what it has produced so far, " +
    "and the three things needed to turn it from one engineer's tooling into a supported company tool. " +
    "No technical knowledge assumed."
  );
}

/* ====================================================== 2 · why it exists */
function slideWhy() {
  const s = lightSlide();
  heading(s, "Why this exists", "The bottleneck is not the robots.\nIt is the answers about them.", { th: 1.3, ts: 30 });

  s.addText(
    [
      { text: "Every robot we ship has its own software. When something goes wrong in the field, in the lab, or during a build, the knowledge of how that software actually works sits with a very small number of people.", options: { breakLine: true, paraSpaceAfter: 10 } },
      { text: "So Helpdesk and Lab wait. And Software Engineering — the scarcest resource in the chain — spends its time answering questions the evidence already contains: past cases, the setup guides, the robot's own logs and program.", options: { breakLine: true, paraSpaceAfter: 10 } },
      { text: "Robotics-AI is an assistant that has been taught that evidence, so those questions can be answered without a trip to an engineer.", options: {} },
    ],
    { x: 0.7, y: 2.5, w: 6.35, h: 3.3, margin: 0, fontFace: FONT, fontSize: 14, color: GREY, lineSpacing: 22, valign: "top" }
  );

  s.addShape(pres.ShapeType.roundRect, {
    x: 7.55, y: 2.42, w: 5.05, h: 3.5, rectRadius: 0.12,
    fill: { color: NAVY }, line: { width: 0, color: NAVY },
  });
  s.addText("“", {
    x: 7.95, y: 2.5, w: 1.0, h: 0.9, margin: 0,
    fontFace: FONT, fontSize: 60, bold: true, color: SUN, valign: "top",
  });
  s.addText(
    "Every question Helpdesk and Lab can answer themselves is Software Engineering capacity returned.",
    { x: 7.95, y: 3.35, w: 4.25, h: 1.7, margin: 0, fontFace: FONT, fontSize: 19, bold: true, color: W, lineSpacing: 27, valign: "top" }
  );
  s.addText("The case for this is not “AI is useful”. It is that engineer time is the constraint.", {
    x: 7.95, y: 5.05, w: 4.25, h: 0.6, margin: 0, fontFace: FONT, fontSize: 11.5, color: AEG, lineSpacing: 16, valign: "top",
  });
  footer(s);
  s.addNotes(
    "Lead with the constraint, not the technology. The argument a planning group can act on is capacity, " +
    "not novelty. In use by Software Engineering since April 2026."
  );
}

/* =================================================== 3 · how it knows */
function slideHowItKnows() {
  const s = lightSlide();
  heading(s, "How it works", "The intelligence is off-the-shelf.\nThe expertise is ours.", { th: 1.3, ts: 30 });

  s.addText(
    "The AI has no built-in knowledge of our robots. Everything it knows about them we wrote down as plain text files that live with the project and are handed to it at the right moment — in three layers.",
    { x: 0.7, y: 2.32, w: 9.4, h: 0.62, margin: 0, fontFace: FONT, fontSize: 13.5, color: GREY, lineSpacing: 20, valign: "top" }
  );

  const cw = 3.87, gap = 0.24;
  const cards = [
    { n: 1, eyebrow: "ALWAYS ON", title: "The ground rules", body: "One core file loads at the start of every conversation: our products, how the robot software is built, our naming, where things live. From the first message it already speaks Skalar." },
    { n: 2, eyebrow: "OPENED ON DEMAND", title: "The playbooks", body: "For each bigger job — analyse a log, solve a ticket, build a feature — there is a written step-by-step procedure. It opens only the one that matches, so it follows our method instead of improvising." },
    { n: 3, eyebrow: "READ WHEN NEEDED", title: "The knowledge base", body: "Template documentation, error-code tables and every solved-case write-up sit alongside as ordinary text files. When it needs a fact it opens the file — exactly as a colleague would." },
  ];
  cards.forEach((c, i) => numberCard(s, { ...c, x: 0.7 + i * (cw + gap), y: 3.06, w: cw, h: 3.06 }));

  s.addText(
    "Improving it means writing another document — not retraining anything, and not depending on one supplier.",
    { x: 0.7, y: 6.34, w: 11.9, h: 0.35, margin: 0, fontFace: FONT, fontSize: 13, bold: true, italic: true, color: NAVY }
  );
  footer(s);
  s.addNotes(
    "The reassurance point for a non-technical audience: nothing is hidden, nothing is locked into a vendor, " +
    "and the knowledge is readable and editable by us. Adding knowledge is writing a document."
  );
}

/* =================================================== 4 · what the AI does */
async function slideAiCapabilities() {
  const s = lightSlide();
  heading(s, "Powered by AI", "What it can do", { ts: 32 });
  s.addText(
    "You describe a problem in everyday words. It does the technical legwork — reading logs, pulling the right software, comparing versions, tracing the robot's program — and reports back.",
    { x: 0.7, y: 1.4, w: 10.6, h: 0.6, margin: 0, fontFace: FONT, fontSize: 13, color: GREY, lineSpacing: 19, valign: "top" }
  );

  const items = [
    { icon: "FiActivity", title: "Diagnose a robot from its logs", body: "Robot logs are a binary format needing a special viewer. It reads them directly and explains the crash, freeze or failed sample — and the exact step it happened on." },
    { icon: "FiLifeBuoy", title: "Solve a service ticket (RB / ES)", body: "Give it a ticket number. It pulls the ticket, the customer's software and logs, checks what we solved before, then reports a diagnosis with a recommended fix." },
    { icon: "FiTool", title: "Help the lab with a robot in build or test", body: "Order number, a description, a log if there is one. It checks past cases, then traces the robot's own program to pinpoint where it broke." },
    { icon: "FiCopy", title: "Build or copy a feature into a robot", body: "Guides adding or copying a measurement step, setting or behaviour from a proven reference robot into another one — following our own procedure." },
    { icon: "FiBookOpen", title: "Answer questions about the software", body: "An always-available reference on how the robot software is built, so the knowledge is not held by one or two people." },
    { icon: "FiSend", title: "Package and deliver a software build", body: "Checks out a finished package, zips it with the right naming and uploads it for delivery — the routine hand-off, in one step." },
  ];

  const cw = 5.83, ch = 1.38, gx = 0.24, gy = 0.19;
  for (let i = 0; i < items.length; i++) {
    await iconCard(s, {
      ...items[i],
      x: 0.7 + (i % 2) * (cw + gx),
      y: 2.1 + Math.floor(i / 2) * (ch + gy),
      w: cw, h: ch,
    });
  }
  footer(s);
  s.addNotes(
    "These six are in daily use. The common shape: it gathers and reads the evidence first, then reasons over it. " +
    "It is a well-prepared first opinion, not an authority — see the limits slide."
  );
}

/* ======================================================= 5 · plain scripts */
async function slideScripts() {
  const s = lightSlide();
  heading(s, "Runs on its own — no AI", "Plain tools and scripts", { ts: 32 });
  s.addText(
    "These need no AI and no per-person subscription. They are double-click or one-line scripts that do a fiddly manual job reliably. The AI uses them under the hood — but anyone can run them directly.",
    { x: 0.7, y: 1.56, w: 10.9, h: 0.6, margin: 0, fontFace: FONT, fontSize: 13, color: GREY, lineSpacing: 19, valign: "top" }
  );

  const items = [
    { icon: "FiDownloadCloud", title: "Fetch a robot's software", body: "Type an order number, get that exact robot's software from the company server — or refresh it in place." },
    { icon: "FiInbox", title: "Auto-collect service tickets", body: "Watches the RB and ES boards and builds a ready-to-investigate folder per ticket: software, logs, attachments, unpacked." },
    { icon: "FiRefreshCw", title: "Modernise an old robot for Windows 11", body: "Automates a long, error-prone manual update procedure. Drag the folder on, pick “full update”. Half a day becomes minutes." },
    { icon: "FiGrid", title: "Read the robot's program as a spreadsheet", body: "Turns the robot's huge internal tables into clean spreadsheets, so you can see exactly what it does, in order." },
    { icon: "FiPackage", title: "Prepare a customer's software zip", body: "Takes a zip that came in from a customer or a ticket and prepares it exactly like a fresh checkout — ready to compare." },
    { icon: "FiMonitor", title: "Set up a new PC in one click", body: "A single bootstrapper installs and configures everything, so onboarding another person is not a day of manual setup." },
  ];

  const cw = 3.87, ch = 1.98, gx = 0.24, gy = 0.22;
  for (let i = 0; i < items.length; i++) {
    await iconCard(s, {
      ...items[i],
      titleH: 0.58, // every heading in this set wraps to two lines
      x: 0.7 + (i % 3) * (cw + gx),
      y: 2.34 + Math.floor(i / 3) * (ch + gy),
      w: cw, h: ch,
    });
  }
  footer(s);
  s.addNotes(
    "Worth stressing to a budget audience: a meaningful part of the workspace costs nothing per person and " +
    "carries no AI risk. If the AI side were removed tomorrow, this half still works."
  );
}

/* =========================================================== 6 · evidence */
function slideEvidence() {
  const s = darkSlide();
  heading(s, "Where we are today", "What it has already produced", { dark: true, ts: 32 });

  const stats = [
    { fig: "47", label: "solved cases written up", sub: "April → August 2026, about 12 a month" },
    { fig: "1,276", label: "past orders indexed", sub: "searchable for “have we built this before?”" },
    { fig: "12", label: "reusable feature dossiers", sub: "across 6 robot software templates" },
    { fig: "1", label: "user, on two PCs", sub: "Software Engineering, since April 2026" },
  ];
  const cw = 2.93, gx = 0.23;
  stats.forEach((st, i) => {
    const x = 0.7 + i * (cw + gx);
    s.addShape(pres.ShapeType.roundRect, {
      x, y: 2.36, w: cw, h: 2.5, rectRadius: 0.1,
      fill: { color: TINT_D }, line: { width: 0, color: TINT_D },
    });
    s.addText(st.fig, {
      x: x + 0.3, y: 2.6, w: cw - 0.6, h: 0.95, margin: 0,
      fontFace: FONT, fontSize: 46, bold: true, color: SUN, valign: "middle",
    });
    s.addText(st.label, {
      x: x + 0.3, y: 3.58, w: cw - 0.6, h: 0.4, margin: 0,
      fontFace: FONT, fontSize: 13.5, bold: true, color: W, valign: "top",
    });
    s.addText(st.sub, {
      x: x + 0.3, y: 4.0, w: cw - 0.6, h: 0.6, margin: 0,
      fontFace: FONT, fontSize: 10.5, color: AEG, lineSpacing: 14, valign: "top",
    });
  });

  s.addText("A deliberate note on these numbers", {
    x: 0.7, y: 5.36, w: 11.9, h: 0.3, margin: 0,
    fontFace: FONT, fontSize: 12.5, bold: true, color: W,
  });
  s.addText(
    "The figure that matters is the 47 write-ups — real cases with real outcomes. We have kept infrastructure counts out of this deck on purpose: a capability that has never demonstrably changed the outcome of a case does not belong in a business case.",
    { x: 0.7, y: 5.68, w: 11.3, h: 0.85, margin: 0, fontFace: FONT, fontSize: 12, color: ICE, lineSpacing: 18, valign: "top" }
  );
  footer(s, true);
  s.addNotes(
    "47 = the write-ups in md documents/. If asked how many are AI-solved versus AI-assisted: they are all cases " +
    "worked with the assistant; the write-up records what it actually contributed. Error-code extraction was cut " +
    "from the pitch in July for failing exactly this test."
  );
}

/* ========================================================= 7 · who it's for */
async function slideDepartments() {
  const s = lightSlide();
  heading(s, "Who it is for", "Four departments, three different answers", { ts: 32 });
  s.addText(
    "Fit is not the same as readiness. Two departments could start now; one already runs on it; one needs real work first.",
    { x: 0.7, y: 1.56, w: 10.9, h: 0.4, margin: 0, fontFace: FONT, fontSize: 13, color: GREY, valign: "top" }
  );

  const rows = [
    { icon: "FiHeadphones", dept: "Helpdesk", chip: "READY TO PILOT", chipBg: NAVY, chipFg: W, body: "Highest volume of repeatable questions, and the clearest before-and-after measure. Goes first, on its own." },
    { icon: "FiTool", dept: "Lab", chip: "READY TO PILOT", chipBg: NAVY, chipFg: W, body: "Nearly as ready, and already sending questions unprompted. Follows Helpdesk so each pilot gets full attention." },
    { icon: "FiCpu", dept: "Software Engineering", chip: "IN USE TODAY", chipBg: AEG, chipFg: W, body: "The current home: feature precedent, porting work between orders, and order approvals." },
    { icon: "FiTrendingUp", dept: "Sales", chip: "NOT YET", chipBg: "D6DEEC", chipFg: NAVY, body: "“Have we built this before?” during quoting. The index speaks engineer vocabulary, not sales vocabulary — deferred to a later phase." },
  ];

  const rh = 1.0, gy = 0.14;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i], y = 2.14 + i * (rh + gy);
    s.addShape(pres.ShapeType.roundRect, {
      x: 0.7, y, w: 11.93, h: rh, rectRadius: 0.09,
      fill: { color: TINT }, line: { color: "DCE4F0", width: 1 }, shadow: shadow(),
    });
    s.addShape(pres.ShapeType.ellipse, {
      x: 1.02, y: y + 0.24, w: 0.52, h: 0.52, fill: { color: NAVY }, line: { width: 0, color: NAVY },
    });
    s.addImage({ data: await icon(r.icon, W), x: 1.155, y: y + 0.375, w: 0.25, h: 0.25 });
    s.addText(r.dept, {
      x: 1.86, y: y + 0.2, w: 2.7, h: 0.32, margin: 0,
      fontFace: FONT, fontSize: 15, bold: true, color: NAVY, valign: "top",
    });
    s.addShape(pres.ShapeType.roundRect, {
      x: 1.86, y: y + 0.55, w: 1.52, h: 0.26, rectRadius: 0.1,
      fill: { color: r.chipBg }, line: { width: 0, color: r.chipBg },
    });
    s.addText(r.chip, {
      x: 1.86, y: y + 0.55, w: 1.52, h: 0.26, margin: 0,
      fontFace: FONT, fontSize: 8, bold: true, charSpacing: 0.8, align: "center", valign: "middle", color: r.chipFg,
    });
    s.addText(r.body, {
      x: 4.66, y: y + 0.22, w: 7.65, h: 0.62, margin: 0,
      fontFace: FONT, fontSize: 12, color: GREY, lineSpacing: 17, valign: "top",
    });
  }
  footer(s);
  s.addNotes(
    "Decision taken 25 July: Helpdesk first, alone. Running two pilots at once halves the attention each gets, " +
    "and Helpdesk gives the cleaner number."
  );
}

/* ============================================================ 8 · rollout */
function slideRollout() {
  const s = lightSlide();
  heading(s, "How we would roll it out", "Four steps, each with a way to stop", { ts: 32 });
  s.addText(
    "Every phase has an exit test. If a phase fails its test, we stop there rather than scaling something unproven.",
    { x: 0.7, y: 1.56, w: 10.9, h: 0.4, margin: 0, fontFace: FONT, fontSize: 13, color: GREY, valign: "top" }
  );

  const phases = [
    { n: "A", eyebrow: "NOW", title: "Validate", body: "Short conversations with Helpdesk and Lab, then a live demonstration on real past tickets and on the questions Lab is already sending.", exit: "Exit: a department names a pilot person and frees their time." },
    { n: "B", eyebrow: "NEXT", title: "Pilot", body: "One department, one or two people, six weeks. Baseline measured before day one, and every wrong answer logged — not only the wins.", exit: "Exit: a measured improvement, and the pilot users want to keep it." },
    { n: "C", eyebrow: "THEN", title: "Decide", body: "Business case from real pilot numbers, with clear answers on who maintains it, how customer data is handled, and what it will never be.", exit: "Exit: a decision on time and licences." },
    { n: "D", eyebrow: "AFTER", title: "Roll out", body: "Helpdesk broadly, Lab pilot begins. Sales is explored only once everything before it has held up.", exit: "" },
  ];

  const cw = 2.93, gx = 0.23;
  phases.forEach((p, i) => {
    const x = 0.7 + i * (cw + gx);
    s.addShape(pres.ShapeType.roundRect, {
      x, y: 2.24, w: cw, h: 3.55, rectRadius: 0.1,
      fill: { color: i === 0 ? NAVY : TINT }, line: { color: i === 0 ? NAVY : "DCE4F0", width: 1 },
      shadow: i === 0 ? undefined : shadow(),
    });
    s.addShape(pres.ShapeType.ellipse, {
      x: x + 0.32, y: 2.5, w: 0.58, h: 0.58,
      fill: { color: i === 0 ? SUN : NAVY }, line: { width: 0, color: W },
    });
    s.addText(p.n, {
      x: x + 0.32, y: 2.5, w: 0.58, h: 0.58, margin: 0,
      fontFace: FONT, fontSize: 17, bold: true, align: "center", valign: "middle", color: i === 0 ? NAVY : W,
    });
    s.addText(p.eyebrow, {
      x: x + 0.32, y: 3.22, w: cw - 0.64, h: 0.24, margin: 0,
      fontFace: FONT, fontSize: 9.5, bold: true, charSpacing: 1.2, color: i === 0 ? SUN : AEG_D,
    });
    s.addText(p.title, {
      x: x + 0.32, y: 3.46, w: cw - 0.64, h: 0.38, margin: 0,
      fontFace: FONT, fontSize: 17, bold: true, color: i === 0 ? W : NAVY, valign: "top",
    });
    s.addText(p.body, {
      x: x + 0.32, y: 3.9, w: cw - 0.64, h: 1.25, margin: 0,
      fontFace: FONT, fontSize: 11.5, color: i === 0 ? ICE : GREY, lineSpacing: 16, valign: "top",
    });
    if (p.exit) {
      s.addText(p.exit, {
        x: x + 0.32, y: 5.14, w: cw - 0.64, h: 0.55, margin: 0,
        fontFace: FONT, fontSize: 10.5, bold: true, color: i === 0 ? W : AEG_D, lineSpacing: 14, valign: "top",
      });
    }
  });

  s.addText(
    "Enthusiasm without committed time counts as a no. We would rather find that out in phase A than after buying licences.",
    { x: 0.7, y: 6.06, w: 11.9, h: 0.35, margin: 0, fontFace: FONT, fontSize: 13, bold: true, italic: true, color: NAVY }
  );
  footer(s);
  s.addNotes(
    "Phase A is running now. The strongest evidence is the questions Lab sends unprompted — genuinely what they " +
    "want to know, and nobody has answered them yet."
  );
}

/* =============================================================== 9 · cost */
function slideCost() {
  const s = lightSlide();
  heading(s, "What it would cost", "Measured, not estimated", { ts: 32 });
  s.addText(
    "Eleven real conversations were logged and priced turn by turn, rather than guessed at.",
    { x: 0.7, y: 1.56, w: 10.9, h: 0.4, margin: 0, fontFace: FONT, fontSize: 13, color: GREY, valign: "top" }
  );

  const stats = [
    { fig: "€3.91", label: "per conversation", sub: "average across 11 logged conversations: €5.98 for a service ticket, €3.45 for a lab question" },
    { fig: "~7", label: "conversations per seat, per day", sub: "what one subscription comfortably supports in a working day" },
    { fig: "1–2", label: "seats for the pilot", sub: "a subscription belongs to one named person and cannot be shared" },
  ];
  const cw = 3.87, gx = 0.24;
  stats.forEach((st, i) => {
    const x = 0.7 + i * (cw + gx);
    s.addShape(pres.ShapeType.roundRect, {
      x, y: 2.2, w: cw, h: 2.3, rectRadius: 0.1,
      fill: { color: TINT }, line: { color: "DCE4F0", width: 1 }, shadow: shadow(),
    });
    s.addText(st.fig, {
      x: x + 0.34, y: 2.4, w: cw - 0.68, h: 0.85, margin: 0,
      fontFace: FONT, fontSize: 40, bold: true, color: NAVY, valign: "middle",
    });
    s.addText(st.label, {
      x: x + 0.34, y: 3.3, w: cw - 0.68, h: 0.32, margin: 0,
      fontFace: FONT, fontSize: 13.5, bold: true, color: NAVY, valign: "top",
    });
    s.addText(st.sub, {
      x: x + 0.34, y: 3.66, w: cw - 0.68, h: 0.7, margin: 0,
      fontFace: FONT, fontSize: 10.5, color: GREY, lineSpacing: 14, valign: "top",
    });
  });

  s.addShape(pres.ShapeType.roundRect, {
    x: 0.7, y: 4.76, w: 11.93, h: 1.5, rectRadius: 0.1,
    fill: { color: NAVY }, line: { width: 0, color: NAVY },
  });
  s.addText("Read these as a ceiling, not a price tag", {
    x: 1.06, y: 4.98, w: 11.2, h: 0.32, margin: 0,
    fontFace: FONT, fontSize: 14, bold: true, color: SUN,
  });
  s.addText(
    "They were measured before we understood where the cost actually goes. Since then we have found that more than half of a conversation is paid before any work starts, and that straightforward habits put the same work at roughly a third less. We will not quote a lower number until it has been measured — but the figures above will not go up.",
    { x: 1.06, y: 5.34, w: 11.2, h: 0.8, margin: 0, fontFace: FONT, fontSize: 12, color: ICE, lineSpacing: 17, valign: "top" }
  );
  footer(s);
  s.addNotes(
    "If pressed on the seat count: the driver is licensing, not money. A subscription is scoped to one person and " +
    "cannot be shared, and two people on one seat contend for the same window. A shared service — the chat front " +
    "door — is structurally a metered cost instead. Figures come from lab-chat-poc; re-run the cost report before " +
    "quoting them anywhere binding."
  );
}

/* ========================================================= 10 · the limits */
async function slideLimits() {
  const s = lightSlide();
  heading(s, "Being straight about it", "What we are watching for", { ts: 32 });
  s.addText(
    "Overselling this is the fastest way to kill it. The first confidently wrong answer costs more trust than ten good ones earn.",
    { x: 0.7, y: 1.56, w: 10.9, h: 0.4, margin: 0, fontFace: FONT, fontSize: 13, color: GREY, valign: "top" }
  );

  const items = [
    { icon: "FiAlertTriangle", title: "It gives a first opinion, not an answer", body: "Everything it produces is checked by a person before it reaches a customer. It prepares the ground; it does not close tickets." },
    { icon: "FiLayers", title: "Its knowledge is uneven", body: "Deep on some robot templates, thin on others. We say which, up front, and put the depth where the pilot department actually works." },
    { icon: "FiShield", title: "Customer data leaves the building", body: "Logs and software go to a cloud service. IT and security are being engaged now, in phase A — and it can be run inside our own cloud tenancy if required." },
    { icon: "FiUser", title: "One person maintains it", body: "A single maintainer with twenty dependents is the standard failure mode for internal tools. Cover for absence has to be agreed before anyone relies on it." },
  ];

  const cw = 5.83, ch = 1.72, gx = 0.24, gy = 0.22;
  for (let i = 0; i < items.length; i++) {
    await iconCard(s, {
      ...items[i],
      x: 0.7 + (i % 2) * (cw + gx),
      y: 2.24 + Math.floor(i / 2) * (ch + gy),
      w: cw, h: ch,
    });
  }
  s.addText(
    "Both departmental usage plans lead with these limits and invite correction — objections raised in the room are cheaper than silence afterwards.",
    { x: 0.7, y: 6.16, w: 11.9, h: 0.35, margin: 0, fontFace: FONT, fontSize: 12.5, italic: true, color: GREY }
  );
  footer(s);
  s.addNotes(
    "Say this slide out loud rather than skipping it. A sceptical audience trusts a pitch that names its own " +
    "weaknesses, and the security question is far cheaper to raise now than at the budget stage."
  );
}

/* ============================================================= 11 · the ask */
function slideAsk() {
  const s = darkSlide();
  heading(s, "What we are asking for", "Three things — none of them new software", { dark: true, ts: 32 });
  s.addText(
    "The capabilities already exist and are in daily use. Turning them into something Helpdesk and Lab can rely on needs support, not development.",
    { x: 0.7, y: 1.62, w: 10.9, h: 0.5, margin: 0, fontFace: FONT, fontSize: 13.5, color: ICE, lineSpacing: 19, valign: "top" }
  );

  const asks = [
    { n: 1, eyebrow: "THE REAL ASK", title: "Allocated time", body: "Official hours to maintain, extend and support it as a real internal tool. Licences without a maintainer produce shelfware — this is the one that matters." },
    { n: 2, eyebrow: "THE EASY NUMBER", title: "One or two seats", body: "Access for the people who will actually use it during the Helpdesk pilot. Small, and it stops at the end of the pilot if the evidence does not hold." },
    { n: 3, eyebrow: "LATER, NOT NOW", title: "One shared machine", body: "Eventually an always-on PC so the lab service runs centrally and nobody needs the full setup on their own computer." },
  ];
  const cw = 3.87, gx = 0.24;
  asks.forEach((a, i) =>
    numberCard(s, { ...a, x: 0.7 + i * (cw + gx), y: 2.42, w: cw, h: 2.95, dark: true, accent: SUN })
  );

  s.addText(
    "In exchange we bring back a measured number: Software Engineer hours returned to the product chain.",
    { x: 0.7, y: 5.66, w: 11.9, h: 0.4, margin: 0, fontFace: FONT, fontSize: 15, bold: true, color: SUN, valign: "top" }
  );
  s.addText(
    "Next step: a live demonstration on real past tickets, and on the questions the lab is already sending us.",
    { x: 0.7, y: 6.08, w: 11.9, h: 0.4, margin: 0, fontFace: FONT, fontSize: 12.5, color: ICE, valign: "top" }
  );
  footer(s, true);
  s.addNotes(
    "Close on the demonstration, not on the budget. Asking a room to approve a plan produces polite agreement; " +
    "showing it replay a ticket they remember produces either “when can I have it” or a specific, useful objection."
  );
}

/* ------------------------------------------------------------------ build */
(async () => {
  slideTitle();
  slideWhy();
  slideHowItKnows();
  await slideAiCapabilities();
  await slideScripts();
  slideEvidence();
  await slideDepartments();
  slideRollout();
  slideCost();
  await slideLimits();
  slideAsk();
  await pres.writeFile({ fileName: path.join(__dirname, OUT) });
  console.log("Wrote " + path.join(__dirname, OUT));
})();
