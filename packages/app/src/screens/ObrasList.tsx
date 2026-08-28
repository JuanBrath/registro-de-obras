import { useEffect, useMemo, useRef, useState } from "react";
import { parseTags, type CategoriaObra } from "@registro/core";
import { useWorkspace } from "../state/WorkspaceContext.js";
import { bytesToObjectUrl } from "../utils/imageObjectUrl.js";
import { useLanguage, type TranslationKey } from "../i18n/LanguageContext.js";
import { useEscapeToDismiss } from "../utils/useEscapeToDismiss.js";
import { subtipoTranslationKey } from "./fields/ObraDetalleFields.js";
import { InformesModal } from "../components/InformesModal.js";
import { HelpIcon } from "../components/HelpIcon.js";
import { detectImageFormat } from "../utils/detectImageFormat.js";
import { fittedImageSize, type FirmaEleccion } from "../utils/pdfBranding.js";
import { tInforme, type InformeIdioma } from "../reports/informeIdioma.js";
import { resolveMembreteLogoBytes, resolveFirmaBytes, resolveLocalidad } from "../reports/reportBranding.js";
import { buildObrasListadoPdfBytes, type ObraListadoItem } from "../reports/obrasListadoReports.js";
import { savePdfWithDialog } from "../utils/savePdfDialog.js";

export interface ObrasListFiltros {
  selectedTag: string | null;
  selectedArtistaId: number | null;
  selectedCategoria: CategoriaObra | null;
  selectedSubtipo: string | null;
  soloMarcadas: boolean;
}

interface ObraRow {
  id: number;
  titulo: string;
  categoria_obra: CategoriaObra;
  estado: string;
  es_seriada: number;
  miniatura_path: string | null;
  codigo_inventario: string | null;
  tags: string | null;
  artista_id: number | null;
  nombre_completo: string;
  subtipo_fotografia: string | null;
  subtipo: string | null;
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
  tiene_prueba_artista: number;
  marcada: number;
}

// Los fragmentos que se muestran junto a la fraccion "X/Y disponibles" —
// disponible queda afuera porque ya la cubre esa fraccion. El orden refleja
// el flujo habitual de una serie.
const FRAGMENTOS_ESTADO: { estado: string; key: TranslationKey; campo: keyof ObraRow }[] = [
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

export function ObrasList({
  onBack,
  onOpenObra,
  onNuevaObra,
  onVerGaleria,
}: {
  onBack: () => void;
  onOpenObra: (obraId: number) => void;
  onNuevaObra: () => void;
  onVerGaleria: (filtros: ObrasListFiltros) => void;
}) {
  const { context, personalArtista, galeriaPerfil } = useWorkspace();
  const { t, idioma } = useLanguage();
  const [obras, setObras] = useState<ObraRow[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEscapeToDismiss(error, setError);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedArtistaId, setSelectedArtistaId] = useState<number | null>(null);
  const [selectedCategoria, setSelectedCategoria] = useState<CategoriaObra | null>(null);
  const [selectedSubtipo, setSelectedSubtipo] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [soloMarcadas, setSoloMarcadas] = useState(false);
  const objectUrlsRef = useRef<string[]>([]);

  const [informesMenuAbierto, setInformesMenuAbierto] = useState(false);
  const [informeSeleccionId, setInformeSeleccionId] = useState("resumido");
  const [informeIdioma, setInformeIdioma] = useState<InformeIdioma>("es");
  const [informeIncluirLogo, setInformeIncluirLogo] = useState(true);
  const [informeIncluirFecha, setInformeIncluirFecha] = useState(true);
  const [informeFirma, setInformeFirma] = useState<FirmaEleccion>("ninguna");
  const [firmaBytesDisponibles, setFirmaBytesDisponibles] = useState<Uint8Array | null>(null);
  const [generandoInforme, setGenerandoInforme] = useState(false);
  const [informeMensaje, setInformeMensaje] = useState<string | null>(null);
  useEscapeToDismiss(informeMensaje, setInformeMensaje);

  useEffect(() => {
    if (!context) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const rows = await context!.db.query<ObraRow>(
          `SELECT obra.id, obra.titulo, obra.categoria_obra, obra.estado, obra.es_seriada, obra.miniatura_path,
                  obra.codigo_inventario, obra.tags,
                  obra.marcada, obra.artista_id, artista.nombre_completo,
                  obra_fotografia.subtipo_fotografia, obra_detalle.subtipo,
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
                  SUM(CASE WHEN ejemplar.tipo = 'edicion' AND ejemplar.estado = 'destruida' THEN 1 ELSE 0 END) as ejemplares_destruida,
                  MAX(CASE WHEN ejemplar.tipo = 'prueba_artista' THEN 1 ELSE 0 END) as tiene_prueba_artista
           FROM obra
           LEFT JOIN ejemplar ON ejemplar.obra_id = obra.id
           LEFT JOIN artista ON artista.id = obra.artista_id
           LEFT JOIN obra_fotografia ON obra_fotografia.obra_id = obra.id
           LEFT JOIN obra_detalle ON obra_detalle.obra_id = obra.id
           GROUP BY obra.id
           ORDER BY obra.titulo COLLATE NOCASE ASC`,
        );
        if (cancelled) return;
        setObras(rows);

        const urls: Record<number, string> = {};
        for (const obra of rows) {
          if (!obra.miniatura_path) continue;
          try {
            const bytes = await context!.fs.readFile(obra.miniatura_path);
            const url = bytesToObjectUrl(bytes);
            objectUrlsRef.current.push(url);
            urls[obra.id] = url;
          } catch {
            // La miniatura puede faltar si esa carga no incluyó imagen; se omite sin romper la lista.
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
    return obras.filter((o) => {
      if (soloMarcadas && o.marcada === 0) return false;
      if (selectedTag && !parseTags(o.tags).includes(selectedTag)) return false;
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
  }, [
    obras,
    selectedTag,
    selectedArtistaId,
    selectedCategoria,
    selectedSubtipo,
    busqueda,
    soloMarcadas,
    esRegistroPersonal,
    esGaleria,
  ]);

  const hayMarcadas = useMemo(() => obras.some((o) => o.marcada !== 0), [obras]);

  async function handleToggleMarcada(obraId: number, current: number) {
    const nuevoValor = current ? 0 : 1;
    setObras((prev) => prev.map((o) => (o.id === obraId ? { ...o, marcada: nuevoValor } : o)));
    try {
      await context!.db.execute("UPDATE obra SET marcada = ? WHERE id = ?", [nuevoValor, obraId]);
    } catch (err) {
      setObras((prev) => prev.map((o) => (o.id === obraId ? { ...o, marcada: current } : o)));
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleDesmarcarTodas() {
    const previo = obras;
    setObras((prev) => prev.map((o) => ({ ...o, marcada: 0 })));
    try {
      await context!.db.execute("UPDATE obra SET marcada = 0 WHERE marcada = 1");
      setSoloMarcadas(false);
    } catch (err) {
      setObras(previo);
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  function handleCategoriaChange(value: string) {
    setSelectedCategoria(value === "" ? null : (value as CategoriaObra));
    setSelectedSubtipo(null);
  }

  async function handleAbrirInformesMenu() {
    if (!context) return;
    setInformeSeleccionId("resumido");
    setInformeIdioma(idioma);
    setInformeIncluirLogo(true);
    setInformeIncluirFecha(true);
    setInformeFirma("ninguna");
    setInformeMensaje(null);
    setFirmaBytesDisponibles(await resolveFirmaBytes(context, personalArtista, galeriaPerfil));
    setInformesMenuAbierto(true);
  }

  // Para cada obra, la serie disponible con el indice mas bajo (la "primera").
  async function cargarPrimeraSerieLibre(obraIds: number[]): Promise<Record<number, string>> {
    if (!context || obraIds.length === 0) return {};
    const placeholders = obraIds.map(() => "?").join(", ");
    const rows = await context.db.query<{ obra_id: number; numero: string }>(
      `SELECT e.obra_id, e.numero
       FROM ejemplar e
       WHERE e.tipo = 'edicion' AND e.estado = 'disponible' AND e.obra_id IN (${placeholders})
         AND e.indice = (
           SELECT MIN(e2.indice) FROM ejemplar e2
           WHERE e2.obra_id = e.obra_id AND e2.tipo = 'edicion' AND e2.estado = 'disponible'
         )`,
      obraIds,
    );
    return Object.fromEntries(rows.map((r) => [r.obra_id, r.numero]));
  }

  async function handleGenerarInformeListado(conImagen: boolean) {
    if (!context) return;
    setGenerandoInforme(true);
    setError(null);
    setInformeMensaje(null);
    try {
      const tr = (key: TranslationKey, vars?: Record<string, string | number>) => tInforme(informeIdioma, key, vars);
      const obraIds = filteredObras.map((o) => o.id);
      const primeraSerieLibre = await cargarPrimeraSerieLibre(obraIds);

      const items: ObraListadoItem[] = [];
      for (const o of filteredObras) {
        const subtipoValor = o.categoria_obra === "Fotografia" ? o.subtipo_fotografia : o.subtipo;
        const celdas = [
          o.titulo,
          o.nombre_completo,
          tInforme("es", `categoria.${o.categoria_obra}` as TranslationKey),
          subtipoValor ? tInforme("es", subtipoTranslationKey(o.categoria_obra, subtipoValor)) : "—",
          String(o.ejemplares_disponible),
          primeraSerieLibre[o.id] ?? "—",
        ];

        let imagen: ObraListadoItem["imagen"] = null;
        if (conImagen && o.miniatura_path) {
          try {
            const bytes = await context.fs.readFile(o.miniatura_path);
            const formato = detectImageFormat(bytes);
            if (formato) {
              const { width, height } = await fittedImageSize(bytes, 16);
              imagen = { bytes, formato, width, height };
            }
          } catch {
            // Miniatura ausente o ilegible: se omite sin romper el informe.
          }
        }

        items.push({ celdas, imagen });
      }

      const headers = [
        tr("informesObras.colNombre"),
        tr("informesObras.colAutor"),
        tr("informesObras.colCategoria"),
        tr("informesObras.colSubcategoria"),
        tr("informesObras.colSeriesLibres"),
        tr("informesObras.colPrimeraSerieLibre"),
      ];

      const logoBytes = await resolveMembreteLogoBytes(context, personalArtista, galeriaPerfil);
      const bytes = await buildObrasListadoPdfBytes(t("obrasList.title"), headers, items, conImagen, {
        idioma: informeIdioma,
        logoBytes,
        incluirLogo: informeIncluirLogo,
        incluirFecha: informeIncluirFecha,
        firma: informeFirma,
        firmaBytes: firmaBytesDisponibles,
        localidad: resolveLocalidad(context, personalArtista, galeriaPerfil),
      });

      const sufijo = conImagen ? "_con_imagen" : "";
      const guardado = await savePdfWithDialog(bytes, `listado_obras${sufijo}.pdf`);
      if (guardado) setInformeMensaje(t("informesObras.informeGenerado"));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerandoInforme(false);
    }
  }

  async function handleConfirmarInformeObras() {
    setInformesMenuAbierto(false);
    await handleGenerarInformeListado(informeSeleccionId === "resumido_con_imagen");
  }

  if (!context) return null;

  return (
    <div className="obras-list">
      <div className="obras-list-header">
        <h1>{t("obrasList.title")}</h1>
        <div className="header-actions">
          <button type="button" onClick={onBack}>
            {t("common.back")}
          </button>
        </div>
      </div>

      <div className="header-actions obras-list-options">
        <button type="button" onClick={onNuevaObra}>
          {t("workspaceHome.nuevaObra")}
        </button>
        <button
          type="button"
          onClick={() =>
            onVerGaleria({ selectedTag, selectedArtistaId, selectedCategoria, selectedSubtipo, soloMarcadas })
          }
        >
          {t("workspaceHome.galeriaFotos")}
        </button>
      </div>

      {loading && <p>{t("common.loading")}</p>}
      {error && (
        <p className="error" role="alert">
          ⚠️ {error}
        </p>
      )}

      {!loading && obras.length === 0 && <p>{t("obrasList.sinObras")}</p>}

      {obras.length > 0 && (
        <div className="buscador-con-ayuda">
          <input type="search" className="obras-list-buscador" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          <HelpIcon fieldKey="busqueda_general" />
        </div>
      )}

      {(esGaleria ? allArtistas.length > 0 : false) ||
      allCategorias.length > 0 ||
      allSubtipos.length > 0 ||
      allTags.length > 0 ||
      hayMarcadas ? (
        <div className="galeria-filtros-selects">
          {esGaleria && allArtistas.length > 0 && (
            <label className="galeria-filtro-artista">
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

          {allTags.length > 0 && (
            <label className="galeria-filtro-artista">
              {t("obraForm.etiquetasLabel")}
              <select value={selectedTag ?? ""} onChange={(e) => setSelectedTag(e.target.value || null)}>
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
                <input type="checkbox" checked={soloMarcadas} onChange={(e) => setSoloMarcadas(e.target.checked)} />
                {t("galeria.soloMarcadas")}
              </label>
              <button type="button" onClick={handleDesmarcarTodas}>
                {t("galeria.desmarcarTodas")}
              </button>
            </div>
          )}
        </div>
      ) : null}

      {obras.length > 0 && (
        <div className="header-actions obras-list-options">
          <button type="button" onClick={handleAbrirInformesMenu} disabled={filteredObras.length === 0}>
            {t("informesObras.generarInforme")}
          </button>
        </div>
      )}

      {!loading && obras.length > 0 && filteredObras.length === 0 && <p>{t("obrasList.sinResultados")}</p>}

      <div className="obras-grid">
        {filteredObras.map((obra) => (
          <div className="obra-card-wrapper" key={obra.id}>
            <button
              type="button"
              className={`marcar-badge${obra.marcada ? " marcada" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                handleToggleMarcada(obra.id, obra.marcada);
              }}
              aria-label={t(obra.marcada ? "galeria.desmarcar" : "galeria.marcar")}
              title={t(obra.marcada ? "galeria.desmarcar" : "galeria.marcar")}
            >
              {obra.marcada ? "★" : "☆"}
            </button>
            <button type="button" className="obra-card" onClick={() => onOpenObra(obra.id)}>
            {thumbnails[obra.id] ? (
              <img src={thumbnails[obra.id]} alt={obra.titulo} />
            ) : (
              <div className="obra-card-placeholder">{t("obrasList.sinImagen")}</div>
            )}
            <div className="obra-card-info">
              <strong>{obra.titulo}</strong>
              <span>
                {t(`categoria.${obra.categoria_obra}` as TranslationKey)}
                {" — "}
                {Number(obra.es_seriada) === 1 ? t("obrasList.seriada") : t("obrasList.unica")}
              </span>
              {Number(obra.tiene_prueba_artista) === 1 && (
                <span className="obra-card-estado obra-card-estado-prueba-artista">
                  {t("obrasList.conPruebaAutor")}
                </span>
              )}
              {Number(obra.es_seriada) === 1 ? (
                (() => {
                  const disponibles = Number(obra.ejemplares_disponible) || 0;
                  const total = Number(obra.total_ejemplares) || 0;
                  const claseDisponibles = disponibles > 0 ? "disponible" : "vendida";

                  return (
                    <>
                      <span className={`obra-card-estado obra-card-estado-${claseDisponibles}`}>
                        {t("obrasList.fraccionDisponibles", { disponibles, total })}
                      </span>
                      {FRAGMENTOS_ESTADO.map(({ estado, key, campo }) => {
                        const n = Number(obra[campo]) || 0;
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
                <span className={`obra-card-estado obra-card-estado-${obra.estado}`}>
                  {t(`estado.${obra.estado}` as TranslationKey)}
                </span>
              )}
            </div>
            </button>
          </div>
        ))}
      </div>

      {informesMenuAbierto && (
        <InformesModal
          titulo={t("informesObras.generarInforme")}
          opciones={[
            { id: "resumido", label: t("informesObras.opcionResumido") },
            { id: "resumido_con_imagen", label: t("informesObras.opcionResumidoConImagen") },
          ]}
          selectedId={informeSeleccionId}
          onSelectId={setInformeSeleccionId}
          idioma={informeIdioma}
          onIdiomaChange={setInformeIdioma}
          incluirLogo={informeIncluirLogo}
          onIncluirLogoChange={setInformeIncluirLogo}
          incluirFecha={informeIncluirFecha}
          onIncluirFechaChange={setInformeIncluirFecha}
          firma={informeFirma}
          onFirmaChange={setInformeFirma}
          firmaDigitalDisponible={firmaBytesDisponibles !== null}
          onGenerar={handleConfirmarInformeObras}
          generando={generandoInforme}
          mensaje={informeMensaje}
          onClose={() => setInformesMenuAbierto(false)}
        />
      )}
    </div>
  );
}
