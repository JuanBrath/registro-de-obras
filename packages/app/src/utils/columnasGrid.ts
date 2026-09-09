// Regulador de tamaño de miniaturas, compartido entre Obras y Galería de
// obras: controla la cantidad de columnas de la grilla (menos columnas =
// tarjetas más anchas = miniaturas más grandes), sin tocar los archivos de
// imagen — cada miniatura ya es width:100% de su celda, así que alcanza con
// cambiar cuántas celdas entran por fila. Cada pantalla guarda su propia
// preferencia por separado (clave de localStorage distinta).
export const MIN_COLUMNAS_GRID = 2;
export const MAX_COLUMNAS_GRID = 8;

export function cargarColumnasGridInicial(storageKey: string, porDefecto: number): number {
  try {
    const guardado = localStorage.getItem(storageKey);
    const n = guardado ? parseInt(guardado, 10) : NaN;
    if (n >= MIN_COLUMNAS_GRID && n <= MAX_COLUMNAS_GRID) return n;
  } catch {
    // localStorage puede no estar disponible (o bloqueado); se usa el valor por defecto.
  }
  return porDefecto;
}

export function guardarColumnasGrid(storageKey: string, columnas: number): void {
  try {
    localStorage.setItem(storageKey, String(columnas));
  } catch {
    // No se pudo persistir la preferencia (localStorage bloqueado); no rompe el uso de esta sesión.
  }
}
