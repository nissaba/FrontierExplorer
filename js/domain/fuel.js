import { appState } from '../core/state.js';
import { LIKELIHOOD_TIER, WATER_ICE_SCOUT_TOOLTIP } from '../config/taxonomy.js';
import { parseTags } from '../core/tags.js';
import { escapeHtml, escapeAttr } from '../core/html.js';
import { formatPercent } from '../core/format.js';
import { queryRows } from '../db/connection.js';
import { displayEcosystemName, sourceTypeName } from './ecosystems.js';
export function outerBeltFuelType(site) {
  const fromName = sourceTypeName(site.ecosystem_name);
  if (fromName) return fromName;
  if (Number(site.ecosystem_id) === 8) return "Shale";
  if (Number(site.ecosystem_id) === 9) return "Grove";
  if (Number(site.ecosystem_id) === 10) return "Blue Drift";
  return null;
}


/** Map heuristic water-ice scout score (0–1) to No / Low / Medium / High. */

export function fuelChanceFromScore(pFuel) {
  const score = Number(pFuel);
  if (!Number.isFinite(score) || score <= 0) {
    return { id: "none", label: "No" };
  }
  if (score < 0.4) return { id: "low", label: "Low" };
  if (score < 0.7) return { id: "medium", label: "Medium" };
  return { id: "high", label: "High" };
}


export function formatWaterIceBadge(chance) {
  const tier = chance?.id === "none" || !chance ? "No" : chance.label;
  const tierId = chance?.id === "none" || !chance ? "none" : chance.id;
  return `<span class="nearby-fuel nearby-fuel--${escapeAttr(tierId)}" title="${escapeAttr(WATER_ICE_SCOUT_TOOLTIP)}">Water Ice: ${escapeHtml(tier)} chance</span>`;
}


export function formatFuelChanceBadge(chance) {
  return formatWaterIceBadge(chance);
}


export function tierScore(tier) {
  return LIKELIHOOD_TIER[tier]?.score ?? LIKELIHOOD_TIER.MEDIUM.score;
}


export function formatTier(tier) {
  const entry = LIKELIHOOD_TIER[tier];
  if (!entry) return "—";
  return `${entry.label} (${formatPercent(entry.score)})`;
}


export function inferEnvironmentalFactors(site, type) {
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


export function buildSystemFuelProspectIndex() {
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

  appState.systemFuelProspectById = map;
}


export function getSystemFuelProspect(systemId) {
  if (!appState.systemFuelProspectById) return null;
  return appState.systemFuelProspectById.get(Number(systemId)) || null;
}


export function formatNearbyFuelProspect(row) {
  const prospect = getSystemFuelProspect(row.system_id);
  if (!prospect?.count) {
    return formatFuelChanceBadge(
      Number(row.comet_site_count) > 0 ? { id: "low", label: "Low" } : { id: "none", label: "No" },
    );
  }
  return formatFuelChanceBadge(fuelChanceFromScore(prospect.max));
}


export function computeFuelScan(site) {
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


export function renderFuelBeltComparison(fuelSites) {
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


export function renderFuelModelSection(sites) {
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

