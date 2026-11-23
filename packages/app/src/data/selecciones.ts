import type { DatabaseAdapter } from "@registro/core";

export interface Seleccion {
  id: number;
  nombre: string;
  notas: string | null;
  grupo_id: number | null;
  cantidad: number;
}

export interface GrupoSelecciones {
  id: number;
  nombre: string;
  cantidad: number;
}

const ORDEN_NOMBRE = (a: { nombre: string }, b: { nombre: string }) =>
  a.nombre.localeCompare(b.nombre, undefined, { numeric: true, sensitivity: "base" });

export async function listGrupos(db: DatabaseAdapter): Promise<GrupoSelecciones[]> {
  const filas = await db.query<GrupoSelecciones>(
    `SELECT g.id, g.nombre, (SELECT COUNT(*) FROM seleccion s WHERE s.grupo_id = g.id) AS cantidad FROM seleccion_grupo g`,
  );
  return filas.sort(ORDEN_NOMBRE);
}

export async function crearGrupo(db: DatabaseAdapter, nombre: string): Promise<number> {
  const res = await db.execute("INSERT INTO seleccion_grupo (nombre) VALUES (?)", [nombre.trim()]);
  if (res.lastInsertId == null) throw new Error("No se pudo crear el grupo");
  return res.lastInsertId;
}

export async function renombrarGrupo(db: DatabaseAdapter, id: number, nombre: string): Promise<void> {
  await db.execute("UPDATE seleccion_grupo SET nombre = ? WHERE id = ?", [nombre.trim(), id]);
}

/** Elimina el grupo; sus selecciones no se borran, quedan sin grupo. */
export async function eliminarGrupo(db: DatabaseAdapter, id: number): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.execute("UPDATE seleccion SET grupo_id = NULL WHERE grupo_id = ?", [id]);
    await tx.execute("DELETE FROM seleccion_grupo WHERE id = ?", [id]);
  });
}

export async function listSelecciones(db: DatabaseAdapter): Promise<Seleccion[]> {
  const filas = await db.query<Seleccion>(
    `SELECT s.id, s.nombre, s.notas, s.grupo_id,
            (SELECT COUNT(*) FROM seleccion_obra so WHERE so.seleccion_id = s.id) AS cantidad
     FROM seleccion s`,
  );
  // Orden alfabético por nombre, sin distinguir mayúsculas ni acentos y con números "naturales" (2 antes que 10).
  return filas.sort((a, b) => a.nombre.localeCompare(b.nombre, undefined, { numeric: true, sensitivity: "base" }));
}

export async function crearSeleccion(
  db: DatabaseAdapter,
  nombre: string,
  notas: string | null = null,
  grupoId: number | null = null,
): Promise<number> {
  const res = await db.execute("INSERT INTO seleccion (nombre, notas, grupo_id) VALUES (?, ?, ?)", [nombre.trim(), notas, grupoId]);
  if (res.lastInsertId == null) throw new Error("No se pudo crear la selección");
  return res.lastInsertId;
}

export async function actualizarSeleccion(
  db: DatabaseAdapter,
  id: number,
  nombre: string,
  notas: string | null,
  grupoId: number | null = null,
): Promise<void> {
  await db.execute("UPDATE seleccion SET nombre = ?, notas = ?, grupo_id = ? WHERE id = ?", [nombre.trim(), notas, grupoId, id]);
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

export interface SeleccionDossier {
  id: number;
  seleccion_id: number;
  numero: number;
  creado_en: string;
  archivo_path: string;
  cantidad_obras: number;
}

export async function listDossiers(db: DatabaseAdapter, seleccionId: number): Promise<SeleccionDossier[]> {
  return db.query<SeleccionDossier>(
    "SELECT id, seleccion_id, numero, creado_en, archivo_path, cantidad_obras FROM seleccion_dossier WHERE seleccion_id = ? ORDER BY numero DESC",
    [seleccionId],
  );
}

export async function contarDossiers(db: DatabaseAdapter, seleccionId: number): Promise<number> {
  const [r] = await db.query<{ n: number }>("SELECT COUNT(*) AS n FROM seleccion_dossier WHERE seleccion_id = ?", [seleccionId]);
  return r?.n ?? 0;
}

/** Próximo número correlativo de dossier para la selección. */
export async function proximoNumeroDossier(db: DatabaseAdapter, seleccionId: number): Promise<number> {
  const [r] = await db.query<{ m: number | null }>("SELECT MAX(numero) AS m FROM seleccion_dossier WHERE seleccion_id = ?", [seleccionId]);
  return (r?.m ?? 0) + 1;
}

export async function registrarDossier(
  db: DatabaseAdapter,
  seleccionId: number,
  numero: number,
  archivoPath: string,
  cantidadObras: number,
): Promise<void> {
  await db.execute(
    "INSERT INTO seleccion_dossier (seleccion_id, numero, archivo_path, cantidad_obras) VALUES (?, ?, ?, ?)",
    [seleccionId, numero, archivoPath, cantidadObras],
  );
}

export async function eliminarRegistroDossier(db: DatabaseAdapter, id: number): Promise<void> {
  await db.execute("DELETE FROM seleccion_dossier WHERE id = ?", [id]);
}
