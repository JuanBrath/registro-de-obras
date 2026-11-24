import type { Certificado } from "./certificado.js";
import type { VistaHoja } from "./pdf/base.js";
import { generarClasico } from "./pdf/clasico.js";
import { generarFicha } from "./pdf/ficha.js";
import { generarSimple } from "./pdf/simple.js";

/**
 * Arma el PDF del certificado con el diseño que indica `c.modelo`. `vista` solo cambia la vista previa de la hoja
 * doble (la izquierda, la derecha o ambas); al guardar siempre se generan ambas hojas.
 */
export function generarCertificado(c: Certificado, vista: VistaHoja = "ambas"): Promise<Uint8Array> {
  const conVista: Certificado & { vista: VistaHoja } = { ...c, vista };
  if (c.modelo === "ficha") return generarFicha(conVista);
  if (c.modelo === "simple") return generarSimple(conVista);
  return generarClasico(conVista);
}
