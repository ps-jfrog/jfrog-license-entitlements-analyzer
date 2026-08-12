/**
 * JFrog License Entitlements Analyzer
 * Internal PS helper — verify against contract / account team before committing to a customer.
 *
 * Sources:
 * - https://jfrog.com/pricing/
 * - https://docs.jfrog.com/projects/docs/projects-subscription-allocation
 * - https://docs.jfrog.com/installation/docs/feature-comparison-matrix-for-self-mangaged-jpds
 * - new-member-onboarding-labs Ch 03 licenses quick reference
 */

const LATEST_LICENSE_DATA = typeof window !== "undefined"
  ? window.JFROG_LICENSE_DATA || null
  : null;
const DATA_AS_OF = LATEST_LICENSE_DATA?.generatedAt
  ? LATEST_LICENSE_DATA.generatedAt.slice(0, 10)
  : "2026-08-04";

/** @typedef {"pro"|"prox"|"entx"|"entplus"} PlatformTier */
/** @typedef {"saas"|"selfmanaged"|"hybrid"} DeployModel */

const PLATFORM_RANK = { pro: 1, prox: 2, entx: 3, entplus: 4 };

const PLATFORM = {
  pro: {
    id: "pro",
    name: "Pro",
    model: "saas",
    headline: "SaaS repos + RBv2 + CI — no Xray / SSO",
    serversIncluded: null,
    sitesPerSubscription: 1,
    projects: 3,
    projectsExtensible: false,
    saasBaseConsumptionGB: 25,
    support: "Community",
    ha: false,
    features: {
      artifactory: true,
      rbv2: true,
      xray: false,
      sso: false,
      ha: false,
      federation: false,
      replication: false,
      workers: false,
      accessFederation: false,
      distribution: false,
      evidenceGraph: false,
      thirdPartyEvidence: false,
      logStreaming: false,
      smartArchiving: false,
      missionControl: false,
      connect: false,
    },
  },
  prox: {
    id: "prox",
    name: "Pro X",
    model: "selfmanaged",
    headline: "Self-managed single-node + baseline SCA (Xray)",
    serversIncluded: 1,
    sitesPerSubscription: 1,
    projects: 3,
    projectsExtensible: false,
    saasBaseConsumptionGB: null,
    support: "24/7 SLA",
    ha: false,
    features: {
      artifactory: true,
      rbv2: true,
      xray: true,
      sso: false,
      ha: false,
      federation: false,
      replication: false,
      workers: false,
      accessFederation: false,
      distribution: false,
      evidenceGraph: false,
      thirdPartyEvidence: false,
      logStreaming: false,
      smartArchiving: false,
      missionControl: false,
      connect: false,
    },
  },
  entx: {
    id: "entx",
    name: "Enterprise X",
    model: "both",
    headline: "HA + SSO + federation + baseline SCA",
    serversIncluded: 3,
    sitesPerSubscription: 1,
    projects: 30,
    projectsExtensible: false,
    saasBaseConsumptionGB: 125,
    support: "24/7 SLA",
    ha: true,
    features: {
      artifactory: true,
      rbv2: true,
      xray: true,
      sso: true,
      ha: true,
      federation: true,
      replication: true,
      workers: true,
      accessFederation: false,
      distribution: false,
      evidenceGraph: true,
      thirdPartyEvidence: false,
      logStreaming: false,
      smartArchiving: false,
      missionControl: false,
      connect: true,
    },
  },
  entplus: {
    id: "entplus",
    name: "Enterprise +",
    model: "both",
    headline: "Access Federation + Distribution + global topologies",
    serversIncluded: 6,
    sitesPerSubscription: 1,
    projects: 300,
    projectsExtensible: true,
    projectBucketSize: 100,
    saasBaseConsumptionGB: null, // custom / negotiated
    support: "High-touch (assigned TAL)",
    ha: true,
    features: {
      artifactory: true,
      rbv2: true,
      xray: true,
      sso: true,
      ha: true,
      federation: true,
      replication: true,
      workers: true,
      accessFederation: true,
      distribution: true,
      evidenceGraph: true,
      thirdPartyEvidence: true,
      logStreaming: true,
      smartArchiving: "addon",
      missionControl: true,
      connect: true,
    },
  },
};

/** Security / product add-ons that appear on orders */
const ADDONS = {
  unified: {
    id: "unified",
    name: "Unified Security Bundle",
    requires: ["entx", "entplus"],
    baseSeats: null,
    includes: ["curation", "jas", "runtimeIntegrity", "agenticRemediation", "ideExtControl", "snippetDetection"],
    excludes: ["catalog", "apptrust", "transitiveCA"],
    note: "SF: Unified Security Bundle - Cloud / SH. Contributor base refreshed from Pricing (Ent X 50 / Ent+ 200); order overrides.",
  },
  ultimate: {
    id: "ultimate",
    name: "Ultimate Security Bundle",
    requires: ["entx", "entplus"],
    baseSeats: null,
    includes: [
      "curation", "jas", "runtimeIntegrity", "agenticRemediation", "ideExtControl", "snippetDetection",
      "catalog", "apptrust", "transitiveCA", "mcpRegistry", "agentSkills",
    ],
    excludes: [],
    note: "SF: Ultimate Security Bundle - Cloud / SH. AppTrust full lifecycle prefers Enterprise +. Runtime Impact remains separate.",
  },
  curation: {
    id: "curation",
    name: "JFrog Curation (Cloud / SH)",
    requires: ["entx", "entplus"],
    baseSeats: null,
    includes: ["curation"],
    excludes: [],
    note: "SF order: JFrog Curation Cloud - MP (+ Additional Curation Users for seats). Also appears via Unified/Ultimate or Curation with AI Catalog.",
  },
  jas: {
    id: "jas",
    name: "JFrog Advanced Security / JAS",
    requires: ["entx", "entplus"],
    baseSeats: null, // order form seats override
    includes: ["jas", "runtimeIntegrity"],
    excludes: [],
    note: "À-la-carte or via Unified/Ultimate. Use Security seats from the order line (# Units).",
  },
  catalog: {
    id: "catalog",
    name: "JFrog AI Catalog",
    requires: ["entx", "entplus"],
    baseSeats: null,
    includes: ["catalog", "mcpRegistry", "agentSkills"],
    excludes: [],
    note: "SF: JFrog AI Catalog - Cloud / SH. Included in Ultimate; add-on otherwise.",
  },
  apptrust: {
    id: "apptrust",
    name: "JFrog App Trust",
    requires: ["entplus"],
    preferredPlatform: "entplus",
    baseSeats: null,
    includes: ["apptrust"],
    excludes: [],
    note: "SF: JFrog App Trust - Cloud / SH. Needs Enterprise + for full lifecycle.",
  },
  runtimeImpact: {
    id: "runtimeImpact",
    name: "JFrog Runtime Impact",
    requires: ["entx", "entplus"],
    baseSeats: null,
    includes: ["runtimeImpact"],
    excludes: [],
    note: "SF: JFrog Runtime Impact - Cloud. Add-on on top of Unified or Ultimate.",
  },
  edge: {
    id: "edge",
    name: "Distribution Cloud Edge Nodes",
    requires: ["entplus"],
    baseSeats: null,
    includes: ["edge"],
    excludes: [],
    note: "SF order: Distribution Cloud Edge Nodes (Cloud Edge ops). Self-managed Artifactory Edge also maps here — set Edge ops mode.",
  },
  additionalInstances: {
    id: "additionalInstances",
    name: "Additional Platform Instance",
    requires: ["entx", "entplus"],
    baseSeats: null,
    includes: [],
    excludes: [],
    note: "SaaS only: extra writable JPD / tenant. Place each instance in a region.",
  },
  additionalServers: {
    id: "additionalServers",
    name: "Additional Artifactory servers",
    requires: ["prox", "entx", "entplus"],
    baseSeats: null,
    includes: [],
    excludes: [],
    note: "Self-managed only. Adds to included server count for HA nodes or extra writable sites.",
  },
  mlCredits: {
    id: "mlCredits",
    name: "JFrog ML / Additional Credits",
    requires: ["entx", "entplus"],
    baseSeats: null,
    includes: [],
    excludes: [],
    note: "SF Cloud Usage: JFrog ML / JFrog ML - Additional Credits (+ SH). Qty = credits from # Units.",
  },
  projectBuckets: {
    id: "projectBuckets",
    name: "Additional Projects",
    requires: ["entplus"],
    baseSeats: null,
    includes: [],
    excludes: [],
    note: "SF: Additional Projects. Each bucket ≈ +100 projects subscription-wide (Enterprise +).",
  },
  smartArchiving: {
    id: "smartArchiving",
    name: "Smart Archiving Consumption",
    requires: ["entplus"],
    baseSeats: null,
    includes: ["smartArchiving"],
    excludes: [],
    note: "SF: Smart Archiving Consumption (and SM Smart Archiving SKUs).",
  },
  premiumAvailability: {
    id: "premiumAvailability",
    name: "JFrog Premium Availability",
    requires: ["entplus"],
    baseSeats: null,
    includes: [],
    excludes: [],
    note: "SF Cloud Usage: JFrog Premium Availability (99.99% SLA).",
  },
};

/** Last Salesforce paste parse report (shown in results). */
let lastSfParseReport = null;

function applyLatestSafeThresholds() {
  const thresholds = LATEST_LICENSE_DATA?.thresholds;
  if (!thresholds) return;

  const projects = thresholds.projects || {};
  ["pro", "prox", "entx", "entplus"].forEach((tier) => {
    if (Number.isFinite(projects[tier]) && PLATFORM[tier]) {
      PLATFORM[tier].projects = projects[tier];
    }
  });
  if (Number.isFinite(projects.bucketIncrement)) {
    PLATFORM.entplus.projectBucketSize = projects.bucketIncrement;
  }

  const servers = thresholds.selfManagedArtifactoryServers || {};
  ["prox", "entx", "entplus"].forEach((tier) => {
    if (Number.isFinite(servers[tier]) && PLATFORM[tier]) {
      PLATFORM[tier].serversIncluded = servers[tier];
    }
  });

  const consumption = thresholds.saasBaseConsumptionGB || {};
  ["pro", "entx", "entplus"].forEach((tier) => {
    if ((Number.isFinite(consumption[tier]) || consumption[tier] === null) && PLATFORM[tier]) {
      PLATFORM[tier].saasBaseConsumptionGB = consumption[tier];
    }
  });
}

function latestSecurityBaseSeats(platformTier) {
  const value = LATEST_LICENSE_DATA?.thresholds
    ?.advancedSecurityBaseContributingDevelopers?.[platformTier];
  return Number.isFinite(value) ? value : null;
}

applyLatestSafeThresholds();

const CAPABILITY_LABELS = {
  artifactory: "Artifactory (universal repos)",
  rbv2: "Release Bundles v2 / RLM",
  xray: "Xray — Code & Binary SCA",
  sso: "SAML / OIDC / SCIM SSO",
  ha: "High availability",
  federation: "Repository federation",
  replication: "Push / pull replication",
  workers: "JFrog Workers",
  accessFederation: "Access Federation",
  distribution: "Distribution to Edge",
  evidenceGraph: "Evidence Graph",
  thirdPartyEvidence: "Third-party evidence collection",
  logStreaming: "Log streaming to APM",
  smartArchiving: "Smart Archiving (cold tier)",
  missionControl: "Mission Control",
  connect: "JFrog Connect (IoT) — confirm SKU",
  curation: "Curation (+ PTC)",
  jas: "JFrog Advanced Security (JAS)",
  runtimeIntegrity: "Runtime Integrity (base)",
  runtimeImpact: "Runtime Impact",
  agenticRemediation: "Agentic Remediation",
  ideExtControl: "IDE Extensions Control",
  snippetDetection: "Snippet Detection",
  catalog: "AI Catalog",
  apptrust: "AppTrust",
  transitiveCA: "Transitive Contextual Analysis",
  mcpRegistry: "MCP Registry governance",
  agentSkills: "Agent Skills governance",
  edge: "Edge nodes (read-only)",
};

const PS_CHECKLIST = [
  {
    title: "Confirm deployment model",
    detail: "SaaS Pro ≠ Pro X. SaaS customers who need scanning upgrade to Enterprise X, not Pro X.",
  },
  {
    title: "Separate site vs HA node counts",
    detail: "One Platform Site (JPS) = one Router URL / identity plane. HA replicas inside that site consume server licenses (self-managed) — they are not additional writable sites.",
  },
  {
    title: "Second writable JPS needs its own entitlements",
    detail: "US + EU prod (or SaaS + self-managed hybrid) = second deployment / subscription, not free with HA.",
  },
  {
    title: "Map security seats correctly",
    detail: "Contributing developer = developer whose artifacts were scanned by Advanced Security in the last 90 days — not named seats, not total employees.",
  },
  {
    title: "SaaSInstance / consumption ≠ hard block",
    detail: "SaaS base consumption (storage + transfer) overages are billed, not blocked. Ent+ storage is often custom TB negotiated on the order.",
  },
  {
    title: "Projects quota is subscription-wide",
    detail: "Ent+ 300 (+ buckets) applies across all JPDs, not per server. Pro/Pro X = 3 and cannot extend.",
  },
  {
    title: "Edge licenses are separate",
    detail: "Distribution / Artifactory Edge do not count toward the 1/3/6 server inclusion. Most Edge POPs are customer self-managed; SaaS 'Distribution Cloud Edge Nodes' may be JFrog-operated — confirm ops model.",
  },
  {
    title: "Verify live entitlements before build",
    detail: "jf api /xray/api/v1/configuration/jas · /curation/api/v1/status · /router/api/v1/system/health — license gaps look like missing UI, not misconfiguration.",
  },
  {
    title: "AppTrust needs Ultimate + Ent+",
    detail: "Do not promise AppTrust lifecycle on Ent X + Unified alone. Catalog can be $ on Unified; AppTrust is Ultimate-only.",
  },
  {
    title: "Curation Federation ≠ waiver sync",
    detail: "Federation replicates policies/conditions; waivers stay local per JPD. Plan central tracking separately if multi-site.",
  },
];

/** Region presets for architecture diagram inputs */
const REGION_PRESETS = {
  aws: [
    "us-east-1", "us-east-2", "us-west-1", "us-west-2",
    "eu-west-1", "eu-west-2", "eu-central-1", "eu-north-1",
    "ap-southeast-1", "ap-southeast-2", "ap-northeast-1", "ap-south-1",
    "ca-central-1", "sa-east-1", "Custom…",
  ],
  azure: [
    "eastus", "eastus2", "westus", "westus2", "westus3", "centralus",
    "northeurope", "westeurope", "uksouth", "francecentral",
    "southeastasia", "eastasia", "australiaeast", "japaneast",
    "brazilsouth", "canadacentral", "Custom…",
  ],
  gcp: [
    "us-east1", "us-east4", "us-central1", "us-west1", "us-west2",
    "europe-west1", "europe-west2", "europe-west3", "europe-north1",
    "asia-east1", "asia-southeast1", "asia-northeast1", "asia-south1",
    "australia-southeast1", "southamerica-east1", "Custom…",
  ],
  onprem: ["(undefined)", "Primary DC", "Secondary DC", "DR site", "Edge POP", "Custom…"],
};

const IAAS_LABELS = {
  aws: "AWS",
  azure: "Azure",
  gcp: "GCP",
  onprem: "On-Prem",
};

const DIAGRAM_META = {
  aws: { vpc: "VPC", store: "Amazon S3", pl: "PrivateLink", edgeNet: "Edge" },
  azure: { vpc: "VNet", store: "Azure Blob", pl: "Private Link", edgeNet: "Edge" },
  gcp: { vpc: "VPC", store: "Cloud Storage", pl: "PSC", edgeNet: "Edge" },
  onprem: { vpc: "Network", store: "Filestore / S3-compat", pl: "VPN / Direct", edgeNet: "Edge" },
};

function $(id) {
  return document.getElementById(id);
}

function parseNum(el, fallback = 0) {
  const n = Number(el?.value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function collectInputs() {
  const platform = document.querySelector('input[name="platform"]:checked')?.value || "entx";
  const deployModel = document.querySelector('input[name="deployModel"]:checked')?.value || "saas";
  const iaas = document.querySelector('input[name="iaas"]:checked')?.value || "aws";
  const edgeOps = document.querySelector('input[name="edgeOps"]:checked')?.value || "selfmanaged";
  const quantity = parseNum($("platformQty"), 1);
  const saasPlatformQty = parseNum($("saasPlatformQty"), Math.max(1, quantity));
  const selfManagedPlatformQty = parseNum($("selfManagedPlatformQty"), 1);
  const saasUnits = parseNum($("saasUnits"), 0);
  const saasUnitSizeGB = parseNum($("saasUnitSizeGB"), 1000);
  const securitySeats = parseNum($("securitySeats"), 0);
  const customerName = ($("customerName")?.value || "").trim();
  const notes = sanitizeNotesForResults(($("orderNotes")?.value || "").trim());

  const addons = {};
  document.querySelectorAll("[data-addon]").forEach((row) => {
    const id = row.getAttribute("data-addon");
    const checked = row.querySelector('input[type="checkbox"]')?.checked;
    const qty = parseNum(row.querySelector('input[type="number"]'), 1);
    if (checked) addons[id] = Math.max(1, qty);
  });

  const regionRows = collectRegionRows();
  const placed = regionRows.filter(regionRowIsPlaced).map((r) => ({
    ...r,
    region: normalizeRegionName(r.region),
  }));

  return {
    customerName,
    platform,
    deployModel,
    iaas,
    edgeOps,
    quantity: deployModel === "hybrid" ? saasPlatformQty : quantity,
    saasPlatformQty: deployModel === "hybrid" ? saasPlatformQty : (deployModel === "saas" ? quantity : 0),
    selfManagedPlatformQty: deployModel === "hybrid" ? selfManagedPlatformQty : (deployModel === "selfmanaged" ? quantity : 0),
    saasUnits,
    saasUnitSizeGB,
    securitySeats,
    addons,
    notes,
    regions: placed,
    unplacedRegions: regionRows.filter((r) => !regionRowIsPlaced(r)),
  };
}

function collectRegionRows() {
  const rows = [];
  document.querySelectorAll("#regionList .region-row").forEach((row) => {
    const select = row.querySelector(".region-select");
    const custom = row.querySelector(".region-custom");
    const iaas = row.querySelector(".region-iaas")?.value || currentIaas();
    const siteKind = row.querySelector(".region-site-kind")?.value || "saas";
    let name = (select?.value || "").trim();
    if (name === "Custom…" || name === "") {
      name = (custom?.value || "").trim();
    }
    rows.push({
      region: name,
      iaas,
      siteKind,
      primary: parseNum(row.querySelector(".qty-primary"), 0),
      additional: parseNum(row.querySelector(".qty-additional"), 0),
      edge: parseNum(row.querySelector(".qty-edge"), 0),
    });
  });
  return rows;
}

function regionRowIsPlaced(r) {
  // Counts alone place a row; blank region names still appear under OTHER in the diagram.
  return r.primary > 0 || r.additional > 0 || r.edge > 0;
}

function normalizeRegionName(name) {
  const value = String(name || "").trim();
  return value || "(undefined)";
}

function collectRegions() {
  return collectRegionRows()
    .filter(regionRowIsPlaced)
    .map((r) => ({ ...r, region: normalizeRegionName(r.region) }));
}

function providersFromRegions(regions) {
  const seen = [];
  (regions || []).forEach((r) => {
    const key = r.iaas || "aws";
    if (!seen.includes(key)) seen.push(key);
  });
  return seen;
}

function iaasSummaryLabel(regions, fallbackIaas) {
  const providers = providersFromRegions(regions);
  if (!providers.length) return IAAS_LABELS[fallbackIaas] || fallbackIaas || "AWS";
  return providers.map((p) => IAAS_LABELS[p] || p).join(" + ");
}

function analyze(input) {
  const tier = PLATFORM[input.platform];
  const warnings = [];
  const infos = [];
  const errors = [];

  // Deploy model sanity
  if (tier.model === "saas" && input.deployModel === "selfmanaged") {
    warnings.push("Pro is SaaS-only. Treat this as a SaaS tenant, not a self-managed install.");
  }
  if (tier.model === "selfmanaged" && input.deployModel === "saas") {
    warnings.push("Pro X is self-managed only. There is no SaaS Pro X SKU — scanning on SaaS requires Enterprise X.");
  }
  if (input.deployModel === "hybrid") {
    if (tier.model === "saas" || tier.model === "selfmanaged") {
      warnings.push(`${tier.name} cannot be hybrid by itself — hybrid needs Enterprise X / Enterprise + on both Cloud and On-Prem lines.`);
    } else {
      infos.push("Hybrid order: Cloud (SaaS) and Enterprise+ MP / Enterprise X MP (On-Prem) can both be licensed at once. Treat each side as its own deployment for topology; federation between them is optional and contractual.");
    }
  }

  // Addon eligibility
  const entitledCapabilities = new Set();
  Object.entries(tier.features).forEach(([k, v]) => {
    if (v === true) entitledCapabilities.add(k);
  });

  const activeAddons = [];
  Object.entries(input.addons).forEach(([id, qty]) => {
    const addon = ADDONS[id];
    if (!addon) return;
    if (!addon.requires.includes(input.platform)) {
      errors.push(`${addon.name} is not available on ${tier.name}. Requires: ${addon.requires.map((r) => PLATFORM[r].name).join(" / ")}.`);
      return;
    }
    activeAddons.push({ ...addon, qty });
    addon.includes.forEach((c) => entitledCapabilities.add(c));
    if (id === "smartArchiving") entitledCapabilities.add("smartArchiving");
  });

  // Ultimate supersedes Unified messaging
  const hasUltimate = !!input.addons.ultimate;
  const hasUnified = !!input.addons.unified;
  if (hasUltimate && hasUnified) {
    infos.push("Both Unified and Ultimate selected — Ultimate already includes Unified capabilities; treat Unified as redundant on the order.");
  }

  // AppTrust platform check
  if (input.addons.apptrust && input.platform !== "entplus") {
    errors.push("AppTrust is listed but platform is not Enterprise +. Full AppTrust lifecycle expects Ent+ + Ultimate.");
  }
  if (hasUltimate && input.platform === "entx") {
    warnings.push("Ultimate Security on Enterprise X: Catalog/JAS/Curation OK; AppTrust full lifecycle typically wants Enterprise + — confirm with AE.");
  }

  // Server / site math
  let serversIncluded = tier.serversIncluded;
  let serversTotal = null;
  let additionalServers = input.addons.additionalServers || 0;
  const saasQtyRaw = Number(input.saasPlatformQty);
  const smQtyRaw = Number(input.selfManagedPlatformQty);
  const effectiveSaasQty = input.deployModel === "hybrid"
    ? Math.max(1, Number.isFinite(saasQtyRaw) && saasQtyRaw > 0 ? saasQtyRaw : 1)
    : Math.max(1, input.quantity);
  const effectiveSmQty = input.deployModel === "hybrid"
    ? Math.max(1, Number.isFinite(smQtyRaw) && smQtyRaw > 0 ? smQtyRaw : 1)
    : Math.max(1, input.quantity);

  if (input.deployModel === "selfmanaged" && serversIncluded != null) {
    // Quantity on platform often = number of base packs OR total servers purchased — treat as total writable-site packs
    // Common order pattern: ENT+-BASE qty 1 includes 6 servers; additionalServers SKU adds more.
    serversTotal = serversIncluded * effectiveSmQty + additionalServers;
    if (effectiveSmQty > 1) {
      infos.push(`Platform quantity ${effectiveSmQty} × ${serversIncluded} included servers = ${serversIncluded * effectiveSmQty}, plus ${additionalServers} additional = ${serversTotal} server licenses.`);
    }
  } else if (input.deployModel === "saas") {
    serversTotal = null;
    if (effectiveSaasQty > 1) {
      infos.push(`SaaS platform quantity ${effectiveSaasQty} typically means ${effectiveSaasQty} primary tenant pack(s).`);
    }
  } else if (input.deployModel === "hybrid") {
    if (serversIncluded != null) {
      serversTotal = serversIncluded * effectiveSmQty + additionalServers;
    }
    infos.push(`Hybrid capacity: SaaS primary packs ×${effectiveSaasQty}; On-Prem packs ×${effectiveSmQty}${serversIncluded != null ? ` → ${serversTotal} server license(s)` : ""}.`);
  }

  const additionalInstances = input.addons.additionalInstances || 0;
  const edgeCount = input.addons.edge || 0;
  const mlCredits = input.addons.mlCredits || 0;

  // Writable sites estimate (SaaS tenants; hybrid still counts SaaS writables separately from On-Prem servers)
  let writableSites;
  if (input.deployModel === "saas" || input.deployModel === "hybrid") {
    writableSites = effectiveSaasQty + additionalInstances;
  } else {
    writableSites = 1;
  }

  // Region topology vs order reconciliation
  const regionPrimary = input.regions.reduce((s, r) => s + r.primary, 0);
  const regionAdditional = input.regions.reduce((s, r) => s + r.additional, 0);
  const regionEdge = input.regions.reduce((s, r) => s + r.edge, 0);
  const regionWritable = regionPrimary + regionAdditional;

  // A row with 0/0/0 counts is invisible everywhere — say so instead of dropping it silently.
  const unplaced = input.unplacedRegions || [];
  if (unplaced.length) {
    warnings.push(`${unplaced.length} region row(s) have no Primary / Additional / Edge count and are excluded from the diagram and provider list. Set at least one count.`);
  }

  if (input.regions.length === 0) {
    warnings.push("No region deployments entered — Primary / Additional / Edge rows with a count are drawn on the architecture diagram (blank region → OTHER column).");
  } else {
    if ((input.deployModel === "saas" || input.deployModel === "hybrid") && regionWritable > 0 && regionWritable !== writableSites) {
      warnings.push(`Region rows show ${regionWritable} writable JPD(s) but order math is ${writableSites} (SaaS primary ${effectiveSaasQty} + Additional Platform Instance ${additionalInstances}). Align the topology with the order — On-Prem JPS may be listed separately.`);
    }
    // Same rule both ways: region Edge placement must match the Edge SKU (including SKU unchecked → expect 0).
    if (regionEdge !== edgeCount) {
      warnings.push(`Edge SKU qty is ${edgeCount} but region rows assign ${regionEdge} edge(s). Update region Edge counts (or the Edge add-on) to match.`);
    }
    if (additionalInstances > 0 && regionAdditional !== additionalInstances && regionWritable > 0) {
      infos.push(`Order has Additional Platform Instance ×${additionalInstances}; region rows currently place ${regionAdditional} additional instance(s).`);
    }
    if (regionPrimary === 0 && regionWritable > 0) {
      warnings.push("No Primary JPD marked in any region — mark at least one primary for a clear architecture diagram.");
    }
  }

  if (mlCredits > 0) {
    infos.push(`JFrog ML credits on order: ${mlCredits.toLocaleString()}.`);
  }

  if ((input.deployModel === "selfmanaged" || input.deployModel === "hybrid") && serversTotal != null) {
    // Heuristic only — PS must confirm topology
    infos.push(`Self-managed / On-Prem: ${serversTotal} server license(s). Typical HA uses 3 (Ent X) or up to 6 (Ent+) in one cluster; leftover licenses can fund additional writable sites — confirm topology with AE.`);
  }

  // Projects
  let projects = tier.projects;
  const buckets = input.addons.projectBuckets || 0;
  if (buckets && tier.projectsExtensible) {
    projects = tier.projects + buckets * (tier.projectBucketSize || 100);
  } else if (buckets && !tier.projectsExtensible) {
    errors.push("Projects License Buckets require Enterprise +. Pro / Pro X / Ent X cannot extend project count.");
  }

  // Security seats
  let includedSeats = 0;
  const refreshedSecurityBase = latestSecurityBaseSeats(input.platform);
  if ((hasUltimate || hasUnified) && refreshedSecurityBase != null) {
    includedSeats = refreshedSecurityBase;
  } else if (hasUltimate) {
    includedSeats = Math.max(includedSeats, ADDONS.ultimate.baseSeats);
  } else if (hasUnified) {
    includedSeats = Math.max(includedSeats, ADDONS.unified.baseSeats);
  }
  else if (input.addons.jas) {
    // à-la-carte — prefer order seats
    includedSeats = refreshedSecurityBase || 0;
  }

  const orderSeats = input.securitySeats;
  const effectiveSeats = orderSeats > 0 ? orderSeats : includedSeats;
  if ((hasUnified || hasUltimate || input.addons.jas) && orderSeats === 0 && includedSeats > 0) {
    infos.push(`No security seats entered — using bundle base of ${includedSeats} contributing developers.`);
  }
  if (!(hasUnified || hasUltimate || input.addons.jas || input.addons.curation || input.addons.catalog) && orderSeats > 0) {
    warnings.push("Security seats entered but no security bundle/add-on selected — seats alone do not unlock JAS/Curation.");
  }
  if (!hasUnified && !hasUltimate && !input.addons.jas && !input.addons.curation && tier.features.xray) {
    infos.push("Baseline Xray SCA is included with this platform. JAS / Curation / Catalog require a security bundle or à-la-carte add-on.");
  }
  if (!tier.features.xray) {
    warnings.push("This platform does not include Xray. No SCA, build-scan, or SBOM export from Xray until you upgrade (SaaS → Ent X, or self-managed Pro X).");
  }

  // SaaS storage / SaaSInstance
  let storageGB = null;
  let storageNote = "";
  if (input.deployModel === "saas" || input.deployModel === "hybrid") {
    const fromUnits = input.saasUnits * input.saasUnitSizeGB;
    if (fromUnits > 0) {
      storageGB = fromUnits;
      storageNote = `${input.saasUnits} SaaSInstance unit(s) × ${input.saasUnitSizeGB} GB = ${formatGB(storageGB)} entitled consumption (storage + transfer meter — confirm unit definition on the order).`;
      if (input.deployModel === "hybrid") {
        storageNote += " On-Prem side uses customer-owned filestore (not this meter).";
      }
    } else if (tier.saasBaseConsumptionGB != null) {
      storageGB = tier.saasBaseConsumptionGB;
      storageNote = `Using published base consumption for ${tier.name}: ${storageGB} GB/month. Enter SaaSInstance units if the order has custom storage.`;
    } else {
      storageNote = `${tier.name} SaaS storage is custom / negotiated — enter SaaSInstance units from the order form.`;
    }
  } else {
    storageNote = "Self-managed: customer brings storage (filestore / object store). No SaaSInstance meter.";
  }

  // Build capability table
  const capabilityRows = Object.keys(CAPABILITY_LABELS).map((key) => {
    let status = "excluded";
    let detail = "Not entitled on this configuration.";

    if (entitledCapabilities.has(key)) {
      status = "included";
      detail = "Licensed for use.";
    } else if (tier.features[key] === "addon") {
      status = "addon";
      detail = "Available as paid add-on on this platform — not selected.";
    } else if (
      ["curation", "jas", "catalog", "apptrust", "runtimeImpact", "runtimeIntegrity"].includes(key) &&
      (input.platform === "entx" || input.platform === "entplus")
    ) {
      status = "addon";
      detail = "Requires Unified / Ultimate / à-la-carte — not selected.";
    }

    // Soften connect
    if (key === "connect" && entitledCapabilities.has("connect")) {
      detail = "Often 1000 devices on Ent X+ — confirm current Connect SKU on the order.";
      status = "partial";
    }

    return { key, label: CAPABILITY_LABELS[key], status, detail };
  });

  // PS next steps tailored
  const nextSteps = buildNextSteps(input, tier, {
    serversTotal,
    projects,
    effectiveSeats,
    storageGB,
    hasUltimate,
    hasUnified,
    writableSites,
    edgeCount,
  });

  const diagramSites = buildDiagramModel(input, {
    tier,
    writableSites,
    edgeCount,
    serversTotal,
    storageGB,
    entitledCapabilities,
  });

  return {
    input,
    tier,
    warnings,
    infos,
    errors,
    activeAddons,
    serversIncluded,
    serversTotal,
    additionalServers,
    additionalInstances,
    edgeCount,
    mlCredits,
    projects,
    projectsExtensible: tier.projectsExtensible,
    effectiveSeats,
    includedSeats,
    orderSeats,
    storageGB,
    storageNote,
    writableSites,
    saasPlatformQty: effectiveSaasQty,
    selfManagedPlatformQty: effectiveSmQty,
    capabilityRows,
    nextSteps,
    entitledCapabilities,
    diagramSites,
  };
}

function buildDiagramModel(input, ctx) {
  const iaas = input.iaas || "aws";
  const edgeOps = input.edgeOps || "selfmanaged";
  const regions = (input.regions || []).filter((r) =>
    String(r.region || "").trim()
    && (r.primary > 0 || r.additional > 0 || r.edge > 0)
  );

  // Flatten into diagram bands: Primary → Additional → Edges
  const primaries = [];
  const additionals = [];
  const edgeNodes = [];

  regions.forEach((r) => {
    const rowIaas = r.iaas || iaas;
    const siteKind = r.siteKind || (rowIaas === "onprem" ? "selfmanaged" : "saas");
    for (let n = 0; n < r.primary; n++) {
      primaries.push({
        region: r.region,
        index: primaries.length + 1,
        iaas: rowIaas,
        siteKind,
      });
    }
    for (let n = 0; n < r.additional; n++) {
      additionals.push({
        region: r.region,
        index: additionals.length + 1,
        iaas: rowIaas,
        siteKind,
      });
    }
    for (let n = 0; n < r.edge; n++) {
      edgeNodes.push({
        region: r.region,
        index: edgeNodes.length + 1,
        iaas: rowIaas,
        siteKind,
      });
    }
  });

  // If order has writables but no region placement, leave empty — diagram will show empty-state guidance.
  const byRegion = {};
  [...primaries.map((p) => ({ ...p, kind: "primary" })), ...additionals.map((a) => ({ ...a, kind: "additional" }))]
    .forEach((s) => {
      if (!byRegion[s.region]) byRegion[s.region] = { region: s.region, primary: 0, additional: 0 };
      byRegion[s.region][s.kind === "primary" ? "primary" : "additional"] += 1;
    });
  const writableSites = Object.values(byRegion);

  const edgeSites = [];
  const edgeByRegion = {};
  edgeNodes.forEach((e) => {
    if (!edgeByRegion[e.region]) edgeByRegion[e.region] = { region: e.region, count: 0, colocatedWithPrimary: false };
    edgeByRegion[e.region].count += 1;
  });
  Object.values(edgeByRegion).forEach((v) => edgeSites.push(v));

  const products = [];
  if (ctx.entitledCapabilities.has("xray")) products.push("Xray");
  if (ctx.entitledCapabilities.has("curation")) products.push("Curation");
  if (ctx.entitledCapabilities.has("jas")) products.push("JAS");
  if (ctx.entitledCapabilities.has("catalog")) products.push("Catalog");
  if (ctx.entitledCapabilities.has("apptrust")) products.push("AppTrust");
  if (ctx.entitledCapabilities.has("workers")) products.push("Workers");
  if (ctx.entitledCapabilities.has("distribution") || (input.addons.edge || 0) > 0) products.push("Distribution");

  const providers = providersFromRegions(regions);
  const edgeSku = input.addons.edge || 0;

  return {
    iaas,
    iaasLabel: iaasSummaryLabel(regions, iaas),
    providers,
    meta: DIAGRAM_META[providers[0] || iaas] || DIAGRAM_META.aws,
    deployModel: input.deployModel,
    tierName: ctx.tier.name,
    regions,
    primaries,
    additionals,
    edgeNodes,
    edgeOps,
    writableSites,
    edgeSites,
    writableSitesCount: ctx.writableSites,
    edgeCount: Math.max(edgeSku, edgeNodes.length),
    serversTotal: ctx.serversTotal,
    storageGB: ctx.storageGB,
    products,
    accessFederation: !!ctx.entitledCapabilities.has("accessFederation"),
    repoFederation: !!ctx.entitledCapabilities.has("federation"),
  };
}

function buildNextSteps(input, tier, ctx) {
  const steps = [];

  steps.push({
    title: "Pull the order / SFDC entitlement lines",
    detail: `Capture platform (${tier.name}), qty, every add-on SKU, SaaSInstance units, and security seat count. Paste into this tool before kickoff.`,
  });

  if (input.deployModel === "selfmanaged") {
    steps.push({
      title: "Map server licenses → topology",
      detail: ctx.serversTotal != null
        ? `${ctx.serversTotal} server licenses available. Decide HA node count vs second writable JPS before install day.`
        : "Confirm total Artifactory server licenses and whether Edge is separate.",
    });
  } else if (input.deployModel === "hybrid") {
    steps.push({
      title: "Separate SaaS vs On-Prem topology",
      detail: `SaaS: ${ctx.writableSites || 1} writable tenant(s). On-Prem: ${ctx.serversTotal != null ? `${ctx.serversTotal} server license(s)` : "confirm server count"}. Do not treat HA nodes as a second Cloud tenant. Confirm whether federation / Access Federation links the two sides.`,
    });
    steps.push({
      title: "Confirm multi-cloud / multi-IaaS placement",
      detail: "Each topology row has its own provider (e.g. SaaS JPD on GCP + On-Prem JPS on Azure). Confirm regions, PrivateLink/PSC on the Cloud side, and customer-owned networking for On-Prem — providers need not match.",
    });
  } else {
    steps.push({
      title: "Confirm SaaS region(s) and PrivateLink needs",
      detail: `${ctx.writableSites || 1} writable tenant(s) on the order. Multi-region / additional instances need topology agreement. Ask about PrivateLink / PSC early.`,
    });
  }

  if (ctx.edgeCount > 0) {
    steps.push({
      title: "Pair Distribution Edges",
      detail: `${ctx.edgeCount} Edge node(s) — default assumption is customer self-managed Edge POPs receiving Release Bundles from Primary. If the SKU is Distribution Cloud Edge Nodes, confirm whether JFrog operates them or the customer does. Place Edges below Primary on the diagram.`,
    });
  }

  if (ctx.hasUnified || ctx.hasUltimate || input.addons.jas) {
    steps.push({
      title: "Budget contributing developers",
      detail: `${ctx.effectiveSeats || "?"} seat(s) entitled. Measure JAS-scanned contributors (90-day window) — overage is commercial, not a soft UI warning.`,
    });
  }

  if (ctx.hasUltimate || input.addons.apptrust) {
    steps.push({
      title: "AppTrust readiness",
      detail: "Confirm Ent+ platform, Ultimate (or AppTrust SKU), Artifactory ≥ required version, and evidence/build-scan path before promising Trusted Release.",
    });
  }

  if (ctx.hasUnified || ctx.hasUltimate || input.addons.curation) {
    steps.push({
      title: "Curation onboarding",
      detail: "Enable curated remotes first; agree hold/immaturity policy; if multi-JPD, plan waiver tracking (waivers do not federate).",
    });
  }

  steps.push({
    title: "Validate entitlements on the live JPS",
    detail: "Run JAS / Curation / Router health checks; open a ticket with CSM if modules are disabled despite the order.",
  });

  steps.push({
    title: "Size only after entitlements are clear",
    detail: "Feed licensed products + seat/storage ceilings into jfrog-sizing / reference architecture — do not size features the customer cannot turn on.",
  });

  return steps;
}

function formatGB(gb) {
  if (gb == null) return "—";
  if (gb >= 1000) {
    const tb = gb / 1000;
    return `${tb % 1 === 0 ? tb : tb.toFixed(1)} TB (${gb.toLocaleString()} GB)`;
  }
  return `${gb.toLocaleString()} GB`;
}

function statusLabel(status) {
  switch (status) {
    case "included": return "Included";
    case "excluded": return "Not licensed";
    case "addon": return "Add-on needed";
    case "partial": return "Confirm SKU";
    default: return status;
  }
}

/* ---------- Architecture diagram ---------- */

function buildArchitectureLegacySvg(model) {
  const C = {
    bg: "#0c0e12",
    region: "#12151b",
    border: "#2a2f3a",
    accent: "#40bf6a",
    accentDim: "#2a8f4d",
    info: "#4aa3ff",
    warn: "#f5a623",
    node: "#1f232c",
    primary: "#13251a",
    additional: "#132033",
    edge: "#2a230f",
    edgeBand: "#1a160c",
    txt: "#e6e8ee",
    muted: "#9aa3b2",
  };

  const pad = 20;
  const boxW = 210;
  const boxH = 52;
  const boxGapX = 14;
  const boxGapY = 12;
  const bandPad = 14;
  const labelH = 22;
  const meta = model.meta;
  const edgeSelfManaged = (model.edgeOps || "selfmanaged") === "selfmanaged";

  const primaries = model.primaries?.length
    ? model.primaries
    : [{ region: "Primary", index: 1 }];
  const additionals = model.additionals || [];
  const edgeNodes = model.edgeNodes || [];

  const T = (x, y, s, o = {}) =>
    `<text x="${x}" y="${y}" fill="${o.fill || C.txt}" font-size="${o.size || 12}" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif"${o.weight ? ` font-weight="${o.weight}"` : ""}${o.anchor ? ` text-anchor="${o.anchor}"` : ""}>${esc(s)}</text>`;
  const RECT = (x, y, w, h, fill, stroke, rx = 8, dash = false) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="1"${dash ? ` stroke-dasharray="5 4"` : ""}/>`;

  function siteBox(x, y, title, sub, kind) {
    const fill = kind === "primary" ? C.primary : kind === "edge" ? C.edge : C.additional;
    const stroke = kind === "primary" ? C.accent : kind === "edge" ? C.warn : C.info;
    return RECT(x, y, boxW, boxH, fill, stroke, 6)
      + T(x + 12, y + 20, title, { weight: 600, size: 12 })
      + T(x + 12, y + 38, sub, { fill: C.muted, size: 10 });
  }

  function regionSide(region, fallbackIndex) {
    const value = String(region || "").toLowerCase();
    const west = /(west|western|california|oregon|seattle|london|uk|europe-west|westeurope|northeurope|france|brazil|southamerica)/;
    const east = /(east|eastern|virginia|new york|tokyo|singapore|sydney|india|asia|japan)/;
    if (west.test(value)) return "left";
    if (east.test(value)) return "right";
    return fallbackIndex % 2 === 0 ? "left" : "right";
  }

  const leftEdges = [];
  const rightEdges = [];
  edgeNodes.forEach((edge, index) => {
    (regionSide(edge.region, index) === "left" ? leftEdges : rightEdges).push(edge);
  });

  const titleH = 44;
  const footerH = 36;
  const bandH = labelH + bandPad + boxH + bandPad;
  const centerCount = Math.max(primaries.length, additionals.length, 1);
  const centerW = Math.max(500, bandPad * 2 + centerCount * boxW + (centerCount - 1) * boxGapX);
  const sideW = edgeNodes.length ? boxW + 36 : 0;
  const sideGap = edgeNodes.length ? 58 : 0;
  const centerH = additionals.length ? bandH * 2 + 86 : bandH;
  const edgeStackH = (items) => items.length
    ? labelH + items.length * boxH + Math.max(0, items.length - 1) * boxGapY + bandPad * 2
    : 0;
  const bodyH = Math.max(centerH, edgeStackH(leftEdges), edgeStackH(rightEdges), 220);
  const centerX = pad + (leftEdges.length ? sideW + sideGap : 0);
  const leftX = pad;
  const rightX = centerX + centerW + sideGap;
  const W = pad * 2 + centerW
    + (leftEdges.length ? sideW + sideGap : 0)
    + (rightEdges.length ? sideW + sideGap : 0);
  const H = titleH + bodyH + footerH + pad;

  const parts = [];
  parts.push(RECT(0, 0, W, H, C.bg, C.border, 10));
  parts.push(T(pad, 26, `${model.iaasLabel} · ${model.tierName} · ${model.deployModel === "saas" ? "SaaS" : model.deployModel === "hybrid" ? "Hybrid SaaS + On-Prem" : "Self-managed"}`, { weight: 600, size: 14 }));
  const productLine = model.products.length ? model.products.join(" · ") : "Platform baseline";
  parts.push(T(W - pad, 26, productLine, { fill: C.muted, size: 11, anchor: "end" }));

  parts.push(`<defs>
    <marker id="ent-ah" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="${C.accent}"/></marker>
    <marker id="ent-ah2" markerWidth="8" markerHeight="8" refX="2" refY="3" orient="auto"><path d="M6,0 L0,3 L6,6 Z" fill="${C.accent}"/></marker>
    <marker id="ent-push" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="${C.warn}"/></marker>
  </defs>`);

  const primaryAnchors = [];
  const additionalAnchors = [];
  const primaryY = titleH;
  const additionalY = titleH + bodyH - bandH;

  function drawCenterBand(title, y0, fill, stroke, items, kind) {
    parts.push(RECT(centerX, y0, centerW, bandH, fill, stroke, 10));
    parts.push(T(centerX + 14, y0 + 18, title, { weight: 600, size: 12, fill: C.muted }));

    const rowY = y0 + labelH + bandPad / 2;
    const totalBoxesW = items.length * boxW + Math.max(0, items.length - 1) * boxGapX;
    let x = centerX + Math.max(bandPad, (centerW - totalBoxesW) / 2);

    items.forEach((item) => {
      const provider = IAAS_LABELS[item.iaas] || item.iaas || model.iaasLabel || "";
      const siteSaas = (item.siteKind || "saas") === "saas";
      let boxTitle;
      let sub;
      if (kind === "primary") {
        boxTitle = siteSaas ? `Primary JPD ${item.index}` : `Primary JPS ${item.index}`;
        sub = `${provider} · ${item.region} · ${siteSaas ? "SaaS" : "On-Prem"}`;
      } else {
        boxTitle = `Additional Instance ${item.index}`;
        sub = `${provider} · ${item.region} · writable`;
      }
      parts.push(siteBox(x, rowY, boxTitle, sub, kind));
      const anchor = { x: x + boxW / 2, y: rowY + boxH, top: rowY, left: x, right: x + boxW };
      if (kind === "primary") primaryAnchors.push(anchor);
      else additionalAnchors.push(anchor);
      x += boxW + boxGapX;
    });

    if (items.length >= 2) {
      const bidirectional = model.accessFederation || model.repoFederation;
      for (let i = 0; i < items.length - 1; i++) {
        const a = kind === "primary" ? primaryAnchors[i] : additionalAnchors[i];
        const b = kind === "primary" ? primaryAnchors[i + 1] : additionalAnchors[i + 1];
        const y = a.top + boxH / 2;
        parts.push(`<line x1="${a.right}" y1="${y}" x2="${b.left}" y2="${y}" stroke="${C.accent}" stroke-width="1.4" marker-end="url(#ent-ah)"${bidirectional ? ` marker-start="url(#ent-ah2)"` : ""}/>`);
      }
      if (kind === "primary" && (model.accessFederation || model.repoFederation)) {
        const mid = (primaryAnchors[0].x + primaryAnchors[primaryAnchors.length - 1].x) / 2;
        parts.push(T(mid, rowY - 4, model.accessFederation ? "Access + Repo Federation" : "Repo Federation", { fill: C.muted, size: 10, anchor: "middle" }));
      }
    }
  }

  // Primary is always the top hub.
  drawCenterBand("Primary deployments", primaryY, C.region, C.border, primaries, "primary");

  // Additional instances sit below Primary.
  if (additionals.length) {
    drawCenterBand("Additional Platform Instances", additionalY, C.region, C.info, additionals, "additional");
    const src = primaryAnchors[0];
    const connectorY1 = primaryY + bandH;
    const connectorY2 = additionalY;
    parts.push(T(centerX + centerW / 2, (connectorY1 + connectorY2) / 2 - 7, model.accessFederation ? "Access + Repository Federation" : "Repository Federation", { fill: C.accent, size: 10, anchor: "middle" }));
    additionalAnchors.forEach((dst) => {
      const x1 = src?.x || centerX + centerW / 2;
      const y1 = src?.y || connectorY1;
      const midY = (y1 + dst.top) / 2;
      parts.push(`<path d="M ${x1} ${y1} C ${x1} ${midY}, ${dst.x} ${midY}, ${dst.x} ${dst.top}" fill="none" stroke="${C.accent}" stroke-width="1.4" marker-end="url(#ent-ah)"/>`);
    });
  }

  function drawEdgeSide(items, side, x0) {
    if (!items.length) return;
    const sideH = edgeStackH(items);
    const y0 = titleH + Math.max(0, (bodyH - sideH) / 2);
    const title = side === "left" ? "West / left Edge regions" : "East / right Edge regions";
    parts.push(RECT(x0, y0, sideW, sideH, C.edgeBand, C.warn, 10));
    parts.push(T(x0 + sideW / 2, y0 + 18, title, { fill: C.warn, size: 10, weight: 600, anchor: "middle" }));
    let y = y0 + labelH + bandPad;
    const src = primaryAnchors[0];

    items.forEach((edge) => {
      const boxX = x0 + (sideW - boxW) / 2;
      const sub = edgeSelfManaged
        ? `${edge.region} · self-managed`
        : `${edge.region} · Cloud Edge`;
      parts.push(siteBox(boxX, y, `Edge ${edge.index}`, sub, "edge"));

      if (src) {
        const x1 = side === "left" ? src.left : src.right;
        const y1 = src.top + boxH / 2;
        const x2 = side === "left" ? boxX + boxW : boxX;
        const y2 = y + boxH / 2;
        const bendX = side === "left"
          ? (x1 + x2) / 2 - 18
          : (x1 + x2) / 2 + 18;
        parts.push(`<path d="M ${x1} ${y1} C ${bendX} ${y1}, ${bendX} ${y2}, ${x2} ${y2}" fill="none" stroke="${C.warn}" stroke-width="1.75" stroke-dasharray="6 4" marker-end="url(#ent-push)"/>`);
      }
      y += boxH + boxGapY;
    });
    parts.push(T(x0 + sideW / 2, y0 + sideH - 5, "Primary → Edge · Release Bundles", { fill: C.muted, size: 9, anchor: "middle" }));
  }

  drawEdgeSide(leftEdges, "left", leftX);
  drawEdgeSide(rightEdges, "right", rightX);

  const footerBits = [];
  footerBits.push(`${model.writableSitesCount || (primaries.length + additionals.length)} writable JPD(s)`);
  if (model.edgeCount) {
    footerBits.push(`${model.edgeCount} Edge · ${edgeSelfManaged ? "self-managed" : "Cloud Edge"} · west left / east right`);
  }
  if (model.storageGB != null) footerBits.push(`Consumption ${formatGB(model.storageGB)}`);
  if (model.deployModel === "saas") footerBits.push(meta.pl);
  parts.push(T(pad, H - 14, footerBits.join(" · "), { fill: C.muted, size: 11 }));
  parts.push(T(W - pad, H - 14, "Primary pushes RBs outward to Edges — Edges do not write back", { fill: C.muted, size: 10, anchor: "end" }));

  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px;height:auto" xmlns="http://www.w3.org/2000/svg">${parts.join("")}</svg>`;
}

function buildArchitectureSvg(model) {
  const C = {
    bg: "#0c0e12",
    lane: "#11151b",
    cell: "#171a21",
    border: "#2a2f3a",
    accent: "#40bf6a",
    info: "#4aa3ff",
    warn: "#f5a623",
    primary: "#13251a",
    additional: "#132033",
    edge: "#2a230f",
    txt: "#e6e8ee",
    muted: "#9aa3b2",
  };

  const primaries = model.primaries || [];
  const additionals = model.additionals || [];
  const edgeNodes = model.edgeNodes || [];
  const edgeSelfManaged = (model.edgeOps || "selfmanaged") === "selfmanaged";

  const allLaneKeys = ["west", "central", "east", "other"];
  const laneLabels = {
    west: "WEST REGIONS",
    central: "CENTRAL REGIONS",
    east: "EAST REGIONS",
    other: "OTHER / UNDEFINED",
  };

  function geographicLane(region) {
    const value = String(region || "").toLowerCase().trim();
    if (!value
      || value === "(undefined)"
      || value === "undefined"
      || value === "unspecified"
      || value === "n/a"
      || value === "-"
      || value === "custom…") {
      return "other";
    }
    // On-Prem / DC site names are not cloud geography — keep them out of Central.
    if (/^(primary|secondary)\s*dc\b|^dr\s*site\b|^edge\s*pop\b|^on[- ]?prem\b|^data\s*center\b|^datacenter\b|^dc\b/.test(value)) {
      return "other";
    }
    const central = /(central|midwest|mid-|iowa|texas|chicago|us-central|centralus|northcentral|southcentral)/;
    const west = /(west|western|california|oregon|washington|seattle|london|uk|europe-west|westeurope|northeurope|france|brazil|southamerica)/;
    const east = /(east|eastern|virginia|new york|tokyo|singapore|sydney|india|asia|japan)/;
    if (central.test(value)) return "central";
    if (west.test(value)) return "west";
    if (east.test(value)) return "east";
    return "other";
  }

  const rows = [
    { key: "primary", label: "1 · PRIMARY", items: primaries },
    { key: "additional", label: "2 · ADDITIONAL", items: additionals },
    { key: "edge", label: "3 · EDGES", items: edgeNodes },
  ].filter((row) => row.items.length > 0);

  if (!rows.length) {
    const W = 640;
    const H = 150;
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px;height:auto" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${W}" height="${H}" rx="10" fill="${C.bg}" stroke="${C.border}"/>
      <text x="${W / 2}" y="66" fill="${C.txt}" font-size="14" font-weight="600" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif">No region-specific deployments to draw</text>
      <text x="${W / 2}" y="92" fill="${C.muted}" font-size="11" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif">Assign a region to Primary, Additional, or Edge rows to include them.</text>
    </svg>`;
  }

  const buckets = {};
  rows.forEach((row) => {
    buckets[row.key] = { west: [], central: [], east: [], other: [] };
    row.items.forEach((item) => buckets[row.key][geographicLane(item.region)].push(item));
  });
  const laneKeys = allLaneKeys.filter((lane) =>
    rows.some((row) => buckets[row.key][lane].length > 0)
  );

  const pad = 18;
  const roleW = 96;
  const laneW = 258;
  const laneGap = 12;
  const boxW = 226;
  const boxH = 50;
  const boxGapY = 10;
  const laneTop = 56;
  const headerH = 90;
  const footerH = 36;
  const rowGap = 34;
  const cellPad = 12;

  function rowHeight(row) {
    const maxCount = Math.max(...laneKeys.map((lane) => buckets[row.key][lane].length), 1);
    return cellPad * 2 + maxCount * boxH + Math.max(0, maxCount - 1) * boxGapY;
  }

  let gridH = 0;
  const rowLayout = [];
  rows.forEach((row, index) => {
    const h = rowHeight(row);
    rowLayout.push({ ...row, y: headerH + gridH, h });
    gridH += h;
    if (index < rows.length - 1) gridH += rowGap;
  });

  const deployLabel = model.deployModel === "saas"
    ? "SaaS"
    : model.deployModel === "hybrid" ? "Hybrid SaaS + On-Prem" : "Self-managed";
  const titleText = `${model.iaasLabel} · ${model.tierName} · ${deployLabel}`;
  const productText = model.products.length ? model.products.join(" · ") : "Platform baseline";
  // Rough advance-width estimate so long titles/product lists widen the canvas instead of overflowing it.
  const textW = (text, size) => text.length * size * 0.58;

  const footerBits = [];
  footerBits.push(`${model.writableSitesCount || primaries.length + additionals.length} writable JPD(s)`);
  if (model.edgeCount) footerBits.push(`${model.edgeCount} Edge · ${edgeSelfManaged ? "self-managed" : "Cloud Edge"}`);
  if (model.storageGB != null) footerBits.push(`Consumption ${formatGB(model.storageGB)}`);
  const footerLeft = footerBits.join(" · ");
  const footerRight = "Undefined / non-geo sites → OTHER";
  // If both footer strings can't fit side by side, drop the right note to its own line above.
  const footerGap = 24;
  const footerOneLineW = pad * 2 + textW(footerLeft, 11) + footerGap + textW(footerRight, 10);
  const gridX = pad + roleW;
  const gridW = laneKeys.length * laneW + (laneKeys.length - 1) * laneGap;
  const baseW = pad * 2 + roleW + gridW;
  const footerStacked = footerOneLineW > baseW && footerOneLineW > pad * 2 + textW(titleText, 14);
  const W = Math.ceil(Math.max(
    baseW,
    pad * 2 + textW(titleText, 14),
    pad * 2 + textW(productText, 11),
    pad * 2 + textW(footerLeft, 11),
    pad * 2 + textW(footerRight, 10),
    footerStacked ? 0 : footerOneLineW,
  ));
  const extraFooterH = footerStacked ? 16 : 0;
  const H = headerH + gridH + footerH + extraFooterH + pad;

  const escSvg = (value) => esc(value);
  const T = (x, y, value, options = {}) =>
    `<text x="${x}" y="${y}" fill="${options.fill || C.txt}" font-size="${options.size || 12}" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif"${options.weight ? ` font-weight="${options.weight}"` : ""}${options.anchor ? ` text-anchor="${options.anchor}"` : ""}>${escSvg(value)}</text>`;
  const RECT = (x, y, w, h, fill, stroke, rx = 8, dash = false) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="1"${dash ? ` stroke-dasharray="5 4"` : ""}/>`;

  function laneX(lane) {
    return gridX + laneKeys.indexOf(lane) * (laneW + laneGap);
  }

  function nodeBox(x, y, title, sub, kind) {
    const fill = kind === "primary" ? C.primary : kind === "edge" ? C.edge : C.additional;
    const stroke = kind === "primary" ? C.accent : kind === "edge" ? C.warn : C.info;
    return RECT(x, y, boxW, boxH, fill, stroke, 6)
      + T(x + 11, y + 19, title, { weight: 600, size: 12 })
      + T(x + 11, y + 36, sub, { fill: C.muted, size: 10 });
  }

  const background = [];
  const connectors = [];
  const nodes = [];
  const anchors = { primary: [], additional: [], edge: [] };

  background.push(RECT(0, 0, W, H, C.bg, C.border, 10));
  background.push(T(pad, 26, titleText, { weight: 600, size: 14 }));
  background.push(T(pad, 44, productText, { fill: C.muted, size: 11 }));

  background.push(`<defs>
    <marker id="geo-green" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="${C.accent}"/></marker>
    <marker id="geo-amber" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="${C.warn}"/></marker>
  </defs>`);

  // Geography columns: west is always left, unknown/central is middle, east is right.
  laneKeys.forEach((lane) => {
    const x = laneX(lane);
    background.push(RECT(x, laneTop, laneW, H - laneTop - footerH, C.lane, C.border, 8));
    background.push(T(x + laneW / 2, laneTop + 20, laneLabels[lane], { fill: C.muted, size: 10, weight: 600, anchor: "middle" }));
  });

  rowLayout.forEach((row) => {
    background.push(T(pad + roleW - 10, row.y + 22, row.label, {
      fill: row.key === "edge" ? C.warn : row.key === "additional" ? C.info : C.accent,
      size: 10,
      weight: 600,
      anchor: "end",
    }));

    laneKeys.forEach((lane) => {
      const x = laneX(lane);
      const stroke = row.key === "edge" ? C.warn : row.key === "additional" ? C.info : C.border;
      background.push(RECT(x + 6, row.y, laneW - 12, row.h, C.cell, stroke, 7, row.key === "edge"));

      const items = buckets[row.key][lane];
      let y = row.y + cellPad;
      items.forEach((item) => {
        const boxX = x + (laneW - boxW) / 2;
        const provider = IAAS_LABELS[item.iaas] || item.iaas || model.iaasLabel || "";
        const siteSaas = (item.siteKind || "saas") === "saas";
        let title;
        let sub;
        if (row.key === "primary") {
          title = siteSaas ? `Primary JPD ${item.index}` : `Primary JPS ${item.index}`;
          sub = `${provider} · ${item.region} · ${siteSaas ? "SaaS" : "On-Prem"}`;
        } else if (row.key === "additional") {
          title = `Additional Instance ${item.index}`;
          sub = `${provider} · ${item.region} · writable`;
        } else {
          title = `Edge ${item.index}`;
          sub = `${provider} · ${item.region} · ${edgeSelfManaged ? "self-managed" : "Cloud Edge"}`;
        }
        nodes.push(nodeBox(boxX, y, title, sub, row.key));
        anchors[row.key].push({
          x: boxX + boxW / 2,
          top: y,
          bottom: y + boxH,
          lane,
        });
        y += boxH + boxGapY;
      });
    });
  });

  // Primary → Additional uses one clean green bus in the row gap.
  if (anchors.primary.length && anchors.additional.length) {
    const source = anchors.primary[0];
    const primaryRow = rowLayout.find((row) => row.key === "primary");
    const additionalRow = rowLayout.find((row) => row.key === "additional");
    const busY = primaryRow.y + primaryRow.h + rowGap / 2;
    const destinationXs = anchors.additional.map((anchor) => anchor.x);
    const minX = Math.min(source.x, ...destinationXs);
    const maxX = Math.max(source.x, ...destinationXs);
    connectors.push(`<line x1="${source.x}" y1="${source.bottom}" x2="${source.x}" y2="${busY}" stroke="${C.accent}" stroke-width="1.4"/>`);
    connectors.push(`<line x1="${minX}" y1="${busY}" x2="${maxX}" y2="${busY}" stroke="${C.accent}" stroke-width="1.4"/>`);
    anchors.additional.forEach((anchor) => {
      connectors.push(`<line x1="${anchor.x}" y1="${busY}" x2="${anchor.x}" y2="${anchor.top}" stroke="${C.accent}" stroke-width="1.4" marker-end="url(#geo-green)"/>`);
    });
    const visibleGridW = laneKeys.length * laneW + Math.max(0, laneKeys.length - 1) * laneGap;
    connectors.push(T(gridX + visibleGridW / 2, busY - 5, model.accessFederation ? "Access + Repository Federation" : "Repository Federation", { fill: C.accent, size: 9, anchor: "middle" }));
  }

  // Primary → Edge uses a separate amber bus immediately above the Edge row.
  if (anchors.primary.length && anchors.edge.length) {
    const source = anchors.primary[0];
    const edgeRow = rowLayout.find((row) => row.key === "edge");
    const busY = edgeRow.y - rowGap / 2;
    const routeX = gridX - 24;
    const destinationXs = anchors.edge.map((anchor) => anchor.x);
    const minX = Math.min(routeX, ...destinationXs);
    const maxX = Math.max(routeX, ...destinationXs);
    connectors.push(`<path d="M ${source.x} ${source.bottom} L ${routeX} ${source.bottom} L ${routeX} ${busY}" fill="none" stroke="${C.warn}" stroke-width="1.6" stroke-dasharray="6 4"/>`);
    connectors.push(`<line x1="${minX}" y1="${busY}" x2="${maxX}" y2="${busY}" stroke="${C.warn}" stroke-width="1.6" stroke-dasharray="6 4"/>`);
    anchors.edge.forEach((anchor) => {
      connectors.push(`<line x1="${anchor.x}" y1="${busY}" x2="${anchor.x}" y2="${anchor.top}" stroke="${C.warn}" stroke-width="1.6" stroke-dasharray="6 4" marker-end="url(#geo-amber)"/>`);
    });
    const visibleGridW = laneKeys.length * laneW + Math.max(0, laneKeys.length - 1) * laneGap;
    connectors.push(T(gridX + visibleGridW / 2, busY - 5, "Distribution push · Release Bundles → Edge", { fill: C.warn, size: 9, weight: 600, anchor: "middle" }));
  }

  if (footerStacked) {
    background.push(T(W - pad, H - 30, footerRight, { fill: C.muted, size: 10, anchor: "end" }));
    background.push(T(pad, H - 14, footerLeft, { fill: C.muted, size: 11 }));
  } else {
    background.push(T(pad, H - 14, footerLeft, { fill: C.muted, size: 11 }));
    background.push(T(W - pad, H - 14, footerRight, { fill: C.muted, size: 10, anchor: "end" }));
  }

  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px;height:auto" xmlns="http://www.w3.org/2000/svg">${background.join("")}${connectors.join("")}${nodes.join("")}</svg>`;
}

function downloadSvg(filename, svgMarkup) {
  const blob = new Blob([svgMarkup], { type: "image/svg+xml" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function latestStateClass(value) {
  if (value === "included" || value === "threshold") return "included";
  if (value === "not_included") return "excluded";
  return "partial";
}

function renderLatestLicenseReference(input) {
  const data = LATEST_LICENSE_DATA;
  if (!data) {
    return `<div class="banner warn"><strong>Static reference data:</strong> Run <span class="mono">npm run refresh</span> to fetch and generate the latest official license dataset.</div>`;
  }

  const tierKey = input.platform === "pro" ? null : input.platform;
  const thresholds = data.thresholds || {};
  const projects = thresholds.projects?.[input.platform];
  const servers = thresholds.selfManagedArtifactoryServers?.[input.platform];
  const consumption = thresholds.saasBaseConsumptionGB?.[input.platform];
  const securitySeats = thresholds.advancedSecurityBaseContributingDevelopers?.[input.platform];
  const windowDays = thresholds.contributingDeveloperWindowDays;
  const generated = new Date(data.generatedAt).toLocaleString();
  const sourceCount = Object.keys(data.sources || {}).length;
  const allConflicts = data.conflicts || [];
  // A conflict without a tiers list applies everywhere; otherwise scope it to the selected tier.
  const conflicts = allConflicts.filter((conflict) =>
    !Array.isArray(conflict.tiers) || conflict.tiers.includes(input.platform)
  );
  const otherTierConflicts = allConflicts.length - conflicts.length;

  const productRows = tierKey
    ? Object.values(data.productMatrix || {}).map((row) => {
        const cell = row[tierKey] || { state: "conditional", raw: "Not published" };
        return `<tr>
          <td>${esc(row.label)}</td>
          <td><span class="status ${latestStateClass(cell.state)}">${esc(cell.raw)}</span></td>
        </tr>`;
      }).join("")
    : `<tr><td colspan="2" class="muted">The scraped product matrix covers self-managed Pro X / Enterprise X / Enterprise+. SaaS Pro remains governed by Pricing and the customer order.</td></tr>`;

  const featureRows = tierKey
    ? Object.values(data.selfManagedFeatureMatrix || {}).map((row) => {
        const cell = row[tierKey] || { state: "conditional", raw: "Not published" };
        return `<tr>
          <td>${esc(row.label)}</td>
          <td><span class="status ${latestStateClass(cell.state)}">${esc(cell.raw)}</span></td>
        </tr>`;
      }).join("")
    : "";

  const conflictHtml = conflicts.map((conflict) =>
    `<div class="banner warn"><strong>Official-source conflict:</strong> ${esc(conflict.message)}</div>`
  ).join("");

  const sourceLinks = Object.entries(data.sources || {}).map(([name, source]) =>
    `<a href="${esc(source.url)}" target="_blank" rel="noopener">${esc(name)}</a>${source.updatedAt ? ` (${esc(source.updatedAt.slice(0, 10))})` : ""}`
  ).join(" · ");

  return `
    <div class="result-block latest-reference">
      <h3>Latest official license reference</h3>
      <div class="banner ${conflicts.length ? "warn" : "ok"}">
        <strong>${conflicts.length ? "Review required" : "Validated"} for ${esc(PLATFORM[input.platform]?.name || input.platform)}:</strong>
        Daily dataset generated ${esc(generated)} from ${sourceCount} official sources.
        ${otherTierConflicts ? `${otherTierConflicts} source conflict(s) apply to other tiers only.` : ""}
        Contract/SFDC lines remain authoritative.
      </div>
      ${conflictHtml}

      <div class="summary-grid">
        <div class="stat-card">
          <div class="label">Projects</div>
          <div class="value">${Number.isFinite(projects) ? projects : "—"}</div>
          <div class="sub">tier threshold</div>
        </div>
        <div class="stat-card">
          <div class="label">SM servers</div>
          <div class="value">${Number.isFinite(servers) ? servers : "—"}</div>
          <div class="sub">included Artifactory servers</div>
        </div>
        <div class="stat-card">
          <div class="label">SaaS base</div>
          <div class="value" style="font-size:16px">${Number.isFinite(consumption) ? formatGB(consumption) : "Custom / N/A"}</div>
          <div class="sub">storage + transfer</div>
        </div>
        <div class="stat-card">
          <div class="label">AdvSec base</div>
          <div class="value">${Number.isFinite(securitySeats) ? securitySeats : "—"}</div>
          <div class="sub">contributors / ${Number.isFinite(windowDays) ? windowDays : "?"} days</div>
        </div>
      </div>

      <details open>
        <summary>Latest product activation matrix (${Object.keys(data.productMatrix || {}).length} products)</summary>
        <table>
          <thead><tr><th>Product</th><th>${esc(PLATFORM[input.platform]?.name || input.platform)}</th></tr></thead>
          <tbody>${productRows}</tbody>
        </table>
      </details>

      ${tierKey ? `<details>
        <summary>All published self-managed feature thresholds (${Object.keys(data.selfManagedFeatureMatrix || {}).length} rows)</summary>
        <table>
          <thead><tr><th>Feature / threshold</th><th>${esc(PLATFORM[input.platform]?.name || input.platform)}</th></tr></thead>
          <tbody>${featureRows}</tbody>
        </table>
      </details>` : ""}

      <p class="muted" style="margin-bottom:0"><strong>Sources:</strong> ${sourceLinks}</p>
    </div>
  `;
}

function render(result) {
  const out = $("results");
  if (!result) {
    out.innerHTML = `<div class="results-empty">Enter the license details from the order form, then click <strong>Analyze entitlements</strong>.</div>`;
    return;
  }

  const { tier, input } = result;
  const banners = [];
  result.errors.forEach((m) => banners.push(`<div class="banner danger"><strong>Blocker:</strong> ${esc(m)}</div>`));
  result.warnings.forEach((m) => banners.push(`<div class="banner warn"><strong>Watch:</strong> ${esc(m)}</div>`));
  result.infos.forEach((m) => banners.push(`<div class="banner info">${esc(m)}</div>`));
  if (!result.errors.length) {
    banners.unshift(`<div class="banner ok"><strong>Licensed baseline:</strong> ${esc(tier.name)} — ${esc(tier.headline)}</div>`);
  }

  const addonChips = result.activeAddons.length
    ? result.activeAddons.map((a) => `<span class="chip good">${esc(a.name)} ×${a.qty}</span>`).join("")
    : `<span class="chip">No security / product add-ons selected</span>`;

  const capsIncluded = result.capabilityRows.filter((r) => r.status === "included" || r.status === "partial");
  const capsMissing = result.capabilityRows.filter((r) => r.status === "excluded" || r.status === "addon");
  const diagramSvg = buildArchitectureSvg(result.diagramSites);
  window.__lastDiagramSvg = diagramSvg;
  const regionSummary = result.input.regions.length
    ? result.input.regions.map((r) => {
      const provider = IAAS_LABELS[r.iaas] || r.iaas || "";
      const site = r.siteKind === "selfmanaged" ? "JPS" : "JPD";
      return `${provider ? `${provider}/` : ""}${r.region} (${site}): P${r.primary}/A${r.additional}/E${r.edge}`;
    }).join(" · ")
    : "auto-placed from order (add regions for precision)";
  const iaasCardLabel = iaasSummaryLabel(result.input.regions, input.iaas);

  const deployLabel = input.deployModel === "saas"
    ? "SaaS"
    : input.deployModel === "selfmanaged"
      ? "Self-managed"
      : "Hybrid (SaaS + On-Prem)";
  const capacityCard = input.deployModel === "hybrid"
    ? `<div class="stat-card">
        <div class="label">SaaS tenants</div>
        <div class="value">${result.writableSites}</div>
        <div class="sub">primary ${result.saasPlatformQty || input.quantity} + add'l ${result.additionalInstances || 0}</div>
      </div>
      <div class="stat-card">
        <div class="label">On-Prem servers</div>
        <div class="value">${result.serversTotal ?? "—"}</div>
        <div class="sub">packs ${result.selfManagedPlatformQty || 1} · base ${result.serversIncluded ?? "—"} + add'l ${result.additionalServers || 0}</div>
      </div>`
    : `<div class="stat-card">
        <div class="label">${input.deployModel === "saas" ? "Writable tenants" : "Server licenses"}</div>
        <div class="value">${input.deployModel === "saas" ? result.writableSites : (result.serversTotal ?? "—")}</div>
        <div class="sub">${input.deployModel === "saas" ? `primary ${input.quantity} + add'l ${result.additionalInstances || 0}` : `base ${result.serversIncluded ?? "—"} + add'l ${result.additionalServers}`}</div>
      </div>`;

  out.innerHTML = `
    ${input.customerName ? `<p class="muted" style="margin-top:0">Customer: <strong>${esc(input.customerName)}</strong></p>` : ""}
    ${banners.join("")}
    ${renderSfParseReport(lastSfParseReport)}

    <div class="summary-grid">
      <div class="stat-card">
        <div class="label">Platform</div>
        <div class="value" style="font-size:16px">${esc(tier.name)}</div>
        <div class="sub">${deployLabel} · qty ${input.deployModel === "hybrid" ? `SaaS ${result.saasPlatformQty || 1} / On-Prem ${result.selfManagedPlatformQty || 1}` : input.quantity}</div>
      </div>
      ${capacityCard}
      <div class="stat-card">
        <div class="label">Projects</div>
        <div class="value">${result.projects}</div>
        <div class="sub">${result.projectsExtensible ? "extensible via buckets" : "hard cap — cannot extend"}</div>
      </div>
      <div class="stat-card">
        <div class="label">Security seats</div>
        <div class="value">${result.effectiveSeats || "—"}</div>
        <div class="sub">${result.orderSeats ? "from order" : result.includedSeats ? "bundle base" : "none / N/A"}</div>
      </div>
      <div class="stat-card">
        <div class="label">SaaS consumption</div>
        <div class="value" style="font-size:16px">${result.storageGB != null ? formatGB(result.storageGB) : "—"}</div>
        <div class="sub">storage + transfer meter</div>
      </div>
      <div class="stat-card">
        <div class="label">IaaS / topology</div>
        <div class="value" style="font-size:15px">${esc(iaasCardLabel)}</div>
        <div class="sub">${result.edgeCount ? `${result.edgeCount} Edge · ` : ""}${esc(regionSummary)}</div>
      </div>
    </div>

    ${renderLatestLicenseReference(input)}

    <div class="result-block">
      <h3>Architecture diagram</h3>
      <p class="muted" style="margin:0 0 8px">Geography grid: <strong>West ← Central → East → Other</strong>. Empty geography columns are hidden. On-Prem DC names and deployments with no region go to <strong>OTHER</strong> (not Central).</p>
      <div class="diagram-wrap">${diagramSvg}</div>
      <div class="diagram-legend">
        <span class="lg-primary">Primary JPD</span>
        <span class="lg-additional">Additional Platform Instance</span>
        <span class="lg-edge">Edge (self-managed / Cloud)</span>
        <span class="lg-link">West · Central · East placement</span>
      </div>
      <div class="btn-row">
        <button type="button" id="btnDownloadDiagram">Download diagram (.svg)</button>
      </div>
    </div>

    <div class="result-block">
      <h3>Add-ons on this order</h3>
      <div class="chip-row">${addonChips}</div>
      <p class="muted" style="margin:10px 0 0">${esc(result.storageNote)}</p>
      ${result.mlCredits ? `<p class="muted"><strong>ML credits:</strong> ${result.mlCredits.toLocaleString()}</p>` : ""}
    </div>

    <div class="result-block">
      <h3>What they can use</h3>
      <table>
        <thead><tr><th>Capability</th><th>Status</th><th>Notes</th></tr></thead>
        <tbody>
          ${capsIncluded.map((r) => rowHtml(r)).join("")}
        </tbody>
      </table>
    </div>

    <div class="result-block">
      <h3>Not licensed / needs purchase</h3>
      <table>
        <thead><tr><th>Capability</th><th>Status</th><th>Notes</th></tr></thead>
        <tbody>
          ${capsMissing.map((r) => rowHtml(r)).join("")}
        </tbody>
      </table>
    </div>

    <div class="result-block">
      <h3>PS kickoff checklist (for this config)</h3>
      <ul class="checklist">
        ${result.nextSteps.map((s) => `<li><strong>${esc(s.title)}</strong> — ${esc(s.detail)}</li>`).join("")}
      </ul>
    </div>

    <div class="result-block">
      <h3>Always know (PS baseline)</h3>
      <ul class="checklist">
        ${PS_CHECKLIST.map((s) => `<li><strong>${esc(s.title)}</strong> — ${esc(s.detail)}</li>`).join("")}
      </ul>
    </div>
  `;

  $("btnDownloadDiagram")?.addEventListener("click", () => {
    const name = (input.customerName || "customer").replace(/\s+/g, "-").toLowerCase();
    downloadSvg(`jfrog-architecture-${name}.svg`, window.__lastDiagramSvg || diagramSvg);
  });
}

function rowHtml(r) {
  return `<tr>
    <td>${esc(r.label)}</td>
    <td><span class="status ${r.status}">${statusLabel(r.status)}</span></td>
    <td class="muted">${esc(r.detail)}</td>
  </tr>`;
}

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function syncAddonAvailability() {
  const platform = document.querySelector('input[name="platform"]:checked')?.value || "entx";
  document.querySelectorAll("[data-addon]").forEach((row) => {
    const id = row.getAttribute("data-addon");
    const addon = ADDONS[id];
    const ok = addon && addon.requires.includes(platform);
    row.classList.toggle("disabled", !ok);
    if (!ok) {
      const cb = row.querySelector('input[type="checkbox"]');
      if (cb) cb.checked = false;
    }
  });

  const deployHint = $("deployHint");
  const tier = PLATFORM[platform];
  if (deployHint && tier) {
    if (tier.model === "saas") {
      deployHint.textContent = "Pro is SaaS-only.";
      const saas = document.querySelector('input[name="deployModel"][value="saas"]');
      if (saas) saas.checked = true;
    } else if (tier.model === "selfmanaged") {
      deployHint.textContent = "Pro X is self-managed only.";
      const sm = document.querySelector('input[name="deployModel"][value="selfmanaged"]');
      if (sm) sm.checked = true;
    } else {
      deployHint.textContent = "Enterprise X / Enterprise +: SaaS, On-Prem, or both (hybrid). Cloud SKU = SaaS; Enterprise+ MP (no Cloud) = On-Prem.";
    }
  }

  const model = document.querySelector('input[name="deployModel"]:checked')?.value;
  const saasBlock = $("saasStorageBlock");
  if (saasBlock) saasBlock.style.display = (model === "saas" || model === "hybrid") ? "block" : "none";
  const qtyBlock = $("platformQtyBlock");
  const hybridBlock = $("hybridQtyBlock");
  if (qtyBlock) qtyBlock.style.display = model === "hybrid" ? "none" : "block";
  if (hybridBlock) hybridBlock.style.display = model === "hybrid" ? "grid" : "none";
}

/* ---------- Region list UI ---------- */

function currentIaas() {
  return document.querySelector('input[name="iaas"]:checked')?.value || "aws";
}

function addRegionRow(preset = {}) {
  const list = $("regionList");
  if (!list) return;
  const iaas = preset.iaas || currentIaas();
  const siteKind = preset.siteKind || (iaas === "onprem" ? "selfmanaged" : "saas");
  const options = REGION_PRESETS[iaas] || REGION_PRESETS.aws;
  const selected = preset.region && options.includes(preset.region) ? preset.region
    : (preset.region ? "Custom…" : options[0]);
  const customVal = selected === "Custom…" ? (preset.region || "") : "";
  const row = document.createElement("div");
  row.className = "region-row";
  row.innerHTML = `
    <div class="region-field f-provider">
      <label>Provider</label>
      <select class="region-iaas">
        ${["aws", "azure", "gcp", "onprem"].map((p) =>
          `<option value="${p}"${p === iaas ? " selected" : ""}>${esc(IAAS_LABELS[p])}</option>`
        ).join("")}
      </select>
    </div>
    <div class="region-field f-site">
      <label>Site</label>
      <select class="region-site-kind">
        <option value="saas"${siteKind === "saas" ? " selected" : ""}>SaaS JPD</option>
        <option value="selfmanaged"${siteKind === "selfmanaged" ? " selected" : ""}>On-Prem JPS</option>
      </select>
    </div>
    <div class="region-field f-region">
      <label>Region / site name</label>
      <select class="region-select">${options.map((o) => `<option value="${esc(o)}"${o === selected ? " selected" : ""}>${esc(o)}</option>`).join("")}</select>
      <input type="text" class="region-custom" placeholder="Custom region / DC name" value="${esc(customVal)}" style="margin-top:6px;display:${selected === "Custom…" ? "block" : "none"}" />
    </div>
    <div class="region-field f-primary">
      <label>Primary</label>
      <input type="number" class="qty-primary" min="0" step="1" value="${preset.primary ?? 0}" />
    </div>
    <div class="region-field f-additional">
      <label>Additional</label>
      <input type="number" class="qty-additional" min="0" step="1" value="${preset.additional ?? 0}" />
    </div>
    <div class="region-field f-edge">
      <label>Edge</label>
      <input type="number" class="qty-edge" min="0" step="1" value="${preset.edge ?? 0}" />
    </div>
    <button type="button" class="btn-remove" title="Remove region">×</button>
  `;
  list.appendChild(row);

  const iaasSelect = row.querySelector(".region-iaas");
  const siteSelect = row.querySelector(".region-site-kind");
  const select = row.querySelector(".region-select");
  const custom = row.querySelector(".region-custom");

  function refillRegionOptions(keepName) {
    const nextIaas = iaasSelect.value;
    const opts = REGION_PRESETS[nextIaas] || REGION_PRESETS.aws;
    const current = keepName || (select.value === "Custom…" ? custom.value : select.value);
    const inList = opts.includes(current);
    select.innerHTML = opts.map((o) =>
      `<option value="${esc(o)}"${(inList ? current === o : o === "Custom…") ? " selected" : ""}>${esc(o)}</option>`
    ).join("");
    if (!inList && current) {
      select.value = "Custom…";
      custom.style.display = "block";
      custom.value = current;
    } else {
      custom.style.display = select.value === "Custom…" ? "block" : "none";
    }
  }

  iaasSelect.addEventListener("change", () => {
    // Switching to On-Prem DC often means self-managed; cloud providers default to SaaS unless already set.
    if (iaasSelect.value === "onprem" && siteSelect.value === "saas") {
      siteSelect.value = "selfmanaged";
    }
    refillRegionOptions(select.value === "Custom…" ? custom.value : select.value);
  });
  select.addEventListener("change", () => {
    custom.style.display = select.value === "Custom…" ? "block" : "none";
  });
  row.querySelector(".btn-remove").addEventListener("click", () => {
    row.remove();
    if (!$("regionList").children.length) addRegionRow({ primary: 1 });
  });
}

function rebuildRegionOptionsPreserving() {
  // Default provider radio only affects newly added rows; existing rows keep their own provider.
  const list = $("regionList");
  if (list && !list.children.length) {
    addRegionRow({ primary: 1, additional: 0, edge: 0 });
  }
}

function clearRegions() {
  const list = $("regionList");
  if (!list) return;
  list.innerHTML = "";
}

function loadExample() {
  $("customerName").value = "Example Corp";
  document.querySelector('input[name="platform"][value="entplus"]').checked = true;
  document.querySelector('input[name="deployModel"][value="hybrid"]').checked = true;
  document.querySelector('input[name="iaas"][value="gcp"]').checked = true;
  $("platformQty").value = "1";
  if ($("saasPlatformQty")) $("saasPlatformQty").value = "1";
  if ($("selfManagedPlatformQty")) $("selfManagedPlatformQty").value = "1";
  $("saasUnits").value = "6760";
  $("saasUnitSizeGB").value = "1000";
  $("securitySeats").value = "0";
  $("orderNotes").value = "Hybrid: Cloud Enterprise+ SaaS on GCP + Enterprise+ MP On-Prem on Azure · Additional Platform Instance ×1 · Edge ×2.";
  syncAddonAvailability();
  document.querySelectorAll("[data-addon]").forEach((row) => {
    const id = row.getAttribute("data-addon");
    const cb = row.querySelector('input[type="checkbox"]');
    const qty = row.querySelector('input[type="number"]');
    if (id === "additionalInstances") { cb.checked = true; qty.value = "1"; }
    else if (id === "edge") { cb.checked = true; qty.value = "2"; }
    else if (id === "additionalServers") { cb.checked = true; qty.value = "3"; }
    else if (id === "mlCredits") { cb.checked = true; qty.value = "2000"; }
    else { cb.checked = false; }
  });
  clearRegions();
  addRegionRow({ iaas: "gcp", siteKind: "saas", region: "us-east1", primary: 1, additional: 0, edge: 0 });
  addRegionRow({ iaas: "gcp", siteKind: "saas", region: "us-west1", primary: 0, additional: 1, edge: 0 });
  addRegionRow({ iaas: "azure", siteKind: "selfmanaged", region: "eastus", primary: 1, additional: 0, edge: 0 });
  addRegionRow({ iaas: "azure", siteKind: "selfmanaged", region: "Custom…", primary: 0, additional: 0, edge: 2 });
  const last = $("regionList")?.lastElementChild;
  if (last) {
    const sel = last.querySelector(".region-select");
    const custom = last.querySelector(".region-custom");
    if (sel) sel.value = "Custom…";
    if (custom) {
      custom.style.display = "block";
      custom.value = "Edge POP (remote)";
    }
    last.querySelector(".qty-edge").value = "2";
  }
  analyzeForm();
}

function resetForm() {
  lastSfParseReport = null;
  $("customerName").value = "";
  document.querySelector('input[name="platform"][value="entx"]').checked = true;
  document.querySelector('input[name="deployModel"][value="saas"]').checked = true;
  document.querySelector('input[name="iaas"][value="aws"]').checked = true;
  const edgeSelf = document.querySelector('input[name="edgeOps"][value="selfmanaged"]');
  if (edgeSelf) edgeSelf.checked = true;
  $("platformQty").value = "1";
  $("saasUnits").value = "0";
  $("saasUnitSizeGB").value = "1000";
  $("securitySeats").value = "0";
  $("orderNotes").value = "";
  document.querySelectorAll("[data-addon] input[type='checkbox']").forEach((cb) => { cb.checked = false; });
  document.querySelectorAll("[data-addon] input[type='number']").forEach((n) => {
    const row = n.closest("[data-addon]");
    n.value = row?.getAttribute("data-addon") === "mlCredits" ? "2000" : "1";
  });
  syncAddonAvailability();
  clearRegions();
  addRegionRow({ primary: 1, additional: 0, edge: 0 });
  render(null);
}

/** Analyze whatever is currently in the form. Never re-parses the SF paste. */
function analyzeForm() {
  const input = collectInputs();
  const result = analyze(input);
  render(result);
}

function runAnalyze() {
  // If Order notes look like an SF opportunity paste, auto-fill inputs first.
  const notes = $("orderNotes")?.value || "";
  if (looksLikeSfOrderPaste(notes)) {
    try {
      const parsed = parseSfOrderPaste(notes);
      lastSfParseReport = parsed.report || null;
      applyInputs({
        customerName: $("customerName")?.value || "",
        platform: parsed.platform,
        deployModel: parsed.deployModel,
        quantity: parsed.quantity,
        saasPlatformQty: parsed.saasPlatformQty,
        selfManagedPlatformQty: parsed.selfManagedPlatformQty,
        iaas: parsed.iaas,
        edgeOps: parsed.edgeOps,
        addons: parsed.addons,
        saasUnits: parsed.saasUnits,
        saasUnitSizeGB: parsed.saasUnitSizeGB,
        securitySeats: parsed.securitySeats,
        regions: parsed.regions,
        // Keep the SF paste in the textarea; never copy it into results as "Order notes".
      });
      return; // applyInputs analyzes the filled form
    } catch (err) {
      // Fall through to normal analyze; show parse issue as a banner via last report
      lastSfParseReport = { matched: [], ignored: [], unknown: [], parseError: err?.message || String(err) };
    }
  }
  analyzeForm();
}

function exportJson() {
  const input = collectInputs();
  const result = analyze(input);
  const blob = new Blob([JSON.stringify({ dataAsOf: DATA_AS_OF, input, result: {
    platform: result.tier.name,
    deployModel: input.deployModel,
    iaas: input.iaas,
    edgeOps: input.edgeOps,
    regions: input.regions,
    serversTotal: result.serversTotal,
    writableSites: result.writableSites,
    edgeCount: result.edgeCount,
    projects: result.projects,
    effectiveSeats: result.effectiveSeats,
    storageGB: result.storageGB,
    storageNote: result.storageNote,
    mlCredits: result.mlCredits,
    addons: result.activeAddons.map((a) => ({ id: a.id, name: a.name, qty: a.qty })),
    included: result.capabilityRows.filter((r) => r.status === "included" || r.status === "partial").map((r) => r.label),
    notLicensed: result.capabilityRows.filter((r) => r.status !== "included" && r.status !== "partial").map((r) => ({ label: r.label, status: r.status })),
    warnings: result.warnings,
    errors: result.errors,
  } }, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `jfrog-entitlements-${(input.customerName || "customer").replace(/\s+/g, "-").toLowerCase()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

const REPORT_CSS = `
:root{--bg:#ffffff;--panel-2:#f2f3f6;--border:#d8dbe2;--text:#1b1e24;--muted:#5b6270;--accent:#1f8f4d;--warn:#a86400;--danger:#b83227;--info:#1f6fb2;--chip:#eef0f3;--included:rgba(31,143,77,0.12);--excluded:rgba(184,50,39,0.10);--partial:rgba(168,100,0,0.12);}
*{box-sizing:border-box;}
body{margin:0;padding:24px 32px 48px;background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;}
h1{font-size:20px;margin:0 0 4px;}
.report-meta{color:var(--muted);font-size:12px;margin:0 0 6px;}
.summary-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin:18px 0;}
.stat-card{background:var(--panel-2);border:1px solid var(--border);border-radius:8px;padding:12px 14px;}
.stat-card .label{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;}
.stat-card .value{margin-top:4px;font-size:20px;font-weight:600;}
.stat-card .sub{margin-top:2px;font-size:11px;color:var(--muted);}
.banner{border-radius:8px;padding:10px 12px;margin-bottom:12px;font-size:13px;border:1px solid;}
.banner.warn{background:var(--partial);border-color:var(--warn);}
.banner.danger{background:var(--excluded);border-color:var(--danger);}
.banner.info{background:rgba(31,111,178,.10);border-color:var(--info);}
.banner.ok{background:var(--included);border-color:var(--accent);}
.result-block{margin-top:18px;break-inside:avoid;page-break-inside:avoid;}
.result-block h3{margin:0 0 10px;font-size:14px;font-weight:600;}
table{width:100%;border-collapse:collapse;font-size:13px;}
th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--border);vertical-align:top;}
th{color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.04em;font-weight:600;}
.status{display:inline-block;font-size:11px;font-weight:600;padding:2px 8px;border-radius:999px;border:1px solid transparent;}
.status.included{background:var(--included);color:var(--accent);border-color:rgba(31,143,77,.35);}
.status.excluded{background:var(--excluded);color:var(--danger);border-color:rgba(184,50,39,.35);}
.status.addon{background:var(--partial);color:var(--warn);border-color:rgba(168,100,0,.4);}
.status.partial{background:rgba(31,111,178,.10);color:var(--info);border-color:rgba(31,111,178,.35);}
.chip-row{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 0;}
.chip{background:var(--chip);border:1px solid var(--border);border-radius:999px;padding:3px 10px;font-size:11px;}
.chip.good{border-color:rgba(31,143,77,.45);color:var(--accent);}
.chip.bad{border-color:rgba(184,50,39,.45);color:var(--danger);}
.chip.warn{border-color:rgba(168,100,0,.45);color:var(--warn);}
.checklist{list-style:none;margin:0;padding:0;}
.checklist li{position:relative;padding:8px 10px 8px 28px;border-bottom:1px solid var(--border);font-size:13px;}
.checklist li::before{content:"\\2610";position:absolute;left:8px;color:var(--muted);}
.checklist li strong{color:var(--text);}
.muted{color:var(--muted);}
.mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;}
.diagram-wrap{margin-top:10px;overflow-x:auto;border:1px solid var(--border);border-radius:8px;background:var(--panel-2);padding:12px;}
.diagram-wrap svg{display:block;margin:0 auto;max-width:100%;}
.diagram-legend{display:flex;flex-wrap:wrap;gap:10px;margin-top:10px;font-size:11px;color:var(--muted);}
.diagram-legend span::before{content:"";display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:6px;vertical-align:-1px;border:1px solid var(--border);}
.diagram-legend .lg-primary::before{background:rgba(31,143,77,.25);border-color:var(--accent);}
.diagram-legend .lg-additional::before{background:rgba(31,111,178,.2);border-color:var(--info);}
.diagram-legend .lg-edge::before{background:rgba(168,100,0,.15);border-color:var(--warn);}
.diagram-legend .lg-link::before{background:transparent;border-color:var(--accent);box-shadow:inset 0 0 0 1px var(--accent);}
.latest-reference details{margin-top:10px;background:var(--panel-2);border:1px solid var(--border);border-radius:7px;overflow:hidden;}
.latest-reference summary{cursor:pointer;padding:10px 12px;font-size:12px;font-weight:600;}
.btn-row,button{display:none !important;}
@media print{
  body{padding:0 12px;}
  .result-block{break-inside:avoid;page-break-inside:avoid;}
  a{color:inherit;text-decoration:none;}
}
`;

function buildReportDocument() {
  const resultsNode = $("results").cloneNode(true);
  resultsNode.querySelectorAll(".btn-row, button").forEach((el) => el.remove());
  const customerName = $("customerName")?.value?.trim() || "";
  const generated = new Date().toISOString().slice(0, 10);
  const filenameBase = (customerName || "customer").replace(/\s+/g, "-").toLowerCase();
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>JFrog License Entitlements${customerName ? ` — ${esc(customerName)}` : ""}</title>
<style>${REPORT_CSS}</style>
</head>
<body>
  <h1>JFrog License Entitlements Analyzer</h1>
  ${customerName ? `<p class="report-meta">Customer: <strong>${esc(customerName)}</strong></p>` : ""}
  <p class="report-meta">Generated ${generated} · Data as of ${esc(DATA_AS_OF || "")}</p>
  <p class="report-meta">Internal PS use only. Not officially supported by JFrog. Entitlements change — validate against the customer contract / SFDC order before architecture or SOW commitments.</p>
  ${resultsNode.innerHTML}
</body>
</html>`;
  return { html, filenameBase };
}

function hasReportContent() {
  return !$("results")?.querySelector(".results-empty");
}

function exportReportHtml() {
  if (!hasReportContent()) {
    alert("Click \"Analyze entitlements\" first, then export the report.");
    return;
  }
  const { html, filenameBase } = buildReportDocument();
  const blob = new Blob([html], { type: "text/html" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `jfrog-entitlements-${filenameBase}.html`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function exportReportPdf() {
  if (!hasReportContent()) {
    alert("Click \"Analyze entitlements\" first, then export the report.");
    return;
  }
  const { html } = buildReportDocument();
  const win = window.open("", "_blank");
  if (!win) {
    alert("Pop-up blocked — allow pop-ups for this site to export a PDF, or use \"Export report (HTML)\" and print that file to PDF instead.");
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 350);
}

function setRadio(name, value, fallback) {
  const wanted = value || fallback;
  const el = document.querySelector(`input[name="${name}"][value="${wanted}"]`)
    || document.querySelector(`input[name="${name}"][value="${fallback}"]`);
  if (el) el.checked = true;
}

/* ---------- Salesforce order paste ---------- */

function parseSfNumber(raw) {
  if (raw == null || raw === "") return null;
  const cleaned = String(raw).replace(/[$,]/g, "").replace(/,/g, "").trim();
  if (!cleaned || cleaned === "-") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function detectIaasFromText(...parts) {
  const text = parts.filter(Boolean).join(" ").toLowerCase();
  if (/\baws\b/.test(text)) return "aws";
  if (/\bazure\b/.test(text)) return "azure";
  if (/\bgcp\b|\bgoogle\b/.test(text)) return "gcp";
  if (/\bon[- ]?prem/.test(text)) return "onprem";
  return null;
}

function normalizeSfRegionToken(token, iaas) {
  let t = String(token || "").trim();
  if (!t) return "";
  t = t.replace(/^(aws|azure|gcp)\s+/i, "").trim();
  // "us-east-1 / N. Virginia" or "us-east / Virginia" or "eu west-2 / London"
  const beforeSlash = t.split("/")[0].trim();
  let code = beforeSlash.replace(/\s+/g, "-").toLowerCase();

  if (iaas === "azure") {
    const azureMap = {
      "us-east": "eastus",
      "us-east-1": "eastus",
      "us-east-2": "eastus2",
      "us-west": "westus",
      "us-west-1": "westus",
      "us-west-2": "westus2",
      "us-central": "centralus",
      "eu-west": "westeurope",
      "eu-north": "northeurope",
      "uk-south": "uksouth",
    };
    if (azureMap[code]) return azureMap[code];
    // already canonical like eastus
    return code.replace(/_/g, "");
  }
  if (iaas === "gcp") {
    const gcpMap = {
      "eu-west-2": "europe-west2",
      "eu-west-1": "europe-west1",
      "eu-west-3": "europe-west3",
      "eu-north-1": "europe-north1",
      "us-east-1": "us-east1",
      "us-west-1": "us-west1",
      "us-central-1": "us-central1",
    };
    if (gcpMap[code]) return gcpMap[code];
    // GCP codes usually have no second hyphen number style us-east1
    return code.replace(/^(us|europe|asia|australia|southamerica)-([a-z]+)-(\d+)$/, "$1-$2$3");
  }
  // AWS: keep us-east-1 style
  return code;
}

function extractSfRegions(regionField, iaasHint) {
  const iaas = iaasHint || detectIaasFromText(regionField) || "aws";
  const chunks = String(regionField || "").split(/;/).map((s) => s.trim()).filter(Boolean);
  const regions = [];
  chunks.forEach((chunk) => {
    const name = normalizeSfRegionToken(chunk, iaas);
    if (name) regions.push(name);
  });
  return { iaas, regions };
}

function splitSfLine(line) {
  const cols = line.includes("\t")
    ? line.split("\t").map((c) => c.trim())
    : line.split(/\s{2,}/).map((c) => c.trim()).filter(Boolean);
  // Drop currency cells so Net Amount / List Price never become products or shift Provider/Region.
  return cols.filter((c) => !isMoneyOnlyCell(c));
}

/** Pure currency / money cell — never treat as product, qty, or region. */
function isMoneyOnlyCell(value) {
  const t = String(value || "").trim();
  if (!t) return false;
  if (/^\$/.test(t)) return true;
  if (/^\(?-?\$[\d,]+(\.\d{1,2})?\)?$/.test(t)) return true;
  if (/^\(?-?[\d,]+\.\d{2}\)?\s*(usd|eur|gbp|cad|aud)?$/i.test(t)) return true;
  if (/^(usd|eur|gbp|cad|aud)\s*-?[\d,]+(\.\d{2})?$/i.test(t)) return true;
  return false;
}

/** Commercial / pricing noise — skip silently; do not list in Matched / Ignored / Unmapped. */
function isCommercialOrMoneyNoise(productName) {
  const t = String(productName || "").trim();
  if (!t) return true;
  if (isMoneyOnlyCell(t)) return true;
  if (/^[\d.,$-]+$/.test(t)) return true;
  if (/^(net amount|list price|sales price|total price|unit price|amount|subtotal|discount|promo|commission|refund|proration|past due|unpaid usage|partner commission)\b/i.test(t)) {
    return true;
  }
  if (/\b(refund|proration credit|partner commission|past due balance|unpaid usage)\b/i.test(t)) {
    return true;
  }
  return false;
}

function isSfHeaderOrNoise(line) {
  const t = line.trim().toLowerCase();
  if (!t) return true;
  if (isMoneyOnlyCell(t) || isCommercialOrMoneyNoise(t)) return true;
  if (/^product\b/.test(t) && /qty|quantity/.test(t)) return true;
  if (t === "product" || t === "products" || t === "related contracts" || t === "description") return true;
  if (t === "qty" || t === "quantity" || t === "# units" || t === "unit measure") return true;
  if (t === "provider" || t === "region" || t === "rounding discount" || t === "manual disc." || t === "manual disc") return true;
  if (t === "net amount" || t === "volume discount" || t === "promo amount" || t === "academic discount") return true;
  if (t === "list price" || t === "sales price" || t === "total price" || t === "unit price" || t === "currency" || t === "amount") return true;
  if (t === "subtotal" || t.startsWith("subtotal")) return true;
  if (/select row for drill down/.test(t)) return true;
  if (/^\w[\w\s/-]+\(\d+\)$/.test(t)) return true; // "Cloud Subscription(73)"
  if (/^(cloud subscription|cloud usage|adjustment|security|commission)\b/.test(t) && /checked|unchecked/.test(t)) return true;
  if (/^(qty|# units|unit measure|provider|region|net amount|list price|sales price)/.test(t)) return true;
  return false;
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Expand a collapsed SF paste (often one long space-separated line copied from the UI)
 * into one segment per product, using known product names as split points.
 */
function expandSfPasteSegments(text) {
  const map = window.JFROG_SF_PRODUCT_MAP;
  const raw = String(text || "").trim();
  if (!raw || !map) return raw ? [raw] : [];

  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  // Already a normal multi-line / TSV paste — keep rows as-is.
  if (lines.length > 1 || lines.some((l) => l.includes("\t"))) {
    return lines;
  }

  const blob = lines.join(" ").replace(/\s+/g, " ").trim();
  const names = [];
  (map.products || []).forEach((product) => {
    names.push(product.name, ...(product.aliases || []));
  });
  names.sort((a, b) => b.length - a.length);

  const lower = blob.toLowerCase();
  const matches = [];
  let i = 0;
  while (i < blob.length) {
    let found = null;
    for (const name of names) {
      const n = name.toLowerCase();
      if (!lower.startsWith(n, i)) continue;
      if (i > 0 && !/\s/.test(blob[i - 1])) continue;
      const after = i + name.length;
      if (after < blob.length && !/\s/.test(blob[after])) continue;
      found = { start: i, end: after, name };
      break;
    }
    if (found) {
      matches.push(found);
      i = found.end;
    } else {
      i += 1;
    }
  }

  if (matches.length < 2) return [blob];

  return matches.map((match, idx) => {
    const end = idx + 1 < matches.length ? matches[idx + 1].start : blob.length;
    return blob.slice(match.start, end).trim();
  }).filter(Boolean);
}

/**
 * Parse qty / units / measure / provider / region from the text after a product name.
 * Handles both TSV columns and space-collapsed SF copies; strips $ amounts.
 */
function parseSfSegmentFields(segment, matchedAs) {
  if (segment.includes("\t")) {
    const cols = splitSfLine(segment);
    return {
      productName: cols[0],
      qty: parseSfNumber(cols[1]) ?? 1,
      units: parseSfNumber(cols[2]),
      unitMeasure: cols[3] || "",
      provider: cols[4] || "",
      regionField: cols[5] || "",
    };
  }

  const re = new RegExp("^" + escapeRegExp(matchedAs) + "\\s*", "i");
  let rest = segment.replace(re, "").trim();
  rest = rest
    .split(/\s+/)
    .filter((tok) => !isMoneyOnlyCell(tok) && !/^-\$[\d,]+/.test(tok))
    .join(" ")
    .trim();

  const structured = rest.match(
    /^(\d+)\s+([\d,]+)(?:\s+(Security\s+Seats|TB|GB|Seats))?(?:\s+(AWS|Azure|GCP|On-Prem|On\s*Prem))?(?:\s+(.*))?$/i
  );
  if (structured) {
    return {
      productName: matchedAs,
      qty: parseSfNumber(structured[1]) ?? 1,
      units: parseSfNumber(structured[2]),
      unitMeasure: structured[3] || "",
      provider: (structured[4] || "").replace(/\s+/g, ""),
      regionField: (structured[5] || "").trim(),
    };
  }

  const qtyOnly = rest.match(/^(\d+)\s*$/);
  if (qtyOnly) {
    return {
      productName: matchedAs,
      qty: parseSfNumber(qtyOnly[1]) ?? 1,
      units: null,
      unitMeasure: "",
      provider: "",
      regionField: "",
    };
  }

  return {
    productName: matchedAs,
    qty: 1,
    units: null,
    unitMeasure: "",
    provider: "",
    regionField: "",
  };
}

/** Never surface SF paste or dollar amounts in results / export. */
function sanitizeNotesForResults(notes) {
  const text = String(notes || "").trim();
  if (!text) return "";
  if (/\$/.test(text)) return "";
  if (looksLikeSfOrderPaste(text)) return "";
  const map = window.JFROG_SF_PRODUCT_MAP;
  if (map) {
    let hits = 0;
    for (const product of map.products || []) {
      if (text.toLowerCase().includes(String(product.name || "").toLowerCase())) {
        hits += 1;
        if (hits >= 2) return "";
      }
    }
  }
  return text;
}

function looksLikeSfOrderPaste(text) {
  const raw = String(text || "");
  if (!raw.trim()) return false;
  if (looksLikeSfCatalogTree(raw)) return false;
  const map = window.JFROG_SF_PRODUCT_MAP;
  if (!map) return false;
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let hits = 0;
  for (const line of lines) {
    if (isSfHeaderOrNoise(line)) continue;
    const productName = (line.includes("\t") ? line.split("\t")[0] : line).trim();
    if (map.matchSfProduct(productName)) hits += 1;
    if (hits >= 2) return true;
  }
  // Collapsed single-line SF copy (space-separated products + optional $ amounts)
  if (lines.length === 1 && /\$/.test(raw) && expandSfPasteSegments(raw).length >= 2) return true;
  return hits >= 1 && /\t\d+/.test(raw);
}

function looksLikeSfCatalogTree(text) {
  return /cloud subscription\(\d+\)/i.test(text)
    && /cloud usage\(\d+\)/i.test(text)
    && /security\(\d+\)/i.test(text)
    && !/jfrog cloud enterprise/i.test(text)
    && !/additional data consumption\t/i.test(text);
}

/**
 * Parse a Salesforce opportunity / quote product paste into analyzer inputs.
 * Supports tab-separated order lines (Product, Qty, # Units, Unit Measure, Provider, Region, …).
 */
function parseSfOrderPaste(text) {
  const map = window.JFROG_SF_PRODUCT_MAP;
  if (!map) {
    throw new Error("sf-product-map.js failed to load.");
  }
  const raw = String(text || "").trim();
  if (!raw) {
    throw new Error("Paste Salesforce order lines into Order notes first.");
  }
  if (looksLikeSfCatalogTree(raw)) {
    throw new Error("That paste looks like the SF product-family browser, not an order. Paste opportunity/quote lines (Product, Qty, # Units, Provider, Region).");
  }

  const matched = [];
  const ignored = [];
  const unknown = [];
  const addons = {};
  const regionBuckets = {}; // region -> { primary, additional, edge }
  let platform = null;
  let deployModel = null;
  let quantity = 1;
  let saasPlatformQty = 0;
  let selfManagedPlatformQty = 0;
  let seenSaasPlatform = false;
  let seenSelfManagedPlatform = false;
  let iaas = null;
  let edgeOps = null;
  let securitySeats = 0;
  let consumptionTb = 0;
  let dedicated = false;
  let primaryPlaced = false;

  function preferPlatform(next) {
    const rank = { pro: 1, prox: 2, entx: 3, entplus: 4 };
    if (!next) return;
    if (!platform || (rank[next] || 0) >= (rank[platform] || 0)) {
      platform = next;
    }
  }

  function bumpRegion(region, field, amount, meta = {}) {
    if (!region || !amount) return;
    const rowIaas = meta.iaas || "aws";
    const siteKind = meta.siteKind || "saas";
    const key = `${rowIaas}::${siteKind}::${region}`;
    if (!regionBuckets[key]) {
      regionBuckets[key] = {
        region,
        iaas: rowIaas,
        siteKind,
        primary: 0,
        additional: 0,
        edge: 0,
      };
    }
    regionBuckets[key][field] += amount;
  }

  function enableAddon(id, qty) {
    if (!id) return;
    const next = Math.max(1, Number(qty) || 1);
    addons[id] = Math.max(addons[id] || 0, next);
  }

  const lines = expandSfPasteSegments(raw);
  lines.forEach((line) => {
    if (isSfHeaderOrNoise(line)) return;

    // Resolve the product name first (TSV col0 or longest known prefix on collapsed rows).
    let probeName = line.includes("\t") ? splitSfLine(line)[0] : line;
    if (!probeName || isCommercialOrMoneyNoise(probeName)) return;

    const hit = map.matchSfProduct(probeName);
    if (!hit) {
      if (isCommercialOrMoneyNoise(probeName) || /^[\d.,$-]+$/.test(probeName)) return;
      unknown.push(probeName);
      return;
    }

    const fields = parseSfSegmentFields(line, hit.matchedAs);
    const productName = fields.productName || hit.matchedAs;
    const action = hit.product.action || {};
    const qty = fields.qty ?? 1;
    const units = fields.units;
    const unitMeasure = fields.unitMeasure || "";
    const provider = fields.provider || "";
    const regionField = fields.regionField || "";
    const lineIaas = detectIaasFromText(provider, regionField) || iaas;
    if (lineIaas) iaas = lineIaas;
    const { regions } = extractSfRegions(regionField, lineIaas || iaas);

    if (action.kind === "ignore") {
      // Commercial / out-of-scope lines are dropped silently — do not show in Ignored.
      return;
    }

    matched.push({ name: productName, matchedAs: hit.matchedAs, action: action.kind, qty, units });

    if (action.kind !== "platform" && action.deployModel && !seenSaasPlatform && !seenSelfManagedPlatform) {
      deployModel = action.deployModel;
    }
    if (action.edgeOps) edgeOps = action.edgeOps;

    if (action.kind === "platform") {
      preferPlatform(action.platform);
      const lineQty = Math.max(1, qty || 1);
      const siteKind = action.deployModel === "selfmanaged" ? "selfmanaged" : "saas";
      const rowIaas = lineIaas
        || (siteKind === "selfmanaged" ? "onprem" : null)
        || iaas
        || "aws";
      if (action.deployModel === "saas") {
        seenSaasPlatform = true;
        saasPlatformQty += lineQty;
      } else if (action.deployModel === "selfmanaged") {
        seenSelfManagedPlatform = true;
        selfManagedPlatformQty += lineQty;
      } else {
        // Ambiguous platform line (no Cloud / MP cue) — keep as quantity on whichever side we already have
        quantity = Math.max(quantity, lineQty);
      }
      if (action.role === "primary") {
        const targets = regions.length
          ? regions
          : (siteKind === "selfmanaged" ? ["Primary DC"] : []);
        if (targets.length) {
          bumpRegion(targets[0], "primary", lineQty, { iaas: rowIaas, siteKind });
          primaryPlaced = true;
        }
      }
      return;
    }

    if (action.kind === "dedicated") {
      dedicated = true;
      return;
    }

    if (action.kind === "seats") {
      securitySeats += Math.max(0, units ?? 0);
      return;
    }

    if (action.kind === "consumptionTb") {
      let tb = Math.max(0, units ?? 0);
      if (/gb/i.test(unitMeasure) && tb > 0) tb = tb / 1000;
      consumptionTb += tb;
      return;
    }

    if (action.kind === "projects") {
      let buckets = qty || 1;
      if (units != null && units > 0) {
        buckets = Math.max(1, Math.ceil(units / 100));
      }
      enableAddon("projectBuckets", buckets);
      return;
    }

    if (action.kind === "addon") {
      let addonQty = qty || 1;
      if (action.qtyFrom === "units" && units != null) addonQty = Math.max(1, units);
      enableAddon(action.id, addonQty);
      (action.alsoEnable || []).forEach((id) => enableAddon(id, 1));
      if (action.seatsFromUnits && units != null) securitySeats += Math.max(0, units);

      if (action.role === "additional" && regions.length) {
        const per = Math.max(1, Math.floor(addonQty / regions.length));
        let remain = addonQty;
        const rowIaas = lineIaas || iaas || "aws";
        regions.forEach((r, idx) => {
          const n = idx === regions.length - 1 ? remain : per;
          bumpRegion(r, "additional", n, { iaas: rowIaas, siteKind: "saas" });
          remain -= n;
        });
      } else if (action.role === "edge") {
        const rowIaas = lineIaas || iaas || "aws";
        if (regions.length) {
          const per = Math.max(1, Math.floor(addonQty / regions.length));
          let remain = addonQty;
          regions.forEach((r, idx) => {
            const n = idx === regions.length - 1 ? remain : per;
            bumpRegion(r, "edge", n, { iaas: rowIaas, siteKind: "saas" });
            remain -= n;
          });
        } else if (Object.keys(regionBuckets).length) {
          // Fall back: put edges on first known region
          const firstKey = Object.keys(regionBuckets)[0];
          const first = regionBuckets[firstKey];
          bumpRegion(first.region, "edge", addonQty, {
            iaas: first.iaas || rowIaas,
            siteKind: first.siteKind || "saas",
          });
        }
      }
    }
  });

  if (!matched.length && !ignored.length) {
    throw new Error("No recognizable Salesforce product lines found. Paste Product / Qty / # Units / Provider / Region rows.");
  }

  if (seenSaasPlatform && seenSelfManagedPlatform) {
    deployModel = "hybrid";
    quantity = Math.max(1, saasPlatformQty || 1);
  } else if (seenSaasPlatform) {
    deployModel = "saas";
    quantity = Math.max(1, saasPlatformQty || 1);
  } else if (seenSelfManagedPlatform) {
    deployModel = "selfmanaged";
    quantity = Math.max(1, selfManagedPlatformQty || 1);
  } else {
    deployModel = deployModel || "saas";
  }

  const regions = Object.values(regionBuckets);
  const providers = [];
  regions.forEach((r) => {
    const key = r.iaas || "aws";
    if (!providers.includes(key)) providers.push(key);
  });
  return {
    platform: platform || "entx",
    deployModel,
    quantity,
    saasPlatformQty: seenSaasPlatform ? Math.max(1, saasPlatformQty) : (deployModel === "saas" ? quantity : 0),
    selfManagedPlatformQty: seenSelfManagedPlatform ? Math.max(1, selfManagedPlatformQty) : (deployModel === "selfmanaged" ? quantity : 0),
    iaas: providers[0] || iaas || "aws",
    edgeOps: edgeOps || "selfmanaged",
    addons,
    saasUnits: consumptionTb > 0 ? Math.round(consumptionTb) : 0,
    saasUnitSizeGB: 1000,
    securitySeats,
    regions,
    dedicated,
    notes: "",
    report: {
      matched,
      ignored,
      unknown,
      consumptionTb,
      dedicated,
      hybrid: deployModel === "hybrid",
      saasPlatformQty: seenSaasPlatform ? saasPlatformQty : 0,
      selfManagedPlatformQty: seenSelfManagedPlatform ? selfManagedPlatformQty : 0,
      providers,
    },
  };
}

function applySfParse(parsed) {
  lastSfParseReport = parsed.report || null;
  applyInputs({
    customerName: $("customerName")?.value || "",
    platform: parsed.platform,
    deployModel: parsed.deployModel,
    quantity: parsed.quantity,
    saasPlatformQty: parsed.saasPlatformQty,
    selfManagedPlatformQty: parsed.selfManagedPlatformQty,
    iaas: parsed.iaas,
    edgeOps: parsed.edgeOps,
    addons: parsed.addons,
    saasUnits: parsed.saasUnits,
    saasUnitSizeGB: parsed.saasUnitSizeGB,
    securitySeats: parsed.securitySeats,
    regions: parsed.regions,
  });
}

function parseSfFromNotes() {
  try {
    const text = $("orderNotes")?.value || "";
    const parsed = parseSfOrderPaste(text);
    applySfParse(parsed);
  } catch (err) {
    lastSfParseReport = null;
    const msg = err?.message || String(err);
    const results = $("results");
    if (results) {
      results.innerHTML = `<div class="banner warn"><strong>SF paste:</strong> ${esc(msg)}</div>`;
    } else {
      alert(msg);
    }
  }
}

function renderSfParseReport(report) {
  if (!report) return "";
  if (report.parseError) {
    return `<div class="banner warn"><strong>SF paste:</strong> ${esc(report.parseError)}</div>`;
  }
  const ignored = (report.ignored || []).filter((m) => !isCommercialOrMoneyNoise(m.name));
  const unknown = (report.unknown || []).filter((name) => !isCommercialOrMoneyNoise(name));
  const ignoredHtml = ignored.map((m) =>
    `<li class="muted"><span class="mono">${esc(m.name)}</span> — ${esc(m.reason)}</li>`
  ).join("");
  const unknownHtml = unknown.map((name) =>
    `<li class="warn-text"><span class="mono">${esc(name)}</span> — unmapped</li>`
  ).join("");
  const matchedHtml = (report.matched || []).map((m) =>
    `<li><span class="mono">${esc(m.name)}</span> → ${esc(m.action)}${m.units != null ? ` · units ${esc(String(m.units))}` : ` · qty ${esc(String(m.qty))}`}</li>`
  ).join("");
  return `
    <div class="result-block">
      <h3>Salesforce paste map</h3>
      ${report.hybrid ? `<div class="banner ok"><strong>Hybrid:</strong> Cloud (SaaS) ×${esc(String(report.saasPlatformQty || 1))} and On-Prem MP ×${esc(String(report.selfManagedPlatformQty || 1))} both present on the order.</div>` : ""}
      ${report.dedicated ? `<div class="banner ok"><strong>Dedicated:</strong> JFrog Dedicated / Dedicated Server noted on the order.</div>` : ""}
      ${report.consumptionTb ? `<p class="muted" style="margin:0 0 8px">Consumption totaled <strong>${esc(String(report.consumptionTb))} TB</strong> → SaaSInstance units (1000 GB/unit).</p>` : ""}
      ${matchedHtml ? `<p style="margin:0 0 4px"><strong>Matched</strong></p><ul class="compact">${matchedHtml}</ul>` : ""}
      ${ignoredHtml ? `<p style="margin:8px 0 4px"><strong>Ignored</strong></p><ul class="compact">${ignoredHtml}</ul>` : ""}
      ${unknownHtml ? `<p style="margin:8px 0 4px"><strong>Unmapped</strong> — add to <span class="mono">sf-product-map.js</span></p><ul class="compact">${unknownHtml}</ul>` : ""}
    </div>
  `;
}

function applyInputs(raw) {
  if (!raw || typeof raw !== "object") {
    throw new Error("JSON must include an input object (export format) or a bare input payload.");
  }
  // Accept full export ({ input, result }) or bare collectInputs()-shaped object
  const input = raw.input && typeof raw.input === "object" ? raw.input : raw;

  if ($("customerName")) $("customerName").value = input.customerName || "";
  setRadio("platform", input.platform, "entx");
  setRadio("deployModel", input.deployModel, "saas");
  setRadio("iaas", input.iaas, "aws");
  setRadio("edgeOps", input.edgeOps, "selfmanaged");

  if ($("platformQty")) $("platformQty").value = String(Math.max(1, Number(input.quantity) || 1));
  if ($("saasPlatformQty")) {
    $("saasPlatformQty").value = String(Math.max(1, Number(input.saasPlatformQty) || Number(input.quantity) || 1));
  }
  if ($("selfManagedPlatformQty")) {
    $("selfManagedPlatformQty").value = String(Math.max(1, Number(input.selfManagedPlatformQty) || 1));
  }
  if ($("saasUnits")) $("saasUnits").value = String(Math.max(0, Number(input.saasUnits) || 0));
  if ($("saasUnitSizeGB")) $("saasUnitSizeGB").value = String(Math.max(1, Number(input.saasUnitSizeGB) || 1000));
  if ($("securitySeats")) $("securitySeats").value = String(Math.max(0, Number(input.securitySeats) || 0));
  // Only overwrite Order notes when explicitly provided (SF parse leaves the paste in place).
  if ($("orderNotes") && Object.prototype.hasOwnProperty.call(input, "notes")) {
    $("orderNotes").value = input.notes || "";
  }

  syncAddonAvailability();

  // Reset add-ons, then apply from input.addons map or result.addons array
  document.querySelectorAll("[data-addon]").forEach((row) => {
    const cb = row.querySelector('input[type="checkbox"]');
    const qty = row.querySelector('input[type="number"]');
    if (cb) cb.checked = false;
    if (qty) {
      const id = row.getAttribute("data-addon");
      qty.value = id === "mlCredits" ? "2000" : "1";
    }
  });

  const addonMap = {};
  if (input.addons && typeof input.addons === "object" && !Array.isArray(input.addons)) {
    Object.entries(input.addons).forEach(([id, qty]) => {
      addonMap[id] = Math.max(1, Number(qty) || 1);
    });
  } else if (Array.isArray(raw.result?.addons)) {
    raw.result.addons.forEach((a) => {
      if (a?.id) addonMap[a.id] = Math.max(1, Number(a.qty) || 1);
    });
  }

  Object.entries(addonMap).forEach(([id, qty]) => {
    const row = document.querySelector(`[data-addon="${id}"]`);
    if (!row || row.classList.contains("disabled")) return;
    const cb = row.querySelector('input[type="checkbox"]');
    const qtyEl = row.querySelector('input[type="number"]');
    if (cb) cb.checked = true;
    if (qtyEl) qtyEl.value = String(qty);
  });

  clearRegions();
  const regions = Array.isArray(input.regions) ? input.regions : [];
  if (regions.length) {
    regions.forEach((r) => addRegionRow({
      region: r.region || "",
      iaas: r.iaas,
      siteKind: r.siteKind,
      primary: Number(r.primary) || 0,
      additional: Number(r.additional) || 0,
      edge: Number(r.edge) || 0,
    }));
  } else {
    addRegionRow({ primary: 1, additional: 0, edge: 0 });
  }

  syncAddonAvailability();
  analyzeForm();
}

function importJsonFromFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || ""));
      applyInputs(parsed);
    } catch (err) {
      alert(`Could not import JSON: ${err.message || err}`);
    }
  };
  reader.onerror = () => alert("Could not read the selected file.");
  reader.readAsText(file);
}

function triggerImport() {
  const input = $("importFile");
  if (!input) return;
  input.value = "";
  input.click();
}

document.addEventListener("DOMContentLoaded", () => {
  const freshness = $("data-freshness");
  if (freshness) {
    freshness.textContent = LATEST_LICENSE_DATA
      ? `Daily data ${DATA_AS_OF} · ${(LATEST_LICENSE_DATA.conflicts || []).length ? `${(LATEST_LICENSE_DATA.conflicts || []).length} source conflict(s) flagged` : "validated"}`
      : `Static matrix as of ${DATA_AS_OF}`;
  }
  document.querySelectorAll('input[name="platform"], input[name="deployModel"]').forEach((el) => {
    el.addEventListener("change", syncAddonAvailability);
  });
  document.querySelectorAll('input[name="iaas"]').forEach((el) => {
    el.addEventListener("change", rebuildRegionOptionsPreserving);
  });
  $("btnAddRegion")?.addEventListener("click", () => addRegionRow({ primary: 1, additional: 0, edge: 0 }));
  $("btnAnalyze")?.addEventListener("click", runAnalyze);
  $("btnExample")?.addEventListener("click", loadExample);
  $("btnReset")?.addEventListener("click", resetForm);
  $("btnExport")?.addEventListener("click", exportJson);
  $("btnExportHtml")?.addEventListener("click", exportReportHtml);
  $("btnExportPdf")?.addEventListener("click", exportReportPdf);
  $("btnImport")?.addEventListener("click", triggerImport);
  $("btnParseSf")?.addEventListener("click", parseSfFromNotes);
  $("importFile")?.addEventListener("change", (e) => {
    const file = e.target?.files?.[0];
    importJsonFromFile(file);
  });
  syncAddonAvailability();
  clearRegions();
  addRegionRow({ primary: 1, additional: 0, edge: 0 });
  render(null);
});
