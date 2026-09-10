import type { Migration } from "./0001_init.js";

export const migration0074AyudaFiltroEtiquetasUnion: Migration = {
  name: "0074_ayuda_filtro_etiquetas_union",
  sql: `
UPDATE texto_ayuda SET
  texto_es = 'Si elegis mas de una etiqueta, se amplia la busqueda: se muestran las obras que tengan al menos una de las etiquetas elegidas, no hace falta que las tengan todas.',
  texto_en = 'If you choose more than one tag, the search widens: artworks that have at least one of the chosen tags are shown, they do not need to have all of them.'
WHERE field_key = 'filtro_etiquetas_multiple';
`,
};
