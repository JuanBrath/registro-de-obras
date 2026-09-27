import type { Migration } from "./0001_init.js";

export const migration0084AyudaImagenObra2400: Migration = {
  name: "0084_ayuda_imagen_obra_2400",
  sql: `
UPDATE texto_ayuda SET
  texto_es = 'Se recomienda un archivo JPG liviano. No hace falta subir el archivo original en su maxima resolucion: el sistema lo reduce automaticamente hasta un maximo de 2400 pixeles en el lado mas largo, que alcanza para verlo con calidad a pantalla completa. Tambien se puede elegir un PSD, PSB o TIFF: el sistema genera solo un JPG con la imagen real del archivo (no la vista previa chica), con los colores pasados a sRGB.',
  texto_en = 'A lightweight JPG file is recommended. There is no need to upload the original file at full resolution: the system automatically resizes it down to a maximum of 2400 pixels on the longest side, which is enough to view it with quality full screen. A PSD, PSB or TIFF file can also be chosen: the system generates a JPG from the file''s real image (not the small preview), with the colors converted to sRGB.'
WHERE field_key = 'imagen_obra';
`,
};
