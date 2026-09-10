import type { WorkspaceContext } from "@registro/core";
import { detectImageFormat } from "./detectImageFormat.js";

interface ObraConImagenes {
  imagen_alta_resolucion_path: string | null;
  miniatura_path: string | null;
}

/**
 * Lee los bytes de la imagen de una obra para insertar en un PDF. jsPDF solo
 * sabe dibujar JPEG/PNG, asi que prueba primero el archivo en alta
 * resolucion y, si no existe, no se puede leer, o es un formato que jsPDF no
 * entiende (por ejemplo un PSD/PSB/TIFF/RAW guardado como "archivo
 * original"), cae a la miniatura — que siempre es un JPEG generado por la
 * app (ver generarMiniatura.ts) y por lo tanto siempre se puede insertar.
 * Sin esta caida, la ficha/presupuesto/COA se generaban en silencio sin
 * ninguna imagen apenas el archivo original no era JPEG/PNG.
 */
export async function resolveObraImagenParaPdf(
  context: Pick<WorkspaceContext, "fs">,
  obra: ObraConImagenes,
): Promise<{ bytes: Uint8Array; formato: "PNG" | "JPEG" } | null> {
  const candidatos = [obra.imagen_alta_resolucion_path, obra.miniatura_path].filter(
    (path, i, arr): path is string => !!path && arr.indexOf(path) === i,
  );
  for (const path of candidatos) {
    try {
      const bytes = await context.fs.readFile(path);
      const formato = detectImageFormat(bytes);
      if (formato) return { bytes, formato };
    } catch {
      // Sigue probando el siguiente candidato.
    }
  }
  return null;
}
