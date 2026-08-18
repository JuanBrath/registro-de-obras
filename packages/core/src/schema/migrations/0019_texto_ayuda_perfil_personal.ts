import type { Migration } from "./0001_init.js";

export const migration0019TextoAyudaPerfilPersonal: Migration = {
  name: "0019_texto_ayuda_perfil_personal",
  sql: `
INSERT INTO texto_ayuda (field_key, texto_es, texto_en) VALUES
  ('perfil_personal_nota', 'Estos datos identifican al autor de las obras de este registro. Se completan una sola vez y se usan automaticamente en cada obra nueva.', 'This data identifies the author of the artworks in this registry. It is filled in only once and is used automatically for every new artwork.');
`,
};
