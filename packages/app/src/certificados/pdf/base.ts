import type { jsPDF } from "jspdf";
import interRegularUrl from "../../assets/fonts/Inter-Regular.ttf?url";
import type { Certificado, Idioma, TamanoHoja } from "../certificado.js";

// Medidas de hoja en mm (ancho x alto, vertical).
const HOJAS: Record<TamanoHoja, [number, number]> = {
  a4: [210, 297],
  carta: [215.9, 279.4],
  a5: [148, 210],
};

/** Separacion entre renglones de un mismo texto (1 = renglones pegados). */
export const INTERLINEADO = 1.25;

/** Alto de un renglon, en mm, para un tamaño de letra en puntos. */
export function altoRenglon(puntos: number): number {
  return puntos * 0.3528 * INTERLINEADO;
}

/** Margen alrededor de la hoja cuando se piden guias de corte, en mm. */
const MARGEN_GUIAS = 12;

/**
 * Los certificados se diseñaron sobre A4. Para otra hoja se usa un factor
 * de escala `k` que achica margenes, letras e imagenes en proporcion,
 * elegido para que todo entre a lo alto; el ancho se reparte con el ancho
 * real de la hoja. Asi el marco y los margenes quedan justos a la hoja
 * elegida, en vez de depender de que la impresora "ajuste a pagina".
 *
 * Con guias de corte, el PDF es mas grande que la hoja elegida (para
 * imprimir en un papel mayor o en bobina): la hoja queda centrada con las
 * guias por fuera, y `doc` es un envoltorio que corre todo lo que se dibuja
 * hasta esa posicion, asi cada modelo sigue dibujando como si la hoja
 * empezara en 0,0. W y H son siempre las medidas de la hoja elegida.
 */
export async function nuevoDocumento(
  c: Pick<Certificado, "tamanoHoja" | "guiasCorte" | "idioma">,
): Promise<{ doc: jsPDF; W: number; H: number; k: number }> {
  const { default: jsPDF } = await import("jspdf");
  const [W, H] = HOJAS[c.tamanoHoja];
  const m = c.guiasCorte === "ninguna" ? 0 : MARGEN_GUIAS;
  const real = new jsPDF({ unit: "mm", format: [W + m * 2, H + m * 2], orientation: "portrait" });
  real.setLineHeightFactor(INTERLINEADO);
  await registrarFuentes(real);
  if (m) dibujarGuias(real, c, W, H, m);
  const k = Math.min(W / 210, H / 297);
  return { doc: m ? desplazado(real, m) : real, W, H, k };
}

function desplazado(doc: jsPDF, m: number): jsPDF {
  return new Proxy(doc, {
    get(obj, prop) {
      switch (prop) {
        case "text":
          return (texto: string | string[], x: number, y: number, opciones?: object) => obj.text(texto, x + m, y + m, opciones);
        case "line":
          return (x1: number, y1: number, x2: number, y2: number, estilo?: string) =>
            obj.line(x1 + m, y1 + m, x2 + m, y2 + m, estilo as never);
        case "rect":
          return (x: number, y: number, w: number, h: number, estilo?: string) => obj.rect(x + m, y + m, w, h, estilo);
        case "addImage":
          return (img: Uint8Array, formato: string, x: number, y: number, w: number, h: number) =>
            obj.addImage(img, formato, x + m, y + m, w, h);
      }
      const valor = Reflect.get(obj, prop);
      return typeof valor === "function" ? valor.bind(obj) : valor;
    },
  });
}

const NOMBRE_HOJA: Record<TamanoHoja, string> = { a4: "A4", carta: "Carta / Letter", a5: "A5" };

function dibujarGuias(doc: jsPDF, c: Pick<Certificado, "tamanoHoja" | "guiasCorte" | "idioma">, W: number, H: number, m: number) {
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.15);
  if (c.guiasCorte === "recuadro") {
    doc.setDrawColor(140, 140, 140);
    doc.rect(m, m, W, H);
  } else {
    // Marcas de corte en las esquinas: dos rayitas por esquina, por fuera
    // de la hoja y separadas un poco para que no se vean despues de cortar.
    const separacion = 2;
    const largo = 7;
    for (const [x, dx] of [[m, -1], [m + W, 1]]) {
      for (const [y, dy] of [[m, -1], [m + H, 1]]) {
        doc.line(x + dx * separacion, y, x + dx * (separacion + largo), y);
        doc.line(x, y + dy * separacion, x, y + dy * (separacion + largo));
      }
    }
  }
  const medidas = `${NOMBRE_HOJA[c.tamanoHoja]} · ${String(W).replace(".", ",")} × ${String(H).replace(".", ",")} mm`;
  const indicacion =
    c.idioma === "en"
      ? `${medidas} · Trim along the guides · Print at actual size (100%)`
      : `${medidas} · Cortar por las guías · Imprimir a tamaño real (100 %)`;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(120, 120, 120);
  doc.text(indicacion, m + W / 2, m + H + m / 2 + 1.5, { align: "center" });
}

let interBase64: Promise<string> | null = null;

// jsPDF solo puede embeber TTF crudo; el .ttf viene de Galeris Studio.
async function registrarFuentes(doc: jsPDF): Promise<void> {
  if (!interBase64) {
    interBase64 = fetch(interRegularUrl)
      .then((r) => r.arrayBuffer())
      .then((buf) => {
        let binary = "";
        for (const byte of new Uint8Array(buf)) binary += String.fromCharCode(byte);
        return btoa(binary);
      });
  }
  doc.addFileToVFS("Inter-Regular.ttf", await interBase64);
  doc.addFont("Inter-Regular.ttf", "Inter", "normal");
}

// jsPDF necesita saber el formato de la imagen; se detecta por los primeros bytes.
export function formatoImagen(bytes: Uint8Array): "PNG" | "JPEG" | null {
  if (bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "PNG";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "JPEG";
  return null;
}

/** Ancho y alto para que la imagen entre en una caja de maxW x maxH sin deformarse. */
export async function medidaAjustada(bytes: Uint8Array, maxW: number, maxH: number = maxW): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(new Blob([bytes as BlobPart]));
  const proporcion = bitmap.width / bitmap.height;
  bitmap.close();
  let width = maxW;
  let height = maxW / proporcion;
  if (height > maxH) {
    height = maxH;
    width = maxH * proporcion;
  }
  return { width, height };
}

/** "23 de octubre de 2026", o "October 23, 2026" en ingles. */
export function fechaLarga(fechaISO: string, idioma: Idioma): string {
  const [anio, mes, dia] = fechaISO.split("-").map(Number);
  if (!anio || !mes || !dia) return fechaISO;
  if (idioma === "en") {
    const meses = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];
    return `${meses[mes - 1]} ${dia}, ${anio}`;
  }
  const meses = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];
  return `${dia} de ${meses[mes - 1]} de ${anio}`;
}

/**
 * Titulo de un campo segun el idioma elegido para el certificado: solo en
 * español, solo en ingles, o los dos separados por `separador`.
 */
export function rotulo(idioma: Idioma, es: string, en: string, separador = " / "): string {
  if (idioma === "es") return es;
  if (idioma === "en") return en;
  return `${es}${separador}${en}`;
}
