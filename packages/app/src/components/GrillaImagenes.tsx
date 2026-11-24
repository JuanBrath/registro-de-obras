import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { useLanguage } from "../i18n/LanguageContext.js";
import { useMasonryGrid } from "../utils/useMasonryGrid.js";
import { marcarSiMiniaturaMuyVertical } from "../utils/miniaturaVertical.js";
import { abrirEnPhotoshop } from "../utils/photoshop.js";
import { pedirAbrirEnLightroom } from "../lightroom/lightroom.js";
import { StarRating } from "./StarRating.js";
import { MenuContextual } from "./MenuContextual.js";
import { ExportarImagenModal } from "./ExportarImagenModal.js";
import { VisorObras } from "./VisorObras.js";
import type { ObraRow } from "./ObraVista.js";

/** Nombre de la obra y, en la misma línea, su calificación como "3 ★". Un clic despliega las cinco estrellas y un
 * segundo clic elige cuántas (tocar la misma cantidad otra vez la quita). */
function PieObra({ titulo, calificacion, onCalificar }: { titulo: string; calificacion: number; onCalificar: (n: number) => void }) {
  const { t } = useLanguage();
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) return;
    const cerrar = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("mousedown", cerrar);
    return () => document.removeEventListener("mousedown", cerrar);
  }, [abierto]);
  return (
    <div className="galeria-foto-pie" ref={ref}>
      <span className="galeria-foto-titulo" title={titulo}>
        {titulo}
      </span>
      <button
        type="button"
        className="galeria-foto-calificacion"
        onClick={() => setAbierto((v) => !v)}
        aria-label={t("galeria.calificarConEstrellas", { n: calificacion })}
        title={t("galeria.calificarConEstrellas", { n: calificacion })}
      >
        {calificacion} ★
      </button>
      {abierto && (
        <div className="galeria-foto-estrellas-desplegadas">
          <StarRating
            value={calificacion}
            onChange={(n) => {
              onCalificar(n);
              setAbierto(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Modo de visualización "Imágenes" (el de la antigua Galería): grilla de fotos sin texto. Un clic amplía la foto en el
 * visor; la ficha se abre desde el visor ("Ver esta obra") o con clic derecho → "Abrir ficha". En modo selección, el
 * clic tilda la obra en vez de ampliarla.
 */
export function GrillaImagenes({
  obras,
  thumbs,
  columnas,
  onCalificar,
  onAbrirFicha,
  onError,
  onCambio,
  seleccion,
}: {
  obras: ObraRow[];
  thumbs: Record<number, string>;
  columnas: number;
  onCalificar: (obraId: number, n: number) => void;
  /** Sin esto (ej. al armar una selección nueva) no se ofrece "Abrir ficha": no hay a dónde ir sin perder lo elegido. */
  onAbrirFicha?: (obraId: number) => void;
  onError: (mensaje: string) => void;
  onCambio?: (obraId: number) => void;
  seleccion?: { elegidas: Set<number>; yaEnSeleccion: Set<number>; alternar: (obraId: number) => void };
}) {
  const { t } = useLanguage();
  const gridRef = useRef<HTMLDivElement>(null);
  useMasonryGrid(gridRef);
  const visibles = obras.filter((o) => thumbs[o.id]);
  const [indice, setIndice] = useState<number | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; obra: ObraRow } | null>(null);
  const [exportar, setExportar] = useState<ObraRow | null>(null);

  const abrirMenu = (e: ReactMouseEvent, obra: ObraRow) => {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ x: e.clientX, y: e.clientY, obra });
  };

  const conArchivo = (obra: ObraRow, mensaje: string, accion: () => void) => {
    if (!obra.ubicacion_fisica_actual) {
      onError(mensaje);
      return;
    }
    accion();
  };

  return (
    <>
      <div className="obras-grid galeria-fotos-grid" ref={gridRef} style={{ gridTemplateColumns: `repeat(${columnas}, 1fr)` }}>
        {visibles.map((obra, i) => {
          const tildada = seleccion?.elegidas.has(obra.id) || seleccion?.yaEnSeleccion.has(obra.id);
          return (
            <div className="galeria-foto-thumb-wrapper" key={obra.id} data-recorrido={i === 0 ? "obras-obra" : undefined}>
              {seleccion && (
                <input
                  type="checkbox"
                  checked={!!tildada}
                  disabled={seleccion.yaEnSeleccion.has(obra.id)}
                  onChange={() => seleccion.alternar(obra.id)}
                  style={{ position: "absolute", top: 8, left: 8, zIndex: 2, width: 22, height: 22 }}
                />
              )}
              {seleccion && (
                <button
                  type="button"
                  className="selector-ampliar"
                  onClick={() => setIndice(i)}
                  aria-label={t("selecciones.ampliar")}
                  title={t("selecciones.ampliar")}
                >
                  ⤢
                </button>
              )}
              <button
                type="button"
                className="galeria-foto-thumb-button"
                style={seleccion?.elegidas.has(obra.id) ? { outline: "3px solid var(--azul-marino-borde)" } : undefined}
                onClick={() => (seleccion ? seleccion.alternar(obra.id) : setIndice(i))}
                onContextMenu={(e) => abrirMenu(e, obra)}
              >
                <img src={thumbs[obra.id]} alt={obra.titulo} onLoad={(e) => marcarSiMiniaturaMuyVertical(e.currentTarget)} />
              </button>
              <PieObra titulo={obra.titulo} calificacion={obra.calificacion} onCalificar={(n) => onCalificar(obra.id, n)} />
            </div>
          );
        })}
      </div>

      {indice !== null && (
        <VisorObras
          items={visibles}
          indiceInicial={indice}
          onCerrar={() => setIndice(null)}
          onAbrirFicha={onAbrirFicha ?? (() => {})}
          onCalificar={onCalificar}
          onCambio={onCambio}
          seleccion={seleccion}
          onMenuImagen={(e, id) => {
            const obra = visibles.find((o) => o.id === id);
            if (obra) abrirMenu(e, obra);
          }}
        />
      )}

      {menu && (
        <MenuContextual
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          items={[
            ...(onAbrirFicha ? [{ label: t("selecciones.abrirFicha"), onClick: () => onAbrirFicha(menu.obra.id) }] : []),
            {
              label: t("obraDetail.exportarImagen"),
              onClick: () => conArchivo(menu.obra, t("obraDetail.errorExportarSinArchivo"), () => setExportar(menu.obra)),
            },
            {
              label: t("obraDetail.abrirEnPhotoshop"),
              onClick: () =>
                conArchivo(menu.obra, t("obraDetail.errorAbrirPhotoshopSinArchivo"), () => {
                  abrirEnPhotoshop(menu.obra.ubicacion_fisica_actual!).catch(() => onError(t("obraDetail.errorAbrirPhotoshop")));
                }),
            },
            {
              label: t("obraDetail.abrirEnLightroom"),
              onClick: () =>
                conArchivo(menu.obra, t("obraDetail.errorAbrirLightroomSinArchivo"), () => {
                  pedirAbrirEnLightroom(menu.obra.ubicacion_fisica_actual!).catch(() => onError(t("filePathField.errorNoSePudoAbrir")));
                }),
            },
          ]}
        />
      )}

      {exportar && exportar.ubicacion_fisica_actual && (
        <ExportarImagenModal
          titulo={exportar.titulo}
          nombreArtista={exportar.nombre_completo ?? ""}
          rutaOriginal={exportar.ubicacion_fisica_actual}
          onClose={() => setExportar(null)}
        />
      )}
    </>
  );
}
