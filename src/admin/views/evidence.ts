import { layout } from './layout.js';
import { escapeHtml, formatNumber } from './helpers.js';
import type { Pilot, OutcomeRecord, OutcomeComparison } from '../../core/types.js';

function cohortBadge(cohortType: string): string {
  const cls = cohortType === 'recipient' ? 'badge-success' : 'badge-info';
  return `<span class="badge ${cls}">${escapeHtml(cohortType)}</span>`;
}

function baselineBadge(isBaseline: boolean): string {
  return isBaseline
    ? `<span class="badge badge-warning">baseline</span>`
    : '';
}

function fmtIndicator(val: number | null | undefined): string {
  if (val == null) return '<span class="text-muted">—</span>';
  return escapeHtml(String(Math.round(val * 1000) / 1000));
}

function fmtChange(change: number | null | undefined): string {
  if (change == null) return '<span class="text-muted">—</span>';
  const sign = change > 0 ? '+' : '';
  const cls = change > 0 ? 'text-success' : change < 0 ? 'text-danger' : 'text-muted';
  return `<span class="${cls}">${sign}${Math.round(change * 1000) / 1000}</span>`;
}

export function renderEvidencePage(
  pilot: Pilot,
  outcomes: OutcomeRecord[],
  comparison: OutcomeComparison | null,
  flash?: string,
): string {
  const outcomeRows =
    outcomes.length === 0
      ? `<tr><td colspan="7" class="text-muted text-center">No outcome measurements recorded yet</td></tr>`
      : outcomes
          .map(
            (o) => `<tr>
        <td>${cohortBadge(o.cohortType)} ${baselineBadge(o.isBaseline)}</td>
        <td>${escapeHtml(o.measurementDate)}</td>
        <td>${formatNumber(o.sampleSize)}</td>
        <td>${fmtIndicator(o.indicators.employmentRate)}</td>
        <td>${fmtIndicator(o.indicators.averageMonthlyIncomeUsd)}</td>
        <td>${fmtIndicator(o.indicators.foodSecurityScore)}</td>
        <td>${escapeHtml(o.dataSource)}</td>
      </tr>`,
          )
          .join('');

  // Pre/post comparison section
  let comparisonSection = '';
  if (comparison && comparison.recipient.baseline && comparison.recipient.latest) {
    const d = comparison.recipient.delta ?? {};

    const projectedRows = comparison.projectedImpact
      ? `
      <tr>
        <td class="text-bold">Projected poverty reduction (%)</td>
        <td colspan="3">${fmtIndicator(comparison.projectedImpact.povertyReductionPercent)}</td>
      </tr>
      <tr>
        <td class="text-bold">Projected income increase (%)</td>
        <td colspan="3">${fmtIndicator(comparison.projectedImpact.incomeIncreasePercent)}</td>
      </tr>`
      : '';

    comparisonSection = `
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Pre/Post Comparison — Recipients</h2>
      </div>
      <div class="data-table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Indicator</th>
              <th>Baseline</th>
              <th>Latest</th>
              <th>Change</th>
            </tr>
          </thead>
          <tbody>
            ${d.employmentRate ? `<tr><td class="text-bold">Employment rate</td><td>${fmtIndicator(d.employmentRate.baseline)}</td><td>${fmtIndicator(d.employmentRate.latest)}</td><td>${fmtChange(d.employmentRate.change)}</td></tr>` : ''}
            ${d.averageMonthlyIncomeUsd ? `<tr><td class="text-bold">Avg monthly income (USD)</td><td>${fmtIndicator(d.averageMonthlyIncomeUsd.baseline)}</td><td>${fmtIndicator(d.averageMonthlyIncomeUsd.latest)}</td><td>${fmtChange(d.averageMonthlyIncomeUsd.change)}</td></tr>` : ''}
            ${d.foodSecurityScore ? `<tr><td class="text-bold">Food security score</td><td>${fmtIndicator(d.foodSecurityScore.baseline)}</td><td>${fmtIndicator(d.foodSecurityScore.latest)}</td><td>${fmtChange(d.foodSecurityScore.change)}</td></tr>` : ''}
            ${d.childSchoolAttendanceRate ? `<tr><td class="text-bold">Child school attendance</td><td>${fmtIndicator(d.childSchoolAttendanceRate.baseline)}</td><td>${fmtIndicator(d.childSchoolAttendanceRate.latest)}</td><td>${fmtChange(d.childSchoolAttendanceRate.change)}</td></tr>` : ''}
            ${d.abovePovertyLinePercent ? `<tr><td class="text-bold">Above poverty line (%)</td><td>${fmtIndicator(d.abovePovertyLinePercent.baseline)}</td><td>${fmtIndicator(d.abovePovertyLinePercent.latest)}</td><td>${fmtChange(d.abovePovertyLinePercent.change)}</td></tr>` : ''}
            ${d.selfReportedHealthScore ? `<tr><td class="text-bold">Self-reported health</td><td>${fmtIndicator(d.selfReportedHealthScore.baseline)}</td><td>${fmtIndicator(d.selfReportedHealthScore.latest)}</td><td>${fmtChange(d.selfReportedHealthScore.change)}</td></tr>` : ''}
            ${d.savingsRate ? `<tr><td class="text-bold">Savings rate</td><td>${fmtIndicator(d.savingsRate.baseline)}</td><td>${fmtIndicator(d.savingsRate.latest)}</td><td>${fmtChange(d.savingsRate.change)}</td></tr>` : ''}
            ${projectedRows}
          </tbody>
        </table>
      </div>
    </div>`;
  } else if (comparison && (comparison.recipient.baseline || comparison.recipient.latest)) {
    comparisonSection = `
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Pre/Post Comparison</h2>
      </div>
      <div style="padding:1rem" class="text-muted">
        ${!comparison.recipient.baseline ? 'Record a baseline measurement (isBaseline: true) to enable comparison.' : 'Record a follow-up measurement to see changes over time.'}
      </div>
    </div>`;
  }

  return layout(
    `Evidence — ${pilot.name}`,
    `
    <div class="page-header">
      <h1>Evidence — ${escapeHtml(pilot.name)}</h1>
      <a href="/admin/pilots/${escapeHtml(pilot.id)}" class="btn btn-secondary">← Back to Pilot</a>
    </div>
    ${flash ? `<div class="flash">${escapeHtml(flash)}</div>` : ''}

    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Record Outcome Measurement</h2>
      </div>
      <form method="POST" action="/admin/pilots/${escapeHtml(pilot.id)}/outcomes/create">
        <div class="form-row">
          <div class="form-group" style="flex:1">
            <label>Cohort</label>
            <select name="cohortType" required>
              <option value="recipient">Recipient</option>
              <option value="control">Control</option>
            </select>
          </div>
          <div class="form-group" style="flex:1">
            <label>Measurement Date</label>
            <input type="date" name="measurementDate" required>
          </div>
          <div class="form-group" style="flex:0 0 120px">
            <label>Sample Size</label>
            <input type="number" name="sampleSize" min="1" required placeholder="e.g. 500">
          </div>
          <div class="form-group" style="flex:0 0 80px">
            <label>Baseline?</label>
            <input type="checkbox" name="isBaseline" value="1" style="margin-top:0.75rem">
          </div>
        </div>
        <div class="form-group">
          <label>Data Source</label>
          <input type="text" name="dataSource" required placeholder="e.g. NGO field survey — October 2026">
        </div>
        <div class="form-row mt-1">
          <div class="form-group" style="flex:1">
            <label>Employment rate (0–1)</label>
            <input type="number" name="employmentRate" step="0.001" min="0" max="1" placeholder="e.g. 0.62">
          </div>
          <div class="form-group" style="flex:1">
            <label>Avg monthly income (USD)</label>
            <input type="number" name="averageMonthlyIncomeUsd" step="0.01" min="0" placeholder="e.g. 380">
          </div>
          <div class="form-group" style="flex:1">
            <label>Food security score (0–10)</label>
            <input type="number" name="foodSecurityScore" step="0.1" min="0" max="10" placeholder="e.g. 3.8">
          </div>
          <div class="form-group" style="flex:1">
            <label>Child school attendance (0–1)</label>
            <input type="number" name="childSchoolAttendanceRate" step="0.001" min="0" max="1" placeholder="e.g. 0.91">
          </div>
        </div>
        <div class="form-row mt-1">
          <div class="form-group" style="flex:1">
            <label>Above poverty line % (0–1)</label>
            <input type="number" name="abovePovertyLinePercent" step="0.001" min="0" max="1" placeholder="e.g. 0.45">
          </div>
          <div class="form-group" style="flex:1">
            <label>Self-reported health (0–1)</label>
            <input type="number" name="selfReportedHealthScore" step="0.001" min="0" max="1" placeholder="e.g. 0.72">
          </div>
          <div class="form-group" style="flex:1">
            <label>Savings rate (0–1)</label>
            <input type="number" name="savingsRate" step="0.001" min="0" max="1" placeholder="e.g. 0.18">
          </div>
        </div>
        <div class="mt-1">
          <button type="submit" class="btn btn-primary">Record Measurement</button>
        </div>
      </form>
    </div>

    ${comparisonSection}

    <div class="card">
      <div class="card-header">
        <h2 class="card-title">All Measurements (${escapeHtml(String(outcomes.length))})</h2>
      </div>
      <div class="data-table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Cohort</th>
              <th>Date</th>
              <th>Sample</th>
              <th>Employment</th>
              <th>Income (USD)</th>
              <th>Food security</th>
              <th>Data source</th>
            </tr>
          </thead>
          <tbody>${outcomeRows}</tbody>
        </table>
      </div>
    </div>
    `,
    { activePage: 'pilots' },
  );
}
