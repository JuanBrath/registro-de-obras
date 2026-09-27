import { describe, expect, it } from "vitest";
import {
  interpretarEnvioLightroom,
  normalizarCamara,
  normalizarDiafragma,
  normalizarDistanciaFocal,
  normalizarVelocidad,
} from "../lightroom.js";

const envio = (extra: Record<string, unknown> = {}) =>
  JSON.stringify({
    version: 1,
    id: "1234.5",
    titulo: "El Cielo en el Agua",
    fechaCaptura: "2019-05-03",
    palabrasClave: ["paisaje", "Patagonia"],
    calificacion: 4,
    camaraMarca: "Canon",
    camaraModelo: "Canon EOS R5",
    iso: "400",
    velocidad: "1/250 sec",
    diafragma: "f / 2.8",
    distanciaFocal: "50 mm",
    rutaOriginal: "/Users/ana/Fotos/IMG_0001.CR3",
    imagen: "imagen.jpg",
    ...extra,
  });

describe("lo que manda Lightroom a Studio", () => {
  it("lee un envio completo y deja los datos como los muestra el programa", () => {
    expect(interpretarEnvioLightroom(envio())).toEqual({
      id: "1234.5",
      titulo: "El Cielo en el Agua",
      fechaCaptura: "2019-05-03",
      palabrasClave: ["paisaje", "Patagonia"],
      calificacion: 4,
      camara: "Canon EOS R5",
      iso: "400",
      velocidadObturador: "1/250",
      diafragma: "f/2.8",
      distanciaFocal: "50mm",
      rutaOriginal: "/Users/ana/Fotos/IMG_0001.CR3",
      imagen: "imagen.jpg",
    });
  });

  it("acepta un envio casi vacio (Lightroom no tenia nada cargado)", () => {
    const r = interpretarEnvioLightroom(JSON.stringify({ version: 1, imagen: "imagen.jpg", palabrasClave: [], calificacion: 0 }));
    expect(r).toMatchObject({ titulo: "", fechaCaptura: "", palabrasClave: [], calificacion: null, camara: "", iso: "" });
  });

  it("descarta la calificacion fuera de 1 a 5, y las fechas o palabras que no sirven", () => {
    expect(interpretarEnvioLightroom(envio({ calificacion: 0 }))?.calificacion).toBeNull();
    expect(interpretarEnvioLightroom(envio({ calificacion: 9 }))?.calificacion).toBeNull();
    expect(interpretarEnvioLightroom(envio({ calificacion: -1 }))?.calificacion).toBeNull();
    expect(interpretarEnvioLightroom(envio({ fechaCaptura: "3/5/2019" }))?.fechaCaptura).toBe("");
    expect(interpretarEnvioLightroom(envio({ palabrasClave: ["a", "", "a", 5, "  b  "] }))?.palabrasClave).toEqual(["a", "b"]);
    expect(interpretarEnvioLightroom(envio({ palabrasClave: "no es lista" }))?.palabrasClave).toEqual([]);
  });

  it("respeta acentos y caracteres escapados", () => {
    const r = interpretarEnvioLightroom(envio({ titulo: 'Niño "épico"\nfinal', palabrasClave: ["montaña"] }));
    expect(r?.titulo).toBe('Niño "épico"\nfinal');
    expect(r?.palabrasClave).toEqual(["montaña"]);
  });

  it("no deja apuntar a archivos fuera de la carpeta de entrada", () => {
    for (const imagen of ["../secreto.jpg", "/etc/passwd", "a/b.jpg", "..", "", ".oculto", "a\\b.jpg"]) {
      expect(interpretarEnvioLightroom(envio({ imagen }))?.imagen, imagen).toBe("");
    }
  });

  it("ignora lo que no es un envio valido", () => {
    for (const malo of ["", "no es json", "[]", "null", '"texto"', JSON.stringify({ version: 2 }), JSON.stringify({ titulo: "x" })]) {
      expect(interpretarEnvioLightroom(malo), malo).toBeNull();
    }
  });
});

describe("datos de captura de Lightroom", () => {
  it("velocidad de obturacion", () => {
    expect(normalizarVelocidad("1/250 sec")).toBe("1/250");
    expect(normalizarVelocidad("1/8000")).toBe("1/8000");
    expect(normalizarVelocidad("2 sec")).toBe("2s");
    expect(normalizarVelocidad("0,5 sec")).toBe("0.5s");
    expect(normalizarVelocidad("13")).toBe("13s");
    expect(normalizarVelocidad("bulb")).toBe("");
    expect(normalizarVelocidad("")).toBe("");
  });

  it("diafragma y distancia focal", () => {
    expect(normalizarDiafragma("f / 2.8")).toBe("f/2.8");
    expect(normalizarDiafragma("f/11")).toBe("f/11");
    expect(normalizarDiafragma("")).toBe("");
    expect(normalizarDistanciaFocal("50 mm")).toBe("50mm");
    expect(normalizarDistanciaFocal("24.0 mm")).toBe("24mm");
    expect(normalizarDistanciaFocal("")).toBe("");
  });

  it("camara: no repite la marca si el modelo ya la trae", () => {
    expect(normalizarCamara("Canon", "Canon EOS R5")).toBe("Canon EOS R5");
    expect(normalizarCamara("SONY", "ILCE-7RM4")).toBe("SONY ILCE-7RM4");
    expect(normalizarCamara("", "X100V")).toBe("X100V");
    expect(normalizarCamara("Fujifilm", "")).toBe("Fujifilm");
    expect(normalizarCamara("", "")).toBe("");
  });
});
