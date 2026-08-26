export type TipoVenta = "venta" | "reserva" | "donacion";

export type Moneda = "ARS" | "USD" | "EUR";

export type EstadoPago = "pagado" | "pendiente" | "en_cuotas";

export type EstadoLiquidacion = "pendiente" | "liquidado" | "comprobante_emitido";

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
  precioLista: number | null;
  motivoDescuento: string | null;
  tipoCambio: number | null;
  retencionesMonto: number | null;
  arancelesMonto: number | null;
  costoEnmarcado: number | null;
  costoPeana: number | null;
  costoEmbalaje: number | null;
  costoTransporte: number | null;
  costoSeguro: number | null;
  estadoPago: EstadoPago | null;
  metodoPago: string | null;
  fechaCobro: string | null;
  estadoLiquidacion: EstadoLiquidacion | null;
  droitSuiteAplica: boolean;
  droitSuitePorcentaje: number | null;
  droitSuiteMonto: number | null;
  direccionEntrega: string | null;
  ciudadEntrega: string | null;
  paisEntrega: string | null;
  confidencial: boolean;
  clausulaReventa: string | null;
  asesorVenta: string | null;
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
