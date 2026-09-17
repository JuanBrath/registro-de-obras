import { useLanguage } from "../i18n/LanguageContext.js";

/** Tamano de fuente minimo y maximo de la nube de palabras, en rem. */
const TAMANO_MIN = 0.8;
const TAMANO_MAX = 1.5;

/**
 * Filtro de etiquetas por acumulacion: hacer clic en una palabra de la nube
 * la agrega como chip (no reemplaza a las que ya estaban elegidas); cada
 * chip se puede quitar por separado con su "x", o todas juntas con "Quitar
 * todo". El tamano de cada palabra en la nube refleja cuantas obras tienen
 * esa etiqueta (mas grande = mas frecuente), igual que una nube de
 * etiquetas tipica. Compartido entre ObrasList y GaleriaFotos, que filtran
 * por la union de las etiquetas elegidas (alcanza con que una obra tenga
 * alguna, no hace falta que tenga todas).
 */
export function TagFilterPicker({
  opciones,
  value,
  onChange,
}: {
  /** Etiquetas disponibles con su frecuencia (cuantas obras ya cargadas la tienen). */
  opciones: { tag: string; count: number }[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const { t } = useLanguage();
  const disponibles = opciones.filter((o) => !value.includes(o.tag));

  const counts = opciones.map((o) => o.count);
  const min = Math.min(...counts);
  const max = Math.max(...counts);

  function proporcion(count: number): number {
    if (max === min) return 0.5;
    return (count - min) / (max - min);
  }

  function tamano(count: number): number {
    return TAMANO_MIN + proporcion(count) * (TAMANO_MAX - TAMANO_MIN);
  }

  /** Las etiquetas mas frecuentes se ven mas "llenas"; las raras, mas tenues. */
  function opacidad(count: number): number {
    return 0.55 + proporcion(count) * 0.45;
  }

  function agregar(tag: string) {
    if (!tag || value.includes(tag)) return;
    onChange([...value, tag]);
  }

  function quitar(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  return (
    <div className="tag-filter-picker">
      {value.length > 0 && (
        <div className="tag-filter-seleccion">
          <span className="tag-filter-seleccion-label">{t("obrasList.filtrandoPorEtiquetas")}</span>
          {value.map((tag) => (
            <span key={tag} className="tag-chip tag-chip-removable">
              {tag}
              <button type="button" onClick={() => quitar(tag)} aria-label={t("tagPicker.quitarEtiqueta", { tag })}>
                ×
              </button>
            </span>
          ))}
          <button type="button" className="tag-filter-quitar-todo" onClick={() => onChange([])}>
            {t("obrasList.quitarTodasEtiquetas")}
          </button>
        </div>
      )}
      {disponibles.length > 0 && (
        <div className="tag-nube">
          {disponibles.map(({ tag, count }) => (
            <button
              key={tag}
              type="button"
              className="tag-nube-palabra"
              style={{ fontSize: `${tamano(count)}rem`, opacity: opacidad(count) }}
              onClick={() => agregar(tag)}
              title={t("obrasList.etiquetaCantidadObras", { count: String(count) })}
            >
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
