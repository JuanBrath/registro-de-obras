import type { CategoriaObra } from "@registro/core";
import { useLanguage, type TranslationKey } from "../i18n/LanguageContext.js";
import { MIN_COLUMNAS_GRID, MAX_COLUMNAS_GRID } from "../utils/columnasGrid.js";

export interface ObraRow {
  id: number;
  titulo: string;
  categoria_obra: CategoriaObra;
  estado: string;
  es_seriada: number;
  /** 1 si es una obra sin serie (venta sin límite). */
  sin_limite: number;
  miniatura_path: string | null;
  codigo_inventario: string | null;
  tags: string | null;
  artista_id: number | null;
  nombre_completo: string;
  subtipo_fotografia: string | null;
  subtipo: string | null;
  fecha_captura: string | null;
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
  calificacion: number;
  ubicacion_fisica_actual: string | null;
}

// Los fragmentos que se muestran junto a la fraccion "X/Y disponibles" —
// disponible queda afuera porque ya la cubre esa fraccion. El orden refleja
// el flujo habitual de una serie.
export const FRAGMENTOS_ESTADO: { estado: string; key: TranslationKey; campo: keyof ObraRow }[] = [
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

// En la vista en columnas no hay grilla (una fila por obra), asi que el
// mismo control de "tamano de las miniaturas" (que en tarjetas elige cuantas
// entran por fila) se reinterpreta directo como el ancho en pixeles de la
// miniatura de cada fila: menos "columnas" (control mas hacia "grande") da
// una miniatura mas ancha, igual sensacion que agrandar las tarjetas.
const ANCHO_MINIATURA_TABLA_MIN = 40;
const ANCHO_MINIATURA_TABLA_MAX = 160;

export function anchoMiniaturaTabla(columnas: number): number {
  const progreso = (columnas - MIN_COLUMNAS_GRID) / (MAX_COLUMNAS_GRID - MIN_COLUMNAS_GRID);
  return Math.round(ANCHO_MINIATURA_TABLA_MAX - progreso * (ANCHO_MINIATURA_TABLA_MAX - ANCHO_MINIATURA_TABLA_MIN));
}


/**
 * Consulta de las filas de obra que muestran Obras y Selecciones (con conteo de ejemplares por estado).
 * `where` es opcional (ej. "WHERE obra.id IN (?, ?)").
 */
export const SQL_OBRA_ROWS = (where = "") => `SELECT obra.id, obra.titulo, obra.categoria_obra, obra.estado, obra.es_seriada, obra.sin_limite, obra.miniatura_path,
                  obra.codigo_inventario, obra.tags,
                  obra.calificacion, obra.ubicacion_fisica_actual, obra.artista_id, artista.nombre_completo,
                  obra_fotografia.subtipo_fotografia, obra_detalle.subtipo,
                  obra_fotografia.fecha_captura,
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
           ${where}
           GROUP BY obra.id
           ORDER BY obra.titulo COLLATE NOCASE ASC`;

/** Texto de la tarjeta de una obra: título, SKU, categoría, estado y disponibilidad. */
export function ObraTarjetaInfo({ obra }: { obra: ObraRow }) {
  const { t } = useLanguage();
  return (
  <div className="obra-card-info">
        <strong>{obra.titulo}</strong>
        {obra.codigo_inventario && (
          <span className="obra-card-sku">
            {t("obrasList.skuPrefix")} {obra.codigo_inventario}
          </span>
        )}
        <span>
          {t(`categoria.${obra.categoria_obra}` as TranslationKey)}
          {" — "}
          {Number(obra.sin_limite) === 1
            ? t("obrasList.sinSerie")
            : Number(obra.es_seriada) === 1
              ? t("obrasList.seriada")
              : t("obrasList.unica")}
        </span>
        {Number(obra.tiene_prueba_artista) === 1 && (
          <span className="obra-card-estado obra-card-estado-prueba-artista">
            {t("obrasList.conPruebaAutor")}
          </span>
        )}
        {Number(obra.sin_limite) === 1 ? (
          <span className="obra-card-estado obra-card-estado-disponible">
            {t("obrasList.sinLimiteVendidas", { n: Number(obra.ejemplares_vendida) || 0 })}
          </span>
        ) : Number(obra.es_seriada) === 1 ? (
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
  );
}

/** Contenido de la celda "Disponibilidad" de la vista en columnas. */
export function ObraDisponibilidad({ obra }: { obra: ObraRow }) {
  const { t } = useLanguage();
  return (
    <>
    {Number(obra.tiene_prueba_artista) === 1 && (
            <>
              <span className="obra-card-estado obra-card-estado-prueba-artista">
                {t("obrasList.conPruebaAutor")}
              </span>
              <br />
            </>
          )}
          {Number(obra.sin_limite) === 1 ? (
            <span className="obra-card-estado obra-card-estado-disponible">
              {t("obrasList.sinLimiteVendidas", { n: Number(obra.ejemplares_vendida) || 0 })}
            </span>
          ) : Number(obra.es_seriada) === 1 ? (
            (() => {
              const disponibles = Number(obra.ejemplares_disponible) || 0;
              const total = Number(obra.total_ejemplares) || 0;
              const claseDisponibles = disponibles > 0 ? "disponible" : "vendida";
              return (
                <span className={`obra-card-estado obra-card-estado-${claseDisponibles}`}>
                  {t("obrasList.fraccionDisponibles", { disponibles, total })}
                </span>
              );
            })()
          ) : (
            <span className={`obra-card-estado obra-card-estado-${obra.estado}`}>
              {t(`estado.${obra.estado}` as TranslationKey)}
            </span>
          )}
    </>
  );
}
