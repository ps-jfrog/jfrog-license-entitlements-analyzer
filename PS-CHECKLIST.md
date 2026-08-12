# PS checklist — what to know before any JFrog engagement

Use this with the [Entitlements Analyzer](./index.html). Fill the order fields first; use this list to interrogate gaps.

---

## 1. Commercial / entitlement discovery

Gather before architecture workshops:

- [ ] Platform SKU: **Pro / Pro X / Enterprise X / Enterprise +**
- [ ] **SaaS vs self-managed** (and hybrid: SaaS + self-managed JPDs)
  - SF SKU cue: **JFrog Cloud Enterprise+** = SaaS · **JFrog Enterprise+ MP** (no “Cloud”) = On-Prem. Same for Enterprise X.
  - A customer **can hold both** Cloud and On-Prem platform lines at once — count tenants and server licenses separately; do not merge them into one HA story.
- [ ] **Quantity** of platform packs / tenants
- [ ] Security bundle: **Unified**, **Ultimate**, or à-la-carte (Curation / JAS / Catalog / AppTrust)
- [ ] **Security seats** (contributing developers) and any overage terms
- [ ] **SaaSInstance** (or equivalent) storage/consumption units + unit size
- [ ] **Additional Artifactory servers**
- [ ] **Edge** licenses (Distribution Edge / Artifactory Edge) — separate from HA base
- [ ] **Projects License Buckets** (Ent+ only)
- [ ] Optional: Smart Archiving, Premium Availability 99.99%, Connect, Runtime Impact
- [ ] Contract end date / renewal window (affects upgrade conversations)
- [ ] Named TAL / CSM / AE contacts

**Do not start install/migration design until blockers from the analyzer are cleared.**

---

## 2. Topology math (most common PS mistakes)

| Concept | Meaning | License impact |
|---------|---------|----------------|
| **Platform Site (JPS)** | One Router URL, one Access identity plane | 1 SaaS tenant **or** 1 self-managed deployment per subscription (unless more purchased) |
| **Artifactory node** | HA replica sharing Postgres + filestore | 1 **server license** per node (self-managed) |
| **Writable second site** | Second JPS (e.g. EU prod) | Needs **additional** deployment entitlements — HA is not a second site |
| **Edge** | Read-only Distribution / Artifactory Edge | **Separate** Edge license |

Rules of thumb:

- Ent X self-managed base = **3** servers → typical **one** 3-node HA cluster  
- Ent+ self-managed base = **6** servers → one 6-node cluster **or** split across sites **per contract**  
- SaaS customers do **not** get discrete server licenses; HA is JFrog-operated on Ent X+

---

## 3. Platform tier → what you can promise

| Need | Minimum |
|------|---------|
| Repos, RBv2, CLI, basic CI | **Pro** (SaaS) |
| Xray SCA / build-scan / SBOM (self-managed) | **Pro X** |
| Xray SCA on SaaS | **Enterprise X** (not Pro X) |
| SSO (SAML/OIDC/SCIM), HA, federation, replication, Workers | **Enterprise X** |
| Access Federation, Distribution to Edge, third-party evidence, log streaming | **Enterprise +** |
| Curation / JAS / Runtime Integrity | **Unified** or **Ultimate** (on Ent X / Ent+) |
| AI Catalog / MCP / Skills governance | **Ultimate** (or Catalog $ on Unified) |
| AppTrust / Trusted Release | **Ultimate** + preferably **Enterprise +** |
| Runtime Impact | **$** add-on on Unified or Ultimate |

---

## 4. Capacity ceilings to design around

| Meter | Pro | Pro X | Ent X | Ent + |
|-------|-----|-------|-------|-------|
| Projects | 3 (hard) | 3 (hard) | 30 | 300 +100/bucket |
| SaaS base consumption | 25 GB | — | 125 GB | Custom / SaaSInstance |
| Servers included (SM) | — | 1 | 3 | 6 |
| Advanced Security contributing developers (public base) | — | — | 50* | 200* |

\* Refreshed from the public Pricing page. Prefer the **security seats** number on the order over public packaging — **order wins**.

**Contributing developer definition:** developer whose artifacts were scanned by Advanced Security in the **last 90 days**.

**SaaS consumption:** storage **+** data transfer in one meter; overage billed, **not** hard-blocked.

---

## 5. Pre-engagement technical validation

On the live (or staging) JPS after entitlements land:

```bash
# JAS modules reflect license — disabled ≠ missing UI toggle
jf api /xray/api/v1/configuration/jas | jq .

# Curation service
jf api /curation/api/v1/status 2>/dev/null || echo "Curation not entitled"

# AppTrust / unified policy
jf api /unifiedpolicy/api/v1/system/info 2>/dev/null || echo "AppTrust / Unified Policy not enabled"

# What is actually running
jf api /router/api/v1/system/health | jq -r '.services[]?.service_id' | sort -u
```

If the order says entitled but APIs show disabled → **CSM/AE ticket**, not a PS config rabbit hole.

---

## 6. Engagement-type implications

| Engagement | Entitlement gates |
|------------|-------------------|
| **Greenfield install** | Tier + server count + optional products drive Helm/VM topology |
| **Migration / transfer** | Target must match or exceed source entitlements (federation/replication need Ent X+) |
| **Security rollout** | Bundle + seats; measure contributor count early |
| **Curation** | Bundle; curated remotes; multi-JPD → waivers **do not federate** |
| **Multi-site / DR** | Ent+ for Access Federation / Distribution; second site licenses |
| **AppTrust / RLM** | Ent+ + Ultimate; version prerequisites |
| **AI / MCP / Skills** | Ultimate / Catalog entitlements |
| **Sizing** | Run `jfrog-sizing` **after** this analyzer — never size unlicensed products |

---

## 7. Questions to ask AE / customer in discovery

1. Exact SFDC product lines (SKU + qty + seats + SaaSInstance)?  
2. One region or multi-region / multi-JPD?  
3. SaaS, self-managed, or hybrid?  
4. Is HA required on day one? How many nodes planned vs licenses bought?  
5. Which security outcomes are in-scope (SCA only vs Curation vs JAS vs AppTrust)?  
6. Approximate contributing-developer population (90-day JAS definition)?  
7. Expected monthly SaaS consumption (storage + transfer)?  
8. Edge / air-gap / PrivateLink requirements?  
9. Who owns license true-up if seats or consumption exceed the order?

---

## 8. Handoff artifacts

- [ ] Analyzer **Export JSON** attached to engagement notes  
- [ ] Screenshot or paste of SFDC lines  
- [ ] Topology sketch: sites × nodes × edges  
- [ ] Open entitlement gaps with AE owner + date  
- [ ] Link to sizing output (if self-managed)

---

## Sources

- [JFrog Pricing](https://jfrog.com/pricing/)
- [Projects subscription allocation](https://docs.jfrog.com/projects/docs/projects-subscription-allocation)
- [Feature comparison matrix (self-managed)](https://docs.jfrog.com/installation/docs/feature-comparison-matrix-for-self-mangaged-jpds)
- [License matrix](https://docs.jfrog.com/installation/docs/license-matrix-pro-x-enterprise-x-enterprise)
- `new-member-onboarding-labs` Chapter 03 — Licenses quick reference
