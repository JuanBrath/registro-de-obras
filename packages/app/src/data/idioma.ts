import { isTauri } from "../adapters/detectPlatform.js";

export type Idioma = "es" | "en";

const IDIOMA_STORE_FILE = "idioma.json";
const IDIOMA_POR_DEFECTO: Idioma = "es";

function esIdiomaValido(value: unknown): value is Idioma {
  return value === "es" || value === "en";
}

export async function getIdioma(): Promise<Idioma> {
  if (!isTauri()) {
    const stored = typeof localStorage !== "undefined" ? localStorage.getItem("idioma") : null;
    return esIdiomaValido(stored) ? stored : IDIOMA_POR_DEFECTO;
  }

  const { Store } = await import("@tauri-apps/plugin-store");
  const store = await Store.load(IDIOMA_STORE_FILE);
  const existing = await store.get<string>("idioma");
  if (esIdiomaValido(existing)) return existing;

  await store.set("idioma", IDIOMA_POR_DEFECTO);
  await store.save();
  return IDIOMA_POR_DEFECTO;
}

export async function setIdioma(idioma: Idioma): Promise<void> {
  if (!isTauri()) {
    if (typeof localStorage !== "undefined") localStorage.setItem("idioma", idioma);
    return;
  }

  const { Store } = await import("@tauri-apps/plugin-store");
  const store = await Store.load(IDIOMA_STORE_FILE);
  await store.set("idioma", idioma);
  await store.save();
}
