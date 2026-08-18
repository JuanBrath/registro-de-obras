export type CategoriaObra = "Fotografia" | "Pintura" | "Escultura";
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
  fechaAltaSistema: string;
}

export interface NuevaObraBase {
  titulo: string;
  artistaId: number;
  ubicacionFisicaActual?: string | null;
}
