import { useRef, useState } from "react";
import { useLanguage, type TranslationKey } from "../i18n/LanguageContext.js";
import { MenuContextual } from "./MenuContextual.js";
import { RecorridoInicial, type PasoRecorrido } from "./RecorridoInicial.js";

/**
 * Botón "?" para el encabezado de una sección (al lado del botón de cierre): al tocarlo hace un recorrido
 * por los botones y opciones de la pantalla, con una explicación breve de cada uno. Se omiten los pasos
 * cuyo botón no está en pantalla en ese momento (por ejemplo un filtro que solo aparece si hay datos).
 */
export const EVENTO_ABRIR_MANUAL = "recer:abrir-manual";

export function AyudaSeccion({ pasos }: { pasos: PasoRecorrido[] }) {
  const { t } = useLanguage();
  const [pasosActivos, setPasosActivos] = useState<PasoRecorrido[] | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const botonRef = useRef<HTMLButtonElement | null>(null);

  function abrirRecorrido() {
    const visibles = pasos.filter((p) => !p.targetSelector || document.querySelector(p.targetSelector));
    if (visibles.length > 0) setPasosActivos(visibles);
  }

  function abrirMenu() {
    const r = botonRef.current?.getBoundingClientRect();
    setMenu({ x: r ? r.left : 0, y: r ? r.bottom + 4 : 0 });
  }

  const items = [
    ...(pasos.length > 0 ? [{ label: t("ayudaSeccion.recorrido"), onClick: abrirRecorrido }] : []),
    // El manual se abre sobre la pantalla actual (que queda como estaba) con el buscador listo para escribir.
    { label: t("ayudaSeccion.manual"), onClick: () => window.dispatchEvent(new Event(EVENTO_ABRIR_MANUAL)) },
  ];

  return (
    <>
      <button
        ref={botonRef}
        type="button"
        className="header-help-button"
        onClick={abrirMenu}
        aria-label={t("ayudaSeccion.boton")}
        title={t("ayudaSeccion.boton")}
      >
        ?
      </button>
      {menu && <MenuContextual x={menu.x} y={menu.y} onClose={() => setMenu(null)} items={items} />}
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
