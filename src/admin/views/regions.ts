import { layout } from './layout.js';
import type { Region } from '../../core/types.js';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtPop(val: number): string {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
  return val.toLocaleString('en-US');
}

function colBadge(index: number): string {
  if (index > 1.1) return `<span style="background:#cfe2ff;color:#084298;padding:2px 8px;border-radius:4px;font-size:0.85rem">${index.toFixed(2)}</span>`;
  if (index < 0.9) return `<span style="background:#fff3cd;color:#664d03;padding:2px 8px;border-radius:4px;font-size:0.85rem">${index.toFixed(2)}</span>`;
  return `<span style="background:#e2e3e5;color:#41464b;padding:2px 8px;border-radius:4px;font-size:0.85rem">${index.toFixed(2)}</span>`;
}

function urbanBadge(type: string): string {
  const colors: Record<string, { bg: string; fg: string }> = {
    urban: { bg: '#d1e7dd', fg: '#0f5132' },
    rural: { bg: '#f8d7da', fg: '#842029' },
    mixed: { bg: '#cfe2ff', fg: '#084298' },
  };
  const c = colors[type] ?? colors['mixed'];
  return `<span style="background:${c.bg};color:${c.fg};padding:2px 8px;border-radius:4px;font-size:0.85rem">${type}</span>`;
}

export function renderRegionList(
  regions: Region[],
  dataVersion: string,
  username?: string,
): string {
  // Group by country
  const byCountry = new Map<string, Region[]>();
  for (const r of regions) {
    const list = byCountry.get(r.countryCode) ?? [];
    list.push(r);
    byCountry.set(r.countryCode, list);
  }

  let html = `<h1>Regions</h1>
<p style="color:var(--muted);margin-bottom:1.5rem">Sub-national data &middot; ${regions.length} regions &middot; Data: ${escapeHtml(dataVersion)}</p>`;

  for (const [countryCode, countryRegions] of byCountry) {
    html += `<h2 style="margin-top:2rem">${escapeHtml(countryCode)} &mdash; ${countryRegions.length} regions</h2>`;
    html += `<table>
<thead><tr>
  <th>ID</th><th>Name</th><th>Population</th><th>COL Index</th><th>Type</th><th>Poverty %</th>
</tr></thead>
<tbody>`;

    for (const r of countryRegions.sort((a, b) => a.name.localeCompare(b.name))) {
      html += `<tr>
  <td><a href="/admin/regions/${escapeHtml(r.id)}">${escapeHtml(r.id)}</a></td>
  <td>${escapeHtml(r.name)}</td>
  <td style="text-align:right">${fmtPop(r.stats.population)}</td>
  <td style="text-align:center">${colBadge(r.stats.costOfLivingIndex)}</td>
  <td style="text-align:center">${urbanBadge(r.stats.urbanRural)}</td>
  <td style="text-align:right">${r.stats.povertyHeadcountRatio != null ? `${r.stats.povertyHeadcountRatio.toFixed(1)}%` : '—'}</td>
</tr>`;
    }

    html += `</tbody></table>`;
  }

  return layout('Regions', html, username);
}

export function renderRegionDetail(
  region: Region,
  nationalPppFactor: number,
  nationalLocalCurrency: number,
  regionalLocalCurrency: number,
  dataVersion: string,
  username?: string,
): string {
  const effectivePpp = nationalPppFactor * region.stats.costOfLivingIndex;
  const diff = ((regionalLocalCurrency - nationalLocalCurrency) / nationalLocalCurrency * 100).toFixed(1);
  const diffSign = regionalLocalCurrency >= nationalLocalCurrency ? '+' : '';

  const html = `
<h1>${escapeHtml(region.name)}</h1>
<p style="color:var(--muted)">Region ${escapeHtml(region.id)} &middot; Country: ${escapeHtml(region.countryCode)} &middot; Data: ${escapeHtml(dataVersion)}</p>

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:1rem;margin:1.5rem 0">
  <div class="card" style="padding:1rem">
    <div style="font-size:0.85rem;color:var(--muted)">Population</div>
    <div style="font-size:1.5rem;font-weight:600">${fmtPop(region.stats.population)}</div>
  </div>
  <div class="card" style="padding:1rem">
    <div style="font-size:0.85rem;color:var(--muted)">Cost of Living Index</div>
    <div style="font-size:1.5rem;font-weight:600">${colBadge(region.stats.costOfLivingIndex)}</div>
  </div>
  <div class="card" style="padding:1rem">
    <div style="font-size:0.85rem;color:var(--muted)">Type</div>
    <div style="font-size:1.5rem;font-weight:600">${urbanBadge(region.stats.urbanRural)}</div>
  </div>
  <div class="card" style="padding:1rem">
    <div style="font-size:0.85rem;color:var(--muted)">Poverty Rate</div>
    <div style="font-size:1.5rem;font-weight:600">${region.stats.povertyHeadcountRatio != null ? `${region.stats.povertyHeadcountRatio.toFixed(1)}%` : '—'}</div>
  </div>
</div>

<h2>Entitlement Comparison</h2>
<table>
<thead><tr><th>Metric</th><th>National</th><th>Regional</th></tr></thead>
<tbody>
  <tr><td>PPP Conversion Factor</td><td>${nationalPppFactor.toFixed(2)}</td><td>${effectivePpp.toFixed(2)}</td></tr>
  <tr><td>Local Currency / Month</td><td>${nationalLocalCurrency.toFixed(2)}</td><td><strong>${regionalLocalCurrency.toFixed(2)}</strong> <span style="color:${regionalLocalCurrency >= nationalLocalCurrency ? '#198754' : '#dc3545'}">(${diffSign}${diff}%)</span></td></tr>
  <tr><td>PPP USD / Month</td><td colspan="2">$210.00 (universal floor)</td></tr>
</tbody>
</table>

<p style="color:var(--muted);margin-top:1.5rem;font-size:0.85rem">
  Data source: ${escapeHtml(region.stats.dataSource)} &middot; As of: ${escapeHtml(region.stats.dataAsOf)}
</p>

<p><a href="/admin/regions">&larr; Back to regions</a></p>`;

  return layout(`Region: ${region.name}`, html, username);
}
