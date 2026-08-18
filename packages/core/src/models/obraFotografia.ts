export type SubtipoFotografia = "Analogica" | "Digital" | "Sintografia";

export interface DatosExif {
  [key: string]: string | number | undefined;
}

export interface ObraFotografia {
  obraId: number;
  subtipoFotografia: SubtipoFotografia;
  fechaCaptura: string | null;
  anioToma: number | null;
  fechaEdicion: string | null;
  softwareEdicion: string | null;
  /** Solo se completa cuando subtipoFotografia = 'Digital'. */
  datosExif: DatosExif | null;
  /** Tamano de la imagen impresa, en milimetros (ej. "300 x 450 mm"). */
  dimensiones: string | null;
  /** Tecnica utilizada (ej. "toma directa", "intervenida"). */
  tecnica: string | null;
}

export interface NuevaObraFotografia {
  subtipoFotografia: SubtipoFotografia;
  fechaCaptura?: string | null;
  anioToma?: number | null;
  fechaEdicion?: string | null;
  softwareEdicion?: string | null;
  datosExif?: DatosExif | null;
  dimensiones?: string | null;
  tecnica?: string | null;
  esSeriada: boolean;
}
