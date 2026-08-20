import type { Migration } from "./0001_init.js";

// Reestructuracion completa de categorias: de 3 (Fotografia/Pintura/Escultura)
// a 7, agregando Obra Grafica Original, Dibujo, Arte Textil y Ceramica, y
// Nuevos Medios. SQLite no permite ALTER de un CHECK existente, asi que se
// reconstruye "obra" (mismo patron que 0027/0029). Ademas, obra_pintura y
// obra_escultura se consolidan en una unica tabla "obra_detalle" (misma
// forma para las 6 categorias no-fotografia: subtipo + tecnica/dimensiones/
// peso/fecha_creacion, mas 2 columnas exclusivas de Pintura/Tecnicas
// tradicionales).
//
// Migracion de datos existente:
// - Pintura con subtipo_pintura = 'Original' -> sigue en Pintura, subtipo
//   'TecnicasTradicionales'.
// - Pintura con subtipo_pintura IN ('Serigrafia','Litografia') -> pasa a la
//   categoria nueva ObraGrafica, subtipo 'GrabadoPlanografico' (esas dos
//   tecnicas caen ahi en la taxonomia nueva).
// - Pintura con subtipo_pintura = 'Grabado' (valor generico viejo, ambiguo
//   entre las 3 familias de grabado nuevas) -> pasa a ObraGrafica con
//   subtipo NULL: no se adivina, el usuario lo completa si edita esa obra.
// - Escultura -> se preserva tecnica/dimensiones/peso/fecha_creacion, pero
//   subtipo queda NULL (no existia subtipo de escultura antes, no hay forma
//   de inferir cual de las 3 familias nuevas era).
export const migration0039CategoriasObraDetalle: Migration = {
  name: "0039_categorias_obra_detalle",
  sql: `
CREATE TABLE obra_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo TEXT NOT NULL,
  categoria_obra TEXT NOT NULL CHECK (categoria_obra IN ('Fotografia','Pintura','Escultura','ObraGrafica','Dibujo','TextilCeramica','NuevosMedios')),
  artista_id INTEGER NOT NULL REFERENCES artista(id) ON DELETE RESTRICT,
  miniatura_path TEXT,
  imagen_alta_resolucion_path TEXT,
  estado TEXT NOT NULL DEFAULT 'disponible' CHECK (estado IN ('disponible','en_stock','vendida','reservada','exhibicion','consignacion','destruida','descartada','en_produccion','coleccion_autor')),
  ubicacion_fisica_actual TEXT,
  es_seriada INTEGER NOT NULL DEFAULT 0,
  fecha_alta_sistema TEXT NOT NULL DEFAULT (datetime('now')),
  tags TEXT,
  marcada INTEGER NOT NULL DEFAULT 0
);

INSERT INTO obra_new (id, titulo, categoria_obra, artista_id, miniatura_path, imagen_alta_resolucion_path, estado, ubicacion_fisica_actual, es_seriada, fecha_alta_sistema, tags, marcada)
SELECT
  obra.id, obra.titulo,
  CASE
    WHEN obra.categoria_obra = 'Pintura' AND obra_pintura.subtipo_pintura IN ('Serigrafia','Litografia','Grabado') THEN 'ObraGrafica'
    ELSE obra.categoria_obra
  END,
  obra.artista_id, obra.miniatura_path, obra.imagen_alta_resolucion_path, obra.estado, obra.ubicacion_fisica_actual, obra.es_seriada, obra.fecha_alta_sistema, obra.tags, obra.marcada
FROM obra
LEFT JOIN obra_pintura ON obra_pintura.obra_id = obra.id;

DROP TABLE obra;
ALTER TABLE obra_new RENAME TO obra;
CREATE INDEX idx_obra_artista ON obra(artista_id);

CREATE TABLE obra_detalle (
  obra_id INTEGER PRIMARY KEY REFERENCES obra(id) ON DELETE CASCADE,
  subtipo TEXT,
  tecnica_material TEXT,
  soporte TEXT,
  tecnica TEXT,
  dimensiones TEXT,
  peso TEXT,
  fecha_creacion TEXT
);

INSERT INTO obra_detalle (obra_id, subtipo, tecnica, dimensiones, peso, fecha_creacion)
SELECT obra_id,
  CASE subtipo_pintura
    WHEN 'Original' THEN 'TecnicasTradicionales'
    WHEN 'Serigrafia' THEN 'GrabadoPlanografico'
    WHEN 'Litografia' THEN 'GrabadoPlanografico'
    ELSE NULL
  END,
  tecnica, dimensiones, peso, fecha_creacion
FROM obra_pintura;

INSERT INTO obra_detalle (obra_id, subtipo, tecnica, dimensiones, peso, fecha_creacion)
SELECT obra_id, NULL, tecnica, dimensiones, peso, fecha_creacion
FROM obra_escultura;

DROP TABLE obra_pintura;
DROP TABLE obra_escultura;

UPDATE texto_ayuda
SET texto_es = 'Tecnicas tradicionales: oleo, acrilico o temple sobre lienzo, lino, tabla, cobre o aluminio (elegir tecnica y soporte abajo). Tecnicas mixtas: combinaciones de pintura con collage, pigmentos industriales, polvo de marmol, arena o transferencias. Murales transportables y dipticos/tripticos: obras de gran formato concebidas en paneles modulares.',
    texto_en = 'Traditional techniques: oil, acrylic or tempera on canvas, linen, panel, copper or aluminum (choose technique and support below). Mixed techniques: combinations of painting with collage, industrial pigments, marble dust, sand or transfers. Transportable murals and diptychs/triptychs: large-format works conceived in modular panels.'
WHERE field_key = 'subtipo_pintura';

INSERT INTO texto_ayuda (field_key, texto_es, texto_en) VALUES
  ('subtipo_obra_grafica', 'Grabado en relieve: xilografia (madera) y linograbado. Grabado en hueco (calcografia): aguafuerte, aguatinta, punta seca, mezzotinta y fotograbado. Grabado planografico y permeable: litografia sobre piedra o plancha de zinc, y serigrafia artistica. Monotipos y piezas unicas impresas: estampas sin tirada repetible de caracter pictorico.', 'Relief printing: woodcut and linocut. Intaglio (calcography): etching, aquatint, drypoint, mezzotint and photogravure. Planographic and permeable printing: lithography on stone or zinc plate, and artistic screen printing. Monotypes and unique printed pieces: prints with no repeatable run, of a pictorial nature.'),
  ('subtipo_escultura', 'Talla directa y modelado: marmol, piedra caliza, madera, arcilla, terracota y yeso. Fundicion en metal: bronce, aluminio y hierro fundido (piezas unicas o ediciones limitadas de hasta 8 o 12 copias legales, dato de referencia). Escultura contemporanea y ensamblaje: resinas epoxi, acrilicos, vidrio soplado/fundido, acero corten, ready-mades y objetos encontrados modificados.', 'Direct carving and modeling: marble, limestone, wood, clay, terracotta and plaster. Metal casting: bronze, aluminum and cast iron (unique pieces or limited editions of up to 8 or 12 legal copies, for reference). Contemporary sculpture and assemblage: epoxy resins, acrylics, blown/cast glass, corten steel, ready-mades and modified found objects.'),
  ('subtipo_dibujo', 'Tecnicas secas: grafito, carboncillo, sanguina, pastel suave y lapices de color. Tecnicas humedas: tintas chinas, aguadas, acuarelas y gouache. Estudios preparatorios y cuadernos de bocetos: dibujos de proyecto, croquis arquitectonicos y notas de campo de artistas consagrados.', 'Dry techniques: graphite, charcoal, sanguine, soft pastel and colored pencils. Wet techniques: Chinese ink, washes, watercolor and gouache. Preparatory studies and sketchbooks: project drawings, architectural sketches and field notes by established artists.'),
  ('subtipo_textil_ceramica', 'Tapiceria y fibra contemporanea: telar tradicional, bordado conceptual, lana fieltrada y estructuras en hilo de cobre o fibra vegetal. Ceramica escultorica y utilitaria de autor: gres, porcelana intervenida, raku y terracotas con esmaltes unicos.', 'Tapestry and contemporary fiber: traditional loom, conceptual embroidery, felted wool and structures in copper thread or plant fiber. Sculptural and utilitarian studio ceramics: stoneware, altered porcelain, raku and terracotta with unique glazes.'),
  ('subtipo_nuevos_medios', 'Videoarte y filmes experimentales: ediciones vendidas en unidades fisicas (discos maestros, pen drives de autor) o transferencias digitales seguras acompanadas de un Certificado de Autenticidad con instrucciones tecnicas de proyeccion. Instalaciones y Site-Specific: obras espaciales vendidas como proyectos con manual de montaje estricto, componentes fisicos y derechos de recreacion. Arte digital y generativo: piezas algoritmicas, arte interactivo controlado por software y activos digitales certificados.', 'Videoart and experimental film: editions sold as physical units (master discs, artist pen drives) or secure digital transfers accompanied by a Certificate of Authenticity with technical projection instructions. Installations and Site-Specific work: spatial works sold as projects with a strict installation manual, physical components and re-creation rights. Digital and generative art: algorithmic pieces, software-controlled interactive art and certified digital assets.'),
  ('tecnica_material', 'Material principal utilizado: oleo, acrilico o temple.', 'Main material used: oil, acrylic or tempera.'),
  ('soporte_pintura', 'Superficie sobre la que esta realizada la obra: lienzo, lino, tabla, cobre o aluminio.', 'Surface the work is made on: canvas, linen, panel, copper or aluminum.');
`,
};
