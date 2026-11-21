import type { Migration } from "./0001_init.js";

// Selecciones: grupos de obras elegidos a mano (p. ej. para armar un dossier en PDF de una
// feria o galeria). Una obra puede estar en varias selecciones; "orden" define el orden en el PDF.
export const migration0088Selecciones: Migration = {
  name: "0088_selecciones",
  sql: `
CREATE TABLE seleccion (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  notas TEXT,
  fecha_alta TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE seleccion_obra (
  seleccion_id INTEGER NOT NULL REFERENCES seleccion(id) ON DELETE CASCADE,
  obra_id INTEGER NOT NULL REFERENCES obra(id) ON DELETE CASCADE,
  orden INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (seleccion_id, obra_id)
);
CREATE INDEX idx_seleccion_obra_obra ON seleccion_obra(obra_id);
`,
};
