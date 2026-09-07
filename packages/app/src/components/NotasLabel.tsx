import { useState, type ReactNode } from "react";
import { useLanguage } from "../i18n/LanguageContext.js";
import { useEscapeToDismiss } from "../utils/useEscapeToDismiss.js";
import { Modal } from "./Modal.js";

/**
 * Muestra la etiqueta de un campo de notas junto a un botoncito para
 * ampliarlas: abre una ventana mas grande de solo lectura con el texto
 * completo, para poder leerlo comodo sin depender del tamano del textarea.
 * Se cierra con Escape. Si todavia no hay texto cargado, no muestra el
 * botón (nada que ampliar).
 */
export function NotasLabel({ texto, children }: { texto: string; children: ReactNode }) {
  const { t } = useLanguage();
  const [abierta, setAbierta] = useState(false);
  useEscapeToDismiss(abierta, () => setAbierta(false));

  return (
    <>
      {children}
      {texto.trim() && (
        <button
          type="button"
          className="notas-expandir-boton"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setAbierta(true);
          }}
        >
          {t("common.verCompleto")}
        </button>
      )}
      {abierta && (
        <Modal onClose={() => setAbierta(false)}>
          <p className="notas-ampliadas-texto">{texto}</p>
        </Modal>
      )}
    </>
  );
}
