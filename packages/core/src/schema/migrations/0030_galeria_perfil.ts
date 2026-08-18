import type { Migration } from "./0001_init.js";

export const migration0030GaleriaPerfil: Migration = {
  name: "0030_galeria_perfil",
  sql: `
CREATE TABLE galeria_perfil (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  nombre TEXT NOT NULL DEFAULT '',
  direccion TEXT,
  telefono TEXT,
  email TEXT,
  web TEXT,
  instagram TEXT,
  facebook TEXT,
  x TEXT,
  notas TEXT
);
INSERT INTO galeria_perfil (id, nombre) VALUES (1, '');
`,
};
