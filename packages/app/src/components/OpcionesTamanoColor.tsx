import { useLanguage } from "../i18n/LanguageContext.js";
import type { FormatoExportacion, OpcionesTamanoColor } from "../utils/exportarImagen.js";

/**
 * Campos de tamaño y color de la exportación de imágenes, compartidos por "Exportar imagen…" y "Exportar fotos":
 * profundidad de color (solo TIFF), casilla "Cambiar el tamaño" (sin tildar, sale con el tamaño original) y, si se
 * tilda, el lado de referencia, la unidad (píxeles o centímetros) y la medida; en centímetros también la resolución.
 */
export function CamposTamanoColor({
  formato,
  valor,
  onChange,
  nombre,
}: {
  formato: FormatoExportacion;
  valor: OpcionesTamanoColor;
  onChange: (nuevo: OpcionesTamanoColor) => void;
  /** Prefijo único para los grupos de radios de esta ventana. */
  nombre: string;
}) {
  const { t } = useLanguage();
  const cambiar = (parcial: Partial<OpcionesTamanoColor>) => onChange({ ...valor, ...parcial });
  if (formato === "original") return null;

  return (
    <>
      <fieldset className="informes-fieldset">
        <legend>{t("exportarImagen.profundidadLegend")}</legend>
        {formato === "tiff" ? (
          <div className="radio-row">
            <label>
              <input type="radio" name={`${nombre}Prof`} checked={valor.profundidad === 8} onChange={() => cambiar({ profundidad: 8 })} />
              {t("exportarImagen.profundidad8")}
            </label>
            <label>
              <input type="radio" name={`${nombre}Prof`} checked={valor.profundidad === 16} onChange={() => cambiar({ profundidad: 16 })} />
              {t("exportarImagen.profundidad16")}
            </label>
          </div>
        ) : (
          <p className="field-note">{t("exportarImagen.profundidadJpgNota")}</p>
        )}
      </fieldset>

      <label className="dossier-check">
        <input type="checkbox" checked={valor.cambiarTamano} onChange={(e) => cambiar({ cambiarTamano: e.target.checked })} />
        <span>{t("exportarImagen.cambiarTamano")}</span>
      </label>

      {valor.cambiarTamano && (
        <>
          <fieldset className="informes-fieldset">
            <legend>{t("exportarImagen.ladoLegend")}</legend>
            <div className="radio-row">
              <label>
                <input type="radio" name={`${nombre}Lado`} checked={valor.lado === "corto"} onChange={() => cambiar({ lado: "corto" })} />
                {t("exportarImagen.ladoCorto")}
              </label>
              <label>
                <input type="radio" name={`${nombre}Lado`} checked={valor.lado === "largo"} onChange={() => cambiar({ lado: "largo" })} />
                {t("exportarImagen.ladoLargo")}
              </label>
            </div>
          </fieldset>

          <fieldset className="informes-fieldset">
            <legend>{t("exportarImagen.unidadLegend")}</legend>
            <div className="radio-row">
              <label>
                <input type="radio" name={`${nombre}Unidad`} checked={valor.unidad === "px"} onChange={() => cambiar({ unidad: "px" })} />
                {t("exportarImagen.unidadPx")}
              </label>
              <label>
                <input type="radio" name={`${nombre}Unidad`} checked={valor.unidad === "cm"} onChange={() => cambiar({ unidad: "cm" })} />
                {t("exportarImagen.unidadCm")}
              </label>
            </div>
          </fieldset>

          <label>
            {valor.unidad === "px" ? t("exportarImagen.medidaLabel") : t("exportarImagen.medidaLabelCm")}
            <input
              type="number"
              min={valor.unidad === "px" ? 1 : 0.1}
              step={valor.unidad === "px" ? 1 : 0.1}
              value={valor.medida}
              onChange={(e) => cambiar({ medida: e.target.value })}
            />
          </label>
          {valor.unidad === "cm" && (
            <label>
              {t("exportarImagen.pppLabel")}
              <input type="number" min={1} value={valor.ppp} onChange={(e) => cambiar({ ppp: e.target.value })} />
            </label>
          )}
          <p className="field-note">{t("exportarImagen.medidaNota")}</p>
        </>
      )}
    </>
  );
}
