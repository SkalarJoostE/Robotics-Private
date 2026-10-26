// Builds flowcharts.html (the page shown to managers) from the NN-*.md flowchart files in this folder.
// The .md files are the source: edit those, then run `node build-flowcharts-page.js`.
// No npm packages needed. Each .md file must keep this shape:
//   # Title
//   > Asked as: ...
//   intro paragraph(s)
//   ```mermaid ... ```
//   ## Key points
//   - bullet
const fs = require("fs");
const path = require("path");

const dir = __dirname;
const outFile = path.join(dir, "flowcharts.html");

// Diagrams sit on a light sheet in both themes, so the Mermaid colours are pinned rather than
// left to whichever theme the viewer's renderer picks.
const MERMAID_INIT =
  "%%{init: {'theme':'base','themeVariables':{'fontFamily':'Nunito Sans, Segoe UI, sans-serif','fontSize':'15px'," +
  "'lineColor':'#47597a','primaryTextColor':'#16233a','textColor':'#16233a','edgeLabelBackground':'#ffffff'," +
  "'clusterBkg':'#f3f5f9','clusterBorder':'#b7cbe9'},'flowchart':{'curve':'basis','htmlLabels':true}}}%%\n";

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const inline = (s) =>
  esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");

function parse(file) {
  const text = fs.readFileSync(path.join(dir, file), "utf8").replace(/\r\n/g, "\n");
  const title = (text.match(/^# (.+)$/m) || [])[1];
  const asked = (text.match(/^> Asked as: (.+)$/m) || [])[1] || "";
  const mermaid = (text.match(/```mermaid\n([\s\S]*?)```/) || [])[1];
  if (!title || !mermaid) throw new Error(`${file}: needs a '# Title' and a mermaid block`);
  const afterAsked = text.split(/^> Asked as: .+$/m)[1] || "";
  const intro = afterAsked.split("```mermaid")[0].trim().split(/\n{2,}/).filter(Boolean);
  const section = (name) => (text.split(new RegExp(`^## ${name}$`, "m"))[1] || "").split(/^## /m)[0].trim();
  const points = section("Key points").split("\n").filter((l) => l.startsWith("- ")).map((l) => l.slice(2));
  const web = section("For a web version");
  const field = (key) => (web.match(new RegExp(`^${key}: (.+)$`, "m")) || [])[1] || "";
  const fitText = field("Fit");
  const fit = fitText ? { label: fitText.split(".")[0], why: fitText.slice(fitText.indexOf(".") + 1).trim() } : null;
  const needs = field("Needs").split(";").map((s) => s.trim()).filter(Boolean);
  for (const n of needs) if (!NEEDS.includes(n)) throw new Error(`${file}: unknown need '${n}' (allowed: ${NEEDS.join(", ")})`);
  const writes = field("Writes");
  const id = file.replace(/^\d+-/, "").replace(/\.md$/, "").replace(/[^a-z0-9-]/gi, "");
  const num = file.match(/^(\d+)/)[1];
  return { id, num, title, asked, intro, mermaid, points, fit, needs, writes };
}

// The fixed vocabulary for the "Needs:" line; also the column order of the summary table.
const NEEDS = [
  "Workspace files",
  "Windows scripts",
  "SVN via VPN",
  "Jira (read)",
  "Log reader",
  "File upload",
  "Robot application",
  "Engineer approval",
];
const fitClass = (label) => ({ Good: "good", Partial: "partial", "Engineer PC": "pc" })[label] || "partial";

const files = fs.readdirSync(dir).filter((f) => /^\d+-.+\.md$/.test(f)).sort();
const charts = files.map(parse);

const toc = charts
  .map((c) => `<li><a href="#${c.id}"><span class="n">${c.num}</span><span>${esc(c.title)}</span></a></li>`)
  .join("\n        ");

const sections = charts
  .map(
    (c) => `
  <section class="chart" id="${c.id}">
    <header class="chart-head">
      <span class="chart-num">${c.num}</span>
      <div class="chart-titles">
        <h2>${esc(c.title)}</h2>
        ${c.asked ? `<p class="asked">${inline(c.asked)}</p>` : ""}
      </div>
    </header>
    ${c.intro.map((p) => `<p class="intro">${inline(p.replace(/\n/g, " "))}</p>`).join("\n    ")}
    <div class="sheet"><pre class="mermaid">${esc(MERMAID_INIT + c.mermaid.trim())}</pre></div>
    <div class="notes">
    ${
      c.points.length
        ? `<div class="points"><h3>Key points</h3><ul>${c.points.map((p) => `<li>${inline(p)}</li>`).join("")}</ul></div>`
        : ""
    }
    ${
      c.fit
        ? `<aside class="web"><h3>For a web version</h3>
        <p><span class="fit ${fitClass(c.fit.label)}">${esc(c.fit.label)}</span> ${inline(c.fit.why)}</p>
        <ul class="needs">${c.needs.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>
        ${c.writes ? `<p class="writes"><strong>Writes:</strong> ${inline(c.writes)}</p>` : ""}
      </aside>`
        : ""
    }
    </div>
  </section>`
  )
  .join("\n");

const matrixRows = charts
  .filter((c) => c.fit)
  .map(
    (c) => `<tr>
          <th scope="row"><a href="#${c.id}">${esc(c.title)}</a></th>
          <td><span class="fit ${fitClass(c.fit.label)}">${esc(c.fit.label)}</span></td>
          ${NEEDS.map((n) => (c.needs.includes(n) ? `<td class="dot" aria-label="needed">●</td>` : `<td class="dot empty" aria-label="not needed"></td>`)).join("")}
        </tr>`
  )
  .join("\n        ");
const matrix = `<table class="matrix">
        <thead><tr><th scope="col">Flow</th><th scope="col">Web fit</th>${NEEDS.map((n) => `<th scope="col"><span>${esc(n)}</span></th>`).join("")}</tr></thead>
        <tbody>
        ${matrixRows}
        </tbody>
      </table>`;

const template = fs.readFileSync(path.join(dir, "page-template.html"), "utf8");
const html = template
  .replace("{{MATRIX}}", matrix)
  .replace("{{TOC}}", toc)
  .replace("{{SECTIONS}}", sections)
  .replace("{{COUNT}}", String(charts.length))
  .replace("{{BUILT}}", new Date().toISOString().slice(0, 10));
fs.writeFileSync(outFile, html);
console.log(`Wrote ${path.basename(outFile)} with ${charts.length} flowcharts`);
