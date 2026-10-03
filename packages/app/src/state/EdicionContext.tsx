import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { EdicionId } from "@registro/core";
import { invoke } from "@tauri-apps/api/core";
import { cargarEstadoLicencia, activarLicenciaDesdeArchivo, type EstadoLicencia } from "../data/licencia.js";
import { isTauri } from "../adapters/detectPlatform.js";

function syncNativeMenuEdicion(edicion: EdicionId): void {
  if (!isTauri()) return;
  invoke("set_app_menu_edicion", { edicion }).catch(() => {});
}

interface EdicionContextValue {
  /** Derivado de estadoLicencia: la edición solo existe si hay una licencia válida. */
  edicion: EdicionId | null;
  estadoLicencia: EstadoLicencia;
  activarLicencia: (ruta: string) => Promise<EstadoLicencia>;
}

const EdicionReactContext = createContext<EdicionContextValue | null>(null);

export function EdicionProvider({ children }: { children: ReactNode }) {
  const [estadoLicencia, setEstadoLicencia] = useState<EstadoLicencia>({ estado: "cargando" });

  useEffect(() => {
    cargarEstadoLicencia().then((estado) => {
      setEstadoLicencia(estado);
      if (estado.estado === "valida") syncNativeMenuEdicion(estado.edicion);
    });
  }, []);

  async function activarLicencia(ruta: string): Promise<EstadoLicencia> {
    const estado = await activarLicenciaDesdeArchivo(ruta);
    setEstadoLicencia(estado);
    if (estado.estado === "valida") syncNativeMenuEdicion(estado.edicion);
    return estado;
  }

  const edicion = estadoLicencia.estado === "valida" ? estadoLicencia.edicion : null;

  return (
    <EdicionReactContext.Provider value={{ edicion, estadoLicencia, activarLicencia }}>
      {children}
    </EdicionReactContext.Provider>
  );
}

export function useEdicion(): EdicionContextValue {
  const ctx = useContext(EdicionReactContext);
  if (!ctx) throw new Error("useEdicion debe usarse dentro de EdicionProvider");
  return ctx;
}
