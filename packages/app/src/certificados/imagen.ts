/**
 * Lee una imagen elegida por el usuario y la deja lista para el PDF. Las
 * fotos originales suelen pesar varios MB y venir en formatos que jsPDF no
 * entiende (HEIC, TIFF, WebP), asi que se redibujan en un canvas a un
 * tamaño razonable. Las fotos van a JPEG; firmas y logos van a PNG para
 * conservar el fondo transparente. Copia de leerImagen de Galeris Cert.
 */
export async function leerImagen(archivo: File, tipo: "foto" | "grafico"): Promise<Uint8Array> {
  const bitmap = await createImageBitmap(archivo);
  const maxLado = tipo === "foto" ? 2400 : 1200;
  const escala = Math.min(1, maxLado / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  const ctx = canvas.getContext("2d")!;
  if (tipo === "foto") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("No se pudo leer la imagen"))),
      tipo === "foto" ? "image/jpeg" : "image/png",
      0.9,
    ),
  );
  return new Uint8Array(await blob.arrayBuffer());
}
