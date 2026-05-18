import { getSystemPlanets } from '../db/planets.js';
import { nearestPlanetToPoint } from '../core/astro.js';
import { displayEcosystemName } from './ecosystems.js';
export function buildLandscapeByKey(landscapeObjects) {
  const map = new Map();
  for (const obj of landscapeObjects) {
    map.set(`${obj.object_type}:${obj.object_id}`, obj);
  }
  return map;
}

/** Starmap order: planet_item_id → 1-based index (Planet 1, Planet 2, …). */

export function buildPlanetIndexById(systemId) {
  const map = new Map();
  getSystemPlanets(systemId).forEach((planet, index) => {
    map.set(Number(planet.planet_item_id), index + 1);
  });
  return map;
}


export function formatNearPlanetIndex(planetId, planetIndexById) {
  const index = planetIndexById.get(Number(planetId));
  return index ? `Near planet #${index}` : null;
}

/** Which starmap planet a site is tied to (trojan host, else nearest by xyz). */

export function resolveSitePlanetId(site, planetsById, landscapeByKey = null) {
  if (site.object_type === "trojans" && landscapeByKey) {
    const obj = landscapeByKey.get(`trojans:${site.object_id}`);
    const hostId = obj?.planet_id != null && obj.planet_id !== "" ? Number(obj.planet_id) : null;
    if (hostId != null && planetsById.has(hostId)) return hostId;
  }

  if (site.x == null || site.y == null || site.z == null) return null;
  const nearest = nearestPlanetToPoint({ x: site.x, y: site.y, z: site.z }, planetsById);
  return nearest ? nearest.planetId : null;
}

/** Starmap planet # for a map site (landscape trojan host, else nearest by xyz). */

export function siteNearPlanetNote(site, planetsById, landscapeByKey = null, planetIndexById = null) {
  if (!planetIndexById?.size) return null;
  const planetId = resolveSitePlanetId(site, planetsById, landscapeByKey);
  return planetId != null ? formatNearPlanetIndex(planetId, planetIndexById) : null;
}


export function sortSitesByPlanet(sites, planetsById, landscapeByKey, planetIndexById) {
  const planetOrder = (site) => {
    const planetId = resolveSitePlanetId(site, planetsById, landscapeByKey);
    return planetId != null ? (planetIndexById.get(planetId) ?? 9999) : 9999;
  };
  const siteLabel = (site) =>
    displayEcosystemName(site) || site.ecosystem_name || String(site.site_id);

  return [...sites].sort((a, b) => {
    const byPlanet = planetOrder(a) - planetOrder(b);
    if (byPlanet !== 0) return byPlanet;
    const byName = siteLabel(a).localeCompare(siteLabel(b), "en", { sensitivity: "base" });
    if (byName !== 0) return byName;
    return Number(a.site_id) - Number(b.site_id);
  });
}

