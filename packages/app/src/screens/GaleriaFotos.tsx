import { useEffect, useMemo, useRef, useState } from "react";
import { parseTags, type CategoriaObra } from "@registro/core";
import { useWorkspace } from "../state/WorkspaceContext.js";
import { bytesToObjectUrl } from "../utils/imageObjectUrl.js";
import { Modal } from "../components/Modal.js";
import { useLanguage, type TranslationKey } from "../i18n/LanguageContext.js";
import { useEscapeToDismiss } from "../utils/useEscapeToDismiss.js";
import { formatFechaDDMMYYYY } from "../utils/formatFecha.js";
import type { ObrasListFiltros } from "./ObrasList.js";
import { subtipoTranslationKey } from "./fields/ObraDetalleFields.js";

interface PrimeraSerieDisponible {
  numero: string;
  fecha_impresion: string | null;
  soporte_impresion: string | null;
  dimensiones: string | null;
  ubicacion_actual: string | null;
  precio_venta: number | null;
  moneda_venta: string | null;
  notas: string | null;
}

interface FotoRow {
  id: number;
  titulo: string;
  miniatura_path: string | null;
  imagen_alta_resolucion_path: string | null;
  tags: string | null;
  artista_id: number | null;
  nombre_completo: string | null;
  categoria_obra: CategoriaObra;
  subtipo_fotografia: string | null;
  subtipo: string | null;
  dimensiones: string | null;
  escala_por_tamanos: string | null;
  marcada: number;
  estado: string;
  es_seriada: number;
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

// Mismo criterio que ObrasList: "disponible" ya lo cubre la fraccion
// "X/Y disponibles", asi que no se repite como fragmento aparte.
const FRAGMENTOS_ESTADO: { estado: string; key: TranslationKey; campo: keyof FotoRow }[] = [
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

export function GaleriaFotos({
  onBack,
  filtrosIniciales,
}: {
  onBack: () => void;
  filtrosIniciales?: ObrasListFiltros;
}) {
  const { context } = useWorkspace();
  const { t } = useLanguage();
  const esGaleria = context?.workspace === "galeria";
  const [fotos, setFotos] = useState<FotoRow[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEscapeToDismiss(error, setError);
  const [selectedTag, setSelectedTag] = useState<string | null>(filtrosIniciales?.selectedTag ?? null);
  const [selectedArtistaId, setSelectedArtistaId] = useState<number | null>(filtrosIniciales?.selectedArtistaId ?? null);
  const [selectedCategoria, setSelectedCategoria] = useState<CategoriaObra | null>(
    filtrosIniciales?.selectedCategoria ?? null,
  );
  const [selectedSubtipo, setSelectedSubtipo] = useState<string | null>(filtrosIniciales?.selectedSubtipo ?? null);
  const [soloMarcadas, setSoloMarcadas] = useState(filtrosIniciales?.soloMarcadas ?? false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [infoAbierta, setInfoAbierta] = useState(false);
  const [primeraSerieDisponible, setPrimeraSerieDisponible] = useState<PrimeraSerieDisponible | null>(null);
  const [cargandoSerieDisponible, setCargandoSerieDisponible] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [loadingLightbox, setLoadingLightbox] = useState(false);
  const objectUrlsRef = useRef<string[]>([]);
  const lightboxUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!context) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const rows = await context!.db.query<FotoRow>(
          `SELECT obra.id, obra.titulo, obra.miniatura_path, obra.imagen_alta_resolucion_path, obra.tags, obra.artista_id,
                  obra.categoria_obra, obra.marcada, obra.estado, obra.es_seriada, artista.nombre_completo,
                  obra_fotografia.subtipo_fotografia, obra_detalle.subtipo,
                  obra_fotografia.dimensiones, obra_fotografia.escala_por_tamanos,
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
           LEFT JOIN obra_detalle ON obra_detalle.obra_id = obra.id
           LEFT JOIN ejemplar ON ejemplar.obra_id = obra.id
           WHERE obra.miniatura_path IS NOT NULL
           GROUP BY obra.id
           ORDER BY obra.titulo COLLATE NOCASE ASC`,
        );
        if (cancelled) return;
        setFotos(rows);

        const urls: Record<number, string> = {};
        for (const foto of rows) {
          if (!foto.miniatura_path) continue;
          try {
            const bytes = await context!.fs.readFile(foto.miniatura_path);
            const url = bytesToObjectUrl(bytes);
            objectUrlsRef.current.push(url);
            urls[foto.id] = url;
          } catch {
            // Falta el archivo; se omite sin romper la galería.
          }
        }
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
    for (const foto of fotos) for (const tag of parseTags(foto.tags)) set.add(tag);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [fotos]);

  const allArtistas = useMemo(() => {
    const map = new Map<number, string>();
    for (const foto of fotos) {
      if (foto.artista_id != null && foto.nombre_completo != null) map.set(foto.artista_id, foto.nombre_completo);
    }
    return Array.from(map.entries())
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [fotos]);

  const allCategorias = useMemo(() => {
    const set = new Set<CategoriaObra>();
    for (const foto of fotos) set.add(foto.categoria_obra);
    return Array.from(set).sort();
  }, [fotos]);

  const allSubtipos = useMemo(() => {
    const map = new Map<string, { categoria: CategoriaObra; subtipo: string }>();
    for (const foto of fotos) {
      if (selectedCategoria && foto.categoria_obra !== selectedCategoria) continue;
      const subtipoValor = foto.categoria_obra === "Fotografia" ? foto.subtipo_fotografia : foto.subtipo;
      if (subtipoValor) {
        map.set(`${foto.categoria_obra}:${subtipoValor}`, { categoria: foto.categoria_obra, subtipo: subtipoValor });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.subtipo.localeCompare(b.subtipo));
  }, [fotos, selectedCategoria]);

  const filteredFotos = useMemo(
    () =>
      fotos.filter((f) => {
        const tagMatch = selectedTag === null || parseTags(f.tags).includes(selectedTag);
        const artistaMatch = !esGaleria || selectedArtistaId === null || f.artista_id === selectedArtistaId;
        const categoriaMatch = selectedCategoria === null || f.categoria_obra === selectedCategoria;
        const subtipoValor = f.categoria_obra === "Fotografia" ? f.subtipo_fotografia : f.subtipo;
        const subtipoMatch = selectedSubtipo === null || subtipoValor === selectedSubtipo;
        const marcadaMatch = !soloMarcadas || f.marcada !== 0;
        return tagMatch && artistaMatch && categoriaMatch && subtipoMatch && marcadaMatch;
      }),
    [fotos, selectedTag, selectedArtistaId, selectedCategoria, selectedSubtipo, soloMarcadas, esGaleria],
  );

  const hayMarcadas = useMemo(() => fotos.some((f) => f.marcada !== 0), [fotos]);

  async function handleToggleMarcada(fotoId: number, current: number) {
    const nuevoValor = current ? 0 : 1;
    setFotos((prev) => prev.map((f) => (f.id === fotoId ? { ...f, marcada: nuevoValor } : f)));
    try {
      await context!.db.execute("UPDATE obra SET marcada = ? WHERE id = ?", [nuevoValor, fotoId]);
    } catch (err) {
      setFotos((prev) => prev.map((f) => (f.id === fotoId ? { ...f, marcada: current } : f)));
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleDesmarcarTodas() {
    const previo = fotos;
    setFotos((prev) => prev.map((f) => ({ ...f, marcada: 0 })));
    try {
      await context!.db.execute("UPDATE obra SET marcada = 0 WHERE marcada = 1");
      setSoloMarcadas(false);
    } catch (err) {
      setFotos(previo);
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  function handleTagChange(value: string) {
    setSelectedTag(value === "" ? null : value);
    closeLightbox();
  }

  function handleArtistaChange(value: string) {
    setSelectedArtistaId(value === "" ? null : Number(value));
    closeLightbox();
  }

  function handleCategoriaChange(value: string) {
    setSelectedCategoria(value === "" ? null : (value as CategoriaObra));
    setSelectedSubtipo(null);
    closeLightbox();
  }

  function handleSubtipoChange(value: string) {
    setSelectedSubtipo(value === "" ? null : value);
    closeLightbox();
  }

  useEffect(() => {
    if (lightboxIndex === null || !context) return;
    const foto = filteredFotos[lightboxIndex];
    const path = foto?.imagen_alta_resolucion_path || foto?.miniatura_path;
    if (!path) return;

    let cancelled = false;
    setLoadingLightbox(true);
    context.fs
      .readFile(path)
      .then((bytes) => {
        if (cancelled) return;
        if (lightboxUrlRef.current) URL.revokeObjectURL(lightboxUrlRef.current);
        const url = bytesToObjectUrl(bytes);
        lightboxUrlRef.current = url;
        setLightboxUrl(url);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoadingLightbox(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxIndex, context]);

  function closeLightbox() {
    setLightboxIndex(null);
    setLightboxUrl(null);
    setInfoAbierta(false);
  }

  function showNext() {
    setLightboxIndex((i) => (i === null || filteredFotos.length === 0 ? null : (i + 1) % filteredFotos.length));
    setInfoAbierta(false);
  }

  function showPrev() {
    setLightboxIndex((i) =>
      i === null || filteredFotos.length === 0 ? null : (i - 1 + filteredFotos.length) % filteredFotos.length,
    );
    setInfoAbierta(false);
  }

  async function abrirInfo(obraId: number) {
    setInfoAbierta(true);
    setPrimeraSerieDisponible(null);
    if (!context) return;
    setCargandoSerieDisponible(true);
    try {
      const rows = await context.db.query<PrimeraSerieDisponible>(
        `SELECT numero, fecha_impresion, soporte_impresion, dimensiones, ubicacion_actual, precio_venta, moneda_venta, notas
         FROM ejemplar
         WHERE obra_id = ? AND tipo = 'edicion' AND estado = 'disponible'
         ORDER BY indice ASC
         LIMIT 1`,
        [obraId],
      );
      setPrimeraSerieDisponible(rows[0] ?? null);
    } finally {
      setCargandoSerieDisponible(false);
    }
  }

  if (!context) return null;

  return (
    <div className="obras-list">
      <div className="obras-list-header">
        <h1>{t("galeria.title")}</h1>
        <div className="header-actions">
          <button type="button" onClick={onBack}>
            {t("common.back")}
          </button>
        </div>
      </div>

      {loading && <p>{t("common.loading")}</p>}
      {error && (
        <p className="error" role="alert">
          ⚠️ {error}
        </p>
      )}
      {!loading && fotos.length === 0 && <p>{t("galeria.sinFotos")}</p>}

      <div className="galeria-filtros-selects">
        {esGaleria && allArtistas.length > 0 && (
          <label className="galeria-filtro-artista">
            {t("obraForm.artistaLabel")}
            <select value={selectedArtistaId ?? ""} onChange={(e) => handleArtistaChange(e.target.value)}>
              <option value="">{t("galeria.todosArtistas")}</option>
              {allArtistas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
          </label>
        )}

        {allCategorias.length > 0 && (
          <label className="galeria-filtro-artista">
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
          <label className="galeria-filtro-artista">
            {t("field.subtipo")}
            <select value={selectedSubtipo ?? ""} onChange={(e) => handleSubtipoChange(e.target.value)}>
              <option value="">{t("galeria.todosSubtipos")}</option>
              {allSubtipos.map((entry) => (
                <option key={`${entry.categoria}:${entry.subtipo}`} value={entry.subtipo}>
                  {t(subtipoTranslationKey(entry.categoria, entry.subtipo))}
                </option>
              ))}
            </select>
          </label>
        )}

        {allTags.length > 0 && (
          <label className="galeria-filtro-artista">
            {t("obraForm.etiquetasLabel")}
            <select value={selectedTag ?? ""} onChange={(e) => handleTagChange(e.target.value)}>
              <option value="">{t("obrasList.todas")}</option>
              {allTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </label>
        )}

        {hayMarcadas && (
          <div className="galeria-filtro-marcadas-row">
            <label className="galeria-filtro-marcadas">
              <input
                type="checkbox"
                checked={soloMarcadas}
                onChange={(e) => {
                  setSoloMarcadas(e.target.checked);
                  closeLightbox();
                }}
              />
              {t("galeria.soloMarcadas")}
            </label>
            <button type="button" onClick={handleDesmarcarTodas}>
              {t("galeria.desmarcarTodas")}
            </button>
          </div>
        )}
      </div>

      <div className="obras-grid galeria-fotos-grid">
        {filteredFotos.map(
          (foto, i) =>
            thumbnails[foto.id] && (
              <div className="galeria-foto-thumb-wrapper" key={foto.id}>
                <button type="button" className="galeria-foto-thumb-button" onClick={() => setLightboxIndex(i)}>
                  <img src={thumbnails[foto.id]} alt={foto.titulo} />
                </button>
                <button
                  type="button"
                  className={`marcar-badge${foto.marcada ? " marcada" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleMarcada(foto.id, foto.marcada);
                  }}
                  aria-label={t(foto.marcada ? "galeria.desmarcar" : "galeria.marcar")}
                  title={t(foto.marcada ? "galeria.desmarcar" : "galeria.marcar")}
                >
                  {foto.marcada ? "★" : "☆"}
                </button>
              </div>
            ),
        )}
      </div>
      {!loading && fotos.length > 0 && filteredFotos.length === 0 && <p>{t("galeria.ningunaConEtiqueta")}</p>}

      {lightboxIndex !== null && (
        <Modal onClose={closeLightbox} wide className="modal-content-image">
          {filteredFotos.length > 1 && (
            <button
              type="button"
              className="lightbox-arrow lightbox-arrow-left"
              onClick={showPrev}
              aria-label={t("galeria.anterior")}
            >
              ‹
            </button>
          )}
          {filteredFotos.length > 1 && (
            <button
              type="button"
              className="lightbox-arrow lightbox-arrow-right"
              onClick={showNext}
              aria-label={t("galeria.siguiente")}
            >
              ›
            </button>
          )}
          <div className="lightbox-content">
            {loadingLightbox && !lightboxUrl && <p>{t("common.loading")}</p>}
            {lightboxUrl && (
              <img src={lightboxUrl} alt={filteredFotos[lightboxIndex]?.titulo} className="obra-full-image" />
            )}
            <p className="lightbox-caption">
              {filteredFotos[lightboxIndex] && (
                <button
                  type="button"
                  className={`marcar-badge marcar-badge-lightbox${filteredFotos[lightboxIndex].marcada ? " marcada" : ""}`}
                  onClick={() => handleToggleMarcada(filteredFotos[lightboxIndex].id, filteredFotos[lightboxIndex].marcada)}
                  aria-label={t(filteredFotos[lightboxIndex].marcada ? "galeria.desmarcar" : "galeria.marcar")}
                  title={t(filteredFotos[lightboxIndex].marcada ? "galeria.desmarcar" : "galeria.marcar")}
                >
                  {filteredFotos[lightboxIndex].marcada ? "★" : "☆"}
                </button>
              )}
              {filteredFotos[lightboxIndex]?.titulo} — {lightboxIndex + 1} / {filteredFotos.length}
              {filteredFotos[lightboxIndex] && (
                <button
                  type="button"
                  className={`lightbox-info-button${infoAbierta ? " activo" : ""}`}
                  onClick={() => abrirInfo(filteredFotos[lightboxIndex].id)}
                  aria-label={t("galeria.verInfo")}
                  title={t("galeria.verInfo")}
                >
                  ⓘ
                </button>
              )}
            </p>
          </div>
        </Modal>
      )}

      {infoAbierta && lightboxIndex !== null && filteredFotos[lightboxIndex] && (
        <Modal onClose={() => setInfoAbierta(false)}>
          <div className="lightbox-info">
            {filteredFotos[lightboxIndex].nombre_completo && <span>{filteredFotos[lightboxIndex].nombre_completo}</span>}
            <span>
              {t(`categoria.${filteredFotos[lightboxIndex].categoria_obra}` as TranslationKey)}
              {" — "}
              {Number(filteredFotos[lightboxIndex].es_seriada) === 1 ? t("obrasList.seriada") : t("obrasList.unica")}
            </span>
            {filteredFotos[lightboxIndex].escala_por_tamanos === "Si" && (
              <span>{t("obraDetail.escalaPorTamanos")}</span>
            )}
            {filteredFotos[lightboxIndex].escala_por_tamanos === "No" && filteredFotos[lightboxIndex].dimensiones && (
              <span>{t("obraDetail.dimensiones", { valor: filteredFotos[lightboxIndex].dimensiones! })}</span>
            )}
            {Number(filteredFotos[lightboxIndex].es_seriada) === 1 ? (
              (() => {
                const foto = filteredFotos[lightboxIndex];
                const disponibles = Number(foto.ejemplares_disponible) || 0;
                const total = Number(foto.total_ejemplares) || 0;
                const claseDisponibles = disponibles > 0 ? "disponible" : "vendida";
                return (
                  <>
                    <span className={`obra-card-estado obra-card-estado-${claseDisponibles}`}>
                      {t("obrasList.fraccionDisponibles", { disponibles, total })}
                    </span>
                    {FRAGMENTOS_ESTADO.map(({ estado, key, campo }) => {
                      const n = Number(foto[campo]) || 0;
                      if (n === 0) return null;
                      return (
                        <span key={estado} className={`obra-card-estado obra-card-estado-${estado}`}>
                          {t(key, { n })}
                        </span>
                      );
                    })}
                  </>
                );
              })()
            ) : (
              <span className={`obra-card-estado obra-card-estado-${filteredFotos[lightboxIndex].estado}`}>
                {t(`estado.${filteredFotos[lightboxIndex].estado}` as TranslationKey)}
              </span>
            )}
          </div>

          {Number(filteredFotos[lightboxIndex].es_seriada) === 1 && (
            <div className="lightbox-info-serie">
              <h3>{t("galeria.primeraSerieDisponibleTitulo")}</h3>
              {cargandoSerieDisponible && <p>{t("common.loading")}</p>}
              {!cargandoSerieDisponible && !primeraSerieDisponible && <p>{t("galeria.sinSerieDisponible")}</p>}
              {!cargandoSerieDisponible && primeraSerieDisponible && (
                <dl className="lightbox-info-serie-datos">
                  <dt>{t("obraDetail.serieNumeroLabel")}</dt>
                  <dd>{primeraSerieDisponible.numero}</dd>
                  {primeraSerieDisponible.fecha_impresion && (
                    <>
                      <dt>{t("obraDetail.fechaImpresion")}</dt>
                      <dd>{formatFechaDDMMYYYY(primeraSerieDisponible.fecha_impresion)}</dd>
                    </>
                  )}
                  {primeraSerieDisponible.soporte_impresion && (
                    <>
                      <dt>{t("obraDetail.soporteImpresion")}</dt>
                      <dd>{primeraSerieDisponible.soporte_impresion}</dd>
                    </>
                  )}
                  {primeraSerieDisponible.dimensiones && (
                    <>
                      <dt>{t("obraDetail.tamanoEjemplarLabel")}</dt>
                      <dd>{primeraSerieDisponible.dimensiones}</dd>
                    </>
                  )}
                  {primeraSerieDisponible.ubicacion_actual && (
                    <>
                      <dt>{t("obraDetail.ubicacionActualCopia")}</dt>
                      <dd>{primeraSerieDisponible.ubicacion_actual}</dd>
                    </>
                  )}
                  {primeraSerieDisponible.precio_venta != null && (
                    <>
                      <dt>{t("obraDetail.valorLabel")}</dt>
                      <dd>
                        {primeraSerieDisponible.moneda_venta} {primeraSerieDisponible.precio_venta}
                      </dd>
                    </>
                  )}
                  {primeraSerieDisponible.notas && (
                    <>
                      <dt>{t("obraDetail.notasEjemplarLabel")}</dt>
                      <dd>{primeraSerieDisponible.notas}</dd>
                    </>
                  )}
                </dl>
              )}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
