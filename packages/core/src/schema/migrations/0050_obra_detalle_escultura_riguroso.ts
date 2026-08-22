import type { Migration } from "./0001_init.js";

export const migration0050ObraDetalleEsculturaRiguroso: Migration = {
  name: "0050_obra_detalle_escultura_riguroso",
  sql: `
ALTER TABLE obra_detalle ADD COLUMN materiales_principales TEXT;
ALTER TABLE obra_detalle ADD COLUMN acabado_patina TEXT;
ALTER TABLE obra_detalle ADD COLUMN elementos_complementarios TEXT;
ALTER TABLE obra_detalle ADD COLUMN apta_exterior TEXT;
ALTER TABLE obra_detalle ADD COLUMN requisitos_instalacion TEXT;

ALTER TABLE ejemplar ADD COLUMN instrucciones_manipulacion TEXT;

INSERT INTO texto_ayuda (field_key, texto_es, texto_en) VALUES
  ('materiales_principales', 'Bronce, marmol (especificar cantera/tipo, ej. Carrara), madera (especificar especie), resina, acero corten, ceramica, tecnica mixta, etc.', 'Bronze, marble (specify quarry/type, e.g. Carrara), wood (specify species), resin, corten steel, ceramic, mixed media, etc.'),
  ('acabado_patina', 'Tipo de tratamiento superficial: patina quimica al fuego, policromia, barniz, encerado, pulido a espejo, oxido estabilizado.', 'Type of surface treatment: fire-applied chemical patina, polychromy, varnish, waxing, mirror polish, stabilized rust/oxide.'),
  ('elementos_complementarios', 'Material de la peana, plinto, base integrada o estructura portante interna (armazon).', 'Material of the pedestal, plinth, integrated base, or internal supporting structure (armature).'),
  ('apta_exterior', 'Exterior: resiste intemperie (lluvia, sol, humedad) y puede exhibirse al aire libre.
Interior: exclusivamente para espacios cerrados, no resiste intemperie.
Ambos: apta tanto para interior como exterior.', 'Exterior: weatherproof (rain, sun, humidity) and can be displayed outdoors.
Interior: for indoor spaces only, not weatherproof.
Both: suitable for both indoor and outdoor display.'),
  ('requisitos_instalacion', 'Tipo de anclaje necesario (piso, pared, techo, suspendido) y especificaciones de la peana o plinto requerido para la instalacion.', 'Type of anchoring required (floor, wall, ceiling, suspended) and specifications of the pedestal or plinth needed for installation.'),
  ('instrucciones_manipulacion', 'Puntos de agarre recomendados, fragilidad y advertencias de transporte o embalaje para esta copia.', 'Recommended grip/lift points, fragility, and transport or packing warnings for this copy.');

UPDATE texto_ayuda SET
  texto_es = 'Nombre del maestro impresor, taller grafico, fundicion artistica o laboratorio fotografico certificado donde se produjo la copia.',
  texto_en = 'Name of the master printer, print workshop, art foundry, or certified photo lab where the copy was produced.'
WHERE field_key = 'taller_impresion';

UPDATE texto_ayuda SET
  texto_es = 'Fotografia/grabado: especificar si esta firmada en el margen blanco frontal, al reverso de la copia o en una etiqueta de conservacion adherida al montaje.
Escultura: ubicacion de la firma, fecha incisa, punzon, sello de fundicion o monograma sobre la pieza.',
  texto_en = 'Photography/print: specify whether it is signed on the front white margin, on the back of the print, or on a conservation label attached to the mount.
Sculpture: location of the signature, incised date, punch mark, foundry stamp or monogram on the piece.'
WHERE field_key = 'ubicacion_firma';

UPDATE texto_ayuda SET
  texto_es = 'Fotografia/papel: inspeccion de esquinas, planitud del papel, huellas, arañazos o decoloraciones de esta copia.
Escultura: estabilidad estructural y estado de la patina o superficie de esta copia.',
  texto_en = 'Photography/paper: inspection of corners, paper flatness, fingerprints, scratches or discoloration on this copy.
Sculpture: structural stability and condition of the patina or surface of this copy.'
WHERE field_key = 'informe_conservacion';

UPDATE texto_ayuda SET
  texto_es = 'Medida de la hoja o soporte completo (alto x ancho en cm), distinta de la mancha de imagen, o medida total de la escultura con base/peana incluida.',
  texto_en = 'Measurement of the full sheet or support (height x width in cm), as distinct from the image area, or the total sculpture measurement including its base/pedestal.'
WHERE field_key = 'dimensiones_soporte_completo';

UPDATE texto_ayuda SET
  texto_es = 'P/E (prueba de estado): muestra una fase intermedia del proceso, antes de la version final.
B.A.T. (Bon a Tirer / prueba de visto bueno): la copia aprobada por el artista como modelo para el resto de la tirada, unica por edicion.
H/C (Hors Commerce): fuera de comercio, no se vende, se usa para archivo, difusion o regalo.
P/I (prueba de impresor): copia que se queda el taller o maestro impresor como registro de su trabajo.
F/C (fundicion de estudio): copia que se queda la fundicion como registro de su trabajo, analogo a P/I en escultura fundida.
Aplica sobre pruebas de artista u otras copias fuera de la numeracion comercial regular.',
  texto_en = 'P/E (state proof): shows an intermediate phase of the process, before the final version.
B.A.T. (Bon a Tirer / approval proof): the copy approved by the artist as the model for the rest of the run, unique per edition.
H/C (Hors Commerce): not for sale, used for archives, promotion or gifting.
P/I (printer''s proof): the copy kept by the workshop or master printer as a record of their work.
F/C (foundry proof): the copy kept by the foundry as a record of their work, the cast-sculpture equivalent of P/I.
Applies to artist proofs or other copies outside the regular commercial numbering.'
WHERE field_key = 'clasificacion_prueba_especial';
`,
};
