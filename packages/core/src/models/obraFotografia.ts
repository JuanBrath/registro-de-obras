export type SubtipoFotografia =
  | "AnalogicaClasica"
  | "DigitalFineArt"
  | "ProcesosHistoricos"
  | "Fotolibros"
  | "Sintografia";

export type ClasificacionPositivado = "Vintage" | "Modern" | "Estate";
export type PiezaUnicaOMatriz = "PiezaUnica" | "DesdeInternegativo";
export type FlujoGenerativo = "TextToImage" | "ImageToImage" | "ControlNet";
export type SoporteSalida = "EstampaFisica" | "ActivoDigitalNativo";

export interface DatosExif {
  [key: string]: string | number | undefined;
}

export interface ObraFotografia {
  obraId: number;
  subtipoFotografia: SubtipoFotografia;
  fechaCaptura: string | null;
  anioToma: number | null;
  /** Solo el ano, no la fecha completa: la edicion (post-produccion) no requiere tanta precision. */
  anioEdicion: string | null;
  softwareEdicion: string | null;
  /** Solo se completa cuando subtipoFotografia = 'DigitalFineArt'. */
  datosExif: DatosExif | null;
  /** Datos de captura: no aplican a Sintografia (no hay camara real). */
  camara: string | null;
  iso: string | null;
  velocidadObturador: string | null;
  diafragma: string | null;
  distanciaFocal: string | null;
  /** Tecnica utilizada (ej. "toma directa", "intervenida"). */
  tecnica: string | null;
  /** Comun a todos los subtipos. */
  serieProyecto: string | null;
  /** Solo AnalogicaClasica. */
  clasificacionPositivado: ClasificacionPositivado | null;
  procesoQuimicoAnalogica: string | null;
  virajeConservacion: string | null;
  formatoNegativo: string | null;
  estadoNegativo: string | null;
  /** Solo DigitalFineArt. */
  formatoArchivoMaestro: string | null;
  espacioColor: string | null;
  condicionesCustodiaArchivo: string | null;
  /** Solo ProcesosHistoricos. */
  procesoQuimicoHistoricos: string | null;
  preparacionSoporte: string | null;
  metalesSales: string | null;
  piezaUnicaOMatriz: PiezaUnicaOMatriz | null;
  /** Solo Fotolibros. */
  estructuraObjeto: string | null;
  contenedorEstuche: string | null;
  incluyeCopiaColeccionista: boolean;
  detalleCopiaColeccionista: string | null;
  creditosEditoriales: string | null;
  isbn: string | null;
  colofon: string | null;
  /** Solo Sintografia. */
  motorIa: string | null;
  promptParametros: string | null;
  flujoGenerativo: FlujoGenerativo | null;
  intervencionPostproduccion: string | null;
  soporteSalida: SoporteSalida | null;
  declaracionDerechosIa: string | null;
}

export interface NuevaObraFotografia {
  subtipoFotografia: SubtipoFotografia;
  fechaCaptura?: string | null;
  anioToma?: number | null;
  anioEdicion?: string | null;
  softwareEdicion?: string | null;
  datosExif?: DatosExif | null;
  camara?: string | null;
  iso?: string | null;
  velocidadObturador?: string | null;
  diafragma?: string | null;
  distanciaFocal?: string | null;
  tecnica?: string | null;
  esSeriada: boolean;
  serieProyecto?: string | null;
  clasificacionPositivado?: ClasificacionPositivado | null;
  procesoQuimicoAnalogica?: string | null;
  virajeConservacion?: string | null;
  formatoNegativo?: string | null;
  estadoNegativo?: string | null;
  formatoArchivoMaestro?: string | null;
  espacioColor?: string | null;
  condicionesCustodiaArchivo?: string | null;
  procesoQuimicoHistoricos?: string | null;
  preparacionSoporte?: string | null;
  metalesSales?: string | null;
  piezaUnicaOMatriz?: PiezaUnicaOMatriz | null;
  estructuraObjeto?: string | null;
  contenedorEstuche?: string | null;
  incluyeCopiaColeccionista?: boolean;
  detalleCopiaColeccionista?: string | null;
  creditosEditoriales?: string | null;
  isbn?: string | null;
  colofon?: string | null;
  motorIa?: string | null;
  promptParametros?: string | null;
  flujoGenerativo?: FlujoGenerativo | null;
  intervencionPostproduccion?: string | null;
  soporteSalida?: SoporteSalida | null;
  declaracionDerechosIa?: string | null;
}
