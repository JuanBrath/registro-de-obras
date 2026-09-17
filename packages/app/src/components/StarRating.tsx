import { useLanguage } from "../i18n/LanguageContext.js";

const ESTRELLAS = [1, 2, 3, 4, 5] as const;

/**
 * Calificacion de una obra con hasta 5 estrellas (0 = sin calificar). Tocar
 * la misma estrella que ya es el maximo actual la quita (vuelve a 0).
 * Se usa como hermano del boton de la tarjeta/miniatura, nunca adentro (un
 * boton dentro de otro rompe el click de abrir la obra).
 */
export function StarRating({
  value,
  onChange,
  className,
}: {
  value: number;
  onChange: (nueva: number) => void;
  className?: string;
}) {
  const { t } = useLanguage();

  return (
    <span className={`star-rating${className ? ` ${className}` : ""}`}>
      {ESTRELLAS.map((n) => (
        <button
          key={n}
          type="button"
          className={`star-rating-star${n <= value ? " star-rating-star-activa" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            onChange(n === value ? 0 : n);
          }}
          aria-label={t("galeria.calificarConEstrellas", { n })}
          title={t("galeria.calificarConEstrellas", { n })}
        >
          {n <= value ? "★" : "☆"}
        </button>
      ))}
    </span>
  );
}
