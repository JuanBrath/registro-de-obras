export interface ObraEscultura {
  obraId: number;
  tecnica: string | null;
  dimensiones: string | null;
  peso: string | null;
  fechaCreacion: string | null;
}

export interface NuevaObraEscultura {
  tecnica?: string | null;
  dimensiones?: string | null;
  peso?: string | null;
  fechaCreacion?: string | null;
  esSeriada: boolean;
}
