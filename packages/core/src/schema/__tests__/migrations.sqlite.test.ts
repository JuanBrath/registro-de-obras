import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { applyMigrations } from "../migrationRunner.js";
import { ALL_MIGRATIONS, migration0001Init } from "../migrations/0001_init.js";
import type { DatabaseAdapter, ExecuteResult } from "../../adapters/DatabaseAdapter.js";

function adaptNodeSqlite(sqliteDb: DatabaseSync): DatabaseAdapter {
  const adapter: DatabaseAdapter = {
    async execute(sql, params = []): Promise<ExecuteResult> {
      const info = sqliteDb.prepare(sql).run(...(params as never[]));
      return { rowsAffected: info.changes, lastInsertId: Number(info.lastInsertRowid) };
    },
    async query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
      return sqliteDb.prepare(sql).all(...(params as never[])) as T[];
    },
    async transaction(fn, options) {
      const foreignKeys = options?.foreignKeys ?? true;
      if (!foreignKeys) sqliteDb.exec("PRAGMA foreign_keys = OFF");
      try {
        sqliteDb.exec("BEGIN");
        try {
          const result = await fn(adapter);
          sqliteDb.exec("COMMIT");
          return result;
        } catch (e) {
          sqliteDb.exec("ROLLBACK");
          throw e;
        }
      } finally {
        if (!foreignKeys) sqliteDb.exec("PRAGMA foreign_keys = ON");
      }
    },
    async close() {
      sqliteDb.close();
    },
  };
  return adapter;
}

describe("ALL_MIGRATIONS against real SQLite", () => {
  it("applies cleanly on a fresh database", async () => {
    const db = adaptNodeSqlite(new DatabaseSync(":memory:"));
    await applyMigrations(db, ALL_MIGRATIONS);

    const tables = await db.query<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table'");
    expect(tables.map((t) => t.name)).toEqual(
      expect.arrayContaining(["artista", "obra", "obra_fotografia", "obra_detalle", "venta", "ejemplar", "historial_evento", "texto_ayuda"]),
    );

    const helpTexts = await db.query("SELECT field_key FROM texto_ayuda");
    expect(helpTexts.length).toBeGreaterThan(0);
  });

  it("0002 and 0003 upgrade an existing 0001-only database without losing data, and are idempotent", async () => {
    const db = adaptNodeSqlite(new DatabaseSync(":memory:"));

    // Simulate a real user's existing database that only had 0001 applied,
    // with a series already loaded (mirrors the real "Camino al cielo" case: 10 ediciones + 1 PA).
    await applyMigrations(db, [migration0001Init]);
    await db.execute("INSERT INTO artista (nombre_completo, es_propio) VALUES (?, ?)", ["Juan Brath", 1]);
    const insertObra = await db.execute(
      `INSERT INTO obra (titulo, categoria_obra, artista_id, ubicacion_fisica_actual, es_seriada) VALUES (?, ?, ?, ?, ?)`,
      ["Camino al cielo", "Fotografia", 1, null, 1],
    );
    const obraId = insertObra.lastInsertId!;
    await db.execute(
      `INSERT INTO ejemplar (obra_id, tipo, indice, total_ediciones, numero) VALUES (?, 'edicion', 1, 10, '1/10')`,
      [obraId],
    );
    await db.execute(
      `INSERT INTO ejemplar (obra_id, tipo, indice, total_ediciones, numero) VALUES (?, 'prueba_artista', 1, 1, 'PA 1/1')`,
      [obraId],
    );

    // Upgrade path: apply the full migration set, as the real app does on next launch.
    await applyMigrations(db, ALL_MIGRATIONS);

    const artistaCols = await db.query<{ name: string }>("PRAGMA table_info(artista)");
    expect(artistaCols.map((c) => c.name)).toEqual(
      expect.arrayContaining([
        "id",
        "numero_artista",
        "nombre_completo",
        "es_propio",
        "contacto",
        "telefono",
        "email",
        "web",
        "notas",
        "fecha_nacimiento",
        "bio",
        "fecha_alta_sistema",
      ]),
    );

    const ventaCols = await db.query<{ name: string }>("PRAGMA table_info(venta)");
    expect(ventaCols.map((c) => c.name)).toEqual(
      expect.arrayContaining(["comprador_nombre", "comprador_contacto", "comprador_email", "comprador_telefono"]),
    );

    const ejemplarCols = await db.query<{ name: string }>("PRAGMA table_info(ejemplar)");
    expect(ejemplarCols.map((c) => c.name)).toEqual(
      expect.arrayContaining(["fecha_impresion", "soporte_impresion", "ubicacion_actual"]),
    );

    const artistas = await db.query<{ nombre_completo: string; fecha_nacimiento: string | null }>(
      "SELECT nombre_completo, fecha_nacimiento FROM artista",
    );
    expect(artistas).toEqual([{ nombre_completo: "Juan Brath", fecha_nacimiento: null }]);

    const obras = await db.query<{ titulo: string }>("SELECT titulo FROM obra");
    expect(obras).toEqual([{ titulo: "Camino al cielo" }]);

    const ejemplares = await db.query<{ numero: string; fecha_impresion: string | null }>(
      "SELECT numero, fecha_impresion FROM ejemplar ORDER BY id",
    );
    expect(ejemplares).toEqual([
      { numero: "1/10", fecha_impresion: null },
      { numero: "PA 1/1", fecha_impresion: null },
    ]);

    // Re-applying must be a no-op (no duplicate ALTER TABLE errors).
    await applyMigrations(db, ALL_MIGRATIONS);
    const applied = await db.query<{ name: string }>("SELECT name FROM _migrations ORDER BY name");
    expect(applied.map((m) => m.name)).toEqual([
      "0001_init",
      "0002_artista_perfil",
      "0003_ejemplar_detalle",
      "0004_artista_numero",
      "0005_artista_contador",
      "0006_artista_contacto",
      "0007_venta_comprador",
      "0008_artista_foto",
      "0009_obra_tags",
      "0010_etiqueta",
      "0011_venta_tipo",
      "0012_venta_moneda",
      "0013_texto_ayuda_comision",
      "0014_obra_fotografia_dimensiones",
      "0015_ejemplar_unico",
      "0016_ejemplar_enmarcado",
      "0017_venta_donacion",
      "0018_texto_ayuda_ventas_fechas",
      "0019_texto_ayuda_perfil_personal",
      "0020_artista_redes_sociales",
      "0021_ejemplar_notas",
      "0022_obra_fotografia_tecnica",
      "0023_texto_ayuda_ubicacion_fisica_archivo",
      "0024_texto_ayuda_tecnica_fotografia",
      "0025_obra_marcada",
      "0026_ejemplar_tipo_impresion",
      "0027_estado_ampliado",
      "0028_texto_ayuda_estado_ejemplar",
      "0029_estado_en_stock",
      "0030_galeria_perfil",
      "0031_cliente",
      "0032_ejemplar_precio_venta",
      "0033_ejemplar_moneda_venta",
      "0034_logos",
      "0035_cuit",
      "0036_ejemplar_tintas_firma_sello",
      "0037_obra_fotografia_escala_por_tamanos",
      "0038_obra_fotografia_subtipo_ampliado",
      "0039_categorias_obra_detalle",
      "0040_texto_ayuda_categorias_subtipos",
      "0041_ejemplar_fecha_limite",
      "0042_cliente_perfil",
      "0043_artista_perfil_extendido",
    ]);
  });

  it("0004 allows multiple artists without a numero_artista, but rejects duplicates", async () => {
    const db = adaptNodeSqlite(new DatabaseSync(":memory:"));
    await applyMigrations(db, ALL_MIGRATIONS);

    // The existing "Juan Brath" personal-registry style row never sets numero_artista — must stay valid.
    await db.execute("INSERT INTO artista (nombre_completo, es_propio) VALUES (?, ?)", ["Juan Brath", 1]);
    await db.execute("INSERT INTO artista (nombre_completo, es_propio) VALUES (?, ?)", ["Otro sin número", 0]);

    await db.execute("INSERT INTO artista (numero_artista, nombre_completo, es_propio) VALUES (?, ?, ?)", [
      "A-001",
      "Primer Artista",
      0,
    ]);

    await expect(
      db.execute("INSERT INTO artista (numero_artista, nombre_completo, es_propio) VALUES (?, ?, ?)", [
        "A-001",
        "Segundo Artista",
        0,
      ]),
    ).rejects.toThrow();
  });

  it("0011 defaults venta.tipo to 'venta' for pre-existing rows and enforces the check constraint", async () => {
    const db = adaptNodeSqlite(new DatabaseSync(":memory:"));

    // Simulate a venta row created before 0011 existed (no tipo column yet).
    await applyMigrations(db, ALL_MIGRATIONS.slice(0, 10)); // up to 0010_etiqueta
    await db.execute("INSERT INTO artista (nombre_completo, es_propio) VALUES (?, ?)", ["Juan Brath", 1]);
    const obra = await db.execute(
      `INSERT INTO obra (titulo, categoria_obra, artista_id, es_seriada) VALUES (?, ?, ?, ?)`,
      ["Camino al cielo", "Fotografia", 1, 0],
    );
    await db.execute(
      `INSERT INTO venta (obra_id, comprador_nombre, fecha_venta, valor_venta, numero_certificado) VALUES (?, ?, ?, ?, ?)`,
      [obra.lastInsertId, "Comprador Viejo", "2026-01-01", 100, 1],
    );

    await applyMigrations(db, ALL_MIGRATIONS);

    const rows = await db.query<{ tipo: string }>("SELECT tipo FROM venta");
    expect(rows).toEqual([{ tipo: "venta" }]);

    await db.execute(
      `INSERT INTO venta (obra_id, tipo, comprador_nombre, fecha_venta, valor_venta) VALUES (?, ?, ?, ?, ?)`,
      [obra.lastInsertId, "reserva", "Comprador Nuevo", "2026-02-01", 50],
    );
    await expect(
      db.execute(`INSERT INTO venta (obra_id, tipo, comprador_nombre, fecha_venta, valor_venta) VALUES (?, ?, ?, ?, ?)`, [
        obra.lastInsertId,
        "otra_cosa",
        "Comprador Invalido",
        "2026-03-01",
        10,
      ]),
    ).rejects.toThrow();
  });

  it("0012 defaults venta.moneda to 'ARS' for pre-existing rows and enforces the check constraint", async () => {
    const db = adaptNodeSqlite(new DatabaseSync(":memory:"));

    // Simulate a venta row created before 0012 existed (no moneda column yet).
    await applyMigrations(db, ALL_MIGRATIONS.slice(0, 11)); // up to 0011_venta_tipo
    await db.execute("INSERT INTO artista (nombre_completo, es_propio) VALUES (?, ?)", ["Juan Brath", 1]);
    const obra = await db.execute(
      `INSERT INTO obra (titulo, categoria_obra, artista_id, es_seriada) VALUES (?, ?, ?, ?)`,
      ["Camino al cielo", "Fotografia", 1, 0],
    );
    await db.execute(
      `INSERT INTO venta (obra_id, tipo, comprador_nombre, fecha_venta, valor_venta, numero_certificado) VALUES (?, ?, ?, ?, ?, ?)`,
      [obra.lastInsertId, "venta", "Comprador Viejo", "2026-01-01", 100, 1],
    );

    await applyMigrations(db, ALL_MIGRATIONS);

    const rows = await db.query<{ moneda: string }>("SELECT moneda FROM venta");
    expect(rows).toEqual([{ moneda: "ARS" }]);

    await db.execute(
      `INSERT INTO venta (obra_id, tipo, moneda, comprador_nombre, fecha_venta, valor_venta) VALUES (?, ?, ?, ?, ?, ?)`,
      [obra.lastInsertId, "venta", "USD", "Comprador Nuevo", "2026-02-01", 50],
    );
    await expect(
      db.execute(
        `INSERT INTO venta (obra_id, tipo, moneda, comprador_nombre, fecha_venta, valor_venta) VALUES (?, ?, ?, ?, ?, ?)`,
        [obra.lastInsertId, "venta", "GBP", "Comprador Invalido", "2026-03-01", 10],
      ),
    ).rejects.toThrow();
  });

  it("0013 rewrites the aplica_comision help text without referencing the Personal registry", async () => {
    const db = adaptNodeSqlite(new DatabaseSync(":memory:"));
    await applyMigrations(db, ALL_MIGRATIONS);

    const rows = await db.query<{ texto_es: string; texto_en: string }>(
      "SELECT texto_es, texto_en FROM texto_ayuda WHERE field_key = 'aplica_comision'",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].texto_es).not.toContain("Registro Personal");
    expect(rows[0].texto_en).not.toContain("Personal Registry");
  });

  it("0014 adds obra_fotografia.dimensiones without losing existing rows", async () => {
    const db = adaptNodeSqlite(new DatabaseSync(":memory:"));
    await applyMigrations(db, ALL_MIGRATIONS.slice(0, 13)); // up to 0013_texto_ayuda_comision

    await db.execute("INSERT INTO artista (nombre_completo, es_propio) VALUES (?, ?)", ["Juan Brath", 1]);
    const obra = await db.execute(
      `INSERT INTO obra (titulo, categoria_obra, artista_id, es_seriada) VALUES (?, ?, ?, ?)`,
      ["Camino al cielo", "Fotografia", 1, 0],
    );
    await db.execute(`INSERT INTO obra_fotografia (obra_id, subtipo_fotografia) VALUES (?, ?)`, [
      obra.lastInsertId,
      "Digital",
    ]);

    await applyMigrations(db, ALL_MIGRATIONS);

    const rows = await db.query<{ subtipo_fotografia: string; dimensiones: string | null }>(
      "SELECT subtipo_fotografia, dimensiones FROM obra_fotografia",
    );
    expect(rows).toEqual([{ subtipo_fotografia: "DigitalFineArt", dimensiones: null }]);

    await db.execute("UPDATE obra_fotografia SET dimensiones = ? WHERE obra_id = ?", [
      "300 x 450 mm",
      obra.lastInsertId,
    ]);
    const updated = await db.query<{ dimensiones: string | null }>(
      "SELECT dimensiones FROM obra_fotografia WHERE obra_id = ?",
      [obra.lastInsertId],
    );
    expect(updated).toEqual([{ dimensiones: "300 x 450 mm" }]);
  });

  it("0015 backfills a 1/1 ejemplar for existing non-seriada obras and re-points their direct venta", async () => {
    const db = adaptNodeSqlite(new DatabaseSync(":memory:"));
    await applyMigrations(db, ALL_MIGRATIONS.slice(0, 14)); // up to 0014_obra_fotografia_dimensiones

    await db.execute("INSERT INTO artista (nombre_completo, es_propio) VALUES (?, ?)", ["Juan Brath", 1]);

    // Obra unica vendida directamente (patron viejo: venta.obra_id, sin ejemplar_id).
    const obraVendida = await db.execute(
      `INSERT INTO obra (titulo, categoria_obra, artista_id, es_seriada, estado) VALUES (?, ?, ?, ?, ?)`,
      ["Camino al cielo", "Pintura", 1, 0, "vendida"],
    );
    await db.execute("INSERT INTO obra_pintura (obra_id, subtipo_pintura, dimensiones) VALUES (?, ?, ?)", [
      obraVendida.lastInsertId,
      "Original",
      "300 x 450 mm",
    ]);
    const venta = await db.execute(
      `INSERT INTO venta (obra_id, tipo, comprador_nombre, fecha_venta, valor_venta, numero_certificado) VALUES (?, ?, ?, ?, ?, ?)`,
      [obraVendida.lastInsertId, "venta", "Comprador Viejo", "2026-01-01", 1000, 1],
    );

    // Obra unica sin vender.
    const obraDisponible = await db.execute(
      `INSERT INTO obra (titulo, categoria_obra, artista_id, es_seriada, estado) VALUES (?, ?, ?, ?, ?)`,
      ["Otra obra", "Escultura", 1, 0, "disponible"],
    );

    await applyMigrations(db, ALL_MIGRATIONS);

    const ejemplaresVendida = await db.query<{
      id: number;
      numero: string;
      estado: string;
      venta_id: number;
      dimensiones: string;
    }>("SELECT id, numero, estado, venta_id, dimensiones FROM ejemplar WHERE obra_id = ?", [obraVendida.lastInsertId]);
    expect(ejemplaresVendida).toEqual([
      { id: expect.any(Number), numero: "1/1", estado: "vendida", venta_id: venta.lastInsertId, dimensiones: "300 x 450 mm" },
    ]);

    const ventaActualizada = await db.query<{ ejemplar_id: number }>("SELECT ejemplar_id FROM venta WHERE id = ?", [
      venta.lastInsertId,
    ]);
    expect(ventaActualizada[0].ejemplar_id).toBe(ejemplaresVendida[0].id);

    const ejemplaresDisponible = await db.query<{ numero: string; estado: string; venta_id: number | null }>(
      "SELECT numero, estado, venta_id FROM ejemplar WHERE obra_id = ?",
      [obraDisponible.lastInsertId],
    );
    expect(ejemplaresDisponible).toEqual([{ numero: "1/1", estado: "disponible", venta_id: null }]);
  });

  it("0016 adds ejemplar.tipo_enmarcado and tamano_final_enmarcado without losing existing rows", async () => {
    const db = adaptNodeSqlite(new DatabaseSync(":memory:"));
    await applyMigrations(db, ALL_MIGRATIONS.slice(0, 15)); // up to 0015_ejemplar_unico

    await db.execute("INSERT INTO artista (nombre_completo, es_propio) VALUES (?, ?)", ["Juan Brath", 1]);
    const obra = await db.execute(
      `INSERT INTO obra (titulo, categoria_obra, artista_id, es_seriada) VALUES (?, ?, ?, ?)`,
      ["Camino al cielo", "Fotografia", 1, 0],
    );
    await db.execute(
      `INSERT INTO ejemplar (obra_id, tipo, indice, total_ediciones, numero) VALUES (?, ?, ?, ?, ?)`,
      [obra.lastInsertId, "edicion", 1, 1, "1/1"],
    );

    await applyMigrations(db, ALL_MIGRATIONS);

    const rows = await db.query<{ numero: string; tipo_enmarcado: string | null; tamano_final_enmarcado: string | null }>(
      "SELECT numero, tipo_enmarcado, tamano_final_enmarcado FROM ejemplar WHERE obra_id = ?",
      [obra.lastInsertId],
    );
    expect(rows).toEqual([{ numero: "1/1", tipo_enmarcado: null, tamano_final_enmarcado: null }]);

    await db.execute("UPDATE ejemplar SET tipo_enmarcado = ?, tamano_final_enmarcado = ? WHERE obra_id = ?", [
      "Madera natural",
      "320 x 470 mm",
      obra.lastInsertId,
    ]);
    const updated = await db.query<{ tipo_enmarcado: string | null; tamano_final_enmarcado: string | null }>(
      "SELECT tipo_enmarcado, tamano_final_enmarcado FROM ejemplar WHERE obra_id = ?",
      [obra.lastInsertId],
    );
    expect(updated).toEqual([{ tipo_enmarcado: "Madera natural", tamano_final_enmarcado: "320 x 470 mm" }]);
  });

  it("0017 widens venta.tipo to accept 'donacion' without losing existing rows or the ejemplar link", async () => {
    const db = adaptNodeSqlite(new DatabaseSync(":memory:"));
    await applyMigrations(db, ALL_MIGRATIONS.slice(0, 16)); // up to 0016_ejemplar_enmarcado

    await db.execute("INSERT INTO artista (nombre_completo, es_propio) VALUES (?, ?)", ["Juan Brath", 1]);
    const obra = await db.execute(
      `INSERT INTO obra (titulo, categoria_obra, artista_id, es_seriada, estado) VALUES (?, ?, ?, ?, ?)`,
      ["Camino al cielo", "Fotografia", 1, 0, "vendida"],
    );
    const ejemplar = await db.execute(
      `INSERT INTO ejemplar (obra_id, tipo, indice, total_ediciones, numero, estado) VALUES (?, ?, ?, ?, ?, ?)`,
      [obra.lastInsertId, "edicion", 1, 1, "1/1", "vendida"],
    );
    const venta = await db.execute(
      `INSERT INTO venta (obra_id, ejemplar_id, tipo, comprador_nombre, fecha_venta, valor_venta, numero_certificado) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [obra.lastInsertId, ejemplar.lastInsertId, "venta", "Comprador Viejo", "2026-01-01", 1000, 1],
    );
    await db.execute("UPDATE ejemplar SET venta_id = ? WHERE id = ?", [venta.lastInsertId, ejemplar.lastInsertId]);

    await applyMigrations(db, ALL_MIGRATIONS);

    const rows = await db.query<{ comprador_nombre: string; tipo: string; numero_certificado: number }>(
      "SELECT comprador_nombre, tipo, numero_certificado FROM venta WHERE id = ?",
      [venta.lastInsertId],
    );
    expect(rows).toEqual([{ comprador_nombre: "Comprador Viejo", tipo: "venta", numero_certificado: 1 }]);

    const ejemplarLink = await db.query<{ venta_id: number }>("SELECT venta_id FROM ejemplar WHERE id = ?", [
      ejemplar.lastInsertId,
    ]);
    expect(ejemplarLink).toEqual([{ venta_id: venta.lastInsertId }]);

    await db.execute(
      `INSERT INTO venta (obra_id, tipo, comprador_nombre, fecha_venta, valor_venta) VALUES (?, ?, ?, ?, ?)`,
      [obra.lastInsertId, "donacion", "Museo Municipal", "2026-02-01", 0],
    );
    await expect(
      db.execute(`INSERT INTO venta (obra_id, tipo, comprador_nombre, fecha_venta, valor_venta) VALUES (?, ?, ?, ?, ?)`, [
        obra.lastInsertId,
        "otra_cosa",
        "Invalido",
        "2026-03-01",
        0,
      ]),
    ).rejects.toThrow();
  });

  it("0039 reclasifica Pintura en tecnicas de reproduccion como ObraGrafica y preserva Escultura en obra_detalle", async () => {
    const db = adaptNodeSqlite(new DatabaseSync(":memory:"));
    await applyMigrations(db, ALL_MIGRATIONS.slice(0, 38)); // hasta 0038, antes de la reestructuracion

    await db.execute("INSERT INTO artista (nombre_completo, es_propio) VALUES (?, ?)", ["Juan Brath", 1]);

    const original = await db.execute(
      `INSERT INTO obra (titulo, categoria_obra, artista_id, es_seriada) VALUES (?, ?, ?, ?)`,
      ["Pieza original", "Pintura", 1, 0],
    );
    await db.execute("INSERT INTO obra_pintura (obra_id, subtipo_pintura, tecnica, dimensiones) VALUES (?, ?, ?, ?)", [
      original.lastInsertId,
      "Original",
      "Oleo sobre tela",
      "50 x 70 cm",
    ]);

    const serigrafia = await db.execute(
      `INSERT INTO obra (titulo, categoria_obra, artista_id, es_seriada) VALUES (?, ?, ?, ?)`,
      ["Serie serigrafiada", "Pintura", 1, 1],
    );
    await db.execute("INSERT INTO obra_pintura (obra_id, subtipo_pintura, tecnica) VALUES (?, ?, ?)", [
      serigrafia.lastInsertId,
      "Serigrafia",
      "Serigrafia sobre papel",
    ]);

    const grabadoViejo = await db.execute(
      `INSERT INTO obra (titulo, categoria_obra, artista_id, es_seriada) VALUES (?, ?, ?, ?)`,
      ["Grabado sin especificar", "Pintura", 1, 1],
    );
    await db.execute("INSERT INTO obra_pintura (obra_id, subtipo_pintura, tecnica) VALUES (?, ?, ?)", [
      grabadoViejo.lastInsertId,
      "Grabado",
      "Tecnica mixta de grabado",
    ]);

    const escultura = await db.execute(
      `INSERT INTO obra (titulo, categoria_obra, artista_id, es_seriada) VALUES (?, ?, ?, ?)`,
      ["Bronce sin titulo", "Escultura", 1, 0],
    );
    await db.execute("INSERT INTO obra_escultura (obra_id, tecnica, dimensiones, peso) VALUES (?, ?, ?, ?)", [
      escultura.lastInsertId,
      "Bronce fundido",
      "40 x 20 x 20 cm",
      "8 kg",
    ]);

    await applyMigrations(db, ALL_MIGRATIONS);

    const categorias = await db.query<{ id: number; categoria_obra: string }>(
      "SELECT id, categoria_obra FROM obra ORDER BY id",
    );
    expect(categorias).toEqual([
      { id: original.lastInsertId, categoria_obra: "Pintura" },
      { id: serigrafia.lastInsertId, categoria_obra: "ObraGrafica" },
      { id: grabadoViejo.lastInsertId, categoria_obra: "ObraGrafica" },
      { id: escultura.lastInsertId, categoria_obra: "Escultura" },
    ]);

    const detalle = await db.query<{ obra_id: number; subtipo: string | null; tecnica: string | null }>(
      "SELECT obra_id, subtipo, tecnica FROM obra_detalle ORDER BY obra_id",
    );
    expect(detalle).toEqual([
      { obra_id: original.lastInsertId, subtipo: "TecnicasTradicionales", tecnica: "Oleo sobre tela" },
      { obra_id: serigrafia.lastInsertId, subtipo: "GrabadoPlanografico", tecnica: "Serigrafia sobre papel" },
      { obra_id: grabadoViejo.lastInsertId, subtipo: null, tecnica: "Tecnica mixta de grabado" },
      { obra_id: escultura.lastInsertId, subtipo: null, tecnica: "Bronce fundido" },
    ]);

    const tables = await db.query<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table'");
    expect(tables.map((t) => t.name)).not.toEqual(expect.arrayContaining(["obra_pintura", "obra_escultura"]));
  });

  it("0005 seeds artista_contador starting at 1 and it increments", async () => {
    const db = adaptNodeSqlite(new DatabaseSync(":memory:"));
    await applyMigrations(db, ALL_MIGRATIONS);

    const initial = await db.query<{ siguiente_numero: number }>(
      "SELECT siguiente_numero FROM artista_contador WHERE id = 1",
    );
    expect(initial).toEqual([{ siguiente_numero: 1 }]);

    await db.execute("UPDATE artista_contador SET siguiente_numero = siguiente_numero + 1 WHERE id = 1");
    const next = await db.query<{ siguiente_numero: number }>(
      "SELECT siguiente_numero FROM artista_contador WHERE id = 1",
    );
    expect(next).toEqual([{ siguiente_numero: 2 }]);
  });
});
