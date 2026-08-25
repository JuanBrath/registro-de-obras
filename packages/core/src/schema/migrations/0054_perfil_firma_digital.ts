import type { Migration } from "./0001_init.js";

export const migration0054PerfilFirmaDigital: Migration = {
  name: "0054_perfil_firma_digital",
  sql: `
ALTER TABLE artista ADD COLUMN firma_path TEXT;
ALTER TABLE galeria_perfil ADD COLUMN firma_path TEXT;

INSERT INTO texto_ayuda (field_key, texto_es, texto_en) VALUES
  ('firma_digital', 'Imagen de la firma (fondo transparente o blanco) para embeber automaticamente en los informes que se generen eligiendo "firma digital", en vez de dejar el espacio en blanco para firmar a mano.', 'Signature image (transparent or white background) to embed automatically in reports generated with the "digital signature" option, instead of leaving a blank space to sign by hand.');
`,
};
