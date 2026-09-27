/**
 * Lo que manda el complemento de Lightroom Classic (carpeta lightroom/GalerisStudio.lrplugin del
 * proyecto): un archivo `entrada.json` en la carpeta "lightroom-entrada" de los datos del programa,
 * junto a la foto preparada. Ese archivo viene de afuera, asi que se revisa todo: lo que no sirve
 * se ignora en vez de romper. Aca solo esta la parte pura (sin leer archivos), para poder probarla.
 */

export interface EnvioLightroom {
  /** Identifica el envio (el complemento pone la hora). */
  id: string;
  titulo: string;
  /** Fecha de captura, AAAA-MM-DD, o "". */
  fechaCaptura: string;
  palabrasClave: string[];
  /** Estrellas de 1 a 5, o null si la foto no esta calificada. */
  calificacion: number | null;
  /** Como los muestra Galeris Studio en "Datos de captura" (ej. "Canon EOS R5", "1/250", "f/2.8", "50mm"). */
  camara: string;
  iso: string;
  velocidadObturador: string;
  diafragma: string;
  distanciaFocal: string;
  /** Donde esta el archivo original (el de Lightroom), o "". */
  rutaOriginal: string;
  /** Nombre de la foto preparada, dentro de la misma carpeta, o "" si no sirve. */
  imagen: string;
}

const texto = (valor: unknown): string => (typeof valor === "string" ? valor.trim() : "");

const numero = (s: string): string => s.replace(",", ".");

/** "1/250 sec" -> "1/250"; "2 sec" o "2" -> "2s"; "0.5 sec" -> "0.5s". Lo que no se entiende queda "". */
export function normalizarVelocidad(valor: string): string {
  const fraccion = valor.match(/^\s*(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)/);
  if (fraccion) return `${numero(fraccion[1])}/${numero(fraccion[2])}`;
  const segundos = valor.match(/^\s*(\d+(?:[.,]\d+)?)\s*(?:s|sec|secs|seg|segundos?|seconds?)?\s*$/i);
  return segundos ? `${numero(segundos[1])}s` : "";
}

/** "f / 2.8" -> "f/2.8"; "2,8" -> "f/2.8". */
export function normalizarDiafragma(valor: string): string {
  const m = valor.match(/(\d+(?:[.,]\d+)?)/);
  return m ? `f/${numero(m[1])}` : "";
}

/** "50 mm" -> "50mm"; "24.0 mm" -> "24mm". */
export function normalizarDistanciaFocal(valor: string): string {
  const m = valor.match(/(\d+(?:[.,]\d+)?)/);
  return m ? `${Math.round(Number(numero(m[1])))}mm` : "";
}

/** Marca y modelo como los muestra el programa: si el modelo ya empieza con la marca, solo el modelo. */
export function normalizarCamara(marca: string, modelo: string): string {
  if (marca && modelo) return modelo.toLowerCase().startsWith(marca.toLowerCase()) ? modelo : `${marca} ${modelo}`;
  return modelo || marca;
}

/** Interpreta el contenido de `entrada.json`; null si no es un envio valido. */
export function interpretarEnvioLightroom(contenido: string): EnvioLightroom | null {
  let datos: unknown;
  try {
    datos = JSON.parse(contenido);
  } catch {
    return null;
  }
  if (typeof datos !== "object" || datos === null) return null;
  const d = datos as Record<string, unknown>;
  if (d.version !== 1) return null;

  // Solo un nombre de archivo suelto: nada de carpetas (el archivo viene de afuera).
  const imagen = texto(d.imagen);
  const imagenValida = /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(imagen) && !imagen.includes("..");

  const fecha = texto(d.fechaCaptura);
  const iso = texto(d.iso).replace(/\D/g, "");
  const estrellas = typeof d.calificacion === "number" ? Math.round(d.calificacion) : 0;

  const palabras = Array.isArray(d.palabrasClave) ? d.palabrasClave.map(texto).filter((p) => p !== "" && p.length <= 100) : [];

  return {
    id: texto(d.id),
    titulo: texto(d.titulo),
    fechaCaptura: /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : "",
    palabrasClave: [...new Set(palabras)].slice(0, 200),
    calificacion: estrellas >= 1 && estrellas <= 5 ? estrellas : null,
    camara: normalizarCamara(texto(d.camaraMarca), texto(d.camaraModelo)),
    iso,
    velocidadObturador: normalizarVelocidad(texto(d.velocidad)),
    diafragma: normalizarDiafragma(texto(d.diafragma)),
    distanciaFocal: normalizarDistanciaFocal(texto(d.distanciaFocal)),
    rutaOriginal: texto(d.rutaOriginal).slice(0, 1000),
    imagen: imagenValida ? imagen : "",
  };
}
