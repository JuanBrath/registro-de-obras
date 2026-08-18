import type { Migration } from "./0001_init.js";

// SQLite no permite ALTER de un CHECK existente: hay que reconstruir la
// tabla. Se preservan todas las columnas y datos tal cual; el unico cambio
// de esquema es que "tipo" ahora tambien acepta 'donacion'.
export const migration0017VentaDonacion: Migration = {
  name: "0017_venta_donacion",
  sql: `
CREATE TABLE venta_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  obra_id INTEGER NOT NULL REFERENCES obra(id) ON DELETE RESTRICT,
  ejemplar_id INTEGER REFERENCES ejemplar(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL DEFAULT 'venta' CHECK (tipo IN ('venta', 'reserva', 'donacion')),
  comprador_nombre TEXT NOT NULL,
  comprador_contacto TEXT,
  comprador_email TEXT,
  comprador_telefono TEXT,
  fecha_venta TEXT NOT NULL,
  lugar_venta TEXT,
  valor_venta REAL NOT NULL,
  moneda TEXT NOT NULL DEFAULT 'ARS' CHECK (moneda IN ('ARS', 'USD', 'EUR')),
  aplica_comision INTEGER NOT NULL DEFAULT 0,
  porcentaje_comision REAL,
  monto_comision REAL,
  monto_neto_artista REAL,
  numero_certificado INTEGER UNIQUE,
  ruta_certificado_pdf TEXT,
  fecha_registro TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO venta_new (id, obra_id, ejemplar_id, tipo, comprador_nombre, comprador_contacto, comprador_email, comprador_telefono, fecha_venta, lugar_venta, valor_venta, moneda, aplica_comision, porcentaje_comision, monto_comision, monto_neto_artista, numero_certificado, ruta_certificado_pdf, fecha_registro)
SELECT id, obra_id, ejemplar_id, tipo, comprador_nombre, comprador_contacto, comprador_email, comprador_telefono, fecha_venta, lugar_venta, valor_venta, moneda, aplica_comision, porcentaje_comision, monto_comision, monto_neto_artista, numero_certificado, ruta_certificado_pdf, fecha_registro
FROM venta;

DROP TABLE venta;
ALTER TABLE venta_new RENAME TO venta;
CREATE INDEX idx_venta_obra ON venta(obra_id);

INSERT INTO texto_ayuda (field_key, texto_es, texto_en) VALUES
  ('prueba_artista_info', 'Las pruebas de artista (PA) no tienen valor comercial de mercado: no se venden. Pueden donarse.', 'Artist proofs (AP) have no commercial market value: they are not sold. They can be donated.');
`,
};
