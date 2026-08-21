import type { Migration } from "./0001_init.js";

export const migration0044TextoAyudaNumeroArtista: Migration = {
  name: "0044_texto_ayuda_numero_artista",
  sql: `
INSERT INTO texto_ayuda (field_key, texto_es, texto_en) VALUES
  ('numero_artista_auto', 'El numero de identificacion se asigna automaticamente. Estos datos quedan disponibles para elegir al cargar una obra.', 'The ID number is assigned automatically. This info becomes available to choose when adding an artwork.');
`,
};
