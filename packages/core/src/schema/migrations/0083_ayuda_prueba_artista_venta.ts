import type { Migration } from "./0001_init.js";

export const migration0083AyudaPruebaArtistaVenta: Migration = {
  name: "0083_ayuda_prueba_artista_venta",
  sql: `
UPDATE texto_ayuda SET
  texto_es = 'Las pruebas de artista (PA) quedan fuera de la edición comercial: por convención no se venden, sino que se conservan, se donan o se usan para difusión. De todos modos, el programa te deja registrar su venta si decidís venderlas.',
  texto_en = 'Artist proofs (AP) sit outside the commercial edition: by convention they are not sold, but kept, donated or used for promotion. The program still lets you record a sale if you decide to sell them.'
WHERE field_key = 'prueba_artista_info';
`,
};
