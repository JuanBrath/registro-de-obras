import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../i18n/LanguageContext.js";
import { StarRating } from "./StarRating.js";

/** Calificación en una sola línea ("3 ★"): un clic despliega las cinco estrellas y un segundo clic elige cuántas
 * (tocar la misma cantidad otra vez la quita). Se usa en la vista Imágenes y en el visor de fotos en grande. */
export function CalificacionCompacta({ calificacion, onCalificar }: { calificacion: number; onCalificar: (n: number) => void }) {
  const { t } = useLanguage();
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!abierto) return;
    const cerrar = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("mousedown", cerrar);
    return () => document.removeEventListener("mousedown", cerrar);
  }, [abierto]);
  return (
    <span className="calificacion-compacta" ref={ref}>
      <button
        type="button"
        className="galeria-foto-calificacion"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-label={t("galeria.calificarConEstrellas", { n: calificacion })}
        title={t("galeria.calificarConEstrellas", { n: calificacion })}
      >
        {calificacion} ★
      </button>
      {abierto && (
        <span className="galeria-foto-estrellas-desplegadas">
          <StarRating
            value={calificacion}
            onChange={(n) => {
              onCalificar(n);
              setAbierto(false);
            }}
          />
        </span>
      )}
    </span>
  );
}
