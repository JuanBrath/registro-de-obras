import type { Migration } from "./0001_init.js";

export const migration0049ObraDetalleGraficaRiguroso: Migration = {
  name: "0049_obra_detalle_grafica_riguroso",
  sql: `
ALTER TABLE obra_detalle ADD COLUMN matriz_material TEXT;
ALTER TABLE obra_detalle ADD COLUMN matriz_estado TEXT;
ALTER TABLE obra_detalle ADD COLUMN papel_marca TEXT;
ALTER TABLE obra_detalle ADD COLUMN papel_gramaje TEXT;
ALTER TABLE obra_detalle ADD COLUMN papel_caracteristicas TEXT;
ALTER TABLE obra_detalle ADD COLUMN editor_publicador TEXT;

ALTER TABLE ejemplar ADD COLUMN tipo_firma TEXT;
ALTER TABLE ejemplar ADD COLUMN clasificacion_prueba_especial TEXT;

INSERT INTO texto_ayuda (field_key, texto_es, texto_en) VALUES
  ('matriz_material', 'Cobre o zinc: metal para aguafuerte, aguatinta y punta seca.
Madera: xilografia o linograbado (linoleo).
Piedra litografica: litografia tradicional sobre piedra caliza.
Malla serigrafica: serigrafia (screen printing).
Otro: aclarar el material en el campo de tecnica.', 'Copper or zinc: metal for etching, aquatint and drypoint.
Wood: woodcut or linocut (linoleum).
Lithographic stone: traditional lithography on limestone.
Screen mesh: screen printing.
Other: clarify the material in the technique field.'),
  ('matriz_estado', 'Conservada: la matriz todavia existe y podria autorizarse una tirada futura.
Cancelada o tachada: se raya o perfora deliberadamente para impedir nuevas estampas, aunque se conserva como testimonio.
Destruida: la matriz ya no existe fisicamente, la edicion queda cerrada de forma definitiva.', 'Preserved: the matrix still exists and a future run could be authorized.
Cancelled or defaced: deliberately scratched or punched to prevent further prints, though kept as a record.
Destroyed: the matrix no longer physically exists, the edition is permanently closed.'),
  ('papel_marca', 'Marca o fabricante del papel (ej. BFK Rives, Arches, Hahnemuhle, Fabriano, Somerset).', 'Paper brand or manufacturer (e.g. BFK Rives, Arches, Hahnemuhle, Fabriano, Somerset).'),
  ('papel_gramaje', 'Gramaje del papel en gramos por metro cuadrado (g/m2); a mayor gramaje, mayor espesor y rigidez de la hoja.', 'Paper weight in grams per square meter (g/m2); the higher the weight, the thicker and stiffer the sheet.'),
  ('papel_caracteristicas', 'Hecho a mano: papel artesanal, no industrial.
Hecho a maquina: papel de produccion industrial.
Bordes con barbas (deckle edge): borde natural de fabricacion, sin cortar.
Bordes desbarbados: cortados a escuadra.', 'Handmade: artisanal, non-industrial paper.
Machine-made: industrially produced paper.
Deckle edge: natural untrimmed manufacturing edge.
Trimmed edges: cut square.'),
  ('editor_publicador', 'Galeria, institucion o particular que financio y publico la tirada, distinto del taller o maestro impresor que la ejecuto tecnicamente.', 'Gallery, institution or individual that financed and published the edition, distinct from the print workshop or master printer that technically produced it.'),
  ('tipo_firma', 'A mano / lapiz: firma autografa del artista sobre el papel.
Monograma: iniciales o simbolo abreviado en lugar de la firma completa.
En plancha: firma o marca grabada directamente en la matriz, se imprime junto con la imagen.
Sello testamentario o de taller: estampado aplicado por la fundacion, herederos o taller tras el fallecimiento del artista o cuando no firma personalmente cada copia.', 'By hand / pencil: the artist''s autograph signature on the paper.
Monogram: initials or an abbreviated symbol instead of the full signature.
In the plate: signature or mark engraved directly into the matrix, printed together with the image.
Estate or workshop stamp: applied by the foundation, heirs or workshop after the artist''s death or when copies are not personally signed.'),
  ('clasificacion_prueba_especial', 'P/E (prueba de estado): muestra una fase intermedia del proceso, antes de la version final.
B.A.T. (Bon a Tirer / prueba de visto bueno): la copia aprobada por el artista como modelo para el resto de la tirada, unica por edicion.
H/C (Hors Commerce): fuera de comercio, no se vende, se usa para archivo, difusion o regalo.
P/I (prueba de impresor): copia que se queda el taller o maestro impresor como registro de su trabajo.
Aplica sobre pruebas de artista u otras copias fuera de la numeracion comercial regular.', 'P/E (state proof): shows an intermediate phase of the process, before the final version.
B.A.T. (Bon a Tirer / approval proof): the copy approved by the artist as the model for the rest of the run, unique per edition.
H/C (Hors Commerce): not for sale, used for archives, promotion or gifting.
P/I (printer''s proof): the copy kept by the workshop or master printer as a record of their work.
Applies to artist proofs or other copies outside the regular commercial numbering.');

UPDATE texto_ayuda SET
  texto_es = 'Nombre del maestro impresor, taller grafico o laboratorio fotografico certificado donde se produjo la copia.',
  texto_en = 'Name of the master printer, print workshop, or certified photo lab where the copy was produced.'
WHERE field_key = 'taller_impresion';

UPDATE texto_ayuda SET
  texto_es = 'Tintas de impresion digital: pigmentadas, base agua o base solvente.
Tintas de grabado: al aceite (calcografia tradicional) o al agua (xilografia, linograbado).
Tintas serigraficas o litograficas: acrilicas, al agua o pigmentos especiales.',
  texto_en = 'Digital print inks: pigment-based, water-based or solvent-based.
Printmaking inks: oil-based (traditional intaglio) or water-based (woodcut, linocut).
Screen printing or lithography inks: acrylic, water-based or special pigments.'
WHERE field_key = 'tipo_tintas';
`,
};
