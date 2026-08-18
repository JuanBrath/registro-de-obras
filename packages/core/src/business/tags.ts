export function parseTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

export function formatTags(tags: string[]): string {
  return tags
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .join(", ");
}
