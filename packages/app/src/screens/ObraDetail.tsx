import { useEffect, useRef, useState } from "react";
import {
  derivarAnioDesdeFecha,
  derivarEsSeriadaPintura,
  formatTags,
  generarEjemplarUnico,
  generarEjemplares,
  obraMiniaturaPath,
  obraOriginalPath,
  parseTags,
  puedeDeshacerSerie,
  type CategoriaObra,
  type Moneda,
  type SubtipoPintura,
  type TipoVenta,
} from "@registro/core";
import { useWorkspace } from "../state/WorkspaceContext.js";
import { bytesToObjectUrl } from "../utils/imageObjectUrl.js";
import { VentaForm, type VentaExistente } from "../components/VentaForm.js";
import { Modal } from "../components/Modal.js";
import { TagPicker } from "../components/TagPicker.js";
import { ArtistaSelector } from "../components/ArtistaSelector.js";
import { FilePathField } from "../components/FilePathField.js";
import { ImageFileField } from "../components/ImageFileField.js";
import { HelpIcon } from "../components/HelpIcon.js";
import { todayISO } from "../utils/today.js";
import { useLanguage, type TranslationKey } from "../i18n/LanguageContext.js";
import { isTauri } from "../adapters/detectPlatform.js";
import { useEscapeToDismiss } from "../utils/useEscapeToDismiss.js";
import { savePdfWithDialog } from "../utils/savePdfDialog.js";
import { formatFechaDDMMYYYY } from "../utils/formatFecha.js";
import { detectImageFormat } from "../utils/detectImageFormat.js";
import { focusNextOnEnter } from "../utils/focusNextOnEnter.js";
import { drawPdfHeader, writeWrappedText } from "../utils/pdfBranding.js";

interface ObraRow {
  id: number;
  titulo: string;
  categoria_obra: "Fotografia" | "Pintura" | "Escultura";
  estado: string;
  es_seriada: number;
  ubicacion_fisica_actual: string | null;
  miniatura_path: string | null;
  imagen_alta_resolucion_path: string | null;
  tags: string | null;
  artista_id: number;
  nombre_completo: string;
}

interface ObraExtRow {
  subtipo_fotografia?: string;
  fecha_captura?: string | null;
  fecha_edicion?: string | null;
  software_edicion?: string | null;
  subtipo_pintura?: string;
  tecnica?: string | null;
  dimensiones?: string | null;
  peso?: string | null;
  fecha_creacion?: string | null;
}

interface EjemplarRow {
  id: number;
  tipo: string;
  numero: string;
  estado: string;
  venta_id: number | null;
  fecha_impresion: string | null;
  tipo_impresion: string | null;
  soporte_impresion: string | null;
  taller_impresion: string | null;
  ubicacion_actual: string | null;
  dimensiones: string | null;
  tipo_enmarcado: string | null;
  tamano_final_enmarcado: string | null;
  notas: string | null;
}

interface VentaRow {
  id: number;
  tipo: TipoVenta;
  cliente_id: number | null;
  comprador_nombre: string;
  comprador_email: string | null;
  comprador_telefono: string | null;
  fecha_venta: string;
  lugar_venta: string | null;
  valor_venta: number;
  moneda: Moneda;
  aplica_comision: number;
  porcentaje_comision: number | null;
  monto_comision: number | null;
  numero_certificado: number | null;
}

function toVentaExistente(v: VentaRow): VentaExistente {
  return {
    id: v.id,
    tipo: v.tipo,
    clienteId: v.cliente_id,
    compradorNombre: v.comprador_nombre,
    compradorEmail: v.comprador_email,
    compradorTelefono: v.comprador_telefono,
    fechaVenta: v.fecha_venta,
    lugarVenta: v.lugar_venta,
    valorVenta: v.valor_venta,
    moneda: v.moneda,
    aplicaComision: Number(v.aplica_comision) === 1,
    porcentajeComision: v.porcentaje_comision,
    montoComision: v.monto_comision,
    numeroCertificado: v.numero_certificado,
  };
}

function buildObraDescripcionLineas(
  obra: ObraRow,
  ext: ObraExtRow | null,
  esRegistroPersonal: boolean,
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string,
): string[] {
  const lineas: string[] = [];
  lineas.push(t("obraDetail.artista", { nombre: obra.nombre_completo }));
  lineas.push(t("obraDetail.categoria", { categoria: t(`categoria.${obra.categoria_obra}` as TranslationKey) }));
  if (ext?.subtipo_fotografia) {
    lineas.push(
      t("obraDetail.subtipo", {
        subtipo: t(`fields.fotografia.subtipo${ext.subtipo_fotografia}` as TranslationKey),
      }),
    );
  }
  if (ext?.subtipo_pintura) {
    lineas.push(
      t("obraDetail.subtipoNoEditable", {
        subtipo: t(`fields.pintura.subtipo${ext.subtipo_pintura}` as TranslationKey),
      }),
    );
  }
  lineas.push(Number(obra.es_seriada) === 1 ? t("obraDetail.obraSeriada") : t("obraDetail.obraUnica"));
  if (esRegistroPersonal && obra.ubicacion_fisica_actual) {
    lineas.push(`${t("obraDetail.ubicacionArchivoPrefix")} ${obra.ubicacion_fisica_actual}`);
  }
  if (ext?.tecnica) lineas.push(t("obraDetail.tecnica", { valor: ext.tecnica }));
  if (ext?.dimensiones) lineas.push(t("obraDetail.dimensiones", { valor: ext.dimensiones }));
  if (ext?.peso) lineas.push(t("obraDetail.peso", { valor: ext.peso }));
  if (ext?.fecha_captura) {
    lineas.push(`${t("fields.fotografia.fechaCaptura")}: ${formatFechaDDMMYYYY(ext.fecha_captura)}`);
  }
  if (ext?.fecha_edicion) {
    lineas.push(`${t("fields.fotografia.fechaEdicion")}: ${formatFechaDDMMYYYY(ext.fecha_edicion)}`);
  }
  if (esRegistroPersonal && ext?.software_edicion) {
    lineas.push(`${t("fields.fotografia.softwareEdicion")}: ${ext.software_edicion}`);
  }
  if (ext?.fecha_creacion) {
    lineas.push(`${t("field.fechaCreacion")}: ${formatFechaDDMMYYYY(ext.fecha_creacion)}`);
  }
  const tags = parseTags(obra.tags);
  if (tags.length > 0) lineas.push(`${t("obraForm.etiquetasLabel")}: ${tags.join(", ")}`);
  return lineas;
}

export function ObraDetail({ obraId, onBack }: { obraId: number; onBack: () => void }) {
  const { context } = useWorkspace();
  const { t } = useLanguage();
  const esRegistroPersonal = context?.workspace === "personal";

  const [obra, setObra] = useState<ObraRow | null>(null);
  const [ext, setExt] = useState<ObraExtRow | null>(null);
  const [ejemplares, setEjemplares] = useState<EjemplarRow[]>([]);
  const [ventas, setVentas] = useState<Record<number, VentaRow>>({});
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEscapeToDismiss(error, setError);
  const [editingEjemplarId, setEditingEjemplarId] = useState<number | null>(null);
  const [editingObra, setEditingObra] = useState(false);
  const [ventaTarget, setVentaTarget] = useState<{ ejemplarId: number; existingVenta?: VentaExistente } | null>(null);
  const [fullImageUrl, setFullImageUrl] = useState<string | null>(null);
  const [loadingFullImage, setLoadingFullImage] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [anulandoVenta, setAnulandoVenta] = useState(false);
  const [generandoFichaPdf, setGenerandoFichaPdf] = useState(false);
  const [fichaPdfMensaje, setFichaPdfMensaje] = useState<string | null>(null);
  useEscapeToDismiss(fichaPdfMensaje, setFichaPdfMensaje);
  const [fichaPdfSeleccionAbierta, setFichaPdfSeleccionAbierta] = useState(false);
  const [fichaPdfIncluirTodas, setFichaPdfIncluirTodas] = useState(true);
  const [fichaPdfSeleccionadas, setFichaPdfSeleccionadas] = useState<Set<number>>(new Set());
  const [generandoPresupuestoId, setGenerandoPresupuestoId] = useState<number | null>(null);
  const [presupuestoMensaje, setPresupuestoMensaje] = useState<string | null>(null);
  useEscapeToDismiss(presupuestoMensaje, setPresupuestoMensaje);
  const objectUrlRef = useRef<string | null>(null);
  const fullImageUrlRef = useRef<string | null>(null);

  async function reload() {
    if (!context) return;
    setLoading(true);
    setError(null);
    setEjemplares([]);
    setExt(null);
    try {
      const obraRows = await context.db.query<ObraRow>(
        `SELECT obra.id, obra.titulo, obra.categoria_obra, obra.estado, obra.es_seriada,
                obra.ubicacion_fisica_actual, obra.miniatura_path, obra.imagen_alta_resolucion_path, obra.tags,
                obra.artista_id, artista.nombre_completo
         FROM obra JOIN artista ON artista.id = obra.artista_id
         WHERE obra.id = ?`,
        [obraId],
      );
      const obraRow = obraRows[0] ?? null;
      setObra(obraRow);

      if (obraRow?.miniatura_path) {
        try {
          const bytes = await context.fs.readFile(obraRow.miniatura_path);
          if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
          const url = bytesToObjectUrl(bytes);
          objectUrlRef.current = url;
          setThumbnailUrl(url);
        } catch {
          setThumbnailUrl(null);
        }
      } else {
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
        setThumbnailUrl(null);
      }

      if (obraRow) {
        if (obraRow.categoria_obra === "Fotografia") {
          const rows = await context.db.query<ObraExtRow>(
            `SELECT subtipo_fotografia, fecha_captura, fecha_edicion, software_edicion, dimensiones, tecnica FROM obra_fotografia WHERE obra_id = ?`,
            [obraId],
          );
          setExt(rows[0] ?? null);
        } else if (obraRow.categoria_obra === "Pintura") {
          const rows = await context.db.query<ObraExtRow>(
            `SELECT subtipo_pintura, tecnica, dimensiones, peso, fecha_creacion FROM obra_pintura WHERE obra_id = ?`,
            [obraId],
          );
          setExt(rows[0] ?? null);
        } else {
          const rows = await context.db.query<ObraExtRow>(
            `SELECT tecnica, dimensiones, peso, fecha_creacion FROM obra_escultura WHERE obra_id = ?`,
            [obraId],
          );
          setExt(rows[0] ?? null);
        }
      }

      if (obraRow) {
        const ejemplarRows = await context.db.query<EjemplarRow>(
          `SELECT id, tipo, numero, estado, venta_id, fecha_impresion, tipo_impresion, soporte_impresion, taller_impresion, ubicacion_actual, dimensiones, tipo_enmarcado, tamano_final_enmarcado, notas
           FROM ejemplar WHERE obra_id = ? ORDER BY tipo, indice`,
          [obraId],
        );
        setEjemplares(ejemplarRows);
      }

      const ventaRows = await context.db.query<VentaRow>(
        `SELECT id, tipo, cliente_id, comprador_nombre, comprador_email, comprador_telefono, fecha_venta, lugar_venta, valor_venta, moneda, aplica_comision, porcentaje_comision, monto_comision, numero_certificado
         FROM venta WHERE obra_id = ?`,
        [obraId],
      );
      setVentas(Object.fromEntries(ventaRows.map((v) => [v.id, v])));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setEditingObra(false);
    setEditingEjemplarId(null);
    setVentaTarget(null);
    setFullImageUrl(null);
    reload();
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      if (fullImageUrlRef.current) URL.revokeObjectURL(fullImageUrlRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context, obraId]);

  async function handleShowFullImage() {
    if (!context || !obra) return;
    const path = obra.imagen_alta_resolucion_path || obra.miniatura_path;
    if (!path) return;
    setLoadingFullImage(true);
    try {
      const bytes = await context.fs.readFile(path);
      if (fullImageUrlRef.current) URL.revokeObjectURL(fullImageUrlRef.current);
      const url = bytesToObjectUrl(bytes);
      fullImageUrlRef.current = url;
      setFullImageUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingFullImage(false);
    }
  }

  async function handleAbrirUbicacion(path: string) {
    if (!isTauri()) return;
    try {
      const { revealItemInDir } = await import("@tauri-apps/plugin-opener");
      await revealItemInDir(path);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  function handleGenerarFichaPdfClick() {
    if (!obra) return;
    if (Number(obra.es_seriada) === 1 && ejemplares.length > 0) {
      setFichaPdfIncluirTodas(true);
      setFichaPdfSeleccionadas(new Set());
      setFichaPdfSeleccionAbierta(true);
    } else {
      handleGenerarFichaPdf(ejemplares);
    }
  }

  async function handleConfirmarFichaPdf() {
    const incluidos = fichaPdfIncluirTodas ? ejemplares : ejemplares.filter((ej) => fichaPdfSeleccionadas.has(ej.id));
    setFichaPdfSeleccionAbierta(false);
    await handleGenerarFichaPdf(incluidos);
  }

  async function handleGenerarFichaPdf(ejemplaresIncluidos: EjemplarRow[]) {
    if (!obra || !context) return;
    setGenerandoFichaPdf(true);
    setError(null);
    setFichaPdfMensaje(null);
    try {
      // jsPDF/autotable son pesados: se cargan recien al generar el PDF, no
      // en el bundle principal de la app (mismo criterio que VentasReport).
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const marginLeft = 14;
      const startY = await drawPdfHeader(doc, obra.titulo, { marginLeft });
      const imageBoxSize = 70;
      let textX = marginLeft;
      let imageBottom = startY;

      const imagenPath = obra.imagen_alta_resolucion_path || obra.miniatura_path;
      if (imagenPath) {
        try {
          const imgBytes = await context.fs.readFile(imagenPath);
          const formato = detectImageFormat(imgBytes);
          if (formato) {
            const blob = new Blob([imgBytes as BlobPart]);
            const bitmap = await createImageBitmap(blob);
            let displayW = imageBoxSize;
            let displayH = imageBoxSize / (bitmap.width / bitmap.height);
            if (displayH > imageBoxSize) {
              displayH = imageBoxSize;
              displayW = imageBoxSize * (bitmap.width / bitmap.height);
            }
            bitmap.close();
            doc.addImage(imgBytes, formato, marginLeft, startY, displayW, displayH);
            imageBottom = startY + displayH;
            // La columna de texto arranca despues del recuadro maximo de la
            // imagen (no del ancho real, que varia con el aspect ratio), asi
            // el texto siempre alinea igual sin importar la proporcion de la foto.
            textX = marginLeft + imageBoxSize + 8;
          }
        } catch {
          // Si falta el archivo o no se puede leer, la ficha se genera sin imagen.
        }
      }

      const pageWidth = doc.internal.pageSize.getWidth();
      const textWidth = pageWidth - textX - marginLeft;

      const lineas = buildObraDescripcionLineas(obra, ext, esRegistroPersonal, t);

      let textY = startY;
      for (const linea of lineas) {
        textY = writeWrappedText(doc, linea, textX, textY, textWidth, { lineHeight: 6 });
      }

      const tableStartY = Math.max(imageBottom, textY) + 8;

      autoTable(doc, {
        startY: tableStartY,
        styles: { font: "Inter" },
        headStyles: { fontStyle: "normal" },
        head: [
          [
            t("ventasReport.colSerie"),
            t("obraDetail.estadoLabel"),
            t("obraDetail.fechaImpresion"),
            t("obraDetail.soporteImpresion"),
            t("obraDetail.tamanoEjemplarLabel"),
            t("obraDetail.ventaReserva"),
          ],
        ],
        body: ejemplaresIncluidos.map((ej) => {
          const venta = ej.venta_id ? ventas[ej.venta_id] : undefined;
          const ventaTexto = venta
            ? `${t(
                venta.tipo === "venta" ? "common.vendida" : venta.tipo === "donacion" ? "common.donada" : "common.reservada",
              )} — ${venta.comprador_nombre} (${formatFechaDDMMYYYY(venta.fecha_venta)})`
            : "—";
          return [
            ej.numero,
            t(`estado.${ej.estado}` as TranslationKey),
            ej.fecha_impresion ? formatFechaDDMMYYYY(ej.fecha_impresion) : "—",
            ej.soporte_impresion ?? "—",
            ej.dimensiones ?? "—",
            ventaTexto,
          ];
        }),
      });

      const bytes = new Uint8Array(doc.output("arraybuffer"));
      const nombreArchivo = `ficha_${obra.titulo.replace(/[^a-zA-Z0-9]+/g, "_")}.pdf`;
      const guardado = await savePdfWithDialog(bytes, nombreArchivo);
      if (guardado) setFichaPdfMensaje(t("obraDetail.fichaPdfGenerada"));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerandoFichaPdf(false);
    }
  }

  // Documento distinto de la ficha: la ficha describe toda la obra con todas
  // sus series; el presupuesto es para ofrecer/cotizar una unica serie
  // puntual, asi que lleva los datos de la obra mas solo esa serie.
  async function handleGenerarPresupuesto(ejemplar: EjemplarRow) {
    if (!obra || !context) return;
    setGenerandoPresupuestoId(ejemplar.id);
    setError(null);
    setPresupuestoMensaje(null);
    try {
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const marginLeft = 14;
      const startY = await drawPdfHeader(doc, t("obraDetail.presupuestoTitulo", { titulo: obra.titulo }), {
        marginLeft,
      });
      const imageBoxSize = 70;
      let textX = marginLeft;
      let imageBottom = startY;

      const imagenPath = obra.imagen_alta_resolucion_path || obra.miniatura_path;
      if (imagenPath) {
        try {
          const imgBytes = await context.fs.readFile(imagenPath);
          const formato = detectImageFormat(imgBytes);
          if (formato) {
            const blob = new Blob([imgBytes as BlobPart]);
            const bitmap = await createImageBitmap(blob);
            let displayW = imageBoxSize;
            let displayH = imageBoxSize / (bitmap.width / bitmap.height);
            if (displayH > imageBoxSize) {
              displayH = imageBoxSize;
              displayW = imageBoxSize * (bitmap.width / bitmap.height);
            }
            bitmap.close();
            doc.addImage(imgBytes, formato, marginLeft, startY, displayW, displayH);
            imageBottom = startY + displayH;
            textX = marginLeft + imageBoxSize + 8;
          }
        } catch {
          // Si falta el archivo o no se puede leer, el presupuesto se genera sin imagen.
        }
      }

      const pageWidth = doc.internal.pageSize.getWidth();
      const textWidth = pageWidth - textX - marginLeft;

      const lineas = buildObraDescripcionLineas(obra, ext, esRegistroPersonal, t);

      let textY = startY;
      for (const linea of lineas) {
        textY = writeWrappedText(doc, linea, textX, textY, textWidth, { lineHeight: 6 });
      }

      const serieLineas: string[] = [];
      serieLineas.push(`${t("ventasReport.colSerie")}: ${ejemplar.numero}`);
      serieLineas.push(`${t("obraDetail.estadoLabel")}: ${t(`estado.${ejemplar.estado}` as TranslationKey)}`);
      if (ejemplar.fecha_impresion) {
        serieLineas.push(`${t("obraDetail.fechaImpresion")}: ${formatFechaDDMMYYYY(ejemplar.fecha_impresion)}`);
      }
      if (ejemplar.tipo_impresion) serieLineas.push(`${t("obraDetail.tipoImpresionLabel")}: ${ejemplar.tipo_impresion}`);
      if (ejemplar.soporte_impresion) {
        serieLineas.push(`${t("obraDetail.soporteImpresion")}: ${ejemplar.soporte_impresion}`);
      }
      if (ejemplar.taller_impresion) {
        serieLineas.push(`${t("obraDetail.tallerImpresionLabel")}: ${ejemplar.taller_impresion}`);
      }
      if (ejemplar.dimensiones) serieLineas.push(`${t("obraDetail.tamanoEjemplarLabel")}: ${ejemplar.dimensiones}`);
      if (ejemplar.tipo_enmarcado) serieLineas.push(`${t("obraDetail.tipoEnmarcadoLabel")}: ${ejemplar.tipo_enmarcado}`);
      if (ejemplar.tamano_final_enmarcado) {
        serieLineas.push(`${t("obraDetail.tamanoFinalEnmarcadoLabel")}: ${ejemplar.tamano_final_enmarcado}`);
      }
      if (ejemplar.notas) serieLineas.push(`${t("obraDetail.notasEjemplarLabel")}: ${ejemplar.notas}`);

      let bottomY = Math.max(imageBottom, textY) + 8;
      doc.setFont("Inter", "medium");
      bottomY = writeWrappedText(doc, t("obraDetail.presupuestoSerieSubtitulo"), marginLeft, bottomY, pageWidth - marginLeft * 2, {
        lineHeight: 6,
      });
      doc.setFont("Inter", "normal");
      bottomY += 2;
      for (const linea of serieLineas) {
        bottomY = writeWrappedText(doc, linea, marginLeft, bottomY, pageWidth - marginLeft * 2, { lineHeight: 6 });
      }

      const bytes = new Uint8Array(doc.output("arraybuffer"));
      const nombreArchivo = `presupuesto_${obra.titulo.replace(/[^a-zA-Z0-9]+/g, "_")}_${ejemplar.numero.replace(/[^a-zA-Z0-9]+/g, "_")}.pdf`;
      const guardado = await savePdfWithDialog(bytes, nombreArchivo);
      if (guardado) setPresupuestoMensaje(t("obraDetail.presupuestoPdfGenerado"));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerandoPresupuestoId(null);
    }
  }

  async function handleSaveEjemplar(
    ejemplarId: number,
    fields: {
      estado: string;
      fechaImpresion: string;
      tipoImpresion: string;
      soporteImpresion: string;
      tallerImpresion: string;
      ubicacionActual: string;
      dimensiones: string;
      tipoEnmarcado: string;
      tamanoFinalEnmarcado: string;
      notas: string;
    },
  ) {
    if (!context) return;
    await context.db.transaction(async (tx) => {
      await tx.execute(
        `UPDATE ejemplar SET estado = ?, fecha_impresion = ?, tipo_impresion = ?, soporte_impresion = ?, taller_impresion = ?, ubicacion_actual = ?, dimensiones = ?, tipo_enmarcado = ?, tamano_final_enmarcado = ?, notas = ? WHERE id = ?`,
        [
          fields.estado,
          fields.fechaImpresion || null,
          fields.tipoImpresion || null,
          fields.soporteImpresion || null,
          fields.tallerImpresion || null,
          fields.ubicacionActual || null,
          fields.dimensiones || null,
          fields.tipoEnmarcado || null,
          fields.tamanoFinalEnmarcado || null,
          fields.notas || null,
          ejemplarId,
        ],
      );
      // Una obra unica es, por dentro, una serie de un solo ejemplar —
      // mantenemos obra.estado reflejando ese unico ejemplar para que el
      // resto de las pantallas (listado, etc.) lo sigan leyendo sin tener
      // que consultar ejemplares para obras unicas.
      if (obra && Number(obra.es_seriada) !== 1) {
        await tx.execute(`UPDATE obra SET estado = ? WHERE id = ?`, [fields.estado, obraId]);
      }
    });
    setEditingEjemplarId(null);
    await reload();
  }

  async function handleSaveObra(fields: {
    titulo: string;
    ubicacion: string;
    tags: string[];
    categoria: CategoriaObra;
    ext: ObraExtRow;
    esSeriada: boolean;
    cantidadTotalEdiciones: number;
    imageFile: File | null;
    removeImage: boolean;
    artistaId: number;
  }) {
    if (!context || !obra) return;
    const eraSeriada = Number(obra.es_seriada) === 1;
    const cambiaSeriada = eraSeriada !== fields.esSeriada;
    const cambiaCategoria = obra.categoria_obra !== fields.categoria;

    if (cambiaSeriada && !puedeDeshacerSerie(ejemplares.map((ej) => ej.estado))) {
      throw new Error(fields.esSeriada ? t("obraDetail.errorObraYaVendida") : t("obraDetail.noSePuedeDeshacerSerie"));
    }

    await context.db.transaction(async (tx) => {
      await tx.execute(
        `UPDATE obra SET titulo = ?, categoria_obra = ?, ubicacion_fisica_actual = ?, tags = ?, es_seriada = ?, artista_id = ? WHERE id = ?`,
        [
          fields.titulo,
          fields.categoria,
          esRegistroPersonal ? fields.ubicacion || null : obra.ubicacion_fisica_actual,
          formatTags(fields.tags) || null,
          fields.esSeriada ? 1 : 0,
          esRegistroPersonal ? obra.artista_id : fields.artistaId,
          obraId,
        ],
      );

      if (cambiaSeriada) {
        await tx.execute(`DELETE FROM ejemplar WHERE obra_id = ?`, [obraId]);
        const nuevosEjemplares = fields.esSeriada
          ? generarEjemplares(fields.cantidadTotalEdiciones)
          : [generarEjemplarUnico()];
        for (const ejemplar of nuevosEjemplares) {
          await tx.execute(
            `INSERT INTO ejemplar (obra_id, tipo, indice, total_ediciones, numero) VALUES (?, ?, ?, ?, ?)`,
            [obraId, ejemplar.tipo, ejemplar.indice, ejemplar.totalEdiciones, ejemplar.numero],
          );
        }
        await tx.execute(`INSERT INTO historial_evento (obra_id, tipo, descripcion) VALUES (?, 'edicion', ?)`, [
          obraId,
          fields.esSeriada
            ? `Obra convertida a seriada (${fields.cantidadTotalEdiciones} ediciones)`
            : "Obra convertida a pieza única",
        ]);
      }

      if (cambiaCategoria) {
        await tx.execute(`DELETE FROM obra_fotografia WHERE obra_id = ?`, [obraId]);
        await tx.execute(`DELETE FROM obra_pintura WHERE obra_id = ?`, [obraId]);
        await tx.execute(`DELETE FROM obra_escultura WHERE obra_id = ?`, [obraId]);
      }

      if (fields.categoria === "Fotografia") {
        const upsert = cambiaCategoria
          ? `INSERT INTO obra_fotografia (obra_id, subtipo_fotografia, fecha_captura, anio_toma, fecha_edicion, software_edicion, dimensiones, tecnica) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          : `UPDATE obra_fotografia SET subtipo_fotografia = ?, fecha_captura = ?, anio_toma = ?, fecha_edicion = ?, software_edicion = ?, dimensiones = ?, tecnica = ? WHERE obra_id = ?`;
        const softwareEdicion = esRegistroPersonal ? fields.ext.software_edicion || null : null;
        const anioToma = derivarAnioDesdeFecha(fields.ext.fecha_captura);
        const params = cambiaCategoria
          ? [
              obraId,
              fields.ext.subtipo_fotografia,
              fields.ext.fecha_captura || null,
              anioToma,
              fields.ext.fecha_edicion || null,
              softwareEdicion,
              fields.ext.dimensiones || null,
              fields.ext.tecnica || null,
            ]
          : [
              fields.ext.subtipo_fotografia,
              fields.ext.fecha_captura || null,
              anioToma,
              fields.ext.fecha_edicion || null,
              softwareEdicion,
              fields.ext.dimensiones || null,
              fields.ext.tecnica || null,
              obraId,
            ];
        await tx.execute(upsert, params);
      } else if (fields.categoria === "Pintura") {
        const upsert = cambiaCategoria
          ? `INSERT INTO obra_pintura (obra_id, subtipo_pintura, tecnica, dimensiones, peso, fecha_creacion) VALUES (?, ?, ?, ?, ?, ?)`
          : `UPDATE obra_pintura SET subtipo_pintura = ?, tecnica = ?, dimensiones = ?, peso = ?, fecha_creacion = ? WHERE obra_id = ?`;
        const params = cambiaCategoria
          ? [
              obraId,
              fields.ext.subtipo_pintura,
              fields.ext.tecnica || null,
              fields.ext.dimensiones || null,
              fields.ext.peso || null,
              fields.ext.fecha_creacion || null,
            ]
          : [
              fields.ext.subtipo_pintura,
              fields.ext.tecnica || null,
              fields.ext.dimensiones || null,
              fields.ext.peso || null,
              fields.ext.fecha_creacion || null,
              obraId,
            ];
        await tx.execute(upsert, params);
      } else {
        const upsert = cambiaCategoria
          ? `INSERT INTO obra_escultura (obra_id, tecnica, dimensiones, peso, fecha_creacion) VALUES (?, ?, ?, ?, ?)`
          : `UPDATE obra_escultura SET tecnica = ?, dimensiones = ?, peso = ?, fecha_creacion = ? WHERE obra_id = ?`;
        const params = cambiaCategoria
          ? [obraId, fields.ext.tecnica || null, fields.ext.dimensiones || null, fields.ext.peso || null, fields.ext.fecha_creacion || null]
          : [fields.ext.tecnica || null, fields.ext.dimensiones || null, fields.ext.peso || null, fields.ext.fecha_creacion || null, obraId];
        await tx.execute(upsert, params);
      }

      if (fields.removeImage) {
        if (obra.imagen_alta_resolucion_path) {
          await context.fs.remove(obra.imagen_alta_resolucion_path).catch(() => {});
        }
        if (obra.miniatura_path) {
          await context.fs.remove(obra.miniatura_path).catch(() => {});
        }
        await tx.execute(`UPDATE obra SET imagen_alta_resolucion_path = NULL, miniatura_path = NULL WHERE id = ?`, [
          obraId,
        ]);
      } else if (fields.imageFile) {
        const fileExt = fields.imageFile.name.split(".").pop() || "jpg";
        const bytes = new Uint8Array(await fields.imageFile.arrayBuffer());
        const originalPath = obraOriginalPath(obraId, fileExt);
        const miniaturaPath = obraMiniaturaPath(obraId);

        await context.fs.writeFile(originalPath, bytes);
        await context.fs.writeFile(miniaturaPath, bytes);

        await tx.execute(`UPDATE obra SET imagen_alta_resolucion_path = ?, miniatura_path = ? WHERE id = ?`, [
          originalPath,
          miniaturaPath,
          obraId,
        ]);
      }

      await tx.execute(`INSERT INTO historial_evento (obra_id, tipo, descripcion) VALUES (?, 'edicion', 'Obra editada')`, [
        obraId,
      ]);
    });
    setEditingObra(false);
    await reload();
  }

  async function handleDeleteObra() {
    if (!context || !obra) return;
    setDeleting(true);
    setError(null);
    try {
      const ventaCount = await context.db.query<{ n: number }>(
        "SELECT COUNT(*) as n FROM venta WHERE obra_id = ?",
        [obraId],
      );
      if (ventaCount[0].n > 0) {
        throw new Error(t("obraDetail.errorTieneVentas"));
      }

      await context.db.execute("DELETE FROM obra WHERE id = ?", [obraId]);

      if (obra.imagen_alta_resolucion_path) {
        await context.fs.remove(obra.imagen_alta_resolucion_path).catch(() => {});
      }
      if (obra.miniatura_path) {
        await context.fs.remove(obra.miniatura_path).catch(() => {});
      }

      onBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setConfirmingDelete(false);
    } finally {
      setDeleting(false);
    }
  }

  async function handleAnularVenta(venta: VentaRow, ejemplarId: number | null, nuevoEstado: string) {
    if (!context) return;
    setAnulandoVenta(true);
    setError(null);
    try {
      await context.db.transaction(async (tx) => {
        if (ejemplarId) {
          await tx.execute("UPDATE ejemplar SET estado = ?, venta_id = NULL WHERE id = ?", [
            nuevoEstado,
            ejemplarId,
          ]);
          if (Number(obra?.es_seriada) !== 1) {
            await tx.execute("UPDATE obra SET estado = ? WHERE id = ?", [nuevoEstado, obraId]);
          }
        } else {
          await tx.execute("UPDATE obra SET estado = ? WHERE id = ?", [nuevoEstado, obraId]);
        }
        await tx.execute("DELETE FROM venta WHERE id = ?", [venta.id]);
        await tx.execute("INSERT INTO historial_evento (obra_id, tipo, descripcion) VALUES (?, 'cambio_estado', ?)", [
          obraId,
          `${venta.tipo === "venta" ? "Venta" : venta.tipo === "donacion" ? "Donación" : "Reserva"} anulada (comprador: ${venta.comprador_nombre})`,
        ]);
      });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setAnulandoVenta(false);
    }
  }

  if (!context) return null;

  return (
    <div className="obra-detail">
      <div className="obras-list-header">
        <h1>{obra?.titulo ?? t("obraDetail.fallbackTitulo")}</h1>
        <button type="button" onClick={onBack}>
          {t("obraDetail.volverAObras")}
        </button>
      </div>

      {loading && <p>{t("common.loading")}</p>}
      {error && (
        <p className="error" role="alert">
          ⚠️ {error}
        </p>
      )}

      {obra && !editingObra && (
        <div className="obra-detail-header">
          {thumbnailUrl && (
            <button type="button" className="obra-detail-thumbnail-button" onClick={handleShowFullImage} disabled={loadingFullImage}>
              <img src={thumbnailUrl} alt={obra.titulo} className="obra-detail-thumbnail" />
            </button>
          )}
          <div>
            <p>{t("obraDetail.artista", { nombre: obra.nombre_completo })}</p>
            <p>{t("obraDetail.categoria", { categoria: t(`categoria.${obra.categoria_obra}` as TranslationKey) })}</p>
            {ext?.subtipo_fotografia && (
              <p>
                {t("obraDetail.subtipo", {
                  subtipo: t(`fields.fotografia.subtipo${ext.subtipo_fotografia}` as TranslationKey),
                })}
              </p>
            )}
            {ext?.subtipo_pintura && (
              <p>
                {t("obraDetail.subtipoNoEditable", {
                  subtipo: t(`fields.pintura.subtipo${ext.subtipo_pintura}` as TranslationKey),
                })}
              </p>
            )}
            <p>{Number(obra.es_seriada) === 1 ? t("obraDetail.obraSeriada") : t("obraDetail.obraUnica")}</p>
            {esRegistroPersonal && (
              <p>
                {t("obraDetail.ubicacionArchivoPrefix")}{" "}
                {obra.ubicacion_fisica_actual ? (
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => handleAbrirUbicacion(obra.ubicacion_fisica_actual!)}
                  >
                    {obra.ubicacion_fisica_actual}
                  </button>
                ) : (
                  "—"
                )}
              </p>
            )}
            {ext?.tecnica && <p>{t("obraDetail.tecnica", { valor: ext.tecnica })}</p>}
            {ext?.dimensiones && <p>{t("obraDetail.dimensiones", { valor: ext.dimensiones })}</p>}
            {ext?.peso && <p>{t("obraDetail.peso", { valor: ext.peso })}</p>}
            <div className="obra-form-saved-actions">
              <button type="button" onClick={() => setEditingObra(true)}>
                {t("obraDetail.editarObra")}
              </button>
              <button type="button" onClick={handleGenerarFichaPdfClick} disabled={generandoFichaPdf}>
                {generandoFichaPdf ? t("common.saving") : t("obraDetail.generarFichaPdf")}
              </button>
              <button type="button" onClick={() => setConfirmingDelete(true)}>
                {t("obraDetail.eliminarObra")}
              </button>
            </div>
            {fichaPdfMensaje && (
              <p className="success" role="status">
                ✅ {fichaPdfMensaje}
              </p>
            )}
            {confirmingDelete && (
              <div className="confirm-box">
                <p>{t("obraDetail.confirmarEliminarObra")}</p>
                <div className="obra-form-saved-actions">
                  <button type="button" onClick={handleDeleteObra} disabled={deleting}>
                    {deleting ? t("common.deleting") : t("common.siEliminar")}
                  </button>
                  <button type="button" onClick={() => setConfirmingDelete(false)} disabled={deleting}>
                    {t("common.cancel")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {obra && editingObra && (
        <ObraEditForm
          obra={obra}
          ext={ext}
          ejemplares={ejemplares}
          esRegistroPersonal={esRegistroPersonal}
          thumbnailUrl={thumbnailUrl}
          loadingFullImage={loadingFullImage}
          onShowFullImage={handleShowFullImage}
          onSave={handleSaveObra}
          onCancel={() => setEditingObra(false)}
        />
      )}

      {obra && (
        <div className="ejemplares-list">
          <h2>{t("obraDetail.ejemplares")}</h2>
          {ejemplares.map((ej) => (
            <EjemplarRowView
              key={ej.id}
              ejemplar={ej}
              categoria={obra.categoria_obra}
              esFotografiaDigital={obra.categoria_obra === "Fotografia" && ext?.subtipo_fotografia === "Digital"}
              venta={ej.venta_id ? ventas[ej.venta_id] : undefined}
              editing={editingEjemplarId === ej.id}
              onEdit={() => setEditingEjemplarId(ej.id)}
              onCancelEdit={() => setEditingEjemplarId(null)}
              onSave={(fields) => handleSaveEjemplar(ej.id, fields)}
              onVender={() => setVentaTarget({ ejemplarId: ej.id })}
              onEditarVenta={(venta) => setVentaTarget({ ejemplarId: ej.id, existingVenta: toVentaExistente(venta) })}
              onAnularVenta={(venta, nuevoEstado) => handleAnularVenta(venta, ej.id, nuevoEstado)}
              anulando={anulandoVenta}
              onGenerarPresupuesto={() => handleGenerarPresupuesto(ej)}
              generandoPresupuesto={generandoPresupuestoId === ej.id}
            />
          ))}
          {presupuestoMensaje && (
            <p className="success" role="status">
              ✅ {presupuestoMensaje}
            </p>
          )}
        </div>
      )}

      {fichaPdfSeleccionAbierta && (
        <Modal onClose={() => setFichaPdfSeleccionAbierta(false)}>
          <h2>{t("obraDetail.fichaPdfSeleccionTitulo")}</h2>
          <label className="ficha-pdf-alcance-opcion">
            <input
              type="radio"
              name="fichaPdfAlcance"
              checked={fichaPdfIncluirTodas}
              onChange={() => setFichaPdfIncluirTodas(true)}
            />
            {t("obraDetail.fichaPdfTodasLasSeries")}
          </label>
          <label className="ficha-pdf-alcance-opcion">
            <input
              type="radio"
              name="fichaPdfAlcance"
              checked={!fichaPdfIncluirTodas}
              onChange={() => setFichaPdfIncluirTodas(false)}
            />
            {t("obraDetail.fichaPdfSeriesEspecificas")}
          </label>
          {!fichaPdfIncluirTodas && (
            <div className="ficha-pdf-series-checklist">
              {ejemplares.map((ej) => (
                <label key={ej.id} className="ficha-pdf-serie-opcion">
                  <input
                    type="checkbox"
                    checked={fichaPdfSeleccionadas.has(ej.id)}
                    onChange={(e) => {
                      setFichaPdfSeleccionadas((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(ej.id);
                        else next.delete(ej.id);
                        return next;
                      });
                    }}
                  />
                  {ej.numero}
                </label>
              ))}
            </div>
          )}
          <div className="obra-form-saved-actions">
            <button
              type="button"
              onClick={handleConfirmarFichaPdf}
              disabled={generandoFichaPdf || (!fichaPdfIncluirTodas && fichaPdfSeleccionadas.size === 0)}
            >
              {generandoFichaPdf ? t("common.saving") : t("obraDetail.generarFichaPdf")}
            </button>
            <button
              type="button"
              onClick={() => setFichaPdfSeleccionAbierta(false)}
              disabled={generandoFichaPdf}
            >
              {t("common.cancel")}
            </button>
          </div>
        </Modal>
      )}

      {ventaTarget && (
        <Modal onClose={() => setVentaTarget(null)}>
          <VentaForm
            obraId={obraId}
            ejemplarId={ventaTarget.ejemplarId}
            esSeriada={Number(obra?.es_seriada) === 1}
            existingVenta={ventaTarget.existingVenta}
            onDone={async () => {
              setVentaTarget(null);
              await reload();
            }}
            onCancel={() => setVentaTarget(null)}
          />
        </Modal>
      )}

      {fullImageUrl && (
        <Modal onClose={() => setFullImageUrl(null)} wide className="modal-content-image">
          <img src={fullImageUrl} alt={obra?.titulo} className="obra-full-image" />
        </Modal>
      )}
    </div>
  );
}

function ObraEditForm({
  obra,
  ext,
  ejemplares,
  esRegistroPersonal,
  thumbnailUrl,
  loadingFullImage,
  onShowFullImage,
  onSave,
  onCancel,
}: {
  obra: ObraRow;
  ext: ObraExtRow | null;
  ejemplares: EjemplarRow[];
  esRegistroPersonal: boolean;
  thumbnailUrl: string | null;
  loadingFullImage: boolean;
  onShowFullImage: () => void;
  onSave: (fields: {
    titulo: string;
    ubicacion: string;
    tags: string[];
    categoria: CategoriaObra;
    ext: ObraExtRow;
    esSeriada: boolean;
    cantidadTotalEdiciones: number;
    imageFile: File | null;
    removeImage: boolean;
    artistaId: number;
  }) => Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useLanguage();
  const [titulo, setTitulo] = useState(obra.titulo);
  const [artistaId, setArtistaId] = useState<number | null>(obra.artista_id);
  const tituloInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const imagePreviewUrlRef = useRef<string | null>(null);
  const [removerImagen, setRemoverImagen] = useState(false);
  const [ubicacion, setUbicacion] = useState(obra.ubicacion_fisica_actual ?? "");
  const [tags, setTags] = useState<string[]>(parseTags(obra.tags));
  const [categoriaObra, setCategoriaObra] = useState<CategoriaObra>(obra.categoria_obra);
  const [subtipoFotografia, setSubtipoFotografia] = useState(ext?.subtipo_fotografia ?? "Digital");
  const [subtipoPintura, setSubtipoPintura] = useState<SubtipoPintura>(
    (ext?.subtipo_pintura as SubtipoPintura) ?? "Original",
  );
  const [fechaCaptura, setFechaCaptura] = useState(ext?.fecha_captura ?? todayISO());
  const [fechaEdicion, setFechaEdicion] = useState(ext?.fecha_edicion ?? todayISO());
  const [softwareEdicion, setSoftwareEdicion] = useState(ext?.software_edicion ?? "");
  const [tecnica, setTecnica] = useState(ext?.tecnica ?? "");
  const [dimensiones, setDimensiones] = useState(ext?.dimensiones ?? "");
  const [peso, setPeso] = useState(ext?.peso ?? "");
  const [fechaCreacion, setFechaCreacion] = useState(ext?.fecha_creacion ?? todayISO());
  const eraSeriada = Number(obra.es_seriada) === 1;
  const [esSeriada, setEsSeriada] = useState(eraSeriada);
  const [cantidadTotalEdiciones, setCantidadTotalEdiciones] = useState("1");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEscapeToDismiss(error, setError);

  const permiteCambiarSeriada = categoriaObra !== "Pintura";
  const puedeDesconvertir = puedeDeshacerSerie(ejemplares.map((ej) => ej.estado));
  const esSeriadaCalculada = categoriaObra === "Pintura" ? derivarEsSeriadaPintura(subtipoPintura) : esSeriada;

  useEffect(() => {
    return () => {
      if (imagePreviewUrlRef.current) URL.revokeObjectURL(imagePreviewUrlRef.current);
    };
  }, []);

  // Foco inicial en Titulo para que el usuario vea de entrada donde esta
  // parado (el cursor titilando), igual que en el alta de una obra nueva.
  useEffect(() => {
    tituloInputRef.current?.focus();
  }, []);

  function handleImageChange(file: File | null) {
    setImageFile(file);
    setRemoverImagen(false);
    if (imagePreviewUrlRef.current) URL.revokeObjectURL(imagePreviewUrlRef.current);
    if (file) {
      const url = URL.createObjectURL(file);
      imagePreviewUrlRef.current = url;
      setImagePreviewUrl(url);
    } else {
      imagePreviewUrlRef.current = null;
      setImagePreviewUrl(null);
    }
  }

  function handleQuitarImagen() {
    if (imageFile) {
      handleImageChange(null);
    } else {
      setRemoverImagen(true);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      await onSave({
        titulo,
        ubicacion,
        tags,
        categoria: categoriaObra,
        esSeriada: esSeriadaCalculada,
        cantidadTotalEdiciones: Math.max(1, parseInt(cantidadTotalEdiciones, 10) || 1),
        ext: {
          subtipo_fotografia: subtipoFotografia,
          fecha_captura: fechaCaptura,
          fecha_edicion: fechaEdicion,
          software_edicion: softwareEdicion,
          subtipo_pintura: subtipoPintura,
          tecnica,
          dimensiones,
          peso,
          fecha_creacion: fechaCreacion,
        },
        imageFile,
        removeImage: removerImagen,
        artistaId: artistaId ?? obra.artista_id,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="obra-form" onKeyDown={focusNextOnEnter}>
      <label>
        {t("obraForm.tituloLabel")}
        <input ref={tituloInputRef} type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
      </label>

      <label>
        {t("obraForm.imagenLabel")}
        {imagePreviewUrl ? (
          <img src={imagePreviewUrl} alt="" className="obra-edit-imagen-actual" />
        ) : (
          !removerImagen &&
          thumbnailUrl && (
            <button
              type="button"
              className="obra-detail-thumbnail-button"
              onClick={onShowFullImage}
              disabled={loadingFullImage}
            >
              <img src={thumbnailUrl} alt={obra.titulo} className="obra-edit-imagen-actual" />
            </button>
          )
        )}
        {removerImagen && <p className="field-note">{t("obraDetail.imagenSeEliminara")}</p>}
        <div className="image-file-field-row">
          <ImageFileField value={imageFile} onChange={handleImageChange} />
          {(imageFile || thumbnailUrl) &&
            (!removerImagen ? (
              <button type="button" onClick={handleQuitarImagen}>
                {t("obraDetail.quitarImagen")}
              </button>
            ) : (
              <button type="button" onClick={() => setRemoverImagen(false)}>
                {t("obraDetail.deshacerQuitarImagen")}
              </button>
            ))}
        </div>
      </label>

      {!esRegistroPersonal && (
        <label>
          {t("obraForm.artistaLabel")}
          <ArtistaSelector value={artistaId} onChange={setArtistaId} />
        </label>
      )}

      <label>
        {t("obraForm.categoriaLabel")}
        <select value={categoriaObra} onChange={(e) => setCategoriaObra(e.target.value as CategoriaObra)}>
          <option value="Fotografia">{t("fields.fotografia.legend")}</option>
          <option value="Pintura">{t("fields.pintura.legend")}</option>
          <option value="Escultura">{t("fields.escultura.legend")}</option>
        </select>
      </label>

      {categoriaObra === "Fotografia" && (
        <>
          <label>
            {t("field.subtipo")}
            <select value={subtipoFotografia} onChange={(e) => setSubtipoFotografia(e.target.value)}>
              <option value="Analogica">{t("fields.fotografia.subtipoAnalogica")}</option>
              <option value="Digital">{t("fields.fotografia.subtipoDigital")}</option>
              <option value="Sintografia">{t("fields.fotografia.subtipoSintografia")}</option>
            </select>
          </label>
          <label>
            {t("fields.fotografia.fechaCaptura")}
            <input type="date" value={fechaCaptura ?? ""} onChange={(e) => setFechaCaptura(e.target.value)} />
          </label>
          <label>
            {t("fields.fotografia.fechaEdicion")}
            <input type="date" value={fechaEdicion ?? ""} onChange={(e) => setFechaEdicion(e.target.value)} />
          </label>
          <label>
            {t("fields.fotografia.dimensiones")}
            <input type="text" value={dimensiones ?? ""} onChange={(e) => setDimensiones(e.target.value)} />
          </label>
          <label>
            {t("field.tecnica")} <HelpIcon fieldKey="tecnica_fotografia" />
            <input type="text" value={tecnica ?? ""} onChange={(e) => setTecnica(e.target.value)} />
          </label>
          {esRegistroPersonal && (
            <label>
              {t("fields.fotografia.softwareEdicion")}
              <input type="text" value={softwareEdicion ?? ""} onChange={(e) => setSoftwareEdicion(e.target.value)} />
            </label>
          )}
        </>
      )}

      {categoriaObra === "Pintura" && (
        <>
          <label>
            {t("field.subtipo")} <HelpIcon fieldKey="subtipo_pintura" />
            <select
              value={subtipoPintura}
              onChange={(e) => setSubtipoPintura(e.target.value as SubtipoPintura)}
            >
              <option value="Original" disabled={eraSeriada && subtipoPintura !== "Original" && !puedeDesconvertir}>
                {t("fields.pintura.subtipoOriginal")}
              </option>
              <option value="Serigrafia">{t("fields.pintura.subtipoSerigrafia")}</option>
              <option value="Litografia">{t("fields.pintura.subtipoLitografia")}</option>
              <option value="Grabado">{t("fields.pintura.subtipoGrabado")}</option>
            </select>
          </label>
          {eraSeriada && !esSeriadaCalculada && !puedeDesconvertir && (
            <p className="field-note">{t("obraDetail.noSePuedeDeshacerSerie")}</p>
          )}
          {!eraSeriada && esSeriadaCalculada && (
            <label>
              {t("obraForm.cantidadEdicionesLabel")} <HelpIcon fieldKey="pruebas_artista" />
              <input
                type="number"
                min={1}
                value={cantidadTotalEdiciones}
                onChange={(e) => setCantidadTotalEdiciones(e.target.value)}
              />
            </label>
          )}
          <p className="field-note">
            {t("fields.pintura.esSeriadaPrefix")} <strong>{esSeriadaCalculada ? t("common.yes") : t("common.no")}</strong>{" "}
            {t("fields.pintura.esSeriadaSuffix")} <HelpIcon fieldKey="es_seriada" />
          </p>
        </>
      )}

      {(categoriaObra === "Pintura" || categoriaObra === "Escultura") && (
        <>
          <label>
            {t("field.tecnica")}
            <input type="text" value={tecnica ?? ""} onChange={(e) => setTecnica(e.target.value)} />
          </label>
          <label>
            {t("field.dimensiones")}
            <input type="text" value={dimensiones ?? ""} onChange={(e) => setDimensiones(e.target.value)} />
          </label>
          <label>
            {t("field.peso")}
            <input type="text" value={peso ?? ""} onChange={(e) => setPeso(e.target.value)} />
          </label>
          <label>
            {t("field.fechaCreacion")}
            <input type="date" value={fechaCreacion ?? ""} onChange={(e) => setFechaCreacion(e.target.value)} />
          </label>
        </>
      )}

      {esRegistroPersonal && (
        <label>
          {t("obraDetail.ubicacionFisicaArchivo")} <HelpIcon fieldKey="ubicacion_fisica_archivo" />
          <FilePathField value={ubicacion} onChange={setUbicacion} />
        </label>
      )}

      {permiteCambiarSeriada && (
        <>
          <label>
            <input
              type="checkbox"
              checked={esSeriada}
              disabled={eraSeriada && !puedeDesconvertir}
              onChange={(e) => setEsSeriada(e.target.checked)}
            />
            {t("field.esSeriada")} <HelpIcon fieldKey="es_seriada" />
          </label>
          {eraSeriada && !puedeDesconvertir && (
            <p className="field-note">{t("obraDetail.noSePuedeDeshacerSerie")}</p>
          )}
          {!eraSeriada && esSeriada && (
            <label>
              {t("obraForm.cantidadEdicionesLabel")} <HelpIcon fieldKey="pruebas_artista" />
              <input
                type="number"
                min={1}
                value={cantidadTotalEdiciones}
                onChange={(e) => setCantidadTotalEdiciones(e.target.value)}
              />
            </label>
          )}
        </>
      )}

      <label>
        {t("obraForm.etiquetasLabel")}
        <TagPicker value={tags} onChange={setTags} />
      </label>


      <div className="obra-form-saved-actions">
        <button type="button" onClick={handleSubmit} disabled={submitting}>
          {submitting ? t("common.saving") : t("obraDetail.guardarCambios")}
        </button>
        <button type="button" onClick={onCancel} disabled={submitting}>
          {t("common.cancel")}
        </button>
      </div>

      {error && (
        <p className="error" role="alert">
          ⚠️ {t("obraForm.errorNoSePudoGuardar", { error })}
        </p>
      )}
    </div>
  );
}

function EjemplarRowView({
  ejemplar,
  categoria,
  esFotografiaDigital,
  venta,
  editing,
  onEdit,
  onCancelEdit,
  onSave,
  onVender,
  onEditarVenta,
  onAnularVenta,
  anulando,
  onGenerarPresupuesto,
  generandoPresupuesto,
}: {
  ejemplar: EjemplarRow;
  categoria: CategoriaObra;
  esFotografiaDigital: boolean;
  venta: VentaRow | undefined;
  editing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (fields: {
    estado: string;
    fechaImpresion: string;
    tipoImpresion: string;
    soporteImpresion: string;
    tallerImpresion: string;
    ubicacionActual: string;
    dimensiones: string;
    tipoEnmarcado: string;
    tamanoFinalEnmarcado: string;
    notas: string;
  }) => void;
  onVender: () => void;
  onEditarVenta: (venta: VentaRow) => void;
  onAnularVenta: (venta: VentaRow, nuevoEstado: string) => void;
  anulando: boolean;
  onGenerarPresupuesto: () => void;
  generandoPresupuesto: boolean;
}) {
  const { t } = useLanguage();
  const [estado, setEstado] = useState(ejemplar.estado);
  const [estadoTrasAnular, setEstadoTrasAnular] = useState("en_stock");
  const [fechaImpresion, setFechaImpresion] = useState(ejemplar.fecha_impresion ?? todayISO());
  const [tipoImpresion, setTipoImpresion] = useState(ejemplar.tipo_impresion ?? "");
  const [soporteImpresion, setSoporteImpresion] = useState(ejemplar.soporte_impresion ?? "");
  const [tallerImpresion, setTallerImpresion] = useState(ejemplar.taller_impresion ?? "");
  const [ubicacionActual, setUbicacionActual] = useState(ejemplar.ubicacion_actual ?? "");
  const [dimensiones, setDimensiones] = useState(ejemplar.dimensiones ?? "");
  const [tipoEnmarcado, setTipoEnmarcado] = useState(ejemplar.tipo_enmarcado ?? "");
  const [tamanoFinalEnmarcado, setTamanoFinalEnmarcado] = useState(ejemplar.tamano_final_enmarcado ?? "");
  const [notas, setNotas] = useState(ejemplar.notas ?? "");
  const permiteEnmarcado = categoria === "Fotografia" || categoria === "Pintura";
  const [ventaBloqueada, setVentaBloqueada] = useState<string | null>(null);
  useEscapeToDismiss(ventaBloqueada, setVentaBloqueada);
  const [confirmingAnular, setConfirmingAnular] = useState(false);

  function handleVenderClick() {
    const faltantes: string[] = [];
    if (!ejemplar.fecha_impresion) faltantes.push(t("obraDetail.faltaFechaImpresion"));
    if (!ejemplar.soporte_impresion) faltantes.push(t("obraDetail.faltaSoporteImpresion"));
    if (faltantes.length > 0) {
      setVentaBloqueada(
        t("obraDetail.errorFaltanDatosImpresion", {
          numero: ejemplar.numero,
          faltantes: faltantes.join(t("common.y")),
        }),
      );
      return;
    }
    setVentaBloqueada(null);
    onVender();
  }

  if (editing) {
    return (
      <div className="ejemplar-row ejemplar-row-editing" onKeyDown={focusNextOnEnter}>
        <strong>
          {ejemplar.numero}
          {ejemplar.tipo === "prueba_artista" && <HelpIcon fieldKey="prueba_artista_info" />}
        </strong>
        <label>
          <span className="field-label">
            {t("obraDetail.estadoLabel")} <HelpIcon fieldKey="estado_ejemplar" />
          </span>
          <select value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="disponible">{t("estado.disponible")}</option>
            <option value="en_stock">{t("estado.en_stock")}</option>
            <option value="reservada">{t("estado.reservada")}</option>
            <option value="exhibicion">{t("estado.exhibicion")}</option>
            <option value="vendida">{t("estado.vendida")}</option>
            <option value="consignacion">{t("estado.consignacion")}</option>
            <option value="en_produccion">{t("estado.en_produccion")}</option>
            <option value="coleccion_autor">{t("estado.coleccion_autor")}</option>
            <option value="descartada">{t("estado.descartada")}</option>
            <option value="destruida">{t("estado.destruida")}</option>
          </select>
        </label>
        <label>
          <span className="field-label">{t("obraDetail.fechaImpresion")}</span>
          <input type="date" value={fechaImpresion} onChange={(e) => setFechaImpresion(e.target.value)} />
        </label>
        {esFotografiaDigital && (
          <label>
            <span className="field-label">{t("obraDetail.tipoImpresionLabel")}</span>
            <input type="text" value={tipoImpresion} onChange={(e) => setTipoImpresion(e.target.value)} />
          </label>
        )}
        <label>
          <span className="field-label">{t("obraDetail.soporteImpresion")}</span>
          <input type="text" value={soporteImpresion} onChange={(e) => setSoporteImpresion(e.target.value)} />
        </label>
        {esFotografiaDigital && (
          <label>
            <span className="field-label">{t("obraDetail.tallerImpresionLabel")}</span>
            <input type="text" value={tallerImpresion} onChange={(e) => setTallerImpresion(e.target.value)} />
          </label>
        )}
        <label>
          <span className="field-label">{t("obraDetail.ubicacionActualCopia")}</span>
          <input type="text" value={ubicacionActual} onChange={(e) => setUbicacionActual(e.target.value)} />
        </label>
        <label>
          <span className="field-label">{t("obraDetail.tamanoEjemplarLabel")}</span>
          <input type="text" value={dimensiones} onChange={(e) => setDimensiones(e.target.value)} />
        </label>
        {permiteEnmarcado && (
          <>
            <label>
              <span className="field-label">{t("obraDetail.tipoEnmarcadoLabel")}</span>
              <input type="text" value={tipoEnmarcado} onChange={(e) => setTipoEnmarcado(e.target.value)} />
            </label>
            <label>
              <span className="field-label">{t("obraDetail.tamanoFinalEnmarcadoLabel")}</span>
              <input
                type="text"
                value={tamanoFinalEnmarcado}
                onChange={(e) => setTamanoFinalEnmarcado(e.target.value)}
              />
            </label>
          </>
        )}
        <label>
          <span className="field-label">{t("obraDetail.notasEjemplarLabel")}</span>
          <textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} />
        </label>
        <div className="obra-form-saved-actions">
          <button
            type="button"
            onClick={() =>
              onSave({
                estado,
                fechaImpresion,
                tipoImpresion,
                soporteImpresion,
                tallerImpresion,
                ubicacionActual,
                dimensiones,
                tipoEnmarcado,
                tamanoFinalEnmarcado,
                notas,
              })
            }
          >
            {t("common.save")}
          </button>
          <button type="button" onClick={onCancelEdit}>
            {t("common.cancel")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ejemplar-row">
      <strong>
        {ejemplar.numero}
        {ejemplar.tipo === "prueba_artista" && <HelpIcon fieldKey="prueba_artista_info" />}
      </strong>
      <span className={`obra-card-estado obra-card-estado-${ejemplar.estado}`}>
        {t(`estado.${ejemplar.estado}` as TranslationKey)}
      </span>
      <span>
        {ejemplar.fecha_impresion
          ? t("common.impreso", { fecha: formatFechaDDMMYYYY(ejemplar.fecha_impresion) })
          : t("common.sinFechaImpresion")}
        {venta?.numero_certificado ? t("common.certificadoNum", { numero: venta.numero_certificado }) : ""}
      </span>
      {ejemplar.tipo_impresion && <span>{t("obraDetail.tipoImpresion", { valor: ejemplar.tipo_impresion })}</span>}
      {ejemplar.soporte_impresion && <span>{t("common.soporte", { soporte: ejemplar.soporte_impresion })}</span>}
      {ejemplar.taller_impresion && (
        <span>{t("obraDetail.tallerImpresion", { valor: ejemplar.taller_impresion })}</span>
      )}
      {ejemplar.dimensiones && <span>{t("obraDetail.tamanoEjemplar", { valor: ejemplar.dimensiones })}</span>}
      {ejemplar.tipo_enmarcado && <span>{t("obraDetail.tipoEnmarcado", { valor: ejemplar.tipo_enmarcado })}</span>}
      {ejemplar.tamano_final_enmarcado && (
        <span>{t("obraDetail.tamanoFinalEnmarcado", { valor: ejemplar.tamano_final_enmarcado })}</span>
      )}
      <span>{t("common.ubicacion", { ubicacion: ejemplar.ubicacion_actual || "—" })}</span>

      {venta && (
        <span>
          {venta.tipo === "donacion"
            ? t("common.donacionResumenLinea", {
                comprador: venta.comprador_nombre,
                fecha: formatFechaDDMMYYYY(venta.fecha_venta),
              })
            : t("common.ventaResumenLinea", {
                accion: t(venta.tipo === "venta" ? "common.vendida" : "common.reservada"),
                comprador: venta.comprador_nombre,
                fecha: formatFechaDDMMYYYY(venta.fecha_venta),
                moneda: venta.moneda,
                valor: venta.valor_venta,
              })}
          {venta.comprador_email && (
            <>
              {" — "}
              <a href={`mailto:${venta.comprador_email}`}>{venta.comprador_email}</a>
            </>
          )}
          {venta.comprador_telefono && (
            <>
              {" — "}
              <a href={`tel:${venta.comprador_telefono}`}>{venta.comprador_telefono}</a>
            </>
          )}
        </span>
      )}

      <div className="obra-form-saved-actions">
        <button
          type="button"
          onClick={() => {
            setVentaBloqueada(null);
            onEdit();
          }}
        >
          {t("common.edit")}
        </button>
        {!venta && ejemplar.estado !== "descartada" && ejemplar.estado !== "destruida" && (
          <button type="button" onClick={handleVenderClick}>
            {t(ejemplar.tipo === "prueba_artista" ? "obraDetail.ventaReservaDonacion" : "obraDetail.ventaReserva")}
          </button>
        )}
        {venta && (
          <button type="button" onClick={() => onEditarVenta(venta)}>
            {t(
              venta.tipo === "venta"
                ? "common.editarVenta"
                : venta.tipo === "donacion"
                  ? "common.editarDonacion"
                  : "common.editarReserva",
            )}
          </button>
        )}
        {venta && (
          <button type="button" onClick={() => setConfirmingAnular(true)}>
            {t(
              venta.tipo === "venta"
                ? "common.anularVenta"
                : venta.tipo === "donacion"
                  ? "common.anularDonacion"
                  : "common.anularReserva",
            )}
          </button>
        )}
        <button type="button" onClick={onGenerarPresupuesto} disabled={generandoPresupuesto}>
          {generandoPresupuesto ? t("common.saving") : t("obraDetail.generarPresupuesto")}
        </button>
      </div>

      {venta && confirmingAnular && (
        <div className="confirm-box">
          <p>
            {t(
              venta.tipo === "venta"
                ? "common.confirmarAnularVenta"
                : venta.tipo === "donacion"
                  ? "common.confirmarAnularDonacion"
                  : "common.confirmarAnularReserva",
            )}
          </p>
          <p>{t("obraDetail.estadoTrasAnularPregunta")}</p>
          <div className="obra-form-saved-actions">
            {(["en_stock", "exhibicion", "consignacion"] as const).map((opcion) => (
              <label key={opcion} className="estado-tras-anular-opcion">
                <input
                  type="radio"
                  name="estadoTrasAnular"
                  value={opcion}
                  checked={estadoTrasAnular === opcion}
                  onChange={() => setEstadoTrasAnular(opcion)}
                />
                {t(`estado.${opcion}` as TranslationKey)}
              </label>
            ))}
          </div>
          <div className="obra-form-saved-actions">
            <button
              type="button"
              onClick={() => {
                onAnularVenta(venta, estadoTrasAnular);
                setConfirmingAnular(false);
              }}
              disabled={anulando}
            >
              {anulando ? t("common.anulando") : t("common.siAnular")}
            </button>
            <button type="button" onClick={() => setConfirmingAnular(false)} disabled={anulando}>
              {t("common.no")}
            </button>
          </div>
        </div>
      )}

      {ventaBloqueada && (
        <p className="error" role="alert">
          ⚠️ {ventaBloqueada}
        </p>
      )}
    </div>
  );
}
