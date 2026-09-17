import type { Migration } from "./0001_init.js";

export const migration0076ObraCalificacion: Migration = {
  name: "0076_obra_calificacion",
  sql: `
ALTER TABLE obra RENAME COLUMN marcada TO calificacion;
`,
};
