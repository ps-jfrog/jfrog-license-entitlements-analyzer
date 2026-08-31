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
  aws: {
    vpc: "VPC", store: "Amazon S3", pl: "PrivateLink", edgeNet: "Edge",
    dns: "Route 53 Resolver", lb: "ALB / NLB", vpn: "Direct Connect + VPN Gateway", monitor: "CloudWatch",
    resolverInbound: "Route 53 Resolver inbound endpoint",
    resolverInboundShort: "R53 Resolver (inbound)",
    resolverConfig: "Create a Route 53 Resolver inbound endpoint (2 ENIs, one per AZ) in the VPC hosting the private endpoint; note its 2 endpoint IPs.",
  },
  azure: {
    vpc: "VNet", store: "Azure Blob", pl: "Private Link", edgeNet: "Edge",
    dns: "Azure DNS Private Resolver", lb: "Application Gateway", vpn: "ExpressRoute + VPN Gateway", monitor: "Azure Monitor",
    resolverInbound: "Azure DNS Private Resolver (inbound endpoint)",
    resolverInboundShort: "DNS Private Resolver",
    resolverConfig: "Deploy an Azure DNS Private Resolver with an inbound endpoint in the VNet hosting the private endpoint; note its inbound IP.",
  },
  gcp: {
    vpc: "VPC", store: "Cloud Storage", pl: "Private Service Connect", edgeNet: "Edge",
    dns: "Cloud DNS", lb: "Cloud Load Balancing", vpn: "Cloud Interconnect + Cloud VPN", monitor: "Cloud Monitoring",
    resolverInbound: "Cloud DNS inbound server policy",
    resolverInboundShort: "Cloud DNS (inbound)",
    resolverConfig: "Create a Cloud DNS server policy with inbound query forwarding enabled on the VPC hosting the private endpoint; note the forwarding IP(s) (the .2 address in each subnet used).",
  },
  onprem: {
    vpc: "Network", store: "Filestore / S3-compat", pl: "VPN / Direct", edgeNet: "Edge",
    dns: "Corporate DNS", lb: "On-prem LB (F5 / HAProxy)", vpn: "Site-to-site VPN / Direct Connect", monitor: "Prometheus / Grafana",
    resolverInbound: "Corporate DNS inbound resolver",
    resolverInboundShort: "Corp DNS resolver",
    resolverConfig: "Confirm the on-prem DNS server can be reached from the cloud side over the VPN/interconnect link.",
  },
};

const JFROG_LOGO = {"w": 68, "h": 66, "d": "M65.0396 45.1702L63.4026 42.5543C62.4955 43.4158 61.3852 43.908 60.3026 43.908C59.8055 43.908 59.5433 43.8471 58.4607 43.5702C57.3793 43.2615 56.6182 43.1692 55.7711 43.1692C51.9398 43.1692 49.4548 45.2625 49.4548 48.4944C49.4548 50.833 50.5078 52.28 52.6718 52.8647C51.7944 53.0804 50.8291 53.5422 50.3907 54.0659C50.069 54.4351 49.9232 54.9266 49.9232 55.5111C49.9232 56.0049 50.0403 56.4353 50.2151 56.8045C50.4194 57.1431 50.712 57.4202 51.0634 57.5736C51.7642 57.8507 52.9051 58.0352 54.6594 58.0666C55.5664 58.0666 56.1219 58.0974 56.3266 58.0974C57.4088 58.1591 57.9638 58.3428 58.3737 58.5589C58.7826 58.8054 59.0751 59.3595 59.0751 59.9744C59.0751 60.5903 58.695 61.2058 58.1396 61.5754C57.6134 61.9446 56.7649 62.0989 55.6539 62.0989C53.8406 62.0989 52.8466 61.4214 52.8466 60.1591C52.8466 59.605 52.9051 59.4816 53.022 59.1434H49.3963C49.2503 59.4507 49.0461 59.8818 49.0461 60.7442C49.0461 61.8218 49.4548 62.7447 50.2736 63.5451C51.6192 64.8689 53.8121 65.2376 55.9465 65.2376C58.2852 65.2376 60.5375 64.6842 61.8527 63.2059C62.6709 62.2826 63.0512 61.2671 63.0512 59.944C63.0512 58.5282 62.6424 57.4507 61.7653 56.5892C60.7116 55.5727 59.5139 55.2033 57.2332 55.1729L55.1271 55.1425C54.7182 55.1425 54.4848 54.9892 54.4848 54.7733C54.4848 54.342 55.0393 53.9725 56.0337 53.4806C56.3266 53.511 56.4434 53.511 56.6182 53.511C59.8055 53.511 62.1451 51.5414 62.1451 48.8331C62.1451 47.7862 61.8527 46.9866 61.2672 46.248C61.7653 46.3089 61.911 46.3401 62.2913 46.3401C63.3727 46.3401 64.1913 46.0013 65.0396 45.1702ZM67.4509 29.8944C67.4509 28.1244 66.3596 26.4846 64.5038 25.1375C64.6712 25.6784 64.7652 26.2282 64.7652 26.7889C64.7652 31.8573 57.6884 36.1938 47.6557 37.9894C48.7905 38.1173 49.9676 38.1873 51.1781 38.1873C60.1656 38.1873 67.4509 34.4742 67.4509 29.8944ZM61.6676 27.1375C61.6676 32.0016 50.788 35.9442 37.367 35.9442C23.9467 35.9442 13.0678 32.0016 13.0678 27.1375C13.0678 25.6055 14.1473 24.1655 16.0454 22.9114C15.752 23.4492 15.5964 24.0056 15.5964 24.5758C15.5964 29.069 25.1653 32.7114 36.9699 32.7114C48.7748 32.7114 58.3446 29.069 58.3446 24.5758C58.3446 23.7262 57.9998 22.9058 57.3642 22.1348C60.0749 23.5562 61.6676 25.2793 61.6676 27.1375ZM15.7526 19.3518C10.8507 20.5495 7.52099 22.8951 7.52099 25.5925C7.52099 27.2623 8.79814 28.7955 10.9308 30.0068C10.2903 28.9818 9.94158 27.9034 9.94158 26.7889C9.94158 23.9833 12.1145 21.403 15.7526 19.3518ZM63.6878 11.4436C63.237 10.901 62.6194 10.9027 62.1322 11.344C61.6616 11.9677 61.6482 12.4115 61.9822 12.7561C62.3384 13.1245 63.077 13.4419 63.6088 13.0198C64.1408 12.596 64.1388 11.9861 63.6878 11.4436ZM57.5132 13.4658C59.0344 11.3444 61.9445 15.0957 58.6458 15.6178C57.3258 15.8269 55.0969 17.2708 54.1404 19.5499C52.7898 22.9227 53.3743 25.419 51.0524 26.9205C46.1008 30.1198 30.8461 31.327 24.2775 27.2228C19.1285 24.0058 20.8952 18.9055 6.16707 7.66519C4.24102 6.19615 6.52211 4.63644 7.96477 5.63473C9.40726 6.63415 8.08689 6.89949 10.9965 9.81119C16.8734 15.6901 16.8143 10.4048 17.7424 12.4039C19.694 16.6079 23.9992 20.8418 23.9992 20.8418C28.3108 23.6483 31.7539 24.2617 38.1138 19.9584C42.1471 17.2295 40.4972 24.2987 50.3886 19.2039C53.9959 17.3453 53.8459 18.5776 57.5133 13.4658H57.5132ZM14.5958 8.07278C14.3466 7.72198 13.6057 7.56053 13.1101 8.05921C12.6153 8.55786 12.8587 9.05089 13.1448 9.34722C13.5553 9.77165 14.251 9.73677 14.6648 9.50615C15.0805 9.27611 14.9931 8.63228 14.5958 8.07278ZM4.3705 4.17071C4.69355 3.81605 5.10152 3.14508 4.40073 1.86076C3.88928 0.920602 2.19795 0.536494 1.60102 0.895016C1.00602 1.25474 0.278097 2.64296 1.27484 3.25383C2.55919 4.04202 3.40107 5.23316 4.3705 4.17071ZM65.3491 2.42646C64.8968 1.7693 63.9421 1.88828 62.9971 2.57415C62.0515 3.25924 62.2304 4.56181 62.543 4.8651C63.0913 5.39845 64.5528 5.03838 64.8933 4.65638C65.7704 3.67534 65.8011 3.08347 65.3491 2.42646ZM59.9083 6.59813C61.2618 5.95991 63.3903 8.03439 60.3098 9.59162C55.9072 11.8184 55.4405 14.5811 52.659 16.3378C47.9813 19.2923 49.4126 16.4571 41.8879 15.3841C38.9901 14.9707 38.0579 18.2035 35.7957 17.2692C30.5804 15.115 26.9378 15.5275 23.5598 18.275C22.3371 17.7357 21.0576 15.6534 20.5562 14.8185C21.9257 13.4772 21.3727 11.2355 20.5993 10.0062C19.8269 8.77688 18.8911 9.12572 17.8639 7.99468C16.8358 6.86519 18.2513 3.91702 19.5678 6.18182C24.5002 14.6681 27.7384 11.1382 31.7674 10.632C35.634 10.1465 39.052 12.2526 40.0999 6.28706C40.2722 5.31202 41.222 5.07867 41.3189 6.69114C41.4154 8.30475 42.0209 12.2337 44.1469 12.7408C46.2724 13.2472 47.96 12.2429 48.4577 11.6855C48.9556 11.1281 49.2163 11.2091 49.4347 12.5923C49.654 13.9766 50.193 15.8883 53.1778 13.7588C59.2824 9.40287 57.5357 7.71753 59.9083 6.59813ZM41.7637 2.61176C41.7834 1.91462 41.4668 1.47762 40.7792 1.50221C40.0917 1.52721 39.8452 1.87316 39.8675 2.54605C40.039 3.81973 40.2532 3.78929 40.7092 3.90693C41.1652 4.02477 41.7439 3.30828 41.7637 2.61176ZM17.2899 3.80889C17.5893 3.43136 17.618 2.93443 17.2207 2.37435C16.9718 2.02392 15.8074 1.78362 15.3132 2.2821C14.8175 2.78112 15.2685 3.56487 15.6541 3.68367C16.3683 3.90366 16.6856 4.56918 17.2899 3.80889ZM58.1105 48.5248C58.1105 49.9717 57.262 50.7714 55.7123 50.7714C54.3379 50.7714 53.4022 50.1258 53.4022 48.5248C53.4022 47.0474 54.2505 46.1857 55.7418 46.1857C57.2331 46.1857 58.1105 47.0474 58.1105 48.5248ZM46.8819 57.3586C48.1697 55.819 48.7532 53.9724 48.7532 51.2642C48.7532 48.7095 48.2272 46.9865 47.0288 45.5082C45.7417 43.908 44.0757 43.139 41.9404 43.139C37.9058 43.139 35.2156 46.4313 35.2156 51.3878C35.2156 56.3427 37.8761 59.5439 41.9404 59.5439C44.2504 59.5439 45.7417 58.7131 46.8819 57.3586ZM44.4847 51.2338C44.4847 54.9583 43.7542 56.5578 42.0584 56.5578C41.2974 56.5578 40.421 56.1277 40.0696 55.2661C39.7483 54.4645 39.5717 53.1102 39.5717 51.295C39.5717 49.7252 39.7184 48.6174 39.9816 47.7862C40.3029 46.8015 41.0631 46.1857 41.9989 46.1857C42.7005 46.1857 43.3145 46.4935 43.6949 47.017C44.2213 47.7244 44.4847 49.1093 44.4847 51.2338ZM7.1938 62.0361L9.09309 64.2522C10.9358 63.5136 13.2457 61.8525 13.8303 59.2365C14.0349 58.3741 14.1221 57.8201 14.1221 55.049V37.9243H9.9712V55.5111C9.9712 57.8201 9.88359 58.6815 9.5615 59.4507C9.18163 60.3129 8.24498 61.3591 7.1938 62.0361ZM16.786 37.8756H16.3596V59.2052H20.4529V49.7554H25.6285V46.248H20.4529V41.3531H26.9144L27.1652 39.4908C23.2825 39.1939 19.7539 38.569 16.786 37.8756ZM30.3943 43.0771C30.7455 43.7242 30.9492 44.4316 31.0083 45.3245C31.5643 44.5239 32.5 43.6928 33.2305 43.3227C33.553 43.1692 34.0786 43.0771 34.5173 43.0771C35.1018 43.0771 35.3648 43.139 35.9788 43.4157L34.8972 47.0474C34.5173 46.8325 34.1958 46.7398 33.7572 46.7398C32.8799 46.7398 32.0903 47.1711 31.3591 48.0631V59.2052H27.4413V48.6781C27.4413 46.5544 27.2072 44.9541 26.8857 44.0624L30.3943 43.0771Z", "fill": "#40BE46"};
const CLOUD_ICON_DATA = {"vector":{"aws":{"lb":{"w":44.001,"h":44.0,"segs":[["M22.001,0 C9.869,0 0,9.869 0,22 C0,34.131 9.869,44 22.001,44 C34.131,44 44.001,34.131 44.001,22 C44.001,9.869 34.131,0 22.001,0 Z M22.001,42 C10.972,42 2,33.028 2,22 C2,10.972 10.972,2 22.001,2 C33.029,2 42.001,10.972 42.001,22 C42.001,33.028 33.029,42 22.001,42 Z M35.035,28 L33.501,28 L33.501,24.625 C33.501,24.072 33.053,23.625 32.501,23.625 L30.001,23.625 L30.001,20.25 C30.001,19.697 29.553,19.25 29.001,19.25 L23.001,19.25 L23.001,16.875 L29.001,16.875 C29.553,16.875 30.001,16.428 30.001,15.875 L30.001,8 C30.001,7.447 29.553,7 29.001,7 L15.001,7 C14.448,7 14.001,7.447 14.001,8 L14.001,15.875 C14.001,16.428 14.448,16.875 15.001,16.875 L21.001,16.875 L21.001,19.25 L15.001,19.25 C14.448,19.25 14.001,19.697 14.001,20.25 L14.001,23.625 L11.501,23.625 C10.948,23.625 10.501,24.072 10.501,24.625 L10.501,28 L8.965,28 C8.413,28 7.965,28.447 7.965,29 L7.965,33.375 C7.965,33.928 8.413,34.375 8.965,34.375 L13.251,34.375 C13.803,34.375 14.251,33.928 14.251,33.375 L14.251,29 C14.251,28.447 13.803,28 13.251,28 L12.501,28 L12.501,25.625 L16.626,25.625 L16.626,28 L15.876,28 C15.323,28 14.876,28.447 14.876,29 L14.876,33.375 C14.876,33.928 15.323,34.375 15.876,34.375 L20.251,34.375 C20.803,34.375 21.251,33.928 21.251,33.375 L21.251,29 C21.251,28.447 20.803,28 20.251,28 L18.626,28 L18.626,24.625 C18.626,24.072 18.178,23.625 17.626,23.625 L16.001,23.625 L16.001,21.25 L28.001,21.25 L28.001,23.625 L26.376,23.625 C25.823,23.625 25.376,24.072 25.376,24.625 L25.376,28 L23.751,28 C23.198,28 22.751,28.447 22.751,29 L22.751,33.375 C22.751,33.928 23.198,34.375 23.751,34.375 L28.126,34.375 C28.678,34.375 29.126,33.928 29.126,33.375 L29.126,29 C29.126,28.447 28.678,28 28.126,28 L27.376,28 L27.376,25.625 L31.501,25.625 L31.501,28 L30.69,28 C30.137,28 29.69,28.447 29.69,29 L29.69,33.375 C29.69,33.928 30.137,34.375 30.69,34.375 L35.035,34.375 C35.587,34.375 36.035,33.928 36.035,33.375 L36.035,29 C36.035,28.447 35.587,28 35.035,28 Z M16.001,14.875 L16.001,9 L28.001,9 L28.001,14.875 Z M9.966,32.375 L9.966,30 L12.251,30 L12.251,32.375 Z M16.876,32.375 L16.876,30 L19.251,30 L19.251,32.375 Z M24.751,32.375 L24.751,30 L27.126,30 L27.126,32.375 Z M31.69,32.375 L31.69,30 L34.035,30 L34.035,32.375 Z","#8C4FFF"]]},"dns":{"w":56.0,"h":56.124,"segs":[["M36.692,28.803 C37.431,29.486 37.801,30.402 37.801,31.551 C37.801,32.802 37.351,33.8 36.452,34.546 C35.552,35.294 34.343,35.667 32.826,35.667 C31.627,35.667 30.44,35.411 29.266,34.9 L29.266,33.369 C30.657,33.829 31.843,34.058 32.826,34.058 C33.796,34.058 34.542,33.841 35.065,33.408 C35.588,32.974 35.849,32.354 35.849,31.551 C35.849,30.007 34.874,29.234 32.921,29.234 C32.309,29.234 31.703,29.266 31.103,29.329 L31.103,28.067 L35.123,23.682 L29.458,23.682 L29.458,22.112 L37.247,22.112 L37.247,23.625 L33.304,27.799 C33.369,27.786 33.431,27.78 33.496,27.78 L33.687,27.78 C34.951,27.78 35.952,28.121 36.692,28.803 M25.574,28.469 C26.351,29.196 26.74,30.198 26.74,31.473 C26.74,32.725 26.288,33.736 25.381,34.508 C24.475,35.281 23.283,35.667 21.803,35.667 C20.503,35.667 19.284,35.411 18.148,34.9 L18.148,33.369 C19.564,33.829 20.776,34.058 21.784,34.058 C22.754,34.058 23.497,33.839 24.013,33.398 C24.53,32.958 24.789,32.323 24.789,31.493 C24.789,30.587 24.546,29.929 24.061,29.521 C23.576,29.113 22.785,28.908 21.688,28.908 C20.897,28.908 19.909,28.973 18.722,29.1 L18.722,27.837 L19.086,22.112 L26.071,22.112 L26.071,23.682 L20.693,23.682 L20.444,27.569 C21.146,27.442 21.777,27.378 22.338,27.378 C23.716,27.378 24.795,27.741 25.574,28.469 M39.957,42.501 C35.103,43.374 30.852,45.35 28,46.961 C25.147,45.35 20.896,43.374 16.043,42.501 C14.677,42.256 7.869,40.835 7.869,36.899 C7.869,35.075 8.522,33.866 9.776,31.706 C11.274,29.123 13.138,25.908 13.138,21.279 C13.138,17.971 12.271,14.799 10.559,11.839 C10.76,11.59 10.965,11.339 11.171,11.086 C13.707,12.354 16.347,12.996 19.031,12.996 C22.311,12.996 25.325,12.135 28,10.435 C30.674,12.135 33.688,12.996 36.968,12.996 C39.652,12.996 42.293,12.354 44.829,11.086 C45.034,11.339 45.239,11.59 45.44,11.839 C43.728,14.799 42.861,17.971 42.861,21.279 C42.861,25.908 44.725,29.123 46.226,31.71 C47.477,33.866 48.13,35.075 48.13,36.899 C48.13,40.835 41.322,42.256 39.957,42.501 M44.861,21.279 C44.861,18.121 45.752,15.094 47.507,12.282 C47.735,11.919 47.706,11.451 47.434,11.119 C46.926,10.497 46.393,9.842 45.867,9.191 C45.562,8.813 45.032,8.709 44.606,8.943 C42.143,10.305 39.574,10.995 36.968,10.995 C33.824,10.995 31.077,10.15 28.569,8.412 C28.227,8.175 27.772,8.175 27.43,8.412 C24.922,10.15 22.175,10.995 19.031,10.995 C16.425,10.995 13.856,10.305 11.393,8.943 C10.968,8.709 10.437,8.813 10.132,9.191 C9.606,9.842 9.073,10.497 8.565,11.119 C8.294,11.451 8.264,11.919 8.492,12.282 C10.248,15.094 11.138,18.121 11.138,21.279 C11.138,25.37 9.423,28.326 8.045,30.705 C6.695,33.028 5.869,34.57 5.869,36.899 C5.869,42.288 13.385,44.058 15.689,44.471 C20.549,45.344 24.793,47.404 27.497,48.978 C27.652,49.069 27.826,49.114 28,49.114 C28.173,49.114 28.347,49.069 28.503,48.978 C31.207,47.404 35.45,45.344 40.31,44.471 C42.614,44.058 50.13,42.288 50.13,36.899 C50.13,34.57 49.304,33.028 47.954,30.702 C46.576,28.326 44.861,25.37 44.861,21.279 M40.994,48.281 C34.863,49.383 29.723,52.68 28,53.888 C26.276,52.68 21.136,49.383 15.005,48.281 C2.937,46.113 2,39.021 2,36.899 C2,33.409 3.371,31.047 4.697,28.761 C5.961,26.583 7.268,24.33 7.268,21.279 C7.268,16.459 4.485,13.055 3.112,11.669 C4.556,9.913 8.204,5.465 10.003,3.147 C12.729,5.72 15.898,7.124 19.031,7.124 C22.509,7.124 25.385,5.708 28,2.688 C30.614,5.708 33.49,7.124 36.968,7.124 C40.101,7.124 43.27,5.72 45.997,3.147 C47.796,5.465 51.443,9.913 52.887,11.669 C51.514,13.055 48.731,16.459 48.731,21.279 C48.731,24.33 50.039,26.583 51.302,28.761 C52.629,31.047 54,33.409 54,36.899 C54,39.021 53.062,46.113 40.994,48.281 M53.032,27.758 C51.797,25.629 50.731,23.791 50.731,21.279 C50.731,15.991 54.847,12.571 54.887,12.539 C55.094,12.371 55.226,12.127 55.254,11.861 C55.28,11.594 55.2,11.329 55.03,11.123 C54.963,11.043 48.408,3.096 46.906,1.037 C46.73,0.796 46.457,0.646 46.159,0.628 C45.86,0.606 45.572,0.725 45.368,0.943 C42.848,3.638 39.866,5.123 36.968,5.123 C33.764,5.123 31.244,3.695 28.794,0.494 C28.415,0 27.585,0 27.206,0.494 C24.755,3.695 22.235,5.123 19.031,5.123 C16.133,5.123 13.151,3.638 10.631,0.943 C10.427,0.725 10.137,0.601 9.84,0.628 C9.543,0.646 9.269,0.796 9.093,1.037 C7.591,3.096 1.036,11.043 0.969,11.123 C0.8,11.329 0.72,11.594 0.747,11.86 C0.773,12.125 0.904,12.369 1.11,12.537 C1.152,12.571 5.268,15.991 5.268,21.279 C5.268,23.791 4.202,25.629 2.967,27.758 C1.576,30.155 0,32.871 0,36.899 C0,43.611 5.477,48.602 14.652,50.25 C21.559,51.492 27.334,55.872 27.391,55.917 C27.57,56.055 27.785,56.124 28,56.124 C28.214,56.124 28.429,56.055 28.609,55.916 C28.667,55.872 34.422,51.495 41.347,50.25 C50.522,48.602 56,43.611 56,36.899 C56,32.871 54.423,30.155 53.032,27.758","#8C4FFF"]]},"pe":{"w":56.0,"h":37.187,"segs":[["M29.745,20.343 C30.713,21.436 32,23.115 32,25.059 C32,28.961 28.859,32.134 25,32.134 L17,32.134 C13.141,32.134 10,28.961 10,25.059 C10,21.159 13.141,17.985 17,17.985 L21,17.985 L21,20.006 L17,20.006 C14.243,20.006 12,22.274 12,25.059 C12,27.846 14.243,30.113 17,30.113 L25,30.113 C27.757,30.113 30,27.846 30,25.059 C30,23.807 29.004,22.537 28.255,21.691 Z M44,23.038 C44,26.939 40.859,30.113 37,30.113 L33,30.113 L33,28.091 L37,28.091 C39.757,28.091 42,25.825 42,23.038 C42,20.253 39.757,17.985 37,17.985 L29,17.985 C26.243,17.985 24,20.253 24,23.038 C24,23.938 24.463,24.86 24.865,25.565 L23.135,26.576 C22.606,25.655 22,24.419 22,23.038 C22,19.138 25.141,15.963 29,15.963 L37,15.963 C40.859,15.963 44,19.138 44,23.038 Z M45.28,35.166 L10.721,35.166 C6.011,35.162 2.268,31.773 2.017,27.287 C2.007,27.082 2,26.872 2,26.657 C2,20.879 6.112,18.952 8.605,18.315 C9.072,18.226 9.42,17.812 9.42,17.321 C9.42,17.269 9.416,17.22 9.409,17.169 C9.349,16.666 9.318,16.157 9.318,15.655 C9.318,11.013 12.608,6.015 16.808,4.277 C21.869,2.186 27.227,3.227 31.145,7.068 C32.672,8.563 33.863,10.474 34.685,12.747 C34.811,13.094 35.113,13.344 35.474,13.399 C35.835,13.455 36.197,13.306 36.42,13.014 C37.648,11.388 39.636,10.705 41.493,11.279 C43.652,11.945 45.051,14.163 45.231,17.212 C45.259,17.669 45.587,18.052 46.032,18.142 C49.667,18.882 54,20.974 54,26.738 C54,34.072 48.537,35.166 45.28,35.166 Z M47.159,16.324 C46.735,12.789 44.871,10.208 42.077,9.346 C39.935,8.686 37.679,9.177 35.97,10.592 C35.091,8.659 33.94,6.991 32.538,5.616 C28.032,1.2 21.869,0 16.051,2.407 C11.072,4.467 7.318,10.162 7.318,15.655 C7.318,15.961 7.328,16.27 7.348,16.578 C4.627,17.458 0,19.942 0,26.657 C0,26.908 0.007,27.154 0.02,27.398 C0.333,32.973 4.933,37.182 10.72,37.187 L45.28,37.187 C47.795,37.187 56,36.435 56,26.738 C56,21.398 52.868,17.723 47.159,16.324 Z","#8C4FFF"]]},"vpn":{"w":44.003,"h":44.001,"segs":[["M22.002,23.438 C22.657,23.438 23.189,23.97 23.189,24.625 C23.189,25.281 22.657,25.813 22.002,25.813 C21.347,25.813 20.814,25.281 20.814,24.625 C20.814,23.97 21.347,23.438 22.002,23.438 Z M21.002,27.636 L21.002,30.691 L23.002,30.691 L23.002,27.636 C24.269,27.214 25.19,26.032 25.19,24.625 C25.19,22.868 23.76,21.438 22.002,21.438 C20.244,21.438 18.814,22.868 18.814,24.625 C18.814,26.032 19.735,27.214 21.002,27.636 Z M22.002,42.001 C10.973,42.001 2,33.029 2,22.001 C2,10.972 10.973,2 22.002,2 C33.03,2 42.003,10.972 42.003,22.001 C42.003,33.029 33.03,42.001 22.002,42.001 Z M22.002,0 C9.87,0 0,9.869 0,22.001 C0,34.132 9.87,44.001 22.002,44.001 C34.134,44.001 44.003,34.132 44.003,22.001 C44.003,9.869 34.134,0 22.002,0 Z M30.62,32.376 L13.376,32.369 L13.381,19.5 L30.627,19.507 Z M17.755,14.096 C17.759,12.917 18.208,11.813 19.02,10.984 C19.821,10.167 20.882,9.716 22.008,9.716 L22.023,9.716 C23.148,9.719 24.205,10.179 24.999,11.009 C25.8,11.847 26.239,12.96 26.235,14.148 L26.235,17.505 L17.739,17.502 Z M31.627,17.507 L28.235,17.506 L28.235,14.151 C28.241,12.448 27.605,10.84 26.444,9.627 C25.272,8.4 23.703,7.721 22.028,7.716 L22.008,7.716 C20.34,7.716 18.773,8.379 17.592,9.584 C16.413,10.787 15.761,12.387 15.755,14.088 L15.739,17.501 L12.381,17.501 C12.116,17.501 11.861,17.606 11.674,17.793 C11.486,17.981 11.381,18.235 11.381,18.501 L11.376,33.369 C11.376,33.92 11.823,34.369 12.376,34.369 L31.62,34.376 C32.172,34.376 32.62,33.929 32.62,33.376 L32.627,18.507 C32.627,18.243 32.522,17.988 32.334,17.8 C32.147,17.613 31.893,17.507 31.627,17.507 Z","#8C4FFF"]]}},"gcp":{"lb":{"w":172.47,"h":152.79,"segs":[["M51.7,152.79 C45.87,152.79 40.28,149.66 37.37,143.8 L3.1,83.87 C0,78.64 0.49,72.56 3.09,68.2 L37.66,8.26 C40.59,2.8 45.82,0 51.14,0 L120.54,0 C125.7,0 130.81,2.54 133.87,7.65 L168.31,67.55 C172.47,73.86 171.04,80.59 168.69,84.34 L134.44,143.89 C132.15,148.72 126.97,152.79 120.31,152.79 Z","#4285F4"],["M53.65,100.52 C52.76,100.52 52.51,99.79 52.51,99.02 L52.51,88.6 C52.51,87.41 53.1,86.85 54.23,86.85 L59.09,86.85 L59.09,73.62 C59.09,72.73 59.53,72.26 60.48,72.26 L83.12,72.26 L83.12,63.25 L65.93,63.25 C65.03,63.25 64.54,62.7 64.54,62.05 L64.54,48.18 C64.54,47.35 64.92,46.95 65.8,46.95 L106.11,46.95 C106.94,46.95 107.41,47.17 107.41,48.26 L107.41,61.56 C107.41,62.44 107.06,63.25 105.7,63.25 L88.9,63.25 L88.9,72.26 L111.27,72.26 C112.17,72.26 112.88,72.91 112.88,73.87 L112.88,86.85 L117.75,86.85 C119.08,86.85 119.43,87.33 119.43,88.4 L119.43,98.88 C119.43,99.84 118.99,100.52 117.74,100.52 L103.75,100.52 C102.78,100.52 101.86,100.26 101.86,99.09 L101.86,87.76 C101.86,87.17 102.45,86.85 103.13,86.85 L107.1,86.85 L107.1,77.91 L88.9,77.91 L88.9,86.85 L93.62,86.85 C94.81,86.85 95.56,87.64 95.56,89.12 L95.56,98.27 C95.56,99.86 95.23,100.52 93.14,100.52 L78.11,100.52 C76.91,100.52 76.45,99.77 76.45,99 L76.45,88.6 C76.45,87.55 76.78,86.85 78,86.85 L83.12,86.85 L83.12,77.91 L64.81,77.91 L64.81,86.85 L68.85,86.85 C69.68,86.85 70.14,87.35 70.14,88.31 L70.14,98.7 C70.14,99.98 69.52,100.52 68.3,100.52 Z","#ffffff"]]},"dns":{"w":172.47,"h":152.79,"segs":[["M51.7,152.79 C45.87,152.79 40.28,149.66 37.37,143.8 L3.1,83.87 C0,78.64 0.49,72.56 3.09,68.2 L37.66,8.26 C40.59,2.8 45.82,0 51.14,0 L120.54,0 C125.7,0 130.81,2.54 133.87,7.65 L168.31,67.55 C172.47,73.86 171.04,80.59 168.69,84.34 L134.44,143.89 C132.15,148.72 126.97,152.79 120.31,152.79 Z","#4285F4"],["M58.74,56.09 C55.31,56.09 53.19,53.57 53.19,50.55 C53.19,47.58 55.73,45.04 58.83,45.04 C62.08,45.04 64.1,47.91 64.1,50.69 C64.1,53.77 62.27,56.09 58.74,56.09 Z M50.37,71.1 C46.71,71.1 44.89,68.67 44.89,65.66 C44.89,62.48 47.32,60.3 50.29,60.3 C54.1,60.3 55.76,62.95 55.76,66.07 C55.76,69.1 53.58,71.1 50.37,71.1 Z M50.56,88.44 C47.51,88.44 44.72,86.34 44.72,82.88 C44.72,79.32 46.97,77.59 50.54,77.59 C53.6,77.59 55.78,79.9 55.78,83.36 C55.78,86.09 53.6,88.44 50.56,88.44 Z M99.15,80.61 C99.15,81.41 99.76,83.08 101.48,83.08 C102.8,83.08 103.68,82.44 103.68,81.78 C103.57,79.64 101.95,79.81 100.38,79.27 C97.01,78.27 95.38,76.8 95.38,74.18 C95.65,72 97.04,70.64 99.06,69.75 C101.77,68.83 105.03,69.55 106.43,70.7 C107.82,71.95 108.06,73.08 108.06,74.8 L103.96,74.8 C103.96,73.97 103.48,72.82 101.74,72.82 C100.66,72.82 99.83,73.2 99.83,74.12 C99.83,75.44 101.6,76.35 103.12,76.35 C106.28,76.35 107.99,78.58 107.99,81.79 C107.99,84.6 106.1,86.43 101.68,86.43 C99.31,86.43 97.87,85.88 96.65,84.95 C95.58,84.02 95.22,82.8 95.22,80.61 Z M79.3,86.46 L79.3,69.52 L83.94,69.52 L89.14,79.06 L89.14,69.52 L93.48,69.52 L93.48,86.46 L89.33,86.46 L83.9,76.92 L83.96,86.46 Z M68.96,82.91 C70.83,82.91 71.91,82.34 73,80.78 C73.56,79.84 73.57,76.69 72.99,75.14 C72.19,73.42 71.3,73.02 69.05,73.02 Z M64.51,86.46 L64.51,69.52 L70.95,69.52 C74.35,69.52 77.75,71.7 77.75,77.75 C77.75,83.17 74.38,86.46 70.57,86.46 Z M59.89,91.88 C65.43,100.88 76.46,107.09 86.23,107.09 C100.35,107.09 117.72,95.6 117.72,74.99 C117.72,56.51 101.06,45.12 86.96,45.12 L86.96,58.96 L67.99,39.52 L86.96,21.8 L86.96,35.62 C109.82,35.62 126.93,53.99 126.93,75.06 C126.93,101.18 107,116.6 86.46,116.6 C73.67,116.6 59.39,110.07 52.03,96.74 Z","#ffffff"]]},"pe":{"w":172.47,"h":152.79,"segs":[["M51.7,152.79 C45.87,152.79 40.28,149.66 37.37,143.8 L3.1,83.87 C0,78.64 0.49,72.56 3.09,68.2 L37.66,8.26 C40.59,2.8 45.82,0 51.14,0 L120.54,0 C125.7,0 130.81,2.54 133.87,7.65 L168.31,67.55 C172.47,73.86 171.04,80.59 168.69,84.34 L134.44,143.89 C132.15,148.72 126.97,152.79 120.31,152.79 Z","#4285F4"],["M95.09,92.21 L95.09,87.17 C95.09,86.23 95.74,85.48 96.76,85.48 L101.74,85.48 L101.74,67.21 L97.03,67.21 C95.66,67.21 95.09,66.43 95.09,65.4 L95.09,60.6 L76.75,60.6 L76.75,65.12 C76.75,66.7 76.11,67.21 74.54,67.21 L70.13,67.21 L70.13,85.48 L75.01,85.48 C75.94,85.48 76.75,86.01 76.75,87.21 L76.75,92.21 Z M55.32,108.4 C54.19,108.4 53.89,107.73 53.89,106.91 L53.89,87 C53.89,86.12 54.3,85.48 55.33,85.48 L63.1,85.48 L63.1,67.21 L55.61,67.21 C54.71,67.21 53.89,66.76 53.89,65.59 L53.89,45.98 C53.89,44.87 54.58,44.29 55.89,44.29 L75.07,44.29 C76.23,44.29 76.75,45.04 76.75,46.29 L76.75,53.54 L95.09,53.54 L95.09,45.71 C95.09,44.77 95.53,44.29 96.64,44.29 L116.54,44.29 C117.48,44.29 118.09,44.56 118.09,45.7 L118.09,65.39 C118.09,66.62 117.34,67.21 115.96,67.21 L108.88,67.21 L108.88,85.48 L115.91,85.48 C117.32,85.48 118.09,85.63 118.09,87.79 L118.09,106.93 C118.09,107.71 117.56,108.4 116.47,108.4 L96.73,108.4 C95.45,108.4 95.09,107.63 95.09,106.56 L95.09,99.26 L76.75,99.26 L76.75,106.37 C76.75,107.47 76.14,108.4 74.77,108.4 Z","#ffffff"]]},"vpn":{"w":172.47,"h":152.79,"segs":[["M51.7,152.79 C45.87,152.79 40.28,149.66 37.37,143.8 L3.1,83.87 C0,78.64 0.49,72.56 3.09,68.2 L37.66,8.26 C40.59,2.8 45.82,0 51.14,0 L120.54,0 C125.7,0 130.81,2.54 133.87,7.65 L168.31,67.55 C172.47,73.86 171.04,80.59 168.69,84.34 L134.44,143.89 C132.15,148.72 126.97,152.79 120.31,152.79 Z","#4285F4"],["M91.5,90.57 C91.5,91.83 90.46,92.54 89.01,92.54 L60.97,92.54 C59.78,92.54 59.17,91.72 59.17,90.64 L59.17,80.49 L44.47,80.49 L44.47,72.21 L59.17,72.21 L59.17,62.12 C59.17,61.05 59.84,60.26 61.17,60.26 L89.18,60.26 C90.88,60.26 91.5,61.11 91.5,62.41 Z M124.84,80.49 L108.81,80.49 L108.81,107.81 C108.81,108.91 108.28,109.8 106.88,109.8 L68.47,109.8 C67.55,109.8 67.18,109.16 67.18,108.22 L67.18,101.43 L100.44,101.43 L100.44,51.19 L67.18,51.19 L67.18,44.56 C67.18,43.57 67.55,42.96 68.54,42.96 L106.72,42.96 C108.33,42.96 108.81,43.61 108.81,45.04 L108.81,72.21 L124.84,72.21 Z","#ffffff"]]}}},"azureB64":{"lb":"PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcKICAgeG1sbnM6ZGM9Imh0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvIgogICB4bWxuczpjYz0iaHR0cDovL2NyZWF0aXZlY29tbW9ucy5vcmcvbnMjIgogICB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiCiAgIHhtbG5zOnN2Zz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciCiAgIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIKICAgeG1sbnM6c29kaXBvZGk9Imh0dHA6Ly9zb2RpcG9kaS5zb3VyY2Vmb3JnZS5uZXQvRFREL3NvZGlwb2RpLTAuZHRkIgogICB4bWxuczppbmtzY2FwZT0iaHR0cDovL3d3dy5pbmtzY2FwZS5vcmcvbmFtZXNwYWNlcy9pbmtzY2FwZSIKICAgaWQ9ImUxZTcxZTI5LTA2NWEtNDZmNy1hZDRiLTUyYWYzNmEwYmZjYiIKICAgd2lkdGg9IjE4LjAwMzEwMSIKICAgaGVpZ2h0PSIxOC4wMDMwNjUiCiAgIHZpZXdCb3g9IjAgMCAxOC4wMDMxMDEgMTguMDAzMDY1IgogICB2ZXJzaW9uPSIxLjEiCiAgIHNvZGlwb2RpOmRvY25hbWU9IkxvYWRfQmFsYW5jZXJzLnN2ZyIKICAgaW5rc2NhcGU6dmVyc2lvbj0iMC45Mi4zICgyNDA1NTQ2LCAyMDE4LTAzLTExKSI+CiAgPHNvZGlwb2RpOm5hbWVkdmlldwogICAgIHBhZ2Vjb2xvcj0iI2ZmZmZmZiIKICAgICBib3JkZXJjb2xvcj0iIzY2NjY2NiIKICAgICBib3JkZXJvcGFjaXR5PSIxIgogICAgIG9iamVjdHRvbGVyYW5jZT0iMTAiCiAgICAgZ3JpZHRvbGVyYW5jZT0iMTAiCiAgICAgZ3VpZGV0b2xlcmFuY2U9IjEwIgogICAgIGlua3NjYXBlOnBhZ2VvcGFjaXR5PSIwIgogICAgIGlua3NjYXBlOnBhZ2VzaGFkb3c9IjIiCiAgICAgaW5rc2NhcGU6d2luZG93LXdpZHRoPSIxOTIwIgogICAgIGlua3NjYXBlOndpbmRvdy1oZWlnaHQ9IjEwMTciCiAgICAgaWQ9Im5hbWVkdmlldzY1MDI3IgogICAgIHNob3dncmlkPSJmYWxzZSIKICAgICBmaXQtbWFyZ2luLXRvcD0iMCIKICAgICBmaXQtbWFyZ2luLWxlZnQ9IjAiCiAgICAgZml0LW1hcmdpbi1yaWdodD0iMCIKICAgICBmaXQtbWFyZ2luLWJvdHRvbT0iMCIKICAgICBpbmtzY2FwZTp6b29tPSI0OC4xMTExMTEiCiAgICAgaW5rc2NhcGU6Y3g9IjkuMDAxNTUwNSIKICAgICBpbmtzY2FwZTpjeT0iOS4wMDE1MTQzIgogICAgIGlua3NjYXBlOndpbmRvdy14PSItOCIKICAgICBpbmtzY2FwZTp3aW5kb3cteT0iLTgiCiAgICAgaW5rc2NhcGU6d2luZG93LW1heGltaXplZD0iMSIKICAgICBpbmtzY2FwZTpjdXJyZW50LWxheWVyPSJlMWU3MWUyOS0wNjVhLTQ2ZjctYWQ0Yi01MmFmMzZhMGJmY2IiIC8+CiAgPGRlZnMKICAgICBpZD0iZGVmczY1MDA5Ij4KICAgIDxsaW5lYXJHcmFkaWVudAogICAgICAgaWQ9ImVmODQ2NjNhLWE3YjYtNDZhNy1hMjc1LTFlNDE5ZjVlYWU2MiIKICAgICAgIHgxPSI5IgogICAgICAgeTE9IjE5Ljg1IgogICAgICAgeDI9IjkiCiAgICAgICB5Mj0iLTEuMDIiCiAgICAgICBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CiAgICAgIDxzdG9wCiAgICAgICAgIG9mZnNldD0iMCIKICAgICAgICAgc3RvcC1jb2xvcj0iIzVlOTYyNCIKICAgICAgICAgaWQ9InN0b3A2NTAwMiIgLz4KICAgICAgPHN0b3AKICAgICAgICAgb2Zmc2V0PSIwLjAyIgogICAgICAgICBzdG9wLWNvbG9yPSIjNWY5NzI0IgogICAgICAgICBpZD0ic3RvcDY1MDA0IiAvPgogICAgICA8c3RvcAogICAgICAgICBvZmZzZXQ9IjEiCiAgICAgICAgIHN0b3AtY29sb3I9IiM3NmJjMmQiCiAgICAgICAgIGlkPSJzdG9wNjUwMDYiIC8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogIDwvZGVmcz4KICA8dGl0bGUKICAgICBpZD0idGl0bGU2NTAxMSI+SWNvbi1uZXR3b3JraW5nLTYyPC90aXRsZT4KICA8cGF0aAogICAgIGQ9Ik0gMC4xODE1NTA0OCw4LjU3MTU1MDUgOC41NzE1NTA1LDAuMTgxNTUwNDggYSAwLjYsMC42IDAgMCAxIDAuODYsMCBMIDE3LjgyMTU1LDguNTcxNTUwNSBhIDAuNiwwLjYgMCAwIDEgMCwwLjg2IEwgOS40MjE1NTA1LDE3LjgzMTU1IGEgMC42LDAuNiAwIDAgMSAtMC44NCwwIEwgMC4xODE1NTA0OCw5LjQzMTU1MDUgYSAwLjYsMC42IDAgMCAxIDAsLTAuODYgeiIKICAgICBpZD0icGF0aDY1MDEzIgogICAgIGlua3NjYXBlOmNvbm5lY3Rvci1jdXJ2YXR1cmU9IjAiCiAgICAgc3R5bGU9ImZpbGw6dXJsKCNlZjg0NjYzYS1hN2I2LTQ2YTctYTI3NS0xZTQxOWY1ZWFlNjIpIiAvPgogIDxwYXRoCiAgICAgZD0ibSAxMS4yMDE1NSw0LjAwMTU1MDUgLTIuMTE5OTk5NSwtMi4xMSBhIDAuMTIsMC4xMiAwIDAgMCAtMC4xNiwwIGwgLTIuMTIsMi4xMSBhIDAuMSwwLjEgMCAwIDAgMC4wOCwwLjE4IGggMS4yNCBhIDAuMTEsMC4xMSAwIDAgMSAwLjExLDAuMTEgdiAyIGEgMC4xMSwwLjExIDAgMCAwIDAuMTEsMC4xMSBoIDEuMzIgYSAwLjExLDAuMTEgMCAwIDAgMC4xMSwtMC4xMSB2IC0yIGEgMC4xMSwwLjExIDAgMCAxIDAuMTEsLTAuMTEgSCAxMS4xMjE1NSBhIDAuMSwwLjEgMCAwIDAgMC4wOCwtMC4xOCB6IgogICAgIGlkPSJwYXRoNjUwMTUiCiAgICAgaW5rc2NhcGU6Y29ubmVjdG9yLWN1cnZhdHVyZT0iMCIKICAgICBzdHlsZT0iZmlsbDojYjRlYzM2IiAvPgogIDxwYXRoCiAgICAgZD0ibSA0LjAwMTU1MDUsNi42MTE1NTA1IC0yLjEsMi4xMyBhIDAuMTEsMC4xMSAwIDAgMCAwLDAuMTUgbCAyLjEsMi4xMDk5OTk1IGEgMC4xMSwwLjExIDAgMCAwIDAuMTksLTAuMDggViA5LjY5MTU1MDUgYSAwLjExLDAuMTEgMCAwIDEgMC4xMSwtMC4xMSBoIDIgYSAwLjEsMC4xIDAgMCAwIDAuMSwtMC4xMSB2IC0xLjMyIGEgMC4xLDAuMSAwIDAgMCAtMC4wNywtMC4xNSBoIC0yIGEgMC4xLDAuMSAwIDAgMSAtMC4xMSwtMC4xIHYgLTEuMjEgYSAwLjExNzA0NywwLjExNzA0NyAwIDAgMCAtMC4yMiwtMC4wOCB6IgogICAgIGlkPSJwYXRoNjUwMTciCiAgICAgaW5rc2NhcGU6Y29ubmVjdG9yLWN1cnZhdHVyZT0iMCIKICAgICBzdHlsZT0iZmlsbDojYjRlYzM2IiAvPgogIDxwYXRoCiAgICAgZD0ibSAxNC4wODE1NSwxMS4wMDE1NSAyLjEzLC0yLjExOTk5OTUgYSAwLjExLDAuMTEgMCAwIDAgMCwtMC4xNSBsIC0yLjEzLC0yLjEyIGEgMC4xMSwwLjExIDAgMCAwIC0wLjE4LDAuMDggdiAxLjI1IGEgMC4xLDAuMSAwIDAgMSAtMC4xMSwwLjEgaCAtMiBhIDAuMSwwLjEgMCAwIDAgLTAuMSwwLjExIHYgMS4zMiBhIDAuMSwwLjEgMCAwIDAgMC4xLDAuMTEgaCAyIGEgMC4xMSwwLjExIDAgMCAxIDAuMTEsMC4xMSBWIDEwLjkzMTU1IGEgMC4xMSwwLjExIDAgMCAwIDAuMTgsMC4wNyB6IgogICAgIGlkPSJwYXRoNjUwMTkiCiAgICAgaW5rc2NhcGU6Y29ubmVjdG9yLWN1cnZhdHVyZT0iMCIKICAgICBzdHlsZT0iZmlsbDojYjRlYzM2IiAvPgogIDxwYXRoCiAgICAgZD0iTSAxMS43OTE1NSw5LjAwMTU1MDUgQSAyLjc5LDIuNzkgMCAxIDAgOC4yNTE1NTA1LDExLjY3MTU1IHYgMC45NSBhIDEuNzEsMS43MSAwIDEgMCAxLjU3LDAgdiAtMSBBIDIuNzcsMi43NyAwIDAgMCAxMS43OTE1NSw5LjAwMTU1MDUgWiIKICAgICBpZD0icGF0aDY1MDIxIgogICAgIGlua3NjYXBlOmNvbm5lY3Rvci1jdXJ2YXR1cmU9IjAiCiAgICAgc3R5bGU9ImZpbGw6I2ZmZmZmZiIgLz4KICA8Y2lyY2xlCiAgICAgaWQ9ImU5OWMzMzg3LTE1YzMtNGYyOC1iZDRiLWNiMjA5YjQzMGUwNiIKICAgICBjeD0iOS4wMTE1NTA5IgogICAgIGN5PSI4Ljk5MTU1MDQiCiAgICAgcj0iMS42MiIKICAgICBzdHlsZT0iZmlsbDojNWVhMGVmIiAvPgogIDxtZXRhZGF0YQogICAgIGlkPSJtZXRhZGF0YTY1MDI0Ij4KICAgIDxyZGY6UkRGPgogICAgICA8cmRmOmxpPnB1YmxpYzp0cnVlPC9yZGY6bGk+CiAgICAgIDxyZGY6bGk+c2RrOk1zUG9ydGFsRnguQmFzZS5JbWFnZXMuUG9seWNocm9tYXRpYy5Mb2FkQmFsYW5jZXIoKTwvcmRmOmxpPgogICAgICA8cmRmOmxpPmNhdGVnb3J5OiBOZXR3b3JraW5nPC9yZGY6bGk+CiAgICAgIDxjYzpXb3JrCiAgICAgICAgIHJkZjphYm91dD0iIj4KICAgICAgICA8ZGM6Zm9ybWF0PmltYWdlL3N2Zyt4bWw8L2RjOmZvcm1hdD4KICAgICAgICA8ZGM6dHlwZQogICAgICAgICAgIHJkZjpyZXNvdXJjZT0iaHR0cDovL3B1cmwub3JnL2RjL2RjbWl0eXBlL1N0aWxsSW1hZ2UiIC8+CiAgICAgICAgPGRjOnRpdGxlPkljb24tbmV0d29ya2luZy02MjwvZGM6dGl0bGU+CiAgICAgIDwvY2M6V29yaz4KICAgIDwvcmRmOlJERj4KICA8L21ldGFkYXRhPgo8L3N2Zz4K","dns":"PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcKICAgeG1sbnM6ZGM9Imh0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvIgogICB4bWxuczpjYz0iaHR0cDovL2NyZWF0aXZlY29tbW9ucy5vcmcvbnMjIgogICB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiCiAgIHhtbG5zOnN2Zz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciCiAgIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIKICAgeG1sbnM6c29kaXBvZGk9Imh0dHA6Ly9zb2RpcG9kaS5zb3VyY2Vmb3JnZS5uZXQvRFREL3NvZGlwb2RpLTAuZHRkIgogICB4bWxuczppbmtzY2FwZT0iaHR0cDovL3d3dy5pbmtzY2FwZS5vcmcvbmFtZXNwYWNlcy9pbmtzY2FwZSIKICAgaWQ9ImE1NDJjZjM5LTJiYTYtNDIwNi04Mjc4LTZhNGYxYzI0NTJmNSIKICAgd2lkdGg9IjE2Ljk2NzU4NyIKICAgaGVpZ2h0PSIxNi45NzE0ODkiCiAgIHZpZXdCb3g9IjAgMCAxNi45Njc1ODcgMTYuOTcxNDg5IgogICB2ZXJzaW9uPSIxLjEiCiAgIHNvZGlwb2RpOmRvY25hbWU9IkROU19ab25lcy5zdmciCiAgIGlua3NjYXBlOnZlcnNpb249IjAuOTIuMyAoMjQwNTU0NiwgMjAxOC0wMy0xMSkiPgogIDxzb2RpcG9kaTpuYW1lZHZpZXcKICAgICBwYWdlY29sb3I9IiNmZmZmZmYiCiAgICAgYm9yZGVyY29sb3I9IiM2NjY2NjYiCiAgICAgYm9yZGVyb3BhY2l0eT0iMSIKICAgICBvYmplY3R0b2xlcmFuY2U9IjEwIgogICAgIGdyaWR0b2xlcmFuY2U9IjEwIgogICAgIGd1aWRldG9sZXJhbmNlPSIxMCIKICAgICBpbmtzY2FwZTpwYWdlb3BhY2l0eT0iMCIKICAgICBpbmtzY2FwZTpwYWdlc2hhZG93PSIyIgogICAgIGlua3NjYXBlOndpbmRvdy13aWR0aD0iMTkyMCIKICAgICBpbmtzY2FwZTp3aW5kb3ctaGVpZ2h0PSIxMDE3IgogICAgIGlkPSJuYW1lZHZpZXc2MzkyOCIKICAgICBzaG93Z3JpZD0iZmFsc2UiCiAgICAgZml0LW1hcmdpbi10b3A9IjAiCiAgICAgZml0LW1hcmdpbi1sZWZ0PSIwIgogICAgIGZpdC1tYXJnaW4tcmlnaHQ9IjAiCiAgICAgZml0LW1hcmdpbi1ib3R0b209IjAiCiAgICAgaW5rc2NhcGU6em9vbT0iNDguMTExMTExIgogICAgIGlua3NjYXBlOmN4PSI4LjUwMzA4NzciCiAgICAgaW5rc2NhcGU6Y3k9IjguNTAzMDg3NyIKICAgICBpbmtzY2FwZTp3aW5kb3cteD0iLTgiCiAgICAgaW5rc2NhcGU6d2luZG93LXk9Ii04IgogICAgIGlua3NjYXBlOndpbmRvdy1tYXhpbWl6ZWQ9IjEiCiAgICAgaW5rc2NhcGU6Y3VycmVudC1sYXllcj0iYTU0MmNmMzktMmJhNi00MjA2LTgyNzgtNmE0ZjFjMjQ1MmY1IiAvPgogIDxkZWZzCiAgICAgaWQ9ImRlZnM2MzkxMiI+CiAgICA8cmFkaWFsR3JhZGllbnQKICAgICAgIGlkPSJlNzU3OWY0ZC0zNmEzLTQ2OTMtYTcyNi03YTYwNTBhYzU2NzEiCiAgICAgICBjeD0iLTY4MTEuMzk5OSIKICAgICAgIGN5PSI2NzI5LjY4OTkiCiAgICAgICByPSIxNyIKICAgICAgIGdyYWRpZW50VHJhbnNmb3JtPSJtYXRyaXgoMC41LDAsMCwtMC41LDM0MTQuOTEsMzM3NC4wNSkiCiAgICAgICBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CiAgICAgIDxzdG9wCiAgICAgICAgIG9mZnNldD0iMC4xOCIKICAgICAgICAgc3RvcC1jb2xvcj0iIzVlYTBlZiIKICAgICAgICAgaWQ9InN0b3A2MzkwNyIgLz4KICAgICAgPHN0b3AKICAgICAgICAgb2Zmc2V0PSIxIgogICAgICAgICBzdG9wLWNvbG9yPSIjMDA3OGQ0IgogICAgICAgICBpZD0ic3RvcDYzOTA5IiAvPgogICAgPC9yYWRpYWxHcmFkaWVudD4KICA8L2RlZnM+CiAgPHRpdGxlCiAgICAgaWQ9InRpdGxlNjM5MTQiPkljb24tbmV0d29ya2luZy02NDwvdGl0bGU+CiAgPHBhdGgKICAgICBpZD0iZjU3ZTEwNWQtNmQyZC00YWQ3LWI4YzMtYzEwNjg0YzlmOWI4IgogICAgIGQ9Ik0gMTMuNzEzMDg4LDE1LjE4ODQwMSBBIDguNTAzMDg3Nyw4LjUwMzA4NzcgMCAwIDEgMy4yOTMwODc3LDEuNzQ4NDAxMSBsIDAuMDksLTAuMDYgQSA4LjUsOC41IDAgMCAxIDEzLjcxMzA4OCwxNS4xODg0MDEiCiAgICAgaW5rc2NhcGU6Y29ubmVjdG9yLWN1cnZhdHVyZT0iMCIKICAgICBzdHlsZT0iZmlsbDp1cmwoI2U3NTc5ZjRkLTM2YTMtNDY5My1hNzI2LTdhNjA1MGFjNTY3MSkiIC8+CiAgPHBhdGgKICAgICBkPSJNIDguNTAzMDg3NywwLjc3ODQwMTA3IEEgNy42OSw3LjY5IDAgMSAwIDE2LjE5MzA4OCw4LjQ2ODQwMTEgNy43LDcuNyAwIDAgMCA4LjUwMzA4NzcsMC43Nzg0MDEwNyBaIE0gMTMuNjUzMDg4LDMuMzY4NDAxMSBhIDcuMzcsNy4zNyAwIDAgMSAtMi4xNSwwLjggOC44Myw4LjgzIDAgMCAwIC0xLjI1LC0yLjcgNy4yLDcuMiAwIDAgMSAzLjQsMS45IHogbSAtNS4xNTAwMDAzLC0yLjE2IGEgNi41OSw2LjU5IDAgMCAxIDEuMDksMC4wOSB2IDAgYSA3LjQ4LDcuNDggMCAwIDEgMS41MzAwMDAzLDMgMTUuMTIsMTUuMTIgMCAwIDEgLTUuNDUwMDAwMywwIDcuMzgsNy4zOCAwIDAgMSAxLjUxLC0yLjk0IHYgMCBhIDcuMzQsNy4zNCAwIDAgMSAxLjMyLC0wLjE1IHogbSAtMiwwLjI2IGEgOC43Miw4LjcyIDAgMCAwIC0xLjI3LDIuNjggNS41OCw1LjU4IDAgMCAxIC0xLjksLTAuNzcgNy4zNSw3LjM1IDAgMCAxIDMuMTcsLTEuOTEgeiBtIC0zLjI4LDExLjk5OTk5OTkgYSA1LjI3LDUuMjcgMCAwIDEgMS43OCwtMC43NiA3LjA4LDcuMDggMCAwIDAgMS4zNSwyLjcyIDcuMjUsNy4yNSAwIDAgMSAtMy4xMywtMS45NiB6IG0gNi40MSwyLjIgYSA3LjA4LDcuMDggMCAwIDEgLTEuMTMsMC4wNiA2LjgzLDYuODMgMCAwIDEgLTEuNDQsLTAuMTUgdiAwIGEgNiw2IDAgMCAxIC0xLjY3LC0zIDE0LjczLDE0LjczIDAgMCAxIDUuODgwMDAwMywwIDYsNiAwIDAgMSAtMS42OTAwMDAzLDMgeiBtIDAuNzMwMDAwMywtMC4xNiBhIDcuMTMsNy4xMyAwIDAgMCAxLjM4LC0yLjggNi42OCw2LjY4IDAgMCAxIDIsMC44MyA3LjEzLDcuMTMgMCAwIDEgLTMuMzgsMS45MyB6IG0gMS40OCwtMy4yMiBjIDAuMDgsLTAuMzYgMC4xNSwtMC43MyAwLjIsLTEuMTIgbCAtMC40NiwwLjExIGMgLTAuMDUsMC4zMSAtMC4xLDAuNjIgLTAuMTcsMC45MSBhIDE1LjIzLDE1LjIzIDAgMCAwIC02LjA5MDAwMDMsMCBjIC0wLjA3LC0wLjI3IC0wLjEyLC0wLjU2IC0wLjE3LC0wLjg2IGEgMC4yOCwwLjI4IDAgMCAxIDAsLTAuMDkgbCAtMC40NiwtMC4xMyBhIDIuMzYsMi4zNiAwIDAgMCAwLDAuMjggYyAwLDAuMzIgMC4xMSwwLjYyIDAuMTcsMC45MSBhIDUuOSw1LjkgMCAwIDAgLTIsMC44NSA3LjI0LDcuMjQgMCAwIDEgMC4xMSwtOS4zOTk5OTk5IDYuMjksNi4yOSAwIDAgMCAyLjA4LDAuODYgYyAtMC4wNywwLjI0IC0wLjEzLDAuNSAtMC4xOCwwLjc2IC0wLjA1LDAuMjYgMCwwLjI1IC0wLjA4LDAuMzcgbCAwLjQ3LC0wLjExIHYgLTAuMTcgYyAwLjA2LC0wLjI2IDAuMTIsLTAuNTEgMC4xOSwtMC43NSBhIDE0Ljg5LDE0Ljg5IDAgMCAwIDMuMDUsMC4yNCAxNSwxNSAwIDAgMCAyLjc4MDAwMDMsLTAuMjYgYyAwLjA3LDAuMjcgMC4xNCwwLjU2IDAuMiwwLjg1IGwgMC40NiwwLjExIHEgLTAuMTEsLTAuNTQgLTAuMjQsLTEgYSA3LjczLDcuNzMgMCAwIDAgMi4zLC0wLjkxIDcuMjIsNy4yMiAwIDAgMSAwLjA2LDkuNDg5OTk5OSA3LjI4LDcuMjggMCAwIDAgLTIuMjIsLTAuOTcgeiIKICAgICBpZD0icGF0aDYzOTE3IgogICAgIGlua3NjYXBlOmNvbm5lY3Rvci1jdXJ2YXR1cmU9IjAiCiAgICAgc3R5bGU9ImZpbGw6IzVlYTBlZiIgLz4KICA8cGF0aAogICAgIGQ9Im0gMy4xOTMwODc3LDYuNDY4NDAxMSBhIDcuOTIsNy45MiAwIDAgMSAxLjE2LC0wLjA4IDIuNDQsMi40NCAwIDAgMSAxLjcxLDAuNTIgMiwyIDAgMCAxIDAuNTksMS40NiAyLjIxLDIuMjEgMCAwIDEgLTAuNjEsMS42Mzk5OTk5IDIuNiwyLjYgMCAwIDEgLTEuODYsMC42MSA5LjE3LDkuMTcgMCAwIDEgLTEsLTAuMDUgeiBtIDAuNTUsMy43Mjk5OTk5IGEgNCw0IDAgMCAwIDAuNTUsMCAxLjYyLDEuNjIgMCAwIDAgMS43OSwtMS44MDk5OTk5IDEuNSwxLjUgMCAwIDAgLTEuNzEsLTEuNjIgMy4xNywzLjE3IDAgMCAwIC0wLjYzLDAgeiIKICAgICBpZD0icGF0aDYzOTE5IgogICAgIGlua3NjYXBlOmNvbm5lY3Rvci1jdXJ2YXR1cmU9IjAiCiAgICAgc3R5bGU9ImZpbGw6I2ZmZmZmZiIgLz4KICA8cGF0aAogICAgIGQ9Ik0gNy4zNjMwODc3LDEwLjU3ODQwMSBWIDYuMzY4NDAxMSBoIDAuNTkgbCAxLjM1LDIuMSBhIDEyLjE4LDEyLjE4IDAgMCAxIDAuNzYwMDAwMywxLjM3IHYgMCBjIC0wLjA1LC0wLjU2IC0wLjA2LC0xLjA3IC0wLjA2LC0xLjczIHYgLTEuNzQgaCAwLjUgViAxMC41Nzg0MDEgSCA5Ljk1MzA4NzcgbCAtMS4zMiwtMi4xMDk5OTk5IGMgLTAuMjksLTAuNDcgLTAuNTcsLTEgLTAuNzksLTEuNCB2IDAgYyAwLDAuNTMgMCwxIDAsMS43NCB2IDEuNzk5OTk5OSB6IgogICAgIGlkPSJwYXRoNjM5MjEiCiAgICAgaW5rc2NhcGU6Y29ubmVjdG9yLWN1cnZhdHVyZT0iMCIKICAgICBzdHlsZT0iZmlsbDojZmZmZmZmIiAvPgogIDxwYXRoCiAgICAgZD0ibSAxMS4zOTMwODgsOS45MTg0MDExIGEgMiwyIDAgMCAwIDEsMC4yNjk5OTk5IGMgMC41NiwwIDAuODgsLTAuMjg5OTk5OSAwLjg4LC0wLjcxOTk5OTkgMCwtMC40MyAtMC4yMiwtMC42MiAtMC43OSwtMC44MyAtMC41NywtMC4yMSAtMS4xMiwtMC42IC0xLjEyLC0xLjIgYSAxLjIyLDEuMjIgMCAwIDEgMS4zNywtMS4xNCAyLDIgMCAwIDEgMC45MywwLjIgbCAtMC4xNiwwLjQ1IGEgMS42MywxLjYzIDAgMCAwIC0wLjgsLTAuMiBjIC0wLjU4LDAgLTAuOCwwLjM0IC0wLjgsMC42MyAwLDAuMjkgMC4yNiwwLjU5IDAuODQsMC44MSAwLjU4LDAuMjIgMS4wOCwwLjYyIDEuMDgsMS4yNCAwLDAuNjE5OTk5OSAtMC40OCwxLjIwOTk5OTkgLTEuNDgsMS4yMDk5OTk5IGEgMi4xNiwyLjE2IDAgMCAxIC0xLjA3LC0wLjI3IHoiCiAgICAgaWQ9InBhdGg2MzkyMyIKICAgICBpbmtzY2FwZTpjb25uZWN0b3ItY3VydmF0dXJlPSIwIgogICAgIHN0eWxlPSJmaWxsOiNmZmZmZmYiIC8+CiAgPG1ldGFkYXRhCiAgICAgaWQ9Im1ldGFkYXRhNjM5MjUiPgogICAgPHJkZjpSREY+CiAgICAgIDxyZGY6bGk+cHVibGljOnRydWU8L3JkZjpsaT4KICAgICAgPHJkZjpsaT5zZGs6ZmFsc2U8L3JkZjpsaT4KICAgICAgPHJkZjpsaT5jYXRlZ29yeTogTmV0d29ya2luZzwvcmRmOmxpPgogICAgICA8Y2M6V29yawogICAgICAgICByZGY6YWJvdXQ9IiI+CiAgICAgICAgPGRjOmZvcm1hdD5pbWFnZS9zdmcreG1sPC9kYzpmb3JtYXQ+CiAgICAgICAgPGRjOnR5cGUKICAgICAgICAgICByZGY6cmVzb3VyY2U9Imh0dHA6Ly9wdXJsLm9yZy9kYy9kY21pdHlwZS9TdGlsbEltYWdlIiAvPgogICAgICAgIDxkYzp0aXRsZT5JY29uLW5ldHdvcmtpbmctNjQ8L2RjOnRpdGxlPgogICAgICA8L2NjOldvcms+CiAgICA8L3JkZjpSREY+CiAgPC9tZXRhZGF0YT4KPC9zdmc+Cg==","pe":"PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjwhLS0gQ3JlYXRlZCB3aXRoIElua3NjYXBlIChodHRwOi8vd3d3Lmlua3NjYXBlLm9yZy8pIC0tPgoKPHN2ZwogICB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iCiAgIHhtbG5zOmNjPSJodHRwOi8vY3JlYXRpdmVjb21tb25zLm9yZy9ucyMiCiAgIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyIKICAgeG1sbnM6c3ZnPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIKICAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogICB4bWxuczpzb2RpcG9kaT0iaHR0cDovL3NvZGlwb2RpLnNvdXJjZWZvcmdlLm5ldC9EVEQvc29kaXBvZGktMC5kdGQiCiAgIHhtbG5zOmlua3NjYXBlPSJodHRwOi8vd3d3Lmlua3NjYXBlLm9yZy9uYW1lc3BhY2VzL2lua3NjYXBlIgogICB3aWR0aD0iNTMuNzk4NTUzbW0iCiAgIGhlaWdodD0iNDkuNTM3ODE5bW0iCiAgIHZpZXdCb3g9IjAgMCA1My43OTg1NTMgNDkuNTM3ODE5IgogICB2ZXJzaW9uPSIxLjEiCiAgIGlkPSJzdmc4IgogICBpbmtzY2FwZTp2ZXJzaW9uPSIwLjkyLjMgKDI0MDU1NDYsIDIwMTgtMDMtMTEpIgogICBzb2RpcG9kaTpkb2NuYW1lPSJwcml2YXRlX2VuZHBvaW50LnN2ZyI+CiAgPGRlZnMKICAgICBpZD0iZGVmczIiIC8+CiAgPHNvZGlwb2RpOm5hbWVkdmlldwogICAgIGlkPSJiYXNlIgogICAgIHBhZ2Vjb2xvcj0iI2ZmZmZmZiIKICAgICBib3JkZXJjb2xvcj0iIzY2NjY2NiIKICAgICBib3JkZXJvcGFjaXR5PSIxLjAiCiAgICAgaW5rc2NhcGU6cGFnZW9wYWNpdHk9IjAuMCIKICAgICBpbmtzY2FwZTpwYWdlc2hhZG93PSIyIgogICAgIGlua3NjYXBlOnpvb209IjEuNCIKICAgICBpbmtzY2FwZTpjeD0iLTI0Ljc0MDc2OCIKICAgICBpbmtzY2FwZTpjeT0iMTE2LjExODQxIgogICAgIGlua3NjYXBlOmRvY3VtZW50LXVuaXRzPSJtbSIKICAgICBpbmtzY2FwZTpjdXJyZW50LWxheWVyPSJsYXllcjEiCiAgICAgc2hvd2dyaWQ9ImZhbHNlIgogICAgIGZpdC1tYXJnaW4tdG9wPSIwIgogICAgIGZpdC1tYXJnaW4tbGVmdD0iMCIKICAgICBmaXQtbWFyZ2luLXJpZ2h0PSIwIgogICAgIGZpdC1tYXJnaW4tYm90dG9tPSIwIgogICAgIGlua3NjYXBlOndpbmRvdy13aWR0aD0iMTkyMCIKICAgICBpbmtzY2FwZTp3aW5kb3ctaGVpZ2h0PSIxMDE3IgogICAgIGlua3NjYXBlOndpbmRvdy14PSItOCIKICAgICBpbmtzY2FwZTp3aW5kb3cteT0iLTgiCiAgICAgaW5rc2NhcGU6d2luZG93LW1heGltaXplZD0iMSIgLz4KICA8bWV0YWRhdGEKICAgICBpZD0ibWV0YWRhdGE1Ij4KICAgIDxyZGY6UkRGPgogICAgICA8Y2M6V29yawogICAgICAgICByZGY6YWJvdXQ9IiI+CiAgICAgICAgPGRjOmZvcm1hdD5pbWFnZS9zdmcreG1sPC9kYzpmb3JtYXQ+CiAgICAgICAgPGRjOnR5cGUKICAgICAgICAgICByZGY6cmVzb3VyY2U9Imh0dHA6Ly9wdXJsLm9yZy9kYy9kY21pdHlwZS9TdGlsbEltYWdlIiAvPgogICAgICAgIDxkYzp0aXRsZT48L2RjOnRpdGxlPgogICAgICA8L2NjOldvcms+CiAgICA8L3JkZjpSREY+CiAgPC9tZXRhZGF0YT4KICA8ZwogICAgIGlua3NjYXBlOmxhYmVsPSJMYXllciAxIgogICAgIGlua3NjYXBlOmdyb3VwbW9kZT0ibGF5ZXIiCiAgICAgaWQ9ImxheWVyMSIKICAgICB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtNzcuODQzODQ1LC02OC40NjYxNCkiPgogICAgPHBhdGgKICAgICAgIHN0eWxlPSJjb2xvcjojMDAwMDAwO2ZvbnQtc3R5bGU6bm9ybWFsO2ZvbnQtdmFyaWFudDpub3JtYWw7Zm9udC13ZWlnaHQ6bm9ybWFsO2ZvbnQtc3RyZXRjaDpub3JtYWw7Zm9udC1zaXplOm1lZGl1bTtsaW5lLWhlaWdodDpub3JtYWw7Zm9udC1mYW1pbHk6c2Fucy1zZXJpZjtmb250LXZhcmlhbnQtbGlnYXR1cmVzOm5vcm1hbDtmb250LXZhcmlhbnQtcG9zaXRpb246bm9ybWFsO2ZvbnQtdmFyaWFudC1jYXBzOm5vcm1hbDtmb250LXZhcmlhbnQtbnVtZXJpYzpub3JtYWw7Zm9udC12YXJpYW50LWFsdGVybmF0ZXM6bm9ybWFsO2ZvbnQtZmVhdHVyZS1zZXR0aW5nczpub3JtYWw7dGV4dC1pbmRlbnQ6MDt0ZXh0LWFsaWduOnN0YXJ0O3RleHQtZGVjb3JhdGlvbjpub25lO3RleHQtZGVjb3JhdGlvbi1saW5lOm5vbmU7dGV4dC1kZWNvcmF0aW9uLXN0eWxlOnNvbGlkO3RleHQtZGVjb3JhdGlvbi1jb2xvcjojMDAwMDAwO2xldHRlci1zcGFjaW5nOm5vcm1hbDt3b3JkLXNwYWNpbmc6bm9ybWFsO3RleHQtdHJhbnNmb3JtOm5vbmU7d3JpdGluZy1tb2RlOmxyLXRiO2RpcmVjdGlvbjpsdHI7dGV4dC1vcmllbnRhdGlvbjptaXhlZDtkb21pbmFudC1iYXNlbGluZTphdXRvO2Jhc2VsaW5lLXNoaWZ0OmJhc2VsaW5lO3RleHQtYW5jaG9yOnN0YXJ0O3doaXRlLXNwYWNlOm5vcm1hbDtzaGFwZS1wYWRkaW5nOjA7Y2xpcC1ydWxlOm5vbnplcm87ZGlzcGxheTppbmxpbmU7b3ZlcmZsb3c6dmlzaWJsZTt2aXNpYmlsaXR5OnZpc2libGU7b3BhY2l0eToxO2lzb2xhdGlvbjphdXRvO21peC1ibGVuZC1tb2RlOm5vcm1hbDtjb2xvci1pbnRlcnBvbGF0aW9uOnNSR0I7Y29sb3ItaW50ZXJwb2xhdGlvbi1maWx0ZXJzOmxpbmVhclJHQjtzb2xpZC1jb2xvcjojMDAwMDAwO3NvbGlkLW9wYWNpdHk6MTt2ZWN0b3ItZWZmZWN0Om5vbmU7ZmlsbDojN2I3YjdiO2ZpbGwtb3BhY2l0eToxO2ZpbGwtcnVsZTpub256ZXJvO3N0cm9rZTpub25lO3N0cm9rZS13aWR0aDozLjQwMDAwMDE7c3Ryb2tlLWxpbmVjYXA6YnV0dDtzdHJva2UtbGluZWpvaW46bWl0ZXI7c3Ryb2tlLW1pdGVybGltaXQ6NDtzdHJva2UtZGFzaGFycmF5Om5vbmU7c3Ryb2tlLWRhc2hvZmZzZXQ6MDtzdHJva2Utb3BhY2l0eToxO2NvbG9yLXJlbmRlcmluZzphdXRvO2ltYWdlLXJlbmRlcmluZzphdXRvO3NoYXBlLXJlbmRlcmluZzphdXRvO3RleHQtcmVuZGVyaW5nOmF1dG87ZW5hYmxlLWJhY2tncm91bmQ6YWNjdW11bGF0ZSIKICAgICAgIGQ9Im0gMTAyLjk0MzM2LDc1LjYyMzA0NyB2IDI0LjMyMDMxMiBoIDMuNDAwMzkgViA3NS42MjMwNDcgWiIKICAgICAgIGlkPSJwYXRoNDU0NiIKICAgICAgIGlua3NjYXBlOmNvbm5lY3Rvci1jdXJ2YXR1cmU9IjAiIC8+CiAgICA8Y2lyY2xlCiAgICAgICBzdHlsZT0ib3BhY2l0eToxO3ZlY3Rvci1lZmZlY3Q6bm9uZTtmaWxsOiMzNjlkYzY7ZmlsbC1vcGFjaXR5OjE7ZmlsbC1ydWxlOm5vbnplcm87c3Ryb2tlOm5vbmU7c3Ryb2tlLXdpZHRoOjEuNTM4NjU5ODE7c3Ryb2tlLWxpbmVjYXA6YnV0dDtzdHJva2UtbGluZWpvaW46cm91bmQ7c3Ryb2tlLW1pdGVybGltaXQ6NDtzdHJva2UtZGFzaGFycmF5Om5vbmU7c3Ryb2tlLWRhc2hvZmZzZXQ6MDtzdHJva2Utb3BhY2l0eToxO3BhaW50LW9yZGVyOm5vcm1hbCIKICAgICAgIGlkPSJwYXRoNDUyOSIKICAgICAgIGN4PSIxMDQuNzQ2NjUiCiAgICAgICBjeT0iNzMuMzA4OTYiCiAgICAgICByPSI0Ljg0MjgxOTciIC8+CiAgICA8Y2lyY2xlCiAgICAgICBzdHlsZT0ib3BhY2l0eToxO3ZlY3Rvci1lZmZlY3Q6bm9uZTtmaWxsOiM4NGI5MjY7ZmlsbC1vcGFjaXR5OjE7ZmlsbC1ydWxlOm5vbnplcm87c3Ryb2tlOm5vbmU7c3Ryb2tlLXdpZHRoOjEuNTM4NjU5ODE7c3Ryb2tlLWxpbmVjYXA6YnV0dDtzdHJva2UtbGluZWpvaW46cm91bmQ7c3Ryb2tlLW1pdGVybGltaXQ6NDtzdHJva2UtZGFzaGFycmF5Om5vbmU7c3Ryb2tlLWRhc2hvZmZzZXQ6MDtzdHJva2Utb3BhY2l0eToxO3BhaW50LW9yZGVyOm5vcm1hbCIKICAgICAgIGlkPSJwYXRoNDUyOS0wIgogICAgICAgY3g9IjEwNC43OTM5IgogICAgICAgY3k9IjEwMy4wNDYzNSIKICAgICAgIHI9IjUuOTI5NTAxMSIgLz4KICAgIDxwYXRoCiAgICAgICBzdHlsZT0iY29sb3I6IzAwMDAwMDtmb250LXN0eWxlOm5vcm1hbDtmb250LXZhcmlhbnQ6bm9ybWFsO2ZvbnQtd2VpZ2h0Om5vcm1hbDtmb250LXN0cmV0Y2g6bm9ybWFsO2ZvbnQtc2l6ZTptZWRpdW07bGluZS1oZWlnaHQ6bm9ybWFsO2ZvbnQtZmFtaWx5OnNhbnMtc2VyaWY7Zm9udC12YXJpYW50LWxpZ2F0dXJlczpub3JtYWw7Zm9udC12YXJpYW50LXBvc2l0aW9uOm5vcm1hbDtmb250LXZhcmlhbnQtY2Fwczpub3JtYWw7Zm9udC12YXJpYW50LW51bWVyaWM6bm9ybWFsO2ZvbnQtdmFyaWFudC1hbHRlcm5hdGVzOm5vcm1hbDtmb250LWZlYXR1cmUtc2V0dGluZ3M6bm9ybWFsO3RleHQtaW5kZW50OjA7dGV4dC1hbGlnbjpzdGFydDt0ZXh0LWRlY29yYXRpb246bm9uZTt0ZXh0LWRlY29yYXRpb24tbGluZTpub25lO3RleHQtZGVjb3JhdGlvbi1zdHlsZTpzb2xpZDt0ZXh0LWRlY29yYXRpb24tY29sb3I6IzAwMDAwMDtsZXR0ZXItc3BhY2luZzpub3JtYWw7d29yZC1zcGFjaW5nOm5vcm1hbDt0ZXh0LXRyYW5zZm9ybTpub25lO3dyaXRpbmctbW9kZTpsci10YjtkaXJlY3Rpb246bHRyO3RleHQtb3JpZW50YXRpb246bWl4ZWQ7ZG9taW5hbnQtYmFzZWxpbmU6YXV0bztiYXNlbGluZS1zaGlmdDpiYXNlbGluZTt0ZXh0LWFuY2hvcjpzdGFydDt3aGl0ZS1zcGFjZTpub3JtYWw7c2hhcGUtcGFkZGluZzowO2NsaXAtcnVsZTpub256ZXJvO2Rpc3BsYXk6aW5saW5lO292ZXJmbG93OnZpc2libGU7dmlzaWJpbGl0eTp2aXNpYmxlO29wYWNpdHk6MTtpc29sYXRpb246YXV0bzttaXgtYmxlbmQtbW9kZTpub3JtYWw7Y29sb3ItaW50ZXJwb2xhdGlvbjpzUkdCO2NvbG9yLWludGVycG9sYXRpb24tZmlsdGVyczpsaW5lYXJSR0I7c29saWQtY29sb3I6IzAwMDAwMDtzb2xpZC1vcGFjaXR5OjE7dmVjdG9yLWVmZmVjdDpub25lO2ZpbGw6IzM2OWRjNjtmaWxsLW9wYWNpdHk6MTtmaWxsLXJ1bGU6bm9uemVybztzdHJva2U6bm9uZTtzdHJva2Utd2lkdGg6My40MDAwMDAxO3N0cm9rZS1saW5lY2FwOnJvdW5kO3N0cm9rZS1saW5lam9pbjpyb3VuZDtzdHJva2UtbWl0ZXJsaW1pdDo0O3N0cm9rZS1kYXNoYXJyYXk6bm9uZTtzdHJva2UtZGFzaG9mZnNldDowO3N0cm9rZS1vcGFjaXR5OjE7Y29sb3ItcmVuZGVyaW5nOmF1dG87aW1hZ2UtcmVuZGVyaW5nOmF1dG87c2hhcGUtcmVuZGVyaW5nOmF1dG87dGV4dC1yZW5kZXJpbmc6YXV0bztlbmFibGUtYmFja2dyb3VuZDphY2N1bXVsYXRlIgogICAgICAgZD0ibSAxMTYuNjExMzMsODguMDgyMDMxIGEgMS43MDAxNywxLjcwMDE3IDAgMCAwIC0xLjE2MDE2LDIuOTI5Njg4IGwgMTIuMDc0MjIsMTEuODczMDUxIC0xMi4yNDgwNSwxMi4yMDMxMiBhIDEuNzAwMTcsMS43MDAxNyAwIDEgMCAyLjM5ODQ0LDIuNDEwMTYgbCAxMy40NjY4LC0xMy40MTc5NyBhIDEuNzAwMTcsMS43MDAxNyAwIDAgMCAtMC4wMDgsLTIuNDE2MDIgTCAxMTcuODM1OTQsODguNTg3ODkxIGEgMS43MDAxNywxLjcwMDE3IDAgMCAwIC0xLjIyNDYxLC0wLjUwNTg2IHogbSAtMjMuNzg3MTExLDAuMDAyIGEgMS43MDAxNywxLjcwMDE3IDAgMCAwIC0xLjE3MzgyOCwwLjUwMzkwNyBMIDc4LjM1MTU2MiwxMDEuNjY0MDYgYSAxLjcwMDE3LDEuNzAwMTcgMCAwIDAgLTAuMDA3OCwyLjQxNjAyIGwgMTMuNDY2Nzk3LDEzLjQxNzk3IGEgMS43MDAxNywxLjcwMDE3IDAgMSAwIDIuMzk4NDM3LC0yLjQxMDE2IEwgODEuOTYwOTM4LDEwMi44ODQ3NyA5NC4wMzUxNTYsOTEuMDExNzE5IGEgMS43MDAxNywxLjcwMDE3IDAgMCAwIC0xLjIxMDkzNywtMi45Mjc3MzUgeiIKICAgICAgIGlkPSJwYXRoNDU0OC02IgogICAgICAgaW5rc2NhcGU6Y29ubmVjdG9yLWN1cnZhdHVyZT0iMCIgLz4KICA8L2c+Cjwvc3ZnPgo=","vpn":"PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcKICAgeG1sbnM6ZGM9Imh0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvIgogICB4bWxuczpjYz0iaHR0cDovL2NyZWF0aXZlY29tbW9ucy5vcmcvbnMjIgogICB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiCiAgIHhtbG5zOnN2Zz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciCiAgIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIKICAgeG1sbnM6c29kaXBvZGk9Imh0dHA6Ly9zb2RpcG9kaS5zb3VyY2Vmb3JnZS5uZXQvRFREL3NvZGlwb2RpLTAuZHRkIgogICB4bWxuczppbmtzY2FwZT0iaHR0cDovL3d3dy5pbmtzY2FwZS5vcmcvbmFtZXNwYWNlcy9pbmtzY2FwZSIKICAgaWQ9ImUwMjJkYjRhLTVhYmYtNDI5Zi05NTljLTdmYWQxNmJjMmM2MCIKICAgd2lkdGg9IjE4IgogICBoZWlnaHQ9IjE2LjUzOTk5OSIKICAgdmlld0JveD0iMCAwIDE4IDE2LjUzOTk5OSIKICAgdmVyc2lvbj0iMS4xIgogICBzb2RpcG9kaTpkb2NuYW1lPSJFeHByZXNzUm91dGVfQ2lyY3VpdHMuc3ZnIgogICBpbmtzY2FwZTp2ZXJzaW9uPSIwLjkyLjMgKDI0MDU1NDYsIDIwMTgtMDMtMTEpIj4KICA8c29kaXBvZGk6bmFtZWR2aWV3CiAgICAgcGFnZWNvbG9yPSIjZmZmZmZmIgogICAgIGJvcmRlcmNvbG9yPSIjNjY2NjY2IgogICAgIGJvcmRlcm9wYWNpdHk9IjEiCiAgICAgb2JqZWN0dG9sZXJhbmNlPSIxMCIKICAgICBncmlkdG9sZXJhbmNlPSIxMCIKICAgICBndWlkZXRvbGVyYW5jZT0iMTAiCiAgICAgaW5rc2NhcGU6cGFnZW9wYWNpdHk9IjAiCiAgICAgaW5rc2NhcGU6cGFnZXNoYWRvdz0iMiIKICAgICBpbmtzY2FwZTp3aW5kb3ctd2lkdGg9IjE5MjAiCiAgICAgaW5rc2NhcGU6d2luZG93LWhlaWdodD0iMTAxNyIKICAgICBpZD0ibmFtZWR2aWV3NjQxMDciCiAgICAgc2hvd2dyaWQ9ImZhbHNlIgogICAgIGZpdC1tYXJnaW4tdG9wPSIwIgogICAgIGZpdC1tYXJnaW4tbGVmdD0iMCIKICAgICBmaXQtbWFyZ2luLXJpZ2h0PSIwIgogICAgIGZpdC1tYXJnaW4tYm90dG9tPSIwIgogICAgIGlua3NjYXBlOnpvb209IjQ4LjExMTExMSIKICAgICBpbmtzY2FwZTpjeD0iOSIKICAgICBpbmtzY2FwZTpjeT0iOC4yNjk5OTk3IgogICAgIGlua3NjYXBlOndpbmRvdy14PSItOCIKICAgICBpbmtzY2FwZTp3aW5kb3cteT0iLTgiCiAgICAgaW5rc2NhcGU6d2luZG93LW1heGltaXplZD0iMSIKICAgICBpbmtzY2FwZTpjdXJyZW50LWxheWVyPSJlMDIyZGI0YS01YWJmLTQyOWYtOTU5Yy03ZmFkMTZiYzJjNjAiIC8+CiAgPGRlZnMKICAgICBpZD0iZGVmczY0MDg4Ij4KICAgIDxsaW5lYXJHcmFkaWVudAogICAgICAgaWQ9ImJiMzdkZmFhLTQzOTAtNDJiNS1hNjI3LTUyZmQ3Mzk2OGUzYyIKICAgICAgIHgxPSI1LjMyOTk5OTkiCiAgICAgICB5MT0iMi44MDk5OTk5IgogICAgICAgeDI9IjguNzM5OTk5OCIKICAgICAgIHkyPSI2LjIxOTk5OTgiCiAgICAgICBncmFkaWVudFRyYW5zZm9ybT0icm90YXRlKC0wLjA4LC05ODAuMTc1MDYsLTE0NTQuNTY1MikiCiAgICAgICBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CiAgICAgIDxzdG9wCiAgICAgICAgIG9mZnNldD0iMCIKICAgICAgICAgc3RvcC1jb2xvcj0iIzg2ZDYzMyIKICAgICAgICAgaWQ9InN0b3A2NDA3MyIgLz4KICAgICAgPHN0b3AKICAgICAgICAgb2Zmc2V0PSIxIgogICAgICAgICBzdG9wLWNvbG9yPSIjNWU5NjI0IgogICAgICAgICBpZD0ic3RvcDY0MDc1IiAvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICAgIDxsaW5lYXJHcmFkaWVudAogICAgICAgaWQ9ImIwYTg1OGM5LTBlOTgtNGU0ZS05ZWFkLWQ3YTA3ODZjNDg0YiIKICAgICAgIHgxPSIxMS44NCIKICAgICAgIHkxPSIxNC41NCIKICAgICAgIHgyPSIxNS4yNCIKICAgICAgIHkyPSIxNy45NTAwMDEiCiAgICAgICBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CiAgICAgIDxzdG9wCiAgICAgICAgIG9mZnNldD0iMCIKICAgICAgICAgc3RvcC1jb2xvcj0iIzg2ZDYzMyIKICAgICAgICAgaWQ9InN0b3A2NDA3OCIgLz4KICAgICAgPHN0b3AKICAgICAgICAgb2Zmc2V0PSIxIgogICAgICAgICBzdG9wLWNvbG9yPSIjNWU5NjI0IgogICAgICAgICBpZD0ic3RvcDY0MDgwIiAvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICAgIDxsaW5lYXJHcmFkaWVudAogICAgICAgaWQ9ImVlZThhYjE5LTE0NTEtNDFkZi1iODcxLTEzZjhhNDlkMTdkNiIKICAgICAgIHgxPSItMS4zNCIKICAgICAgIHkxPSIxNC41MyIKICAgICAgIHgyPSIyLjA1OTk5OTkiCiAgICAgICB5Mj0iMTcuOTMiCiAgICAgICBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CiAgICAgIDxzdG9wCiAgICAgICAgIG9mZnNldD0iMCIKICAgICAgICAgc3RvcC1jb2xvcj0iIzg2ZDYzMyIKICAgICAgICAgaWQ9InN0b3A2NDA4MyIgLz4KICAgICAgPHN0b3AKICAgICAgICAgb2Zmc2V0PSIxIgogICAgICAgICBzdG9wLWNvbG9yPSIjNWU5NjI0IgogICAgICAgICBpZD0ic3RvcDY0MDg1IiAvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICA8L2RlZnM+CiAgPHRpdGxlCiAgICAgaWQ9InRpdGxlNjQwOTAiPkljb24tbmV0d29ya2luZy03OTwvdGl0bGU+CiAgPHJlY3QKICAgICB4PSI4LjA5MTYzMjgiCiAgICAgeT0iLTAuNDg0ODAwNzMiCiAgICAgd2lkdGg9IjEuOTgiCiAgICAgaGVpZ2h0PSI5LjUiCiAgICAgdHJhbnNmb3JtPSJyb3RhdGUoMzApIgogICAgIGlkPSJyZWN0NjQwOTIiCiAgICAgc3R5bGU9ImZpbGw6I2E2N2FmNCIgLz4KICA8cmVjdAogICAgIHg9IjUuMzg2MjA1NyIKICAgICB5PSI4LjYxNzEwNzQiCiAgICAgd2lkdGg9IjEuOTgiCiAgICAgaGVpZ2h0PSI5LjUiCiAgICAgdHJhbnNmb3JtPSJyb3RhdGUoLTMwKSIKICAgICBpZD0icmVjdDY0MDk0IgogICAgIHN0eWxlPSJmaWxsOiNhNjdhZjQiIC8+CiAgPHJlY3QKICAgICB4PSIxMi45OSIKICAgICB5PSItMTMuNjM5OTk5IgogICAgIHdpZHRoPSIxLjk4IgogICAgIGhlaWdodD0iOS41IgogICAgIHRyYW5zZm9ybT0icm90YXRlKDkwKSIKICAgICBpZD0icmVjdDY0MDk2IgogICAgIHN0eWxlPSJmaWxsOiM3NzNhZGMiIC8+CiAgPGNpcmNsZQogICAgIGN4PSI5LjA2OTk5OTciCiAgICAgY3k9IjIuNDEwMDAwMSIKICAgICByPSIyLjQxMDAwMDEiCiAgICAgaWQ9ImNpcmNsZTY0MDk4IgogICAgIHN0eWxlPSJmaWxsOnVybCgjYmIzN2RmYWEtNDM5MC00MmI1LWE2MjctNTJmZDczOTY4ZTNjKSIgLz4KICA8Y2lyY2xlCiAgICAgY3g9IjE1LjU5IgogICAgIGN5PSIxNC4xMjk5OTkiCiAgICAgcj0iMi40MTAwMDAxIgogICAgIGlkPSJjaXJjbGU2NDEwMCIKICAgICBzdHlsZT0iZmlsbDp1cmwoI2IwYTg1OGM5LTBlOTgtNGU0ZS05ZWFkLWQ3YTA3ODZjNDg0YikiIC8+CiAgPGNpcmNsZQogICAgIGN4PSIyLjQxMDAwMDEiCiAgICAgY3k9IjE0LjEyOTk5OSIKICAgICByPSIyLjQxMDAwMDEiCiAgICAgaWQ9ImNpcmNsZTY0MTAyIgogICAgIHN0eWxlPSJmaWxsOnVybCgjZWVlOGFiMTktMTQ1MS00MWRmLWI4NzEtMTNmOGE0OWQxN2Q2KSIgLz4KICA8bWV0YWRhdGEKICAgICBpZD0ibWV0YWRhdGE2NDEwNCI+CiAgICA8cmRmOlJERj4KICAgICAgPHJkZjpsaT5wdWJsaWM6dHJ1ZTwvcmRmOmxpPgogICAgICA8cmRmOmxpPnNkazpmYWxzZTwvcmRmOmxpPgogICAgICA8cmRmOmxpPmNhdGVnb3J5OiBOZXR3b3JraW5nPC9yZGY6bGk+CiAgICAgIDxjYzpXb3JrCiAgICAgICAgIHJkZjphYm91dD0iIj4KICAgICAgICA8ZGM6Zm9ybWF0PmltYWdlL3N2Zyt4bWw8L2RjOmZvcm1hdD4KICAgICAgICA8ZGM6dHlwZQogICAgICAgICAgIHJkZjpyZXNvdXJjZT0iaHR0cDovL3B1cmwub3JnL2RjL2RjbWl0eXBlL1N0aWxsSW1hZ2UiIC8+CiAgICAgICAgPGRjOnRpdGxlPkljb24tbmV0d29ya2luZy03OTwvZGM6dGl0bGU+CiAgICAgIDwvY2M6V29yaz4KICAgIDwvcmRmOlJERj4KICA8L21ldGFkYXRhPgo8L3N2Zz4K"}};

/**
 * Verified real draw.io/Lucidchart shape styles for the client/network-access band icons,
 * confirmed against the actual stencil/asset sources in github.com/jgraph/drawio
 * (src/main/webapp/stencils/aws4.xml, gcp2.xml, and img/lib/azure2/networking/*.svg).
 * AWS and GCP reference draw.io's built-in vector stencils; Azure references its bundled
 * image assets — both resolve correctly when the file is opened in the real draw.io app.
 */
/**
 * draw.io style for a real cloud-provider icon, built as a fully self-contained embedded
 * image (data: URI) rather than a reference to draw.io's internal shape-library names.
 *
 * Earlier this used `shape=mxgraph.gcp2.<name>` stencil references for AWS/GCP, guessed
 * from draw.io's lowercase/underscore naming convention — AWS's were independently
 * confirmed against a real shape catalog, but the GCP ones were never actually verified
 * against draw.io's internal registry, and users reported the icons rendering blank
 * ("images missing") after opening the exported file. A self-contained embedded image
 * has no such dependency: it's the exact same vector data already confirmed to render
 * correctly in this app's own SVG preview (AWS/GCP), or draw.io's own bundled Azure icon
 * SVG (already fetched and embedded for the live preview) — so it can't go stale or
 * depend on exactly which shape libraries a given draw.io install/version ships with.
 */
function cloudIconDrawioStyle(provider, kind) {
  const vector = CLOUD_ICON_DATA.vector[provider]?.[kind];
  let b64 = null;
  if (vector) {
    const paths = vector.segs.map(([d, fill]) => `<path d="${esc(d)}" fill="${esc(fill)}"/>`).join("");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vector.w} ${vector.h}">${paths}</svg>`;
    b64 = btoa(unescape(encodeURIComponent(svg)));
  } else if (provider === "azure") {
    b64 = CLOUD_ICON_DATA.azureB64[kind] || null;
  }
  if (!b64) return null;
  // Must NOT contain a literal ";" — mxGraph/draw.io's cell-style parser splits the whole
  // style string on ";", so "image=data:image/svg+xml;base64,XXXX" truncates to just
  // "data:image/svg+xml" and drops the actual payload (confirmed against the live draw.io
  // app, including real-world .drawio files on GitHub that have this exact bug). Percent-
  // encoding the ";" as %3B avoids the truncation but then fails a *different* way: draw.io's
  // renderer only recognizes the literal, un-encoded ";base64," substring as the base64 flag,
  // so %3B also renders blank. The short-form RFC 2397 data URI below — a bare comma, no
  // ";base64," at all — has no ";" to trip the style-string split; draw.io's own
  // mxGraph.postProcessCellStyle detects the missing marker and inserts ";base64," right
  // before rendering. Verified empirically: this is the only one of the three that renders.
  return `image;aspect=fixed;html=1;points=[];align=center;fontSize=10;image=data:image/svg+xml,${b64};`;
}

/**
 * Inline SVG markup for a real cloud-provider service icon at (x, y), scaled to fit a
 * size x size box. AWS/GCP render as native vector paths (extracted from draw.io's own
 * aws4/gcp2 stencils); Azure embeds the real bundled draw.io Azure icon SVG as a data: URI
 * (CSP-compliant — index.html's img-src allows 'self' and data:, not blob:). Returns "" if
 * there's no icon for this provider/kind combination (e.g. on-prem, or "Internal clients").
 */
function cloudIconSvgMarkup(provider, kind, x, y, size) {
  if (!provider || !kind) return "";
  const vector = CLOUD_ICON_DATA.vector[provider]?.[kind];
  if (vector) {
    const scale = size / Math.max(vector.w, vector.h);
    const paths = vector.segs.map(([d, fill]) => `<path d="${d}" fill="${fill}"/>`).join("");
    const offsetX = x + (size - vector.w * scale) / 2;
    const offsetY = y + (size - vector.h * scale) / 2;
    return `<g transform="translate(${offsetX},${offsetY}) scale(${scale})">${paths}</g>`;
  }
  const azureB64 = provider === "azure" ? CLOUD_ICON_DATA.azureB64[kind] : null;
  if (azureB64) {
    return `<image x="${x}" y="${y}" width="${size}" height="${size}" href="data:image/svg+xml;base64,${azureB64}"/>`;
  }
  return "";
}

/** Inline SVG markup for the real JFrog logo mark, scaled to fit a size x size box. */
function jfrogLogoSvgMarkup(x, y, size) {
  const scale = size / Math.max(JFROG_LOGO.w, JFROG_LOGO.h);
  const offsetX = x + (size - JFROG_LOGO.w * scale) / 2;
  const offsetY = y + (size - JFROG_LOGO.h * scale) / 2;
  return `<g transform="translate(${offsetX},${offsetY}) scale(${scale})"><path fill-rule="evenodd" clip-rule="evenodd" d="${JFROG_LOGO.d}" fill="${JFROG_LOGO.fill}"/></g>`;
}

/** draw.io style for the JFrog logo, embedded the same way as cloudIconDrawioStyle. */
function jfrogLogoDrawioStyle() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${JFROG_LOGO.w} ${JFROG_LOGO.h}"><path fill-rule="evenodd" clip-rule="evenodd" d="${esc(JFROG_LOGO.d)}" fill="${JFROG_LOGO.fill}"/></svg>`;
  const b64 = btoa(unescape(encodeURIComponent(svg)));
  // See cloudIconDrawioStyle: must be the bare-comma short form (no ";base64,") or
  // draw.io's style-string parser truncates this and the logo renders blank.
  return `image;aspect=fixed;html=1;points=[];align=center;fontSize=10;image=data:image/svg+xml,${b64};`;
}

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

  const hasOnPrem = regions.some((r) => (r.iaas || iaas) === "onprem");
  const connectivityProvider = providers.find((p) => p !== "onprem") || (iaas !== "onprem" ? iaas : "aws");
  const connectivityMeta = DIAGRAM_META[connectivityProvider] || DIAGRAM_META.aws;
  const hasSaasSide = input.deployModel === "saas" || input.deployModel === "hybrid";
  const hasSelfManagedSide = input.deployModel === "selfmanaged" || input.deployModel === "hybrid";
  const logStreaming = !!ctx.entitledCapabilities.has("logStreaming");
  const missionControl = !!ctx.entitledCapabilities.has("missionControl");

  const authNote = input.deployModel === "saas"
    ? "SaaS auth — Users: SSO (SAML / OIDC) + SCIM provisioning · CI/CD: Access Tokens / OIDC (no interactive login)"
    : input.deployModel === "hybrid"
      ? "Auth — SaaS side: SSO (SAML / OIDC) + SCIM for users, Access Tokens / OIDC for CI/CD · On-Prem side: platform SSO (Ent X+) + Access Tokens"
      : "Self-managed auth — Users: platform SSO (SAML / OIDC / SCIM, Ent X+) · CI/CD: Access Tokens / OIDC";

  const cloudMonitorNames = [...new Set(providers.filter((p) => p !== "onprem").map((p) => (DIAGRAM_META[p] || DIAGRAM_META.aws).monitor))].join(" / ");
  const monitoringBits = [];
  if (hasSaasSide) {
    monitoringBits.push(logStreaming
      ? `JFrog SaaS status page + Log Streaming → your SIEM/APM${cloudMonitorNames ? ` (e.g. ${cloudMonitorNames})` : ""} (Ent+)`
      : "JFrog SaaS status page only (Log Streaming needs Enterprise +)");
  }
  if (hasSelfManagedSide) {
    const infra = cloudMonitorNames ? `${cloudMonitorNames}${hasOnPrem ? " / on-prem" : ""}` : "on-prem";
    monitoringBits.push(`${infra} infra monitoring + JFrog Prometheus metrics endpoint → Grafana${missionControl ? " + Mission Control" : ""}`);
  }
  const monitoringNote = `Monitoring — ${monitoringBits.join(" · ")}`;

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
    hasOnPrem,
    connectivityProvider,
    connectivityMeta,
    authNote,
    monitoringNote,
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

  // Config-level steps for the network/access layer shown on the architecture diagram —
  // verified against JFrog's own docs (MyJFrog PrivateLink/PSC setup, DNS Routing in MyJFrog).
  const hasOnPremRegion = (input.regions || []).some((r) => (r.iaas || input.iaas) === "onprem");
  const connectivityProviders = providersFromRegions(input.regions || []);
  const connectivityProvider = connectivityProviders.find((p) => p !== "onprem")
    || (input.iaas !== "onprem" ? input.iaas : "aws");
  const connectivityMeta = DIAGRAM_META[connectivityProvider] || DIAGRAM_META.aws;
  const needsPrivateEndpoint = (input.deployModel === "saas" || input.deployModel === "hybrid")
    && (input.platform === "entx" || input.platform === "entplus");

  if (needsPrivateEndpoint) {
    const privateEndpointSetup = {
      aws: "AWS: create a VPC endpoint for the JFrog VPC endpoint service name (from MyJFrog), note its Endpoint ID, then in my.jfrog.com → Manage AWS PrivateLinks submit the Endpoint ID + region.",
      azure: "Azure: create a Private Endpoint targeting the JFrog Private Link Service alias (from MyJFrog), then in MyJFrog → Security → Private Connections register the connection.",
      gcp: "GCP: create a Private Service Connect endpoint for the JFrog service attachment, copy its Endpoint ID, then in MyJFrog → Security → Private Connections → + Create New register it.",
    };
    steps.push({
      title: `Configure ${connectivityMeta.pl} (${IAAS_LABELS[connectivityProvider] || connectivityProvider})`,
      detail: `${privateEndpointSetup[connectivityProvider] || privateEndpointSetup.aws} Requires Enterprise X + Security Pack, or Enterprise+. Point <server>.pe.jfrog.io at the endpoint via ${connectivityMeta.dns}, validate with a ping from inside the VPC/VNet, then allowlist only the private IP in MyJFrog to block public access.`,
    });
    steps.push({
      title: "Wire corporate DNS + load balancer to *.pe.jfrog.io",
      detail: `Point internal DNS (${connectivityMeta.dns}) and the load balancer (${connectivityMeta.lb}) at the private endpoint so CI/CD, security tooling, and users resolve <server>.pe.jfrog.io internally — do this before disabling public access, and confirm it resolves from every client network (VPN-connected included).`,
    });
    steps.push({
      title: "Optional: custom domain on the load balancer",
      detail: `To front the private endpoint with a customer-owned domain (e.g. artifactory.acme.com) instead of exposing <server>.pe.jfrog.io to users, point that domain at the ${connectivityMeta.lb} rather than at the endpoint directly. TLS has to work one of two ways: the load balancer passes it through untouched by SNI (so <server>.pe.jfrog.io — what JFrog's certificate is actually issued for — is still what's being matched), or the load balancer terminates the custom domain's own certificate and re-encrypts on to the endpoint. Either way its backend pool target doesn't change: the private endpoint's private IP — the custom domain itself is never publicly resolvable.`,
    });
  }

  if (hasOnPremRegion) {
    steps.push({
      title: "Establish On-Prem ↔ Cloud connectivity",
      detail: `Stand up ${connectivityMeta.vpn} between the on-prem network and the cloud VPC/VNet hosting the private endpoint before attempting private connectivity — without it, on-prem clients cannot reach ${connectivityMeta.pl} at all, private or public DNS aside.`,
    });
    if (needsPrivateEndpoint) {
      steps.push({
        title: "Configure the conditional DNS forwarder (on-prem)",
        detail: `On-prem DNS servers can't resolve the cloud-side private hosted zone directly. ${connectivityMeta.resolverConfig} Then, on the on-prem DNS server (Windows DNS, BIND, Infoblox, etc.), add a conditional forwarder for the zone \`pe.jfrog.io\` (or the specific \`<server>.pe.jfrog.io\` name) pointing at that endpoint's IP(s) — so on-prem clients get the private IP for that zone while every other query still resolves normally. Test with \`nslookup <server>.pe.jfrog.io\` from an on-prem host before cutover; it must return the private IP, not the public one.`,
      });
    }
  }

  if ((input.deployModel === "saas" || input.deployModel === "hybrid") && (ctx.writableSites || 1) > 1) {
    steps.push({
      title: "Configure JFrog-side DNS routing (MyJFrog)",
      detail: "In MyJFrog, define a routing URL and choose Manual Failover (exactly 2 JPDs, active-passive — triggers an email after ~10 min down, then you switch manually) or Geolocation (2-10 JPDs, mapped by continent/country/US state) — point the customer's domain at the routing URL, never at individual JPDs. Private Endpoints do NOT participate in this failover: repoint them to the secondary region manually, and note that cross-provider failover breaks private connectivity entirely (different provider = no private path).",
    });
    if (needsPrivateEndpoint) {
      steps.push({
        title: "Resolving the routing URL privately needs a load balancer, not a DNS override",
        detail: "If CI/CD or internal tooling should resolve the routing URL itself (not <server>.pe.jfrog.io) and still land privately on whichever JPD is active, a plain internal DNS override that points it straight at a private endpoint's IP will fail TLS — that endpoint's certificate is issued for <server>.pe.jfrog.io, not the routing URL, so the hostname won't match. Front it with a load balancer instead: the LB terminates the routing URL with your own certificate, then re-encrypts to whichever JPD's <server>.pe.jfrog.io is currently active by SNI/Host header. That backend selection is on you to maintain — MyJFrog's failover doesn't drive it — so tie flipping the LB's backend to the same trigger as the MyJFrog manual failover (or your own health checks), otherwise the public and private paths can point at different JPDs at the same time.",
      });
    }
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

const ARCH_COLORS = {
  bg: "#0c0e12",
  lane: "#11151b",
  cell: "#171a21",
  border: "#2a2f3a",
  accent: "#40bf6a",
  info: "#4aa3ff",
  warn: "#f5a623",
  net: "#b47bff",
  route: "#2fd1c5",
  primary: "#13251a",
  additional: "#132033",
  edge: "#2a230f",
  netFill: "#221a33",
  routeFill: "#0f2b29",
  txt: "#e6e8ee",
  muted: "#9aa3b2",
};

const ARCH_LANE_LABELS = {
  west: "WEST REGIONS",
  central: "CENTRAL REGIONS",
  east: "EAST REGIONS",
  other: "OTHER / UNDEFINED",
};

// Inline SVG shares the host document's style scope, so every selector is svg-scoped
// and jfd-prefixed. Keeping the rules inside the <svg> also keeps the downloaded file animated.
const ARCH_FLOW_STYLE = `<style>
svg .jfd-flow-fed{stroke-dasharray:14 6;animation:jfd-flow-fed 1.4s linear infinite;}
svg .jfd-flow-dist{stroke-dasharray:6 5;animation:jfd-flow-dist 1.4s linear infinite;}
svg .jfd-flow-net{stroke-dasharray:8 4;animation:jfd-flow-net 1.2s linear infinite;}
svg .jfd-flow-route{stroke-dasharray:7 5;animation:jfd-flow-route 1.4s linear infinite;}
svg .jfd-flow-bypass{stroke-dasharray:3 4;animation:jfd-flow-bypass 1.6s linear infinite;}
@keyframes jfd-flow-fed{to{stroke-dashoffset:-40;}}
@keyframes jfd-flow-dist{to{stroke-dashoffset:-44;}}
@keyframes jfd-flow-net{to{stroke-dashoffset:-24;}}
@keyframes jfd-flow-route{to{stroke-dashoffset:-24;}}
@keyframes jfd-flow-bypass{to{stroke-dashoffset:-28;}}
svg.jfd-paused .jfd-flow{animation:none;}
@media (prefers-reduced-motion:reduce){svg .jfd-flow{animation:none;}}
</style>`;

function architectureLane(region) {
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

/**
 * Single geometry pass shared by the on-page SVG and the draw.io export so the two
 * never drift. Coordinates are plain pixels usable by both renderers.
 */
function architectureLayout(model) {
  const primaries = model.primaries || [];
  const additionals = model.additionals || [];
  const edgeNodes = model.edgeNodes || [];
  const edgeSelfManaged = (model.edgeOps || "selfmanaged") === "selfmanaged";

  const deployLabel = model.deployModel === "saas"
    ? "SaaS"
    : model.deployModel === "hybrid" ? "Hybrid SaaS + On-Prem" : "Self-managed";
  const titleText = `${model.iaasLabel} · ${model.tierName} · ${deployLabel}`;
  const productText = model.products.length ? model.products.join(" · ") : "Platform baseline";

  const rows = [
    { key: "primary", label: "1 · PRIMARY", items: primaries },
    { key: "additional", label: "2 · ADDITIONAL", items: additionals },
    { key: "edge", label: "3 · EDGES", items: edgeNodes },
  ].filter((row) => row.items.length > 0);

  if (!rows.length) {
    return { empty: true, W: 640, H: 150, titleText, productText };
  }

  const buckets = {};
  rows.forEach((row) => {
    buckets[row.key] = { west: [], central: [], east: [], other: [] };
    row.items.forEach((item) => buckets[row.key][architectureLane(item.region)].push(item));
  });
  const laneKeys = ["west", "central", "east", "other"].filter((lane) =>
    rows.some((row) => buckets[row.key][lane].length > 0)
  );

  const pad = 18;
  const roleW = 96;
  const laneW = 258;
  const laneGap = 12;
  const boxW = 226;
  const boxH = 50;
  const boxGapY = 10;
  const footerH = 36;
  const rowGap = 34;
  const cellPad = 12;
  const gridX = pad + roleW;

  // Client / network-access band: internal clients (CI/CD, security tooling, users) reaching
  // *.pe.jfrog.io through corporate DNS, a load balancer, and a cloud private endpoint — plus,
  // when any region is On-Prem, the VPN / direct-connect link into the cloud side.
  const accessBoxW = 176;
  const accessBoxH = 46;
  // Wide enough to carry a short DNS-config label ("[server].pe.jfrog.io") on the
  // connector between each pair of boxes, not just the arrow itself.
  const accessGapX = 90;
  // What actually gets configured at each hop, shown as the label on the connector
  // arriving at that resource: the on-prem DNS server gets a conditional-forward zone for
  // the wildcard, the cloud-side resolver answers the specific per-JPD hostname, and the
  // load balancer fronts that same hostname once it's resolved to a private IP. Square
  // brackets, not "<server>": these labels render as HTML (html=1) in the draw.io export,
  // where a literal "<" opens an (unknown, invisible) tag and silently eats the text.
  const accessChainLabels = ["", "*.pe.jfrog.io", "[server].pe.jfrog.io", "[server].pe.jfrog.io"];
  const publicRouteLabel = "public: [server].jfrog.io";
  // Custom domain (vanity URL, e.g. artifactory.acme.com) for the private endpoint: the
  // customer points it at their own load balancer instead of [server].pe.jfrog.io directly.
  // From there TLS either passes through unmodified by SNI — the LB never terminates it,
  // so the original [server].pe.jfrog.io name is what JFrog's certificate still has to
  // match — or the LB terminates the custom domain's own certificate and re-encrypts to
  // the endpoint. Either way the LB's backend pool target never changes: it's always the
  // private endpoint's private IP, so the custom domain is never resolvable publicly. Folded
  // into this same edge label (rather than a separate caption band) since the only free
  // space nearby is already crossed by the public/cloud-native bypass lines above it.
  const privatePeLabel = "private (or custom domain): [server].pe.jfrog.io";
  const cloudMeta = model.connectivityMeta || DIAGRAM_META[model.connectivityProvider] || DIAGRAM_META.aws;
  // iconKind looks up the real cloud-provider icon (CLOUD_ICON_DATA via cloudIconSvgMarkup /
  // cloudIconDrawioStyle) for model.connectivityProvider; null means a generic box only.
  // On-prem CI/CD clients reaching a cloud-hosted JFrog instance (privately or publicly)
  // is a scenario every customer has, independent of whether their purchased topology
  // includes an actual On-Prem JPS region — so this whole path is always drawn, not
  // gated behind model.hasOnPrem (that flag still legitimately gates the On-Prem JPS/JPD
  // box itself further down, since that one really does depend on what was bought).
  const accessDefs = [
    { title: "Internal clients", sub: "CI/CD · Security tools · Users", iconKind: null },
    { title: "On-Prem ↔ Cloud", sub: cloudMeta.vpn, iconKind: "vpn" },
    { title: "Corporate DNS", sub: "Conditional forwarder →", iconKind: "dns" },
    // On-prem DNS servers can't resolve the cloud-side private hosted zone directly — the
    // conditional forwarder above sends pe.jfrog.io queries across the VPN to this inbound
    // resolver endpoint in the VPC/VNet, which then resolves them against the private zone.
    // Cloud-native clients (already inside the VPC/VNet) skip this hop entirely.
    { title: "DNS Resolver Endpoint", sub: cloudMeta.resolverInboundShort, iconKind: "dns" },
    { title: "Load Balancer", sub: cloudMeta.lb, iconKind: "lb" },
  ];
  const accessRowW = accessDefs.length * accessBoxW + (accessDefs.length - 1) * accessGapX;

  // Private Endpoint moves down to share a row with the JFrog-side DNS routing box (both
  // fan into the grid from the same height) rather than sitting up in the client chain —
  // that keeps its per-JPD fan-out lines short and direct instead of running the length
  // of the diagram.
  // Rough advance-width estimate (shared with the W/footer sizing below) so long titles
  // and captions widen their box instead of overflowing it.
  const textW = (text, size) => text.length * size * 0.58;
  // This box's own width auto-grows to fit routeSub (see routeBoxMinW below), so it's the
  // one safe place in this band to add a longer caption — everywhere else here is already
  // crossed by the LB→route/LB→pf curves and the public/cloud-native bypass lines.
  const routeSub = `Manual failover / geo-location · ${primaries.length + additionals.length} writable site(s) · excludes Private Endpoints (left) · to mirror privately, front with your own LB (SNI to whichever JPD is active — not auto-synced with this)`;
  const peBoxW = 210;
  const routeGapX = 16;
  const routeBoxMinW = Math.ceil(textW(routeSub, 10)) + 48;
  const routeBandW = Math.max(accessRowW, peBoxW + routeGapX + routeBoxMinW);
  const routeBoxW = routeBandW - peBoxW - routeGapX;

  const bandStartY = 56;
  const accessLabelH = 18;
  const accessBoxY = bandStartY + accessLabelH;
  const accessBoxBottom = accessBoxY + accessBoxH;
  const accessCaptionY = accessBoxBottom + 16;
  const accessBandBottom = accessCaptionY + 8;

  // JFrog-side DNS routing band: the global router that steers traffic across writable
  // sites by manual failover or geo-location — sits between the private endpoint and Primary.
  const routeGap = 16;
  const routeLabelH = 20;
  const routeBoxH = 44;
  const routeBandY = accessBandBottom + routeGap;
  const routeBoxY = routeBandY + routeLabelH;
  const routeBoxBottom = routeBoxY + routeBoxH;
  const routeBandBottom = routeBoxBottom + 10;

  const laneTop = routeBandBottom + 20;
  const headerH = laneTop + 34;

  let gridH = 0;
  const rowLayout = [];
  rows.forEach((row, index) => {
    const maxCount = Math.max(...laneKeys.map((lane) => buckets[row.key][lane].length), 1);
    const h = cellPad * 2 + maxCount * boxH + Math.max(0, maxCount - 1) * boxGapY;
    rowLayout.push({ key: row.key, label: row.label, y: headerH + gridH, h });
    gridH += h;
    if (index < rows.length - 1) gridH += rowGap;
  });

  const footerBits = [];
  footerBits.push(`${model.writableSitesCount || primaries.length + additionals.length} writable JPD(s)`);
  if (model.edgeCount) footerBits.push(`${model.edgeCount} Edge · ${edgeSelfManaged ? "self-managed" : "Cloud Edge"}`);
  if (model.storageGB != null) footerBits.push(`Consumption ${formatGB(model.storageGB)}`);
  const footerLeft = footerBits.join(" · ");
  const footerRight = "Undefined / non-geo sites → OTHER";
  // If both footer strings can't fit side by side, drop the right note to its own line above.
  const footerGap = 24;
  const footerOneLineW = pad * 2 + textW(footerLeft, 11) + footerGap + textW(footerRight, 10);
  const gridW = laneKeys.length * laneW + (laneKeys.length - 1) * laneGap;
  const baseW = pad * 2 + roleW + gridW;
  const footerStacked = footerOneLineW > baseW && footerOneLineW > pad * 2 + textW(titleText, 14);
  let W = Math.ceil(Math.max(
    baseW,
    pad * 2 + roleW + routeBandW,
    pad * 2 + textW(titleText, 14),
    pad * 2 + textW(productText, 11),
    pad * 2 + textW(model.authNote || "", 10),
    pad * 2 + textW(model.monitoringNote || "", 11),
    pad * 2 + textW(footerLeft, 11),
    pad * 2 + textW(footerRight, 10),
    footerStacked ? 0 : footerOneLineW,
    // The "public: [server].jfrog.io" label sits just past the Load Balancer box (the
    // last access node), offset from its center same as in the SVG/drawio renderers below —
    // without this the diagram width doesn't leave room for it and it gets clipped.
    gridX + accessRowW - accessBoxW / 2 + 10 + textW(publicRouteLabel, 9) + pad,
  ));
  const footerLineGap = 18;
  const extraFooterH = (footerStacked ? footerLineGap : 0) + footerLineGap + 4;
  const H = headerH + gridH + footerH + extraFooterH + pad;
  const footerLeftY = H - 14;
  const footerRightY = footerStacked ? footerLeftY - footerLineGap : footerLeftY;
  const footerMonitorY = (footerStacked ? footerRightY : footerLeftY) - footerLineGap;

  const laneX = (lane) => gridX + laneKeys.indexOf(lane) * (laneW + laneGap);
  const lanes = laneKeys.map((lane) => ({
    key: lane,
    label: ARCH_LANE_LABELS[lane],
    x: laneX(lane),
    y: laneTop,
    w: laneW,
    h: H - laneTop - footerH,
  }));

  const cells = [];
  const nodes = [];
  const anchors = { primary: [], additional: [], edge: [] };

  rowLayout.forEach((row) => {
    laneKeys.forEach((lane) => {
      const x = laneX(lane);
      cells.push({ rowKey: row.key, lane, x: x + 6, y: row.y, w: laneW - 12, h: row.h });

      let y = row.y + cellPad;
      buckets[row.key][lane].forEach((item) => {
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
        const node = {
          id: `n${nodes.length + 1}`,
          rowKey: row.key,
          lane,
          x: x + (laneW - boxW) / 2,
          y,
          w: boxW,
          h: boxH,
          title,
          sub,
        };
        nodes.push(node);
        anchors[row.key].push(node);
        y += boxH + boxGapY;
      });
    });
  });

  const centerX = (node) => node.x + node.w / 2;
  const visibleGridW = laneKeys.length * laneW + Math.max(0, laneKeys.length - 1) * laneGap;
  const labelX = gridX + visibleGridW / 2;

  // Primary → Additional uses one clean green bus in the row gap.
  let federation = null;
  if (anchors.primary.length && anchors.additional.length) {
    const source = anchors.primary[0];
    const primaryRow = rowLayout.find((row) => row.key === "primary");
    const busY = primaryRow.y + primaryRow.h + rowGap / 2;
    const destinationXs = anchors.additional.map(centerX);
    federation = {
      source,
      targets: anchors.additional,
      busY,
      labelX,
      sourceX: centerX(source),
      sourceBottom: source.y + source.h,
      minX: Math.min(centerX(source), ...destinationXs),
      maxX: Math.max(centerX(source), ...destinationXs),
      label: model.accessFederation ? "Access + Repository Federation" : "Repository Federation",
    };
  }

  // Primary → Edge uses a separate amber bus immediately above the Edge row.
  let distribution = null;
  if (anchors.primary.length && anchors.edge.length) {
    const source = anchors.primary[0];
    const edgeRow = rowLayout.find((row) => row.key === "edge");
    const busY = edgeRow.y - rowGap / 2;
    const routeX = gridX - 24;
    const destinationXs = anchors.edge.map(centerX);
    distribution = {
      source,
      targets: anchors.edge,
      busY,
      routeX,
      labelX,
      sourceX: centerX(source),
      sourceBottom: source.y + source.h,
      minX: Math.min(routeX, ...destinationXs),
      maxX: Math.max(routeX, ...destinationXs),
      label: "Distribution push · Release Bundles → Edge",
    };
  }

  // Access nodes: client/network chain (clients → [VPN] → DNS → LB → Private Endpoint),
  // left-aligned with the lane grid below it.
  let accessCursorX = gridX;
  const accessNodes = accessDefs.map((def, index) => {
    const node = {
      id: `ac${index + 1}`, x: accessCursorX, y: accessBoxY, w: accessBoxW, h: accessBoxH,
      title: def.title, sub: def.sub, iconKind: def.iconKind,
    };
    accessCursorX += accessBoxW + accessGapX;
    return node;
  });
  const accessConnectors = [];
  for (let i = 0; i < accessNodes.length - 1; i++) {
    const a = accessNodes[i];
    const b = accessNodes[i + 1];
    accessConnectors.push({ x1: a.x + a.w, y1: a.y + a.h / 2, x2: b.x, y2: b.y + b.h / 2, label: accessChainLabels[i] });
  }
  // Real per-service cloud icons only exist for actual cloud providers (aws/azure/gcp);
  // an on-prem-only connectivity provider falls back to plain labeled boxes.
  const iconProvider = ["aws", "azure", "gcp"].includes(model.connectivityProvider)
    ? model.connectivityProvider
    : null;
  const access = {
    labelY: bandStartY + 14,
    nodes: accessNodes,
    connectors: accessConnectors,
    iconProvider,
    captionY: accessCaptionY,
    caption: model.authNote,
  };

  // JFrog-side DNS routing handles the PUBLIC *.jfrog.io routing URL only. Per JFrog's docs
  // (DNS Routing in MyJFrog), this does NOT extend to PrivateLink/Private Endpoint
  // connections: each private endpoint/PSC connection is pinned to exactly one JPD (its own
  // VPC endpoint service / Private Link alias / service attachment), so a customer with N
  // writable sites needs N private endpoints, each wired directly to its own JPD — never
  // through the DNS routing hub. Private Endpoint(s) now sit in their own box sharing this
  // band with the routing hub (both fan into the grid from the same height, right next to
  // each other) instead of up in the client chain — that keeps every fan-out line short.
  const lbNode = accessNodes.find((n) => n.iconKind === "lb") || accessNodes[accessNodes.length - 1];
  const additionalRow = rowLayout.find((row) => row.key === "additional");
  const peBoxX = gridX;
  const routeBoxX = gridX + peBoxW + routeGapX;
  const routeOutX = routeBoxX + routeBoxW / 2;
  const primaryTargets = anchors.primary.map((a) => ({ x: centerX(a), y: a.y, id: a.id }));
  let additionalFan = null;
  if (anchors.additional.length && additionalRow) {
    const sideX = gridX + gridW + 34;
    additionalFan = {
      sideX,
      busY: additionalRow.y - 12,
      fromY: routeBoxBottom,
      targets: anchors.additional.map((a) => ({ x: centerX(a), y: a.y, id: a.id })),
    };
    // The side channel can sit to the right of everything computed so far — widen the
    // canvas to fit it (lane positions are unaffected; they're already fixed at gridX).
    W = Math.max(W, sideX + pad);
  }

  // "Internal clients" covers three distinct connectivity scenarios, only one of which
  // (on-prem, via the VPN chain) is drawn as the main through-path below. The other two
  // are optional bypasses covering the remaining ways clients actually reach JFrog:
  //
  //  - Public / remote clients (no private connectivity at all — an on-prem CI/CD runner
  //    without PrivateLink set up, a laptop on the public internet): skip straight to the
  //    public *.jfrog.io routing URL via JFrog-side DNS. Always drawn as the alternative
  //    to the VPN+private-endpoint path above, regardless of what the customer purchased.
  //  - Cloud-native clients/services (already inside the same VPC/VNet as the private
  //    endpoint — an EC2/GKE/AKS-hosted CI/CD runner, an internal service): they need
  //    neither the VPN nor the on-prem DNS bridge, since the cloud's own default VPC/VNet
  //    resolver already answers the private hosted zone — they reach the endpoint directly.
  const clientsNode = accessNodes[0];
  const clientBypass = {
    x: clientsNode.x + clientsNode.w / 2,
    fromY: accessBoxBottom,
    toY: routeBoxY,
    label: "public: via JFrog DNS routing",
  };
  const cloudNativeBypass = {
    x: clientsNode.x + clientsNode.w / 2,
    fromY: accessBoxBottom,
    toX: peBoxX + peBoxW / 2,
    toY: routeBoxY,
    label: "cloud-native: same VPC, no VPN",
  };

  const route = {
    id: "route1",
    x: routeBoxX,
    y: routeBoxY,
    w: routeBoxW,
    h: routeBoxH,
    title: "JFrog-side DNS routing (public)",
    sub: routeSub,
    labelY: routeBandY + 12,
    inFromX: lbNode.x + lbNode.w / 2,
    inFromY: accessBoxBottom,
    inToX: routeOutX,
    inToY: routeBoxY,
    outX: routeOutX,
    outFromY: routeBoxBottom,
    primaryTargets,
    additionalFan,
    clientBypass,
    inLabel: publicRouteLabel,
  };

  // Private Endpoint(s): one dedicated connection per writable site, wired directly — never
  // through the routing hub beside it. Short direct drops into Primary; Additional reached
  // via its own short side channel just left of the grid.
  const peOutX = peBoxX + peBoxW / 2;
  // Best practice for a single custom domain fronting the private path (see privatePeLabel
  // above): point its load balancer at whichever JPD is Primary right now, with the
  // Additional instance as standby — the same active/passive pairing Manual Failover uses
  // publicly, just mirrored on the customer's own LB. Only label it that way when the
  // topology actually is a clean 2-JPD failover pair; with Geolocation or 3+ writable sites
  // there's no single "the standby one," so we leave the fan-out unlabeled instead of
  // asserting something misleading.
  const peSingleFailoverPair = anchors.primary.length === 1 && anchors.additional.length === 1;
  const peFan = {
    id: "pe1",
    x: peBoxX,
    y: routeBoxY,
    w: peBoxW,
    h: routeBoxH,
    title: "Private Endpoint(s)",
    sub: `${cloudMeta.pl} · 1 per JPD`,
    inFromX: lbNode.x + lbNode.w / 2,
    inFromY: accessBoxBottom,
    inToX: peOutX,
    inToY: routeBoxY,
    outX: peOutX,
    outFromY: routeBoxBottom,
    sideX: Math.max(pad + 6, peBoxX - 30),
    primaryBusY: laneTop - 16,
    primaryTargets: anchors.primary.map((a) => ({ x: centerX(a), y: a.y, id: a.id })),
    additionalBusY: additionalRow ? additionalRow.y - 20 : null,
    additionalTargets: anchors.additional.map((a) => ({ x: centerX(a), y: a.y, id: a.id })),
    cloudNativeBypass,
    inLabel: privatePeLabel,
    activeLabel: peSingleFailoverPair ? "single custom domain → active" : null,
    standbyLabel: peSingleFailoverPair ? "standby (manual failover)" : null,
  };

  return {
    empty: false,
    W,
    H,
    pad,
    roleW,
    laneTop,
    footerH,
    lanes,
    rows: rowLayout,
    cells,
    nodes,
    federation,
    distribution,
    access,
    route,
    peFan,
    titleText,
    productText,
    footerLeft,
    footerRight,
    footerStacked,
    footerMonitor: model.monitoringNote,
    footerLeftY,
    footerRightY,
    footerMonitorY,
  };
}

function buildArchitectureSvg(model) {
  const C = ARCH_COLORS;
  const layout = architectureLayout(model);
  const { W, H } = layout;

  const T = (x, y, value, options = {}) =>
    `<text x="${x}" y="${y}" fill="${options.fill || C.txt}" font-size="${options.size || 12}" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif"${options.weight ? ` font-weight="${options.weight}"` : ""}${options.anchor ? ` text-anchor="${options.anchor}"` : ""}>${esc(value)}</text>`;
  const RECT = (x, y, w, h, fill, stroke, rx = 8, dash = false) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="1"${dash ? ` stroke-dasharray="5 4"` : ""}/>`;

  if (layout.empty) {
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px;height:auto" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${W}" height="${H}" rx="10" fill="${C.bg}" stroke="${C.border}"/>
      <text x="${W / 2}" y="66" fill="${C.txt}" font-size="14" font-weight="600" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif">No region-specific deployments to draw</text>
      <text x="${W / 2}" y="92" fill="${C.muted}" font-size="11" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif">Assign a region to Primary, Additional, or Edge rows to include them.</text>
    </svg>`;
  }

  const pad = layout.pad;
  const background = [];
  const connectors = [];
  const nodes = [];

  background.push(RECT(0, 0, W, H, C.bg, C.border, 10));
  background.push(T(pad, 26, layout.titleText, { weight: 600, size: 14 }));
  background.push(T(pad, 44, layout.productText, { fill: C.muted, size: 11 }));

  background.push(`<defs>
    <marker id="geo-green" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="${C.accent}"/></marker>
    <marker id="geo-amber" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="${C.warn}"/></marker>
    <marker id="geo-net" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="${C.net}"/></marker>
    <marker id="geo-route" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="${C.route}"/></marker>
  </defs>`);

  // Client / network-access band: internal clients through DNS, LB, private endpoint.
  const acc = layout.access;
  background.push(T(pad, acc.labelY, "0 · CLIENT / NETWORK ACCESS", { fill: C.net, size: 10, weight: 600 }));
  const ICON_SIZE = 28;
  const ICON_PAD = 9;
  acc.nodes.forEach((node) => {
    const iconSvg = cloudIconSvgMarkup(acc.iconProvider, node.iconKind, node.x + ICON_PAD, node.y + (node.h - ICON_SIZE) / 2, ICON_SIZE);
    const textX = node.x + (iconSvg ? ICON_PAD + ICON_SIZE + 8 : 10);
    nodes.push(RECT(node.x, node.y, node.w, node.h, C.netFill, C.net, 6)
      + (iconSvg || "")
      + T(textX, node.y + 18, node.title, { weight: 600, size: 11 })
      + T(textX, node.y + 34, node.sub, { fill: C.muted, size: 9 }));
  });
  acc.connectors.forEach((c) => {
    connectors.push(`<line x1="${c.x1}" y1="${c.y1}" x2="${c.x2}" y2="${c.y2}" class="jfd-flow jfd-flow-net" stroke="${C.net}" stroke-width="1.4" marker-end="url(#geo-net)"/>`);
    if (c.label) {
      connectors.push(T((c.x1 + c.x2) / 2, c.y1 - 6, c.label, { fill: C.muted, size: 8, anchor: "middle" }));
    }
  });
  background.push(T(pad, acc.captionY, acc.caption, { fill: C.muted, size: 10 }));

  // JFrog-side DNS routing band: private endpoint feeds the router, which fans into the grid.
  const route = layout.route;
  background.push(T(pad, route.labelY, "PRIVATE ENDPOINT · JFROG-SIDE ROUTING", { fill: C.route, size: 10, weight: 600 }));
  connectors.push(`<path d="M ${route.inFromX} ${route.inFromY} C ${route.inFromX} ${(route.inFromY + route.inToY) / 2}, ${route.inToX} ${(route.inFromY + route.inToY) / 2}, ${route.inToX} ${route.inToY}" fill="none" class="jfd-flow jfd-flow-net" stroke="${C.net}" stroke-width="1.4" marker-end="url(#geo-net)"/>`);
  if (route.inLabel) {
    connectors.push(T(route.inFromX + 10, (route.inFromY + route.inToY) / 2, route.inLabel, { fill: C.muted, size: 9 }));
  }
  // Optional path: an on-prem client can skip the VPN + private-endpoint chain entirely
  // and reach the public routing URL directly over the internet.
  if (route.clientBypass) {
    const cb = route.clientBypass;
    connectors.push(`<path d="M ${cb.x} ${cb.fromY} C ${cb.x} ${(cb.fromY + cb.toY) / 2}, ${cb.x} ${(cb.fromY + cb.toY) / 2}, ${cb.x} ${cb.toY}" fill="none" class="jfd-flow jfd-flow-bypass" stroke="${C.muted}" stroke-width="1.2" marker-end="url(#geo-net)"/>`);
    connectors.push(T(cb.x + 8, (cb.fromY + cb.toY) / 2, cb.label, { fill: C.muted, size: 9 }));
  }
  nodes.push(RECT(route.x, route.y, route.w, route.h, C.routeFill, C.route, 6)
    + jfrogLogoSvgMarkup(route.x + 10, route.y + (route.h - 20) / 2, 20)
    + T(route.x + route.w / 2, route.y + 18, route.title, { weight: 600, size: 12, anchor: "middle" })
    + T(route.x + route.w / 2, route.y + 34, route.sub, { fill: C.muted, size: 10, anchor: "middle" }));
  const routeFlow = `class="jfd-flow jfd-flow-route" stroke="${C.route}" stroke-width="1.6" marker-end="url(#geo-route)"`;
  const routeBus = `class="jfd-flow jfd-flow-route" stroke="${C.route}" stroke-width="1.6"`;
  // Direct drop into every Primary (immediately below, no obstruction).
  route.primaryTargets.forEach((t) => {
    connectors.push(`<path d="M ${route.outX} ${route.outFromY} C ${route.outX} ${(route.outFromY + t.y) / 2}, ${t.x} ${(route.outFromY + t.y) / 2}, ${t.x} ${t.y}" fill="none" ${routeFlow}/>`);
  });
  // Additional instances sit a row lower — reach them via a side channel that routes
  // around the Primary row instead of drawing straight through it.
  if (route.additionalFan) {
    const fan = route.additionalFan;
    connectors.push(`<path d="M ${route.outX} ${route.outFromY} L ${fan.sideX} ${route.outFromY} L ${fan.sideX} ${fan.busY}" fill="none" ${routeBus}/>`);
    const fanXs = fan.targets.map((t) => t.x);
    connectors.push(`<line x1="${fan.sideX}" y1="${fan.busY}" x2="${Math.min(fan.sideX, ...fanXs)}" y2="${fan.busY}" ${routeBus}/>`);
    fan.targets.forEach((t) => {
      connectors.push(`<line x1="${t.x}" y1="${fan.busY}" x2="${t.x}" y2="${t.y}" ${routeFlow}/>`);
    });
  }

  // Private Endpoint(s): shares the routing band (short, direct fan-out) instead of
  // sitting up in the client chain — one dedicated connection per writable site, wired
  // directly, never through the public DNS-routing box right beside it.
  const pf = layout.peFan;
  if (pf) {
    connectors.push(`<path d="M ${pf.inFromX} ${pf.inFromY} C ${pf.inFromX} ${(pf.inFromY + pf.inToY) / 2}, ${pf.inToX} ${(pf.inFromY + pf.inToY) / 2}, ${pf.inToX} ${pf.inToY}" fill="none" class="jfd-flow jfd-flow-net" stroke="${C.net}" stroke-width="1.4" marker-end="url(#geo-net)"/>`);
    if (pf.inLabel) {
      connectors.push(T(pf.inFromX - 10, (pf.inFromY + pf.inToY) / 2, pf.inLabel, { fill: C.muted, size: 9, anchor: "end" }));
    }
    // Optional path: a cloud-native client/service already inside the same VPC/VNet as the
    // private endpoint needs neither the VPN nor the on-prem DNS bridge — it reaches the
    // endpoint directly (the cloud's own default resolver already answers the private zone).
    if (pf.cloudNativeBypass) {
      const cnb = pf.cloudNativeBypass;
      connectors.push(`<path d="M ${cnb.x} ${cnb.fromY} C ${cnb.x} ${(cnb.fromY + cnb.toY) / 2}, ${cnb.toX} ${(cnb.fromY + cnb.toY) / 2}, ${cnb.toX} ${cnb.toY}" fill="none" class="jfd-flow jfd-flow-bypass" stroke="${C.muted}" stroke-width="1.2" marker-end="url(#geo-net)"/>`);
      connectors.push(T(cnb.x - 8, (cnb.fromY + cnb.toY) / 2, cnb.label, { fill: C.muted, size: 9, anchor: "end" }));
    }
    const peIconSvg = cloudIconSvgMarkup(acc.iconProvider, "pe", pf.x + 10, pf.y + (pf.h - 24) / 2, 24);
    const peTextX = pf.x + (peIconSvg ? 42 : 10);
    nodes.push(RECT(pf.x, pf.y, pf.w, pf.h, C.netFill, C.net, 6)
      + (peIconSvg || "")
      + T(peTextX, pf.y + 18, pf.title, { weight: 600, size: 11 })
      + T(peTextX, pf.y + 34, pf.sub, { fill: C.muted, size: 9 }));
    const peDash = `class="jfd-flow jfd-flow-net" stroke="${C.net}" stroke-width="1.4"`;
    const peFlow = `${peDash} marker-end="url(#geo-net)"`;
    connectors.push(`<path d="M ${pf.outX} ${pf.outFromY} L ${pf.sideX} ${pf.outFromY} L ${pf.sideX} ${pf.primaryBusY}" fill="none" ${peDash}/>`);
    if (pf.primaryTargets.length) {
      const xs = pf.primaryTargets.map((t) => t.x);
      const busEndX = Math.max(pf.sideX, ...xs);
      connectors.push(`<line x1="${pf.sideX}" y1="${pf.primaryBusY}" x2="${busEndX}" y2="${pf.primaryBusY}" ${peDash}/>`);
      pf.primaryTargets.forEach((t) => {
        connectors.push(`<line x1="${t.x}" y1="${pf.primaryBusY}" x2="${t.x}" y2="${t.y}" ${peFlow}/>`);
      });
      if (pf.activeLabel) {
        connectors.push(T((pf.sideX + busEndX) / 2, pf.primaryBusY - 5, pf.activeLabel, { fill: C.net, size: 9, weight: 600, anchor: "middle" }));
      }
    }
    if (pf.additionalBusY != null && pf.additionalTargets.length) {
      connectors.push(`<line x1="${pf.sideX}" y1="${pf.primaryBusY}" x2="${pf.sideX}" y2="${pf.additionalBusY}" ${peDash}/>`);
      const xs2 = pf.additionalTargets.map((t) => t.x);
      const busEndX2 = Math.max(pf.sideX, ...xs2);
      connectors.push(`<line x1="${pf.sideX}" y1="${pf.additionalBusY}" x2="${busEndX2}" y2="${pf.additionalBusY}" ${peDash}/>`);
      pf.additionalTargets.forEach((t) => {
        connectors.push(`<line x1="${t.x}" y1="${pf.additionalBusY}" x2="${t.x}" y2="${t.y}" ${peFlow}/>`);
      });
      if (pf.standbyLabel) {
        connectors.push(T((pf.sideX + busEndX2) / 2, pf.additionalBusY - 5, pf.standbyLabel, { fill: C.muted, size: 9, anchor: "middle" }));
      }
    }
  }

  // Geography columns: west is always left, unknown/central is middle, east is right.
  layout.lanes.forEach((lane) => {
    background.push(RECT(lane.x, lane.y, lane.w, lane.h, C.lane, C.border, 8));
    background.push(T(lane.x + lane.w / 2, lane.y + 20, lane.label, { fill: C.muted, size: 10, weight: 600, anchor: "middle" }));
  });

  layout.rows.forEach((row) => {
    background.push(T(pad + layout.roleW - 10, row.y + 22, row.label, {
      fill: row.key === "edge" ? C.warn : row.key === "additional" ? C.info : C.accent,
      size: 10,
      weight: 600,
      anchor: "end",
    }));
  });

  layout.cells.forEach((cell) => {
    const stroke = cell.rowKey === "edge" ? C.warn : cell.rowKey === "additional" ? C.info : C.border;
    background.push(RECT(cell.x, cell.y, cell.w, cell.h, C.cell, stroke, 7, cell.rowKey === "edge"));
  });

  layout.nodes.forEach((node) => {
    const fill = node.rowKey === "primary" ? C.primary : node.rowKey === "edge" ? C.edge : C.additional;
    const stroke = node.rowKey === "primary" ? C.accent : node.rowKey === "edge" ? C.warn : C.info;
    nodes.push(RECT(node.x, node.y, node.w, node.h, fill, stroke, 6)
      + jfrogLogoSvgMarkup(node.x + node.w - 28, node.y + 8, 20)
      + T(node.x + 11, node.y + 19, node.title, { weight: 600, size: 12 })
      + T(node.x + 11, node.y + 36, node.sub, { fill: C.muted, size: 10 }));
  });

  const fed = layout.federation;
  if (fed) {
    const flow = `class="jfd-flow jfd-flow-fed" stroke="${C.accent}" stroke-width="1.4"`;
    connectors.push(`<line x1="${fed.sourceX}" y1="${fed.sourceBottom}" x2="${fed.sourceX}" y2="${fed.busY}" ${flow}/>`);
    connectors.push(`<line x1="${fed.minX}" y1="${fed.busY}" x2="${fed.maxX}" y2="${fed.busY}" ${flow}/>`);
    fed.targets.forEach((target) => {
      const x = target.x + target.w / 2;
      connectors.push(`<line x1="${x}" y1="${fed.busY}" x2="${x}" y2="${target.y}" ${flow} marker-end="url(#geo-green)"/>`);
    });
    connectors.push(T(fed.labelX, fed.busY - 5, fed.label, { fill: C.accent, size: 9, anchor: "middle" }));
  }

  const dist = layout.distribution;
  if (dist) {
    const flow = `class="jfd-flow jfd-flow-dist" stroke="${C.warn}" stroke-width="1.6"`;
    connectors.push(`<path d="M ${dist.sourceX} ${dist.sourceBottom} L ${dist.routeX} ${dist.sourceBottom} L ${dist.routeX} ${dist.busY}" fill="none" ${flow}/>`);
    connectors.push(`<line x1="${dist.minX}" y1="${dist.busY}" x2="${dist.maxX}" y2="${dist.busY}" ${flow}/>`);
    dist.targets.forEach((target) => {
      const x = target.x + target.w / 2;
      connectors.push(`<line x1="${x}" y1="${dist.busY}" x2="${x}" y2="${target.y}" ${flow} marker-end="url(#geo-amber)"/>`);
    });
    connectors.push(T(dist.labelX, dist.busY - 5, dist.label, { fill: C.warn, size: 9, weight: 600, anchor: "middle" }));
  }

  background.push(T(pad, layout.footerMonitorY, layout.footerMonitor, { fill: C.muted, size: 11 }));
  if (layout.footerStacked) {
    background.push(T(W - pad, layout.footerRightY, layout.footerRight, { fill: C.muted, size: 10, anchor: "end" }));
    background.push(T(pad, layout.footerLeftY, layout.footerLeft, { fill: C.muted, size: 11 }));
  } else {
    background.push(T(pad, layout.footerLeftY, layout.footerLeft, { fill: C.muted, size: 11 }));
    background.push(T(W - pad, layout.footerRightY, layout.footerRight, { fill: C.muted, size: 10, anchor: "end" }));
  }

  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px;height:auto" xmlns="http://www.w3.org/2000/svg">${ARCH_FLOW_STYLE}${background.join("")}${connectors.join("")}${nodes.join("")}</svg>`;
}

/* ---------- draw.io / Lucid export ---------- */

// Light palette: draw.io and Lucid both default to a white canvas.
const DRAWIO_COLORS = {
  txt: "#1b1e24",
  muted: "#5b6270",
  border: "#d8dbe2",
  lane: "#f6f7f9",
  accent: "#1f8f4d",
  info: "#1f6fb2",
  warn: "#a86400",
  net: "#6e3fc9",
  route: "#0f766e",
  primaryFill: "#e9f5ee",
  additionalFill: "#e8f1fa",
  edgeFill: "#fbf1e0",
  netFill: "#f1ebfd",
  routeFill: "#e3f7f5",
};

const DRAWIO_NODE_STYLE = {
  primary: `rounded=1;arcSize=10;whiteSpace=wrap;html=1;align=left;spacingLeft=12;verticalAlign=middle;fillColor=${DRAWIO_COLORS.primaryFill};strokeColor=${DRAWIO_COLORS.accent};fontColor=${DRAWIO_COLORS.txt};fontSize=12;`,
  additional: `rounded=1;arcSize=10;whiteSpace=wrap;html=1;align=left;spacingLeft=12;verticalAlign=middle;fillColor=${DRAWIO_COLORS.additionalFill};strokeColor=${DRAWIO_COLORS.info};fontColor=${DRAWIO_COLORS.txt};fontSize=12;`,
  edge: `rounded=1;arcSize=10;whiteSpace=wrap;html=1;align=left;spacingLeft=12;verticalAlign=middle;dashed=1;dashPattern=6 4;fillColor=${DRAWIO_COLORS.edgeFill};strokeColor=${DRAWIO_COLORS.warn};fontColor=${DRAWIO_COLORS.txt};fontSize=12;`,
  net: `rounded=1;arcSize=10;whiteSpace=wrap;html=1;align=left;spacingLeft=10;verticalAlign=middle;fillColor=${DRAWIO_COLORS.netFill};strokeColor=${DRAWIO_COLORS.net};fontColor=${DRAWIO_COLORS.txt};fontSize=11;`,
  route: `rounded=1;arcSize=10;whiteSpace=wrap;html=1;align=center;verticalAlign=middle;fillColor=${DRAWIO_COLORS.routeFill};strokeColor=${DRAWIO_COLORS.route};fontColor=${DRAWIO_COLORS.txt};fontSize=12;`,
};

/**
 * mxGraph XML for draw.io. Flow is drawn as real connected edges (not the SVG's
 * drawn buses) with flowAnimation=1, so shapes stay linked when the file is
 * opened in draw.io or imported into Lucidchart. Lucid keeps the shapes, links,
 * and styling but drops the animation — it has no flowAnimation equivalent.
 */
function buildArchitectureDrawio(model) {
  const C = DRAWIO_COLORS;
  const layout = architectureLayout(model);
  const round = (n) => Math.round(n * 10) / 10;
  const cells = [];
  let seq = 0;
  const nextId = () => `s${++seq}`;

  const vertex = (id, value, style, x, y, w, h) =>
    `<mxCell id="${id}" value="${esc(value)}" style="${esc(style)}" vertex="1" parent="1">`
    + `<mxGeometry x="${round(x)}" y="${round(y)}" width="${round(w)}" height="${round(h)}" as="geometry" /></mxCell>`;
  const label = (value, style, x, y, w, h) => vertex(nextId(), value, `text;html=1;whiteSpace=wrap;${style}`, x, y, w, h);
  const connect = (value, style, sourceId, targetId) =>
    `<mxCell id="${nextId()}" value="${esc(value)}" style="${esc(style)}" edge="1" parent="1" source="${sourceId}" target="${targetId}">`
    + `<mxGeometry relative="1" as="geometry" /></mxCell>`;

  if (layout.empty) {
    cells.push(label("No region-specific deployments to draw", `align=center;verticalAlign=middle;fontSize=14;fontStyle=1;fontColor=${C.txt};`, 40, 40, 560, 30));
    cells.push(label("Assign a region to Primary, Additional, or Edge rows to include them.", `align=center;verticalAlign=middle;fontSize=11;fontColor=${C.muted};`, 40, 74, 560, 24));
    return wrapDrawioFile(cells);
  }

  cells.push(label(layout.titleText, `align=left;verticalAlign=middle;fontSize=16;fontStyle=1;fontColor=${C.txt};`, layout.pad, 8, layout.W - layout.pad * 2, 26));
  cells.push(label(layout.productText, `align=left;verticalAlign=middle;fontSize=11;fontColor=${C.muted};`, layout.pad, 34, layout.W - layout.pad * 2, 20));

  // Client / network-access band: internal clients through DNS, LB, private endpoint.
  // Every connector below is a real source->target edge (never a bare source/target-less
  // point edge) — Lucid's draw.io importer rejects the whole file if it hits one of those.
  const acc = layout.access;
  const ICON_SIZE_DIO = 26;
  const ICON_PAD_DIO = 10;
  cells.push(label("0 · CLIENT / NETWORK ACCESS", `align=left;verticalAlign=middle;fontSize=10;fontStyle=1;fontColor=${C.net};`, layout.pad, acc.labelY - 12, 260, 18));
  acc.nodes.forEach((node) => {
    const iconStyle = acc.iconProvider && node.iconKind ? cloudIconDrawioStyle(acc.iconProvider, node.iconKind) : null;
    const value = `<b>${esc(node.title)}</b><br><font color="${C.muted}">${esc(node.sub)}</font>`;
    const boxStyle = iconStyle ? DRAWIO_NODE_STYLE.net.replace("spacingLeft=10", `spacingLeft=${ICON_PAD_DIO + ICON_SIZE_DIO + 8}`) : DRAWIO_NODE_STYLE.net;
    cells.push(vertex(node.id, value, boxStyle, node.x, node.y, node.w, node.h));
    if (iconStyle) {
      cells.push(vertex(nextId(), "", iconStyle, node.x + ICON_PAD_DIO, node.y + (node.h - ICON_SIZE_DIO) / 2, ICON_SIZE_DIO, ICON_SIZE_DIO));
    }
  });
  const netChainStyle = `html=1;endArrow=blockThin;endFill=1;strokeColor=${C.net};strokeWidth=1.4;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;fontSize=9;fontColor=${C.muted};labelBackgroundColor=#ffffff;`;
  for (let i = 0; i < acc.nodes.length - 1; i++) {
    cells.push(connect(acc.connectors[i]?.label || "", netChainStyle, acc.nodes[i].id, acc.nodes[i + 1].id));
  }
  cells.push(label(acc.caption, `align=left;verticalAlign=middle;fontSize=10;fontColor=${C.muted};`, layout.pad, acc.captionY - 12, layout.W - layout.pad * 2, 18));

  // JFrog-side DNS routing band: the Load Balancer feeds the public router (never the
  // Private Endpoint — see the layout comment on why those two paths stay separate).
  const route = layout.route;
  cells.push(label("PRIVATE ENDPOINT · JFROG-SIDE ROUTING", `align=left;verticalAlign=middle;fontSize=10;fontStyle=1;fontColor=${C.route};`, layout.pad, route.labelY - 12, 220, 18));
  const lbNode = acc.nodes.find((n) => n.iconKind === "lb") || acc.nodes[acc.nodes.length - 1];
  cells.push(connect(route.inLabel || "", `html=1;endArrow=blockThin;endFill=1;strokeColor=${C.net};strokeWidth=1.4;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;fontSize=9;fontColor=${C.muted};labelBackgroundColor=#ffffff;`, lbNode.id, route.id));
  if (route.clientBypass) {
    cells.push(connect("public: via JFrog DNS routing", `html=1;dashed=1;dashPattern=3 4;endArrow=blockThin;endFill=1;strokeColor=${C.muted};strokeWidth=1.2;fontColor=${C.muted};fontSize=9;edgeStyle=orthogonalEdgeStyle;exitX=0.5;exitY=1;entryX=0.15;entryY=0;`, acc.nodes[0].id, route.id));
  }
  cells.push(vertex(route.id, `<b>${esc(route.title)}</b><br><font color="${C.muted}">${esc(route.sub)}</font>`, DRAWIO_NODE_STYLE.route, route.x, route.y, route.w, route.h));
  cells.push(vertex(nextId(), "", jfrogLogoDrawioStyle(), route.x + 10, route.y + (route.h - 20) / 2, 20, 20));
  // Real source->target edge to every Primary and Additional site — never a bare
  // source/target-less point edge (see the earlier Lucid-import fix for why).
  // Pushed to `deferredFanoutEdges`, not `cells`, directly: these edges run down into the
  // lane containers below, and mxCell z-order is draw order, so if they were added here
  // (before the lanes) the lanes' opaque fill would paint straight over them, silently
  // hiding every fan-out arrow (and the labels on them) the moment it enters a lane.
  const deferredFanoutEdges = [];
  const routeEdgeStyle = `html=1;dashed=1;dashPattern=6 4;endArrow=blockThin;endFill=1;strokeColor=${C.route};strokeWidth=1.6;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;`;
  route.primaryTargets.forEach((t) => {
    deferredFanoutEdges.push(connect("", `${routeEdgeStyle}exitX=0.5;exitY=1;`, route.id, t.id));
  });
  if (route.additionalFan) {
    route.additionalFan.targets.forEach((t) => {
      deferredFanoutEdges.push(connect("", `${routeEdgeStyle}exitX=1;exitY=0.5;`, route.id, t.id));
    });
  }

  // Private Endpoint(s): shares this band with the routing box (short, direct fan-out)
  // instead of sitting up in the client chain — one dedicated connection per writable
  // site, wired directly, never through the routing box right beside it.
  const pf = layout.peFan;
  if (pf) {
    cells.push(connect(pf.inLabel || "", `html=1;endArrow=blockThin;endFill=1;strokeColor=${C.net};strokeWidth=1.4;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;fontSize=9;fontColor=${C.muted};labelBackgroundColor=#ffffff;`, lbNode.id, pf.id));
    if (pf.cloudNativeBypass) {
      cells.push(connect("cloud-native: same VPC, no VPN", `html=1;dashed=1;dashPattern=3 4;endArrow=blockThin;endFill=1;strokeColor=${C.muted};strokeWidth=1.2;fontColor=${C.muted};fontSize=9;edgeStyle=orthogonalEdgeStyle;exitX=0.5;exitY=1;entryX=0.85;entryY=0;`, acc.nodes[0].id, pf.id));
    }
    const peIconStyle = acc.iconProvider ? cloudIconDrawioStyle(acc.iconProvider, "pe") : null;
    const peValue = `<b>${esc(pf.title)}</b><br><font color="${C.muted}">${esc(pf.sub)}</font>`;
    const peBoxStyle = peIconStyle ? DRAWIO_NODE_STYLE.net.replace("spacingLeft=10", "spacingLeft=42") : DRAWIO_NODE_STYLE.net;
    cells.push(vertex(pf.id, peValue, peBoxStyle, pf.x, pf.y, pf.w, pf.h));
    if (peIconStyle) {
      cells.push(vertex(nextId(), "", peIconStyle, pf.x + 10, pf.y + (pf.h - 24) / 2, 24, 24));
    }
    const peEdgeStyle = `html=1;dashed=1;dashPattern=4 3;endArrow=blockThin;endFill=1;strokeColor=${C.net};strokeWidth=1.4;edgeStyle=orthogonalEdgeStyle;exitX=0;exitY=0.5;entryX=0.5;entryY=0;fontSize=9;fontStyle=1;fontColor=${C.net};labelBackgroundColor=#ffffff;`;
    pf.primaryTargets.forEach((t) => {
      deferredFanoutEdges.push(connect(pf.activeLabel || "", peEdgeStyle, pf.id, t.id));
    });
    const peEdgeStyleAdditional = peEdgeStyle.replace("entryX=0.5;entryY=0;", "entryX=1;entryY=0.5;")
      .replace(`fontStyle=1;fontColor=${C.net}`, `fontColor=${C.muted}`);
    pf.additionalTargets.forEach((t) => {
      deferredFanoutEdges.push(connect(pf.standbyLabel || "", peEdgeStyleAdditional, pf.id, t.id));
    });
  }

  layout.lanes.forEach((lane) => {
    cells.push(vertex(
      nextId(),
      lane.label,
      `rounded=1;arcSize=6;whiteSpace=wrap;html=1;verticalAlign=top;align=center;spacingTop=6;fillColor=${C.lane};strokeColor=${C.border};fontColor=${C.muted};fontSize=10;fontStyle=1;`,
      lane.x, lane.y, lane.w, lane.h,
    ));
  });

  layout.rows.forEach((row) => {
    const color = row.key === "edge" ? C.warn : row.key === "additional" ? C.info : C.accent;
    cells.push(label(row.label, `align=right;verticalAlign=middle;fontSize=10;fontStyle=1;fontColor=${color};`, layout.pad, row.y + 8, layout.roleW - 12, 20));
  });

  layout.cells.forEach((cell) => {
    const stroke = cell.rowKey === "edge" ? C.warn : cell.rowKey === "additional" ? C.info : C.border;
    cells.push(vertex(
      nextId(),
      "",
      `rounded=1;arcSize=6;whiteSpace=wrap;html=1;fillColor=none;strokeColor=${stroke};${cell.rowKey === "edge" ? "dashed=1;dashPattern=5 4;" : ""}`,
      cell.x, cell.y, cell.w, cell.h,
    ));
  });

  // Now that the (opaque) lane backgrounds are down, it's safe to draw the fan-out edges
  // that run into them — see the comment by deferredFanoutEdges above.
  cells.push(...deferredFanoutEdges);

  layout.nodes.forEach((node) => {
    const value = `<b>${esc(node.title)}</b><br><font color="${C.muted}">${esc(node.sub)}</font>`;
    cells.push(vertex(node.id, value, DRAWIO_NODE_STYLE[node.rowKey], node.x, node.y, node.w, node.h));
    cells.push(vertex(nextId(), "", jfrogLogoDrawioStyle(), node.x + node.w - 28, node.y + 8, 20, 20));
  });

  const fed = layout.federation;
  if (fed) {
    const style = `edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;flowAnimation=1;strokeColor=${C.accent};strokeWidth=2;endArrow=blockThin;endFill=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;fontSize=10;fontColor=${C.accent};labelBackgroundColor=#ffffff;`;
    fed.targets.forEach((target, index) => {
      cells.push(connect(index === 0 ? fed.label : "", style, fed.source.id, target.id));
    });
  }

  const dist = layout.distribution;
  if (dist) {
    const style = `edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;dashed=1;dashPattern=8 6;flowAnimation=1;strokeColor=${C.warn};strokeWidth=2;endArrow=blockThin;endFill=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;fontSize=10;fontColor=${C.warn};labelBackgroundColor=#ffffff;`;
    dist.targets.forEach((target, index) => {
      cells.push(connect(index === 0 ? dist.label : "", style, dist.source.id, target.id));
    });
  }

  const footerY = layout.H - (layout.footerStacked ? 62 : 46);
  cells.push(label(layout.footerMonitor, `align=left;verticalAlign=middle;fontSize=11;fontColor=${C.muted};`, layout.pad, footerY, layout.W - layout.pad * 2, 18));
  cells.push(label(layout.footerLeft, `align=left;verticalAlign=middle;fontSize=11;fontColor=${C.muted};`, layout.pad, footerY + 18, layout.W - layout.pad * 2, 20));
  cells.push(label(layout.footerRight, `align=left;verticalAlign=middle;fontSize=10;fontColor=${C.muted};`, layout.pad, footerY + 38, layout.W - layout.pad * 2, 18));

  const legend = [
    ["Primary JPD / JPS", C.accent, C.primaryFill],
    ["Additional Platform Instance", C.info, C.additionalFill],
    ["Edge (self-managed / Cloud)", C.warn, C.edgeFill],
    ["Client / network access (DNS, LB, Private Endpoint)", C.net, C.netFill],
    ["JFrog-side DNS routing", C.route, C.routeFill],
  ];
  legend.forEach(([text, stroke, fill], index) => {
    const x = layout.pad + index * 230;
    const y = layout.H + 12;
    cells.push(vertex(nextId(), "", `rounded=0;html=1;fillColor=${fill};strokeColor=${stroke};`, x, y, 14, 14));
    cells.push(label(text, `align=left;verticalAlign=middle;fontSize=10;fontColor=${C.muted};`, x + 20, y - 3, 200, 20));
  });

  return wrapDrawioFile(cells);
}

function wrapDrawioFile(cells) {
  // Match a genuine app.diagrams.net export byte-for-byte at the top: no XML prologue, and
  // an <mxfile host="app.diagrams.net" agent="..." version="..."> opening tag with nothing
  // else. Verified against real exports (e.g. github.com/OWASP/CheatSheetSeries assets/*.drawio) —
  // Lucid's importer sniffs the file's very first bytes to confirm it's a draw.io document
  // before it parses anything, so a leading `<?xml ...?>` declaration (which real draw.io
  // saves never include) or extra header attributes are enough to fail that check with
  // "the file does not appear to be a valid draw.io xml file", independent of whether the
  // graph model underneath is well-formed.
  return `<mxfile host="app.diagrams.net" agent="5.0 (Macintosh)" version="24.7.17">
  <diagram name="JFrog architecture" id="jfrog-architecture">
    <mxGraphModel dx="1400" dy="900" grid="0" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1169" pageHeight="826" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        ${cells.join("\n        ")}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
`;
}

function downloadTextFile(filename, contents, mime) {
  const blob = new Blob([contents], { type: mime });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/**
 * Rasterizes the diagram SVG to a flat PNG for tools with no draw.io/native-shape import path
 * (e.g. Lucid Spark, which only accepts CSV / PNG / PDF — not .drawio or .xml). The SVG already
 * carries an explicit viewBox and a solid background rect, so this only needs to size the canvas
 * to match and hand back a same-origin blob: URL, which keeps the canvas readable for export.
 */
function downloadSvgAsPng(svgMarkup, filename, scale = 2) {
  const fail = (reason, detail) => {
    // eslint-disable-next-line no-console
    console.error(`[jfrog-license-entitlements] PNG export failed: ${reason}`, detail || "");
    alert(`PNG export failed (${reason}) — download the .svg instead and convert it manually.\n\nIf you can, open the browser console (F12) and share the logged error — it'll say exactly why.`);
  };

  const viewBox = svgMarkup.match(/viewBox="0 0 ([\d.]+) ([\d.]+)/);
  const w = viewBox ? parseFloat(viewBox[1]) : 1200;
  const h = viewBox ? parseFloat(viewBox[2]) : 600;
  // Very wide/tall diagrams (many regions, long callout text) can exceed a browser's max
  // canvas dimension/area (notably tighter in Safari) — drop the multiplier rather than fail.
  const maxDim = 8000;
  const safeScale = (w * scale > maxDim || h * scale > maxDim) ? Math.max(1, Math.floor(maxDim / Math.max(w, h))) : scale;
  // The live SVG has width="100%" for responsive on-page display; replace (not prepend) it
  // with explicit pixel dimensions — adding a second width attribute would make the tag
  // invalid XML (duplicate attribute) and silently fail to decode as an <img>.
  const sized = svgMarkup.replace('width="100%"', `width="${w}" height="${h}"`);
  // index.html sets a strict Content-Security-Policy of img-src 'self' data: (intentionally,
  // to keep this a self-contained security-reviewed tool) — a blob: URL is NOT in that list,
  // so loading the SVG into an <img> via URL.createObjectURL is silently blocked by the
  // browser before img.onload/onerror even see real data. A data: URI is explicitly allowed,
  // so encode the SVG that way instead. The output PNG below still downloads via a blob: URL
  // on an <a download>, which is unaffected — that's a save-to-disk action, not an image
  // load, so img-src doesn't apply to it (the existing .svg/.xml downloads already prove this).
  let dataUrl;
  try {
    dataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(sized)))}`;
  } catch (e) {
    fail(`${e.name || "error"} encoding the SVG as a data URI`, e.message);
    return;
  }
  const img = new Image();
  img.onload = () => {
    let canvas;
    try {
      canvas = document.createElement("canvas");
      canvas.width = Math.round(w * safeScale);
      canvas.height = Math.round(h * safeScale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        fail("no 2D canvas context", { width: canvas.width, height: canvas.height });
        return;
      }
      ctx.scale(safeScale, safeScale);
      ctx.drawImage(img, 0, 0, w, h);
    } catch (e) {
      fail(`${e.name || "error"} while drawing to canvas`, e.message);
      return;
    }
    try {
      canvas.toBlob((blob) => {
        if (!blob) {
          fail("canvas.toBlob returned no data — the canvas is likely tainted by a browser privacy/security setting");
          return;
        }
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
      }, "image/png");
    } catch (e) {
      fail(`${e.name || "error"} calling canvas.toBlob`, e.message);
    }
  };
  img.onerror = (e) => {
    fail("the browser could not decode the diagram SVG as an image", e);
  };
  img.src = dataUrl;
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
  const diagramDrawio = buildArchitectureDrawio(result.diagramSites);
  window.__lastDiagramSvg = diagramSvg;
  window.__lastDiagramDrawio = diagramDrawio;
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
      <p class="muted" style="margin:0 0 8px">Geography grid: <strong>West ← Central → East → Other</strong>. Empty geography columns are hidden. On-Prem DC names and deployments with no region go to <strong>OTHER</strong> (not Central). The top overview band always shows on-prem CI/CD client connectivity (VPN, conditional DNS forwarder, resolver endpoint, load balancer) plus cloud-native and public bypass paths — regardless of whether the order includes an actual On-Prem JPS region — and Private Endpoint / JFrog-side DNS routing (manual failover / geo-location) in front of the writable-site grid; the footer calls out auth and monitoring for this configuration.</p>
      <div class="diagram-wrap">${diagramSvg}</div>
      <div class="diagram-legend">
        <span class="lg-net">Client / network access (VPN · DNS · LB · Private Endpoint)</span>
        <span class="lg-route">JFrog-side DNS routing (failover / geo)</span>
        <span class="lg-primary">Primary JPD</span>
        <span class="lg-additional">Additional Platform Instance</span>
        <span class="lg-edge">Edge (self-managed / Cloud)</span>
        <span class="lg-link">West · Central · East placement</span>
        <span class="lg-flow">Every arrow animates: federation (green) · distribution (amber) · client/network access (violet) · JFrog-side routing (teal) · optional bypasses (gray)</span>
      </div>
      <div class="btn-row">
        <button type="button" id="btnDownloadDiagram">Download diagram (.svg)</button>
        <button type="button" id="btnDownloadDrawio">Download for draw.io / Lucidchart (.xml)</button>
        <button type="button" id="btnDownloadPng">Download flat image for Lucid Spark (.png)</button>
        <button type="button" id="btnToggleDiagramAnimation" aria-pressed="false">Pause animation</button>
      </div>
      <p class="muted" style="margin:8px 0 0;font-size:11px">The .svg keeps its animation in any browser. The .xml file opens directly in <strong>draw.io</strong> (app.diagrams.net) as native, editable shapes. <strong>Lucidchart will reject it if uploaded directly</strong> — Lucid requires imported .xml/.drawio files to have actually been exported by the draw.io app, not just shaped like one, so open it in draw.io first, save/export from there, then import <em>that</em> file into Lucidchart (File → Import Diagram). <strong>Lucid Spark</strong> has no draw.io/native-shape import path at all (CSV, PNG, and PDF only) — use the .png download and insert it as a flat image there.</p>
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

  const diagramFileBase = () => `jfrog-architecture-${(input.customerName || "customer").replace(/\s+/g, "-").toLowerCase()}`;

  $("btnDownloadDiagram")?.addEventListener("click", () => {
    downloadTextFile(`${diagramFileBase()}.svg`, window.__lastDiagramSvg || diagramSvg, "image/svg+xml");
  });

  $("btnDownloadDrawio")?.addEventListener("click", () => {
    downloadTextFile(`${diagramFileBase()}.xml`, window.__lastDiagramDrawio || diagramDrawio, "application/xml;charset=utf-8");
  });

  $("btnDownloadPng")?.addEventListener("click", () => {
    downloadSvgAsPng(window.__lastDiagramSvg || diagramSvg, `${diagramFileBase()}.png`);
  });

  $("btnToggleDiagramAnimation")?.addEventListener("click", (event) => {
    const svg = out.querySelector(".diagram-wrap svg");
    if (!svg) return;
    const paused = svg.classList.toggle("jfd-paused");
    event.currentTarget.textContent = paused ? "Play animation" : "Pause animation";
    event.currentTarget.setAttribute("aria-pressed", String(paused));
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
.diagram-legend .lg-net::before{background:rgba(110,63,201,.15);border-color:#6e3fc9;}
.diagram-legend .lg-route::before{background:rgba(15,118,110,.15);border-color:#0f766e;}
.diagram-legend .lg-link::before{background:transparent;border-color:var(--accent);box-shadow:inset 0 0 0 1px var(--accent);}
.diagram-legend .lg-flow::before{background:linear-gradient(90deg,var(--accent) 0 40%,transparent 40% 60%,var(--warn) 60% 100%);border-color:transparent;border-radius:0;height:3px;width:18px;vertical-align:3px;}
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
