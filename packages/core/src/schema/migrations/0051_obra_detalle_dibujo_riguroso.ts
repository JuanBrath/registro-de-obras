import type { Migration } from "./0001_init.js";

export const migration0051ObraDetalleDibujoRiguroso: Migration = {
  name: "0051_obra_detalle_dibujo_riguroso",
  sql: `
ALTER TABLE obra_detalle ADD COLUMN fijacion_acabado TEXT;
ALTER TABLE obra_detalle ADD COLUMN elementos_adicionales TEXT;

ALTER TABLE ejemplar ADD COLUMN adhesivos_montaje TEXT;
ALTER TABLE ejemplar ADD COLUMN inscripciones_anotaciones TEXT;

INSERT INTO texto_ayuda (field_key, texto_es, texto_en) VALUES
  ('fijacion_acabado', 'Fijador en aerosol para pastel, carboncillo o sanguina (evita que el pigmento se desprenda).
Barniz protector para papel (poco frecuente, altera el brillo de la superficie).
Sin fijar: la obra se conserva sin ningun tratamiento de fijacion.', 'Spray fixative for pastel, charcoal or sanguine (prevents pigment from shedding).
Protective varnish for paper (uncommon, changes the surface sheen).
Unfixed: the piece is kept without any fixative treatment.'),
  ('elementos_adicionales', 'Collage de papel o textil, intervenciones matericas, pan de oro o plata, sellos de goma o tinta, perforaciones intencionales.', 'Paper or textile collage, material interventions, gold or silver leaf, rubber or ink stamps, intentional perforations.'),
  ('adhesivos_montaje', 'Cintas de conservacion reversibles: papel japones con almidon de trigo, cinta Filmoplast P90, bisagras libres de acido.
Evitar cinta adhesiva comun o pegamentos permanentes: dañan el papel a largo plazo.', 'Reversible conservation tapes: Japanese paper with wheat starch paste, Filmoplast P90 tape, acid-free hinges.
Avoid common adhesive tape or permanent glue: they damage paper over the long term.'),
  ('inscripciones_anotaciones', 'Textos manuscritos del autor, notas de estudio, bocetos al verso, o etiquetas de exposiciones previas adheridas a la pieza.', 'Handwritten texts by the artist, study notes, sketches on the verso, or previous exhibition labels attached to the piece.');

UPDATE texto_ayuda SET
  texto_es = 'Marca o fabricante del papel (ej. BFK Rives, Arches, Hahnemuhle, Fabriano, Somerset, papel japones Washi).',
  texto_en = 'Paper brand or manufacturer (e.g. BFK Rives, Arches, Hahnemuhle, Fabriano, Somerset, Japanese Washi paper).'
WHERE field_key = 'papel_marca';

UPDATE texto_ayuda SET
  texto_es = 'Hecho a mano: papel artesanal, no industrial.
Hecho a maquina: papel de produccion industrial.
Bordes con barbas (deckle edge): borde natural de fabricacion, sin cortar.
Bordes desbarbados: cortados a escuadra.
Composicion: 100% algodon, pulpa de madera libre de acido, o vitela.
Filigrana o marca de agua (watermark): marca translucida de fabricante visible al trasluz.',
  texto_en = 'Handmade: artisanal, non-industrial paper.
Machine-made: industrially produced paper.
Deckle edge: natural untrimmed manufacturing edge.
Trimmed edges: cut square.
Composition: 100% cotton, acid-free wood pulp, or vellum.
Watermark: translucent manufacturer mark visible when held to light.'
WHERE field_key = 'papel_caracteristicas';

UPDATE texto_ayuda SET
  texto_es = 'Fotografia/grabado: especificar si esta firmada en el margen blanco frontal, al reverso de la copia o en una etiqueta de conservacion adherida al montaje.
Escultura: ubicacion de la firma, fecha incisa, punzon, sello de fundicion o monograma sobre la pieza.
Dibujo: firmado y fechado al dorso, o en el angulo inferior derecho/izquierdo, a lapiz o tinta.',
  texto_en = 'Photography/print: specify whether it is signed on the front white margin, on the back of the print, or on a conservation label attached to the mount.
Sculpture: location of the signature, incised date, punch mark, foundry stamp or monogram on the piece.
Drawing: signed and dated on the verso, or in the lower right/left corner, in pencil or ink.'
WHERE field_key = 'ubicacion_firma';

UPDATE texto_ayuda SET
  texto_es = 'Fotografia/papel: inspeccion de esquinas, planitud del papel, huellas, arañazos o decoloraciones de esta copia.
Escultura: estabilidad estructural y estado de la patina o superficie de esta copia.
Dibujo: foxing (manchas de oxido/hongos), amarilleamiento por acidificacion, dobleces, rasgaduras o decoloracion por luz.',
  texto_en = 'Photography/paper: inspection of corners, paper flatness, fingerprints, scratches or discoloration on this copy.
Sculpture: structural stability and condition of the patina or surface of this copy.
Drawing: foxing (rust/mold spots), yellowing from acidification, creases, tears, or light-induced discoloration.'
WHERE field_key = 'informe_conservacion';
`,
};
