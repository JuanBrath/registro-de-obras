import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useEscapeToDismiss } from "../utils/useEscapeToDismiss.js";

export interface MenuContextualItem {
  label: string;
  onClick: () => void;
}

/**
 * Menú que aparece en la posición del click derecho, con una lista de acciones. Se porta a
 * document.body (mismo criterio que Modal.tsx) para que su posición fija no dependa de dónde
 * esté anidado en el DOM — incluso adentro de otro modal, como la vista de imagen completa.
 */
export function MenuContextual({
  x,
  y,
  items,
  onClose,
}: {
  x: number;
  y: number;
  items: MenuContextualItem[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEscapeToDismiss(true, onClose);

  useEffect(() => {
    function alClickearAfuera(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    // "mousedown" (no "click"): se cierra apenas se aprieta afuera, antes de que un segundo
    // click derecho en otro lado llegue a abrir su propio menu.
    window.addEventListener("mousedown", alClickearAfuera, true);
    return () => window.removeEventListener("mousedown", alClickearAfuera, true);
  }, [onClose]);

  return createPortal(
    <div ref={ref} className="menu-contextual" style={{ left: x, top: y }}>
      {items.map((item, i) => (
        <button
          key={i}
          type="button"
          className="menu-contextual-item"
          onClick={() => {
            onClose();
            item.onClick();
          }}
        >
          {item.label}
        </button>
      ))}
    </div>,
    document.body,
  );
}
