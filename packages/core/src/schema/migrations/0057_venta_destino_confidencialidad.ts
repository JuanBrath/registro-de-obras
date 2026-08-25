import type { Migration } from "./0001_init.js";

export const migration0057VentaDestinoConfidencialidad: Migration = {
  name: "0057_venta_destino_confidencialidad",
  sql: `
ALTER TABLE venta ADD COLUMN direccion_entrega TEXT;
ALTER TABLE venta ADD COLUMN ciudad_entrega TEXT;
ALTER TABLE venta ADD COLUMN pais_entrega TEXT;
ALTER TABLE venta ADD COLUMN confidencial INTEGER NOT NULL DEFAULT 0;
ALTER TABLE venta ADD COLUMN clausula_reventa TEXT;

INSERT INTO texto_ayuda (field_key, texto_es, texto_en) VALUES
  ('direccion_entrega_venta', 'Direccion donde se entrega la obra en esta venta puntual. Puede ser distinta del domicilio registrado del cliente (por ejemplo, envio a un deposito, una galeria o un tercero). Se autocompleta con el domicilio del cliente al seleccionarlo, pero se puede editar.', 'Address where the artwork is delivered for this specific sale. It can differ from the client''s registered address (for example, shipping to a storage facility, a gallery, or a third party). It is auto-filled from the client''s address when selected, but can be edited.'),
  ('confidencial_venta', 'Marca esta venta como confidencial: el precio y/o la identidad del comprador no deben divulgarse publicamente. Es solo una marca informativa, no restringe el acceso a los datos dentro del sistema.', 'Marks this sale as confidential: the price and/or the buyer''s identity should not be disclosed publicly. This is only an informational flag, it does not restrict access to the data within the system.'),
  ('clausula_reventa', 'Texto libre de una clausula de reventa o primera opcion de compra pactada en esta venta (por ejemplo, que el comprador ofrezca primero la obra a la galeria o al artista antes de revenderla). Se carga a mano, sin logica automatica por jurisdiccion.', 'Free text of a resale or right-of-first-refusal clause agreed on in this sale (for example, the buyer offering the artwork back to the gallery or artist before reselling it). Entered manually, with no automatic rules by jurisdiction.');
`,
};
