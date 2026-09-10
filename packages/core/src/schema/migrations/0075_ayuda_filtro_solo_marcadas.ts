import type { Migration } from "./0001_init.js";

export const migration0075AyudaFiltroSoloMarcadas: Migration = {
  name: "0075_ayuda_filtro_solo_marcadas",
  sql: `
INSERT INTO texto_ayuda (field_key, texto_es, texto_en) VALUES
  ('filtro_solo_marcadas', 'Un clic muestra solo las obras marcadas con estrella. Manten presionado el boton para desmarcarlas todas de una vez.', 'Click to show only the artworks marked with a star. Press and hold the button to unmark them all at once.');
`,
};
