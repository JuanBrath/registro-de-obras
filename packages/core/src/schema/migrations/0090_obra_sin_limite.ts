import type { Migration } from "./0001_init.js";

// Tercera modalidad de obra: "sin serie" (no seriada). La obra unica se vende una sola vez y la seriada tantas
// veces como copias tiene la serie; la obra sin serie se puede vender sin limite. Cada venta consume una copia
// (ejemplar) con su propio detalle y, apenas deja de estar disponible, se genera una copia nueva lista para la
// siguiente venta (ver business/copiasSinLimite.ts). Una obra sin serie tiene es_seriada = 0 y sin_limite = 1.
export const migration0090ObraSinLimite: Migration = {
  name: "0090_obra_sin_limite",
  sql: `
ALTER TABLE obra ADD COLUMN sin_limite INTEGER NOT NULL DEFAULT 0;

UPDATE texto_ayuda SET
  texto_es = 'Define cuántas veces se puede vender la obra. Obra única: se vende una sola vez. Seriada: tiene una edición de copias numeradas (y, si querés, pruebas de autor) y se vende solo la cantidad de copias de la serie. Sin serie: no hay límite, se puede vender todas las veces que se quiera; cada venta usa una copia con su propio detalle y se genera una nueva lista para la siguiente.',
  texto_en = 'Defines how many times the artwork can be sold. Unique artwork: sold only once. Editioned: it has an edition of numbered copies (and, if you want, artist''s proofs) and it is sold only as many times as there are copies in the edition. Non-editioned: there is no limit, it can be sold as many times as you want; each sale uses a copy with its own details and a new one is generated for the next sale.'
WHERE field_key = 'es_seriada';
`,
};
