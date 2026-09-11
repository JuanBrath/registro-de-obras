import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getMiniaturasModo, setMiniaturasModo as persistMiniaturasModo, type MiniaturasModo } from "../data/miniaturasModo.js";

interface MiniaturasModoContextValue {
  miniaturasModo: MiniaturasModo | null;
  setMiniaturasModo: (modo: MiniaturasModo) => void;
}

const MiniaturasModoReactContext = createContext<MiniaturasModoContextValue | null>(null);

export function MiniaturasModoProvider({ children }: { children: ReactNode }) {
  const [miniaturasModo, setMiniaturasModoState] = useState<MiniaturasModo | null>(null);

  useEffect(() => {
    getMiniaturasModo().then(setMiniaturasModoState);
  }, []);

  function setMiniaturasModo(next: MiniaturasModo) {
    setMiniaturasModoState(next);
    persistMiniaturasModo(next);
  }

  return (
    <MiniaturasModoReactContext.Provider value={{ miniaturasModo, setMiniaturasModo }}>
      {children}
    </MiniaturasModoReactContext.Provider>
  );
}

export function useMiniaturasModo(): MiniaturasModoContextValue {
  const ctx = useContext(MiniaturasModoReactContext);
  if (!ctx) throw new Error("useMiniaturasModo debe usarse dentro de MiniaturasModoProvider");
  return ctx;
}
