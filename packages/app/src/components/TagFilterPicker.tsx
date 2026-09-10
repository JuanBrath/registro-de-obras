import { useLanguage } from "../i18n/LanguageContext.js";

/**
 * Filtro de etiquetas por acumulacion: elegir una del desplegable la agrega
 * como chip al lado (no reemplaza a las que ya estaban elegidas); cada chip
 * se puede quitar por separado con su "x". Compartido entre ObrasList y
 * GaleriaFotos, que filtran por la interseccion de las etiquetas elegidas
 * (una obra tiene que tener todas, no solo alguna).
 */
export function TagFilterPicker({
  opciones,
  value,
  onChange,
}: {
  /** Etiquetas disponibles para elegir (tipicamente las presentes entre las obras ya cargadas). */
  opciones: string[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const { t } = useLanguage();
  const disponibles = opciones.filter((tag) => !value.includes(tag));

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
        <div className="tags-list">
          {value.map((tag) => (
            <span key={tag} className="tag-chip tag-chip-removable">
              {tag}
              <button type="button" onClick={() => quitar(tag)} aria-label={t("tagPicker.quitarEtiqueta", { tag })}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      {disponibles.length > 0 && (
        <select value="" onChange={(e) => agregar(e.target.value)}>
          <option value="" disabled>
            {t("obrasList.agregarEtiqueta")}
          </option>
          {disponibles.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
