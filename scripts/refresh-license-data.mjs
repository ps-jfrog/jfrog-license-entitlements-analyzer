#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_JSON = resolve(ROOT, "data", "license-data.json");
const OUT_JS = resolve(ROOT, "license-data.js");

const SOURCES = {
  productMatrix: "https://docs.jfrog.com/installation/docs/license-matrix-pro-x-enterprise-x-enterprise",
  featureMatrix: "https://docs.jfrog.com/installation/docs/feature-comparison-matrix-for-self-mangaged-jpds",
  projects: "https://docs.jfrog.com/projects/docs/projects-subscription-allocation",
  advancedSecurity: "https://docs.jfrog.com/security/docs/advanced-security",
  pricing: "https://jfrog.com/pricing/",
};

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

async function fetchSource(name, url) {
  const response = await fetch(url, {
    headers: {
      Accept: "text/markdown,text/plain,text/html;q=0.8",
      "User-Agent": "jfrog-license-entitlements-refresh/1.0",
    },
    redirect: "follow",
  });
  if (!response.ok) {
    throw new Error(`${name}: HTTP ${response.status} from ${url}`);
  }
  const text = await response.text();
  if (text.length < 200) {
    throw new Error(`${name}: response was unexpectedly short (${text.length} bytes)`);
  }
  const updatedAt = text.match(/updatedAt:\s*([^\n\r]+)/i)?.[1]?.trim() || null;
  return {
    name,
    url,
    text,
    contentType: response.headers.get("content-type") || "",
    updatedAt,
    sha256: sha256(text),
  };
}

function markdownCells(line) {
  if (!line.trim().startsWith("|")) return [];
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) =>
    cell.trim().replace(/\*\*/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
  );
}

function isSeparator(cells) {
  return cells.length && cells.every((cell) => /^:?-{2,}:?$/.test(cell));
}

function state(raw) {
  const value = String(raw || "").trim();
  if (/not included/i.test(value) || value.includes("❌")) return "not_included";
  if (/included|built-in|all package types|single replication|support/i.test(value) || value.includes("✅")) return "included";
  if (/^\d+$/.test(value)) return "threshold";
  return "conditional";
}

function parseProductMatrix(markdown) {
  const rows = {};
  for (const line of markdown.split(/\r?\n/)) {
    const cells = markdownCells(line);
    if (cells.length !== 4 || isSeparator(cells) || /^product$/i.test(cells[0])) continue;
    if (!cells.slice(1).some((cell) => /included|✅|❌/i.test(cell))) continue;
    const key = cells[0].toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    rows[key] = {
      label: cells[0],
      prox: { state: state(cells[1]), raw: cells[1] },
      entx: { state: state(cells[2]), raw: cells[2] },
      entplus: { state: state(cells[3]), raw: cells[3] },
    };
  }
  if (Object.keys(rows).length < 10) {
    throw new Error(`productMatrix: expected at least 10 products, parsed ${Object.keys(rows).length}`);
  }
  return rows;
}

function parseSelfManagedFeatureMatrix(markdown) {
  const rows = {};
  for (const line of markdown.split(/\r?\n/)) {
    const cells = markdownCells(line);
    if (cells.length !== 5 || isSeparator(cells)) continue;
    if (/^(component|feature)$/i.test(cells[0])) continue;
    if (!cells.slice(1).some((cell) => /included|not included|✅|❌|\d+ projects|24\/7|high touch|single replication/i.test(cell))) continue;
    const key = cells[0].toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    // Duplicate labels across sections are equivalent; retain the latest row verbatim.
    rows[key] = {
      label: cells[0],
      nonCommercial: { state: state(cells[1]), raw: cells[1] },
      prox: { state: state(cells[2]), raw: cells[2] },
      entx: { state: state(cells[3]), raw: cells[3] },
      entplus: { state: state(cells[4]), raw: cells[4] },
    };
  }
  if (Object.keys(rows).length < 20) {
    throw new Error(`featureMatrix: expected at least 20 feature rows, parsed ${Object.keys(rows).length}`);
  }
  return rows;
}

function requiredNumber(text, regex, label) {
  const match = text.match(regex);
  if (!match) throw new Error(`Could not extract ${label}`);
  const number = Number(String(match[1]).replace(/,/g, ""));
  if (!Number.isFinite(number)) throw new Error(`Invalid number for ${label}: ${match[1]}`);
  return number;
}

function parseThresholds(source) {
  const projectsText = source.projects.text;
  const featureText = source.featureMatrix.text;
  const pricingText = source.pricing.text;
  const consumptionValues = [...pricingText.matchAll(/(\d+)\s*GB Base Consumption/gi)]
    .map((match) => Number(match[1]))
    .filter((value, index, values) => Number.isFinite(value) && values.indexOf(value) === index)
    .sort((a, b) => a - b);
  if (consumptionValues.length < 2) {
    throw new Error(`Expected at least two SaaS base consumption values, found ${consumptionValues.join(", ") || "none"}`);
  }

  const projects = {
    pro: requiredNumber(projectsText, /Pro\/X subscription[^]*?Up to\s+(\d+)\s+projects/i, "Pro/X projects"),
    prox: requiredNumber(projectsText, /Pro\/X subscription[^]*?Up to\s+(\d+)\s+projects/i, "Pro X projects"),
    entx: requiredNumber(projectsText, /Enterprise subscription[^]*?Up to\s+(\d+)\s+projects/i, "Enterprise X projects"),
    entplus: requiredNumber(projectsText, /Enterprise\+ subscription[^]*?total of\s+(\d+)\s+unique projects/i, "Enterprise+ projects"),
    bucketIncrement: requiredNumber(projectsText, /Each bucket supports an additional\s+(\d+)\s+projects/i, "project bucket increment"),
  };

  const serverRow = featureText.split(/\r?\n/).map(markdownCells)
    .find((cells) => cells.length === 5 && /^Artifactory servers$/i.test(cells[0]));
  if (!serverRow) throw new Error("Could not extract Artifactory server thresholds");

  const servers = {
    prox: Number(serverRow[2]),
    entx: Number(serverRow[3]),
    entplus: Number(serverRow[4]),
  };
  if (Object.values(servers).some((value) => !Number.isFinite(value))) {
    throw new Error(`Invalid Artifactory server thresholds: ${JSON.stringify(serverRow)}`);
  }

  return {
    projects,
    selfManagedArtifactoryServers: servers,
    saasBaseConsumptionGB: {
      pro: consumptionValues[0],
      entx: consumptionValues[1],
      entplus: null,
    },
    advancedSecurityBaseContributingDevelopers: {
      entx: requiredNumber(pricingText, /Enterprise X customers[^]*?entitled to\s+(\d+)\s+base contributing developers/i, "Enterprise X contributing developers"),
      entplus: requiredNumber(pricingText, /Enterprise\+ customers[^]*?entitled to\s+(\d+)\s+base contributing developers/i, "Enterprise+ contributing developers"),
    },
    contributingDeveloperWindowDays: requiredNumber(pricingText, /Advanced Security capabilities in the last\s+(\d+)\s+days/i, "contributing developer window"),
  };
}

function detectConflicts(productMatrix, sources) {
  const conflicts = [];
  const jas = productMatrix.jas;
  const advancedSecurityIsAddon = /Advanced Security Add-on[^]*?available with the Enterprise X or Enterprise\+/i
    .test(sources.advancedSecurity.text.replace(/\*/g, ""));
  if (jas?.entx?.state === "included" && advancedSecurityIsAddon) {
    conflicts.push({
      id: "jas-entx-included-vs-addon",
      severity: "review_required",
      tiers: ["entx"],
      message: "The Product License Matrix marks JAS included for Enterprise X, while the Advanced Security page calls it an add-on. Do not auto-enable JAS from the base tier; verify the order.",
      sources: ["productMatrix", "advancedSecurity"],
    });
  }
  return conflicts;
}

async function main() {
  const fetched = await Promise.all(
    Object.entries(SOURCES).map(([name, url]) => fetchSource(name, url))
  );
  const source = Object.fromEntries(fetched.map((item) => [item.name, item]));

  const productMatrix = parseProductMatrix(source.productMatrix.text);
  const selfManagedFeatureMatrix = parseSelfManagedFeatureMatrix(source.featureMatrix.text);
  const thresholds = parseThresholds(source);
  const conflicts = detectConflicts(productMatrix, source);

  const generatedAt = new Date().toISOString();
  const data = {
    schemaVersion: 1,
    generatedAt,
    status: conflicts.length ? "review_required" : "verified",
    sources: Object.fromEntries(fetched.map((item) => [item.name, {
      url: item.url,
      updatedAt: item.updatedAt,
      fetchedAt: generatedAt,
      sha256: item.sha256,
      contentType: item.contentType,
    }])),
    thresholds,
    productMatrix,
    selfManagedFeatureMatrix,
    conflicts,
    policy: {
      contractOverridesPublicPackaging: true,
      ambiguousFeaturesAreNotAutoEnabled: true,
      note: "Public documentation is advisory for PS discovery. The signed order/SFDC contract is authoritative.",
    },
  };

  await mkdir(dirname(OUT_JSON), { recursive: true });
  try {
    const existing = JSON.parse(await readFile(OUT_JSON, "utf8"));
    const comparable = (value) => {
      const copy = structuredClone(value);
      delete copy.generatedAt;
      Object.values(copy.sources || {}).forEach((sourceMeta) => {
        delete sourceMeta.fetchedAt;
      });
      return JSON.stringify(copy);
    };
    if (comparable(existing) === comparable(data)) {
      console.log(`Checked ${fetched.length} official sources; no published license data changed.`);
      console.log(`Status remains: ${existing.status}; dataset generated: ${existing.generatedAt}`);
      return;
    }
  } catch (error) {
    if (error?.code !== "ENOENT") {
      console.warn(`Existing dataset could not be compared and will be replaced: ${error.message}`);
    }
  }

  const json = `${JSON.stringify(data, null, 2)}\n`;
  const js = `/* Generated by scripts/refresh-license-data.mjs — do not edit manually. */\nwindow.JFROG_LICENSE_DATA = ${JSON.stringify(data, null, 2)};\n`;
  await Promise.all([
    writeFile(OUT_JSON, json),
    writeFile(OUT_JS, js),
  ]);

  console.log(`Refreshed ${Object.keys(productMatrix).length} products, ${Object.keys(selfManagedFeatureMatrix).length} feature rows.`);
  console.log(`Status: ${data.status}; conflicts: ${conflicts.length}; generated: ${generatedAt}`);
}

main().catch((error) => {
  console.error(`License data refresh failed: ${error.stack || error.message || error}`);
  process.exit(1);
});
