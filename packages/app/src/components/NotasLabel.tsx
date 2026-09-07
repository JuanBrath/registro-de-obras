import { useState, type ReactNode } from "react";
import { useEscapeToDismiss } from "../utils/useEscapeToDismiss.js";
import { Modal } from "./Modal.js";

/**
 * Envuelve la etiqueta de un campo de notas: al hacer click (o Enter/espacio
 * con teclado) abre una ventana mas grande de solo lectura con el texto
 * completo, para poder leerlo comodo sin depender del tamano del textarea.
 * Si todavia no hay texto cargado, la etiqueta queda como texto plano (nada
 * que ampliar).
 */
export function NotasLabel({ texto, children }: { texto: string; children: ReactNode }) {
  const [abierta, setAbierta] = useState(false);
  useEscapeToDismiss(abierta, () => setAbierta(false));

  if (!texto.trim()) return <>{children}</>;

  return (
    <>
      <span
        role="button"
        tabIndex={0}
        className="notas-label-clickable"
        onClick={(e) => {
          e.preventDefault();
          setAbierta(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setAbierta(true);
          }
        }}
      >
        {children}
      </span>
      {abierta && (
        <Modal onClose={() => setAbierta(false)}>
          <p className="notas-ampliadas-texto">{texto}</p>
        </Modal>
      )}
    </>
  );
}
