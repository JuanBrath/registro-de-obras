import { describe, expect, it } from "vitest";
import {
  calcularCantidadPruebasArtista,
  evaluarDeshacerSerie,
  formatearNumeroEjemplar,
  formatearNumeroPruebaArtista,
  generarEjemplarUnico,
  generarEjemplares,
  type InfoEjemplarParaDeshacer,
} from "../ejemplares.js";

function ej(estado: string, tieneDatosCargados = false): InfoEjemplarParaDeshacer {
  return { estado, tieneDatosCargados };
}

describe("calcularCantidadPruebasArtista", () => {
  it("redondea siempre hacia arriba", () => {
    expect(calcularCantidadPruebasArtista(7)).toBe(1);
    expect(calcularCantidadPruebasArtista(25)).toBe(3);
    expect(calcularCantidadPruebasArtista(10)).toBe(1);
    expect(calcularCantidadPruebasArtista(1)).toBe(1);
  });
});

describe("formatearNumeroEjemplar / formatearNumeroPruebaArtista", () => {
  it("formatea como N/Total y PA N/Total", () => {
    expect(formatearNumeroEjemplar(3, 10)).toBe("3/10");
    expect(formatearNumeroPruebaArtista(1, 2)).toBe("PA 1/2");
  });
});

describe("generarEjemplares", () => {
  it("genera ediciones numeradas 1/N..N/N mas las PA correspondientes", () => {
    const ejemplares = generarEjemplares(12);
    const ediciones = ejemplares.filter((e) => e.tipo === "edicion");
    const pruebasArtista = ejemplares.filter((e) => e.tipo === "prueba_artista");

    expect(ediciones).toHaveLength(12);
    expect(ediciones[0].numero).toBe("1/12");
    expect(ediciones[11].numero).toBe("12/12");

    expect(pruebasArtista).toHaveLength(2);
    expect(pruebasArtista[0].numero).toBe("PA 1/2");
    expect(pruebasArtista[1].numero).toBe("PA 2/2");
  });

  it("rechaza cantidades invalidas", () => {
    expect(() => generarEjemplares(0)).toThrow();
    expect(() => generarEjemplares(-1)).toThrow();
    expect(() => generarEjemplares(1.5)).toThrow();
  });

  it("permite indicar una cantidad de pruebas de artista explicita, en vez del 10% automatico", () => {
    const conCero = generarEjemplares(12, 0);
    expect(conCero.filter((e) => e.tipo === "prueba_artista")).toHaveLength(0);

    const conCinco = generarEjemplares(12, 5);
    const pruebasArtista = conCinco.filter((e) => e.tipo === "prueba_artista");
    expect(pruebasArtista).toHaveLength(5);
    expect(pruebasArtista[4].numero).toBe("PA 5/5");
  });
});

describe("generarEjemplarUnico", () => {
  it("genera un unico ejemplar 1/1 sin prueba de artista", () => {
    expect(generarEjemplarUnico()).toEqual({
      tipo: "edicion",
      indice: 1,
      totalEdiciones: 1,
      numero: "1/1",
    });
  });
});

describe("evaluarDeshacerSerie", () => {
  it("permite deshacer sin nada que conservar si todos estan disponibles/en_stock/en_produccion y sin datos cargados", () => {
    expect(evaluarDeshacerSerie([ej("disponible"), ej("disponible"), ej("disponible")])).toEqual({
      permitido: true,
      indiceAConservar: null,
    });
    expect(evaluarDeshacerSerie([ej("disponible"), ej("en_stock"), ej("en_produccion")])).toEqual({
      permitido: true,
      indiceAConservar: null,
    });
  });

  it("una serie sin ejemplares (lista vacia) se puede deshacer sin nada que conservar", () => {
    expect(evaluarDeshacerSerie([])).toEqual({ permitido: true, indiceAConservar: null });
  });

  it("si exactamente una copia esta en un estado comprometido, permite deshacer conservando esa copia", () => {
    expect(evaluarDeshacerSerie([ej("disponible"), ej("vendida")])).toEqual({
      permitido: true,
      indiceAConservar: 1,
    });
    expect(evaluarDeshacerSerie([ej("reservada"), ej("disponible")])).toEqual({
      permitido: true,
      indiceAConservar: 0,
    });
    expect(evaluarDeshacerSerie([ej("disponible"), ej("exhibicion")]).permitido).toBe(true);
    expect(evaluarDeshacerSerie([ej("disponible"), ej("consignacion")]).permitido).toBe(true);
    expect(evaluarDeshacerSerie([ej("disponible"), ej("coleccion_autor")]).permitido).toBe(true);
    expect(evaluarDeshacerSerie([ej("disponible"), ej("descartada")]).permitido).toBe(true);
  });

  it("si exactamente una copia tiene datos cargados (aunque este disponible), permite deshacer conservando esa copia", () => {
    expect(evaluarDeshacerSerie([ej("disponible"), ej("disponible", true)])).toEqual({
      permitido: true,
      indiceAConservar: 1,
    });
  });

  it("bloquea si hay dos o mas copias bloqueantes (estado comprometido o con datos cargados)", () => {
    expect(evaluarDeshacerSerie([ej("vendida"), ej("reservada")]).permitido).toBe(false);
    expect(evaluarDeshacerSerie([ej("vendida"), ej("disponible", true)]).permitido).toBe(false);
    expect(evaluarDeshacerSerie([ej("disponible", true), ej("disponible", true)]).permitido).toBe(false);
  });

  it("destruida nunca cuenta como bloqueante, ni sola ni combinada con otra bloqueante real", () => {
    expect(evaluarDeshacerSerie([ej("disponible"), ej("destruida")])).toEqual({
      permitido: true,
      indiceAConservar: null,
    });
    expect(evaluarDeshacerSerie([ej("destruida"), ej("destruida"), ej("destruida")])).toEqual({
      permitido: true,
      indiceAConservar: null,
    });
    expect(evaluarDeshacerSerie([ej("destruida"), ej("vendida")])).toEqual({
      permitido: true,
      indiceAConservar: 1,
    });
  });
});
