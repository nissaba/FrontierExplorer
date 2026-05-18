import { METERS_PER_AU, METERS_PER_LIGHT_YEAR, LIGHT_SECOND_METERS, HEAT_INDEX_K } from '../config/constants.js';
export function distanceMeters3d(a, b) {
  const dx = Number(a.x) - Number(b.x);
  const dy = Number(a.y) - Number(b.y);
  const dz = Number(a.z) - Number(b.z);
  if (![dx, dy, dz].every(Number.isFinite)) return null;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}


export function nearestPlanetToPoint(point, planetsById) {
  let nearest = null;

  for (const [planetId, planet] of planetsById) {
    if (planet.planet_x == null || planet.planet_y == null || planet.planet_z == null) continue;
    const distanceM = distanceMeters3d(point, {
      x: planet.planet_x,
      y: planet.planet_y,
      z: planet.planet_z,
    });
    if (distanceM == null) continue;
    if (!nearest || distanceM < nearest.distanceM) {
      nearest = {
        planetId: Number(planetId),
        planet,
        distanceM,
        distanceAu: distanceM / METERS_PER_AU,
      };
    }
  }

  return nearest;
}


export function externalHeatIndex(distanceM, luminositySolar) {
  const distance = Number(distanceM);
  const luminosity = Number(luminositySolar);
  if (!Number.isFinite(distance) || distance <= 0) return null;
  if (!Number.isFinite(luminosity) || luminosity <= 0) return null;
  const distanceLightSeconds = distance / LIGHT_SECOND_METERS;
  if (distanceLightSeconds <= 0) return null;
  const angle = HEAT_INDEX_K * 2 * Math.PI * Math.sqrt(luminosity) / distanceLightSeconds;
  return (100 * (2 / Math.PI)) * Math.atan(angle);
}


export function distanceLy(a, b) {
  const dx = Number(a.center_x) - Number(b.center_x);
  const dy = Number(a.center_y) - Number(b.center_y);
  const dz = Number(a.center_z) - Number(b.center_z);
  return Math.sqrt(dx * dx + dy * dy + dz * dz) / METERS_PER_LIGHT_YEAR;
}

