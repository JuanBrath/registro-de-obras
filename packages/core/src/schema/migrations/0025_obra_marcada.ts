import type { Migration } from "./0001_init.js";

export const migration0025ObraMarcada: Migration = {
  name: "0025_obra_marcada",
  sql: `
ALTER TABLE obra ADD COLUMN marcada INTEGER NOT NULL DEFAULT 0;
`,
};
