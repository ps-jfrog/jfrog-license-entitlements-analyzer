#!/usr/bin/env node
/**
 * Headless DOM smoke test: region rows, multi-provider topology, diagram output.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

const dom = new JSDOM(html, { runScripts: "outside-only", url: "http://localhost/" });
const { window } = dom;

["sf-product-map.js", "license-data.js", "entitlements.js"].forEach((file) => {
  const full = path.join(root, file);
  if (fs.existsSync(full)) window.eval(fs.readFileSync(full, "utf8"));
});
window.document.dispatchEvent(new window.Event("DOMContentLoaded", { bubbles: true }));

const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};
const $ = (id) => window.document.getElementById(id);
const rows = () => Array.from(window.document.querySelectorAll("#regionList .region-row"));

assert(rows().length === 1, `expected one default region row, got ${rows().length}`);

// Hybrid: SaaS on GCP + On-Prem JPS on Azure must both reach the diagram.
window.document.querySelector('input[name="platform"][value="entplus"]').checked = true;
window.document.querySelector('input[name="deployModel"][value="hybrid"]').checked = true;
$("regionList").innerHTML = "";
window.addRegionRow({ iaas: "gcp", siteKind: "saas", region: "us-east1", primary: 1 });
window.addRegionRow({ iaas: "azure", siteKind: "selfmanaged", region: "eastus", primary: 1 });
window.addRegionRow({ iaas: "onprem", siteKind: "selfmanaged", region: "Primary DC", primary: 1 });

const collected = window.collectRegions();
assert(collected.length === 3, `collectRegions dropped rows: ${JSON.stringify(collected)}`);
assert(collected.some((r) => r.iaas === "onprem" && r.region === "Primary DC"), "On-Prem DC row missing");
assert(collected.some((r) => r.iaas === "azure" && r.siteKind === "selfmanaged"), "Azure On-Prem row missing");

// Switching a row's provider must keep a usable region name (not blank it out).
const row = rows()[0];
row.querySelector(".region-iaas").value = "onprem";
row.querySelector(".region-iaas").dispatchEvent(new window.Event("change", { bubbles: true }));
const afterSwitch = window.collectRegions();
assert(afterSwitch.length === 3, `provider switch dropped a row: ${JSON.stringify(afterSwitch)}`);
assert(afterSwitch[0].iaas === "onprem", "row provider did not switch to onprem");
assert(afterSwitch[0].region, "row lost its region name after provider switch");
assert(afterSwitch[0].siteKind === "selfmanaged", "On-Prem provider should default site to JPS");

// "+ Add region" must produce a row that actually shows up in the topology.
$("btnAddRegion").click();
const added = rows()[rows().length - 1];
assert(Number(added.querySelector(".qty-primary").value) > 0
  || Number(added.querySelector(".qty-additional").value) > 0
  || Number(added.querySelector(".qty-edge").value) > 0,
  "newly added region row has all-zero counts and is silently ignored");

// Blank region still draws under OTHER as (undefined).
$("regionList").innerHTML = "";
window.addRegionRow({ iaas: "onprem", siteKind: "selfmanaged", region: "(undefined)", primary: 1 });
assert(window.collectRegions().some((r) => r.region === "(undefined)" && r.iaas === "onprem"), "blank region should normalize to (undefined)");
$("btnAnalyze").click();
const blankSvg = window.__lastDiagramSvg || "";
assert(/OTHER \/ UNDEFINED/.test(blankSvg), "blank region must appear under OTHER");
assert(/\(undefined\)/.test(blankSvg), "blank region box should show (undefined)");
assert(/Primary JPS/.test(blankSvg), "On-Prem blank-region primary missing from diagram");
assert(!/CENTRAL REGIONS/.test(blankSvg) || !/CENTRAL \/ OTHER/.test(blankSvg), "undefined should not use old Central/Other label");

// Hybrid for remaining checks
$("regionList").innerHTML = "";
window.document.querySelector('input[name="deployModel"][value="hybrid"]').checked = true;
window.addRegionRow({ iaas: "gcp", siteKind: "saas", region: "us-east1", primary: 1 });
window.addRegionRow({ iaas: "azure", siteKind: "selfmanaged", region: "eastus", primary: 1 });
window.addRegionRow({ iaas: "onprem", siteKind: "selfmanaged", region: "Primary DC", primary: 1 });
$("btnAnalyze").click();
const svg = window.__lastDiagramSvg || "";
assert(svg.includes("<svg"), "no diagram rendered");
assert(/Primary JPS/.test(svg), "On-Prem primary (JPS) missing from diagram");
assert(/Primary JPD/.test(svg), "SaaS primary (JPD) missing from diagram");
assert(/On-Prem/.test(svg), "On-Prem provider label missing from diagram");
assert(/OTHER \/ UNDEFINED/.test(svg), "On-Prem DC must land in OTHER");
assert(!/CENTRAL \/ OTHER/.test(svg), "Central must no longer absorb OTHER");

// Client/network-access + JFrog-side routing overview band (hybrid: On-Prem region present).
assert(/On-Prem ↔ Cloud/.test(svg), "On-Prem ↔ Cloud connectivity box missing when an On-Prem region is present");
assert(/Direct Connect \+ VPN Gateway|ExpressRoute \+ VPN Gateway|Cloud Interconnect \+ Cloud VPN/.test(svg), "cloud-specific VPN/interconnect label missing");
assert(/Corporate DNS/.test(svg) && /Resolves \*\.pe\.jfrog\.io/.test(svg), "corporate DNS box missing *.pe.jfrog.io routing note");
assert(/Load Balancer/.test(svg), "load balancer box missing from access band");
assert(/Private Endpoint/.test(svg), "private endpoint box missing from access band");
assert(/JFrog-side DNS routing/.test(svg), "JFrog-side DNS routing box missing");
assert(/Manual failover \/ geo-location/.test(svg), "manual failover / geo-location routing note missing");
assert(/SSO \(SAML \/ OIDC\)/.test(svg), "SaaS/self-managed auth callout missing");
assert(/Monitoring —/.test(svg), "monitoring callout missing");

// Header must not overlap: title and product list live on separate lines.
const texts = [...svg.matchAll(/<text[^>]*y="(\d+(?:\.\d+)?)"[^>]*>([^<]*)<\/text>/g)]
  .map((m) => ({ y: Number(m[1]), value: m[2] }));
const titleNode = texts.find((t) => /Hybrid SaaS \+ On-Prem/.test(t.value));
assert(titleNode, "diagram title missing");
const productNode = texts.find((t) => t !== titleNode && /Distribution|Platform baseline/.test(t.value) && t.y < 60);
assert(productNode, "product line missing from header");
assert(productNode.y > titleNode.y, "product line must sit on its own line below the title");

// Footer summary and the right-hand note must not overlap.
function footerNoOverlap(markup, label) {
  const viewW = Number((markup.match(/viewBox="0 0 (\d+(?:\.\d+)?)/) || [])[1]);
  const footerTexts = [...markup.matchAll(/<text x="(-?\d+(?:\.\d+)?)"[^>]*y="(\d+(?:\.\d+)?)"[^>]*font-size="(\d+)"([^>]*)>([^<]*)<\/text>/g)]
    .map((m) => ({
      x: Number(m[1]),
      y: Number(m[2]),
      size: Number(m[3]),
      anchorEnd: /text-anchor="end"/.test(m[4]),
      value: m[5],
    }));
  const left = footerTexts.find((t) => /writable JPD/.test(t.value));
  const right = footerTexts.find((t) => /Undefined \/ non-geo|Only explicitly assigned/.test(t.value));
  assert(left && right, `${label}: footer strings missing`);
  const approxW = (t) => t.value.length * t.size * 0.58;
  const leftEnd = left.x + approxW(left);
  const rightStart = right.anchorEnd ? right.x - approxW(right) : right.x;
  const sameLine = Math.abs(left.y - right.y) < 6;
  if (sameLine) {
    assert(rightStart > leftEnd, `${label}: footer left "${left.value}" overlaps right note on one line`);
  }
  assert(right.x <= viewW, `${label}: right note escapes canvas width`);
  assert(leftEnd <= viewW, `${label}: footer left "${left.value}" is clipped by canvas width (${leftEnd.toFixed(0)} > ${viewW})`);
}
footerNoOverlap(svg, "hybrid");

// Full topology (primary + additional + edge) exercises both animated flows and
// gives the draw.io export something to connect.
$("regionList").innerHTML = "";
window.addRegionRow({ iaas: "aws", siteKind: "saas", region: "us-west-2", primary: 1 });
window.addRegionRow({ iaas: "aws", siteKind: "saas", region: "us-east-1", additional: 1 });
window.addRegionRow({ iaas: "onprem", siteKind: "selfmanaged", region: "Edge POP", edge: 2 });
$("btnAnalyze").click();
const flowSvg = window.__lastDiagramSvg || "";

// Animation ships inside the SVG so downloaded files animate too, is svg-scoped so it
// cannot leak into the host page (inline SVG shares the document style scope), and is pausable.
const styleBlock = (flowSvg.match(/<style>([\s\S]*?)<\/style>/) || [])[1];
assert(styleBlock, "diagram is missing its inline animation stylesheet");
assert(/@keyframes jfd-flow-fed/.test(styleBlock) && /@keyframes jfd-flow-dist/.test(styleBlock), "flow keyframes missing");
assert(/prefers-reduced-motion/.test(styleBlock), "animation must honour prefers-reduced-motion");
assert(/svg\.jfd-paused \.jfd-flow\s*\{\s*animation:\s*none/.test(styleBlock), "paused state must stop the animation");
styleBlock.split("\n")
  .map((line) => line.trim())
  .filter((line) => line.includes("{") && !line.startsWith("@") && !line.startsWith("to{"))
  .forEach((line) => {
    assert(/^svg[.\s]/.test(line), `diagram CSS rule "${line}" is not svg-scoped and would leak into the page`);
  });
assert(/class="jfd-flow jfd-flow-fed"/.test(flowSvg), "federation connectors are not animated");
assert(/class="jfd-flow jfd-flow-dist"/.test(flowSvg), "distribution connectors are not animated");

const mountedDiagram = window.document.querySelector("#results .diagram-wrap svg");
assert(mountedDiagram, "diagram is not mounted in the results panel");
$("btnToggleDiagramAnimation").click();
assert(mountedDiagram.classList.contains("jfd-paused"), "pause button must stop the animation");
assert($("btnToggleDiagramAnimation").textContent === "Play animation", "pause button label must flip to Play");
$("btnToggleDiagramAnimation").click();
assert(!mountedDiagram.classList.contains("jfd-paused"), "second click must resume the animation");
assert($("btnDownloadDrawio"), "draw.io download button missing from the diagram block");
assert($("btnDownloadPng"), "Lucid Spark PNG download button missing from the diagram block (Spark has no draw.io/xml import path)");

// draw.io export: native shapes plus real connected edges with flow animation,
// which is what makes the file importable into Lucidchart.
const drawio = window.__lastDiagramDrawio || "";
// No leading <?xml ...?> declaration and no non-standard header attributes — real
// app.diagrams.net exports never have either, and Lucid's importer sniffs this exact
// prefix to confirm the file is a genuine draw.io document before parsing it.
assert(/^<mxfile host="app\.diagrams\.net" agent="[^"]*" version="[^"]*">\n/.test(drawio), "draw.io export must start with a bare <mxfile host=\"app.diagrams.net\" ...> tag, no XML prologue");
assert(/<mxGraphModel /.test(drawio) && /<root>/.test(drawio), "draw.io export is missing the graph model");
assert(/Primary JPD 1/.test(drawio) && /Additional Instance 1/.test(drawio) && /Edge 2/.test(drawio),
  "draw.io export is missing topology nodes");
assert(!/<svg|&lt;svg/.test(drawio), "draw.io export must be native shapes, not an embedded image");
const drawioNodeIds = [...drawio.matchAll(/<mxCell id="(n\d+)"/g)].map((m) => m[1]);
assert(drawioNodeIds.length === 4, `expected 4 draw.io node shapes, got ${drawioNodeIds.length}`);
assert(new Set(drawioNodeIds).size === drawioNodeIds.length, "draw.io node ids must be unique");
const drawioEdges = [...drawio.matchAll(/style="([^"]*)" edge="1" parent="1" source="([^"]+)" target="([^"]+)"/g)];
const animatedEdges = drawioEdges.filter(([, style]) => /flowAnimation=1/.test(style));
assert(animatedEdges.length === 3, `expected 3 flow-animated draw.io connectors (1 federation + 2 distribution), got ${animatedEdges.length}`);
animatedEdges.forEach(([, , source, target]) => {
  assert(drawioNodeIds.includes(source) && drawioNodeIds.includes(target),
    `draw.io edge points at a missing shape (${source} -> ${target})`);
});

// Client/network-access + JFrog-side routing overview band exports as native shapes too.
// Every edge (animated or not) must be a real source->target connector pointing at a real
// shape — Lucid's draw.io importer rejects the *entire file* on a source/target-less "point"
// edge (an <mxCell edge="1"> with only sourcePoint/targetPoint geometry), so none may exist.
assert(/Private Endpoint/.test(drawio) && /Load Balancer/.test(drawio) && /Corporate DNS/.test(drawio),
  "draw.io export is missing the client/network-access band");
assert(/JFrog-side DNS routing/.test(drawio), "draw.io export is missing the JFrog-side DNS routing box");
assert(!/sourcePoint|targetPoint/.test(drawio), "draw.io export must not contain source/target-less point edges (Lucid rejects the whole file)");
assert(drawioEdges.length > animatedEdges.length, "expected additional non-animated connectors for the client/network-access + routing band");
const allShapeIds = [...drawio.matchAll(/<mxCell id="([^"]+)"[^>]* vertex="1"/g)].map((m) => m[1]);
drawioEdges.forEach(([, , source, target]) => {
  assert(allShapeIds.includes(source) && allShapeIds.includes(target),
    `draw.io edge points at a missing shape (${source} -> ${target})`);
});
// This scenario's Edge POP is an On-Prem row, so the VPN/connectivity box is expected here.
assert(/On-Prem ↔ Cloud/.test(drawio), "On-Prem ↔ Cloud box missing even though an On-Prem region is present");

// Cloud-provider icons (this scenario mixes AWS + GCP + On-Prem regions) must be fully
// self-contained embedded images, never a reference to draw.io's internal shape-library
// names — those were guessed by naming convention for GCP, never confirmed against
// draw.io's actual registry, and silently rendered blank ("images missing") for users.
assert(/image=data:image\/svg\+xml;base64,[A-Za-z0-9+/=]+;/.test(drawio),
  "draw.io export is missing embedded (data: URI) cloud-provider icons");
assert(!/shape=mxgraph\.(aws4|gcp2)\./.test(drawio),
  "draw.io export must not reference internal aws4/gcp2 stencil names — embed the icon as a self-contained image instead");

// Narrow single-region SaaS with edges + consumption — the case the user reported spilling.
$("regionList").innerHTML = "";
window.document.querySelector('input[name="deployModel"][value="saas"]').checked = true;
window.document.querySelector('input[name="platform"][value="entplus"]').checked = true;
window.document.querySelectorAll("[data-addon]").forEach((r) => {
  const id = r.getAttribute("data-addon");
  const cb = r.querySelector('input[type="checkbox"]');
  const q = r.querySelector('input[type="number"]');
  if (id === "edge") { cb.checked = true; q.value = "2"; }
  else { cb.checked = false; }
});
window.document.querySelector('input[name="edgeOps"][value="cloud"]').checked = true;
$("saasUnits").value = "10";
$("saasUnitSizeGB").value = "1000";
window.addRegionRow({ iaas: "aws", siteKind: "saas", region: "us-east-1", primary: 1, edge: 2 });
$("btnAnalyze").click();
footerNoOverlap(window.__lastDiagramSvg, "narrow-saas");

// Pure-cloud SaaS with no On-Prem region — the VPN/connectivity box must not appear.
assert(!/On-Prem ↔ Cloud/.test(window.__lastDiagramSvg || ""), "On-Prem ↔ Cloud box should not appear without an On-Prem region (SVG)");
assert(!/On-Prem ↔ Cloud/.test(window.__lastDiagramDrawio || ""), "On-Prem ↔ Cloud box should not appear without an On-Prem region (draw.io)");

// True Central geography still uses CENTRAL (not OTHER).
$("regionList").innerHTML = "";
window.addRegionRow({ iaas: "gcp", siteKind: "saas", region: "us-central1", primary: 1 });
$("btnAnalyze").click();
const centralSvg = window.__lastDiagramSvg || "";
assert(/CENTRAL REGIONS/.test(centralSvg), "us-central1 must stay in CENTRAL");
assert(!/OTHER \/ UNDEFINED/.test(centralSvg), "true central geo must not open OTHER column");

// Report export: HTML/PDF buttons must exist and produce a self-contained document
// from the currently rendered results, with interactive controls stripped out.
assert($("btnExportHtml"), "btnExportHtml missing from DOM");
assert($("btnExportPdf"), "btnExportPdf missing from DOM");
assert(window.hasReportContent(), "hasReportContent should be true after Analyze");

$("customerName").value = "Acme Corp";
$("btnAnalyze").click();
const { html: reportHtml, filenameBase } = window.buildReportDocument();
assert(filenameBase === "acme-corp", `unexpected report filename base: ${filenameBase}`);
assert(reportHtml.includes("<svg"), "report is missing the architecture diagram");
assert(reportHtml.includes("Acme Corp"), "report is missing the customer name");
assert(/result-block/.test(reportHtml), "report is missing result sections");
assert(!/id="btnDownloadDiagram"/.test(reportHtml), "report should not include interactive buttons");
assert(!/<button/.test(reportHtml), "report should not include any <button> elements");

$("regionList").innerHTML = "";
$("customerName").value = "";
window.render(null);
assert(!window.hasReportContent(), "hasReportContent should be false before any Analyze");

console.log("UI smoke tests passed.");
