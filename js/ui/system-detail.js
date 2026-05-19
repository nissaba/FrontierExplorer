import { appState } from '../core/state.js';
import { el } from '../core/dom.js';
import { normalizeSystemId } from '../core/ids.js';
import { escapeHtml } from '../core/html.js';
import { formatNumber } from '../core/format.js';
import { queryRows, queryOne } from '../db/connection.js';
import {
  getSearchFilterState,
  hasActiveSearchFilters,
  updateRadiusInputValidity,
  filterSitesForDisplay,
} from '../app/filters.js';
import { starmapPlanetMap } from '../domain/planets.js';
import { buildLandscapeByKey, buildPlanetIndexById, sortSitesByPlanet } from '../domain/site-placement.js';
import { getLandscapeObjectsForSystem } from '../db/landscape.js';
import { makeSystemReport } from './system-report.js';
import { renderNearbySystems } from './nearby.js';
import { renderSiteCard } from './site-card.js';
import { updateSiteListNotes } from '../domain/ecosystems.js';
export function renderSystemDetail(systemId) {
  const id = normalizeSystemId(systemId);
  if (!id) return;

  updateRadiusInputValidity();

  const summary = queryOne(
    `
      SELECT
        sys.system_id,
        sys.system_name,
        sys.region,
        summary.site_count,
        summary.comet_site_count,
        summary.combat_site_count,
        summary.inner_belt_site_count,
        summary.outer_belt_site_count,
        sys.center_x,
        sys.center_y,
        sys.center_z
      FROM systems sys
      JOIN system_site_summary summary ON summary.system_id = sys.system_id
      WHERE sys.system_id = $systemId
    `,
    { $systemId: id },
  );

  if (!summary) return;

  const sites = queryRows(
    `
      SELECT
        s.site_id,
        s.object_type,
        s.object_id,
        s.ecosystem_id,
        e.name AS ecosystem_name,
        s.x,
        s.y,
        s.z,
        s.tags_json,
        s.is_comet_candidate,
        s.is_combat_candidate
      FROM sites s
      LEFT JOIN ecosystems e ON e.ecosystem_id = s.ecosystem_id
      WHERE s.system_id = $systemId
      ORDER BY s.object_type, s.object_id, s.site_id
    `,
    { $systemId: id },
  );

  el.detailTitle.textContent = `${summary.system_name || summary.system_id}`;
  el.detailRegion.textContent = summary.region || "Unknown region";
  el.detailEmpty.hidden = true;
  el.detailContent.hidden = false;

  try {
    const filters = getSearchFilterState();
    const planetsById = starmapPlanetMap(id);
    const planetIndexById = buildPlanetIndexById(id);
    const landscapeByKey = buildLandscapeByKey(getLandscapeObjectsForSystem(id));
    const visibleSites = sortSitesByPlanet(
      filterSitesForDisplay(sites, filters),
      planetsById,
      landscapeByKey,
      planetIndexById,
    );
    const siteRenderContext = { planetsById, landscapeByKey, planetIndexById };
    const renderSite = (site) => renderSiteCard(site, siteRenderContext);
    el.systemReport.innerHTML = makeSystemReport(summary, visibleSites);
    renderNearbySystems(summary);
    updateSiteListNotes(visibleSites);
    updateSiteListHeading(visibleSites.length, sites.length, filters);
    el.siteList.innerHTML = visibleSites.length
      ? visibleSites.map(renderSite).join("")
      : `<div class="empty-state compact">No sites in this system match the current filters.</div>`;
  } catch (error) {
    console.error(error);
    el.systemReport.innerHTML = `
      <section class="report-card">
        <h3>Could not render system report</h3>
        <p class="planet-lede">${escapeHtml(error.message || String(error))}</p>
        <p class="planet-lede compact">Rebuild and redeploy <code>web/data/frontier.sqlite</code> if the database schema is older than the app.</p>
      </section>
    `;
    renderNearbySystems(summary);
    el.siteList.innerHTML = visibleSites.length
      ? visibleSites.map(renderSite).join("")
      : `<div class="empty-state compact">No sites in this system match the current filters.</div>`;
  }
}


export function updateSiteListHeading(visibleCount, totalCount, filters = getSearchFilterState()) {
  const heading = document.querySelector(".site-list-heading");
  if (!heading) return;
  if (!hasActiveSearchFilters(filters)) {
    heading.textContent = "All sites in this system";
    return;
  }
  heading.textContent = `Sites matching filters (${formatNumber(visibleCount)} of ${formatNumber(totalCount)})`;
}


export function resetDetailPanel() {
  appState.selectedSystemId = null;
  el.detailTitle.textContent = "Choose a system";
  el.detailRegion.textContent = "Nowhere yet";
  el.detailEmpty.hidden = false;
  el.detailContent.hidden = true;
  el.systemReport.innerHTML = "";
  el.nearbySystems.innerHTML = "";
  el.siteListNotes.innerHTML = "";
  el.siteListNotes.hidden = true;
  el.siteList.innerHTML = "";
}

