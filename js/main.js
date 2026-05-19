import { appState } from './core/state.js';
import { bindEvents } from './app/events.js';
import { initFilterDefaults } from './app/filters.js';
import { loadDatabase } from './db/connection.js';
import { loadStats, loadRegions } from './db/systems.js';
import { loadOreReference, loadEcosystemsCurated, loadPlanetTypes } from './data/reference.js';
import { buildSystemFuelProspectIndex } from './domain/fuel.js';
import { setStatus } from './ui/status.js';
import { showLoader, updateLoader, hideLoader } from './ui/loader.js';
import { el } from './core/dom.js';
function showBootError(error) {
  console.error(error);
  const message = error?.message || String(error);
  if (el.statusTitle) {
    setStatus("error", "Could not load database", message);
  }
  if (el.detailEmpty) {
    el.detailEmpty.hidden = false;
    el.detailContent.hidden = true;
    el.detailEmpty.textContent = message;
  }
  updateLoader("Could not load database", message);
}

export async function boot() {
  showLoader("Loading database");
  updateLoader("Loading database", "Starting SQL engine and fetching frontier.sqlite (~62 MB)…");
  try {
    if (!el.searchInput || !el.statusTitle) {
      throw new Error("Page DOM not ready — reload with Cmd+Shift+R.");
    }
    bindEvents();
    initFilterDefaults();
    await Promise.all([loadDatabase(), loadOreReference(), loadEcosystemsCurated(), loadPlanetTypes()]);
    updateLoader("Indexing", "Loading stats and regions…");
    loadStats();
    loadRegions();
    setStatus("ready", "The index is open", "Name a system, choose it from the list, and let the Guide gossip about what waits nearby.");
    hideLoader();
    // Heavy pass over all comet sites — do not block the “ready” state.
    setTimeout(() => {
      try {
        buildSystemFuelProspectIndex();
      } catch (error) {
        console.warn("Water Ice scout index skipped:", error);
      }
    }, 0);
  } catch (error) {
    showBootError(error);
  }
}

boot();
