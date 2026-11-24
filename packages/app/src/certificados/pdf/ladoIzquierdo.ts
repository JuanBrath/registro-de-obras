import type { jsPDF } from "jspdf";
import type { Certificado } from "../certificado.js";
import { formatoImagen, medidaAjustada } from "./base.js";

/**
 * Gira una imagen un cuarto de vuelta a la izquierda (sentido antihorario): lo que
 * estaba arriba queda a la izquierda. Una foto apaisada pasa a ser vertical y llena
 * mejor la mitad izquierda de la hoja doble. Se vuelve a codificar (JPG o PNG).
 */
export async function girarIzquierda(bytes: Uint8Array): Promise<Uint8Array> {
  const esPng = formatoImagen(bytes) === "PNG";
  const bitmap = await createImageBitmap(new Blob([bytes as BlobPart]));
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.height;
  canvas.height = bitmap.width;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo girar la imagen.");
  ctx.translate(0, canvas.height);
  ctx.rotate(-Math.PI / 2);
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, esPng ? "image/png" : "image/jpeg", 0.95));
  if (!blob) throw new Error("No se pudo girar la imagen.");
  return new Uint8Array(await blob.arrayBuffer());
}

/**
 * Mitad izquierda de la hoja doble: la foto de la obra (opcionalmente girada a la
 * izquierda) centrada y sin marco, o el texto que escribio el usuario, centrado y
 * achicado hasta que entre. (W, H) es la medida de esa mitad y `k` el factor de escala.
 */
export async function dibujarLadoIzquierdo(doc: jsPDF, c: Certificado, W: number, H: number, k: number): Promise<void> {
  const margen = 18 * k;
  const cajaW = W - margen * 2;
  const cajaH = H - margen * 2;

  if (c.ladoIzquierdo === "imagen") {
    if (!c.imagen) return;
    const bytes = c.girarFotoIzquierda ? await girarIzquierda(c.imagen) : c.imagen;
    const formato = formatoImagen(bytes);
    if (!formato) return;
    const { width, height } = await medidaAjustada(bytes, cajaW, cajaH);
    doc.addImage(bytes, formato, (W - width) / 2, (H - height) / 2, width, height);
    return;
  }

  const texto = c.textoIzquierdo.trim();
  if (!texto) return;
  // Se prueba desde una letra grande y se achica de a poco hasta que el texto entre en la caja.
  let puntos = 20 * k;
  const minimo = 7;
  let lineas: string[] = [];
  const alto = (p: number, n: number) => n * p * 0.3528 * 1.35;
  doc.setFont("times", "italic");
  doc.setTextColor(20, 20, 20);
  for (;;) {
    doc.setFontSize(puntos);
    lineas = doc.splitTextToSize(texto, cajaW) as string[];
    if (alto(puntos, lineas.length) <= cajaH || puntos <= minimo) break;
    puntos -= 0.5;
  }
  const bloque = alto(puntos, lineas.length);
  doc.setLineHeightFactor(1.35);
  doc.text(lineas, W / 2, (H - bloque) / 2 + puntos * 0.3528, { align: "center" });
}
