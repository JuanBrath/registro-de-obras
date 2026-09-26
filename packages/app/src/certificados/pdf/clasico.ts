import { copiaConPA, type Certificado } from "../certificado.js";
import { altoRenglon, fechaLarga, formatoImagen, medidaAjustada, nuevoDocumento, rotulo } from "./base.js";
import { dibujarSinCopyright } from "./sinCopyright.js";

/**
 * Certificado de autenticidad clasico, en una sola hoja: marco de doble
 * linea, banner con el titulo, la foto de la obra en el cuerpo, campos con
 * linea debajo, lugar y fecha, y pie de derechos reservados. Tomado de
 * buildCoaPdfBytes de Galeris Studio; todas las medidas van multiplicadas
 * por `k` para adaptarse a la hoja elegida (ver nuevoDocumento).
 */
export async function generarClasico(c: Certificado): Promise<Uint8Array> {
  const { doc, W, H, k } = await nuevoDocumento(c);
  const ambos = c.idioma === "ambos";

  // Titulos de los campos: con "ambos", español arriba e ingles debajo,
  // un poco mas chico y mas claro.
  function titulos(es: string, en: string): string[] {
    if (c.idioma === "es") return [es];
    if (c.idioma === "en") return [en];
    return [es, en];
  }
  const separacionTitulos = 3.6 * k;
  function dibujarTitulos(lineas: string[], x: number, y: number, puntos: number, align: "left" | "center") {
    lineas.forEach((linea, i) => {
      doc.setFont("times", "italic");
      doc.setFontSize((i === 0 ? puntos : puntos - 1) * k);
      doc.setTextColor(i === 0 ? 90 : 130, i === 0 ? 90 : 130, i === 0 ? 90 : 130);
      doc.text(linea, x, y + i * separacionTitulos, { align });
    });
  }
  const extraTitulos = ambos ? separacionTitulos : 0;

  // Marco (doble linea).
  const outerMargin = 12 * k;
  const innerGap = 1.6 * k;
  doc.setDrawColor(40, 40, 40);
  doc.setLineWidth(0.5 * k);
  doc.rect(outerMargin, outerMargin, W - outerMargin * 2, H - outerMargin * 2);
  doc.setLineWidth(0.2 * k);
  doc.rect(outerMargin + innerGap, outerMargin + innerGap, W - (outerMargin + innerGap) * 2, H - (outerMargin + innerGap) * 2);

  const contentX = outerMargin + 30 * k;
  const contentWidth = W - contentX * 2;

  const bannerY = outerMargin + 6 * k;
  const bannerHeight = (ambos ? 22 : 16) * k;
  doc.setFillColor(224, 224, 224);
  doc.rect(contentX, bannerY, contentWidth, bannerHeight, "F");
  doc.setFont("times", "bolditalic");
  doc.setTextColor(20, 20, 20);
  if (ambos) {
    doc.setFontSize(17 * k);
    doc.text("Certificado de Autenticidad de Obra", W / 2, bannerY + 9.5 * k, { align: "center" });
    doc.setFontSize(12 * k);
    doc.text("Certificate of Authenticity", W / 2, bannerY + 17 * k, { align: "center" });
  } else {
    doc.setFontSize(18 * k);
    const titulo = c.idioma === "en" ? "Certificate of Authenticity" : "Certificado de Autenticidad de Obra";
    doc.text(titulo, W / 2, bannerY + bannerHeight / 2 + 3 * k, { align: "center" });
  }

  let y = bannerY + bannerHeight + 10 * k;

  if (c.imagen) {
    const formato = formatoImagen(c.imagen);
    if (formato) {
      // Con titulos en dos idiomas, o con la fila de serie, la foto se achica
      // un poco para que todo entre en la hoja.
      const altoMaximo = (ambos ? 76 : 85) - (c.serieProyecto ? 12 : 0);
      const { width, height } = await medidaAjustada(c.imagen, contentWidth, altoMaximo * k);
      doc.addImage(c.imagen, formato, contentX + (contentWidth - width) / 2, y, width, height);
      y += height + 10 * k;
    }
  } else {
    y += 4 * k;
  }

  // Los campos que no se completaron no aparecen en el certificado.
  function fila(es: string, en: string, valor: string) {
    if (!valor) return;
    dibujarTitulos(titulos(es, en), contentX, y, 10, "left");
    doc.setFont("helvetica", "italic");
    doc.setFontSize(15 * k);
    doc.setTextColor(20, 20, 20);
    const lineas = doc.splitTextToSize(valor, contentWidth) as string[];
    doc.text(lineas, W / 2, y, { align: "center" });
    y += Math.max(5 * k + (lineas.length - 1) * altoRenglon(15 * k), 5 * k + extraTitulos);
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.15 * k);
    doc.line(contentX, y, contentX + contentWidth, y);
    y += 10 * k;
  }

  function filaColumnas(todas: { es: string; en: string; valor: string }[]) {
    const columnas = todas.filter((col) => col.valor);
    if (columnas.length === 0) return;
    const colWidth = contentWidth / columnas.length;
    columnas.forEach((col, i) => {
      const colCenter = contentX + colWidth * i + colWidth / 2;
      dibujarTitulos(titulos(col.es, col.en), colCenter, y, 9.5, "center");
      doc.setFont("helvetica", "italic");
      doc.setFontSize(12 * k);
      doc.setTextColor(20, 20, 20);
      doc.text(col.valor, colCenter, y + 7 * k + extraTitulos, { align: "center" });
      doc.setDrawColor(150, 150, 150);
      doc.setLineWidth(0.15 * k);
      const lineaY = y + 10 * k + extraTitulos;
      doc.line(contentX + colWidth * i + 6 * k, lineaY, contentX + colWidth * (i + 1) - 6 * k, lineaY);
    });
    y += 20 * k + extraTitulos;
  }

  fila("Artista", "Artist", c.artista);
  fila("Título", "Title", c.titulo ? `"${c.titulo}"` : "");
  fila("Serie", "Series", c.serieProyecto ? `"${c.serieProyecto}"` : "");

  filaColumnas([
    { es: "Copia n°", en: "Edition no.", valor: copiaConPA(c) },
    { es: "Medidas de Imagen", en: "Image size", valor: c.medidas },
    { es: "Fecha de Toma", en: "Date taken", valor: c.anioToma },
  ]);

  const detalles = [c.captura, c.impresion].filter(Boolean).join("\n");
  if (detalles) fila("Detalles técnicos", "Technical details", detalles);

  // Fila final: año de edicion (si se completo) + firma del autor, con la
  // imagen de firma si se cargo. Sin año, la firma queda sola y centrada.
  const colWidth2 = contentWidth / 2;
  const conAnio = Boolean(c.anioEdicion);
  const col1Center = contentX + colWidth2 / 2;
  const col2Center = conAnio ? contentX + colWidth2 + colWidth2 / 2 : W / 2;
  if (conAnio) dibujarTitulos(titulos("Editada por el autor", "Edited by the artist"), col1Center, y, 9.5, "center");
  dibujarTitulos(titulos("Firma del Autor", "Artist's signature"), col2Center, y, 9.5, "center");
  y += extraTitulos;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(12 * k);
  doc.setTextColor(20, 20, 20);
  if (conAnio) doc.text(c.anioEdicion, col1Center, y + 7 * k, { align: "center" });
  if (c.firmaArtista) {
    const formato = formatoImagen(c.firmaArtista);
    if (formato) {
      const { width, height } = await medidaAjustada(c.firmaArtista, 16 * k);
      doc.addImage(c.firmaArtista, formato, col2Center - width / 2, y - 1 * k, width, height);
    }
  }
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.15 * k);
  if (conAnio) doc.line(contentX + 6 * k, y + 10 * k, contentX + colWidth2 - 6 * k, y + 10 * k);
  doc.line(col2Center - colWidth2 / 2 + 6 * k, y + 10 * k, col2Center + colWidth2 / 2 - 6 * k, y + 10 * k);
  y += 24 * k;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(11 * k);
  doc.setTextColor(20, 20, 20);
  doc.text([c.lugar, fechaLarga(c.fecha, c.idioma)].filter(Boolean).join(", "), W / 2, y, { align: "center" });

  if (c.logo) {
    const formato = formatoImagen(c.logo);
    if (formato) {
      const { width, height } = await medidaAjustada(c.logo, 14 * k);
      doc.addImage(c.logo, formato, W - outerMargin - 8 * k - width, H - outerMargin - 6 * k - height, width, height);
    }
  }

  if (c.sinCopyright) {
    // Sintografia: en lugar del copyright del artista, la aclaracion de que no lo tiene.
    dibujarSinCopyright(doc, c, W / 2, H - outerMargin - 8 * k, k);
  } else if (c.artista) {
    doc.setFont("Inter", "normal");
    doc.setFontSize(8 * k);
    doc.setTextColor(120, 120, 120);
    const derechos = rotulo(c.idioma, "Todos los derechos reservados", "All rights reserved", " · ");
    doc.text(`© ${c.artista} - ${derechos}`, W / 2, H - outerMargin - 8 * k, { align: "center" });
  }

  return new Uint8Array(doc.output("arraybuffer"));
}
