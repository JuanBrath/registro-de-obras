import type { Migration } from "./0001_init.js";

export const migration0033EjemplarMonedaVenta: Migration = {
  name: "0033_ejemplar_moneda_venta",
  sql: `
ALTER TABLE ejemplar ADD COLUMN moneda_venta TEXT;
`,
};
