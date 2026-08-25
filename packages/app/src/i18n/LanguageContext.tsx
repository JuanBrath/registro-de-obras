import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { es } from "./es.js";
import { en } from "./en.js";
import { getIdioma, setIdioma as persistIdioma, type Idioma } from "../data/idioma.js";
import { isTauri } from "../adapters/detectPlatform.js";

function syncNativeMenuLanguage(idioma: Idioma): void {
  if (!isTauri()) return;
  invoke("set_app_menu_language", { lang: idioma }).catch(() => {});
}

export type { Idioma };
export type TranslationKey = keyof typeof es;

const dictionaries: Record<Idioma, Record<TranslationKey, string>> = { es, en };

interface LanguageContextValue {
  idioma: Idioma;
  setIdioma: (idioma: Idioma) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const LanguageReactContext = createContext<LanguageContextValue | null>(null);

export function interpolate(text: string, vars?: Record<string, string | number>): string {
  if (!vars) return text;
  let result = text;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(`{{${key}}}`, String(value));
  }
  return result;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [idioma, setIdiomaState] = useState<Idioma>("es");

  useEffect(() => {
    getIdioma().then((loaded) => {
      setIdiomaState(loaded);
      syncNativeMenuLanguage(loaded);
    });
  }, []);

  function setIdioma(next: Idioma) {
    setIdiomaState(next);
    persistIdioma(next);
    syncNativeMenuLanguage(next);
  }

  // Clicking "Español"/"English" en el menú nativo (barra superior de
  // escritorio) emite este evento desde Rust en vez de renderizar UI propia.
  useEffect(() => {
    if (!isTauri()) return;
    const unlistenPromise = listen<Idioma>("set-language", (event) => setIdioma(event.payload));
    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function t(key: TranslationKey, vars?: Record<string, string | number>): string {
    const text = dictionaries[idioma][key] ?? dictionaries.es[key] ?? key;
    return interpolate(text, vars);
  }

  return <LanguageReactContext.Provider value={{ idioma, setIdioma, t }}>{children}</LanguageReactContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageReactContext);
  if (!ctx) throw new Error("useLanguage debe usarse dentro de LanguageProvider");
  return ctx;
}
