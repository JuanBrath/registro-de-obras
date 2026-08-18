import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { EdicionId } from "@registro/core";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getEdicion, setEdicion as persistEdicion } from "../data/edicion.js";
import { isTauri } from "../adapters/detectPlatform.js";

function syncNativeMenuEdicion(edicion: EdicionId): void {
  if (!isTauri()) return;
  invoke("set_app_menu_edicion", { edicion }).catch(() => {});
}

interface EdicionContextValue {
  edicion: EdicionId | null;
  setEdicion: (edicion: EdicionId) => void;
}

const EdicionReactContext = createContext<EdicionContextValue | null>(null);

export function EdicionProvider({ children }: { children: ReactNode }) {
  const [edicion, setEdicionState] = useState<EdicionId | null>(null);

  useEffect(() => {
    getEdicion().then((loaded) => {
      setEdicionState(loaded);
      syncNativeMenuEdicion(loaded);
    });
  }, []);

  function setEdicion(next: EdicionId) {
    setEdicionState(next);
    persistEdicion(next);
    syncNativeMenuEdicion(next);
  }

  // Elegir una edición desde el menú nativo (Edición (prueba)) emite este
  // evento desde Rust en vez de renderizar UI propia.
  useEffect(() => {
    if (!isTauri()) return;
    const unlistenPromise = listen<EdicionId>("set-edicion", (event) => setEdicion(event.payload));
    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <EdicionReactContext.Provider value={{ edicion, setEdicion }}>{children}</EdicionReactContext.Provider>;
}

export function useEdicion(): EdicionContextValue {
  const ctx = useContext(EdicionReactContext);
  if (!ctx) throw new Error("useEdicion debe usarse dentro de EdicionProvider");
  return ctx;
}
