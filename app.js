const DB_URL = "./data/frontier.sqlite";
const ORE_REFERENCE_URL = "./data/ore_reference.json";
const ECOSYSTEMS_CURATED_URL = "./data/ecosystems_curated.json";
const SQL_WASM = "https://cdn.jsdelivr.net/npm/sql.js@1.12.0/dist/";
const MAX_CANDIDATE_RADIUS_LY = 10000;
const COMET_ECOSYSTEMS = new Set([8, 9, 10]);
const METERS_PER_LIGHT_YEAR = 9.4607304725808e15;

let oreReference = null;
let ecosystemsCurated = null;

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
      "Shale and Grove mark cold-ring fuel scouting on the map. Whether the rocks cooperate is between you and your laser.",
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
let selectedSystemId;
let originSystemId;
let originSystemLabel = "";
let suggestionIndex = -1;
let allSystemSummaries;

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
  detailSites: document.querySelector("#detail-sites"),
  detailInnerBelts: document.querySelector("#detail-inner-belts"),
  detailOuterBelts: document.querySelector("#detail-outer-belts"),
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
    beltLabel:
      site.object_type === "asteroidBelts"
        ? `Belt ${site.object_id}`
        : `${siteTypeLabel(site.object_type)} ${site.object_id}`,
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
      <h3>Fuel prospect folklore (heuristic)</h3>
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

function siteTypeLabel(objectType) {
  return objectType === "asteroidBelts" ? "Asteroid Belt" : "Trojan";
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
        ${comets.length ? ", plus Shale, Grove, or Drift names on the map." : ", though the map declines to name outer fuel sites."}
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
    ? `${combatSites.length} Blue Drift marker${combatSites.length === 1 ? "" : "s"} — the disagreeable cousin of fuel scouting.`
    : "No Blue Drift in the files — possibly peaceful, possibly undocumented.";

  const innerBeltText = innerBeltSites.length
    ? `${innerBeltSites.length} inner belt${innerBeltSites.length === 1 ? "" : "s"} in the furnace lane.`
    : "No inner tags — the star's neighborhood goes unlisted.";

  const outerBeltText = outerBeltSites.length
    ? `${outerBeltSites.length} outer belt${outerBeltSites.length === 1 ? "" : "s"} in the long chill.`
    : "No outer tags — the rim keeps its secrets.";

  const livingNote =
    innerBeltSites.length && outerBeltSites.length
      ? `This system offers both furnace-lane belts (${innerBeltSites.length}) and rimward belts (${outerBeltSites.length}) — a rare menu.`
      : innerBeltSites.length
        ? `Only inner belts (${innerBeltSites.length}) — hot ore country, short on comet romance.`
        : outerBeltSites.length
          ? `Only outer belts (${outerBeltSites.length})${cometSites.length ? `, with ${outerTypeText} on the manifest` : ""}.`
          : trojanSites.length >= 2 && asteroidSites.length >= 3
            ? "Belts and trojans abound, yet the map forgot to say inner or outer — verify before you commit a freighter."
            : "Thin tagging in the extract; treat all belt gossip as provisional until you've warped in and looked.";

  return `
    <section class="report-card">
      <h3>At a glance</h3>
      <p>${escapeHtml(livingNote)}</p>
      <div class="report-grid">
        <div><span>Asteroid Belts</span><strong>${formatNumber(asteroidSites.length)}</strong></div>
        <div><span>Trojans</span><strong>${formatNumber(trojanSites.length)}</strong></div>
        <div><span>Inner Belts</span><strong>${escapeHtml(innerBeltText)}</strong></div>
        <div><span>Outer Belts</span><strong>${escapeHtml(outerBeltText)}</strong></div>
        <div><span>Outer Types in Data</span><strong>${escapeHtml(outerTypeText)}</strong></div>
        <div><span>Blue Drift</span><strong>${escapeHtml(combatText)}</strong></div>
      </div>
    </section>

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

function findSearchMatches(query, limit = 12) {
  const text = query.trim().toLowerCase();
  if (!text) return [];

  return getAllSystemSummaries()
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
  el.searchInput.value = originSystemLabel;
  hideSearchSuggestions();
  renderSystemDetail(originSystemId);
}

function clearOriginSystem() {
  originSystemId = null;
  originSystemLabel = "";
}

function getSelectedOrigin() {
  if (!originSystemId) return null;
  return getAllSystemSummaries().find((system) => Number(system.system_id) === Number(originSystemId));
}

function getCandidateRadiusLy() {
  const raw = Number(el.candidateRadius.value);
  const radius = Number.isFinite(raw) ? raw : 100;
  return Math.min(MAX_CANDIDATE_RADIUS_LY, Math.max(1, Math.floor(radius)));
}

function getRadiusFilteredRows() {
  const origin = getSelectedOrigin();
  if (!origin) return null;

  if (!origin.center_x && Number(origin.center_x) !== 0) {
    return [];
  }

  const radius = getCandidateRadiusLy();
  const region = el.regionSelect.value;
  const cometOnly = el.cometOnly.checked;
  const combatOnly = el.combatOnly.checked;
  const innerBeltOnly = el.innerBeltOnly.checked;
  const outerBeltOnly = el.outerBeltOnly.checked;

  return getAllSystemSummaries()
    .filter((row) => Number(row.system_id) !== Number(origin.system_id))
    .filter((row) => !region || row.region === region)
    .filter((row) => !cometOnly || Number(row.comet_site_count) > 0)
    .filter((row) => !combatOnly || Number(row.combat_site_count) > 0)
    .filter((row) => !innerBeltOnly || Number(row.inner_belt_site_count) > 0)
    .filter((row) => !outerBeltOnly || Number(row.outer_belt_site_count) > 0)
    .map((row) => ({ ...row, distance_ly: distanceLy(origin, row) }))
    .filter((row) => row.distance_ly <= radius)
    .sort(
      (a, b) =>
        a.distance_ly - b.distance_ly ||
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
  return `
    <button class="nearby-row" type="button" data-system-id="${escapeAttr(row.system_id)}">
      <strong>${escapeHtml(row.system_name || row.system_id)}</strong>
      <span>${row.distance_ly.toFixed(1)} ly · ${formatBeltNearbySummary(row)}</span>
    </button>
  `;
}

function renderSystemDetail(systemId) {
  const id = normalizeSystemId(systemId);
  if (!id) return;

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
  el.detailRegion.textContent = `${summary.region || "Unknown region"} · ${summary.system_id}`;
  el.detailSites.textContent = formatNumber(summary.site_count);
  el.detailInnerBelts.textContent = formatNumber(summary.inner_belt_site_count);
  el.detailOuterBelts.textContent = formatNumber(summary.outer_belt_site_count);
  el.detailEmpty.hidden = true;
  el.detailContent.hidden = false;
  el.systemReport.innerHTML = makeSystemReport(summary, sites);
  renderNearbySystems(summary);
  updateSiteListNotes(sites);
  el.siteList.innerHTML = sites.map(renderSiteCard).join("");
}

function distanceLy(a, b) {
  const dx = Number(a.center_x) - Number(b.center_x);
  const dy = Number(a.center_y) - Number(b.center_y);
  const dz = Number(a.center_z) - Number(b.center_z);
  return Math.sqrt(dx * dx + dy * dy + dz * dz) / METERS_PER_LIGHT_YEAR;
}

function renderNearbySystems(origin) {
  const radius = getCandidateRadiusLy();

  if (!origin.center_x && Number(origin.center_x) !== 0) {
    el.nearbySystems.innerHTML = `
      <section class="report-card nearby-card">
        <h3>Nearby Systems</h3>
        <p class="nearby-note">This system has no starmap coordinates — distance is a matter of faith.</p>
      </section>
    `;
    return;
  }

  const rows = getRadiusFilteredRows() ?? [];
  const list = rows.length
    ? rows.map(renderNearbyRow).join("")
    : `<div class="empty-state compact">No systems matched your filters within ${formatNumber(radius)} ly — try a wider net or fewer demands.</div>`;

  el.nearbySystems.innerHTML = `
    <section class="report-card nearby-card">
      <div class="nearby-heading">
        <h3>Nearby within ${formatNumber(radius)} ly</h3>
        <span class="pill muted">${formatNumber(rows.length)} systems</span>
      </div>
      <p class="nearby-note">Distances follow starmap coordinates — click a name to leap there, preferably with fuel.</p>
      <div class="nearby-list">${list}</div>
    </section>
  `;

  el.nearbySystems.querySelectorAll("[data-system-id]").forEach((button) => {
    button.addEventListener("click", () => setActiveSystem(Number(button.dataset.systemId)));
  });
}

function renderSiteCard(site) {
  const tags = parseTags(site.tags_json);
  const isComet = Number(site.is_comet_candidate) === 1;
  const isCombat = Number(site.is_combat_candidate) === 1;
  const type = siteTypeLabel(site.object_type);
  const meta = ecosystemMeta(site.ecosystem_id);
  const ecosystemName = displayEcosystemName(site);
  const family = ecosystemFamily(site.ecosystem_name || ecosystemName);
  const curatedNote = renderCuratedNote(site);
  const taxonomy = curatedNote ? null : taxonomyForName(site.ecosystem_name || ecosystemName);
  const outerType = sourceTypeName(ecosystemName);
  const ringTags = parseTags(site.tags_json);
  const badges = [
    ringTags.includes("inner") && site.object_type === "asteroidBelts"
      ? `<span class="badge">Inner belt</span>`
      : "",
    ringTags.includes("outer") && site.object_type === "asteroidBelts"
      ? `<span class="badge">Outer belt</span>`
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
        <strong>Prospect score: ${formatPercent(fuelModel.pFuel)}</strong>
        <span>
          grooves ${formatTier(fuelModel.stressTier)} ·
          flaking ${formatTier(fuelModel.skinTier)} ·
          venting ${formatTier(fuelModel.ventingTier)}
        </span>
        <small>${escapeHtml(fuelModel.beltLabel)} — folklore derived from site names, not cosmic law.</small>
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
            ${escapeHtml(
              [
                site.object_type === "asteroidBelts" ? `Belt ${site.object_id}` : `Trojan ${site.object_id}`,
                ringLabel(site, meta),
              ]
                .filter(Boolean)
                .join(" · "),
            )}
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
    el.candidateRadius.value = "";
    el.cometOnly.checked = false;
    el.combatOnly.checked = false;
    el.innerBeltOnly.checked = false;
    el.outerBeltOnly.checked = false;
  });
}

async function boot() {
  try {
    bindEvents();
    await Promise.all([loadDatabase(), loadOreReference(), loadEcosystemsCurated()]);
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
