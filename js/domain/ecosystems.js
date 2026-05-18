import { appState } from '../core/state.js';
import { SITE_TAXONOMY } from '../config/taxonomy.js';
import { el } from '../core/dom.js';
import { parseTags, humanizeTag } from '../core/tags.js';
import { topCounts } from '../core/collections.js';
import { escapeHtml } from '../core/html.js';
export function ecosystemFamily(name) {
  const text = String(name || "").toLowerCase();
  if (text.includes("blue drift")) return "Blue Drift";
  if (text.includes("natural world")) return "Natural World";
  if (text.includes("broken world")) return "Broken World";
  if (text.includes("transitional")) return "Transitional";
  return "Other";
}


export function sourceTypeName(name) {
  const text = String(name || "").toLowerCase();
  if (text.includes("blue drift")) return "Blue Drift";
  if (text.includes("shale")) return "Shale";
  if (text.includes("grove")) return "Grove";
  return null;
}


export function taxonomyKeywordMatches(name, keyword) {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(String(name || ""));
}


export function taxonomyForName(name) {
  return SITE_TAXONOMY.find((entry) =>
    entry.keywords.some((keyword) => taxonomyKeywordMatches(name, keyword)),
  );
}


export function curatedEcosystemMeta(ecosystemId) {
  return appState.ecosystemsCurated?.ecosystems?.[String(ecosystemId)] || null;
}


export function displayEcosystemName(site) {
  const curated = curatedEcosystemMeta(site.ecosystem_id);
  if (curated?.label_jeu) return curated.label_jeu;
  return site.ecosystem_name || shortSiteTypeName(site, ecosystemMeta(site.ecosystem_id));
}


export function renderCuratedNote(site) {
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


export function oreZoneForEcosystem(ecosystemId) {
  const meta = appState.oreReference?.ecosystems?.[String(ecosystemId)];
  if (!meta) return null;
  const zone = appState.oreReference.zones?.[meta.oreZone];
  return { meta, zone };
}


export function formatOreList(zone) {
  if (!zone?.ores?.length) return "";
  return zone.ores.map((ore) => ore.name).join(", ");
}


export function ecosystemMeta(ecosystemId) {
  return appState.oreReference?.ecosystems?.[String(ecosystemId)] || null;
}


export function oreZoneLabel(oreZone) {
  if (oreZone === "hot") return "The furnace lane (inner / hot)";
  if (oreZone === "cold") return "The long chill (outer / cold)";
  if (oreZone === "mixed") return "A belt of many moods";
  if (oreZone === "transitional") return "Between the rings";
  return "Uncharted temperament";
}


export function isTrojanSite(site, meta) {
  return site.object_type === "trojans" || meta?.ring === "trojan";
}


export function trojanThermalBand(site) {
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


export function trojanOreZoneLabel(site) {
  const band = trojanThermalBand(site);
  if (band === "hot") return "Sun-adjacent trojan (hot)";
  if (band === "cold") return "Outer-ring trojan (cold)";
  return "Temperate trojan (between rings)";
}


export function oreZoneLabelForSite(site, meta) {
  if (isTrojanSite(site, meta)) return trojanOreZoneLabel(site);
  return oreZoneLabel(meta?.oreZone);
}


export function zoneForTrojanBand(band) {
  if (band === "hot") return appState.oreReference?.zones?.hot;
  if (band === "cold") return appState.oreReference?.zones?.cold;
  return null;
}


export function rumorLead() {
  return '<span class="ore-rumor">The Guide murmurs</span>';
}


export function ringLabel(site, meta) {
  const tags = parseTags(site.tags_json);
  if (site.object_type === "trojans" || meta?.ring === "trojan") return "Trojan";
  if (tags.includes("outer") || meta?.ring === "outer") return "Outer ring";
  if (tags.includes("inner") || meta?.ring === "inner") return "Inner ring";
  if (meta?.ring === "transitional") return "Transitional belt";
  return "";
}


export function shortSiteTypeName(site, meta) {
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


export function renderOreHaystackNote(sites) {
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


export function trojanOreZoneBody(site) {
  const band = trojanThermalBand(site);
  const tags = parseTags(site.tags_json).map((tag) => tag.toLowerCase());
  const icyHost = tags.some((tag) => tag.includes("icy") || tag.includes("ice"));

  if (band === "hot") {
    const hot = formatOreList(appState.oreReference?.zones?.hot);
    return `${rumorLead()} this point carries an <b>inner</b> tag and therefore lives uncomfortably close to the star. <b>${escapeHtml(hot || "Char, Slag, Ingot")}</b> are the polite expectation; cold comet ore would need a very good excuse.`;
  }

  if (band === "cold") {
    const cold = formatOreList(appState.oreReference?.zones?.cold);
    const icyNote = icyHost ? " The map also marks an icy host — the Guide approves of consistency." : "";
    return `${rumorLead()} this trojan rides an <b>outer-ring</b> host where the long chill rules. <b>${escapeHtml(cold || "Comet, Dewdrop, Soot, Glint, Ember")}</b> are the likely choir; inner-belt heat should not be counted on.${escapeHtml(icyNote)}`;
  }

  return `${rumorLead()} a <b>temperate-host</b> tag places this rock in the diplomatic belt — beyond the furnace, short of the outer dark. Bar pilots insist both hot and cold asteroids may turn up; the Guide recommends mining many rocks until something interesting appears.`;
}


export function renderOreZoneNote(site) {
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


export function updateSiteListNotes(sites) {
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

