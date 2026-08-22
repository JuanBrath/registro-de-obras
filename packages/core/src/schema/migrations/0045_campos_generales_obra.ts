import type { Migration } from "./0001_init.js";

export const migration0045CamposGeneralesObra: Migration = {
  name: "0045_campos_generales_obra",
  sql: `
ALTER TABLE obra ADD COLUMN codigo_inventario TEXT;
ALTER TABLE obra ADD COLUMN subtitulo TEXT;
ALTER TABLE obra ADD COLUMN anio_periodo TEXT;
ALTER TABLE obra ADD COLUMN regimen_ingreso TEXT;
ALTER TABLE obra ADD COLUMN historial_procedencia_exhibiciones TEXT;

ALTER TABLE artista ADD COLUMN nacionalidad TEXT;
ALTER TABLE artista ADD COLUMN fecha_fallecimiento TEXT;

ALTER TABLE ejemplar ADD COLUMN coa_numero TEXT;
ALTER TABLE ejemplar ADD COLUMN coa_emisor TEXT;
ALTER TABLE ejemplar ADD COLUMN coa_fecha TEXT;
ALTER TABLE ejemplar ADD COLUMN valor_seguro REAL;
ALTER TABLE ejemplar ADD COLUMN moneda_seguro TEXT;
ALTER TABLE ejemplar ADD COLUMN vidrio_proteccion_frontal TEXT;
ALTER TABLE ejemplar ADD COLUMN sistema_cuelgue TEXT;

ALTER TABLE venta ADD COLUMN iva_porcentaje REAL;
ALTER TABLE venta ADD COLUMN iva_monto REAL;

INSERT INTO texto_ayuda (field_key, texto_es, texto_en) VALUES
  ('codigo_inventario', 'Identificador unico interno de la obra (SKU), util para inventario y busqueda rapida.', 'Unique internal identifier for the artwork (SKU), useful for inventory and quick lookup.'),
  ('subtitulo', 'Titulos alternativos o subtitulos de la obra, si los tiene.', 'Alternative titles or subtitles for the artwork, if any.'),
  ('anio_periodo', 'Año exacto o rango temporal de creacion (ej. 2024-2025).', 'Exact year or date range of creation (e.g. 2024-2025).'),
  ('regimen_ingreso', 'Como ingreso la obra a la galeria: consignacion directa de taller, deposito de coleccion privada o compra en firme.', 'How the artwork entered the gallery: direct consignment from the studio, deposit from a private collection, or outright purchase.'),
  ('historial_procedencia_exhibiciones', 'Muestras individuales, ferias o galerias donde haya estado expuesta previamente esta obra.', 'Solo exhibitions, fairs or galleries where this artwork has been previously shown.'),
  ('coa_numero', 'Numero del Certificado de Autenticidad (COA) emitido para esta copia, independiente del numero que se genera automaticamente al registrar una venta.', 'Number of the Certificate of Authenticity (COA) issued for this copy, independent of the number automatically generated when a sale is registered.'),
  ('coa_emisor', 'Quien emite el Certificado de Autenticidad (ej. el artista, la galeria, un perito).', 'Who issues the Certificate of Authenticity (e.g. the artist, the gallery, an appraiser).'),
  ('coa_fecha', 'Fecha de emision del Certificado de Autenticidad.', 'Date the Certificate of Authenticity was issued.'),
  ('valor_seguro', 'Valor declarado para la cobertura de seguro de esta copia (clavo a clavo / nail-to-nail).', 'Declared value for insurance coverage of this copy (nail-to-nail).'),
  ('vidrio_proteccion_frontal', 'Proteccion frontal del marco: vidrio comun, acrilico de conservacion o vidrio museo antirreflejo con filtro UV.', 'Frame''s front protection: common glass, conservation acrylic, or anti-reflective museum glass with UV filter.'),
  ('sistema_cuelgue', 'Sistema de cuelgue de esta copia: hembrillas, cables de acero, pletinas de fijacion directa o barra de suspension para obras de gran peso.', 'Hanging system for this copy: D-rings, steel cables, direct-fixing plates, or a suspension bar for heavy pieces.'),
  ('iva_porcentaje', 'Porcentaje de IVA aplicado a esta venta.', 'VAT percentage applied to this sale.');

UPDATE texto_ayuda SET
  texto_es = 'Tipo de marco o sistema de montaje de esta copia (ej. caja americana/flotante, moldura clasica, marco vitrina con distanciamiento si la textura sobresale; o soporte de montaje libre de acido, Dibond, passepartout de conservacion cuando se trata de una impresion). Aplica cuando la copia se entrega enmarcada.',
  texto_en = 'Type of frame or mounting system for this copy (e.g. floater/American box frame, classic moulding, deep box frame with spacer if the texture protrudes; or acid-free mounting board, Dibond, conservation matting for a print). Applies when the copy is delivered framed.'
WHERE field_key = 'tipo_enmarcado';
`,
};
