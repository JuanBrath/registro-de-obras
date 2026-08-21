import type { Migration } from "./0001_init.js";

export const migration0042ClientePerfil: Migration = {
  name: "0042_cliente_perfil",
  sql: `
ALTER TABLE cliente ADD COLUMN tipo_cliente TEXT;
ALTER TABLE cliente ADD COLUMN domicilio TEXT;
ALTER TABLE cliente ADD COLUMN ciudad TEXT;
ALTER TABLE cliente ADD COLUMN pais TEXT;
ALTER TABLE cliente ADD COLUMN perfil_intereses TEXT;

INSERT INTO texto_ayuda (field_key, texto_es, texto_en) VALUES
  ('perfil_intereses', 'Preferencias tematicas, tecnicas o formatos favoritos (ej. contactar en epocas de ferias, prefiere marcos en madera natural, etc.).', 'Thematic, technique or format preferences (e.g. contact during art fair season, prefers natural wood frames, etc.).');
`,
};
