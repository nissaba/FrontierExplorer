# Front-end architecture

The explorer is split into **ES modules** so new contributors can work in one area without reading a single 2000-line file.

## Layers

```
js/main.js          → boot, wires events
js/app/             → navigation, filters, session (which system is open)
js/ui/              → HTML rendering (reports, site cards, nearby list)
js/domain/          → business rules (fuel scout, planets, site placement, ecosystems)
js/db/              → SQLite access only (sql.js queries)
js/data/            → loading JSON reference files
js/core/            → shared utils, DOM refs, appState
js/config/          → constants and static taxonomy data
```

## Rules of thumb

| Want to change… | Edit… |
|-----------------|--------|
| SQL / schema usage | `db/*.js` |
| “Near planet #N”, site sort order | `domain/site-placement.js` |
| Planet orbit / star display | `domain/planets.js`, `db/planets.js` |
| Site card content | `ui/site-card.js` |
| Search & filters | `app/filters.js`, `app/search.js`, `app/session.js` |
| Water Ice heuristic | `domain/fuel.js` |
| Ore zone blurbs | `domain/ecosystems.js` |
| Global URLs, AU constants | `config/constants.js` |

## State

All mutable globals live in `core/state.js` as **`appState`** (db handle, selected system, cached summaries). Do not add new top-level `let` in random files.

## Regenerating modules

`app.js` at `web/` root is a thin shim. Source of truth for the split list is `scripts/split_web_app.py` (run after large edits to a temporary monolith, if you ever re-merge).

## Data build (Python)

`build_frontier_db.py` at repo root is separate: ETL into `web/data/frontier.sqlite`. Not imported by the browser.
