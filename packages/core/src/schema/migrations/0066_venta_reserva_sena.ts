import type { Migration } from "./0001_init.js";

export const migration0066VentaReservaSena: Migration = {
  name: "0066_venta_reserva_sena",
  sql: `
ALTER TABLE venta ADD COLUMN sena_monto REAL;
ALTER TABLE venta ADD COLUMN sena_moneda TEXT;

INSERT INTO texto_ayuda (field_key, texto_es, texto_en) VALUES
  ('sena_monto', 'Monto entregado como señal de compromiso para mantener la reserva. Solo aplica a reservas, no a ventas ni donaciones.', 'Amount given as a commitment deposit to hold the reservation. Only applies to reservations, not sales or donations.');
`,
};
