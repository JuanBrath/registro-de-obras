import type { Migration } from "./0001_init.js";

export const migration0069ObraNotas: Migration = {
  name: "0069_obra_notas",
  sql: `
ALTER TABLE obra ADD COLUMN notas TEXT;
`,
};
