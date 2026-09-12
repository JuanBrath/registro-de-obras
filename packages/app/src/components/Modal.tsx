import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "../i18n/LanguageContext.js";
import { useEscapeToDismiss } from "../utils/useEscapeToDismiss.js";
import { EVENTO_MODAL_ABIERTO } from "../utils/modalAbiertoEvent.js";

export function Modal({
  children,
  onClose,
  wide,
  className,
}: {
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  className?: string;
}) {
  const { t } = useLanguage();
  // "true" en vez de algun estado propio: este modal esta "abierto" en todo
  // momento mientras esta montado (no tiene un estado interno de
  // abierto/cerrado aparte, es el padre el que lo monta o no), asi que la
  // tecla Escape simplemente llama a onClose todo el tiempo que este
  // presente en pantalla — igual que ya se puede cerrar clickeando afuera o
  // en la X.
  useEscapeToDismiss(true, onClose);

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
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault();
          onClose();
        }
      }}
    >
      <div
        className={`modal-content${wide ? " modal-content-wide" : ""}${className ? ` ${className}` : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
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
