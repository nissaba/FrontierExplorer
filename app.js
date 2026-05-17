const DB_URL = "./data/frontier.sqlite";
const ORE_REFERENCE_URL = "./data/ore_reference.json";
const SQL_WASM = "https://cdn.jsdelivr.net/npm/sql.js@latest/dist/";
const COMET_ECOSYSTEMS = new Set([8, 9, 10]);
const METERS_PER_LIGHT_YEAR = 9.4607304725808e15;

let oreReference = null;

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
    activity: "Scan and mine after clearing the hostile site variant.",
    yield: "Outer-belt resource site in extracted data; Blue Drift is the combat-heavy variant.",
    description:
      "An outer-belt ecosystem type from extracted map data. Treat Blue Drift as the combat-heavy version of the Shale/Grove/Blue Drift family.",
  },
  {
    keywords: ["Shale", "Grove"],
    category: "Outer Belt Site Type",
    classification: "Industrial / Resource",
    activity: "Scan and mine in cold outer-ring belt environments.",
    yield: "Outer-belt resource site in extracted data.",
    description:
      "Outer-belt Shale or Grove site types from extracted map data. Listed for scouting context; not confirmed in-game resources.",
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
    activity: "Specialized data extraction, scanning, and container unlocking.",
    yield: "Encrypted data drives, blueprint copies, and utility software strings.",
    description:
      "Drifting data vaults and storage silos uncoupled from lost orbital platforms. Requires scanning arrays to secure without triggering system self-destruct loops.",
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
    keywords: ["Rift", "Rift 0633", "Rift 0020"],
    category: "Industrial Space Anomaly",
    classification: "Advanced Industrial / Strategic",
    activity: "Deep-space crude extraction and siphon harvesting.",
    yield: "Crude oil / space-matter fuel inputs.",
    description:
      "A volatile spatial rupture weeping raw crude matter. Harvesting this site is essential for manufacturing advanced fuel required for deep warp drives and interstellar stargate jumps.",
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
  return parts.length ? parts.join(" · ") : "no belt tags";
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
      <strong>Same belt, different reads</strong>
      <p>Multiple outer-type sites can share one belt (e.g. Eimur: Shale + Grove on one outer belt). Compare scan rows — low venting Shale vs higher-stress Grove often matches “thin” vs “richer” comet ore finds.</p>
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
      <h3>Fuel Scan Model (explorer heuristic)</h3>
      <p class="fuel-model-lede">
        Scan % is the average of three factors (Low 0–30%, Medium 31–70%, High 71–100%):
        thermal stress (grooves), skin depth (flaking shale), and venting (bleu drift trail).
        <strong>Best model scan here: ${formatPercent(best.pFuel)}.</strong>
        Based on outer-belt site type in the extract — not confirmed in-game fuel odds.
      </p>
      ${renderFuelBeltComparison(fuelSites)}
      <div class="fuel-model-legend">
        <span><b>Grooves</b> — Grove/Blue Drift higher; bare Shale lower.</span>
        <span><b>Skin depth</b> — Shale → high flaking; Grove/Drift → medium.</span>
        <span><b>Venting</b> — Blue Drift hot trail → high; Shale cold → low.</span>
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
              <th>Scan %</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>
  `;
}

function taxonomyForName(name) {
  const lowerName = String(name || "").toLowerCase();
  return SITE_TAXONOMY.find((entry) =>
    entry.keywords.some((keyword) => lowerName.includes(keyword.toLowerCase())),
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
  if (oreZone === "hot") return "Near the star (hot)";
  if (oreZone === "cold") return "Far from the star (cold)";
  if (oreZone === "mixed") return "Mixed temperatures";
  if (oreZone === "transitional") return "Transitional";
  return "Unknown zone";
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
  if (meta?.siteType) return meta.siteType;
  const name = site.ecosystem_name || "";
  const fromName = sourceTypeName(name);
  if (fromName) return fromName;
  const parts = name.split(" - ").map((p) => p.trim()).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : name || "Unknown site";
}

function renderOreChips(zoneKey, zone) {
  if (!zone?.ores?.length) return "";
  const chips = zone.ores
    .map((ore) => {
      const note = ore.note ? ` title="${escapeHtml(ore.note)}"` : "";
      return `<span class="ore-chip ore-chip-${zoneKey}"${note}>${escapeHtml(ore.name)}</span>`;
    })
    .join("");

  return `
    <div class="ore-zone-block ore-zone-${zoneKey}">
      <h4>${escapeHtml(zone.label)}</h4>
      <p class="ore-zone-hint">${zoneKey === "hot" ? "Typical when mining close to the star." : "Typical on outer belts and cold hosts."}</p>
      <div class="ore-chip-row">${chips}</div>
    </div>
  `;
}

function summarizeSystemOreSites(sites) {
  const byEco = new Map();
  for (const site of sites) {
    const key = String(site.ecosystem_id);
    if (!byEco.has(key)) {
      byEco.set(key, { site, count: 0 });
    }
    byEco.get(key).count += 1;
  }
  return [...byEco.values()].sort(
    (a, b) =>
      a.site.object_type.localeCompare(b.site.object_type) ||
      Number(a.site.ecosystem_id) - Number(b.site.ecosystem_id),
  );
}

function renderSystemSiteTypeCards(sites) {
  const cards = summarizeSystemOreSites(sites)
    .map(({ site, count }) => {
      const meta = ecosystemMeta(site.ecosystem_id);
      const info = oreZoneForEcosystem(site.ecosystem_id);
      const zone = info?.zone;
      const title = shortSiteTypeName(site, meta);
      const ring = ringLabel(site, meta);
      const zoneText = oreZoneLabel(meta?.oreZone);
      const ores = formatOreList(zone);
      const place =
        site.object_type === "asteroidBelts" ? `Belt ${site.object_id}` : `Trojan ${site.object_id}`;
      const countLabel = `${count} site${count === 1 ? "" : "s"} in this system`;

      return `
        <article class="site-type-card">
          <div class="site-type-card-top">
            <h4>${escapeHtml(title)}</h4>
            <span class="site-type-count">${escapeHtml(countLabel)}</span>
          </div>
          <p class="site-type-meta">${escapeHtml([ring, zoneText, place].filter(Boolean).join(" · "))}</p>
          ${
            ores
              ? `<p class="site-type-ores"><span>Look for</span> ${escapeHtml(ores)}</p>`
              : `<p class="site-type-ores muted">Rock mix varies — scan in game.</p>`
          }
        </article>
      `;
    })
    .join("");

  if (!cards) return "";

  return `<div class="site-type-cards">${cards}</div>`;
}

function renderOreHaystackNote(sites) {
  const trojans = sites.filter((s) => s.object_type === "trojans");
  const comets = sites.filter((s) => Number(s.is_comet_candidate) === 1);
  if (!trojans.length) return "";

  const outerIcy = trojans.filter((s) => {
    const tags = parseTags(s.tags_json).map((t) => t.toLowerCase());
    return tags.includes("outer") && tags.some((t) => t.includes("icy") || t.includes("ice"));
  });

  if (comets.length && !outerIcy.length) return "";

  return `
    <div class="ore-haystack-note">
      <strong>Trojan haystack scouting</strong>
      <p>
        ${trojans.length} trojan point${trojans.length === 1 ? "" : "s"} here
        ${comets.length ? ", plus labeled outer Shale/Grove/Drift sites." : ", but no labeled outer fuel sites on the map."}
        ${outerIcy.length ? ` ${outerIcy.length} outer trojan${outerIcy.length === 1 ? "" : "s"} sit on icy hosts — good place to scan for cold rocks.` : " Pilots report mixed hot and cold asteroids at trojans even when the map only shows Garden or Annex."}
      </p>
    </div>
  `;
}

function renderOreZoneNote(site) {
  const info = oreZoneForEcosystem(site.ecosystem_id);
  if (!info) return "";

  const { meta, zone } = info;
  const ores = formatOreList(zone);
  const zoneLabel = oreZoneLabel(meta.oreZone);
  const title = shortSiteTypeName(site, meta);
  const ring = ringLabel(site, meta);

  let body = "";
  if (ores) {
    body = `Expect <b>${escapeHtml(ores)}</b> when scanning this ${escapeHtml((ring || "site").toLowerCase())}.`;
  } else if (meta.haystack) {
    body = "Hot and cold rock types can mix — scan many asteroids to find comet-style ore.";
  } else {
    body = "Rock mix varies; confirm with your scanner in game.";
  }

  return `<div class="ore-zone-note">
      <p class="ore-zone-title"><strong>${escapeHtml(zoneLabel)}</strong> · ${escapeHtml(title)}</p>
      <p class="ore-zone-body">${body}</p>
    </div>`;
}

function renderOreGuideSection(sites) {
  if (!oreReference?.zones) return "";

  return `
    <section class="report-card ore-guide-card" id="ore-reference">
      <h3>What rocks to expect</h3>
      <p class="ore-guide-lede">
        The map lists <b>site types</b> (Shale, Grove, inner quarries, trojans). Each sits in a
        hot or cold part of the system. These are the asteroid families pilots usually mine there.
      </p>

      <div class="ore-ref-grid">
        ${renderOreChips("hot", oreReference.zones.hot)}
        ${renderOreChips("cold", oreReference.zones.cold)}
      </div>

      <h4 class="ore-subheading">Sites in this system</h4>
      ${renderSystemSiteTypeCards(sites)}
      ${renderOreHaystackNote(sites)}

      <p class="ore-footnote">The extract lists site types, not every rock in a belt. Always verify with an in-game scan.</p>
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
    : "None in extract";

  const combatText = combatSites.length
    ? `${combatSites.length} Blue Drift site${combatSites.length === 1 ? "" : "s"} marked combat-heavy.`
    : "No Blue Drift sites in extract.";

  const innerBeltText = innerBeltSites.length
    ? `${innerBeltSites.length} inner-ring belt site${innerBeltSites.length === 1 ? "" : "s"} tagged in data.`
    : "No inner-ring belt tags in extract.";

  const outerBeltText = outerBeltSites.length
    ? `${outerBeltSites.length} outer-ring belt site${outerBeltSites.length === 1 ? "" : "s"} tagged in data.`
    : "No outer-ring belt tags in extract.";

  const livingNote =
    innerBeltSites.length && outerBeltSites.length
      ? `Both inner (${innerBeltSites.length}) and outer (${outerBeltSites.length}) belt sites appear in the extract.`
      : innerBeltSites.length
        ? `Inner-ring belts only (${innerBeltSites.length} tagged sites) — typical build-ore style prospects.`
        : outerBeltSites.length
          ? `Outer-ring belts only (${outerBeltSites.length} tagged sites)${cometSites.length ? `; types: ${outerTypeText}` : ""}.`
          : trojanSites.length >= 2 && asteroidSites.length >= 3
            ? "Belts and trojans present, but no inner/outer ring tags in this extract."
            : "Sparse belt tagging in this extract; verify in game before committing.";

  return `
    <section class="report-card">
      <h3>At A Glance</h3>
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
    ${renderOreGuideSection(sites)}

    <section class="report-card">
      <h3>Site Mix</h3>
      <div class="chips">
        ${familyCounts
          .map(([family, count]) => `<span class="chip">${escapeHtml(family)}: ${count}</span>`)
          .join("")}
      </div>
    </section>

    ${
      taxonomyCounts.length
        ? `<section class="report-card">
            <h3>Known Site Classes</h3>
            <div class="chips">
              ${taxonomyCounts
                .map(([category, count]) => `<span class="chip">${escapeHtml(category)}: ${count}</span>`)
                .join("")}
            </div>
          </section>`
        : ""
    }

    <section class="report-card">
      <h3>Environment Tags</h3>
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
          data-system-id="${row.system_id}"
          data-index="${index}"
        >
          <strong>${escapeHtml(row.system_name || row.system_id)}</strong>
          <span>${row.system_id} · ${escapeHtml(row.region || "Unknown region")}</span>
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
  setActiveSystem(systemId);
}

function setActiveSystem(systemId) {
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
    { $systemId: systemId },
  );
  if (!summary) return;

  originSystemId = Number(summary.system_id);
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
  return Math.max(1, Number(el.candidateRadius.value) || 100);
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
    <button class="nearby-row" type="button" data-system-id="${row.system_id}">
      <strong>${escapeHtml(row.system_name || row.system_id)}</strong>
      <span>${row.distance_ly.toFixed(1)} ly · ${formatBeltNearbySummary(row)}</span>
    </button>
  `;
}

function renderSystemDetail(systemId) {
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
    { $systemId: systemId },
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
    { $systemId: systemId },
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
        <p class="nearby-note">No starmap coordinates are available for this system.</p>
      </section>
    `;
    return;
  }

  const rows = getRadiusFilteredRows() ?? [];
  const list = rows.length
    ? rows.map(renderNearbyRow).join("")
    : `<div class="empty-state compact">No systems matched those filters within ${formatNumber(radius)} ly.</div>`;

  el.nearbySystems.innerHTML = `
    <section class="report-card nearby-card">
      <div class="nearby-heading">
        <h3>Nearby within ${formatNumber(radius)} ly</h3>
        <span class="pill muted">${formatNumber(rows.length)} systems</span>
      </div>
      <p class="nearby-note">Distances use starmap coordinates. Click a system to jump there.</p>
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
  const ecosystemName = site.ecosystem_name || shortSiteTypeName(site, meta);
  const family = ecosystemFamily(ecosystemName);
  const taxonomy = taxonomyForName(ecosystemName);
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
        <strong>Model scan: ${formatPercent(fuelModel.pFuel)}</strong>
        <span>
          grooves ${formatTier(fuelModel.stressTier)} ·
          flaking ${formatTier(fuelModel.skinTier)} ·
          venting ${formatTier(fuelModel.ventingTier)}
        </span>
        <small>${escapeHtml(fuelModel.beltLabel)} — heuristic from site type in extract.</small>
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
      ${taxonomyNote}
    </article>
  `;
}

function resetDetailPanel() {
  selectedSystemId = null;
  el.detailTitle.textContent = "Select a system";
  el.detailRegion.textContent = "No region";
  el.detailEmpty.hidden = false;
  el.detailContent.hidden = true;
  el.systemReport.innerHTML = "";
  el.nearbySystems.innerHTML = "";
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
    await Promise.all([loadDatabase(), loadOreReference()]);
    loadStats();
    loadRegions();
    setStatus("ready", "Database ready", "Search for a system, pick it from the dropdown, then browse nearby candidates.");
  } catch (error) {
    console.error(error);
    setStatus("error", "Could not load database", error.message);
    el.detailEmpty.hidden = false;
    el.detailContent.hidden = true;
    el.detailEmpty.textContent = error.message;
  }
}

boot();
