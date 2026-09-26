import { parsearCapitulo, type CapituloManual } from "@registro/core";

// Cada archivo de contenido/ es un capitulo del manual (ver el formato en
// packages/core/src/business/manual.ts). Se leen como texto al armar el
// programa; el numero del nombre ("01-...") solo define el orden y el resto
// es el id con el que otros capitulos lo enlazan: "cap:primeros-pasos".
const archivos = import.meta.glob<string>("./contenido/*.md", { query: "?raw", import: "default", eager: true });

export const CAPITULOS: CapituloManual[] = Object.entries(archivos)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([ruta, markdown]) => {
    const nombre = ruta.split("/").pop() ?? ruta;
    return parsearCapitulo(nombre.replace(/^\d+-/, "").replace(/\.md$/, ""), markdown);
  });
