# EVE Frontier System Explorer

**Live site:** [https://fontier-explorer.netlify.app/](https://fontier-explorer.netlify.app/)

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

**Serve the `web/` folder**, not the repo root. If you only see a folder listing or the wrong page, you opened the parent directory.

From the repo root:

```bash
./serve.sh
```

Or from this folder:

```bash
cd "~/frontier/Contents/web"
python3 -m http.server 8080
```

Open:

```text
http://localhost:8080
```

In Cursor / VS Code with Live Server, open the **`Contents` workspace** (or set Live Server root to `web/` via `.vscode/settings.json`).

Do not open `index.html` directly with `file://`; browsers block fetching the SQLite database that way.

## Live site (without touching your existing GitHub Pages)

Your personal GitHub Pages site (e.g. `nissaba.github.io` from another repo) stays as-is.
Host **this** project on Netlify or Cloudflare Pages with a **separate URL**, linked to this repo
so every `git push` on `main` redeploys automatically.

### Recommended: Netlify + GitHub

1. Sign in at [netlify.com](https://www.netlify.com) with GitHub
2. **Add new site → Import an existing project** → choose `nissaba/FrontierExplorer`
3. Settings (should match `netlify.toml`):
   - **Branch:** `main`
   - **Build command:** (leave empty)
   - **Publish directory:** `.` (repo root)
4. Deploy — production URL: [https://fontier-explorer.netlify.app/](https://fontier-explorer.netlify.app/)
5. Optional: **Domain management** → custom subdomain (e.g. `frontier.yourdomain.com`)

After that, only push to Git:

```bash
git push origin main
```

Netlify rebuilds in ~1 minute. No change to your main GitHub Pages site.

### Alternative: Cloudflare Pages

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create**
2. Connect GitHub → `FrontierExplorer`
3. **Build:** none · **Output directory:** `/` (root)
4. Separate URL on `*.pages.dev` (database is ~35 MB; Netlify is simpler if Cloudflare complains about file size)

### Do not enable GitHub Pages on this repo

If you turn on Pages here, you only get `github.io/FrontierExplorer/` (a sub-path), which is
**not** the same as replacing `github.io` — but if you already use Pages elsewhere, use Netlify
to avoid confusion.

## Possible D1 Scouting Rule

The `comet_sites` view comes from `frontier.sqlite` and marks site types worth scouting for
D1 fuel:

- Ecosystem `8`: Natural World - Outer Belt - Shale
- Ecosystem `9`: Natural World - Outer Belt - Grove
- Ecosystem `10`: Broken World - Outer Belt - Blue Drift

The database does not contain fuel or ore item spawns directly. It contains site types. The
fuel scan model uses outer-belt Shale, Grove, and Blue Drift site types plus a simple
three-factor heuristic (thermal stress, skin depth, venting). These are scouting signals, not
guaranteed fuel sites. Counts come from extracted data records and may not map 1:1 to visible
in-game anomalies. Blue Drift is marked as a combat candidate.

Normal build ores are treated as an inner-ring belt scouting signal, not a direct item spawn.
