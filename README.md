# JFrog License Entitlements Analyzer

**Internal Professional Services tool** — open `index.html` in a browser (no build, no server).

> Not officially supported by JFrog. Contracts can negotiate custom entitlements. Always confirm with the account team / SFDC order before architecture, sizing, or SOW language.

```sh
open index.html
```

---

## Why this exists

Before any customer engagement (install, migration, security rollout, multi-site), PS needs a clear answer to:

1. **What platform tier** did they buy?
2. **How many** of each thing (servers, tenants, edges, project buckets)?
3. **Which add-on products** are on the order?
4. **How much SaaS consumption** (SaaSInstance / storage units)?
5. **How many security seats** (contributing developers)?

This page turns those order-form fields into a readable **licensed capability map** plus a **PS kickoff checklist**.

---

## Files

| File | Purpose |
|------|---------|
| [`index.html`](./index.html) | Standalone UI — order inputs + results |
| [`entitlements.js`](./entitlements.js) | License matrix, analyzer, render |
| [`sf-product-map.js`](./sf-product-map.js) | Salesforce product name → analyzer field map |
| [`license-data.js`](./license-data.js) | Generated browser dataset from official sources |
| [`data/license-data.json`](./data/license-data.json) | Generated machine-readable dataset + source hashes |
| [`scripts/refresh-license-data.mjs`](./scripts/refresh-license-data.mjs) | Fetch, parse, validate, and regenerate license data |
| [`common.css`](./common.css) | Shared styles (same family as `jfrog-sizing`) |
| [`PS-CHECKLIST.md`](./PS-CHECKLIST.md) | Full PS “what you must know” reference |

---

## Inputs (map from the order / SFDC)

| Field | Typical order meaning |
|-------|------------------------|
| **License type** | Pro · Pro X · Enterprise X · Enterprise + |
| **Deployment model** | SaaS · Self-managed · **Hybrid (both)** — Cloud Enterprise+ and Enterprise+ MP can appear on the same order |
| **Platform quantity** | SaaS: primary tenant packs · Self-managed: base packs (1 / 3 / 6 servers included per pack by tier) |
| **IaaS + regions** | AWS / Azure / GCP / On-Prem — place Primary / Additional Instance / Edge counts per region for the architecture diagram |
| **Additional products + qty** | Unified / Ultimate, Curation, JAS, Catalog, AppTrust, Runtime Impact, Additional Platform Instance, Edge, additional servers, ML credits, project buckets, Smart Archiving, 99.99% |
| **SaaSInstance units** | Storage / consumption units on the SaaS line (or total TB if unit size = 1000 GB) |
| **GB per unit** | Default `1000` (= 1 TB/unit) — change if the order defines another unit |
| **Security seats** | Contributing developers on AdvSec / Unified / Ultimate / Curation lines |
| **Order notes / SF paste** | Paste opportunity Product / Qty / # Units / Provider / Region lines → **Parse SF paste** |

### Salesforce paste

1. From the opportunity/quote, copy the product table (tab-separated works best).
2. Paste into **Order notes / Salesforce paste**.
3. Click **Analyze entitlements** (or **Parse SF paste**) — the form fills platform, Cloud/SH, add-ons, seats, consumption TB, IaaS, and region topology, then Analyze runs.
4. Results include a **Salesforce paste map** (matched / unmapped). Dollar amounts, refunds, commissions, and other commercial noise are skipped and never shown.

Mapped from the SF family browser you can see (Cloud Subscription / Usage / Security) plus real order SKUs. Platform naming:

| Order product | Deployment |
|---------------|------------|
| **JFrog Cloud Enterprise+** (often `… - MP`) | **SaaS** |
| **JFrog Enterprise+ MP** (no “Cloud”) | **On-Prem / self-managed** |
| Same pattern for Enterprise X | Cloud = SaaS · MP without Cloud = On-Prem |

Also mapped: `Additional Platform Instance`, `Distribution Cloud Edge Nodes`, `Base/Additional Data Consumption`, `JFrog Curation Cloud - MP`, `Additional Curation Users - Cloud`, Unified/Ultimate bundles, AI Catalog, App Trust, Runtime Impact, ML credits, Smart Archiving, Premium Availability, Dedicated.

**Multi-IaaS topology:** each region row has its own **Provider** (AWS / Azure / GCP / On-Prem DC) and **Site** (SaaS JPD vs On-Prem JPS). The top radio is only the default for new rows. Hybrid example: SaaS tenant on **GCP** + self-managed JPS on **Azure** — diagram title shows `GCP + Azure · Hybrid…` and each box is labeled with its provider.

Not in that SF browser view but still parsed when present on an order: Edge, Additional Platform Instance, On-Prem Enterprise+ MP, Curation seats. Extend aliases in `sf-product-map.js` when you hit an unmapped line.

---

## Outputs

- **Licensed baseline** + blockers / watches (wrong tier for an add-on, AppTrust without Ent+, region vs order mismatches, etc.)
- **Capacity cards:** sites/servers, projects, security seats, SaaS consumption, IaaS/topology
- **Architecture diagram (SVG)** — regions with Primary JPDs, Additional Platform Instances, Edges, federation / distribution links; downloadable
- **What they can use** vs **not licensed / needs purchase**
- **PS kickoff checklist** tailored to the config
- **Export JSON** / **Import JSON** for notes / handoff (import restores the form and re-runs Analyze)

**Load example** pre-fills a hybrid multi-cloud sketch: SaaS primary + additional on **GCP**, On-Prem JPS + Edges on **Azure**.

---

## Daily license-data refresh

The scheduled workflow `.github/workflows/refresh-license-data.yml` runs once daily at **07:17 UTC**. It:

1. Fetches official JFrog Pricing, product matrix, feature matrix, Projects, and Advanced Security pages.
2. Parses product activation plus numeric thresholds (projects, servers, SaaS base consumption, contributing developers, and the 90-day window).
3. Fails without replacing data if required assertions cannot be parsed.
4. Writes `data/license-data.json` and browser-ready `license-data.js`.
5. Commits only when generated data changes.

Run it locally:

```sh
npm run refresh
npm run check
```

`npm run check` syntax-checks the scripts, runs the Salesforce parser tests, and runs a headless DOM test (`scripts/test-ui.mjs`, via the `jsdom` devDependency) that exercises the region rows, multi-provider topology, and diagram output. The app itself still ships as plain HTML/CSS/JS with no runtime dependencies.

The page shows the dataset date, source links, all scraped feature rows for the selected self-managed tier, and source conflicts. Conflicts carry the tiers they apply to, so an Enterprise X discrepancy is not raised on an Enterprise+ analysis. Ambiguous claims are marked **Review required** and are not used to auto-enable products. The signed order/SFDC contract remains authoritative.

---

## Professional Services — details you should know

See **[PS-CHECKLIST.md](./PS-CHECKLIST.md)** for the full list. Critical distinctions:

| Topic | Rule of thumb |
|-------|----------------|
| **SaaS vs On-Prem SKU** | **Cloud Enterprise+** = SaaS. **Enterprise+ MP** (no Cloud) = On-Prem. Same for Ent X. **Both can be on one order (hybrid).** |
| **Site vs HA node** | One JPS (Router URL) = one Platform Site. HA replicas are nodes *inside* that site, not extra writable sites. |
| **Second writable JPS** | Needs its own deployment / subscription entitlements (US+EU, SaaS+on-prem hybrid, etc.). |
| **SaaS Pro → scanning** | Upgrade to **Enterprise X**, not Pro X. |
| **Security seats** | Contributor = developer whose artifacts were scanned by **Advanced Security in the last 90 days** — not named seats. |
| **SaaSInstance** | Usually feeds the **storage + transfer** consumption meter; overage is billed, not hard-blocked. |
| **Projects** | Pro/Pro X = **3** (hard). Ent X = **30**. Ent+ = **300** + buckets of **+100**. Quota is **subscription-wide**. |
| **Self-managed servers** | Pro X **1** · Ent X **3** · Ent+ **6** included; Edge is **separate**. |
| **Unified vs Ultimate** | Unified: Curation + JAS + Runtime base. Ultimate: + Catalog + AppTrust. Contributor base is refreshed from Pricing by platform (currently Ent X **50** / Ent+ **200**); the order overrides it. |
| **AppTrust** | Expect **Enterprise +** platform + **Ultimate** (or AppTrust SKU). |
| **Verify live** | `jf api` JAS / Curation / Router health — missing modules are often **license**, not config. |

---

## Suggested kickoff flow

1. Get order lines (or AE screenshot) → fill this tool  
2. Resolve blockers with AE/CSM  
3. Confirm topology against server/tenant math  
4. Validate entitlements on the live JPS  
5. Only then size (`jfrog-sizing`) and draft the SOW  

---

## Sources

- [JFrog Pricing & Security Bundles](https://jfrog.com/pricing/)
- [Projects subscription allocation](https://docs.jfrog.com/projects/docs/projects-subscription-allocation)
- [Self-managed feature comparison matrix](https://docs.jfrog.com/installation/docs/feature-comparison-matrix-for-self-mangaged-jpds)
- Sibling doc: `new-member-onboarding-labs` → Chapter 03 Licenses quick reference
