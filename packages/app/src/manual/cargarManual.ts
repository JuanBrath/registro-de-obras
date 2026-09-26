import { parsearCapitulo, type CapituloManual, type IdiomaManual } from "@registro/core";

// Cada archivo de contenido/<idioma>/ es un capitulo del manual (ver el formato en
// packages/core/src/business/manual.ts). Se leen como texto al armar el
// programa; el numero del nombre ("01-...") solo define el orden y el resto
// es el id con el que otros capitulos lo enlazan: "cap:primeros-pasos".
// Los dos idiomas tienen que tener los mismos archivos con los mismos nombres.
const archivosEs = import.meta.glob<string>("./contenido/es/*.md", { query: "?raw", import: "default", eager: true });
const archivosEn = import.meta.glob<string>("./contenido/en/*.md", { query: "?raw", import: "default", eager: true });

function armar(archivos: Record<string, string>): CapituloManual[] {
  return Object.entries(archivos)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ruta, markdown]) => {
      const nombre = ruta.split("/").pop() ?? ruta;
      return parsearCapitulo(nombre.replace(/^\d+-/, "").replace(/\.md$/, ""), markdown);
    });
}

const CAPITULOS: Record<IdiomaManual, CapituloManual[]> = { es: armar(archivosEs), en: armar(archivosEn) };

/** Los capitulos del manual en el idioma pedido. */
export function capitulosDe(idioma: IdiomaManual): CapituloManual[] {
  return CAPITULOS[idioma];
}
