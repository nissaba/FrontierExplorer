import { appState } from '../core/state.js';
import { normalizeSystemId } from '../core/ids.js';
import { queryRows, queryOne } from './connection.js';
export function getSystemStar(systemId) {
  const id = normalizeSystemId(systemId);
  if (!id) return null;

  return queryOne(
    `
      SELECT
        star_temp_k,
        star_spectral,
        star_luminosity_solar,
        star_temp_source
      FROM systems
      WHERE system_id = $systemId
    `,
    { $systemId: id },
  );
}


export function getSystemPlanets(systemId) {
  const id = normalizeSystemId(systemId);
  if (!id) return [];

  const positionCols = appState.systemPlanetsHasPositions
    ? "planet_x, planet_y, planet_z"
    : "NULL AS planet_x, NULL AS planet_y, NULL AS planet_z";

  return queryRows(
    `
      SELECT
        planet_item_id,
        planet_type_enum,
        planet_type_name,
        orbit_m,
        orbit_au,
        external_temp,
        ${positionCols}
      FROM system_planets
      WHERE system_id = $systemId
      ORDER BY sort_order, planet_item_id
    `,
    { $systemId: id },
  );
}

