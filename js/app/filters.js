import { el } from '../core/dom.js';
import { DEFAULT_RADIUS_LY, MAX_CANDIDATE_RADIUS_LY } from '../config/constants.js';
import { parseTags } from '../core/tags.js';
export function readRadiusFromInput() {
  const raw = String(el.candidateRadius?.value ?? "").trim();
  if (!raw) return DEFAULT_RADIUS_LY;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return DEFAULT_RADIUS_LY;
  return Math.min(MAX_CANDIDATE_RADIUS_LY, Math.max(1, Math.floor(parsed)));
}

/** Commit default radius into the input so placeholder-only “100” still applies. */

export function ensureRadiusInputValue() {
  if (!el.candidateRadius) return DEFAULT_RADIUS_LY;
  const ly = readRadiusFromInput();
  el.candidateRadius.value = String(ly);
  return ly;
}


export function getCandidateRadiusLy() {
  return readRadiusFromInput();
}


export function getSearchFilterState() {
  return {
    region: el.regionSelect.value,
    radiusLy: getCandidateRadiusLy(),
    cometOnly: el.cometOnly.checked,
    combatOnly: el.combatOnly.checked,
    innerBeltOnly: el.innerBeltOnly.checked,
    outerBeltOnly: el.outerBeltOnly.checked,
  };
}


export function systemMatchesSearchFilters(row, filters = getSearchFilterState()) {
  if (filters.region && row.region !== filters.region) return false;
  if (filters.cometOnly && Number(row.comet_site_count) <= 0) return false;
  if (filters.combatOnly && Number(row.combat_site_count) <= 0) return false;
  if (filters.innerBeltOnly && Number(row.inner_belt_site_count) <= 0) return false;
  if (filters.outerBeltOnly && Number(row.outer_belt_site_count) <= 0) return false;
  return true;
}


export function hasActiveSearchFilters(filters = getSearchFilterState()) {
  return Boolean(
    filters.region ||
      filters.cometOnly ||
      filters.combatOnly ||
      filters.innerBeltOnly ||
      filters.outerBeltOnly,
  );
}


export function describeActiveSearchFilters(filters = getSearchFilterState()) {
  const parts = [];
  if (filters.region) parts.push(`region: ${filters.region}`);
  if (filters.cometOnly) parts.push("outer Water Ice scout sites");
  if (filters.combatOnly) parts.push("Blue Drift");
  if (filters.innerBeltOnly) parts.push("inner tag");
  if (filters.outerBeltOnly) parts.push("outer tag");
  return parts.join(" · ");
}


export function siteMatchesSearchFilters(site, filters = getSearchFilterState()) {
  if (filters.cometOnly && Number(site.is_comet_candidate) !== 1) return false;
  if (filters.combatOnly && Number(site.is_combat_candidate) !== 1) return false;

  const tags = parseTags(site.tags_json);
  if (filters.innerBeltOnly && !tags.includes("inner")) return false;
  if (filters.outerBeltOnly && !tags.includes("outer")) return false;
  return true;
}


export function filterSitesForDisplay(sites, filters = getSearchFilterState()) {
  if (!hasActiveSearchFilters(filters)) return sites;
  return sites.filter((site) => siteMatchesSearchFilters(site, filters));
}


export function initFilterDefaults() {
  ensureRadiusInputValue();
}

