import type { Migration } from "./0001_init.js";

export const migration0023TextoAyudaUbicacionFisicaArchivo: Migration = {
  name: "0023_texto_ayuda_ubicacion_fisica_archivo",
  sql: `
INSERT INTO texto_ayuda (field_key, texto_es, texto_en) VALUES
  ('ubicacion_fisica_archivo', 'Corresponde consignar la ubicacion real del archivo que se utiliza para la impresion de la obra.', 'Record the real location of the file used to print the artwork.');
`,
};
