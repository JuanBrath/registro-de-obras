import type { Migration } from "./0001_init.js";

// Historial de dossiers en PDF generados desde una seleccion: cada uno queda guardado en la carpeta del
// registro con su numero (correlativo por seleccion) y fecha, asi que generar otro nunca pisa uno anterior.
export const migration0089SeleccionDossier: Migration = {
  name: "0089_seleccion_dossier",
  sql: `
CREATE TABLE seleccion_dossier (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  seleccion_id INTEGER NOT NULL REFERENCES seleccion(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL,
  creado_en TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  archivo_path TEXT NOT NULL,
  cantidad_obras INTEGER NOT NULL DEFAULT 0,
  UNIQUE (seleccion_id, numero)
);
`,
};
