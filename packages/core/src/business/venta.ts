export interface MontoNetoArtistaResult {
  montoComision: number;
  montoNetoArtista: number;
}

export function calcularMontoNetoArtista(
  valorVenta: number,
  aplicaComision: boolean,
  porcentajeComision: number | null | undefined,
): MontoNetoArtistaResult {
  if (!aplicaComision || !porcentajeComision) {
    return { montoComision: 0, montoNetoArtista: valorVenta };
  }

  const montoComision = valorVenta * (porcentajeComision / 100);
  return {
    montoComision,
    montoNetoArtista: valorVenta - montoComision,
  };
}

export function calcularPorcentajeComision(valorVenta: number, montoComision: number): number {
  if (!valorVenta) return 0;
  return (montoComision / valorVenta) * 100;
}
