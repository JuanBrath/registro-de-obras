import type { jsPDF } from "jspdf";
import type { TranslationKey } from "../i18n/LanguageContext.js";
import { tInforme } from "./informeIdioma.js";
import { drawPdfHeader, drawSignatureBlock, writeWrappedText } from "../utils/pdfBranding.js";
import { formatFechaDDMMYYYY } from "../utils/formatFecha.js";
import { nuevoDocConMembrete, type InformeBrandingOpts } from "./reportPdfBase.js";

export type { InformeBrandingOpts };

export interface ClienteReporteDatos {
  nombre: string;
  tipoCliente: string;
  domicilio: string;
  ciudad: string;
  pais: string;
  email: string;
  telefono: string;
  cuit: string;
  perfilIntereses: string;
  notas: string;
}

const TIPO_CLIENTE_LABEL_KEYS: Record<string, TranslationKey> = {
  ColeccionistaPrivado: "clientes.tipoColeccionistaPrivado",
  GaleriaDealer: "clientes.tipoGaleriaDealer",
  EmpresaInstitucion: "clientes.tipoEmpresaInstitucion",
  DecoradorArquitecto: "clientes.tipoDecoradorArquitecto",
};

/** Dibuja la ficha de un cliente (datos + intereses + notas + firma) en un doc ya abierto, desde startY. Devuelve el Y final. */
async function dibujarFichaCliente(
  doc: jsPDF,
  cliente: ClienteReporteDatos,
  opts: InformeBrandingOpts,
  marginLeft: number,
  startY: number,
): Promise<number> {
  const pageWidth = doc.internal.pageSize.getWidth();
  const textWidth = pageWidth - marginLeft * 2;

  const campo = (key: TranslationKey, valor: string) => `${tInforme(opts.idioma, key)}: ${valor || "—"}`;
  const tipoClienteLabel = cliente.tipoCliente ? tInforme("es", TIPO_CLIENTE_LABEL_KEYS[cliente.tipoCliente]) : "";
  const lineas = [
    campo("clientes.nombreLabel", cliente.nombre),
    campo("clientes.tipoClienteLabel", tipoClienteLabel),
    campo("clientes.domicilioLabel", cliente.domicilio),
    campo("clientes.ciudadLabel", cliente.ciudad),
    campo("clientes.paisLabel", cliente.pais),
    campo("profile.mail", cliente.email),
    campo("artistas.telefono", cliente.telefono),
    campo("common.cuit", cliente.cuit),
  ];

  let y = startY + 5;
  for (const linea of lineas) y = writeWrappedText(doc, linea, marginLeft, y, textWidth);

  if (cliente.perfilIntereses) {
    y += 3;
    doc.setFontSize(11);
    y = writeWrappedText(doc, tInforme(opts.idioma, "clientes.perfilInteresesLabel"), marginLeft, y, textWidth, { lineHeight: 6 });
    doc.setFontSize(10);
    y = writeWrappedText(doc, cliente.perfilIntereses, marginLeft, y, textWidth);
  }
  if (cliente.notas) {
    y += 3;
    doc.setFontSize(11);
    y = writeWrappedText(doc, tInforme(opts.idioma, "artistas.notas"), marginLeft, y, textWidth, { lineHeight: 6 });
    doc.setFontSize(10);
    y = writeWrappedText(doc, cliente.notas, marginLeft, y, textWidth);
  }

  return drawSignatureBlock(doc, y + 10, { idioma: opts.idioma, firma: opts.firma, firmaBytes: opts.firmaBytes, marginLeft });
}

/** Informe 1: ficha del cliente con los datos ya cargados. */
export async function buildClienteConDatosPdfBytes(
  cliente: ClienteReporteDatos,
  opts: InformeBrandingOpts,
): Promise<Uint8Array> {
  const titulo = cliente.nombre || tInforme(opts.idioma, "clientes.tituloFichaBlanco");
  const { doc, marginLeft, startY } = await nuevoDocConMembrete(titulo, opts);
  await dibujarFichaCliente(doc, cliente, opts, marginLeft, startY);
  return new Uint8Array(doc.output("arraybuffer"));
}

/**
 * Ficha de cliente para un listado de resultados de busqueda (uno o mas
 * clientes que coinciden): una pagina por cliente, misma ficha que
 * `buildClienteConDatosPdfBytes` pero en un unico archivo.
 */
export async function buildClientesFichaPdfBytes(
  clientes: ClienteReporteDatos[],
  opts: InformeBrandingOpts,
): Promise<Uint8Array> {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const marginLeft = 14;

  for (let i = 0; i < clientes.length; i++) {
    if (i > 0) doc.addPage();
    const cliente = clientes[i];
    const titulo = cliente.nombre || tInforme(opts.idioma, "clientes.tituloFichaBlanco");
    const startY = await drawPdfHeader(doc, titulo, {
      marginLeft,
      logoBytes: opts.logoBytes,
      incluirLogo: opts.incluirLogo,
      localidad: opts.localidad,
      incluirFecha: opts.incluirFecha,
    });
    await dibujarFichaCliente(doc, cliente, opts, marginLeft, startY);
  }

  return new Uint8Array(doc.output("arraybuffer"));
}

const CAMPOS_BLANCO: TranslationKey[] = [
  "clientes.tipoClienteLabel",
  "clientes.domicilioLabel",
  "clientes.ciudadLabel",
  "clientes.paisLabel",
  "profile.mail",
  "artistas.telefono",
  "common.cuit",
  "clientes.perfilInteresesLabel",
];

const GRIS_MEDIO: [number, number, number] = [128, 128, 128];
const RENGLON = 6;
const SEPARACION_CAMPO = RENGLON * 1.5;

/** Etiqueta + linea punteada gris para completar a mano, desde el final del texto hasta endX. */
function dibujarCampoParaCompletar(doc: jsPDF, label: string, x: number, y: number, endX: number): void {
  doc.setFont("Inter", "normal");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  const textoLabel = `${label}: `;
  doc.text(textoLabel, x, y);
  const labelWidth = doc.getTextWidth(textoLabel);
  doc.setDrawColor(...GRIS_MEDIO);
  doc.setLineDashPattern([0.5, 1], 0);
  doc.line(x + labelWidth, y, endX, y);
  doc.setLineDashPattern([], 0);
}

/**
 * Informes 2 y 3: misma ficha en blanco para completar a mano — con el
 * nombre precargado (uso interno) o totalmente vacia, sin el nombre del
 * cliente, para emitirla a un cliente nuevo que la complete el mismo,
 * segun `incluirNombre`. El resto de los campos siempre sale en blanco
 * (linea punteada gris), esten o no ya cargados en el sistema.
 */
export async function buildClienteEnBlancoPdfBytes(
  nombre: string,
  incluirNombre: boolean,
  opts: InformeBrandingOpts,
): Promise<Uint8Array> {
  const titulo = incluirNombre && nombre ? nombre : tInforme(opts.idioma, "clientes.tituloFichaBlanco");
  const { doc, marginLeft, startY } = await nuevoDocConMembrete(titulo, opts);
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginRight = 14;
  const endX = pageWidth - marginRight;

  let y = startY + 8;

  if (incluirNombre && nombre) {
    doc.setFont("Inter", "normal");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`${tInforme(opts.idioma, "clientes.nombreLabel")}: ${nombre}`, marginLeft, y);
  } else {
    dibujarCampoParaCompletar(doc, tInforme(opts.idioma, "clientes.nombreLabel"), marginLeft, y, endX);
  }
  y += SEPARACION_CAMPO;

  for (const key of CAMPOS_BLANCO) {
    dibujarCampoParaCompletar(doc, tInforme(opts.idioma, key), marginLeft, y, endX);
    y += SEPARACION_CAMPO;
  }

  y += 3;
  doc.setFont("Inter", "normal");
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text(tInforme(opts.idioma, "artistas.notas"), marginLeft, y);
  y += RENGLON;
  doc.setFontSize(10);
  for (let i = 0; i < 4; i++) {
    doc.setDrawColor(...GRIS_MEDIO);
    doc.setLineDashPattern([0.5, 1], 0);
    doc.line(marginLeft, y, endX, y);
    doc.setLineDashPattern([], 0);
    y += SEPARACION_CAMPO;
  }

  y = await drawSignatureBlock(doc, y + 6, { idioma: opts.idioma, firma: opts.firma, firmaBytes: opts.firmaBytes, marginLeft });
  return new Uint8Array(doc.output("arraybuffer"));
}

export interface ClienteHistorialVentaRow {
  fecha_venta: string;
  obra_titulo: string;
  ejemplar_numero: string | null;
  soporte_impresion: string | null;
  dimensiones: string | null;
  valor_venta: number;
  moneda: string;
  numero_certificado: number | null;
}

/** Informe 4: historial de compras del cliente en un rango de fechas. */
export async function buildClienteHistorialPdfBytes(
  nombreCliente: string,
  ventas: ClienteHistorialVentaRow[],
  fechaDesde: string,
  fechaHasta: string,
  opts: InformeBrandingOpts,
): Promise<Uint8Array> {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const marginLeft = 14;
  const startY = await drawPdfHeader(doc, nombreCliente, { marginLeft, logoBytes: opts.logoBytes });
  const pageWidth = doc.internal.pageSize.getWidth();
  const textWidth = pageWidth - marginLeft * 2;

  const rango = `${tInforme(opts.idioma, "clientes.historialFechasDesde")}: ${formatFechaDDMMYYYY(fechaDesde)}   ${tInforme(
    opts.idioma,
    "clientes.historialFechasHasta",
  )}: ${formatFechaDDMMYYYY(fechaHasta)}`;
  const textY = writeWrappedText(doc, rango, marginLeft, startY + 5, textWidth);

  autoTable(doc, {
    startY: textY + 4,
    styles: { font: "Inter" },
    headStyles: { fontStyle: "normal" },
    head: [
      [
        tInforme(opts.idioma, "clientes.historialColFecha"),
        tInforme(opts.idioma, "clientes.historialColObra"),
        tInforme(opts.idioma, "clientes.historialColEjemplar"),
        tInforme(opts.idioma, "clientes.historialColFormatoSoporte"),
        tInforme(opts.idioma, "clientes.historialColMontoFinal"),
        tInforme(opts.idioma, "clientes.historialColEstadoCoa"),
      ],
    ],
    body: ventas.map((v) => [
      formatFechaDDMMYYYY(v.fecha_venta),
      v.obra_titulo,
      v.ejemplar_numero ?? "—",
      [v.soporte_impresion, v.dimensiones].filter(Boolean).join(" — ") || "—",
      `${v.moneda} ${v.valor_venta.toFixed(2)}`,
      v.numero_certificado != null
        ? tInforme("es", "clientes.certificadoEmitido", { numero: v.numero_certificado })
        : tInforme("es", "clientes.certificadoPendiente"),
    ]),
  });

  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? textY;
  await drawSignatureBlock(doc, finalY + 10, { idioma: opts.idioma, firma: opts.firma, firmaBytes: opts.firmaBytes, marginLeft });
  return new Uint8Array(doc.output("arraybuffer"));
}
