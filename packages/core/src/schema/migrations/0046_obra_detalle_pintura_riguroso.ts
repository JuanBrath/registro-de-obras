import type { Migration } from "./0001_init.js";

export const migration0046ObraDetallePinturaRiguroso: Migration = {
  name: "0046_obra_detalle_pintura_riguroso",
  sql: `
ALTER TABLE obra_detalle ADD COLUMN materiales_mixtura TEXT;
ALTER TABLE obra_detalle ADD COLUMN tipo_bastidor TEXT;
ALTER TABLE obra_detalle ADD COLUMN imprimacion_base TEXT;
ALTER TABLE obra_detalle ADD COLUMN profundidad_relieve TEXT;
ALTER TABLE obra_detalle ADD COLUMN configuracion_panel TEXT;
ALTER TABLE obra_detalle ADD COLUMN estabilidad_capas TEXT;
ALTER TABLE obra_detalle ADD COLUMN barniz_proteccion TEXT;
ALTER TABLE obra_detalle ADD COLUMN sensibilidad_ambiental TEXT;
ALTER TABLE obra_detalle ADD COLUMN estado_cantos TEXT;

INSERT INTO texto_ayuda (field_key, texto_es, texto_en) VALUES
  ('materiales_mixtura', 'Materiales añadidos ademas de la tecnica principal: collage de papel/textil, pan de oro/plata, polvo de marmol, arena, resina epoxi, pigmentos puros, carbon, grafito, etc.', 'Materials added beyond the main technique: paper/textile collage, gold/silver leaf, marble powder, sand, epoxy resin, raw pigments, charcoal, graphite, etc.'),
  ('tipo_bastidor', 'Tipo de bastidor: bastidor de madera reforzado con cuñas, travesaño doble, bastidor flotante de aluminio, etc.', 'Type of stretcher: wooden stretcher reinforced with wedges, double crossbar, floating aluminum stretcher, etc.'),
  ('imprimacion_base', 'Imprimacion o base del soporte: gesso acrilico, imprimacion tradicional a la creta, o soporte sin imprimar (raw canvas).', 'Ground or base preparation of the support: acrylic gesso, traditional chalk ground, or unprimed support (raw canvas).'),
  ('profundidad_relieve', 'Profundidad o grosor de la obra (cm), critico en obras con relieve materico o bastidores gruesos.', 'Depth or thickness of the piece (cm), critical in works with material relief or thick stretchers.'),
  ('configuracion_panel', 'Indicar si es pieza unica, diptico, triptico o poliptico, incluyendo el orden de montaje y el intervalo recomendado en centimetros entre paneles.', 'Indicate whether it is a single piece, diptych, triptych or polyptych, including the mounting order and the recommended gap in centimeters between panels.'),
  ('estabilidad_capas', 'Verificacion del anclaje de elementos pegados (collage, aplicaciones de tela, metales) y presencia de craqueladuras, cuarteos prematuros o sangrado de tintes.', 'Verification of the adhesion of attached elements (collage, fabric appliqués, metals) and presence of cracking, premature crazing or dye bleeding.'),
  ('barniz_proteccion', 'Tipo de acabado final: mate, satinado, brillante, barniz UV, resina protectora o superficie deliberadamente sin barnizar.', 'Type of final finish: matte, satin, gloss, UV varnish, protective resin, or a surface deliberately left unvarnished.'),
  ('sensibilidad_ambiental', 'Fragilidad a la luz solar directa, humedad relativa recomendada o sensibilidad al calor (clave en ceras/encausticas y resinas).', 'Sensitivity to direct sunlight, recommended relative humidity, or heat sensitivity (key for waxes/encaustics and resins).'),
  ('estado_cantos', 'Estado de los cantos del bastidor: pintados o continuacion de la obra (concebida para exhibirse sin marco), o crudos/con clavos o grapas a la vista (requiere marco o liston de proteccion).', 'Condition of the stretcher edges: painted or a continuation of the piece (meant to be shown unframed), or raw/with visible staples or nails (requires a frame or protective strip).');
`,
};
