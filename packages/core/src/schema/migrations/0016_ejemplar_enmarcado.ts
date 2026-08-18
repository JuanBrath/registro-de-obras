import type { Migration } from "./0001_init.js";

export const migration0016EjemplarEnmarcado: Migration = {
  name: "0016_ejemplar_enmarcado",
  sql: `
ALTER TABLE ejemplar ADD COLUMN tipo_enmarcado TEXT;
ALTER TABLE ejemplar ADD COLUMN tamano_final_enmarcado TEXT;

INSERT INTO texto_ayuda (field_key, texto_es, texto_en) VALUES
  ('tipo_enmarcado', 'Material y estilo del marco de esta copia (ej. madera natural, aluminio negro, sin marco). Aplica cuando la copia se entrega enmarcada.', 'Material and style of this copy''s frame (e.g. natural wood, black aluminum, unframed). Applies when the copy is delivered framed.'),
  ('tamano_final_enmarcado', 'Tamano final de la pieza ya enmarcada, en milimetros. Puede ser distinto al tamano de la imagen o impresion sola.', 'Final size of the piece once framed, in millimeters. May differ from the size of the image or print alone.');
`,
};
