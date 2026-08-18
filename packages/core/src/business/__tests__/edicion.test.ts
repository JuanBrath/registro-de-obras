import { describe, expect, it } from "vitest";
import { edicionIncluyeGaleria, edicionIncluyePersonal } from "../edicion.js";

describe("edicionIncluyePersonal", () => {
  it("es true para personal y personal_galeria", () => {
    expect(edicionIncluyePersonal("personal")).toBe(true);
    expect(edicionIncluyePersonal("personal_galeria")).toBe(true);
  });

  it("es false para galeria", () => {
    expect(edicionIncluyePersonal("galeria")).toBe(false);
  });
});

describe("edicionIncluyeGaleria", () => {
  it("es true para galeria y personal_galeria", () => {
    expect(edicionIncluyeGaleria("galeria")).toBe(true);
    expect(edicionIncluyeGaleria("personal_galeria")).toBe(true);
  });

  it("es false para personal", () => {
    expect(edicionIncluyeGaleria("personal")).toBe(false);
  });
});
