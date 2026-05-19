import { appState } from '../core/state.js';
import { DB_URL, SQL_WASM } from '../config/constants.js';
import { setStatus } from '../ui/status.js';
import { updateLoader } from '../ui/loader.js';
export function queryRows(sql, params = {}) {
  const stmt = appState.db.prepare(sql);
  stmt.bind(params);
  const rows = [];

  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }

  stmt.free();
  return rows;
}


export function queryOne(sql, params = {}) {
  return queryRows(sql, params)[0];
}


function formatMegabytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return null;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function readResponseWithProgress(response, onProgress) {
  const total = Number(response.headers.get("content-length")) || 0;
  if (!response.body || !total) {
    onProgress?.(0, total);
    return response.arrayBuffer();
  }

  const reader = response.body.getReader();
  const chunks = [];
  let loaded = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.byteLength;
    onProgress?.(loaded, total);
  }

  const out = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out.buffer;
}

function getSqlJsInit() {
  const init = globalThis.initSqlJs;
  if (typeof init === "function") return init;
  throw new Error(
    "sql.js did not load (CDN blocked, offline, or script blocked). Check the browser console and disable ad blockers for this page.",
  );
}

export async function loadDatabase() {
  setStatus(null, "Loading database", "Starting SQL engine (wasm from CDN)…");
  updateLoader("Loading database", "Starting SQL engine (wasm from CDN)…");

  const SQL = await getSqlJsInit()({
    locateFile: (file) => `${SQL_WASM}${file}`,
  });

  setStatus(null, "Loading database", `Downloading ${DB_URL}…`);
  updateLoader("Downloading database", `Fetching ${DB_URL}…`);

  const response = await fetch(DB_URL);
  if (!response.ok) {
    throw new Error(`Could not fetch ${DB_URL}: HTTP ${response.status}`);
  }

  const totalBytes = Number(response.headers.get("content-length")) || 0;
  const sizeHint = formatMegabytes(totalBytes);
  const bytes = await readResponseWithProgress(response, (loaded, total) => {
    if (!total) return;
    const pct = Math.min(100, Math.round((loaded / total) * 100));
    const detail = `Downloading frontier.sqlite… ${pct}% (${formatMegabytes(loaded)} / ${formatMegabytes(total)})`;
    setStatus(null, "Loading database", detail);
    updateLoader("Downloading database", detail);
  });

  setStatus(
    null,
    "Loading database",
    `Opening index${sizeHint ? ` (${sizeHint})` : ""} — first visit can take a few seconds…`,
  );
  updateLoader(
    "Opening database",
    `Parsing index${sizeHint ? ` (${sizeHint})` : ""} — first visit can take a few seconds…`,
  );

  appState.db = new SQL.Database(new Uint8Array(bytes));
  const planetColumns = queryRows(`PRAGMA table_info(system_planets)`);
  appState.systemPlanetsHasPositions = planetColumns.some((row) => row.name === "planet_x");
}

