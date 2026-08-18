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
}
