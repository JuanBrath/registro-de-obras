import type { jsPDF } from "jspdf";
import montserratBoldUrl from "../assets/fonts/Montserrat-Bold.ttf?url";
import interRegularUrl from "../assets/fonts/Inter-Regular.ttf?url";
import interMediumUrl from "../assets/fonts/Inter-Medium.ttf?url";
import gsMonogramaUrl from "../assets/brand/gs-monograma.png?url";

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

/**
 * Dibuja el encabezado de marca compartido por todos los PDF de la app:
 * monograma GS + titulo en Montserrat Bold dorado + linea divisoria dorada
 * de 0.5pt. Deja el doc con la fuente Inter (normal, negro, 10pt) lista
 * para el resto del contenido. Devuelve el Y en mm donde debe continuar.
 */
export async function drawPdfHeader(
  doc: jsPDF,
  title: string,
  { marginLeft = 14, marginRight = 14 }: { marginLeft?: number; marginRight?: number } = {},
): Promise<number> {
  await registerBrandFonts(doc);
  const { logoBytes } = await loadBrandAssets();

  const logoSize = 12;
  const logoY = 10;
  doc.addImage(logoBytes, "PNG", marginLeft, logoY, logoSize, logoSize);

  doc.setFont("Montserrat", "bold");
  doc.setFontSize(17);
  doc.setTextColor(...GALERIS_GOLD);
  doc.text(title, marginLeft + logoSize + 4, logoY + logoSize / 2 + 3);

  const dividerY = logoY + logoSize + 4;
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setDrawColor(...GALERIS_GOLD);
  doc.setLineWidth((0.5 * 25.4) / 72); // 0.5pt en mm (unidad por defecto de jsPDF)
  doc.line(marginLeft, dividerY, pageWidth - marginRight, dividerY);

  doc.setFont("Inter", "normal");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);

  return dividerY + 6;
}
