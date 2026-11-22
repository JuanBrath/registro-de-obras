import { useState } from "react";
import { useLanguage, type TranslationKey } from "../i18n/LanguageContext.js";
import { RecorridoInicial, type PasoRecorrido } from "./RecorridoInicial.js";

/**
 * Botón "?" para el encabezado de una sección (al lado del botón de cierre): al tocarlo hace un recorrido
 * por los botones y opciones de la pantalla, con una explicación breve de cada uno. Se omiten los pasos
 * cuyo botón no está en pantalla en ese momento (por ejemplo un filtro que solo aparece si hay datos).
 */
export function AyudaSeccion({ pasos }: { pasos: PasoRecorrido[] }) {
  const { t } = useLanguage();
  const [pasosActivos, setPasosActivos] = useState<PasoRecorrido[] | null>(null);

  function abrir() {
    const visibles = pasos.filter((p) => !p.targetSelector || document.querySelector(p.targetSelector));
    if (visibles.length > 0) setPasosActivos(visibles);
  }

  return (
    <>
      <button
        type="button"
        className="header-help-button"
        onClick={abrir}
        aria-label={t("ayudaSeccion.boton")}
        title={t("ayudaSeccion.boton")}
      >
        ?
      </button>
      {pasosActivos && <RecorridoInicial pasos={pasosActivos} onCerrar={() => setPasosActivos(null)} />}
    </>
  );
}

/** Paso del recorrido de ayuda que señala el elemento con `data-recorrido="<id>"`. */
export function pasoAyuda(
  t: (key: TranslationKey) => string,
  id: string,
  key: TranslationKey,
  titulo: string,
): PasoRecorrido {
  return { targetSelector: `[data-recorrido="${id}"]`, titulo, texto: t(key) };
}
