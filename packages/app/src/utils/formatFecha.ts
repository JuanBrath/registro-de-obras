/** Convierte una fecha ISO (yyyy-mm-dd) al formato dd/mm/aaaa para mostrar en pantalla o PDF. */
export function formatFechaDDMMYYYY(fechaISO: string): string {
  const [anio, mes, dia] = fechaISO.split("-");
  if (!anio || !mes || !dia) return fechaISO;
  return `${dia}/${mes}/${anio}`;
}
