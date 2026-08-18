import type { Migration } from "./0001_init.js";

export const migration0002ArtistaPerfil: Migration = {
  name: "0002_artista_perfil",
  sql: `
ALTER TABLE artista ADD COLUMN fecha_nacimiento TEXT;
ALTER TABLE artista ADD COLUMN bio TEXT;
`,
};
