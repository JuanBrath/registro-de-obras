import type { Migration } from "./0001_init.js";

export const migration0006ArtistaContacto: Migration = {
  name: "0006_artista_contacto",
  sql: `
ALTER TABLE artista ADD COLUMN telefono TEXT;
ALTER TABLE artista ADD COLUMN email TEXT;
ALTER TABLE artista ADD COLUMN web TEXT;
`,
};
