import type { Migration } from "./0001_init.js";

export const migration0056VentaDesgloseFinanciero: Migration = {
  name: "0056_venta_desglose_financiero",
  sql: `
ALTER TABLE venta ADD COLUMN precio_lista REAL;
ALTER TABLE venta ADD COLUMN motivo_descuento TEXT;
ALTER TABLE venta ADD COLUMN tipo_cambio REAL;
ALTER TABLE venta ADD COLUMN retenciones_monto REAL;
ALTER TABLE venta ADD COLUMN aranceles_monto REAL;
ALTER TABLE venta ADD COLUMN costo_enmarcado REAL;
ALTER TABLE venta ADD COLUMN costo_peana REAL;
ALTER TABLE venta ADD COLUMN costo_embalaje REAL;
ALTER TABLE venta ADD COLUMN costo_transporte REAL;
ALTER TABLE venta ADD COLUMN costo_seguro REAL;
ALTER TABLE venta ADD COLUMN estado_pago TEXT CHECK (estado_pago IS NULL OR estado_pago IN ('pagado','pendiente','en_cuotas'));
ALTER TABLE venta ADD COLUMN metodo_pago TEXT;
ALTER TABLE venta ADD COLUMN fecha_cobro TEXT;
ALTER TABLE venta ADD COLUMN estado_liquidacion TEXT CHECK (estado_liquidacion IS NULL OR estado_liquidacion IN ('pendiente','liquidado','comprobante_emitido'));
ALTER TABLE venta ADD COLUMN droit_suite_aplica INTEGER NOT NULL DEFAULT 0;
ALTER TABLE venta ADD COLUMN droit_suite_porcentaje REAL;
ALTER TABLE venta ADD COLUMN droit_suite_monto REAL;

INSERT INTO texto_ayuda (field_key, texto_es, texto_en) VALUES
  ('droit_suite', 'Derecho de participacion (resale royalty): un porcentaje de la reventa que le corresponde al artista o sus herederos. Cada pais tiene su propia legislacion (porcentaje, umbral minimo de venta, plazo tras el fallecimiento); aca se carga a mano, sin reglas automaticas por jurisdiccion.', 'Resale royalty right: a percentage of the resale that belongs to the artist or their heirs. Each country has its own legislation (percentage, minimum sale threshold, term after death); here it is entered manually, with no automatic rules by jurisdiction.'),
  ('costo_seguro_venta', 'Costo puntual de asegurar el envio de esta venta (distinto del valor de seguro de tasacion de la pieza, que se carga una sola vez en cada ejemplar).', 'One-off cost of insuring the shipment for this sale (different from the piece''s appraisal insurance value, which is set once per copy/edition).'),
  ('estado_liquidacion', 'Pendiente: todavia no se le pago al artista su parte. Liquidado: ya se le pago. Comprobante emitido: ademas de pagado, ya se emitio el comprobante correspondiente.', 'Pending: the artist''s share has not been paid yet. Settled: already paid. Receipt issued: paid and the corresponding receipt has already been issued.');
`,
};
