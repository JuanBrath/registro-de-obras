import { useRef, useState } from "react";
import { useLanguage } from "../i18n/LanguageContext.js";
import { HelpIcon } from "./HelpIcon.js";

const DURACION_PULSACION_LARGA_MS = 700;

export function MarcadasFilterButton({
  soloMarcadas,
  onToggle,
  onDesmarcarTodas,
}: {
  soloMarcadas: boolean;
  onToggle: () => void;
  onDesmarcarTodas: () => void;
}) {
  const { t } = useLanguage();
  const [confirmando, setConfirmando] = useState(false);
  const timerRef = useRef<number | null>(null);
  const pulsacionLargaRef = useRef(false);

  function cancelarTimer() {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function handlePointerDown() {
    pulsacionLargaRef.current = false;
    cancelarTimer();
    timerRef.current = window.setTimeout(() => {
      pulsacionLargaRef.current = true;
      setConfirmando(true);
    }, DURACION_PULSACION_LARGA_MS);
  }

  function handleClick() {
    // Si la pulsacion larga ya disparo la confirmacion, el click que sigue
    // al soltar el boton no debe ademas alternar el filtro.
    if (pulsacionLargaRef.current) {
      pulsacionLargaRef.current = false;
      return;
    }
    onToggle();
  }

  return (
    <span className="marcadas-filter-button-wrapper">
      <button
        type="button"
        className={`marcadas-filter-button${soloMarcadas ? " marcadas-filter-button-activo" : ""}`}
        onPointerDown={handlePointerDown}
        onPointerUp={cancelarTimer}
        onPointerLeave={cancelarTimer}
        onClick={handleClick}
        aria-pressed={soloMarcadas}
        aria-label={t("galeria.soloMarcadas")}
        title={t("galeria.soloMarcadas")}
      >
        {soloMarcadas ? "★" : "☆"}
      </button>
      <HelpIcon fieldKey="filtro_solo_marcadas" />
      {confirmando && (
        <div className="confirm-box marcadas-filter-confirm-box">
          <p>{t("galeria.desmarcarTodasConfirm")}</p>
          <div className="obra-form-saved-actions">
            <button
              type="button"
              onClick={() => {
                setConfirmando(false);
                onDesmarcarTodas();
              }}
            >
              {t("galeria.desmarcarTodas")}
            </button>
            <button type="button" onClick={() => setConfirmando(false)}>
              {t("common.cancel")}
            </button>
          </div>
        </div>
      )}
    </span>
  );
}
