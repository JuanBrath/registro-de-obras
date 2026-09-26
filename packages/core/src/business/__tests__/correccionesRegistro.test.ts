import { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, expect, it } from "vitest";
import { applyMigrations } from "../../schema/migrationRunner.js";
import { ALL_MIGRATIONS } from "../../schema/migrations/0001_init.js";
import type { DatabaseAdapter, ExecuteResult } from "../../adapters/DatabaseAdapter.js";
import { camposConCambios, guardarCorrecciones, validarCorrecciones, type DestinoCorrecciones } from "../correccionesRegistro.js";

function adaptNodeSqlite(sqliteDb: DatabaseSync): DatabaseAdapter {
  const adapter: DatabaseAdapter = {
    async execute(sql, params = []): Promise<ExecuteResult> {
      const info = sqliteDb.prepare(sql).run(...(params as never[]));
      return { rowsAffected: Number(info.changes), lastInsertId: Number(info.lastInsertRowid) };
    },
    async query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
      return sqliteDb.prepare(sql).all(...(params as never[])) as T[];
    },
    async transaction(fn) {
      sqliteDb.exec("BEGIN");
      try {
        const result = await fn(adapter);
        sqliteDb.exec("COMMIT");
        return result;
      } catch (e) {
        sqliteDb.exec("ROLLBACK");
        throw e;
      }
    },
    async close() {
      sqliteDb.close();
    },
  };
  return adapter;
}

let db: DatabaseAdapter;
let destino: DestinoCorrecciones;

/** Una obra fotografica con una copia vendida, con todos los datos que el certificado muestra. */
async function crearVenta(fechaCaptura: string | null) {
  await db.execute("INSERT INTO artista (nombre_completo, es_propio) VALUES ('Juan Brath', 1)");
  const obra = await db.execute(
    "INSERT INTO obra (titulo, categoria_obra, artista_id, anio_periodo) VALUES ('El Cielo en el Agua', 'Fotografia', 1, '2024')",
  );
  const obraId = obra.lastInsertId!;
  await db.execute(
    `INSERT INTO obra_fotografia (obra_id, subtipo_fotografia, fecha_captura, anio_toma, anio_edicion, serie_proyecto)
     VALUES (?, 'DigitalFineArt', ?, ?, '2024', 'Aguas')`,
    [obraId, fechaCaptura, fechaCaptura ? Number(fechaCaptura.slice(0, 4)) : null],
  );
  const ejemplar = await db.execute(
    `INSERT INTO ejemplar (obra_id, tipo, indice, total_ediciones, numero, dimensiones, tipo_impresion, soporte_impresion, ubicacion_firma)
     VALUES (?, 'edicion', 3, 10, '3/10', '40 x 60 cm', 'Giclee', 'Hahnemuhle', 'Dorso')`,
    [obraId],
  );
  const venta = await db.execute(
    `INSERT INTO venta (obra_id, ejemplar_id, comprador_nombre, fecha_venta, lugar_venta, valor_venta)
     VALUES (?, ?, 'Ana', '2026-09-24', 'Buenos Aires', 1000)`,
    [obraId, ejemplar.lastInsertId!],
  );
  destino = { obraId, ejemplarId: ejemplar.lastInsertId!, ventaId: venta.lastInsertId! };
}

async function uno<T>(sql: string, params: unknown[]): Promise<T> {
  return (await db.query<T>(sql, params))[0];
}

beforeEach(async () => {
  db = adaptNodeSqlite(new DatabaseSync(":memory:"));
  await applyMigrations(db, ALL_MIGRATIONS);
});

describe("guardarCorrecciones", () => {
  it("guarda cada dato en el registro donde se cargo: obra, copia y venta", async () => {
    await crearVenta("2023-05-14");
    await guardarCorrecciones(db, destino, {
      titulo: "  El Cielo y el Agua  ",
      serieProyecto: "Aguas II",
      anioPeriodo: "2019-2021",
      anioEdicion: "2025",
      medidas: "50 x 70 cm",
      tipoImpresion: "Fine Art Giclée",
      soporteImpresion: "Canson Rag",
      ubicacionFirma: "Ángulo inferior derecho",
      lugar: "Córdoba",
      fecha: "2026-09-30",
    });

    expect(await uno("SELECT titulo, anio_periodo FROM obra WHERE id = ?", [destino.obraId])).toEqual({
      titulo: "El Cielo y el Agua",
      anio_periodo: "2019-2021",
    });
    expect(await uno("SELECT serie_proyecto, anio_edicion FROM obra_fotografia WHERE obra_id = ?", [destino.obraId])).toEqual({
      serie_proyecto: "Aguas II",
      anio_edicion: "2025",
    });
    expect(
      await uno("SELECT dimensiones, tipo_impresion, soporte_impresion, ubicacion_firma FROM ejemplar WHERE id = ?", [destino.ejemplarId]),
    ).toEqual({
      dimensiones: "50 x 70 cm",
      tipo_impresion: "Fine Art Giclée",
      soporte_impresion: "Canson Rag",
      ubicacion_firma: "Ángulo inferior derecho",
    });
    expect(await uno("SELECT lugar_venta, fecha_venta FROM venta WHERE id = ?", [destino.ventaId])).toEqual({
      lugar_venta: "Córdoba",
      fecha_venta: "2026-09-30",
    });
  });

  it("no toca lo que no se corrigio", async () => {
    await crearVenta("2023-05-14");
    await guardarCorrecciones(db, destino, { medidas: "50 x 70 cm" });

    expect(await uno("SELECT titulo, anio_periodo FROM obra WHERE id = ?", [destino.obraId])).toEqual({
      titulo: "El Cielo en el Agua",
      anio_periodo: "2024",
    });
    expect(await uno("SELECT tipo_impresion, ubicacion_firma, numero FROM ejemplar WHERE id = ?", [destino.ejemplarId])).toEqual({
      tipo_impresion: "Giclee",
      ubicacion_firma: "Dorso",
      numero: "3/10",
    });
    expect(await uno("SELECT lugar_venta, fecha_venta FROM venta WHERE id = ?", [destino.ventaId])).toEqual({
      lugar_venta: "Buenos Aires",
      fecha_venta: "2026-09-24",
    });
  });

  it("corrige solo el año de la toma y conserva el mes y el dia", async () => {
    await crearVenta("2023-05-14");
    await guardarCorrecciones(db, destino, { anioCaptura: "2022" });
    expect(await uno("SELECT fecha_captura, anio_toma FROM obra_fotografia WHERE obra_id = ?", [destino.obraId])).toEqual({
      fecha_captura: "2022-05-14",
      anio_toma: 2022,
    });
  });

  it("corrige el año de la toma cuando la fecha es solo el año", async () => {
    await crearVenta("2023");
    await guardarCorrecciones(db, destino, { anioCaptura: "2022" });
    expect(await uno("SELECT fecha_captura, anio_toma FROM obra_fotografia WHERE obra_id = ?", [destino.obraId])).toEqual({
      fecha_captura: "2022",
      anio_toma: 2022,
    });
  });

  it("un dato que se deja vacio queda sin valor en el registro", async () => {
    await crearVenta("2023-05-14");
    await guardarCorrecciones(db, destino, { serieProyecto: "  ", ubicacionFirma: "", lugar: "", anioEdicion: "" });
    expect(await uno("SELECT serie_proyecto, anio_edicion FROM obra_fotografia WHERE obra_id = ?", [destino.obraId])).toEqual({
      serie_proyecto: null,
      anio_edicion: null,
    });
    expect(await uno("SELECT ubicacion_firma FROM ejemplar WHERE id = ?", [destino.ejemplarId])).toEqual({ ubicacion_firma: null });
    expect(await uno("SELECT lugar_venta FROM venta WHERE id = ?", [destino.ventaId])).toEqual({ lugar_venta: null });
  });

  it("deja una nota en el historial de la obra con lo que se corrigio", async () => {
    await crearVenta("2023-05-14");
    await guardarCorrecciones(db, destino, { titulo: "Nuevo", fecha: "2026-10-01" });
    const nota = await uno<{ tipo: string; descripcion: string }>(
      "SELECT tipo, descripcion FROM historial_evento WHERE obra_id = ? ORDER BY id DESC",
      [destino.obraId],
    );
    expect(nota.tipo).toBe("edicion");
    expect(nota.descripcion).toBe("Datos corregidos desde el certificado de autenticidad: título, fecha de la venta");
  });

  it("si algo falla no se guarda nada (todo o nada)", async () => {
    await crearVenta("2023-05-14");
    await expect(guardarCorrecciones(db, { ...destino, ventaId: 9999 }, { titulo: "Cambiado", lugar: "Rosario" })).rejects.toThrow(
      /no se encontró el registro/,
    );
    expect(await uno("SELECT titulo FROM obra WHERE id = ?", [destino.obraId])).toEqual({ titulo: "El Cielo en el Agua" });
    expect(await db.query("SELECT id FROM historial_evento WHERE obra_id = ?", [destino.obraId])).toHaveLength(0);
  });

  it("avisa en vez de perder el cambio si la obra no tiene datos de fotografia", async () => {
    await db.execute("INSERT INTO artista (nombre_completo, es_propio) VALUES ('Ana', 1)");
    const obra = await db.execute("INSERT INTO obra (titulo, categoria_obra, artista_id) VALUES ('Pintura', 'Pintura', 1)");
    const ejemplar = await db.execute(
      "INSERT INTO ejemplar (obra_id, tipo, indice, total_ediciones, numero) VALUES (?, 'edicion', 1, 1, '1/1')",
      [obra.lastInsertId!],
    );
    await expect(
      guardarCorrecciones(db, { obraId: obra.lastInsertId!, ejemplarId: ejemplar.lastInsertId!, ventaId: null }, { serieProyecto: "X" }),
    ).rejects.toThrow(/no se encontró el registro/);
  });

  it("no acepta corregir lugar o fecha si la copia no tiene venta", async () => {
    await crearVenta("2023-05-14");
    await expect(guardarCorrecciones(db, { ...destino, ventaId: null }, { lugar: "Rosario" })).rejects.toThrow(/no tiene venta/);
  });

  it("no guarda correcciones que no pasan la validacion", async () => {
    await crearVenta("2023-05-14");
    await expect(guardarCorrecciones(db, destino, { titulo: "   " })).rejects.toThrow(/no válidas/);
    expect(await uno("SELECT titulo FROM obra WHERE id = ?", [destino.obraId])).toEqual({ titulo: "El Cielo en el Agua" });
  });
});

describe("validarCorrecciones", () => {
  it("el titulo no puede quedar vacio", () => {
    expect(validarCorrecciones({ titulo: " " })).toEqual([{ campo: "titulo", motivo: "obligatorio" }]);
    expect(validarCorrecciones({ titulo: "Algo" })).toEqual([]);
  });

  it("los años tienen 4 cifras (el año de edicion puede quedar vacio, el de la toma no)", () => {
    expect(validarCorrecciones({ anioCaptura: "23" })).toEqual([{ campo: "anioCaptura", motivo: "anio" }]);
    expect(validarCorrecciones({ anioCaptura: "" })).toEqual([{ campo: "anioCaptura", motivo: "anio" }]);
    expect(validarCorrecciones({ anioEdicion: "20x5" })).toEqual([{ campo: "anioEdicion", motivo: "anio" }]);
    expect(validarCorrecciones({ anioEdicion: "" })).toEqual([]);
    expect(validarCorrecciones({ anioCaptura: "2022", anioEdicion: "2025" })).toEqual([]);
  });

  it("el año de la obra admite un periodo", () => {
    expect(validarCorrecciones({ anioPeriodo: "2019-2021" })).toEqual([]);
  });

  it("la fecha de la venta tiene que ser una fecha real", () => {
    expect(validarCorrecciones({ fecha: "2026-02-30" })).toEqual([{ campo: "fecha", motivo: "fecha" }]);
    expect(validarCorrecciones({ fecha: "30/09/2026" })).toEqual([{ campo: "fecha", motivo: "fecha" }]);
    expect(validarCorrecciones({ fecha: "" })).toEqual([{ campo: "fecha", motivo: "fecha" }]);
    expect(validarCorrecciones({ fecha: "2026-09-30" })).toEqual([]);
  });
});

describe("camposConCambios", () => {
  it("lista los campos presentes, en un orden fijo", () => {
    expect(camposConCambios({ fecha: "2026-09-30", titulo: "X", medidas: "" })).toEqual(["titulo", "medidas", "fecha"]);
    expect(camposConCambios({})).toEqual([]);
  });
});
