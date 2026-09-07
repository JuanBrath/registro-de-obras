import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "../i18n/LanguageContext.js";

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
