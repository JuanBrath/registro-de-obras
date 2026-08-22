import type { Migration } from "./0001_init.js";

export const migration0047ObraFotografiaRiguroso: Migration = {
  name: "0047_obra_fotografia_riguroso",
  sql: `
ALTER TABLE obra_fotografia ADD COLUMN serie_proyecto TEXT;

ALTER TABLE obra_fotografia ADD COLUMN clasificacion_positivado TEXT;
ALTER TABLE obra_fotografia ADD COLUMN proceso_quimico_analogica TEXT;
ALTER TABLE obra_fotografia ADD COLUMN viraje_conservacion TEXT;
ALTER TABLE obra_fotografia ADD COLUMN formato_negativo TEXT;
ALTER TABLE obra_fotografia ADD COLUMN estado_negativo TEXT;

ALTER TABLE obra_fotografia ADD COLUMN formato_archivo_maestro TEXT;
ALTER TABLE obra_fotografia ADD COLUMN espacio_color TEXT;
ALTER TABLE obra_fotografia ADD COLUMN condiciones_custodia_archivo TEXT;

ALTER TABLE obra_fotografia ADD COLUMN proceso_quimico_historicos TEXT;
ALTER TABLE obra_fotografia ADD COLUMN preparacion_soporte TEXT;
ALTER TABLE obra_fotografia ADD COLUMN metales_sales TEXT;
ALTER TABLE obra_fotografia ADD COLUMN pieza_unica_o_matriz TEXT;

ALTER TABLE obra_fotografia ADD COLUMN estructura_objeto TEXT;
ALTER TABLE obra_fotografia ADD COLUMN contenedor_estuche TEXT;
ALTER TABLE obra_fotografia ADD COLUMN incluye_copia_coleccionista INTEGER;
ALTER TABLE obra_fotografia ADD COLUMN detalle_copia_coleccionista TEXT;
ALTER TABLE obra_fotografia ADD COLUMN creditos_editoriales TEXT;
ALTER TABLE obra_fotografia ADD COLUMN isbn TEXT;
ALTER TABLE obra_fotografia ADD COLUMN colofon TEXT;

ALTER TABLE obra_fotografia ADD COLUMN motor_ia TEXT;
ALTER TABLE obra_fotografia ADD COLUMN prompt_parametros TEXT;
ALTER TABLE obra_fotografia ADD COLUMN flujo_generativo TEXT;
ALTER TABLE obra_fotografia ADD COLUMN intervencion_postproduccion TEXT;
ALTER TABLE obra_fotografia ADD COLUMN soporte_salida TEXT;
ALTER TABLE obra_fotografia ADD COLUMN declaracion_derechos_ia TEXT;

ALTER TABLE ejemplar ADD COLUMN coa_sistema_seguridad TEXT;
ALTER TABLE ejemplar ADD COLUMN informe_conservacion TEXT;
ALTER TABLE ejemplar ADD COLUMN dimensiones_soporte_completo TEXT;
ALTER TABLE ejemplar ADD COLUMN peso TEXT;

INSERT INTO texto_ayuda (field_key, texto_es, texto_en) VALUES
  ('serie_proyecto', 'Serie o proyecto al que pertenece esta obra, si forma parte de uno.', 'Series or project this artwork belongs to, if any.'),
  ('clasificacion_positivado', 'Vintage print: positivada en una fecha muy cercana a la toma (habitualmente hasta 5 años) por el propio fotografo o bajo su supervision directa. Modern/Later print: positivada años o decadas despues a partir del negativo original. Estate/positivado postumo: realizada tras la muerte del autor, autorizada por la fundacion o herederos.', 'Vintage print: printed very close in time to the shot (usually within 5 years) by the photographer or under their direct supervision. Modern/Later print: printed years or decades later from the original negative. Estate/posthumous print: made after the artist''s death, authorized by the foundation or heirs.'),
  ('proceso_quimico_analogica', 'Proceso quimico exacto: gelatina de plata (RC - Resin Coated o FB - Fiber Based/baritado), C-Print analogico tradicional, Cibachrome/Ilfochrome (inversion directa).', 'Exact chemical process: silver gelatin (RC - Resin Coated or FB - Fiber Based/baryta), traditional analog C-Print, Cibachrome/Ilfochrome (direct reversal).'),
  ('viraje_conservacion', 'Quimica y virados de conservacion: viraje al selenio, oro, sulfuro o platino, indicando si fue para estabilidad archivistica o por efecto tonal.', 'Conservation chemistry and toning: selenium, gold, sulfide or platinum toning, indicating whether it was for archival stability or for tonal effect.'),
  ('formato_negativo', 'Formato del negativo original: formato medio, 35mm, placa 4x5, 8x10, etc.', 'Format of the original negative: medium format, 35mm, 4x5 or 8x10 plate, etc.'),
  ('estado_negativo', 'Estado de conservacion del negativo original.', 'Conservation condition of the original negative.'),
  ('formato_archivo_maestro', 'Formato del archivo fuente (ej. TIFF 16-bit, RAW).', 'Format of the source file (e.g. 16-bit TIFF, RAW).'),
  ('espacio_color', 'Espacio de color incrustado en el archivo maestro (ej. Adobe RGB 1998, ProPhoto RGB).', 'Color space embedded in the master file (e.g. Adobe RGB 1998, ProPhoto RGB).'),
  ('condiciones_custodia_archivo', 'Condiciones de custodia y/o destruccion digital del archivo maestro (master file).', 'Custody conditions and/or digital destruction policy for the master file.'),
  ('proceso_quimico_historicos', 'Proceso quimico exacto: cianotipia, platinotipia/paladiotipia, goma bicromatada, ferrotipia, ambrotipia, colodion humedo, carbon directo, fotograbado/heliograbado.', 'Exact chemical process: cyanotype, platinum/palladium print, gum bichromate, tintype, ambrotype, wet collodion, carbon print, photogravure/heliogravure.'),
  ('preparacion_soporte', 'Papel de acuarela o grabado utilizado (ej. Arches Platine, Fabriano), tipo de emulsionado a mano (brocha, varilla japonesa) y visibilidad del borde de la emulsion.', 'Watercolor or printmaking paper used (e.g. Arches Platine, Fabriano), type of hand-coating (brush, Japanese hake) and visibility of the emulsion edge.'),
  ('metales_sales', 'Pureza y mezcla de las sales de hierro, platino, paladio, plata coloidal o pigmentos organicos utilizados.', 'Purity and mix of the iron, platinum, palladium, colloidal silver salts or organic pigments used.'),
  ('pieza_unica_o_matriz', 'Indicar si la obra es irrepetible por la naturaleza del emulsionado manual, o si proviene de un negativo digital intermedio ampliado (internegative).', 'Indicate whether the piece is one-of-a-kind due to the hand-coating process, or comes from an enlarged digital intermediate negative (internegative).'),
  ('estructura_objeto', 'Numero total de paginas/laminas y tipo de encuadernacion (cosido a mano, tapa dura entelada, rustica, desplegable en acordeon).', 'Total number of pages/plates and binding type (hand-sewn, cloth hardcover, softcover, accordion fold-out).'),
  ('contenedor_estuche', 'Caja de conservacion (slipcase, caja clamshell/solander) y materiales libres de acido empleados.', 'Conservation box (slipcase, clamshell/solander box) and acid-free materials used.'),
  ('detalle_copia_coleccionista', 'Datos tecnicos propios de la estampa fotografica original suelta y firmada incluida (print included).', 'Technical details of the loose, signed original photographic print included with the edition.'),
  ('creditos_editoriales', 'Editorial, diseñador del libro, ensayista/curador del texto e impresor editorial.', 'Publisher, book designer, essayist/text curator and printer.'),
  ('isbn', 'Numero ISBN de la publicacion, si aplica.', 'ISBN number of the publication, if applicable.'),
  ('colofon', 'Transcripcion exacta del colofon, con firmas de autor, diseñador y numeracion del ejemplar.', 'Exact transcription of the colophon, with author and designer signatures and copy numbering.'),
  ('motor_ia', 'Nombre y version exacta del software/modelo generativo utilizado (ej. Midjourney v6, Stable Diffusion XL, DALL-E 3, modelos LoRA propios o entrenamientos personalizados).', 'Name and exact version of the generative software/model used (e.g. Midjourney v6, Stable Diffusion XL, DALL-E 3, custom LoRA models or personal training).'),
  ('prompt_parametros', 'Registro del prompt original, negative prompts y parametros tecnicos de generacion (seed, pasos de muestreo, CFG scale, relacion de aspecto).', 'Record of the original prompt, negative prompts and technical generation parameters (seed, sampling steps, CFG scale, aspect ratio).'),
  ('flujo_generativo', 'Tipo de flujo de trabajo: Text-to-Image, Image-to-Image (usando fotografias base del autor) o ControlNet.', 'Type of workflow: Text-to-Image, Image-to-Image (using the author''s own base photographs) or ControlNet.'),
  ('intervencion_postproduccion', 'Porcentaje o grado de intervencion manual posterior: retoque digital, pintura digital, in-painting, out-painting, composicion multicapa en Photoshop.', 'Percentage or degree of subsequent manual intervention: digital retouching, digital painting, in-painting, out-painting, multi-layer compositing in Photoshop.'),
  ('soporte_salida', 'Especificar si la obra se comercializa como estampa fisica Fine Art (con sus datos de papel/tinta) o como activo digital nativo acompañado de su archivo fuente de alta resolucion/escalado algoritmico (upscaling).', 'Specify whether the piece is sold as a physical Fine Art print (with its paper/ink details) or as a native digital asset accompanied by its high-resolution source file/algorithmic upscaling.'),
  ('declaracion_derechos_ia', 'Terminos de licencia del software utilizado y declaracion formal sobre la titularidad del autor frente a las herramientas generativas.', 'License terms of the software used and formal statement on the author''s ownership claim regarding the generative tools.'),
  ('coa_sistema_seguridad', 'Sistema de seguridad del Certificado de Autenticidad (ej. hologramas numerados, marcas de agua).', 'Security system of the Certificate of Authenticity (e.g. numbered holograms, watermarks).'),
  ('informe_conservacion', 'Inspeccion de esquinas, planitud del papel, huellas, arañazos o decoloraciones de esta copia.', 'Inspection of corners, paper flatness, fingerprints, scratches or discoloration on this copy.'),
  ('dimensiones_soporte_completo', 'Medida de la hoja o soporte completo (alto x ancho en cm), distinta de la mancha de imagen.', 'Measurement of the full sheet or support (height x width in cm), as distinct from the image area.'),
  ('peso_ejemplar', 'Peso de esta copia.', 'Weight of this copy.');
`,
};
