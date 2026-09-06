import type { Migration } from "./0001_init.js";

export const migration0068AyudaUbicacionEtiquetas: Migration = {
  name: "0068_ayuda_ubicacion_etiquetas",
  sql: `
UPDATE texto_ayuda SET
  texto_es = 'Corresponde consignar la ubicacion real del archivo que se utiliza para la impresion de la obra. Si el archivo es JPEG, TIFF o HEIC, el sistema puede leer automaticamente sus datos EXIF (fecha de captura, camara, etc.) y, la primera vez que se indica su ubicacion, tambien sus palabras clave (si tiene) como etiquetas iniciales. Con otros formatos (por ejemplo PSD) esos datos no se pueden leer automaticamente, pero se pueden completar a mano.',
  texto_en = 'Record the real location of the file used to print the artwork. If the file is JPEG, TIFF or HEIC, the system can automatically read its EXIF data (capture date, camera, etc.) and, the first time its location is set, also its keywords (if any) as initial tags. With other formats (for example PSD) that data cannot be read automatically, but the fields can still be filled in manually.'
WHERE field_key = 'ubicacion_fisica_archivo';
`,
};
