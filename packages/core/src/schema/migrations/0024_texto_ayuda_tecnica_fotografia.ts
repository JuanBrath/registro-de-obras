import type { Migration } from "./0001_init.js";

export const migration0024TextoAyudaTecnicaFotografia: Migration = {
  name: "0024_texto_ayuda_tecnica_fotografia",
  sql: `
INSERT INTO texto_ayuda (field_key, texto_es, texto_en) VALUES
  ('tecnica_fotografia', 'Describe la tecnica utilizada para producir la obra (ej. toma directa, intervenida digitalmente, fotomontaje, etc.).', 'Describe the technique used to produce the piece (e.g. direct shot, digitally manipulated, photomontage, etc.).');
`,
};
