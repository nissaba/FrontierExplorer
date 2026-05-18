import { appState } from '../core/state.js';
import { el } from '../core/dom.js';
import {
  findSearchMatches,
  hideSearchSuggestions,
  highlightSuggestion,
  onSearchInput,
  renderSearchSuggestions,
} from './search.js';
import {
  chooseOriginSystem,
  clearOriginSystem,
  refreshActiveSystem,
} from './session.js';
import { ensureRadiusInputValue, initFilterDefaults } from './filters.js';
import { resetDetailPanel } from '../ui/system-detail.js';
export function bindEvents() {
  el.searchInput.addEventListener("input", onSearchInput);

  el.searchInput.addEventListener("keydown", (event) => {
    const items = el.searchSuggestions.querySelectorAll(".suggestion-item");
    if (!items.length) {
      if (event.key === "Enter") {
        event.preventDefault();
        const exact = findSearchMatches(el.searchInput.value.trim(), 1)[0];
        if (exact) chooseOriginSystem(exact.system_id);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      appState.suggestionIndex = Math.min(appState.suggestionIndex + 1, items.length - 1);
      highlightSuggestion(appState.suggestionIndex);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      appState.suggestionIndex = Math.max(appState.suggestionIndex - 1, 0);
      highlightSuggestion(appState.suggestionIndex);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const pick = items[appState.suggestionIndex] || items[0];
      if (pick) chooseOriginSystem(Number(pick.dataset.systemId));
    } else if (event.key === "Escape") {
      hideSearchSuggestions();
    }
  });

  el.searchInput.addEventListener("blur", () => {
    setTimeout(hideSearchSuggestions, 150);
  });

  el.searchInput.addEventListener("focus", () => {
    if (el.searchInput.value.trim()) renderSearchSuggestions();
  });

  el.regionSelect.addEventListener("change", refreshActiveSystem);
  el.candidateRadius.addEventListener("input", refreshActiveSystem);
  el.candidateRadius.addEventListener("change", refreshActiveSystem);
  el.candidateRadius.addEventListener("blur", () => {
    ensureRadiusInputValue();
    refreshActiveSystem();
  });
  el.cometOnly.addEventListener("change", refreshActiveSystem);
  el.combatOnly.addEventListener("change", refreshActiveSystem);
  el.innerBeltOnly.addEventListener("change", refreshActiveSystem);
  el.outerBeltOnly.addEventListener("change", refreshActiveSystem);

  el.resetButton.addEventListener("click", () => {
    el.searchInput.value = "";
    clearOriginSystem();
    hideSearchSuggestions();
    resetDetailPanel();
    el.regionSelect.value = "";
    el.candidateRadius.value = "100";
    el.cometOnly.checked = false;
    el.combatOnly.checked = false;
    el.innerBeltOnly.checked = false;
    el.outerBeltOnly.checked = false;
  });
}

