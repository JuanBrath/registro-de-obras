import { useEffect } from "react";

/**
 * Cierra un mensaje (cartel de error, aviso bloqueado, ventana de notas
 * ampliadas, etc.) al apretar Escape. Escucha en fase de "captura" (el
 * ultimo argumento `true` de addEventListener) y frena la propagacion: asi,
 * si esto esta abierto arriba de una pantalla que TAMBIEN reacciona a
 * Escape (por ejemplo el formulario de editar obra, que cierra la ventana
 * entera), el cartel/ventana mas especifico se cierra primero y el de abajo
 * ni se entera de ese Escape — sin esto, como ambos escuchan en window,
 * terminaba cerrandose la ventana de atras en vez de lo que estaba encima.
 */
export function useEscapeToDismiss<T>(value: T, setValue: (value: null) => void): void {
  useEffect(() => {
    if (!value) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        setValue(null);
      }
    }
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [value, setValue]);
}
