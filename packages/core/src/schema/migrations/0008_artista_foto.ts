import type { Migration } from "./0001_init.js";

export const migration0008ArtistaFoto: Migration = {
  name: "0008_artista_foto",
  sql: `
ALTER TABLE artista ADD COLUMN foto_path TEXT;
`,
};
