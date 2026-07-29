// Velaris brand constants for Robotics-AI Word documents.
//
// Source of truth: Rollout/Brand/Velaris_brandbook_v1.05.pdf. These values match
// Rollout/Capability Overview/build-capability-doc.js exactly — if the brand changes,
// change it in both, or fold that script into this module.
//
// Brand rule: Microsoft documents (Word, PowerPoint) use Segoe UI. Museo is reserved
// for desktop-publishing material (brochures, flyers) and is not licensed here anyway.

const fs = require("fs");
const path = require("path");
const { Paragraph, TextRun, Header, Footer, ImageRun, PageNumber, BorderStyle } = require("docx");

// ---- Palette -------------------------------------------------------------
// Prussian Blue is the primary/dominant hue, Aegean Blue the secondary.
// Tuscan Sun (FFA400) is reserved by the brand book for calls-to-action only,
// so it is deliberately not used as a decorative accent in these documents.
const PRUSSIAN  = "1B355D";
const AEGEAN    = "6686B7";
const AEGEAN_DK = "3F5A86"; // readable weight of Aegean on light backgrounds
const TUSCAN    = "FFA400"; // CTA only — do not use for decoration

const INK   = "16233A";
const SOFT  = "47597A";
const FAINT = "7686A3";
const LINE  = "DBE2EE";
const WASH  = "F4F7FB"; // very light Aegean tint for table/code fills

const FONT      = "Segoe UI Light";
const FONT_BOLD = "Segoe UI";
const FONT_MONO = "Consolas";

// ---- Letterhead ----------------------------------------------------------
// "SKALAR, a Velaris brand" logo, extracted from Brand/SK_Document_format.docx.
// Native 2688x777px (3.459 aspect), placed top-left at ~1.93in wide.
const LOGO_PATH = path.join(__dirname, "..", "Capability Overview", "skalar-velaris-logo.png");

function header() {
  return new Header({
    children: [
      new Paragraph({
        spacing: { after: 0 },
        children: [
          new ImageRun({
            type: "png",
            data: fs.readFileSync(LOGO_PATH),
            transformation: { width: 184, height: 53 },
          }),
        ],
      }),
    ],
  });
}

// Footer carries the document name and a page number, so a printed copy passed
// around a meeting can still be identified and reassembled.
function footer(docLabel) {
  return new Footer({
    children: [
      new Paragraph({
        spacing: { before: 60 },
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: LINE } },
        children: [
          new TextRun({ text: docLabel, font: FONT, size: 15, color: FAINT }),
          new TextRun({ text: "\t\t", font: FONT, size: 15 }),
          new TextRun({ children: ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES], font: FONT, size: 15, color: FAINT }),
        ],
      }),
    ],
  });
}

const PAGE_MARGIN = { top: 1500, bottom: 1000, left: 1080, right: 1080 };

module.exports = {
  PRUSSIAN, AEGEAN, AEGEAN_DK, TUSCAN,
  INK, SOFT, FAINT, LINE, WASH,
  FONT, FONT_BOLD, FONT_MONO,
  LOGO_PATH, header, footer, PAGE_MARGIN,
};
