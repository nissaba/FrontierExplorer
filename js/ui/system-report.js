import { parseTags, humanizeTag } from '../core/tags.js';
import { topCounts, countBy } from '../core/collections.js';
import { escapeHtml } from '../core/html.js';
import { formatNumber } from '../core/format.js';
import { ecosystemFamily, sourceTypeName, taxonomyForName } from '../domain/ecosystems.js';
import { renderFuelModelSection } from '../domain/fuel.js';
import { renderSystemPlanetsSection } from '../domain/planets.js';
export function makeSystemReport(summary, sites) {
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

