import type { Migration } from "./0001_init.js";

export const migration0028TextoAyudaEstadoEjemplar: Migration = {
  name: "0028_texto_ayuda_estado_ejemplar",
  sql: `
UPDATE texto_ayuda
SET texto_es = 'Consignacion: la pieza esta en manos de un tercero (galeria, feria, deposito) para su eventual venta, pero todavia no se vendio.
Destruida: la copia fue destruida y ya no existe fisicamente.
Descartada: se descarto por un defecto de impresion u otro motivo, sin llegar a ser una pieza valida.
En produccion: todavia se esta imprimiendo o produciendo, no esta terminada.
Coleccion del autor: quedo en poder del propio artista, no esta disponible para la venta.',
    texto_en = 'Consignment: the piece is with a third party (gallery, fair, storage) for eventual sale, but has not been sold yet.
Destroyed: the copy was destroyed and no longer physically exists.
Discarded: it was discarded due to a printing defect or other reason, without becoming a valid piece.
In production: it is still being printed or produced, not finished.
Artist''s collection: it remains with the artist, not available for sale.'
WHERE field_key = 'estado_ejemplar';
`,
};
