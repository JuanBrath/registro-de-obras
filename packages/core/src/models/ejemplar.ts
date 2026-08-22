export type TipoEjemplar = "edicion" | "prueba_artista";
export type EstadoEjemplar =
  | "disponible"
  | "en_stock"
  | "vendida"
  | "reservada"
  | "exhibicion"
  | "consignacion"
  | "destruida"
  | "descartada"
  | "en_produccion"
  | "coleccion_autor";

export interface Ejemplar {
  id: number;
  obraId: number;
  tipo: TipoEjemplar;
  indice: number;
  totalEdiciones: number;
  numero: string;
  estado: EstadoEjemplar;
  ventaId: number | null;
  fechaImpresion: string | null;
  /** Solo aplica a fotografia digital: tipo de impresion utilizada (ej. giclee, cromogenica). */
  tipoImpresion: string | null;
  soporteImpresion: string | null;
  /** Solo aplica a fotografia digital: taller donde se realizo la impresion. */
  tallerImpresion: string | null;
  ubicacionActual: string | null;
  /** Tamano de esta copia impresa, en milimetros (ej. "300 x 450 mm"). */
  dimensiones: string | null;
  tipoEnmarcado: string | null;
  /** Tamano final de la pieza ya enmarcada, en milimetros. */
  tamanoFinalEnmarcado: string | null;
  notas: string | null;
  /** Valor al que se ofrece esta copia (referencia para presupuestos, no es venta.valor_venta). */
  precioVenta: number | null;
  monedaVenta: string | null;
  /** Solo aplica a fotografia digital/sintografia: tipo de tintas utilizadas en la impresion. */
  tipoTintas: string | null;
  ubicacionFirma: string | null;
  selloSecoHolograma: string | null;
  /** Solo aplica a los estados Exhibicion/Consignacion: hasta cuando queda la pieza en ese estado. */
  fechaLimite: string | null;
  /** Certificado de Autenticidad cargado manualmente, independiente del numero que se asigna al vender. */
  coaNumero: string | null;
  coaEmisor: string | null;
  coaFecha: string | null;
  valorSeguro: number | null;
  monedaSeguro: string | null;
  vidrioProteccionFrontal: string | null;
  sistemaCuelgue: string | null;
}
