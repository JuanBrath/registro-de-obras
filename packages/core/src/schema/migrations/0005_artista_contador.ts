import type { Migration } from "./0001_init.js";

export const migration0005ArtistaContador: Migration = {
  name: "0005_artista_contador",
  sql: `
CREATE TABLE artista_contador (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  siguiente_numero INTEGER NOT NULL DEFAULT 1
);
INSERT INTO artista_contador (id, siguiente_numero) VALUES (1, 1);
`,
};
