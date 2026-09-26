import { parsearInline, textoParaPdf, type BloqueManual, type CapituloManual } from "@registro/core";
import { GALERIS_GOLD, dibujarLogo, registerBrandFonts } from "../utils/pdfBranding.js";

// Hoja A4 vertical, medidas en mm.
const ANCHO_HOJA = 210;
const ALTO_HOJA = 297;
const MARGEN_X = 20;
const MARGEN_SUPERIOR = 20;
const MARGEN_INFERIOR = 22;
const ANCHO_TEXTO = ANCHO_HOJA - MARGEN_X * 2;

const TAMANO_TEXTO = 10;
const INTERLINEADO = 5;

type Estilo = "normal" | "negrita";
/** Una palabra suelta con su estilo; `pegado` = va sin espacio despues de la anterior (por ejemplo, un punto despues de una negrita). */
interface Palabra {
  texto: string;
  estilo: Estilo;
  pegado: boolean;
}
interface Tramo {
  texto: string;
  estilo: Estilo;
  x: number;
}
interface Linea {
  tramos: Tramo[];
  ancho: number;
}

export interface OpcionesManualPdf {
  /** Solo este capitulo. Si no se indica, sale el manual completo (con portada e indice). */
  capituloId?: string;
}

/** La fecha de hoy en la computadora (no en UTC), como DD/MM/AAAA. */
function fechaDeHoy(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

/**
 * Arma el PDF del manual para imprimirlo: portada, indice con el numero de
 * pagina de cada capitulo, los capitulos (titulos, pasos, listas y notas) y
 * el numero de pagina al pie. Los enlaces entre capitulos, que en papel no se
 * pueden tocar, llevan al lado el numero del capitulo: "Mi perfil (cap. 4)".
 */
export async function generarManualPdf(capitulos: CapituloManual[], opciones: OpcionesManualPdf = {}): Promise<Uint8Array> {
  const { default: JsPdf } = await import("jspdf");
  const doc = new JsPdf({ unit: "mm", format: "a4" });
  await registerBrandFonts(doc);

  const numeroDe = new Map(capitulos.map((c, i) => [c.id, i + 1]));
  const incluidos = opciones.capituloId ? capitulos.filter((c) => c.id === opciones.capituloId) : capitulos;
  const completo = !opciones.capituloId;

  let y = MARGEN_SUPERIOR;

  // ---------- utilidades de texto ----------

  function fuente(estilo: Estilo, puntos: number) {
    doc.setFont("helvetica", estilo === "negrita" ? "bold" : "normal");
    doc.setFontSize(puntos);
  }

  /**
   * Ancho de un texto con la fuente actual, sin el ajuste entre letras ("kerning"): jsPDF lo aplica al medir
   * pero no al dibujar, y entonces los espacios despues de palabras como "Todo" o "Ver" quedaban apretados.
   */
  function medir(texto: string): number {
    return (doc.getStringUnitWidth(texto, { doKerning: false }) * doc.getFontSize()) / doc.internal.scaleFactor;
  }

  function ancho(texto: string, estilo: Estilo, puntos: number): number {
    fuente(estilo, puntos);
    return medir(texto);
  }

  function palabrasDe(texto: string): Palabra[] {
    const palabras: Palabra[] = [];
    let hayEspacio = true;
    function agregar(contenido: string, estilo: Estilo) {
      for (const parte of textoParaPdf(contenido).split(/(\s+)/)) {
        if (parte === "") continue;
        if (/^\s+$/.test(parte)) {
          hayEspacio = true;
          continue;
        }
        palabras.push({ texto: parte, estilo, pegado: !hayEspacio });
        hayEspacio = false;
      }
    }
    for (const segmento of parsearInline(texto)) {
      agregar(segmento.texto, segmento.tipo === "negrita" ? "negrita" : "normal");
      if (segmento.tipo === "enlace") {
        const numero = numeroDe.get(segmento.capitulo);
        if (numero !== undefined) {
          hayEspacio = true;
          agregar(`(cap. ${numero})`, "normal");
        }
      }
    }
    return palabras;
  }

  /** Reparte las palabras en renglones que entren en `anchoLinea`. */
  function armarLineas(texto: string, anchoLinea: number, puntos: number, estiloBase: Estilo = "normal"): Linea[] {
    const espacio = ancho(" ", "normal", puntos);
    // Las palabras pegadas (sin espacio) forman un bloque que no se corta.
    const bloques: Palabra[][] = [];
    for (const palabra of palabrasDe(texto)) {
      if (palabra.pegado && bloques.length > 0) bloques[bloques.length - 1].push(palabra);
      else bloques.push([palabra]);
    }
    const lineas: Linea[] = [];
    let actual: Linea = { tramos: [], ancho: 0 };
    for (const bloque of bloques) {
      const estiloDe = (p: Palabra): Estilo => (estiloBase === "negrita" ? "negrita" : p.estilo);
      const anchoBloque = bloque.reduce((suma, p) => suma + ancho(p.texto, estiloDe(p), puntos), 0);
      const necesitaEspacio = actual.tramos.length > 0;
      if (necesitaEspacio && actual.ancho + espacio + anchoBloque > anchoLinea) {
        lineas.push(actual);
        actual = { tramos: [], ancho: 0 };
      } else if (necesitaEspacio) {
        actual.ancho += espacio;
      }
      for (const p of bloque) {
        actual.tramos.push({ texto: p.texto, estilo: estiloDe(p), x: actual.ancho });
        actual.ancho += ancho(p.texto, estiloDe(p), puntos);
      }
    }
    if (actual.tramos.length > 0) lineas.push(actual);
    return lineas;
  }

  function nuevaPagina() {
    doc.addPage();
    y = MARGEN_SUPERIOR;
  }

  function asegurarEspacio(alto: number) {
    if (y + alto > ALTO_HOJA - MARGEN_INFERIOR) nuevaPagina();
  }

  function dibujarLinea(linea: Linea, x: number, puntos: number) {
    for (const tramo of linea.tramos) {
      fuente(tramo.estilo, puntos);
      doc.text(tramo.texto, x + tramo.x, y);
    }
  }

  /** Escribe un texto con formato (negritas, enlaces) desde `x`, pasando de pagina si hace falta. */
  function escribir(texto: string, x: number, anchoLinea: number, opciones: { puntos?: number; estilo?: Estilo; interlineado?: number } = {}) {
    const puntos = opciones.puntos ?? TAMANO_TEXTO;
    const interlineado = opciones.interlineado ?? INTERLINEADO;
    doc.setTextColor(30, 30, 30);
    for (const linea of armarLineas(texto, anchoLinea, puntos, opciones.estilo)) {
      asegurarEspacio(interlineado);
      dibujarLinea(linea, x, puntos);
      y += interlineado;
    }
  }

  // ---------- bloques ----------

  function bloqueLista(bloque: Extract<BloqueManual, { tipo: "lista" }>) {
    bloque.items.forEach((item, i) => {
      asegurarEspacio(INTERLINEADO * 2);
      fuente("normal", TAMANO_TEXTO);
      doc.setTextColor(30, 30, 30);
      doc.text(bloque.ordenada ? `${i + 1}.` : "•", MARGEN_X + (bloque.ordenada ? 1 : 2), y);
      escribir(item.texto, MARGEN_X + 8, ANCHO_TEXTO - 8);
      for (const sub of item.subitems) {
        asegurarEspacio(INTERLINEADO * 2);
        fuente("normal", TAMANO_TEXTO);
        doc.text("–", MARGEN_X + 10, y);
        escribir(sub, MARGEN_X + 15, ANCHO_TEXTO - 15);
      }
      y += 1;
    });
    y += 1.5;
  }

  function bloqueNota(texto: string) {
    const sangria = 6;
    const lineas = armarLineas(texto, ANCHO_TEXTO - sangria - 3, TAMANO_TEXTO);
    const alto = lineas.length * INTERLINEADO + 4;
    asegurarEspacio(alto);
    doc.setFillColor(246, 243, 233);
    doc.rect(MARGEN_X, y - 3.6, ANCHO_TEXTO, alto, "F");
    doc.setFillColor(...GALERIS_GOLD);
    doc.rect(MARGEN_X, y - 3.6, 1.2, alto, "F");
    doc.setTextColor(30, 30, 30);
    for (const linea of lineas) {
      dibujarLinea(linea, MARGEN_X + sangria, TAMANO_TEXTO);
      y += INTERLINEADO;
    }
    y += 3.5;
  }

  function bloque(b: BloqueManual) {
    if (b.tipo === "parrafo") {
      escribir(b.texto, MARGEN_X, ANCHO_TEXTO);
      y += 2;
    } else if (b.tipo === "subtitulo") {
      asegurarEspacio(INTERLINEADO * 4);
      y += 2;
      escribir(b.texto, MARGEN_X, ANCHO_TEXTO, { puntos: 10.5, estilo: "negrita" });
      y += 0.5;
    } else if (b.tipo === "nota") {
      bloqueNota(b.texto);
    } else {
      bloqueLista(b);
    }
  }

  function tituloCapitulo(numero: number, capitulo: CapituloManual) {
    doc.setFont("Montserrat", "bold");
    doc.setFontSize(19);
    doc.setTextColor(...GALERIS_GOLD);
    const lineas = doc.splitTextToSize(`${numero}. ${textoParaPdf(capitulo.titulo)}`, ANCHO_TEXTO) as string[];
    doc.text(lineas, MARGEN_X, y);
    y += lineas.length * 8;
    doc.setDrawColor(...GALERIS_GOLD);
    doc.setLineWidth(0.6);
    doc.line(MARGEN_X, y - 3, MARGEN_X + ANCHO_TEXTO, y - 3);
    y += 3;
    if (capitulo.resumen) {
      doc.setTextColor(90, 90, 90);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(11);
      const resumen = doc.splitTextToSize(textoParaPdf(capitulo.resumen), ANCHO_TEXTO) as string[];
      doc.text(resumen, MARGEN_X, y);
      y += resumen.length * 5.5 + 3;
    }
  }

  function tituloSeccion(titulo: string) {
    asegurarEspacio(28);
    y += 4;
    doc.setFont("Montserrat", "bold");
    doc.setFontSize(12.5);
    doc.setTextColor(25, 25, 25);
    const lineas = doc.splitTextToSize(textoParaPdf(titulo), ANCHO_TEXTO) as string[];
    doc.text(lineas, MARGEN_X, y);
    y += lineas.length * 5.5;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.25);
    doc.line(MARGEN_X, y - 3, MARGEN_X + ANCHO_TEXTO, y - 3);
    y += 2.5;
  }

  // ---------- portada e indice ----------

  const paginaDeCapitulo = new Map<string, number>();

  if (completo) {
    await dibujarLogo(doc, null, (ANCHO_HOJA - 30) / 2, 60, 30);
    doc.setFont("Montserrat", "bold");
    doc.setFontSize(30);
    doc.setTextColor(...GALERIS_GOLD);
    doc.text("Manual del usuario", ANCHO_HOJA / 2, 115, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(15);
    doc.setTextColor(70, 70, 70);
    doc.text("Galeris Studio", ANCHO_HOJA / 2, 127, { align: "center" });
    doc.setFontSize(10.5);
    doc.setTextColor(120, 120, 120);
    doc.text("Guía paso a paso, ordenada por pantallas", ANCHO_HOJA / 2, 136, { align: "center" });
    doc.text(`Generado el ${fechaDeHoy()}`, ANCHO_HOJA / 2, ALTO_HOJA - 30, { align: "center" });
    doc.addPage(); // pagina del indice; se completa al final, cuando se sabe en que pagina empieza cada capitulo
  }

  // ---------- capitulos ----------

  incluidos.forEach((capitulo, i) => {
    if (i > 0 || completo) doc.addPage();
    y = MARGEN_SUPERIOR;
    paginaDeCapitulo.set(capitulo.id, doc.getNumberOfPages());
    tituloCapitulo(numeroDe.get(capitulo.id) ?? i + 1, capitulo);
    for (const seccion of capitulo.secciones) {
      tituloSeccion(seccion.titulo);
      for (const b of seccion.bloques) bloque(b);
    }
  });

  // ---------- indice (pagina 2) ----------

  if (completo) {
    doc.setPage(2);
    let yi = MARGEN_SUPERIOR;
    doc.setFont("Montserrat", "bold");
    doc.setFontSize(19);
    doc.setTextColor(...GALERIS_GOLD);
    doc.text("Índice", MARGEN_X, yi);
    doc.setDrawColor(...GALERIS_GOLD);
    doc.setLineWidth(0.6);
    doc.line(MARGEN_X, yi + 3, MARGEN_X + ANCHO_TEXTO, yi + 3);
    yi += 14;
    for (const capitulo of incluidos) {
      const numero = numeroDe.get(capitulo.id) ?? 0;
      const pagina = String(paginaDeCapitulo.get(capitulo.id) ?? "");
      fuente("normal", 11);
      doc.setTextColor(30, 30, 30);
      const titulo = `${numero}.  ${textoParaPdf(capitulo.titulo)}`;
      doc.text(titulo, MARGEN_X, yi);
      const anchoTitulo = medir(titulo);
      const anchoPagina = medir(pagina);
      // Puntos entre el titulo y el numero de pagina.
      doc.setTextColor(150, 150, 150);
      const puntos = ".".repeat(Math.max(2, Math.floor((ANCHO_TEXTO - anchoTitulo - anchoPagina - 4) / medir("."))));
      doc.text(puntos, MARGEN_X + anchoTitulo + 2, yi);
      doc.setTextColor(30, 30, 30);
      doc.text(pagina, MARGEN_X + ANCHO_TEXTO, yi, { align: "right" });
      yi += 8.5;
    }
  }

  // ---------- pie de pagina ----------

  const total = doc.getNumberOfPages();
  for (let pagina = completo ? 2 : 1; pagina <= total; pagina++) {
    doc.setPage(pagina);
    doc.setDrawColor(210, 210, 210);
    doc.setLineWidth(0.2);
    doc.line(MARGEN_X, ALTO_HOJA - 15, MARGEN_X + ANCHO_TEXTO, ALTO_HOJA - 15);
    fuente("normal", 8.5);
    doc.setTextColor(130, 130, 130);
    doc.text("Galeris · Manual del usuario", MARGEN_X, ALTO_HOJA - 10);
    doc.text(`Página ${pagina} de ${total}`, MARGEN_X + ANCHO_TEXTO, ALTO_HOJA - 10, { align: "right" });
  }

  return new Uint8Array(doc.output("arraybuffer"));
}
