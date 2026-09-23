import type { TranslationKey } from "../i18n/LanguageContext.js";
import { tInforme, type InformeIdioma } from "./informeIdioma.js";
import { detectImageFormat } from "../utils/detectImageFormat.js";
import { formatFechaDDMMYYYY } from "../utils/formatFecha.js";
import {
  dibujarLogo,
  drawSignatureBlock,
  fittedImageSize,
  registerBrandFonts,
  writeWrappedText,
  type FirmaEleccion,
} from "../utils/pdfBranding.js";
import { nuevoDocConMembrete, type InformeBrandingOpts } from "./reportPdfBase.js";

/** Detalle propio de la serie/ejemplar vendido (distinto del detalle general de la obra). */
export interface VentaReporteSerieDatos {
  numero: string;
  precioVenta: number | null;
  monedaVenta: string;
  fechaImpresion: string;
  tipoImpresion: string;
  soporteImpresion: string;
  tallerImpresion: string;
  dimensiones: string;
  tipoEnmarcado: string;
  tamanoFinalEnmarcado: string;
  notas: string;
  /** Cantidad de pruebas de autor de la serie (0 si no tiene). */
  cantidadPruebasAutor: number;
}

/**
 * El numero de copia ("2/7"), mas la cantidad de pruebas de autor de la
 * serie si las hay ("2/7 + 2 PA") — salvo que la copia en cuestion sea, en
 * si, una prueba de autor ("PA 1/2"), donde sumarlas de nuevo no tendria
 * sentido. Se usa tanto en el certificado (campo "Copia") como en el
 * comprobante de venta (campo "Serie").
 */
function formatearNumeroConPA(serie: VentaReporteSerieDatos): string {
  if (serie.cantidadPruebasAutor > 0 && !serie.numero.startsWith("PA")) {
    return `${serie.numero} + ${serie.cantidadPruebasAutor} PA`;
  }
  return serie.numero;
}

/** Datos que solo usa el certificado de autenticidad (ver buildCoaPdfBytes), ademas de obra/venta. */
export interface CoaCertificadoDatos {
  imgBytes: Uint8Array | null;
  /** Año en que se tomo la fotografia (fecha_captura), o "" si no aplica/no esta cargado. */
  fechaToma: string;
  /** Año de edicion de la copia, o "" si no aplica/no esta cargado. */
  editadaPorAutor: string;
  /** Primera linea de "Detalles tecnicos" (ej. subtipo de fotografia: "Captura Digital"). */
  detalleTecnico1: string;
  /** Segunda linea de "Detalles tecnicos" (ej. tipo de impresion + soporte). */
  detalleTecnico2: string;
}

/** Datos de la obra/ejemplar comunes a todos los documentos de venta. `descripcionLineas` ya viene armada por el llamador (misma logica que usa la ficha/presupuesto para no duplicar el detalle por categoria). */
export interface VentaReporteObraDatos {
  titulo: string;
  autor: string;
  codigoInventario: string;
  informeConservacion: string;
  descripcionLineas: string[];
  serie: VentaReporteSerieDatos;
  /** Solo se usa por el certificado de autenticidad (`buildCoaPdfBytes`). */
  certificado?: CoaCertificadoDatos;
}

export interface VentaReporteVentaDatos {
  tipo: "venta" | "reserva" | "donacion";
  fechaVenta: string;
  lugarVenta: string;
  valorVenta: number;
  moneda: string;
  precioLista: number | null;
  motivoDescuento: string;
  tipoCambio: number | null;
  metodoPago: string;
  estadoPago: string;
  fechaCobro: string;
  numeroCertificado: number | null;
  ivaPorcentaje: number | null;
  ivaMonto: number | null;
  retencionesMonto: number | null;
  arancelesMonto: number | null;
  costoEnmarcado: number | null;
  costoPeana: number | null;
  costoEmbalaje: number | null;
  costoTransporte: number | null;
  costoSeguro: number | null;
  direccionEntrega: string;
  ciudadEntrega: string;
  paisEntrega: string;
  confidencial: boolean;
  clausulaReventa: string;
}

export interface VentaReporteCompradorDatos {
  nombre: string;
  email: string;
  telefono: string;
  domicilio: string;
  cuit: string;
}

export interface VentaReporteVendedorDatos {
  nombre: string;
  cuit: string;
  domicilio: string;
}

function formatMoneda(moneda: string, valor: number): string {
  return `${moneda} ${valor.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function campo(idioma: InformeIdioma, key: TranslationKey, valor: string): string {
  return `${tInforme(idioma, key)}: ${valor}`;
}

function estadoPagoKey(estadoPago: string): TranslationKey {
  if (estadoPago === "pagado") return "ventaForm.estadoPagoPagado";
  if (estadoPago === "en_cuotas") return "ventaForm.estadoPagoEnCuotas";
  return "ventaForm.estadoPagoPendiente";
}

/**
 * Detalle de la serie vendida (numero, dimensiones, tipo de impresion,
 * enmarcado, notas...). Es el mismo listado que ya arma el presupuesto,
 * reutilizado en todos los documentos de venta para que en todos los casos
 * haya, ademas del detalle de la obra (`obra.descripcionLineas`), el
 * detalle puntual de esta serie.
 */
function buildSerieLineas(serie: VentaReporteSerieDatos, idioma: InformeIdioma): string[] {
  const lineas: string[] = [`${tInforme(idioma, "ventasReport.colSerie")}: ${serie.numero}`];
  if (serie.precioVenta != null) {
    lineas.push(tInforme(idioma, "obraDetail.valorSerie", { moneda: serie.monedaVenta || "ARS", valor: serie.precioVenta }));
  }
  if (serie.fechaImpresion) lineas.push(`${tInforme(idioma, "obraDetail.fechaImpresion")}: ${formatFechaDDMMYYYY(serie.fechaImpresion)}`);
  if (serie.tipoImpresion) lineas.push(`${tInforme(idioma, "obraDetail.tipoImpresionLabel")}: ${serie.tipoImpresion}`);
  if (serie.soporteImpresion) lineas.push(`${tInforme(idioma, "obraDetail.soporteImpresion")}: ${serie.soporteImpresion}`);
  if (serie.tallerImpresion) lineas.push(`${tInforme(idioma, "obraDetail.tallerImpresionLabel")}: ${serie.tallerImpresion}`);
  if (serie.dimensiones) lineas.push(`${tInforme(idioma, "obraDetail.tamanoEjemplarLabel")}: ${serie.dimensiones}`);
  if (serie.tipoEnmarcado) lineas.push(`${tInforme(idioma, "obraDetail.tipoEnmarcadoLabel")}: ${serie.tipoEnmarcado}`);
  if (serie.tamanoFinalEnmarcado) {
    lineas.push(`${tInforme(idioma, "obraDetail.tamanoFinalEnmarcadoLabel")}: ${serie.tamanoFinalEnmarcado}`);
  }
  if (serie.notas) lineas.push(`${tInforme(idioma, "obraDetail.notasEjemplarLabel")}: ${serie.notas}`);
  return lineas;
}

/**
 * Documento distinto de la ficha completa: la ficha describe toda la obra
 * con todas sus series; el presupuesto cotiza una unica serie puntual, asi
 * que lleva los datos de la obra mas solo esa serie. Refactor de la logica
 * que antes vivia en ObraDetail.tsx (handleGenerarPresupuesto) para que
 * tambien tenga logo del perfil activo y firma, igual que el resto de los
 * informes.
 */
export async function buildPresupuestoPdfBytes(
  obra: VentaReporteObraDatos,
  imgBytes: Uint8Array | null,
  opts: InformeBrandingOpts,
): Promise<Uint8Array> {
  const { doc, marginLeft, startY } = await nuevoDocConMembrete(
    tInforme(opts.idioma, "obraDetail.presupuestoTitulo", { titulo: obra.titulo }),
    opts,
  );
  const imageBoxSize = 70;
  let textX = marginLeft;
  let imageBottom = startY;

  if (imgBytes) {
    const formato = detectImageFormat(imgBytes);
    if (formato) {
      const { width, height } = await fittedImageSize(imgBytes, imageBoxSize);
      doc.addImage(imgBytes, formato, marginLeft, startY, width, height);
      imageBottom = startY + height;
      textX = marginLeft + imageBoxSize + 8;
    }
  }

  const pageWidth = doc.internal.pageSize.getWidth();
  const textWidth = pageWidth - textX - marginLeft;
  let textY = startY;
  for (const linea of obra.descripcionLineas) {
    textY = writeWrappedText(doc, linea, textX, textY, textWidth, { lineHeight: 6 });
  }

  let bottomY = Math.max(imageBottom, textY) + 8;
  doc.setFont("Inter", "medium");
  bottomY = writeWrappedText(doc, tInforme(opts.idioma, "obraDetail.presupuestoSerieSubtitulo"), marginLeft, bottomY, pageWidth - marginLeft * 2, {
    lineHeight: 6,
  });
  doc.setFont("Inter", "normal");
  bottomY += 2;
  for (const linea of buildSerieLineas(obra.serie, opts.idioma)) {
    bottomY = writeWrappedText(doc, linea, marginLeft, bottomY, pageWidth - marginLeft * 2, { lineHeight: 6 });
  }

  await drawSignatureBlock(doc, bottomY + 10, { idioma: opts.idioma, firma: opts.firma, firmaBytes: opts.firmaBytes, marginLeft });
  return new Uint8Array(doc.output("arraybuffer"));
}

/**
 * Recibo/comprobante de venta con el desglose financiero completo (Fase A) +
 * comprador + entrega (Fase B). No se ofrece para donaciones (no tienen
 * valor comercial). A diferencia de la ficha/COA, este documento se limita a
 * los datos basicos que identifican la pieza (sin el detalle tecnico de
 * produccion propio de la obra) mas los datos puntuales de impresion de la
 * serie, e incluye una imagen de la obra junto al encabezado.
 */
export async function buildComprobanteVentaPdfBytes(
  obra: VentaReporteObraDatos,
  venta: VentaReporteVentaDatos,
  comprador: VentaReporteCompradorDatos,
  imgBytes: Uint8Array | null,
  opts: InformeBrandingOpts,
): Promise<Uint8Array> {
  const titulo = tInforme(opts.idioma, "ventaReport.comprobanteTitulo", {
    numero: venta.numeroCertificado ?? "—",
  });
  const { doc, marginLeft, startY } = await nuevoDocConMembrete(titulo, opts);
  const pageWidth = doc.internal.pageSize.getWidth();
  const width = pageWidth - marginLeft * 2;

  const imageBoxSize = 60;
  let textX = marginLeft;
  let imageBottom = startY;
  if (imgBytes) {
    const formato = detectImageFormat(imgBytes);
    if (formato) {
      const { width: imgWidth, height: imgHeight } = await fittedImageSize(imgBytes, imageBoxSize);
      doc.addImage(imgBytes, formato, marginLeft, startY, imgWidth, imgHeight);
      imageBottom = startY + imgHeight;
      textX = marginLeft + imageBoxSize + 8;
    }
  }
  const textWidth = pageWidth - textX - marginLeft;

  const encabezadoLineas: string[] = [
    campo(opts.idioma, "ventaForm.fechaVenta", formatFechaDDMMYYYY(venta.fechaVenta)),
    campo(opts.idioma, "ventaReport.compradorLabel", comprador.nombre),
    `${tInforme(opts.idioma, "obraForm.tituloLabel")}: ${obra.titulo}`,
    ...obra.descripcionLineas,
    `${tInforme(opts.idioma, "ventasReport.colSerie")}: ${formatearNumeroConPA(obra.serie)}`,
  ];
  if (obra.serie.dimensiones) {
    encabezadoLineas.push(`${tInforme(opts.idioma, "obraDetail.tamanoEjemplarLabel")}: ${obra.serie.dimensiones}`);
  }
  if (obra.serie.tipoImpresion) {
    encabezadoLineas.push(`${tInforme(opts.idioma, "obraDetail.tipoImpresionLabel")}: ${obra.serie.tipoImpresion}`);
  }
  if (obra.serie.soporteImpresion) {
    encabezadoLineas.push(`${tInforme(opts.idioma, "obraDetail.soporteImpresion")}: ${obra.serie.soporteImpresion}`);
  }
  if (obra.serie.tallerImpresion) {
    encabezadoLineas.push(`${tInforme(opts.idioma, "obraDetail.tallerImpresionLabel")}: ${obra.serie.tallerImpresion}`);
  }

  let textY = startY;
  for (const linea of encabezadoLineas) textY = writeWrappedText(doc, linea, textX, textY, textWidth, { lineHeight: 6 });

  let y = Math.max(imageBottom, textY) + 4;

  const lineas: string[] = [];
  if (venta.precioLista != null) lineas.push(campo(opts.idioma, "ventaForm.precioListaLabel", formatMoneda(venta.moneda, venta.precioLista)));
  if (venta.motivoDescuento) lineas.push(campo(opts.idioma, "ventaForm.motivoDescuentoLabel", venta.motivoDescuento));
  if (venta.tipoCambio != null) lineas.push(campo(opts.idioma, "ventaForm.tipoCambioLabel", String(venta.tipoCambio)));
  lineas.push(campo(opts.idioma, "ventaForm.valorVenta", formatMoneda(venta.moneda, venta.valorVenta)));
  if (venta.ivaPorcentaje != null) lineas.push(campo(opts.idioma, "ventaForm.ivaPorcentaje", `${venta.ivaPorcentaje}%`));
  if (venta.ivaMonto != null) lineas.push(campo(opts.idioma, "ventaForm.ivaMonto", formatMoneda(venta.moneda, venta.ivaMonto)));
  if (venta.retencionesMonto != null) lineas.push(campo(opts.idioma, "ventaForm.retencionesLabel", formatMoneda(venta.moneda, venta.retencionesMonto)));
  if (venta.arancelesMonto != null) lineas.push(campo(opts.idioma, "ventaForm.arancelesLabel", formatMoneda(venta.moneda, venta.arancelesMonto)));
  if (venta.costoEnmarcado != null) lineas.push(campo(opts.idioma, "ventaForm.costoEnmarcadoLabel", formatMoneda(venta.moneda, venta.costoEnmarcado)));
  if (venta.costoPeana != null) lineas.push(campo(opts.idioma, "ventaForm.costoPeanaLabel", formatMoneda(venta.moneda, venta.costoPeana)));
  if (venta.costoEmbalaje != null) lineas.push(campo(opts.idioma, "ventaForm.costoEmbalajeLabel", formatMoneda(venta.moneda, venta.costoEmbalaje)));
  if (venta.costoTransporte != null) lineas.push(campo(opts.idioma, "ventaForm.costoTransporteLabel", formatMoneda(venta.moneda, venta.costoTransporte)));
  if (venta.costoSeguro != null) lineas.push(campo(opts.idioma, "ventaForm.costoSeguroLabel", formatMoneda(venta.moneda, venta.costoSeguro)));
  if (venta.estadoPago) {
    lineas.push(campo(opts.idioma, "ventaForm.estadoPagoLabel", tInforme("es", estadoPagoKey(venta.estadoPago))));
  }
  if (venta.metodoPago) lineas.push(campo(opts.idioma, "ventaForm.metodoPagoLabel", venta.metodoPago));
  if (venta.fechaCobro) lineas.push(campo(opts.idioma, "ventaForm.fechaCobroLabel", formatFechaDDMMYYYY(venta.fechaCobro)));
  if (venta.direccionEntrega) lineas.push(campo(opts.idioma, "ventaForm.direccionEntregaLabel", venta.direccionEntrega));
  if (venta.ciudadEntrega) lineas.push(campo(opts.idioma, "ventaForm.ciudadEntregaLabel", venta.ciudadEntrega));
  if (venta.paisEntrega) lineas.push(campo(opts.idioma, "ventaForm.paisEntregaLabel", venta.paisEntrega));

  for (const linea of lineas) y = writeWrappedText(doc, linea, marginLeft, y, width, { lineHeight: 6 });

  if (venta.clausulaReventa) {
    y += 4;
    doc.setFontSize(9);
    y = writeWrappedText(doc, tInforme(opts.idioma, "ventaReport.notaRofrComprobante"), marginLeft, y, width, { lineHeight: 5 });
    doc.setFontSize(10);
  }

  await drawSignatureBlock(doc, y + 10, { idioma: opts.idioma, firma: opts.firma, firmaBytes: opts.firmaBytes, marginLeft });
  return new Uint8Array(doc.output("arraybuffer"));
}

/** "23 de octubre de 2026", para el pie del certificado. */
function formatFechaLargaEs(fechaISO: string): string {
  const meses = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];
  const [anio, mes, dia] = fechaISO.split("-").map(Number);
  if (!anio || !mes || !dia) return fechaISO;
  return `${dia} de ${meses[mes - 1]} de ${anio}`;
}

/**
 * Certificado de autenticidad (COA), en una sola hoja, con formato de
 * "certificado de galeria" clasico: marco de doble linea, banner con el
 * titulo, la foto de la obra en el cuerpo, campos con linea debajo, lugar y
 * fecha en italica y pie de derechos reservados. No lleva membrete de marca
 * de la app ni datos del comprador: es un documento pensado para
 * acompañar/enmarcar junto a la obra.
 */
export async function buildCoaPdfBytes(
  obra: VentaReporteObraDatos,
  venta: VentaReporteVentaDatos,
  opts: InformeBrandingOpts,
): Promise<Uint8Array> {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  await registerBrandFonts(doc);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const cert = obra.certificado;

  // Marco enmarcado (doble linea).
  const outerMargin = 12;
  const innerGap = 1.6;
  doc.setDrawColor(40, 40, 40);
  doc.setLineWidth(0.5);
  doc.rect(outerMargin, outerMargin, pageWidth - outerMargin * 2, pageHeight - outerMargin * 2);
  doc.setLineWidth(0.2);
  doc.rect(
    outerMargin + innerGap,
    outerMargin + innerGap,
    pageWidth - (outerMargin + innerGap) * 2,
    pageHeight - (outerMargin + innerGap) * 2,
  );

  const contentX = outerMargin + 30;
  const contentWidth = pageWidth - contentX * 2;

  const bannerY = outerMargin + 6;
  const bannerHeight = 16;
  doc.setFillColor(224, 224, 224);
  doc.rect(contentX, bannerY, contentWidth, bannerHeight, "F");
  doc.setFont("times", "bolditalic");
  doc.setFontSize(18);
  doc.setTextColor(20, 20, 20);
  doc.text(tInforme(opts.idioma, "ventaReport.coaTituloDobleHoja"), pageWidth / 2, bannerY + bannerHeight / 2 + 3, { align: "center" });

  let y = bannerY + bannerHeight + 10;

  // La foto de la obra va en el cuerpo del certificado, debajo del banner.
  if (cert?.imgBytes) {
    const formatoImg = detectImageFormat(cert.imgBytes);
    if (formatoImg) {
      const maxW = contentWidth;
      const maxH = 85;
      const blob = new Blob([cert.imgBytes as BlobPart]);
      const bitmap = await createImageBitmap(blob);
      let w = maxW;
      let h = maxW / (bitmap.width / bitmap.height);
      if (h > maxH) {
        h = maxH;
        w = maxH * (bitmap.width / bitmap.height);
      }
      bitmap.close();
      doc.addImage(cert.imgBytes, formatoImg, contentX + (contentWidth - w) / 2, y, w, h);
      y += h + 10;
    }
  } else {
    y += 4;
  }

  function fila(label: string, valor: string) {
    doc.setFont("times", "italic");
    doc.setFontSize(10);
    doc.setTextColor(90, 90, 90);
    doc.text(label, contentX, y);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(15);
    doc.setTextColor(20, 20, 20);
    const valorLineas = doc.splitTextToSize(valor || "—", contentWidth) as string[];
    doc.text(valorLineas, pageWidth / 2, y, { align: "center" });
    y += 5 + (valorLineas.length - 1) * 6;
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.15);
    doc.line(contentX, y, contentX + contentWidth, y);
    y += 10;
  }

  function filaColumnas(columnas: { label: string; valor: string }[]) {
    const colWidth = contentWidth / columnas.length;
    columnas.forEach((col, i) => {
      const colCenter = contentX + colWidth * i + colWidth / 2;
      doc.setFont("times", "italic");
      doc.setFontSize(9.5);
      doc.setTextColor(90, 90, 90);
      doc.text(col.label, colCenter, y, { align: "center" });
      doc.setFont("helvetica", "italic");
      doc.setFontSize(12);
      doc.setTextColor(20, 20, 20);
      doc.text(col.valor || "—", colCenter, y + 7, { align: "center" });
      doc.setDrawColor(150, 150, 150);
      doc.setLineWidth(0.15);
      doc.line(contentX + colWidth * i + 6, y + 10, contentX + colWidth * (i + 1) - 6, y + 10);
    });
    y += 20;
  }

  fila(tInforme(opts.idioma, "ventaReport.coaArtistaLabel"), obra.autor);
  fila(tInforme(opts.idioma, "obraForm.tituloLabel"), `"${obra.titulo}"`);

  filaColumnas([
    { label: tInforme(opts.idioma, "ventaReport.coaCopiaLabel"), valor: formatearNumeroConPA(obra.serie) },
    { label: tInforme(opts.idioma, "ventaReport.coaMedidasImagenLabel"), valor: obra.serie.dimensiones },
    { label: tInforme(opts.idioma, "ventaReport.coaFechaTomaLabel"), valor: cert?.fechaToma ?? "" },
  ]);

  const detalles = [cert?.detalleTecnico1, cert?.detalleTecnico2].filter(Boolean).join("\n");
  if (detalles) fila(tInforme(opts.idioma, "ventaReport.coaDetallesTecnicosLabel"), detalles);

  // Fila final: año de edicion + firma del autor (con la imagen de firma digital si esta configurada).
  const colWidth2 = contentWidth / 2;
  const col1Center = contentX + colWidth2 / 2;
  const col2Center = contentX + colWidth2 + colWidth2 / 2;
  doc.setFont("times", "italic");
  doc.setFontSize(9.5);
  doc.setTextColor(90, 90, 90);
  doc.text(tInforme(opts.idioma, "ventaReport.coaEditadaPorAutorLabel"), col1Center, y, { align: "center" });
  doc.text(tInforme(opts.idioma, "ventaReport.coaFirmaAutorLabel"), col2Center, y, { align: "center" });
  doc.setFont("helvetica", "italic");
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 20);
  doc.text(cert?.editadaPorAutor || "—", col1Center, y + 7, { align: "center" });
  if (opts.firma === "digital" && opts.firmaBytes) {
    const formatoFirma = detectImageFormat(opts.firmaBytes);
    if (formatoFirma) {
      const { width, height } = await fittedImageSize(opts.firmaBytes, 16);
      doc.addImage(opts.firmaBytes, formatoFirma, col2Center - width / 2, y - 1, width, height);
    }
  }
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.15);
  doc.line(contentX + 6, y + 10, contentX + colWidth2 - 6, y + 10);
  doc.line(contentX + colWidth2 + 6, y + 10, contentX + contentWidth - 6, y + 10);
  y += 24;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(11);
  doc.setTextColor(20, 20, 20);
  doc.text(`${venta.lugarVenta || "—"}, ${formatFechaLargaEs(venta.fechaVenta)}`, pageWidth / 2, y, { align: "center" });

  if (opts.incluirLogo) {
    await dibujarLogo(doc, opts.logoBytes, pageWidth - outerMargin - 22, pageHeight - outerMargin - 20, 14);
  }

  doc.setFont("Inter", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(
    `© ${obra.autor} - ${tInforme(opts.idioma, "ventaReport.coaDerechosReservados")}`,
    pageWidth / 2,
    pageHeight - outerMargin - 8,
    { align: "center" },
  );

  return new Uint8Array(doc.output("arraybuffer"));
}

/** Datos que solo usa el certificado tipo ficha (ver buildCoaFichaPdfBytes), ademas de obra/venta. */
export interface CoaFichaDatos {
  imgBytes: Uint8Array | null;
  categoriaLabel: string;
  materialesTexto: string;
  anio: string;
  serieProyecto: string;
  ubicacionFirma: string;
  artistaReside: string;
  artistaFirmaBytes: Uint8Array | null;
  galeriaFirmaBytes: Uint8Array | null;
  galeriaNombre: string;
  galeriaTelefono: string;
  galeriaEmail: string;
  galeriaLogoBytes: Uint8Array | null;
}

/**
 * Segundo modelo de certificado de autenticidad, "tipo ficha": una grilla
 * bilingue ingles/español (fija, no sigue el selector de idioma del resto de
 * los informes) con los datos basicos de la obra, firma del artista y del
 * titular de la galeria una al lado de la otra, y logo + contacto de la
 * galeria junto a una foto de la obra al pie. Pensado para el flujo de
 * galeria (representa a un artista distinto de quien firma como galeria);
 * en registro personal no se ofrece esta opcion.
 */
export async function buildCoaFichaPdfBytes(
  obra: VentaReporteObraDatos,
  ficha: CoaFichaDatos,
  opts: { firma: FirmaEleccion },
): Promise<Uint8Array> {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  await registerBrandFonts(doc);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const outerMargin = 10;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.6);
  doc.rect(outerMargin, outerMargin, pageWidth - outerMargin * 2, pageHeight - outerMargin * 2);

  doc.setFont("helvetica", "bolditalic");
  doc.setFontSize(15);
  doc.setTextColor(0, 0, 0);
  // En una sola linea el titulo bilingue es mas ancho que la hoja A4, asi
  // que va partido en dos lineas: ingles arriba, espanol abajo.
  doc.text("CERTIFICATE OF AUTHENTICITY ARTWORK", pageWidth / 2, outerMargin + 14, { align: "center" });
  doc.text("CERTIFICADO DE AUTENTICIDAD DE ARTE", pageWidth / 2, outerMargin + 21, { align: "center" });

  const tableX = 18;
  const tableWidth = pageWidth - tableX * 2;

  // Alto de fila dinamico: algunas etiquetas bilingues son largas y no
  // entran en una sola linea en columnas angostas (ej. "Is this part of a
  // series? | Es parte de una serie:"), asi que se envuelven con
  // splitTextToSize y la fila crece para acomodarlas.
  type FichaCelda = { label: string; value?: string };
  // Cada fila reparte el ancho de la tabla en partes iguales segun cuantas
  // celdas tiene (1 o 2), para que los valores largos no se corten de mas.
  function fichaFila(celdas: FichaCelda[], y: number): number {
    const colX = celdas.map((_, i) => tableX + (tableWidth / celdas.length) * i);
    const colWidths = celdas.map(() => tableWidth / celdas.length - 4);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    const labelLineas = celdas.map((c, i) => doc.splitTextToSize(c.label, colWidths[i]) as string[]);
    doc.setFont("times", "italic");
    doc.setFontSize(10.5);
    const valorLineas = celdas.map((c, i) => (c.value ? (doc.splitTextToSize(c.value, colWidths[i]) as string[]) : []));
    const labelBlockHeight = Math.max(...labelLineas.map((l) => l.length)) * 3.6;
    const valorLineCount = Math.max(0, ...valorLineas.map((l) => l.length));
    const rowHeight = Math.max(13, 4 + labelBlockHeight + (valorLineCount > 0 ? valorLineCount * 4.3 + 2 : 0));

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.25);
    doc.line(tableX, y, tableX + tableWidth, y);
    celdas.forEach((_celda, i) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(labelLineas[i], colX[i] + 2, y + 4.5);
      if (valorLineas[i].length > 0) {
        doc.setFont("times", "italic");
        doc.setFontSize(10.5);
        doc.text(valorLineas[i], colX[i] + 2, y + 4.5 + labelLineas[i].length * 3.6 + 4);
      }
      if (i > 0) doc.line(colX[i], y, colX[i], y + rowHeight);
    });
    doc.line(tableX, y + rowHeight, tableX + tableWidth, y + rowHeight);
    return y + rowHeight;
  }

  let y = outerMargin + 30;
  y = fichaFila([{ label: "Author | Autor :", value: obra.autor }], y);
  y = fichaFila([{ label: "Based | Reside:", value: ficha.artistaReside }], y);
  y = fichaFila(
    [
      { label: "Title of artwork | Título de la obra:", value: obra.titulo },
      { label: "Year | Año:", value: ficha.anio },
    ],
    y,
  );
  y = fichaFila(
    [
      { label: "Medium type | Disciplina:", value: ficha.categoriaLabel },
      { label: "Materials | Materiales:", value: ficha.materialesTexto },
    ],
    y,
  );
  y = fichaFila(
    [
      { label: "Is this part of a series? | Es parte de una serie:", value: ficha.serieProyecto },
      { label: "# of artwork | # de obras", value: formatearNumeroConPA(obra.serie) },
    ],
    y,
  );
  y = fichaFila([{ label: "Placement of signature | Ubicación de la firma", value: ficha.ubicacionFirma }], y);

  y += 14;
  const firmaColWidth = tableWidth / 2;
  const firmaColXs = [tableX, tableX + firmaColWidth];
  const firmaBytesPorColumna = [ficha.artistaFirmaBytes, ficha.galeriaFirmaBytes];
  const firmaCaptions = ["Firma | Signature  Artist", "Firma | Signature Gallery Owner"];
  for (let i = 0; i < 2; i++) {
    const x = firmaColXs[i];
    const bytes = firmaBytesPorColumna[i];
    let lineY = y;
    if (opts.firma === "digital" && bytes) {
      const formato = detectImageFormat(bytes);
      if (formato) {
        const { width, height } = await fittedImageSize(bytes, 22);
        doc.addImage(bytes, formato, x + 6, y - height - 2, width, height);
        lineY = y;
      }
    }
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
    doc.line(x + 6, lineY, x + firmaColWidth - 10, lineY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(firmaCaptions[i], x + 6, lineY + 6);
  }

  const footerY = pageHeight - outerMargin - 34;
  if (ficha.galeriaLogoBytes) {
    const formatoLogo = detectImageFormat(ficha.galeriaLogoBytes);
    if (formatoLogo) {
      const { width, height } = await fittedImageSize(ficha.galeriaLogoBytes, 18);
      doc.addImage(ficha.galeriaLogoBytes, formatoLogo, tableX, footerY, width, height);
    }
  }
  doc.setFont("Inter", "normal");
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  const contacto = [ficha.galeriaNombre, ficha.galeriaTelefono, ficha.galeriaEmail].filter(Boolean).join("  |  ");
  if (contacto) doc.text(contacto, tableX + 24, footerY + 12);

  if (ficha.imgBytes) {
    const formatoObra = detectImageFormat(ficha.imgBytes);
    if (formatoObra) {
      const imageBoxSize = 32;
      const { width, height } = await fittedImageSize(ficha.imgBytes, imageBoxSize);
      doc.addImage(
        ficha.imgBytes,
        formatoObra,
        tableX + tableWidth - width,
        footerY - imageBoxSize + 2,
        width,
        height,
      );
    }
  }

  return new Uint8Array(doc.output("arraybuffer"));
}

/** Remito de salida: a donde se entrega la obra y en que estado sale. */
export async function buildRemitoPdfBytes(
  obra: VentaReporteObraDatos,
  venta: VentaReporteVentaDatos,
  comprador: VentaReporteCompradorDatos,
  opts: InformeBrandingOpts,
): Promise<Uint8Array> {
  const titulo = tInforme(opts.idioma, "ventaReport.remitoTitulo");
  const { doc, marginLeft, startY } = await nuevoDocConMembrete(titulo, opts);
  const pageWidth = doc.internal.pageSize.getWidth();
  const width = pageWidth - marginLeft * 2;
  let y = startY;

  const lineas: string[] = [
    campo(opts.idioma, "ventaForm.fechaVenta", formatFechaDDMMYYYY(venta.fechaVenta)),
    `${tInforme(opts.idioma, "obraForm.tituloLabel")}: ${obra.titulo}`,
    ...obra.descripcionLineas,
    ...buildSerieLineas(obra.serie, opts.idioma),
    campo(opts.idioma, "ventaReport.compradorLabel", comprador.nombre),
  ];
  if (venta.direccionEntrega) lineas.push(campo(opts.idioma, "ventaForm.direccionEntregaLabel", venta.direccionEntrega));
  if (venta.ciudadEntrega) lineas.push(campo(opts.idioma, "ventaForm.ciudadEntregaLabel", venta.ciudadEntrega));
  if (venta.paisEntrega) lineas.push(campo(opts.idioma, "ventaForm.paisEntregaLabel", venta.paisEntrega));
  if (obra.informeConservacion) lineas.push(campo(opts.idioma, "ventaReport.estadoConservacionLabel", obra.informeConservacion));

  for (const linea of lineas) y = writeWrappedText(doc, linea, marginLeft, y, width, { lineHeight: 6 });

  await drawSignatureBlock(doc, y + 10, { idioma: opts.idioma, firma: opts.firma, firmaBytes: opts.firmaBytes, marginLeft });
  return new Uint8Array(doc.output("arraybuffer"));
}

const CLAUSULA_DERECHOS_AUTOR =
  "1. Propiedad Material: La Parte Compradora adquiere la propiedad fisica del soporte de la obra.\n" +
  "2. Propiedad Intelectual y Derechos Morales: Los derechos morales y patrimoniales de autor permanecen inalienables en cabeza del Artista conforme a la legislacion de propiedad intelectual vigente.\n" +
  "3. Derechos Cedidos: La Parte Compradora queda facultada para exhibir la obra en espacios privados o institucionales, y reproducir su imagen exclusivamente para fines de catalogacion personal, aseguramiento, archivo o prestamo no comercial a museos, debiendo citar siempre la autoria del Artista.\n" +
  "4. Prohibicion de Explotacion Comercial: Queda expresamente prohibida la reproduccion, copia, edicion grafica o digital, comercializacion de reproducciones o cualquier uso comercial de la imagen de la obra sin autorizacion previa y por escrito del Artista o sus derechohabientes.";

const CLAUSULA_CONFIDENCIALIDAD =
  "Las partes acuerdan mantener bajo estricta confidencialidad los terminos economicos de la presente transaccion, asi como la identidad de los involucrados, salvo requerimiento de autoridad fiscal o judicial competente.";

const ORDINALES = ["PRIMERA", "SEGUNDA", "TERCERA", "CUARTA", "QUINTA", "SEXTA", "SEPTIMA", "OCTAVA"];

/**
 * Contrato de compraventa de obra de arte. Arma las clausulas como una lista
 * y las numera dinamicamente (PRIMERA, SEGUNDA, ...) segun cuales apliquen,
 * para no hardcodear la numeracion cuando faltan clausulas (ej. sin
 * confidencialidad). Es un instrumento legal en espanol (jurisdiccion
 * argentina) — no pasa por el selector de idioma de los informes
 * (`hideIdioma: true` en la opcion del menu).
 */
export async function buildContratoPdfBytes(
  obra: VentaReporteObraDatos,
  venta: VentaReporteVentaDatos,
  comprador: VentaReporteCompradorDatos,
  vendedor: VentaReporteVendedorDatos,
  variante: "estandar" | "rofr",
  rofrParams: { plazoAnios: number; plazoDias: number; criterioPrecio: string } | null,
  opts: Omit<InformeBrandingOpts, "idioma">,
): Promise<Uint8Array> {
  const idioma: InformeIdioma = "es";
  const titulo = variante === "rofr" ? "Contrato de Compraventa con Derecho de Tanteo" : "Contrato de Compraventa de Obra de Arte";
  const { doc, marginLeft, startY } = await nuevoDocConMembrete(titulo, { ...opts, idioma });
  const pageWidth = doc.internal.pageSize.getWidth();
  const width = pageWidth - marginLeft * 2;
  let y = startY;

  const encabezado =
    `En la ciudad de ${venta.lugarVenta || "____________"}, el ${formatFechaDDMMYYYY(venta.fechaVenta)}, entre:\n\n` +
    `LA PARTE VENDEDORA: ${vendedor.nombre}, con CUIT/NIF ${vendedor.cuit || "____________"}, con domicilio en ${vendedor.domicilio || "____________"}.\n\n` +
    `LA PARTE COMPRADORA: ${comprador.nombre}, con DNI/Pasaporte/CUIT ${comprador.cuit || "____________"}, con domicilio en ${comprador.domicilio || "____________"}.\n\n` +
    "Ambas partes acuerdan celebrar el presente contrato sujeto a las siguientes clausulas:";
  y = writeWrappedText(doc, encabezado, marginLeft, y, width, { lineHeight: 5.5 });

  const detalleObraTexto = [
    `Autor: ${obra.autor}`,
    `Titulo: ${obra.titulo}`,
    `Nº de Inventario/Registro: ${obra.codigoInventario || "____________"}`,
    ...obra.descripcionLineas,
    ...buildSerieLineas(obra.serie, idioma),
  ].join("\n");

  const clausulas: { titulo: string; texto: string }[] = [
    {
      titulo: "OBJETO DE LA COMPRAVENTA",
      texto: `La Parte Vendedora transfiere la propiedad material de la siguiente obra de arte:\n${detalleObraTexto}`,
    },
    {
      titulo: "PRECIO Y FORMA DE PAGO",
      texto: `El precio total pactado para la presente operacion es de ${formatMoneda(venta.moneda, venta.valorVenta)}, abonado ${venta.metodoPago ? `mediante ${venta.metodoPago}` : "segun lo convenido entre las partes"}, conforme al comprobante Nº ${venta.numeroCertificado ?? "____________"}.`,
    },
    { titulo: "PROPIEDAD Y DERECHOS DE AUTOR", texto: CLAUSULA_DERECHOS_AUTOR },
  ];

  if (variante === "rofr" && rofrParams) {
    let texto =
      `Con el fin de proteger la trayectoria del Artista y evitar la especulacion en el mercado secundario, las partes acuerdan expresamente:\n\n` +
      `1. Plazo de Restriccion: Por un periodo de ${rofrParams.plazoAnios} años a partir de la fecha de suscripcion del presente instrumento, la Parte Compradora se compromete a no vender, ceder, donar ni transferir a titulo oneroso o gratuito la obra a terceros sin antes ofrecerla en compra preferente a la Parte Vendedora.\n\n` +
      `2. Procedimiento de Notificacion: En caso de intencion de enajenacion, la Parte Compradora debera notificar fehacientemente y por escrito a la Parte Vendedora, indicando el precio de venta pretendido o acompañando copia de la oferta formal recibida de un tercero de buena fe.\n\n` +
      `3. Ejercicio del Derecho: La Parte Vendedora dispondra de un plazo improrrogable de ${rofrParams.plazoDias} dias corridos desde la recepcion de la notificacion para ejercer la opcion de compra por ${rofrParams.criterioPrecio || "el precio informado"}, o declinar formalmente el ejercicio de compra.\n\n` +
      `4. Caducidad o Rechazo: Si transcurrido dicho plazo la Parte Vendedora no manifestare su voluntad de compra o la declinare expresamente, la Parte Compradora quedara en libertad de transferir la obra al tercero ofertante bajo las mismas condiciones informadas.`;
    if (venta.clausulaReventa) texto += `\n\nObservacion adicional cargada en el sistema: ${venta.clausulaReventa}`;
    clausulas.push({ titulo: "DERECHO DE ADQUISICION PREFERENTE (RIGHT OF FIRST REFUSAL - ROFR)", texto });
  }

  if (venta.confidencial) {
    clausulas.push({ titulo: "CONFIDENCIALIDAD", texto: CLAUSULA_CONFIDENCIALIDAD });
  }

  clausulas.push({
    titulo: "ENTREGA Y DOCUMENTACION",
    texto: `Se hace entrega de la obra junto con su correspondiente Certificado de Autenticidad (COA)${obra.informeConservacion ? `, en las siguientes condiciones de conservacion: ${obra.informeConservacion}` : ""}, las cuales la Parte Compradora declara conocer y aceptar.`,
  });
  clausulas.push({
    titulo: "JURISDICCION Y LEY APLICABLE",
    texto: `Para cualquier controversia derivada del presente contrato, las partes se someten a la jurisdiccion de los Tribunales Ordinarios de ${venta.lugarVenta || "____________"}, renunciando a cualquier otro fuero que pudiera corresponderles.`,
  });

  clausulas.forEach((clausula, i) => {
    y += 4;
    doc.setFont("Inter", "medium");
    y = writeWrappedText(doc, `${ORDINALES[i] ?? String(i + 1)}. ${clausula.titulo}`, marginLeft, y, width, { lineHeight: 5.5 });
    doc.setFont("Inter", "normal");
    y = writeWrappedText(doc, clausula.texto, marginLeft, y, width, { lineHeight: 5.5 });
  });

  y += 6;
  y = writeWrappedText(
    doc,
    "En prueba de conformidad, se firman dos ejemplares de un mismo tenor y a un solo efecto.",
    marginLeft,
    y,
    width,
    { lineHeight: 5.5 },
  );

  await drawSignatureBlock(doc, y + 10, { idioma, firma: opts.firma, firmaBytes: opts.firmaBytes, marginLeft });
  return new Uint8Array(doc.output("arraybuffer"));
}
