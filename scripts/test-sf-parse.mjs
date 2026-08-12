#!/usr/bin/env node
/**
 * Smoke-test Salesforce product map + order-line parser (no browser).
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const window = {};
vm.runInNewContext(fs.readFileSync(path.join(root, "sf-product-map.js"), "utf8"), { window, console });

const src = fs.readFileSync(path.join(root, "entitlements.js"), "utf8");
const start = src.indexOf("function parseSfNumber");
const end = src.indexOf("function applySfParse");
if (start < 0 || end < 0 || end <= start) {
  throw new Error("Could not extract SF parse helpers from entitlements.js");
}
const sandbox = {
  window,
  console,
  Math,
  Number,
  String,
  Object,
  Array,
  RegExp,
  parseSfOrderPaste: null,
};
vm.runInNewContext(`${src.slice(start, end)}\nthis.parseSfOrderPaste = parseSfOrderPaste;`, sandbox);

const azurePaste = `
Product	Qty	# Units	Unit Measure	Provider	Region
JFrog Cloud Enterprise+ - MP	1	0		Azure	AZURE us-east / Virginia
Distribution Cloud Edge Nodes	2	0		Azure	AZURE us-east / Virginia
Base Data Consumption	1	10	TB	Azure	AZURE us-east / Virginia
Additional Data Consumption	1	500	TB	Azure	AZURE us-east / Virginia
Additional Platform Instance	2	0		Azure	AZURE us-east / Virginia;AZURE us-west / California
JFrog Curation Cloud - MP	1	200	Security Seats	Azure	AZURE us-east / Virginia	$45,000.00
Additional Curation Users - Cloud	1	3,300	Security Seats	Azure	AZURE us-east / Virginia	$12,500.00
Enterprise DevOps Assessment	1			Azure		$8,000.00
Refund - Proration credit - Co-term	1					($2,150.00)
$99,999.00
Net Amount	1
`.trim();

const parsed = sandbox.parseSfOrderPaste(azurePaste);
const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

assert(parsed.platform === "entplus", `platform=${parsed.platform}`);
assert(parsed.deployModel === "saas", `deployModel=${parsed.deployModel}`);
assert(parsed.iaas === "azure", `iaas=${parsed.iaas}`);
assert(parsed.edgeOps === "cloud", `edgeOps=${parsed.edgeOps}`);
assert(parsed.addons.edge === 2, `edge=${parsed.addons.edge}`);
assert(parsed.addons.additionalInstances === 2, `addl=${parsed.addons.additionalInstances}`);
assert(parsed.addons.curation === 1, "curation missing");
assert(parsed.securitySeats === 3500, `seats=${parsed.securitySeats}`);
assert(parsed.saasUnits === 510, `saasUnits=${parsed.saasUnits}`);
assert(parsed.regions.some((r) => r.region === "eastus" && r.primary === 1), "primary eastus");
assert(parsed.regions.some((r) => r.region === "westus" && r.additional === 1), "addl westus");
assert(parsed.regions.some((r) => r.region === "eastus" && r.additional === 1), "addl eastus");
assert(parsed.regions.some((r) => r.region === "eastus" && r.edge === 2), "edge eastus");
assert(parsed.report.ignored.length === 0, `commercial/money lines must not appear in ignored: ${JSON.stringify(parsed.report.ignored)}`);
assert(!parsed.report.unknown.some((n) => /\$|net amount|refund/i.test(n)), `money must not appear in unknown: ${JSON.stringify(parsed.report.unknown)}`);
assert(!parsed.report.matched.some((m) => /\$|refund|assessment/i.test(m.name)), "money/commercial must not appear in matched");

const onPremPaste = `
Product	Qty	# Units	Unit Measure	Provider	Region
JFrog Enterprise+ - MP	1	0		On-Prem	
Additional Artifactory servers	2	0		On-Prem	
`.trim();
const onPrem = sandbox.parseSfOrderPaste(onPremPaste);
assert(onPrem.platform === "entplus", `onPrem platform=${onPrem.platform}`);
assert(onPrem.deployModel === "selfmanaged", `onPrem deployModel=${onPrem.deployModel}`);
assert(onPrem.addons.additionalServers === 2, `onPrem servers=${onPrem.addons.additionalServers}`);

const cloudHit = window.JFROG_SF_PRODUCT_MAP.matchSfProduct("JFrog Cloud Enterprise+");
assert(cloudHit?.product?.action?.deployModel === "saas", "Cloud Enterprise+ must be SaaS");
const mpHit = window.JFROG_SF_PRODUCT_MAP.matchSfProduct("JFrog Enterprise+ MP");
assert(mpHit?.product?.action?.deployModel === "selfmanaged", "Enterprise+ MP must be On-Prem");
assert(mpHit.product.name !== cloudHit.product.name, "Cloud vs On-Prem MP must be distinct products");

const hybridPaste = `
Product	Qty	# Units	Unit Measure	Provider	Region
JFrog Cloud Enterprise+ - MP	1	0		Azure	AZURE us-east / Virginia
JFrog Enterprise+ - MP	1	0		On-Prem	
Additional Artifactory servers	3	0		On-Prem	
Additional Platform Instance	1	0		Azure	AZURE us-west / California
`.trim();
const hybrid = sandbox.parseSfOrderPaste(hybridPaste);
assert(hybrid.deployModel === "hybrid", `hybrid deployModel=${hybrid.deployModel}`);
assert(hybrid.platform === "entplus", `hybrid platform=${hybrid.platform}`);
assert(hybrid.saasPlatformQty === 1, `hybrid saasQty=${hybrid.saasPlatformQty}`);
assert(hybrid.selfManagedPlatformQty === 1, `hybrid smQty=${hybrid.selfManagedPlatformQty}`);
assert(hybrid.addons.additionalServers === 3, "hybrid additional servers");
assert(hybrid.addons.additionalInstances === 1, "hybrid additional instances");
assert(hybrid.report.hybrid === true, "hybrid report flag");
assert(hybrid.regions.some((r) => r.region === "eastus" && r.iaas === "azure" && r.siteKind === "saas" && r.primary === 1), "hybrid SaaS primary on Azure");
assert(hybrid.regions.some((r) => r.siteKind === "selfmanaged" && r.primary === 1), "hybrid On-Prem primary row");

const multiCloudPaste = `
Product	Qty	# Units	Unit Measure	Provider	Region
JFrog Cloud Enterprise+ - MP	1	0		GCP	GCP us-east1 / South Carolina
JFrog Enterprise+ - MP	1	0		Azure	AZURE eastus / Virginia
Additional Artifactory servers	2	0		Azure	AZURE eastus / Virginia
`.trim();
const multiCloud = sandbox.parseSfOrderPaste(multiCloudPaste);
assert(multiCloud.deployModel === "hybrid", `multiCloud deployModel=${multiCloud.deployModel}`);
assert(multiCloud.regions.some((r) => r.iaas === "gcp" && r.siteKind === "saas" && r.primary === 1), "SaaS on GCP");
assert(multiCloud.regions.some((r) => r.iaas === "azure" && r.siteKind === "selfmanaged" && r.primary === 1), "On-Prem on Azure");
assert(multiCloud.report.providers.includes("gcp") && multiCloud.report.providers.includes("azure"), `providers=${JSON.stringify(multiCloud.report.providers)}`);

const collapsedPaste = "JFrog Cloud Enterprise+ - MP 1 0 GCP GCP eu west-2 / London $0.00 $150,000.00 $0.00 Distribution Cloud Edge Nodes 2 0 GCP GCP eu west-2 / London $0.00 $0.00 $0.00 Base Data Consumption 1 10 TB GCP GCP eu west-2 / London $0.00 $0.00 $0.00 JFrog Curation Cloud - MP 1 200 Security Seats GCP GCP eu west-2 / London $0.00 $4,800.00 $75,200.00 Additional Curation Users - Cloud 1 4,300 Security Seats GCP GCP eu west-2 / London $0.00 $58,824.00 $921,576.00 Refund - Proration credit - Co-term 1 $0.00 $0.00 $0.00 $0.00 -$41,980.00 JFrog Enterprise+ MP 10 $23,700.00 $0.00 $0.00 $21,330.00 $191,970.00";
const collapsed = sandbox.parseSfOrderPaste(collapsedPaste);
assert(collapsed.deployModel === "hybrid", `collapsed deployModel=${collapsed.deployModel}`);
assert(collapsed.platform === "entplus", `collapsed platform=${collapsed.platform}`);
assert(collapsed.iaas === "gcp", `collapsed iaas=${collapsed.iaas}`);
assert(collapsed.addons.edge === 2, `collapsed edge=${collapsed.addons.edge}`);
assert(collapsed.saasUnits === 10, `collapsed saasUnits=${collapsed.saasUnits}`);
assert(collapsed.securitySeats === 4500, `collapsed seats=${collapsed.securitySeats}`);
assert(collapsed.selfManagedPlatformQty === 10, `collapsed onPrem qty=${collapsed.selfManagedPlatformQty}`);
assert(collapsed.notes === "", "collapsed paste must not be stored as notes");
assert(collapsed.report.ignored.length === 0, "collapsed commercial lines must stay out of ignored");
assert(!JSON.stringify(collapsed.report).includes("$"), "dollar amounts must not appear in parse report");
assert(collapsed.regions.some((r) => r.iaas === "gcp" && r.primary === 1), "collapsed SaaS primary on GCP");

const catalogPaste = `
Cloud Subscription, checked, Select row for Drill Down.
Cloud Subscription(73)
Qwak - Cloud
Cloud Usage(11)
Security(4)
Unified Security Bundle - Cloud
`.trim();

let threw = false;
try {
  sandbox.parseSfOrderPaste(catalogPaste);
} catch {
  threw = true;
}
assert(threw, "catalog tree should be rejected");

const hit = window.JFROG_SF_PRODUCT_MAP.matchSfProduct("Ultimate Security Bundle - Cloud");
assert(hit?.product?.action?.id === "ultimate", "ultimate map");

console.log("SF parse smoke tests passed.");
