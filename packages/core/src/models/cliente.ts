export interface Cliente {
  id: number;
  nombre: string;
  email: string | null;
  telefono: string | null;
  notas: string | null;
  fechaAltaSistema: string;
}

export interface NuevoCliente {
  nombre: string;
  email?: string | null;
  telefono?: string | null;
  notas?: string | null;
}
