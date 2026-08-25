import type { ReactNode } from "react";
import { Modal } from "./Modal.js";
import { useLanguage } from "../i18n/LanguageContext.js";
import type { InformeIdioma } from "../reports/informeIdioma.js";
import type { FirmaEleccion } from "../utils/pdfBranding.js";

export interface InformeOpcion {
  id: string;
  label: string;
  /** Campos propios de esta opcion (ej. rango de fechas, seleccion de series). */
  extra?: ReactNode;
  /** Oculta el selector de idioma para documentos legales que solo se generan en espanol (ej. contratos). */
  hideIdioma?: boolean;
}

/**
 * Ventana compartida de "Generar informe": elegir que informe generar (si hay
 * mas de uno), completar los campos propios de esa opcion, elegir el idioma
 * del documento y si lleva firma, y confirmar con un unico boton "Generar".
 * Cada pantalla arma sus propias opciones y su propia funcion de generacion;
 * este componente solo es la UI de seleccion.
 */
export function InformesModal({
  titulo,
  opciones,
  selectedId,
  onSelectId,
  idioma,
  onIdiomaChange,
  firma,
  onFirmaChange,
  firmaDigitalDisponible,
  onGenerar,
  generando,
  disabled,
  mensaje,
  onClose,
}: {
  titulo: string;
  opciones: InformeOpcion[];
  selectedId: string;
  onSelectId: (id: string) => void;
  idioma: InformeIdioma;
  onIdiomaChange: (idioma: InformeIdioma) => void;
  firma: FirmaEleccion;
  onFirmaChange: (firma: FirmaEleccion) => void;
  firmaDigitalDisponible: boolean;
  onGenerar: () => void;
  generando: boolean;
  /** Deshabilita el boton "Generar" por una razon distinta a estar generando (ej. falta elegir series). */
  disabled?: boolean;
  /** Confirmacion tras generar un informe: se muestra dentro de la ventana sin cerrarla, para poder generar otro sin volver a abrir el menu. */
  mensaje?: string | null;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const opcionActual = opciones.find((op) => op.id === selectedId);

  return (
    <Modal onClose={onClose}>
      <h2>{titulo}</h2>

      <div className="informes-lista">
        {opciones.map((op) => (
          <label key={op.id} className="informes-opcion">
            <input type="radio" name="informeOpcion" checked={selectedId === op.id} onChange={() => onSelectId(op.id)} />
            {op.label}
          </label>
        ))}
      </div>

      {opcionActual?.extra}

      {!opcionActual?.hideIdioma && (
        <fieldset className="informes-fieldset">
          <legend>{t("informes.idiomaLegend")}</legend>
          <div className="radio-row">
            <label>
              <input type="radio" name="informeIdioma" checked={idioma === "es"} onChange={() => onIdiomaChange("es")} />
              {t("informes.idiomaEspanol")}
            </label>
            <label>
              <input type="radio" name="informeIdioma" checked={idioma === "en"} onChange={() => onIdiomaChange("en")} />
              {t("informes.idiomaIngles")}
            </label>
            <label>
              <input
                type="radio"
                name="informeIdioma"
                checked={idioma === "ambos"}
                onChange={() => onIdiomaChange("ambos")}
              />
              {t("informes.idiomaAmbos")}
            </label>
          </div>
        </fieldset>
      )}

      <fieldset className="informes-fieldset">
        <legend>{t("informes.firmaLegend")}</legend>
        <div className="radio-row">
          <label>
            <input type="radio" name="informeFirma" checked={firma === "ninguna"} onChange={() => onFirmaChange("ninguna")} />
            {t("informes.firmaNinguna")}
          </label>
          <label>
            <input
              type="radio"
              name="informeFirma"
              checked={firma === "digital"}
              disabled={!firmaDigitalDisponible}
              onChange={() => onFirmaChange("digital")}
            />
            {t("informes.firmaDigital")}
          </label>
          <label>
            <input
              type="radio"
              name="informeFirma"
              checked={firma === "manuscrita"}
              onChange={() => onFirmaChange("manuscrita")}
            />
            {t("informes.firmaManuscrita")}
          </label>
        </div>
      </fieldset>

      {mensaje && (
        <p className="success" role="status">
          ✅ {mensaje}
        </p>
      )}

      <div className="obra-form-saved-actions">
        <button type="button" onClick={onGenerar} disabled={generando || disabled}>
          {generando ? t("common.saving") : t("common.generarInformeAccion")}
        </button>
        <button type="button" onClick={onClose} disabled={generando}>
          {t("common.back")}
        </button>
      </div>
    </Modal>
  );
}
