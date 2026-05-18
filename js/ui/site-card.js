import { parseTags, humanizeTag } from '../core/tags.js';
import { escapeHtml } from '../core/html.js';
import { formatPercent } from '../core/format.js';
import { formatTier } from '../domain/fuel.js';
import {
  displayEcosystemName,
  ecosystemFamily,
  ecosystemMeta,
  renderCuratedNote,
  renderOreZoneNote,
  ringLabel,
  sourceTypeName,
  taxonomyForName,
} from '../domain/ecosystems.js';
import { computeFuelScan } from '../domain/fuel.js';
import { siteNearPlanetNote } from '../domain/site-placement.js';
export function renderSiteCard(site, context = {}) {
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

