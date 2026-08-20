import { describe, expect, it } from "vitest";
import { derivarEsSeriadaObraGrafica } from "../obraGrafica.js";

describe("derivarEsSeriadaObraGrafica", () => {
  it("Monotipos nunca es seriada", () => {
    expect(derivarEsSeriadaObraGrafica("Monotipos")).toBe(false);
  });

  it("las demas familias de grabado son siempre seriadas", () => {
    expect(derivarEsSeriadaObraGrafica("GrabadoRelieve")).toBe(true);
    expect(derivarEsSeriadaObraGrafica("GrabadoHueco")).toBe(true);
    expect(derivarEsSeriadaObraGrafica("GrabadoPlanografico")).toBe(true);
  });
});
