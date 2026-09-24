import { copiaConPA, type Certificado } from "../certificado.js";
import { altoRenglon, formatoImagen, medidaAjustada, nuevoDocumento, rotulo } from "./base.js";

/**
 * Certificado "simple": titulo con una linea debajo, la foto, y los datos
 * como renglones centrados ("Autor: ...", "Año: ..."). Abajo a la derecha
 * el lugar y año, y la linea de firma con el nombre del autor. Sin marco.
 * Tomado del diseño "Certificados 2.psd" del usuario; las medidas estan en
 * mm sobre A4 y se multiplican por `k` para adaptarse a la hoja elegida.
 */
export async function generarSimple(c: Certificado): Promise<Uint8Array> {
  const { doc, W, k } = await nuevoDocumento(c);
  const centro = W / 2;
  const r = (es: string, en: string) => rotulo(c.idioma, es, en);

  doc.setFont("times", "bold");
  doc.setTextColor(20, 20, 20);
  let tituloY = 22.5 * k;
  if (c.idioma === "ambos") {
    doc.setFontSize(17 * k);
    doc.text("CERTIFICADO DE AUTENTICIDAD", centro, tituloY, { align: "center" });
    tituloY += 6.5 * k;
    doc.setFontSize(12 * k);
    doc.text("CERTIFICATE OF AUTHENTICITY", centro, tituloY, { align: "center" });
  } else {
    doc.setFontSize(17 * k);
    doc.text(c.idioma === "en" ? "CERTIFICATE OF AUTHENTICITY" : "CERTIFICADO DE AUTENTICIDAD", centro, tituloY, { align: "center" });
  }
  const reglaY = tituloY + 2.5 * k;
  doc.setDrawColor(20, 20, 20);
  doc.setLineWidth(0.5 * k);
  doc.line(centro - 77 * k, reglaY, centro + 77 * k, reglaY);

  let y = reglaY + 11.5 * k;
  if (c.imagen) {
    const formato = formatoImagen(c.imagen);
    if (formato) {
      const { width, height } = await medidaAjustada(c.imagen, 110 * k, 75 * k);
      doc.addImage(c.imagen, formato, centro - width / 2, y, width, height);
      y += height;
    }
  }
  y += 19 * k;

  const copia = copiaConPA(c);
  const renglones = [
    c.artista && `${r("Autor", "Artist")}: ${c.artista}`,
    c.titulo && `${r("Obra", "Title")}: “${c.titulo}”`,
    // Con los dos idiomas la frase larga no entra en un renglon; se abrevia.
    c.serieProyecto &&
      (c.idioma === "ambos"
        ? `Serie / Series: “${c.serieProyecto}”`
        : `${r("Perteneciente a la serie", "From the series")} “${c.serieProyecto}”`),
    c.anioToma && `${r("Año", "Year")}: ${c.anioToma}`,
    c.medidas && `${r("Medida", "Size")} ${c.medidas}`,
    c.captura,
    c.impresion,
    copia && `${r("Serie Número", "Edition")}: ${copia}`,
  ].filter(Boolean) as string[];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(17 * k);
  const anchoTexto = W - 50 * k;
  const renglonInterno = altoRenglon(17 * k);
  for (const renglon of renglones) {
    // Un renglon puede tener varias lineas (ej. impresion en una y papel en otra).
    const lineas = doc.splitTextToSize(renglon, anchoTexto) as string[];
    lineas.forEach((linea, i) => doc.text(linea, centro, y + i * renglonInterno, { align: "center" }));
    y += (lineas.length - 1) * renglonInterno + 12.7 * k;
  }

  // Lugar, firma y nombre: a la derecha, a la altura del diseño original,
  // o mas abajo si los renglones de arriba ocuparon mas lugar.
  const columnaFirma = W / 2 + 38.5 * k;
  const lugarY = Math.max(y + 10 * k, 237 * k);
  const anio = c.fecha.slice(0, 4);
  doc.setFontSize(17 * k);
  doc.text([c.lugar, anio].filter(Boolean).join(", "), columnaFirma, lugarY, { align: "center" });

  const firmaY = lugarY + 18 * k;
  if (c.firmaArtista) {
    const formato = formatoImagen(c.firmaArtista);
    if (formato) {
      const { width, height } = await medidaAjustada(c.firmaArtista, 50 * k, 14 * k);
      doc.addImage(c.firmaArtista, formato, columnaFirma - width / 2, firmaY - height - 1 * k, width, height);
    }
  }
  doc.setDrawColor(60, 60, 60);
  doc.setLineWidth(0.25 * k);
  doc.line(columnaFirma - 50 * k, firmaY, columnaFirma + 50 * k, firmaY);
  if (c.artista) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(14 * k);
    doc.setTextColor(50, 50, 50);
    doc.text(c.artista, columnaFirma, firmaY + 7 * k, { align: "center" });
  }

  return new Uint8Array(doc.output("arraybuffer"));
}
