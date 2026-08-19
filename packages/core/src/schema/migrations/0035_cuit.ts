import type { Migration } from "./0001_init.js";

export const migration0035Cuit: Migration = {
  name: "0035_cuit",
  sql: `
ALTER TABLE artista ADD COLUMN cuit TEXT;
ALTER TABLE galeria_perfil ADD COLUMN cuit TEXT;
ALTER TABLE cliente ADD COLUMN cuit TEXT;
`,
};
