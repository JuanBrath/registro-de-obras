import type { Artista, GaleriaPerfil, WorkspaceContext } from "@registro/core";

async function readOptional(context: WorkspaceContext, path: string | null | undefined): Promise<Uint8Array | null> {
  if (!path) return null;
  try {
    return await context.fs.readFile(path);
  } catch {
    return null;
  }
}

/**
 * Logo a usar en el membrete del PDF: el propio del perfil activo (personal
 * o de galeria) si existe, o null para que el llamador caiga al monograma
 * GS por defecto.
 */
export async function resolveMembreteLogoBytes(
  context: WorkspaceContext,
  personalArtista: Artista | null,
  galeriaPerfil: GaleriaPerfil | null,
): Promise<Uint8Array | null> {
  const path = context.workspace === "personal" ? personalArtista?.logoPath : galeriaPerfil?.logoPath;
  return readOptional(context, path);
}

/** Imagen de firma digital cargada en el perfil activo (personal o de galeria), si existe. */
export async function resolveFirmaBytes(
  context: WorkspaceContext,
  personalArtista: Artista | null,
  galeriaPerfil: GaleriaPerfil | null,
): Promise<Uint8Array | null> {
  const path = context.workspace === "personal" ? personalArtista?.firmaPath : galeriaPerfil?.firmaPath;
  return readOptional(context, path);
}

/** Localidad del perfil activo (del autor en personal, o de la galeria en galeria), para el encabezado de los informes. */
export function resolveLocalidad(
  context: WorkspaceContext,
  personalArtista: Artista | null,
  galeriaPerfil: GaleriaPerfil | null,
): string | null {
  return (context.workspace === "personal" ? personalArtista?.localidad : galeriaPerfil?.localidad) ?? null;
}
