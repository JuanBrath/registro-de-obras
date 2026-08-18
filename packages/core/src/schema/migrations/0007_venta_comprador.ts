import type { Migration } from "./0001_init.js";

export const migration0007VentaComprador: Migration = {
  name: "0007_venta_comprador",
  sql: `
ALTER TABLE venta ADD COLUMN comprador_email TEXT;
ALTER TABLE venta ADD COLUMN comprador_telefono TEXT;
`,
};
