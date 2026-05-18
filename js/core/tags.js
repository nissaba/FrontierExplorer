export function parseTags(tagsJson) {
  try {
    return JSON.parse(tagsJson || "[]");
  } catch {
    return [];
  }
}


export function humanizeTag(tag) {
  return String(tag)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

