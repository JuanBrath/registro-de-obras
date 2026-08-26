import type { Migration } from "./0001_init.js";

export const migration0058ObraFotografiaDatosCaptura: Migration = {
  name: "0058_obra_fotografia_datos_captura",
  sql: `
ALTER TABLE obra_fotografia ADD COLUMN camara TEXT;
ALTER TABLE obra_fotografia ADD COLUMN iso TEXT;
ALTER TABLE obra_fotografia ADD COLUMN velocidad_obturador TEXT;
ALTER TABLE obra_fotografia ADD COLUMN diafragma TEXT;
ALTER TABLE obra_fotografia ADD COLUMN distancia_focal TEXT;

UPDATE texto_ayuda SET
  texto_es = 'Fecha en que se capturo la imagen y software con el que se edito. Se completan solos al elegir el archivo (subiendo la imagen o indicando su ubicacion) si el archivo trae esos datos; si no, se cargan a mano.',
  texto_en = 'Date the image was captured and the software used to edit it. Filled in automatically when the file is chosen (uploading the image or pointing to its location) if the file carries that data; otherwise they are entered manually.'
WHERE field_key = 'datos_exif';

INSERT INTO texto_ayuda (field_key, texto_es, texto_en) VALUES
  ('datos_captura', 'Camara, ISO, velocidad de obturacion, diafragma y distancia focal usados para tomar la fotografia. Se completan solos al elegir el archivo (subiendo la imagen o indicando su ubicacion) si el archivo trae esos datos; si no, se cargan a mano.', 'Camera, ISO, shutter speed, aperture and focal length used to take the photograph. Filled in automatically when the file is chosen (uploading the image or pointing to its location) if the file carries that data; otherwise they are entered manually.');
`,
};
