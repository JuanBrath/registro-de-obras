import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { InformeListadoObrasModal, SQL_INFORME_OBRAS, type InformeObraRow } from "../components/InformeListadoObrasModal.js";
import { NotasLabel } from "../components/NotasLabel.js";
import { SelectorObras } from "../components/SelectorObras.js";
import { useMenuExportarImagen } from "../components/useMenuExportarImagen.js";
import { AyudaSeccion, pasoAyuda } from "../components/AyudaSeccion.js";
import { ExportarSeleccionModal } from "../components/ExportarSeleccionModal.js";
import { DossierModal } from "../components/DossierModal.js";
import { DossiersGuardadosModal } from "../components/DossiersGuardadosModal.js";
import { GrillaImagenes } from "../components/GrillaImagenes.js";
import { useWorkspace } from "../state/WorkspaceContext.js";
import { useLanguage } from "../i18n/LanguageContext.js";
import { leerMiniaturasPorIdEnParalelo } from "../utils/imageObjectUrl.js";
import { ObraDisponibilidad, ObraTarjetaInfo, SQL_OBRA_ROWS, anchoMiniaturaTabla, type ObraRow } from "../components/ObraVista.js";
import { MiniaturasSizeSlider } from "../components/MiniaturasSizeSlider.js";
import { StarRating } from "../components/StarRating.js";
import { subtipoTranslationKey } from "./fields/ObraDetalleFields.js";
import { cargarColumnasGridInicial, guardarColumnasGrid } from "../utils/columnasGrid.js";
import { marcarSiMiniaturaMuyVertical } from "../utils/miniaturaVertical.js";
import { sincronizarCalificacionConArchivo } from "../utils/calificacionArchivo.js";
import type { TranslationKey } from "../i18n/LanguageContext.js";
import {
  actualizarSeleccion,
  agregarObrasASeleccion,
  asignarGrupo,
  crearGrupo,
  crearSeleccion,
  eliminarGrupo,
  listGrupos,
  renombrarGrupo,
  type GrupoSelecciones,
  contarDossiers,
  eliminarSeleccion,
  listDossiers,
  listObraIdsDeSeleccion,
  listSelecciones,
  quitarObraDeSeleccion,
  reordenarSeleccion,
  type Seleccion,
} from "../data/selecciones.js";

// Misma presentación que Obras (tarjetas o columnas), con su propio tamaño de miniaturas guardado aparte.
const COLUMNAS_TARJETAS_KEY = "seleccionesColumnasGrid";
const COLUMNAS_COLUMNAS_KEY = "seleccionesColumnasGridVistaColumnas";
const COLUMNAS_IMAGENES_KEY = "seleccionesColumnasGridImagenes";
const VISTA_KEY = "seleccionesVista";
type Vista = "tarjetas" | "columnas" | "imagenes";

function cargarVista(): Vista {
  try {
    const v = localStorage.getItem(VISTA_KEY);
    if (v === "tarjetas" || v === "columnas" || v === "imagenes") return v;
  } catch {
    // localStorage no disponible: se usa el valor por defecto.
  }
  return "tarjetas";
}

/** Lista de selecciones que muestra solo dos renglones y un botón para desplegarlas todas. Plegada, la selección
 * elegida va primero para que siempre quede a la vista. */
function ListaSelecciones({
  selecciones,
  activaId,
  expandida,
  onToggle,
  onElegir,
  extra,
}: {
  /** Botón que va a continuación de los de las selecciones, en el mismo renglón. */
  extra?: React.ReactNode;
  selecciones: Seleccion[];
  activaId: number | null;
  expandida: boolean;
  onToggle: () => void;
  onElegir: (id: number) => void;
}) {
  const { t } = useLanguage();
  const contenedorRef = useRef<HTMLDivElement | null>(null);
  const [altoPlegado, setAltoPlegado] = useState<number | null>(null);

  const ordenadas = expandida
    ? selecciones
    : [...selecciones].sort((a, b) => Number(b.id === activaId) - Number(a.id === activaId));

  // Mide cuántos renglones ocupan los nombres: si pasan de dos, se ofrece "Mostrar más" y plegado se recorta al segundo.
  useLayoutEffect(() => {
    const el = contenedorRef.current;
    if (!el) return;
    const medir = () => {
      const tops = [...new Set(Array.from(el.children).map((c) => (c as HTMLElement).offsetTop))].sort((a, b) => a - b);
      if (tops.length <= 2) {
        setAltoPlegado(null);
        return;
      }
      const gap = parseFloat(getComputedStyle(el).rowGap) || 0;
      setAltoPlegado(tops[2] - tops[0] - gap);
    };
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    return () => observador.disconnect();
  }, [selecciones, expandida, activaId]);

  const hayDesborde = altoPlegado !== null;
  return (
    <>
      <div
        ref={contenedorRef}
        className="obras-toolbar-fila selecciones-lista-plegable"
        data-recorrido="sel-lista"
        style={!expandida && hayDesborde ? { maxHeight: altoPlegado, overflow: "hidden" } : undefined}
      >
        {ordenadas.map((s) => (
          <button
            key={s.id}
            type="button"
            className={s.id === activaId ? "obras-vista-toggle-boton activo" : "obras-vista-toggle-boton"}
            onClick={() => onElegir(s.id)}
          >
            {s.nombre} ({s.cantidad})
          </button>
        ))}
        {extra}
      </div>
      {(hayDesborde || expandida) && (
        <button type="button" className="selecciones-mostrar-mas" onClick={onToggle}>
          {expandida ? t("selecciones.mostrarMenos") : t("selecciones.mostrarMas")}
        </button>
      )}
    </>
  );
}

/** Selecciones: grupos de obras elegidos a mano (base de los dossiers en PDF). */
export function SeleccionesScreen({
  onBack,
  onOpenObra,
  seleccionInicialId,
}: {
  onBack: () => void;
  /** Recibe también la selección abierta, para que "Volver" regrese a ella. */
  onOpenObra: (obraId: number, seleccionId: number | null) => void;
  /** Selección que se abre al entrar (al volver desde la ficha de una obra). */
  seleccionInicialId?: number;
}) {
  const { context } = useWorkspace();
  const { t } = useLanguage();
  const [selecciones, setSelecciones] = useState<Seleccion[]>([]);
  const [grupos, setGrupos] = useState<GrupoSelecciones[]>([]);
  // Filtro por grupo de la lista (null = todas) y estado de la lista plegable.
  // Pestaña superior: "selecciones" (lista y alta de selecciones) o "grupos" (grupos y las selecciones de cada uno).
  const [modo, setModo] = useState<"selecciones" | "grupos">("selecciones");
  // Panel para armar el grupo abierto: nombre y selecciones que lo componen.
  const [panelGrupoAbierto, setPanelGrupoAbierto] = useState(false);
  const [grupoActivoId, setGrupoActivoId] = useState<number | null>(null);
  // Grupo nuevo en armado: nombre (nombreGrupo) y selecciones tildadas.
  const [grupoNuevo, setGrupoNuevo] = useState(false);
  const [elegidasGrupoNuevo, setElegidasGrupoNuevo] = useState<number[]>([]);
  const [listaExpandida, setListaExpandida] = useState(false);
  // Grupo de la selección que se está creando o editando.
  const [grupoId, setGrupoId] = useState<number | null>(null);
  const [nombreGrupo, setNombreGrupo] = useState("");
  const [confirmarEliminarGrupo, setConfirmarEliminarGrupo] = useState(false);
  const [activaId, setActivaId] = useState<number | null>(seleccionInicialId ?? null);
  const [obras, setObras] = useState<ObraRow[]>([]);
  const [vista, setVista] = useState<Vista>(cargarVista);
  const [columnasTarjetas, setColumnasTarjetas] = useState(() => cargarColumnasGridInicial(COLUMNAS_TARJETAS_KEY, 4));
  const [columnasImagenes, setColumnasImagenes] = useState(() => cargarColumnasGridInicial(COLUMNAS_IMAGENES_KEY, 4));
  const [columnasColumnas, setColumnasColumnas] = useState(() => cargarColumnasGridInicial(COLUMNAS_COLUMNAS_KEY, 4));
  const [thumbs, setThumbs] = useState<Record<number, string>>({});
  const [nombre, setNombre] = useState("");
  const [notas, setNotas] = useState("");
  const [nueva, setNueva] = useState(false);
  // Obras tildadas al crear una selección nueva (se muestran todas, sin filtros).
  const [elegidasNueva, setElegidasNueva] = useState<number[]>([]);
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { abrirMenu: abrirMenuImagen, elementos: elementosMenuImagen } = useMenuExportarImagen(setError);
  const [dossierAbierto, setDossierAbierto] = useState(false);
  const [guardadosAbierto, setGuardadosAbierto] = useState(false);
  const [exportarAbierto, setExportarAbierto] = useState(false);
  const [informeObras, setInformeObras] = useState<InformeObraRow[] | null>(null);
  const [cantidadDossiers, setCantidadDossiers] = useState(0);
  // Modo "ordenar y quitar": solo mientras está activo se puede arrastrar, mover con flechas y quitar obras, y tocar una
  // obra no abre su ficha (así no se abre por error al arrastrar).
  const [modoOrden, setModoOrden] = useState(false);
  // Alto del encabezado fijo: la barra de vista (tarjetas/columnas, ordenar y tamaño) queda fija justo debajo.
  const encabezadoRef = useRef<HTMLDivElement | null>(null);
  const [altoEncabezado, setAltoEncabezado] = useState(0);
  useEffect(() => {
    const el = encabezadoRef.current;
    if (!el) return;
    const medir = () => setAltoEncabezado(Math.floor(el.getBoundingClientRect().height) - 1);
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    return () => observador.disconnect();
  }, []);
  const [arrastrando, setArrastrando] = useState<number | null>(null);
  const [sobre, setSobre] = useState<number | null>(null);
  const objectUrlsRef = useRef<string[]>([]);

  const recargarLista = useCallback(async () => {
    if (!context) return [];
    const rows = await listSelecciones(context.db);
    setSelecciones(rows);
    const gs = await listGrupos(context.db);
    setGrupos(gs);
    setGrupoActivoId((actual) => (actual !== null && !gs.some((g) => g.id === actual) ? null : actual));
    return rows;
  }, [context]);

  const liberarThumbs = () => {
    for (const url of objectUrlsRef.current) URL.revokeObjectURL(url);
    objectUrlsRef.current = [];
  };

  const cargarObras = useCallback(
    async (seleccionId: number) => {
      if (!context) return;
      const ids = await listObraIdsDeSeleccion(context.db, seleccionId);
      let rows: ObraRow[] = [];
      if (ids.length > 0) {
        const found = await context.db.query<ObraRow>(SQL_OBRA_ROWS(`WHERE obra.id IN (${ids.map(() => "?").join(",")})`), ids);
        const porId = new Map(found.map((o) => [o.id, o]));
        rows = ids.map((id) => porId.get(id)).filter((o): o is ObraRow => !!o);
      }
      setObras(rows);
      liberarThumbs();
      const { urls, objectUrls } = await leerMiniaturasPorIdEnParalelo(
        context.fs,
        rows,
        (o) => o.id,
        (o) => o.miniatura_path,
      );
      objectUrlsRef.current.push(...objectUrls);
      setThumbs(urls);
    },
    [context],
  );

  useEffect(() => {
    recargarLista().catch((e) => setError(e instanceof Error ? e.message : String(e)));
    return liberarThumbs;
  }, [recargarLista]);

  // Carga las obras y el conteo de dossiers al cambiar de selección.
  useEffect(() => {
    setConfirmarEliminar(false);
    setModoOrden(false);
    if (activaId === null) {
      setObras([]);
      return;
    }
    cargarObras(activaId).catch((e) => setError(e instanceof Error ? e.message : String(e)));
    contarDossiers(context!.db, activaId).then(setCantidadDossiers).catch(() => setCantidadDossiers(0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activaId, cargarObras]);

  // Rellena nombre y notas con los de la selección abierta. Espera a que la lista esté cargada (al volver
  // desde la ficha de una obra la selección ya viene elegida pero la lista llega después) y se hace una sola
  // vez por selección: renombrar o mover obras no debe pisar lo que se está escribiendo.
  const camposCargadosPara = useRef<number | null>(null);
  useEffect(() => {
    if (activaId === null) {
      camposCargadosPara.current = null;
      return;
    }
    if (camposCargadosPara.current === activaId) return;
    const s = selecciones.find((x) => x.id === activaId);
    if (!s) return;
    camposCargadosPara.current = activaId;
    setNombre(s.nombre);
    setNotas(s.notas ?? "");
    setGrupoId(s.grupo_id);
  }, [activaId, selecciones]);

  async function run(fn: () => Promise<void>) {
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const abrirGrupo = (id: number) => {
    setNueva(false);
    setActivaId(null);
    setGrupoNuevo(false);
    setGrupoActivoId(id);
    setPanelGrupoAbierto(false);
    setConfirmarEliminarGrupo(false);
    setNombreGrupo(grupos.find((g) => g.id === id)?.nombre ?? "");
  };

  const empezarNuevoGrupo = () => {
    setNueva(false);
    setActivaId(null);
    setGrupoActivoId(null);
    setGrupoNuevo(true);
    setElegidasGrupoNuevo([]);
    setNombreGrupo("");
  };

  const guardarGrupo = () =>
    run(async () => {
      if (!context || !nombreGrupo.trim()) return;
      if (grupoNuevo) {
        const id = await crearGrupo(context.db, nombreGrupo);
        for (const selId of elegidasGrupoNuevo) await asignarGrupo(context.db, selId, id);
        setGrupoNuevo(false);
        setElegidasGrupoNuevo([]);
        setGrupoActivoId(id);
      } else if (grupoActivoId !== null) {
        await renombrarGrupo(context.db, grupoActivoId, nombreGrupo);
      }
      await recargarLista();
    });

  const alternarSeleccionEnGrupo = (selId: number, tildada: boolean) => {
    if (grupoNuevo) {
      setElegidasGrupoNuevo((prev) => (tildada ? [...prev, selId] : prev.filter((x) => x !== selId)));
      return;
    }
    if (grupoActivoId === null) return;
    return run(async () => {
      if (!context) return;
      await asignarGrupo(context.db, selId, tildada ? grupoActivoId : null);
      await recargarLista();
    });
  };

  const quitarGrupo = () =>
    run(async () => {
      if (!context || grupoActivoId === null) return;
      await eliminarGrupo(context.db, grupoActivoId);
      setConfirmarEliminarGrupo(false);
      setGrupoActivoId(null);
      await recargarLista();
    });

  const empezarNueva = () => {
    setActivaId(null);
    setNueva(true);
    setElegidasNueva([]);
    setNombre("");
    setNotas("");
    setGrupoId(null);
    setGrupoActivoId(null);
    setGrupoNuevo(false);
  };

  const guardarDatos = () =>
    run(async () => {
      if (!context || !nombre.trim()) return;
      if (nueva) {
        const id = await crearSeleccion(context.db, nombre, notas.trim() || null, grupoId);
        if (elegidasNueva.length > 0) await agregarObrasASeleccion(context.db, id, elegidasNueva);
        setElegidasNueva([]);
        await recargarLista();
        setNueva(false);
        setActivaId(id);
        return;
      }
      if (activaId === null) return;
      await actualizarSeleccion(context.db, activaId, nombre, notas.trim() || null, grupoId);
      await recargarLista();
    });

  const cambiarVista = (v: Vista) => {
    setVista(v);
    try {
      localStorage.setItem(VISTA_KEY, v);
    } catch {
      // No se pudo guardar la preferencia.
    }
  };
  const columnasActual = vista === "tarjetas" ? columnasTarjetas : vista === "imagenes" ? columnasImagenes : columnasColumnas;
  const cambiarTamano = (n: number) => {
    if (vista === "imagenes") {
      setColumnasImagenes(n);
      guardarColumnasGrid(COLUMNAS_IMAGENES_KEY, n);
    } else if (vista === "tarjetas") {
      setColumnasTarjetas(n);
      guardarColumnasGrid(COLUMNAS_TARJETAS_KEY, n);
    } else {
      setColumnasColumnas(n);
      guardarColumnasGrid(COLUMNAS_COLUMNAS_KEY, n);
    }
  };

  async function calificar(obraId: number, nueva: number) {
    if (!context) return;
    const actual = obras.find((o) => o.id === obraId);
    const anterior = actual?.calificacion ?? 0;
    setObras((prev) => prev.map((o) => (o.id === obraId ? { ...o, calificacion: nueva } : o)));
    try {
      await context.db.execute("UPDATE obra SET calificacion = ? WHERE id = ?", [nueva, obraId]);
    } catch (e) {
      setObras((prev) => prev.map((o) => (o.id === obraId ? { ...o, calificacion: anterior } : o)));
      setError(e instanceof Error ? e.message : String(e));
      return;
    }
    // Sincronización "mejor esfuerzo" con el archivo original; si falla no deshace lo guardado.
    if (actual?.ubicacion_fisica_actual) {
      try {
        await sincronizarCalificacionConArchivo(actual.ubicacion_fisica_actual, nueva);
      } catch (e) {
        setError(t("galeria.errorGuardarCalificacionArchivo", { mensaje: e instanceof Error ? e.message : String(e) }));
      }
    }
  }

  // Abre directamente la ventana de informes, limitada a las obras de la selección (en su orden).
  const abrirInformes = () =>
    run(async () => {
      if (!context || obras.length === 0) return;
      const ids = obras.map((o) => o.id);
      const rows = await context.db.query<InformeObraRow>(SQL_INFORME_OBRAS(ids.map(() => "?").join(",")), ids);
      const porId = new Map(rows.map((r) => [r.id, r]));
      setInformeObras(ids.map((id) => porId.get(id)).filter((r): r is InformeObraRow => !!r));
    });

  const eliminar = () =>
    run(async () => {
      if (!context || activaId === null) return;
      for (const d of await listDossiers(context.db, activaId)) {
        try {
          await context.fs.remove(d.archivo_path);
        } catch {
          // Archivo ya borrado: no impide eliminar la selección.
        }
      }
      await eliminarSeleccion(context.db, activaId);
      setActivaId(null);
      await recargarLista();
    });

  const quitar = (obraId: number) =>
    run(async () => {
      if (!context || activaId === null) return;
      await quitarObraDeSeleccion(context.db, activaId, obraId);
      await cargarObras(activaId);
      await recargarLista();
    });

  const mover = (indice: number, destino: number) =>
    run(async () => {
      if (!context || activaId === null) return;
      if (destino < 0 || destino >= obras.length || destino === indice) return;
      const ids = obras.map((o) => o.id);
      const [movida] = ids.splice(indice, 1);
      ids.splice(destino, 0, movida);
      // Se refleja de inmediato (sin esperar la base) para que el arrastre no "salte".
      const porId = new Map(obras.map((o) => [o.id, o]));
      setObras(ids.map((id) => porId.get(id)!));
      await reordenarSeleccion(context.db, activaId, ids);
    });

  if (!context) return null;
  const activa = selecciones.find((s) => s.id === activaId) ?? null;

  // Recorrido de ayuda de la sección (botón "?" del encabezado).
  const pasosAyuda = [
    pasoAyuda(t, "sel-crear", "ayudaSelecciones.crear", t("selecciones.crear")),
    pasoAyuda(t, "sel-modos", "ayudaSelecciones.grupos", t("selecciones.gruposTitulo") + " / " + t("selecciones.seleccionesTitulo")),
    pasoAyuda(t, "sel-lista", "ayudaSelecciones.lista", t("selecciones.existentes")),
    pasoAyuda(t, "sel-guardar", "ayudaSelecciones.guardar", t("common.save")),
    pasoAyuda(t, "sel-dossier", "ayudaSelecciones.dossier", t("dossier.boton")),
    pasoAyuda(t, "sel-guardados", "ayudaSelecciones.guardados", t("dossier.guardadosBoton", { cantidad: cantidadDossiers } as never)),
    pasoAyuda(t, "sel-exportar", "ayudaSelecciones.exportar", t("selecciones.exportarFotos")),
    pasoAyuda(t, "sel-informes", "ayudaSelecciones.informes", t("selecciones.informesBoton")),
    pasoAyuda(t, "sel-eliminar", "ayudaSelecciones.eliminar", t("selecciones.eliminar")),
    pasoAyuda(t, "obras-vista", "ayudaSelecciones.vista", t("obrasList.vistaTarjetas") + " / " + t("obrasList.vistaColumnas")),
    pasoAyuda(t, "obras-tamano", "ayudaObras.tamano", t("obrasList.tamanoMiniaturasLabel")),
    pasoAyuda(t, "sel-orden", "ayudaSelecciones.orden", t("selecciones.ordenarQuitar")),
    pasoAyuda(t, "sel-obra", "ayudaSelecciones.obra", t("obrasList.colObra")),
  ];

  return (
    <div className="obras-list obras-list-grid-ancho selecciones-pantalla">
      <div className="obras-encabezado-fijo selecciones-encabezado" ref={encabezadoRef}>
      <div className="obras-list-header">
        <h1>{t("selecciones.title")}</h1>
        <div className="header-actions">
          <AyudaSeccion pasos={pasosAyuda} />
          <button type="button" className="header-close-button" onClick={onBack} aria-label={t("common.back")} title={t("common.back")}>
            ✕
          </button>
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      </div>

      <div className="selecciones-bloque">
        <div className="obras-toolbar-fila selecciones-modos" data-recorrido="sel-modos">
          <button
            type="button"
            className={modo === "grupos" ? "obras-vista-toggle-boton activo" : "obras-vista-toggle-boton"}
            onClick={() => {
              setModo("grupos");
              setNueva(false);
              setActivaId(null);
              setGrupoActivoId(null);
              setGrupoNuevo(false);
              setPanelGrupoAbierto(false);
            }}
          >
            {t("selecciones.gruposTitulo")}
          </button>
          <button
            type="button"
            className={modo === "selecciones" ? "obras-vista-toggle-boton activo" : "obras-vista-toggle-boton"}
            onClick={() => {
              setModo("selecciones");
              setActivaId(null);
              setNueva(false);
              setGrupoNuevo(false);
              setGrupoActivoId(null);
              setPanelGrupoAbierto(false);
            }}
          >
            {t("selecciones.seleccionesTitulo")}
          </button>
        </div>
      </div>

      {modo === "grupos" && (
        <div className="selecciones-bloque">
          <div className="obras-toolbar-fila selecciones-grupos" data-recorrido="sel-grupos">
            {grupos.map((g) => (
              <button
                key={g.id}
                type="button"
                className={g.id === grupoActivoId ? "obras-vista-toggle-boton activo" : "obras-vista-toggle-boton"}
                onClick={() => abrirGrupo(g.id)}
              >
                {g.nombre} ({g.cantidad})
              </button>
            ))}
            <button type="button" onClick={empezarNuevoGrupo} disabled={grupoNuevo}>
              {t("selecciones.nuevoGrupo")}
            </button>
          </div>
          {grupos.length === 0 && !grupoNuevo && <p>{t("selecciones.sinGrupos")}</p>}
          {grupoActivoId !== null && (
            <>
              {selecciones.some((x) => x.grupo_id === grupoActivoId) ? (
                <ListaSelecciones
                  selecciones={selecciones.filter((x) => x.grupo_id === grupoActivoId)}
                  activaId={activaId}
                  expandida={listaExpandida}
                  onToggle={() => setListaExpandida((v) => !v)}
                  onElegir={(id) => {
                    setNueva(false);
                    setPanelGrupoAbierto(false);
                    setActivaId(id);
                    setListaExpandida(false);
                  }}
                  extra={
                    <button type="button" onClick={() => setPanelGrupoAbierto((v) => !v)}>
                      {t("selecciones.agregarAlGrupo")}
                    </button>
                  }
                />
              ) : (
                <>
                  <p>{t("selecciones.grupoVacio")}</p>
                  <div className="selecciones-bloque-crear">
                    <button type="button" onClick={() => setPanelGrupoAbierto((v) => !v)}>
                      {t("selecciones.agregarAlGrupo")}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {modo === "selecciones" && (
        <div className="selecciones-bloque">
          <div className="selecciones-bloque-crear">
            <button type="button" data-recorrido="sel-crear" onClick={empezarNueva} disabled={nueva}>
              {t("selecciones.crear")}
            </button>
          </div>
          {selecciones.length === 0 && !nueva && <p>{t("selecciones.vacio")}</p>}
          <ListaSelecciones
            selecciones={selecciones}
            activaId={activaId}
            expandida={listaExpandida}
            onToggle={() => setListaExpandida((v) => !v)}
            onElegir={(id) => {
              setNueva(false);
              setActivaId(id);
              setListaExpandida(false);
            }}
          />
        </div>
      )}

      {modo === "grupos" && (grupoNuevo || (grupoActivoId !== null && panelGrupoAbierto)) && (
        <section className="selecciones-bloque selecciones-formulario">
          <label>
            <span className="field-label">{t("selecciones.nombreGrupoLabel")}</span>
            <input type="text" value={nombreGrupo} onChange={(e) => setNombreGrupo(e.target.value)} />
          </label>
          <div>
            <span className="field-label">{t("selecciones.seleccionesDelGrupo")}</span>
            {selecciones.length === 0 && <p>{t("selecciones.vacio")}</p>}
            <div className="selecciones-grupo-checklist">
              {selecciones.map((sel) => {
                const tildada = grupoNuevo ? elegidasGrupoNuevo.includes(sel.id) : sel.grupo_id === grupoActivoId;
                const otroGrupo = grupos.find((g) => g.id === sel.grupo_id && g.id !== grupoActivoId);
                return (
                  <label key={sel.id} className="selecciones-grupo-opcion">
                    <input type="checkbox" checked={tildada} onChange={(e) => alternarSeleccionEnGrupo(sel.id, e.target.checked)} />
                    {sel.nombre} ({sel.cantidad})
                    {otroGrupo && !tildada && (
                      <span className="field-note"> — {t("selecciones.enOtroGrupo", { grupo: otroGrupo.nombre })}</span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
          <div className="form-actions">
            <button type="button" onClick={guardarGrupo} disabled={!nombreGrupo.trim()}>
              {t("common.save")}
            </button>
            <button
              type="button"
              onClick={() => {
                setGrupoNuevo(false);
                setGrupoActivoId(null);
              }}
            >
              {grupoNuevo ? t("common.cancel") : t("common.close")}
            </button>
            {!grupoNuevo && !confirmarEliminarGrupo && (
              <button type="button" onClick={() => setConfirmarEliminarGrupo(true)}>
                {t("selecciones.eliminarGrupo")}
              </button>
            )}
            {!grupoNuevo && confirmarEliminarGrupo && (
              <div className="confirm-box selecciones-confirmar-eliminar" role="alertdialog">
                <p>{t("selecciones.eliminarGrupoPregunta")}</p>
                <div className="form-actions">
                  <button type="button" className="boton-peligro" onClick={quitarGrupo}>
                    {t("selecciones.eliminarGrupoConfirmar")}
                  </button>
                  <button type="button" onClick={() => setConfirmarEliminarGrupo(false)}>
                    {t("common.cancel")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {nueva && (
        <section className="selecciones-bloque selecciones-formulario">
          <div className="selecciones-nombre-grupo">
          <label>
            <span className="field-label">{t("selecciones.nombreLabel")}</span>
            <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </label>
          <label>
            <span className="field-label">{t("selecciones.grupoLabel")}</span>
            <select value={grupoId ?? ""} onChange={(e) => setGrupoId(e.target.value === "" ? null : Number(e.target.value))}>
              <option value="">{t("selecciones.sinGrupo")}</option>
              {grupos.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nombre}
                </option>
              ))}
            </select>
          </label>
          </div>
          <label>
            <div className="selecciones-notas-cabecera">
              <NotasLabel texto={notas} onChange={setNotas}>
                <span>{t("selecciones.notasLabel")}</span>
              </NotasLabel>
            </div>
            <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} />
          </label>
          <div className="form-actions">
            <button type="button" onClick={guardarDatos} disabled={!nombre.trim()}>
              {t("common.save")}
            </button>
            {!nueva && (
              <button type="button" data-recorrido="sel-dossier" onClick={() => setDossierAbierto(true)} disabled={obras.length === 0}>
                {t("dossier.boton")}
              </button>
            )}
            {nueva && (
              <button type="button" onClick={() => setNueva(false)}>
                {t("common.cancel")}
              </button>
            )}
          </div>
          <SelectorObras elegidas={elegidasNueva} onChange={setElegidasNueva} />
        </section>
      )}

      {activa && (
        <section className="selecciones-bloque selecciones-formulario">
          <div className="selecciones-nombre-grupo">
          <label>
            <span className="field-label">{t("selecciones.nombreLabel")}</span>
            <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </label>
          <label>
            <span className="field-label">{t("selecciones.grupoLabel")}</span>
            <select value={grupoId ?? ""} onChange={(e) => setGrupoId(e.target.value === "" ? null : Number(e.target.value))}>
              <option value="">{t("selecciones.sinGrupo")}</option>
              {grupos.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nombre}
                </option>
              ))}
            </select>
          </label>
          </div>
          <label>
            <div className="selecciones-notas-cabecera">
              <NotasLabel texto={notas} onChange={setNotas}>
                <span>{t("selecciones.notasLabel")}</span>
              </NotasLabel>
            </div>
            <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} />
          </label>
          <div className="form-actions">
            <button type="button" data-recorrido="sel-guardar" onClick={guardarDatos} disabled={!nombre.trim()}>
              {t("common.save")}
            </button>
            {!nueva && (
              <button type="button" onClick={() => setDossierAbierto(true)} disabled={obras.length === 0}>
                {t("dossier.boton")}
              </button>
            )}
            {!nueva && (
              <button type="button" data-recorrido="sel-guardados" onClick={() => setGuardadosAbierto(true)}>
                {t("dossier.guardadosBoton", { cantidad: cantidadDossiers })}
              </button>
            )}
            {!nueva && (
              <>
                <button type="button" data-recorrido="sel-exportar" onClick={() => setExportarAbierto(true)} disabled={obras.length === 0}>
                  {t("selecciones.exportarFotos")}
                </button>
                <button type="button" data-recorrido="sel-informes" onClick={abrirInformes} disabled={obras.length === 0}>
                  {t("selecciones.informesBoton")}
                </button>
              </>
            )}
            {nueva && (
              <button type="button" onClick={() => setNueva(false)}>
                {t("common.cancel")}
              </button>
            )}
            {!nueva && !confirmarEliminar ? (
              <button type="button" data-recorrido="sel-eliminar" onClick={() => setConfirmarEliminar(true)}>
                {t("selecciones.eliminar")}
              </button>
            ) : !nueva ? (
              <div className="confirm-box selecciones-confirmar-eliminar" role="alertdialog">
                <p>{t("selecciones.eliminarPregunta")}</p>
                {cantidadDossiers > 0 && (
                  <p className="selecciones-aviso-dossiers">
                    ⚠️ {t("selecciones.eliminarAvisoDossiers", { cantidad: cantidadDossiers })}
                  </p>
                )}
                <div className="form-actions">
                  <button type="button" className="boton-peligro" onClick={eliminar}>
                    {t("selecciones.eliminarConfirmar")}
                  </button>
                  <button type="button" onClick={() => setConfirmarEliminar(false)}>
                    {t("common.cancel")}
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="selecciones-bloque">

          {obras.length === 0 && <p>{t("selecciones.sinObras")}</p>}
          {obras.length > 0 && (
            <div className="obras-toolbar-fila selecciones-vista-barra" style={{ top: `calc(var(--topbar-height) + ${altoEncabezado}px)` }}>
              <div className="obras-vista-toggle" data-recorrido="obras-vista">
                <button
                  type="button"
                  className={vista === "columnas" ? "obras-vista-toggle-boton activo" : "obras-vista-toggle-boton"}
                  onClick={() => cambiarVista("columnas")}
                >
                  {t("obrasList.vistaColumnas")}
                </button>
                <button
                  type="button"
                  className={vista === "tarjetas" ? "obras-vista-toggle-boton activo" : "obras-vista-toggle-boton"}
                  onClick={() => cambiarVista("tarjetas")}
                >
                  {t("obrasList.vistaTarjetas")}
                </button>
                <button
                  type="button"
                  className={vista === "imagenes" ? "obras-vista-toggle-boton activo" : "obras-vista-toggle-boton"}
                  onClick={() => cambiarVista("imagenes")}
                >
                  {t("selecciones.vistaImagenes")}
                </button>
              </div>
              {vista !== "imagenes" && (
              <button
                type="button"
                data-recorrido="sel-orden"
                className={modoOrden ? "obras-vista-toggle-boton activo" : undefined}
                onClick={() => setModoOrden((m) => !m)}
              >
                {modoOrden ? t("selecciones.terminarOrden") : t("selecciones.ordenarQuitar")}
              </button>
              )}
              <span className="obras-recorrido-envoltorio" data-recorrido="obras-tamano">
                <MiniaturasSizeSlider columnas={columnasActual} onChange={cambiarTamano} />
              </span>
            </div>
          )}

          {vista === "imagenes" && obras.length > 0 && (
            <GrillaImagenes
              obras={obras}
              thumbs={thumbs}
              columnas={columnasImagenes}
              onCalificar={calificar}
              onAbrirFicha={(id) => onOpenObra(id, activaId)}
              onError={setError}
            />
          )}

          {vista === "tarjetas" && (
            <div className="obras-grid" style={{ gridTemplateColumns: `repeat(${columnasTarjetas}, 1fr)` }}>
              {obras.map((obra, i) => (
                <div
                  className="obra-card-wrapper"
                  key={obra.id}
                  data-recorrido={i === 0 ? "sel-obra" : undefined}
                  draggable={modoOrden}
                onDragStart={(e) => {
                  if (!modoOrden) return;
                  setArrastrando(i);
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", String(i));
                }}
                onDragOver={(e) => {
                  if (!modoOrden) return;
                  e.preventDefault();
                  if (sobre !== i) setSobre(i);
                }}
                onDrop={(e) => {
                  if (!modoOrden) return;
                  e.preventDefault();
                  if (arrastrando !== null) mover(arrastrando, i);
                  setArrastrando(null);
                  setSobre(null);
                }}
                onDragEnd={() => {
                  setArrastrando(null);
                  setSobre(null);
                }}
                  style={{
                  opacity: arrastrando === i ? 0.4 : 1,
                  outline: modoOrden && sobre === i && arrastrando !== null && arrastrando !== i ? "3px dashed var(--azul-marino-borde)" : undefined,
                  cursor: modoOrden ? "grab" : undefined,
                }}
                >
                  <button type="button" className="obra-card" onClick={() => !modoOrden && onOpenObra(obra.id, activaId)}>
                    {thumbs[obra.id] ? (
                      <img
                        src={thumbs[obra.id]}
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
                  <StarRating value={obra.calificacion} onChange={(n) => calificar(obra.id, n)} />
                  {modoOrden && (
                    <div className="form-actions">
                      <button type="button" onClick={() => mover(i, i - 1)} disabled={i === 0} aria-label={t("selecciones.subir")} title={t("selecciones.subir")}>
                        ←
                      </button>
                      <button
                        type="button"
                        onClick={() => mover(i, i + 1)}
                        disabled={i === obras.length - 1}
                        aria-label={t("selecciones.bajar")}
                        title={t("selecciones.bajar")}
                      >
                        →
                      </button>
                      <button type="button" onClick={() => quitar(obra.id)}>
                        {t("selecciones.quitar")}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {vista === "columnas" && obras.length > 0 && (
            <div className="obras-tabla-wrapper">
              <table className="obras-tabla">
                <thead>
                  <tr>
                    <th>{t("obrasList.colImagen")}</th>
                    <th>{t("obrasList.colObra")}</th>
                    <th>{t("informesObras.colAutor")}</th>
                    <th>{t("informesObras.colCategoria")}</th>
                    <th>{t("informesObras.colSubcategoria")}</th>
                    <th>{t("obrasList.colDisponibilidad")}</th>
                    <th>{t("obrasList.colCalificacion")}</th>
                    {modoOrden && <th />}
                  </tr>
                </thead>
                <tbody>
                  {obras.map((obra, i) => {
                    const subtipoValor = obra.categoria_obra === "Fotografia" ? obra.subtipo_fotografia : obra.subtipo;
                    return (
                      <tr
                        key={obra.id}
                        data-recorrido={i === 0 ? "sel-obra" : undefined}
                        className="obras-tabla-fila"
                        onClick={() => !modoOrden && onOpenObra(obra.id, activaId)}
                        draggable={modoOrden}
                onDragStart={(e) => {
                  if (!modoOrden) return;
                  setArrastrando(i);
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", String(i));
                }}
                onDragOver={(e) => {
                  if (!modoOrden) return;
                  e.preventDefault();
                  if (sobre !== i) setSobre(i);
                }}
                onDrop={(e) => {
                  if (!modoOrden) return;
                  e.preventDefault();
                  if (arrastrando !== null) mover(arrastrando, i);
                  setArrastrando(null);
                  setSobre(null);
                }}
                onDragEnd={() => {
                  setArrastrando(null);
                  setSobre(null);
                }}
                        style={{
                  opacity: arrastrando === i ? 0.4 : 1,
                  outline: modoOrden && sobre === i && arrastrando !== null && arrastrando !== i ? "3px dashed var(--azul-marino-borde)" : undefined,
                  cursor: modoOrden ? "grab" : undefined,
                }}
                      >
                        <td>
                          {thumbs[obra.id] ? (
                            <img
                              src={thumbs[obra.id]}
                              alt={obra.titulo}
                              className="obras-tabla-miniatura"
                              style={{ width: anchoMiniaturaTabla(columnasColumnas) }}
                              onContextMenu={(e) => abrirMenuImagen(e, obra)}
                            />
                          ) : (
                            <span
                              className="obras-tabla-sin-imagen"
                              style={{ width: anchoMiniaturaTabla(columnasColumnas) }}
                              onContextMenu={(e) => abrirMenuImagen(e, obra)}
                            >
                              {t("obrasList.sinImagen")}
                            </span>
                          )}
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
                        <td>{obra.nombre_completo}</td>
                        <td>{t(`categoria.${obra.categoria_obra}` as TranslationKey)}</td>
                        <td>{subtipoValor ? t(subtipoTranslationKey(obra.categoria_obra, subtipoValor as never)) : "—"}</td>
                        <td>
                          <ObraDisponibilidad obra={obra} />
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <StarRating value={obra.calificacion} onChange={(n) => calificar(obra.id, n)} />
                        </td>
                        {modoOrden && (
                          <td onClick={(e) => e.stopPropagation()}>
                            <div className="form-actions">
                              <button type="button" onClick={() => mover(i, i - 1)} disabled={i === 0} aria-label={t("selecciones.subir")} title={t("selecciones.subir")}>
                                ↑
                              </button>
                              <button
                                type="button"
                                onClick={() => mover(i, i + 1)}
                                disabled={i === obras.length - 1}
                                aria-label={t("selecciones.bajar")}
                                title={t("selecciones.bajar")}
                              >
                                ↓
                              </button>
                              <button type="button" onClick={() => quitar(obra.id)}>
                                {t("selecciones.quitar")}
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          </div>
        </section>
      )}
      {dossierAbierto && activa && (
        <DossierModal
          seleccionId={activa.id}
          seleccionNombre={activa.nombre}
          onClose={() => setDossierAbierto(false)}
          onGenerado={() => contarDossiers(context.db, activa.id).then(setCantidadDossiers)}
        />
      )}
      {informeObras && <InformeListadoObrasModal obras={informeObras} onClose={() => setInformeObras(null)} />}
      {exportarAbierto && activa && (
        <ExportarSeleccionModal
          seleccionNombre={activa.nombre}
          obras={obras.map((o) => ({ titulo: o.titulo, nombreArtista: o.nombre_completo, rutaOriginal: o.ubicacion_fisica_actual }))}
          onClose={() => setExportarAbierto(false)}
        />
      )}
      {guardadosAbierto && activa && (
        <DossiersGuardadosModal
          seleccionId={activa.id}
          seleccionNombre={activa.nombre}
          onClose={() => setGuardadosAbierto(false)}
          onCambio={() => contarDossiers(context.db, activa.id).then(setCantidadDossiers)}
        />
      )}
      {elementosMenuImagen}
    </div>
  );
}
