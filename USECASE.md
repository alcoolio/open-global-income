# Use Case: Setting Up a Basic Income Program

Open Global Income is a **calculation and scoring layer**. It does not distribute money. It answers one question transparently: *how much should a basic income floor be for a given country, and how urgent is the need?*

Any actor — government, NGO, DAO — builds their distribution and identity layer on top. This document walks through what the alpha API (v0.0.5) can do today, using real data, and where the gaps are.

---

## Quick Setup

```bash
npm install
npm run dev
# Verify:
curl http://localhost:3333/health
# → { "status": "ok" }
```

The API is now running on `http://localhost:3333`.

---

## Scenario A: Government Ministry Exploring Basic Income (Kenya)

A ministry of social protection wants to understand what a basic income floor would look like for Kenya, grounded in international data.

### Step 1 — Check if Kenya is supported

```bash
curl http://localhost:3333/v1/income/countries
```

Find Kenya in the response:

```json
{
  "code": "KE",
  "name": "Kenya",
  "incomeGroup": "LMC",
  "hasGiniData": true
}
```

49 countries are supported across all four World Bank income groups. If a country is missing, it can be added by editing `src/data/worldbank/config.json` and running `npm run data:update`.

### Step 2 — Audit the formula

```bash
curl http://localhost:3333/v1/income/rulesets
```

```json
{
  "ok": true,
  "data": [
    {
      "version": "v1",
      "name": "Ruleset v1",
      "active": true,
      "formula": "pppUsdPerMonth = 210; localCurrency = 210 × pppFactor; score = clamp(incomeRatio + giniPenalty, 0, 1)",
      "parameters": {
        "globalIncomeFloorPpp": 210,
        "giniWeight": 0.15
      }
    }
  ]
}
```

The ministry can verify: the formula uses **GNI per capita** and **Gini index** from World Bank Open Data — both publicly available. The `rulesetVersion` and `dataVersion` fields in every response act as audit anchors. See [RULESET_V1.md](./RULESET_V1.md) for the full specification.

### Step 3 — Calculate the entitlement for Kenya

```bash
curl "http://localhost:3333/v1/income/calc?country=KE"
```

```json
{
  "ok": true,
  "data": {
    "countryCode": "KE",
    "pppUsdPerMonth": 210,
    "localCurrencyPerMonth": 10367.7,
    "score": 1,
    "meta": {
      "rulesetVersion": "v1",
      "dataVersion": "worldbank-2023"
    }
  }
}
```

**What this means for a policymaker:**

- The global floor of **210 PPP-USD/month** converts to roughly **10,368 KES/month** (~$80 USD at market rates) in Kenyan purchasing power.
- A **score of 1.0** means the global floor exceeds Kenya's average monthly GNI — maximum relative need. This is typical for LMC and LIC countries.
- The $210/month figure is derived from the World Bank upper-middle-income poverty line ($6.85/day in 2017 PPP). It is a **reference point**, not a policy recommendation — a ministry could adopt it directly, use it as a starting point, or scale it.

### Step 4 — Back-of-envelope budget

Kenya's population is 54.03 million (from the dataset). The API does not expose a budget calculation, but the math is straightforward:

```
10,368 KES/month × 12 months × 54,030,000 people ≈ 6.72 trillion KES/year
```

At market exchange rates (~130 KES/USD), that's roughly **$51.7 billion/year** for universal coverage — clearly illustrating why most programs target a subset of the population. A ministry would need to model coverage rates (e.g., bottom 20% only), age targeting, and phased rollout.

### Step 5 — What the API does NOT provide yet

| What a real program needs | Available today? | Notes |
|---------------------------|:---:|-------|
| Entitlement amount per person | Yes | 210 PPP-USD = ~10,368 KES/month |
| Formula transparency & auditability | Yes | `/rulesets` endpoint, open source |
| Country comparison | Manual | Must call `/calc` per country individually |
| Total budget estimate | No | Population is in the dataset but not in the API response |
| Coverage/targeting simulation | No | No sub-national, age, or income-bracket modeling |
| Funding source modeling | No | Out of scope for the calculation layer |
| Disbursement mechanism | No | Calculation only — no M-Pesa, bank, or blockchain integration |
| Identity / deduplication | No | User endpoint is an in-memory stub |
| Household size adjustment | No | Entitlement is per-person, flat |
| Historical trends / projections | No | Single data snapshot (worldbank-2023) |
| Market exchange rate conversion | No | Only PPP conversion is provided |

---

## Scenario B: NGO Comparing Countries for a Pilot

An NGO wants to pilot basic income in one of several low-income countries and needs data to justify the choice.

### Step 1 — Compare candidate countries

```bash
curl "http://localhost:3333/v1/income/calc?country=MZ"
curl "http://localhost:3333/v1/income/calc?country=BI"
curl "http://localhost:3333/v1/income/calc?country=ET"
```

| Country | Local currency/month | Score | GNI/capita | Gini | Population |
|---------|--------------------:|:-----:|-----------:|-----:|-----------:|
| Mozambique (MZ) | 5,565 MZN | 1.0 | $480 | 54.0 | 32.97M |
| Burundi (BI) | 155,610 BIF | 1.0 | $240 | 38.6 | 12.89M |
| Ethiopia (ET) | 3,631 ETB | 1.0 | $1,020 | 35.0 | 123.4M |

All three score 1.0 (maximum need). The score alone doesn't differentiate between LIC countries — the useful comparison is on **local currency amounts** (cost per person) and **population** (total program cost). Mozambique's high Gini (54.0) might also factor into the NGO's decision as an indicator of inequality.

**Observation:** The current scoring model saturates at 1.0 for most LMC/LIC countries. A future version could provide finer granularity within the high-need tier.

### Step 2 — Model a pilot cohort

```bash
# Register a test user
curl -X POST http://localhost:3333/v1/users \
  -H "Content-Type: application/json" \
  -d '{"country_code": "MZ"}'
# → { "ok": true, "data": { "id": "...", "countryCode": "MZ", "createdAt": "..." } }

# Get their entitlement
curl http://localhost:3333/v1/users/{id}/income
```

**Limitation:** The user store is in-memory — all data is lost on server restart. This is a placeholder for a future persistent layer. An NGO running a real pilot would need:
- Persistent database (PostgreSQL, etc.)
- KYC / identity verification
- Enrollment workflows

### Step 3 — What's missing for NGOs

- **Batch endpoint** — comparing countries requires one call per country
- **CSV/spreadsheet export** — for reports and grant proposals
- **Sub-national data** — districts and provinces vary widely
- **Disbursement integration** — M-Pesa, bank transfer, etc.
- **Donor reporting** — audit trail beyond version fields

---

## Scenario C: DAO Distributing Funds On-Chain

A ReFi DAO wants to distribute USDC to participants based on Open Global Income scores.

### Step 1 — Calculate entitlement

Same API call: `GET /v1/income/calc?country=NG` → 210 PPP-USD/month, score 1.0.

### Step 2 — Map to token amount

The project defines a `ChainAdapter` interface in `src/adapters/`, but no concrete adapter implementation exists yet. A DAO would currently need to:

1. Call the API for the entitlement
2. Apply their own exchange rate (e.g., PPP-USD → USDC)
3. Build on-chain transactions separately

### Step 3 — What's missing for DAOs

- **Solana adapter** — type definitions are planned but no implementation exists yet
- **API endpoint for token mapping** — adapters would be libraries, not API endpoints
- **Wallet-based identity** — user model uses UUIDs, not wallet addresses
- **Oracle integration** — no live exchange rates
- **On-chain program** — no smart contract for storing entitlements or triggering distributions

---

## Summary

### What works today (alpha v0.0.5)

- Transparent, auditable entitlement calculation for **49 countries**
- PPP-adjusted amounts in **local currency**
- Need-based **score (0–1)** incorporating inequality via Gini index
- **Versioned results** (ruleset + data) for reproducibility
- Full formula transparency via `/rulesets` endpoint
- Configurable data pipeline with World Bank source

### What's needed for real-world use

Listed roughly by priority (unblocks the most scenarios first):

1. **Budget simulation endpoint** — `GET /v1/income/simulate?country=KE&coverage=0.2` returning total cost, per-person amount, and population covered
2. **Batch/comparison endpoint** — `GET /v1/income/calc?countries=KE,MZ,BI` to compare multiple countries in one call
3. **Population and budget in calc response** — expose population and annual cost estimate alongside the entitlement
4. **Persistent user store** — replace in-memory store with a real database
5. **Sub-national data** — regional income and cost-of-living differences within a country
6. **Market exchange rate conversion** — in addition to PPP conversion
7. **Time series / projections** — historical data snapshots for trend analysis
8. **Export formats** — CSV, PDF for policymakers and donors
9. **Chain adapters** — Solana, Ethereum implementations with token mapping
10. **Identity layer** — wallet-based or national ID integration
11. **Disbursement adapters** — M-Pesa, bank transfer, stablecoin rails

---

See [CONTRIBUTING.md](./CONTRIBUTING.md) to help close these gaps.
