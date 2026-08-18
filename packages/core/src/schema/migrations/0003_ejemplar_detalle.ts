import type { Migration } from "./0001_init.js";

export const migration0003EjemplarDetalle: Migration = {
  name: "0003_ejemplar_detalle",
  sql: `
ALTER TABLE ejemplar ADD COLUMN fecha_impresion TEXT;
ALTER TABLE ejemplar ADD COLUMN soporte_impresion TEXT;
ALTER TABLE ejemplar ADD COLUMN ubicacion_actual TEXT;
`,
};
