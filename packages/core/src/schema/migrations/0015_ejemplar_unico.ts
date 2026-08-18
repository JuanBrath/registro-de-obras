import type { Migration } from "./0001_init.js";

export const migration0015EjemplarUnico: Migration = {
  name: "0015_ejemplar_unico",
  sql: `
ALTER TABLE ejemplar ADD COLUMN dimensiones TEXT;

INSERT INTO ejemplar (obra_id, tipo, indice, total_ediciones, numero, estado)
SELECT id, 'edicion', 1, 1, '1/1', estado
FROM obra
WHERE es_seriada = 0;

UPDATE ejemplar
SET dimensiones = (SELECT dimensiones FROM obra_fotografia WHERE obra_fotografia.obra_id = ejemplar.obra_id)
WHERE numero = '1/1' AND obra_id IN (SELECT id FROM obra WHERE categoria_obra = 'Fotografia');

UPDATE ejemplar
SET dimensiones = (SELECT dimensiones FROM obra_pintura WHERE obra_pintura.obra_id = ejemplar.obra_id)
WHERE numero = '1/1' AND obra_id IN (SELECT id FROM obra WHERE categoria_obra = 'Pintura');

UPDATE ejemplar
SET dimensiones = (SELECT dimensiones FROM obra_escultura WHERE obra_escultura.obra_id = ejemplar.obra_id)
WHERE numero = '1/1' AND obra_id IN (SELECT id FROM obra WHERE categoria_obra = 'Escultura');

UPDATE venta
SET ejemplar_id = (SELECT ejemplar.id FROM ejemplar WHERE ejemplar.obra_id = venta.obra_id AND ejemplar.numero = '1/1')
WHERE ejemplar_id IS NULL;

UPDATE ejemplar
SET venta_id = (SELECT venta.id FROM venta WHERE venta.ejemplar_id = ejemplar.id)
WHERE numero = '1/1' AND EXISTS (SELECT 1 FROM venta WHERE venta.ejemplar_id = ejemplar.id);
`,
};
