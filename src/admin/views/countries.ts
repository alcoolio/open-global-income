import { layout } from './layout.js';
import type { Country, CountryStats } from '../../core/types.js';
import type { DataCompleteness } from '../../data/loader.js';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmt(val: number | null | undefined, decimals = 1, suffix = ''): string {
  if (val === null || val === undefined) return '<span style="color:var(--muted)">N/A</span>';
  return `${val.toFixed(decimals)}${suffix}`;
}

function fmtLarge(val: number | null | undefined): string {
  if (val === null || val === undefined) return '<span style="color:var(--muted)">N/A</span>';
  if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)}B`;
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
  return val.toLocaleString('en-US');
}

function incomeGroupBadge(group: string): string {
  const colors: Record<string, string> = {
    HIC: 'background:#d1e7dd;color:#0f5132',
    UMC: 'background:#cfe2ff;color:#084298',
    LMC: 'background:#fff3cd;color:#664d03',
    LIC: 'background:#f8d7da;color:#842029',
  };
  const style = colors[group] ?? 'background:#e2e3e5;color:#41464b';
  return `<span class="badge" style="${style}">${escapeHtml(group)}</span>`;
}

/**
 * Color-code an indicator value against thresholds.
 * Returns a CSS inline style snippet (color + optionally background).
 */
function indicatorStyle(
  val: number | null | undefined,
  thresholds: { good?: number; warn?: number; bad?: number; invert?: boolean },
): string {
  if (val === null || val === undefined) return 'color:var(--muted)';
  const { good, warn, invert = false } = thresholds;
  const isGood = good !== undefined && (invert ? val <= good : val >= good);
  const isWarn = warn !== undefined && (invert ? val <= warn : val >= warn) && !isGood;

  if (isGood) return 'color:#0f5132';
  if (isWarn) return 'color:#664d03';
  return 'color:#842029';
}

/** Render a single stat card item (label + value with optional indicator dot) */
function statItem(
  label: string,
  value: string,
  style?: string,
  note?: string,
): string {
  return `
    <div style="margin-bottom:0.6rem">
      <div style="font-size:0.75rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em">${label}</div>
      <div style="font-size:1.1rem;font-weight:600;${style ?? ''}">${value}${note ? ` <span style="font-size:0.75rem;color:var(--muted);font-weight:400">${escapeHtml(note)}</span>` : ''}</div>
    </div>`;
}

/** Compute averages per income group for a set of countries */
function computeGroupAverages(
  countries: Country[],
  fields: (keyof CountryStats)[],
): Record<string, Partial<Record<keyof CountryStats, number>>> {
  const groups = ['HIC', 'UMC', 'LMC', 'LIC'];
  const result: Record<string, Partial<Record<keyof CountryStats, number>>> = {};

  for (const group of groups) {
    const groupCountries = countries.filter((c) => c.stats.incomeGroup === group);
    const avgs: Partial<Record<keyof CountryStats, number>> = {};

    for (const field of fields) {
      const vals = groupCountries
        .map((c) => c.stats[field])
        .filter((v): v is number => typeof v === 'number' && v !== null);
      if (vals.length > 0) {
        avgs[field] = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
      }
    }
    result[group] = avgs;
  }
  return result;
}

/** Completeness bar HTML */
function completenessBar(available: number, total: number): string {
  const pct = total > 0 ? Math.round((available / total) * 100) : 0;
  const color = pct >= 70 ? '#198754' : pct >= 40 ? '#fd7e14' : '#dc3545';
  return `
    <div style="display:flex;align-items:center;gap:0.5rem">
      <div style="flex:1;background:#e9ecef;border-radius:4px;height:8px;min-width:80px">
        <div style="width:${pct}%;background:${color};height:8px;border-radius:4px"></div>
      </div>
      <span style="font-size:0.75rem;color:var(--muted);white-space:nowrap">${available}/${total}</span>
    </div>`;
}

// ── Public render functions ───────────────────────────────────────────────────

export interface CountryListItem {
  country: Country;
  completeness: DataCompleteness;
}

/**
 * Render the /admin/countries list page.
 */
export function renderCountryList(
  items: CountryListItem[],
  dataVersion: string,
  username?: string,
): string {
  const rows = items
    .map(({ country: c, completeness: comp }) => `
      <tr>
        <td><strong>${escapeHtml(c.code)}</strong></td>
        <td><a href="/admin/countries/${escapeHtml(c.code)}">${escapeHtml(c.name)}</a></td>
        <td>${incomeGroupBadge(c.stats.incomeGroup)}</td>
        <td style="text-align:right">${fmtLarge(c.stats.population)}</td>
        <td style="text-align:right">$${c.stats.gdpPerCapitaUsd.toLocaleString('en-US')}</td>
        <td>${completenessBar(comp.available, comp.total)}</td>
        <td><a href="/admin/countries/${escapeHtml(c.code)}" class="btn btn-primary btn-sm">View</a></td>
      </tr>`)
    .join('');

  const totalCountries = items.length;
  const avgCompleteness =
    items.length > 0
      ? Math.round(
          (items.reduce((sum, i) => sum + i.completeness.available / i.completeness.total, 0) /
            items.length) *
            100,
        )
      : 0;

  return layout(
    'Countries',
    `
    <h1 class="mt-1">Country Economic Profiles</h1>
    <p style="color:var(--muted);margin-bottom:1rem">
      ${totalCountries} countries &nbsp;·&nbsp; Data: <code>${escapeHtml(dataVersion)}</code>
      &nbsp;·&nbsp; Avg. macro-indicator coverage: ${avgCompleteness}%
    </p>

    <div class="card">
      <table>
        <thead>
          <tr>
            <th>Code</th>
            <th>Country</th>
            <th>Income Group</th>
            <th style="text-align:right">Population</th>
            <th style="text-align:right">GDP/capita</th>
            <th>Macro Coverage</th>
            <th></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`,
    username,
  );
}

/**
 * Render the /admin/countries/:code detail page.
 */
export function renderCountryDetail(
  country: Country,
  completeness: DataCompleteness,
  allCountries: Country[],
  dataVersion: string,
  username?: string,
): string {
  const s = country.stats;
  const group = s.incomeGroup;

  // Pre-compute group averages for comparison notes
  const macroFields: (keyof CountryStats)[] = [
    'taxRevenuePercentGdp',
    'socialProtectionSpendingPercentGdp',
    'inflationRate',
    'laborForceParticipation',
    'unemploymentRate',
    'governmentDebtPercentGdp',
    'povertyHeadcountRatio',
    'gdpGrowthRate',
    'healthExpenditurePercentGdp',
    'educationExpenditurePercentGdp',
    'urbanizationRate',
    'socialProtectionCoveragePercent',
    'pensionCoveragePercent',
    'childBenefitCoveragePercent',
  ];
  const groupAvgs = computeGroupAverages(allCountries, macroFields);
  const avgs = groupAvgs[group] ?? {};

  function avgNote(field: keyof CountryStats): string {
    const avg = avgs[field as keyof typeof avgs];
    return avg !== undefined ? `${group} avg: ${avg}%` : '';
  }

  // ── Cards ─────────────────────────────────────────────────────────────────

  const coreCard = `
    <div class="card">
      <h2>Core Economics</h2>
      <div class="grid">
        ${statItem('GDP / capita', `$${s.gdpPerCapitaUsd.toLocaleString('en-US')}`)}
        ${statItem('GNI / capita', `$${s.gniPerCapitaUsd.toLocaleString('en-US')}`)}
        ${statItem('PPP Conversion Factor', fmt(s.pppConversionFactor, 2))}
        ${statItem('Gini Index', s.giniIndex !== null ? `${s.giniIndex}` : '<span style="color:var(--muted)">N/A</span>')}
        ${statItem('Population', fmtLarge(s.population))}
        ${statItem('Income Group', incomeGroupBadge(s.incomeGroup))}
      </div>
    </div>`;

  const fiscalCard = `
    <div class="card">
      <h2>Fiscal Capacity</h2>
      <div class="grid">
        ${statItem(
          'Tax Revenue % GDP',
          fmt(s.taxRevenuePercentGdp, 1, '%'),
          indicatorStyle(s.taxRevenuePercentGdp, { good: 20, warn: 10 }),
          avgNote('taxRevenuePercentGdp'),
        )}
        ${statItem(
          'Govt Debt % GDP',
          fmt(s.governmentDebtPercentGdp, 1, '%'),
          indicatorStyle(s.governmentDebtPercentGdp, { good: 60, warn: 90, invert: true }),
          avgNote('governmentDebtPercentGdp'),
        )}
        ${statItem(
          'GDP Growth Rate',
          fmt(s.gdpGrowthRate, 1, '%'),
          indicatorStyle(s.gdpGrowthRate, { good: 3, warn: 0 }),
          avgNote('gdpGrowthRate'),
        )}
        ${statItem(
          'Social Contributions % Revenue',
          fmt(s.socialContributionsPercentRevenue, 1, '%'),
          undefined,
          avgNote('socialContributionsPercentRevenue'),
        )}
        ${statItem(
          'Social Protection Spending % GDP',
          fmt(s.socialProtectionSpendingPercentGdp, 1, '%'),
          undefined,
          avgNote('socialProtectionSpendingPercentGdp'),
        )}
      </div>
    </div>`;

  const socialCard = `
    <div class="card">
      <h2>Social Protection <span style="font-size:0.75rem;color:var(--muted);font-weight:400">(ILO)</span></h2>
      <div class="grid">
        ${statItem(
          'Coverage (≥1 benefit)',
          fmt(s.socialProtectionCoveragePercent, 1, '%'),
          indicatorStyle(s.socialProtectionCoveragePercent, { good: 70, warn: 40 }),
          avgNote('socialProtectionCoveragePercent'),
        )}
        ${statItem(
          'ILO Expenditure % GDP',
          fmt(s.socialProtectionExpenditureIloPercentGdp, 1, '%'),
          undefined,
        )}
        ${statItem(
          'Pension Coverage',
          fmt(s.pensionCoveragePercent, 1, '%'),
          indicatorStyle(s.pensionCoveragePercent, { good: 60, warn: 30 }),
          avgNote('pensionCoveragePercent'),
        )}
        ${statItem(
          'Child Benefit Coverage',
          fmt(s.childBenefitCoveragePercent, 1, '%'),
          indicatorStyle(s.childBenefitCoveragePercent, { good: 60, warn: 20 }),
          avgNote('childBenefitCoveragePercent'),
        )}
      </div>
    </div>`;

  const laborCard = `
    <div class="card">
      <h2>Labor Market</h2>
      <div class="grid">
        ${statItem(
          'Labor Force Participation',
          fmt(s.laborForceParticipation, 1, '%'),
          indicatorStyle(s.laborForceParticipation, { good: 60, warn: 50 }),
          avgNote('laborForceParticipation'),
        )}
        ${statItem(
          'Unemployment Rate',
          fmt(s.unemploymentRate, 1, '%'),
          indicatorStyle(s.unemploymentRate, { good: 5, warn: 10, invert: true }),
          avgNote('unemploymentRate'),
        )}
        ${statItem(
          'Poverty Headcount (<$2.15/day)',
          fmt(s.povertyHeadcountRatio, 1, '%'),
          indicatorStyle(s.povertyHeadcountRatio, { good: 3, warn: 15, invert: true }),
          avgNote('povertyHeadcountRatio'),
        )}
        ${statItem(
          'Inflation Rate',
          fmt(s.inflationRate, 1, '%'),
          indicatorStyle(s.inflationRate, { good: 3, warn: 8, invert: true }),
          avgNote('inflationRate'),
        )}
        ${statItem(
          'Urbanization Rate',
          fmt(s.urbanizationRate, 1, '%'),
          undefined,
          avgNote('urbanizationRate'),
        )}
      </div>
    </div>`;

  const expenditureCard = `
    <div class="card">
      <h2>Public Expenditure</h2>
      <div class="grid">
        ${statItem(
          'Health Spending % GDP',
          fmt(s.healthExpenditurePercentGdp, 1, '%'),
          indicatorStyle(s.healthExpenditurePercentGdp, { good: 5, warn: 3 }),
          avgNote('healthExpenditurePercentGdp'),
        )}
        ${statItem(
          'Education Spending % GDP',
          fmt(s.educationExpenditurePercentGdp, 1, '%'),
          indicatorStyle(s.educationExpenditurePercentGdp, { good: 4, warn: 2 }),
          avgNote('educationExpenditurePercentGdp'),
        )}
      </div>
    </div>`;

  const taxBreakdownCard = s.taxBreakdown
    ? `
    <div class="card">
      <h2>Tax Revenue Breakdown <span style="font-size:0.75rem;color:var(--muted);font-weight:400">(IMF GFS)</span></h2>
      <div class="grid">
        ${statItem('Income Tax % GDP', fmt(s.taxBreakdown.incomeTaxPercentGdp, 1, '%'))}
        ${statItem('VAT / Sales Tax % GDP', fmt(s.taxBreakdown.vatPercentGdp, 1, '%'))}
        ${statItem('Trade Taxes % GDP', fmt(s.taxBreakdown.tradeTaxPercentGdp, 1, '%'))}
        ${statItem('Other Taxes % GDP', fmt(s.taxBreakdown.otherTaxPercentGdp, 1, '%'))}
      </div>
    </div>`
    : '';

  const missingFieldsList =
    completeness.missingFields.length > 0
      ? `<details style="margin-top:0.5rem">
          <summary style="cursor:pointer;color:var(--muted);font-size:0.85rem">
            ${completeness.missingFields.length} indicators not available for this country
          </summary>
          <ul style="font-size:0.8rem;color:var(--muted);margin-top:0.5rem;padding-left:1.2rem">
            ${completeness.missingFields.map((f) => `<li>${escapeHtml(f)}</li>`).join('')}
          </ul>
        </details>`
      : '<p style="color:#0f5132;font-size:0.85rem">✓ All macro-economic indicators available</p>';

  const completenessCard = `
    <div class="card" style="border-color:#dee2e6">
      <h2>Data Completeness</h2>
      <div style="display:flex;align-items:center;gap:1rem;margin-bottom:0.5rem">
        ${completenessBar(completeness.available, completeness.total)}
        <span style="font-size:0.85rem;color:var(--muted)">${completeness.available} of ${completeness.total} optional indicators available</span>
      </div>
      ${missingFieldsList}
      <p style="color:var(--muted);font-size:0.75rem;margin-top:0.5rem">Data: <code>${escapeHtml(dataVersion)}</code></p>
    </div>`;

  return layout(
    `${country.name} — Economic Profile`,
    `
    <div style="display:flex;align-items:center;gap:1rem;margin-top:1rem;margin-bottom:0.5rem">
      <a href="/admin/countries" style="color:var(--muted);font-size:0.85rem;text-decoration:none">← Countries</a>
    </div>

    <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1.25rem">
      <h1 style="margin:0">${escapeHtml(country.name)}</h1>
      <span style="font-size:1.5rem;color:var(--muted)">${escapeHtml(country.code)}</span>
      ${incomeGroupBadge(s.incomeGroup)}
    </div>

    ${coreCard}
    ${fiscalCard}
    ${socialCard}
    ${laborCard}
    ${expenditureCard}
    ${taxBreakdownCard}
    ${completenessCard}
    `,
    username,
  );
}
