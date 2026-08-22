// Tabla compartida por las 6 categorias que no son Fotografia (que tiene su
// propia forma en obraFotografia.ts, con mucha logica propia ya construida:
// tintas, laboratorio, ubicacion archivo/negativo, escala por tamanos).

export type SubtipoPintura = "TecnicasTradicionales" | "TecnicasMixtas" | "Murales";
export type SubtipoObraGrafica = "GrabadoRelieve" | "GrabadoHueco" | "GrabadoPlanografico" | "Monotipos";
export type SubtipoEscultura = "TallaDirecta" | "FundicionMetal" | "EsculturaContemporanea";
export type SubtipoDibujo = "TecnicasSecas" | "TecnicasHumedas" | "EstudiosPreparatorios";
export type SubtipoTextilCeramica = "TapiceriaFibra" | "CeramicaEscultorica";
export type SubtipoNuevosMedios = "VideoartFilmes" | "InstalacionesSiteSpecific" | "ArteDigitalGenerativo";

export type SubtipoObraDetalle =
  | SubtipoPintura
  | SubtipoObraGrafica
  | SubtipoEscultura
  | SubtipoDibujo
  | SubtipoTextilCeramica
  | SubtipoNuevosMedios;

export interface ObraDetalle {
  obraId: number;
  subtipo: SubtipoObraDetalle | null;
  /** Solo aplica a Pintura/TecnicasTradicionales: Oleo, Acrilico o Temple. */
  tecnicaMaterial: string | null;
  /** Solo aplica a Pintura/TecnicasTradicionales: Lienzo, Lino, Tabla, Cobre o Aluminio. */
  soporte: string | null;
  tecnica: string | null;
  dimensiones: string | null;
  peso: string | null;
  fechaCreacion: string | null;
  /** Los siguientes campos solo se muestran en la UI para categoria Pintura. */
  materialesMixtura: string | null;
  tipoBastidor: string | null;
  imprimacionBase: string | null;
  profundidadRelieve: string | null;
  configuracionPanel: string | null;
  estabilidadCapas: string | null;
  barnizProteccion: string | null;
  sensibilidadAmbiental: string | null;
  estadoCantos: string | null;
}

export interface NuevaObraDetalle {
  subtipo?: SubtipoObraDetalle | null;
  tecnicaMaterial?: string | null;
  soporte?: string | null;
  tecnica?: string | null;
  dimensiones?: string | null;
  peso?: string | null;
  fechaCreacion?: string | null;
  materialesMixtura?: string | null;
  tipoBastidor?: string | null;
  imprimacionBase?: string | null;
  profundidadRelieve?: string | null;
  configuracionPanel?: string | null;
  estabilidadCapas?: string | null;
  barnizProteccion?: string | null;
  sensibilidadAmbiental?: string | null;
  estadoCantos?: string | null;
  esSeriada: boolean;
}
