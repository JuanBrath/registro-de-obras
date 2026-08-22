import type { Migration } from "./0001_init.js";

export const migration0052ObraDetalleTextilCeramicaRiguroso: Migration = {
  name: "0052_obra_detalle_textil_ceramica_riguroso",
  sql: `
ALTER TABLE obra_detalle ADD COLUMN composicion_fibras TEXT;
ALTER TABLE obra_detalle ADD COLUMN tintes_coloracion TEXT;
ALTER TABLE obra_detalle ADD COLUMN estructura_tejido TEXT;
ALTER TABLE obra_detalle ADD COLUMN tipo_arcilla TEXT;
ALTER TABLE obra_detalle ADD COLUMN metodo_conformado TEXT;
ALTER TABLE obra_detalle ADD COLUMN tratamiento_superficie TEXT;
ALTER TABLE obra_detalle ADD COLUMN tipo_coccion TEXT;

INSERT INTO texto_ayuda (field_key, texto_es, texto_en) VALUES
  ('composicion_fibras', 'Fibras naturales: lana (especificar tipo, ej. merino), seda, lino, algodon, yute, cañamo, crin de caballo.
Fibras sinteticas o no convencionales: rayon, poliester, nylon, hilos metalicos, alambre, papel hilado, fibras opticas o recicladas.', 'Natural fibers: wool (specify type, e.g. merino), silk, linen, cotton, jute, hemp, horsehair.
Synthetic or unconventional fibers: rayon, polyester, nylon, metallic threads, wire, spun paper, optical or recycled fibers.'),
  ('tintes_coloracion', 'Tintes naturales (cochinilla, indigo, corteza), anilinas reactivas, estampacion botanica (eco-print), o fibra cruda sin teñir.', 'Natural dyes (cochineal, indigo, bark), reactive anilines, botanical printing (eco-print), or raw undyed fiber.'),
  ('estructura_tejido', 'Tipo de ligamento (tafetan, sarga, raso) o urdimbre interna estructural de la pieza.', 'Type of weave (plain, twill, satin) or the piece''s internal structural warp.'),
  ('tipo_arcilla', 'Porcelana (ej. Limoges), gres (stoneware), loza, terracota, pasta refractaria con chamota (fina/gruesa), o papel-arcilla (paper clay).', 'Porcelain (e.g. Limoges), stoneware, earthenware, terracotta, refractory clay with grog (fine/coarse), or paper clay.'),
  ('metodo_conformado', 'Torno alfarero, modelado manual (churros, planchas), talla en dureza de cuero, colada en molde de yeso, o impresion 3D ceramica.', 'Potter''s wheel, hand-building (coils, slabs), leather-hard carving, plaster mold slip casting, or 3D-printed ceramics.'),
  ('tratamiento_superficie', 'Esmalte brillante o mate, engobes, reservas de cera, terra sigillata, oxidos colorantes, bruñido manual, lustres metalicos (oro, platino), o sin esmaltar (bizcocho).', 'Glossy or matte glaze, slips, wax resist, terra sigillata, coloring oxides, hand burnishing, metallic lusters (gold, platinum), or unglazed (bisque).'),
  ('tipo_coccion', 'Temperatura: baja (950-1050 C), media o alta temperatura (1200-1300 C).
Atmosfera / tecnica: oxidacion (horno electrico), reduccion (gas/leña), raku (y variantes como obvara o humo), coccion en pozo/fosa (pit fire), o leña (anagama).', 'Temperature: low (950-1050 C), medium or high temperature (1200-1300 C).
Atmosphere / technique: oxidation (electric kiln), reduction (gas/wood), raku (and variants like obvara or smoke), pit firing, or wood firing (anagama).');

UPDATE texto_ayuda SET
  texto_es = 'Tipo de anclaje necesario (piso, pared, techo, suspendido) y especificaciones de la peana o plinto requerido para la instalacion.
Arte textil: sistema de suspension especifico, ej. varilla oculta de madera/metal, velcro de conservacion cosido, bastidor entelado, o caja de metacrilato/plexiglas.',
  texto_en = 'Type of anchoring required (floor, wall, ceiling, suspended) and specifications of the pedestal or plinth needed for installation.
Textile art: specific suspension system, e.g. hidden wood/metal rod, sewn conservation velcro, stretched fabric frame, or acrylic/plexiglass box.'
WHERE field_key = 'requisitos_instalacion';

UPDATE texto_ayuda SET
  texto_es = 'Material de la peana, plinto, base integrada o estructura portante interna (armazon), incluyendo soporte mural cuando corresponda.',
  texto_en = 'Material of the pedestal, plinth, integrated base, or internal supporting structure (armature), including wall mounts where applicable.'
WHERE field_key = 'elementos_complementarios';

UPDATE texto_ayuda SET
  texto_es = 'Fotografia/grabado: especificar si esta firmada en el margen blanco frontal, al reverso de la copia o en una etiqueta de conservacion adherida al montaje.
Escultura: ubicacion de la firma, fecha incisa, punzon, sello de fundicion o monograma sobre la pieza.
Dibujo: firmado y fechado al dorso, o en el angulo inferior derecho/izquierdo, a lapiz o tinta.
Textil/Ceramica: firma bordada, etiqueta cosida de taller al dorso, caligrafiada o monograma (textil); punzon, cuño en relieve, grabado en base, o firma a pincel bajo cubierta (ceramica).',
  texto_en = 'Photography/print: specify whether it is signed on the front white margin, on the back of the print, or on a conservation label attached to the mount.
Sculpture: location of the signature, incised date, punch mark, foundry stamp or monogram on the piece.
Drawing: signed and dated on the verso, or in the lower right/left corner, in pencil or ink.
Textile/Ceramics: embroidered signature, sewn workshop label on the back, handwritten or monogram (textile); punch mark, embossed stamp, incised on the base, or under-glaze brush signature (ceramics).'
WHERE field_key = 'ubicacion_firma';

UPDATE texto_ayuda SET
  texto_es = 'Fotografia/papel: inspeccion de esquinas, planitud del papel, huellas, arañazos o decoloraciones de esta copia.
Escultura: estabilidad estructural y estado de la patina o superficie de esta copia.
Dibujo: foxing (manchas de oxido/hongos), amarilleamiento por acidificacion, dobleces, rasgaduras o decoloracion por luz.
Textil/Ceramica: sensibilidad a la luz solar/UV en tintes textiles, o nivel de porosidad/absorcion de agua en ceramica.',
  texto_en = 'Photography/paper: inspection of corners, paper flatness, fingerprints, scratches or discoloration on this copy.
Sculpture: structural stability and condition of the patina or surface of this copy.
Drawing: foxing (rust/mold spots), yellowing from acidification, creases, tears, or light-induced discoloration.
Textile/Ceramics: sensitivity to sunlight/UV in textile dyes, or porosity/water absorption level in ceramics.'
WHERE field_key = 'informe_conservacion';

UPDATE texto_ayuda SET
  texto_es = 'Escultura: puntos de agarre recomendados, fragilidad y advertencias de transporte o embalaje para esta copia.
Textil/Ceramica: protocolo de desempolvado (microfibra seca, brocha de pelo suave o microaspiracion textil) y advertencias de fragilidad extrema para embalaje rigido (crate).',
  texto_en = 'Sculpture: recommended grip/lift points, fragility, and transport or packing warnings for this copy.
Textile/Ceramics: dusting protocol (dry microfiber, soft-bristle brush, or textile micro-vacuuming) and extreme fragility warnings for rigid crate packing.'
WHERE field_key = 'instrucciones_manipulacion';
`,
};
