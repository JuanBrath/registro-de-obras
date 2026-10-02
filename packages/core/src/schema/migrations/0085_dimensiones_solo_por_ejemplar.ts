import type { Migration } from "./0001_init.js";

// El tamaño de la obra en general (obra_fotografia.dimensiones / obra_detalle.dimensiones, mas
// escala_por_tamanos en Fotografia) dejaba de tener sentido para categorias con series: cada
// ejemplar/edicion ya tiene su PROPIO campo "dimensiones" (tabla ejemplar) desde hace rato, y toda
// obra -sea unica o seriada- ya tiene al menos un ejemplar (ver generarEjemplarUnico en ObraForm).
// Antes de sacar las columnas de arriba, se copia ese dato a cada ejemplar que todavia no tenga
// nada cargado ahi, para no perderlo. SQLite no permite DROP COLUMN simple sobre una tabla con
// CHECK constraints en todas las versiones -> se reconstruyen, mismo patron que 0038/0039.
export const migration0085DimensionesSoloPorEjemplar: Migration = {
  name: "0085_dimensiones_solo_por_ejemplar",
  sql: `
UPDATE ejemplar
SET dimensiones = (SELECT obra_fotografia.dimensiones FROM obra_fotografia WHERE obra_fotografia.obra_id = ejemplar.obra_id)
WHERE (ejemplar.dimensiones IS NULL OR ejemplar.dimensiones = '')
  AND EXISTS (
    SELECT 1 FROM obra_fotografia
    WHERE obra_fotografia.obra_id = ejemplar.obra_id
      AND obra_fotografia.dimensiones IS NOT NULL AND obra_fotografia.dimensiones != ''
  );

UPDATE ejemplar
SET dimensiones = (SELECT obra_detalle.dimensiones FROM obra_detalle WHERE obra_detalle.obra_id = ejemplar.obra_id)
WHERE (ejemplar.dimensiones IS NULL OR ejemplar.dimensiones = '')
  AND EXISTS (
    SELECT 1 FROM obra_detalle
    WHERE obra_detalle.obra_id = ejemplar.obra_id
      AND obra_detalle.dimensiones IS NOT NULL AND obra_detalle.dimensiones != ''
  );

CREATE TABLE obra_fotografia_new (
  obra_id INTEGER PRIMARY KEY REFERENCES obra(id) ON DELETE CASCADE,
  subtipo_fotografia TEXT NOT NULL CHECK (subtipo_fotografia IN ('AnalogicaClasica','DigitalFineArt','ProcesosHistoricos','Fotolibros','Sintografia')),
  fecha_captura TEXT,
  anio_toma INTEGER,
  anio_edicion TEXT,
  software_edicion TEXT,
  datos_exif TEXT,
  tecnica TEXT,
  serie_proyecto TEXT,
  clasificacion_positivado TEXT,
  proceso_quimico_analogica TEXT,
  viraje_conservacion TEXT,
  formato_negativo TEXT,
  estado_negativo TEXT,
  formato_archivo_maestro TEXT,
  espacio_color TEXT,
  condiciones_custodia_archivo TEXT,
  proceso_quimico_historicos TEXT,
  preparacion_soporte TEXT,
  metales_sales TEXT,
  pieza_unica_o_matriz TEXT,
  estructura_objeto TEXT,
  contenedor_estuche TEXT,
  incluye_copia_coleccionista INTEGER,
  detalle_copia_coleccionista TEXT,
  creditos_editoriales TEXT,
  isbn TEXT,
  colofon TEXT,
  motor_ia TEXT,
  prompt_parametros TEXT,
  flujo_generativo TEXT,
  intervencion_postproduccion TEXT,
  soporte_salida TEXT,
  declaracion_derechos_ia TEXT,
  camara TEXT,
  iso TEXT,
  velocidad_obturador TEXT,
  diafragma TEXT,
  distancia_focal TEXT
);

INSERT INTO obra_fotografia_new (
  obra_id, subtipo_fotografia, fecha_captura, anio_toma, anio_edicion, software_edicion, datos_exif, tecnica,
  serie_proyecto, clasificacion_positivado, proceso_quimico_analogica, viraje_conservacion, formato_negativo,
  estado_negativo, formato_archivo_maestro, espacio_color, condiciones_custodia_archivo, proceso_quimico_historicos,
  preparacion_soporte, metales_sales, pieza_unica_o_matriz, estructura_objeto, contenedor_estuche,
  incluye_copia_coleccionista, detalle_copia_coleccionista, creditos_editoriales, isbn, colofon, motor_ia,
  prompt_parametros, flujo_generativo, intervencion_postproduccion, soporte_salida, declaracion_derechos_ia,
  camara, iso, velocidad_obturador, diafragma, distancia_focal
)
SELECT
  obra_id, subtipo_fotografia, fecha_captura, anio_toma, anio_edicion, software_edicion, datos_exif, tecnica,
  serie_proyecto, clasificacion_positivado, proceso_quimico_analogica, viraje_conservacion, formato_negativo,
  estado_negativo, formato_archivo_maestro, espacio_color, condiciones_custodia_archivo, proceso_quimico_historicos,
  preparacion_soporte, metales_sales, pieza_unica_o_matriz, estructura_objeto, contenedor_estuche,
  incluye_copia_coleccionista, detalle_copia_coleccionista, creditos_editoriales, isbn, colofon, motor_ia,
  prompt_parametros, flujo_generativo, intervencion_postproduccion, soporte_salida, declaracion_derechos_ia,
  camara, iso, velocidad_obturador, diafragma, distancia_focal
FROM obra_fotografia;

DROP TABLE obra_fotografia;
ALTER TABLE obra_fotografia_new RENAME TO obra_fotografia;

CREATE TABLE obra_detalle_new (
  obra_id INTEGER PRIMARY KEY REFERENCES obra(id) ON DELETE CASCADE,
  subtipo TEXT,
  tecnica_material TEXT,
  soporte TEXT,
  tecnica TEXT,
  peso TEXT,
  fecha_creacion TEXT,
  materiales_mixtura TEXT,
  tipo_bastidor TEXT,
  imprimacion_base TEXT,
  profundidad_relieve TEXT,
  configuracion_panel TEXT,
  estabilidad_capas TEXT,
  barniz_proteccion TEXT,
  sensibilidad_ambiental TEXT,
  estado_cantos TEXT,
  matriz_material TEXT,
  matriz_estado TEXT,
  papel_marca TEXT,
  papel_gramaje TEXT,
  papel_caracteristicas TEXT,
  editor_publicador TEXT,
  materiales_principales TEXT,
  acabado_patina TEXT,
  elementos_complementarios TEXT,
  apta_exterior TEXT,
  requisitos_instalacion TEXT,
  fijacion_acabado TEXT,
  elementos_adicionales TEXT,
  composicion_fibras TEXT,
  tintes_coloracion TEXT,
  estructura_tejido TEXT,
  tipo_arcilla TEXT,
  metodo_conformado TEXT,
  tratamiento_superficie TEXT,
  tipo_coccion TEXT,
  naturaleza_obra TEXT,
  componentes_entregados TEXT,
  plan_preservacion_digital TEXT,
  instrucciones_reinstalacion TEXT,
  derechos_exhibicion TEXT,
  duracion_loop TEXT,
  especificaciones_video TEXT,
  audio_canales TEXT,
  entorno_lenguaje TEXT,
  hardware_requerido TEXT,
  conectividad TEXT,
  dimensiones_espaciales TEXT,
  condiciones_iluminacion TEXT,
  acondicionamiento_acustico TEXT,
  equipamiento_exhibicion TEXT
);

INSERT INTO obra_detalle_new (
  obra_id, subtipo, tecnica_material, soporte, tecnica, peso, fecha_creacion, materiales_mixtura, tipo_bastidor,
  imprimacion_base, profundidad_relieve, configuracion_panel, estabilidad_capas, barniz_proteccion,
  sensibilidad_ambiental, estado_cantos, matriz_material, matriz_estado, papel_marca, papel_gramaje,
  papel_caracteristicas, editor_publicador, materiales_principales, acabado_patina, elementos_complementarios,
  apta_exterior, requisitos_instalacion, fijacion_acabado, elementos_adicionales, composicion_fibras,
  tintes_coloracion, estructura_tejido, tipo_arcilla, metodo_conformado, tratamiento_superficie, tipo_coccion,
  naturaleza_obra, componentes_entregados, plan_preservacion_digital, instrucciones_reinstalacion,
  derechos_exhibicion, duracion_loop, especificaciones_video, audio_canales, entorno_lenguaje, hardware_requerido,
  conectividad, dimensiones_espaciales, condiciones_iluminacion, acondicionamiento_acustico, equipamiento_exhibicion
)
SELECT
  obra_id, subtipo, tecnica_material, soporte, tecnica, peso, fecha_creacion, materiales_mixtura, tipo_bastidor,
  imprimacion_base, profundidad_relieve, configuracion_panel, estabilidad_capas, barniz_proteccion,
  sensibilidad_ambiental, estado_cantos, matriz_material, matriz_estado, papel_marca, papel_gramaje,
  papel_caracteristicas, editor_publicador, materiales_principales, acabado_patina, elementos_complementarios,
  apta_exterior, requisitos_instalacion, fijacion_acabado, elementos_adicionales, composicion_fibras,
  tintes_coloracion, estructura_tejido, tipo_arcilla, metodo_conformado, tratamiento_superficie, tipo_coccion,
  naturaleza_obra, componentes_entregados, plan_preservacion_digital, instrucciones_reinstalacion,
  derechos_exhibicion, duracion_loop, especificaciones_video, audio_canales, entorno_lenguaje, hardware_requerido,
  conectividad, dimensiones_espaciales, condiciones_iluminacion, acondicionamiento_acustico, equipamiento_exhibicion
FROM obra_detalle;

DROP TABLE obra_detalle;
ALTER TABLE obra_detalle_new RENAME TO obra_detalle;
`,
};
