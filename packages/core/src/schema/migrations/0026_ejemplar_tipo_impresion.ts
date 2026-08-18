import type { Migration } from "./0001_init.js";

export const migration0026EjemplarTipoImpresion: Migration = {
  name: "0026_ejemplar_tipo_impresion",
  sql: `
ALTER TABLE ejemplar ADD COLUMN tipo_impresion TEXT;
ALTER TABLE ejemplar ADD COLUMN taller_impresion TEXT;
`,
};
