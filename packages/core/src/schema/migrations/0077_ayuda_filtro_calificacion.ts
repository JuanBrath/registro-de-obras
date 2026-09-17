import type { Migration } from "./0001_init.js";

export const migration0077AyudaFiltroCalificacion: Migration = {
  name: "0077_ayuda_filtro_calificacion",
  sql: `
UPDATE texto_ayuda SET
  texto_es = 'Un clic en una estrella muestra las obras con esa cantidad de estrellas o mas. Volve a hacer clic en la misma estrella para quitar el filtro. Manten presionado el boton para quitarle la calificacion a todas las obras de una vez.',
  texto_en = 'Click a star to show artworks with that many stars or more. Click the same star again to clear the filter. Press and hold the button to clear the rating from every artwork at once.'
WHERE field_key = 'filtro_solo_marcadas';
`,
};
