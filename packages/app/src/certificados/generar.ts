import type { Certificado } from "./certificado.js";
import { generarClasico } from "./pdf/clasico.js";
import { generarFicha } from "./pdf/ficha.js";
import { generarSimple } from "./pdf/simple.js";

/** Arma el PDF del certificado con el diseño que indica `c.modelo`. */
export function generarCertificado(c: Certificado): Promise<Uint8Array> {
  if (c.modelo === "ficha") return generarFicha(c);
  if (c.modelo === "simple") return generarSimple(c);
  return generarClasico(c);
}
