import type { jsPDF } from "jspdf";
import type { TranslationKey } from "../i18n/LanguageContext.js";
import { tInforme } from "./informeIdioma.js";
import { drawSignatureBlock, fittedImageSize, writeBilingualParagraph, writeWrappedText } from "../utils/pdfBranding.js";
import { detectImageFormat } from "../utils/detectImageFormat.js";
import { formatFechaDDMMYYYY } from "../utils/formatFecha.js";
import { nuevoDocConMembrete, type InformeBrandingOpts } from "./reportPdfBase.js";

export interface PersonalReporteDatos {
  nombreCompleto: string;
  fechaNacimiento: string;
  bio: string;
  bioEn: string;
  notas: string;
  email: string;
  telefono: string;
  web: string;
  instagram: string;
  direccion: string;
  x: string;
  facebook: string;
  cuit: string;
}

const IMAGE_BOX_SIZE = 60;

async function dibujarImagenTitular(
  doc: jsPDF,
  imgBytes: Uint8Array | null,
  marginLeft: number,
  startY: number,
): Promise<{ textX: number; imageBottom: number }> {
  if (!imgBytes) return { textX: marginLeft, imageBottom: startY };
  const formato = detectImageFormat(imgBytes);
  if (!formato) return { textX: marginLeft, imageBottom: startY };
  const { width, height } = await fittedImageSize(imgBytes, IMAGE_BOX_SIZE);
  doc.addImage(imgBytes, formato, marginLeft, startY, width, height);
  return { textX: marginLeft + IMAGE_BOX_SIZE + 8, imageBottom: startY + height };
}

/** Informe 1: ficha completa, con todos los datos de contacto que esten cargados. */
export async function buildPersonalFichaCompletaPdfBytes(
  datos: PersonalReporteDatos,
  imgBytes: Uint8Array | null,
  opts: InformeBrandingOpts,
): Promise<Uint8Array> {
  const titulo = datos.nombreCompleto || tInforme(opts.idioma, "profile.tituloMisDatos");
  const { doc, marginLeft, startY } = await nuevoDocConMembrete(titulo, opts);
  const { textX, imageBottom } = await dibujarImagenTitular(doc, imgBytes, marginLeft, startY);

  const pageWidth = doc.internal.pageSize.getWidth();
  const dataWidth = pageWidth - textX - marginLeft;
  let y = startY + 5;

  const campo = (key: TranslationKey, valor: string) => `${tInforme(opts.idioma, key)}: ${valor}`;
  const lineas: string[] = [];
  if (datos.fechaNacimiento) lineas.push(campo("artistas.fechaNacimiento", formatFechaDDMMYYYY(datos.fechaNacimiento)));
  if (datos.email) lineas.push(campo("profile.mail", datos.email));
  if (datos.telefono) lineas.push(campo("artistas.telefono", datos.telefono));
  if (datos.web) lineas.push(campo("profile.paginaWeb", datos.web));
  if (datos.instagram) lineas.push(campo("artistas.instagram", datos.instagram));
  if (datos.facebook) lineas.push(campo("artistas.facebook", datos.facebook));
  if (datos.x) lineas.push(campo("artistas.x", datos.x));
  if (datos.direccion) lineas.push(campo("artistas.direccion", datos.direccion));
  if (datos.cuit) lineas.push(campo("common.cuit", datos.cuit));
  for (const linea of lineas) y = writeWrappedText(doc, linea, textX, y, dataWidth);

  // La biografia (y lo que venga despues) arranca debajo de la foto y de los
  // datos personales, no al costado, y usa todo el ancho de la hoja.
  const bodyWidth = pageWidth - marginLeft * 2;
  let bodyY = Math.max(imageBottom, y) + 8;
  bodyY = writeBilingualParagraph(doc, opts.idioma, "artistas.bio", datos.bio, datos.bioEn, marginLeft, bodyY, bodyWidth);
  bodyY = writeBilingualParagraph(doc, opts.idioma, "artistas.notas", datos.notas, "", marginLeft, bodyY, bodyWidth);

  await drawSignatureBlock(doc, bodyY + 10, {
    idioma: opts.idioma,
    firma: opts.firma,
    firmaBytes: opts.firmaBytes,
    marginLeft,
  });
  return new Uint8Array(doc.output("arraybuffer"));
}

/** Informe 2: solo biografia, con los datos basicos del titular (nombre, foto, fecha de nacimiento) y el texto de la bio. */
export async function buildPersonalBiografiaPdfBytes(
  datos: Pick<PersonalReporteDatos, "nombreCompleto" | "fechaNacimiento" | "bio" | "bioEn" | "notas">,
  imgBytes: Uint8Array | null,
  opts: InformeBrandingOpts,
): Promise<Uint8Array> {
  const titulo = datos.nombreCompleto || tInforme(opts.idioma, "profile.tituloMisDatos");
  const { doc, marginLeft, startY } = await nuevoDocConMembrete(titulo, opts);
  const { textX, imageBottom } = await dibujarImagenTitular(doc, imgBytes, marginLeft, startY);

  const pageWidth = doc.internal.pageSize.getWidth();
  const dataWidth = pageWidth - textX - marginLeft;
  let y = startY + 5;

  if (datos.fechaNacimiento) {
    y = writeWrappedText(
      doc,
      `${tInforme(opts.idioma, "artistas.fechaNacimiento")}: ${formatFechaDDMMYYYY(datos.fechaNacimiento)}`,
      textX,
      y,
      dataWidth,
    );
  }

  const bodyWidth = pageWidth - marginLeft * 2;
  let bodyY = Math.max(imageBottom, y) + 8;
  bodyY = writeBilingualParagraph(doc, opts.idioma, "artistas.bio", datos.bio, datos.bioEn, marginLeft, bodyY, bodyWidth);
  bodyY = writeBilingualParagraph(doc, opts.idioma, "artistas.notas", datos.notas, "", marginLeft, bodyY, bodyWidth);

  await drawSignatureBlock(doc, bodyY + 10, {
    idioma: opts.idioma,
    firma: opts.firma,
    firmaBytes: opts.firmaBytes,
    marginLeft,
  });
  return new Uint8Array(doc.output("arraybuffer"));
}
