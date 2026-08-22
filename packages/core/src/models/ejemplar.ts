export type TipoEjemplar = "edicion" | "prueba_artista";
export type TipoFirma = "AManoLapiz" | "Monograma" | "EnPlancha" | "SelloTestamentarioTaller";
export type ClasificacionPruebaEspecial = "PE" | "BAT" | "HC" | "PI" | "FC";
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
  coaSistemaSeguridad: string | null;
  informeConservacion: string | null;
  /** Medida de la hoja/soporte completo, distinta de "dimensiones" (mancha de imagen). */
  dimensionesSoporteCompleto: string | null;
  peso: string | null;
  /** Solo aplica a ObraGrafica: metodo por el cual esta firmada esta copia (distinto de ubicacionFirma, que es donde). */
  tipoFirma: TipoFirma | null;
  /** Solo aplica a ObraGrafica/Escultura, tipicamente sobre pruebas de artista: P/E, B.A.T., H/C, P/I o F/C. */
  clasificacionPruebaEspecial: ClasificacionPruebaEspecial | null;
  /** Solo aplica a Escultura: puntos de agarre, fragilidad y advertencias de transporte de esta copia. */
  instruccionesManipulacion: string | null;
  /** Solo aplica a Dibujo: cintas/bisagras usadas para montar esta copia. */
  adhesivosMontaje: string | null;
  /** Solo aplica a Dibujo: textos manuscritos, notas de estudio, bocetos al verso o etiquetas de esta copia. */
  inscripcionesAnotaciones: string | null;
}
