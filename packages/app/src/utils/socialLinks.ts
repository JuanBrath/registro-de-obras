function ensureProtocol(value: string): string {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function stripHandle(value: string): string {
  return value.replace(/^@/, "");
}

export function buildWebUrl(value: string): string {
  return ensureProtocol(value.trim());
}

export function buildInstagramUrl(value: string): string {
  const v = value.trim();
  if (/instagram\.com/i.test(v)) return ensureProtocol(v);
  return `https://instagram.com/${stripHandle(v)}`;
}

export function buildFacebookUrl(value: string): string {
  const v = value.trim();
  if (/facebook\.com/i.test(v)) return ensureProtocol(v);
  return `https://facebook.com/${stripHandle(v)}`;
}

export function buildXUrl(value: string): string {
  const v = value.trim();
  if (/(x\.com|twitter\.com)/i.test(v)) return ensureProtocol(v);
  return `https://x.com/${stripHandle(v)}`;
}

export function buildMailtoUrl(value: string): string {
  const v = value.trim();
  return v.toLowerCase().startsWith("mailto:") ? v : `mailto:${v}`;
}

export function buildLinkedinUrl(value: string): string {
  const v = value.trim();
  if (/linkedin\.com/i.test(v)) return ensureProtocol(v);
  return `https://linkedin.com/in/${stripHandle(v)}`;
}
