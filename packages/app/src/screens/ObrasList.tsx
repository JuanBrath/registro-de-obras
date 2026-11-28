import { useEffect, useMemo, useRef, useState } from "react";
import { parseTags, type CategoriaObra } from "@registro/core";
import { useWorkspace } from "../state/WorkspaceContext.js";
import { leerMiniaturasPorIdEnParalelo } from "../utils/imageObjectUrl.js";
import { useLanguage, type TranslationKey } from "../i18n/LanguageContext.js";
import { useEscapeToDismiss } from "../utils/useEscapeToDismiss.js";
import { subtipoTranslationKey } from "./fields/ObraDetalleFields.js";
import {
  ObraDisponibilidad,
  ObraTarjetaInfo,
  SQL_OBRA_ROWS,
  anchoMiniaturaTabla,
  type ObraRow,
} from "../components/ObraVista.js";
import { InformeListadoObrasModal } from "../components/InformeListadoObrasModal.js";
import { HelpIcon } from "../components/HelpIcon.js";
import { MiniaturasSizeSlider } from "../components/MiniaturasSizeSlider.js";
import { TagFilterPicker } from "../components/TagFilterPicker.js";
import { useMenuExportarImagen } from "../components/useMenuExportarImagen.js";
import { AyudaSeccion } from "../components/AyudaSeccion.js";
import type { PasoRecorrido } from "../components/RecorridoInicial.js";
import { CalificacionFilterButton } from "../components/CalificacionFilterButton.js";
import { StarRating } from "../components/StarRating.js";
import { AccesosEditores, type EditoresActivos } from "../components/AccesosEditores.js";
import { GrillaImagenes } from "../components/GrillaImagenes.js";
import { cargarColumnasGridInicial, guardarColumnasGrid } from "../utils/columnasGrid.js";
import { marcarSiMiniaturaMuyVertical } from "../utils/miniaturaVertical.js";
import { sincronizarCalificacionConArchivo } from "../utils/calificacionArchivo.js";
import {
  agregarObrasASeleccion,
  crearSeleccion,
  listObraIdsDeSeleccion,
  listSelecciones,
  type Seleccion,
} from "../data/selecciones.js";

const COLUMNAS_OBRAS_POR_DEFECTO = 4;
// Cada vista (tarjetas / columnas) guarda su propio tamano de miniaturas por
// separado: cambiarlo en una no toca lo que ya estaba fijado en la otra. El
// nombre de la clave de tarjetas se mantiene igual que antes de que
// existiera la vista en columnas, para no resetear lo que ya tenia guardado
// quien ya usaba el programa.
const COLUMNAS_OBRAS_TARJETAS_STORAGE_KEY = "obrasListColumnasGrid";
const COLUMNAS_OBRAS_COLUMNAS_STORAGE_KEY = "obrasListColumnasGridVistaColumnas";
const VISTA_OBRAS_STORAGE_KEY = "obrasListVista";
const FILTROS_ABIERTOS_STORAGE_KEY = "obrasListFiltrosAbiertos";

const ACCESOS_EDITORES_STORAGE_KEY = "obrasListAccesosEditores";

function cargarAccesosEditores(): EditoresActivos {
  try {
    const v = JSON.parse(localStorage.getItem(ACCESOS_EDITORES_STORAGE_KEY) ?? "null");
    return { lightroom: v?.lightroom === true, photoshop: v?.photoshop === true };
  } catch {
    return { lightroom: false, photoshop: false };
  }
}

function cargarFiltrosAbiertos(): boolean {
  try {
    return localStorage.getItem(FILTROS_ABIERTOS_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

type VistaObras = "tarjetas" | "columnas" | "imagenes";
const COLUMNAS_OBRAS_IMAGENES_STORAGE_KEY = "galeriaFotosColumnasGrid";

function cargarVistaInicial(): VistaObras {
  try {
    const guardada = localStorage.getItem(VISTA_OBRAS_STORAGE_KEY);
    if (guardada === "tarjetas" || guardada === "columnas" || guardada === "imagenes") return guardada;
  } catch {
    // localStorage puede no estar disponible (o bloqueado); se usa el valor por defecto.
  }
  return "columnas";
}

function guardarVista(vista: VistaObras): void {
  try {
    localStorage.setItem(VISTA_OBRAS_STORAGE_KEY, vista);
  } catch {
    // No se pudo persistir la preferencia; no rompe el uso de esta sesion.
  }
}

export interface ObrasListFiltros {
  selectedTags: string[];
  selectedArtistaId: number | null;
  selectedCategoria: CategoriaObra | null;
  selectedSubtipo: string | null;
  calificacionFiltro: number;
}



export function ObrasList({
  onBack,
  onOpenObra,
  onNuevaObra,
  onVerSelecciones,
  seleccionInicialId,
}: {
  onBack: () => void;
  onOpenObra: (obraId: number) => void;
  onNuevaObra: () => void;
  onVerSelecciones: () => void;
  /** Si viene, la lista arranca limitada a las obras de esa selección (para generar informes de ellas). */
  seleccionInicialId?: number;
}) {
  const { context } = useWorkspace();
  const { t } = useLanguage();
  const [obras, setObras] = useState<ObraRow[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { abrirMenu: abrirMenuImagen, elementos: elementosMenuImagen } = useMenuExportarImagen(setError);
  useEscapeToDismiss(error, setError);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [calificacionFiltro, setCalificacionFiltro] = useState(0);
  const [selectedArtistaId, setSelectedArtistaId] = useState<number | null>(null);
  const [selectedCategoria, setSelectedCategoria] = useState<CategoriaObra | null>(null);
  const [selectedSubtipo, setSelectedSubtipo] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [ordenPor, setOrdenPor] = useState<"titulo" | "codigo_inventario" | "fecha_captura">("codigo_inventario");
  const [columnasGridTarjetas, setColumnasGridTarjetas] = useState<number>(() =>
    cargarColumnasGridInicial(COLUMNAS_OBRAS_TARJETAS_STORAGE_KEY, COLUMNAS_OBRAS_POR_DEFECTO),
  );
  const [columnasGridColumnas, setColumnasGridColumnas] = useState<number>(() =>
    cargarColumnasGridInicial(COLUMNAS_OBRAS_COLUMNAS_STORAGE_KEY, COLUMNAS_OBRAS_POR_DEFECTO),
  );
  const [columnasGridImagenes, setColumnasGridImagenes] = useState<number>(() =>
    cargarColumnasGridInicial(COLUMNAS_OBRAS_IMAGENES_STORAGE_KEY, COLUMNAS_OBRAS_POR_DEFECTO),
  );
  const [vista, setVista] = useState<VistaObras>(cargarVistaInicial);
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(cargarFiltrosAbiertos);
  const [accesos, setAccesos] = useState<EditoresActivos>(cargarAccesosEditores);
  const columnasGridActual =
    vista === "tarjetas" ? columnasGridTarjetas : vista === "imagenes" ? columnasGridImagenes : columnasGridColumnas;
  const objectUrlsRef = useRef<string[]>([]);

  const [informesMenuAbierto, setInformesMenuAbierto] = useState(false);
  // Modo "Seleccionar": tildar obras a mano para agregarlas a una selección (base de los dossiers).
  const [modoSeleccion, setModoSeleccion] = useState(false);
  // Selección "activa": se tildan las obras que se quieren sumar y "Agregar seleccionadas" las guarda en ella.
  const [seleccionesLista, setSeleccionesLista] = useState<Seleccion[]>([]);
  const [seleccionActivaId, setSeleccionActivaId] = useState<number | "nueva" | null>(null);
  const [nombreNuevaSeleccion, setNombreNuevaSeleccion] = useState("");
  const [idsEnActiva, setIdsEnActiva] = useState<Set<number>>(new Set());
  // Obras tildadas que todavía no se agregaron a la selección activa.
  const [elegidas, setElegidas] = useState<Set<number>>(new Set());
  const [seleccionMensaje, setSeleccionMensaje] = useState<string | null>(null);
  // Filtro por selección: limita la lista (y por lo tanto los informes) a las obras de esa selección.
  const [filtroSeleccionId, setFiltroSeleccionId] = useState<number | null>(seleccionInicialId ?? null);
  const [idsFiltroSeleccion, setIdsFiltroSeleccion] = useState<Set<number> | null>(null);
  const [seleccionesParaFiltro, setSeleccionesParaFiltro] = useState<Seleccion[]>([]);

  useEffect(() => {
    if (!context) return;
    listSelecciones(context.db).then(setSeleccionesParaFiltro).catch(() => setSeleccionesParaFiltro([]));
  }, [context]);

  useEffect(() => {
    if (!context || filtroSeleccionId === null) {
      setIdsFiltroSeleccion(null);
      return;
    }
    listObraIdsDeSeleccion(context.db, filtroSeleccionId)
      .then((ids) => setIdsFiltroSeleccion(new Set(ids)))
      .catch(() => setIdsFiltroSeleccion(new Set()));
  }, [context, filtroSeleccionId]);
  const activaId = typeof seleccionActivaId === "number" ? seleccionActivaId : null;

  async function recargarSelecciones() {
    if (!context) return;
    setSeleccionesLista(await listSelecciones(context.db));
  }

  useEffect(() => {
    if (!context || !modoSeleccion) return;
    recargarSelecciones().catch((err) => setError(err instanceof Error ? err.message : String(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context, modoSeleccion]);

  async function elegirSeleccion(valor: string) {
    setSeleccionMensaje(null);
    setElegidas(new Set());
    if (valor === "nueva") {
      setSeleccionActivaId("nueva");
      setIdsEnActiva(new Set());
    } else if (valor === "") {
      setSeleccionActivaId(null);
      setIdsEnActiva(new Set());
    } else {
      const id = Number(valor);
      setSeleccionActivaId(id);
      setIdsEnActiva(new Set(await listObraIdsDeSeleccion(context!.db, id)));
    }
  }

  async function crearYUsarSeleccion() {
    const nombre = nombreNuevaSeleccion.trim();
    if (!context || !nombre) return;
    try {
      const id = await crearSeleccion(context.db, nombre);
      setNombreNuevaSeleccion("");
      await recargarSelecciones();
      setSeleccionActivaId(id);
      setIdsEnActiva(new Set());
      setElegidas(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  // Tilda o destilda una obra. Las que ya están en la selección activa no se pueden volver a tildar.
  function alternarElegida(id: number) {
    if (activaId === null) {
      setSeleccionMensaje(t("selecciones.primeroElegir"));
      return;
    }
    if (idsEnActiva.has(id)) return;
    setSeleccionMensaje(null);
    setElegidas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function agregarSeleccionadas() {
    if (!context || activaId === null || elegidas.size === 0) return;
    try {
      const cantidad = elegidas.size;
      // En el orden en que aparecen en la lista.
      const ids = filteredObras.map((o) => o.id).filter((id) => elegidas.has(id));
      const resto = Array.from(elegidas).filter((id) => !ids.includes(id));
      await agregarObrasASeleccion(context.db, activaId, [...ids, ...resto]);
      setIdsEnActiva(new Set(await listObraIdsDeSeleccion(context.db, activaId)));
      await recargarSelecciones();
      setElegidas(new Set());
      const nombre = seleccionesLista.find((sel) => sel.id === activaId)?.nombre ?? "";
      setSeleccionMensaje(t("selecciones.agregadas", { cantidad, nombre }));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  useEffect(() => {
    if (!context) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const rows = await context!.db.query<ObraRow>(
          SQL_OBRA_ROWS(),
        );
        if (cancelled) return;
        setObras(rows);

        const { urls, objectUrls } = await leerMiniaturasPorIdEnParalelo(
          context!.fs,
          rows,
          (obra) => obra.id,
          (obra) => obra.miniatura_path,
        );
        objectUrlsRef.current.push(...objectUrls);
        if (!cancelled) setThumbnails(urls);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
      for (const url of objectUrlsRef.current) URL.revokeObjectURL(url);
      objectUrlsRef.current = [];
    };
  }, [context]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const obra of obras) for (const tag of parseTags(obra.tags)) set.add(tag);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [obras]);

  const esRegistroPersonal = context?.workspace === "personal";
  const esGaleria = !esRegistroPersonal;

  const allArtistas = useMemo(() => {
    const map = new Map<number, string>();
    for (const obra of obras) {
      if (obra.artista_id != null && obra.nombre_completo != null) map.set(obra.artista_id, obra.nombre_completo);
    }
    return Array.from(map.entries())
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [obras]);

  const allCategorias = useMemo(() => {
    const set = new Set<CategoriaObra>();
    for (const obra of obras) set.add(obra.categoria_obra);
    return Array.from(set).sort();
  }, [obras]);

  const allSubtipos = useMemo(() => {
    const map = new Map<string, { categoria: CategoriaObra; subtipo: string }>();
    for (const obra of obras) {
      if (selectedCategoria && obra.categoria_obra !== selectedCategoria) continue;
      const subtipoValor = obra.categoria_obra === "Fotografia" ? obra.subtipo_fotografia : obra.subtipo;
      if (subtipoValor) {
        map.set(`${obra.categoria_obra}:${subtipoValor}`, { categoria: obra.categoria_obra, subtipo: subtipoValor });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.subtipo.localeCompare(b.subtipo));
  }, [obras, selectedCategoria]);

  const filteredObras = useMemo(() => {
    const busquedaNorm = busqueda.trim().toLowerCase();
    const filtradas = obras.filter((o) => {
      if (filtroSeleccionId !== null && !(idsFiltroSeleccion?.has(o.id) ?? false)) return false;
      if (calificacionFiltro > 0 && o.calificacion !== calificacionFiltro) return false;
      if (selectedTags.length > 0 && !selectedTags.some((tag) => parseTags(o.tags).includes(tag))) return false;
      if (esGaleria && selectedArtistaId !== null && o.artista_id !== selectedArtistaId) return false;
      if (selectedCategoria && o.categoria_obra !== selectedCategoria) return false;
      if (selectedSubtipo) {
        const subtipoValor = o.categoria_obra === "Fotografia" ? o.subtipo_fotografia : o.subtipo;
        if (subtipoValor !== selectedSubtipo) return false;
      }
      if (!busquedaNorm) return true;
      const enTitulo = o.titulo.toLowerCase().includes(busquedaNorm);
      const enArtista = !esRegistroPersonal && (o.nombre_completo ?? "").toLowerCase().includes(busquedaNorm);
      const enNumero = String(o.id).includes(busquedaNorm);
      const enCodigoInventario = (o.codigo_inventario ?? "").toLowerCase().includes(busquedaNorm);
      // En Personal el buscador es solo por título: el filtro de etiquetas ya
      // tiene su propio desplegable, no hace falta que el buscador tambien
      // matchee por etiqueta ahi.
      const enEtiquetas = !esRegistroPersonal && parseTags(o.tags).some((tag) => tag.toLowerCase().includes(busquedaNorm));
      return enTitulo || enArtista || enNumero || enCodigoInventario || enEtiquetas;
    });

    if (ordenPor === "codigo_inventario") {
      return [...filtradas].sort((a, b) => {
        if (!a.codigo_inventario && !b.codigo_inventario) return 0;
        if (!a.codigo_inventario) return 1;
        if (!b.codigo_inventario) return -1;
        return a.codigo_inventario.localeCompare(b.codigo_inventario, undefined, { sensitivity: "base", numeric: true });
      });
    }
    if (ordenPor === "fecha_captura") {
      // Solo Fotografia tiene fecha de captura; el resto de las categorias
      // (sin ese dato) va al final, igual que sin codigo de inventario.
      return [...filtradas].sort((a, b) => {
        if (!a.fecha_captura && !b.fecha_captura) return 0;
        if (!a.fecha_captura) return 1;
        if (!b.fecha_captura) return -1;
        return a.fecha_captura.localeCompare(b.fecha_captura);
      });
    }
    return [...filtradas].sort((a, b) => a.titulo.localeCompare(b.titulo, undefined, { sensitivity: "base" }));
  }, [
    obras,
    selectedTags,
    selectedArtistaId,
    selectedCategoria,
    selectedSubtipo,
    busqueda,
    calificacionFiltro,
    filtroSeleccionId,
    idsFiltroSeleccion,
    esRegistroPersonal,
    esGaleria,
    ordenPor,
  ]);

  async function handleSetCalificacion(obraId: number, nuevaCalificacion: number) {
    const obraActual = obras.find((o) => o.id === obraId);
    const anterior = obraActual?.calificacion ?? 0;
    setObras((prev) => prev.map((o) => (o.id === obraId ? { ...o, calificacion: nuevaCalificacion } : o)));
    try {
      await context!.db.execute("UPDATE obra SET calificacion = ? WHERE id = ?", [nuevaCalificacion, obraId]);
    } catch (err) {
      setObras((prev) => prev.map((o) => (o.id === obraId ? { ...o, calificacion: anterior } : o)));
      setError(err instanceof Error ? err.message : String(err));
      return;
    }
    // La calificacion en Recer ya quedo guardada (arriba); esto es aparte,
    // una sincronizacion "mejor esfuerzo" hacia el sidecar XMP del archivo
    // original, que si falla no debe deshacer lo que ya se guardo en Recer.
    if (obraActual?.ubicacion_fisica_actual) {
      try {
        await sincronizarCalificacionConArchivo(obraActual.ubicacion_fisica_actual, nuevaCalificacion);
      } catch (err) {
        setError(t("galeria.errorGuardarCalificacionArchivo", { mensaje: err instanceof Error ? err.message : String(err) }));
      }
    }
  }

  async function handleQuitarCalificacionATodas() {
    const previo = obras;
    setObras((prev) => prev.map((o) => ({ ...o, calificacion: 0 })));
    try {
      await context!.db.execute("UPDATE obra SET calificacion = 0 WHERE calificacion != 0");
      setCalificacionFiltro(0);
    } catch (err) {
      setObras(previo);
      setError(err instanceof Error ? err.message : String(err));
      return;
    }
    const conArchivo = previo.filter((o) => o.calificacion !== 0 && o.ubicacion_fisica_actual);
    const resultados = await Promise.allSettled(
      conArchivo.map((o) => sincronizarCalificacionConArchivo(o.ubicacion_fisica_actual!, 0)),
    );
    const fallidos = resultados.filter((r) => r.status === "rejected").length;
    if (fallidos > 0) {
      setError(t("galeria.errorGuardarCalificacionArchivoVarias", { n: fallidos }));
    }
  }

  function handleCategoriaChange(value: string) {
    setSelectedCategoria(value === "" ? null : (value as CategoriaObra));
    setSelectedSubtipo(null);
  }

  function handleTamanoMiniaturasChange(columnas: number) {
    if (vista === "imagenes") {
      setColumnasGridImagenes(columnas);
      guardarColumnasGrid(COLUMNAS_OBRAS_IMAGENES_STORAGE_KEY, columnas);
    } else if (vista === "tarjetas") {
      setColumnasGridTarjetas(columnas);
      guardarColumnasGrid(COLUMNAS_OBRAS_TARJETAS_STORAGE_KEY, columnas);
    } else {
      setColumnasGridColumnas(columnas);
      guardarColumnasGrid(COLUMNAS_OBRAS_COLUMNAS_STORAGE_KEY, columnas);
    }
  }

  function handleVistaChange(nueva: VistaObras) {
    setVista(nueva);
    guardarVista(nueva);
  }

  function alternarAcceso(editor: keyof EditoresActivos) {
    const nuevo = { ...accesos, [editor]: !accesos[editor] };
    setAccesos(nuevo);
    try {
      localStorage.setItem(ACCESOS_EDITORES_STORAGE_KEY, JSON.stringify(nuevo));
    } catch {
      // No se pudo guardar la preferencia.
    }
  }

  function alternarFiltros() {
    const abrir = !filtrosAbiertos;
    setFiltrosAbiertos(abrir);
    try {
      localStorage.setItem(FILTROS_ABIERTOS_STORAGE_KEY, abrir ? "1" : "0");
    } catch {
      // No se pudo guardar la preferencia.
    }
  }

  function handleAbrirInformesMenu() {
    setInformesMenuAbierto(true);
  }

  if (!context) return null;

  // Filtros puestos: se muestran siempre (con el panel abierto o cerrado) y cada uno se puede quitar por separado.
  const filtrosPuestos: { clave: string; texto: string; quitar: () => void }[] = [];
  if (selectedCategoria) {
    filtrosPuestos.push({
      clave: "categoria",
      texto: t(`categoria.${selectedCategoria}` as TranslationKey),
      quitar: () => handleCategoriaChange(""),
    });
  }
  if (selectedSubtipo) {
    const entrada = allSubtipos.find((e) => e.subtipo === selectedSubtipo);
    filtrosPuestos.push({
      clave: "subtipo",
      texto: entrada ? t(subtipoTranslationKey(entrada.categoria, entrada.subtipo)) : selectedSubtipo,
      quitar: () => setSelectedSubtipo(null),
    });
  }
  if (filtroSeleccionId !== null) {
    const nombre = seleccionesParaFiltro.find((sel) => sel.id === filtroSeleccionId)?.nombre ?? "";
    filtrosPuestos.push({
      clave: "seleccion",
      texto: `${t("selecciones.filtroLabel")}: ${nombre}`,
      quitar: () => setFiltroSeleccionId(null),
    });
  }
  if (esGaleria && selectedArtistaId !== null) {
    filtrosPuestos.push({
      clave: "artista",
      texto: allArtistas.find((a) => a.id === selectedArtistaId)?.nombre ?? "",
      quitar: () => setSelectedArtistaId(null),
    });
  }
  if (calificacionFiltro > 0) {
    filtrosPuestos.push({
      clave: "calificacion",
      texto: `${t("obrasList.colCalificacion")}: ${calificacionFiltro} ★`,
      quitar: () => setCalificacionFiltro(0),
    });
  }
  for (const tag of selectedTags) {
    filtrosPuestos.push({
      clave: `etiqueta:${tag}`,
      texto: tag,
      quitar: () => setSelectedTags((prev) => prev.filter((x) => x !== tag)),
    });
  }

  function limpiarFiltros() {
    handleCategoriaChange("");
    setFiltroSeleccionId(null);
    setSelectedArtistaId(null);
    setCalificacionFiltro(0);
    setSelectedTags([]);
  }

  // Recorrido de ayuda de la sección (botón "?" del encabezado): un paso por botón u opción.
  const paso = (id: string, key: TranslationKey, titulo: string): PasoRecorrido => ({
    targetSelector: `[data-recorrido="${id}"]`,
    titulo,
    texto: t(key),
  });
  const pasosAyuda: PasoRecorrido[] = [
    paso("obras-nueva", "ayudaObras.nueva", t("workspaceHome.nuevaObra")),
    paso("obras-buscar", "ayudaObras.buscar", t("obrasList.ayudaBuscar")),
    paso("obras-filtros", "ayudaObras.filtros", t("obrasList.filtros")),
    paso("obras-categoria", "ayudaObras.categoria", t("obraForm.categoriaLabel")),
    paso("obras-subtipo", "ayudaObras.subtipo", t("field.subtipo")),
    paso("obras-filtro-seleccion", "ayudaObras.filtroSeleccion", t("selecciones.filtroLabel")),
    paso("obras-artista", "ayudaObras.artista", t("obraForm.artistaLabel")),
    paso("obras-estrellas", "ayudaObras.estrellas", t("obrasList.colCalificacion")),
    paso("obras-etiquetas", "ayudaObras.etiquetas", t("obraForm.etiquetasLabel")),
    paso("obras-selecciones", "ayudaObras.selecciones", t("selecciones.boton")),
    paso("obras-seleccionar", "ayudaObras.seleccionar", t("selecciones.seleccionar")),
    paso("obras-informe", "ayudaObras.informe", t("informesObras.generarInforme")),
    paso("obras-accesos", "ayudaObras.accesos", t("obrasList.accesosTitulo")),
    paso("obras-orden", "ayudaObras.orden", t("obrasList.ordenarPorLabel")),
    paso("obras-vista", "ayudaObras.vista", t("obrasList.vistaColumnas") + " / " + t("obrasList.vistaTarjetas") + " / " + t("selecciones.vistaImagenes")),
    paso("obras-tamano", "ayudaObras.tamano", t("obrasList.tamanoMiniaturasLabel")),
    paso("obras-obra", "ayudaObras.obra", t("obrasList.colObra")),
  ];

  return (
    <div className="obras-list obras-list-grid-ancho">
      <div className="obras-encabezado-fijo">
      <div className="obras-list-header">
        <h1>{t("obrasList.title")}</h1>
        <div className="header-actions">
          <button type="button" className="selecciones-principal obras-nueva-boton" data-recorrido="obras-nueva" onClick={onNuevaObra}>
            + {t("workspaceHome.nuevaObra")}
          </button>
          <AyudaSeccion pasos={pasosAyuda} />
          <button type="button" className="header-close-button" onClick={onBack} aria-label={t("common.back")} title={t("common.back")}>
            ✕
          </button>
        </div>
      </div>

      <div className="obras-toolbar obras-toolbar-ordenada">
        {obras.length > 0 && (
          <div className="obras-toolbar-fila obras-busqueda-fila">
            <div className="buscador-con-ayuda obras-list-buscador-fila-principal" data-recorrido="obras-buscar">
              <input
                type="search"
                className="obras-list-buscador"
                placeholder={t("obrasList.buscarPlaceholder")}
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              <HelpIcon fieldKey="busqueda_general" />
            </div>
            <button
              type="button"
              data-recorrido="obras-filtros"
              className={filtrosAbiertos ? "obras-vista-toggle-boton activo" : "obras-vista-toggle-boton"}
              aria-expanded={filtrosAbiertos}
              onClick={alternarFiltros}
            >
              {t("obrasList.filtros")}
              {filtrosPuestos.length > 0 && ` (${filtrosPuestos.length})`} {filtrosAbiertos ? "▴" : "▾"}
            </button>
          </div>
        )}

        {obras.length > 0 && filtrosAbiertos && (
          <div className="obras-filtros-panel">
            {allCategorias.length > 0 && (
              <label className="galeria-filtro-artista" data-recorrido="obras-categoria">
                {t("obraForm.categoriaLabel")}
                <select value={selectedCategoria ?? ""} onChange={(e) => handleCategoriaChange(e.target.value)}>
                  <option value="">{t("galeria.todasCategorias")}</option>
                  {allCategorias.map((cat) => (
                    <option key={cat} value={cat}>
                      {t(`categoria.${cat}` as TranslationKey)}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {allSubtipos.length > 0 && (
              <label className="galeria-filtro-artista" data-recorrido="obras-subtipo">
                {t("field.subtipo")}
                <select value={selectedSubtipo ?? ""} onChange={(e) => setSelectedSubtipo(e.target.value || null)}>
                  <option value="">{t("galeria.todosSubtipos")}</option>
                  {allSubtipos.map((entry) => (
                    <option key={`${entry.categoria}:${entry.subtipo}`} value={entry.subtipo}>
                      {t(subtipoTranslationKey(entry.categoria, entry.subtipo))}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {seleccionesParaFiltro.length > 0 && (
              <label className="galeria-filtro-artista" data-recorrido="obras-filtro-seleccion">
                {t("selecciones.filtroLabel")}
                <select
                  value={filtroSeleccionId ?? ""}
                  onChange={(e) => setFiltroSeleccionId(e.target.value === "" ? null : Number(e.target.value))}
                >
                  <option value="">{t("selecciones.filtroTodas")}</option>
                  {seleccionesParaFiltro.map((sel) => (
                    <option key={sel.id} value={sel.id}>
                      {sel.nombre} ({sel.cantidad})
                    </option>
                  ))}
                </select>
              </label>
            )}

            {esGaleria && allArtistas.length > 0 && (
              <label className="galeria-filtro-artista" data-recorrido="obras-artista">
                {t("obraForm.artistaLabel")}
                <select value={selectedArtistaId ?? ""} onChange={(e) => setSelectedArtistaId(e.target.value === "" ? null : Number(e.target.value))}>
                  <option value="">{t("galeria.todosArtistas")}</option>
                  {allArtistas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="obras-filtros-campo" data-recorrido="obras-estrellas">
              {t("obrasList.colCalificacion")}
              <CalificacionFilterButton
                calificacionFiltro={calificacionFiltro}
                onChange={setCalificacionFiltro}
                onQuitarATodas={handleQuitarCalificacionATodas}
              />
            </div>
            {allTags.length > 0 && (
              <div className="obras-filtros-campo" data-recorrido="obras-etiquetas">
                <span className="galeria-filtro-etiquetas-label">
                  {t("obraForm.etiquetasLabel")} <HelpIcon fieldKey="filtro_etiquetas_multiple" />
                </span>
                <TagFilterPicker opciones={allTags} value={selectedTags} onChange={setSelectedTags} />
              </div>
            )}
          </div>
        )}

        {filtrosPuestos.length > 0 && (
          <div className="obras-toolbar-fila obras-filtros-puestos">
            {filtrosPuestos.map((f) => (
              <span key={f.clave} className="tag-chip tag-chip-removable">
                {f.texto}
                <button type="button" onClick={f.quitar} aria-label={t("obrasList.quitarFiltro", { filtro: f.texto })}>
                  ×
                </button>
              </span>
            ))}
            <button type="button" onClick={limpiarFiltros}>
              {t("obrasList.limpiarFiltros")}
            </button>
          </div>
        )}

        <div className="obras-toolbar-fila obras-acciones-fila">
          <button type="button" data-recorrido="obras-selecciones" onClick={onVerSelecciones}>
            {t("selecciones.boton")}
          </button>
          {obras.length > 0 && (
            <button
              type="button"
              data-recorrido="obras-seleccionar"
              className={modoSeleccion ? "obras-vista-toggle-boton activo" : undefined}
              onClick={() => {
                setModoSeleccion((m) => !m);
                setElegidas(new Set());
              }}
            >
              {modoSeleccion ? t("selecciones.terminarSeleccion") : t("selecciones.seleccionar")}
            </button>
          )}
          {obras.length > 0 && (
            <button type="button" data-recorrido="obras-informe" onClick={handleAbrirInformesMenu} disabled={filteredObras.length === 0}>
              {t("informesObras.generarInforme")}
            </button>
          )}
          {obras.length > 0 && (
            <div className="obras-accesos-botones" data-recorrido="obras-accesos">
              <span>{t("obrasList.accesosTitulo")}</span>
              {(
                [
                  ["lightroom", "Lightroom Classic"],
                  ["photoshop", "Photoshop"],
                ] as const
              ).map(([editor, nombre]) => (
                <button
                  key={editor}
                  type="button"
                  aria-pressed={accesos[editor]}
                  className={accesos[editor] ? "obras-vista-toggle-boton activo" : "obras-vista-toggle-boton"}
                  onClick={() => alternarAcceso(editor)}
                >
                  {accesos[editor] ? "✓ " : ""}
                  {nombre}
                </button>
              ))}
            </div>
          )}
        </div>

        {modoSeleccion && (
          <div className="obras-toolbar-fila obras-seleccion-panel">
            <label className="galeria-filtro-artista">
              {t("selecciones.activa")}
              <select value={seleccionActivaId ?? ""} onChange={(e) => elegirSeleccion(e.target.value)}>
                <option value="">{t("selecciones.elegirActiva")}</option>
                {seleccionesLista.map((sel) => (
                  <option key={sel.id} value={sel.id}>
                    {sel.nombre} ({sel.cantidad})
                  </option>
                ))}
                <option value="nueva">{t("selecciones.nuevaOpcion")}</option>
              </select>
            </label>
            {seleccionActivaId === "nueva" && (
              <>
                <input
                  type="text"
                  value={nombreNuevaSeleccion}
                  placeholder={t("selecciones.nuevaNombre")}
                  onChange={(e) => setNombreNuevaSeleccion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && crearYUsarSeleccion()}
                  autoFocus
                />
                <button type="button" onClick={crearYUsarSeleccion} disabled={!nombreNuevaSeleccion.trim()}>
                  {t("selecciones.crearYUsar")}
                </button>
              </>
            )}
            {activaId !== null && (
              <>
                <span className="selecciones-contador-grande" role="status">
                  {t("selecciones.contadorElegidas", { cantidad: elegidas.size })}
                </span>
                <button type="button" onClick={agregarSeleccionadas} disabled={elegidas.size === 0}>
                  {t("selecciones.agregarSeleccionadas")}
                </button>
                <span className="selecciones-ya-en">{t("selecciones.enActiva", { cantidad: idsEnActiva.size })}</span>
              </>
            )}
            {activaId === null && seleccionActivaId !== "nueva" && <span>{t("selecciones.primeroElegir")}</span>}
          </div>
        )}

        {obras.length > 0 && (
          <div className="obras-toolbar-fila obras-ver-fila">
            <span className="obras-cantidad" role="status">
              {filteredObras.length === obras.length
                ? t("obrasList.cantidadTotal", { total: obras.length })
                : t("obrasList.cantidadFiltrada", { n: filteredObras.length, total: obras.length })}
            </span>
            <label className="galeria-filtro-artista" data-recorrido="obras-orden">
              {t("obrasList.ordenarPorLabel")}
              <select value={ordenPor} onChange={(e) => setOrdenPor(e.target.value as "titulo" | "codigo_inventario" | "fecha_captura")}>
                <option value="codigo_inventario">{t("obrasList.ordenarPorCodigoInventario")}</option>
                <option value="titulo">{t("obrasList.ordenarPorTitulo")}</option>
                <option value="fecha_captura">{t("obrasList.ordenarPorFechaCaptura")}</option>
              </select>
            </label>
            <div className="obras-ver-vistas">
              <div className="obras-vista-toggle" data-recorrido="obras-vista">
              <button
                type="button"
                className={vista === "columnas" ? "obras-vista-toggle-boton activo" : "obras-vista-toggle-boton"}
                onClick={() => handleVistaChange("columnas")}
              >
                {t("obrasList.vistaColumnas")}
              </button>
              <button
                type="button"
                className={vista === "tarjetas" ? "obras-vista-toggle-boton activo" : "obras-vista-toggle-boton"}
                onClick={() => handleVistaChange("tarjetas")}
              >
                {t("obrasList.vistaTarjetas")}
              </button>
              <button
                type="button"
                className={vista === "imagenes" ? "obras-vista-toggle-boton activo" : "obras-vista-toggle-boton"}
                onClick={() => handleVistaChange("imagenes")}
              >
                {t("selecciones.vistaImagenes")}
              </button>
              </div>
              <span className="obras-recorrido-envoltorio" data-recorrido="obras-tamano">
                <MiniaturasSizeSlider columnas={columnasGridActual} onChange={handleTamanoMiniaturasChange} />
              </span>
            </div>
          </div>
        )}
      </div>
      </div>

      {loading && <p>{t("common.loading")}</p>}
      {error && (
        <p className="error" role="alert">
          ⚠️ {error}
        </p>
      )}

      {!loading && obras.length === 0 && <p>{t("obrasList.sinObras")}</p>}

      {seleccionMensaje && (
        <p role="status" onClick={() => setSeleccionMensaje(null)}>
          {seleccionMensaje}
        </p>
      )}
      {!loading && obras.length > 0 && filteredObras.length === 0 && <p>{t("obrasList.sinResultados")}</p>}

      {vista === "imagenes" && (
        <GrillaImagenes
          obras={filteredObras}
          thumbs={thumbnails}
          columnas={columnasGridImagenes}
          onCalificar={handleSetCalificacion}
          onAbrirFicha={(id) => onOpenObra(id)}
          onError={setError}
          accesos={accesos}
          seleccion={
            modoSeleccion ? { elegidas, yaEnSeleccion: idsEnActiva, alternar: alternarElegida } : undefined
          }
        />
      )}

      {vista === "tarjetas" && (
      <div className="obras-grid" style={{ gridTemplateColumns: `repeat(${columnasGridTarjetas}, 1fr)` }}>
        {filteredObras.map((obra, indice) => (
          <div className="obra-card-wrapper con-accesos" key={obra.id} data-recorrido={indice === 0 ? "obras-obra" : undefined}>
            {modoSeleccion && (
              <input
                type="checkbox"
                checked={idsEnActiva.has(obra.id) || elegidas.has(obra.id)}
                disabled={idsEnActiva.has(obra.id)}
                onChange={() => alternarElegida(obra.id)}
                style={{ position: "absolute", top: 8, left: 8, zIndex: 2, width: 22, height: 22 }}
              />
            )}
            <button
              type="button"
              className="obra-card"
              style={
                modoSeleccion && elegidas.has(obra.id)
                  ? { outline: "3px solid var(--azul-marino-borde)" }
                  : modoSeleccion && idsEnActiva.has(obra.id)
                    ? { outline: "2px dotted var(--azul-marino-borde)", opacity: 0.75 }
                    : undefined
              }
              onClick={() => (modoSeleccion ? alternarElegida(obra.id) : onOpenObra(obra.id))}
            >
            {thumbnails[obra.id] ? (
              <img
                src={thumbnails[obra.id]}
                alt={obra.titulo}
                onLoad={(e) => marcarSiMiniaturaMuyVertical(e.currentTarget)}
                onContextMenu={(e) => abrirMenuImagen(e, obra)}
              />
            ) : (
              <div className="obra-card-placeholder" onContextMenu={(e) => abrirMenuImagen(e, obra)}>
                {t("obrasList.sinImagen")}
              </div>
            )}
            <ObraTarjetaInfo obra={obra} />
            </button>
            {!modoSeleccion && <AccesosEditores obra={obra} activos={accesos} onError={setError} />}
            <StarRating value={obra.calificacion} onChange={(n) => handleSetCalificacion(obra.id, n)} />
          </div>
        ))}
      </div>
      )}

      {vista === "columnas" && (
        <div className="obras-tabla-wrapper">
          <table className="obras-tabla">
            <thead>
              <tr>
                <th>{t("obrasList.colImagen")}</th>
                <th>{t("obrasList.colObra")}</th>
                {esGaleria && <th>{t("informesObras.colAutor")}</th>}
                <th>{t("informesObras.colCategoria")}</th>
                <th>{t("informesObras.colSubcategoria")}</th>
                <th>{t("obrasList.colDisponibilidad")}</th>
                <th>{t("obrasList.colCalificacion")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredObras.map((obra, indice) => {
                const subtipoValor = obra.categoria_obra === "Fotografia" ? obra.subtipo_fotografia : obra.subtipo;
                return (
                  <tr key={obra.id} className="obras-tabla-fila" data-recorrido={indice === 0 ? "obras-obra" : undefined} onClick={() => (modoSeleccion ? alternarElegida(obra.id) : onOpenObra(obra.id))}>
                    <td>
                      {modoSeleccion && (
                        <input type="checkbox" checked={idsEnActiva.has(obra.id) || elegidas.has(obra.id)} disabled={idsEnActiva.has(obra.id)} readOnly />
                      )}
                      <span className="obras-tabla-miniatura-caja con-accesos">
                        {thumbnails[obra.id] ? (
                          <img
                            src={thumbnails[obra.id]}
                            alt={obra.titulo}
                            className="obras-tabla-miniatura"
                            style={{ width: anchoMiniaturaTabla(columnasGridColumnas) }}
                            onContextMenu={(e) => abrirMenuImagen(e, obra)}
                          />
                        ) : (
                          <span
                            className="obras-tabla-sin-imagen"
                            style={{ width: anchoMiniaturaTabla(columnasGridColumnas) }}
                            onContextMenu={(e) => abrirMenuImagen(e, obra)}
                          >
                            {t("obrasList.sinImagen")}
                          </span>
                        )}
                        {!modoSeleccion && <AccesosEditores obra={obra} activos={accesos} onError={setError} />}
                      </span>
                    </td>
                    <td>
                      <strong>{obra.titulo}</strong>
                      {obra.codigo_inventario && (
                        <>
                          <br />
                          <span className="obra-card-sku">
                            {t("obrasList.skuPrefix")} {obra.codigo_inventario}
                          </span>
                        </>
                      )}
                    </td>
                    {esGaleria && <td>{obra.nombre_completo}</td>}
                    <td>{t(`categoria.${obra.categoria_obra}` as TranslationKey)}</td>
                    <td>{subtipoValor ? t(subtipoTranslationKey(obra.categoria_obra, subtipoValor)) : "—"}</td>
                    <td>
                      <ObraDisponibilidad obra={obra} />
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <StarRating value={obra.calificacion} onChange={(n) => handleSetCalificacion(obra.id, n)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="screen-footer-back">
        <button type="button" onClick={onBack}>
          {t("common.back")}
        </button>
      </div>

      {informesMenuAbierto && <InformeListadoObrasModal obras={filteredObras} onClose={() => setInformesMenuAbierto(false)} />}
      {elementosMenuImagen}
    </div>
  );
}
