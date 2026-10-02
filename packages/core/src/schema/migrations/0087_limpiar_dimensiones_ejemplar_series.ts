import type { Migration } from "./0001_init.js";

// Efecto secundario no deseado de 0085: al copiar el tamano de referencia de la obra (de arriba) a
// cada ejemplar que todavia no tuviera nada cargado, en una obra SERIADA eso dejaba el MISMO valor
// repetido en TODOS los ejemplares de esa edicion (como si cada copia se hubiera medido y
// confirmado por separado, cuando en realidad era solo el dato general heredado). Juan pidio
// borrarlo: el tamano de referencia vive de nuevo arriba (0086), y el de cada ejemplar queda libre
// para completarlo aparte solo si de verdad hace falta (una copia puntual con un tamano distinto).
// En una obra UNICA no se toca: ahi el ejemplar es el unico lugar donde vive ese dato (el campo de
// arriba no se muestra para obras unicas).
export const migration0087LimpiarDimensionesEjemplarSeries: Migration = {
  name: "0087_limpiar_dimensiones_ejemplar_series",
  sql: `
UPDATE ejemplar
SET dimensiones = NULL
WHERE dimensiones IS NOT NULL
  AND obra_id IN (SELECT id FROM obra WHERE es_seriada = 1);
`,
};
