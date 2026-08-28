import { drawSignatureBlock } from "../utils/pdfBranding.js";
import { nuevoDocConMembrete, type InformeBrandingOpts } from "./reportPdfBase.js";

export interface ObraListadoImagen {
  bytes: Uint8Array;
  formato: "PNG" | "JPEG";
  /** Ancho/alto ya ajustados (aspect ratio preservado) al tamano de celda, calculados afuera con fittedImageSize. */
  width: number;
  height: number;
}

export interface ObraListadoItem {
  celdas: string[];
  imagen?: ObraListadoImagen | null;
}

const IMG_CELL_SIZE = 18;

/**
 * Listado tabular de obras (resumido, con o sin miniatura): una fila por
 * obra, respetando el orden/filtro ya aplicado por el llamador. La columna
 * de imagen (si `conImagen`) se dibuja con `didDrawCell` porque
 * jspdf-autotable no soporta imagenes dentro de una celda de forma nativa;
 * el tamano de cada imagen ya viene precalculado (fittedImageSize es
 * async, y los hooks de autotable son sincronicos).
 */
export async function buildObrasListadoPdfBytes(
  titulo: string,
  headers: string[],
  items: ObraListadoItem[],
  conImagen: boolean,
  opts: InformeBrandingOpts,
): Promise<Uint8Array> {
  const { default: autoTable } = await import("jspdf-autotable");
  const { doc, marginLeft, startY } = await nuevoDocConMembrete(titulo, opts);

  autoTable(doc, {
    startY,
    styles: { font: "Inter", fontSize: 9, valign: "middle" },
    headStyles: { fontStyle: "normal" },
    head: [conImagen ? ["", ...headers] : headers],
    body: items.map((item) => (conImagen ? ["", ...item.celdas] : item.celdas)),
    columnStyles: conImagen ? { 0: { cellWidth: IMG_CELL_SIZE + 4, minCellHeight: IMG_CELL_SIZE + 4 } } : {},
    didDrawCell: (data) => {
      if (!conImagen || data.section !== "body" || data.column.index !== 0) return;
      const imagen = items[data.row.index]?.imagen;
      if (!imagen) return;
      const x = data.cell.x + (data.cell.width - imagen.width) / 2;
      const y = data.cell.y + (data.cell.height - imagen.height) / 2;
      doc.addImage(imagen.bytes, imagen.formato, x, y, imagen.width, imagen.height);
    },
  });

  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? startY;
  await drawSignatureBlock(doc, finalY + 10, {
    idioma: opts.idioma,
    firma: opts.firma,
    firmaBytes: opts.firmaBytes,
    marginLeft,
  });

  return new Uint8Array(doc.output("arraybuffer"));
}
