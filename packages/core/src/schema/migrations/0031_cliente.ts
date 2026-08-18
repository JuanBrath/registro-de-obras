import type { Migration } from "./0001_init.js";

export const migration0031Cliente: Migration = {
  name: "0031_cliente",
  sql: `
CREATE TABLE cliente (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  email TEXT,
  telefono TEXT,
  notas TEXT,
  fecha_alta_sistema TEXT NOT NULL DEFAULT (datetime('now'))
);
ALTER TABLE venta ADD COLUMN cliente_id INTEGER REFERENCES cliente(id) ON DELETE SET NULL;
`,
};
