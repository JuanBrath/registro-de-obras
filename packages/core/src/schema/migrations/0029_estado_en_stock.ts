import type { Migration } from "./0001_init.js";

// Mismo patron de reconstruccion de tabla que 0027 (SQLite no permite ALTER
// de un CHECK existente): se agrega 'en_stock' a los valores validos de
// estado en obra y ejemplar, distinguiendolo de 'disponible' (numero de
// serie libre pero todavia sin imprimir) de 'en_stock' (copia ya impresa,
// lista para la venta).
export const migration0029EstadoEnStock: Migration = {
  name: "0029_estado_en_stock",
  sql: `
CREATE TABLE obra_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo TEXT NOT NULL,
  categoria_obra TEXT NOT NULL CHECK (categoria_obra IN ('Fotografia','Pintura','Escultura')),
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
SELECT id, titulo, categoria_obra, artista_id, miniatura_path, imagen_alta_resolucion_path, estado, ubicacion_fisica_actual, es_seriada, fecha_alta_sistema, tags, marcada
FROM obra;

DROP TABLE obra;
ALTER TABLE obra_new RENAME TO obra;
CREATE INDEX idx_obra_artista ON obra(artista_id);

CREATE TABLE ejemplar_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  obra_id INTEGER NOT NULL REFERENCES obra(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('edicion','prueba_artista')),
  indice INTEGER NOT NULL,
  total_ediciones INTEGER NOT NULL,
  numero TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'disponible' CHECK (estado IN ('disponible','en_stock','vendida','reservada','exhibicion','consignacion','destruida','descartada','en_produccion','coleccion_autor')),
  venta_id INTEGER REFERENCES venta(id) ON DELETE SET NULL,
  fecha_impresion TEXT,
  soporte_impresion TEXT,
  ubicacion_actual TEXT,
  dimensiones TEXT,
  tipo_enmarcado TEXT,
  tamano_final_enmarcado TEXT,
  notas TEXT,
  tipo_impresion TEXT,
  taller_impresion TEXT,
  UNIQUE (obra_id, tipo, indice)
);

INSERT INTO ejemplar_new (id, obra_id, tipo, indice, total_ediciones, numero, estado, venta_id, fecha_impresion, soporte_impresion, ubicacion_actual, dimensiones, tipo_enmarcado, tamano_final_enmarcado, notas, tipo_impresion, taller_impresion)
SELECT id, obra_id, tipo, indice, total_ediciones, numero, estado, venta_id, fecha_impresion, soporte_impresion, ubicacion_actual, dimensiones, tipo_enmarcado, tamano_final_enmarcado, notas, tipo_impresion, taller_impresion
FROM ejemplar;

DROP TABLE ejemplar;
ALTER TABLE ejemplar_new RENAME TO ejemplar;
CREATE INDEX idx_ejemplar_obra ON ejemplar(obra_id);

UPDATE texto_ayuda
SET texto_es = 'Disponible: el numero de serie esta libre, pero esa copia todavia no se imprimio.
En stock: la copia ya esta impresa y lista para la venta.
En exhibicion: la copia esta expuesta en una muestra o exposicion.
Consignacion: la pieza esta en manos de un tercero (galeria, feria, deposito) para su eventual venta, pero todavia no se vendio.
Destruida: la copia fue destruida y ya no existe fisicamente.
Descartada: se descarto por un defecto de impresion u otro motivo, sin llegar a ser una pieza valida.
En produccion: todavia se esta imprimiendo o produciendo, no esta terminada.
Coleccion del autor: quedo en poder del propio artista, no esta disponible para la venta.',
    texto_en = 'Available: the series number is free, but that copy has not been printed yet.
In stock: the copy is already printed and ready for sale.
On display: the copy is on display in a show or exhibition.
Consignment: the piece is with a third party (gallery, fair, storage) for eventual sale, but has not been sold yet.
Destroyed: the copy was destroyed and no longer physically exists.
Discarded: it was discarded due to a printing defect or other reason, without becoming a valid piece.
In production: it is still being printed or produced, not finished.
Artist''s collection: it remains with the artist, not available for sale.'
WHERE field_key = 'estado_ejemplar';
`,
};
