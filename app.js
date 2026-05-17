const DB_URL = "./data/frontier.sqlite";
const SQL_WASM = "https://cdn.jsdelivr.net/npm/sql.js@latest/dist/";
const COMET_ECOSYSTEMS = new Set([8, 9, 10]);
const METERS_PER_LIGHT_YEAR = 9.4607304725808e15;
const SITE_TAXONOMY = [
  {
    keywords: ["Blue Drift"],
    category: "Possible D1 Indicator / Outer Belt",
    classification: "Dangerous / Combat Resource",
    activity: "Scan and mine D1-bearing material after dealing with the hostile site variant.",
    yield: "Possible D1 scouting target; Blue Drift is the dangerous variant.",
    description:
      "An outer-belt site type associated with D1 fuel scouting. This is not a guarantee of fuel. Treat Blue Drift as the combat-heavy version of the Shale/Grove/Blue Drift family.",
  },
  {
    keywords: ["Shale", "Grove"],
    category: "Possible D1 Indicator / Outer Belt",
    classification: "Industrial / Resource",
    activity: "Scan and mine D1-bearing material in cold outer-ring environments.",
    yield: "Possible D1 scouting target.",
    description:
      "Outer-belt site types associated with D1 fuel scouting. These are worth checking, but they are not fuel or ore items directly listed in the map data.",
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
let searchTimer;
let suggestionIndex = -1;
let allSystemSummaries;

const el = {
  statusCard: document.querySelector("#status-card"),
  statusTitle: document.querySelector("#status-title"),
  statusDetail: document.querySelector("#status-detail"),
  stats: {
    systems: document.querySelector("#stat-systems"),
    sites: document.querySelector("#stat-sites"),
    comet: document.querySelector("#stat-comet"),
    combat: document.querySelector("#stat-combat"),
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
  resultsTitle: document.querySelector("#results-title"),
  resultCount: document.querySelector("#result-count"),
  results: document.querySelector("#results"),
  detailTitle: document.querySelector("#detail-title"),
  detailRegion: document.querySelector("#detail-region"),
  detailEmpty: document.querySelector("#detail-empty"),
  detailContent: document.querySelector("#detail-content"),
  detailSites: document.querySelector("#detail-sites"),
  detailComet: document.querySelector("#detail-comet"),
  detailCombat: document.querySelector("#detail-combat"),
  nearbyRadius: document.querySelector("#nearby-radius"),
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

function taxonomyForName(name) {
  const lowerName = String(name || "").toLowerCase();
  return SITE_TAXONOMY.find((entry) =>
    entry.keywords.some((keyword) => lowerName.includes(keyword.toLowerCase())),
  );
}

function siteTypeLabel(objectType) {
  return objectType === "asteroidBelts" ? "Asteroid Belt" : "Trojan";
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

  const cometText = cometSites.length
    ? `${topCounts(cometSites.map((site) => sourceTypeName(site.ecosystem_name)).filter(Boolean))
        .map(([name, count]) => `${count} outer ${name}`)
        .join(", ")} record${cometSites.length === 1 ? "" : "s"} in the extracted data. This may not map 1:1 to visible in-game anomalies; treat it as a scouting signal, not a guaranteed count.`
    : "No Shale, Grove, or Blue Drift sites found.";
  const cometTypes = [...new Set(cometSites.map((site) => sourceTypeName(site.ecosystem_name)).filter(Boolean))];
  const cometTypeText = cometTypes.length
    ? `Types present: ${cometTypes.join(", ")}.`
    : "No Shale/Grove/Blue Drift types present.";

  const combatText = combatSites.length
    ? `${combatSites.length} Blue Drift combat candidate${combatSites.length === 1 ? "" : "s"} present.`
    : "No Blue Drift combat site types marked.";
  const buildOreText = innerBeltSites.length
    ? `${innerBeltSites.length} inner-ring belt site${innerBeltSites.length === 1 ? "" : "s"} found. These are the likely normal build-ore prospects.`
    : "No inner-ring belt sites found for normal build-ore scouting.";
  const outerRingText = outerBeltSites.length
    ? `${outerBeltSites.length} outer-belt site${outerBeltSites.length === 1 ? "" : "s"} found. Outer belts are the most important D1 scouting area.`
    : "No outer-belt sites found.";

  const livingNote =
    cometSites.length && !combatSites.length
      ? "Looks worth scouting for D1: outer-belt Shale/Grove targets without Blue Drift markers."
      : cometSites.length && combatSites.length
        ? "Worth scouting for D1, but more dangerous: outer-belt targets include Blue Drift."
        : trojanSites.length >= 2 && asteroidSites.length >= 3
          ? "Good exploration variety, but no Shale/Grove/Blue Drift signal in this dataset."
          : "Sparse resource signal from this dataset; scout before committing.";

  return `
    <section class="report-card">
      <h3>At A Glance</h3>
      <p>${escapeHtml(livingNote)}</p>
      <div class="report-grid">
        <div><span>Belts</span><strong>${formatNumber(asteroidSites.length)}</strong></div>
        <div><span>Trojans</span><strong>${formatNumber(trojanSites.length)}</strong></div>
        <div><span>Build Ore Read</span><strong>${escapeHtml(buildOreText)}</strong></div>
        <div><span>D1 Data Records</span><strong>${escapeHtml(cometText)}</strong></div>
        <div><span>D1 Types Present</span><strong>${escapeHtml(cometTypeText)}</strong></div>
        <div><span>Outer Ring Read</span><strong>${escapeHtml(outerRingText)}</strong></div>
        <div><span>Risk Read</span><strong>${escapeHtml(combatText)}</strong></div>
      </div>
    </section>

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
      (SELECT COUNT(*) FROM comet_sites) AS comet,
      (SELECT COUNT(*) FROM sites WHERE is_combat_candidate = 1) AS combat
  `);

  el.stats.systems.textContent = formatNumber(stats.systems);
  el.stats.sites.textContent = formatNumber(stats.sites);
  el.stats.comet.textContent = formatNumber(stats.comet);
  el.stats.combat.textContent = formatNumber(stats.combat);
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
  const system = getAllSystemSummaries().find((row) => Number(row.system_id) === Number(systemId));
  if (!system) return;

  originSystemId = Number(system.system_id);
  originSystemLabel = String(system.system_name || system.system_id);
  el.searchInput.value = originSystemLabel;
  hideSearchSuggestions();
  selectSystem(originSystemId);
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
        Number(b.comet_site_count) - Number(a.comet_site_count) ||
        String(a.system_name).localeCompare(String(b.system_name)),
    )
    .slice(0, 120);
}

function renderResults() {
  if (!db) return;

  if (!originSystemId) {
    el.resultsTitle.textContent = "Nearby Systems";
    el.resultCount.textContent = "—";
    el.results.innerHTML =
      '<div class="empty-state">Search for a system above and pick it from the dropdown to see nearby candidates.</div>';
    return;
  }

  const origin = getSelectedOrigin();
  const radius = getCandidateRadiusLy();
  const rows = getRadiusFilteredRows() ?? [];

  el.resultsTitle.textContent = `Within ${formatNumber(radius)} ly of ${origin?.system_name || originSystemId}`;
  el.resultCount.textContent = `${formatNumber(rows.length)} systems`;

  if (!origin) {
    el.results.innerHTML = '<div class="empty-state">Could not load the searched system.</div>';
    return;
  }

  if (!origin.center_x && Number(origin.center_x) !== 0) {
    el.results.innerHTML = `<div class="empty-state">No starmap coordinates are available for ${escapeHtml(origin.system_name)}. Nearby candidates cannot be calculated.</div>`;
    return;
  }

  if (!rows.length) {
    el.results.innerHTML = `<div class="empty-state">No systems matched those filters within ${formatNumber(radius)} ly.</div>`;
    return;
  }

  el.results.innerHTML = rows.map(renderResultCard).join("");
  el.results.querySelectorAll("[data-system-id]").forEach((button) => {
    button.addEventListener("click", () => selectSystem(Number(button.dataset.systemId)));
  });
}

function renderResultCard(row) {
  const active = Number(row.system_id) === selectedSystemId ? " active" : "";
  const combatText = row.combat_site_count ? `, ${row.combat_site_count} Blue Drift` : "";
  const distanceText =
    typeof row.distance_ly === "number" ? ` · ${row.distance_ly.toFixed(2)} ly away` : "";

  return `
    <button class="result-card${active}" type="button" data-system-id="${row.system_id}">
      <div>
        <div class="result-title">
          <strong>${escapeHtml(row.system_name || row.system_id)}</strong>
          <span>${row.system_id}</span>
        </div>
        <div class="result-meta">
          ${escapeHtml(row.region || "Unknown region")} · ${formatNumber(row.site_count)} sites · ${formatNumber(row.comet_site_count)} outer-belt D1 leads${combatText}${distanceText}
        </div>
      </div>
      <div class="comet-count">
        <strong>${formatNumber(row.comet_site_count)}</strong>
        <span>D1 indicators</span>
      </div>
    </button>
  `;
}

function selectSystem(systemId) {
  selectedSystemId = systemId;
  renderResults();
  renderSystemDetail(systemId);
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
      ORDER BY s.is_comet_candidate DESC, s.object_type, s.object_id, s.site_id
    `,
    { $systemId: systemId },
  );

  el.detailTitle.textContent = `${summary.system_name || summary.system_id}`;
  el.detailRegion.textContent = `${summary.region || "Unknown region"} · ${summary.system_id}`;
  el.detailSites.textContent = formatNumber(summary.site_count);
  el.detailComet.textContent = formatNumber(summary.comet_site_count);
  el.detailCombat.textContent = formatNumber(summary.combat_site_count);
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
  if (!origin.center_x && Number(origin.center_x) !== 0) {
    el.nearbySystems.innerHTML = `
      <section class="report-card">
        <h3>Nearby Systems</h3>
        <p>No starmap coordinates are available for this system.</p>
      </section>
    `;
    return;
  }

  const radius = Math.max(1, Number(el.nearbyRadius.value || 100));
  const nearby = getAllSystemSummaries()
    .filter((system) => Number(system.system_id) !== Number(origin.system_id))
    .map((system) => ({ ...system, distance_ly: distanceLy(origin, system) }))
    .filter((system) => system.distance_ly <= radius)
    .sort((a, b) => a.distance_ly - b.distance_ly || a.system_name.localeCompare(b.system_name))
    .slice(0, 60);

  const rows = nearby.length
    ? nearby
        .map(
          (system) => `
            <button class="nearby-row" type="button" data-system-id="${system.system_id}">
              <span>
                <strong>${escapeHtml(system.system_name)}</strong>
                <small>${system.system_id} · ${escapeHtml(system.region || "Unknown region")}</small>
              </span>
              <span>${system.distance_ly.toFixed(1)} ly</span>
              <span>${formatNumber(system.comet_site_count)} D1 leads</span>
            </button>
          `,
        )
        .join("")
    : `<div class="empty-state compact">No systems found within ${formatNumber(radius)} ly.</div>`;

  el.nearbySystems.innerHTML = `
    <section class="report-card">
      <h3>Nearby Systems Within ${formatNumber(radius)} ly</h3>
      <p>Distances are calculated from starmap system-center coordinates. Use this as a planning aid, not route safety advice.</p>
      <div class="nearby-list">${rows}</div>
    </section>
  `;

  el.nearbySystems.querySelectorAll("[data-system-id]").forEach((button) => {
    button.addEventListener("click", () => selectSystem(Number(button.dataset.systemId)));
  });
}

function renderSiteCard(site) {
  const tags = parseTags(site.tags_json);
  const isComet = Number(site.is_comet_candidate) === 1;
  const isCombat = Number(site.is_combat_candidate) === 1;
  const type = siteTypeLabel(site.object_type);
  const ecosystemName = site.ecosystem_name || `Ecosystem ${site.ecosystem_id}`;
  const family = ecosystemFamily(ecosystemName);
  const taxonomy = taxonomyForName(ecosystemName);
  const badges = [
    isComet ? `<span class="badge comet">Possible D1 target</span>` : "",
    isComet ? `<span class="badge comet">Outer belt D1 lead</span>` : "",
    isCombat ? `<span class="badge combat">Blue Drift / combat</span>` : "",
    `<span class="badge">${escapeHtml(family)}</span>`,
    tags.includes("inner") && site.object_type === "asteroidBelts"
      ? `<span class="badge">Inner ring build-ore prospect</span>`
      : "",
    tags.includes("outer") && site.object_type === "asteroidBelts"
      ? `<span class="badge">Outer ring</span>`
      : "",
    COMET_ECOSYSTEMS.has(Number(site.ecosystem_id))
      ? `<span class="badge comet">Shale / Grove / Blue Drift</span>`
      : "",
    ...tags.map((tag) => `<span class="badge">${escapeHtml(humanizeTag(tag))}</span>`),
  ].join("");
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
            ${type} ${site.object_id} · Site ${site.site_id} · Ecosystem ${site.ecosystem_id}
          </div>
        </div>
      </div>
      <div class="coords">
        x ${Number(site.x).toLocaleString()} · y ${Number(site.y).toLocaleString()} · z ${Number(site.z).toLocaleString()}
      </div>
      <div class="badges">${badges}</div>
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
  clearTimeout(searchTimer);
  searchTimer = setTimeout(renderResults, 120);
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

  el.regionSelect.addEventListener("change", renderResults);
  el.candidateRadius.addEventListener("input", renderResults);
  el.cometOnly.addEventListener("change", renderResults);
  el.combatOnly.addEventListener("change", renderResults);
  el.innerBeltOnly.addEventListener("change", renderResults);
  el.outerBeltOnly.addEventListener("change", renderResults);
  el.nearbyRadius.addEventListener("input", () => {
    if (selectedSystemId) {
      const summary = queryOne(
        `
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
          WHERE sys.system_id = $systemId
        `,
        { $systemId: selectedSystemId },
      );
      if (summary) renderNearbySystems(summary);
    }
  });

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
    renderResults();
  });
}

async function boot() {
  try {
    bindEvents();
    await loadDatabase();
    loadStats();
    loadRegions();
    renderResults();
    setStatus("ready", "Database ready", "Search for a system, pick it from the dropdown, then browse nearby candidates.");
  } catch (error) {
    console.error(error);
    setStatus("error", "Could not load database", error.message);
    el.results.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
  }
}

boot();
