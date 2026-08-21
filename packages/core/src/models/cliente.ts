export type TipoCliente = "ColeccionistaPrivado" | "GaleriaDealer" | "EmpresaInstitucion" | "DecoradorArquitecto";

export interface Cliente {
  id: number;
  nombre: string;
  tipoCliente: TipoCliente | null;
  domicilio: string | null;
  ciudad: string | null;
  pais: string | null;
  email: string | null;
  telefono: string | null;
  cuit: string | null;
  perfilIntereses: string | null;
  notas: string | null;
  fechaAltaSistema: string;
}

export interface NuevoCliente {
  nombre: string;
  tipoCliente?: TipoCliente | null;
  domicilio?: string | null;
  ciudad?: string | null;
  pais?: string | null;
  email?: string | null;
  telefono?: string | null;
  cuit?: string | null;
  perfilIntereses?: string | null;
  notas?: string | null;
}
