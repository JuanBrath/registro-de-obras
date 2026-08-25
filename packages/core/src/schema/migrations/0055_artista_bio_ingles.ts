import type { Migration } from "./0001_init.js";

export const migration0055ArtistaBioIngles: Migration = {
  name: "0055_artista_bio_ingles",
  sql: `
ALTER TABLE artista ADD COLUMN bio_en TEXT;

INSERT INTO texto_ayuda (field_key, texto_es, texto_en) VALUES
  ('bio_en', 'Version en ingles de la biografia, opcional. Si se genera un informe en ingles y este campo esta vacio, se usa la biografia en espanol tal cual.', 'Optional English version of the biography. If a report is generated in English and this field is empty, the Spanish biography is used as-is.');
`,
};
