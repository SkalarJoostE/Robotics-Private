/**
 * Robotics-AI — niet-technische deck over mogelijkheden & uitrol (NL).
 *
 * Vertaling van build-capability-deck.js. Bij inhoudelijke wijzigingen: pas ALTIJD
 * beide bestanden aan — de layoutcode is een kopie, alleen de teksten verschillen.
 *
 * Content source: ../PROJECT.md (organisational layer), robotics-ai-overview.html
 * (vetted non-technical copy) and ../AI-Plan-Pricing-Explained.md (the cost slide).
 * Figures are re-derived from the workspace, not copied — see DECK_OPEN_QUESTIONS.md
 * for what is still unanswered and must not be presented as settled.
 *
 *   node build-capability-deck-nl.js "Robotics-AI Overzicht Mogelijkheden (NL).pptx"
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

const OUT = process.argv[2] || "Robotics-AI Overzicht Mogelijkheden (NL).pptx";
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
pres.title = "Robotics-AI — Overzicht Mogelijkheden";

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
  s.addText("Robotics-AI  ·  intern overzicht mogelijkheden  ·  augustus 2026", {
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
  s.addText("Een AI-ondersteunde werkomgeving voor onze robotsoftware", {
    x: 0.75, y: 3.55, w: 10.5, h: 0.5, margin: 0,
    fontFace: FONT, fontSize: 21, color: ICE, valign: "top",
  });
  s.addText(
    "Wat het vandaag doet, wat het al heeft opgeleverd, en de twee besluiten die we nodig hebben om het aan het Lab te geven.",
    {
      x: 0.75, y: 4.35, w: 8.4, h: 0.8, margin: 0,
      fontFace: FONT, fontSize: 14, color: AEG, lineSpacing: 21, valign: "top",
    }
  );
  s.addText("Software Engineering  ·  augustus 2026", {
    x: 0.75, y: 6.5, w: 8.0, h: 0.3, margin: 0,
    fontFace: FONT, fontSize: 11.5, color: AEG,
  });
  s.addNotes(
    "Kader de sessie in één zin: dit is een tool die al bestaat en al werk oplevert; ik heb twee besluiten " +
    "nodig, geen budgetdiscussie. Nergens in deze deck wordt technische kennis verondersteld."
  );
}

/* ====================================================== 2 · why it exists */
function slideWhy() {
  const s = lightSlide();
  heading(s, "Waarom dit bestaat", "Het knelpunt zijn niet de robots.\nHet zijn de antwoorden erover.", { th: 1.3, ts: 30 });

  s.addText(
    [
      { text: "Elke robot wordt geleverd met zijn eigen software. Gaat er iets mis — bij de klant, in het lab, tijdens de bouw — dan zit de kennis van hoe die software werkt bij heel weinig mensen.", options: { breakLine: true, paraSpaceAfter: 12 } },
      { text: "Dus wachten Helpdesk en Lab, en leidt Software Engineering antwoorden opnieuw af die al in het bewijs zitten: eerdere cases, de setup-handleidingen, de logbestanden en het programma van de robot zelf.", options: { breakLine: true, paraSpaceAfter: 12 } },
      { text: "Robotics-AI is dat bewijs aangeleerd.", options: { bold: true, color: NAVY } },
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
    "Elke vraag die Lab en Helpdesk zelf kunnen beantwoorden is teruggewonnen capaciteit bij Software Engineering.",
    { x: 7.95, y: 3.35, w: 4.25, h: 1.7, margin: 0, fontFace: FONT, fontSize: 19, bold: true, color: W, lineSpacing: 27, valign: "top" }
  );
  s.addText("Het argument is niet dat AI nuttig is, maar dat engineertijd de beperkende factor is.", {
    x: 7.95, y: 5.05, w: 4.25, h: 0.6, margin: 0, fontFace: FONT, fontSize: 11.5, color: AEG, lineSpacing: 16, valign: "top",
  });
  footer(s);
  s.addNotes(
    "Begin bij de beperking, niet bij de techniek. In echt gebruik bij Software Engineering sinds april 2026."
  );
}

/* =================================================== 3 · what the AI does */
async function slideAiCapabilities() {
  const s = lightSlide();
  heading(s, "Mogelijk gemaakt door AI", "Wat het kan", { ts: 32 });
  s.addText(
    "Je beschrijft een probleem in gewone taal. Het doet het technische uitzoekwerk — logbestanden lezen, de juiste software ophalen, versies vergelijken, het programma van de robot volgen — en rapporteert terug.",
    { x: 0.7, y: 1.4, w: 10.6, h: 0.6, margin: 0, fontFace: FONT, fontSize: 13, color: GREY, lineSpacing: 19, valign: "top" }
  );

  const items = [
    { icon: "FiActivity", title: "Een robot diagnosticeren uit logs", body: "Robotlogs zijn een binair formaat dat een speciale viewer nodig heeft. Het leest ze direct en verklaart de crash, vastloper of mislukte sample — en de exacte stap waarop het gebeurde." },
    { icon: "FiLifeBuoy", title: "Een serviceticket oplossen (RB / ES)", body: "Geef een ticketnummer. Het haalt het ticket, de software en logs van de klant op, kijkt wat we eerder oplosten en rapporteert een diagnose met een voorgestelde oplossing." },
    { icon: "FiTool", title: "Het lab helpen bij bouw of test", body: "Ordernummer, een beschrijving, een log als die er is. Het bekijkt eerdere cases en volgt daarna het programma van de robot zelf om aan te wijzen waar het misging." },
    { icon: "FiCopy", title: "Een feature bouwen of overzetten", body: "Begeleidt het toevoegen of overnemen van een meetstap, instelling of gedrag van een bewezen referentierobot naar een andere — volgens onze eigen procedure." },
    { icon: "FiBookOpen", title: "Vragen over de software beantwoorden", body: "Een altijd beschikbaar naslagwerk over hoe de robotsoftware in elkaar zit, zodat de kennis niet bij één of twee mensen ligt." },
    { icon: "FiSend", title: "Een softwarepakket inpakken en leveren", body: "Haalt een afgerond pakket op, zipt het met de juiste naamgeving en uploadt het voor levering — de routineoverdracht, in één stap." },
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
    "Deze zes zijn dagelijks in gebruik. Het patroon is steeds hetzelfde: eerst het bewijs verzamelen en lezen, " +
    "daarna erover redeneren. Het is een goed voorbereide eerste mening, geen autoriteit — die grens staat verderop."
  );
}

/* =========================================================== 4 · evidence */
function slideEvidence() {
  const s = darkSlide();
  heading(s, "Waar we vandaag staan", "Wat het al heeft opgeleverd", { dark: true, ts: 32 });

  const stats = [
    { fig: "51", label: "uitgewerkte cases", sub: "april → augustus 2026. Alleen juli al 24." },
    { fig: "12", label: "features gebouwd of overgezet", sub: "herbruikbaar over 6 softwaretemplates" },
    { fig: "4", label: "labvragen beantwoord", sub: "uit eigen beweging gesteld door Lab — alle vier bevestigd juist" },
    { fig: "125+", label: "engineeruren teruggewonnen", sub: "op onze eigen voor/na-tijden — de pilot moet die toetsen" },
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

  s.addText("Waar die teruggewonnen uren vandaan komen", {
    x: 0.7, y: 5.02, w: 11.9, h: 0.3, margin: 0,
    fontFace: FONT, fontSize: 12.5, bold: true, color: W,
  });
  s.addText(
    "13 servicetickets, 2–4 uur → 20 min · 14 labcases, 0,5–3 uur → 10 min · 12 features, 8 uur → 20 min schrijven, testen ongewijzigd en niet meegeteld · 7 ordergoedkeuringen, 1–2 uur → 10 min. Dat is 125 uur aan de voorzichtige kant en 190 aan de bovenkant, over 46 van de 51 cases; de 5 templatebugs blijven volledig buiten beschouwing. Elke case is echt, met opgeschreven oorzaak en uitkomst — geen telling van gebouwde dingen.",
    { x: 0.7, y: 5.34, w: 11.4, h: 1.0, margin: 0, fontFace: FONT, fontSize: 12, color: ICE, lineSpacing: 18, valign: "top" }
  );
  footer(s, true);
  s.addNotes(
    "51 geteld uit de uitwerkingen in md documents (2026-08-19). Beide helften zijn eigen schattingen, geen " +
    "meting: voor 2-4 uur / 0,5-3 uur / 8 uur / 1-2 uur, na 20 min / 10 min / 20 min / 10 min. Zeg 'geschat' " +
    "hardop — daarom opent de slide met de onderkant (125 uur). Verwacht de tegenwerping bij features: " +
    "8 uur naar 20 min is 24x en draagt in zijn eentje 92 van de 125 uur. Het antwoord staat op de slide " +
    "ernaast: testen blijft ongewijzigd, dus de assistent krijgt alleen krediet voor het schrijfwerk dat hij " +
    "echt deed. Templatebugs vallen eruit omdat er nooit een voor-tijd voor is vastgelegd. Of deze tijden ook " +
    "gelden voor iemand die de tool niet gebouwd heeft, is precies wat de pilot meet."
  );
}

/* ========================================================= 5 · who it's for */
async function slideDepartments() {
  const s = lightSlide();
  heading(s, "Voor wie het is", "Één afdeling tegelijk", { ts: 32 });
  s.addText(
    "Passend is niet hetzelfde als er klaar voor. Ons voorstel: op één plek beginnen, het bewijzen, en pas daarna verbreden.",
    { x: 0.7, y: 1.56, w: 10.9, h: 0.4, margin: 0, fontFace: FONT, fontSize: 13, color: GREY, valign: "top" }
  );

  const rows = [
    { icon: "FiCpu", dept: "Software Engineering", chip: "NU IN GEBRUIK", chipBg: AEG, chipFg: W, body: "De huidige thuisbasis, sinds april 2026: cases diagnosticeren, features tussen orders overzetten en ordergoedkeuringen." },
    { icon: "FiTool", dept: "Lab", chip: "PILOT START HIER", chipBg: NAVY, chipFg: W, body: "Stelt ons nu al uit eigen beweging vragen — het sterkste signaal van echte vraag dat we hebben. Hier vragen we het groene licht voor." },
    { icon: "FiHeadphones", dept: "Helpdesk", chip: "KLAAR, VOLGT HIERNA", chipBg: NAVY, chipFg: W, body: "Het hoogste aantal herhaalbare vragen en de duidelijkste voor-en-na-meting. Wacht op zijn beurt zodat de labpilot alle aandacht krijgt." },
    { icon: "FiUsers", dept: "Overige — later", chip: "DENKBAAR", chipBg: "D6DEEC", chipFg: NAVY, body: "Sales bij offertes, Productie, en template- en core-ontwikkeling zijn allemaal genoemd. Elk vraagt eerst echt werk en valt nu buiten scope." },
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
    "De volgorde is bewust omgedraaid: Lab eerst, niet Helpdesk. Lab stelt ons al uit eigen beweging vragen, en dat " +
    "is sterker dan welk argument wij ook kunnen maken. Twee pilots tegelijk halveert de aandacht voor allebei."
  );
}

/* =================================================== 6 · how it knows */
function slideHowItKnows() {
  const s = lightSlide();
  heading(s, "Niets is verborgen", "De intelligentie is standaard.\nDe expertise is van ons.", { th: 1.3, ts: 30 });

  s.addText(
    "De AI heeft geen ingebouwde kennis van onze robots. Alles wat het erover weet hebben wij opgeschreven als gewone tekstbestanden die bij het project staan en op het juiste moment worden aangereikt — in drie lagen.",
    { x: 0.7, y: 2.32, w: 9.4, h: 0.62, margin: 0, fontFace: FONT, fontSize: 13.5, color: GREY, lineSpacing: 20, valign: "top" }
  );

  const cw = 3.87, gap = 0.24;
  const cards = [
    { n: 1, eyebrow: "ALTIJD AAN", title: "De basisregels", body: "Één kernbestand laadt bij de start van elk onderzoek: onze producten, hoe de robotsoftware is opgebouwd, onze naamgeving, waar alles staat. Vanaf het eerste bericht spreekt het al Skalar." },
    { n: 2, eyebrow: "OP AANVRAAG", title: "De draaiboeken", body: "Voor elke grotere klus — een log analyseren, een ticket oplossen, een feature bouwen — ligt er een uitgeschreven stappenplan. Alleen het passende plan gaat open, dus het volgt onze methode in plaats van te improviseren." },
    { n: 3, eyebrow: "GELEZEN INDIEN NODIG", title: "De kennisbank", body: "Templatedocumentatie, foutcodetabellen en elke uitgewerkte opgeloste case staan ernaast als gewone tekstbestanden. Heeft het een feit nodig, dan opent het het bestand — net als een collega." },
  ];
  cards.forEach((c, i) => numberCard(s, { ...c, x: 0.7 + i * (cw + gap), y: 3.06, w: cw, h: 3.06 }));

  s.addText(
    "Verbeteren betekent nog een document schrijven — niets hertrainen, en niet afhankelijk zijn van één leverancier.",
    { x: 0.7, y: 6.34, w: 11.9, h: 0.35, margin: 0, fontFace: FONT, fontSize: 13, bold: true, italic: true, color: NAVY }
  );
  footer(s);
  s.addNotes(
    "Deze slide staat hier bewust — het is de eerste helft van het vertrouwensgesprek. Alles wat de assistent weet " +
    "is leesbare, bewerkbare tekst die van ons is en die we kunnen controleren. Niets zit vast in het model van een leverancier."
  );
}

/* ========================================================= 7 · the limits */
async function slideLimits() {
  const s = lightSlide();
  heading(s, "Eerlijk erover zijn", "Waar we op letten", { ts: 32 });
  s.addText(
    "Dit overdrijven is de snelste manier om het om zeep te helpen. Het eerste stellig foute antwoord kost meer vertrouwen dan tien goede opleveren.",
    { x: 0.7, y: 1.56, w: 10.9, h: 0.4, margin: 0, fontFace: FONT, fontSize: 13, color: GREY, valign: "top" }
  );

  const items = [
    { icon: "FiAlertTriangle", title: "Een eerste mening, geen antwoord", body: "Alles wat het maakt wordt door een mens gecontroleerd voordat het bij een klant komt. Van de 51 uitgewerkte cases hadden er later 4 een echte correctie nodig — die tellen we ook. Het maakt het werk klaar; het sluit geen tickets." },
    { icon: "FiLayers", title: "De kennis is ongelijk verdeeld", body: "Diep op sommige robottemplates, dun op andere. We zeggen vooraf welke, en leggen de diepgang daar waar de pilot echt werkt." },
    { icon: "FiShield", title: "Onze data vraagt een besluit", body: "Klantlogs en -software gaan naar een AI-dienst. Let op: dat doen we al — Claude draaien binnen GitHub Copilot stuurt hetzelfde materiaal naar dezelfde leverancier, onder een afspraak zonder opslag en zonder training. Deze presentatie start dat gesprek met IT en security." },
    { icon: "FiUser", title: "Één persoon onderhoudt het", body: "Één beheerder met veel afhankelijken is het standaard faalpatroon van interne tools. Vervanging bij afwezigheid moet geregeld zijn voordat iemand erop leunt." },
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
    "Liever hoor je het bezwaar hier dan dat je het ontdekt als de pilot al loopt — daarom staan die vier foute er ook op.",
    { x: 0.7, y: 6.28, w: 11.9, h: 0.35, margin: 0, fontFace: FONT, fontSize: 12.5, italic: true, color: GREY }
  );
  footer(s);
  s.addNotes(
    "Spreek deze slide uit, sla hem niet over. Over het datapunt: het geverifieerde feit is dat GitHub de modellen " +
    "van Anthropic host op AWS, op Anthropics eigen infrastructuur en op Google Cloud, onder een afspraak zonder " +
    "dataopslag en zonder training op bedrijfsdata. Claude direct goedkeuren is dus geen nieuwe vraag over wie onze " +
    "data ziet — het is een vraag welk contract erop van toepassing is. Wil security het anders, dan draait dezelfde " +
    "tooling binnen onze eigen cloudomgeving; dat is een configuratiewijziging, geen herontwerp. Belangrijke " +
    "asymmetrie, nu besluit één leveranciersneutraal is: dit hele argument werkt omdat Copilot AL modellen van " +
    "Anthropic draait, dus Claude is geen nieuwe leverancier. ChatGPT zou dat wél zijn, en security zou er opnieuw " +
    "naar moeten kijken. Gebruik deze zin niet voor OpenAI."
  );
}

/* =============================================================== 8 · cost */
function slideCost() {
  const s = lightSlide();
  heading(s, "Wat het kost", "Twee manieren om te betalen, en ze schelen enorm", { ts: 32 });
  s.addText(
    "Gemeten aan 14 echte onderzoeken — een case van begin tot eind uitgewerkt, geen snelle vraag — beurt voor beurt geprijsd. Gemiddeld verbruikt één onderzoek zo'n €4,44 aan AI-gebruik.",
    { x: 0.7, y: 1.56, w: 11.0, h: 0.4, margin: 0, fontFace: FONT, fontSize: 13, color: GREY, valign: "top" }
  );

  const cards = [
    {
      x: 0.7, tone: "grey", eyebrow: "PER VERBRUIK — WAT WE NU GEBRUIKEN", title: "GitHub Copilot-credits",
      fig: "≈ 4", figsub: "onderzoeken per maand",
      body: "€19 per maand koopt een pot credits die per woord leegloopt. Ons werk leegt hem snel, en de pot is gedeeld met het hele bedrijf — daarom raakt hij op.",
    },
    {
      x: 6.93, tone: "navy", eyebrow: "VAST BEDRAG — WAT WIJ VRAGEN", title: "Een AI-abonnement",
      fig: "≈ 50", figsub: "onderzoeken per week",
      body: "Claude Pro, ChatGPT Plus of gelijkwaardig — €20 per maand, niet per verbruik. Je grens is hoeveel je het op een dag gebruikt, niet hoeveel tekst het leest. Zelfde prijs, ruwweg vijftig keer zoveel werk.",
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
    x: 0.7, y: 5.06, w: 11.93, h: 1.62, rectRadius: 0.1,
    fill: { color: TINT }, line: { color: "DCE4F0", width: 1 }, shadow: shadow(),
  });
  s.addText("Waarom het verschil zo groot is", {
    x: 1.06, y: 5.26, w: 11.2, h: 0.3, margin: 0,
    fontFace: FONT, fontSize: 13, bold: true, color: NAVY,
  });
  s.addText(
    "95% van wat we verbruiken is de assistent die materiaal herleest dat hij al gekregen heeft. Credits rekenen de volle prijs voor elk woord van dat herlezen; een abonnement rekent er niets voor. Één abonnement van €20 levert ruwweg €1.000 per maand aan verbruik op — ongeveer vijf keer onze hele gedeelde creditpot, vanuit één licentie. Dat komt door hoe het abonnement geprijsd is, niet door welke leverancier we kiezen.",
    { x: 1.06, y: 5.58, w: 11.2, h: 0.98, margin: 0, fontFace: FONT, fontSize: 12, color: GREY, lineSpacing: 17, valign: "top" }
  );
  footer(s);
  s.addNotes(
    "Alle cijfers herberekend op 2026-08-19 uit de tokenaantallen van lab-chat-poc, niet uit de gelogde kostenkolom " +
    "(die houdt bij de drie nieuwste chats een lopend totaal bij en zou dubbeltellen). Een 'onderzoek' is één hele " +
    "case van begin tot eind — log lezen, software lezen, oorzaak vinden, uitwerken. Hoort de zaal 'één vraag', " +
    "dan leest de hele kostenslide als onzin; definieer de eenheid dus vóór je de cijfers laat zien. €4,44 per " +
    "onderzoek vervangt de oudere €3,91. Elk gemeten cijfer op deze slide komt uit Claude-gebruik, want dat is wat " +
    "we gedraaid hebben — ChatGPT Plus kost dezelfde €20 met hetzelfde vaste-bedrag-mechanisme, maar de capaciteit " +
    "daarvan hebben we niet gemeten, dus claim de ≈50/week er niet voor. De leveranciersneutrale claim is die op " +
    "de slide: afrekenen per verbruik is het verkeerde instrument voor dit werk. Copilot ging op 1 juni 2026 over " +
    "op AI Credits: 1 credit = $0,01, afgerekend op tokens tegen dezelfde gepubliceerde tarieven als de API — " +
    "Copilot rekent dus GEEN opslag per token. Beweer dat niet; het argument is dat afrekenen per verbruik het " +
    "verkeerde instrument is, niet dat GitHub te veel vraagt. De ~50/week is een gefit plafond uit een bewust " +
    "conservatieve ondergrensfit; dat volhouden betekent constant afgeknepen worden, dus presenteer het als " +
    "capaciteit. Volledige onderbouwing: Rollout/AI-Plan-Pricing-Explained.md."
  );
}

/* ====================================================== 9 · what we start with */
function slideStart() {
  const s = lightSlide();
  heading(s, "Als we een ja krijgen", "Waar we mee beginnen", { ts: 32 });
  s.addText(
    "Er hoeft hier niets gebouwd te worden. Dit is een pilot met een vaste looptijd, één benoemde afdeling en een manier om te stoppen.",
    { x: 0.7, y: 1.56, w: 10.9, h: 0.4, margin: 0, fontFace: FONT, fontSize: 13, color: GREY, valign: "top" }
  );

  const cards = [
    { n: 1, eyebrow: "WAT WIJ VRAGEN", title: "Drie licenties", body: "Drie mensen die dit werk doen, elk één abonnement. Wie dat zijn ligt nog niet vast — dat hoort bij de vraag, en dit is de kleinste versie die iets bewijst." },
    { n: 2, eyebrow: "ZES WEKEN", title: "De labpilot", body: "Lab gebruikt het op echt werk in bouw, FAT en installatie. Elke case wordt vastgelegd — ook die waar het antwoord fout was." },
    { n: 3, eyebrow: "WAT WE TERUGBRENGEN", title: "Een gemeten getal", body: "Tijd van probleem tot onderbouwd antwoord, en hoe vaak het een gang naar een Software Engineer scheelde. We vragen het aan wie de vraag stelde." },
    { n: 4, eyebrow: "HOE HET STOPT", title: "Een eerlijke uitgang", body: "Wil Lab het na zes weken niet houden, dan zeggen we dat en stopt het daar. Geen uitbreiding zonder bewijs." },
  ];
  const cw = 2.93, gx = 0.23;
  cards.forEach((c, i) =>
    numberCard(s, { ...c, x: 0.7 + i * (cw + gx), y: 2.16, w: cw, h: 3.2, accent: i === 0 ? undefined : undefined })
  );

  s.addText(
    "Enthousiasme zonder toegezegde tijd telt als een nee — besluit twee vraagt dus om de uren van Lab, niet alleen om toestemming.",
    { x: 0.7, y: 5.62, w: 11.9, h: 0.35, margin: 0, fontFace: FONT, fontSize: 13, bold: true, italic: true, color: NAVY }
  );
  footer(s);
  s.addNotes(
    "De kern van deze slide is dat ja zeggen goedkoop en omkeerbaar is: drie licenties, zes weken en een " +
    "afgesproken manier om te stoppen. Claim NIET dat er al iemand klaarstaat — er zijn geen licenties toegewezen " +
    "en geen deelnemers gekozen, want dit overleg bepaalt juist of we zover komen. Op 'wie precies?' is het " +
    "eerlijke antwoord dat dat de volgende stap is en dat we die niet zetten voordat jullie ja zeggen. Hetzelfde " +
    "geldt voor de vraag of het nieuwe abonnementen zijn of omgezette Copilot-licenties — besluit één bepaalt dat."
  );
}

/* ============================================================= 10 · the ask */
function slideAsk() {
  const s = darkSlide();
  heading(s, "Wat we van jullie nodig hebben", "Twee besluiten", { dark: true, ts: 32 });
  s.addText(
    "Geen budgetpost en geen project. Twee antwoorden, en de labpilot kan starten.",
    { x: 0.7, y: 1.62, w: 10.9, h: 0.4, margin: 0, fontFace: FONT, fontSize: 13.5, color: ICE, valign: "top" }
  );

  const asks = [
    { n: 1, eyebrow: "BESLUIT ÉÉN", title: "Hoe we licenties nemen", body: "Keur een abonnement met vast bedrag goed — Claude Pro, ChatGPT Plus of gelijkwaardig — voor wie dit werk doet, of vul anders de gedeelde Copilot-credits aan. Voor dezelfde prijs per persoon doet het abonnement veel meer werk; de echte vraag is of we er één als tool goedkeuren." },
    { n: 2, eyebrow: "BESLUIT TWEE", title: "Groen licht voor het Lab", body: "Toestemming voor Lab om de pilot van zes weken op echt werk te draaien, en de uren voor twee mensen. Wie die twee zijn en wanneer ze starten regelen wij zodra jullie ja zeggen. Ze stellen ons de vragen al; dit laat ze het aan de tool vragen." },
  ];
  const cw = 5.83, gx = 0.27;
  asks.forEach((a, i) =>
    numberCard(s, { ...a, x: 0.7 + i * (cw + gx), y: 2.4, w: cw, h: 2.9, dark: true, accent: SUN })
  );

  s.addText("En één ding voor later, niet nu: een gedeelde machine die altijd aanstaat, zodat de dienst centraal draait.", {
    x: 0.7, y: 5.52, w: 11.9, h: 0.35, margin: 0, fontFace: FONT, fontSize: 12.5, color: AEG, valign: "top",
  });
  s.addText(
    "In ruil brengen we een gemeten getal terug: Software Engineer-uren die teruggaan naar de productketen.",
    { x: 0.7, y: 6.0, w: 11.9, h: 0.4, margin: 0, fontFace: FONT, fontSize: 15, bold: true, color: SUN, valign: "top" }
  );
  footer(s, true);
  s.addNotes(
    "Sluit af met de twee besluiten en zwijg dan. Wil de zaal de licentievraag uitdiscussiëren, bied dan de " +
    "toelichting van één pagina aan (AI-Plan-Pricing-Explained.md) in plaats van live over cijfers te debatteren. " +
    "Willen ze besluit één uitstellen, vraag dan toch om besluit twee — de pilot kan starten op de huidige opzet, " +
    "alleen langzamer."
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
