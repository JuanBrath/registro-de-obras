import { isTauri } from "../adapters/detectPlatform.js";

export type TamanoFuente = "chica" | "mediana" | "grande";

const TAMANO_FUENTE_STORE_FILE = "tamano-fuente.json";
const POR_DEFECTO: TamanoFuente = "mediana";

function esTamanoValido(value: unknown): value is TamanoFuente {
  return value === "chica" || value === "mediana" || value === "grande";
}

export async function getTamanoFuente(): Promise<TamanoFuente> {
  if (!isTauri()) {
    const stored = typeof localStorage !== "undefined" ? localStorage.getItem("tamanoFuente") : null;
    return esTamanoValido(stored) ? stored : POR_DEFECTO;
  }

  const { Store } = await import("@tauri-apps/plugin-store");
  const store = await Store.load(TAMANO_FUENTE_STORE_FILE);
  const existing = await store.get<string>("tamanoFuente");
  if (esTamanoValido(existing)) return existing;

  await store.set("tamanoFuente", POR_DEFECTO);
  await store.save();
  return POR_DEFECTO;
}

export async function setTamanoFuente(tamano: TamanoFuente): Promise<void> {
  if (!isTauri()) {
    if (typeof localStorage !== "undefined") localStorage.setItem("tamanoFuente", tamano);
    return;
  }

  const { Store } = await import("@tauri-apps/plugin-store");
  const store = await Store.load(TAMANO_FUENTE_STORE_FILE);
  await store.set("tamanoFuente", tamano);
  await store.save();
}
