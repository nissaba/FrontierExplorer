export function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

export function formatPercent(probability) {
  return `${Math.round(Number(probability || 0) * 100)}%`;
}


export function formatBeltNearbySummary(row) {
  const inner = Number(row.inner_belt_site_count || 0);
  const outer = Number(row.outer_belt_site_count || 0);
  const parts = [];
  if (inner) parts.push(`${formatNumber(inner)} inner`);
  if (outer) parts.push(`${formatNumber(outer)} outer`);
  return parts.length ? parts.join(" · ") : "tags politely absent";
}

