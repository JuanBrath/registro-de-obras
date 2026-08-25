import { es } from "../i18n/es.js";
import { en } from "../i18n/en.js";
import { interpolate, type TranslationKey } from "../i18n/LanguageContext.js";

export type InformeIdioma = "es" | "en" | "ambos";

const dictionaries: Record<"es" | "en", Record<TranslationKey, string>> = { es, en };

/**
 * Traduce una clave para el idioma elegido en un informe puntual, independiente
 * del idioma en el que esté corriendo la app. Con "ambos" concatena las dos
 * versiones ("Español / English") para que el campo salga bilingüe.
 */
export function tInforme(idioma: InformeIdioma, key: TranslationKey, vars?: Record<string, string | number>): string {
  if (idioma === "ambos") {
    const es_ = interpolate(dictionaries.es[key] ?? key, vars);
    const en_ = interpolate(dictionaries.en[key] ?? key, vars);
    return es_ === en_ ? es_ : `${es_} / ${en_}`;
  }
  return interpolate(dictionaries[idioma][key] ?? key, vars);
}
