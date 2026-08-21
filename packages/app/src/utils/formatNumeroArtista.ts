export function formatNumeroArtista(n: number | string): string {
  return String(n).padStart(5, "0");
}
