import type { Migration } from "./0001_init.js";

export const migration0021EjemplarNotas: Migration = {
  name: "0021_ejemplar_notas",
  sql: `
ALTER TABLE ejemplar ADD COLUMN notas TEXT;
`,
};
