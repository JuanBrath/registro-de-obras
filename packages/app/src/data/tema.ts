import { isTauri } from "../adapters/detectPlatform.js";

export type Tema = "claro" | "oscuro";

const TEMA_STORE_FILE = "tema.json";

function esTemaValido(value: unknown): value is Tema {
  return value === "claro" || value === "oscuro";
}

function temaPorDefectoSistema(): Tema {
  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
    return "oscuro";
  }
  return "claro";
}

export async function getTema(): Promise<Tema> {
  if (!isTauri()) {
    const stored = typeof localStorage !== "undefined" ? localStorage.getItem("tema") : null;
    return esTemaValido(stored) ? stored : temaPorDefectoSistema();
  }

  const { Store } = await import("@tauri-apps/plugin-store");
  const store = await Store.load(TEMA_STORE_FILE);
  const existing = await store.get<string>("tema");
  if (esTemaValido(existing)) return existing;

  const porDefecto = temaPorDefectoSistema();
  await store.set("tema", porDefecto);
  await store.save();
  return porDefecto;
}

export async function setTema(tema: Tema): Promise<void> {
  if (!isTauri()) {
    if (typeof localStorage !== "undefined") localStorage.setItem("tema", tema);
    return;
  }

  const { Store } = await import("@tauri-apps/plugin-store");
  const store = await Store.load(TEMA_STORE_FILE);
  await store.set("tema", tema);
  await store.save();
}
