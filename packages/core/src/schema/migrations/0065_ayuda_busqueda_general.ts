import type { Migration } from "./0001_init.js";

export const migration0065AyudaBusquedaGeneral: Migration = {
  name: "0065_ayuda_busqueda_general",
  sql: `
INSERT INTO texto_ayuda (field_key, texto_es, texto_en) VALUES
  ('busqueda_general', 'La busqueda encuentra coincidencias en cualquier campo (no solo en el nombre o titulo): por ejemplo, alcanza con escribir parte de un telefono, un email o un codigo para encontrar el resultado.', 'The search matches against any field (not just the name or title): for example, typing part of a phone number, an email, or a code is enough to find the result.');
`,
};
