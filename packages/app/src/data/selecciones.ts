import type { DatabaseAdapter } from "@registro/core";

export interface Seleccion {
  id: number;
  nombre: string;
  notas: string | null;
  cantidad: number;
}

export async function listSelecciones(db: DatabaseAdapter): Promise<Seleccion[]> {
  return db.query<Seleccion>(
    `SELECT s.id, s.nombre, s.notas,
            (SELECT COUNT(*) FROM seleccion_obra so WHERE so.seleccion_id = s.id) AS cantidad
     FROM seleccion s ORDER BY s.nombre COLLATE NOCASE`,
  );
}

export async function crearSeleccion(db: DatabaseAdapter, nombre: string, notas: string | null = null): Promise<number> {
  const res = await db.execute("INSERT INTO seleccion (nombre, notas) VALUES (?, ?)", [nombre.trim(), notas]);
  if (res.lastInsertId == null) throw new Error("No se pudo crear la selección");
  return res.lastInsertId;
}

export async function actualizarSeleccion(db: DatabaseAdapter, id: number, nombre: string, notas: string | null): Promise<void> {
  await db.execute("UPDATE seleccion SET nombre = ?, notas = ? WHERE id = ?", [nombre.trim(), notas, id]);
}

export async function eliminarSeleccion(db: DatabaseAdapter, id: number): Promise<void> {
  await db.execute("DELETE FROM seleccion WHERE id = ?", [id]);
}

/** Agrega obras al final de la selección; las que ya estaban no se duplican. */
export async function agregarObrasASeleccion(db: DatabaseAdapter, seleccionId: number, obraIds: number[]): Promise<void> {
  await db.transaction(async (tx) => {
    const [m] = await tx.query<{ maxOrden: number | null }>(
      "SELECT MAX(orden) AS maxOrden FROM seleccion_obra WHERE seleccion_id = ?",
      [seleccionId],
    );
    let orden = (m?.maxOrden ?? -1) + 1;
    for (const obraId of obraIds) {
      await tx.execute("INSERT OR IGNORE INTO seleccion_obra (seleccion_id, obra_id, orden) VALUES (?, ?, ?)", [
        seleccionId,
        obraId,
        orden++,
      ]);
    }
  });
}

export async function quitarObraDeSeleccion(db: DatabaseAdapter, seleccionId: number, obraId: number): Promise<void> {
  await db.execute("DELETE FROM seleccion_obra WHERE seleccion_id = ? AND obra_id = ?", [seleccionId, obraId]);
}

export async function listObraIdsDeSeleccion(db: DatabaseAdapter, seleccionId: number): Promise<number[]> {
  const rows = await db.query<{ obra_id: number }>(
    "SELECT obra_id FROM seleccion_obra WHERE seleccion_id = ? ORDER BY orden, obra_id",
    [seleccionId],
  );
  return rows.map((r) => r.obra_id);
}

/** Guarda el orden completo (ids en el orden deseado). */
export async function reordenarSeleccion(db: DatabaseAdapter, seleccionId: number, obraIds: number[]): Promise<void> {
  await db.transaction(async (tx) => {
    for (let i = 0; i < obraIds.length; i++) {
      await tx.execute("UPDATE seleccion_obra SET orden = ? WHERE seleccion_id = ? AND obra_id = ?", [i, seleccionId, obraIds[i]]);
    }
  });
}
