import type { Migration } from "./0001_init.js";

export const migration0064ObraFotografiaAnioEdicion: Migration = {
  name: "0064_obra_fotografia_anio_edicion",
  sql: `
ALTER TABLE obra_fotografia RENAME COLUMN fecha_edicion TO anio_edicion;

-- El campo pasa de fecha completa a solo el año: los valores existentes
-- (formato "AAAA-MM-DD") se recortan a los primeros 4 caracteres.
UPDATE obra_fotografia SET anio_edicion = substr(anio_edicion, 1, 4)
WHERE anio_edicion IS NOT NULL AND length(anio_edicion) > 4;
`,
};
