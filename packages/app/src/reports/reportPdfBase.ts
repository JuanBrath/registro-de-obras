import type { jsPDF } from "jspdf";
import type { InformeIdioma } from "./informeIdioma.js";
import { drawPdfHeader, type FirmaEleccion } from "../utils/pdfBranding.js";

/** Opciones comunes a cualquier informe en PDF: idioma elegido, membrete, logo y firma. */
export interface InformeBrandingOpts {
  idioma: InformeIdioma;
  logoBytes: Uint8Array | null;
  incluirLogo: boolean;
  firma: FirmaEleccion;
  firmaBytes: Uint8Array | null;
  /** Localidad del autor/galeria a mostrar arriba a la derecha del membrete, junto a la fecha del dia. */
  localidad?: string | null;
  /** Si se muestra la fecha del dia en el membrete, junto a la localidad. */
  incluirFecha?: boolean;
}

/** Arranca un documento A4 con el membrete (logo propio, monograma GS, o sin logo segun `opts.incluirLogo`) ya dibujado. */
export async function nuevoDocConMembrete(
  titulo: string,
  opts: InformeBrandingOpts,
): Promise<{ doc: jsPDF; marginLeft: number; startY: number }> {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const marginLeft = 14;
  const startY = await drawPdfHeader(doc, titulo, {
    marginLeft,
    logoBytes: opts.logoBytes,
    incluirLogo: opts.incluirLogo,
    localidad: opts.localidad,
    incluirFecha: opts.incluirFecha,
  });
  return { doc, marginLeft, startY };
}
