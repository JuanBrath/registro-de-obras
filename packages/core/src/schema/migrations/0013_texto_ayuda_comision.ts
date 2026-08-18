import type { Migration } from "./0001_init.js";

export const migration0013TextoAyudaComision: Migration = {
  name: "0013_texto_ayuda_comision",
  sql: `
UPDATE texto_ayuda
SET texto_es = 'Indica si esta venta o reserva paga comision a la galeria. Al activarlo se calculan el importe de comision y el monto neto para el artista.',
    texto_en = 'Indicates whether this sale or reservation pays gallery commission. Enabling it calculates the commission amount and the net amount for the artist.'
WHERE field_key = 'aplica_comision';
`,
};
