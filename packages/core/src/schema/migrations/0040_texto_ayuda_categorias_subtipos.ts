import type { Migration } from "./0001_init.js";

// Reescribe los textos de ayuda de subtipo (agregados en 0038/0039) para que
// cada subtipo quede en su propia linea con el nombre resaltado (el
// HelpIcon separa por "\n" y pone en negrita lo que esta antes de ": "),
// en vez de un unico parrafo con todo concatenado. Agrega ademas la ayuda
// de "Categoria", con solo los nombres de subtipos por categoria (sin la
// explicacion de materiales/procesos que ya tiene el ayuda de Subtipo).
export const migration0040TextoAyudaCategoriasSubtipos: Migration = {
  name: "0040_texto_ayuda_categorias_subtipos",
  sql: `
INSERT INTO texto_ayuda (field_key, texto_es, texto_en) VALUES
  ('categoria_obra',
'Pintura y Tecnicas Mixtas: Tecnicas tradicionales, Tecnicas mixtas, Murales transportables y dipticos/tripticos
Fotografia de Autor y Procesos Alternativos: Fotografia analogica clasica, Fotografia digital Fine Art, Procesos historicos del siglo XIX, Fotolibros y porfolios de coleccionista, Sintografia
Obra Grafica Original (Estampa y Grabado): Grabado en relieve, Grabado en hueco/Calcografia, Grabado planografico y permeable, Monotipos y piezas unicas impresas
Escultura y Arte Tridimensional: Talla directa y modelado, Fundicion en metal, Escultura contemporanea y ensamblaje
Dibujo y Obra sobre Papel: Tecnicas secas, Tecnicas humedas, Estudios preparatorios y cuadernos de bocetos
Arte Textil y Ceramica de Autor: Tapiceria y fibra contemporanea, Ceramica escultorica y utilitaria de autor
Nuevos Medios, Videoarte e Instalaciones: Videoarte y filmes experimentales, Instalaciones y Site-Specific, Arte digital y generativo',
'Painting and Mixed Media: Traditional techniques, Mixed techniques, Transportable murals and diptychs/triptychs
Photography and Alternative Processes: Classic analog photography, Digital Fine Art photography, 19th-century historical processes, Photobooks and collector''s portfolios, Sintography
Original Graphic Work (Prints and Engraving): Relief printing, Intaglio/Chalcography, Planographic and permeable printing, Monotypes and unique printed pieces
Sculpture and Three-Dimensional Art: Direct carving and modeling, Metal casting, Contemporary sculpture and assemblage
Drawing and Works on Paper: Dry techniques, Wet techniques, Preparatory studies and sketchbooks
Textile Art and Ceramics: Contemporary tapestry and fiber, Sculptural and utilitarian ceramics
New Media, Video Art and Installations: Video art and experimental films, Installations and Site-Specific work, Digital and generative art');

UPDATE texto_ayuda
SET texto_es = 'Analogica clasica: copia a la gelatina de plata sobre pelicula.
Digital Fine Art: capturada con sensor digital, se completan los datos EXIF automaticamente.
Procesos historicos: cianotipias, platinotipias, gomas bicromatadas, ferrotipos y colodion humedo.
Fotolibros: cajas numeradas y firmadas con series completas de un proyecto.
Sintografia: generada integramente por inteligencia artificial, sin EXIF ni datos de herramienta.',
    texto_en = 'Classic analog: silver gelatin print on film.
Digital Fine Art: captured with a digital sensor, EXIF data is filled in automatically.
Historical processes: cyanotypes, platinotypes, gum bichromates, ferrotypes and wet collodion.
Photobooks: numbered and signed boxes with a complete project series.
Sintography: entirely AI-generated, no EXIF or tool data.'
WHERE field_key = 'subtipo_fotografia';

UPDATE texto_ayuda
SET texto_es = 'Tecnicas tradicionales: oleo, acrilico o temple sobre lienzo, lino, tabla, cobre o aluminio (elegir tecnica y soporte abajo).
Tecnicas mixtas: combinaciones de pintura con collage, pigmentos industriales, polvo de marmol, arena o transferencias.
Murales transportables y dipticos/tripticos: obras de gran formato concebidas en paneles modulares.',
    texto_en = 'Traditional techniques: oil, acrylic or tempera on canvas, linen, panel, copper or aluminum (choose technique and support below).
Mixed techniques: combinations of painting with collage, industrial pigments, marble dust, sand or transfers.
Transportable murals and diptychs/triptychs: large-format works conceived in modular panels.'
WHERE field_key = 'subtipo_pintura';

UPDATE texto_ayuda
SET texto_es = 'Grabado en relieve: xilografia (madera) y linograbado.
Grabado en hueco (calcografia): aguafuerte, aguatinta, punta seca, mezzotinta y fotograbado.
Grabado planografico y permeable: litografia sobre piedra o plancha de zinc, y serigrafia artistica.
Monotipos y piezas unicas impresas: estampas sin tirada repetible de caracter pictorico.',
    texto_en = 'Relief printing: woodcut and linocut.
Intaglio (calcography): etching, aquatint, drypoint, mezzotint and photogravure.
Planographic and permeable printing: lithography on stone or zinc plate, and artistic screen printing.
Monotypes and unique printed pieces: prints with no repeatable run, of a pictorial nature.'
WHERE field_key = 'subtipo_obra_grafica';

UPDATE texto_ayuda
SET texto_es = 'Talla directa y modelado: marmol, piedra caliza, madera, arcilla, terracota y yeso.
Fundicion en metal: bronce, aluminio y hierro fundido (piezas unicas o ediciones limitadas de hasta 8 o 12 copias legales, dato de referencia).
Escultura contemporanea y ensamblaje: resinas epoxi, acrilicos, vidrio soplado/fundido, acero corten, ready-mades y objetos encontrados modificados.',
    texto_en = 'Direct carving and modeling: marble, limestone, wood, clay, terracotta and plaster.
Metal casting: bronze, aluminum and cast iron (unique pieces or limited editions of up to 8 or 12 legal copies, for reference).
Contemporary sculpture and assemblage: epoxy resins, acrylics, blown/cast glass, corten steel, ready-mades and modified found objects.'
WHERE field_key = 'subtipo_escultura';

UPDATE texto_ayuda
SET texto_es = 'Tecnicas secas: grafito, carboncillo, sanguina, pastel suave y lapices de color.
Tecnicas humedas: tintas chinas, aguadas, acuarelas y gouache.
Estudios preparatorios y cuadernos de bocetos: dibujos de proyecto, croquis arquitectonicos y notas de campo de artistas consagrados.',
    texto_en = 'Dry techniques: graphite, charcoal, sanguine, soft pastel and colored pencils.
Wet techniques: Chinese ink, washes, watercolor and gouache.
Preparatory studies and sketchbooks: project drawings, architectural sketches and field notes by established artists.'
WHERE field_key = 'subtipo_dibujo';

UPDATE texto_ayuda
SET texto_es = 'Tapiceria y fibra contemporanea: telar tradicional, bordado conceptual, lana fieltrada y estructuras en hilo de cobre o fibra vegetal.
Ceramica escultorica y utilitaria de autor: gres, porcelana intervenida, raku y terracotas con esmaltes unicos.',
    texto_en = 'Tapestry and contemporary fiber: traditional loom, conceptual embroidery, felted wool and structures in copper thread or plant fiber.
Sculptural and utilitarian studio ceramics: stoneware, altered porcelain, raku and terracotta with unique glazes.'
WHERE field_key = 'subtipo_textil_ceramica';

UPDATE texto_ayuda
SET texto_es = 'Videoarte y filmes experimentales: ediciones vendidas en unidades fisicas (discos maestros, pen drives de autor) o transferencias digitales seguras acompanadas de un Certificado de Autenticidad con instrucciones tecnicas de proyeccion.
Instalaciones y Site-Specific: obras espaciales vendidas como proyectos con manual de montaje estricto, componentes fisicos y derechos de recreacion.
Arte digital y generativo: piezas algoritmicas, arte interactivo controlado por software y activos digitales certificados.',
    texto_en = 'Videoart and experimental film: editions sold as physical units (master discs, artist pen drives) or secure digital transfers accompanied by a Certificate of Authenticity with technical projection instructions.
Installations and Site-Specific work: spatial works sold as projects with a strict installation manual, physical components and re-creation rights.
Digital and generative art: algorithmic pieces, software-controlled interactive art and certified digital assets.'
WHERE field_key = 'subtipo_nuevos_medios';
`,
};
