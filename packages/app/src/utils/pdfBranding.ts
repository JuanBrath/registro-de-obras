import type { jsPDF } from "jspdf";
import montserratBoldUrl from "../assets/fonts/Montserrat-Bold.ttf?url";
import interRegularUrl from "../assets/fonts/Inter-Regular.ttf?url";
import interMediumUrl from "../assets/fonts/Inter-Medium.ttf?url";
import gsMonogramaUrl from "../assets/brand/gs-monograma.png?url";
import { detectImageFormat } from "./detectImageFormat.js";
import { tInforme, type InformeIdioma } from "../reports/informeIdioma.js";
import type { TranslationKey } from "../i18n/LanguageContext.js";
import { todayISO } from "./today.js";
import { formatFechaDDMMYYYY } from "./formatFecha.js";

export const GALERIS_GOLD: [number, number, number] = [201, 162, 71]; // #C9A247

async function fetchBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  return new Uint8Array(await res.arrayBuffer());
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

interface BrandAssets {
  montserratBold: string;
  interRegular: string;
  interMedium: string;
  logoBytes: Uint8Array;
}

// jsPDF solo puede embeber TTF/OTF crudo (no WOFF/WOFF2), asi que estos
// .ttf se generaron una vez a partir de los .woff2 de @fontsource con
// fonttools y se versionan en el repo — no hay conversion en build time.
let cached: Promise<BrandAssets> | null = null;

function loadBrandAssets(): Promise<BrandAssets> {
  if (!cached) {
    cached = Promise.all([
      fetchBytes(montserratBoldUrl).then(bytesToBase64),
      fetchBytes(interRegularUrl).then(bytesToBase64),
      fetchBytes(interMediumUrl).then(bytesToBase64),
      fetchBytes(gsMonogramaUrl),
    ]).then(([montserratBold, interRegular, interMedium, logoBytes]) => ({
      montserratBold,
      interRegular,
      interMedium,
      logoBytes,
    }));
  }
  return cached;
}

export async function registerBrandFonts(doc: jsPDF): Promise<void> {
  const { montserratBold, interRegular, interMedium } = await loadBrandAssets();
  doc.addFileToVFS("Montserrat-Bold.ttf", montserratBold);
  doc.addFont("Montserrat-Bold.ttf", "Montserrat", "bold");
  doc.addFileToVFS("Inter-Regular.ttf", interRegular);
  doc.addFont("Inter-Regular.ttf", "Inter", "normal");
  doc.addFileToVFS("Inter-Medium.ttf", interMedium);
  doc.addFont("Inter-Medium.ttf", "Inter", "medium");
}

export async function fittedImageSize(bytes: Uint8Array, maxSize: number): Promise<{ width: number; height: number }> {
  const blob = new Blob([bytes as BlobPart]);
  const bitmap = await createImageBitmap(blob);
  let width = maxSize;
  let height = maxSize / (bitmap.width / bitmap.height);
  if (height > maxSize) {
    height = maxSize;
    width = maxSize * (bitmap.width / bitmap.height);
  }
  bitmap.close();
  return { width, height };
}

/**
 * Dibuja el encabezado de marca compartido por todos los PDF de la app:
 * logo + titulo en Montserrat Bold dorado + linea divisoria dorada de
 * 0.5pt. Si se pasa `logoBytes` (logo propio de la galeria o del titular
 * personal) se usa ese en vez del monograma GS por defecto; si `incluirLogo`
 * es false no se dibuja ningun logo (ni siquiera el monograma) y el titulo
 * arranca pegado al margen izquierdo. Deja el doc con la fuente Inter
 * (normal, negro, 10pt) lista para el resto del contenido. Devuelve el Y en
 * mm donde debe continuar.
 */
export async function drawPdfHeader(
  doc: jsPDF,
  title: string,
  {
    marginLeft = 14,
    marginRight = 14,
    logoBytes: customLogoBytes,
    incluirLogo = true,
    localidad,
    // Por defecto en false: solo los informes que resuelven una localidad y
    // ofrecen el control "con/sin fecha" (por ahora, Obra) deben mostrar
    // algo arriba de la linea del membrete aparte del logo.
    incluirFecha = false,
  }: {
    marginLeft?: number;
    marginRight?: number;
    logoBytes?: Uint8Array | null;
    incluirLogo?: boolean;
    /** Localidad del autor (Studio) o de la galeria (Space); se muestra arriba a la derecha, junto a la fecha si corresponde. */
    localidad?: string | null;
    /** Si se muestra la fecha del dia junto a la localidad, arriba de la linea del membrete. */
    incluirFecha?: boolean;
  } = {},
): Promise<number> {
  await registerBrandFonts(doc);

  const logoSize = 12;
  const logoY = 10;
  const pageWidth = doc.internal.pageSize.getWidth();

  if (incluirLogo) {
    const { logoBytes: gsLogoBytes } = await loadBrandAssets();
    const customFormato = customLogoBytes ? detectImageFormat(customLogoBytes) : null;
    if (customLogoBytes && customFormato) {
      const { width, height } = await fittedImageSize(customLogoBytes, logoSize);
      doc.addImage(customLogoBytes, customFormato, marginLeft, logoY, width, height);
    } else {
      doc.addImage(gsLogoBytes, "PNG", marginLeft, logoY, logoSize, logoSize);
    }
  }

  // Arriba de la linea del membrete solo va el logo (izquierda) y la
  // localidad/fecha (derecha) — todo el resto del contenido, incluido el
  // titulo, se dibuja despues de la linea.
  if (localidad || incluirFecha) {
    const partes = [localidad, incluirFecha ? formatFechaDDMMYYYY(todayISO()) : null].filter(Boolean);
    doc.setFont("Inter", "normal");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(partes.join(" — "), pageWidth - marginRight, logoY + logoSize / 2 + 3, { align: "right" });
  }

  const dividerY = logoY + logoSize + 4;
  doc.setDrawColor(...GALERIS_GOLD);
  doc.setLineWidth((0.5 * 25.4) / 72); // 0.5pt en mm (unidad por defecto de jsPDF)
  doc.line(marginLeft, dividerY, pageWidth - marginRight, dividerY);

  const tituloY = dividerY + 10;
  doc.setFont("Montserrat", "bold");
  doc.setFontSize(17);
  doc.setTextColor(...GALERIS_GOLD);
  doc.text(title, marginLeft, tituloY);

  doc.setFont("Inter", "normal");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);

  return tituloY + 8;
}

/**
 * Escribe texto largo (una o varias lineas ya separadas por el llamador)
 * agregando paginas nuevas automaticamente cuando el contenido no entra en
 * la hoja actual, para que ningun informe quede cortado. Devuelve el Y (mm)
 * donde termino de escribir.
 */
export function writeWrappedText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  { lineHeight = 5, marginTop = 20, marginBottom = 20 }: { lineHeight?: number; marginTop?: number; marginBottom?: number } = {},
): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  const wrapped = doc.splitTextToSize(text, maxWidth) as string[];
  let cursorY = y;
  for (const line of wrapped) {
    if (cursorY + lineHeight > pageHeight - marginBottom) {
      doc.addPage();
      cursorY = marginTop;
    }
    doc.text(line, x, cursorY);
    cursorY += lineHeight;
  }
  return cursorY;
}

/**
 * Escribe un parrafo de texto libre (biografia, notas) respetando el idioma
 * elegido para el informe, a diferencia de las etiquetas fijas que ya salen
 * bilingues via `tInforme`: aca el CONTENIDO tambien depende de si existe
 * una traduccion cargada (`textoEn`).
 * - "es": solo el texto en español (si existe).
 * - "en": el texto en ingles si existe; si no, cae al texto en español tal
 *   cual (mejor mostrar algo, aunque no este traducido, que nada).
 * - "ambos": muestra los dos bloques, uno debajo del otro, cada uno con su
 *   propio titulo bilingue; si no hay traduccion cargada, muestra solo el
 *   bloque en español.
 * Devuelve el Y (mm) donde termino de escribir.
 */
export function writeBilingualParagraph(
  doc: jsPDF,
  idioma: InformeIdioma,
  tituloKey: TranslationKey,
  textoEs: string,
  textoEn: string,
  x: number,
  y: number,
  maxWidth: number,
): number {
  const bloques: { titulo: string; texto: string }[] = [];
  if (idioma === "es") {
    if (textoEs) bloques.push({ titulo: tInforme("es", tituloKey), texto: textoEs });
  } else if (idioma === "en") {
    const texto = textoEn || textoEs;
    if (texto) bloques.push({ titulo: tInforme("en", tituloKey), texto });
  } else {
    if (textoEs) bloques.push({ titulo: tInforme("es", tituloKey), texto: textoEs });
    if (textoEn) bloques.push({ titulo: tInforme("en", tituloKey), texto: textoEn });
  }

  let cursorY = y;
  for (const bloque of bloques) {
    cursorY += 3;
    doc.setFontSize(11);
    cursorY = writeWrappedText(doc, bloque.titulo, x, cursorY, maxWidth, { lineHeight: 6 });
    doc.setFontSize(10);
    cursorY = writeWrappedText(doc, bloque.texto, x, cursorY, maxWidth);
  }
  return cursorY;
}

export type FirmaEleccion = "ninguna" | "digital" | "manuscrita";

/**
 * Dibuja el bloque de firma al pie del informe, en el idioma elegido para
 * ese informe puntual (no el idioma de la app). Con "digital" embebe la
 * imagen de firma cargada en el perfil activo; con "manuscrita" deja una
 * linea en blanco para firmar a mano; con "ninguna" no dibuja nada.
 * Agrega pagina nueva si no entra en la actual. Devuelve el Y (mm) final.
 */
export async function drawSignatureBlock(
  doc: jsPDF,
  y: number,
  {
    idioma,
    firma,
    firmaBytes,
    marginLeft = 14,
  }: {
    idioma: InformeIdioma;
    firma: FirmaEleccion;
    firmaBytes?: Uint8Array | null;
    marginLeft?: number;
  },
): Promise<number> {
  if (firma === "ninguna") return y;

  const pageHeight = doc.internal.pageSize.getHeight();
  const blockHeight = firma === "digital" ? 30 : 20;
  let cursorY = y;
  if (cursorY + blockHeight > pageHeight - 14) {
    doc.addPage();
    cursorY = 20;
  }

  doc.setFont("Inter", "normal");
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);

  if (firma === "digital" && firmaBytes) {
    const formato = detectImageFormat(firmaBytes);
    if (formato) {
      const { width, height } = await fittedImageSize(firmaBytes, 24);
      doc.addImage(firmaBytes, formato, marginLeft, cursorY, width, height);
      cursorY += height + 3;
      doc.text(tInforme(idioma, "informes.firmaDigitalCaption"), marginLeft, cursorY);
      return cursorY + 4;
    }
  }

  doc.setDrawColor(...GALERIS_GOLD);
  doc.setLineWidth((0.5 * 25.4) / 72);
  doc.line(marginLeft, cursorY, marginLeft + 70, cursorY);
  doc.text(tInforme(idioma, "informes.firmaManuscritaLinea"), marginLeft, cursorY + 5);
  return cursorY + 9;
}
