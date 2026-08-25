import type { TranslationKey } from "../i18n/LanguageContext.js";
import { tInforme, type InformeIdioma } from "./informeIdioma.js";
import { detectImageFormat } from "../utils/detectImageFormat.js";
import { formatFechaDDMMYYYY } from "../utils/formatFecha.js";
import { drawSignatureBlock, fittedImageSize, writeWrappedText } from "../utils/pdfBranding.js";
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
}

/** Datos de la obra/ejemplar comunes a todos los documentos de venta. `descripcionLineas` ya viene armada por el llamador (misma logica que usa la ficha/presupuesto para no duplicar el detalle por categoria). */
export interface VentaReporteObraDatos {
  titulo: string;
  autor: string;
  codigoInventario: string;
  informeConservacion: string;
  descripcionLineas: string[];
  serie: VentaReporteSerieDatos;
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

/** Recibo/comprobante de venta con el desglose financiero completo (Fase A) + comprador + entrega (Fase B). No se ofrece para donaciones (no tienen valor comercial). */
export async function buildComprobanteVentaPdfBytes(
  obra: VentaReporteObraDatos,
  venta: VentaReporteVentaDatos,
  comprador: VentaReporteCompradorDatos,
  opts: InformeBrandingOpts,
): Promise<Uint8Array> {
  const titulo = tInforme(opts.idioma, "ventaReport.comprobanteTitulo", {
    numero: venta.numeroCertificado ?? "—",
  });
  const { doc, marginLeft, startY } = await nuevoDocConMembrete(titulo, opts);
  const pageWidth = doc.internal.pageSize.getWidth();
  const width = pageWidth - marginLeft * 2;
  let y = startY;

  const lineas: string[] = [
    campo(opts.idioma, "ventaForm.fechaVenta", formatFechaDDMMYYYY(venta.fechaVenta)),
    campo(opts.idioma, "ventaReport.compradorLabel", comprador.nombre),
    `${tInforme(opts.idioma, "obraForm.tituloLabel")}: ${obra.titulo}`,
    ...obra.descripcionLineas,
    ...buildSerieLineas(obra.serie, opts.idioma),
  ];
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
    lineas.push(campo(opts.idioma, "ventaForm.estadoPagoLabel", tInforme(opts.idioma, estadoPagoKey(venta.estadoPago))));
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

/** Certificado de autenticidad (COA): identidad de la obra + comprador + Nº de certificado + firma. */
export async function buildCoaPdfBytes(
  obra: VentaReporteObraDatos,
  venta: VentaReporteVentaDatos,
  comprador: VentaReporteCompradorDatos,
  opts: InformeBrandingOpts,
): Promise<Uint8Array> {
  const titulo = tInforme(opts.idioma, "ventaReport.coaTitulo");
  const { doc, marginLeft, startY } = await nuevoDocConMembrete(titulo, opts);
  const pageWidth = doc.internal.pageSize.getWidth();
  const width = pageWidth - marginLeft * 2;
  let y = startY;

  const lineas: string[] = [
    `${tInforme(opts.idioma, "obraForm.tituloLabel")}: ${obra.titulo}`,
    ...obra.descripcionLineas,
    ...buildSerieLineas(obra.serie, opts.idioma),
  ];
  if (venta.numeroCertificado != null) lineas.push(tInforme(opts.idioma, "common.certificadoNum", { numero: venta.numeroCertificado }));
  lineas.push(campo(opts.idioma, "ventaReport.compradorLabel", comprador.nombre));
  lineas.push(campo(opts.idioma, "ventaForm.fechaVenta", formatFechaDDMMYYYY(venta.fechaVenta)));

  for (const linea of lineas) y = writeWrappedText(doc, linea, marginLeft, y, width, { lineHeight: 6 });

  if (venta.clausulaReventa) {
    y += 4;
    doc.setFontSize(9);
    y = writeWrappedText(
      doc,
      tInforme(opts.idioma, "ventaReport.notaRofrCoa", { inventario: obra.codigoInventario || "—" }),
      marginLeft,
      y,
      width,
      { lineHeight: 5 },
    );
    doc.setFontSize(10);
  }

  await drawSignatureBlock(doc, y + 10, { idioma: opts.idioma, firma: opts.firma, firmaBytes: opts.firmaBytes, marginLeft });
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
