import { useEffect, useMemo, useState } from "react";
import { useWorkspace } from "../state/WorkspaceContext.js";
import { useLanguage } from "../i18n/LanguageContext.js";
import { Modal } from "./Modal.js";
import { listObraIdsDeSeleccion } from "../data/selecciones.js";
import { resolveObraImagenParaPdf } from "../utils/resolveObraImagenPdf.js";
import { resolveMembreteLogoBytes } from "../reports/reportBranding.js";
import { savePdfWithDialog } from "../utils/savePdfDialog.js";
import {
  buildDossierPdfBytes,
  claveSerie,
  formatearPrecio,
  medidasEnCm,
  type DossierArtista,
  type DossierObra,
} from "../reports/dossierReports.js";

interface FilaObra {
  id: number;
  titulo: string;
  anio_periodo: string | null;
  statement: string | null;
  artista_id: number;
  nombre_completo: string | null;
  nombre_artistico: string | null;
  bio: string | null;
  bio_en: string | null;
  serie: string | null;
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
}

interface SerieDetectada {
  clave: string;
  artistaId: number;
  nombre: string;
}

/** Asistente para armar el dossier en PDF de una selección: elegir qué conceptos incluir y generarlo. */
export function DossierModal({
  seleccionId,
  seleccionNombre,
  onClose,
}: {
  seleccionId: number;
  seleccionNombre: string;
  onClose: () => void;
}) {
  const { context, personalArtista, galeriaPerfil } = useWorkspace();
  const { t } = useLanguage();
  const [filas, setFilas] = useState<FilaObra[]>([]);
  const [ejemplares, setEjemplares] = useState<FilaEjemplar[]>([]);
  const [cargando, setCargando] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const [idioma, setIdioma] = useState<"es" | "en">("es");
  const [titulo, setTitulo] = useState("");
  const [incluirPortada, setIncluirPortada] = useState(true);
  const [incluirBio, setIncluirBio] = useState(true);
  const [incluirTextoSerie, setIncluirTextoSerie] = useState(true);
  const [incluirTituloAnio, setIncluirTituloAnio] = useState(true);
  const [incluirTecnica, setIncluirTecnica] = useState(true);
  const [incluirMedidas, setIncluirMedidas] = useState(true);
  const [incluirPrecio, setIncluirPrecio] = useState(true);
  const [incluirContacto, setIncluirContacto] = useState(true);
  const [sufijoPrecio, setSufijoPrecio] = useState("+ IVA");
  const [sufijoCadaUno, setSufijoCadaUno] = useState("c/u");
  const [obrasPorPagina, setObrasPorPagina] = useState<1 | 2 | 4 | 6 | 8>(4);
  const [textosSerie, setTextosSerie] = useState<Record<string, string>>({});

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
          `SELECT obra.id, obra.titulo, obra.anio_periodo, obra.statement, obra.artista_id,
                  artista.nombre_completo, artista.nombre_artistico, artista.bio, artista.bio_en,
                  obra_fotografia.serie_proyecto AS serie,
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
          `SELECT obra_id, precio_venta, moneda_venta, dimensiones FROM ejemplar
           WHERE tipo = 'edicion' AND obra_id IN (${ph}) ORDER BY indice`,
          ids,
        );
        const porId = new Map(rows.map((r) => [r.id, r]));
        const ordenadas = ids.map((id) => porId.get(id)).filter((r): r is FilaObra => !!r);
        if (cancelado) return;
        setFilas(ordenadas);
        setEjemplares(ej);
        const artistas = new Set(ordenadas.map((r) => r.artista_id));
        const primero = ordenadas[0];
        setTitulo(artistas.size === 1 ? (primero?.nombre_artistico || primero?.nombre_completo || seleccionNombre) : seleccionNombre);
        // Texto de cada serie: arranca con el texto de la primera obra que lo tenga.
        const iniciales: Record<string, string> = {};
        for (const r of ordenadas) {
          if (!r.serie) continue;
          const k = claveSerie(r.artista_id, r.serie);
          if (!iniciales[k]) iniciales[k] = r.statement ?? "";
        }
        setTextosSerie(iniciales);
      } catch (e) {
        if (!cancelado) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [context, seleccionId, seleccionNombre]);

  const series = useMemo<SerieDetectada[]>(() => {
    const vistas = new Map<string, SerieDetectada>();
    for (const r of filas) {
      if (!r.serie) continue;
      const clave = claveSerie(r.artista_id, r.serie);
      if (!vistas.has(clave)) vistas.set(clave, { clave, artistaId: r.artista_id, nombre: r.serie });
    }
    return Array.from(vistas.values());
  }, [filas]);

  const sinPrecio = useMemo(() => !ejemplares.some((e) => e.precio_venta != null), [ejemplares]);

  function cambiarIdioma(nuevo: "es" | "en") {
    setIdioma(nuevo);
    setSufijoPrecio(nuevo === "es" ? "+ IVA" : "+ VAT");
    setSufijoCadaUno(nuevo === "es" ? "c/u" : "each");
  }

  async function generar() {
    if (!context) return;
    setGenerando(true);
    setError(null);
    setMensaje(null);
    try {
      const obras: DossierObra[] = [];
      for (const r of filas) {
        const mias = ejemplares.filter((e) => e.obra_id === r.id);
        const precios = mias.filter((e) => e.precio_venta != null);
        // Si las copias tienen precios distintos se muestra el menor ("desde" no se agrega: se aclara en el texto del cliente).
        const minimo = precios.length > 0 ? precios.reduce((a, b) => (b.precio_venta! < a.precio_venta! ? b : a)) : null;
        const medidas = medidasEnCm(mias.find((e) => e.dimensiones)?.dimensiones ?? r.dimensiones_obra);
        obras.push({
          id: r.id,
          artistaId: r.artista_id,
          artistaNombre: r.nombre_artistico || r.nombre_completo || "",
          titulo: r.titulo,
          anio: r.anio_periodo,
          tecnica: r.tecnica,
          medidas,
          precio: minimo ? formatearPrecio(minimo.precio_venta, minimo.moneda_venta) : null,
          serie: r.serie,
          imagen: await resolveObraImagenParaPdf(context, r),
        });
      }
      const artistas: DossierArtista[] = [];
      for (const r of filas) {
        if (artistas.some((a) => a.id === r.artista_id)) continue;
        artistas.push({
          id: r.artista_id,
          nombre: r.nombre_artistico || r.nombre_completo || "",
          bio: (idioma === "en" ? r.bio_en || r.bio : r.bio) ?? null,
        });
      }
      const logoBytes = await resolveMembreteLogoBytes(context, personalArtista, galeriaPerfil);
      const perfil = context.workspace === "personal" ? personalArtista : galeriaPerfil;
      const nombrePerfil = context.workspace === "personal" ? personalArtista?.nombreCompleto : galeriaPerfil?.nombre;
      const contactoLineas = !incluirContacto || !perfil
        ? []
        : [
            nombrePerfil,
            perfil.telefono,
            perfil.email,
            perfil.instagram,
            perfil.web,
            [perfil.direccion, perfil.localidad].filter(Boolean).join(", "),
          ].filter((x): x is string => !!x);

      const bytes = await buildDossierPdfBytes(artistas, obras, {
        tituloPortada: incluirPortada ? titulo : "",
        incluirBio,
        incluirTextoSerie,
        incluirTituloAnio,
        incluirTecnica,
        incluirMedidas,
        incluirPrecio,
        sufijoPrecio,
        sufijoCadaUno,
        textosSerie,
        obrasPorPagina,
        contactoLineas,
        logoBytes,
      });
      const nombreArchivo = `dossier_${seleccionNombre.replace(/[^\p{L}\p{N}]+/gu, "_")}.pdf`;
      const guardado = await savePdfWithDialog(bytes, nombreArchivo);
      if (guardado) setMensaje(t("dossier.generado"));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerando(false);
    }
  }

  const check = (label: string, value: boolean, set: (v: boolean) => void, disabled = false) => (
    <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <input type="checkbox" checked={value && !disabled} disabled={disabled} onChange={(e) => set(e.target.checked)} />
      <span>{label}</span>
    </label>
  );

  return (
    <Modal onClose={onClose} wide maximizable>
      <h2>{t("dossier.title", { nombre: seleccionNombre })}</h2>
      {cargando && <p>{t("common.loading")}</p>}
      {!cargando && filas.length === 0 && <p>{t("selecciones.sinObras")}</p>}
      {!cargando && filas.length > 0 && (
        <>
          <label>
            <span className="field-label">{t("dossier.idioma")}</span>
            <select value={idioma} onChange={(e) => cambiarIdioma(e.target.value as "es" | "en")}>
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </label>

          {check(t("dossier.portada"), incluirPortada, setIncluirPortada)}
          {incluirPortada && (
            <label>
              <span className="field-label">{t("dossier.tituloPortada")}</span>
              <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
            </label>
          )}
          {check(t("dossier.bio"), incluirBio, setIncluirBio)}
          {check(t("dossier.textoSerie"), incluirTextoSerie, setIncluirTextoSerie, series.length === 0)}
          {incluirTextoSerie &&
            series.map((s) => (
              <label key={s.clave}>
                <span className="field-label">{s.nombre}</span>
                <textarea
                  rows={3}
                  value={textosSerie[s.clave] ?? ""}
                  onChange={(e) => setTextosSerie((prev) => ({ ...prev, [s.clave]: e.target.value }))}
                />
              </label>
            ))}
          {series.length === 0 && <p className="field-hint">{t("dossier.sinSeries")}</p>}
          {check(t("dossier.tituloAnio"), incluirTituloAnio, setIncluirTituloAnio)}
          {check(t("dossier.tecnica"), incluirTecnica, setIncluirTecnica)}
          {check(t("dossier.medidas"), incluirMedidas, setIncluirMedidas)}
          {check(t("dossier.precio"), incluirPrecio, setIncluirPrecio, sinPrecio)}
          {sinPrecio && <p className="field-hint">{t("dossier.sinPrecio")}</p>}
          {incluirPrecio && !sinPrecio && (
            <div className="obras-toolbar-fila">
              <label>
                <span className="field-label">{t("dossier.sufijoPrecio")}</span>
                <input type="text" value={sufijoPrecio} onChange={(e) => setSufijoPrecio(e.target.value)} />
              </label>
              <label>
                <span className="field-label">{t("dossier.sufijoCadaUno")}</span>
                <input type="text" value={sufijoCadaUno} onChange={(e) => setSufijoCadaUno(e.target.value)} />
              </label>
            </div>
          )}
          {check(t("dossier.contacto"), incluirContacto, setIncluirContacto)}

          <label>
            <span className="field-label">{t("dossier.obrasPorPagina")}</span>
            <select value={obrasPorPagina} onChange={(e) => setObrasPorPagina(Number(e.target.value) as 1 | 2 | 4 | 6 | 8)}>
              {[1, 2, 4, 6, 8].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </>
      )}
      {error && <p className="error">{error}</p>}
      {mensaje && (
        <p className="success" role="status">
          ✅ {mensaje}
        </p>
      )}
      <div className="form-actions">
        <button type="button" onClick={onClose}>
          {t("common.close")}
        </button>
        <button type="button" onClick={generar} disabled={generando || cargando || filas.length === 0}>
          {generando ? t("common.saving") : t("dossier.generar")}
        </button>
      </div>
    </Modal>
  );
}
