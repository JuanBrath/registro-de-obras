export function obraOriginalPath(idObra: number, ext: string): string {
  return `obras/${idObra}/original.${ext}`;
}

export function obraMiniaturaPath(idObra: number): string {
  return `obras/${idObra}/miniatura.jpg`;
}

export function certificadoPdfPath(numeroCertificado: number): string {
  return `certificados/${numeroCertificado}.pdf`;
}

export function artistaFotoPath(idArtista: number, ext: string): string {
  return `artistas/${idArtista}/foto.${ext}`;
}
