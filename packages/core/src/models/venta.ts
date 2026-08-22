export type TipoVenta = "venta" | "reserva" | "donacion";

export type Moneda = "ARS" | "USD" | "EUR";

export interface Venta {
  id: number;
  obraId: number;
  ejemplarId: number | null;
  tipo: TipoVenta;
  compradorNombre: string;
  compradorContacto: string | null;
  compradorEmail: string | null;
  compradorTelefono: string | null;
  fechaVenta: string;
  lugarVenta: string | null;
  valorVenta: number;
  moneda: Moneda;
  aplicaComision: boolean;
  porcentajeComision: number | null;
  montoComision: number | null;
  montoNetoArtista: number | null;
  numeroCertificado: number | null;
  rutaCertificadoPdf: string | null;
  ivaPorcentaje: number | null;
  ivaMonto: number | null;
  fechaRegistro: string;
}

export interface NuevaVenta {
  obraId: number;
  ejemplarId?: number | null;
  tipo: TipoVenta;
  compradorNombre: string;
  compradorEmail?: string | null;
  compradorTelefono?: string | null;
  fechaVenta: string;
  lugarVenta?: string | null;
  valorVenta: number;
  moneda: Moneda;
  aplicaComision: boolean;
  porcentajeComision?: number | null;
}
