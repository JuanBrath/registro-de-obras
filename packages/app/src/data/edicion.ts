import type { EdicionId } from "@registro/core";
import { isTauri } from "../adapters/detectPlatform.js";

const EDICION_STORE_FILE = "licencia.json";
// Durante la Fase 1 (cerrar Galeris Studio en modo local) el valor por
// defecto queda fijo en "personal": el menu nativo para previsualizar
// Space/Suite ya se saco (ver menu.rs), asi que no habria forma de volver a
// "personal_galeria" desde la UI si ese fuera el default.
const EDICION_POR_DEFECTO: EdicionId = "personal";

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

  // Sin el menu nativo para elegir Space/Suite (sacado durante la Fase 1),
  // se fuerza "personal" sin importar lo que haya quedado guardado de
  // pruebas anteriores con ese menu — no hay forma de volver a cambiarlo
  // desde la UI, asi que dejar un valor viejo ahi solo confundiria.
  const { Store } = await import("@tauri-apps/plugin-store");
  const store = await Store.load(EDICION_STORE_FILE);
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
