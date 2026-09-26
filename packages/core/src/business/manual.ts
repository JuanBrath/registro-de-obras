/**
 * Lectura y busqueda del manual del usuario. El manual se escribe en archivos
 * Markdown simples (un archivo por capitulo); aca se convierten en datos que
 * la pantalla del manual muestra, y se arma el buscador.
 *
 * Formato de cada archivo:
 *   # Titulo del capitulo
 *   Una linea de resumen.
 *   ## Titulo de una seccion         (cada seccion es una entrada del buscador)
 *   ### Subtitulo dentro de una seccion
 *   Parrafos, "- " para listas con punto, "1. " para pasos numerados
 *   (con "- " sangrado adentro de un paso o un punto para subpuntos),
 *   "> " para una nota destacada.
 *   **negrita**, `codigo` y [texto](cap:id-del-capitulo) para enlazar a otro capitulo.
 */

export interface ItemLista {
  texto: string;
  subitems: string[];
}

export type BloqueManual =
  | { tipo: "parrafo"; texto: string }
  | { tipo: "subtitulo"; texto: string }
  | { tipo: "nota"; texto: string }
  | { tipo: "lista"; ordenada: boolean; items: ItemLista[] };

export interface SeccionManual {
  id: string;
  titulo: string;
  bloques: BloqueManual[];
  /** Texto de la seccion sin marcas de formato, para buscar y para mostrar fragmentos. */
  textoPlano: string;
}

export interface CapituloManual {
  id: string;
  titulo: string;
  resumen: string;
  secciones: SeccionManual[];
}

export type SegmentoInline =
  | { tipo: "texto"; texto: string }
  | { tipo: "negrita"; texto: string }
  | { tipo: "codigo"; texto: string }
  | { tipo: "enlace"; texto: string; capitulo: string };

const INLINE = /\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(cap:([a-z0-9-]+)\)/g;

/** Separa un texto en tramos normales, en negrita, de codigo y enlaces a otros capitulos. */
export function parsearInline(texto: string): SegmentoInline[] {
  const segmentos: SegmentoInline[] = [];
  let desde = 0;
  for (const m of texto.matchAll(INLINE)) {
    const inicio = m.index ?? 0;
    if (inicio > desde) segmentos.push({ tipo: "texto", texto: texto.slice(desde, inicio) });
    if (m[1] !== undefined) segmentos.push({ tipo: "negrita", texto: m[1] });
    else if (m[2] !== undefined) segmentos.push({ tipo: "codigo", texto: m[2] });
    else segmentos.push({ tipo: "enlace", texto: m[3], capitulo: m[4] });
    desde = inicio + m[0].length;
  }
  if (desde < texto.length) segmentos.push({ tipo: "texto", texto: texto.slice(desde) });
  return segmentos;
}

/** El texto sin las marcas de formato (negritas, codigo, enlaces). */
export function textoSinFormato(texto: string): string {
  return parsearInline(texto)
    .map((s) => s.texto)
    .join("");
}

function slug(titulo: string): string {
  return normalizar(titulo)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function textoPlanoDeBloques(bloques: BloqueManual[]): string {
  const partes: string[] = [];
  for (const b of bloques) {
    if (b.tipo === "lista") {
      for (const item of b.items) {
        partes.push(textoSinFormato(item.texto));
        for (const sub of item.subitems) partes.push(textoSinFormato(sub));
      }
    } else {
      partes.push(textoSinFormato(b.texto));
    }
  }
  return partes.join(" ");
}

const RE_ORDENADA = /^(\d+)\.\s+(.*)$/;
const RE_PUNTO = /^[-*]\s+(.*)$/;

/** Convierte el Markdown de un capitulo en datos. `id` es el nombre con el que otros capitulos lo enlazan. */
export function parsearCapitulo(id: string, markdown: string): CapituloManual {
  const lineas = markdown.replace(/\r\n?/g, "\n").split("\n");
  let titulo = id;
  let seccionActual: { titulo: string; bloques: BloqueManual[] } | null = null;
  const introduccion: BloqueManual[] = [];
  const secciones: { titulo: string; bloques: BloqueManual[] }[] = [];

  const destino = () => (seccionActual ? seccionActual.bloques : introduccion);
  let parrafo: string[] = [];
  let nota: string[] = [];
  let lista: { ordenada: boolean; items: ItemLista[] } | null = null;

  function cerrarParrafo() {
    if (parrafo.length > 0) destino().push({ tipo: "parrafo", texto: parrafo.join(" ") });
    parrafo = [];
  }
  function cerrarNota() {
    if (nota.length > 0) destino().push({ tipo: "nota", texto: nota.join(" ") });
    nota = [];
  }
  function cerrarLista() {
    if (lista) destino().push({ tipo: "lista", ordenada: lista.ordenada, items: lista.items });
    lista = null;
  }
  function cerrarTodo() {
    cerrarParrafo();
    cerrarNota();
    cerrarLista();
  }

  for (const cruda of lineas) {
    const linea = cruda.trimEnd();
    const sangrado = /^\s{2,}/.test(linea);
    const texto = linea.trim();

    if (texto === "") {
      cerrarTodo();
      continue;
    }
    if (!sangrado && texto.startsWith("# ")) {
      cerrarTodo();
      titulo = texto.slice(2).trim();
      continue;
    }
    if (!sangrado && texto.startsWith("## ")) {
      cerrarTodo();
      seccionActual = { titulo: texto.slice(3).trim(), bloques: [] };
      secciones.push(seccionActual);
      continue;
    }
    if (!sangrado && texto.startsWith("### ")) {
      cerrarTodo();
      destino().push({ tipo: "subtitulo", texto: texto.slice(4).trim() });
      continue;
    }
    if (!sangrado && texto.startsWith(">")) {
      cerrarParrafo();
      cerrarLista();
      nota.push(texto.replace(/^>\s?/, ""));
      continue;
    }

    // Un punto sangrado adentro de una lista es un subpunto del ultimo item.
    if (sangrado && lista && lista.items.length > 0) {
      const punto = texto.match(RE_PUNTO);
      if (punto) {
        lista.items[lista.items.length - 1].subitems.push(punto[1]);
        continue;
      }
    }

    const ordenada = !sangrado ? texto.match(RE_ORDENADA) : null;
    const punto = !sangrado ? texto.match(RE_PUNTO) : null;
    if (ordenada || punto) {
      cerrarParrafo();
      cerrarNota();
      const esOrdenada = Boolean(ordenada);
      if (lista && lista.ordenada !== esOrdenada) cerrarLista();
      if (!lista) lista = { ordenada: esOrdenada, items: [] };
      lista.items.push({ texto: (ordenada ? ordenada[2] : punto![1]).trim(), subitems: [] });
      continue;
    }

    // Texto suelto: continuacion del ultimo item de una lista, o parte de un parrafo.
    if (lista && lista.items.length > 0 && sangrado) {
      const ultimo = lista.items[lista.items.length - 1];
      ultimo.texto = `${ultimo.texto} ${texto}`;
      continue;
    }
    cerrarNota();
    cerrarLista();
    parrafo.push(texto);
  }
  cerrarTodo();

  // El primer parrafo antes de la primera seccion es el resumen del capitulo;
  // si queda algo mas, va en una seccion "Introduccion".
  let resumen = "";
  const primero = introduccion[0];
  if (primero?.tipo === "parrafo") {
    resumen = primero.texto;
    introduccion.shift();
  }
  if (introduccion.length > 0) secciones.unshift({ titulo: "Introducción", bloques: introduccion });

  const usados = new Set<string>();
  return {
    id,
    titulo,
    resumen,
    secciones: secciones.map((s) => {
      const base = slug(s.titulo) || "seccion";
      let sid = base;
      for (let n = 2; usados.has(sid); n++) sid = `${base}-${n}`;
      usados.add(sid);
      return { id: sid, titulo: s.titulo, bloques: s.bloques, textoPlano: textoPlanoDeBloques(s.bloques) };
    }),
  };
}

/** Minusculas y sin tildes, para buscar sin que importe como se escribio. Conserva el largo del texto. */
export function normalizar(texto: string): string {
  let salida = "";
  for (const caracter of texto) {
    salida += caracter
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase();
  }
  return salida;
}

// Palabras que no ayudan a encontrar nada ("como cambio la carpeta" busca "cambio" y "carpeta").
const PALABRAS_VACIAS = new Set(
  (
    "a al algo ante como con cual cuales cuando cuanto de del desde donde el ella ellos en entre es esta estas este esto " +
    "hace hacen hacer hago la las le les lo los me mi mis muy no nos o para pero podes puede pueden puedo por que quiero " +
    "quiere se si sin sobre son su sus te tiene tienen tengo ti tu tus un una uno unos unas usar uso y ya"
  ).split(" "),
);

/**
 * Las palabras de una busqueda, normalizadas, sin las palabras vacias y
 * reducidas a su raiz: "copias" busca "copia", "certificados" busca
 * "certifica", "cambio" busca "cambi" (asi encuentra tambien "cambiar").
 */
export function terminosDeBusqueda(consulta: string): string[] {
  const terminos = normalizar(consulta)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2 && !PALABRAS_VACIAS.has(t))
    .map((t) => {
      let raiz = t;
      if (raiz.length >= 5 && raiz.endsWith("es")) raiz = raiz.slice(0, -2);
      else if (raiz.length >= 4 && raiz.endsWith("s")) raiz = raiz.slice(0, -1);
      if (raiz.length >= 8) return raiz.slice(0, -2);
      if (raiz.length >= 6) return raiz.slice(0, -1);
      return raiz;
    });
  return Array.from(new Set(terminos));
}

export interface ResultadoBusqueda {
  capituloId: string;
  capituloTitulo: string;
  seccionId: string;
  seccionTitulo: string;
  /** Un pedazo del texto de la seccion donde aparece lo buscado. */
  fragmento: string;
  puntaje: number;
  /** true si la seccion tiene todas las palabras buscadas; false si solo tiene algunas. */
  completo: boolean;
}

function cuantas(texto: string, termino: string, tope: number): number {
  let n = 0;
  for (let desde = texto.indexOf(termino); desde !== -1 && n < tope; desde = texto.indexOf(termino, desde + termino.length)) n++;
  return n;
}

function fragmentoAlrededor(textoOriginal: string, textoNormalizado: string, terminos: string[]): string {
  const LARGO = 170;
  let posicion = -1;
  if (textoOriginal.length === textoNormalizado.length) {
    for (const t of terminos) {
      const i = textoNormalizado.indexOf(t);
      if (i !== -1 && (posicion === -1 || i < posicion)) posicion = i;
    }
  }
  if (posicion === -1) posicion = 0;
  const inicio = Math.max(0, posicion - 50);
  const fin = Math.min(textoOriginal.length, inicio + LARGO);
  const corte = textoOriginal.slice(inicio, fin).trim();
  return `${inicio > 0 ? "…" : ""}${corte}${fin < textoOriginal.length ? "…" : ""}`;
}

/**
 * Busca en todo el manual. Si alguna seccion tiene TODAS las palabras
 * buscadas (en su titulo, en el titulo del capitulo o en su texto), se
 * muestran solo esas; si no, se muestran las que tienen al menos la mitad de
 * las palabras (marcadas como `completo: false`). Van primero las que tienen
 * las palabras en el titulo.
 */
export function buscarEnManual(capitulos: CapituloManual[], consulta: string, limite = 30): ResultadoBusqueda[] {
  const terminos = terminosDeBusqueda(consulta);
  if (terminos.length === 0) return [];

  const candidatos: (ResultadoBusqueda & { orden: number; presentes: number })[] = [];
  let orden = 0;
  for (const cap of capitulos) {
    const tituloCap = normalizar(cap.titulo);
    for (const sec of cap.secciones) {
      orden++;
      const tituloSec = normalizar(sec.titulo);
      const cuerpo = normalizar(sec.textoPlano);
      const presentes = terminos.filter((t) => tituloSec.includes(t) || tituloCap.includes(t) || cuerpo.includes(t));
      if (presentes.length === 0) continue;

      let puntaje = presentes.length * 20;
      for (const t of presentes) {
        if (tituloSec.includes(t)) puntaje += 8;
        if (tituloCap.includes(t)) puntaje += 3;
        puntaje += cuantas(cuerpo, t, 5);
      }
      candidatos.push({
        capituloId: cap.id,
        capituloTitulo: cap.titulo,
        seccionId: sec.id,
        seccionTitulo: sec.titulo,
        fragmento: fragmentoAlrededor(sec.textoPlano, cuerpo, presentes),
        puntaje,
        completo: presentes.length === terminos.length,
        orden,
        presentes: presentes.length,
      });
    }
  }

  const hayCompletos = candidatos.some((r) => r.completo);
  const minimo = Math.ceil(terminos.length / 2);
  const elegidos = hayCompletos ? candidatos.filter((r) => r.completo) : candidatos.filter((r) => r.presentes >= minimo);
  elegidos.sort((a, b) => b.puntaje - a.puntaje || a.orden - b.orden);
  return elegidos.slice(0, limite).map(({ orden: _orden, presentes: _presentes, ...r }) => r);
}

/** Parte un texto en tramos, marcando cuales contienen alguna de las palabras buscadas (ya normalizadas). */
export function resaltar(texto: string, terminos: string[]): { texto: string; coincide: boolean }[] {
  if (terminos.length === 0) return [{ texto, coincide: false }];
  const normalizado = normalizar(texto);
  // Si la normalizacion cambio el largo no se pueden alinear las posiciones: se muestra sin resaltar.
  if (normalizado.length !== texto.length) return [{ texto, coincide: false }];

  const esLetra = (c: string) => /[a-z0-9]/.test(c);
  const marcado = new Array<boolean>(texto.length).fill(false);
  for (const t of terminos) {
    for (let i = normalizado.indexOf(t); i !== -1; i = normalizado.indexOf(t, i + 1)) {
      // Se marca la palabra entera ("cambi" resalta "cambiar"), no solo el pedazo buscado.
      let ini = i;
      while (ini > 0 && esLetra(normalizado[ini - 1])) ini--;
      let fin = i + t.length;
      while (fin < normalizado.length && esLetra(normalizado[fin])) fin++;
      for (let k = ini; k < fin; k++) marcado[k] = true;
    }
  }
  const tramos: { texto: string; coincide: boolean }[] = [];
  let inicio = 0;
  for (let i = 1; i <= texto.length; i++) {
    if (i === texto.length || marcado[i] !== marcado[inicio]) {
      tramos.push({ texto: texto.slice(inicio, i), coincide: marcado[inicio] });
      inicio = i;
    }
  }
  return tramos;
}
