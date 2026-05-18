import { appState } from '../core/state.js';
import { el } from '../core/dom.js';
import { formatNumber } from '../core/format.js';
import { escapeHtml } from '../core/html.js';
import { queryRows, queryOne } from './connection.js';
export function getAllSystemSummaries() {
  if (!appState.allSystemSummaries) {
    appState.allSystemSummaries = queryRows(`
      SELECT
        sys.system_id,
        sys.system_name,
        sys.region,
        sys.center_x,
        sys.center_y,
        sys.center_z,
        summary.site_count,
        summary.comet_site_count,
        summary.combat_site_count,
        summary.inner_belt_site_count,
        summary.outer_belt_site_count
      FROM systems sys
      JOIN system_site_summary summary ON summary.system_id = sys.system_id
      WHERE sys.center_x IS NOT NULL
        AND sys.center_y IS NOT NULL
        AND sys.center_z IS NOT NULL
    `);
  }
  return appState.allSystemSummaries;
}


export function loadStats() {
  const stats = queryOne(`
    SELECT
      (SELECT COUNT(*) FROM systems) AS systems,
      (SELECT COUNT(*) FROM sites) AS sites,
      (SELECT COALESCE(SUM(inner_belt_site_count), 0) FROM system_site_summary) AS inner_belts,
      (SELECT COALESCE(SUM(outer_belt_site_count), 0) FROM system_site_summary) AS outer_belts
  `);

  el.stats.systems.textContent = formatNumber(stats.systems);
  el.stats.sites.textContent = formatNumber(stats.sites);
  el.stats.innerBelts.textContent = formatNumber(stats.inner_belts);
  el.stats.outerBelts.textContent = formatNumber(stats.outer_belts);
}


export function loadRegions() {
  const regions = queryRows(`
    SELECT region
    FROM systems
    WHERE region IS NOT NULL AND region != ''
    GROUP BY region
    ORDER BY region COLLATE NOCASE
  `);

  el.regionSelect.insertAdjacentHTML(
    "beforeend",
    regions
      .map((row) => `<option value="${escapeHtml(row.region)}">${escapeHtml(row.region)}</option>`)
      .join(""),
  );
}

