import { es } from "./es.js";
import { en } from "./en.js";
import { getIdioma, type Idioma } from "../data/idioma.js";
import { interpolate, type TranslationKey } from "./LanguageContext.js";

const dictionaries: Record<Idioma, Record<TranslationKey, string>> = { es, en };

/**
 * Para textos que se muestran fuera de un componente React (por ejemplo los
 * diálogos nativos de Tauri), donde no se puede usar useLanguage(). Lee el
 * idioma guardado en Configuración y devuelve una función t() igual a la del
 * LanguageProvider. Si el idioma guardado no se puede leer, usa español en vez
 * de dejar el diálogo sin mostrar.
 */
export async function getTraductor(): Promise<
  (key: TranslationKey, vars?: Record<string, string | number>) => string
> {
  let idioma: Idioma = "es";
  try {
    idioma = await getIdioma();
  } catch {
    // Se queda en español.
  }
  return (key, vars) => interpolate(dictionaries[idioma][key] ?? dictionaries.es[key] ?? key, vars);
}
