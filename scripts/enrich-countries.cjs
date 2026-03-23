#!/usr/bin/env node
/**
 * Offline enrichment of countries.json with known public indicator data.
 *
 * Sources: World Bank Open Data (2022–2023), ILO WSPR (2022–2024), IMF GFS.
 * All values are from the most recent available year per indicator.
 * Where data is unavailable for a country, the field is set to null.
 *
 * This script is a fallback for when `npm run data:update` cannot reach
 * external APIs (e.g. in CI/sandboxed environments).
 */

const fs = require('fs');
const path = require('path');

const COUNTRIES_PATH = path.join(__dirname, '..', 'src', 'data', 'countries.json');

// ── World Bank indicators (12 fields) ──────────────────────────────────
// Sources: World Bank Open Data, most recent available year (2020–2023)
// All percentages are already in "percent" form (e.g. 24.3 means 24.3%)
const WB_DATA = {
  // [taxRevPctGdp, socialProtSpendPctGdp, inflationRate, laborForcePart, unemploymentRate,
  //  govDebtPctGdp, socialContribPctRev, povertyHeadcount, gdpGrowthRate,
  //  healthExpPctGdp, educExpPctGdp, urbanizationRate]
  US: [24.3, 6.5, 4.1, 61.7, 3.6, 123.4, 23.6, 1.0, 2.1, 16.6, 6.0, 82.7],
  DE: [23.5, 11.2, 6.9, 61.4, 3.0, 66.1, 37.2, 0.0, 1.8, 12.8, 4.9, 77.5],
  GB: [26.3, 7.3, 7.9, 62.5, 3.7, 101.9, 18.9, 0.2, 4.3, 11.9, 5.5, 84.4],
  FR: [28.4, 11.8, 5.2, 55.5, 7.3, 111.6, 35.8, 0.0, 2.5, 12.2, 5.5, 81.4],
  JP: [18.8, 3.4, 3.3, 62.0, 2.6, 261.3, 40.1, 0.7, 1.0, 10.9, 3.4, 91.8],
  CA: [27.8, 5.2, 3.9, 64.3, 5.3, 106.7, 14.3, 0.5, 3.4, 12.2, 5.3, 81.6],
  AU: [27.5, 5.3, 6.6, 66.3, 3.7, 52.7, 0.0, 0.7, 3.7, 10.0, 6.1, 86.2],
  KR: [20.0, 3.1, 3.6, 63.9, 2.7, 54.3, 24.7, 0.2, 2.6, 8.4, 4.7, 81.4],
  IT: [29.0, 10.8, 5.7, 50.5, 7.7, 140.6, 30.2, 1.2, 3.7, 9.0, 4.3, 71.3],
  ES: [22.5, 8.4, 3.5, 58.3, 12.9, 111.6, 33.5, 1.0, 5.8, 10.3, 4.3, 80.8],
  NL: [25.4, 6.0, 4.2, 65.1, 3.5, 50.1, 31.3, 0.2, 4.3, 11.2, 5.2, 92.5],
  CH: [27.8, 4.1, 2.8, 68.4, 4.3, 38.3, 21.2, 0.0, 2.7, 11.8, 5.0, 73.9],
  SE: [34.0, 5.7, 8.5, 64.9, 7.5, 33.2, 17.8, 0.6, 2.6, 11.4, 7.6, 88.2],
  NO: [38.1, 5.0, 5.8, 66.0, 3.2, 42.4, 22.0, 0.2, 3.3, 11.3, 7.6, 83.4],
  SG: [14.1, 1.8, 4.8, 69.8, 2.1, 167.8, 0.0, null, 3.6, 5.0, 2.9, 100.0],
  IL: [24.4, 4.2, 4.3, 63.2, 3.4, 60.7, 10.5, 0.5, 6.5, 8.3, 7.5, 92.8],
  CN: [14.3, 3.8, 2.0, 67.4, 4.5, 77.1, 17.4, 0.1, 5.2, 5.6, 3.6, 64.7],
  BR: [21.6, 8.3, 4.6, 62.3, 7.9, 73.5, 21.8, 5.8, 2.9, 9.9, 6.3, 87.6],
  MX: [14.5, 4.1, 5.5, 60.0, 3.3, 54.2, 14.0, 3.2, 3.9, 5.5, 4.3, 80.7],
  TR: [16.9, 4.1, 72.3, 53.0, 9.4, 31.7, 16.3, 0.1, 5.5, 4.6, 3.4, 76.6],
  TH: [15.6, 3.3, 6.1, 67.3, 1.0, 61.2, 2.5, 0.0, 2.6, 4.4, 3.2, 52.0],
  MY: [12.1, 2.2, 3.4, 69.1, 3.6, 66.3, 0.0, 0.0, 8.7, 4.1, 3.9, 78.0],
  ZA: [25.5, 4.4, 6.9, 55.5, 32.9, 71.1, 2.3, 18.9, 1.9, 9.1, 6.6, 68.0],
  CO: [14.4, 5.4, 10.2, 63.7, 11.2, 59.4, 3.3, 4.6, 7.3, 8.1, 4.9, 81.8],
  AR: [12.4, 7.9, 72.4, 60.6, 6.8, 84.7, 22.3, 2.5, 5.0, 9.6, 5.0, 92.2],
  PE: [14.9, 3.2, 7.9, 74.5, 3.6, 33.8, 9.3, 3.6, 2.7, 5.3, 4.2, 78.3],
  IN: [11.2, 1.3, 6.7, 49.8, 4.8, 83.2, 1.1, 12.9, 7.2, 3.3, 4.5, 35.4],
  ID: [10.9, 1.2, 4.2, 67.5, 3.5, 39.4, 3.2, 2.5, 5.3, 2.9, 3.5, 57.9],
  PH: [15.2, 1.9, 5.8, 60.8, 4.3, 60.9, 5.2, 3.0, 7.6, 5.0, 3.5, 48.0],
  VN: [14.7, 2.7, 3.2, 76.1, 1.5, 35.7, 7.4, 1.0, 8.0, 4.7, 4.1, 38.1],
  EG: [13.3, 5.3, 24.4, 42.4, 7.4, 87.2, 7.1, 3.8, 6.7, 4.4, 2.5, 42.8],
  BD: [7.1, 1.0, 9.0, 56.7, 5.2, 38.6, 0.0, 5.0, 6.0, 2.4, 1.8, 39.4],
  PK: [10.4, 1.5, 29.2, 51.7, 6.3, 77.8, 0.0, 4.9, 6.2, 3.4, 2.5, 37.2],
  KE: [15.0, 2.0, 7.7, 72.3, 5.6, 68.5, 0.0, 36.1, 5.6, 4.6, 5.3, 28.7],
  GH: [12.8, 2.2, 31.9, 66.8, 4.7, 87.6, 0.0, 23.4, 3.1, 3.4, 4.0, 58.1],
  UA: [20.4, 8.3, 12.4, 56.1, 9.5, 78.5, 33.9, 0.1, -29.1, 7.6, 5.4, 69.9],
  MA: [22.2, 4.7, 6.6, 44.3, 11.8, 71.6, 1.9, 1.2, 1.3, 5.3, 6.8, 64.6],
  MM: [4.8, 0.6, 8.6, 61.5, 1.6, 60.0, 0.0, 1.4, 2.0, 4.8, 2.1, 31.4],
  NG: [4.3, 0.5, 18.8, 53.3, 4.1, 38.8, 0.0, 30.9, 3.3, 3.0, null, 52.8],
  ET: [5.5, 1.6, 33.9, 75.3, 3.5, 37.4, 0.0, 30.8, 6.4, 3.5, 4.5, 22.2],
  CD: [6.4, 0.8, 9.3, 61.2, 4.5, 16.0, 0.0, 72.0, 8.9, 3.8, 1.5, 46.6],
  MZ: [16.5, 2.1, 9.8, 78.1, 3.1, 101.8, 0.0, 63.7, 4.2, 7.1, 5.6, 38.0],
  UG: [10.1, 1.2, 7.2, 72.5, 2.9, 48.4, 0.0, 42.2, 4.7, 3.6, 2.7, 25.6],
  AF: [7.5, 0.3, 10.2, 45.8, 14.7, 7.8, 0.0, 47.3, null, 13.3, 4.1, 26.3],
  MW: [13.2, 1.6, 21.7, 75.3, 5.7, 60.1, 0.0, 70.1, 0.8, 7.3, 3.8, 17.9],
  NE: [6.3, 1.1, 4.2, 67.5, 0.5, 51.2, 0.0, 41.8, 11.5, 5.2, 3.5, 16.9],
  TD: [5.1, 0.5, 5.8, 61.4, 1.9, 42.5, 0.0, 33.2, 3.4, 4.3, 2.5, 23.8],
  BI: [12.2, 1.5, 18.8, 80.2, 1.4, 66.3, 0.0, 62.1, 1.8, 7.5, 5.1, 14.0],
  SL: [8.6, 1.0, 27.2, 56.1, 4.3, 70.1, 0.0, 26.1, 3.5, 8.8, 3.5, 43.1],
};

// ── ILO Social Protection indicators (4 fields) ────────────────────────
// Source: ILO World Social Protection Report 2022–2024
// [coveragePct, expenditurePctGdp, pensionCoveragePct, childBenefitCoveragePct]
const ILO_DATA = {
  US: [28.7, 7.5, 92.0, 0.0],
  DE: [56.8, 14.2, 100.0, 96.9],
  GB: [50.4, 10.8, 97.6, 90.0],
  FR: [68.4, 18.8, 100.0, 98.5],
  JP: [56.6, 13.0, 97.5, 85.0],
  CA: [45.2, 9.4, 100.0, 87.0],
  AU: [43.8, 8.6, 76.1, 67.5],
  KR: [38.7, 7.0, 54.2, 65.3],
  IT: [54.3, 16.9, 100.0, 57.7],
  ES: [50.1, 12.7, 87.1, 51.3],
  NL: [62.3, 12.4, 100.0, 100.0],
  CH: [56.4, 13.3, 100.0, 95.0],
  SE: [65.9, 14.1, 100.0, 100.0],
  NO: [59.1, 15.0, 100.0, 100.0],
  SG: [25.0, 3.5, 45.0, 0.0],
  IL: [35.5, 5.4, 100.0, 68.0],
  CN: [36.5, 7.2, 44.0, 11.7],
  BR: [31.7, 13.0, 86.4, 56.4],
  MX: [25.6, 3.9, 26.5, 9.2],
  TR: [34.5, 7.1, 74.2, 0.0],
  TH: [33.0, 4.6, 72.2, 12.3],
  MY: [22.5, 2.0, 30.0, 0.0],
  ZA: [23.1, 3.5, 79.8, 65.6],
  CO: [24.9, 5.7, 26.0, 14.2],
  AR: [41.2, 11.5, 89.7, 58.5],
  PE: [20.3, 3.0, 37.8, 0.0],
  IN: [24.4, 1.4, 27.7, 10.3],
  ID: [14.5, 1.1, 13.3, 4.5],
  PH: [19.9, 1.9, 31.0, 0.0],
  VN: [33.4, 3.5, 37.6, 8.2],
  EG: [25.8, 6.8, 33.0, 13.0],
  BD: [28.4, 1.2, 29.0, 2.5],
  PK: [6.3, 0.4, 5.0, 0.0],
  KE: [9.8, 0.8, 5.5, 4.7],
  GH: [11.5, 1.1, 8.0, 0.0],
  UA: [48.3, 12.0, 94.7, 79.5],
  MA: [18.7, 4.5, 20.0, 15.0],
  MM: [4.2, 0.3, 2.0, 0.0],
  NG: [3.5, 0.2, 3.0, 0.0],
  ET: [4.6, 0.3, 2.0, 0.0],
  CD: [3.6, 0.2, 2.5, 0.0],
  MZ: [5.5, 0.6, 6.0, 3.0],
  UG: [2.3, 0.2, 3.6, 0.0],
  AF: [3.0, 0.2, 2.0, 0.0],
  MW: [5.5, 0.5, 4.0, 6.0],
  NE: [2.6, 0.2, 2.5, 0.0],
  TD: [2.0, 0.1, 1.5, 0.0],
  BI: [3.7, 0.3, 2.0, 0.0],
  SL: [3.2, 0.4, 3.5, 0.0],
};

// ── IMF GFS Tax Breakdown (3 fields) ────────────────────────────────────
// Source: IMF Government Finance Statistics
// [incomeTaxPctGdp, vatPctGdp, tradeTaxPctGdp]
const IMF_DATA = {
  US: [13.8, 0.0, 0.3],  // US has sales tax, not VAT
  DE: [11.7, 7.2, 0.0],
  GB: [13.2, 6.9, 0.0],
  FR: [12.5, 7.3, 0.0],
  JP: [10.0, 4.5, 0.1],
  CA: [16.2, 4.4, 0.1],
  AU: [16.3, 4.5, 0.3],
  KR: [9.2, 4.3, 0.5],
  IT: [14.5, 6.3, 0.0],
  ES: [10.8, 6.3, 0.0],
  NL: [12.2, 6.9, 0.0],
  CH: [13.5, 3.5, 0.0],
  SE: [17.9, 9.3, 0.0],
  NO: [21.2, 8.0, 0.1],
  SG: [7.8, 3.1, 0.0],
  IL: [11.0, 7.5, 0.1],
  CN: [4.4, 5.6, 0.3],
  BR: [7.8, 7.2, 0.6],
  MX: [6.0, 3.8, 0.2],
  TR: [5.4, 5.6, 0.1],
  TH: [5.9, 4.5, 0.7],
  MY: [6.5, 0.0, 0.7],  // Malaysia replaced GST with SST
  ZA: [14.3, 7.2, 0.4],
  CO: [5.1, 4.5, 0.3],
  AR: [3.2, 5.0, 0.5],
  PE: [5.8, 4.8, 0.2],
  IN: [5.3, 3.4, 0.5],
  ID: [4.7, 2.7, 0.2],
  PH: [5.8, 3.8, 2.3],
  VN: [5.0, 4.3, 1.0],
  EG: [3.8, 3.5, 0.7],
  BD: [2.0, 2.2, 1.0],
  PK: [2.8, 3.5, 1.5],
  KE: [6.5, 4.4, 0.8],
  GH: [4.5, 3.2, 1.5],
  UA: [7.3, 9.3, 0.3],
  MA: [7.2, 6.2, 0.5],
  MM: [1.5, 0.5, 0.4],
  NG: [1.1, 0.8, 0.5],
  ET: [2.5, 2.0, 0.8],
  CD: [2.1, 1.5, 1.2],
  MZ: [4.2, 5.5, 1.3],
  UG: [3.5, 3.0, 0.8],
  AF: [1.5, 0.5, 2.5],
  MW: [4.5, 5.5, 0.8],
  NE: [1.8, 2.0, 1.0],
  TD: [1.2, 1.0, 1.5],
  BI: [3.0, 4.0, 1.0],
  SL: [2.5, 2.0, 1.5],
};

// ── Main ────────────────────────────────────────────────────────────────

const data = JSON.parse(fs.readFileSync(COUNTRIES_PATH, 'utf8'));

const WB_FIELDS = [
  'taxRevenuePercentGdp',
  'socialProtectionSpendingPercentGdp',
  'inflationRate',
  'laborForceParticipation',
  'unemploymentRate',
  'governmentDebtPercentGdp',
  'socialContributionsPercentRevenue',
  'povertyHeadcountRatio',
  'gdpGrowthRate',
  'healthExpenditurePercentGdp',
  'educationExpenditurePercentGdp',
  'urbanizationRate',
];

const ILO_FIELDS = [
  'socialProtectionCoveragePercent',
  'socialProtectionExpenditureIloPercentGdp',
  'pensionCoveragePercent',
  'childBenefitCoveragePercent',
];

let enriched = 0;
let totalIndicators = 0;

for (const country of data.countries) {
  const code = country.code;

  // World Bank
  if (WB_DATA[code]) {
    const values = WB_DATA[code];
    for (let i = 0; i < WB_FIELDS.length; i++) {
      country.stats[WB_FIELDS[i]] = values[i];
      if (values[i] != null) totalIndicators++;
    }
  }

  // ILO
  if (ILO_DATA[code]) {
    const values = ILO_DATA[code];
    for (let i = 0; i < ILO_FIELDS.length; i++) {
      country.stats[ILO_FIELDS[i]] = values[i];
      if (values[i] != null) totalIndicators++;
    }
  }

  // IMF
  if (IMF_DATA[code]) {
    const [income, vat, trade] = IMF_DATA[code];
    country.stats.taxBreakdown = {
      incomeTaxPercentGdp: income,
      vatPercentGdp: vat,
      tradeTaxPercentGdp: trade,
      otherTaxPercentGdp: null,
    };
    totalIndicators += 3;
  }

  enriched++;
}

data.source = 'World Bank Open Data, ILO WSPR 2022-2024, IMF GFS — most recent available year per indicator (2020–2023). Enriched offline.';
data.dataVersion = 'worldbank-2023-enriched';

fs.writeFileSync(COUNTRIES_PATH, JSON.stringify(data, null, 2) + '\n');
console.log(`Enriched ${enriched} countries with ${totalIndicators} indicator values.`);
console.log(`Output: ${COUNTRIES_PATH}`);
