import type { Migration } from "./0001_init.js";

export const migration0018TextoAyudaVentasFechas: Migration = {
  name: "0018_texto_ayuda_ventas_fechas",
  sql: `
INSERT INTO texto_ayuda (field_key, texto_es, texto_en) VALUES
  ('ventas_fechas', 'Estas fechas vienen precargadas (el mes actual). Cambialas por el rango que quieras consultar y despues toca Buscar.', 'These dates come pre-filled (the current month). Change them to the range you want to check and then tap Search.');
`,
};
