export type TipoEventoHistorial = "creacion" | "edicion" | "cambio_estado" | "cambio_ubicacion" | "venta";

export interface HistorialEvento {
  id: number;
  obraId: number;
  tipo: TipoEventoHistorial;
  fecha: string;
  descripcion: string;
  usuarioResponsable: string | null;
}

export interface NuevoHistorialEvento {
  obraId: number;
  tipo: TipoEventoHistorial;
  descripcion: string;
  usuarioResponsable?: string | null;
}
