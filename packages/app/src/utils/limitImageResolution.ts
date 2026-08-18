const MAX_DIMENSION_4K = 3840;

// Redimensiona (lado mas largo) cualquier imagen subida que exceda 4K, para
// no acumular archivos innecesariamente pesados de camaras que ya superan
// esa resolucion. Si la imagen ya entra en el limite, la devuelve sin tocar.
export async function limitImageResolution(file: File, maxDimension = MAX_DIMENSION_4K): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  const { width, height } = bitmap;
  if (width <= maxDimension && height <= maxDimension) {
    bitmap.close();
    return file;
  }

  const scale = maxDimension / Math.max(width, height);
  const targetWidth = Math.round(width * scale);
  const targetHeight = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
  bitmap.close();

  const mimeType = file.type || "image/jpeg";
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mimeType, 0.92));
  if (!blob) return file;

  return new File([blob], file.name, { type: mimeType, lastModified: Date.now() });
}
