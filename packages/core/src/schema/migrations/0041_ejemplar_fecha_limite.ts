import type { Migration } from "./0001_init.js";

// Fecha limite del estado Exhibicion/Consignacion: hasta cuando la pieza
// queda en la galeria/feria antes de tener que resolver su devolucion o
// renovacion.
export const migration0041EjemplarFechaLimite: Migration = {
  name: "0041_ejemplar_fecha_limite",
  sql: `
ALTER TABLE ejemplar ADD COLUMN fecha_limite TEXT;

INSERT INTO texto_ayuda (field_key, texto_es, texto_en) VALUES
  ('fecha_limite_ejemplar', 'Fecha hasta la cual la pieza queda en exhibicion o consignacion, antes de resolver su devolucion o renovacion.', 'Date until which the piece remains on exhibition or consignment, before its return or renewal must be resolved.');
`,
};
