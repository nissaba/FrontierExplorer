export function normalizeSystemId(systemId) {
  const id = Number(systemId);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  return id;
}

