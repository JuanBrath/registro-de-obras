import type { Migration } from "./0001_init.js";

export const migration0009ObraTags: Migration = {
  name: "0009_obra_tags",
  sql: `
ALTER TABLE obra ADD COLUMN tags TEXT;
`,
};
