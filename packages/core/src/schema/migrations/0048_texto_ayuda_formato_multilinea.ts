import type { Migration } from "./0001_init.js";

// Reformatea a multilinea (una caracteristica por renglon, "Nombre: explicacion")
// los textos de ayuda que quedaron redactados como un unico parrafo corrido
// pese a enumerar varias opciones distintas. HelpIcon.tsx ya sabe renderizar
// esto en negrita/separado por renglon con solo usar "\n" entre lineas.
export const migration0048TextoAyudaFormatoMultilinea: Migration = {
  name: "0048_texto_ayuda_formato_multilinea",
  sql: `
UPDATE texto_ayuda SET
  texto_es = 'Vintage print: positivada en una fecha muy cercana a la toma (habitualmente hasta 5 años) por el propio fotografo o bajo su supervision directa.
Modern/Later print: positivada años o decadas despues a partir del negativo original.
Estate/positivado postumo: realizada tras la muerte del autor, autorizada por la fundacion o herederos.',
  texto_en = 'Vintage print: printed very close in time to the shot (usually within 5 years) by the photographer or under their direct supervision.
Modern/Later print: printed years or decades later from the original negative.
Estate/posthumous print: made after the artist''s death, authorized by the foundation or heirs.'
WHERE field_key = 'clasificacion_positivado';

UPDATE texto_ayuda SET
  texto_es = 'Gelatina de plata: RC (Resin Coated) o FB (Fiber Based/baritado).
C-Print analogico: proceso tradicional.
Cibachrome/Ilfochrome: inversion directa.',
  texto_en = 'Silver gelatin: RC (Resin Coated) or FB (Fiber Based/baryta).
C-Print: traditional analog process.
Cibachrome/Ilfochrome: direct reversal.'
WHERE field_key = 'proceso_quimico_analogica';

UPDATE texto_ayuda SET
  texto_es = 'Cuño en relieve: presencia del cuño en relieve del fotografo.
Sello de seguridad: codigo alfanumerico dual que vincula la obra y su certificado.',
  texto_en = 'Embossed dry stamp: presence of an embossed dry stamp from the photographer.
Security seal: dual alphanumeric code linking the artwork and its certificate.'
WHERE field_key = 'sello_seco_holograma';

UPDATE texto_ayuda SET
  texto_es = 'Pintados o continuacion de la obra: concebida para exhibirse sin marco.
Crudos, con clavos o grapas a la vista: requiere marco o liston de proteccion.',
  texto_en = 'Painted or a continuation of the piece: meant to be shown unframed.
Raw, with visible staples or nails: requires a frame or protective strip.'
WHERE field_key = 'estado_cantos';

UPDATE texto_ayuda SET
  texto_es = 'Marco (para piezas objeto): caja americana/flotante, moldura clasica, o marco vitrina con distanciamiento si la textura sobresale.
Soporte de montaje (para impresiones): libre de acido, Dibond, o passepartout de conservacion.
Aplica cuando la copia se entrega enmarcada.',
  texto_en = 'Frame (for object-type pieces): floater/American box frame, classic moulding, or deep box frame with spacer if the texture protrudes.
Mounting board (for prints): acid-free, Dibond, or conservation matting.
Applies when the copy is delivered framed.'
WHERE field_key = 'tipo_enmarcado';
`,
};
