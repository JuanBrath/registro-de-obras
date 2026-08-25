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

export function artistaLogoPath(idArtista: number, ext: string): string {
  return `artistas/${idArtista}/logo.${ext}`;
}

export function galeriaLogoPath(ext: string): string {
  return `galeria/logo.${ext}`;
}

export function artistaFirmaPath(idArtista: number, ext: string): string {
  return `artistas/${idArtista}/firma.${ext}`;
}

export function galeriaFirmaPath(ext: string): string {
  return `galeria/firma.${ext}`;
}
