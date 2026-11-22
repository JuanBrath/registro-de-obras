/**
 * Estados de una copia en los que se puede ofrecer o vender: disponible, en stock, en exhibición,
 * en consignación y en producción. Quedan afuera vendida, reservada, descartada, destruida y colección del autor.
 */
export const ESTADOS_OFRECIBLES: ReadonlySet<string> = new Set([
  "disponible",
  "en_stock",
  "exhibicion",
  "consignacion",
  "en_produccion",
]);
