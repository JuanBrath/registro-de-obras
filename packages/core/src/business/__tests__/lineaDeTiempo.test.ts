import { describe, expect, it } from "vitest";
import { tieneLineaDeTiempo, tramosDeBiografia } from "../lineaDeTiempo.js";

describe("tramosDeBiografia", () => {
  it("separa la introducción de la línea de tiempo y respeta el orden", () => {
    const tramos = tramosDeBiografia("Fotógrafa argentina.\n\n1975. Nace en Rosario.\n2019 – Muestra individual\n2015-actualidad: docente");
    expect(tramos).toEqual([
      { tipo: "texto", texto: "Fotógrafa argentina." },
      {
        tipo: "linea",
        hitos: [
          { fecha: "1975", entradas: ["Nace en Rosario."] },
          { fecha: "2019", entradas: ["Muestra individual"] },
          { fecha: "2015 – actualidad", entradas: ["docente"] },
        ],
      },
    ]);
  });

  it("junta bajo cada año los renglones que lo siguen", () => {
    const [linea] = tramosDeBiografia("2023\nSalón Nacional\nFeria de fotografía\n\n2022\nBienal");
    expect(linea).toEqual({
      tipo: "linea",
      hitos: [
        { fecha: "2023", entradas: ["Salón Nacional", "Feria de fotografía"] },
        { fecha: "2022", entradas: ["Bienal"] },
      ],
    });
  });

  it("une los renglones que continúan una frase y suma las viñetas como entradas", () => {
    const [linea] = tramosDeBiografia("2020 Muestra en el museo\nde la ciudad\n  - Premio adquisición\n2021 Beca");
    expect(linea).toMatchObject({ hitos: [{ entradas: ["Muestra en el museo de la ciudad", "Premio adquisición"] }, { entradas: ["Beca"] }] });
  });

  it("deja como texto lo que viene después de la línea de tiempo", () => {
    const tramos = tramosDeBiografia("2020 Beca\n2021 Premio\n\nVive y trabaja en Buenos Aires.");
    expect(tramos.map((t) => t.tipo)).toEqual(["linea", "texto"]);
  });

  it("no cambia un texto en prosa ni una sola fecha suelta", () => {
    const prosa = "Nace en 1975.\n\n2019 fue un año clave en su obra.\n\nSigue trabajando.";
    expect(tramosDeBiografia(prosa)).toEqual([{ tipo: "texto", texto: prosa }]);
    expect(tieneLineaDeTiempo("Texto sin fechas")).toBe(false);
  });

  it("no toma como fecha un número que solo empieza como un año", () => {
    expect(tieneLineaDeTiempo("20000 copias\n19999 obras")).toBe(false);
  });
});
