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
assert(/Corporate DNS/.test(svg) && /Conditional forwarder/.test(svg), "corporate DNS box missing its conditional-forwarder note when On-Prem is present");
assert(/DNS Resolver Endpoint/.test(svg), "cloud-side DNS resolver endpoint (inbound) box missing when On-Prem is present");
assert(/R53 Resolver \(inbound\)|DNS Private Resolver|Cloud DNS \(inbound\)|Corp DNS resolver/.test(svg), "cloud-specific inbound resolver label missing");
assert(/Load Balancer/.test(svg), "load balancer box missing from access band");
assert(/Private Endpoint/.test(svg), "private endpoint box missing from access band");
assert(/JFrog-side DNS routing/.test(svg), "JFrog-side DNS routing box missing");
assert(/Manual failover \/ geo-location/.test(svg), "manual failover / geo-location routing note missing");
assert(/SSO \(SAML \/ OIDC\)/.test(svg), "SaaS/self-managed auth callout missing");
assert(/Monitoring —/.test(svg), "monitoring callout missing");

// Header must not overlap: title and product list live on separate lines.
const texts = [...svg.matchAll(/<text[^>]*y="(\d+(?:\.\d+)?)"[^>]*>([^<]*)<\/text>/g)]
  .map((m) => ({ y: Number(m[1]), value: m[2] }));
const titleNode = texts.find((t) => /Hybrid Fully Managed \+ Self Managed/.test(t.value));
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

// The geography lane boxes (WEST/CENTRAL/EAST/OTHER REGIONS) must stop clear above the
// Monitoring line in the footer — regression for a real bug where the lane rect's height
// only left room for the footer's own 2 lines, not the extra Monitoring line squeezed in
// above them, so the lane box's bottom edge clipped into the Monitoring text's ascenders.
function regionsNoOverlapMonitoring(markup, label) {
  const laneRects = [...markup.matchAll(/<rect x="([0-9.]+)" y="([0-9.]+)" width="([0-9.]+)" height="([0-9.]+)" rx="8"/g)]
    .map((m) => ({ y: Number(m[2]), h: Number(m[4]) }));
  const monitorText = [...markup.matchAll(/<text x="(-?\d+(?:\.\d+)?)" y="(\d+(?:\.\d+)?)"[^>]*>(Monitoring[^<]*)<\/text>/g)]
    .map((m) => ({ y: Number(m[2]) }));
  assert(laneRects.length, `${label}: no geography lane boxes found`);
  assert(monitorText.length, `${label}: Monitoring line not found`);
  const laneBottom = Math.max(...laneRects.map((r) => r.y + r.h));
  const monitorY = Math.min(...monitorText.map((t) => t.y));
  // ~9px ascender headroom above the text baseline is enough to catch a real clip.
  assert(monitorY - 9 >= laneBottom, `${label}: lane box bottom (${laneBottom}) overlaps Monitoring line (baseline ${monitorY})`);
}
regionsNoOverlapMonitoring(svg, "hybrid");

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
assert(/@keyframes jfd-flow-net/.test(styleBlock) && /@keyframes jfd-flow-route/.test(styleBlock) && /@keyframes jfd-flow-bypass/.test(styleBlock),
  "flow keyframes for the access/routing/bypass connectors are missing — every arrow should animate, not just federation/distribution");
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
assert(/class="jfd-flow jfd-flow-net"/.test(flowSvg), "client/network-access chain connectors are not animated");
assert(/class="jfd-flow jfd-flow-route"/.test(flowSvg), "JFrog-side routing fan-out connectors are not animated");
assert(/class="jfd-flow jfd-flow-bypass"/.test(flowSvg), "optional client-bypass connector is not animated");

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
// Must be the bare-comma short form (no ";base64," at all): mxGraph/draw.io's style
// parser splits the whole style string on ";", so any literal ";" inside the image= value
// (encoded as %3B or not) truncates it and the icon renders blank when opened in draw.io.
// draw.io's own postProcessCellStyle inserts ";base64," before the comma at render time —
// confirmed against the live draw.io app, including real .drawio files out on GitHub that
// get this wrong and silently render blank icons.
assert(/image=data:image\/svg\+xml,[A-Za-z0-9+/=]+;/.test(drawio),
  "draw.io export is missing embedded (data: URI) cloud-provider icons, or isn't using the bare-comma short form draw.io expects");
assert(!/image=data:image\/svg\+xml(;|%3B)base64,/.test(drawio),
  "draw.io style string contains a \";base64,\" (literal or %3B-encoded) inside the image= data URI — draw.io will truncate it and render a blank icon");
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
regionsNoOverlapMonitoring(window.__lastDiagramSvg, "narrow-saas");

// Pure-cloud SaaS with no On-Prem region — on-prem CI/CD clients connecting to this
// instance are a scenario every customer has regardless of their purchased topology, so
// the VPN/conditional-forwarder/resolver-endpoint path is always drawn, never gated behind
// whether the order happens to include an actual On-Prem JPS region.
assert(/On-Prem ↔ Cloud/.test(window.__lastDiagramSvg || ""), "On-Prem ↔ Cloud connectivity box should always be shown, regardless of the purchased topology (SVG)");
assert(/On-Prem ↔ Cloud/.test(window.__lastDiagramDrawio || ""), "On-Prem ↔ Cloud connectivity box should always be shown, regardless of the purchased topology (draw.io)");
assert(/public: via JFrog DNS routing/.test(window.__lastDiagramSvg || ""), "public/no-private-connectivity bypass label missing for a pure-SaaS scenario");

// A region row's own Site Kind is the source of truth for whether PrivateLink/PSC +
// MyJFrog DNS Routing apply — not the separate top-level Deploy Model radio, which can
// drift out of sync with it (left on "SaaS" while a row is explicitly marked "On-Prem
// JPS" on a cloud provider like AWS). Regression for a real bug: the SaaS-only Private
// Endpoint / JFrog-side DNS routing / VPN / DNS Resolver boxes used to still render,
// dangling with zero connections, whenever this mismatch happened.
$("regionList").innerHTML = "";
window.document.querySelector('input[name="deployModel"][value="saas"]').checked = true;
window.addRegionRow({ iaas: "aws", siteKind: "selfmanaged", region: "us-east-1", primary: 1 });
$("btnAnalyze").click();
const mismatchSvg = window.__lastDiagramSvg || "";
assert(/Primary JPS 1/.test(mismatchSvg), "self-managed site should render as a JPS");
assert(!/JFrog-side DNS routing/.test(mismatchSvg), "self-managed-only topology must not draw JFrog-side DNS routing, even with Deploy Model left on SaaS");
assert(!/Private Endpoint\(s\)/.test(mismatchSvg), "self-managed-only topology must not draw a Private Endpoint box, even with Deploy Model left on SaaS");
assert(!/On-Prem ↔ Cloud/.test(mismatchSvg), "self-managed-only topology has no PrivateLink chain to bridge into, so no VPN box either");
assert(/Primary LB 1/.test(mismatchSvg) && /no MyJFrog DNS routing or Private Endpoints/.test(mismatchSvg), "self-managed regional LB band missing");
regionsNoOverlapMonitoring(mismatchSvg, "self-managed mismatch");

// Self-managed multi-site: both Datacenter and Cloud client populations are always shown
// (even when every site happens to run on a cloud IaaS), each writable site gets its own
// regional Load Balancer, and Primary/Additional still federate with each other.
$("regionList").innerHTML = "";
window.addRegionRow({ iaas: "aws", siteKind: "selfmanaged", region: "us-east-1", primary: 2 });
window.addRegionRow({ iaas: "azure", siteKind: "selfmanaged", region: "westeurope", additional: 2 });
$("btnAnalyze").click();
const smSvg = window.__lastDiagramSvg || "";
assert(/Datacenter clients/.test(smSvg), "Datacenter clients box should always be shown for self-managed, not just when an on-prem region is present");
assert(/Cloud clients/.test(smSvg), "Cloud clients box should always be shown for self-managed");
assert((smSvg.match(/Primary LB \d/g) || []).length === 2, "expected one regional LB per Primary site");
assert((smSvg.match(/Additional LB \d/g) || []).length === 2, "expected one regional LB per Additional site");
assert(/Repository (Federation|Replication)/.test(smSvg), "self-managed Primary/Additional sites should still federate/replicate with each other");
const smDrawio = window.__lastDiagramDrawio || "";
assert(!/sourcePoint|targetPoint/.test(smDrawio), "self-managed regional LB edges must not be bare source/target-less point edges");

// Self-managed: Datacenter clients reach a cloud-hosted JPS over a VPN; Cloud clients
// bypass it (already inside the same network); a single Global Load Balancer sits
// between the client band and the per-site Regional LBs, routing by active JPD(s).
assert(/Cloud ↔ Private DC VPN/.test(smSvg), "self-managed VPN hop missing");
assert(/Global Load Balancer/.test(smSvg), "self-managed Global Load Balancer missing");
assert(/Cloud clients/.test(smSvg) && /Global Load Balancer/.test(smSvg), "Cloud clients / Global LB boxes should sit in the same row (no VPN hop between them)");
const smNodeIds = [...smDrawio.matchAll(/<mxCell id="([^"]+)"[^>]* vertex="1"/g)].map((m) => m[1]);
const smEdges = [...smDrawio.matchAll(/edge="1" parent="1" source="([^"]+)" target="([^"]+)"/g)];
assert(smEdges.every(([, s, t]) => smNodeIds.includes(s) && smNodeIds.includes(t)), "self-managed VPN/Global LB edges must point at real shapes");
// Only the Global LB feeds the Regional LBs — not every access-band node (a stale bug
// used to wire every client/VPN box straight to every Regional LB too).
assert(smEdges.filter(([, s, t]) => /^smlb/.test(t)).every(([, s]) => s === "acgloballb"),
  "only the Global Load Balancer should feed the Regional LB boxes");

// The 2×2 self-managed access grid (Datacenter/Cloud clients left, VPN/Global LB right)
// must be wired with plain horizontal/vertical connectors only — never a diagonal —
// and the "REGIONAL LOAD BALANCERS" band label must clear the horizontal client→LB bus
// underneath it (regression: they used to sit only ~4px apart, so the bus line clipped
// straight into the label text as soon as any Regional LB boxes were added).
const smLines = [...smSvg.matchAll(/<line x1="(-?[\d.]+)" y1="(-?[\d.]+)" x2="(-?[\d.]+)" y2="(-?[\d.]+)"[^>]*class="jfd-flow jfd-flow-net"/g)]
  .map((m) => ({ x1: +m[1], y1: +m[2], x2: +m[3], y2: +m[4] }));
assert(smLines.length > 0, "self-managed access band should have plain <line> connectors");
assert(smLines.every((l) => l.x1 === l.x2 || l.y1 === l.y2), "self-managed access-band connectors must be strictly horizontal or vertical (right-angled), never diagonal");
const smLabelText = [...smSvg.matchAll(/<text x="(-?[\d.]+)" y="([\d.]+)"[^>]*>(REGIONAL LOAD BALANCERS[^<]*)<\/text>/g)]
  .map((m) => ({ y: +m[2] }));
assert(smLabelText.length, "REGIONAL LOAD BALANCERS band label missing");
const smBusYs = smLines.filter((l) => l.y1 === l.y2 && l.y1 > smLabelText[0].y).map((l) => l.y1);
if (smBusYs.length) {
  assert(Math.min(...smBusYs) - smLabelText[0].y >= 10, "the client→LB bus line sits too close under the REGIONAL LOAD BALANCERS label and will clip its text");
}

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

// Every diagram connector must be a right-angled line/elbow, never a diagonal bezier
// curve, and must render to real numbers — regression for arrows that used to cut
// diagonally across the diagram (and could overlap boxes/labels as a result).
function assertRightAngledOnly(svg, label) {
  const paths = [...svg.matchAll(/<path d="([^"]+)"/g)].map((m) => m[1]);
  assert(paths.every((p) => !p.includes(" C ")), `${label}: diagram still contains a diagonal bezier curve (" C ") — every connector must be a straight line or right-angled elbow`);
  assert(paths.every((p) => !/NaN|undefined/.test(p)), `${label}: a connector path contains NaN/undefined — geometry inputs are missing`);
  const lines = [...svg.matchAll(/<line x1="(-?[\d.]+)" y1="(-?[\d.]+)" x2="(-?[\d.]+)" y2="(-?[\d.]+)"/g)]
    .map((m) => ({ x1: +m[1], y1: +m[2], x2: +m[3], y2: +m[4] }));
  assert(lines.every((l) => l.x1 === l.x2 || l.y1 === l.y2), `${label}: a <line> connector is diagonal (neither x1===x2 nor y1===y2)`);
}
$("regionList").innerHTML = "";
window.document.querySelector('input[name="deployModel"][value="hybrid"]').checked = true;
window.addRegionRow({ iaas: "gcp", siteKind: "saas", region: "us-east1", primary: 2 });
window.addRegionRow({ iaas: "azure", siteKind: "saas", region: "westeurope", additional: 2 });
window.addRegionRow({ iaas: "onprem", siteKind: "selfmanaged", region: "Primary DC", primary: 1, edge: 2 });
$("btnAnalyze").click();
assertRightAngledOnly(window.__lastDiagramSvg || "", "hybrid multi-site");
// draw.io only routes an edge as right-angled when edgeStyle=orthogonalEdgeStyle is set —
// without it, an edge between boxes that aren't x/y-aligned renders as a diagonal line
// regardless of the exit/entry side chosen.
const hybridDrawio = window.__lastDiagramDrawio || "";
const hybridEdgeStyles = [...hybridDrawio.matchAll(/<mxCell id="s\d+" value="[^"]*" style="([^"]*)" edge="1"/g)].map((m) => m[1]);
assert(hybridEdgeStyles.length > 0, "expected draw.io edges in hybrid scenario");
assert(hybridEdgeStyles.every((s) => s.includes("edgeStyle=orthogonalEdgeStyle")),
  "every draw.io connector must set edgeStyle=orthogonalEdgeStyle or it can render as a diagonal line");

$("regionList").innerHTML = "";
window.document.querySelector('input[name="deployModel"][value="selfmanaged"]').checked = true;
window.addRegionRow({ iaas: "aws", siteKind: "selfmanaged", region: "us-east-1", primary: 2 });
window.addRegionRow({ iaas: "azure", siteKind: "selfmanaged", region: "westeurope", additional: 2 });
window.addRegionRow({ iaas: "onprem", siteKind: "selfmanaged", region: "Primary DC", additional: 1 });
$("btnAnalyze").click();
assertRightAngledOnly(window.__lastDiagramSvg || "", "self-managed multi-site");

console.log("UI smoke tests passed.");
