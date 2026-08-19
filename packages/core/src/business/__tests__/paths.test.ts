import { describe, expect, it } from "vitest";
import {
  artistaFotoPath,
  artistaLogoPath,
  certificadoPdfPath,
  galeriaLogoPath,
  obraMiniaturaPath,
  obraOriginalPath,
} from "../paths.js";

describe("paths", () => {
  it("obraOriginalPath usa la extension provista", () => {
    expect(obraOriginalPath(42, "jpg")).toBe("obras/42/original.jpg");
    expect(obraOriginalPath(42, "png")).toBe("obras/42/original.png");
  });

  it("obraMiniaturaPath siempre es jpg", () => {
    expect(obraMiniaturaPath(42)).toBe("obras/42/miniatura.jpg");
  });

  it("certificadoPdfPath usa el numero de certificado", () => {
    expect(certificadoPdfPath(7)).toBe("certificados/7.pdf");
  });

  it("artistaFotoPath usa la extension provista", () => {
    expect(artistaFotoPath(3, "jpg")).toBe("artistas/3/foto.jpg");
    expect(artistaFotoPath(3, "png")).toBe("artistas/3/foto.png");
  });

  it("artistaLogoPath usa la extension provista", () => {
    expect(artistaLogoPath(3, "jpg")).toBe("artistas/3/logo.jpg");
    expect(artistaLogoPath(3, "png")).toBe("artistas/3/logo.png");
  });

  it("galeriaLogoPath usa la extension provista", () => {
    expect(galeriaLogoPath("png")).toBe("galeria/logo.png");
  });
});
