import type { EdicionId } from "@registro/core";
import { isTauri } from "../adapters/detectPlatform.js";

const EDICION_STORE_FILE = "licencia.json";
const EDICIONES_VALIDAS: EdicionId[] = ["personal", "galeria", "personal_galeria"];
const EDICION_POR_DEFECTO: EdicionId = "personal_galeria";

/**
 * Edición/licencia de esta instalación. Por ahora es un valor local
 * mockeado (sin backend de activación todavía, ver spec §5) — el objetivo
 * es solo tener el gate correcto en WorkspacePicker, listo para enchufar
 * una activación real más adelante sin tocar el resto de la app.
 */
export async function getEdicion(): Promise<EdicionId> {
  if (!isTauri()) {
    // Mobile/Capacitor: sin persistencia de licencia todavía, se habilita todo.
    return EDICION_POR_DEFECTO;
  }

  const { Store } = await import("@tauri-apps/plugin-store");
  const store = await Store.load(EDICION_STORE_FILE);
  const existing = await store.get<string>("edicion");
  if (existing && (EDICIONES_VALIDAS as string[]).includes(existing)) {
    return existing as EdicionId;
  }

  await store.set("edicion", EDICION_POR_DEFECTO);
  await store.save();
  return EDICION_POR_DEFECTO;
}

/**
 * Cambia la edición/licencia mockeada de esta instalación. Es el mismo seam
 * que getEdicion(): cuando exista una activación real, ambas funciones pasan
 * a hablar con ese backend en vez del store local, sin tocar quien las llama.
 */
export async function setEdicion(edicion: EdicionId): Promise<void> {
  if (!isTauri()) return;

  const { Store } = await import("@tauri-apps/plugin-store");
  const store = await Store.load(EDICION_STORE_FILE);
  await store.set("edicion", edicion);
  await store.save();
}
