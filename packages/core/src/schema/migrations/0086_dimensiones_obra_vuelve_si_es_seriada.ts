import type { Migration } from "./0001_init.js";

// Vuelta atras parcial de 0085: el usuario aclaro que el tamano "de referencia" a nivel obra SI
// tiene sentido, pero solo cuando la obra es seriada (una edicion puede ser uniforme en tamano, o
// no -ver escala_por_tamanos-; para una obra unica el tamano del unico ejemplar ya alcanza). La
// UI ahora pregunta esto DESPUES de "es seriada" y solo la muestra si la respuesta es si. No se
// restaura ningun dato (el que habia se migro a cada ejemplar en 0085, y ahi se queda): el usuario
// prefirio cargar el dato de referencia de nuevo el mismo.
export const migration0086DimensionesObraVuelveSiEsSeriada: Migration = {
  name: "0086_dimensiones_obra_vuelve_si_es_seriada",
  sql: `
ALTER TABLE obra_fotografia ADD COLUMN dimensiones TEXT;
ALTER TABLE obra_fotografia ADD COLUMN escala_por_tamanos TEXT;
ALTER TABLE obra_detalle ADD COLUMN dimensiones TEXT;
`,
};
