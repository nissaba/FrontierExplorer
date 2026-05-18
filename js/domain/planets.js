import { appState } from '../core/state.js';
import { EVE_PLANET_TYPE_ORDER } from '../config/constants.js';
import { parseTags } from '../core/tags.js';
import { countBy } from '../core/collections.js';
import { escapeHtml } from '../core/html.js';
import { formatNumber } from '../core/format.js';
import { HEAT_INDEX_K, LIGHT_SECOND_METERS, METERS_PER_AU } from '../config/constants.js';
import { queryRows, queryOne } from '../db/connection.js';
import { normalizeSystemId } from '../core/ids.js';
import { getSystemPlanets, getSystemStar } from '../db/planets.js';
import { getLandscapeObjectsForSystem } from '../db/landscape.js';
export function filterPlanetTags(tags, side = null) {
  return tags.filter((tag) => {
    if (["belt", "trojan", "inner", "outer", "non_zero_danger_level"].includes(tag)) return false;
    if (side === "inner" && tag.includes("outer") && !tag.includes("inner")) return false;
    if (side === "outer" && tag.includes("inner") && !tag.includes("outer")) return false;
    if (side === "inner" && !tag.includes("inner") && !tag.endsWith("_host")) return false;
    if (side === "outer" && !tag.includes("outer") && !tag.endsWith("_host")) return false;
    return true;
  });
}


export function inferEvePlanetType(tagsJson, side = null) {
  const tags = filterPlanetTags(parseTags(tagsJson), side);
  const text = tags.join(" ").toLowerCase();

  if (/ice_super|ice_giant|icy|_icy/.test(text)) return "Ice";
  if (/\blava/.test(text)) return "Lava";
  if (/plasma/.test(text)) return "Plasma";
  if (/temperate/.test(text)) return "Temperate";
  if (/rocky/.test(text)) return "Barren";
  if (/ocean/.test(text)) return "Ocean";
  if (/gas_giant|gas_super|puffy/.test(text)) return "Gas";
  if (/storm|super_host/.test(text)) return "Storm";
  if (/shattered/.test(text)) return "Shattered";
  return "Unknown";
}


export function formatEvePlanetLabel(type) {
  if (!type || type === "Unknown") return null;
  if (type === "Ice" || type === "Gas") return `${type} planet`;
  return type;
}


export function starmapPlanetMap(systemId) {
  const map = new Map();
  for (const planet of getSystemPlanets(systemId)) {
    map.set(Number(planet.planet_item_id), planet);
  }
  return map;
}


export function hasReliableStarData(star) {
  return star?.star_temp_source === "sde_mapstars";
}


export function renderPlanetDetailsBlock(planet, planetIndex, star) {
  const typeName = planet.planet_type_name;
  const label = planetLabelFromTypeName(typeName);
  const orbitMeta = renderPlanetOrbitMeta(planet, planetIndex, star);

  return `
    <li class="planet-summary-item planet-summary-item--detailed">
      <details class="planet-details" open>
        <summary class="planet-details-summary">
          <strong class="planet-type-label ${planetTypeClass(typeName)}">${escapeHtml(label)}</strong>
        </summary>
        <div class="planet-details-body">${orbitMeta}</div>
      </details>
    </li>
  `;
}


export function planetLabelFromTypeName(typeName) {
  if (!typeName) return "Unknown";
  const types = appState.planetTypesRef?.types || {};
  const entry = Object.values(types).find((row) => row.key === typeName);
  return entry?.label || formatEvePlanetLabel(typeName);
}


export function formatStarTemperatureK(tempK) {
  const value = Number(tempK);
  if (!Number.isFinite(value)) return null;
  const rounded = Math.round(value / 10) * 10;
  return rounded.toLocaleString("en-US").replace(/,/g, " ");
}


export function formatOrbitAu(orbitAu) {
  const value = Number(orbitAu);
  if (!Number.isFinite(value)) return null;
  if (value < 10) return value.toFixed(2);
  if (value < 100) return value.toFixed(1);
  return value.toFixed(0);
}


export function formatExternalTemp(externalTemp) {
  const value = Number(externalTemp);
  if (!Number.isFinite(value)) return null;
  return value.toFixed(1);
}


export function renderStarSummary(star) {
  if (!hasReliableStarData(star) || star.star_temp_k == null) return "";

  const spectral = star.star_spectral ? `${star.star_spectral} Star` : "Star";
  const tempLabel = formatStarTemperatureK(star.star_temp_k);
  const tempText = tempLabel ? ` (${tempLabel} K)` : "";

  return `
    <div class="system-star-meta">
      <span class="system-star-label">${escapeHtml(spectral)}${escapeHtml(tempText)}</span>
    </div>
  `;
}


export function renderPlanetOrbitMeta(planet, planetIndex, star = null) {
  const orbitAu = formatOrbitAu(planet.orbit_au);
  const heatValue =
    planet.external_temp ??
    (planet.orbit_m && star?.star_luminosity_solar
      ? externalHeatIndex(planet.orbit_m, star.star_luminosity_solar)
      : null);
  const externalTemp = formatExternalTemp(heatValue);
  const parts = [];

  if (orbitAu) {
    parts.push(`<span class="planet-orbit-meta">Planet ${planetIndex} orbit: ${escapeHtml(orbitAu)} AU</span>`);
  }
  if (externalTemp && hasReliableStarData(star)) {
    parts.push(`<span class="planet-temp-meta">External Temp: ${escapeHtml(externalTemp)}</span>`);
  }
  if (!parts.length) return "";

  return `<div class="planet-orbit-block">${parts.join("")}</div>`;
}


export function planetTypeClass(type) {
  return `planet-type--${String(type).toLowerCase()}`;
}


export function landscapeObjectLabel(objectType) {
  if (objectType === "asteroidBelts") return "Landscape zone";
  if (objectType === "trojans") return "Trojan";
  return humanizeTag(objectType);
}


export function planetHostLabelFromTags(tagsJson, side = null) {
  return formatEvePlanetLabel(inferEvePlanetType(tagsJson, side)) || "Landscape host tags (not a planet)";
}


export function buildPlanetHostRows(landscapeObjects) {
  const rows = [];

  for (const obj of landscapeObjects) {
    const ringTags = parseTags(obj.tags_json);
    const ring = ringTags.includes("inner") ? "Inner" : ringTags.includes("outer") ? "Outer" : "";
    const objectLabel = landscapeObjectLabel(obj.object_type);
    const iceTagged = Number(obj.is_ice_tagged) === 1;

    if (obj.object_type === "asteroidBelts") {
      const hostRole = (side) =>
        ring ? `${ring} landscape · ${side} anchor` : `Landscape · ${side} anchor`;
      if (obj.inner_planet_id) {
        rows.push({
          objectLabel,
          role: hostRole("inner"),
          planetId: Number(obj.inner_planet_id),
          planetType: inferEvePlanetType(obj.tags_json, "inner"),
          hostType: planetHostLabelFromTags(obj.tags_json, "inner"),
          ice: iceTagged,
        });
      }
      if (obj.outer_planet_id) {
        rows.push({
          objectLabel,
          role: hostRole("outer"),
          planetId: Number(obj.outer_planet_id),
          planetType: inferEvePlanetType(obj.tags_json, "outer"),
          hostType: planetHostLabelFromTags(obj.tags_json, "outer"),
          ice: iceTagged,
        });
      }
      continue;
    }

    if (obj.object_type === "trojans" && obj.planet_id) {
      const side = ringTags.includes("inner") ? "inner" : ringTags.includes("outer") ? "outer" : null;
      rows.push({
        objectLabel,
        role: ring ? `${ring} trojan host` : "Trojan host",
        planetId: Number(obj.planet_id),
        planetType: inferEvePlanetType(obj.tags_json, side),
        hostType: planetHostLabelFromTags(obj.tags_json, side),
        ice: iceTagged,
      });
    }
  }

  return rows;
}


export function summarizeUniquePlanets(hostRows) {
  const byId = new Map();

  for (const row of hostRows) {
    const entry = byId.get(row.planetId) || {
      planetId: row.planetId,
      planetTypes: new Set(),
      roles: new Set(),
      ice: false,
    };
    entry.planetTypes.add(row.planetType);
    entry.roles.add(row.role);
    entry.ice = entry.ice || row.ice || row.planetType === "Ice";
    byId.set(row.planetId, entry);
  }

  return [...byId.values()].sort((a, b) => a.planetId - b.planetId);
}


export function renderSystemPlanetsSection(systemId) {
  const planets = getSystemPlanets(systemId);
  const star = getSystemStar(systemId);
  const landscape = getLandscapeObjectsForSystem(systemId);

  if (!planets.length) {
    if (!landscape.length) {
      return `
        <section class="report-card planet-card">
          <h3>Planets</h3>
          <p class="planet-lede">No planet records for this system in the extract.</p>
        </section>
      `;
    }

    const hostRows = buildPlanetHostRows(landscape);
    const uniquePlanets = summarizeUniquePlanets(hostRows);
    const typeCounts = countBy(hostRows.map((row) => row.planetType).filter((type) => type !== "Unknown"));
    const typeChips = EVE_PLANET_TYPE_ORDER.filter((type) => typeCounts[type])
      .map((type) => {
        const label = planetLabelFromTypeName(type);
        return `<span class="chip ${planetTypeClass(type)}">${escapeHtml(label)} ×${typeCounts[type]}</span>`;
      })
      .join("");

    const uniqueList = uniquePlanets
      .map((planet) => {
        const primaryType = [...planet.planetTypes].sort(
          (a, b) => EVE_PLANET_TYPE_ORDER.indexOf(a) - EVE_PLANET_TYPE_ORDER.indexOf(b),
        )[0];
        const label = planetLabelFromTypeName(primaryType);
        return `
          <li class="planet-summary-item">
            <strong class="planet-type-label ${planetTypeClass(primaryType)}">${escapeHtml(label)}</strong>
            <span class="planet-roles">${escapeHtml([...planet.roles].join(" · "))}</span>
          </li>
        `;
      })
      .join("");

    return `
      <section class="report-card planet-card">
        <h3>Planets &amp; map sites</h3>
        <p class="planet-lede">Starmap planets missing from this build — map sites are listed below. Rebuild frontier.sqlite to restore planet types.</p>
        ${typeChips ? `<div class="chips">${typeChips}</div>` : ""}
        <ul class="planet-summary-list anchor-list">${uniqueList}</ul>
      </section>
    `;
  }

  const typeCounts = countBy(planets.map((planet) => planet.planet_type_name));
  const planetTypeLines = EVE_PLANET_TYPE_ORDER.filter((type) => typeCounts[type])
    .concat(
      Object.keys(typeCounts).filter(
        (type) => !EVE_PLANET_TYPE_ORDER.includes(type) && type !== "Unknown",
      ),
    )
    .map((type) => {
      const label = planetLabelFromTypeName(type);
      return `<li class="planet-type-count ${planetTypeClass(type)}">${formatNumber(typeCounts[type])} ${escapeHtml(label)}</li>`;
    })
    .join("");

  const planetList = planets
    .map((planet, index) => renderPlanetDetailsBlock(planet, index + 1, star))
    .join("");

  return `
    <section class="report-card planet-card">
      <h3>Planets</h3>
      ${renderStarSummary(star)}
      <div class="planet-map-summary">
        <p class="planet-count-line">${formatNumber(planets.length)} planet${planets.length === 1 ? "" : "s"}</p>
        ${planetTypeLines ? `<ul class="planet-type-count-list">${planetTypeLines}</ul>` : ""}
      </div>
      <p class="planet-lede compact">Map sites are in the list below; each may note <b>Near planet #N</b> (starmap order) when xyz is known.</p>
      <ul class="planet-summary-list">${planetList}</ul>
    </section>
  `;
}


