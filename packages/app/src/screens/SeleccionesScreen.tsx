import { useCallback, useEffect, useRef, useState } from "react";
import { InformeListadoObrasModal, SQL_INFORME_OBRAS, type InformeObraRow } from "../components/InformeListadoObrasModal.js";
import { AyudaSeccion, pasoAyuda } from "../components/AyudaSeccion.js";
import { DossierModal } from "../components/DossierModal.js";
import { DossiersGuardadosModal } from "../components/DossiersGuardadosModal.js";
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
  crearSeleccion,
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
const VISTA_KEY = "seleccionesVista";
type Vista = "tarjetas" | "columnas";

function cargarVista(): Vista {
  try {
    const v = localStorage.getItem(VISTA_KEY);
    if (v === "tarjetas" || v === "columnas") return v;
  } catch {
    // localStorage no disponible: se usa el valor por defecto.
  }
  return "tarjetas";
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
  const [activaId, setActivaId] = useState<number | null>(seleccionInicialId ?? null);
  const [obras, setObras] = useState<ObraRow[]>([]);
  const [vista, setVista] = useState<Vista>(cargarVista);
  const [columnasTarjetas, setColumnasTarjetas] = useState(() => cargarColumnasGridInicial(COLUMNAS_TARJETAS_KEY, 4));
  const [columnasColumnas, setColumnasColumnas] = useState(() => cargarColumnasGridInicial(COLUMNAS_COLUMNAS_KEY, 4));
  const [thumbs, setThumbs] = useState<Record<number, string>>({});
  const [nombre, setNombre] = useState("");
  const [notas, setNotas] = useState("");
  const [nueva, setNueva] = useState(false);
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dossierAbierto, setDossierAbierto] = useState(false);
  const [guardadosAbierto, setGuardadosAbierto] = useState(false);
  const [informeObras, setInformeObras] = useState<InformeObraRow[] | null>(null);
  const [cantidadDossiers, setCantidadDossiers] = useState(0);
  // Modo "ordenar y quitar": solo mientras está activo se puede arrastrar, mover con flechas y quitar obras, y tocar una
  // obra no abre su ficha (así no se abre por error al arrastrar).
  const [modoOrden, setModoOrden] = useState(false);
  const [arrastrando, setArrastrando] = useState<number | null>(null);
  const [sobre, setSobre] = useState<number | null>(null);
  const objectUrlsRef = useRef<string[]>([]);

  const recargarLista = useCallback(async () => {
    if (!context) return [];
    const rows = await listSelecciones(context.db);
    setSelecciones(rows);
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
  }, [activaId, selecciones]);

  async function run(fn: () => Promise<void>) {
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const empezarNueva = () => {
    setActivaId(null);
    setNueva(true);
    setNombre("");
    setNotas("");
  };

  const guardarDatos = () =>
    run(async () => {
      if (!context || !nombre.trim()) return;
      if (nueva) {
        const id = await crearSeleccion(context.db, nombre, notas.trim() || null);
        await recargarLista();
        setNueva(false);
        setActivaId(id);
        return;
      }
      if (activaId === null) return;
      await actualizarSeleccion(context.db, activaId, nombre, notas.trim() || null);
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
  const columnasActual = vista === "tarjetas" ? columnasTarjetas : columnasColumnas;
  const cambiarTamano = (n: number) => {
    if (vista === "tarjetas") {
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
    pasoAyuda(t, "sel-lista", "ayudaSelecciones.lista", t("selecciones.existentes")),
    pasoAyuda(t, "sel-guardar", "ayudaSelecciones.guardar", t("common.save")),
    pasoAyuda(t, "sel-dossier", "ayudaSelecciones.dossier", t("dossier.boton")),
    pasoAyuda(t, "sel-guardados", "ayudaSelecciones.guardados", t("dossier.guardadosBoton", { cantidad: cantidadDossiers } as never)),
    pasoAyuda(t, "sel-informes", "ayudaSelecciones.informes", t("selecciones.informesBoton")),
    pasoAyuda(t, "sel-eliminar", "ayudaSelecciones.eliminar", t("selecciones.eliminar")),
    pasoAyuda(t, "obras-vista", "ayudaSelecciones.vista", t("obrasList.vistaTarjetas") + " / " + t("obrasList.vistaColumnas")),
    pasoAyuda(t, "obras-tamano", "ayudaObras.tamano", t("obrasList.tamanoMiniaturasLabel")),
    pasoAyuda(t, "sel-orden", "ayudaSelecciones.orden", t("selecciones.ordenarQuitar")),
    pasoAyuda(t, "sel-obra", "ayudaSelecciones.obra", t("obrasList.colObra")),
  ];

  return (
    <div className="obras-list obras-list-grid-ancho">
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

      <div className="selecciones-bloque">
        <button type="button" data-recorrido="sel-crear" onClick={empezarNueva} disabled={nueva}>
          {t("selecciones.crear")}
        </button>
      </div>

      {nueva && (
        <section className="selecciones-bloque selecciones-formulario">
          <label>
            <span className="field-label">{t("selecciones.nombreLabel")}</span>
            <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </label>
          <label>
            <span className="field-label">{t("selecciones.notasLabel")}</span>
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
        </section>
      )}

      <div className="selecciones-bloque">
        {selecciones.length === 0 && !nueva && <p>{t("selecciones.vacio")}</p>}
        {selecciones.length > 0 && <h2 className="selecciones-subtitulo">{t("selecciones.existentes")}</h2>}
        <div className="obras-toolbar-fila" data-recorrido="sel-lista">
          {selecciones.map((s) => (
            <button
              key={s.id}
              type="button"
              className={s.id === activaId ? "obras-vista-toggle-boton activo" : "obras-vista-toggle-boton"}
              onClick={() => {
                setNueva(false);
                setActivaId(s.id);
              }}
            >
              {s.nombre} ({s.cantidad})
            </button>
          ))}
        </div>
      </div>

      {activa && (
        <section className="selecciones-bloque selecciones-formulario">
          <label>
            <span className="field-label">{t("selecciones.nombreLabel")}</span>
            <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </label>
          <label>
            <span className="field-label">{t("selecciones.notasLabel")}</span>
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
              <button type="button" data-recorrido="sel-informes" onClick={abrirInformes} disabled={obras.length === 0}>
                {t("selecciones.informesBoton")}
              </button>
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
            <div className="obras-toolbar-fila selecciones-vista-barra">
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
              </div>
              <span className="obras-recorrido-envoltorio" data-recorrido="obras-tamano">
                <MiniaturasSizeSlider columnas={columnasActual} onChange={cambiarTamano} />
              </span>
              <button
                type="button"
                data-recorrido="sel-orden"
                className={modoOrden ? "obras-vista-toggle-boton activo" : undefined}
                onClick={() => setModoOrden((m) => !m)}
              >
                {modoOrden ? t("selecciones.terminarOrden") : t("selecciones.ordenarQuitar")}
              </button>
            </div>
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
                  setArrastrando(i);
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", String(i));
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (sobre !== i) setSobre(i);
                }}
                onDrop={(e) => {
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
                      <img src={thumbs[obra.id]} alt={obra.titulo} onLoad={(e) => marcarSiMiniaturaMuyVertical(e.currentTarget)} />
                    ) : (
                      <div className="obra-card-placeholder">{t("obrasList.sinImagen")}</div>
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
                  setArrastrando(i);
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", String(i));
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (sobre !== i) setSobre(i);
                }}
                onDrop={(e) => {
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
                            />
                          ) : (
                            <span className="obras-tabla-sin-imagen" style={{ width: anchoMiniaturaTabla(columnasColumnas) }}>
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
      {guardadosAbierto && activa && (
        <DossiersGuardadosModal
          seleccionId={activa.id}
          seleccionNombre={activa.nombre}
          onClose={() => setGuardadosAbierto(false)}
          onCambio={() => contarDossiers(context.db, activa.id).then(setCantidadDossiers)}
        />
      )}
    </div>
  );
}
