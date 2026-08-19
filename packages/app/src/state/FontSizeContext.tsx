import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getTamanoFuente, setTamanoFuente as persistTamanoFuente, type TamanoFuente } from "../data/tamanoFuente.js";

function aplicarTamanoFuente(tamano: TamanoFuente): void {
  document.documentElement.dataset.fontSize = tamano;
}

interface FontSizeContextValue {
  tamanoFuente: TamanoFuente | null;
  setTamanoFuente: (tamano: TamanoFuente) => void;
}

const FontSizeReactContext = createContext<FontSizeContextValue | null>(null);

export function FontSizeProvider({ children }: { children: ReactNode }) {
  const [tamanoFuente, setTamanoFuenteState] = useState<TamanoFuente | null>(null);

  useEffect(() => {
    getTamanoFuente().then((loaded) => {
      setTamanoFuenteState(loaded);
      aplicarTamanoFuente(loaded);
    });
  }, []);

  function setTamanoFuente(next: TamanoFuente) {
    setTamanoFuenteState(next);
    aplicarTamanoFuente(next);
    persistTamanoFuente(next);
  }

  return (
    <FontSizeReactContext.Provider value={{ tamanoFuente, setTamanoFuente }}>{children}</FontSizeReactContext.Provider>
  );
}

export function useFontSize(): FontSizeContextValue {
  const ctx = useContext(FontSizeReactContext);
  if (!ctx) throw new Error("useFontSize debe usarse dentro de FontSizeProvider");
  return ctx;
}
