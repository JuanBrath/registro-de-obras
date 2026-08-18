export type SubtipoPintura = "Original" | "Serigrafia" | "Litografia" | "Grabado";

export interface ObraPintura {
  obraId: number;
  subtipoPintura: SubtipoPintura;
  tecnica: string | null;
  dimensiones: string | null;
  peso: string | null;
  fechaCreacion: string | null;
}

export interface NuevaObraPintura {
  subtipoPintura: SubtipoPintura;
  tecnica?: string | null;
  dimensiones?: string | null;
  peso?: string | null;
  fechaCreacion?: string | null;
}
