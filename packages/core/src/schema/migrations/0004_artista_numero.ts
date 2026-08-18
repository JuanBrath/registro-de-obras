import type { Migration } from "./0001_init.js";

export const migration0004ArtistaNumero: Migration = {
  name: "0004_artista_numero",
  sql: `
ALTER TABLE artista ADD COLUMN numero_artista TEXT;
CREATE UNIQUE INDEX idx_artista_numero ON artista(numero_artista);
`,
};
