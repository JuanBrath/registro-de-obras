import type { Migration } from "./0001_init.js";

export const migration0043ArtistaPerfilExtendido: Migration = {
  name: "0043_artista_perfil_extendido",
  sql: `
ALTER TABLE artista ADD COLUMN linkedin TEXT;
ALTER TABLE artista ADD COLUMN nombre_artistico TEXT;
ALTER TABLE artista ADD COLUMN lugar_nacimiento TEXT;
ALTER TABLE artista ADD COLUMN lugar_fallecimiento TEXT;
ALTER TABLE artista ADD COLUMN lugar_residencia_trabajo TEXT;
ALTER TABLE artista ADD COLUMN declaracion_artista TEXT;
ALTER TABLE artista ADD COLUMN formacion_academica TEXT;
ALTER TABLE artista ADD COLUMN exposiciones_individuales TEXT;
ALTER TABLE artista ADD COLUMN exposiciones_colectivas TEXT;
ALTER TABLE artista ADD COLUMN premios_becas_reconocimientos TEXT;
ALTER TABLE artista ADD COLUMN colecciones TEXT;
ALTER TABLE artista ADD COLUMN publicaciones_prensa TEXT;

INSERT INTO texto_ayuda (field_key, texto_es, texto_en) VALUES
  ('artista_bio_corta', 'Parrafo conciso (80-120 palabras) que resuma quien es, donde trabaja y sus hitos principales.', 'Concise paragraph (80-120 words) summarizing who they are, where they work, and their main milestones.'),
  ('artista_declaracion', 'Texto breve donde el artista explica el concepto, tematicas, procesos y tecnicas que guian su cuerpo de obra.', 'Short text where the artist explains the concept, themes, processes and techniques guiding their body of work.'),
  ('artista_formacion_academica', 'Titulos universitarios, talleres, residencias artisticas o mentorias relevantes.', 'University degrees, workshops, artist residencies or relevant mentorships.'),
  ('artista_exposiciones_individuales', 'Ordenadas cronologicamente de forma inversa (año, titulo de la exposicion, nombre de la galeria/museo, ciudad, pais).', 'Listed in reverse chronological order (year, exhibition title, gallery/museum name, city, country).'),
  ('artista_exposiciones_colectivas', 'Seleccion de las mas relevantes, bajo el mismo formato cronologico (año, titulo, galeria/museo, ciudad, pais).', 'Selection of the most relevant ones, under the same chronological format (year, title, gallery/museum, city, country).'),
  ('artista_premios_becas', 'Convocatorias ganadas, distinciones o menciones honorificas.', 'Awards won, distinctions or honorable mentions.'),
  ('artista_colecciones', 'Publicas o privadas donde ya figure su trabajo (museos, fundaciones, colecciones corporativas).', 'Public or private collections where their work already appears (museums, foundations, corporate collections).'),
  ('artista_publicaciones_prensa', 'Libros, catalogos, articulos de revistas especializadas o reseñas criticas.', 'Books, catalogs, specialized magazine articles or critical reviews.');
`,
};
