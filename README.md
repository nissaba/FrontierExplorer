# EVE Frontier System Explorer

**Live site:** [https://fontier-explorer.netlify.app/](https://fontier-explorer.netlify.app/)

An unofficial fan index for the Frontier: search a system by name or ID and see what the extracted map data claims is there — belt sites, trojans, planets, and neighbors within a chosen radius.

## Disclaimer

Not official. Not endorsed by CCP Games or Fenris Creations. Data is stitched from game extracts and notes; it may be incomplete, stale, or wrong. Use at your own risk for routes, mining, or combat.

## What you can do

- **Search systems** — type a name (e.g. `I86-PCK`) or numeric system ID; pick from suggestions.
- **System report** — summary of map sites and trojans, inner vs outer ring counts, outer site types (Shale / Grove / Blue Drift), and Blue Drift combat markers where the data flags them.
- **Planets** — starmap planets with orbit and temperature when the database includes them; otherwise inferred types from landscape tags where available.
- **All sites in system** — every named map site in one list, sorted by **planet #1, #2, #3…** (starmap order), then name. Each card can show **Near planet #N** when positions allow — a placement hint, not proof of a shared orbit.
- **Nearby systems** — systems within a radius (default 100 ly) of your searched system, with distance and inner/outer belt site counts on the map.
- **Filters** — narrow the nearby list and site list by region, outer Water Ice scout sites (Shale / Grove / Drift), Blue Drift combat, inner belt tags, or outer belt tags.

## How to read the labels

| Label | Meaning |
|--------|---------|
| **Inner vs outer** | Tags on map sites. Inner leans the furnace lane; outer leans the long chill. |
| **Shale, Grove, Blue Drift** | Outer-belt site type names in the extract — used for Water Ice scouting hints, not loot guarantees. |
| **Water Ice: No / Low / Medium / High** | Qualitative scout read from outer Shale, Grove, and Drift on the **nearby** list — folklore from site names, not a promise in your hold. |
| **Trojans** | Trojan bar sites; inner/outer/temperate tags in data are hearsay about hot vs cold ore stories, not verified in-game. |
| **Near planet #N** | Which starmap planet (#1, #2, #3…) a site is associated with by host tag or nearest position. |

## Database stats

The header shows totals across the index: systems, sites, inner-belt sites, and outer-belt sites loaded from the Frontier extract.
