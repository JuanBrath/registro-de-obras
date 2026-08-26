import type { Migration } from "./0001_init.js";

export const migration0059VentaAsesor: Migration = {
  name: "0059_venta_asesor",
  sql: `
ALTER TABLE venta ADD COLUMN asesor_venta TEXT;

INSERT INTO texto_ayuda (field_key, texto_es, texto_en) VALUES
  ('asesor_venta', 'Nombre de la persona del equipo comercial que gestiono esta venta. Es un dato manual, no esta vinculado a ningun usuario del sistema.', 'Name of the sales team member who handled this sale. This is a manual field, not linked to any system user.');
`,
};
