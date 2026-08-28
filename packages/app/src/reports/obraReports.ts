import type { jsPDF } from "jspdf";
import type { TranslationKey } from "../i18n/LanguageContext.js";
import { tInforme } from "./informeIdioma.js";
import { detectImageFormat } from "../utils/detectImageFormat.js";
import { formatFechaDDMMYYYY } from "../utils/formatFecha.js";
import { drawSignatureBlock, fittedImageSize, writeWrappedText } from "../utils/pdfBranding.js";
import { nuevoDocConMembrete, type InformeBrandingOpts } from "./reportPdfBase.js";

export interface ObraEjemplarDetalle {
  numero: string;
  estado: string;
  fecha_impresion: string | null;
  tipo_impresion: string | null;
  soporte_impresion: string | null;
  tipo_tintas: string | null;
  taller_impresion: string | null;
  ubicacion_actual: string | null;
  dimensiones: string | null;
  tipo_enmarcado: string | null;
  tamano_final_enmarcado: string | null;
  ubicacion_firma: string | null;
  sello_seco_holograma: string | null;
  notas: string | null;
  coa_numero: string | null;
  coa_emisor: string | null;
  coa_fecha: string | null;
  coa_sistema_seguridad: string | null;
  valor_seguro: number | null;
  moneda_seguro: string | null;
  vidrio_proteccion_frontal: string | null;
  sistema_cuelgue: string | null;
  informe_conservacion: string | null;
  dimensiones_soporte_completo: string | null;
  peso: string | null;
  tipo_firma: string | null;
  clasificacion_prueba_especial: string | null;
  instrucciones_manipulacion: string | null;
  adhesivos_montaje: string | null;
  inscripciones_anotaciones: string | null;
  /** Ya formateado ("Vendida — Juan Perez (01/02/2026)"), o null si no aplica. */
  ventaTexto: string | null;
}

const IMAGE_BOX_SIZE = 70;

/** Ficha detallada de una sola serie: todos sus campos, uno por renglon. */
function escribirEjemplarDetallado(
  doc: jsPDF,
  idioma: InformeBrandingOpts["idioma"],
  ej: ObraEjemplarDetalle,
  x: number,
  y: number,
  width: number,
): number {
  const campo = (key: TranslationKey, valor: string) => `${tInforme(idioma, key)}: ${valor}`;

  let cursorY = y;
  doc.setFont("Inter", "medium");
  doc.setFontSize(11);
  cursorY = writeWrappedText(doc, `${tInforme(idioma, "ventasReport.colSerie")}: ${ej.numero}`, x, cursorY, width, {
    lineHeight: 6,
  });
  doc.setFont("Inter", "normal");
  doc.setFontSize(10);

  const lineas: string[] = [];
  lineas.push(campo("obraDetail.estadoLabel", tInforme("es", `estado.${ej.estado}` as TranslationKey)));
  if (ej.ventaTexto) lineas.push(campo("obraDetail.ventaReserva", ej.ventaTexto));
  if (ej.fecha_impresion) lineas.push(campo("obraDetail.fechaImpresion", formatFechaDDMMYYYY(ej.fecha_impresion)));
  if (ej.tipo_impresion) lineas.push(campo("obraDetail.tipoImpresionLabel", ej.tipo_impresion));
  if (ej.soporte_impresion) lineas.push(campo("obraDetail.soporteImpresion", ej.soporte_impresion));
  if (ej.tipo_tintas) lineas.push(campo("obraDetail.tipoTintasLabel", ej.tipo_tintas));
  if (ej.taller_impresion) lineas.push(campo("obraDetail.tallerImpresionLabel", ej.taller_impresion));
  if (ej.ubicacion_actual) lineas.push(campo("obraDetail.ubicacionActualCopia", ej.ubicacion_actual));
  if (ej.dimensiones) lineas.push(campo("obraDetail.tamanoEjemplarLabel", ej.dimensiones));
  if (ej.tipo_enmarcado) lineas.push(campo("obraDetail.tipoEnmarcadoLabel", ej.tipo_enmarcado));
  if (ej.tamano_final_enmarcado) lineas.push(campo("obraDetail.tamanoFinalEnmarcadoLabel", ej.tamano_final_enmarcado));
  if (ej.ubicacion_firma) lineas.push(campo("obraDetail.ubicacionFirmaLabel", ej.ubicacion_firma));
  if (ej.sello_seco_holograma) lineas.push(campo("obraDetail.selloSecoHologramaLabel", ej.sello_seco_holograma));
  if (ej.dimensiones_soporte_completo) {
    lineas.push(campo("obraDetail.dimensionesSoporteCompletoLabel", ej.dimensiones_soporte_completo));
  }
  if (ej.peso) lineas.push(campo("obraDetail.pesoLabel", ej.peso));
  if (ej.tipo_firma) lineas.push(campo("fields.obraGrafica.tipoFirmaLabel", ej.tipo_firma));
  if (ej.clasificacion_prueba_especial) {
    lineas.push(campo("fields.obraGrafica.clasificacionPruebaEspecialLabel", ej.clasificacion_prueba_especial));
  }
  if (ej.instrucciones_manipulacion) {
    lineas.push(campo("fields.escultura.instruccionesManipulacionLabel", ej.instrucciones_manipulacion));
  }
  if (ej.adhesivos_montaje) lineas.push(campo("fields.dibujo.adhesivosMontajeLabel", ej.adhesivos_montaje));
  if (ej.inscripciones_anotaciones) {
    lineas.push(campo("fields.dibujo.inscripcionesAnotacionesLabel", ej.inscripciones_anotaciones));
  }
  if (ej.vidrio_proteccion_frontal) {
    lineas.push(campo("obraDetail.vidrioProteccionFrontalLabel", ej.vidrio_proteccion_frontal));
  }
  if (ej.sistema_cuelgue) lineas.push(campo("obraDetail.sistemaCuelgueLabel", ej.sistema_cuelgue));
  if (ej.coa_numero) lineas.push(campo("obraDetail.coaNumeroLabel", ej.coa_numero));
  if (ej.coa_emisor) lineas.push(campo("obraDetail.coaEmisorLabel", ej.coa_emisor));
  if (ej.coa_fecha) lineas.push(campo("obraDetail.coaFechaLabel", formatFechaDDMMYYYY(ej.coa_fecha)));
  if (ej.coa_sistema_seguridad) lineas.push(campo("obraDetail.coaSistemaSeguridadLabel", ej.coa_sistema_seguridad));
  if (ej.valor_seguro != null) {
    lineas.push(campo("obraDetail.valorSeguroLabel", `${ej.moneda_seguro ?? "ARS"} ${ej.valor_seguro}`));
  }
  if (ej.informe_conservacion) lineas.push(campo("obraDetail.informeConservacionLabel", ej.informe_conservacion));
  if (ej.notas) lineas.push(campo("obraDetail.notasEjemplarLabel", ej.notas));

  for (const linea of lineas) cursorY = writeWrappedText(doc, linea, x, cursorY, width, { lineHeight: 5.5 });
  return cursorY + 6;
}

/**
 * Informes de series con detalle completo (no la tabla compacta de la ficha):
 * usados para "series disponibles", "series no disponibles" y "primera serie
 * disponible". La descripcion de la obra (armada afuera con
 * buildObraDescripcionLineas, igual que en la ficha completa) va al costado
 * de la foto; el detalle de cada serie va debajo, a todo el ancho.
 */
export async function buildObraSeriesDetalladoPdfBytes(
  titulo: string,
  imgBytes: Uint8Array | null,
  descripcionLineas: string[],
  ejemplares: ObraEjemplarDetalle[],
  mensajeSinSeries: string,
  opts: InformeBrandingOpts,
): Promise<Uint8Array> {
  const { doc, marginLeft, startY } = await nuevoDocConMembrete(titulo, opts);
  // La foto queda pegada al membrete; solo el texto de datos gana mas aire
  // respecto de la linea dorada del encabezado.
  const textStartY = startY + 10;
  let textX = marginLeft;
  let imageBottom = startY;

  if (imgBytes) {
    const formato = detectImageFormat(imgBytes);
    if (formato) {
      const { width, height } = await fittedImageSize(imgBytes, IMAGE_BOX_SIZE);
      doc.addImage(imgBytes, formato, marginLeft, startY, width, height);
      imageBottom = startY + height;
      textX = marginLeft + IMAGE_BOX_SIZE + 8;
    }
  }

  const pageWidth = doc.internal.pageSize.getWidth();
  const textWidth = pageWidth - textX - marginLeft;
  let textY = textStartY;
  for (const linea of descripcionLineas) {
    textY = writeWrappedText(doc, linea, textX, textY, textWidth, { lineHeight: 6 });
  }

  const bodyWidth = pageWidth - marginLeft * 2;
  let bodyY = Math.max(imageBottom, textY) + 8;

  if (ejemplares.length === 0) {
    bodyY = writeWrappedText(doc, mensajeSinSeries, marginLeft, bodyY, bodyWidth);
  } else {
    for (const ej of ejemplares) {
      bodyY = escribirEjemplarDetallado(doc, opts.idioma, ej, marginLeft, bodyY, bodyWidth);
    }
  }

  await drawSignatureBlock(doc, bodyY + 6, {
    idioma: opts.idioma,
    firma: opts.firma,
    firmaBytes: opts.firmaBytes,
    marginLeft,
  });
  return new Uint8Array(doc.output("arraybuffer"));
}
