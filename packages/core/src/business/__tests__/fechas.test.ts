import { describe, expect, it } from "vitest";
import { derivarAnioDesdeFecha } from "../fechas.js";

describe("derivarAnioDesdeFecha", () => {
  it("extrae el año de una fecha ISO", () => {
    expect(derivarAnioDesdeFecha("2026-08-11")).toBe(2026);
  });

  it("devuelve null si no hay fecha", () => {
    expect(derivarAnioDesdeFecha(null)).toBeNull();
    expect(derivarAnioDesdeFecha(undefined)).toBeNull();
    expect(derivarAnioDesdeFecha("")).toBeNull();
  });
});
