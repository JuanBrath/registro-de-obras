// Los certificados de autenticidad (esta carpeta y pdf/) son una copia de los
// de Galeris Cert (github.com/JuanBrath/galeris-cert, carpeta src/). Si se
// corrige o mejora un diseño en un programa, hay que hacer lo mismo en el
// otro para que los dos sigan sacando el mismo certificado.
// Diferencias conocidas: Galeris Cert arranca `anioEdicion` con el año actual y
// `captura` con "Captura digital" (aca arrancan vacios, porque los datos salen
// del registro).

export type Modelo = "clasico" | "ficha" | "simple";
export type TamanoHoja = "a4" | "carta" | "a5";
/** Idioma de los titulos de cada campo (los datos van como estan cargados). */
export type Idioma = "es" | "en" | "ambos";
export type GuiasCorte = "ninguna" | "esquinas" | "recuadro";

/**
 * Todos los datos de un certificado. Los tres modelos comparten la mayoria de
 * los campos; los que usa uno solo estan marcados.
 */
export interface Certificado {
  modelo: Modelo;
  tamanoHoja: TamanoHoja;
  idioma: Idioma;
  /** Para imprimir en un papel mas grande o en bobina y cortar al tamaño elegido. */
  guiasCorte: GuiasCorte;

  imagen: Uint8Array | null;
  titulo: string;
  artista: string;
  /** Solo ficha: ciudad/pais donde reside el artista. */
  artistaReside: string;
  anioToma: string;
  /** Solo clasico. */
  anioEdicion: string;

  /** Numero de copia, ej. "3/10" o "PA 1/2". */
  copia: string;
  /** Cantidad de pruebas de autor de la edicion ("" o "0" si no tiene). */
  pruebasAutor: string;
  medidas: string;

  /** Ej. "Captura digital". En la ficha va como "Disciplina". */
  captura: string;
  /** Ej. "Impresión giclée sobre papel Hahnemühle Photo Rag 308 g". En la ficha va como "Materiales". Puede tener saltos de linea. */
  impresion: string;
  /** Ficha y simple. */
  serieProyecto: string;
  /** Solo ficha. */
  ubicacionFirma: string;

  firmaArtista: Uint8Array | null;

  /** Logo opcional (del artista, estudio o galeria). */
  logo: Uint8Array | null;
  /** Solo ficha: datos de contacto al pie y segunda firma. */
  galeriaNombre: string;
  galeriaTelefono: string;
  galeriaEmail: string;
  galeriaFirma: Uint8Array | null;
  /** Solo ficha: sin la segunda linea de firma (la de la galeria); el resto del pie queda igual. */
  sinFirmaGaleria: boolean;
  /** Sintografia (obra generada por IA): al pie va la leyenda SIN COPYRIGHT, en lugar del copyright. */
  sinCopyright: boolean;

  lugar: string;
  /** Fecha de emision, AAAA-MM-DD. */
  fecha: string;
}

function hoyISO(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** `idioma`: el de los titulos del certificado. */
export function certificadoVacio(idioma: Idioma = "es"): Certificado {
  return {
    modelo: "clasico",
    tamanoHoja: "a4",
    idioma,
    guiasCorte: "ninguna",
    imagen: null,
    titulo: "",
    artista: "",
    artistaReside: "",
    anioToma: "",
    anioEdicion: "",
    copia: "",
    pruebasAutor: "",
    medidas: "",
    captura: "",
    impresion: "",
    serieProyecto: "",
    ubicacionFirma: "",
    firmaArtista: null,
    logo: null,
    galeriaNombre: "",
    galeriaTelefono: "",
    galeriaEmail: "",
    galeriaFirma: null,
    sinFirmaGaleria: false,
    sinCopyright: false,
    lugar: "",
    fecha: hoyISO(),
  };
}

/**
 * El numero de copia ("2/7"), mas la cantidad de pruebas de autor de la
 * edicion si las hay ("2/7 + 2 PA", o "+ 2 AP" en ingles) — salvo que la
 * copia sea en si una prueba de autor ("PA 1/2"), donde sumarlas de nuevo
 * no tendria sentido.
 */
export function copiaConPA(c: Pick<Certificado, "copia" | "pruebasAutor"> & { idioma?: Idioma }): string {
  const pa = parseInt(c.pruebasAutor, 10);
  const inicio = c.copia.trim().toUpperCase();
  if (pa > 0 && c.copia && !inicio.startsWith("PA") && !inicio.startsWith("AP")) {
    return `${c.copia} + ${pa} ${c.idioma === "en" ? "AP" : "PA"}`;
  }
  return c.copia;
}
