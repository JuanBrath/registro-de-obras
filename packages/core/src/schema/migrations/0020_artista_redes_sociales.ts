import type { Migration } from "./0001_init.js";

export const migration0020ArtistaRedesSociales: Migration = {
  name: "0020_artista_redes_sociales",
  sql: `
ALTER TABLE artista ADD COLUMN instagram TEXT;
ALTER TABLE artista ADD COLUMN direccion TEXT;
ALTER TABLE artista ADD COLUMN x TEXT;
ALTER TABLE artista ADD COLUMN facebook TEXT;
`,
};
