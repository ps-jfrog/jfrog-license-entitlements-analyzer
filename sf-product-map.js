/**
 * Salesforce product → entitlements analyzer map.
 * Sources: SF product-family browser (Cloud Subscription / Usage / Security)
 * plus real order lines seen in PS kickoffs (Cloud Enterprise+ SaaS vs Enterprise+ MP On-Prem, Edge, Curation, etc.).
 *
 * Deploy hint: product names with "Cloud" → SaaS; "Enterprise+ MP" / "Enterprise X MP" without Cloud → On-Prem.
 * window.JFROG_SF_PRODUCT_MAP
 */
(function () {
  /** @typedef {"saas"|"selfmanaged"|null} DeployHint */

  /**
   * Match rules are tested longest-name-first (see matchSfProduct).
   * action kinds:
   *  - platform: set platform + optional deployModel
   *  - addon: enable addon id (qty from line Qty unless qtyFrom=units)
   *  - seats: add to securitySeats (from # Units)
   *  - consumptionTb: add to SaaS TB meter (from # Units)
   *  - projects: Additional Projects → projectBuckets (units/100 rounded up, else Qty)
   *  - dedicated: flag dedicated SaaS
   *  - ignore: commercial / legacy / out of scope
   */
  const PRODUCTS = [
    // --- Platform ---
    // Naming: "Cloud …" = SaaS; "… Enterprise+ MP" / "… Enterprise X MP" without Cloud = On-Prem (self-managed).
    {
      name: "JFrog Cloud Enterprise+ - MP",
      aliases: ["JFrog Cloud Enterprise+", "Cloud Enterprise+ - MP", "Cloud Enterprise+", "Cloud Ent+ MP", "Cloud Ent+"],
      family: "order",
      action: { kind: "platform", platform: "entplus", deployModel: "saas", role: "primary" },
    },
    {
      name: "JFrog Cloud Enterprise X - MP",
      aliases: ["JFrog Cloud Enterprise X", "Cloud Enterprise X - MP", "Cloud Enterprise X", "Cloud Ent X MP", "Cloud Ent X"],
      family: "order",
      action: { kind: "platform", platform: "entx", deployModel: "saas", role: "primary" },
    },
    {
      name: "JFrog Enterprise+ - MP",
      aliases: ["JFrog Enterprise+ MP", "Enterprise+ - MP", "Enterprise+ MP", "Ent+ MP", "Ent+ - MP"],
      family: "order",
      action: { kind: "platform", platform: "entplus", deployModel: "selfmanaged", role: "primary" },
    },
    {
      name: "JFrog Enterprise X - MP",
      aliases: ["JFrog Enterprise X MP", "Enterprise X - MP", "Enterprise X MP", "Ent X MP", "Ent X - MP"],
      family: "order",
      action: { kind: "platform", platform: "entx", deployModel: "selfmanaged", role: "primary" },
    },
    {
      name: "JFrog Enterprise+",
      aliases: ["Enterprise +", "Enterprise+", "Ent+"],
      family: "order",
      action: { kind: "platform", platform: "entplus", deployModel: null, role: "primary" },
    },
    {
      name: "JFrog Enterprise X",
      aliases: ["Enterprise X", "Ent X"],
      family: "order",
      action: { kind: "platform", platform: "entx", deployModel: null, role: "primary" },
    },
    {
      name: "JFrog Pro X",
      aliases: ["Pro X"],
      family: "order",
      action: { kind: "platform", platform: "prox", deployModel: "selfmanaged", role: "primary" },
    },
    {
      name: "JFrog Pro",
      aliases: [],
      family: "catalog",
      action: { kind: "platform", platform: "pro", deployModel: "saas", role: "primary" },
    },

    // --- Topology / multi-site (order lines) ---
    {
      name: "Additional Platform Instance",
      aliases: ["Additional Platform Instances"],
      family: "order",
      action: { kind: "addon", id: "additionalInstances", role: "additional" },
    },
    {
      name: "Distribution Cloud Edge Nodes",
      aliases: ["Distribution Cloud Edge Node", "Cloud Edge Nodes", "Cloud Edge"],
      family: "order",
      action: { kind: "addon", id: "edge", edgeOps: "cloud", role: "edge" },
    },
    {
      name: "Artifactory Edge",
      aliases: ["Distribution Edge", "Edge Nodes", "Edge Node"],
      family: "order",
      action: { kind: "addon", id: "edge", edgeOps: "selfmanaged", role: "edge" },
    },
    {
      name: "Additional Artifactory servers",
      aliases: ["Additional Servers", "Additional Artifactory Server"],
      family: "order",
      action: { kind: "addon", id: "additionalServers" },
    },

    // --- Security (SF Security family + order variants) ---
    {
      name: "Ultimate Security Bundle - Cloud",
      aliases: ["Ultimate Security Bundle Cloud", "Ultimate Security - Cloud", "Ultimate Security Cloud"],
      family: "security",
      action: { kind: "addon", id: "ultimate", deployModel: "saas" },
    },
    {
      name: "Ultimate Security Bundle - SH",
      aliases: ["Ultimate Security Bundle SH", "Ultimate Security - SH", "Ultimate Security SH"],
      family: "security",
      action: { kind: "addon", id: "ultimate", deployModel: "selfmanaged" },
    },
    {
      name: "Unified Security Bundle - Cloud",
      aliases: ["Unified Security Bundle Cloud", "Unified Security - Cloud", "Unified Security Cloud"],
      family: "security",
      action: { kind: "addon", id: "unified", deployModel: "saas" },
    },
    {
      name: "Unified Security Bundle - SH",
      aliases: ["Unified Security Bundle SH", "Unified Security - SH", "Unified Security SH"],
      family: "security",
      action: { kind: "addon", id: "unified", deployModel: "selfmanaged" },
    },
    {
      name: "Ultimate Security",
      aliases: ["Ultimate Security Bundle"],
      family: "security",
      action: { kind: "addon", id: "ultimate" },
    },
    {
      name: "Unified Security",
      aliases: ["Unified Security Bundle"],
      family: "security",
      action: { kind: "addon", id: "unified" },
    },
    {
      name: "JFrog Curation Cloud - MP",
      aliases: ["JFrog Curation Cloud", "Curation Cloud - MP", "Curation Cloud"],
      family: "order",
      action: { kind: "addon", id: "curation", seatsFromUnits: true },
    },
    {
      name: "Additional Curation Users - Cloud",
      aliases: ["Additional Curation Users", "Additional Curation Users Cloud"],
      family: "order",
      action: { kind: "seats" },
    },
    {
      name: "Curation with AI Catalog - Cloud",
      aliases: ["Curation with AI Catalog Cloud"],
      family: "catalog",
      action: { kind: "addon", id: "curation", alsoEnable: ["catalog"], deployModel: "saas" },
    },
    {
      name: "Curation with AI Catalog - SH",
      aliases: ["Curation with AI Catalog SH"],
      family: "catalog",
      action: { kind: "addon", id: "curation", alsoEnable: ["catalog"], deployModel: "selfmanaged" },
    },
    {
      name: "JFrog Advanced Security",
      aliases: ["Advanced Security", "JAS", "JFrog Advanced Security - Cloud", "JFrog Advanced Security - SH"],
      family: "order",
      action: { kind: "addon", id: "jas", seatsFromUnits: true },
    },

    // --- Cloud Subscription catalog ---
    {
      name: "JFrog Runtime Impact - Cloud",
      aliases: ["JFrog Runtime Impact", "Runtime Impact - Cloud", "Runtime Impact"],
      family: "cloudSubscription",
      action: { kind: "addon", id: "runtimeImpact", deployModel: "saas" },
    },
    {
      name: "JFrog App Trust - Cloud",
      aliases: ["JFrog App Trust", "App Trust - Cloud", "AppTrust - Cloud", "AppTrust"],
      family: "cloudSubscription",
      action: { kind: "addon", id: "apptrust", deployModel: "saas" },
    },
    {
      name: "JFrog App Trust - SH",
      aliases: ["App Trust - SH", "AppTrust - SH"],
      family: "catalog",
      action: { kind: "addon", id: "apptrust", deployModel: "selfmanaged" },
    },
    {
      name: "JFrog AI Catalog - Cloud",
      aliases: ["JFrog AI Catalog", "AI Catalog - Cloud", "AI Catalog"],
      family: "cloudSubscription",
      action: { kind: "addon", id: "catalog", deployModel: "saas" },
    },
    {
      name: "JFrog AI Catalog - SH",
      aliases: ["AI Catalog - SH"],
      family: "catalog",
      action: { kind: "addon", id: "catalog", deployModel: "selfmanaged" },
    },
    {
      name: "JFrog Dedicated",
      aliases: ["JFrog Enterprise SaaS – Dedicated Server", "JFrog Enterprise SaaS - Dedicated Server", "Enterprise SaaS Dedicated Server"],
      family: "cloudSubscription",
      action: { kind: "dedicated" },
    },

    // --- Cloud Usage ---
    {
      name: "Base Data Consumption",
      aliases: ["Base Data"],
      family: "cloudUsage",
      action: { kind: "consumptionTb", source: "base" },
    },
    {
      name: "Additional Data Consumption",
      aliases: ["Additional Data"],
      family: "cloudUsage",
      action: { kind: "consumptionTb", source: "additional" },
    },
    {
      name: "Storage",
      aliases: [],
      family: "cloudUsage",
      action: { kind: "consumptionTb", source: "storage" },
    },
    {
      name: "Download",
      aliases: [],
      family: "cloudUsage",
      action: { kind: "ignore", reason: "Usage meter detail — folded into data consumption for entitlement math." },
    },
    {
      name: "Transfer",
      aliases: [],
      family: "cloudUsage",
      action: { kind: "ignore", reason: "Usage meter detail — folded into data consumption for entitlement math." },
    },
    {
      name: "Additional Projects",
      aliases: ["Projects License Bucket", "Project Buckets", "Projects bucket"],
      family: "cloudUsage",
      action: { kind: "projects" },
    },
    {
      name: "JFrog ML - Additional Credits - SH",
      aliases: ["JFrog ML Additional Credits - SH"],
      family: "cloudUsage",
      action: { kind: "addon", id: "mlCredits", qtyFrom: "units" },
    },
    {
      name: "JFrog ML - Additional Credits",
      aliases: ["JFrog ML Additional Credits", "ML Additional Credits"],
      family: "cloudUsage",
      action: { kind: "addon", id: "mlCredits", qtyFrom: "units" },
    },
    {
      name: "JFrog ML",
      aliases: ["JFrog ML - SH", "JFrog ML Credits"],
      family: "cloudUsage",
      action: { kind: "addon", id: "mlCredits", qtyFrom: "units" },
    },
    {
      name: "Smart Archiving Consumption",
      aliases: ["JFrog Smart Archiving - SM", "JFrog Smart Archiving Usage - SM", "Smart Archiving", "JFrog Smart Archiving"],
      family: "cloudUsage",
      action: { kind: "addon", id: "smartArchiving" },
    },
    {
      name: "JFrog Premium Availability",
      aliases: ["Premium Availability", "99.99% Premium Availability"],
      family: "cloudUsage",
      action: { kind: "addon", id: "premiumAvailability" },
    },

    // --- Ignore: commercial / legacy / out of scope ---
    {
      name: "Qwak - Cloud",
      aliases: ["Qwak - Hybrid", "Qwak - Prepaid", "JFrog Cloud Runtime", "Connect Additional Devices"],
      family: "cloudSubscription",
      action: { kind: "ignore", reason: "Qwak / Cloud Runtime — not modeled in this analyzer." },
    },
    {
      name: "DaaS - DevOps as a Service",
      aliases: ["DaaS"],
      family: "cloudSubscription",
      action: { kind: "ignore", reason: "Services line — not a platform entitlement." },
    },
    {
      name: "Bintray Enterprise",
      aliases: ["Bintray Professional Monthly", "Bintray Professional Prepaid"],
      family: "cloudSubscription",
      action: { kind: "ignore", reason: "Legacy Bintray." },
    },
    {
      name: "Past Due Balance - Unpaid Usage",
      aliases: ["Partner Commission", "Refund - Proration credit - Co-term", "Enterprise DevOps Assessment"],
      family: "adjustment",
      action: { kind: "ignore", reason: "Commercial / services — ignore for capability." },
    },
  ];

  function normalizeName(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[–—]/g, "-")
      .replace(/\s+/g, " ")
      .trim();
  }

  /** Build searchable entries (name + aliases), longest first. */
  function buildIndex() {
    const entries = [];
    PRODUCTS.forEach((product) => {
      const names = [product.name, ...(product.aliases || [])];
      names.forEach((name) => {
        const norm = normalizeName(name);
        if (!norm) return;
        entries.push({ norm, len: norm.length, product, matchedAs: name });
      });
    });
    entries.sort((a, b) => b.len - a.len);
    return entries;
  }

  const INDEX = buildIndex();

  function matchSfProduct(rawName) {
    const norm = normalizeName(rawName);
    if (!norm) return null;
    // Prefer exact match, then prefix/contains with longest name.
    for (const entry of INDEX) {
      if (norm === entry.norm) return entry;
    }
    for (const entry of INDEX) {
      if (norm.startsWith(entry.norm) || norm.includes(entry.norm)) return entry;
    }
    return null;
  }

  window.JFROG_SF_PRODUCT_MAP = {
    products: PRODUCTS,
    matchSfProduct,
    normalizeName,
  };
})();
