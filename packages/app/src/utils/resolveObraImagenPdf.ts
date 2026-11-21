import type { WorkspaceContext } from "@registro/core";
import { detectImageFormat } from "./detectImageFormat.js";

interface ObraConImagenes {
  imagen_alta_resolucion_path: string | null;
  miniatura_path: string | null;
}

const LADO_MAXIMO_REENCODE = 2400;

/** jsPDF no sabe incrustar JPEG "progresivos": se detectan buscando el marcador SOF2 antes del primer scan. */
function esJpegProgresivo(bytes: Uint8Array): boolean {
  let i = 2;
  while (i + 3 < bytes.length) {
    if (bytes[i] !== 0xff) return false;
    const marcador = bytes[i + 1];
    if (marcador === 0xc2) return true;
    if (marcador === 0xda) return false;
    i += 2 + ((bytes[i + 2] << 8) | bytes[i + 3]);
  }
  return false;
}

/**
 * Deja la imagen lista para jsPDF: JPEG/PNG normales pasan tal cual; cualquier otra cosa que el
 * sistema pueda decodificar (WebP, AVIF, TIFF en Safari, JPEG progresivo…) se vuelve a codificar
 * como JPEG de alta calidad (hasta 2400 px), en vez de descartarla y caer a la miniatura.
 */
async function aImagenIncrustable(bytes: Uint8Array): Promise<{ bytes: Uint8Array; formato: "PNG" | "JPEG" } | null> {
  const formato = detectImageFormat(bytes);
  if (formato === "PNG" || (formato === "JPEG" && !esJpegProgresivo(bytes))) return { bytes, formato };
  try {
    const bitmap = await createImageBitmap(new Blob([bytes as BlobPart]));
    try {
      const escala = Math.min(1, LADO_MAXIMO_REENCODE / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * escala));
      canvas.height = Math.max(1, Math.round(bitmap.height * escala));
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.93));
      if (!blob) return null;
      return { bytes: new Uint8Array(await blob.arrayBuffer()), formato: "JPEG" };
    } finally {
      bitmap.close();
    }
  } catch {
    return null;
  }
}

/**
 * Lee los bytes de la imagen de una obra para insertar en un PDF: la misma que se ve a pantalla
 * completa en Galería de obras (la imagen en alta resolución de la obra) y, solo si no existe o no
 * se puede leer ni convertir, la miniatura (480 px). `usoMiniatura` avisa cuando pasó eso, para poder
 * advertir que esa imagen saldrá con baja calidad.
 */
export async function resolveObraImagenParaPdf(
  context: Pick<WorkspaceContext, "fs">,
  obra: ObraConImagenes,
): Promise<{ bytes: Uint8Array; formato: "PNG" | "JPEG"; usoMiniatura: boolean } | null> {
  const candidatos = [obra.imagen_alta_resolucion_path, obra.miniatura_path].filter(
    (path, i, arr): path is string => !!path && arr.indexOf(path) === i,
  );
  for (const path of candidatos) {
    try {
      const leida = await context.fs.readFile(path);
      const lista = await aImagenIncrustable(leida);
      if (lista) return { ...lista, usoMiniatura: path !== obra.imagen_alta_resolucion_path };
    } catch {
      // Sigue probando el siguiente candidato.
    }
  }
  return null;
}
