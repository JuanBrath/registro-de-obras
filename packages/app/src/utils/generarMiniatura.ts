const MINIATURA_MAX_DIMENSION = 480;
const MINIATURA_CALIDAD_JPEG = 0.85;

/**
 * Genera una miniatura JPEG real (achicada y recomprimida) a partir de
 * cualquier imagen que el navegador pueda decodificar, incluidos formatos
 * pesados como TIFF. Antes, "miniatura.jpg" terminaba siendo una copia
 * identica del archivo original con el nombre cambiado (ver
 * detectImageFormat.ts) — eso hacia cada vez mas lenta cualquier pantalla
 * que muestra muchas miniaturas a la vez, a medida que se cargaban mas
 * obras con archivos de referencia pesados.
 *
 * Si el formato no se puede decodificar en este navegador/sistema (o falla
 * cualquier otro paso), devuelve `bytesOriginales` sin tocar — mismo
 * criterio de respaldo que limitImageResolution: preferir guardar algo
 * (aunque sea pesado) antes que romper la carga de la obra.
 */
export async function generarMiniatura(
  file: File,
  bytesOriginales: Uint8Array,
  maxDimension = MINIATURA_MAX_DIMENSION,
): Promise<Uint8Array> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return bytesOriginales;
  }

  try {
    const { width, height } = bitmap;
    const scale = Math.min(1, maxDimension / Math.max(width, height));
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return bytesOriginales;
    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", MINIATURA_CALIDAD_JPEG),
    );
    if (!blob) return bytesOriginales;

    return new Uint8Array(await blob.arrayBuffer());
  } finally {
    bitmap.close();
  }
}
