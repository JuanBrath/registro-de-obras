import type { Migration } from "./0001_init.js";

export const migration0034Logos: Migration = {
  name: "0034_logos",
  sql: `
ALTER TABLE artista ADD COLUMN logo_path TEXT;
ALTER TABLE galeria_perfil ADD COLUMN logo_path TEXT;
`,
};
