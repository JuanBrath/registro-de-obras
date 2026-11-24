import { useEffect, useRef, useState } from "react";
import { useWorkspace } from "../state/WorkspaceContext.js";
import { useLanguage } from "../i18n/LanguageContext.js";
import { leerMiniaturasPorIdEnParalelo } from "../utils/imageObjectUrl.js";
import { marcarSiMiniaturaMuyVertical } from "../utils/miniaturaVertical.js";
import { ObraDisponibilidad, ObraTarjetaInfo, SQL_OBRA_ROWS, anchoMiniaturaTabla, type ObraRow } from "./ObraVista.js";
import { GrillaImagenes } from "./GrillaImagenes.js";
import { sincronizarCalificacionConArchivo } from "../utils/calificacionArchivo.js";
import { MiniaturasSizeSlider } from "./MiniaturasSizeSlider.js";
import { cargarColumnasGridInicial, guardarColumnasGrid } from "../utils/columnasGrid.js";

const COLUMNAS_KEY = "selectorObrasColumnasGrid";
const COLUMNAS_LISTA_KEY = "selectorObrasColumnasLista";
const COLUMNAS_IMAGENES_KEY = "selectorObrasColumnasImagenes";
const VISTA_KEY = "selectorObrasVista";
type Vista = "lista" | "tarjetas" | "imagenes";

function cargarVista(): Vista {
  try {
    const v = localStorage.getItem(VISTA_KEY);
    if (v === "lista" || v === "tarjetas" || v === "imagenes") return v;
  } catch {
    // localStorage no disponible: se usa el valor por defecto.
  }
  return "tarjetas";
}

/**
 * Elegir obras para una selección nueva: muestra TODAS las obras del registro, sin filtros, con una casilla en
 * cada una. `elegidas` guarda los ids en el orden en que se fueron tildando (ese es el orden inicial de la selección).
 */
export function SelectorObras({ elegidas, onChange }: { elegidas: number[]; onChange: (ids: number[]) => void }) {
  const { context } = useWorkspace();
  const { t } = useLanguage();
  const [obras, setObras] = useState<ObraRow[]>([]);
  const [thumbs, setThumbs] = useState<Record<number, string>>({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vista, setVista] = useState<Vista>(cargarVista);
  const [columnasTarjetas, setColumnasTarjetas] = useState(() => cargarColumnasGridInicial(COLUMNAS_KEY, 5));
  const [columnasLista, setColumnasLista] = useState(() => cargarColumnasGridInicial(COLUMNAS_LISTA_KEY, 5));
  const [columnasImagenes, setColumnasImagenes] = useState(() => cargarColumnasGridInicial(COLUMNAS_IMAGENES_KEY, 5));
  // Pantalla completa: el mismo selector, pero ocupando toda la ventana para ver muchas obras a la vez.
  const [completa, setCompleta] = useState(false);
  const urlsRef = useRef<string[]>([]);

  useEffect(() => {
    if (!context) return;
    let cancelado = false;
    (async () => {
      try {
        const rows = await context.db.query<ObraRow>(SQL_OBRA_ROWS());
        if (cancelado) return;
        setObras(rows);
        const { urls, objectUrls } = await leerMiniaturasPorIdEnParalelo(
          context.fs,
          rows,
          (o) => o.id,
          (o) => o.miniatura_path,
        );
        urlsRef.current.push(...objectUrls);
        if (!cancelado) setThumbs(urls);
      } catch (e) {
        if (!cancelado) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();
    return () => {
      cancelado = true;
      for (const url of urlsRef.current) URL.revokeObjectURL(url);
      urlsRef.current = [];
    };
  }, [context]);

  // Con la pantalla completa abierta, Esc la cierra.
  useEffect(() => {
    if (!completa) return;
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCompleta(false);
    };
    document.addEventListener("keydown", alPulsar);
    return () => document.removeEventListener("keydown", alPulsar);
  }, [completa]);

  const cambiarVista = (v: Vista) => {
    setVista(v);
    try {
      localStorage.setItem(VISTA_KEY, v);
    } catch {
      // No se pudo guardar la preferencia.
    }
  };
  const columnas = vista === "tarjetas" ? columnasTarjetas : vista === "imagenes" ? columnasImagenes : columnasLista;
  const cambiarTamano = (n: number) => {
    if (vista === "tarjetas") {
      setColumnasTarjetas(n);
      guardarColumnasGrid(COLUMNAS_KEY, n);
    } else if (vista === "imagenes") {
      setColumnasImagenes(n);
      guardarColumnasGrid(COLUMNAS_IMAGENES_KEY, n);
    } else {
      setColumnasLista(n);
      guardarColumnasGrid(COLUMNAS_LISTA_KEY, n);
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
    if (actual?.ubicacion_fisica_actual) {
      try {
        await sincronizarCalificacionConArchivo(actual.ubicacion_fisica_actual, nueva);
      } catch (e) {
        setError(t("galeria.errorGuardarCalificacionArchivo", { mensaje: e instanceof Error ? e.message : String(e) }));
      }
    }
  }

  const alternar = (id: number) =>
    onChange(elegidas.includes(id) ? elegidas.filter((x) => x !== id) : [...elegidas, id]);

  const marcadas = new Set(elegidas);
  const boton = (v: Vista, texto: string) => (
    <button type="button" className={vista === v ? "obras-vista-toggle-boton activo" : "obras-vista-toggle-boton"} onClick={() => cambiarVista(v)}>
      {texto}
    </button>
  );

  return (
    <div className={completa ? "selector-obras selector-obras-completa" : "selector-obras"}>
      <h3 className="selector-obras-titulo">{t("selecciones.elegirObras")}</h3>
      <p className="dossier-nota">{t("selecciones.elegirObrasAyuda")}</p>
      <div className="obras-toolbar-fila selector-obras-barra">
        <span className="selecciones-contador-grande" role="status">
          {t("selecciones.elegirObrasContador", { cantidad: elegidas.length, total: obras.length })}
        </span>
        {obras.length > 0 && (
          <>
            <div className="obras-vista-toggle">
              {boton("lista", t("obrasList.vistaColumnas"))}
              {boton("tarjetas", t("obrasList.vistaTarjetas"))}
              {boton("imagenes", t("selecciones.vistaImagenes"))}
            </div>
            <MiniaturasSizeSlider columnas={columnas} onChange={cambiarTamano} />
            <button type="button" onClick={() => setCompleta((v) => !v)}>
              {completa ? t("selecciones.salirPantallaCompleta") : t("selecciones.pantallaCompleta")}
            </button>
          </>
        )}
      </div>
      {cargando && <p>{t("common.loading")}</p>}
      {error && <p className="error">{error}</p>}

      {vista === "imagenes" && obras.length > 0 && (
        <GrillaImagenes
          obras={obras}
          thumbs={thumbs}
          columnas={columnasImagenes}
          onCalificar={calificar}
          onError={setError}
          seleccion={{ elegidas: marcadas, yaEnSeleccion: new Set(), alternar }}
        />
      )}

      {vista === "tarjetas" && (
        <div className="obras-grid" style={{ gridTemplateColumns: `repeat(${columnasTarjetas}, 1fr)` }}>
          {obras.map((obra) => {
            const marcada = marcadas.has(obra.id);
            return (
              <div className="obra-card-wrapper" key={obra.id}>
                <input
                  type="checkbox"
                  checked={marcada}
                  onChange={() => alternar(obra.id)}
                  style={{ position: "absolute", top: 8, left: 8, zIndex: 2, width: 22, height: 22 }}
                />
                <button
                  type="button"
                  className="obra-card"
                  style={marcada ? { outline: "3px solid var(--azul-marino-borde)" } : undefined}
                  onClick={() => alternar(obra.id)}
                >
                  {thumbs[obra.id] ? (
                    <img src={thumbs[obra.id]} alt={obra.titulo} onLoad={(e) => marcarSiMiniaturaMuyVertical(e.currentTarget)} />
                  ) : (
                    <div className="obra-card-placeholder">{t("obrasList.sinImagen")}</div>
                  )}
                  <ObraTarjetaInfo obra={obra} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {vista === "lista" && obras.length > 0 && (
        <div className="obras-tabla-wrapper">
          <table className="obras-tabla">
            <thead>
              <tr>
                <th />
                <th>{t("obrasList.colImagen")}</th>
                <th>{t("obrasList.colObra")}</th>
                <th>{t("informesObras.colAutor")}</th>
                <th>{t("obrasList.colDisponibilidad")}</th>
              </tr>
            </thead>
            <tbody>
              {obras.map((obra) => {
                const marcada = marcadas.has(obra.id);
                return (
                  <tr
                    key={obra.id}
                    className={marcada ? "obras-tabla-fila obras-tabla-fila-marcada" : "obras-tabla-fila"}
                    onClick={() => alternar(obra.id)}
                  >
                    <td>
                      <input type="checkbox" checked={marcada} onChange={() => alternar(obra.id)} onClick={(e) => e.stopPropagation()} />
                    </td>
                    <td>
                      {thumbs[obra.id] ? (
                        <img
                          src={thumbs[obra.id]}
                          alt={obra.titulo}
                          className="obras-tabla-miniatura"
                          style={{ width: anchoMiniaturaTabla(columnasLista) }}
                        />
                      ) : (
                        <span className="obras-tabla-sin-imagen" style={{ width: anchoMiniaturaTabla(columnasLista) }}>
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
                    <td>
                      <ObraDisponibilidad obra={obra} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
