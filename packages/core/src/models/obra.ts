export type CategoriaObra =
  | "Fotografia"
  | "Pintura"
  | "Escultura"
  | "ObraGrafica"
  | "Dibujo"
  | "TextilCeramica"
  | "NuevosMedios";
export type EstadoObra =
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

export type RegimenIngreso = "ConsignacionTaller" | "DepositoColeccionPrivada" | "CompraFirmeGaleria";

export interface Obra {
  id: number;
  titulo: string;
  categoriaObra: CategoriaObra;
  artistaId: number;
  miniaturaPath: string | null;
  imagenAltaResolucionPath: string | null;
  estado: EstadoObra;
  ubicacionFisicaActual: string | null;
  esSeriada: boolean;
  codigoInventario: string | null;
  subtitulo: string | null;
  anioPeriodo: string | null;
  regimenIngreso: RegimenIngreso | null;
  historialProcedenciaExhibiciones: string | null;
  fechaAltaSistema: string;
}

export interface NuevaObraBase {
  titulo: string;
  artistaId: number;
  ubicacionFisicaActual?: string | null;
  codigoInventario?: string | null;
  subtitulo?: string | null;
  anioPeriodo?: string | null;
  regimenIngreso?: RegimenIngreso | null;
  historialProcedenciaExhibiciones?: string | null;
}
