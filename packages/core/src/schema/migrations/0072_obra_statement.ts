import type { Migration } from "./0001_init.js";

export const migration0072ObraStatement: Migration = {
  name: "0072_obra_statement",
  sql: `
ALTER TABLE obra ADD COLUMN statement TEXT;

INSERT INTO texto_ayuda (field_key, texto_es, texto_en) VALUES
  ('statement', 'Texto de statement o declaracion de intencion sobre la obra, o sobre la serie/proyecto al que pertenece.', 'Statement text about the artwork, or about the series/project it belongs to.');
`,
};
