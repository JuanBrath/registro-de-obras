import { useLanguage } from "../i18n/LanguageContext.js";
import { MIN_COLUMNAS_GRID, MAX_COLUMNAS_GRID } from "../utils/columnasGrid.js";

// El regulador se muestra invertido respecto a "columnas": arrastrar hacia
// la derecha da miniaturas mas grandes, que en la grilla significa MENOS
// columnas — de ahi la resta en vez de usar el valor del slider directo.
export function MiniaturasSizeSlider({
  columnas,
  onChange,
}: {
  columnas: number;
  onChange: (columnas: number) => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="miniaturas-slider-campo">
      <span className="miniaturas-slider-titulo">{t("obrasList.tamanoMiniaturasLabel")}</span>
      <input
        type="range"
        className="miniaturas-slider"
        min={MIN_COLUMNAS_GRID}
        max={MAX_COLUMNAS_GRID}
        value={MIN_COLUMNAS_GRID + MAX_COLUMNAS_GRID - columnas}
        onChange={(e) => onChange(MIN_COLUMNAS_GRID + MAX_COLUMNAS_GRID - Number(e.target.value))}
      />
    </div>
  );
}
