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

export interface InfoEjemplarParaDeshacer {
  estado: string;
  /** Si esta copia ya tiene datos cargados a mano (fecha de impresion, notas, COA, etc.). */
  tieneDatosCargados: boolean;
}

export type ResultadoDeshacerSerie =
  | { permitido: true; indiceAConservar: number | null }
  | { permitido: false; indicesBloqueantes: number[] };

export const ESTADOS_SIN_COMPROMISO_PROPIO = new Set(["disponible", "en_stock", "en_produccion"]);

// Al deshacer una serie (volver a obra unica) hay que colapsar N copias en
// una sola, eligiendo cual conservar. Una copia cuenta como "bloqueante" —
// algo que no se puede descartar en silencio — si esta en un estado
// realmente comprometido (vendida, reservada, en exhibicion, en
// consignacion, en la coleccion del autor, descartada) o si ya tiene datos
// cargados a mano que se perderian. "Destruida" es la unica excepcion: una
// copia destruida no cuenta nunca como bloqueante, porque no hay nada que
// preservar de una pieza que ya no existe.
//
// - Si no hay ninguna bloqueante, se puede deshacer sin mas: se genera una
//   copia unica en blanco (indiceAConservar: null).
// - Si hay exactamente una, se puede deshacer conservando esa copia tal cual
//   (su estado, sus datos, su venta asociada) como la nueva pieza unica.
// - Si hay dos o mas, no hay forma de elegir cual conservar sin perder
//   informacion real de las otras, asi que queda bloqueado.
export function evaluarDeshacerSerie(ejemplares: InfoEjemplarParaDeshacer[]): ResultadoDeshacerSerie {
  const indicesBloqueantes = ejemplares.reduce<number[]>((acc, ej, indice) => {
    const esBloqueante =
      ej.estado !== "destruida" &&
      (!ESTADOS_SIN_COMPROMISO_PROPIO.has(ej.estado) || ej.tieneDatosCargados);
    if (esBloqueante) acc.push(indice);
    return acc;
  }, []);

  if (indicesBloqueantes.length >= 2) return { permitido: false, indicesBloqueantes };
  return { permitido: true, indiceAConservar: indicesBloqueantes[0] ?? null };
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
