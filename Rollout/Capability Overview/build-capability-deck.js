/**
 * Robotics-AI — non-technical capability & rollout deck.
 *
 * Content source: ../PROJECT.md (organisational layer), robotics-ai-overview.html
 * (vetted non-technical copy) and ../AI-Plan-Pricing-Explained.md (the cost slide).
 * Figures are re-derived from the workspace, not copied — see DECK_OPEN_QUESTIONS.md
 * for what is still unanswered and must not be presented as settled.
 *
 *   node build-capability-deck.js "Robotics-AI Capability Overview.pptx"
 *
 * Needs pptxgenjs / react-icons / react-dom / sharp in ../node_modules (npm install
 * in Rollout/). Reads skalar-velaris-logo.png from its own directory.
 */

const path = require("path");
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
    "What it does today, what it has already produced, and the two decisions we need in order to put it in front of the Lab.",
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
    "Frame the session in one sentence: this is a tool that already exists and is already producing work; " +
    "I need two decisions, not a budget debate. No technical knowledge assumed anywhere in this deck."
  );
}

/* ====================================================== 2 · why it exists */
function slideWhy() {
  const s = lightSlide();
  heading(s, "Why this exists", "The bottleneck is not the robots.\nIt is the answers about them.", { th: 1.3, ts: 30 });

  s.addText(
    [
      { text: "Every robot ships with its own software. When something goes wrong — in the field, in the lab, during a build — the knowledge of how that software works sits with very few people.", options: { breakLine: true, paraSpaceAfter: 12 } },
      { text: "So Helpdesk and Lab wait, and Software Engineering spends its time re-deriving answers the evidence already contains: past cases, the setup guides, the robot's own logs and program.", options: { breakLine: true, paraSpaceAfter: 12 } },
      { text: "Robotics-AI has been taught that evidence.", options: { bold: true, color: NAVY } },
    ],
    { x: 0.7, y: 2.6, w: 6.35, h: 3.0, margin: 0, fontFace: FONT, fontSize: 14.5, color: GREY, lineSpacing: 23, valign: "top" }
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
    "Every question Lab and Helpdesk can answer themselves is Software Engineering capacity returned.",
    { x: 7.95, y: 3.35, w: 4.25, h: 1.7, margin: 0, fontFace: FONT, fontSize: 19, bold: true, color: W, lineSpacing: 27, valign: "top" }
  );
  s.addText("The case is not that AI is useful. It is that engineer time is the constraint.", {
    x: 7.95, y: 5.05, w: 4.25, h: 0.6, margin: 0, fontFace: FONT, fontSize: 11.5, color: AEG, lineSpacing: 16, valign: "top",
  });
  footer(s);
  s.addNotes(
    "Lead with the constraint, not the technology. In real use by Software Engineering since April 2026."
  );
}

/* =================================================== 3 · what the AI does */
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
    "It is a well-prepared first opinion, not an authority — that limit is stated later in the deck."
  );
}

/* =========================================================== 4 · evidence */
function slideEvidence() {
  const s = darkSlide();
  heading(s, "Where we are today", "What it has already produced", { dark: true, ts: 32 });

  const stats = [
    { fig: "51", label: "cases written up", sub: "April → August 2026. July alone was 24." },
    { fig: "12", label: "features built or ported", sub: "reusable across 6 robot software templates" },
    { fig: "4", label: "lab questions answered", sub: "asked unprompted by Lab — all four since confirmed correct" },
    { fig: "130 h+", label: "of engineer work those cases represent", sub: "the old way, before counting template bugs and approvals" },
  ];
  const cw = 2.93, gx = 0.23;
  stats.forEach((st, i) => {
    const x = 0.7 + i * (cw + gx);
    s.addShape(pres.ShapeType.roundRect, {
      x, y: 2.16, w: cw, h: 2.6, rectRadius: 0.1,
      fill: { color: TINT_D }, line: { width: 0, color: TINT_D },
    });
    s.addText(st.fig, {
      x: x + 0.3, y: 2.36, w: cw - 0.6, h: 0.9, margin: 0,
      fontFace: FONT, fontSize: 44, bold: true, color: SUN, valign: "middle",
    });
    s.addText(st.label, {
      x: x + 0.3, y: 3.3, w: cw - 0.6, h: 0.66, margin: 0,
      fontFace: FONT, fontSize: 13.5, bold: true, color: W, lineSpacing: 17, valign: "top",
    });
    s.addText(st.sub, {
      x: x + 0.3, y: 3.98, w: cw - 0.6, h: 0.66, margin: 0,
      fontFace: FONT, fontSize: 10.5, color: AEG, lineSpacing: 14, valign: "top",
    });
  });

  s.addText("What the 51 are", {
    x: 0.7, y: 5.02, w: 11.9, h: 0.3, margin: 0,
    fontFace: FONT, fontSize: 12.5, bold: true, color: W,
  });
  s.addText(
    "13 service tickets · 14 lab cases · 12 features and ports · 7 order approvals · 5 template bugs. Each is a real case with a written-up cause and outcome — not a count of things built. How much of that 130 hours the assistant actually returns is exactly what the pilot is there to measure.",
    { x: 0.7, y: 5.34, w: 11.4, h: 0.9, margin: 0, fontFace: FONT, fontSize: 12, color: ICE, lineSpacing: 18, valign: "top" }
  );
  footer(s, true);
  s.addNotes(
    "51 counted from the write-ups in md documents (2026-08-19). The 130 hours is derived from Joost's own " +
    "before-times: 13 tickets at 2-4 h, 14 lab cases at 0.5-3 h, 12 features at 8 h of writing (testing is " +
    "unchanged and excluded). Deliberately phrased as work represented, NOT as hours saved — the saved figure " +
    "is not measured yet and must not be claimed. If asked: that is the pilot's job."
  );
}

/* ========================================================= 5 · who it's for */
async function slideDepartments() {
  const s = lightSlide();
  heading(s, "Who it is for", "One department at a time", { ts: 32 });
  s.addText(
    "Fit is not the same as readiness. We are proposing to start in one place, prove it, and only then widen.",
    { x: 0.7, y: 1.56, w: 10.9, h: 0.4, margin: 0, fontFace: FONT, fontSize: 13, color: GREY, valign: "top" }
  );

  const rows = [
    { icon: "FiCpu", dept: "Software Engineering", chip: "IN USE TODAY", chipBg: AEG, chipFg: W, body: "The current home, since April 2026: diagnosing cases, porting features between orders, and order approvals." },
    { icon: "FiTool", dept: "Lab", chip: "PILOT STARTS HERE", chipBg: NAVY, chipFg: W, body: "Already sending us questions unprompted, which is the strongest signal of real demand we have. This is the green light we are asking for." },
    { icon: "FiHeadphones", dept: "Helpdesk", chip: "READY, GOES NEXT", chipBg: NAVY, chipFg: W, body: "Highest volume of repeatable questions and the clearest before-and-after measure. Waits its turn so the Lab pilot gets full attention." },
    { icon: "FiUsers", dept: "Others — later", chip: "PLAUSIBLE", chipBg: "D6DEEC", chipFg: NAVY, body: "Sales during quoting, Production, and template and core development have all been raised. Each needs real work first, and none of it is in scope now." },
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
      x: 1.86, y: y + 0.2, w: 2.9, h: 0.32, margin: 0,
      fontFace: FONT, fontSize: 15, bold: true, color: NAVY, valign: "top",
    });
    s.addShape(pres.ShapeType.roundRect, {
      x: 1.86, y: y + 0.55, w: 1.72, h: 0.26, rectRadius: 0.1,
      fill: { color: r.chipBg }, line: { width: 0, color: r.chipBg },
    });
    s.addText(r.chip, {
      x: 1.86, y: y + 0.55, w: 1.72, h: 0.26, margin: 0,
      fontFace: FONT, fontSize: 8, bold: true, charSpacing: 0.8, align: "center", valign: "middle", color: r.chipFg,
    });
    s.addText(r.body, {
      x: 4.86, y: y + 0.22, w: 7.45, h: 0.62, margin: 0,
      fontFace: FONT, fontSize: 12, color: GREY, lineSpacing: 17, valign: "top",
    });
  }
  footer(s);
  s.addNotes(
    "The order changed deliberately: Lab goes first, not Helpdesk. Lab is already asking us questions without " +
    "being prompted, which beats any argument we could make. Running two pilots at once halves the attention each gets."
  );
}

/* =================================================== 6 · how it knows */
function slideHowItKnows() {
  const s = lightSlide();
  heading(s, "Nothing is hidden", "The intelligence is off-the-shelf.\nThe expertise is ours.", { th: 1.3, ts: 30 });

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
    "This slide sits here on purpose — it is the first half of the trust conversation. Everything the assistant " +
    "knows is readable, editable text we own and can audit. Nothing is locked in a vendor's model."
  );
}

/* ========================================================= 7 · the limits */
async function slideLimits() {
  const s = lightSlide();
  heading(s, "Being straight about it", "What we are watching for", { ts: 32 });
  s.addText(
    "Overselling this is the fastest way to kill it. The first confidently wrong answer costs more trust than ten good ones earn.",
    { x: 0.7, y: 1.56, w: 10.9, h: 0.4, margin: 0, fontFace: FONT, fontSize: 13, color: GREY, valign: "top" }
  );

  const items = [
    { icon: "FiAlertTriangle", title: "It gives a first opinion, not an answer", body: "Everything it produces is checked by a person before it reaches a customer. It prepares the ground; it does not close tickets." },
    { icon: "FiLayers", title: "Its knowledge is uneven", body: "Deep on some robot templates, thin on others. We say which, up front, and put the depth where the pilot actually works." },
    { icon: "FiShield", title: "Where our data goes needs a decision", body: "Customer logs and software are sent to an AI service. Note we already do this: running Claude inside GitHub Copilot today sends the same material to the same provider, under a no-retention, no-training agreement. This presentation is what starts that conversation with IT and security." },
    { icon: "FiUser", title: "One person maintains it", body: "A single maintainer with many dependents is the standard failure mode for internal tools. Cover for absence has to be agreed before anyone relies on it." },
  ];

  const cw = 5.83, ch = 1.86, gx = 0.24, gy = 0.22;
  for (let i = 0; i < items.length; i++) {
    await iconCard(s, {
      ...items[i],
      x: 0.7 + (i % 2) * (cw + gx),
      y: 2.16 + Math.floor(i / 2) * (ch + gy),
      w: cw, h: ch,
    });
  }
  s.addText(
    "We would rather you raise the objection here than discover it after a pilot has started.",
    { x: 0.7, y: 6.28, w: 11.9, h: 0.35, margin: 0, fontFace: FONT, fontSize: 12.5, italic: true, color: GREY }
  );
  footer(s);
  s.addNotes(
    "Say this slide out loud rather than skipping it. On the data point, the verified fact is that GitHub hosts " +
    "Anthropic's models on AWS, Anthropic's own infrastructure and Google Cloud, under a zero-data-retention " +
    "agreement with no training on business data. So approving Claude directly is not a new question about who " +
    "sees our data — it is a question of which contract governs it. If security prefers, the same tooling runs " +
    "inside our own cloud tenancy; that is a configuration change, not a redesign."
  );
}

/* =============================================================== 8 · cost */
function slideCost() {
  const s = lightSlide();
  heading(s, "What it costs", "Two ways to pay, and they are not close", { ts: 32 });
  s.addText(
    "Measured from 14 real conversations, priced turn by turn: an average conversation consumes about €4.44 of AI usage.",
    { x: 0.7, y: 1.56, w: 11.0, h: 0.4, margin: 0, fontFace: FONT, fontSize: 13, color: GREY, valign: "top" }
  );

  const cards = [
    {
      x: 0.7, tone: "grey", eyebrow: "METERED — WHAT WE USE TODAY", title: "GitHub Copilot credits",
      fig: "≈ 4", figsub: "conversations per month",
      body: "€19 a month buys a pot of credits that drains by the word. Our work drains it fast, and the pot is shared across the company — which is why it runs out.",
    },
    {
      x: 6.93, tone: "navy", eyebrow: "FLAT RATE — WHAT WE ARE ASKING FOR", title: "A Claude subscription",
      fig: "≈ 50", figsub: "conversations per week",
      body: "€20 a month, not metered. You are limited by how much you use it in a day, not by how much text it reads. Same price, roughly fifty times the work.",
    },
  ];
  cards.forEach((c) => {
    const dark = c.tone === "navy";
    s.addShape(pres.ShapeType.roundRect, {
      x: c.x, y: 2.16, w: 5.7, h: 2.72, rectRadius: 0.11,
      fill: { color: dark ? NAVY : TINT }, line: { color: dark ? NAVY : "DCE4F0", width: 1 },
      shadow: dark ? undefined : shadow(),
    });
    s.addText(c.eyebrow, {
      x: c.x + 0.36, y: 2.38, w: 5.0, h: 0.24, margin: 0,
      fontFace: FONT, fontSize: 9.5, bold: true, charSpacing: 1.1, color: dark ? SUN : AEG_D,
    });
    s.addText(c.title, {
      x: c.x + 0.36, y: 2.64, w: 5.0, h: 0.38, margin: 0,
      fontFace: FONT, fontSize: 17, bold: true, color: dark ? W : NAVY, valign: "top",
    });
    s.addText(c.fig, {
      x: c.x + 0.36, y: 3.08, w: 1.9, h: 0.78, margin: 0,
      fontFace: FONT, fontSize: 40, bold: true, color: dark ? SUN : NAVY, valign: "middle",
    });
    s.addText(c.figsub, {
      x: c.x + 2.3, y: 3.2, w: 3.1, h: 0.56, margin: 0,
      fontFace: FONT, fontSize: 12.5, bold: true, color: dark ? W : NAVY, lineSpacing: 16, valign: "middle",
    });
    s.addText(c.body, {
      x: c.x + 0.36, y: 3.94, w: 5.0, h: 0.8, margin: 0,
      fontFace: FONT, fontSize: 11.5, color: dark ? ICE : GREY, lineSpacing: 16, valign: "top",
    });
  });

  s.addShape(pres.ShapeType.roundRect, {
    x: 0.7, y: 5.06, w: 11.93, h: 1.42, rectRadius: 0.1,
    fill: { color: TINT }, line: { color: "DCE4F0", width: 1 }, shadow: shadow(),
  });
  s.addText("Why the gap is that large", {
    x: 1.06, y: 5.26, w: 11.2, h: 0.3, margin: 0,
    fontFace: FONT, fontSize: 13, bold: true, color: NAVY,
  });
  s.addText(
    "95% of what we consume is the assistant re-reading material it has already been given. Credits charge full price for every word of that re-reading; a subscription does not charge for it at all. One €20 subscription delivers roughly €1,000 a month of metered usage — about five times the company's entire shared credit pool, from one seat.",
    { x: 1.06, y: 5.58, w: 11.2, h: 0.78, margin: 0, fontFace: FONT, fontSize: 12, color: GREY, lineSpacing: 17, valign: "top" }
  );
  footer(s);
  s.addNotes(
    "All figures recomputed 2026-08-19 from lab-chat-poc token counts, not from the logged cost column (which " +
    "records a running total on the three newest chats and would double-count). €4.44 per conversation replaces " +
    "the older €3.91. Copilot moved to AI Credits on 1 June 2026: 1 credit = $0.01, billed on tokens at the same " +
    "published rates as the API — so Copilot is NOT marked up per token. Do not claim it is; the argument is that " +
    "metering is the wrong instrument for this workload, not that GitHub overcharges. The ~50/week is a fitted " +
    "ceiling from a deliberately conservative lower-envelope fit; sustaining it means constant throttling, so " +
    "present it as capacity. Full reasoning: Rollout/AI-Plan-Pricing-Explained.md."
  );
}

/* ====================================================== 9 · what we start with */
function slideStart() {
  const s = lightSlide();
  heading(s, "If we get a yes", "What we would start with", { ts: 32 });
  s.addText(
    "Nothing here needs to be built. This is a pilot with a fixed length, a named department and a way to stop.",
    { x: 0.7, y: 1.56, w: 10.9, h: 0.4, margin: 0, fontFace: FONT, fontSize: 13, color: GREY, valign: "top" }
  );

  const cards = [
    { n: 1, eyebrow: "ALREADY IN PLACE", title: "Three seats", body: "Three people are already lined up to use it. No recruitment, no rollout plan, no training programme needed to begin." },
    { n: 2, eyebrow: "SIX WEEKS", title: "The Lab pilot", body: "Lab runs it on real work in build, FAT and installation. Every case is logged — including the ones where the answer was wrong." },
    { n: 3, eyebrow: "WHAT WE BRING BACK", title: "A measured number", body: "Time from problem to informed answer, and how often it saved a trip to a Software Engineer. We ask the person who asked the question." },
    { n: 4, eyebrow: "HOW IT STOPS", title: "An honest exit", body: "If the Lab does not want to keep it at the end of six weeks, we say so and it stops there. No expansion without evidence." },
  ];
  const cw = 2.93, gx = 0.23;
  cards.forEach((c, i) =>
    numberCard(s, { ...c, x: 0.7 + i * (cw + gx), y: 2.16, w: cw, h: 3.2, accent: i === 0 ? undefined : undefined })
  );

  s.addText(
    "Enthusiasm without committed time counts as a no — we would rather find that out now than after buying anything.",
    { x: 0.7, y: 5.62, w: 11.9, h: 0.35, margin: 0, fontFace: FONT, fontSize: 13, bold: true, italic: true, color: NAVY }
  );
  footer(s);
  s.addNotes(
    "Keep this concrete. The point of the slide is that saying yes is cheap and reversible: three people already " +
    "want it, six weeks, and a defined way to end it. Confirm before presenting whether the three seats are " +
    "Copilot seats being repurposed or three new Claude seats — the wording works either way but you will be asked."
  );
}

/* ============================================================= 10 · the ask */
function slideAsk() {
  const s = darkSlide();
  heading(s, "What we need from you", "Two decisions", { dark: true, ts: 32 });
  s.addText(
    "Not a budget line and not a project. Two answers, and the Lab pilot can start.",
    { x: 0.7, y: 1.62, w: 10.9, h: 0.4, margin: 0, fontFace: FONT, fontSize: 13.5, color: ICE, valign: "top" }
  );

  const asks = [
    { n: 1, eyebrow: "DECISION ONE", title: "How we are licensed", body: "Approve a Claude subscription for the people doing this work, or top up the shared Copilot credits instead. At the same price per person the subscription does roughly fifty times the work — but it needs approving as a tool, which is the real question." },
    { n: 2, eyebrow: "DECISION TWO", title: "Green light for the Lab", body: "Permission for Lab to run the six-week pilot on real work, with their time committed. They are already asking us the questions; this just lets them ask the tool." },
  ];
  const cw = 5.83, gx = 0.27;
  asks.forEach((a, i) =>
    numberCard(s, { ...a, x: 0.7 + i * (cw + gx), y: 2.4, w: cw, h: 2.9, dark: true, accent: SUN })
  );

  s.addText("And one thing for later, not now: a shared always-on machine, so the service runs centrally.", {
    x: 0.7, y: 5.52, w: 11.9, h: 0.35, margin: 0, fontFace: FONT, fontSize: 12.5, color: AEG, valign: "top",
  });
  s.addText(
    "In exchange we bring back a measured number: Software Engineer hours returned to the product chain.",
    { x: 0.7, y: 6.0, w: 11.9, h: 0.4, margin: 0, fontFace: FONT, fontSize: 15, bold: true, color: SUN, valign: "top" }
  );
  footer(s, true);
  s.addNotes(
    "Close on the two decisions and stop talking. If the room wants to debate the licensing question, offer the " +
    "one-page explainer (AI-Plan-Pricing-Explained.md) rather than arguing numbers live. If they want to defer " +
    "decision one, ask for decision two anyway — the pilot can start on the current setup, just more slowly."
  );
}

/* ------------------------------------------------------------------ build */
(async () => {
  slideTitle();
  slideWhy();
  await slideAiCapabilities();
  slideEvidence();
  await slideDepartments();
  slideHowItKnows();
  await slideLimits();
  slideCost();
  slideStart();
  slideAsk();
  await pres.writeFile({ fileName: path.join(__dirname, OUT) });
  console.log("Wrote " + path.join(__dirname, OUT));
})();
