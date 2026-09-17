import type { Migration } from "./0001_init.js";

export const migration0080AyudaUbicacionArchivoCalificacionSoloNueva: Migration = {
  name: "0080_ayuda_ubicacion_archivo_calificacion_solo_nueva",
  sql: `
UPDATE texto_ayuda SET
  texto_es = 'Corresponde consignar la ubicacion real del archivo que se utiliza para la impresion de la obra. Si el archivo es JPEG, TIFF, HEIC, PSD/PSB de Photoshop o RAW de camara (CR2, NEF, ARW, ORF, DNG), el sistema puede leer automaticamente sus datos EXIF (fecha de captura, camara, etc.) y sus palabras clave. En una obra nueva, tambien toma la calificacion en estrellas que el archivo ya tenga (por ejemplo, puesta desde Lightroom o Bridge); en una obra ya cargada, la calificacion se maneja aparte, desde las estrellas de la lista de obras, y no se pisa al volver a elegir o corregir el archivo. Con otros formatos RAW (por ejemplo CR3 o RAF) esos datos todavia no se pueden leer automaticamente, pero se pueden completar a mano.',
  texto_en = 'Record the real location of the file used to print the artwork. If the file is JPEG, TIFF, HEIC, Photoshop PSD/PSB, or camera RAW (CR2, NEF, ARW, ORF, DNG), the system can automatically read its EXIF data (capture date, camera, etc.) and its keywords. For a new artwork, it also picks up the star rating the file already has (for example, set from Lightroom or Bridge); for an artwork that already exists, the rating is handled separately, from the artwork list''s stars, and is never overwritten by re-picking or fixing the file. With other RAW formats (for example CR3 or RAF) that data can''t be read automatically yet, but the fields can still be filled in manually.'
WHERE field_key = 'ubicacion_fisica_archivo';
`,
};
