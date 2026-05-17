# EVE Frontier System Explorer

## Disclaimer

This is an unofficial fan tool. Use it at your own risk. I am not responsible if you lose ships,
die, or make bad routing, mining, combat, or settlement decisions from this information.

The data is extracted and interpreted from game files, community knowledge, and online
documentation, and may be incomplete, outdated, or wrong. This website is not official, and
CCP Games / Fenris Creations have not endorsed, reviewed, approved, or participated in it.

Static website for browsing `frontier.sqlite` in the browser. It lets users type a system
name or ID and get a human-readable report with site mix, environment tags,
outer-belt D1 scouting targets, Blue Drift risk, and coordinates.

It also calls out likely normal build-ore prospects by highlighting inner-ring belt sites.
Matching site names are classified with a local taxonomy for combat, salvage, industrial,
infrastructure, and Comet-source descriptions.

## Local Preview

Run a local server from this folder:

```bash
cd "/Volumes/exd/frontier/Contents/web"
python3 -m http.server 8080
```

Open:

```text
http://localhost:8080
```

Do not open `index.html` directly with `file://`; browsers block fetching the SQLite database that way.

## Deploy For Free

This folder is static and can be hosted on:

- GitHub Pages
- Cloudflare Pages
- Netlify

Upload/deploy the whole `web/` folder, including:

```text
index.html
styles.css
app.js
data/frontier.sqlite
```

The page loads `sql.js` from jsDelivr and fetches `data/frontier.sqlite` as a read-only browser database.

## Possible D1 Scouting Rule

The `comet_sites` view comes from `frontier.sqlite` and marks site types worth scouting for
D1 fuel:

- Ecosystem `8`: Natural World - Outer Belt - Shale
- Ecosystem `9`: Natural World - Outer Belt - Grove
- Ecosystem `10`: Broken World - Outer Belt - Blue Drift

The database does not contain fuel or ore item spawns directly. It contains site types. The
thermal golden-zone model would require star luminosity, albedo, sublimation temperature, and
emissivity, which are not present here. This tool uses the practical evidence available in the
extracted map data: outer-belt Shale, Grove, and Blue Drift sites. Outer belts are the most
important D1 scouting area. These are possible D1
scouting targets, not guaranteed fuel sites. Counts come from extracted data records and may
not map 1:1 to visible in-game anomalies. Blue Drift is marked as a combat candidate.

Normal build ores are treated as an inner-ring belt scouting signal, not a direct item spawn.
