import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { asegurarCopiaOfrecible, type CategoriaObra } from "@registro/core";
import { useWorkspace } from "../state/WorkspaceContext.js";
import { useLanguage, type TranslationKey } from "../i18n/LanguageContext.js";
import { bytesToObjectUrl } from "../utils/imageObjectUrl.js";
import { formatFechaDDMMYYYY } from "../utils/formatFecha.js";
import { Modal } from "./Modal.js";
import { VentaForm } from "./VentaForm.js";
import { StarRating } from "./StarRating.js";

/** Lo mínimo que necesita el visor de cada obra; el resto de los datos los consulta él mismo. */
export interface ItemVisor {
  id: number;
  titulo: string;
  miniatura_path: string | null;
  calificacion: number;
}

interface PrimeraSerieDisponible {
  id: number;
  numero: string;
  fecha_impresion: string | null;
  soporte_impresion: string | null;
  dimensiones: string | null;
  ubicacion_actual: string | null;
  precio_venta: number | null;
  moneda_venta: string | null;
  notas: string | null;
}

interface InfoObra {
  id: number;
  imagen_alta_resolucion_path: string | null;
  nombre_completo: string | null;
  categoria_obra: CategoriaObra;
  dimensiones: string | null;
  escala_por_tamanos: string | null;
  estado: string;
  es_seriada: number;
  sin_limite: number;
  total_ejemplares: number;
  ejemplares_disponible: number;
  ejemplares_en_stock: number;
  ejemplares_exhibicion: number;
  ejemplares_reservada: number;
  ejemplares_vendida: number;
  ejemplares_consignacion: number;
  ejemplares_en_produccion: number;
  ejemplares_coleccion_autor: number;
  ejemplares_descartada: number;
  ejemplares_destruida: number;
}

const SQL_INFO_OBRA = `
  SELECT obra.id, obra.imagen_alta_resolucion_path, obra.categoria_obra, obra.estado, obra.es_seriada, obra.sin_limite,
         artista.nombre_completo, obra_fotografia.dimensiones, obra_fotografia.escala_por_tamanos,
         COUNT(CASE WHEN ejemplar.tipo = 'edicion' THEN ejemplar.id END) as total_ejemplares,
         SUM(CASE WHEN ejemplar.tipo = 'edicion' AND ejemplar.estado = 'disponible' THEN 1 ELSE 0 END) as ejemplares_disponible,
         SUM(CASE WHEN ejemplar.tipo = 'edicion' AND ejemplar.estado = 'en_stock' THEN 1 ELSE 0 END) as ejemplares_en_stock,
         SUM(CASE WHEN ejemplar.tipo = 'edicion' AND ejemplar.estado = 'exhibicion' THEN 1 ELSE 0 END) as ejemplares_exhibicion,
         SUM(CASE WHEN ejemplar.tipo = 'edicion' AND ejemplar.estado = 'reservada' THEN 1 ELSE 0 END) as ejemplares_reservada,
         SUM(CASE WHEN ejemplar.tipo = 'edicion' AND ejemplar.estado = 'vendida' THEN 1 ELSE 0 END) as ejemplares_vendida,
         SUM(CASE WHEN ejemplar.tipo = 'edicion' AND ejemplar.estado = 'consignacion' THEN 1 ELSE 0 END) as ejemplares_consignacion,
         SUM(CASE WHEN ejemplar.tipo = 'edicion' AND ejemplar.estado = 'en_produccion' THEN 1 ELSE 0 END) as ejemplares_en_produccion,
         SUM(CASE WHEN ejemplar.tipo = 'edicion' AND ejemplar.estado = 'coleccion_autor' THEN 1 ELSE 0 END) as ejemplares_coleccion_autor,
         SUM(CASE WHEN ejemplar.tipo = 'edicion' AND ejemplar.estado = 'descartada' THEN 1 ELSE 0 END) as ejemplares_descartada,
         SUM(CASE WHEN ejemplar.tipo = 'edicion' AND ejemplar.estado = 'destruida' THEN 1 ELSE 0 END) as ejemplares_destruida
  FROM obra
  LEFT JOIN artista ON artista.id = obra.artista_id
  LEFT JOIN obra_fotografia ON obra_fotografia.obra_id = obra.id
  LEFT JOIN ejemplar ON ejemplar.obra_id = obra.id
  WHERE obra.id = ?
  GROUP BY obra.id
`;

const FRAGMENTOS_ESTADO: { estado: string; key: TranslationKey; campo: keyof InfoObra }[] = [
  { estado: "en_stock", key: "obrasList.fragmentoEnStock", campo: "ejemplares_en_stock" },
  { estado: "exhibicion", key: "obrasList.fragmentoExhibicion", campo: "ejemplares_exhibicion" },
  { estado: "reservada", key: "obrasList.fragmentoReservadas", campo: "ejemplares_reservada" },
  { estado: "consignacion", key: "obrasList.fragmentoConsignacion", campo: "ejemplares_consignacion" },
  { estado: "en_produccion", key: "obrasList.fragmentoEnProduccion", campo: "ejemplares_en_produccion" },
  { estado: "coleccion_autor", key: "obrasList.fragmentoColeccionAutor", campo: "ejemplares_coleccion_autor" },
  { estado: "vendida", key: "obrasList.fragmentoVendidas", campo: "ejemplares_vendida" },
  { estado: "descartada", key: "obrasList.fragmentoDescartadas", campo: "ejemplares_descartada" },
  { estado: "destruida", key: "obrasList.fragmentoDestruidas", campo: "ejemplares_destruida" },
];

/**
 * Visor ampliado de obras (el de la antigua Galería): foto grande con flechas, calificación, ⓘ con los datos de la obra
 * y de su primera copia disponible (desde donde se puede registrar una venta o reserva) y "Ver esta obra".
 */
export function VisorObras({
  items,
  indiceInicial,
  onCerrar,
  onAbrirFicha,
  onCalificar,
  onMenuImagen,
  onCambio,
  seleccion,
}: {
  /** Al armar una selección: el visor muestra un botón (y la barra espaciadora) para elegir o quitar la foto que se ve. */
  seleccion?: { elegidas: Set<number>; alternar: (obraId: number) => void };
  items: ItemVisor[];
  indiceInicial: number;
  onCerrar: () => void;
  onAbrirFicha: (obraId: number) => void;
  onCalificar: (obraId: number, n: number) => void;
  /** Clic derecho sobre la foto ampliada. */
  onMenuImagen: (e: ReactMouseEvent, obraId: number) => void;
  /** Se registró una venta o reserva: la pantalla puede recargar sus contadores. */
  onCambio?: (obraId: number) => void;
}) {
  const { context } = useWorkspace();
  const { t } = useLanguage();
  const [indice, setIndice] = useState(indiceInicial);
  const [url, setUrl] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoAbierta, setInfoAbierta] = useState(false);
  const [info, setInfo] = useState<InfoObra | null>(null);
  const [primeraSerie, setPrimeraSerie] = useState<PrimeraSerieDisponible | null>(null);
  const [cargandoSerie, setCargandoSerie] = useState(false);
  const [ventaTarget, setVentaTarget] = useState<{ obraId: number; ejemplarId: number } | null>(null);
  const urlRef = useRef<string | null>(null);
  const actual = items[indice] ?? null;

  useEffect(() => {
    if (!context || !actual) return;
    let cancelado = false;
    setCargando(true);
    setError(null);
    (async () => {
      const [fila] = await context.db.query<{ imagen_alta_resolucion_path: string | null }>(
        "SELECT imagen_alta_resolucion_path FROM obra WHERE id = ?",
        [actual.id],
      );
      const ruta = fila?.imagen_alta_resolucion_path || actual.miniatura_path;
      if (!ruta) return;
      const bytes = await context.fs.readFile(ruta);
      if (cancelado) return;
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = bytesToObjectUrl(bytes);
      setUrl(urlRef.current);
    })()
      .catch((e) => {
        if (!cancelado) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indice, context]);

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  const mover = (d: number) => {
    setIndice((i) => (i + d + items.length) % items.length);
    setInfoAbierta(false);
  };

  // Flechas para pasar de foto y, al elegir obras, barra espaciadora para elegir o quitar la que se ve.
  useEffect(() => {
    if (infoAbierta || ventaTarget) return;
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && items.length > 1) mover(-1);
      else if (e.key === "ArrowRight" && items.length > 1) mover(1);
      else if (e.key === " " && seleccion && actual) {
        e.preventDefault();
        seleccion.alternar(actual.id);
      }
    };
    document.addEventListener("keydown", alPulsar);
    return () => document.removeEventListener("keydown", alPulsar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [infoAbierta, ventaTarget, items.length, seleccion, actual?.id]);

  async function abrirInfo(obraId: number) {
    if (!context) return;
    setInfoAbierta(true);
    setPrimeraSerie(null);
    setCargandoSerie(true);
    try {
      const [fila] = await context.db.query<InfoObra>(SQL_INFO_OBRA, [obraId]);
      setInfo(fila ?? null);
      const rows = await context.db.query<PrimeraSerieDisponible>(
        `SELECT id, numero, fecha_impresion, soporte_impresion, dimensiones, ubicacion_actual, precio_venta, moneda_venta, notas
         FROM ejemplar
         WHERE obra_id = ? AND tipo = 'edicion' AND estado = 'disponible'
         ORDER BY indice ASC
         LIMIT 1`,
        [obraId],
      );
      setPrimeraSerie(rows[0] ?? null);
    } finally {
      setCargandoSerie(false);
    }
  }

  async function ventaHecha(obraId: number) {
    setVentaTarget(null);
    if (context) await asegurarCopiaOfrecible(context.db, obraId);
    onCambio?.(obraId);
    await abrirInfo(obraId);
  }

  if (!actual) return null;
  return (
    <>
      <Modal onClose={onCerrar} wide className="modal-content-image">
        <span className="lightbox-contador" aria-label={t("galeria.posicionFoto")}>
          {indice + 1} / {items.length}
        </span>
        {items.length > 1 && (
          <button type="button" className="lightbox-arrow lightbox-arrow-left" onClick={() => mover(-1)} aria-label={t("galeria.anterior")}>
            ‹
          </button>
        )}
        {items.length > 1 && (
          <button type="button" className="lightbox-arrow lightbox-arrow-right" onClick={() => mover(1)} aria-label={t("galeria.siguiente")}>
            ›
          </button>
        )}
        <div className="lightbox-content">
          {error && (
            <p className="error" role="alert">
              ⚠️ {error}
            </p>
          )}
          {cargando && !url && <p>{t("common.loading")}</p>}
          {url && <img src={url} alt={actual.titulo} className="obra-full-image" onContextMenu={(e) => onMenuImagen(e, actual.id)} />}
          {seleccion && (
            <button
              type="button"
              className={`lightbox-elegir${seleccion.elegidas.has(actual.id) ? " activo" : ""}`}
              onClick={() => seleccion.alternar(actual.id)}
            >
              {seleccion.elegidas.has(actual.id) ? t("selecciones.visorElegida") : t("selecciones.visorElegir")}
            </button>
          )}
          <p className="lightbox-caption">
            <StarRating value={actual.calificacion} onChange={(n) => onCalificar(actual.id, n)} className="star-rating-lightbox" />
            {actual.titulo}
            <button
              type="button"
              className={`lightbox-info-button${infoAbierta ? " activo" : ""}`}
              onClick={() => abrirInfo(actual.id)}
              aria-label={t("galeria.verInfo")}
              title={t("galeria.verInfo")}
            >
              ⓘ
            </button>
          </p>
        </div>
      </Modal>

      {infoAbierta && info && info.id === actual.id && (
        <Modal onClose={() => setInfoAbierta(false)}>
          <div className="lightbox-info">
            {info.nombre_completo && <span>{info.nombre_completo}</span>}
            <span>
              {t(`categoria.${info.categoria_obra}` as TranslationKey)}
              {" — "}
              {Number(info.sin_limite) === 1
                ? t("obrasList.sinSerie")
                : Number(info.es_seriada) === 1
                  ? t("obrasList.seriada")
                  : t("obrasList.unica")}
            </span>
            {Number(info.es_seriada) === 1 && info.escala_por_tamanos === "Si" && <span>{t("obraDetail.escalaPorTamanos")}</span>}
            {Number(info.es_seriada) === 1 && info.escala_por_tamanos !== "Si" && info.dimensiones && (
              <span>{t("obraDetail.dimensiones", { valor: info.dimensiones })}</span>
            )}
            {Number(info.es_seriada) === 1 ? (
              (() => {
                const disponibles = Number(info.ejemplares_disponible) || 0;
                const total = Number(info.total_ejemplares) || 0;
                return (
                  <>
                    <span className={`obra-card-estado obra-card-estado-${disponibles > 0 ? "disponible" : "vendida"}`}>
                      {t("obrasList.fraccionDisponibles", { disponibles, total })}
                    </span>
                    {FRAGMENTOS_ESTADO.map(({ estado, key, campo }) => {
                      const n = Number(info[campo]) || 0;
                      return n === 0 ? null : (
                        <span key={estado} className={`obra-card-estado obra-card-estado-${estado}`}>
                          {t(key, { n })}
                        </span>
                      );
                    })}
                  </>
                );
              })()
            ) : (
              <span className={`obra-card-estado obra-card-estado-${info.estado}`}>{t(`estado.${info.estado}` as TranslationKey)}</span>
            )}
          </div>

          <div className="obra-form-saved-actions">
            <button type="button" onClick={() => onAbrirFicha(actual.id)}>
              {t("galeria.verEstaObra")}
            </button>
          </div>

          {Number(info.es_seriada) === 1 && (
            <div className="lightbox-info-serie">
              <h3>{t("galeria.primeraSerieDisponibleTitulo")}</h3>
              {cargandoSerie && <p>{t("common.loading")}</p>}
              {!cargandoSerie && !primeraSerie && <p>{t("galeria.sinSerieDisponible")}</p>}
              {!cargandoSerie && primeraSerie && (
                <dl className="lightbox-info-serie-datos">
                  <dt>{t("obraDetail.serieNumeroLabel")}</dt>
                  <dd>{primeraSerie.numero}</dd>
                  {primeraSerie.fecha_impresion && (
                    <>
                      <dt>{t("obraDetail.fechaImpresion")}</dt>
                      <dd>{formatFechaDDMMYYYY(primeraSerie.fecha_impresion)}</dd>
                    </>
                  )}
                  {primeraSerie.soporte_impresion && (
                    <>
                      <dt>{t("obraDetail.soporteImpresion")}</dt>
                      <dd>{primeraSerie.soporte_impresion}</dd>
                    </>
                  )}
                  {primeraSerie.dimensiones && (
                    <>
                      <dt>{t("obraDetail.tamanoEjemplarLabel")}</dt>
                      <dd>{primeraSerie.dimensiones}</dd>
                    </>
                  )}
                  {primeraSerie.ubicacion_actual && (
                    <>
                      <dt>{t("obraDetail.ubicacionActualCopia")}</dt>
                      <dd>{primeraSerie.ubicacion_actual}</dd>
                    </>
                  )}
                  {primeraSerie.precio_venta != null && (
                    <>
                      <dt>{t("obraDetail.valorLabel")}</dt>
                      <dd>
                        {primeraSerie.moneda_venta} {primeraSerie.precio_venta}
                      </dd>
                    </>
                  )}
                  {primeraSerie.notas && (
                    <>
                      <dt>{t("obraDetail.notasEjemplarLabel")}</dt>
                      <dd>{primeraSerie.notas}</dd>
                    </>
                  )}
                </dl>
              )}
              {!cargandoSerie && primeraSerie && (
                <div className="obra-form-saved-actions">
                  <button type="button" onClick={() => setVentaTarget({ obraId: actual.id, ejemplarId: primeraSerie.id })}>
                    {t("obraDetail.ventaReserva")}
                  </button>
                </div>
              )}
            </div>
          )}
        </Modal>
      )}

      {ventaTarget && (
        <Modal onClose={() => setVentaTarget(null)} className="modal-content-drawer">
          <VentaForm
            obraId={ventaTarget.obraId}
            ejemplarId={ventaTarget.ejemplarId}
            esSeriada
            onDone={() => ventaHecha(ventaTarget.obraId)}
            onCancel={() => setVentaTarget(null)}
          />
        </Modal>
      )}
    </>
  );
}
