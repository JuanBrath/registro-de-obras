import type { Migration } from "./0001_init.js";

export const migration0060ReservaResultado: Migration = {
  name: "0060_reserva_resultado",
  sql: `
CREATE TABLE reserva_resultado (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  obra_id INTEGER NOT NULL REFERENCES obra(id) ON DELETE CASCADE,
  artista_id INTEGER,
  fecha_reserva TEXT NOT NULL,
  fecha_resolucion TEXT NOT NULL DEFAULT (datetime('now')),
  resultado TEXT NOT NULL CHECK (resultado IN ('cumplida', 'caida')),
  valor_venta REAL,
  moneda TEXT
);
`,
};
