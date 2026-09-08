import type { Migration } from "./0001_init.js";

export const migration0071AyudaImagenObraPsd: Migration = {
  name: "0071_ayuda_imagen_obra_psd",
  sql: `
UPDATE texto_ayuda SET
  texto_es = 'Se recomienda un archivo JPG liviano. No hace falta subir el archivo original en su maxima resolucion: alcanza con unos 1500 a 2000 pixeles en el lado mas largo (si se sube una imagen mas grande, el sistema la reduce automaticamente hasta un maximo de 3840 pixeles). Tambien se puede elegir un PSD o PSB de Photoshop: se usa la vista previa que Photoshop guarda dentro del archivo, que suele ser de menor resolucion que el documento original.',
  texto_en = 'A lightweight JPG file is recommended. There is no need to upload the original file at full resolution: around 1500 to 2000 pixels on the longest side is enough (if a larger image is uploaded, the system automatically resizes it down to a maximum of 3840 pixels). A Photoshop PSD or PSB file can also be chosen: the preview Photoshop saves inside the file is used, which is usually lower resolution than the original document.'
WHERE field_key = 'imagen_obra';
`,
};
