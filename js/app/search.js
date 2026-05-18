import { appState } from '../core/state.js';
import { el } from '../core/dom.js';
import { escapeHtml, escapeAttr } from '../core/html.js';
import { distanceLy } from '../core/astro.js';
import { getAllSystemSummaries } from '../db/systems.js';
import { getSystemFuelProspect } from '../domain/fuel.js';
import * as filters from './filters.js';
import { chooseOriginSystem, clearOriginSystem, getSelectedOrigin } from './session.js';
import { resetDetailPanel } from '../ui/system-detail.js';
export function matchScore(row, text) {
  const name = String(row.system_name || "").toLowerCase();
  const id = String(row.system_id);
  if (name === text || id === text) return 0;
  if (name.startsWith(text)) return 1;
  if (id.startsWith(text)) return 2;
  return 3;
}


export function findSearchMatches(query, limit = 12) {
  const text = query.trim().toLowerCase();
  if (!text) return [];

  return getAllSystemSummaries()
    .filter((row) => filters.systemMatchesSearchFilters(row))
    .filter(
      (row) =>
        String(row.system_id).includes(text) ||
        String(row.system_name || "").toLowerCase().includes(text),
    )
    .sort(
      (a, b) =>
        matchScore(a, text) - matchScore(b, text) ||
        String(a.system_name).localeCompare(String(b.system_name)),
    )
    .slice(0, limit);
}


export function hideSearchSuggestions() {
  el.searchSuggestions.hidden = true;
  el.searchSuggestions.innerHTML = "";
  el.searchInput.setAttribute("aria-expanded", "false");
  appState.suggestionIndex = -1;
}


export function renderSearchSuggestions() {
  const query = el.searchInput.value.trim();
  if (!query) {
    hideSearchSuggestions();
    return;
  }

  const matches = findSearchMatches(query);
  if (!matches.length) {
    el.searchSuggestions.innerHTML = `<div class="suggestion-empty">No matching systems.</div>`;
    el.searchSuggestions.hidden = false;
    el.searchInput.setAttribute("aria-expanded", "true");
    return;
  }

  el.searchSuggestions.innerHTML = matches
    .map(
      (row, index) => `
        <button
          class="suggestion-item"
          type="button"
          role="option"
          data-system-id="${escapeAttr(row.system_id)}"
          data-index="${index}"
        >
          <strong>${escapeHtml(row.system_name || row.system_id)}</strong>
          <span>${escapeHtml(row.system_id)} · ${escapeHtml(row.region || "Unknown region")}</span>
        </button>
      `,
    )
    .join("");

  el.searchSuggestions.hidden = false;
  el.searchInput.setAttribute("aria-expanded", "true");
  el.searchSuggestions.querySelectorAll(".suggestion-item").forEach((button) => {
    button.addEventListener("mousedown", (event) => {
      event.preventDefault();
      chooseOriginSystem(Number(button.dataset.systemId));
    });
  });
  highlightSuggestion(appState.suggestionIndex);
}


export function highlightSuggestion(index) {
  const items = el.searchSuggestions.querySelectorAll(".suggestion-item");
  items.forEach((item, itemIndex) => {
    item.classList.toggle("active", itemIndex === index);
  });
}


export function getRadiusFilteredRows(originOverride) {
  const origin = originOverride ?? getSelectedOrigin();
  if (!origin) return null;

  if (!origin.center_x && Number(origin.center_x) !== 0) {
    return [];
  }

  const filterState = filters.getSearchFilterState();

  return getAllSystemSummaries()
    .filter((row) => Number(row.system_id) !== Number(origin.system_id))
    .filter((row) => filters.systemMatchesSearchFilters(row, filterState))
    .map((row) => ({ ...row, distance_ly: distanceLy(origin, row) }))
    .filter((row) => row.distance_ly <= filterState.radiusLy)
    .sort(
      (a, b) =>
        a.distance_ly - b.distance_ly ||
        (getSystemFuelProspect(b.system_id)?.max ?? 0) - (getSystemFuelProspect(a.system_id)?.max ?? 0) ||
        Number(b.outer_belt_site_count) - Number(a.outer_belt_site_count) ||
        Number(b.inner_belt_site_count) - Number(a.inner_belt_site_count) ||
        String(a.system_name).localeCompare(String(b.system_name)),
    )
    .slice(0, 120);
}


export function onSearchInput() {
  if (appState.suppressSearchClear) return;

  const value = el.searchInput.value;
  if (appState.originSystemId && value.trim() !== appState.originSystemLabel.trim()) {
    clearOriginSystem();
    resetDetailPanel();
  }

  renderSearchSuggestions();
}

