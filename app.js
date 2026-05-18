const DB_URL = "./data/frontier.sqlite";
const ORE_REFERENCE_URL = "./data/ore_reference.json";
const ECOSYSTEMS_CURATED_URL = "./data/ecosystems_curated.json";
const PLANET_TYPES_URL = "./data/planet_types.json";
const SQL_WASM = "https://cdn.jsdelivr.net/npm/sql.js@1.12.0/dist/";
const MAX_CANDIDATE_RADIUS_LY = 10000;
const DEFAULT_RADIUS_LY = 100;
const COMET_ECOSYSTEMS = new Set([8, 9, 10]);
const METERS_PER_AU = 149597870700;
const METERS_PER_LIGHT_YEAR = 9.4607304725808e15;
const LIGHT_SECOND_METERS = 299792458;
const HEAT_INDEX_K = 100;

let oreReference = null;
let ecosystemsCurated = null;
let planetTypesRef = null;

const LIKELIHOOD_TIER = {
  LOW: { label: "Low", score: 0.2 },
  MEDIUM: { label: "Medium", score: 0.5 },
  HIGH: { label: "High", score: 0.9 },
};
const SITE_TAXONOMY = [
  {
    keywords: ["Blue Drift"],
    category: "Outer Belt Site Type",
    classification: "Dangerous / Combat Resource",
    activity: "Clear the hostile variant, then mine what remains.",
    yield: "The combat-heavy branch of the outer-belt family — bring shields and low expectations.",
    description:
      "Blue Drift is the outer-belt site type that remembered to bring guns. The Guide classifies it as Shale/Grove's less sociable sibling.",
  },
  {
    keywords: ["Shale", "Grove"],
    category: "Outer Belt Site Type",
    classification: "Industrial / Resource",
    activity: "Mine and salvage in the long chill of the outer ring.",
    yield: "Named outer-belt prospects in the extract — not a guarantee of what your hold will contain.",
    description:
      "Shale and Grove mark cold-ring water and ice scouting on the map. Whether the rocks cooperate is between you and your laser.",
  },
  {
    keywords: ["Drone Nest", "Osa Drone", "Minor Drone"],
    category: "PvE Combat Dungeon",
    classification: "Dangerous / Hostile AI Present",
    activity: "Ship combat, destroying drone hulls, and wreck salvaging.",
    yield: "Drone components, raw salvage, and basic progression items.",
    description:
      "Active hive structures controlled by rogue feral drones. Highly dangerous for unshielded or light harvesting vessels. Demands a combat-fitted hull to clear.",
  },
  {
    keywords: ["Surveyor", "Okryda Surveyor"],
    category: "Elite Combat / Patrol Node",
    classification: "High Threat",
    activity: "Tactical combat against specialized patrolling scanner units.",
    yield: "High-tier tech salvage and advanced ship module components.",
    description:
      "Automated reconnaissance points guarded by elite Feral AI surveyors. These units feature enhanced tracking and will aggressively defend their spatial boundary.",
  },
  {
    keywords: [
      "Inculcator",
      "Ruined Inculcator",
      "Razed Inculcator",
      "Inculcator Wreckage",
      "Inculcator Foundation",
    ],
    category: "Structural Remnants & Faction Wreckage",
    classification: "Combat / Scavenging",
    activity: "Clearing localized structural defenses and harvesting broken hulls.",
    yield: "Fused alloy plating, shattered tech relics, and structural components.",
    description:
      "Debris fields and decaying remains of ancient Inculcator installations. Often guarded by automated defense grids or lingering scavengers.",
  },
  {
    keywords: ["Archive Wreckage", "Silo Block", "Unmoored Silo"],
    category: "Exploration & Hackable Data Vaults",
    classification: "Scavenging / Logic Hack",
    activity: "Specialized data extraction, cracking containers, and looting vaults.",
    yield: "Encrypted data drives, blueprint copies, and utility software strings.",
    description:
      "Drifting data vaults and storage silos uncoupled from lost orbital platforms. Approach carefully — some still object to being opened.",
  },
  {
    keywords: ["Ferris", "Ferris Asteroid Field"],
    category: "Metal-Rich Mining Node",
    classification: "Industrial / Resource",
    activity: "Strip mining and heavy mineral extraction.",
    yield: "High-density iron, heavy metals, and manufacturing structural alloys.",
    description:
      "A concentrated cluster of dense, metal-rich planetary debris. Primary source for structural metals required to print basic hulls, armor plates, and kinetic ammunition.",
  },
  {
    keywords: ["Feldspar", "Crystal Belt"],
    category: "Base Mineral Deposit",
    classification: "Industrial / Resource",
    activity: "Basic mineral laser mining.",
    yield: "Base silicates, carbonaceous compounds, and common industrial crystals.",
    description:
      "Standard elemental debris belt containing widespread crystalline structures and silicates. Vital for foundational component printing and everyday module construction.",
  },
  {
    keywords: ["Mining Platform", "Crumbling Mining Platform"],
    category: "Abandoned Industrial Infrastructure",
    classification: "Scavenging / Mining Hybrid",
    activity: "Salvaging derelict industrial equipment and loose surface materials.",
    yield: "Pre-processed ore packets, scrap metal, and baseline industrial machinery.",
    description:
      "A defunct, unanchored mining station slowly tearing apart under local planetary gravity. Offers immediate salvage opportunities for passing industrial ships.",
  },
  {
    keywords: ["Shipyard", "Shipyard Ruins", "Destroyed Shipyard"],
    category: "Static System Hub",
    classification: "Landmarks / Spatial Anchors",
    activity: "Point of interest navigation, structural exploration, and heavy salvaging.",
    yield: "System-wide map data, heavy hull plating ruins, and historic data logs.",
    description:
      "The skeletal, permanent superstructure of a system-defining shipyard. Serves as a major navigational anchor point and the structural heart of local space history.",
  },
  {
    keywords: ["L-Point", "Lagrange", "Lagrange Point"],
    category: "Orbital Gravitational Equilibrium Coordinate",
    classification: "Infrastructure / Base-Building Plot",
    activity: "Establishing persistent player bases, defensive turrets, and Tribe Network Nodes.",
    yield: "Spatial dominance and localized grid network connectivity.",
    description:
      "A gravimetric dead-zone ideal for anchoring heavy permanent structures. This coordinate acts as a staging ground for collaborative player outposts and defense nets.",
  },
  {
    keywords: ["Stargate", "Stargate Site"],
    category: "Interstellar Jump Infrastructure",
    classification: "Transit Choke-point",
    activity: "Cross-system travel, line-of-sight navigation, and tactical fleet staging.",
    yield: "Strategic positional advantage and gate traffic routing.",
    description:
      "The vital interstellar gateway connecting systems across the Frontier. Highly trafficked and often used as a defensive bottleneck or ambush vector.",
  },
];

let db;
/** Set after DB load — older frontier.sqlite builds lack planet_x/y/z. */
let systemPlanetsHasPositions = false;
let selectedSystemId;
let originSystemId;
let originSystemLabel = "";
let suggestionIndex = -1;
let allSystemSummaries;
/** @type {Map<number, { max: number, avg: number, count: number }> | null} */
let systemFuelProspectById = null;
let suppressSearchClear = false;

const el = {
  statusCard: document.querySelector("#status-card"),
  statusTitle: document.querySelector("#status-title"),
  statusDetail: document.querySelector("#status-detail"),
  stats: {
    systems: document.querySelector("#stat-systems"),
    sites: document.querySelector("#stat-sites"),
    innerBelts: document.querySelector("#stat-inner-belts"),
    outerBelts: document.querySelector("#stat-outer-belts"),
  },
  searchInput: document.querySelector("#search-input"),
  searchSuggestions: document.querySelector("#search-suggestions"),
  regionSelect: document.querySelector("#region-select"),
  candidateRadius: document.querySelector("#candidate-radius"),
  cometOnly: document.querySelector("#comet-only"),
  combatOnly: document.querySelector("#combat-only"),
  innerBeltOnly: document.querySelector("#inner-belt-only"),
  outerBeltOnly: document.querySelector("#outer-belt-only"),
  resetButton: document.querySelector("#reset-button"),
  detailTitle: document.querySelector("#detail-title"),
  detailRegion: document.querySelector("#detail-region"),
  detailEmpty: document.querySelector("#detail-empty"),
  detailContent: document.querySelector("#detail-content"),
  nearbySystems: document.querySelector("#nearby-systems"),
  systemReport: document.querySelector("#system-report"),
  siteListNotes: document.querySelector("#site-list-notes"),
  siteList: document.querySelector("#site-list"),
};

function setStatus(type, title, detail) {
  el.statusCard.classList.remove("ready", "error");
  if (type) el.statusCard.classList.add(type);
  el.statusTitle.textContent = title;
  el.statusDetail.textContent = detail;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function formatBeltNearbySummary(row) {
  const inner = Number(row.inner_belt_site_count || 0);
  const outer = Number(row.outer_belt_site_count || 0);
  const parts = [];
  if (inner) parts.push(`${formatNumber(inner)} inner`);
  if (outer) parts.push(`${formatNumber(outer)} outer`);
  return parts.length ? parts.join(" · ") : "tags politely absent";
}

function queryRows(sql, params = {}) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];

  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }

  stmt.free();
  return rows;
}

function queryOne(sql, params = {}) {
  return queryRows(sql, params)[0];
}

function getAllSystemSummaries() {
  if (!allSystemSummaries) {
    allSystemSummaries = queryRows(`
      SELECT
        sys.system_id,
        sys.system_name,
        sys.region,
        sys.center_x,
        sys.center_y,
        sys.center_z,
        summary.site_count,
        summary.comet_site_count,
        summary.combat_site_count,
        summary.inner_belt_site_count,
        summary.outer_belt_site_count
      FROM systems sys
      JOIN system_site_summary summary ON summary.system_id = sys.system_id
      WHERE sys.center_x IS NOT NULL
        AND sys.center_y IS NOT NULL
        AND sys.center_z IS NOT NULL
    `);
  }
  return allSystemSummaries;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

function normalizeSystemId(systemId) {
  const id = Number(systemId);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  return id;
}

function parseTags(tagsJson) {
  try {
    return JSON.parse(tagsJson || "[]");
  } catch {
    return [];
  }
}

function humanizeTag(tag) {
  return String(tag)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function countBy(values) {
  return values.reduce((counts, value) => {
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

function topCounts(values, limit = 8) {
  return Object.entries(countBy(values))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit);
}

function ecosystemFamily(name) {
  const text = String(name || "").toLowerCase();
  if (text.includes("blue drift")) return "Blue Drift";
  if (text.includes("natural world")) return "Natural World";
  if (text.includes("broken world")) return "Broken World";
  if (text.includes("transitional")) return "Transitional";
  return "Other";
}

function sourceTypeName(name) {
  const text = String(name || "").toLowerCase();
  if (text.includes("blue drift")) return "Blue Drift";
  if (text.includes("shale")) return "Shale";
  if (text.includes("grove")) return "Grove";
  return null;
}

function outerBeltFuelType(site) {
  const fromName = sourceTypeName(site.ecosystem_name);
  if (fromName) return fromName;
  if (Number(site.ecosystem_id) === 8) return "Shale";
  if (Number(site.ecosystem_id) === 9) return "Grove";
  if (Number(site.ecosystem_id) === 10) return "Blue Drift";
  return null;
}

function formatPercent(probability) {
  return `${Math.round(Number(probability || 0) * 100)}%`;
}

const WATER_ICE_SCOUT_TOOLTIP =
  "Qualitative water/ice scouting read from outer Shale, Grove, and Drift site names on the map — not a guarantee in your hold.";

/** Map heuristic water-ice scout score (0–1) to No / Low / Medium / High. */
function fuelChanceFromScore(pFuel) {
  const score = Number(pFuel);
  if (!Number.isFinite(score) || score <= 0) {
    return { id: "none", label: "No" };
  }
  if (score < 0.4) return { id: "low", label: "Low" };
  if (score < 0.7) return { id: "medium", label: "Medium" };
  return { id: "high", label: "High" };
}

function formatWaterIceBadge(chance) {
  const tier = chance?.id === "none" || !chance ? "No" : chance.label;
  const tierId = chance?.id === "none" || !chance ? "none" : chance.id;
  return `<span class="nearby-fuel nearby-fuel--${escapeAttr(tierId)}" title="${escapeAttr(WATER_ICE_SCOUT_TOOLTIP)}">Water Ice: ${escapeHtml(tier)} chance</span>`;
}

function formatFuelChanceBadge(chance) {
  return formatWaterIceBadge(chance);
}

function tierScore(tier) {
  return LIKELIHOOD_TIER[tier]?.score ?? LIKELIHOOD_TIER.MEDIUM.score;
}

function formatTier(tier) {
  const entry = LIKELIHOOD_TIER[tier];
  if (!entry) return "—";
  return `${entry.label} (${formatPercent(entry.score)})`;
}

function inferEnvironmentalFactors(site, type) {
  const tags = parseTags(site.tags_json).map((tag) => String(tag).toLowerCase());
  const icy = tags.some((tag) => tag.includes("icy") || tag.includes("ice"));

  let stress = "LOW";
  let skin = "LOW";
  let venting = "LOW";

  if (type === "Blue Drift") {
    stress = "HIGH";
    skin = "MEDIUM";
    venting = "HIGH";
  } else if (type === "Grove") {
    stress = "HIGH";
    skin = "MEDIUM";
    venting = "MEDIUM";
  } else if (type === "Shale") {
    stress = "LOW";
    skin = "HIGH";
    venting = "LOW";
  }

  if (icy && venting !== "HIGH") {
    venting = venting === "LOW" ? "LOW" : "MEDIUM";
  }

  return { stress, skin, venting };
}

function buildSystemFuelProspectIndex() {
  const rows = queryRows(`
    SELECT
      system_id,
      ecosystem_id,
      object_type,
      object_id,
      tags_json,
      is_comet_candidate
    FROM sites
    WHERE is_comet_candidate = 1
  `);

  const map = new Map();
  for (const site of rows) {
    const model = computeFuelScan(site);
    if (!model) continue;

    const systemId = Number(site.system_id);
    const entry = map.get(systemId) || { max: 0, sum: 0, count: 0 };
    entry.max = Math.max(entry.max, model.pFuel);
    entry.sum += model.pFuel;
    entry.count += 1;
    map.set(systemId, entry);
  }

  for (const entry of map.values()) {
    entry.avg = entry.count ? Math.round((entry.sum / entry.count) * 100) / 100 : 0;
  }

  systemFuelProspectById = map;
}

function getSystemFuelProspect(systemId) {
  if (!systemFuelProspectById) return null;
  return systemFuelProspectById.get(Number(systemId)) || null;
}

function formatNearbyFuelProspect(row) {
  const prospect = getSystemFuelProspect(row.system_id);
  if (!prospect?.count) {
    return formatFuelChanceBadge(
      Number(row.comet_site_count) > 0 ? { id: "low", label: "Low" } : { id: "none", label: "No" },
    );
  }
  return formatFuelChanceBadge(fuelChanceFromScore(prospect.max));
}

function computeFuelScan(site) {
  if (Number(site.is_comet_candidate) !== 1) return null;

  const type = outerBeltFuelType(site);
  const factors = inferEnvironmentalFactors(site, type);
  const pStress = tierScore(factors.stress);
  const pSkin = tierScore(factors.skin);
  const pVenting = tierScore(factors.venting);
  const pFuel = Math.round(((pStress + pSkin + pVenting) / 3) * 100) / 100;

  return {
    type,
    beltLabel: displayEcosystemName(site),
    pStress,
    pSkin,
    pVenting,
    stressTier: factors.stress,
    skinTier: factors.skin,
    ventingTier: factors.venting,
    pFuel,
  };
}

function renderFuelBeltComparison(fuelSites) {
  const beltMap = new Map();
  for (const entry of fuelSites) {
    const key = `${entry.site.object_type}:${entry.site.object_id}`;
    if (!beltMap.has(key)) beltMap.set(key, []);
    beltMap.get(key).push(entry);
  }

  const multi = [...beltMap.values()].filter((group) => group.length > 1);
  if (!multi.length) return "";

  const notes = multi
    .map((group) => {
      const label = group[0].model.beltLabel;
      const parts = group
        .map(
          ({ site, model }) =>
            `${model.type || "site"} on ${model.beltLabel}: ${formatPercent(model.pFuel)} (${formatTier(model.stressTier)} stress, ${formatTier(model.ventingTier)} venting)`,
        )
        .join(" · ");
      return `<li><strong>${escapeHtml(label)}</strong> — ${escapeHtml(parts)}</li>`;
    })
    .join("");

  return `
    <div class="fuel-belt-compare">
      <strong>One belt, several personalities</strong>
      <p>The map sometimes stacks Shale and Grove on the same outer belt — roommates with different thermostats. Compare what pilots report: quiet Shale beside restless Grove often means thin comet ore beside richer finds, or so the bar insists.</p>
      <ul>${notes}</ul>
    </div>
  `;
}

function renderFuelModelSection(sites) {
  const fuelSites = sites
    .map((site) => ({ site, model: computeFuelScan(site) }))
    .filter((entry) => entry.model)
    .sort((a, b) => b.model.pFuel - a.model.pFuel || a.site.site_id - b.site.site_id);

  if (!fuelSites.length) {
    return "";
  }

  const best = fuelSites[0].model;
  const rows = fuelSites
    .map(({ site, model }) => {
      const type = model.type || "Outer type";
      return `
        <tr>
          <td>${escapeHtml(site.ecosystem_name || type)}</td>
          <td>${escapeHtml(model.beltLabel)}</td>
          <td>${formatTier(model.stressTier)}</td>
          <td>${formatTier(model.skinTier)}</td>
          <td>${formatTier(model.ventingTier)}</td>
          <td><strong>${formatPercent(model.pFuel)}</strong></td>
        </tr>
      `;
    })
    .join("");

  return `
    <section class="report-card fuel-model-card">
      <h3>Water Ice scouting folklore (heuristic)</h3>
      <p class="fuel-model-lede">
        Prospect % averages three invented omens — grooves (thermal stress), flaking (skin depth), and venting (Drift trails) — each rated Low, Medium, or High.
        <strong>Best reading in this system: ${formatPercent(best.pFuel)}.</strong>
        Derived from outer-belt site names in the extract; not, the Guide stresses, a promise from the universe.
      </p>
      ${renderFuelBeltComparison(fuelSites)}
      <div class="fuel-model-legend">
        <span><b>Grooves</b> — Grove and Drift fidget; bare Shale sits still.</span>
        <span><b>Flaking</b> — Shale sheds; Grove and Drift flake with decorum.</span>
        <span><b>Venting</b> — Drift runs hot; Shale prefers the cold shoulder.</span>
      </div>
      <div class="fuel-table-wrap">
        <table class="fuel-model-table">
          <thead>
            <tr>
              <th>Site</th>
              <th>Belt</th>
              <th>Grooves</th>
              <th>Flaking</th>
              <th>Venting</th>
              <th>Prospect %</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>
  `;
}

function taxonomyKeywordMatches(name, keyword) {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(String(name || ""));
}

function taxonomyForName(name) {
  return SITE_TAXONOMY.find((entry) =>
    entry.keywords.some((keyword) => taxonomyKeywordMatches(name, keyword)),
  );
}

function buildLandscapeByKey(landscapeObjects) {
  const map = new Map();
  for (const obj of landscapeObjects) {
    map.set(`${obj.object_type}:${obj.object_id}`, obj);
  }
  return map;
}

/** Starmap order: planet_item_id → 1-based index (Planet 1, Planet 2, …). */
function buildPlanetIndexById(systemId) {
  const map = new Map();
  getSystemPlanets(systemId).forEach((planet, index) => {
    map.set(Number(planet.planet_item_id), index + 1);
  });
  return map;
}

function formatNearPlanetIndex(planetId, planetIndexById) {
  const index = planetIndexById.get(Number(planetId));
  return index ? `Near planet #${index}` : null;
}

/** Which starmap planet a site is tied to (trojan host, else nearest by xyz). */
function resolveSitePlanetId(site, planetsById, landscapeByKey = null) {
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
function siteNearPlanetNote(site, planetsById, landscapeByKey = null, planetIndexById = null) {
  if (!planetIndexById?.size) return null;
  const planetId = resolveSitePlanetId(site, planetsById, landscapeByKey);
  return planetId != null ? formatNearPlanetIndex(planetId, planetIndexById) : null;
}

function sortSitesByPlanet(sites, planetsById, landscapeByKey, planetIndexById) {
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

async function loadOreReference() {
  const response = await fetch(ORE_REFERENCE_URL);
  if (!response.ok) {
    throw new Error(`Could not load ore reference (${response.status})`);
  }
  oreReference = await response.json();
}

async function loadEcosystemsCurated() {
  const response = await fetch(ECOSYSTEMS_CURATED_URL);
  if (!response.ok) {
    console.warn(`Curated ecosystem guide not loaded (${response.status})`);
    ecosystemsCurated = null;
    return;
  }
  ecosystemsCurated = await response.json();
}

function curatedEcosystemMeta(ecosystemId) {
  return ecosystemsCurated?.ecosystems?.[String(ecosystemId)] || null;
}

function displayEcosystemName(site) {
  const curated = curatedEcosystemMeta(site.ecosystem_id);
  if (curated?.label_jeu) return curated.label_jeu;
  return site.ecosystem_name || shortSiteTypeName(site, ecosystemMeta(site.ecosystem_id));
}

function renderCuratedNote(site) {
  const curated = curatedEcosystemMeta(site.ecosystem_id);
  if (!curated?.description_courte && !curated?.contenu_connu) return "";

  const parts = [];
  if (curated.description_courte) {
    parts.push(`<p>${escapeHtml(curated.description_courte)}</p>`);
  }
  if (curated.contenu_connu) {
    parts.push(`<small><strong>Pilots claim to find:</strong> ${escapeHtml(curated.contenu_connu)}</small>`);
  }
  const subtitle = curated.nom_interne
    ? `<span class="curated-internal-name">${escapeHtml(curated.nom_interne)}</span>`
    : "";

  return `
    <div class="curated-note">
      <strong>Field entry</strong>
      ${subtitle}
      ${parts.join("")}
    </div>
  `;
}

function oreZoneForEcosystem(ecosystemId) {
  const meta = oreReference?.ecosystems?.[String(ecosystemId)];
  if (!meta) return null;
  const zone = oreReference.zones?.[meta.oreZone];
  return { meta, zone };
}

function formatOreList(zone) {
  if (!zone?.ores?.length) return "";
  return zone.ores.map((ore) => ore.name).join(", ");
}

function ecosystemMeta(ecosystemId) {
  return oreReference?.ecosystems?.[String(ecosystemId)] || null;
}

function oreZoneLabel(oreZone) {
  if (oreZone === "hot") return "The furnace lane (inner / hot)";
  if (oreZone === "cold") return "The long chill (outer / cold)";
  if (oreZone === "mixed") return "A belt of many moods";
  if (oreZone === "transitional") return "Between the rings";
  return "Uncharted temperament";
}

function isTrojanSite(site, meta) {
  return site.object_type === "trojans" || meta?.ring === "trojan";
}

function trojanThermalBand(site) {
  const tags = parseTags(site.tags_json).map((tag) => tag.toLowerCase());
  const hasOuter = tags.includes("outer");
  const hasInner = tags.includes("inner");
  const hasTemperateHost = tags.some((tag) => tag === "temperate_host" || tag.includes("temperate"));

  // Outer-ring trojans sit in the cold band; inner trojans near the star skew hot.
  if (hasOuter) return "cold";
  if (hasInner && hasTemperateHost) return "temperate";
  if (hasInner) return "hot";
  if (hasTemperateHost) return "temperate";
  return "temperate";
}

function trojanOreZoneLabel(site) {
  const band = trojanThermalBand(site);
  if (band === "hot") return "Sun-adjacent trojan (hot)";
  if (band === "cold") return "Outer-ring trojan (cold)";
  return "Temperate trojan (between rings)";
}

function oreZoneLabelForSite(site, meta) {
  if (isTrojanSite(site, meta)) return trojanOreZoneLabel(site);
  return oreZoneLabel(meta?.oreZone);
}

function zoneForTrojanBand(band) {
  if (band === "hot") return oreReference?.zones?.hot;
  if (band === "cold") return oreReference?.zones?.cold;
  return null;
}

function rumorLead() {
  return '<span class="ore-rumor">The Guide murmurs</span>';
}

function ringLabel(site, meta) {
  const tags = parseTags(site.tags_json);
  if (site.object_type === "trojans" || meta?.ring === "trojan") return "Trojan";
  if (tags.includes("outer") || meta?.ring === "outer") return "Outer ring";
  if (tags.includes("inner") || meta?.ring === "inner") return "Inner ring";
  if (meta?.ring === "transitional") return "Transitional belt";
  return "";
}

function shortSiteTypeName(site, meta) {
  const curated = curatedEcosystemMeta(site.ecosystem_id);
  if (curated?.label_jeu) return curated.label_jeu;
  if (meta?.labelJeu) return meta.labelJeu;
  if (meta?.siteType) return meta.siteType;
  const name = site.ecosystem_name || "";
  const fromName = sourceTypeName(name);
  if (fromName) return fromName;
  const parts = name.split(" - ").map((p) => p.trim()).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : name || "Unknown site";
}

function renderOreHaystackNote(sites) {
  const trojans = sites.filter((s) => s.object_type === "trojans");
  const comets = sites.filter((s) => Number(s.is_comet_candidate) === 1);
  if (!trojans.length) return "";

  const outerTrojans = trojans.filter((s) => trojanThermalBand(s) === "cold");
  const innerTrojans = trojans.filter((s) => trojanThermalBand(s) === "hot");
  const temperateTrojans = trojans.filter((s) => trojanThermalBand(s) === "temperate");

  if (comets.length && !outerTrojans.length && !temperateTrojans.length) return "";

  const outerIcy = outerTrojans.filter((s) => {
    const tags = parseTags(s.tags_json).map((t) => t.toLowerCase());
    return tags.some((t) => t.includes("icy") || t.includes("ice"));
  });

  let rumor = "";
  if (outerTrojans.length && innerTrojans.length && temperateTrojans.length) {
    rumor =
      "A full trojan menagerie: sun-hugging points run hot, outer hosts run cold, and temperate tags between the rings are where bar stories about mixed rocks actually begin.";
  } else if (temperateTrojans.length) {
    rumor = `${temperateTrojans.length} temperate trojan${temperateTrojans.length === 1 ? "" : "s"} sit in the in-between — the Guide has heard of both hot and cold finds, which is not the same as proof.`;
  } else if (outerTrojans.length && !innerTrojans.length) {
    rumor = "Outer-ring hosts favor the cold family; expecting Char by the star here would be optimistic.";
  } else if (innerTrojans.length && !outerTrojans.length) {
    rumor = "Inner tags hug the furnace; comet-style cold ore would be a surprise — not impossible, merely rude.";
  } else {
    rumor = "Read the tags: inner leans hot, outer leans cold, temperate hosts occupy the diplomatic middle.";
  }

  return `
    <div class="ore-haystack-note">
      <strong>Trojan haystacks (bar-stool chapter)</strong>
      <p>
        ${trojans.length} trojan point${trojans.length === 1 ? "" : "s"} in this system
        ${comets.length ? ", plus Shale, Grove, or Drift names on the map." : ", though the map declines to name outer Water Ice scout sites."}
        ${outerIcy.length ? ` ${outerIcy.length} outer trojan${outerIcy.length === 1 ? "" : "s"} wear icy hosts — cold ore is the gossip there.` : ""}
        <em>${rumor}</em>
      </p>
    </div>
  `;
}

function trojanOreZoneBody(site) {
  const band = trojanThermalBand(site);
  const tags = parseTags(site.tags_json).map((tag) => tag.toLowerCase());
  const icyHost = tags.some((tag) => tag.includes("icy") || tag.includes("ice"));

  if (band === "hot") {
    const hot = formatOreList(oreReference?.zones?.hot);
    return `${rumorLead()} this point carries an <b>inner</b> tag and therefore lives uncomfortably close to the star. <b>${escapeHtml(hot || "Char, Slag, Ingot")}</b> are the polite expectation; cold comet ore would need a very good excuse.`;
  }

  if (band === "cold") {
    const cold = formatOreList(oreReference?.zones?.cold);
    const icyNote = icyHost ? " The map also marks an icy host — the Guide approves of consistency." : "";
    return `${rumorLead()} this trojan rides an <b>outer-ring</b> host where the long chill rules. <b>${escapeHtml(cold || "Comet, Dewdrop, Soot, Glint, Ember")}</b> are the likely choir; inner-belt heat should not be counted on.${escapeHtml(icyNote)}`;
  }

  return `${rumorLead()} a <b>temperate-host</b> tag places this rock in the diplomatic belt — beyond the furnace, short of the outer dark. Bar pilots insist both hot and cold asteroids may turn up; the Guide recommends mining many rocks until something interesting appears.`;
}

function renderOreZoneNote(site) {
  const info = oreZoneForEcosystem(site.ecosystem_id);
  if (!info) return "";

  const { meta, zone } = info;
  const title = shortSiteTypeName(site, meta);
  const ring = ringLabel(site, meta);
  const zoneLabel = oreZoneLabelForSite(site, meta);

  let body = "";
  if (isTrojanSite(site, meta) && meta.haystack) {
    body = trojanOreZoneBody(site);
  } else {
    const band = isTrojanSite(site, meta) ? trojanThermalBand(site) : null;
    const ores = band ? formatOreList(zoneForTrojanBand(band)) : formatOreList(zone);
    if (ores) {
      body = `The extract suggests <b>${escapeHtml(ores)}</b> at this ${escapeHtml((ring || "site").toLowerCase())} — the belt may serve something else entirely once you arrive.`;
    } else if (meta.haystack) {
      body = `${rumorLead()} temperate trojans between the rings are where pilots tell stories about mixed rocks. Mine many asteroids; the Guide offers no warranty.`;
    } else {
      body = "The rock mix here is shy about commitments — warp in and let the asteroids speak for themselves.";
    }
  }

  return `<div class="ore-zone-note">
      <p class="ore-zone-title"><strong>${escapeHtml(zoneLabel)}</strong> · ${escapeHtml(title)}</p>
      <p class="ore-zone-body">${body}</p>
    </div>`;
}

function updateSiteListNotes(sites) {
  const note = renderOreHaystackNote(sites);
  if (!note) {
    el.siteListNotes.innerHTML = "";
    el.siteListNotes.hidden = true;
    return;
  }
  el.siteListNotes.innerHTML = note;
  el.siteListNotes.hidden = false;
}

/** EVE-style planet types (PI / EF-Map naming). Inferred from landscape host tags. */
const EVE_PLANET_TYPE_ORDER = ["Ice", "Temperate", "Barren", "Lava", "Plasma", "Gas", "Storm", "Ocean", "Shattered"];

function filterPlanetTags(tags, side = null) {
  return tags.filter((tag) => {
    if (["belt", "trojan", "inner", "outer", "non_zero_danger_level"].includes(tag)) return false;
    if (side === "inner" && tag.includes("outer") && !tag.includes("inner")) return false;
    if (side === "outer" && tag.includes("inner") && !tag.includes("outer")) return false;
    if (side === "inner" && !tag.includes("inner") && !tag.endsWith("_host")) return false;
    if (side === "outer" && !tag.includes("outer") && !tag.endsWith("_host")) return false;
    return true;
  });
}

function inferEvePlanetType(tagsJson, side = null) {
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

function formatEvePlanetLabel(type) {
  if (!type || type === "Unknown") return null;
  if (type === "Ice" || type === "Gas") return `${type} planet`;
  return type;
}

function starmapPlanetMap(systemId) {
  const map = new Map();
  for (const planet of getSystemPlanets(systemId)) {
    map.set(Number(planet.planet_item_id), planet);
  }
  return map;
}

function hasReliableStarData(star) {
  return star?.star_temp_source === "sde_mapstars";
}

function formatPlanetAnchorNote(planetItemId, planetsById) {
  const id = Number(planetItemId);
  if (!id) return "No planet anchor — free-floating on the map";

  const planet = planetsById.get(id);
  if (planet) {
    const label = planetLabelFromTypeName(planet.planet_type_name);
    return `Orbits ${label}`;
  }

  return "Landscape anchor only (no starmap planet)";
}

function landscapeObjectSites(sites, objectType, objectId) {
  return sites.filter(
    (site) => site.object_type === objectType && Number(site.object_id) === Number(objectId),
  );
}

function landscapeLagrangeRolePrefix(tags) {
  const ring = tags.includes("inner") ? "Inner" : tags.includes("outer") ? "Outer" : "";
  return ring ? `${ring} Lagrange (L-point)` : "Lagrange (L-point)";
}

function siteSummaryForObject(sites, objectType, objectId) {
  const matching = landscapeObjectSites(sites, objectType, objectId);
  if (!matching.length) {
    return objectType === "asteroidBelts" ? "No named sites in extract" : "No named sites in extract";
  }

  return topCounts(
    matching
      .map((site) => {
        const name = displayEcosystemName(site) || sourceTypeName(site.ecosystem_name) || siteTypeLabel(site.object_type);
        if (Number(site.is_combat_candidate) === 1) return `${name} (Blue Drift)`;
        return name;
      })
      .filter(Boolean),
    5,
  )
    .map(([name, count]) => `${count}× ${name}`)
    .join(", ");
}

function getSystemMoons(systemId) {
  const id = normalizeSystemId(systemId);
  if (!id) return [];

  return queryRows(
    `
      SELECT
        moon_item_id,
        parent_planet_id,
        type_id,
        orbit_index,
        sort_order
      FROM system_moons
      WHERE system_id = $systemId
      ORDER BY parent_planet_id, sort_order, moon_item_id
    `,
    { $systemId: id },
  );
}

function moonsByPlanetId(moons) {
  const map = new Map();
  for (const moon of moons) {
    const parentId = Number(moon.parent_planet_id);
    if (!map.has(parentId)) map.set(parentId, []);
    map.get(parentId).push(moon);
  }
  return map;
}

function getSystemLagrangePoints(systemId) {
  const id = normalizeSystemId(systemId);
  if (!id) return { byPlanetId: new Map(), unassigned: [] };

  const rows = queryRows(
    `
      SELECT
        lagrange_item_id,
        parent_planet_id,
        type_id,
        orbit_au,
        sort_order
      FROM system_lagrange_points
      WHERE system_id = $systemId
      ORDER BY parent_planet_id, sort_order, lagrange_item_id
    `,
    { $systemId: id },
  );

  const byPlanetId = new Map();
  const unassigned = [];
  for (const row of rows) {
    const parentId = row.parent_planet_id;
    if (parentId == null || parentId === "") {
      unassigned.push(row);
      continue;
    }
    const planetId = Number(parentId);
    if (!byPlanetId.has(planetId)) byPlanetId.set(planetId, []);
    byPlanetId.get(planetId).push(row);
  }
  return { byPlanetId, unassigned };
}

function formatLagrangeLabel(point) {
  const typeHint = point.type_id ? ` · game type ${point.type_id}` : "";
  return `Lagrange · #${formatNumber(point.lagrange_item_id)}${typeHint}`;
}

function landscapeSiteRole(obj) {
  const tags = parseTags(obj.tags_json);
  const ring = tags.includes("inner") ? "Inner" : tags.includes("outer") ? "Outer" : "";
  if (obj.object_type === "trojans") {
    return ring ? `${ring} trojan` : "Trojan";
  }
  return "";
}

/** Human label for a landscape host id (starmap planet, or non-planet anchor). */
function landscapeHostLabel(hostId, planetsById) {
  const id = Number(hostId);
  if (!id) return null;
  const planet = planetsById.get(id);
  if (planet) return planetLabelFromTypeName(planet.planet_type_name);
  return "star or off-map body";
}

function distanceMeters3d(a, b) {
  const dx = Number(a.x) - Number(b.x);
  const dy = Number(a.y) - Number(b.y);
  const dz = Number(a.z) - Number(b.z);
  if (![dx, dy, dz].every(Number.isFinite)) return null;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function objectSiteCentroid(sites, objectType, objectId) {
  const points = sites.filter(
    (site) =>
      site.object_type === objectType &&
      Number(site.object_id) === Number(objectId) &&
      site.x != null &&
      site.y != null &&
      site.z != null,
  );
  if (!points.length) return null;

  const sum = points.reduce(
    (acc, site) => {
      acc.x += Number(site.x);
      acc.y += Number(site.y);
      acc.z += Number(site.z);
      return acc;
    },
    { x: 0, y: 0, z: 0 },
  );
  const count = points.length;
  return { x: sum.x / count, y: sum.y / count, z: sum.z / count, siteCount: count };
}

function nearestPlanetToPoint(point, planetsById) {
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

function formatProximityAu(distanceAu) {
  const value = Number(distanceAu);
  if (!Number.isFinite(value)) return null;
  if (value < 0.01) return "<0.01";
  if (value < 10) return value.toFixed(2);
  if (value < 100) return value.toFixed(1);
  return value.toFixed(0);
}

function landscapeAnchorFootnote(obj, planetsById) {
  const innerId = obj.inner_planet_id != null && obj.inner_planet_id !== "" ? Number(obj.inner_planet_id) : null;
  const outerId = obj.outer_planet_id != null && obj.outer_planet_id !== "" ? Number(obj.outer_planet_id) : null;
  const parts = [];
  if (innerId != null) {
    const label = landscapeHostLabel(innerId, planetsById);
    if (label) parts.push(`landscape inner anchor: ${label}`);
  }
  if (outerId != null) {
    const label = landscapeHostLabel(outerId, planetsById);
    if (label) parts.push(`landscape outer anchor: ${label}`);
  }
  return parts.length ? parts.join(" · ") : "";
}

/**
 * Lagrange (landscape asteroidBelts) / trojan labels — Lagrange uses site xyz vs planet centre.
 */
function landscapeSiteRoleDetailed(obj, planetsById, spatialNearest = null) {
  const tags = parseTags(obj.tags_json);
  const ring = tags.includes("inner") ? "Inner" : tags.includes("outer") ? "Outer" : "";
  const ringPrefix = ring ? `${ring} ` : "";

  if (obj.object_type === "trojans") {
    const host = landscapeHostLabel(obj.planet_id, planetsById);
    let line = ringPrefix ? `${ringPrefix}trojan` : "Trojan";
    if (host) line += ` — landscape host: ${host}`;
    if (spatialNearest) {
      const au = formatProximityAu(spatialNearest.distanceAu);
      const nearLabel = planetLabelFromTypeName(spatialNearest.planet.planet_type_name);
      line += ` · site cluster ~${au} AU from ${nearLabel} centre`;
    }
    return line;
  }

  return "";
}

function landscapeObjectKind(objectType) {
  if (objectType === "trojans") return "trojan";
  if (objectType === "asteroidBelts") return "lagrange";
  return "other";
}

function buildLandscapeSiteRow(obj, sites, planetsById) {
  const starmapIds = new Set(planetsById.keys());
  const hostIds = [obj.inner_planet_id, obj.outer_planet_id, obj.planet_id]
    .filter((value) => value != null && value !== "")
    .map((value) => Number(value));
  const uniqueHostIds = [...new Set(hostIds)];
  const starmapHostIds = uniqueHostIds.filter((id) => starmapIds.has(id));
  const nonStarmapHostIds = uniqueHostIds.filter((id) => !starmapIds.has(id));

  const centroid = objectSiteCentroid(sites, obj.object_type, obj.object_id);
  const spatialNearest = centroid ? nearestPlanetToPoint(centroid, planetsById) : null;

  const objectKind = landscapeObjectKind(obj.object_type);
  let groupPlanetIds = [];
  if (objectKind === "lagrange" && spatialNearest) {
    groupPlanetIds = [spatialNearest.planetId];
  } else if (objectKind === "trojan" && starmapHostIds.length) {
    groupPlanetIds = starmapHostIds;
  } else if (starmapHostIds.length) {
    groupPlanetIds = starmapHostIds;
  }

  return {
    objectKind,
    role: landscapeSiteRoleDetailed(obj, planetsById, spatialNearest),
    siteSummary: siteSummaryForObject(sites, obj.object_type, obj.object_id),
    starmapHostIds,
    nonStarmapHostIds,
    spatialNearest,
    groupPlanetIds,
    isOther: groupPlanetIds.length === 0,
  };
}

function groupLandscapeSitesByPlanet(landscapeObjects, sites, planetsById) {
  const byPlanetId = new Map();
  const other = [];

  for (const planetId of planetsById.keys()) {
    byPlanetId.set(planetId, []);
  }

  for (const obj of landscapeObjects) {
    const row = buildLandscapeSiteRow(obj, sites, planetsById);
    if (row.isOther) {
      other.push(row);
      continue;
    }
    for (const planetId of row.groupPlanetIds) {
      if (!byPlanetId.has(planetId)) byPlanetId.set(planetId, []);
      byPlanetId.get(planetId).push(row);
    }
  }

  return { byPlanetId, other };
}

function formatMoonLabel(moon, fallbackIndex) {
  const orbitIndex = Number(moon.orbit_index);
  const indexLabel = Number.isFinite(orbitIndex) && orbitIndex > 0 ? orbitIndex : fallbackIndex + 1;
  const typeHint = moon.type_id ? ` · game type ${moon.type_id}` : "";
  return `Moon ${indexLabel} · #${formatNumber(moon.moon_item_id)}${typeHint}`;
}

function renderLandscapeSiteItem(row) {
  return `
    <li class="orbit-child-item">
      <strong>${escapeHtml(row.role)}</strong>
      <span class="planet-roles">Sites: ${escapeHtml(row.siteSummary)}</span>
    </li>
  `;
}

function renderLandscapeSiteGroup(heading, note, rows) {
  if (!rows.length) return "";
  const list = rows.map((row) => renderLandscapeSiteItem(row)).join("");
  return `
    <div class="orbit-child-group">
      <h5 class="orbit-child-heading">${escapeHtml(heading)}</h5>
      ${note ? `<p class="orbit-child-note">${escapeHtml(note)}</p>` : ""}
      <ul class="orbit-child-list">${list}</ul>
    </div>
  `;
}

function renderPlanetDetailsBlock(planet, planetIndex, star) {
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

function renderOtherOrbitalBodiesSection(otherRows) {
  if (!otherRows.length) return "";

  const list = otherRows
    .map(
      (row) => `
        <li class="orbit-child-item orbit-child-item--other">
          <strong>${escapeHtml(row.role)}</strong>
          <span class="planet-roles">Sites: ${escapeHtml(row.siteSummary)}</span>
        </li>
      `,
    )
    .join("");

  return `
    <h4 class="planet-subheading">Other orbital bodies</h4>
    <p class="planet-lede compact">Lagrange (landscape asteroidBelts), and trojans whose anchors do not match a planet on the starmap (e.g. off-map host ids).</p>
    <ul class="planet-summary-list orbit-other-list">${list}</ul>
  `;
}

function planetLabelFromTypeName(typeName) {
  if (!typeName) return "Unknown";
  const types = planetTypesRef?.types || {};
  const entry = Object.values(types).find((row) => row.key === typeName);
  return entry?.label || formatEvePlanetLabel(typeName);
}

async function loadPlanetTypes() {
  const response = await fetch(PLANET_TYPES_URL);
  if (!response.ok) {
    throw new Error(`Could not load ${PLANET_TYPES_URL}`);
  }
  planetTypesRef = await response.json();
}

function getSystemStar(systemId) {
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

function getSystemPlanets(systemId) {
  const id = normalizeSystemId(systemId);
  if (!id) return [];

  const positionCols = systemPlanetsHasPositions
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

function formatStarTemperatureK(tempK) {
  const value = Number(tempK);
  if (!Number.isFinite(value)) return null;
  const rounded = Math.round(value / 10) * 10;
  return rounded.toLocaleString("en-US").replace(/,/g, " ");
}

function formatOrbitAu(orbitAu) {
  const value = Number(orbitAu);
  if (!Number.isFinite(value)) return null;
  if (value < 10) return value.toFixed(2);
  if (value < 100) return value.toFixed(1);
  return value.toFixed(0);
}

function formatExternalTemp(externalTemp) {
  const value = Number(externalTemp);
  if (!Number.isFinite(value)) return null;
  return value.toFixed(1);
}

function externalHeatIndex(distanceM, luminositySolar) {
  const distance = Number(distanceM);
  const luminosity = Number(luminositySolar);
  if (!Number.isFinite(distance) || distance <= 0) return null;
  if (!Number.isFinite(luminosity) || luminosity <= 0) return null;
  const distanceLightSeconds = distance / LIGHT_SECOND_METERS;
  if (distanceLightSeconds <= 0) return null;
  const angle = HEAT_INDEX_K * 2 * Math.PI * Math.sqrt(luminosity) / distanceLightSeconds;
  return (100 * (2 / Math.PI)) * Math.atan(angle);
}

function renderStarSummary(star) {
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

function renderPlanetOrbitMeta(planet, planetIndex, star = null) {
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

function planetTypeClass(type) {
  return `planet-type--${String(type).toLowerCase()}`;
}

function getLandscapeObjectsForSystem(systemId) {
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

function landscapeObjectLabel(objectType) {
  if (objectType === "asteroidBelts") return "Landscape zone";
  if (objectType === "trojans") return "Trojan";
  return humanizeTag(objectType);
}

function planetHostLabelFromTags(tagsJson, side = null) {
  return formatEvePlanetLabel(inferEvePlanetType(tagsJson, side)) || "Landscape host tags (not a planet)";
}

function buildPlanetHostRows(landscapeObjects, sites = []) {
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

function summarizeUniquePlanets(hostRows) {
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

function renderSystemPlanetsSection(systemId) {
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

    const hostRows = buildPlanetHostRows(landscape, []);
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


function makeSystemReport(summary, sites) {
  const cometSites = sites.filter((site) => Number(site.is_comet_candidate) === 1);
  const combatSites = sites.filter((site) => Number(site.is_combat_candidate) === 1);
  const asteroidSites = sites.filter((site) => site.object_type === "asteroidBelts");
  const trojanSites = sites.filter((site) => site.object_type === "trojans");
  const innerBeltSites = asteroidSites.filter((site) => parseTags(site.tags_json).includes("inner"));
  const outerBeltSites = asteroidSites.filter((site) => parseTags(site.tags_json).includes("outer"));
  const tags = sites.flatMap((site) => parseTags(site.tags_json));
  const uniqueTags = [...new Set(tags)];
  const familyCounts = topCounts(sites.map((site) => ecosystemFamily(site.ecosystem_name)), 5);
  const taxonomyCounts = topCounts(
    sites.map((site) => taxonomyForName(site.ecosystem_name)?.category).filter(Boolean),
    5,
  );
  const importantTags = uniqueTags.filter((tag) =>
    /icy|ice|temperate|rocky|gas|puffy|plasma|super|outer|inner|host/i.test(tag),
  );

  const outerTypeText = cometSites.length
    ? topCounts(cometSites.map((site) => sourceTypeName(site.ecosystem_name)).filter(Boolean))
        .map(([name, count]) => `${count}× ${name}`)
        .join(", ")
    : "The extract names none";

  const combatText = combatSites.length
    ? `${combatSites.length} Blue Drift marker${combatSites.length === 1 ? "" : "s"} — the disagreeable cousin of Water Ice scouting.`
    : "No Blue Drift in the files — possibly peaceful, possibly undocumented.";

  const innerRingText = innerBeltSites.length
    ? `${innerBeltSites.length} inner-ring site${innerBeltSites.length === 1 ? "" : "s"} in the furnace lane.`
    : "No inner tags — the star's neighborhood goes unlisted.";

  const outerRingText = outerBeltSites.length
    ? `${outerBeltSites.length} outer-ring site${outerBeltSites.length === 1 ? "" : "s"} in the long chill.`
    : "No outer tags — the rim keeps its secrets.";

  const livingNote =
    innerBeltSites.length && outerBeltSites.length
      ? `This system offers both furnace-lane sites (${innerBeltSites.length}) and rimward ones (${outerBeltSites.length}) — a rare menu.`
      : innerBeltSites.length
        ? `Only inner-ring sites (${innerBeltSites.length}) — hot ore country, short on comet romance.`
        : outerBeltSites.length
          ? `Only outer-ring sites (${outerBeltSites.length})${cometSites.length ? `, with ${outerTypeText} on the manifest` : ""}.`
          : trojanSites.length >= 2 && asteroidSites.length >= 3
            ? "Map sites and trojans abound, yet the extract forgot to say inner or outer — verify before you commit a freighter."
            : "Thin tagging in the extract; treat site gossip as provisional until you've warped in and looked.";

  return `
    <section class="report-card">
      <h3>At a glance</h3>
      <p>${escapeHtml(livingNote)}</p>
      <div class="report-grid">
        <div><span>Map sites</span><strong>${formatNumber(asteroidSites.length)}</strong></div>
        <div><span>Trojans</span><strong>${formatNumber(trojanSites.length)}</strong></div>
        <div><span>Inner ring</span><strong>${escapeHtml(innerRingText)}</strong></div>
        <div><span>Outer ring</span><strong>${escapeHtml(outerRingText)}</strong></div>
        <div><span>Outer Types in Data</span><strong>${escapeHtml(outerTypeText)}</strong></div>
        <div><span>Blue Drift</span><strong>${escapeHtml(combatText)}</strong></div>
      </div>
    </section>

    ${renderSystemPlanetsSection(summary.system_id)}

    ${renderFuelModelSection(sites)}

    <section class="report-card">
      <h3>What sorts of places</h3>
      <div class="chips">
        ${familyCounts
          .map(([family, count]) => `<span class="chip">${escapeHtml(family)}: ${count}</span>`)
          .join("")}
      </div>
    </section>

    ${
      taxonomyCounts.length
        ? `<section class="report-card">
            <h3>Recognized site classes</h3>
            <div class="chips">
              ${taxonomyCounts
                .map(([category, count]) => `<span class="chip">${escapeHtml(category)}: ${count}</span>`)
                .join("")}
            </div>
          </section>`
        : ""
    }

    <section class="report-card">
      <h3>Tags the map admits to</h3>
      <div class="chips">
        ${(importantTags.length ? importantTags : uniqueTags)
          .slice(0, 18)
          .map((tag) => `<span class="chip">${escapeHtml(humanizeTag(tag))}</span>`)
          .join("")}
      </div>
    </section>
  `;
}

async function loadDatabase() {
  const SQL = await initSqlJs({
    locateFile: (file) => `${SQL_WASM}${file}`,
  });

  const response = await fetch(DB_URL);
  if (!response.ok) {
    throw new Error(`Could not fetch ${DB_URL}: ${response.status}`);
  }

  const bytes = await response.arrayBuffer();
  db = new SQL.Database(new Uint8Array(bytes));
  const planetColumns = queryRows(`PRAGMA table_info(system_planets)`);
  systemPlanetsHasPositions = planetColumns.some((row) => row.name === "planet_x");
}

function loadStats() {
  const stats = queryOne(`
    SELECT
      (SELECT COUNT(*) FROM systems) AS systems,
      (SELECT COUNT(*) FROM sites) AS sites,
      (SELECT COALESCE(SUM(inner_belt_site_count), 0) FROM system_site_summary) AS inner_belts,
      (SELECT COALESCE(SUM(outer_belt_site_count), 0) FROM system_site_summary) AS outer_belts
  `);

  el.stats.systems.textContent = formatNumber(stats.systems);
  el.stats.sites.textContent = formatNumber(stats.sites);
  el.stats.innerBelts.textContent = formatNumber(stats.inner_belts);
  el.stats.outerBelts.textContent = formatNumber(stats.outer_belts);
}

function loadRegions() {
  const regions = queryRows(`
    SELECT region
    FROM systems
    WHERE region IS NOT NULL AND region != ''
    GROUP BY region
    ORDER BY region COLLATE NOCASE
  `);

  el.regionSelect.insertAdjacentHTML(
    "beforeend",
    regions
      .map((row) => `<option value="${escapeHtml(row.region)}">${escapeHtml(row.region)}</option>`)
      .join(""),
  );
}

function matchScore(row, text) {
  const name = String(row.system_name || "").toLowerCase();
  const id = String(row.system_id);
  if (name === text || id === text) return 0;
  if (name.startsWith(text)) return 1;
  if (id.startsWith(text)) return 2;
  return 3;
}

function systemMatchesSearchFilters(row, filters = getSearchFilterState()) {
  if (filters.region && row.region !== filters.region) return false;
  if (filters.cometOnly && Number(row.comet_site_count) <= 0) return false;
  if (filters.combatOnly && Number(row.combat_site_count) <= 0) return false;
  if (filters.innerBeltOnly && Number(row.inner_belt_site_count) <= 0) return false;
  if (filters.outerBeltOnly && Number(row.outer_belt_site_count) <= 0) return false;
  return true;
}

function findSearchMatches(query, limit = 12) {
  const text = query.trim().toLowerCase();
  if (!text) return [];

  return getAllSystemSummaries()
    .filter((row) => systemMatchesSearchFilters(row))
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

function hideSearchSuggestions() {
  el.searchSuggestions.hidden = true;
  el.searchSuggestions.innerHTML = "";
  el.searchInput.setAttribute("aria-expanded", "false");
  suggestionIndex = -1;
}

function renderSearchSuggestions() {
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
  highlightSuggestion(suggestionIndex);
}

function highlightSuggestion(index) {
  const items = el.searchSuggestions.querySelectorAll(".suggestion-item");
  items.forEach((item, itemIndex) => {
    item.classList.toggle("active", itemIndex === index);
  });
}

function chooseOriginSystem(systemId) {
  const id = normalizeSystemId(systemId);
  if (id) setActiveSystem(id);
}

function setActiveSystem(systemId) {
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

  originSystemId = normalizeSystemId(summary.system_id);
  if (!originSystemId) return;

  selectedSystemId = originSystemId;
  originSystemLabel = String(summary.system_name || summary.system_id);
  suppressSearchClear = true;
  el.searchInput.value = originSystemLabel;
  hideSearchSuggestions();
  ensureRadiusInputValue();
  renderSystemDetail(originSystemId);
  queueMicrotask(() => {
    suppressSearchClear = false;
  });
}

function clearOriginSystem() {
  originSystemId = null;
  originSystemLabel = "";
}

function getSelectedOrigin() {
  if (!originSystemId) return null;
  return getAllSystemSummaries().find((system) => Number(system.system_id) === Number(originSystemId));
}

function readRadiusFromInput() {
  const raw = String(el.candidateRadius?.value ?? "").trim();
  if (!raw) return DEFAULT_RADIUS_LY;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return DEFAULT_RADIUS_LY;
  return Math.min(MAX_CANDIDATE_RADIUS_LY, Math.max(1, Math.floor(parsed)));
}

/** Commit default radius into the input so placeholder-only “100” still applies. */
function ensureRadiusInputValue() {
  if (!el.candidateRadius) return DEFAULT_RADIUS_LY;
  const ly = readRadiusFromInput();
  el.candidateRadius.value = String(ly);
  return ly;
}

function getCandidateRadiusLy() {
  return readRadiusFromInput();
}

function getSearchFilterState() {
  return {
    region: el.regionSelect.value,
    radiusLy: getCandidateRadiusLy(),
    cometOnly: el.cometOnly.checked,
    combatOnly: el.combatOnly.checked,
    innerBeltOnly: el.innerBeltOnly.checked,
    outerBeltOnly: el.outerBeltOnly.checked,
  };
}

function hasActiveSearchFilters(filters = getSearchFilterState()) {
  return Boolean(
    filters.region ||
      filters.cometOnly ||
      filters.combatOnly ||
      filters.innerBeltOnly ||
      filters.outerBeltOnly,
  );
}

function describeActiveSearchFilters(filters = getSearchFilterState()) {
  const parts = [];
  if (filters.region) parts.push(`region: ${filters.region}`);
  if (filters.cometOnly) parts.push("outer Water Ice scout sites");
  if (filters.combatOnly) parts.push("Blue Drift");
  if (filters.innerBeltOnly) parts.push("inner tag");
  if (filters.outerBeltOnly) parts.push("outer tag");
  return parts.join(" · ");
}

function siteMatchesSearchFilters(site, filters = getSearchFilterState()) {
  if (filters.cometOnly && Number(site.is_comet_candidate) !== 1) return false;
  if (filters.combatOnly && Number(site.is_combat_candidate) !== 1) return false;

  const tags = parseTags(site.tags_json);
  if (filters.innerBeltOnly && !tags.includes("inner")) return false;
  if (filters.outerBeltOnly && !tags.includes("outer")) return false;
  return true;
}

function filterSitesForDisplay(sites, filters = getSearchFilterState()) {
  if (!hasActiveSearchFilters(filters)) return sites;
  return sites.filter((site) => siteMatchesSearchFilters(site, filters));
}

function getRadiusFilteredRows(originOverride) {
  const origin = originOverride ?? getSelectedOrigin();
  if (!origin) return null;

  if (!origin.center_x && Number(origin.center_x) !== 0) {
    return [];
  }

  const filters = getSearchFilterState();

  return getAllSystemSummaries()
    .filter((row) => Number(row.system_id) !== Number(origin.system_id))
    .filter((row) => systemMatchesSearchFilters(row, filters))
    .map((row) => ({ ...row, distance_ly: distanceLy(origin, row) }))
    .filter((row) => row.distance_ly <= filters.radiusLy)
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

function refreshActiveSystem() {
  if (originSystemId) renderSystemDetail(originSystemId);
}

function renderNearbyRow(row) {
  const fuelBadge = formatNearbyFuelProspect(row);
  return `
    <button class="nearby-row" type="button" data-system-id="${escapeAttr(row.system_id)}">
      <span class="nearby-row-title">
        <strong>${escapeHtml(row.system_name || row.system_id)}</strong>
        ${fuelBadge}
      </span>
      <span class="nearby-row-meta">${row.distance_ly.toFixed(1)} ly · ${formatBeltNearbySummary(row)}</span>
    </button>
  `;
}

function renderSystemDetail(systemId) {
  const id = normalizeSystemId(systemId);
  if (!id) return;

  ensureRadiusInputValue();

  const summary = queryOne(
    `
      SELECT
        sys.system_id,
        sys.system_name,
        sys.region,
        summary.site_count,
        summary.comet_site_count,
        summary.combat_site_count,
        summary.inner_belt_site_count,
        summary.outer_belt_site_count,
        sys.center_x,
        sys.center_y,
        sys.center_z
      FROM systems sys
      JOIN system_site_summary summary ON summary.system_id = sys.system_id
      WHERE sys.system_id = $systemId
    `,
    { $systemId: id },
  );

  if (!summary) return;

  const sites = queryRows(
    `
      SELECT
        s.site_id,
        s.object_type,
        s.object_id,
        s.ecosystem_id,
        e.name AS ecosystem_name,
        s.x,
        s.y,
        s.z,
        s.tags_json,
        s.is_comet_candidate,
        s.is_combat_candidate
      FROM sites s
      LEFT JOIN ecosystems e ON e.ecosystem_id = s.ecosystem_id
      WHERE s.system_id = $systemId
      ORDER BY s.object_type, s.object_id, s.site_id
    `,
    { $systemId: id },
  );

  el.detailTitle.textContent = `${summary.system_name || summary.system_id}`;
  el.detailRegion.textContent = summary.region || "Unknown region";
  el.detailEmpty.hidden = true;
  el.detailContent.hidden = false;

  const filters = getSearchFilterState();
  const planetsById = starmapPlanetMap(id);
  const planetIndexById = buildPlanetIndexById(id);
  const landscapeByKey = buildLandscapeByKey(getLandscapeObjectsForSystem(id));
  const visibleSites = sortSitesByPlanet(
    filterSitesForDisplay(sites, filters),
    planetsById,
    landscapeByKey,
    planetIndexById,
  );
  const siteRenderContext = { planetsById, landscapeByKey, planetIndexById };
  const renderSite = (site) => renderSiteCard(site, siteRenderContext);

  try {
    el.systemReport.innerHTML = makeSystemReport(summary, visibleSites);
    renderNearbySystems(summary);
    updateSiteListNotes(visibleSites);
    updateSiteListHeading(visibleSites.length, sites.length, filters);
    el.siteList.innerHTML = visibleSites.length
      ? visibleSites.map(renderSite).join("")
      : `<div class="empty-state compact">No sites in this system match the current filters.</div>`;
  } catch (error) {
    console.error(error);
    el.systemReport.innerHTML = `
      <section class="report-card">
        <h3>Could not render system report</h3>
        <p class="planet-lede">${escapeHtml(error.message || String(error))}</p>
        <p class="planet-lede compact">Rebuild and redeploy <code>web/data/frontier.sqlite</code> if the database schema is older than the app.</p>
      </section>
    `;
    renderNearbySystems(summary);
    el.siteList.innerHTML = visibleSites.length
      ? visibleSites.map(renderSite).join("")
      : `<div class="empty-state compact">No sites in this system match the current filters.</div>`;
  }
}

function updateSiteListHeading(visibleCount, totalCount, filters = getSearchFilterState()) {
  const heading = document.querySelector(".site-list-heading");
  if (!heading) return;
  if (!hasActiveSearchFilters(filters)) {
    heading.textContent = "All sites in this system";
    return;
  }
  heading.textContent = `Sites matching filters (${formatNumber(visibleCount)} of ${formatNumber(totalCount)})`;
}

function distanceLy(a, b) {
  const dx = Number(a.center_x) - Number(b.center_x);
  const dy = Number(a.center_y) - Number(b.center_y);
  const dz = Number(a.center_z) - Number(b.center_z);
  return Math.sqrt(dx * dx + dy * dy + dz * dz) / METERS_PER_LIGHT_YEAR;
}

function renderNearbySystems(origin) {
  const filters = getSearchFilterState();
  const radius = filters.radiusLy;

  if (!origin.center_x && Number(origin.center_x) !== 0) {
    el.nearbySystems.innerHTML = `
      <section class="report-card nearby-card">
        <h3>Nearby Systems</h3>
        <p class="nearby-note">This system has no starmap coordinates — distance is a matter of faith.</p>
      </section>
    `;
    return;
  }

  const rows = getRadiusFilteredRows(origin) ?? [];
  const list = rows.length
    ? rows.map(renderNearbyRow).join("")
    : `<div class="empty-state compact">No systems matched your filters within ${formatNumber(radius)} ly — try a wider net or fewer demands.</div>`;

  const filterNote = hasActiveSearchFilters(filters)
    ? `<p class="nearby-filter-note">Active filters: ${escapeHtml(describeActiveSearchFilters(filters))}</p>`
    : "";

  el.nearbySystems.innerHTML = `
    <section class="report-card nearby-card">
      <div class="nearby-heading">
        <h3>Nearby within ${formatNumber(radius)} ly</h3>
        <span class="pill muted">${formatNumber(rows.length)} systems</span>
      </div>
      ${filterNote}
      <p class="nearby-note">Distances follow starmap coordinates. After each name: <b>Water Ice: No / Low / Medium / High chance</b> — a qualitative read from outer Shale, Grove, and Drift on the map, not a promise in your hold. Click to leap.</p>
      <div class="nearby-list">${list}</div>
    </section>
  `;

  el.nearbySystems.querySelectorAll("[data-system-id]").forEach((button) => {
    button.addEventListener("click", () => setActiveSystem(Number(button.dataset.systemId)));
  });
}

function renderSiteCard(site, context = {}) {
  const { planetsById = new Map(), landscapeByKey = null, planetIndexById = null } = context;
  const tags = parseTags(site.tags_json);
  const isComet = Number(site.is_comet_candidate) === 1;
  const isCombat = Number(site.is_combat_candidate) === 1;
  const meta = ecosystemMeta(site.ecosystem_id);
  const nearPlanet =
    planetIndexById?.size > 0
      ? siteNearPlanetNote(site, planetsById, landscapeByKey, planetIndexById)
      : null;
  const ecosystemName = displayEcosystemName(site);
  const family = ecosystemFamily(site.ecosystem_name || ecosystemName);
  const curatedNote = renderCuratedNote(site);
  const taxonomy = curatedNote ? null : taxonomyForName(site.ecosystem_name || ecosystemName);
  const outerType = sourceTypeName(ecosystemName);
  const ringTags = parseTags(site.tags_json);
  const badges = [
    ringTags.includes("inner")
      ? `<span class="badge">Inner</span>`
      : "",
    ringTags.includes("outer")
      ? `<span class="badge">Outer</span>`
      : "",
    isCombat
      ? `<span class="badge combat">Blue Drift</span>`
      : isComet && outerType
        ? `<span class="badge outer-type">${escapeHtml(outerType)}</span>`
        : "",
    `<span class="badge">${escapeHtml(family)}</span>`,
    ...tags
      .filter((tag) => tag !== "inner" && tag !== "outer")
      .map((tag) => `<span class="badge">${escapeHtml(humanizeTag(tag))}</span>`),
  ].join("");
  const fuelModel = computeFuelScan(site);
  const fuelNote = fuelModel
    ? `<div class="fuel-scan-note">
        <strong>Water Ice scout score: ${formatPercent(fuelModel.pFuel)}</strong>
        <span>
          grooves ${formatTier(fuelModel.stressTier)} ·
          flaking ${formatTier(fuelModel.skinTier)} ·
          venting ${formatTier(fuelModel.ventingTier)}
        </span>
        <small>${escapeHtml(fuelModel.beltLabel)} — Water Ice scout folklore from site names, not cosmic law.</small>
      </div>`
    : "";

  const taxonomyNote = taxonomy
    ? `<div class="taxonomy-note">
        <strong>${escapeHtml(taxonomy.category)}</strong>
        <span>${escapeHtml(taxonomy.classification)}</span>
        <p>${escapeHtml(taxonomy.description)}</p>
        <small>Activity: ${escapeHtml(taxonomy.activity)} Yield: ${escapeHtml(taxonomy.yield)}</small>
      </div>`
    : "";

  return `
    <article class="site-card">
      <div class="site-topline">
        <div>
          <div class="site-name">${escapeHtml(ecosystemName)}</div>
          <div class="site-meta">
            ${escapeHtml([nearPlanet, ringLabel(site, meta)].filter(Boolean).join(" · "))}
          </div>
        </div>
      </div>
      <div class="badges">${badges}</div>
      ${renderOreZoneNote(site)}
      ${fuelNote}
      ${curatedNote}
      ${taxonomyNote}
    </article>
  `;
}

function resetDetailPanel() {
  selectedSystemId = null;
  el.detailTitle.textContent = "Choose a system";
  el.detailRegion.textContent = "Nowhere yet";
  el.detailEmpty.hidden = false;
  el.detailContent.hidden = true;
  el.systemReport.innerHTML = "";
  el.nearbySystems.innerHTML = "";
  el.siteListNotes.innerHTML = "";
  el.siteListNotes.hidden = true;
  el.siteList.innerHTML = "";
}

function onSearchInput() {
  if (suppressSearchClear) return;

  const value = el.searchInput.value;
  if (originSystemId && value.trim() !== originSystemLabel.trim()) {
    clearOriginSystem();
    resetDetailPanel();
  }

  renderSearchSuggestions();
}

function bindEvents() {
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
      suggestionIndex = Math.min(suggestionIndex + 1, items.length - 1);
      highlightSuggestion(suggestionIndex);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      suggestionIndex = Math.max(suggestionIndex - 1, 0);
      highlightSuggestion(suggestionIndex);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const pick = items[suggestionIndex] || items[0];
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

function initFilterDefaults() {
  ensureRadiusInputValue();
}

async function boot() {
  try {
    bindEvents();
    initFilterDefaults();
    await Promise.all([loadDatabase(), loadOreReference(), loadEcosystemsCurated(), loadPlanetTypes()]);
    buildSystemFuelProspectIndex();
    loadStats();
    loadRegions();
    setStatus("ready", "The index is open", "Name a system, choose it from the list, and let the Guide gossip about what waits nearby.");
  } catch (error) {
    console.error(error);
    setStatus("error", "Could not load database", error.message);
    el.detailEmpty.hidden = false;
    el.detailContent.hidden = true;
    el.detailEmpty.textContent = error.message;
  }
}

boot();
