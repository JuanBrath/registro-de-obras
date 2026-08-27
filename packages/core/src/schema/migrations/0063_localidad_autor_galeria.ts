import type { Migration } from "./0001_init.js";

export const migration0063LocalidadAutorGaleria: Migration = {
  name: "0063_localidad_autor_galeria",
  sql: `
ALTER TABLE artista ADD COLUMN localidad TEXT;
ALTER TABLE galeria_perfil ADD COLUMN localidad TEXT;

INSERT INTO texto_ayuda (field_key, texto_es, texto_en) VALUES
  ('localidad', 'Ciudad o localidad del domicilio, por separado de la direccion completa. Se usa, por ejemplo, junto a la fecha en el encabezado de los informes.', 'City or locality of the address, separate from the full street address. Used, for example, next to the date in the report header.');
`,
};
