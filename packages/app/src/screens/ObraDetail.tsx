import { useEffect, useRef, useState } from "react";
import {
  derivarAnioDesdeFecha,
  derivarEsSeriadaObraGrafica,
  formatTags,
  generarEjemplarUnico,
  generarEjemplares,
  obraMiniaturaPath,
  obraOriginalPath,
  parseTags,
  puedeDeshacerSerie,
  type CategoriaObra,
  type Moneda,
  type SubtipoObraGrafica,
  type TipoVenta,
} from "@registro/core";
import {
  ObraDetalleFields,
  subtipoLabelKey,
  type ObraDetalleFieldsState,
  type CategoriaObraDetalle,
} from "./fields/ObraDetalleFields.js";
import {
  FotografiaFields,
  initialFotografiaFieldsState,
  type FotografiaFieldsState,
} from "./fields/FotografiaFields.js";
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
  categoria_obra: CategoriaObra;
  estado: string;
  es_seriada: number;
  ubicacion_fisica_actual: string | null;
  miniatura_path: string | null;
  imagen_alta_resolucion_path: string | null;
  tags: string | null;
  artista_id: number;
  nombre_completo: string;
  subtitulo: string | null;
  codigo_inventario: string | null;
  anio_periodo: string | null;
  regimen_ingreso: string | null;
  historial_procedencia_exhibiciones: string | null;
}

interface ObraExtRow {
  subtipo_fotografia?: string;
  fecha_captura?: string | null;
  fecha_edicion?: string | null;
  software_edicion?: string | null;
  escala_por_tamanos?: string | null;
  serie_proyecto?: string | null;
  clasificacion_positivado?: string | null;
  proceso_quimico_analogica?: string | null;
  viraje_conservacion?: string | null;
  formato_negativo?: string | null;
  estado_negativo?: string | null;
  formato_archivo_maestro?: string | null;
  espacio_color?: string | null;
  condiciones_custodia_archivo?: string | null;
  proceso_quimico_historicos?: string | null;
  preparacion_soporte?: string | null;
  metales_sales?: string | null;
  pieza_unica_o_matriz?: string | null;
  estructura_objeto?: string | null;
  contenedor_estuche?: string | null;
  incluye_copia_coleccionista?: number | null;
  detalle_copia_coleccionista?: string | null;
  creditos_editoriales?: string | null;
  isbn?: string | null;
  colofon?: string | null;
  motor_ia?: string | null;
  prompt_parametros?: string | null;
  flujo_generativo?: string | null;
  intervencion_postproduccion?: string | null;
  soporte_salida?: string | null;
  declaracion_derechos_ia?: string | null;
  subtipo?: string | null;
  tecnica_material?: string | null;
  soporte?: string | null;
  tecnica?: string | null;
  dimensiones?: string | null;
  peso?: string | null;
  fecha_creacion?: string | null;
  materiales_mixtura?: string | null;
  tipo_bastidor?: string | null;
  imprimacion_base?: string | null;
  profundidad_relieve?: string | null;
  configuracion_panel?: string | null;
  estabilidad_capas?: string | null;
  barniz_proteccion?: string | null;
  sensibilidad_ambiental?: string | null;
  estado_cantos?: string | null;
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
  tipo_tintas: string | null;
  taller_impresion: string | null;
  ubicacion_actual: string | null;
  dimensiones: string | null;
  tipo_enmarcado: string | null;
  tamano_final_enmarcado: string | null;
  ubicacion_firma: string | null;
  sello_seco_holograma: string | null;
  fecha_limite: string | null;
  notas: string | null;
  precio_venta: number | null;
  moneda_venta: string | null;
  coa_numero: string | null;
  coa_emisor: string | null;
  coa_fecha: string | null;
  valor_seguro: number | null;
  moneda_seguro: string | null;
  vidrio_proteccion_frontal: string | null;
  sistema_cuelgue: string | null;
  coa_sistema_seguridad: string | null;
  informe_conservacion: string | null;
  dimensiones_soporte_completo: string | null;
  peso: string | null;
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
  iva_porcentaje: number | null;
  iva_monto: number | null;
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
    ivaPorcentaje: v.iva_porcentaje,
    ivaMonto: v.iva_monto,
  };
}

function buildObraDescripcionLineas(
  obra: ObraRow,
  ext: ObraExtRow | null,
  esRegistroPersonal: boolean,
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string,
  // El presupuesto reusa esta descripcion pero, a diferencia de la ficha
  // completa, no debe incluir la ubicacion del archivo original ni el
  // software de edicion (son datos internos, no para compartir con un
  // comprador).
  { incluirUbicacionArchivo = true, incluirSoftwareEdicion = true, incluirInfoComercial = true } = {},
): string[] {
  const lineas: string[] = [];
  if (obra.subtitulo) lineas.push(t("obraForm.subtituloLabel") + ": " + obra.subtitulo);
  if (obra.codigo_inventario) lineas.push(t("obraForm.codigoInventarioLabel") + ": " + obra.codigo_inventario);
  lineas.push(t("obraDetail.artista", { nombre: obra.nombre_completo }));
  lineas.push(t("obraDetail.categoria", { categoria: t(`categoria.${obra.categoria_obra}` as TranslationKey) }));
  if (ext?.subtipo_fotografia) {
    lineas.push(
      t("obraDetail.subtipo", {
        subtipo: t(`fields.fotografia.subtipo${ext.subtipo_fotografia}` as TranslationKey),
      }),
    );
  }
  if (ext?.subtipo && obra.categoria_obra !== "Fotografia") {
    const labelKey = subtipoLabelKey(obra.categoria_obra as CategoriaObraDetalle, ext.subtipo);
    if (labelKey) {
      lineas.push(t("obraDetail.subtipoNoEditable", { subtipo: t(labelKey) }));
    }
  }
  lineas.push(Number(obra.es_seriada) === 1 ? t("obraDetail.obraSeriada") : t("obraDetail.obraUnica"));
  if (incluirUbicacionArchivo && esRegistroPersonal && obra.ubicacion_fisica_actual) {
    lineas.push(`${t("obraDetail.ubicacionArchivoPrefix")} ${obra.ubicacion_fisica_actual}`);
  }
  if (ext?.tecnica_material) {
    lineas.push(t("obraDetail.tecnica", { valor: t(`fields.pintura.tecnicaMaterial${ext.tecnica_material}` as TranslationKey) }));
  }
  if (ext?.soporte) {
    lineas.push(t("obraDetail.soporte", { valor: t(`fields.pintura.soporte${ext.soporte}` as TranslationKey) }));
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
  if (incluirSoftwareEdicion && esRegistroPersonal && ext?.software_edicion) {
    lineas.push(`${t("fields.fotografia.softwareEdicion")}: ${ext.software_edicion}`);
  }
  if (ext?.fecha_creacion) {
    lineas.push(`${t("field.fechaCreacion")}: ${formatFechaDDMMYYYY(ext.fecha_creacion)}`);
  }
  if (obra.anio_periodo) lineas.push(`${t("obraForm.anioPeriodoLabel")}: ${obra.anio_periodo}`);
  if (obra.categoria_obra === "Pintura") {
    if (ext?.materiales_mixtura) {
      lineas.push(`${t("fields.pintura.materialesMixturaLabel")}: ${ext.materiales_mixtura}`);
    }
    if (ext?.tipo_bastidor) lineas.push(`${t("fields.pintura.tipoBastidorLabel")}: ${ext.tipo_bastidor}`);
    if (ext?.imprimacion_base) {
      lineas.push(`${t("fields.pintura.imprimacionBaseLabel")}: ${ext.imprimacion_base}`);
    }
    if (ext?.profundidad_relieve) {
      lineas.push(`${t("fields.pintura.profundidadRelieveLabel")}: ${ext.profundidad_relieve}`);
    }
    if (ext?.configuracion_panel) {
      lineas.push(`${t("fields.pintura.configuracionPanelLabel")}: ${ext.configuracion_panel}`);
    }
    if (ext?.estabilidad_capas) {
      lineas.push(`${t("fields.pintura.estabilidadCapasLabel")}: ${ext.estabilidad_capas}`);
    }
    if (ext?.barniz_proteccion) {
      lineas.push(`${t("fields.pintura.barnizProteccionLabel")}: ${ext.barniz_proteccion}`);
    }
    if (ext?.sensibilidad_ambiental) {
      lineas.push(`${t("fields.pintura.sensibilidadAmbientalLabel")}: ${ext.sensibilidad_ambiental}`);
    }
    if (ext?.estado_cantos) lineas.push(`${t("fields.pintura.estadoCantosLabel")}: ${ext.estado_cantos}`);
  }
  if (obra.categoria_obra === "Fotografia") {
    if (ext?.serie_proyecto) lineas.push(`${t("fields.fotografia.serieProyectoLabel")}: ${ext.serie_proyecto}`);
    if (ext?.escala_por_tamanos) {
      lineas.push(
        `${t("fields.fotografia.escalaPorTamanosLabel")}: ${ext.escala_por_tamanos === "Si" ? t("common.yes") : t("common.no")}`,
      );
    }
    if (ext?.subtipo_fotografia === "AnalogicaClasica") {
      if (ext?.clasificacion_positivado) {
        lineas.push(
          `${t("fields.fotografia.clasificacionPositivadoLabel")}: ${t(`fields.fotografia.clasificacionPositivado${ext.clasificacion_positivado}` as TranslationKey)}`,
        );
      }
      if (ext?.proceso_quimico_analogica) {
        lineas.push(`${t("fields.fotografia.procesoQuimicoLabel")}: ${ext.proceso_quimico_analogica}`);
      }
      if (ext?.viraje_conservacion) {
        lineas.push(`${t("fields.fotografia.virajeConservacionLabel")}: ${ext.viraje_conservacion}`);
      }
      if (ext?.formato_negativo) {
        lineas.push(`${t("fields.fotografia.formatoNegativoLabel")}: ${ext.formato_negativo}`);
      }
      if (ext?.estado_negativo) {
        lineas.push(`${t("fields.fotografia.estadoNegativoLabel")}: ${ext.estado_negativo}`);
      }
    }
    if (ext?.subtipo_fotografia === "DigitalFineArt") {
      if (ext?.formato_archivo_maestro) {
        lineas.push(`${t("fields.fotografia.formatoArchivoMaestroLabel")}: ${ext.formato_archivo_maestro}`);
      }
      if (ext?.espacio_color) lineas.push(`${t("fields.fotografia.espacioColorLabel")}: ${ext.espacio_color}`);
      if (ext?.condiciones_custodia_archivo) {
        lineas.push(
          `${t("fields.fotografia.condicionesCustodiaArchivoLabel")}: ${ext.condiciones_custodia_archivo}`,
        );
      }
    }
    if (ext?.subtipo_fotografia === "ProcesosHistoricos") {
      if (ext?.proceso_quimico_historicos) {
        lineas.push(`${t("fields.fotografia.procesoQuimicoLabel")}: ${ext.proceso_quimico_historicos}`);
      }
      if (ext?.preparacion_soporte) {
        lineas.push(`${t("fields.fotografia.preparacionSoporteLabel")}: ${ext.preparacion_soporte}`);
      }
      if (ext?.metales_sales) lineas.push(`${t("fields.fotografia.metalesSalesLabel")}: ${ext.metales_sales}`);
      if (ext?.pieza_unica_o_matriz) {
        lineas.push(
          `${t("fields.fotografia.piezaUnicaOMatrizLabel")}: ${t(`fields.fotografia.piezaUnicaOMatriz${ext.pieza_unica_o_matriz}` as TranslationKey)}`,
        );
      }
    }
    if (ext?.subtipo_fotografia === "Fotolibros") {
      if (ext?.estructura_objeto) {
        lineas.push(`${t("fields.fotografia.estructuraObjetoLabel")}: ${ext.estructura_objeto}`);
      }
      if (ext?.contenedor_estuche) {
        lineas.push(`${t("fields.fotografia.contenedorEstucheLabel")}: ${ext.contenedor_estuche}`);
      }
      if (Number(ext?.incluye_copia_coleccionista) === 1) {
        lineas.push(
          `${t("fields.fotografia.incluyeCopiaColeccionistaLabel")}${ext?.detalle_copia_coleccionista ? `: ${ext.detalle_copia_coleccionista}` : ""}`,
        );
      }
      if (ext?.creditos_editoriales) {
        lineas.push(`${t("fields.fotografia.creditosEditorialesLabel")}: ${ext.creditos_editoriales}`);
      }
      if (ext?.isbn) lineas.push(`${t("fields.fotografia.isbnLabel")}: ${ext.isbn}`);
      if (ext?.colofon) lineas.push(`${t("fields.fotografia.colofonLabel")}: ${ext.colofon}`);
    }
    if (ext?.subtipo_fotografia === "Sintografia") {
      if (ext?.motor_ia) lineas.push(`${t("fields.fotografia.motorIaLabel")}: ${ext.motor_ia}`);
      if (ext?.prompt_parametros) {
        lineas.push(`${t("fields.fotografia.promptParametrosLabel")}: ${ext.prompt_parametros}`);
      }
      if (ext?.flujo_generativo) {
        lineas.push(
          `${t("fields.fotografia.flujoGenerativoLabel")}: ${t(`fields.fotografia.flujoGenerativo${ext.flujo_generativo}` as TranslationKey)}`,
        );
      }
      if (ext?.intervencion_postproduccion) {
        lineas.push(
          `${t("fields.fotografia.intervencionPostproduccionLabel")}: ${ext.intervencion_postproduccion}`,
        );
      }
      if (ext?.soporte_salida) {
        lineas.push(
          `${t("fields.fotografia.soporteSalidaLabel")}: ${t(`fields.fotografia.soporteSalida${ext.soporte_salida}` as TranslationKey)}`,
        );
      }
      if (ext?.declaracion_derechos_ia) {
        lineas.push(`${t("fields.fotografia.declaracionDerechosIaLabel")}: ${ext.declaracion_derechos_ia}`);
      }
    }
  }
  if (incluirInfoComercial && !esRegistroPersonal && obra.regimen_ingreso) {
    lineas.push(
      `${t("obraForm.regimenIngresoLabel")}: ${t(`obraForm.regimenIngreso${obra.regimen_ingreso}` as TranslationKey)}`,
    );
  }
  if (incluirInfoComercial && !esRegistroPersonal && obra.historial_procedencia_exhibiciones) {
    lineas.push(
      `${t("obraForm.historialProcedenciaExhibicionesLabel")}: ${obra.historial_procedencia_exhibiciones}`,
    );
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
                obra.artista_id, artista.nombre_completo, obra.subtitulo, obra.codigo_inventario,
                obra.anio_periodo, obra.regimen_ingreso, obra.historial_procedencia_exhibiciones
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
            `SELECT subtipo_fotografia, fecha_captura, fecha_edicion, software_edicion, dimensiones, tecnica,
                    escala_por_tamanos, serie_proyecto, clasificacion_positivado, proceso_quimico_analogica,
                    viraje_conservacion, formato_negativo, estado_negativo, formato_archivo_maestro, espacio_color,
                    condiciones_custodia_archivo, proceso_quimico_historicos, preparacion_soporte, metales_sales,
                    pieza_unica_o_matriz, estructura_objeto, contenedor_estuche, incluye_copia_coleccionista,
                    detalle_copia_coleccionista, creditos_editoriales, isbn, colofon, motor_ia, prompt_parametros,
                    flujo_generativo, intervencion_postproduccion, soporte_salida, declaracion_derechos_ia
             FROM obra_fotografia WHERE obra_id = ?`,
            [obraId],
          );
          setExt(rows[0] ?? null);
        } else {
          const rows = await context.db.query<ObraExtRow>(
            `SELECT subtipo, tecnica_material, soporte, tecnica, dimensiones, peso, fecha_creacion,
                    materiales_mixtura, tipo_bastidor, imprimacion_base, profundidad_relieve, configuracion_panel,
                    estabilidad_capas, barniz_proteccion, sensibilidad_ambiental, estado_cantos
             FROM obra_detalle WHERE obra_id = ?`,
            [obraId],
          );
          setExt(rows[0] ?? null);
        }
      }

      if (obraRow) {
        const ejemplarRows = await context.db.query<EjemplarRow>(
          `SELECT id, tipo, numero, estado, venta_id, fecha_impresion, tipo_impresion, soporte_impresion, tipo_tintas, taller_impresion, ubicacion_actual, dimensiones, tipo_enmarcado, tamano_final_enmarcado, ubicacion_firma, sello_seco_holograma, fecha_limite, notas, precio_venta, moneda_venta,
                  coa_numero, coa_emisor, coa_fecha, valor_seguro, moneda_seguro, vidrio_proteccion_frontal, sistema_cuelgue,
                  coa_sistema_seguridad, informe_conservacion, dimensiones_soporte_completo, peso
           FROM ejemplar WHERE obra_id = ? ORDER BY tipo, indice`,
          [obraId],
        );
        setEjemplares(ejemplarRows);
      }

      const ventaRows = await context.db.query<VentaRow>(
        `SELECT id, tipo, cliente_id, comprador_nombre, comprador_email, comprador_telefono, fecha_venta, lugar_venta, valor_venta, moneda, aplica_comision, porcentaje_comision, monto_comision, numero_certificado, iva_porcentaje, iva_monto
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

      const lineas = buildObraDescripcionLineas(obra, ext, esRegistroPersonal, t, {
        incluirUbicacionArchivo: false,
        incluirSoftwareEdicion: false,
        incluirInfoComercial: false,
      });

      let textY = startY;
      for (const linea of lineas) {
        textY = writeWrappedText(doc, linea, textX, textY, textWidth, { lineHeight: 6 });
      }

      const serieLineas: string[] = [];
      serieLineas.push(`${t("ventasReport.colSerie")}: ${ejemplar.numero}`);
      if (ejemplar.precio_venta != null) {
        serieLineas.push(
          t("obraDetail.valorSerie", { moneda: ejemplar.moneda_venta ?? "ARS", valor: ejemplar.precio_venta }),
        );
      }
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
      tipoTintas: string;
      tallerImpresion: string;
      ubicacionActual: string;
      dimensiones: string;
      tipoEnmarcado: string;
      tamanoFinalEnmarcado: string;
      ubicacionFirma: string;
      selloSecoHolograma: string;
      fechaLimite: string;
      notas: string;
      precioVenta: string;
      monedaVenta: string;
      coaNumero: string;
      coaEmisor: string;
      coaFecha: string;
      valorSeguro: string;
      monedaSeguro: string;
      vidrioProteccionFrontal: string;
      sistemaCuelgue: string;
      coaSistemaSeguridad: string;
      informeConservacion: string;
      dimensionesSoporteCompleto: string;
      peso: string;
    },
  ) {
    if (!context) return;
    await context.db.transaction(async (tx) => {
      await tx.execute(
        `UPDATE ejemplar SET
           estado = ?, fecha_impresion = ?, tipo_impresion = ?, soporte_impresion = ?, tipo_tintas = ?,
           taller_impresion = ?, ubicacion_actual = ?, dimensiones = ?, tipo_enmarcado = ?,
           tamano_final_enmarcado = ?, ubicacion_firma = ?, sello_seco_holograma = ?, fecha_limite = ?, notas = ?,
           precio_venta = ?, moneda_venta = ?, coa_numero = ?, coa_emisor = ?, coa_fecha = ?, valor_seguro = ?,
           moneda_seguro = ?, vidrio_proteccion_frontal = ?, sistema_cuelgue = ?, coa_sistema_seguridad = ?,
           informe_conservacion = ?, dimensiones_soporte_completo = ?, peso = ?
         WHERE id = ?`,
        [
          fields.estado,
          fields.fechaImpresion || null,
          fields.tipoImpresion || null,
          fields.soporteImpresion || null,
          fields.tipoTintas || null,
          fields.tallerImpresion || null,
          fields.ubicacionActual || null,
          fields.dimensiones || null,
          fields.tipoEnmarcado || null,
          fields.tamanoFinalEnmarcado || null,
          fields.ubicacionFirma || null,
          fields.selloSecoHolograma || null,
          fields.estado === "exhibicion" || fields.estado === "consignacion" ? fields.fechaLimite || null : null,
          fields.notas || null,
          fields.precioVenta ? parseFloat(fields.precioVenta) : null,
          fields.precioVenta ? fields.monedaVenta : null,
          fields.coaNumero || null,
          fields.coaEmisor || null,
          fields.coaFecha || null,
          fields.valorSeguro ? parseFloat(fields.valorSeguro) : null,
          fields.valorSeguro ? fields.monedaSeguro : null,
          fields.vidrioProteccionFrontal || null,
          fields.sistemaCuelgue || null,
          fields.coaSistemaSeguridad || null,
          fields.informeConservacion || null,
          fields.dimensionesSoporteCompleto || null,
          fields.peso || null,
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
    subtitulo: string;
    codigoInventario: string;
    anioPeriodo: string;
    regimenIngreso: string;
    historialProcedenciaExhibiciones: string;
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
        `UPDATE obra SET
           titulo = ?, categoria_obra = ?, ubicacion_fisica_actual = ?, tags = ?, es_seriada = ?, artista_id = ?,
           subtitulo = ?, codigo_inventario = ?, anio_periodo = ?, regimen_ingreso = ?,
           historial_procedencia_exhibiciones = ?
         WHERE id = ?`,
        [
          fields.titulo,
          fields.categoria,
          esRegistroPersonal ? fields.ubicacion || null : obra.ubicacion_fisica_actual,
          formatTags(fields.tags) || null,
          fields.esSeriada ? 1 : 0,
          esRegistroPersonal ? obra.artista_id : fields.artistaId,
          fields.subtitulo || null,
          fields.codigoInventario || null,
          fields.anioPeriodo || null,
          fields.regimenIngreso || null,
          fields.historialProcedenciaExhibiciones || null,
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
        await tx.execute(`DELETE FROM obra_detalle WHERE obra_id = ?`, [obraId]);
      }

      if (fields.categoria === "Fotografia") {
        const upsert = cambiaCategoria
          ? `INSERT INTO obra_fotografia (
               obra_id, subtipo_fotografia, fecha_captura, anio_toma, fecha_edicion, software_edicion, dimensiones,
               tecnica, escala_por_tamanos, serie_proyecto, clasificacion_positivado, proceso_quimico_analogica,
               viraje_conservacion, formato_negativo, estado_negativo, formato_archivo_maestro, espacio_color,
               condiciones_custodia_archivo, proceso_quimico_historicos, preparacion_soporte, metales_sales,
               pieza_unica_o_matriz, estructura_objeto, contenedor_estuche, incluye_copia_coleccionista,
               detalle_copia_coleccionista, creditos_editoriales, isbn, colofon, motor_ia, prompt_parametros,
               flujo_generativo, intervencion_postproduccion, soporte_salida, declaracion_derechos_ia
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          : `UPDATE obra_fotografia SET
               subtipo_fotografia = ?, fecha_captura = ?, anio_toma = ?, fecha_edicion = ?, software_edicion = ?,
               dimensiones = ?, tecnica = ?, escala_por_tamanos = ?, serie_proyecto = ?,
               clasificacion_positivado = ?, proceso_quimico_analogica = ?, viraje_conservacion = ?,
               formato_negativo = ?, estado_negativo = ?, formato_archivo_maestro = ?, espacio_color = ?,
               condiciones_custodia_archivo = ?, proceso_quimico_historicos = ?, preparacion_soporte = ?,
               metales_sales = ?, pieza_unica_o_matriz = ?, estructura_objeto = ?, contenedor_estuche = ?,
               incluye_copia_coleccionista = ?, detalle_copia_coleccionista = ?, creditos_editoriales = ?,
               isbn = ?, colofon = ?, motor_ia = ?, prompt_parametros = ?, flujo_generativo = ?,
               intervencion_postproduccion = ?, soporte_salida = ?, declaracion_derechos_ia = ?
             WHERE obra_id = ?`;
        const softwareEdicion = esRegistroPersonal ? fields.ext.software_edicion || null : null;
        const anioToma = derivarAnioDesdeFecha(fields.ext.fecha_captura);
        const camposComunes = [
          fields.ext.dimensiones || null,
          fields.ext.tecnica || null,
          fields.ext.escala_por_tamanos || null,
          fields.ext.serie_proyecto || null,
          fields.ext.clasificacion_positivado || null,
          fields.ext.proceso_quimico_analogica || null,
          fields.ext.viraje_conservacion || null,
          fields.ext.formato_negativo || null,
          fields.ext.estado_negativo || null,
          fields.ext.formato_archivo_maestro || null,
          fields.ext.espacio_color || null,
          fields.ext.condiciones_custodia_archivo || null,
          fields.ext.proceso_quimico_historicos || null,
          fields.ext.preparacion_soporte || null,
          fields.ext.metales_sales || null,
          fields.ext.pieza_unica_o_matriz || null,
          fields.ext.estructura_objeto || null,
          fields.ext.contenedor_estuche || null,
          fields.ext.incluye_copia_coleccionista ? 1 : 0,
          fields.ext.detalle_copia_coleccionista || null,
          fields.ext.creditos_editoriales || null,
          fields.ext.isbn || null,
          fields.ext.colofon || null,
          fields.ext.motor_ia || null,
          fields.ext.prompt_parametros || null,
          fields.ext.flujo_generativo || null,
          fields.ext.intervencion_postproduccion || null,
          fields.ext.soporte_salida || null,
          fields.ext.declaracion_derechos_ia || null,
        ];
        const params = cambiaCategoria
          ? [
              obraId,
              fields.ext.subtipo_fotografia,
              fields.ext.fecha_captura || null,
              anioToma,
              fields.ext.fecha_edicion || null,
              softwareEdicion,
              ...camposComunes,
            ]
          : [
              fields.ext.subtipo_fotografia,
              fields.ext.fecha_captura || null,
              anioToma,
              fields.ext.fecha_edicion || null,
              softwareEdicion,
              ...camposComunes,
              obraId,
            ];
        await tx.execute(upsert, params);
      } else {
        const upsert = cambiaCategoria
          ? `INSERT INTO obra_detalle (
               obra_id, subtipo, tecnica_material, soporte, tecnica, dimensiones, peso, fecha_creacion,
               materiales_mixtura, tipo_bastidor, imprimacion_base, profundidad_relieve, configuracion_panel,
               estabilidad_capas, barniz_proteccion, sensibilidad_ambiental, estado_cantos
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          : `UPDATE obra_detalle SET
               subtipo = ?, tecnica_material = ?, soporte = ?, tecnica = ?, dimensiones = ?, peso = ?,
               fecha_creacion = ?, materiales_mixtura = ?, tipo_bastidor = ?, imprimacion_base = ?,
               profundidad_relieve = ?, configuracion_panel = ?, estabilidad_capas = ?, barniz_proteccion = ?,
               sensibilidad_ambiental = ?, estado_cantos = ?
             WHERE obra_id = ?`;
        const params = cambiaCategoria
          ? [
              obraId,
              fields.ext.subtipo || null,
              fields.ext.tecnica_material || null,
              fields.ext.soporte || null,
              fields.ext.tecnica || null,
              fields.ext.dimensiones || null,
              fields.ext.peso || null,
              fields.ext.fecha_creacion || null,
              fields.ext.materiales_mixtura || null,
              fields.ext.tipo_bastidor || null,
              fields.ext.imprimacion_base || null,
              fields.ext.profundidad_relieve || null,
              fields.ext.configuracion_panel || null,
              fields.ext.estabilidad_capas || null,
              fields.ext.barniz_proteccion || null,
              fields.ext.sensibilidad_ambiental || null,
              fields.ext.estado_cantos || null,
            ]
          : [
              fields.ext.subtipo || null,
              fields.ext.tecnica_material || null,
              fields.ext.soporte || null,
              fields.ext.tecnica || null,
              fields.ext.dimensiones || null,
              fields.ext.peso || null,
              fields.ext.fecha_creacion || null,
              fields.ext.materiales_mixtura || null,
              fields.ext.tipo_bastidor || null,
              fields.ext.imprimacion_base || null,
              fields.ext.profundidad_relieve || null,
              fields.ext.configuracion_panel || null,
              fields.ext.estabilidad_capas || null,
              fields.ext.barniz_proteccion || null,
              fields.ext.sensibilidad_ambiental || null,
              fields.ext.estado_cantos || null,
              obraId,
            ];
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
            {ext?.subtipo &&
              obra.categoria_obra !== "Fotografia" &&
              (() => {
                const labelKey = subtipoLabelKey(obra.categoria_obra as CategoriaObraDetalle, ext.subtipo!);
                return labelKey ? <p>{t("obraDetail.subtipoNoEditable", { subtipo: t(labelKey) })}</p> : null;
              })()}
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
            {ext?.tecnica_material && (
              <p>{t("obraDetail.tecnica", { valor: t(`fields.pintura.tecnicaMaterial${ext.tecnica_material}` as TranslationKey) })}</p>
            )}
            {ext?.soporte && (
              <p>{t("obraDetail.soporte", { valor: t(`fields.pintura.soporte${ext.soporte}` as TranslationKey) })}</p>
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
              esFotografiaDigital={obra.categoria_obra === "Fotografia" && ext?.subtipo_fotografia === "DigitalFineArt"}
              esFotografiaDigitalOSintografia={
                obra.categoria_obra === "Fotografia" &&
                (ext?.subtipo_fotografia === "DigitalFineArt" || ext?.subtipo_fotografia === "Sintografia")
              }
              venta={ej.venta_id ? ventas[ej.venta_id] : undefined}
              esGaleria={!esRegistroPersonal}
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
    subtitulo: string;
    codigoInventario: string;
    anioPeriodo: string;
    regimenIngreso: string;
    historialProcedenciaExhibiciones: string;
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
  const [subtitulo, setSubtitulo] = useState(obra.subtitulo ?? "");
  const [codigoInventario, setCodigoInventario] = useState(obra.codigo_inventario ?? "");
  const [anioPeriodo, setAnioPeriodo] = useState(obra.anio_periodo ?? "");
  const [regimenIngreso, setRegimenIngreso] = useState(obra.regimen_ingreso ?? "");
  const [historialProcedenciaExhibiciones, setHistorialProcedenciaExhibiciones] = useState(
    obra.historial_procedencia_exhibiciones ?? "",
  );
  const [artistaId, setArtistaId] = useState<number | null>(obra.artista_id);
  const tituloInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const imagePreviewUrlRef = useRef<string | null>(null);
  const [removerImagen, setRemoverImagen] = useState(false);
  const [ubicacion, setUbicacion] = useState(obra.ubicacion_fisica_actual ?? "");
  const [tags, setTags] = useState<string[]>(parseTags(obra.tags));
  const [categoriaObra, setCategoriaObra] = useState<CategoriaObra>(obra.categoria_obra);
  const [fotografia, setFotografia] = useState<FotografiaFieldsState>({
    ...initialFotografiaFieldsState,
    subtipoFotografia: (ext?.subtipo_fotografia ?? "DigitalFineArt") as FotografiaFieldsState["subtipoFotografia"],
    fechaCaptura: ext?.fecha_captura ?? todayISO(),
    fechaEdicion: ext?.fecha_edicion ?? todayISO(),
    softwareEdicion: ext?.software_edicion ?? "",
    tecnica: ext?.tecnica ?? "",
    dimensiones: ext?.dimensiones ?? "",
    escalaPorTamanos: ext?.escala_por_tamanos ?? "",
    serieProyecto: ext?.serie_proyecto ?? "",
    clasificacionPositivado: (ext?.clasificacion_positivado ??
      "") as FotografiaFieldsState["clasificacionPositivado"],
    procesoQuimicoAnalogica: ext?.proceso_quimico_analogica ?? "",
    virajeConservacion: ext?.viraje_conservacion ?? "",
    formatoNegativo: ext?.formato_negativo ?? "",
    estadoNegativo: ext?.estado_negativo ?? "",
    formatoArchivoMaestro: ext?.formato_archivo_maestro ?? "",
    espacioColor: ext?.espacio_color ?? "",
    condicionesCustodiaArchivo: ext?.condiciones_custodia_archivo ?? "",
    procesoQuimicoHistoricos: ext?.proceso_quimico_historicos ?? "",
    preparacionSoporte: ext?.preparacion_soporte ?? "",
    metalesSales: ext?.metales_sales ?? "",
    piezaUnicaOMatriz: (ext?.pieza_unica_o_matriz ?? "") as FotografiaFieldsState["piezaUnicaOMatriz"],
    estructuraObjeto: ext?.estructura_objeto ?? "",
    contenedorEstuche: ext?.contenedor_estuche ?? "",
    incluyeCopiaColeccionista: Number(ext?.incluye_copia_coleccionista) === 1,
    detalleCopiaColeccionista: ext?.detalle_copia_coleccionista ?? "",
    creditosEditoriales: ext?.creditos_editoriales ?? "",
    isbn: ext?.isbn ?? "",
    colofon: ext?.colofon ?? "",
    motorIa: ext?.motor_ia ?? "",
    promptParametros: ext?.prompt_parametros ?? "",
    flujoGenerativo: (ext?.flujo_generativo ?? "") as FotografiaFieldsState["flujoGenerativo"],
    intervencionPostproduccion: ext?.intervencion_postproduccion ?? "",
    soporteSalida: (ext?.soporte_salida ?? "") as FotografiaFieldsState["soporteSalida"],
    declaracionDerechosIa: ext?.declaracion_derechos_ia ?? "",
  });
  const [obraDetalle, setObraDetalle] = useState<ObraDetalleFieldsState>({
    subtipo: ext?.subtipo ?? "",
    tecnicaMaterial: ext?.tecnica_material ?? "",
    soporte: ext?.soporte ?? "",
    tecnica: ext?.tecnica ?? "",
    dimensiones: ext?.dimensiones ?? "",
    peso: ext?.peso ?? "",
    fechaCreacion: ext?.fecha_creacion ?? todayISO(),
    esSeriada: false,
    materialesMixtura: ext?.materiales_mixtura ?? "",
    tipoBastidor: ext?.tipo_bastidor ?? "",
    imprimacionBase: ext?.imprimacion_base ?? "",
    profundidadRelieve: ext?.profundidad_relieve ?? "",
    configuracionPanel: ext?.configuracion_panel ?? "",
    estabilidadCapas: ext?.estabilidad_capas ?? "",
    barnizProteccion: ext?.barniz_proteccion ?? "",
    sensibilidadAmbiental: ext?.sensibilidad_ambiental ?? "",
    estadoCantos: ext?.estado_cantos ?? "",
  });
  const eraSeriada = Number(obra.es_seriada) === 1;
  const [esSeriada, setEsSeriada] = useState(eraSeriada);
  const [cantidadTotalEdiciones, setCantidadTotalEdiciones] = useState("1");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEscapeToDismiss(error, setError);

  const permiteCambiarSeriada = categoriaObra !== "ObraGrafica";
  const puedeDesconvertir = puedeDeshacerSerie(ejemplares.map((ej) => ej.estado));
  const esSeriadaCalculada =
    categoriaObra === "ObraGrafica"
      ? obraDetalle.subtipo
        ? derivarEsSeriadaObraGrafica(obraDetalle.subtipo as SubtipoObraGrafica)
        : false
      : esSeriada;

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
        subtitulo,
        codigoInventario,
        anioPeriodo,
        regimenIngreso,
        historialProcedenciaExhibiciones,
        ubicacion,
        tags,
        categoria: categoriaObra,
        esSeriada: esSeriadaCalculada,
        cantidadTotalEdiciones: Math.max(1, parseInt(cantidadTotalEdiciones, 10) || 1),
        ext:
          categoriaObra === "Fotografia"
            ? {
                subtipo_fotografia: fotografia.subtipoFotografia,
                fecha_captura: fotografia.fechaCaptura,
                fecha_edicion: fotografia.fechaEdicion,
                software_edicion: fotografia.softwareEdicion,
                tecnica: fotografia.tecnica,
                dimensiones: fotografia.dimensiones,
                escala_por_tamanos: fotografia.escalaPorTamanos,
                serie_proyecto: fotografia.serieProyecto,
                clasificacion_positivado: fotografia.clasificacionPositivado,
                proceso_quimico_analogica: fotografia.procesoQuimicoAnalogica,
                viraje_conservacion: fotografia.virajeConservacion,
                formato_negativo: fotografia.formatoNegativo,
                estado_negativo: fotografia.estadoNegativo,
                formato_archivo_maestro: fotografia.formatoArchivoMaestro,
                espacio_color: fotografia.espacioColor,
                condiciones_custodia_archivo: fotografia.condicionesCustodiaArchivo,
                proceso_quimico_historicos: fotografia.procesoQuimicoHistoricos,
                preparacion_soporte: fotografia.preparacionSoporte,
                metales_sales: fotografia.metalesSales,
                pieza_unica_o_matriz: fotografia.piezaUnicaOMatriz,
                estructura_objeto: fotografia.estructuraObjeto,
                contenedor_estuche: fotografia.contenedorEstuche,
                incluye_copia_coleccionista: fotografia.incluyeCopiaColeccionista ? 1 : 0,
                detalle_copia_coleccionista: fotografia.detalleCopiaColeccionista,
                creditos_editoriales: fotografia.creditosEditoriales,
                isbn: fotografia.isbn,
                colofon: fotografia.colofon,
                motor_ia: fotografia.motorIa,
                prompt_parametros: fotografia.promptParametros,
                flujo_generativo: fotografia.flujoGenerativo,
                intervencion_postproduccion: fotografia.intervencionPostproduccion,
                soporte_salida: fotografia.soporteSalida,
                declaracion_derechos_ia: fotografia.declaracionDerechosIa,
              }
            : {
                subtipo: obraDetalle.subtipo,
                tecnica_material: obraDetalle.tecnicaMaterial,
                soporte: obraDetalle.soporte,
                tecnica: obraDetalle.tecnica,
                dimensiones: obraDetalle.dimensiones,
                peso: obraDetalle.peso,
                fecha_creacion: obraDetalle.fechaCreacion,
                materiales_mixtura: obraDetalle.materialesMixtura,
                tipo_bastidor: obraDetalle.tipoBastidor,
                imprimacion_base: obraDetalle.imprimacionBase,
                profundidad_relieve: obraDetalle.profundidadRelieve,
                configuracion_panel: obraDetalle.configuracionPanel,
                estabilidad_capas: obraDetalle.estabilidadCapas,
                barniz_proteccion: obraDetalle.barnizProteccion,
                sensibilidad_ambiental: obraDetalle.sensibilidadAmbiental,
                estado_cantos: obraDetalle.estadoCantos,
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
        {t("obraForm.subtituloLabel")} <HelpIcon fieldKey="subtitulo" />
        <input type="text" value={subtitulo} onChange={(e) => setSubtitulo(e.target.value)} />
      </label>

      <label>
        {t("obraForm.codigoInventarioLabel")} <HelpIcon fieldKey="codigo_inventario" />
        <input type="text" value={codigoInventario} onChange={(e) => setCodigoInventario(e.target.value)} />
      </label>

      <label>
        {t("obraForm.anioPeriodoLabel")} <HelpIcon fieldKey="anio_periodo" />
        <input type="text" value={anioPeriodo} onChange={(e) => setAnioPeriodo(e.target.value)} />
      </label>

      {!esRegistroPersonal && (
        <label>
          {t("obraForm.regimenIngresoLabel")} <HelpIcon fieldKey="regimen_ingreso" />
          <select value={regimenIngreso} onChange={(e) => setRegimenIngreso(e.target.value)}>
            <option value="">—</option>
            <option value="ConsignacionTaller">{t("obraForm.regimenIngresoConsignacionTaller")}</option>
            <option value="DepositoColeccionPrivada">
              {t("obraForm.regimenIngresoDepositoColeccionPrivada")}
            </option>
            <option value="CompraFirmeGaleria">{t("obraForm.regimenIngresoCompraFirmeGaleria")}</option>
          </select>
        </label>
      )}

      {!esRegistroPersonal && (
        <label>
          {t("obraForm.historialProcedenciaExhibicionesLabel")}{" "}
          <HelpIcon fieldKey="historial_procedencia_exhibiciones" />
          <textarea
            rows={3}
            value={historialProcedenciaExhibiciones}
            onChange={(e) => setHistorialProcedenciaExhibiciones(e.target.value)}
          />
        </label>
      )}

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
        {t("obraForm.categoriaLabel")} <HelpIcon fieldKey="categoria_obra" />
        <select value={categoriaObra} onChange={(e) => setCategoriaObra(e.target.value as CategoriaObra)}>
          <option value="Fotografia">{t("fields.fotografia.legend")}</option>
          <option value="Pintura">{t("fields.pintura.legend")}</option>
          <option value="ObraGrafica">{t("fields.obraGrafica.legend")}</option>
          <option value="Escultura">{t("fields.escultura.legend")}</option>
          <option value="Dibujo">{t("fields.dibujo.legend")}</option>
          <option value="TextilCeramica">{t("fields.textilCeramica.legend")}</option>
          <option value="NuevosMedios">{t("fields.nuevosMedios.legend")}</option>
        </select>
      </label>

      {categoriaObra === "Fotografia" ? (
        <FotografiaFields
          value={fotografia}
          onChange={setFotografia}
          mostrarSoftwareEdicion={esRegistroPersonal}
          mostrarEsSeriada={false}
          ubicacion={ubicacion}
          onUbicacionChange={setUbicacion}
          mostrarUbicacion={esRegistroPersonal}
        />
      ) : (
        <ObraDetalleFields categoria={categoriaObra} value={obraDetalle} onChange={setObraDetalle} mostrarEsSeriada={false} />
      )}

      {categoriaObra === "ObraGrafica" && (
        <>
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
          {obraDetalle.subtipo && (
            <p className="field-note">
              {t("fields.pintura.esSeriadaPrefix")} <strong>{esSeriadaCalculada ? t("common.yes") : t("common.no")}</strong>{" "}
              {t("fields.pintura.esSeriadaSuffix")} <HelpIcon fieldKey="es_seriada" />
            </p>
          )}
        </>
      )}

      {esRegistroPersonal && categoriaObra !== "Fotografia" && (
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
  esFotografiaDigitalOSintografia,
  venta,
  esGaleria,
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
  esFotografiaDigitalOSintografia: boolean;
  venta: VentaRow | undefined;
  esGaleria: boolean;
  editing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (fields: {
    estado: string;
    fechaImpresion: string;
    tipoImpresion: string;
    soporteImpresion: string;
    tipoTintas: string;
    tallerImpresion: string;
    ubicacionActual: string;
    dimensiones: string;
    tipoEnmarcado: string;
    tamanoFinalEnmarcado: string;
    ubicacionFirma: string;
    selloSecoHolograma: string;
    fechaLimite: string;
    notas: string;
    precioVenta: string;
    monedaVenta: string;
    coaNumero: string;
    coaEmisor: string;
    coaFecha: string;
    valorSeguro: string;
    monedaSeguro: string;
    vidrioProteccionFrontal: string;
    sistemaCuelgue: string;
    coaSistemaSeguridad: string;
    informeConservacion: string;
    dimensionesSoporteCompleto: string;
    peso: string;
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
  const [tipoTintas, setTipoTintas] = useState(ejemplar.tipo_tintas ?? "");
  const [tallerImpresion, setTallerImpresion] = useState(ejemplar.taller_impresion ?? "");
  const [ubicacionActual, setUbicacionActual] = useState(ejemplar.ubicacion_actual ?? "");
  const [dimensiones, setDimensiones] = useState(ejemplar.dimensiones ?? "");
  const [tipoEnmarcado, setTipoEnmarcado] = useState(ejemplar.tipo_enmarcado ?? "");
  const [tamanoFinalEnmarcado, setTamanoFinalEnmarcado] = useState(ejemplar.tamano_final_enmarcado ?? "");
  const [ubicacionFirma, setUbicacionFirma] = useState(ejemplar.ubicacion_firma ?? "");
  const [selloSecoHolograma, setSelloSecoHolograma] = useState(ejemplar.sello_seco_holograma ?? "");
  const [fechaLimite, setFechaLimite] = useState(ejemplar.fecha_limite ?? "");
  const [notas, setNotas] = useState(ejemplar.notas ?? "");
  const [precioVenta, setPrecioVenta] = useState(ejemplar.precio_venta != null ? String(ejemplar.precio_venta) : "");
  const [monedaVenta, setMonedaVenta] = useState(ejemplar.moneda_venta ?? "ARS");
  const [coaNumero, setCoaNumero] = useState(ejemplar.coa_numero ?? "");
  const [coaEmisor, setCoaEmisor] = useState(ejemplar.coa_emisor ?? "");
  const [coaFecha, setCoaFecha] = useState(ejemplar.coa_fecha ?? "");
  const [valorSeguro, setValorSeguro] = useState(ejemplar.valor_seguro != null ? String(ejemplar.valor_seguro) : "");
  const [monedaSeguro, setMonedaSeguro] = useState(ejemplar.moneda_seguro ?? "ARS");
  const [vidrioProteccionFrontal, setVidrioProteccionFrontal] = useState(
    ejemplar.vidrio_proteccion_frontal ?? "",
  );
  const [sistemaCuelgue, setSistemaCuelgue] = useState(ejemplar.sistema_cuelgue ?? "");
  const [coaSistemaSeguridad, setCoaSistemaSeguridad] = useState(ejemplar.coa_sistema_seguridad ?? "");
  const [informeConservacion, setInformeConservacion] = useState(ejemplar.informe_conservacion ?? "");
  const [dimensionesSoporteCompleto, setDimensionesSoporteCompleto] = useState(
    ejemplar.dimensiones_soporte_completo ?? "",
  );
  const [peso, setPeso] = useState(ejemplar.peso ?? "");
  const esFotografia = categoria === "Fotografia";
  const permiteEnmarcado =
    categoria === "Fotografia" || categoria === "Pintura" || categoria === "ObraGrafica" || categoria === "Dibujo";
  const presupuestoBloqueado = ["vendida", "descartada", "coleccion_autor", "destruida"].includes(ejemplar.estado);
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
        {(estado === "exhibicion" || estado === "consignacion") && (
          <label>
            <span className="field-label">
              {t("obraDetail.fechaLimiteLabel")} <HelpIcon fieldKey="fecha_limite_ejemplar" />
            </span>
            <input type="date" value={fechaLimite} onChange={(e) => setFechaLimite(e.target.value)} />
          </label>
        )}
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
        {esFotografiaDigitalOSintografia && (
          <label>
            <span className="field-label">
              {t("obraDetail.tipoTintasLabel")} <HelpIcon fieldKey="tipo_tintas" />
            </span>
            <input type="text" value={tipoTintas} onChange={(e) => setTipoTintas(e.target.value)} />
          </label>
        )}
        <label>
          <span className="field-label">{t("obraDetail.tamanoEjemplarLabel")}</span>
          <input type="text" value={dimensiones} onChange={(e) => setDimensiones(e.target.value)} />
        </label>
        {esFotografia && (
          <>
            <label>
              <span className="field-label">
                {t("obraDetail.dimensionesSoporteCompletoLabel")}{" "}
                <HelpIcon fieldKey="dimensiones_soporte_completo" />
              </span>
              <input
                type="text"
                value={dimensionesSoporteCompleto}
                onChange={(e) => setDimensionesSoporteCompleto(e.target.value)}
              />
            </label>
            <label>
              <span className="field-label">
                {t("obraDetail.pesoLabel")} <HelpIcon fieldKey="peso_ejemplar" />
              </span>
              <input type="text" value={peso} onChange={(e) => setPeso(e.target.value)} />
            </label>
          </>
        )}
        {esFotografiaDigital && (
          <label>
            <span className="field-label">
              {t("obraDetail.tallerImpresionLabel")} <HelpIcon fieldKey="taller_impresion" />
            </span>
            <input type="text" value={tallerImpresion} onChange={(e) => setTallerImpresion(e.target.value)} />
          </label>
        )}
        {permiteEnmarcado && (
          <>
            <label>
              <span className="field-label">
                {t("obraDetail.tipoEnmarcadoLabel")} <HelpIcon fieldKey="tipo_enmarcado" />
              </span>
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
            <label>
              <span className="field-label">
                {t("obraDetail.vidrioProteccionFrontalLabel")} <HelpIcon fieldKey="vidrio_proteccion_frontal" />
              </span>
              <input
                type="text"
                value={vidrioProteccionFrontal}
                onChange={(e) => setVidrioProteccionFrontal(e.target.value)}
              />
            </label>
            <label>
              <span className="field-label">
                {t("obraDetail.sistemaCuelgueLabel")} <HelpIcon fieldKey="sistema_cuelgue" />
              </span>
              <input type="text" value={sistemaCuelgue} onChange={(e) => setSistemaCuelgue(e.target.value)} />
            </label>
          </>
        )}
        {categoria === "Fotografia" && (
          <>
            <label>
              <span className="field-label">
                {t("obraDetail.ubicacionFirmaLabel")} <HelpIcon fieldKey="ubicacion_firma" />
              </span>
              <input type="text" value={ubicacionFirma} onChange={(e) => setUbicacionFirma(e.target.value)} />
            </label>
            <label>
              <span className="field-label">
                {t("obraDetail.selloSecoHologramaLabel")} <HelpIcon fieldKey="sello_seco_holograma" />
              </span>
              <input
                type="text"
                value={selloSecoHolograma}
                onChange={(e) => setSelloSecoHolograma(e.target.value)}
              />
            </label>
          </>
        )}
        <label>
          <span className="field-label">{t("obraDetail.ubicacionActualCopia")}</span>
          <input type="text" value={ubicacionActual} onChange={(e) => setUbicacionActual(e.target.value)} />
        </label>
        <label>
          <span className="field-label">{t("obraDetail.valorLabel")}</span>
          <div className="venta-form-valor-row">
            <select value={monedaVenta} onChange={(e) => setMonedaVenta(e.target.value)}>
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
            <input type="number" min={0} step="0.01" value={precioVenta} onChange={(e) => setPrecioVenta(e.target.value)} />
          </div>
        </label>
        {esGaleria && (
          <>
            <label>
              <span className="field-label">
                {t("obraDetail.coaNumeroLabel")} <HelpIcon fieldKey="coa_numero" />
              </span>
              <input type="text" value={coaNumero} onChange={(e) => setCoaNumero(e.target.value)} />
            </label>
            <label>
              <span className="field-label">
                {t("obraDetail.coaEmisorLabel")} <HelpIcon fieldKey="coa_emisor" />
              </span>
              <input type="text" value={coaEmisor} onChange={(e) => setCoaEmisor(e.target.value)} />
            </label>
            <label>
              <span className="field-label">
                {t("obraDetail.coaFechaLabel")} <HelpIcon fieldKey="coa_fecha" />
              </span>
              <input type="date" value={coaFecha} onChange={(e) => setCoaFecha(e.target.value)} />
            </label>
            <label>
              <span className="field-label">
                {t("obraDetail.coaSistemaSeguridadLabel")} <HelpIcon fieldKey="coa_sistema_seguridad" />
              </span>
              <input
                type="text"
                value={coaSistemaSeguridad}
                onChange={(e) => setCoaSistemaSeguridad(e.target.value)}
              />
            </label>
            <label>
              <span className="field-label">
                {t("obraDetail.valorSeguroLabel")} <HelpIcon fieldKey="valor_seguro" />
              </span>
              <div className="venta-form-valor-row">
                <select value={monedaSeguro} onChange={(e) => setMonedaSeguro(e.target.value)}>
                  <option value="ARS">ARS</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={valorSeguro}
                  onChange={(e) => setValorSeguro(e.target.value)}
                />
              </div>
            </label>
            <label>
              <span className="field-label">
                {t("obraDetail.informeConservacionLabel")} <HelpIcon fieldKey="informe_conservacion" />
              </span>
              <textarea
                rows={2}
                value={informeConservacion}
                onChange={(e) => setInformeConservacion(e.target.value)}
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
                tipoTintas,
                tallerImpresion,
                ubicacionActual,
                dimensiones,
                tipoEnmarcado,
                tamanoFinalEnmarcado,
                ubicacionFirma,
                selloSecoHolograma,
                fechaLimite,
                notas,
                precioVenta,
                monedaVenta,
                coaNumero,
                coaEmisor,
                coaFecha,
                valorSeguro,
                monedaSeguro,
                vidrioProteccionFrontal,
                sistemaCuelgue,
                coaSistemaSeguridad,
                informeConservacion,
                dimensionesSoporteCompleto,
                peso,
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
      {(ejemplar.estado === "exhibicion" || ejemplar.estado === "consignacion") && ejemplar.fecha_limite && (
        <span>{t("obraDetail.fechaLimite", { valor: formatFechaDDMMYYYY(ejemplar.fecha_limite) })}</span>
      )}
      <span>
        {ejemplar.fecha_impresion
          ? t("common.impreso", { fecha: formatFechaDDMMYYYY(ejemplar.fecha_impresion) })
          : t("common.sinFechaImpresion")}
        {venta?.numero_certificado ? t("common.certificadoNum", { numero: venta.numero_certificado }) : ""}
      </span>
      {ejemplar.tipo_impresion && <span>{t("obraDetail.tipoImpresion", { valor: ejemplar.tipo_impresion })}</span>}
      {ejemplar.soporte_impresion && <span>{t("common.soporte", { soporte: ejemplar.soporte_impresion })}</span>}
      {ejemplar.tipo_tintas && <span>{t("obraDetail.tipoTintas", { valor: ejemplar.tipo_tintas })}</span>}
      {ejemplar.dimensiones && <span>{t("obraDetail.tamanoEjemplar", { valor: ejemplar.dimensiones })}</span>}
      {ejemplar.dimensiones_soporte_completo && (
        <span>
          {t("obraDetail.dimensionesSoporteCompletoResumen", { valor: ejemplar.dimensiones_soporte_completo })}
        </span>
      )}
      {ejemplar.peso && <span>{t("obraDetail.pesoResumen", { valor: ejemplar.peso })}</span>}
      {ejemplar.taller_impresion && (
        <span>{t("obraDetail.tallerImpresion", { valor: ejemplar.taller_impresion })}</span>
      )}
      {ejemplar.tipo_enmarcado && <span>{t("obraDetail.tipoEnmarcado", { valor: ejemplar.tipo_enmarcado })}</span>}
      {ejemplar.tamano_final_enmarcado && (
        <span>{t("obraDetail.tamanoFinalEnmarcado", { valor: ejemplar.tamano_final_enmarcado })}</span>
      )}
      {ejemplar.vidrio_proteccion_frontal && (
        <span>{t("obraDetail.vidrioProteccionFrontal", { valor: ejemplar.vidrio_proteccion_frontal })}</span>
      )}
      {ejemplar.sistema_cuelgue && (
        <span>{t("obraDetail.sistemaCuelgue", { valor: ejemplar.sistema_cuelgue })}</span>
      )}
      {ejemplar.ubicacion_firma && (
        <span>{t("obraDetail.ubicacionFirma", { valor: ejemplar.ubicacion_firma })}</span>
      )}
      {ejemplar.sello_seco_holograma && (
        <span>{t("obraDetail.selloSecoHolograma", { valor: ejemplar.sello_seco_holograma })}</span>
      )}
      <span>{t("common.ubicacion", { ubicacion: ejemplar.ubicacion_actual || "—" })}</span>
      {ejemplar.precio_venta != null && (
        <span>
          {t("obraDetail.valorSerie", { moneda: ejemplar.moneda_venta ?? "ARS", valor: ejemplar.precio_venta })}
        </span>
      )}
      {ejemplar.coa_numero && <span>{t("obraDetail.coaResumen", { valor: ejemplar.coa_numero })}</span>}
      {ejemplar.valor_seguro != null && (
        <span>
          {t("obraDetail.valorSeguroResumen", {
            moneda: ejemplar.moneda_seguro ?? "ARS",
            valor: ejemplar.valor_seguro,
          })}
        </span>
      )}
      {ejemplar.informe_conservacion && (
        <span>{t("obraDetail.informeConservacionResumen", { valor: ejemplar.informe_conservacion })}</span>
      )}

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
        {!presupuestoBloqueado && (
          <button type="button" onClick={onGenerarPresupuesto} disabled={generandoPresupuesto}>
            {generandoPresupuesto ? t("common.saving") : t("obraDetail.generarPresupuesto")}
          </button>
        )}
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
