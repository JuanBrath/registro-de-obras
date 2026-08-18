import type { Migration } from "./0001_init.js";

export const migration0014ObraFotografiaDimensiones: Migration = {
  name: "0014_obra_fotografia_dimensiones",
  sql: `
ALTER TABLE obra_fotografia ADD COLUMN dimensiones TEXT;

INSERT INTO texto_ayuda (field_key, texto_es, texto_en) VALUES
  ('dimensiones_fotografia', 'Tamano de la imagen impresa, en milimetros (ej. 300 x 450 mm). Se usa para generar el certificado.', 'Size of the printed image, in millimeters (e.g. 300 x 450 mm). Used to generate the certificate.');
`,
};
