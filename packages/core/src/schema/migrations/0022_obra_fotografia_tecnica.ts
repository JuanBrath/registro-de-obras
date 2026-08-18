import type { Migration } from "./0001_init.js";

export const migration0022ObraFotografiaTecnica: Migration = {
  name: "0022_obra_fotografia_tecnica",
  sql: `
ALTER TABLE obra_fotografia ADD COLUMN tecnica TEXT;
`,
};
