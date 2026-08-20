import type { Migration } from "./0001_init.js";

export const migration0037ObraFotografiaEscalaPorTamanos: Migration = {
  name: "0037_obra_fotografia_escala_por_tamanos",
  sql: `
ALTER TABLE obra_fotografia ADD COLUMN escala_por_tamanos TEXT;

INSERT INTO texto_ayuda (field_key, texto_es, texto_en) VALUES
  ('escala_por_tamanos', 'Si la serie se divide en diferentes dimensiones dejar constancia.', 'If the edition is split across different sizes, note it here.');
`,
};
