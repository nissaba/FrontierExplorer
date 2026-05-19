import { el } from '../core/dom.js';
import { formatNumber, formatBeltNearbySummary } from '../core/format.js';
import { escapeHtml, escapeAttr } from '../core/html.js';
import {
  getSearchFilterState,
  hasActiveSearchFilters,
  describeActiveSearchFilters,
} from '../app/filters.js';
import { getRadiusFilteredRows } from '../app/search.js';
import { formatNearbyFuelProspect } from '../domain/fuel.js';
import { setActiveSystem } from '../app/session.js';
export function renderNearbyRow(row) {
  const fuelBadge = formatNearbyFuelProspect(row);
  return `
    <button class="nearby-row" type="button" data-system-id="${escapeAttr(row.system_id)}">
      <span class="nearby-row-title">
        <strong>${escapeHtml(row.system_name || row.system_id)}</strong>
        ${fuelBadge}
      </span>
      <span class="nearby-row-meta">${row.distance_ly.toFixed(1)} ly · ${formatBeltNearbySummary(row)}</span>
    </button>
  `;
}


export function renderNearbySystems(origin) {
  const filters = getSearchFilterState();

  if (filters.radiusLy == null) {
    el.nearbySystems.innerHTML = `
      <section class="report-card nearby-card">
        <h3>Nearby Systems</h3>
        <p class="nearby-note field-hint-visible">${escapeHtml(filters.radiusMessage || "Enter a radius greater than 0 ly.")}</p>
      </section>
    `;
    return;
  }

  const radius = filters.radiusLy;

  if (!origin.center_x && Number(origin.center_x) !== 0) {
    el.nearbySystems.innerHTML = `
      <section class="report-card nearby-card">
        <h3>Nearby Systems</h3>
        <p class="nearby-note">This system has no starmap coordinates — distance is a matter of faith.</p>
      </section>
    `;
    return;
  }

  const rows = getRadiusFilteredRows(origin) ?? [];
  const list = rows.length
    ? rows.map(renderNearbyRow).join("")
    : `<div class="empty-state compact">No systems matched your filters within ${formatNumber(radius)} ly — try a wider net or fewer demands.</div>`;

  const filterNote = hasActiveSearchFilters(filters)
    ? `<p class="nearby-filter-note">Active filters: ${escapeHtml(describeActiveSearchFilters(filters))}</p>`
    : "";

  el.nearbySystems.innerHTML = `
    <section class="report-card nearby-card">
      <div class="nearby-heading">
        <h3>Nearby within ${formatNumber(radius)} ly</h3>
        <span class="pill muted">${formatNumber(rows.length)} systems</span>
      </div>
      ${filterNote}
      <p class="nearby-note">Distances follow starmap coordinates. After each name: <b>Water Ice: No / Low / Medium / High chance</b> — a qualitative read from outer Shale, Grove, and Drift on the map, not a promise in your hold. Click to leap.</p>
      <div class="nearby-list">${list}</div>
    </section>
  `;

  el.nearbySystems.querySelectorAll("[data-system-id]").forEach((button) => {
    button.addEventListener("click", () => setActiveSystem(Number(button.dataset.systemId)));
  });
}

