/**
 * Detecta en un texto libre (la biografía) los tramos escritos por años, para mostrarlos como línea de tiempo.
 * Un renglón es una fecha si EMPIEZA con un año o un período ("2019", "2019 – Muestra…", "2015-actualidad: …").
 * Hacen falta al menos dos fechas seguidas: un párrafo suelto que empieza con un año sigue siendo un párrafo.
 */

export interface HitoLineaDeTiempo {
  fecha: string;
  /** Lo que pasó en esa fecha: uno o más textos, en el orden en que están escritos. */
  entradas: string[];
}

export type TramoBiografia = { tipo: "texto"; texto: string } | { tipo: "linea"; hitos: HitoLineaDeTiempo[] };

const ANIO = "(?:18|19|20)\\d{2}";
const HASTA = `(?:\\s*[-–—]\\s*(?:${ANIO}|actualidad|presente|hoy|present|today|now)|[-–/]\\d{2}(?!\\d))`;
// Después de la fecha: un signo (": . | ) - –"), un espacio o el fin del renglón.
const RENGLON_CON_FECHA = new RegExp(
  `^\\s*(?:[-•*·]\\s*)?(${ANIO}${HASTA}?)(?:\\s*[:|)–—-]\\s*|\\.(?!\\d)\\s*|\\s+|$)(.*)$`,
  "i",
);
const VINETA = /^(?:\s*[-•*·]\s*|\s+)/;

interface Candidato {
  hitos: HitoLineaDeTiempo[];
  /** Renglones originales, para devolverlos como texto si al final no había suficientes fechas. */
  renglones: string[];
  /** La última fecha estaba sola en su renglón: lo que sigue es su contenido. */
  fechaSola: boolean;
}

export function tramosDeBiografia(texto: string): TramoBiografia[] {
  const tramos: TramoBiografia[] = [];
  let normales: string[] = [];
  let actual: Candidato | null = null;
  // Renglones en blanco vistos dentro de una posible línea de tiempo: pueden separar fechas o terminarla.
  let blancos = 0;

  const cerrarTexto = () => {
    const unido = normales.join("\n").replace(/^\n+|\n+$/g, "");
    if (unido.trim()) tramos.push({ tipo: "texto", texto: unido });
    normales = [];
  };
  const cerrarLinea = () => {
    if (!actual) return;
    if (actual.hitos.length >= 2) {
      cerrarTexto();
      tramos.push({ tipo: "linea", hitos: actual.hitos });
    } else {
      normales.push(...actual.renglones);
    }
    for (let i = 0; i < blancos; i++) normales.push("");
    actual = null;
    blancos = 0;
  };

  for (const renglon of texto.replace(/\r\n?/g, "\n").split("\n")) {
    const conFecha = RENGLON_CON_FECHA.exec(renglon);
    if (conFecha) {
      actual ??= { hitos: [], renglones: [], fechaSola: false };
      for (let i = 0; i < blancos; i++) actual.renglones.push("");
      blancos = 0;
      const resto = conFecha[2].trim();
      actual.hitos.push({ fecha: conFecha[1].replace(/\s*[-–—]\s*/, " – "), entradas: resto ? [resto] : [] });
      actual.renglones.push(renglon);
      actual.fechaSola = !resto;
      continue;
    }
    if (!actual) {
      normales.push(renglon);
      continue;
    }
    if (!renglon.trim()) {
      blancos++;
      continue;
    }
    const hito = actual.hitos[actual.hitos.length - 1];
    const limpio = renglon.replace(VINETA, "").trim();
    // Bajo una fecha sola, cada renglón es una entrada. Bajo una fecha con texto, solo siguen en ella los renglones
    // con sangría o viñeta, o los que continúan la frase (empiezan en minúscula).
    if (blancos === 0 && actual.fechaSola) {
      hito.entradas.push(limpio);
    } else if (blancos === 0 && VINETA.test(renglon)) {
      hito.entradas.push(limpio);
    } else if (blancos === 0 && hito.entradas.length > 0 && /^\p{Ll}/u.test(limpio)) {
      hito.entradas[hito.entradas.length - 1] += ` ${limpio}`;
    } else {
      cerrarLinea();
      normales.push(renglon);
      continue;
    }
    actual.renglones.push(renglon);
  }
  cerrarLinea();
  cerrarTexto();
  return tramos;
}

/** Si el texto tiene al menos un tramo que se puede mostrar como línea de tiempo. */
export function tieneLineaDeTiempo(texto: string): boolean {
  return tramosDeBiografia(texto).some((t) => t.tipo === "linea");
}
