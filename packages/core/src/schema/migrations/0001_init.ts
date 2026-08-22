import { migration0002ArtistaPerfil } from "./0002_artista_perfil.js";
import { migration0003EjemplarDetalle } from "./0003_ejemplar_detalle.js";
import { migration0004ArtistaNumero } from "./0004_artista_numero.js";
import { migration0005ArtistaContador } from "./0005_artista_contador.js";
import { migration0006ArtistaContacto } from "./0006_artista_contacto.js";
import { migration0007VentaComprador } from "./0007_venta_comprador.js";
import { migration0008ArtistaFoto } from "./0008_artista_foto.js";
import { migration0009ObraTags } from "./0009_obra_tags.js";
import { migration0010Etiqueta } from "./0010_etiqueta.js";
import { migration0011VentaTipo } from "./0011_venta_tipo.js";
import { migration0012VentaMoneda } from "./0012_venta_moneda.js";
import { migration0013TextoAyudaComision } from "./0013_texto_ayuda_comision.js";
import { migration0014ObraFotografiaDimensiones } from "./0014_obra_fotografia_dimensiones.js";
import { migration0015EjemplarUnico } from "./0015_ejemplar_unico.js";
import { migration0016EjemplarEnmarcado } from "./0016_ejemplar_enmarcado.js";
import { migration0017VentaDonacion } from "./0017_venta_donacion.js";
import { migration0018TextoAyudaVentasFechas } from "./0018_texto_ayuda_ventas_fechas.js";
import { migration0019TextoAyudaPerfilPersonal } from "./0019_texto_ayuda_perfil_personal.js";
import { migration0020ArtistaRedesSociales } from "./0020_artista_redes_sociales.js";
import { migration0021EjemplarNotas } from "./0021_ejemplar_notas.js";
import { migration0022ObraFotografiaTecnica } from "./0022_obra_fotografia_tecnica.js";
import { migration0023TextoAyudaUbicacionFisicaArchivo } from "./0023_texto_ayuda_ubicacion_fisica_archivo.js";
import { migration0024TextoAyudaTecnicaFotografia } from "./0024_texto_ayuda_tecnica_fotografia.js";
import { migration0025ObraMarcada } from "./0025_obra_marcada.js";
import { migration0026EjemplarTipoImpresion } from "./0026_ejemplar_tipo_impresion.js";
import { migration0027EstadoAmpliado } from "./0027_estado_ampliado.js";
import { migration0028TextoAyudaEstadoEjemplar } from "./0028_texto_ayuda_estado_ejemplar.js";
import { migration0029EstadoEnStock } from "./0029_estado_en_stock.js";
import { migration0030GaleriaPerfil } from "./0030_galeria_perfil.js";
import { migration0031Cliente } from "./0031_cliente.js";
import { migration0032EjemplarPrecioVenta } from "./0032_ejemplar_precio_venta.js";
import { migration0033EjemplarMonedaVenta } from "./0033_ejemplar_moneda_venta.js";
import { migration0034Logos } from "./0034_logos.js";
import { migration0035Cuit } from "./0035_cuit.js";
import { migration0036EjemplarTintasFirmaSello } from "./0036_ejemplar_tintas_firma_sello.js";
import { migration0037ObraFotografiaEscalaPorTamanos } from "./0037_obra_fotografia_escala_por_tamanos.js";
import { migration0038ObraFotografiaSubtipoAmpliado } from "./0038_obra_fotografia_subtipo_ampliado.js";
import { migration0039CategoriasObraDetalle } from "./0039_categorias_obra_detalle.js";
import { migration0040TextoAyudaCategoriasSubtipos } from "./0040_texto_ayuda_categorias_subtipos.js";
import { migration0041EjemplarFechaLimite } from "./0041_ejemplar_fecha_limite.js";
import { migration0042ClientePerfil } from "./0042_cliente_perfil.js";
import { migration0043ArtistaPerfilExtendido } from "./0043_artista_perfil_extendido.js";
import { migration0044TextoAyudaNumeroArtista } from "./0044_texto_ayuda_numero_artista.js";
import { migration0045CamposGeneralesObra } from "./0045_campos_generales_obra.js";
import { migration0046ObraDetallePinturaRiguroso } from "./0046_obra_detalle_pintura_riguroso.js";

export interface Migration {
  name: string;
  sql: string;
}

export const migration0001Init: Migration = {
  name: "0001_init",
  sql: `
CREATE TABLE artista (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre_completo TEXT NOT NULL,
  es_propio INTEGER NOT NULL DEFAULT 0,
  contacto TEXT,
  notas TEXT,
  fecha_alta_sistema TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE obra (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo TEXT NOT NULL,
  categoria_obra TEXT NOT NULL CHECK (categoria_obra IN ('Fotografia','Pintura','Escultura')),
  artista_id INTEGER NOT NULL REFERENCES artista(id) ON DELETE RESTRICT,
  miniatura_path TEXT,
  imagen_alta_resolucion_path TEXT,
  estado TEXT NOT NULL DEFAULT 'disponible' CHECK (estado IN ('disponible','vendida','reservada','exhibicion')),
  ubicacion_fisica_actual TEXT,
  es_seriada INTEGER NOT NULL DEFAULT 0,
  fecha_alta_sistema TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_obra_artista ON obra(artista_id);

CREATE TABLE obra_fotografia (
  obra_id INTEGER PRIMARY KEY REFERENCES obra(id) ON DELETE CASCADE,
  subtipo_fotografia TEXT NOT NULL CHECK (subtipo_fotografia IN ('Analogica','Digital','Sintografia')),
  fecha_captura TEXT,
  anio_toma INTEGER,
  fecha_edicion TEXT,
  software_edicion TEXT,
  datos_exif TEXT
);

CREATE TABLE obra_pintura (
  obra_id INTEGER PRIMARY KEY REFERENCES obra(id) ON DELETE CASCADE,
  subtipo_pintura TEXT NOT NULL CHECK (subtipo_pintura IN ('Original','Serigrafia','Litografia','Grabado')),
  tecnica TEXT,
  dimensiones TEXT,
  peso TEXT,
  fecha_creacion TEXT
);

CREATE TABLE obra_escultura (
  obra_id INTEGER PRIMARY KEY REFERENCES obra(id) ON DELETE CASCADE,
  tecnica TEXT,
  dimensiones TEXT,
  peso TEXT,
  fecha_creacion TEXT
);

CREATE TABLE venta (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  obra_id INTEGER NOT NULL REFERENCES obra(id) ON DELETE RESTRICT,
  ejemplar_id INTEGER REFERENCES ejemplar(id) ON DELETE SET NULL,
  comprador_nombre TEXT NOT NULL,
  comprador_contacto TEXT,
  fecha_venta TEXT NOT NULL,
  lugar_venta TEXT,
  valor_venta REAL NOT NULL,
  aplica_comision INTEGER NOT NULL DEFAULT 0,
  porcentaje_comision REAL,
  monto_comision REAL,
  monto_neto_artista REAL,
  numero_certificado INTEGER UNIQUE,
  ruta_certificado_pdf TEXT,
  fecha_registro TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_venta_obra ON venta(obra_id);

CREATE TABLE ejemplar (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  obra_id INTEGER NOT NULL REFERENCES obra(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('edicion','prueba_artista')),
  indice INTEGER NOT NULL,
  total_ediciones INTEGER NOT NULL,
  numero TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'disponible' CHECK (estado IN ('disponible','vendida','reservada','exhibicion')),
  venta_id INTEGER REFERENCES venta(id) ON DELETE SET NULL,
  UNIQUE (obra_id, tipo, indice)
);
CREATE INDEX idx_ejemplar_obra ON ejemplar(obra_id);

CREATE TABLE historial_evento (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  obra_id INTEGER NOT NULL REFERENCES obra(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('creacion','edicion','cambio_estado','cambio_ubicacion','venta')),
  fecha TEXT NOT NULL DEFAULT (datetime('now')),
  descripcion TEXT NOT NULL,
  usuario_responsable TEXT
);
CREATE INDEX idx_historial_obra ON historial_evento(obra_id);

CREATE TABLE texto_ayuda (
  field_key TEXT PRIMARY KEY,
  texto_es TEXT NOT NULL,
  texto_en TEXT
);

CREATE TABLE certificado_contador (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  siguiente_numero INTEGER NOT NULL DEFAULT 1
);
INSERT INTO certificado_contador (id, siguiente_numero) VALUES (1, 1);

INSERT INTO texto_ayuda (field_key, texto_es, texto_en) VALUES
  ('subtipo_fotografia', 'Analogica: capturada en pelicula. Digital: capturada con sensor digital, se completan los datos EXIF automaticamente. Sintografia: generada integramente por inteligencia artificial, sin EXIF ni datos de herramienta.', 'Analog: captured on film. Digital: captured with a digital sensor, EXIF data is filled in automatically. Sintography: entirely AI-generated, no EXIF or tool data.'),
  ('es_seriada', 'Marca si la obra tiene multiples copias numeradas (una edicion). Si se activa, se generan automaticamente los ejemplares 1/N..N/N mas las pruebas de artista (PA).', 'Mark if the piece has multiple numbered copies (an edition). If enabled, numbered copies 1/N..N/N plus artist proofs (PA) are generated automatically.'),
  ('pruebas_artista', 'Cantidad de pruebas de artista = redondeo hacia arriba del 10% del total de ediciones. Ejemplo: 7 obras -> 1 PA; 25 obras -> 3 PA.', 'Artist proof count = round up of 10% of the total edition size. Example: 7 pieces -> 1 AP; 25 pieces -> 3 AP.'),
  ('datos_exif', 'Metadatos tecnicos de la captura digital (camara, lente, exposicion, etc). Se completan automaticamente al leer el archivo o via el plugin de Lightroom. Solo aplica a fotografia Digital.', 'Technical capture metadata (camera, lens, exposure, etc). Filled in automatically when reading the file or via the Lightroom plugin. Only applies to Digital photography.'),
  ('subtipo_pintura', 'Original: pieza unica, nunca seriada. Serigrafia, Litografia y Grabado son tecnicas de reproduccion: siempre se consideran seriadas.', 'Original: unique piece, never an edition. Serigraph, Lithograph and Print are reproduction techniques: always treated as editions.'),
  ('numero_ejemplar', 'Identificador de la copia dentro de la edicion, con formato "numero/total" (ej. 3/10) o "PA numero/total" para pruebas de artista (ej. PA 1/2).', 'Identifier of the copy within the edition, formatted as "number/total" (e.g. 3/10) or "AP number/total" for artist proofs (e.g. AP 1/2).'),
  ('aplica_comision', 'Solo se calcula comision cuando la venta se registra en el Registro de Galeria. En el Registro Personal el artista recibe el valor total.', 'Commission is only calculated when the sale is registered in the Gallery Registry. In the Personal Registry the artist receives the full value.'),
  ('porcentaje_comision', 'Porcentaje que retiene la galeria sobre el valor de venta. El monto neto para el artista se calcula automaticamente.', 'Percentage the gallery retains from the sale value. The net amount for the artist is calculated automatically.'),
  ('lugar_venta', 'Ciudad, feria, galeria o plataforma donde se concreto la venta.', 'City, fair, gallery or platform where the sale took place.'),
  ('tecnica', 'Materiales y procedimiento utilizados para crear la obra (ej. oleo sobre tela, bronce fundido).', 'Materials and process used to create the piece (e.g. oil on canvas, cast bronze).');
`,
};

export const ALL_MIGRATIONS: Migration[] = [
  migration0001Init,
  migration0002ArtistaPerfil,
  migration0003EjemplarDetalle,
  migration0004ArtistaNumero,
  migration0005ArtistaContador,
  migration0006ArtistaContacto,
  migration0007VentaComprador,
  migration0008ArtistaFoto,
  migration0009ObraTags,
  migration0010Etiqueta,
  migration0011VentaTipo,
  migration0012VentaMoneda,
  migration0013TextoAyudaComision,
  migration0014ObraFotografiaDimensiones,
  migration0015EjemplarUnico,
  migration0016EjemplarEnmarcado,
  migration0017VentaDonacion,
  migration0018TextoAyudaVentasFechas,
  migration0019TextoAyudaPerfilPersonal,
  migration0020ArtistaRedesSociales,
  migration0021EjemplarNotas,
  migration0022ObraFotografiaTecnica,
  migration0023TextoAyudaUbicacionFisicaArchivo,
  migration0024TextoAyudaTecnicaFotografia,
  migration0025ObraMarcada,
  migration0026EjemplarTipoImpresion,
  migration0027EstadoAmpliado,
  migration0028TextoAyudaEstadoEjemplar,
  migration0029EstadoEnStock,
  migration0030GaleriaPerfil,
  migration0031Cliente,
  migration0032EjemplarPrecioVenta,
  migration0033EjemplarMonedaVenta,
  migration0034Logos,
  migration0035Cuit,
  migration0036EjemplarTintasFirmaSello,
  migration0037ObraFotografiaEscalaPorTamanos,
  migration0038ObraFotografiaSubtipoAmpliado,
  migration0039CategoriasObraDetalle,
  migration0040TextoAyudaCategoriasSubtipos,
  migration0041EjemplarFechaLimite,
  migration0042ClientePerfil,
  migration0043ArtistaPerfilExtendido,
  migration0044TextoAyudaNumeroArtista,
  migration0045CamposGeneralesObra,
  migration0046ObraDetallePinturaRiguroso,
];
