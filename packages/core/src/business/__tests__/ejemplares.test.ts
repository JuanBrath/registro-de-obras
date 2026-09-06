import { describe, expect, it } from "vitest";
import {
  calcularCantidadPruebasArtista,
  formatearNumeroEjemplar,
  formatearNumeroPruebaArtista,
  generarEjemplarUnico,
  generarEjemplares,
  puedeConvertirASeriada,
  puedeDeshacerSerie,
} from "../ejemplares.js";

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

describe("puedeDeshacerSerie", () => {
  it("permite deshacer la serie si todos los ejemplares estan disponibles", () => {
    expect(puedeDeshacerSerie(["disponible", "disponible", "disponible"])).toBe(true);
  });

  it("permite deshacer la serie si los ejemplares estan en stock o en produccion (no comprometidos)", () => {
    expect(puedeDeshacerSerie(["disponible", "en_stock", "en_produccion"])).toBe(true);
  });

  it("bloquea si algun ejemplar ya se vendio, reservo, esta en exhibicion, consignacion, coleccion del autor, descartado o destruido", () => {
    expect(puedeDeshacerSerie(["disponible", "vendida"])).toBe(false);
    expect(puedeDeshacerSerie(["disponible", "reservada"])).toBe(false);
    expect(puedeDeshacerSerie(["disponible", "exhibicion"])).toBe(false);
    expect(puedeDeshacerSerie(["disponible", "consignacion"])).toBe(false);
    expect(puedeDeshacerSerie(["disponible", "coleccion_autor"])).toBe(false);
    expect(puedeDeshacerSerie(["disponible", "descartada"])).toBe(false);
    expect(puedeDeshacerSerie(["disponible", "destruida"])).toBe(false);
  });

  it("una serie sin ejemplares (lista vacia) se puede deshacer", () => {
    expect(puedeDeshacerSerie([])).toBe(true);
  });
});

describe("puedeConvertirASeriada", () => {
  it("permite convertir a seriada aunque el ejemplar unico este en coleccion del autor, exhibicion, consignacion, descartado o destruido", () => {
    expect(puedeConvertirASeriada(["coleccion_autor"])).toBe(true);
    expect(puedeConvertirASeriada(["exhibicion"])).toBe(true);
    expect(puedeConvertirASeriada(["consignacion"])).toBe(true);
    expect(puedeConvertirASeriada(["descartada"])).toBe(true);
    expect(puedeConvertirASeriada(["destruida"])).toBe(true);
    expect(puedeConvertirASeriada(["disponible"])).toBe(true);
  });

  it("bloquea convertir a seriada si el ejemplar unico ya tiene una venta o reserva real", () => {
    expect(puedeConvertirASeriada(["vendida"])).toBe(false);
    expect(puedeConvertirASeriada(["reservada"])).toBe(false);
  });
});
