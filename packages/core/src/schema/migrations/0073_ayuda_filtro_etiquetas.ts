import type { Migration } from "./0001_init.js";

export const migration0073AyudaFiltroEtiquetas: Migration = {
  name: "0073_ayuda_filtro_etiquetas",
  sql: `
INSERT INTO texto_ayuda (field_key, texto_es, texto_en) VALUES
  ('filtro_etiquetas_multiple', 'Si elegis mas de una etiqueta, los filtros se suman: solo se muestran las obras que tengan todas las etiquetas elegidas, no alguna cualquiera.', 'If you choose more than one tag, the filters add up: only artworks that have all of the chosen tags are shown, not just any one of them.');
`,
};
