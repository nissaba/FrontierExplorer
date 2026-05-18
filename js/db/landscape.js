import { queryRows } from './connection.js';
import { normalizeSystemId } from '../core/ids.js';
export function getLandscapeObjectsForSystem(systemId) {
  const id = normalizeSystemId(systemId);
  if (!id) return [];

  return queryRows(
    `
      SELECT
        object_type,
        object_id,
        inner_planet_id,
        outer_planet_id,
        planet_id,
        inner_radius,
        outer_radius,
        tags_json,
        is_ice_tagged
      FROM landscape_objects
      WHERE system_id = $systemId
      ORDER BY object_type, object_id
    `,
    { $systemId: id },
  );
}

