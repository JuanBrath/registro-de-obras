import type { Migration } from "./0001_init.js";

export const migration0036EjemplarTintasFirmaSello: Migration = {
  name: "0036_ejemplar_tintas_firma_sello",
  sql: `
ALTER TABLE ejemplar ADD COLUMN tipo_tintas TEXT;
ALTER TABLE ejemplar ADD COLUMN ubicacion_firma TEXT;
ALTER TABLE ejemplar ADD COLUMN sello_seco_holograma TEXT;

INSERT INTO texto_ayuda (field_key, texto_es, texto_en) VALUES
  ('taller_impresion', 'Nombre del maestro impresor o laboratorio fotografico certificado donde se produjo la copia.', 'Name of the master printer or certified photo lab where the copy was produced.'),
  ('tipo_tintas', 'Tipo de tintas utilizadas en la impresion (ej. pigmentadas, base agua, base solvente).', 'Type of inks used in the print (e.g. pigment-based, water-based, solvent-based).'),
  ('ubicacion_firma', 'Especificar si esta firmada en el margen blanco frontal, al reverso de la copia o en una etiqueta de conservacion adherida al montaje.', 'Specify whether it is signed on the front white margin, on the back of the print, or on a conservation label attached to the mount.'),
  ('sello_seco_holograma', 'Indicar la presencia de cuno en relieve del fotografo, sello de seguridad con codigo alfanumerico dual obra + certificado.', 'Indicate the presence of an embossed dry stamp from the photographer, a security seal with a dual alphanumeric code linking the artwork and its certificate.');

UPDATE texto_ayuda
SET texto_es = 'Sustrato de montaje libre de acido, Dibond, PVC espumado, Passepartout de conservacion de algodon.',
    texto_en = 'Acid-free mounting substrate, Dibond, foam PVC, cotton conservation passepartout.'
WHERE field_key = 'tipo_enmarcado';
`,
};
