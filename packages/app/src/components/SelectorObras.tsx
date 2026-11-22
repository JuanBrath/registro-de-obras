import { useEffect, useRef, useState } from "react";
import { useWorkspace } from "../state/WorkspaceContext.js";
import { useLanguage } from "../i18n/LanguageContext.js";
import { leerMiniaturasPorIdEnParalelo } from "../utils/imageObjectUrl.js";
import { marcarSiMiniaturaMuyVertical } from "../utils/miniaturaVertical.js";
import { ObraTarjetaInfo, SQL_OBRA_ROWS, type ObraRow } from "./ObraVista.js";
import { MiniaturasSizeSlider } from "./MiniaturasSizeSlider.js";
import { cargarColumnasGridInicial, guardarColumnasGrid } from "../utils/columnasGrid.js";

const COLUMNAS_KEY = "selectorObrasColumnasGrid";

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
  const [columnas, setColumnas] = useState(() => cargarColumnasGridInicial(COLUMNAS_KEY, 5));
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

  const alternar = (id: number) =>
    onChange(elegidas.includes(id) ? elegidas.filter((x) => x !== id) : [...elegidas, id]);

  return (
    <div className="selector-obras">
      <h3 className="selector-obras-titulo">{t("selecciones.elegirObras")}</h3>
      <p className="dossier-nota">{t("selecciones.elegirObrasAyuda")}</p>
      <div className="obras-toolbar-fila">
        <span className="selecciones-contador-grande" role="status">
          {t("selecciones.elegirObrasContador", { cantidad: elegidas.length, total: obras.length })}
        </span>
        {obras.length > 0 && (
          <MiniaturasSizeSlider
            columnas={columnas}
            onChange={(n) => {
              setColumnas(n);
              guardarColumnasGrid(COLUMNAS_KEY, n);
            }}
          />
        )}
      </div>
      {cargando && <p>{t("common.loading")}</p>}
      {error && <p className="error">{error}</p>}
      <div className="obras-grid" style={{ gridTemplateColumns: `repeat(${columnas}, 1fr)` }}>
        {obras.map((obra) => {
          const marcada = elegidas.includes(obra.id);
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
    </div>
  );
}
