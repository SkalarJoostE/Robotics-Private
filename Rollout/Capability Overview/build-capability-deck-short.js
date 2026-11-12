/**
 * Robotics-AI — SHORT (presenter) capability deck.
 *
 * The lean twin of build-capability-deck.js: same ten slides, same order, same
 * brand — but the slides carry short phrases only and every sentence of prose
 * lives in the speaker notes, because the explanation comes from the presenter.
 * Change content in BOTH builders or they drift apart.
 *
 * Content source: ../PROJECT.md (organisational layer), robotics-ai-overview.html
 * (vetted non-technical copy) and ../AI-Plan-Pricing-Explained.md (the cost slide).
 * Figures are re-derived from the workspace, not copied — see DECK_OPEN_QUESTIONS.md
 * for what is still unanswered and must not be presented as settled.
 *
 *   node build-capability-deck-short.js "Robotics-AI Capability Overview (Short).pptx"
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

const OUT = process.argv[2] || "Robotics-AI Capability Overview (Short).pptx";
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
pres.title = "Robotics-AI — Capability Overview (short)";

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
  /* No body text, no box. An empty text frame whose height goes negative
     (any card shorter than 2.06) writes cy="-..." into the XML. That is invalid
     OOXML: PowerPoint refuses to open the file, while LibreOffice silently
     tolerates it — so it will not show up in a local render. */
  if (o.body && o.body.length) {
    s.addText(o.body, {
      x: o.x + 0.36, y: o.y + 1.82, w: o.w - 0.72, h: Math.max(0.2, o.h - 2.06), margin: 0,
      fontFace: FONT, fontSize: 11.5, color: o.dark ? ICE : GREY, lineSpacing: 15, valign: "top",
    });
  }
}

/* ------------------------------------------------ live-deck-only helpers */

/** Icon + one short phrase, vertically centred. No body copy. */
async function iconChip(s, o) {
  s.addShape(pres.ShapeType.roundRect, {
    x: o.x, y: o.y, w: o.w, h: o.h, rectRadius: 0.09,
    fill: { color: TINT }, line: { color: "DCE4F0", width: 1 }, shadow: shadow(),
  });
  const d = 0.52, cy = o.y + (o.h - d) / 2;
  s.addShape(pres.ShapeType.ellipse, {
    x: o.x + 0.32, y: cy, w: d, h: d, fill: { color: NAVY }, line: { width: 0, color: NAVY },
  });
  s.addImage({ data: await icon(o.icon, W), x: o.x + 0.455, y: cy + 0.135, w: 0.25, h: 0.25 });
  s.addText(o.title, {
    x: o.x + 1.12, y: o.y, w: o.w - 1.44, h: o.h, margin: 0,
    fontFace: FONT, fontSize: 16, bold: true, color: NAVY, valign: "middle",
  });
}

/** One full-width row: icon · bold left phrase · arrow · answer phrase. */
async function splitRow(s, o) {
  s.addShape(pres.ShapeType.roundRect, {
    x: 0.7, y: o.y, w: 11.93, h: o.h, rectRadius: 0.09,
    fill: { color: TINT }, line: { color: "DCE4F0", width: 1 }, shadow: shadow(),
  });
  const d = 0.52, cy = o.y + (o.h - d) / 2;
  s.addShape(pres.ShapeType.ellipse, {
    x: 1.02, y: cy, w: d, h: d, fill: { color: NAVY }, line: { width: 0, color: NAVY },
  });
  s.addImage({ data: await icon(o.icon, W), x: 1.155, y: cy + 0.135, w: 0.25, h: 0.25 });
  s.addText(o.left, {
    x: 1.86, y: o.y, w: 4.3, h: o.h, margin: 0,
    fontFace: FONT, fontSize: 16, bold: true, color: NAVY, valign: "middle",
  });
  s.addText("\u2192", {
    x: 6.3, y: o.y, w: 0.5, h: o.h, margin: 0,
    fontFace: FONT, fontSize: 18, bold: true, color: SUN, align: "center", valign: "middle",
  });
  s.addText(o.right, {
    x: 6.95, y: o.y, w: 5.4, h: o.h, margin: 0,
    fontFace: FONT, fontSize: 15, color: GREY, valign: "middle",
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
    x: 0.75, y: 2.6, w: 10.5, h: 1.1, margin: 0,
    fontFace: FONT, fontSize: 60, bold: true, color: W, valign: "top",
  });
  s.addText("An AI-assisted workspace for our lab-robot software", {
    x: 0.75, y: 3.8, w: 10.5, h: 0.5, margin: 0,
    fontFace: FONT, fontSize: 22, color: ICE, valign: "top",
  });
  s.addText("What it does  ·  what it produced  ·  what we need", {
    x: 0.75, y: 4.65, w: 10.5, h: 0.4, margin: 0,
    fontFace: FONT, fontSize: 15, bold: true, color: SUN, valign: "top",
  });
  s.addText("Software Engineering  ·  August 2026", {
    x: 0.75, y: 6.5, w: 8.0, h: 0.3, margin: 0,
    fontFace: FONT, fontSize: 11.5, color: AEG,
  });
  s.addNotes(
    "SAY: this is a tool that already exists and is already producing work. I am not asking for a project or a " +
    "budget line — I am asking for two decisions. Nothing in this deck assumes technical knowledge.\n\n" +
    "Set the shape of the next 20 minutes out loud: what it does, what it has produced, what it costs, what could " +
    "go wrong, and the two things I need from you. Then move on — do not linger on the title."
  );
}

/* ====================================================== 2 · why it exists */
function slideWhy() {
  const s = lightSlide();
  heading(s, "Why this exists", "The bottleneck is not the robots.\nIt is the answers about them.", { th: 1.3, ts: 30 });

  /* One story, not a list. Numbered dots on a rail read as a sequence; plain
     bullets read as independent items, which is what this slide is NOT. The
     last step gets the accent dot, because that is where the search restarts. */
  const steps = [
    "Something goes wrong on a robot",
    "Lab starts looking themselves",
    "Setup? Settings? The software?",
    "Still stuck — so they ask us",
    "And the engineer starts the same search over",
  ];
  const d = 0.34, x0 = 0.9, top = 2.55, gap = 0.64;
  s.addShape(pres.ShapeType.rect, {
    x: x0 + d / 2 - 0.015, y: top + d / 2, w: 0.03, h: (steps.length - 1) * gap,
    fill: { color: "C7D4E8" }, line: { width: 0, color: "C7D4E8" },
  });
  steps.forEach((t, i) => {
    const y = top + i * gap, last = i === steps.length - 1;
    s.addShape(pres.ShapeType.ellipse, {
      x: x0, y, w: d, h: d,
      fill: { color: last ? SUN : NAVY }, line: { width: 0, color: W },
    });
    s.addText(String(i + 1), {
      x: x0, y, w: d, h: d, margin: 0,
      fontFace: FONT, fontSize: 11, bold: true, align: "center", valign: "middle",
      color: last ? NAVY : W,
    });
    s.addText(t, {
      x: 1.62, y: y - 0.06, w: 5.3, h: d + 0.12, margin: 0,
      fontFace: FONT, fontSize: 15.5, bold: last, color: NAVY, valign: "middle",
    });
  });

  s.addShape(pres.ShapeType.roundRect, {
    x: 7.55, y: 2.42, w: 5.05, h: 3.2, rectRadius: 0.12,
    fill: { color: NAVY }, line: { width: 0, color: NAVY },
  });
  s.addText("\u201c", {
    x: 7.95, y: 2.5, w: 1.0, h: 0.9, margin: 0,
    fontFace: FONT, fontSize: 60, bold: true, color: SUN, valign: "top",
  });
  s.addText("Not just waiting.\nThe same search, twice.", {
    x: 7.95, y: 3.5, w: 4.25, h: 1.7, margin: 0, fontFace: FONT, fontSize: 22, bold: true, color: W, lineSpacing: 31, valign: "top",
  });
  footer(s);
  s.addNotes(
    "SAY: every robot ships with its own software, and the knowledge of how it works sits with very few people. " +
    "Robotics-AI has been taught that knowledge.\n\n" +
    "WALK THE FIVE STEPS — this is the whole argument, so do not rush it, and let it read as one story rather " +
    "than five facts. Something goes wrong in build, at FAT or at a customer. Lab does not queue immediately; " +
    "they go looking. They may not know that robot's software, so they check the setup, then the settings, then " +
    "the software itself. Only when that search runs out do they come and ask. Then the engineer starts the same " +
    "search from the beginning — that is why step 5 is the one marked in orange.\n\n" +
    "THE POINT: it is not just waiting. It is searching — and the same ground gets covered twice. Both halves " +
    "shrink: the search gets shorter for whoever is doing it, and often the handover stops being needed at all.\n\n" +
    "THE LINE THAT MATTERS: every question Lab and Helpdesk can answer themselves is time back for them — and " +
    "capacity returned to Software Engineering. Say both halves; a room of department managers cares about the " +
    "first one, and the deck is built around it.\n\n" +
    "Lead with the constraint, not the technology. In real use by Software Engineering since April 2026."
  );
}

/* =================================================== 3 · what the AI does */
async function slideAiCapabilities() {
  const s = lightSlide();
  heading(s, "Powered by AI", "What it can do", { ts: 32 });
  s.addText("You describe the problem. It does the technical legwork.", {
    x: 0.7, y: 1.46, w: 10.6, h: 0.4, margin: 0, fontFace: FONT, fontSize: 15, color: GREY, valign: "top",
  });

  const items = [
    { icon: "FiActivity", title: "Diagnose a robot from its logs" },
    { icon: "FiLifeBuoy", title: "Solve a service ticket" },
    { icon: "FiTool", title: "Help the lab in build or test" },
    { icon: "FiCopy", title: "Build or copy a feature" },
    { icon: "FiBookOpen", title: "Answer software questions" },
    { icon: "FiSend", title: "Package and deliver a build" },
  ];
  const cw = 5.83, ch = 1.12, gx = 0.24, gy = 0.22;
  for (let i = 0; i < items.length; i++) {
    await iconChip(s, {
      ...items[i],
      x: 0.7 + (i % 2) * (cw + gx),
      y: 2.2 + Math.floor(i / 2) * (ch + gy),
      w: cw, h: ch,
    });
  }
  footer(s);
  s.addNotes(
    "Six things, in daily use. Take them one at a time and stop when the room has heard enough — this is the slide " +
    "to spend time on if they are interested, and the slide to skim if they are not.\n\n" +
    "LOGS: robot logs are a binary format needing a special viewer. It reads them directly and explains the crash, " +
    "freeze or failed sample — and the exact step it happened on.\n" +
    "TICKET: give it an RB or ES number. It pulls the ticket, the customer's software and logs, checks what we " +
    "solved before, then reports a diagnosis with a recommended fix.\n" +
    "LAB: order number, a description, a log if there is one. It checks past cases, then traces the robot's own " +
    "program to pinpoint where it broke.\n" +
    "FEATURE: guides adding or copying a measurement step, setting or behaviour from a proven reference robot into " +
    "another one — following our own procedure.\n" +
    "QUESTIONS: an always-available reference on how the robot software is built, so the knowledge is not held by " +
    "one or two people.\n" +
    "DELIVERY: checks out a finished package, zips it with the right naming and uploads it — the routine hand-off, " +
    "in one step.\n\n" +
    "The common shape: it gathers and reads the evidence first, then reasons over it. A well-prepared first " +
    "opinion, not an authority — and say so before they ask."
  );
}

/* =========================================================== 4 · evidence */
function slideEvidence() {
  const s = darkSlide();
  heading(s, "Where we are today", "What it has already produced", { dark: true, ts: 32 });

  const stats = [
    { fig: "51", label: "cases written up" },
    { fig: "12", label: "features built or ported" },
    { fig: "4", label: "lab questions answered" },
    { fig: "125+", label: "engineer hours returned" },
  ];
  const cw = 2.93, gx = 0.23;
  stats.forEach((st, i) => {
    const x = 0.7 + i * (cw + gx);
    s.addShape(pres.ShapeType.roundRect, {
      x, y: 2.3, w: cw, h: 2.42, rectRadius: 0.1,
      fill: { color: TINT_D }, line: { width: 0, color: TINT_D },
    });
    s.addText(st.fig, {
      x: x + 0.3, y: 2.62, w: cw - 0.6, h: 1.1, margin: 0,
      fontFace: FONT, fontSize: 58, bold: true, color: SUN, valign: "middle",
    });
    s.addText(st.label, {
      x: x + 0.3, y: 3.86, w: cw - 0.6, h: 0.86, margin: 0,
      fontFace: FONT, fontSize: 15, bold: true, color: W, lineSpacing: 19, valign: "top",
    });
  });

  s.addText("April \u2192 August 2026  \u00b7  July alone was 24", {
    x: 0.7, y: 5.12, w: 11.9, h: 0.36, margin: 0,
    fontFace: FONT, fontSize: 15, bold: true, color: SUN,
  });
  s.addText("The 125 hours are Software Engineering's own. Whether Lab sees the same is what the pilot measures.", {
    x: 0.7, y: 5.62, w: 11.9, h: 0.36, margin: 0,
    fontFace: FONT, fontSize: 13, color: ICE,
  });
  footer(s, true);
  s.addNotes(
    "51 counted from the write-ups in md documents (2026-08-19): 13 service tickets, 14 lab cases, 12 features " +
    "and ports, 7 order approvals, 5 template bugs. Each is a real case with a written-up cause and outcome — not " +
    "a count of things built.\n\n" +
    "IF THEY ASK WHERE 125 h COMES FROM: 13 tickets at 2-4 h now taking 10-20 min; 14 lab cases at 0.5-3 h now " +
    "10 min; 12 features at 8 h of writing now 20 min, with testing UNCHANGED and excluded; 7 approvals at 1-2 h " +
    "now 10 min. 46 of the 51 cases; template bugs left out because no before-time was recorded. That is 125 h at " +
    "the cautious end, 190 at the top.\n\n" +
    "Say 'estimated', not 'measured' — both halves are my own timings. Expect the challenge on features: 8 h to " +
    "20 min is 24x and carries 92 of the 125 hours on its own. The answer is that testing is unchanged, so the " +
    "assistant is credited only with the writing it actually did.\n\n" +
    "Then hand the slide over deliberately: this half is proven, the Lab half is not, and that is what I am here " +
    "to ask for."
  );
}

/* =================================================== 5 · how it knows */
function slideHowItKnows() {
  const s = lightSlide();
  heading(s, "Nothing is hidden", "The intelligence is off-the-shelf.\nThe expertise is ours.", { th: 1.3, ts: 30 });

  const cw = 3.87, gap = 0.24;
  const cards = [
    { n: 1, eyebrow: "ALWAYS ON", title: "The ground rules" },
    { n: 2, eyebrow: "OPENED ON DEMAND", title: "The playbooks" },
    { n: 3, eyebrow: "READ WHEN NEEDED", title: "The knowledge base" },
  ];
  cards.forEach((c, i) => numberCard(s, { ...c, body: "", x: 0.7 + i * (cw + gap), y: 2.9, w: cw, h: 1.95 }));

  s.addText("All of it plain text. All of it ours.", {
    x: 0.7, y: 5.28, w: 11.9, h: 0.42, margin: 0, fontFace: FONT, fontSize: 22, bold: true, color: NAVY,
  });
  s.addText("Improving it means writing another document \u2014 not retraining anything, and not depending on one supplier.", {
    x: 0.7, y: 5.82, w: 11.9, h: 0.4, margin: 0, fontFace: FONT, fontSize: 14, color: GREY,
  });
  footer(s);
  s.addNotes(
    "SAY: the AI has no built-in knowledge of our robots. Everything it knows about them we wrote down as plain " +
    "text files that live with the project and are handed to it at the right moment — in three layers.\n\n" +
    "1 GROUND RULES: one core file loads at the start of every investigation — our products, how the robot " +
    "software is built, our naming, where things live. From the first message it already speaks Skalar.\n" +
    "2 PLAYBOOKS: for each bigger job — analyse a log, solve a ticket, build a feature — there is a written " +
    "step-by-step procedure. It opens only the one that matches, so it follows our method instead of improvising.\n" +
    "3 KNOWLEDGE BASE: template documentation, error-code tables and every solved-case write-up sit alongside as " +
    "ordinary text files. When it needs a fact it opens the file — exactly as a colleague would.\n\n" +
    "This slide is the first half of the trust conversation. Everything the assistant knows is readable, editable " +
    "text we own and can audit. Nothing is locked in a vendor's model — which is also the answer to 'what if we " +
    "switch supplier'."
  );
}

/* ========================================================= 6 · challenges */
async function slideChallenges() {
  const s = lightSlide();
  heading(s, "The challenges", "What could go wrong \u2014 and how we handle it", { ts: 32 });

  const rows = [
    { icon: "FiAlertTriangle", left: "It can be confidently wrong", right: "A person checks everything before it reaches a customer" },
    { icon: "FiLayers", left: "Its knowledge is uneven", right: "We start the pilot where the depth already is" },
    { icon: "FiShield", left: "Our data goes to an AI service", right: "It already does today \u2014 same provider, same terms" },
    { icon: "FiUser", left: "One person maintains it", right: "Plain text in our own repository \u2014 anyone can pick it up" },
  ];
  for (let i = 0; i < rows.length; i++) {
    await splitRow(s, { ...rows[i], y: 2.2 + i * 1.07, h: 0.95 });
  }

  s.addText("Every one of these has an answer today.", {
    x: 0.7, y: 6.46, w: 11.9, h: 0.35, margin: 0, fontFace: FONT, fontSize: 15, bold: true, italic: true, color: NAVY,
  });
  footer(s);
  s.addNotes(
    "Say this slide out loud rather than skipping it — naming the four problems yourself is what buys the room's " +
    "trust for everything else. Finish every row on the right-hand half, or it turns into a list of excuses.\n\n" +
    "WRONG ANSWERS: of the 51 cases we wrote up, 4 needed a real correction afterwards. An answer that sounds " +
    "certain and is wrong costs more trust than ten good ones earn. Everything it produces is checked by a person " +
    "before it reaches a customer, and the wrong ones get logged as carefully as the right ones.\n" +
    "UNEVEN: deep on some robot templates, thin on others — it knows most about what we have already written " +
    "down. A thin area is fixed by writing the document, not by retraining anything.\n" +
    "DATA: customer logs and software are sent to an AI service, and that needs IT and security to agree. We " +
    "already do this — Claude inside GitHub Copilot sends the same material to the same provider under a " +
    "no-retention, no-training agreement. GitHub hosts Anthropic's models on AWS, Anthropic's own infrastructure " +
    "and Google Cloud. So approving it directly is not a new question about who sees our data — it is a question " +
    "of which contract governs it. IN RESERVE, only if security objects: the same tooling runs inside our own " +
    "cloud tenancy; that is a configuration change, not a redesign. CAUTION: this argument works because Copilot " +
    "already runs Anthropic models. ChatGPT would be a new provider and security would have to look at it fresh.\n" +
    "MAINTAINER: a single maintainer with many dependents is the standard failure mode for internal tools. Cover " +
    "has to be agreed before anyone relies on it."
  );
}

/* =============================================================== 7 · cost */
function slideCost() {
  const s = lightSlide();
  heading(s, "What it costs", "Two ways to pay, and they are not close", { ts: 32 });
  s.addText("One investigation = one case worked start to finish. Not a quick question.", {
    x: 0.7, y: 1.5, w: 11.0, h: 0.4, margin: 0, fontFace: FONT, fontSize: 15, bold: true, color: NAVY, valign: "top",
  });

  const cards = [
    { x: 0.7, tone: "grey", eyebrow: "METERED \u2014 TODAY", title: "Copilot credits", price: "\u20ac19 / month", fig: "\u2248 4", figsub: "investigations\nper month" },
    { x: 6.93, tone: "navy", eyebrow: "FLAT RATE \u2014 THE ASK", title: "An AI subscription", price: "\u20ac20 / month", fig: "\u2248 50", figsub: "investigations\nper week" },
  ];
  cards.forEach((c) => {
    const dark = c.tone === "navy";
    s.addShape(pres.ShapeType.roundRect, {
      x: c.x, y: 2.2, w: 5.7, h: 3.0, rectRadius: 0.11,
      fill: { color: dark ? NAVY : TINT }, line: { color: dark ? NAVY : "DCE4F0", width: 1 },
      shadow: dark ? undefined : shadow(),
    });
    s.addText(c.eyebrow, {
      x: c.x + 0.36, y: 2.44, w: 5.0, h: 0.24, margin: 0,
      fontFace: FONT, fontSize: 10, bold: true, charSpacing: 1.1, color: dark ? SUN : AEG_D,
    });
    s.addText(c.title, {
      x: c.x + 0.36, y: 2.72, w: 5.0, h: 0.4, margin: 0,
      fontFace: FONT, fontSize: 19, bold: true, color: dark ? W : NAVY, valign: "top",
    });
    s.addText(c.price, {
      x: c.x + 0.36, y: 3.16, w: 5.0, h: 0.32, margin: 0,
      fontFace: FONT, fontSize: 14, color: dark ? ICE : GREY, valign: "top",
    });
    s.addText(c.fig, {
      x: c.x + 0.36, y: 3.66, w: 2.0, h: 1.0, margin: 0,
      fontFace: FONT, fontSize: 52, bold: true, color: dark ? SUN : NAVY, valign: "middle",
    });
    s.addText(c.figsub, {
      x: c.x + 2.42, y: 3.72, w: 3.0, h: 0.9, margin: 0,
      fontFace: FONT, fontSize: 15, bold: true, color: dark ? W : NAVY, lineSpacing: 19, valign: "middle",
    });
  });

  s.addText("95% of what we use is re-reading. Credits charge for it. A subscription does not.", {
    x: 0.7, y: 5.5, w: 11.9, h: 0.42, margin: 0, fontFace: FONT, fontSize: 19, bold: true, color: NAVY,
  });
  s.addText("Same price per person. Roughly fifty times the work.", {
    x: 0.7, y: 6.04, w: 11.9, h: 0.36, margin: 0, fontFace: FONT, fontSize: 14, color: GREY,
  });
  footer(s);
  s.addNotes(
    "DEFINE THE UNIT FIRST, before any number is on screen. An investigation is one whole case worked end to end " +
    "— read the log, read the software, find the cause, write it up. If the room hears 'one question', the whole " +
    "slide reads as absurd.\n\n" +
    "Measured from 14 real investigations, priced turn by turn: the average one consumes about \u20ac4.44 of AI usage. " +
    "\u20ac19/month of Copilot credits therefore buys about four of them; a \u20ac20 flat-rate plan does roughly fifty a " +
    "week. One \u20ac20 subscription delivers roughly \u20ac1,000 a month of metered usage — about five times our entire " +
    "shared credit pool, from one seat.\n\n" +
    "WHY: 95% of what we consume is the assistant re-reading material it has already been given. Credits charge " +
    "full price for every word of that re-reading; a subscription does not charge for it at all.\n\n" +
    "DO NOT SAY GitHub overcharges. Copilot moved to AI Credits on 1 June 2026: 1 credit = $0.01, billed on tokens " +
    "at the same published rates as the API. The argument is that metering is the wrong instrument for this " +
    "workload, not that anyone is gouging.\n\n" +
    "Every measured figure here is Claude usage, because that is what we ran. ChatGPT Plus is the same \u20ac20 and the " +
    "same flat-rate mechanism, but we have not measured its throughput — do not claim the ~50/week for it. The " +
    "~50/week is a fitted ceiling anyway; sustaining it means constant throttling, so present it as capacity. " +
    "Full reasoning: Rollout/AI-Plan-Pricing-Explained.md."
  );
}

/* ======================================================== 8 · who it's for */
async function slideDepartments() {
  const s = lightSlide();
  heading(s, "Who it is for", "One department at a time", { ts: 32 });
  s.addText("Start in one place. Prove it. Then widen.", {
    x: 0.7, y: 1.5, w: 10.9, h: 0.4, margin: 0, fontFace: FONT, fontSize: 15, bold: true, color: NAVY, valign: "top",
  });

  const rows = [
    { icon: "FiCpu", dept: "Software Engineering", chip: "IN USE TODAY", chipBg: AEG, chipFg: W },
    { icon: "FiTool", dept: "Lab", chip: "PILOT STARTS HERE", chipBg: NAVY, chipFg: W },
    { icon: "FiHeadphones", dept: "Helpdesk", chip: "READY, GOES NEXT", chipBg: NAVY, chipFg: W },
    { icon: "FiUsers", dept: "Others \u2014 later", chip: "PLAUSIBLE", chipBg: "D6DEEC", chipFg: NAVY },
  ];
  const rh = 1.0, gy = 0.18;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i], y = 2.24 + i * (rh + gy);
    s.addShape(pres.ShapeType.roundRect, {
      x: 0.7, y, w: 11.93, h: rh, rectRadius: 0.09,
      fill: { color: TINT }, line: { color: "DCE4F0", width: 1 }, shadow: shadow(),
    });
    s.addShape(pres.ShapeType.ellipse, {
      x: 1.02, y: y + 0.24, w: 0.52, h: 0.52, fill: { color: NAVY }, line: { width: 0, color: NAVY },
    });
    s.addImage({ data: await icon(r.icon, W), x: 1.155, y: y + 0.375, w: 0.25, h: 0.25 });
    s.addText(r.dept, {
      x: 1.86, y, w: 5.0, h: rh, margin: 0,
      fontFace: FONT, fontSize: 19, bold: true, color: NAVY, valign: "middle",
    });
    s.addShape(pres.ShapeType.roundRect, {
      x: 7.2, y: y + 0.32, w: 2.5, h: 0.36, rectRadius: 0.12,
      fill: { color: r.chipBg }, line: { width: 0, color: r.chipBg },
    });
    s.addText(r.chip, {
      x: 7.2, y: y + 0.32, w: 2.5, h: 0.36, margin: 0,
      fontFace: FONT, fontSize: 9.5, bold: true, charSpacing: 0.8, align: "center", valign: "middle", color: r.chipFg,
    });
  }
  footer(s);
  s.addNotes(
    "Fit is not the same as readiness. We are proposing to start in one place, prove it, and only then widen.\n\n" +
    "SOFTWARE ENGINEERING: the current home since April 2026 — diagnosing cases, porting features between orders, " +
    "order approvals.\n" +
    "LAB: already sending us questions unprompted, which is the strongest signal of real demand we have. This is " +
    "the green light we are asking for.\n" +
    "HELPDESK: highest volume of repeatable questions and the clearest before-and-after measure. Waits its turn so " +
    "the Lab pilot gets full attention.\n" +
    "OTHERS: Sales during quoting, Production, and template and core development have all been raised. Each needs " +
    "real work first, and none of it is in scope now.\n\n" +
    "The order changed deliberately: Lab goes first, not Helpdesk, because Lab is already asking without being " +
    "prompted. Running two pilots at once halves the attention each gets."
  );
}

/* ================================================== 9 · what we start with */
function slideStart() {
  const s = lightSlide();
  heading(s, "If we get a yes", "What we would start with", { ts: 32 });
  s.addText("One question: does it give the Lab back its own time?", {
    x: 0.7, y: 1.5, w: 10.9, h: 0.4, margin: 0, fontFace: FONT, fontSize: 16, bold: true, color: NAVY, valign: "top",
  });

  const cards = [
    { n: 1, eyebrow: "THE ASK", title: "Three seats" },
    { n: 2, eyebrow: "HOW LONG", title: "Six weeks, in the Lab" },
    { n: 3, eyebrow: "WHAT WE MEASURE", title: "The Lab's own hours" },
    { n: 4, eyebrow: "HOW IT STOPS", title: "An honest exit" },
  ];
  const cw = 2.93, gx = 0.23;
  cards.forEach((c, i) => numberCard(s, { ...c, body: "", x: 0.7 + i * (cw + gx), y: 2.5, w: cw, h: 1.95 }));

  s.addText("Measured with them. Reported in their hours \u2014 not ours.", {
    x: 0.7, y: 5.02, w: 11.9, h: 0.42, margin: 0, fontFace: FONT, fontSize: 22, bold: true, color: NAVY,
  });
  s.addText("Enthusiasm without committed time counts as a no.", {
    x: 0.7, y: 5.58, w: 11.9, h: 0.38, margin: 0, fontFace: FONT, fontSize: 15, italic: true, color: GREY,
  });
  footer(s);
  s.addNotes(
    "KEEP THE MEASUREMENT POINTED AT THEM. My own saving is already proven and it is on the evidence slide. What " +
    "is unproven is whether the Lab gets its own hours back, and that is the only thing this pilot is for. If you " +
    "catch yourself talking about your own time here, stop.\n\n" +
    "1 THREE SEATS: three people doing this work, one plan each. Who they are is not settled yet — that is part of " +
    "the ask, and it is the smallest version of it that proves anything. Do NOT claim anyone is lined up: no seats " +
    "are assigned and no participants are picked, because this meeting decides whether we get that far. If asked " +
    "'who exactly?' — that is the next step, and we are not doing it before you say yes.\n" +
    "2 SIX WEEKS: Lab runs it themselves on real work in build, FAT and installation — answering their own " +
    "questions instead of queueing for ours. Every case logged, including the wrong ones.\n" +
    "3 WHAT WE MEASURE: how long it used to take them to reach an answer — the search they do themselves, plus " +
    "the asking — against how long it takes now. Not just queue time; the hunting counts.\n" +
    "4 HOW IT STOPS: if the Lab does not want to keep it after six weeks, we say so and it stops there. No " +
    "expansion without evidence.\n\n" +
    "Nothing here needs to be built. Saying yes is cheap and reversible — that is the whole point of the slide."
  );
}

/* ============================================================= 10 · the ask */
function slideAsk() {
  const s = darkSlide();
  heading(s, "What we need from you", "Two decisions", { dark: true, ts: 32 });

  const asks = [
    { n: 1, eyebrow: "DECISION ONE", title: "How we are licensed", body: "A flat-rate plan \u2014 or more credits." },
    { n: 2, eyebrow: "DECISION TWO", title: "Green light for the Lab", body: "Six weeks. Two people. Real work." },
  ];
  const cw = 5.83, gx = 0.27;
  asks.forEach((a, i) =>
    numberCard(s, { ...a, x: 0.7 + i * (cw + gx), y: 2.5, w: cw, h: 2.35, dark: true, accent: SUN })
  );

  s.addText("In exchange: a measured number.", {
    x: 0.7, y: 5.3, w: 11.9, h: 0.46, margin: 0, fontFace: FONT, fontSize: 26, bold: true, color: SUN, valign: "top",
  });
  s.addText("Hours the Lab gets back \u2014 and the engineering time that stops going into repeat questions.", {
    x: 0.7, y: 5.92, w: 11.9, h: 0.4, margin: 0, fontFace: FONT, fontSize: 15, color: ICE, valign: "top",
  });
  footer(s, true);
  s.addNotes(
    "Close on the two decisions and stop talking.\n\n" +
    "DECISION ONE: approve a flat-rate assistant plan — Claude Pro, ChatGPT Plus or equivalent — for the people " +
    "doing this work, or top up the shared Copilot credits instead. At the same price per person the subscription " +
    "does far more work; approving one as a tool is the real question.\n" +
    "DECISION TWO: permission for Lab to run the six-week pilot on real work, and the hours for two people to do " +
    "it. Who those two are and when they start is ours to arrange once you say yes. They are already asking us the " +
    "questions; this lets them answer their own.\n\n" +
    "FOR LATER, NOT NOW — mention only if asked: a shared always-on machine so the service runs centrally.\n\n" +
    "If the room wants to debate the licensing question, offer the one-page explainer " +
    "(AI-Plan-Pricing-Explained.md) rather than arguing numbers live. If they want to defer decision one, ask for " +
    "decision two anyway — the pilot can start on the current setup, just more slowly."
  );
}

/* --------------------------------------------------------------- validate */
/** Reads the written deck back and rejects geometry PowerPoint will not open.
    LibreOffice renders negative extents happily, so a visual check cannot
    catch this — the only safe gate is the XML itself. */
async function assertOpensInPowerPoint(file) {
  const JSZip = require("jszip");
  const fs = require("fs");
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  const bad = [];
  for (const name of Object.keys(zip.files)) {
    if (!/^ppt\/slides\/slide\d+\.xml$/.test(name)) continue;
    const xml = await zip.file(name).async("string");
    const m = xml.match(/<a:ext cx="-?\d+" cy="-?\d+"\/>/g) || [];
    for (const ext of m) if (/(cx|cy)="-/.test(ext)) bad.push(name.split("/").pop() + " " + ext);
  }
  if (bad.length) {
    throw new Error(
      "Invalid geometry — PowerPoint would refuse this file (" + bad.length + " shapes):\n  " +
      bad.join("\n  ") +
      "\nA negative width/height usually means a text box was sized from a card that shrank."
    );
  }
}

/* ------------------------------------------------------------------ build */
(async () => {
  slideTitle();
  slideWhy();
  await slideAiCapabilities();
  slideEvidence();
  slideHowItKnows();
  await slideChallenges();
  slideCost();
  await slideDepartments();
  slideStart();
  slideAsk();
  const outFile = path.join(__dirname, OUT);
  await pres.writeFile({ fileName: outFile });
  await assertOpensInPowerPoint(outFile);
  console.log("Wrote " + outFile);
})();
