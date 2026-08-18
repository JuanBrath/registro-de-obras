export function derivarAnioDesdeFecha(fecha: string | null | undefined): number | null {
  if (!fecha) return null;
  const anio = parseInt(fecha.slice(0, 4), 10);
  return Number.isFinite(anio) ? anio : null;
}
