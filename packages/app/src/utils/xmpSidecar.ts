import { readAbsoluteFileBytes, writeAbsoluteFileBytes } from "../adapters/tauri/TauriFileSystemAdapter.js";

const NS_XMP = 'xmlns:xmp="http://ns.adobe.com/xap/1.0/"';

/**
 * Ruta del sidecar XMP de un archivo: mismo nombre, con la extension
 * reemplazada por ".xmp" (por ejemplo "foto.CR2" -> "foto.xmp") — la misma
 * convencion que usan Lightroom, Bridge y la mayoria de los programas de
 * edicion para guardar metadatos de un RAW sin tocar el archivo original.
 */
export function sidecarXmpPath(rutaArchivo: string): string {
  const ultimaBarra = Math.max(rutaArchivo.lastIndexOf("/"), rutaArchivo.lastIndexOf("\\"));
  const ultimoPunto = rutaArchivo.lastIndexOf(".");
  const base = ultimoPunto > ultimaBarra ? rutaArchivo.slice(0, ultimoPunto) : rutaArchivo;
  return `${base}.xmp`;
}

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
 * Devuelve el XML del sidecar con la calificacion puesta en xmp:Rating, sin
 * tocar el resto del contenido — importante porque un sidecar ya existente
 * puede tener otros datos puestos por Lightroom/Bridge (etiquetas, ajustes de
 * revelado, etc.) que no hay que perder. Si el sidecar no existia todavia
 * (xmlActual null), se genera uno nuevo minimo con solo la calificacion.
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

/**
 * Guarda la calificacion de una obra en el sidecar XMP de su archivo
 * original, sin tocar el archivo original en si. Si el sidecar ya existe, se
 * actualiza in situ preservando el resto de su contenido; si no existe, se
 * crea uno nuevo. `rutaArchivo` es la "ubicacion del archivo" de la obra.
 */
export async function escribirCalificacionEnSidecar(rutaArchivo: string, calificacion: number): Promise<void> {
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
