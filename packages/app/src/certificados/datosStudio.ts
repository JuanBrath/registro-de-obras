import type { Certificado, Modelo } from "./certificado.js";

/**
 * Lo que Galeris Studio ya sabe de la obra, la copia y la venta para armar un
 * certificado. Son datos crudos: cuales van a cada campo del certificado
 * depende del modelo elegido (ver valoresDeStudio).
 */
export interface DatosStudioCertificado {
  imagen: Uint8Array | null;
  titulo: string;
  artista: string;
  artistaReside: string;
  /** Año de la obra (o periodo), tal como esta cargado en la obra. */
  anioPeriodo: string;
  /** Año de la toma (de la fecha de captura). */
  anioCaptura: string;
  anioEdicion: string;
  copia: string;
  cantidadPruebasAutor: number;
  medidas: string;
  /** Categoria y subtipo, ej. "Fotografía — Digital Fine Art" (para la ficha). */
  categoriaLabel: string;
  /** Solo el subtipo, ej. "Digital Fine Art". */
  subtipoLabel: string;
  impresion: string;
  serieProyecto: string;
  ubicacionFirma: string;
  /** Firma y logo del perfil activo (registro personal o galeria). */
  firmaPerfil: Uint8Array | null;
  logoPerfil: Uint8Array | null;
  /** Firma del artista de la obra (la ficha representa a un artista distinto del que firma como galeria). */
  firmaArtistaObra: Uint8Array | null;
  galeriaNombre: string;
  galeriaTelefono: string;
  galeriaEmail: string;
  galeriaFirma: Uint8Array | null;
  galeriaLogo: Uint8Array | null;
  /** Punto de partida de "Lugar" y "Fecha" (los de la venta); se pueden cambiar. */
  lugar: string;
  fecha: string;
}

/**
 * Los valores que Studio ya tiene para cada campo del certificado, segun el
 * modelo. Solo aparece un campo si Studio tiene algo cargado: los que faltan
 * quedan libres para que la persona los complete (ver CertificadoEditor).
 * La cantidad de pruebas de autor siempre aparece, porque "ninguna" tambien
 * es un dato que Studio conoce.
 */
export function valoresDeStudio(d: DatosStudioCertificado, modelo: Modelo): Partial<Certificado> {
  const esFicha = modelo === "ficha";
  const todos: Partial<Certificado> = {
    imagen: d.imagen,
    titulo: d.titulo,
    artista: d.artista,
    artistaReside: d.artistaReside,
    anioToma: esFicha ? d.anioPeriodo || d.anioCaptura : d.anioCaptura,
    anioEdicion: d.anioEdicion,
    copia: d.copia,
    medidas: d.medidas,
    captura: esFicha ? d.categoriaLabel : d.subtipoLabel,
    impresion: d.impresion,
    serieProyecto: d.serieProyecto,
    ubicacionFirma: d.ubicacionFirma,
    firmaArtista: esFicha ? d.firmaArtistaObra : d.firmaPerfil,
    logo: esFicha ? d.galeriaLogo : d.logoPerfil,
    galeriaNombre: d.galeriaNombre,
    galeriaTelefono: d.galeriaTelefono,
    galeriaEmail: d.galeriaEmail,
    galeriaFirma: d.galeriaFirma,
  };
  const conDatos: Partial<Certificado> = {};
  for (const [campo, valor] of Object.entries(todos)) {
    if (valor !== "" && valor != null) Object.assign(conDatos, { [campo]: valor });
  }
  conDatos.pruebasAutor = d.cantidadPruebasAutor > 0 ? String(d.cantidadPruebasAutor) : "";
  return conDatos;
}
