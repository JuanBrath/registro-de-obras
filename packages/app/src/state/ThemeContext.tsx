import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getTema, setTema as persistTema, type Tema } from "../data/tema.js";
import { isTauri } from "../adapters/detectPlatform.js";

function syncNativeMenuTema(tema: Tema): void {
  if (!isTauri()) return;
  invoke("set_app_menu_tema", { tema }).catch(() => {});
}

function aplicarTema(tema: Tema): void {
  document.documentElement.dataset.theme = tema === "oscuro" ? "dark" : "light";
}

interface ThemeContextValue {
  tema: Tema | null;
  setTema: (tema: Tema) => void;
}

const ThemeReactContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [tema, setTemaState] = useState<Tema | null>(null);

  useEffect(() => {
    getTema().then((loaded) => {
      setTemaState(loaded);
      aplicarTema(loaded);
      syncNativeMenuTema(loaded);
    });
  }, []);

  function setTema(next: Tema) {
    setTemaState(next);
    aplicarTema(next);
    persistTema(next);
    syncNativeMenuTema(next);
  }

  // Elegir "Claro"/"Oscuro" desde el menú nativo (Apariencia) emite este
  // evento desde Rust en vez de renderizar UI propia.
  useEffect(() => {
    if (!isTauri()) return;
    const unlistenPromise = listen<Tema>("set-tema", (event) => setTema(event.payload));
    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <ThemeReactContext.Provider value={{ tema, setTema }}>{children}</ThemeReactContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeReactContext);
  if (!ctx) throw new Error("useTheme debe usarse dentro de ThemeProvider");
  return ctx;
}
