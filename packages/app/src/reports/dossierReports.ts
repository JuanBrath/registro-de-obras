import type { jsPDF } from "jspdf";
import { fittedImageSize, registerBrandFonts } from "../utils/pdfBranding.js";

/** Una obra de la selección, con los datos ya resueltos (formateados) para dibujar. */
export interface DossierObra {
  id: number;
  artistaId: number;
  artistaNombre: string;
  titulo: string;
  anio: string | null;
  tecnica: string | null;
  /** Ya en cm si se pudo convertir (ej. "40 × 30 × 15 cm"). */
  medidas: string | null;
  /** Precio ya formateado sin sufijo (ej. "U$ 1.000"), o null si no hay. */
  precio: string | null;
  /** Primer ejemplar disponible de una obra seriada, ya con etiqueta (ej. "Ejemplar 3/10"), o null. */
  numeroSerie: string | null;
  /** Pruebas de artista disponibles, ya con etiqueta (ej. "2 pruebas de artista"), o null. */
  pruebasArtista: string | null;
  imagen: { bytes: Uint8Array; formato: "PNG" | "JPEG" } | null;
}

export interface DossierArtista {
  id: number;
  nombre: string;
  /** Textos ya con las ediciones hechas en el asistente (no se guardan en el artista): uno por idioma, cada uno en su página. */
  bios: string[];
}

export interface DossierOpciones {
  /** Texto principal de la portada (por defecto el nombre del artista); vacío = sin portada. */
  tituloPortada: string;
  /** Segunda línea de la portada (nombre de la selección), o vacío para omitirla. */
  subtituloPortada: string;
  /** Texto libre adicional en la portada (debajo del nombre de la selección), o vacío para omitirlo. */
  textoAdicionalPortada: string;
  /** Tamaño de letra del texto principal de la portada, en puntos. */
  tamanoPortada: number;
  incluirBio: boolean;
  /** Título de la página de statement (nombre de la selección) y su texto; sin texto = sin página. */
  statementTitulo: string;
  statementTextos: string[];
  /** Si la ficha de cada obra empieza con el nombre del artista (en Studio sobra: ya figura en la portada). */
  incluirNombreArtista: boolean;
  incluirTituloAnio: boolean;
  incluirTecnica: boolean;
  incluirMedidas: boolean;
  incluirPrecio: boolean;
  incluirNumeroSerie: boolean;
  incluirPruebasArtista: boolean;
  /** Se agrega después del precio ("+ IVA"). */
  sufijoPrecio: string;
  /** Texto que se agrega si varias obras comparten ficha ("c/u"). */
  sufijoCadaUno: string;
  /** Obras por hoja por defecto. */
  obrasPorPagina: number;
  /** Excepciones: número de hoja de obras (1, 2, 3…) -> cantidad de obras en esa hoja. */
  obrasPorPaginaExcepciones: Record<number, number>;
  /** Tamaño y orientación de la hoja. */
  formatoPagina: "a4" | "oficio";
  orientacion: "horizontal" | "vertical";
  contactoLineas: string[];
  logoBytes: Uint8Array | null;
}

const M = 15;
const GRID: Record<number, [number, number]> = {
  1: [1, 1],
  2: [2, 1],
  3: [3, 1],
  4: [2, 2],
  5: [3, 2],
  6: [3, 2],
  7: [4, 2],
  8: [4, 2],
  9: [3, 3],
  10: [5, 2],
  11: [4, 3],
  12: [4, 3],
};

function gridPara(n: number, vertical: boolean): [number, number] {
  let cols: number;
  let filas: number;
  if (GRID[n]) [cols, filas] = GRID[n];
  else {
    cols = Math.ceil(Math.sqrt(n * 1.5));
    filas = Math.ceil(n / cols);
  }
  // En hoja vertical se invierte: más filas que columnas.
  return vertical ? [filas, cols] : [cols, filas];
}
const GRIS: [number, number, number] = [110, 110, 110];
const NEGRO: [number, number, number] = [40, 40, 40];

/** "300 x 450 mm" -> "30 × 45 cm". Si no tiene ese formato se deja tal cual. */
export function medidasEnCm(texto: string | null): string | null {
  if (!texto) return null;
  const m = texto.trim().match(/^(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)(?:\s*[x×]\s*(\d+(?:[.,]\d+)?))?\s*mm$/i);
  if (!m) return texto.trim();
  const cm = (v: string) => String(Math.round((parseFloat(v.replace(",", ".")) / 10) * 10) / 10).replace(".", ",");
  const partes = [m[1], m[2], m[3]].filter((p): p is string => !!p).map(cm);
  return `${partes.join(" × ")} cm`;
}

export function formatearPrecio(valor: number | null, moneda: string | null): string | null {
  if (valor == null) return null;
  const prefijo = !moneda ? "" : /^(usd|us\$|u\$s|u\$)$/i.test(moneda) ? "U$ " : `${moneda} `;
  return `${prefijo}${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(valor)}`;
}

function lineasCaption(obra: DossierObra, o: DossierOpciones, cadaUno: boolean): { gris: string[]; negrita: string | null } {
  const gris: string[] = [];
  if (o.incluirTituloAnio) gris.push(obra.anio ? `${obra.titulo}, ${obra.anio}` : obra.titulo);
  if (o.incluirTecnica && obra.tecnica) gris.push(obra.tecnica);
  if (o.incluirMedidas && obra.medidas) gris.push(obra.medidas);
  if (o.incluirNumeroSerie && obra.numeroSerie) gris.push(obra.numeroSerie);
  if (o.incluirPruebasArtista && obra.pruebasArtista) gris.push(obra.pruebasArtista);
  let negrita: string | null = null;
  if (o.incluirPrecio && obra.precio) {
    negrita = [obra.precio, o.sufijoPrecio.trim(), cadaUno ? o.sufijoCadaUno.trim() : ""].filter(Boolean).join(" ");
  }
  return { gris, negrita };
}

function firmaCaption(obra: DossierObra, o: DossierOpciones): string {
  const c = lineasCaption(obra, o, false);
  return [o.incluirNombreArtista ? obra.artistaNombre : "", ...c.gris, c.negrita ?? ""].join("\n");
}

function escribirCaption(
  doc: jsPDF,
  obra: DossierObra,
  o: DossierOpciones,
  cadaUno: boolean,
  x: number,
  y: number,
  ancho: number,
  size: number,
): void {
  const c = lineasCaption(obra, o, cadaUno);
  const lh = size * 0.46;
  let cy = y;
  doc.setFont("Inter", "medium");
  doc.setFontSize(size);
  doc.setTextColor(...NEGRO);
  if (o.incluirNombreArtista) {
    doc.text(obra.artistaNombre, x, cy);
    cy += lh * 1.9;
  }
  doc.setFont("Inter", "normal");
  doc.setTextColor(...GRIS);
  for (const linea of c.gris) {
    for (const l of doc.splitTextToSize(linea, ancho) as string[]) {
      doc.text(l, x, cy);
      cy += lh;
    }
  }
  if (c.negrita) {
    cy += lh * 0.8;
    doc.setFont("Inter", "medium");
    doc.setTextColor(...NEGRO);
    doc.text(c.negrita, x, cy);
  }
}

function alturaCaption(obra: DossierObra, o: DossierOpciones, size: number): number {
  const c = lineasCaption(obra, o, false);
  const lh = size * 0.46;
  return (o.incluirNombreArtista ? lh * 1.9 : 0) + c.gris.length * lh * 1.4 + (c.negrita ? lh * 1.8 : 0);
}

async function logoAbajo(doc: jsPDF, logo: Uint8Array | null, y: number, alto: number): Promise<void> {
  if (!logo) return;
  const W = doc.internal.pageSize.getWidth();
  const { detectImageFormat } = await import("../utils/detectImageFormat.js");
  const formato = detectImageFormat(logo);
  if (!formato) return;
  const ratio = await fittedImageSize(logo, 1000);
  const w = Math.min(alto * (ratio.width / ratio.height), 60);
  const h = w * (ratio.height / ratio.width);
  doc.addImage(logo, formato, (W - w) / 2, y, w, h);
}

function paginaTexto(doc: jsPDF, titulo: string, texto: string | null): void {
  doc.addPage();
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  doc.setTextColor(...NEGRO);
  doc.setFont("Inter", "medium");
  doc.setFontSize(18);
  doc.text(titulo, M + 30, 40);
  if (!texto) return;
  doc.setFont("Inter", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...GRIS);
  const lineas = doc.splitTextToSize(texto, W - 2 * (M + 30)) as string[];
  let y = 55;
  for (const l of lineas) {
    if (y > H - 20) {
      doc.addPage();
      y = 30;
    }
    doc.text(l, M + 30, y);
    y += 6;
  }
}

async function paginaObras(doc: jsPDF, lote: DossierObra[], cantidad: number, o: DossierOpciones): Promise<void> {
  doc.addPage();
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const [cols, filas] = gridPara(cantidad, H > W);
  const compartida = lote.length > 1 && lote.every((ob) => firmaCaption(ob, o) === firmaCaption(lote[0], o));
  const size = 9;
  const altoCompartida = compartida || lote.length === 1 ? alturaCaption(lote[0], o, size) + 8 : 0;
  const altoIndividual = !compartida && lote.length > 1 ? 24 : 0;

  const gap = 8;
  const areaTop = M;
  const areaH = H - M - areaTop - altoCompartida;
  const cellW = (W - 2 * M - gap * (cols - 1)) / cols;
  const cellH = (areaH - gap * (filas - 1)) / filas;

  for (let i = 0; i < lote.length; i++) {
    const ob = lote[i];
    const col = i % cols;
    const fila = Math.floor(i / cols);
    const cx = M + col * (cellW + gap);
    const cy = areaTop + fila * (cellH + gap);
    const boxH = cellH - altoIndividual;
    if (ob.imagen) {
      const { width, height } = await fittedImageSize(ob.imagen.bytes, 2000);
      const ratio = width / height;
      let w = cellW;
      let h = w / ratio;
      if (h > boxH) {
        h = boxH;
        w = h * ratio;
      }
      doc.addImage(ob.imagen.bytes, ob.imagen.formato, cx + (cellW - w) / 2, cy + (boxH - h) / 2, w, h);
    }
    if (altoIndividual > 0) {
      escribirCaption(doc, ob, o, false, cx, cy + boxH + 4, cellW, 7);
    }
  }

  if (altoCompartida > 0) {
    // Ficha a la derecha, como en los dossiers de galería: una sola para toda la página.
    escribirCaption(doc, lote[0], o, compartida, W - M - 95, H - M - altoCompartida + 8, 95, size);
  }
}

/** Arma el dossier: portada, (bio, texto de serie, obras) por artista y contacto. */
export async function buildDossierPdfBytes(
  artistas: DossierArtista[],
  obras: DossierObra[],
  o: DossierOpciones,
): Promise<Uint8Array> {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({
    unit: "mm",
    // Oficio (Argentina): 216 × 330 mm.
    format: o.formatoPagina === "oficio" ? [216, 330] : "a4",
    orientation: o.orientacion === "vertical" ? "portrait" : "landscape",
  });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  await registerBrandFonts(doc);

  if (o.tituloPortada.trim() || o.subtituloPortada.trim() || o.textoAdicionalPortada.trim()) {
    doc.setTextColor(...NEGRO);
    doc.setFont("Inter", "normal");
    const tam = o.tamanoPortada;
    const ancho = W - 2 * M - 20;
    const titulo = o.tituloPortada.trim() ? (doc.setFontSize(tam), doc.splitTextToSize(o.tituloPortada.trim(), ancho) as string[]) : [];
    const lh = tam * 0.46;
    let y = H / 2 - 10;
    for (const l of titulo) {
      doc.text(l, W / 2, y, { align: "center" });
      y += lh * 1.3;
    }
    if (o.subtituloPortada.trim()) {
      const subTam = Math.max(8, Math.round(tam * 0.65));
      doc.setFontSize(subTam);
      doc.setTextColor(...GRIS);
      y += lh * 0.4;
      for (const l of doc.splitTextToSize(o.subtituloPortada.trim(), ancho) as string[]) {
        doc.text(l, W / 2, y, { align: "center" });
        y += subTam * 0.46 * 1.4;
      }
    }
    if (o.textoAdicionalPortada.trim()) {
      const extraTam = Math.max(8, Math.round(tam * 0.5));
      doc.setFontSize(extraTam);
      doc.setTextColor(...GRIS);
      y += extraTam * 0.46 * 1.2;
      for (const l of doc.splitTextToSize(o.textoAdicionalPortada.trim(), ancho) as string[]) {
        doc.text(l, W / 2, y, { align: "center" });
        y += extraTam * 0.46 * 1.4;
      }
    }
    await logoAbajo(doc, o.logoBytes, H - 38, 14);
  } else {
    // Sin portada: la primera página real se agrega con addPage(); se borra la vacía del final.
    doc.deletePage(1);
  }

  const bioHecha = new Set<number>();
  let statementHecho = false;
  let hoja = 1;
  let i = 0;
  while (i < obras.length) {
    const ini = obras[i];
    // Tanda consecutiva del mismo artista (respeta el orden de la selección).
    let j = i;
    while (j < obras.length && obras[j].artistaId === ini.artistaId) j++;
    const tanda = obras.slice(i, j);

    if (o.incluirBio && !bioHecha.has(ini.artistaId)) {
      bioHecha.add(ini.artistaId);
      const art = artistas.find((a) => a.id === ini.artistaId);
      for (const bio of art?.bios ?? []) if (bio.trim()) paginaTexto(doc, art!.nombre, bio);
    }
    if (!statementHecho && o.statementTextos.some((x) => x.trim())) {
      statementHecho = true;
      for (const texto of o.statementTextos) if (texto.trim()) paginaTexto(doc, o.statementTitulo, texto.trim());
    }
    let k = 0;
    while (k < tanda.length) {
      const cantidad = Math.max(1, o.obrasPorPaginaExcepciones[hoja] ?? o.obrasPorPagina);
      await paginaObras(doc, tanda.slice(k, k + cantidad), cantidad, o);
      k += cantidad;
      hoja++;
    }
    i = j;
  }

  if (o.contactoLineas.length > 0) {
    doc.addPage();
    doc.setFont("Inter", "normal");
    doc.setFontSize(11);
    doc.setTextColor(...GRIS);
    let y = H / 2 - (o.contactoLineas.length * 6) / 2;
    for (const l of o.contactoLineas) {
      doc.text(l, W / 2, y, { align: "center" });
      y += 6;
    }
    await logoAbajo(doc, o.logoBytes, H - 38, 14);
  }

  return new Uint8Array(doc.output("arraybuffer"));
}
