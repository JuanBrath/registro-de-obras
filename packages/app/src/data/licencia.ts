import type { EdicionId } from "@registro/core";
import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "../adapters/detectPlatform.js";
import { readAbsoluteFileBytes } from "../adapters/tauri/TauriFileSystemAdapter.js";
import { todayISO } from "../utils/today.js";

const LICENCIA_STORE_FILE = "licencia.json";

export type EstadoLicencia =
  | { estado: "cargando" }
  | { estado: "sin_licencia" }
  | { estado: "invalida"; motivo: string }
  | { estado: "valida"; edicion: EdicionId; titular: string; email: string; emitida: string; vence: string | null };

interface LicenciaValidaDesdeRust {
  edicion: EdicionId;
  titular: string;
  email: string;
  emitida: string;
  vence: string | null;
}

async function revalidar(contenido: string): Promise<EstadoLicencia> {
  try {
    const datos = await invoke<LicenciaValidaDesdeRust>("validar_licencia", { contenido, hoy: todayISO() });
    return { estado: "valida", ...datos };
  } catch (motivo) {
    return { estado: "invalida", motivo: String(motivo) };
  }
}

/**
 * Estado de la licencia de esta instalación, re-validado contra lo guardado
 * de una activación anterior. Se re-valida en cada arranque (no solo se
 * confía en lo guardado) porque el vencimiento depende de "hoy": una
 * licencia válida ayer puede estar vencida hoy aunque el archivo no haya
 * cambiado.
 */
export async function cargarEstadoLicencia(): Promise<EstadoLicencia> {
  if (!isTauri()) {
    // Mobile/Capacitor: sin flujo de activación todavía, se habilita todo.
    return { estado: "valida", edicion: "personal_galeria", titular: "", email: "", emitida: "", vence: null };
  }

  const { Store } = await import("@tauri-apps/plugin-store");
  const store = await Store.load(LICENCIA_STORE_FILE);
  const contenido = await store.get<string>("archivo");
  if (!contenido) return { estado: "sin_licencia" };
  return revalidar(contenido);
}

/**
 * Activa (o reemplaza) la licencia a partir de un archivo que el usuario
 * eligió. Guarda el CONTENIDO CRUDO del archivo (no los campos ya
 * parseados): la firma cubre el string armado a partir de esos campos, así
 * que no hace falta preservar el JSON byte a byte por la firma en sí, pero
 * sí hace falta volver a pasar por validar_licencia en cada arranque (ver
 * cargarEstadoLicencia) — guardar el crudo evita duplicar esa lógica.
 */
export async function activarLicenciaDesdeArchivo(ruta: string): Promise<EstadoLicencia> {
  let contenido: string;
  try {
    const bytes = await readAbsoluteFileBytes(ruta);
    contenido = new TextDecoder().decode(bytes);
  } catch (err) {
    // No se re-lanza: si falla la lectura (por ejemplo, macOS bloqueando el
    // acceso a Escritorio/Documentos/Descargas en esta app no firmada), hay
    // que poder mostrarlo como motivo en vez de dejar la promesa rechazada
    // sin que nadie la muestre (ver LicenciaSettings.tsx).
    return { estado: "invalida", motivo: err instanceof Error ? err.message : String(err) };
  }
  const resultado = await revalidar(contenido);
  if (resultado.estado === "valida") {
    const { Store } = await import("@tauri-apps/plugin-store");
    const store = await Store.load(LICENCIA_STORE_FILE);
    await store.set("archivo", contenido);
    await store.save();
  }
  return resultado;
}
