import { describe, expect, it } from "vitest";
import { calcularMontoNetoArtista, calcularPorcentajeComision } from "../venta.js";

describe("calcularMontoNetoArtista", () => {
  it("sin comision (registro Personal) el neto es el valor total", () => {
    expect(calcularMontoNetoArtista(1000, false, null)).toEqual({
      montoComision: 0,
      montoNetoArtista: 1000,
    });
  });

  it("con comision descuenta el porcentaje (registro Galeria)", () => {
    expect(calcularMontoNetoArtista(1000, true, 30)).toEqual({
      montoComision: 300,
      montoNetoArtista: 700,
    });
  });

  it("aplicaComision true sin porcentaje se comporta como sin comision", () => {
    expect(calcularMontoNetoArtista(1000, true, null)).toEqual({
      montoComision: 0,
      montoNetoArtista: 1000,
    });
  });
});

describe("calcularPorcentajeComision", () => {
  it("calcula el porcentaje a partir del monto de comision", () => {
    expect(calcularPorcentajeComision(1000, 300)).toBe(30);
  });

  it("valor de venta 0 no divide por cero", () => {
    expect(calcularPorcentajeComision(0, 300)).toBe(0);
  });

  it("monto de comision 0 da porcentaje 0", () => {
    expect(calcularPorcentajeComision(1000, 0)).toBe(0);
  });
});
