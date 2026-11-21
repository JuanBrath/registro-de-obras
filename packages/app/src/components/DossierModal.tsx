import { useEffect, useMemo, useState } from "react";
import { useWorkspace } from "../state/WorkspaceContext.js";
import { useLanguage } from "../i18n/LanguageContext.js";
import { Modal } from "./Modal.js";
import { NotasLabel } from "./NotasLabel.js";
import { listObraIdsDeSeleccion, proximoNumeroDossier, registrarDossier } from "../data/selecciones.js";
import { openLocalFile } from "../utils/openExternalUrl.js";
import { resolveObraImagenParaPdf } from "../utils/resolveObraImagenPdf.js";
import { resolveMembreteLogoBytes } from "../reports/reportBranding.js";
import {
  buildDossierPdfBytes,
  formatearPrecio,
  medidasEnCm,
  type DossierArtista,
  type DossierObra,
} from "../reports/dossierReports.js";

interface FilaObra {
  id: number;
  titulo: string;
  anio_periodo: string | null;
  artista_id: number;
  nombre_completo: string | null;
  nombre_artistico: string | null;
  es_seriada: number;
  bio: string | null;
  bio_en: string | null;
  tecnica: string | null;
  dimensiones_obra: string | null;
  imagen_alta_resolucion_path: string | null;
  miniatura_path: string | null;
}

interface FilaEjemplar {
  obra_id: number;
  precio_venta: number | null;
  moneda_venta: string | null;
  dimensiones: string | null;
  tipo: string;
  numero: string;
  estado: string;
}

interface ArtistaFila {
  id: number;
  nombre: string;
  bio: string;
  bioEn: string;
}

interface Excepcion {
  hoja: number;
  cantidad: number;
}

const MAX_POR_HOJA = 12;

// Estados cuyos datos pueden mostrarse en un dossier. Quedan afuera: vendida, reservada, descartada,
// destruida y colección del autor.
const ESTADOS_OFRECIBLES = new Set(["disponible", "en_stock", "exhibicion", "consignacion", "en_produccion"]);

/** Cuántas hojas de obras salen con esta distribución (para mostrar un resumen). */
function contarHojas(total: number, porDefecto: number, excepciones: Excepcion[]): number {
  const mapa = new Map(excepciones.map((e) => [e.hoja, e.cantidad]));
  let restantes = total;
  let hoja = 1;
  while (restantes > 0) {
    restantes -= Math.max(1, mapa.get(hoja) ?? porDefecto);
    hoja++;
  }
  return hoja - 1;
}

/** Asistente para armar el dossier en PDF de una selección: elegir qué conceptos incluir y generarlo. */
export function DossierModal({
  seleccionId,
  seleccionNombre,
  onClose,
  onGenerado,
}: {
  seleccionId: number;
  seleccionNombre: string;
  onClose: () => void;
  /** Se llama después de guardar un dossier nuevo (para refrescar el historial). */
  onGenerado?: () => void;
}) {
  const { context, personalArtista, galeriaPerfil } = useWorkspace();
  const { t } = useLanguage();
  const [filas, setFilas] = useState<FilaObra[]>([]);
  const [ejemplares, setEjemplares] = useState<FilaEjemplar[]>([]);
  const [cargando, setCargando] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [ultimoAbsPath, setUltimoAbsPath] = useState<string | null>(null);

  const [idioma, setIdioma] = useState<"es" | "en">("es");
  const [incluirPortada, setIncluirPortada] = useState(true);
  const [tituloPortada, setTituloPortada] = useState("");
  const [nombreSeleccionEnPortada, setNombreSeleccionEnPortada] = useState(true);
  const [tamanoPortada, setTamanoPortada] = useState(18);
  const [textoAdicionalPortada, setTextoAdicionalPortada] = useState("");
  const [incluirBio, setIncluirBio] = useState(true);
  const [bios, setBios] = useState<Record<number, string>>({});
  const [biosEditadas, setBiosEditadas] = useState(false);
  const [incluirStatement, setIncluirStatement] = useState(true);
  const [statement, setStatement] = useState("");
  const [incluirTituloAnio, setIncluirTituloAnio] = useState(true);
  const [incluirTecnica, setIncluirTecnica] = useState(true);
  const [incluirMedidas, setIncluirMedidas] = useState(true);
  const [incluirPrecio, setIncluirPrecio] = useState(true);
  const [incluirNumeroSerie, setIncluirNumeroSerie] = useState(true);
  const [incluirPruebasArtista, setIncluirPruebasArtista] = useState(false);
  const [incluirContacto, setIncluirContacto] = useState(true);
  const [sufijoPrecio, setSufijoPrecio] = useState("+ IVA");
  const [sufijoCadaUno, setSufijoCadaUno] = useState("c/u");
  const [formatoPagina, setFormatoPagina] = useState<"a4" | "oficio">("a4");
  const [orientacion, setOrientacion] = useState<"horizontal" | "vertical">("horizontal");
  const [obrasPorPagina, setObrasPorPagina] = useState(4);
  const [excepciones, setExcepciones] = useState<Excepcion[]>([]);

  useEffect(() => {
    if (!context) return;
    let cancelado = false;
    (async () => {
      try {
        const ids = await listObraIdsDeSeleccion(context.db, seleccionId);
        if (ids.length === 0) {
          if (!cancelado) setFilas([]);
          return;
        }
        const ph = ids.map(() => "?").join(",");
        const rows = await context.db.query<FilaObra>(
          `SELECT obra.id, obra.titulo, obra.anio_periodo, obra.artista_id, obra.es_seriada,
                  artista.nombre_completo, artista.nombre_artistico, artista.bio, artista.bio_en,
                  COALESCE(obra_fotografia.tecnica, obra_detalle.tecnica) AS tecnica,
                  COALESCE(obra_fotografia.dimensiones, obra_detalle.dimensiones) AS dimensiones_obra,
                  obra.imagen_alta_resolucion_path, obra.miniatura_path
           FROM obra
           LEFT JOIN artista ON artista.id = obra.artista_id
           LEFT JOIN obra_fotografia ON obra_fotografia.obra_id = obra.id
           LEFT JOIN obra_detalle ON obra_detalle.obra_id = obra.id
           WHERE obra.id IN (${ph})`,
          ids,
        );
        const ej = await context.db.query<FilaEjemplar>(
          `SELECT obra_id, precio_venta, moneda_venta, dimensiones, tipo, numero, estado FROM ejemplar
           WHERE obra_id IN (${ph}) ORDER BY tipo, indice`,
          ids,
        );
        const porId = new Map(rows.map((r) => [r.id, r]));
        const ordenadas = ids.map((id) => porId.get(id)).filter((r): r is FilaObra => !!r);
        if (cancelado) return;
        setFilas(ordenadas);
        setEjemplares(ej);
        const artistasIds = new Set(ordenadas.map((r) => r.artista_id));
        const primero = ordenadas[0];
        setTituloPortada(artistasIds.size === 1 ? (primero?.nombre_artistico || primero?.nombre_completo || "") : "");
        const iniciales: Record<number, string> = {};
        for (const r of ordenadas) if (!(r.artista_id in iniciales)) iniciales[r.artista_id] = r.bio ?? "";
        setBios(iniciales);
      } catch (e) {
        if (!cancelado) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [context, seleccionId]);

  const artistas = useMemo<ArtistaFila[]>(() => {
    const vistos = new Map<number, ArtistaFila>();
    for (const r of filas) {
      if (!vistos.has(r.artista_id)) {
        vistos.set(r.artista_id, {
          id: r.artista_id,
          nombre: r.nombre_artistico || r.nombre_completo || "",
          bio: r.bio ?? "",
          bioEn: r.bio_en ?? "",
        });
      }
    }
    return Array.from(vistos.values());
  }, [filas]);

  // Datos de cada obra: la copia única si no es seriada; si es seriada, la primera copia (por índice) cuyo
  // estado se pueda ofrecer. Las vendidas, reservadas, descartadas, destruidas o de colección del autor se descartan.
  const elegidoPorObra = useMemo(() => {
    const mapa = new Map<number, FilaEjemplar>();
    const seriada = new Map(filas.map((f) => [f.id, Number(f.es_seriada) === 1]));
    for (const e of ejemplares) {
      if (e.tipo !== "edicion" || mapa.has(e.obra_id)) continue;
      if (!seriada.get(e.obra_id) || ESTADOS_OFRECIBLES.has(e.estado)) mapa.set(e.obra_id, e);
    }
    return mapa;
  }, [ejemplares, filas]);

  const sinPrecio = useMemo(() => !Array.from(elegidoPorObra.values()).some((e) => e.precio_venta != null), [elegidoPorObra]);
  const totalHojas = useMemo(
    () => contarHojas(filas.length, obrasPorPagina, excepciones),
    [filas.length, obrasPorPagina, excepciones],
  );

  function cambiarIdioma(nuevo: "es" | "en") {
    setIdioma(nuevo);
    setSufijoPrecio(nuevo === "es" ? "+ IVA" : "+ VAT");
    setSufijoCadaUno(nuevo === "es" ? "c/u" : "each");
    // Si todavía no se tocó ninguna biografía, se cambia a la del idioma elegido (si no hay, queda la otra).
    if (!biosEditadas) {
      const nuevas: Record<number, string> = {};
      for (const a of artistas) nuevas[a.id] = (nuevo === "en" ? a.bioEn || a.bio : a.bio) || "";
      setBios(nuevas);
    }
  }

  const cambiarExcepcion = (indice: number, cambios: Partial<Excepcion>) =>
    setExcepciones((prev) => prev.map((e, i) => (i === indice ? { ...e, ...cambios } : e)));
  const agregarExcepcion = () =>
    setExcepciones((prev) => {
      const siguiente = prev.length > 0 ? Math.max(...prev.map((e) => e.hoja)) + 1 : 1;
      return [...prev, { hoja: siguiente, cantidad: obrasPorPagina }];
    });

  async function generar() {
    if (!context) return;
    setGenerando(true);
    setError(null);
    setMensaje(null);
    try {
      const obras: DossierObra[] = [];
      const conMiniatura: string[] = [];
      for (const r of filas) {
        const mias = ejemplares.filter((e) => e.obra_id === r.id);
        const elegido = elegidoPorObra.get(r.id) ?? null;
        const seriada = Number(r.es_seriada) === 1;
        const pruebas = mias.filter((e) => e.tipo === "prueba_artista" && ESTADOS_OFRECIBLES.has(e.estado)).length;
        const es = idioma === "es";
        obras.push({
          id: r.id,
          artistaId: r.artista_id,
          artistaNombre: r.nombre_artistico || r.nombre_completo || "",
          titulo: r.titulo,
          anio: r.anio_periodo,
          tecnica: r.tecnica,
          medidas: medidasEnCm(elegido?.dimensiones ?? r.dimensiones_obra),
          precio: elegido ? formatearPrecio(elegido.precio_venta, elegido.moneda_venta) : null,
          numeroSerie: elegido && seriada ? `${es ? "Ejemplar" : "Edition"} ${elegido.numero}` : null,
          pruebasArtista:
            pruebas > 0
              ? es
                ? `${pruebas} ${pruebas === 1 ? "prueba de artista" : "pruebas de artista"}`
                : `${pruebas} artist's ${pruebas === 1 ? "proof" : "proofs"}`
              : null,
          imagen: await resolveObraImagenParaPdf(context, r).then((img) => {
            if (img?.usoMiniatura) conMiniatura.push(r.titulo);
            return img;
          }),
        });
      }
      const artistasPdf: DossierArtista[] = artistas.map((a) => ({ id: a.id, nombre: a.nombre, bio: bios[a.id] ?? "" }));
      const logoBytes = await resolveMembreteLogoBytes(context, personalArtista, galeriaPerfil);
      const perfil = context.workspace === "personal" ? personalArtista : galeriaPerfil;
      const nombrePerfil = context.workspace === "personal" ? personalArtista?.nombreCompleto : galeriaPerfil?.nombre;
      const contactoLineas =
        !incluirContacto || !perfil
          ? []
          : [
              nombrePerfil,
              perfil.telefono,
              perfil.email,
              perfil.instagram,
              perfil.web,
              [perfil.direccion, perfil.localidad].filter(Boolean).join(", "),
            ].filter((x): x is string => !!x);

      const bytes = await buildDossierPdfBytes(artistasPdf, obras, {
        tituloPortada: incluirPortada ? tituloPortada : "",
        subtituloPortada: incluirPortada && nombreSeleccionEnPortada ? seleccionNombre : "",
        textoAdicionalPortada: incluirPortada ? textoAdicionalPortada : "",
        tamanoPortada,
        incluirBio,
        statementTitulo: seleccionNombre,
        statementTexto: incluirStatement ? statement : "",
        incluirTituloAnio,
        incluirTecnica,
        incluirMedidas,
        incluirPrecio,
        incluirNumeroSerie,
        incluirPruebasArtista,
        sufijoPrecio,
        sufijoCadaUno,
        formatoPagina,
        orientacion,
        obrasPorPagina,
        obrasPorPaginaExcepciones: Object.fromEntries(excepciones.map((e) => [e.hoja, e.cantidad])),
        contactoLineas,
        logoBytes,
      });
      // Se guarda en la carpeta del registro con número correlativo y fecha: nunca pisa un dossier anterior.
      const numero = await proximoNumeroDossier(context.db, seleccionId);
      const ahora = new Date();
      const p2 = (n: number) => String(n).padStart(2, "0");
      const sello = `${ahora.getFullYear()}${p2(ahora.getMonth() + 1)}${p2(ahora.getDate())}-${p2(ahora.getHours())}${p2(ahora.getMinutes())}`;
      const relPath = `dossiers/${seleccionId}/dossier_${p2(numero)}_${sello}.pdf`;
      await context.fs.ensureDir(`dossiers/${seleccionId}`);
      await context.fs.writeFile(relPath, bytes);
      await registrarDossier(context.db, seleccionId, numero, relPath, obras.length);
      setUltimoAbsPath(await context.fs.resolveAbsolutePath(relPath));
      setMensaje(t("dossier.guardadoNumero", { numero }));
      if (conMiniatura.length > 0) setError(t("dossier.avisoMiniatura", { obras: conMiniatura.join(", ") }));
      onGenerado?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerando(false);
    }
  }

  const check = (label: string, value: boolean, set: (v: boolean) => void, disabled = false) => (
    <label className={`dossier-check${disabled ? " dossier-check-off" : ""}`}>
      <input type="checkbox" checked={value && !disabled} disabled={disabled} onChange={(e) => set(e.target.checked)} />
      <span>{label}</span>
    </label>
  );

  const numero = (valor: number, min: number, max: number, onChange: (n: number) => void) => (
    <input
      type="number"
      min={min}
      max={max}
      value={valor}
      onChange={(e) => {
        const n = Math.round(Number(e.target.value));
        if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
      }}
    />
  );

  return (
    <Modal onClose={onClose} wide maximizable>
      <div className="dossier-modal">
        <h2 className="dossier-titulo">{t("dossier.title", { nombre: seleccionNombre })}</h2>
        {cargando && <p>{t("common.loading")}</p>}
        {!cargando && filas.length === 0 && <p>{t("selecciones.sinObras")}</p>}
        {!cargando && filas.length > 0 && (
          <div className="dossier-cuerpo">
            <section className="dossier-seccion">
              <h3>{t("dossier.seccionFormato")}</h3>
              <div className="dossier-fila">
                <label className="dossier-campo">
                  <span className="field-label">{t("dossier.tamanoHoja")}</span>
                  <select value={formatoPagina} onChange={(e) => setFormatoPagina(e.target.value as "a4" | "oficio")}>
                    <option value="a4">A4 (210 × 297 mm)</option>
                    <option value="oficio">{t("dossier.oficio")} (216 × 330 mm)</option>
                  </select>
                </label>
                <label className="dossier-campo">
                  <span className="field-label">{t("dossier.orientacion")}</span>
                  <select value={orientacion} onChange={(e) => setOrientacion(e.target.value as "horizontal" | "vertical")}>
                    <option value="horizontal">{t("dossier.horizontal")}</option>
                    <option value="vertical">{t("dossier.vertical")}</option>
                  </select>
                </label>
              </div>
              <div className="dossier-fila">
                <label className="dossier-campo">
                  <span className="field-label">{t("dossier.idioma")}</span>
                  <select value={idioma} onChange={(e) => cambiarIdioma(e.target.value as "es" | "en")}>
                    <option value="es">Español</option>
                    <option value="en">English</option>
                  </select>
                </label>
                <label className="dossier-campo">
                  <span className="field-label">{t("dossier.obrasPorPagina")}</span>
                  {numero(obrasPorPagina, 1, MAX_POR_HOJA, setObrasPorPagina)}
                </label>
              </div>
              <div className="dossier-excepciones">
                <span className="field-label">{t("dossier.excepcionesTitulo")}</span>
                {excepciones.map((e, i) => (
                  <div className="dossier-fila dossier-excepcion" key={i}>
                    <label className="dossier-campo-chico">
                      <span>{t("dossier.hojaNumero")}</span>
                      {numero(e.hoja, 1, 999, (n) => cambiarExcepcion(i, { hoja: n }))}
                    </label>
                    <label className="dossier-campo-chico">
                      <span>{t("dossier.cantidadObras")}</span>
                      {numero(e.cantidad, 1, MAX_POR_HOJA, (n) => cambiarExcepcion(i, { cantidad: n }))}
                    </label>
                    <button type="button" onClick={() => setExcepciones((prev) => prev.filter((_, k) => k !== i))}>
                      {t("selecciones.quitar")}
                    </button>
                  </div>
                ))}
                <div>
                  <button type="button" onClick={agregarExcepcion}>
                    {t("dossier.agregarExcepcion")}
                  </button>
                </div>
              </div>
              <p className="dossier-nota">{t("dossier.resumenHojas", { obras: filas.length, hojas: totalHojas })}</p>
            </section>

            <section className="dossier-seccion">
              <h3>{t("dossier.seccionPortada")}</h3>
              {check(t("dossier.portada"), incluirPortada, setIncluirPortada)}
              {incluirPortada && (
                <>
                  <label className="dossier-campo">
                    <span className="field-label">{t("dossier.tituloPortada")}</span>
                    <input type="text" value={tituloPortada} onChange={(e) => setTituloPortada(e.target.value)} />
                  </label>
                  {check(t("dossier.nombreSeleccionPortada", { nombre: seleccionNombre }), nombreSeleccionEnPortada, setNombreSeleccionEnPortada)}
                  <label className="dossier-campo">
                    <span className="field-label">{t("dossier.textoAdicionalPortada")}</span>
                    <input type="text" value={textoAdicionalPortada} onChange={(e) => setTextoAdicionalPortada(e.target.value)} />
                  </label>
                  <label className="dossier-campo dossier-campo-chico">
                    <span className="field-label">{t("dossier.tamanoLetraPortada")}</span>
                    {numero(tamanoPortada, 10, 60, setTamanoPortada)}
                  </label>
                </>
              )}
            </section>

            <section className="dossier-seccion">
              <h3>{t("dossier.seccionTextos")}</h3>
              {check(t("dossier.bio"), incluirBio, setIncluirBio)}
              {incluirBio &&
                artistas.map((a) => (
                  <div className="dossier-campo" key={a.id}>
                    <NotasLabel
                      texto={bios[a.id] ?? ""}
                      onChange={(v) => {
                        setBiosEditadas(true);
                        setBios((prev) => ({ ...prev, [a.id]: v }));
                      }}
                    >
                      <span className="field-label">{artistas.length > 1 ? `${t("dossier.bioDe")} ${a.nombre}` : t("dossier.bioLabel")}</span>
                    </NotasLabel>
                    <textarea
                      rows={4}
                      value={bios[a.id] ?? ""}
                      onChange={(e) => {
                        setBiosEditadas(true);
                        setBios((prev) => ({ ...prev, [a.id]: e.target.value }));
                      }}
                    />
                  </div>
                ))}
              {check(t("dossier.statement"), incluirStatement, setIncluirStatement)}
              {incluirStatement && (
                <div className="dossier-campo">
                  <NotasLabel texto={statement} onChange={setStatement}>
                    <span className="field-label">{t("dossier.statementLabel", { nombre: seleccionNombre })}</span>
                  </NotasLabel>
                  <textarea rows={4} value={statement} onChange={(e) => setStatement(e.target.value)} />
                </div>
              )}
            </section>

            <section className="dossier-seccion">
              <h3>{t("dossier.seccionFicha")}</h3>
              <div className="dossier-checks">
                {check(t("dossier.tituloAnio"), incluirTituloAnio, setIncluirTituloAnio)}
                {check(t("dossier.tecnica"), incluirTecnica, setIncluirTecnica)}
                {check(t("dossier.medidas"), incluirMedidas, setIncluirMedidas)}
                {check(t("dossier.precio"), incluirPrecio, setIncluirPrecio, sinPrecio)}
                {check(t("dossier.numeroSerie"), incluirNumeroSerie, setIncluirNumeroSerie)}
                {check(t("dossier.pruebasArtista"), incluirPruebasArtista, setIncluirPruebasArtista)}
              </div>
              <p className="dossier-nota">{t("dossier.notaPrimerDisponible")}</p>
              {sinPrecio && <p className="dossier-nota">{t("dossier.sinPrecio")}</p>}
              {incluirPrecio && !sinPrecio && (
                <div className="dossier-fila">
                  <label className="dossier-campo">
                    <span className="field-label">{t("dossier.sufijoPrecio")}</span>
                    <input type="text" value={sufijoPrecio} onChange={(e) => setSufijoPrecio(e.target.value)} />
                  </label>
                  <label className="dossier-campo">
                    <span className="field-label">{t("dossier.sufijoCadaUno")}</span>
                    <input type="text" value={sufijoCadaUno} onChange={(e) => setSufijoCadaUno(e.target.value)} />
                  </label>
                </div>
              )}
            </section>

            <section className="dossier-seccion">
              <h3>{t("dossier.seccionCierre")}</h3>
              {check(t("dossier.contacto"), incluirContacto, setIncluirContacto)}
            </section>
          </div>
        )}
        {error && <p className="error">{error}</p>}
        {mensaje && (
          <p className="success" role="status">
            ✅ {mensaje}{" "}
            {ultimoAbsPath && (
              <button type="button" onClick={() => openLocalFile(ultimoAbsPath)}>
                {t("dossier.abrir")}
              </button>
            )}
          </p>
        )}
        <div className="dossier-acciones">
          <button type="button" onClick={onClose}>
            {t("common.close")}
          </button>
          <button type="button" onClick={generar} disabled={generando || cargando || filas.length === 0}>
            {generando ? t("common.saving") : t("dossier.generar")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
