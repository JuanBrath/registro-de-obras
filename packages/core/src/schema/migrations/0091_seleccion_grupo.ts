import type { Migration } from "./0001_init.js";

// Grupos de selecciones: agrupan selecciones de una misma tematica. Borrar un grupo no borra sus selecciones
// (quedan sin grupo).
export const migration0091SeleccionGrupo: Migration = {
  name: "0091_seleccion_grupo",
  sql: `
CREATE TABLE seleccion_grupo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL
);
ALTER TABLE seleccion ADD COLUMN grupo_id INTEGER REFERENCES seleccion_grupo(id) ON DELETE SET NULL;
`,
};
