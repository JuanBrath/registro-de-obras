import type { Migration } from "./0001_init.js";

export const migration0011VentaTipo: Migration = {
  name: "0011_venta_tipo",
  sql: `
ALTER TABLE venta ADD COLUMN tipo TEXT NOT NULL DEFAULT 'venta' CHECK (tipo IN ('venta', 'reserva'));
`,
};
