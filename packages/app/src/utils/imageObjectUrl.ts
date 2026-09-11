import type { FileSystemAdapter } from "@registro/core";

export function bytesToObjectUrl(bytes: Uint8Array, mime = "image/jpeg"): string {
  const blob = new Blob([bytes as BlobPart], { type: mime });
  return URL.createObjectURL(blob);
}

/**
 * Lee en paralelo (no de a una) los archivos de una lista de rutas: la
 * espera total pasa a ser la del archivo mas lento, no la suma de todos —
 * en una lista de varias decenas de miniaturas, la diferencia es notoria,
 * mas todavia en una computadora con un procesador mas modesto. Una ruta
 * que no se puede leer (archivo faltante, etc.) se omite en silencio sin
 * afectar a las demas.
 */
export async function leerMiniaturasEnParalelo(
  fs: Pick<FileSystemAdapter, "readFile">,
  rutas: string[],
): Promise<string[]> {
  const resultados = await Promise.all(
    rutas.map(async (ruta) => {
      try {
        return bytesToObjectUrl(await fs.readFile(ruta));
      } catch {
        return null;
      }
    }),
  );
  return resultados.filter((url): url is string => url !== null);
}

/**
 * Igual que leerMiniaturasEnParalelo, pero para listas donde cada miniatura
 * necesita quedar asociada al id de su fila (para listas/grillas que
 * buscan la miniatura de cada obra por id, no solo un collage suelto).
 */
export async function leerMiniaturasPorIdEnParalelo<T>(
  fs: Pick<FileSystemAdapter, "readFile">,
  filas: T[],
  obtenerId: (fila: T) => number,
  obtenerPath: (fila: T) => string | null,
): Promise<{ urls: Record<number, string>; objectUrls: string[] }> {
  const resultados = await Promise.all(
    filas.map(async (fila) => {
      const path = obtenerPath(fila);
      if (!path) return null;
      try {
        return { id: obtenerId(fila), url: bytesToObjectUrl(await fs.readFile(path)) };
      } catch {
        return null;
      }
    }),
  );
  const urls: Record<number, string> = {};
  const objectUrls: string[] = [];
  for (const resultado of resultados) {
    if (!resultado) continue;
    urls[resultado.id] = resultado.url;
    objectUrls.push(resultado.url);
  }
  return { urls, objectUrls };
}
