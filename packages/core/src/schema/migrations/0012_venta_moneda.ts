import type { Migration } from "./0001_init.js";

export const migration0012VentaMoneda: Migration = {
  name: "0012_venta_moneda",
  sql: `
ALTER TABLE venta ADD COLUMN moneda TEXT NOT NULL DEFAULT 'ARS' CHECK (moneda IN ('ARS', 'USD', 'EUR'));
`,
};
