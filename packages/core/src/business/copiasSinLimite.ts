import type { DatabaseAdapter } from "../adapters/DatabaseAdapter.js";

/**
 * Estados de una copia en los que se puede ofrecer o vender: disponible, en stock, en exhibicion, en consignacion
 * y en produccion. Quedan afuera vendida, reservada, descartada, destruida y coleccion del autor.
 */
export const ESTADOS_COPIA_OFRECIBLE: ReadonlySet<string> = new Set([
  "disponible",
  "en_stock",
  "exhibicion",
  "consignacion",
  "en_produccion",
]);

// Datos propios de la copia que se heredan a la copia nueva (impresion, enmarcado, tamaño y precio): son los que
// suelen repetirse de una venta a la siguiente. Lo particular de cada copia (fechas, notas, ubicacion, firma,
// certificado, seguro…) queda en blanco para completarlo con el detalle de esa venta.
const COLUMNAS_HEREDADAS = [
  "tipo_impresion",
  "soporte_impresion",
  "taller_impresion",
  "dimensiones",
  "tipo_enmarcado",
  "tamano_final_enmarcado",
  "precio_venta",
  "moneda_venta",
  "tipo_tintas",
  "vidrio_proteccion_frontal",
  "sistema_cuelgue",
  "dimensiones_soporte_completo",
  "peso",
];

/**
 * En una obra sin serie (venta sin limite) siempre tiene que haber una copia lista para vender: si ninguna de sus
 * copias esta en un estado ofrecible (porque se vendio, se reservo, etc.), se crea una nueva, disponible, con el
 * numero siguiente y los datos de impresion/enmarcado/precio de la ultima copia. Es idempotente: si ya hay una
 * copia ofrecible, o la obra no es "sin serie", no hace nada. Devuelve true si creo una copia.
 */
export async function asegurarCopiaOfrecible(db: DatabaseAdapter, obraId: number): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [obra] = await tx.query<{ sin_limite: number }>("SELECT sin_limite FROM obra WHERE id = ?", [obraId]);
    if (!obra || Number(obra.sin_limite) !== 1) return false;

    const copias = await tx.query<{ id: number; indice: number; estado: string }>(
      "SELECT id, indice, estado FROM ejemplar WHERE obra_id = ? AND tipo = 'edicion' ORDER BY indice",
      [obraId],
    );
    if (copias.some((c) => ESTADOS_COPIA_OFRECIBLE.has(c.estado))) return false;

    const ultima = copias[copias.length - 1];
    const indice = (ultima?.indice ?? 0) + 1;
    if (ultima) {
      const columnas = COLUMNAS_HEREDADAS.join(", ");
      await tx.execute(
        `INSERT INTO ejemplar (obra_id, tipo, indice, total_ediciones, numero, estado, ${columnas})
         SELECT obra_id, 'edicion', ?, ?, ?, 'disponible', ${columnas} FROM ejemplar WHERE id = ?`,
        [indice, indice, String(indice), ultima.id],
      );
    } else {
      await tx.execute(
        `INSERT INTO ejemplar (obra_id, tipo, indice, total_ediciones, numero, estado)
         VALUES (?, 'edicion', ?, ?, ?, 'disponible')`,
        [obraId, indice, indice, String(indice)],
      );
    }
    return true;
  });
}
