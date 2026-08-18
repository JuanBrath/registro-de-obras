import { describe, expect, it } from "vitest";
import { derivarEsSeriadaPintura, esSeriadaEditablePintura } from "../pintura.js";

describe("derivarEsSeriadaPintura", () => {
  it("Original nunca es seriada", () => {
    expect(derivarEsSeriadaPintura("Original")).toBe(false);
  });

  it("Serigrafia, Litografia y Grabado son siempre seriadas", () => {
    expect(derivarEsSeriadaPintura("Serigrafia")).toBe(true);
    expect(derivarEsSeriadaPintura("Litografia")).toBe(true);
    expect(derivarEsSeriadaPintura("Grabado")).toBe(true);
  });
});

describe("esSeriadaEditablePintura", () => {
  it("solo Original permite editar es_seriada", () => {
    expect(esSeriadaEditablePintura("Original")).toBe(true);
    expect(esSeriadaEditablePintura("Serigrafia")).toBe(false);
  });
});
