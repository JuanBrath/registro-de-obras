import type { Migration } from "./0001_init.js";

export const migration0062AyudaImagenObra: Migration = {
  name: "0062_ayuda_imagen_obra",
  sql: `
INSERT INTO texto_ayuda (field_key, texto_es, texto_en) VALUES
  ('imagen_obra', 'Se recomienda un archivo JPG liviano. No hace falta subir el archivo original en su maxima resolucion: alcanza con unos 1500 a 2000 pixeles en el lado mas largo (si se sube una imagen mas grande, el sistema la reduce automaticamente hasta un maximo de 3840 pixeles).', 'A lightweight JPG file is recommended. There is no need to upload the original file at full resolution: around 1500 to 2000 pixels on the longest side is enough (if a larger image is uploaded, the system automatically resizes it down to a maximum of 3840 pixels).');
`,
};
