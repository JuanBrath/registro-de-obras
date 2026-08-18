export function bytesToObjectUrl(bytes: Uint8Array, mime = "image/jpeg"): string {
  const blob = new Blob([bytes as BlobPart], { type: mime });
  return URL.createObjectURL(blob);
}
