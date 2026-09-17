import { useRef, useState } from "react";
import { useLanguage } from "../i18n/LanguageContext.js";
import { HelpIcon } from "./HelpIcon.js";

const DURACION_PULSACION_LARGA_MS = 700;
const ESTRELLAS = [1, 2, 3, 4, 5] as const;

/**
 * Filtro por calificacion: un clic en una estrella muestra las obras con esa
 * cantidad de estrellas o mas (volver a hacer clic en la misma la quita).
 * Mantener presionado el boton ofrece quitarle la calificacion a todas las
 * obras de una vez (con confirmacion), igual que antes con "desmarcar todas".
 */
export function CalificacionFilterButton({
  calificacionMinima,
  onChange,
  onQuitarATodas,
}: {
  calificacionMinima: number;
  onChange: (nueva: number) => void;
  onQuitarATodas: () => void;
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

  function handleClick(n: number) {
    // Si la pulsacion larga ya disparo la confirmacion, el click que sigue
    // al soltar el boton no debe ademas alternar el filtro.
    if (pulsacionLargaRef.current) {
      pulsacionLargaRef.current = false;
      return;
    }
    onChange(n === calificacionMinima ? 0 : n);
  }

  return (
    <span className="marcadas-filter-button-wrapper">
      <span className="star-rating">
        {ESTRELLAS.map((n) => (
          <button
            key={n}
            type="button"
            className={`star-rating-star${n <= calificacionMinima ? " star-rating-star-activa" : ""}`}
            onPointerDown={handlePointerDown}
            onPointerUp={cancelarTimer}
            onPointerLeave={cancelarTimer}
            onClick={() => handleClick(n)}
            aria-pressed={n <= calificacionMinima}
            aria-label={t("galeria.filtrarPorEstrellas", { n })}
            title={t("galeria.filtrarPorEstrellas", { n })}
          >
            {n <= calificacionMinima ? "★" : "☆"}
          </button>
        ))}
      </span>
      <HelpIcon fieldKey="filtro_solo_marcadas" />
      {confirmando && (
        <div className="confirm-box marcadas-filter-confirm-box">
          <p>{t("galeria.quitarCalificacionATodasConfirm")}</p>
          <div className="obra-form-saved-actions">
            <button
              type="button"
              onClick={() => {
                setConfirmando(false);
                onQuitarATodas();
              }}
            >
              {t("galeria.quitarCalificacionATodas")}
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
