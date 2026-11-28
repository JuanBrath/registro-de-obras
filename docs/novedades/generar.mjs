// Genera el PDF de novedades de una versión de Recer a partir de un archivo de contenido.
//
//   node docs/novedades/generar.mjs docs/novedades/2026-11-23.mjs
//
// El PDF queda junto al archivo de contenido (mismo nombre, extensión .pdf). Para la próxima versión:
// copiar el último archivo de contenido, ajustar `version` y `fecha` y agregar lo nuevo (ver README.md).
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";

const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const require = createRequire(path.join(raiz, "packages/app/package.json"));
const { jsPDF } = require("jspdf");

const archivo = process.argv[2];
if (!archivo) {
  console.error("Uso: node docs/novedades/generar.mjs <archivo de contenido .mjs>");
  process.exit(1);
}
const { default: contenido } = await import(pathToFileURL(path.resolve(archivo)).href);

const doc = new jsPDF({ unit: "mm", format: "a4" });
const W = 210;
const M = 20;
const ancho = W - 2 * M;
let y = 25;
const salto = (h) => {
  if (y + h > 280) {
    doc.addPage();
    y = 25;
  }
};

doc.setFont("helvetica", "bold");
doc.setFontSize(20);
doc.setTextColor(28, 42, 68);
doc.text(`Recer - Novedades de la versión ${contenido.version}`, M, y);
y += 8;
doc.setFont("helvetica", "normal");
doc.setFontSize(10);
doc.setTextColor(110);
doc.text(contenido.fecha, M, y);
y += 10;

for (const { titulo, items } of contenido.secciones) {
  salto(18);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(28, 42, 68);
  doc.text(titulo, M, y);
  y += 7.5;
  doc.setDrawColor(201, 162, 71);
  doc.line(M, y - 5, M + ancho, y - 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(40);
  for (const item of items) {
    const lineas = doc.splitTextToSize(item, ancho - 6);
    salto(lineas.length * 5 + 2);
    doc.text("-", M, y);
    doc.text(lineas, M + 5, y);
    y += lineas.length * 5 + 2;
  }
  y += 4;
}

const salida = path.resolve(archivo).replace(/\.mjs$/, ".pdf");
writeFileSync(salida, Buffer.from(doc.output("arraybuffer")));
console.log(`Listo: ${salida} (${doc.getNumberOfPages()} páginas)`);
