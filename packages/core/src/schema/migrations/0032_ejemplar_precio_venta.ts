import type { Migration } from "./0001_init.js";

export const migration0032EjemplarPrecioVenta: Migration = {
  name: "0032_ejemplar_precio_venta",
  sql: `
ALTER TABLE ejemplar ADD COLUMN precio_venta REAL;
`,
};
