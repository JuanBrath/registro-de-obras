import { useEffect, useRef, useState } from "react";
import { useWorkspace } from "../state/WorkspaceContext.js";
import { useLanguage } from "../i18n/LanguageContext.js";

// Mismos valores que .help-icon-tooltip/.help-icon-tooltip-wide en App.css
// (ancho y separacion respecto del icono), para decidir si conviene abrir
// el cartel hacia la izquierda en vez de hacia la derecha.
const ANCHO_TOOLTIP_ANGOSTO_PX = 240;
const ANCHO_TOOLTIP_ANCHO_PX = 380;
const SEPARACION_ICONO_TOOLTIP_PX = 38;
const MARGEN_BORDE_VENTANA_PX = 16;

export function HelpIcon({ fieldKey }: { fieldKey: string }) {
  const { helpTexts } = useWorkspace();
  const { idioma, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [abreIzquierda, setAbreIzquierda] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const text = helpTexts[fieldKey];

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  if (!text) return null;
  const shown = idioma === "en" ? text.en ?? text.es : text.es;
  const lineas = shown.split("\n").filter((linea) => linea.trim().length > 0);
  const esMultilinea = lineas.length > 1;

  function toggleOpen() {
    setOpen((v) => {
      const next = !v;
      if (next && wrapperRef.current) {
        // Si no entra hacia la derecha (el lado por defecto) sin salirse de
        // la ventana, se abre hacia la izquierda en su lugar: sin esto, un
        // icono de ayuda cerca del borde derecho de la pantalla mostraba el
        // cartel sobresaliendo fuera de la ventana de la app.
        const anchoTooltip = esMultilinea ? ANCHO_TOOLTIP_ANCHO_PX : ANCHO_TOOLTIP_ANGOSTO_PX;
        const { left } = wrapperRef.current.getBoundingClientRect();
        const cabeADerecha =
          left + SEPARACION_ICONO_TOOLTIP_PX + anchoTooltip <= window.innerWidth - MARGEN_BORDE_VENTANA_PX;
        setAbreIzquierda(!cabeADerecha);
      }
      return next;
    });
  }

  return (
    <span className="help-icon-wrapper" ref={wrapperRef}>
      <span
        role="button"
        tabIndex={0}
        className="help-icon"
        aria-label={t("helpIcon.ayuda")}
        onClick={(e) => {
          // Sin esto, un click aca burbujea hasta el <label> que envuelve
          // este icono (por ejemplo, junto a la miniatura de la obra) y el
          // navegador lo reenvia al control asociado del label — como este
          // <span> no es un elemento "labelable" nativo, no cuenta como
          // ese control y termina activando otro (el boton de ver la
          // imagen completa) ademas de abrir este tooltip.
          e.stopPropagation();
          toggleOpen();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            toggleOpen();
          }
        }}
      >
        ⓘ
      </span>
      {open && (
        <span
          className={`help-icon-tooltip${esMultilinea ? " help-icon-tooltip-wide" : ""}${
            abreIzquierda ? " help-icon-tooltip-abre-izquierda" : ""
          }`}
        >
          {esMultilinea
            ? lineas.map((linea, i) => {
                const separador = linea.indexOf(": ");
                return (
                  <span key={i} className="help-icon-linea">
                    {separador === -1 ? (
                      linea
                    ) : (
                      <>
                        <strong>{linea.slice(0, separador + 1)}</strong>
                        {linea.slice(separador + 1)}
                      </>
                    )}
                  </span>
                );
              })
            : shown}
        </span>
      )}
    </span>
  );
}
