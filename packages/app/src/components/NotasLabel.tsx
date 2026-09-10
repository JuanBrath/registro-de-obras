import { useState, type ReactNode } from "react";
import { useLanguage } from "../i18n/LanguageContext.js";
import { useEscapeToDismiss } from "../utils/useEscapeToDismiss.js";
import { Modal } from "./Modal.js";

/**
 * Muestra la etiqueta de un campo de notas junto a un botoncito para
 * ampliarlas: abre una ventana mas grande con el texto completo, para poder
 * leerlo (o, si se pasa `onChange`, editarlo) comodo sin depender del
 * tamano del textarea chico. Se cierra con Escape. Si todavia no hay texto
 * cargado, no muestra el botón (nada que ampliar) — salvo que se este
 * editando (`onChange` presente), donde siempre tiene sentido poder abrirla
 * para empezar a escribir.
 */
export function NotasLabel({
  texto,
  children,
  onChange,
}: {
  texto: string;
  children: ReactNode;
  /** Si se pasa, la ventana ampliada permite editar el texto en vez de solo mostrarlo. */
  onChange?: (next: string) => void;
}) {
  const { t } = useLanguage();
  const [abierta, setAbierta] = useState(false);
  useEscapeToDismiss(abierta, () => setAbierta(false));

  if (!texto.trim() && !onChange) return <>{children}</>;

  return (
    <>
      {children}
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
      {abierta &&
        (onChange ? (
          <Modal onClose={() => setAbierta(false)}>
            <textarea
              className="notas-ampliadas-textarea"
              value={texto}
              onChange={(e) => onChange(e.target.value)}
              autoFocus
            />
          </Modal>
        ) : (
          <Modal onClose={() => setAbierta(false)}>
            <p className="notas-ampliadas-texto">{texto}</p>
          </Modal>
        ))}
    </>
  );
}
