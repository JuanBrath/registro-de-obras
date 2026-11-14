import type { Migration } from "./0001_init.js";

export const migration0067AyudaEtiquetas: Migration = {
  name: "0067_ayuda_etiquetas",
  sql: `
INSERT INTO texto_ayuda (field_key, texto_es, texto_en) VALUES
  ('etiquetas_obra', 'Las etiquetas son propias de Recer: sirven para clasificar y buscar obras dentro del sistema, pero no se graban en los metadatos del archivo original. Si el archivo ya tiene palabras clave (keywords) cargadas en programas como Lightroom, se leen automaticamente la primera vez que se indica su ubicacion — pero de ahi en mas viven solo aca: cambiarlas en Recer no modifica el archivo, ni al reves.', 'Tags are specific to Recer: they are used to classify and search artworks within the system, but they are not written into the original file''s metadata. If the file already has keywords loaded in programs like Lightroom, they are read automatically the first time its location is set — but from then on they live only here: changing them in Recer does not modify the file, nor the other way around.');
`,
};
