import { readAbsoluteFileBytes, writeAbsoluteFileBytes } from "../adapters/tauri/TauriFileSystemAdapter.js";

const NS_XMP = 'xmlns:xmp="http://ns.adobe.com/xap/1.0/"';
const FIRMA_XMP = "http://ns.adobe.com/xap/1.0/";

/**
 * Genera un paquete XMP nuevo y minimo, con la calificacion como unico dato.
 */
function xmpNuevo(calificacion: number): string {
  return `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about="" ${NS_XMP} xmp:Rating="${calificacion}"/>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
}

/**
 * Devuelve el XML con la calificacion puesta en xmp:Rating, sin tocar el
 * resto del contenido — importante porque el paquete XMP (sea de un sidecar
 * o embebido en el archivo) puede tener otros datos puestos por
 * Lightroom/Bridge/Photoshop (etiquetas, ajustes de revelado, etc.) que no
 * hay que perder. Si no habia paquete todavia (xmlActual null), se genera
 * uno nuevo minimo con solo la calificacion.
 */
export function establecerCalificacionEnXmp(xmlActual: string | null, calificacion: number): string {
  if (!xmlActual) return xmpNuevo(calificacion);

  const comoAtributo = /\bxmp:Rating\s*=\s*"-?\d+"/;
  if (comoAtributo.test(xmlActual)) {
    return xmlActual.replace(comoAtributo, `xmp:Rating="${calificacion}"`);
  }

  const comoElemento = /<xmp:Rating>\s*-?\d+\s*<\/xmp:Rating>/;
  if (comoElemento.test(xmlActual)) {
    return xmlActual.replace(comoElemento, `<xmp:Rating>${calificacion}</xmp:Rating>`);
  }

  // No tenia xmp:Rating todavia: se agrega como atributo nuevo en el primer
  // rdf:Description (declarando el namespace xmp ahi mismo si hace falta).
  const inicioDescription = xmlActual.match(/<rdf:Description\b/);
  if (!inicioDescription) return xmpNuevo(calificacion);

  const tieneNamespaceXmp = /xmlns:xmp\s*=\s*"http:\/\/ns\.adobe\.com\/xap\/1\.0\/"/.test(xmlActual);
  const atributoNuevo = tieneNamespaceXmp ? ` xmp:Rating="${calificacion}"` : ` ${NS_XMP} xmp:Rating="${calificacion}"`;
  const indice = xmlActual.indexOf(inicioDescription[0]) + inicioDescription[0].length;
  return xmlActual.slice(0, indice) + atributoNuevo + xmlActual.slice(indice);
}

function extensionDe(rutaArchivo: string): string {
  return rutaArchivo.split(".").pop()?.toLowerCase() ?? "";
}

function esJpeg(rutaArchivo: string): boolean {
  const ext = extensionDe(rutaArchivo);
  return ext === "jpg" || ext === "jpeg";
}

/* ---------------------------------------------------------------------- */
/* Sidecar XMP: para RAW de camara y el resto de los formatos, donde un    */
/* archivo aparte al lado del original es la convencion (la que usa el    */
/* propio Lightroom para RAW) y ademas es la unica forma segura, ya que    */
/* reescribir la estructura interna de un TIFF/RAW o un PSD/PSB implicaria */
/* recalcular offsets internos con alto riesgo de daniar el archivo.      */
/* ---------------------------------------------------------------------- */

/**
 * Ruta del sidecar XMP de un archivo: mismo nombre, con la extension
 * reemplazada por ".xmp" (por ejemplo "foto.CR2" -> "foto.xmp").
 */
export function sidecarXmpPath(rutaArchivo: string): string {
  const ultimaBarra = Math.max(rutaArchivo.lastIndexOf("/"), rutaArchivo.lastIndexOf("\\"));
  const ultimoPunto = rutaArchivo.lastIndexOf(".");
  const base = ultimoPunto > ultimaBarra ? rutaArchivo.slice(0, ultimoPunto) : rutaArchivo;
  return `${base}.xmp`;
}

async function escribirCalificacionEnSidecarXmp(rutaArchivo: string, calificacion: number): Promise<void> {
  const rutaSidecar = sidecarXmpPath(rutaArchivo);
  let xmlActual: string | null = null;
  try {
    const bytes = await readAbsoluteFileBytes(rutaSidecar);
    xmlActual = new TextDecoder("utf-8").decode(bytes);
  } catch {
    xmlActual = null; // El sidecar todavia no existe (o no se pudo leer): se crea uno nuevo.
  }
  const nuevoXml = establecerCalificacionEnXmp(xmlActual, calificacion);
  await writeAbsoluteFileBytes(rutaSidecar, new TextEncoder().encode(nuevoXml));
}

/* ---------------------------------------------------------------------- */
/* JPEG: a diferencia del RAW, Lightroom y Bridge no miran un sidecar      */
/* aparte para este formato — solo leen lo que esta embebido adentro del   */
/* archivo mismo. La estructura de un JPEG (una serie de segmentos con     */
/* marcador y largo, hasta el marcador "Start of Scan" que arranca los     */
/* datos de imagen comprimidos) permite agregar o reemplazar un segmento   */
/* de metadata sin decodificar ni tocar la imagen en si.                   */
/* ---------------------------------------------------------------------- */

/**
 * Devuelve una copia de los bytes de un JPEG con la calificacion puesta en
 * un segmento APP1 XMP (agregado justo despues del SOI, o reemplazado in
 * situ si ya existia uno) — todo lo que va desde el marcador "Start of
 * Scan" en adelante (los datos de imagen) se copia sin tocar, y se verifica
 * al final que haya quedado byte a byte identico, como red de seguridad
 * antes de guardar nada. Tira un error, sin devolver nada, si el archivo no
 * es un JPEG valido, si esa verificacion no da igual, o si el paquete XMP
 * resultante no entra en el limite de un segmento JPEG (65533 bytes).
 */
export function establecerCalificacionEnJpeg(bytes: Uint8Array, calificacion: number): Uint8Array {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    throw new Error("El archivo no es un JPEG valido (no empieza con el marcador SOI).");
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  let pos = 2;
  let xmpInicio = -1;
  let xmpFin = -1;
  let xmlExistente: string | null = null;
  while (pos + 4 <= bytes.length) {
    if (bytes[pos] !== 0xff) break;
    const marker = bytes[pos + 1];
    if (marker === 0xd8 || marker === 0xd9) {
      pos += 2;
      continue;
    }
    if (marker === 0xda) break; // Start of Scan: de aca en mas son datos de imagen, no se tocan.
    const largo = view.getUint16(pos + 2, false);
    const finSegmento = pos + 2 + largo;
    const inicioPayload = pos + 4;
    if (marker === 0xe1 && inicioPayload + FIRMA_XMP.length <= bytes.length) {
      const firma = new TextDecoder("ascii").decode(bytes.subarray(inicioPayload, inicioPayload + FIRMA_XMP.length));
      if (firma === FIRMA_XMP) {
        xmpInicio = pos;
        xmpFin = finSegmento;
        xmlExistente = new TextDecoder("utf-8").decode(bytes.subarray(inicioPayload + FIRMA_XMP.length + 1, finSegmento));
      }
    }
    pos = finSegmento;
  }

  const nuevoXml = establecerCalificacionEnXmp(xmlExistente, calificacion);
  const firmaBytes = new TextEncoder().encode(FIRMA_XMP);
  const xmlBytes = new TextEncoder().encode(nuevoXml);
  const payload = new Uint8Array(firmaBytes.length + 1 + xmlBytes.length);
  payload.set(firmaBytes, 0);
  payload[firmaBytes.length] = 0;
  payload.set(xmlBytes, firmaBytes.length + 1);

  const largoSegmento = payload.length + 2; // +2 por los bytes del propio campo de largo
  if (largoSegmento > 0xffff) {
    throw new Error("La informacion XMP es demasiado grande para guardarla adentro de este JPEG.");
  }
  const segmentoNuevo = new Uint8Array(4 + payload.length);
  segmentoNuevo[0] = 0xff;
  segmentoNuevo[1] = 0xe1;
  segmentoNuevo[2] = (largoSegmento >> 8) & 0xff;
  segmentoNuevo[3] = largoSegmento & 0xff;
  segmentoNuevo.set(payload, 4);

  let resultado: Uint8Array;
  let colaOriginal: Uint8Array;
  if (xmpInicio >= 0) {
    resultado = new Uint8Array(bytes.length - (xmpFin - xmpInicio) + segmentoNuevo.length);
    resultado.set(bytes.subarray(0, xmpInicio), 0);
    resultado.set(segmentoNuevo, xmpInicio);
    colaOriginal = bytes.subarray(xmpFin);
    resultado.set(colaOriginal, xmpInicio + segmentoNuevo.length);
  } else {
    resultado = new Uint8Array(bytes.length + segmentoNuevo.length);
    resultado.set(bytes.subarray(0, 2), 0);
    resultado.set(segmentoNuevo, 2);
    colaOriginal = bytes.subarray(2);
    resultado.set(colaOriginal, 2 + segmentoNuevo.length);
  }

  // Red de seguridad: todo lo que no sea el segmento XMP tocado debe quedar
  // exactamente igual que antes (en particular, los datos de imagen). Si por
  // algun motivo no es asi, se aborta sin escribir nada en vez de arriesgar
  // un archivo daniado.
  const colaResultado = resultado.subarray(resultado.length - colaOriginal.length);
  for (let i = 0; i < colaOriginal.length; i++) {
    if (colaResultado[i] !== colaOriginal[i]) {
      throw new Error("No se pudo actualizar el archivo de forma segura (verificacion interna fallida).");
    }
  }

  return resultado;
}

async function escribirCalificacionEmbebidaEnJpeg(rutaArchivo: string, calificacion: number): Promise<void> {
  const bytesOriginales = await readAbsoluteFileBytes(rutaArchivo);
  const bytesNuevos = establecerCalificacionEnJpeg(bytesOriginales, calificacion);
  await writeAbsoluteFileBytes(rutaArchivo, bytesNuevos);
}

/**
 * Sincroniza la calificacion de una obra con su archivo original (la
 * "ubicacion del archivo" de la obra). Para JPEG se graba embebida adentro
 * del archivo mismo, porque es el unico lugar que Lightroom y Bridge miran
 * para ese formato; para el resto (RAW de camara, TIFF, PSD/PSB, etc.) se
 * usa un sidecar .xmp aparte, sin tocar nunca el archivo original en esos
 * casos — reescribir su estructura interna para embeber los datos ahi
 * tendria un riesgo real de daniarlos.
 */
export async function sincronizarCalificacionConArchivo(rutaArchivo: string, calificacion: number): Promise<void> {
  if (esJpeg(rutaArchivo)) {
    await escribirCalificacionEmbebidaEnJpeg(rutaArchivo, calificacion);
    return;
  }
  await escribirCalificacionEnSidecarXmp(rutaArchivo, calificacion);
}
