import type { jsPDF } from "jspdf";
import type { Certificado } from "../certificado.js";
import { rotulo } from "./base.js";

/**
 * Leyenda al pie de los certificados de sintografia (obra generada por
 * inteligencia artificial): en lugar del copyright, aclara en mayusculas que
 * no lo tiene. `x` es el centro del texto e `y` su linea de base, ya escalados
 * a la hoja elegida.
 */
export function dibujarSinCopyright(doc: jsPDF, c: Pick<Certificado, "idioma">, x: number, y: number, k: number) {
  doc.setFont("Inter", "normal");
  doc.setFontSize(9 * k);
  doc.setTextColor(60, 60, 60);
  doc.text(rotulo(c.idioma, "SIN COPYRIGHT", "NO COPYRIGHT", " · "), x, y, { align: "center" });
}
