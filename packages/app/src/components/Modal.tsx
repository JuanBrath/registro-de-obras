import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "../i18n/LanguageContext.js";
import { EVENTO_MODAL_ABIERTO } from "../utils/modalAbiertoEvent.js";

/** Capas que pueden estar una encima de otra. La que está más arriba es la única que se cierra con Escape. */
const SELECTOR_CAPAS = ".modal-backdrop, .recorrido-fondo, .menu-contextual";
let capaSuperior: Element | null = null;
// Se anota cuál era la capa de arriba antes de que nadie reaccione a la tecla: este oyente se registra al cargar el
// programa, así que corre primero. Sin esto, cerrar una ayuda abierta sobre una ventana cerraba también la ventana.
if (typeof window !== "undefined") {
  window.addEventListener(
    "keydown",
    (e) => {
      if (e.key !== "Escape") return;
      const sueltas = document.querySelectorAll(".recorrido-fondo, .menu-contextual");
      const capas = sueltas.length > 0 ? sueltas : document.querySelectorAll(SELECTOR_CAPAS);
      capaSuperior = capas[capas.length - 1] ?? null;
    },
    true,
  );
}

export function Modal({
  children,
  onClose,
  wide,
  className,
  maximizable,
}: {
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  className?: string;
  /** Agrega un botón para agrandar la ventana a (casi) toda la pantalla, sin
   * tener que arrastrar el angulo inferior derecho a mano. Pensado para
   * contenido que puede crecer mucho (notas, statement). */
  maximizable?: boolean;
}) {
  const { t } = useLanguage();
  const [maximizada, setMaximizada] = useState(false);
  // "true" en vez de algun estado propio: este modal esta "abierto" en todo
  // momento mientras esta montado (no tiene un estado interno de
  // abierto/cerrado aparte, es el padre el que lo monta o no), asi que la
  // tecla Escape simplemente llama a onClose todo el tiempo que este
  // presente en pantalla — igual que ya se puede cerrar clickeando afuera o
  // en la X.
  const fondoRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || capaSuperior !== fondoRef.current) return;
      e.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", alPulsar, true);
    return () => window.removeEventListener("keydown", alPulsar, true);
  }, [onClose]);

  // Avisa que se abrio un modal para que cualquier cartel de ayuda que
  // haya quedado abierto en la pantalla de atras (ver HelpIcon.tsx) se
  // cierre solo: su z-index es mas bajo que el de este modal a proposito
  // (para no taparlo todo el tiempo), asi que si no se cierra queda
  // escondido detras en vez de encima — por ejemplo, si "Ver completo" se
  // activa con el teclado en vez de un clic de mouse, el mecanismo de
  // "clic afuera cierra el cartel" de HelpIcon no llega a dispararse antes.
  useEffect(() => {
    window.dispatchEvent(new Event(EVENTO_MODAL_ABIERTO));
  }, []);

  // Portal directo a document.body: si no, un modal abierto desde un campo
  // anidado dentro de un <label> (como las notas ampliadas dentro de
  // "Editar obra") queda colgando adentro de ese <label> en el DOM, y el
  // click en la X puede terminar activando tambien el control asociado al
  // label en vez de solo cerrar el modal.
  return createPortal(
    <div
      ref={fondoRef}
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault();
          onClose();
        }
      }}
    >
      <div
        className={`modal-content${wide ? " modal-content-wide" : ""}${maximizada ? " modal-content-maximizada" : ""}${className ? ` ${className}` : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        {maximizable && (
          <button
            type="button"
            className="modal-maximizar"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMaximizada((m) => !m);
            }}
            aria-label={maximizada ? t("common.restaurarTamano") : t("common.maximizar")}
            title={maximizada ? t("common.restaurarTamano") : t("common.maximizar")}
          >
            {maximizada ? "⤡" : "⤢"}
          </button>
        )}
        <button
          type="button"
          className="modal-close"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }}
          aria-label={t("common.close")}
        >
          ✕
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
}
