import { invoke } from "@tauri-apps/api/core";

/**
 * Convierte un PSD, PSB o TIFF en un JPEG chico (sRGB), para que se vea bien a pantalla completa. Lo hace el lado
 * de Rust (src-tauri/src/imagen.rs), igual en macOS y en Windows, leyendo el archivo por su ruta: un PSB puede
 * pesar varios GB y no se puede cargar entero en el navegador.
 */

/**
 * El lado mas largo que puede tener la "imagen de la obra" guardada en el registro, en pixeles: alcanza para
 * verla con calidad a pantalla completa sin pesar de mas (el mismo valor lo usa limitImageResolution.ts para
 * los formatos que no pasan por esta conversion, como JPG o PNG).
 */
export const LADO_MAXIMO_IMAGEN_OBRA = 2400;

/** Los formatos que se convierten solos a JPEG al elegirlos. */
export const EXTENSIONES_A_CONVERTIR = ["psd", "psb", "tif", "tiff"];

/** Los formatos que se pueden elegir en "Imagen de la obra". */
export const EXTENSIONES_DE_IMAGEN = ["jpg", "jpeg", "png", "gif", "webp", ...EXTENSIONES_A_CONVERTIR];

export const TIPO_MIME_POR_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

export function extensionDe(ruta: string): string {
  return ruta.split(/[\\/]/).pop()?.split(".").pop()?.toLowerCase() ?? "";
}

export function nombreDe(ruta: string): string {
  return ruta.split(/[\\/]/).pop() ?? ruta;
}

/** El JPEG generado a partir de la imagen del archivo. Falla con un texto si el archivo no se pudo leer o usa algo no soportado. */
export async function convertirImagenAJpeg(ruta: string, ladoMaximo: number = LADO_MAXIMO_IMAGEN_OBRA): Promise<Uint8Array> {
  const bytes = await invoke<ArrayBuffer>("convertir_imagen_a_jpeg", { ruta, ladoMaximo });
  return new Uint8Array(bytes);
}

/** Los bytes de un archivo elegido con el dialogo del sistema (o solo el principio, con `maxBytes`). */
export async function leerArchivoCrudo(ruta: string, maxBytes?: number): Promise<Uint8Array> {
  const bytes = await invoke<ArrayBuffer>("leer_archivo_crudo", { ruta, maxBytes });
  return new Uint8Array(bytes);
}
