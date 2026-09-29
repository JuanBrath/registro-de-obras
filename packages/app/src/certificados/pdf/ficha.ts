import { copiaConPA, type Certificado } from "../certificado.js";
import { altoRenglon, formatoImagen, medidaAjustada, nuevoDocumento, rotulo } from "./base.js";
import { dibujarSinCopyright } from "./sinCopyright.js";

/**
 * Certificado "tipo ficha": grilla con los datos
 * basicos de la obra, firma del artista (y de la galeria, si se cargo) una
 * al lado de la otra, y logo + contacto junto a una foto de la obra al pie.
 * Tomado de buildCoaFichaPdfBytes de Galeris Studio; todas las medidas van
 * multiplicadas por `k` para adaptarse a la hoja elegida.
 */
export async function generarFicha(c: Certificado): Promise<Uint8Array> {
  const { doc, W, H, k } = await nuevoDocumento(c);
  // Titulo de un campo: "Autor:", "Author:" o "Autor | Author:".
  const r = (es: string, en: string) => {
    const t = rotulo(c.idioma, es, en, " | ");
    return t.endsWith("?") ? t : `${t}:`;
  };

  const outerMargin = 10 * k;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.6 * k);
  doc.rect(outerMargin, outerMargin, W - outerMargin * 2, H - outerMargin * 2);

  // Con los dos idiomas el titulo va en dos lineas: en una sola no entra
  // en el ancho de la hoja.
  doc.setFont("helvetica", "bolditalic");
  doc.setFontSize(15 * k);
  doc.setTextColor(0, 0, 0);
  if (c.idioma === "ambos") {
    doc.text("CERTIFICADO DE AUTENTICIDAD DE ARTE", W / 2, outerMargin + 14 * k, { align: "center" });
    doc.text("CERTIFICATE OF AUTHENTICITY ARTWORK", W / 2, outerMargin + 21 * k, { align: "center" });
  } else {
    const titulo = c.idioma === "en" ? "CERTIFICATE OF AUTHENTICITY ARTWORK" : "CERTIFICADO DE AUTENTICIDAD DE ARTE";
    doc.text(titulo, W / 2, outerMargin + 17.5 * k, { align: "center" });
  }

  const tableX = 18 * k;
  const tableWidth = W - tableX * 2;

  // Cada fila reparte el ancho completo de la tabla entre sus celdas. Alto
  // de fila dinamico: algunas etiquetas bilingues son largas y no entran en
  // una sola linea, asi que se envuelven y la fila crece para acomodarlas.
  type Celda = { label: string; value?: string };
  // Las celdas sin completar no se imprimen; si una fila queda vacia, no aparece.
  function fichaFila(todas: Celda[], y: number): number {
    const celdas = todas.filter((cel) => cel.value);
    if (celdas.length === 0) return y;
    const colX = celdas.map((_, i) => tableX + (tableWidth / celdas.length) * i);
    const colWidths = celdas.map(() => tableWidth / celdas.length - 4 * k);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10 * k);
    const labelLineas = celdas.map((cel, i) => doc.splitTextToSize(cel.label, colWidths[i]) as string[]);
    doc.setFont("times", "italic");
    doc.setFontSize(10.5 * k);
    const valorLineas = celdas.map((cel, i) => (cel.value ? (doc.splitTextToSize(cel.value, colWidths[i]) as string[]) : []));
    const renglonLabel = altoRenglon(10 * k);
    const renglonValor = altoRenglon(10.5 * k);
    const labelBlockHeight = Math.max(...labelLineas.map((l) => l.length)) * renglonLabel;
    const valorLineCount = Math.max(0, ...valorLineas.map((l) => l.length));
    const rowHeight = Math.max(13 * k, 4 * k + labelBlockHeight + (valorLineCount > 0 ? valorLineCount * renglonValor + 2 * k : 0));

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.25 * k);
    doc.line(tableX, y, tableX + tableWidth, y);
    celdas.forEach((_celda, i) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10 * k);
      doc.text(labelLineas[i], colX[i] + 2 * k, y + 4.5 * k);
      if (valorLineas[i].length > 0) {
        doc.setFont("times", "italic");
        doc.setFontSize(10.5 * k);
        doc.text(valorLineas[i], colX[i] + 2 * k, y + 4.5 * k + labelLineas[i].length * renglonLabel + 4 * k);
      }
      if (i > 0) doc.line(colX[i], y, colX[i], y + rowHeight);
    });
    doc.line(tableX, y + rowHeight, tableX + tableWidth, y + rowHeight);
    return y + rowHeight;
  }

  let y = outerMargin + 30 * k;
  y = fichaFila([{ label: r("Autor", "Author"), value: c.artista }], y);
  y = fichaFila([{ label: r("Reside", "Based"), value: c.artistaReside }], y);
  y = fichaFila(
    [
      { label: r("Título de la obra", "Title of artwork"), value: c.titulo },
      { label: r("Año", "Year"), value: c.anioToma },
    ],
    y,
  );
  y = fichaFila(
    [
      { label: r("Disciplina", "Medium type"), value: c.captura },
      { label: r("Materiales", "Materials"), value: c.impresion },
    ],
    y,
  );
  y = fichaFila(
    [
      { label: r("Es parte de una serie", "Is this part of a series?"), value: c.serieProyecto },
      { label: r("N° de obra", "# of artwork"), value: copiaConPA(c) },
    ],
    y,
  );
  y = fichaFila([{ label: r("Medidas", "Dimensions"), value: c.medidas }], y);
  y = fichaFila([{ label: r("Ubicación de la firma", "Placement of signature"), value: c.ubicacionFirma }], y);

  // Firmas. La de la galeria solo aparece si se cargaron datos de galeria:
  // un fotografo que vende directo no necesita esa segunda linea.
  y += 14 * k;
  const conGaleria = !c.sinFirmaGaleria && Boolean(c.galeriaNombre || c.galeriaFirma);
  const firmas: { bytes: Uint8Array | null; caption: string }[] = [
    { bytes: c.firmaArtista, caption: rotulo(c.idioma, "Firma del artista", "Artist signature", " | ") },
  ];
  if (conGaleria) {
    firmas.push({ bytes: c.galeriaFirma, caption: rotulo(c.idioma, "Firma de la galería", "Gallery owner signature", " | ") });
  }
  const firmaColWidth = tableWidth / 2;
  for (let i = 0; i < firmas.length; i++) {
    const x = tableX + firmaColWidth * i;
    const { bytes, caption } = firmas[i];
    if (bytes) {
      const formato = formatoImagen(bytes);
      if (formato) {
        const { width, height } = await medidaAjustada(bytes, 22 * k);
        doc.addImage(bytes, formato, x + 6 * k, y - height - 2 * k, width, height);
      }
    }
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2 * k);
    doc.line(x + 6 * k, y, x + firmaColWidth - 10 * k, y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11 * k);
    doc.text(caption, x + 6 * k, y + 6 * k);
  }

  const footerY = H - outerMargin - 34 * k;
  let contactoX = tableX;
  if (c.logo) {
    const formato = formatoImagen(c.logo);
    if (formato) {
      const { width, height } = await medidaAjustada(c.logo, 18 * k);
      doc.addImage(c.logo, formato, tableX, footerY, width, height);
      contactoX = tableX + 24 * k;
    }
  }
  doc.setFont("Inter", "normal");
  doc.setFontSize(9 * k);
  doc.setTextColor(0, 0, 0);
  const contacto = [c.galeriaNombre, c.galeriaTelefono, c.galeriaEmail].filter(Boolean).join("  |  ");
  if (contacto) doc.text(contacto, contactoX, footerY + 12 * k);

  if (c.imagen) {
    const formato = formatoImagen(c.imagen);
    if (formato) {
      const caja = 32 * k;
      const { width, height } = await medidaAjustada(c.imagen, caja);
      doc.addImage(c.imagen, formato, tableX + tableWidth - width, footerY - caja + 2 * k, width, height);
    }
  }

  if (c.sinCopyright) dibujarSinCopyright(doc, c, W / 2, H - outerMargin - 6 * k, k);

  return new Uint8Array(doc.output("arraybuffer"));
}
