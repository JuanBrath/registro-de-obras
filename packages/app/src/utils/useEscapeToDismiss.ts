import { useEffect } from "react";

/** Cierra un mensaje (cartel de error, aviso bloqueado, etc.) al apretar Escape. */
export function useEscapeToDismiss<T>(value: T, setValue: (value: null) => void): void {
  useEffect(() => {
    if (!value) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setValue(null);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [value, setValue]);
}
