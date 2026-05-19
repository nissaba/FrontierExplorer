import { el } from '../core/dom.js';
import { DEFAULT_RADIUS_LY, MAX_CANDIDATE_RADIUS_LY } from '../config/constants.js';
import { parseTags } from '../core/tags.js';

/** Parse radius field without rewriting the input (safe while typing). */
export function parseRadiusInput(value = el.candidateRadius?.value) {
  const raw = String(value ?? "").trim();
  if (raw === "") {
    return { valid: false, ly: DEFAULT_RADIUS_LY, message: "Enter a number greater than 0 ly." };
  }
  if (!/^\d+$/.test(raw)) {
    return {
      valid: false,
      ly: DEFAULT_RADIUS_LY,
      message: "Invalid characters — use a whole number of light-years.",
    };
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return { valid: false, ly: DEFAULT_RADIUS_LY, message: "Radius must be greater than 0 ly." };
  }
  const ly = Math.min(MAX_CANDIDATE_RADIUS_LY, Math.floor(parsed));
  return { valid: true, ly, message: "" };
}

export function updateRadiusInputValidity() {
  if (!el.candidateRadius) return parseRadiusInput();

  const parsed = parseRadiusInput();
  const input = el.candidateRadius;
  const hint = el.candidateRadiusHint;

  if (parsed.valid) {
    input.classList.remove("field-invalid");
    input.removeAttribute("aria-invalid");
    input.setCustomValidity("");
    if (hint) {
      hint.hidden = true;
      hint.textContent = "";
    }
  } else {
    input.classList.add("field-invalid");
    input.setAttribute("aria-invalid", "true");
    input.setCustomValidity(parsed.message);
    if (hint) {
      hint.hidden = false;
      hint.textContent = parsed.message;
    }
  }

  return parsed;
}

/** On blur: clamp valid values; restore default if still invalid. */
export function commitRadiusInputOnBlur() {
  if (!el.candidateRadius) return DEFAULT_RADIUS_LY;

  const parsed = parseRadiusInput();
  if (parsed.valid) {
    el.candidateRadius.value = String(parsed.ly);
  } else {
    el.candidateRadius.value = String(DEFAULT_RADIUS_LY);
  }
  return updateRadiusInputValidity().ly ?? DEFAULT_RADIUS_LY;
}

export function getCandidateRadiusLy() {
  const parsed = parseRadiusInput();
  return parsed.ly;
}

export function getSearchFilterState() {
  const radius = parseRadiusInput();
  return {
    region: el.regionSelect.value,
    radiusLy: radius.ly,
    radiusMessage: radius.message,
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
  if (el.candidateRadius && !String(el.candidateRadius.value).trim()) {
    el.candidateRadius.value = String(DEFAULT_RADIUS_LY);
  }
  updateRadiusInputValidity();
}
