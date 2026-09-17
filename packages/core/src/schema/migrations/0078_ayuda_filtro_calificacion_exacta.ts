import type { Migration } from "./0001_init.js";

export const migration0078AyudaFiltroCalificacionExacta: Migration = {
  name: "0078_ayuda_filtro_calificacion_exacta",
  sql: `
UPDATE texto_ayuda SET
  texto_es = 'Un clic en una estrella muestra solo las obras con esa cantidad exacta de estrellas. Volve a hacer clic en la misma estrella para quitar el filtro. Manten presionado el boton para quitarle la calificacion a todas las obras de una vez.',
  texto_en = 'Click a star to show only the artworks with that exact number of stars. Click the same star again to clear the filter. Press and hold the button to clear the rating from every artwork at once.'
WHERE field_key = 'filtro_solo_marcadas';
`,
};
