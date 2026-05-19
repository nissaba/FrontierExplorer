import { appState } from '../core/state.js';
import { el } from '../core/dom.js';
import { normalizeSystemId } from '../core/ids.js';
import { queryOne } from '../db/connection.js';
import { getAllSystemSummaries } from '../db/systems.js';
import { updateRadiusInputValidity } from './filters.js';
import { renderSystemDetail } from '../ui/system-detail.js';
export function chooseOriginSystem(systemId) {
  const id = normalizeSystemId(systemId);
  if (id) setActiveSystem(id);
}


export function setActiveSystem(systemId) {
  const id = normalizeSystemId(systemId);
  if (!id) return;

  const summary = queryOne(
    `
      SELECT
        sys.system_id,
        sys.system_name,
        sys.region
      FROM systems sys
      JOIN system_site_summary summary ON summary.system_id = sys.system_id
      WHERE sys.system_id = $systemId
    `,
    { $systemId: id },
  );
  if (!summary) return;

  appState.originSystemId = normalizeSystemId(summary.system_id);
  if (!appState.originSystemId) return;

  appState.selectedSystemId = appState.originSystemId;
  appState.originSystemLabel = String(summary.system_name || summary.system_id);
  appState.suppressSearchClear = true;
  el.searchInput.value = appState.originSystemLabel;
  el.searchSuggestions.hidden = true;
  el.searchSuggestions.innerHTML = '';
  el.searchInput.setAttribute('aria-expanded', 'false');
  appState.suggestionIndex = -1;
  updateRadiusInputValidity();
  renderSystemDetail(appState.originSystemId);
  queueMicrotask(() => {
    appState.suppressSearchClear = false;
  });
}


export function clearOriginSystem() {
  appState.originSystemId = null;
  appState.originSystemLabel = "";
}


export function getSelectedOrigin() {
  if (!appState.originSystemId) return null;
  return getAllSystemSummaries().find((system) => Number(system.system_id) === Number(appState.originSystemId));
}


export function refreshActiveSystem() {
  if (appState.originSystemId) renderSystemDetail(appState.originSystemId);
}

