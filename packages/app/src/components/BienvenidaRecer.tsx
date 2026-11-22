import { BrandHeader } from "./BrandHeader.js";
import { useLanguage } from "../i18n/LanguageContext.js";

const BIENVENIDA_VISTA_STORAGE_KEY = "bienvenidaRecerVista";

export function bienvenidaYaVista(): boolean {
  try {
    return localStorage.getItem(BIENVENIDA_VISTA_STORAGE_KEY) === "1";
  } catch {
    // Sin localStorage no se puede recordar: se muestra una vez por sesión.
    return false;
  }
}

function marcarBienvenidaVista(): void {
  try {
    localStorage.setItem(BIENVENIDA_VISTA_STORAGE_KEY, "1");
  } catch {
    // No se pudo guardar; no impide seguir.
  }
}

/**
 * Pantalla inicial de la primera vez: explica por qué Recer (el significado del nombre y para qué existe el
 * programa) antes de elegir el registro y de ver el recorrido de bienvenida. Después se puede volver a leer
 * tocando el logo en la pantalla de inicio.
 */
export function BienvenidaRecer({ onContinuar }: { onContinuar: () => void }) {
  const { t } = useLanguage();
  return (
    <div className="bienvenida-recer">
      {/* Sin acción propia: en esta pantalla el logo no debe llevar a ningún otro lado. */}
      <BrandHeader size="splash" className="workspace-picker-brand" onClick={() => {}} />
      <p className="workspace-picker-lema">{t("porQueRecer.lema")}</p>
      <h1 className="bienvenida-recer-titulo">{t("porQueRecer.titulo")}</h1>
      <p className="por-que-recer-texto" dangerouslySetInnerHTML={{ __html: t("porQueRecer.texto") }} />
      <button
        type="button"
        className="bienvenida-recer-boton"
        autoFocus
        onClick={() => {
          marcarBienvenidaVista();
          onContinuar();
        }}
      >
        {t("bienvenida.comenzar")}
      </button>
      <p className="bienvenida-recer-pie">{t("bienvenida.pie")}</p>
    </div>
  );
}
