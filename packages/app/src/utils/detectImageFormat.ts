// jsPDF necesita saber el formato de la imagen (no confia en la extension del
// archivo); lo detecta por los primeros bytes en vez de asumirlo por el
// nombre, ya que miniatura_path/foto_path siempre terminan en .jpg aunque el
// archivo subido haya sido, por ejemplo, un PNG.
export function detectImageFormat(bytes: Uint8Array): "PNG" | "JPEG" | null {
  if (bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "PNG";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "JPEG";
  return null;
}
