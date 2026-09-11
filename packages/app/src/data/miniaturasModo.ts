import { isTauri } from "../adapters/detectPlatform.js";

export type MiniaturasModo = "estaticas" | "dinamicas";

const MINIATURAS_MODO_STORE_FILE = "miniaturas-modo.json";
const POR_DEFECTO: MiniaturasModo = "estaticas";

function esModoValido(value: unknown): value is MiniaturasModo {
  return value === "estaticas" || value === "dinamicas";
}

export async function getMiniaturasModo(): Promise<MiniaturasModo> {
  if (!isTauri()) {
    const stored = typeof localStorage !== "undefined" ? localStorage.getItem("miniaturasModo") : null;
    return esModoValido(stored) ? stored : POR_DEFECTO;
  }

  const { Store } = await import("@tauri-apps/plugin-store");
  const store = await Store.load(MINIATURAS_MODO_STORE_FILE);
  const existing = await store.get<string>("miniaturasModo");
  if (esModoValido(existing)) return existing;

  await store.set("miniaturasModo", POR_DEFECTO);
  await store.save();
  return POR_DEFECTO;
}

export async function setMiniaturasModo(modo: MiniaturasModo): Promise<void> {
  if (!isTauri()) {
    if (typeof localStorage !== "undefined") localStorage.setItem("miniaturasModo", modo);
    return;
  }

  const { Store } = await import("@tauri-apps/plugin-store");
  const store = await Store.load(MINIATURAS_MODO_STORE_FILE);
  await store.set("miniaturasModo", modo);
  await store.save();
}
