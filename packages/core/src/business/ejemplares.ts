import type { TipoEjemplar } from "../models/ejemplar.js";

export interface EjemplarGenerado {
  tipo: TipoEjemplar;
  indice: number;
  totalEdiciones: number;
  numero: string;
}

export function calcularCantidadPruebasArtista(cantidadTotalEdiciones: number): number {
  return Math.ceil(cantidadTotalEdiciones * 0.1);
}

export function formatearNumeroEjemplar(indice: number, total: number): string {
  return `${indice}/${total}`;
}

export function formatearNumeroPruebaArtista(indice: number, totalPA: number): string {
  return `PA ${indice}/${totalPA}`;
}

// Una serie solo puede deshacerse (volver a ser obra unica) si ningun
// ejemplar tiene todavia un historial atado a ESE numero puntual (vendido,
// reservado, en exhibicion, en consignacion, en la coleccion del autor,
// descartado o destruido) que se perderia al colapsar la obra en una sola
// pieza. "Disponible" y "en_stock"/"en_produccion" son estados puramente
// administrativos (la pieza fue impresa pero todavia no salio ni se
// comprometio con nadie), asi que no bloquean deshacer la serie.
const ESTADOS_NO_COMPROMETIDOS = new Set(["disponible", "en_stock", "en_produccion"]);

export function puedeDeshacerSerie(estadosEjemplares: string[]): boolean {
  return estadosEjemplares.every((estado) => ESTADOS_NO_COMPROMETIDOS.has(estado));
}

// Una obra "unica" es, por dentro, una serie de un solo ejemplar 1/1 — sin
// pruebas de artista (a diferencia de generarEjemplares(1), que si generaria
// una PA 1/1 ademas de la edicion 1/1, porque para una edicion real de 1
// copia el 10% redondeado hacia arriba sigue siendo 1 prueba).
export function generarEjemplarUnico(): EjemplarGenerado {
  return { tipo: "edicion", indice: 1, totalEdiciones: 1, numero: formatearNumeroEjemplar(1, 1) };
}

// cantidadPruebasArtista es opcional: si no se especifica, se usa el 10%
// redondeado hacia arriba (calcularCantidadPruebasArtista). Cuando el
// usuario elige explicitamente cuantas pruebas de autor tiene la serie, se
// pasa ese valor aca en vez del automatico.
export function generarEjemplares(
  cantidadTotalEdiciones: number,
  cantidadPruebasArtista?: number,
): EjemplarGenerado[] {
  if (!Number.isInteger(cantidadTotalEdiciones) || cantidadTotalEdiciones < 1) {
    throw new Error("cantidadTotalEdiciones debe ser un entero mayor o igual a 1");
  }

  const cantidadPA = cantidadPruebasArtista ?? calcularCantidadPruebasArtista(cantidadTotalEdiciones);

  const ediciones: EjemplarGenerado[] = Array.from({ length: cantidadTotalEdiciones }, (_, i) => ({
    tipo: "edicion" as const,
    indice: i + 1,
    totalEdiciones: cantidadTotalEdiciones,
    numero: formatearNumeroEjemplar(i + 1, cantidadTotalEdiciones),
  }));

  const pruebasArtista: EjemplarGenerado[] = Array.from({ length: cantidadPA }, (_, i) => ({
    tipo: "prueba_artista" as const,
    indice: i + 1,
    totalEdiciones: cantidadTotalEdiciones,
    numero: formatearNumeroPruebaArtista(i + 1, cantidadPA),
  }));

  return [...ediciones, ...pruebasArtista];
}
