import { useEffect, useState } from "react";
import type { CategoriaObra } from "@registro/core";
import { useWorkspace } from "../state/WorkspaceContext.js";
import { useLanguage, type TranslationKey } from "../i18n/LanguageContext.js";
import { InformesModal } from "./InformesModal.js";
import { subtipoTranslationKey } from "../screens/fields/ObraDetalleFields.js";
import { detectImageFormat } from "../utils/detectImageFormat.js";
import { fittedImageSize, type FirmaEleccion } from "../utils/pdfBranding.js";
import { tInforme, type InformeIdioma } from "../reports/informeIdioma.js";
import { resolveMembreteLogoBytes, resolveFirmaBytes, resolveLocalidad } from "../reports/reportBranding.js";
import { buildObrasListadoPdfBytes, type ObraListadoItem } from "../reports/obrasListadoReports.js";
import { savePdfWithDialog } from "../utils/savePdfDialog.js";

/** Datos mínimos de cada obra para el listado (Obras los tiene todos en ObraRow). */
export interface InformeObraRow {
  id: number;
  titulo: string;
  nombre_completo: string | null;
  categoria_obra: CategoriaObra;
  subtipo_fotografia: string | null;
  subtipo: string | null;
  ejemplares_disponible: number;
  miniatura_path: string | null;
}

/** Consulta los datos del listado para las obras indicadas (en el orden recibido). */
export const SQL_INFORME_OBRAS = (placeholders: string) => `
  SELECT obra.id, obra.titulo, obra.categoria_obra, obra.miniatura_path, artista.nombre_completo,
         obra_fotografia.subtipo_fotografia, obra_detalle.subtipo,
         COALESCE(SUM(CASE WHEN ejemplar.tipo = 'edicion' AND ejemplar.estado = 'disponible' THEN 1 ELSE 0 END), 0) AS ejemplares_disponible
  FROM obra
  LEFT JOIN ejemplar ON ejemplar.obra_id = obra.id
  LEFT JOIN artista ON artista.id = obra.artista_id
  LEFT JOIN obra_fotografia ON obra_fotografia.obra_id = obra.id
  LEFT JOIN obra_detalle ON obra_detalle.obra_id = obra.id
  WHERE obra.id IN (${placeholders})
  GROUP BY obra.id`;

/**
 * Ventana de "Generar informe" (listado resumido, con o sin miniatura) para un conjunto de obras:
 * la usan Obras (con lo que muestra el filtro) y Selecciones (con las obras de la selección).
 */
export function InformeListadoObrasModal({ obras, onClose }: { obras: InformeObraRow[]; onClose: () => void }) {
  const { context, personalArtista, galeriaPerfil } = useWorkspace();
  const { t, idioma } = useLanguage();
  const [listo, setListo] = useState(false);
  const [informeSeleccionId, setInformeSeleccionId] = useState("resumido");
  const [informeIdioma, setInformeIdioma] = useState<InformeIdioma>(idioma);
  const [informeIncluirLogo, setInformeIncluirLogo] = useState(true);
  const [informeIncluirFecha, setInformeIncluirFecha] = useState(true);
  const [informeFirma, setInformeFirma] = useState<FirmaEleccion>("ninguna");
  const [firmaBytesDisponibles, setFirmaBytesDisponibles] = useState<Uint8Array | null>(null);
  const [generando, setGenerando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  useEffect(() => {
    if (!context) return;
    resolveFirmaBytes(context, personalArtista, galeriaPerfil)
      .then(setFirmaBytesDisponibles)
      .finally(() => setListo(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context]);

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

  async function generar() {
    if (!context) return;
    const conImagen = informeSeleccionId === "resumido_con_imagen";
    setGenerando(true);
    setMensaje(null);
    try {
      const tr = (key: TranslationKey, vars?: Record<string, string | number>) => tInforme(informeIdioma, key, vars);
      const primeraSerieLibre = await cargarPrimeraSerieLibre(obras.map((o) => o.id));

      const items: ObraListadoItem[] = [];
      for (const o of obras) {
        const subtipoValor = o.categoria_obra === "Fotografia" ? o.subtipo_fotografia : o.subtipo;
        const celdas = [
          o.titulo,
          o.nombre_completo ?? "",
          tInforme("es", `categoria.${o.categoria_obra}` as TranslationKey),
          subtipoValor ? tInforme("es", subtipoTranslationKey(o.categoria_obra, subtipoValor as never)) : "—",
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
      if (guardado) setMensaje(t("informesObras.informeGenerado"));
    } catch (err) {
      setMensaje(`⚠️ ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setGenerando(false);
    }
  }

  if (!listo) return null;

  return (
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
      onGenerar={generar}
      generando={generando}
      mensaje={mensaje}
      onClose={onClose}
    />
  );
}
