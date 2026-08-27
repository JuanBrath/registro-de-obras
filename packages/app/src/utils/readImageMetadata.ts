export interface ArchivoMetadata {
  fechaCaptura: string | null;
  software: string | null;
  camara: string | null;
  iso: string | null;
  velocidadObturador: string | null;
  diafragma: string | null;
  distanciaFocal: string | null;
  palabrasClave: string[];
}

const VACIO: ArchivoMetadata = {
  fechaCaptura: null,
  software: null,
  camara: null,
  iso: null,
  velocidadObturador: null,
  diafragma: null,
  distanciaFocal: null,
  palabrasClave: [],
};

// Tipos de campo TIFF y su tamano en bytes por elemento (spec EXIF/TIFF 6.0).
const TAMANO_TIPO: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 7: 1, 8: 2, 9: 4, 10: 8, 11: 4, 12: 8 };

interface Entrada {
  tag: number;
  tipo: number;
  cantidad: number;
  valorOffset: number;
}

function leerIfd(view: DataView, offsetIfd: number, littleEndian: boolean): Map<number, Entrada> {
  const entradas = new Map<number, Entrada>();
  const cantidad = view.getUint16(offsetIfd, littleEndian);
  for (let i = 0; i < cantidad; i++) {
    const base = offsetIfd + 2 + i * 12;
    const tag = view.getUint16(base, littleEndian);
    const tipo = view.getUint16(base + 2, littleEndian);
    const numValores = view.getUint32(base + 4, littleEndian);
    entradas.set(tag, { tag, tipo, cantidad: numValores, valorOffset: base + 8 });
  }
  return entradas;
}

function leerAscii(view: DataView, tiffStart: number, entrada: Entrada, littleEndian: boolean): string | null {
  const tamano = (TAMANO_TIPO[entrada.tipo] ?? 1) * entrada.cantidad;
  const offset = tamano <= 4 ? entrada.valorOffset : tiffStart + view.getUint32(entrada.valorOffset, littleEndian);
  const bytes = new Uint8Array(view.buffer, view.byteOffset + offset, entrada.cantidad);
  const texto = new TextDecoder("ascii").decode(bytes).replace(/\0.*$/, "").trim();
  return texto || null;
}

function leerRacional(view: DataView, tiffStart: number, entrada: Entrada, littleEndian: boolean): [number, number] | null {
  const offset = tiffStart + view.getUint32(entrada.valorOffset, littleEndian);
  const numerador = view.getUint32(offset, littleEndian);
  const denominador = view.getUint32(offset + 4, littleEndian);
  if (denominador === 0) return null;
  return [numerador, denominador];
}

function leerShort(view: DataView, entrada: Entrada, littleEndian: boolean): number {
  const tamano = (TAMANO_TIPO[entrada.tipo] ?? 2) * entrada.cantidad;
  // ISOSpeedRatings suele venir inline (cantidad chica); si no entra inline, esta en un offset.
  if (tamano <= 4) return view.getUint16(entrada.valorOffset, littleEndian);
  const offset = view.getUint32(entrada.valorOffset, littleEndian);
  return view.getUint16(offset, littleEndian);
}

function formatearFecha(exifDate: string): string | null {
  // Formato EXIF: "AAAA:MM:DD HH:MM:SS" -> ISO "AAAA-MM-DD".
  const m = exifDate.match(/^(\d{4}):(\d{2}):(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

function formatearVelocidad([num, den]: [number, number]): string {
  if (num === 0) return "0s";
  const segundos = num / den;
  if (segundos >= 1) return `${Math.round(segundos * 10) / 10}s`;
  const denRedondeado = Math.round(den / num);
  return `1/${denRedondeado}`;
}

function formatearDiafragma([num, den]: [number, number]): string {
  const valor = num / den;
  return `f/${Math.round(valor * 10) / 10}`;
}

function formatearDistanciaFocal([num, den]: [number, number]): string {
  const valor = num / den;
  return `${Math.round(valor)}mm`;
}

/** Recorre la estructura TIFF (IFD0 + Exif SubIFD) a partir de `tiffStart` — comun a JPEG, TIFF y HEIC, que solo difieren en como llegan hasta este punto. */
function extraerDeTiff(view: DataView, tiffStart: number): ArchivoMetadata {
  const byteOrder = view.getUint16(tiffStart, false);
  const littleEndian = byteOrder === 0x4949;
  const offsetIfd0 = view.getUint32(tiffStart + 4, littleEndian);
  const ifd0 = leerIfd(view, tiffStart + offsetIfd0, littleEndian);

  const make = ifd0.has(0x010f) ? leerAscii(view, tiffStart, ifd0.get(0x010f)!, littleEndian) : null;
  const model = ifd0.has(0x0110) ? leerAscii(view, tiffStart, ifd0.get(0x0110)!, littleEndian) : null;
  const software = ifd0.has(0x0131) ? leerAscii(view, tiffStart, ifd0.get(0x0131)!, littleEndian) : null;
  const camara =
    make && model ? (model.toLowerCase().startsWith(make.toLowerCase()) ? model : `${make} ${model}`) : model || make;

  let fechaCaptura: string | null = null;
  let iso: string | null = null;
  let velocidadObturador: string | null = null;
  let diafragma: string | null = null;
  let distanciaFocal: string | null = null;

  const exifIfdEntry = ifd0.get(0x8769);
  if (exifIfdEntry) {
    const offsetExifIfd = view.getUint32(exifIfdEntry.valorOffset, littleEndian);
    const exifIfd = leerIfd(view, tiffStart + offsetExifIfd, littleEndian);

    const fechaEntry = exifIfd.get(0x9003);
    if (fechaEntry) {
      const texto = leerAscii(view, tiffStart, fechaEntry, littleEndian);
      fechaCaptura = texto ? formatearFecha(texto) : null;
    }
    const isoEntry = exifIfd.get(0x8827);
    if (isoEntry) iso = String(leerShort(view, isoEntry, littleEndian));
    const exposicionEntry = exifIfd.get(0x829a);
    if (exposicionEntry) {
      const racional = leerRacional(view, tiffStart, exposicionEntry, littleEndian);
      if (racional) velocidadObturador = formatearVelocidad(racional);
    }
    const fNumberEntry = exifIfd.get(0x829d);
    if (fNumberEntry) {
      const racional = leerRacional(view, tiffStart, fNumberEntry, littleEndian);
      if (racional) diafragma = formatearDiafragma(racional);
    }
    const focalEntry = exifIfd.get(0x920a);
    if (focalEntry) {
      const racional = leerRacional(view, tiffStart, focalEntry, littleEndian);
      if (racional) distanciaFocal = formatearDistanciaFocal(racional);
    }
  }

  return { fechaCaptura, software, camara, iso, velocidadObturador, diafragma, distanciaFocal, palabrasClave: [] };
}

/** JPEG: recorre los marcadores buscando el segmento APP1 con cabecera "Exif\0\0". */
function leerExifDeJpeg(bytes: Uint8Array, view: DataView): ArchivoMetadata | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;

  let pos = 2;
  let app1Offset = -1;
  while (pos + 4 <= bytes.length) {
    if (bytes[pos] !== 0xff) break;
    const marker = bytes[pos + 1];
    if (marker === 0xd8 || marker === 0xd9) {
      pos += 2;
      continue;
    }
    const largo = view.getUint16(pos + 2, false);
    if (marker === 0xe1) {
      app1Offset = pos + 4;
      break;
    }
    if (marker === 0xda) break; // Start of Scan: ya no hay mas segmentos de metadata.
    pos += 2 + largo;
  }
  if (app1Offset < 0) return null;

  const cabecera = new TextDecoder("ascii").decode(bytes.subarray(app1Offset, app1Offset + 6));
  if (cabecera !== "Exif\0\0") return null;

  return extraerDeTiff(view, app1Offset + 6);
}

/** TIFF: el archivo entero ya es el stream TIFF, sin ningun envoltorio. */
function leerExifDeTiff(bytes: Uint8Array, view: DataView): ArchivoMetadata | null {
  if (bytes.length < 8) return null;
  const esIntelOMotorola =
    (bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x2a && bytes[3] === 0x00) ||
    (bytes[0] === 0x4d && bytes[1] === 0x4d && bytes[2] === 0x00 && bytes[3] === 0x2a);
  if (!esIntelOMotorola) return null;
  return extraerDeTiff(view, 0);
}

/**
 * Palabras clave / keywords del archivo (IPTC y XMP), independiente del EXIF:
 * viven en segmentos distintos (IPTC dentro de un bloque "Photoshop 3.0" y
 * XMP como paquete XML propio), no dentro de la estructura TIFF/EXIF.
 */

/** Registros IIM (IPTC) dentro del rango dado: cada uno es marca 0x1C, registro, dataset, largo(2) y datos. Dataset 2:25 = Keywords. */
function extraerPalabrasClaveDeIptc(bytes: Uint8Array, view: DataView, inicio: number, fin: number): string[] {
  const palabras: string[] = [];
  let pos = inicio;
  while (pos + 5 <= fin) {
    if (bytes[pos] !== 0x1c) break;
    const registro = bytes[pos + 1];
    const dataset = bytes[pos + 2];
    const largo = view.getUint16(pos + 3, false);
    pos += 5;
    if (pos + largo > fin) break;
    if (registro === 2 && dataset === 25) {
      const texto = new TextDecoder("utf-8").decode(bytes.subarray(pos, pos + largo)).trim();
      if (texto) palabras.push(texto);
    }
    pos += largo;
  }
  return palabras;
}

/** dc:subject dentro de un paquete XMP (texto XML plano): una lista rdf:Bag/rdf:Seq de items rdf:li. */
function extraerPalabrasClaveDeXmp(xml: string): string[] {
  const bloque = xml.match(/<dc:subject>([\s\S]*?)<\/dc:subject>/);
  if (!bloque) return [];
  return [...bloque[1].matchAll(/<rdf:li[^>]*>([\s\S]*?)<\/rdf:li>/g)].map((m) => m[1].trim()).filter(Boolean);
}

const FIRMA_PHOTOSHOP = "Photoshop 3.0";

/** Bloques de recursos "8BIM" dentro del segmento Photoshop; el recurso 0x0404 es el bloque IPTC-NAA. */
function leerPalabrasClaveDePhotoshop(bytes: Uint8Array, view: DataView, inicio: number, fin: number): string[] {
  let pos = inicio;
  while (pos + 8 <= fin) {
    if (String.fromCharCode(bytes[pos], bytes[pos + 1], bytes[pos + 2], bytes[pos + 3]) !== "8BIM") break;
    const resourceId = view.getUint16(pos + 4, false);
    const nombreLen = bytes[pos + 6];
    let p = pos + 7 + nombreLen;
    if ((nombreLen + 1) % 2 !== 0) p += 1; // el nombre Pascal se rellena para terminar en un offset par.
    if (p + 4 > fin) break;
    const tamano = view.getUint32(p, false);
    p += 4;
    if (p + tamano > fin) break;
    if (resourceId === 0x0404) return extraerPalabrasClaveDeIptc(bytes, view, p, p + tamano);
    pos = p + tamano + (tamano % 2);
  }
  return [];
}

const FIRMA_XMP = "http://ns.adobe.com/xap/1.0/";

/**
 * JPEG: a diferencia del EXIF (que se queda con el primer APP1 y corta), acá
 * hay que recorrer TODOS los segmentos, porque IPTC vive en un APP13 y XMP en
 * un APP1 aparte del de Exif (puede haber mas de un APP1 en el mismo archivo).
 */
function leerPalabrasClaveDeJpeg(bytes: Uint8Array, view: DataView): string[] {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return [];
  const palabras: string[] = [];
  let pos = 2;
  while (pos + 4 <= bytes.length) {
    if (bytes[pos] !== 0xff) break;
    const marker = bytes[pos + 1];
    if (marker === 0xd8 || marker === 0xd9) {
      pos += 2;
      continue;
    }
    const largo = view.getUint16(pos + 2, false);
    const inicioPayload = pos + 4;
    const finPayload = pos + 2 + largo;
    if (marker === 0xed && inicioPayload + FIRMA_PHOTOSHOP.length <= bytes.length) {
      const firma = new TextDecoder("ascii").decode(bytes.subarray(inicioPayload, inicioPayload + FIRMA_PHOTOSHOP.length));
      if (firma === FIRMA_PHOTOSHOP) {
        palabras.push(...leerPalabrasClaveDePhotoshop(bytes, view, inicioPayload + FIRMA_PHOTOSHOP.length + 1, finPayload));
      }
    } else if (marker === 0xe1 && inicioPayload + FIRMA_XMP.length <= bytes.length) {
      const firma = new TextDecoder("ascii").decode(bytes.subarray(inicioPayload, inicioPayload + FIRMA_XMP.length));
      if (firma === FIRMA_XMP) {
        const texto = new TextDecoder("utf-8").decode(bytes.subarray(inicioPayload + FIRMA_XMP.length + 1, finPayload));
        palabras.push(...extraerPalabrasClaveDeXmp(texto));
      }
    }
    if (marker === 0xda) break; // Start of Scan: ya no hay mas segmentos de metadata.
    pos = finPayload;
  }
  return [...new Set(palabras)];
}

/**
 * TIFF: IPTC y XMP viven como tags estandar de IFD0 (33723 y 700
 * respectivamente), en vez de un segmento aparte. `tiffStart` es 0 para un
 * archivo TIFF real, pero puede ser otro valor cuando esta misma estructura
 * TIFF esta embebida dentro de otro contenedor (por ejemplo, el item "Exif"
 * de un HEIC), igual que ya hace `extraerDeTiff` con el resto de los tags.
 */
function leerPalabrasClaveDeTiffEmbebido(bytes: Uint8Array, view: DataView, tiffStart: number): string[] {
  const littleEndian = view.getUint16(tiffStart, false) === 0x4949;
  const ifd0 = leerIfd(view, tiffStart + view.getUint32(tiffStart + 4, littleEndian), littleEndian);
  const palabras: string[] = [];

  const iptcEntry = ifd0.get(33723);
  if (iptcEntry) {
    const tamano = (TAMANO_TIPO[iptcEntry.tipo] ?? 1) * iptcEntry.cantidad;
    const offset = tamano <= 4 ? iptcEntry.valorOffset : tiffStart + view.getUint32(iptcEntry.valorOffset, littleEndian);
    palabras.push(...extraerPalabrasClaveDeIptc(bytes, view, offset, offset + tamano));
  }
  const xmpEntry = ifd0.get(700);
  if (xmpEntry) {
    const tamano = (TAMANO_TIPO[xmpEntry.tipo] ?? 1) * xmpEntry.cantidad;
    const offset = tamano <= 4 ? xmpEntry.valorOffset : tiffStart + view.getUint32(xmpEntry.valorOffset, littleEndian);
    const texto = new TextDecoder("utf-8").decode(bytes.subarray(offset, offset + tamano));
    palabras.push(...extraerPalabrasClaveDeXmp(texto));
  }
  return [...new Set(palabras)];
}

function leerPalabrasClaveDeTiff(bytes: Uint8Array, view: DataView): string[] {
  return leerPalabrasClaveDeTiffEmbebido(bytes, view, 0);
}

interface CajaIso {
  tipo: string;
  inicio: number;
  fin: number;
  cabecera: number;
}

function leerUIntBE(view: DataView, offset: number, size: number): number {
  let valor = 0;
  for (let i = 0; i < size; i++) valor = valor * 256 + view.getUint8(offset + i);
  return valor;
}

/** Recorre cajas ISOBMFF (formato contenedor de HEIC/HEIF, tambien usado por MP4) en el rango dado. */
function leerCajasIso(bytes: Uint8Array, view: DataView, desde: number, hasta: number): CajaIso[] {
  const cajas: CajaIso[] = [];
  let pos = desde;
  while (pos + 8 <= hasta) {
    let tam = view.getUint32(pos, false);
    const tipo = String.fromCharCode(bytes[pos + 4], bytes[pos + 5], bytes[pos + 6], bytes[pos + 7]);
    let cabecera = 8;
    if (tam === 1) {
      if (pos + 16 > hasta) break;
      tam = leerUIntBE(view, pos + 8, 8);
      cabecera = 16;
    } else if (tam === 0) {
      tam = hasta - pos;
    }
    if (tam < cabecera || pos + tam > hasta) break;
    cajas.push({ tipo, inicio: pos, fin: pos + tam, cabecera });
    pos += tam;
  }
  return cajas;
}

const MARCAS_HEIC = ["heic", "heix", "heim", "heis", "hevc", "hevm", "hevs", "mif1", "msf1"];

function esArchivoHeic(bytes: Uint8Array, cajasRaiz: CajaIso[]): boolean {
  const ftyp = cajasRaiz.find((c) => c.tipo === "ftyp");
  if (!ftyp) return false;
  for (let pos = ftyp.inicio + ftyp.cabecera; pos + 4 <= ftyp.fin; pos += 4) {
    const marca = String.fromCharCode(bytes[pos], bytes[pos + 1], bytes[pos + 2], bytes[pos + 3]);
    if (MARCAS_HEIC.includes(marca)) return true;
  }
  return false;
}

/**
 * HEIC/HEIF: el Exif vive como un "item" dentro de la caja "meta" (referenciado
 * por "iinf" segun su item_type "Exif", ubicado en el archivo segun "iloc"),
 * no como un segmento de marcador como en JPEG. El payload de ese item empieza
 * con un offset de 4 bytes hacia la cabecera TIFF real (spec ISO/IEC 23008-12).
 * Las palabras clave pueden venir de dos lugares: tags IPTC/XMP dentro de ese
 * mismo item Exif (igual que en un TIFF), o de un item separado de tipo
 * "mime" con content_type "application/rdf+xml" (un paquete XMP aparte).
 */
function leerExifDeHeic(bytes: Uint8Array, view: DataView): ArchivoMetadata | null {
  const cajasRaiz = leerCajasIso(bytes, view, 0, bytes.length);
  if (!esArchivoHeic(bytes, cajasRaiz)) return null;

  const meta = cajasRaiz.find((c) => c.tipo === "meta");
  if (!meta) return null;
  const hijosMeta = leerCajasIso(bytes, view, meta.inicio + meta.cabecera + 4, meta.fin);
  const iinf = hijosMeta.find((c) => c.tipo === "iinf");
  const iloc = hijosMeta.find((c) => c.tipo === "iloc");
  if (!iinf || !iloc) return null;

  // --- iinf: buscar el item Exif y, si existe, un item XMP aparte ---
  let pos = iinf.inicio + iinf.cabecera;
  const versionIinf = view.getUint8(pos);
  pos += 4;
  const entryCount = versionIinf === 0 ? view.getUint16(pos, false) : view.getUint32(pos, false);
  pos += versionIinf === 0 ? 2 : 4;

  let exifItemId: number | null = null;
  let xmpItemId: number | null = null;
  for (let i = 0; i < entryCount && pos + 8 <= iinf.fin; i++) {
    let tamInfe = view.getUint32(pos, false);
    const tipoInfe = String.fromCharCode(bytes[pos + 4], bytes[pos + 5], bytes[pos + 6], bytes[pos + 7]);
    let cabeceraInfe = 8;
    if (tamInfe === 1) {
      tamInfe = leerUIntBE(view, pos + 8, 8);
      cabeceraInfe = 16;
    }
    if (tamInfe <= 0) break;
    if (tipoInfe === "infe" && tamInfe >= cabeceraInfe + 4) {
      const versionInfe = view.getUint8(pos + cabeceraInfe);
      if (versionInfe >= 2) {
        let p = pos + cabeceraInfe + 4;
        const itemId = versionInfe === 2 ? view.getUint16(p, false) : view.getUint32(p, false);
        p += versionInfe === 2 ? 2 : 4;
        p += 2; // item_protection_index
        const itemType = String.fromCharCode(bytes[p], bytes[p + 1], bytes[p + 2], bytes[p + 3]);
        p += 4;
        if (itemType === "Exif") {
          exifItemId = itemId;
        } else if (itemType === "mime") {
          const finInfe = pos + tamInfe;
          let q = p;
          while (q < finInfe && bytes[q] !== 0) q++; // fin del item_name
          q += 1; // saltar el \0 del item_name para llegar al content_type
          let finContentType = q;
          while (finContentType < finInfe && bytes[finContentType] !== 0) finContentType++;
          const contentType = new TextDecoder("ascii").decode(bytes.subarray(q, finContentType));
          if (contentType === "application/rdf+xml") xmpItemId = itemId;
        }
      }
    }
    pos += tamInfe;
  }
  if (exifItemId === null && xmpItemId === null) return null;

  // --- iloc: ubicar el offset/largo en el archivo de cada item que interese ---
  pos = iloc.inicio + iloc.cabecera;
  const versionIloc = view.getUint8(pos);
  pos += 4;
  const bytePar1 = view.getUint8(pos);
  pos += 1;
  const offsetSize = bytePar1 >> 4;
  const lengthSize = bytePar1 & 0xf;
  const bytePar2 = view.getUint8(pos);
  pos += 1;
  const baseOffsetSize = bytePar2 >> 4;
  const indexSize = versionIloc === 1 || versionIloc === 2 ? bytePar2 & 0xf : 0;
  const itemCount = versionIloc < 2 ? view.getUint16(pos, false) : view.getUint32(pos, false);
  pos += versionIloc < 2 ? 2 : 4;

  let exifExtent: { offset: number; length: number } | null = null;
  let xmpExtent: { offset: number; length: number } | null = null;

  for (let i = 0; i < itemCount && pos < iloc.fin; i++) {
    const itemId = versionIloc < 2 ? view.getUint16(pos, false) : view.getUint32(pos, false);
    pos += versionIloc < 2 ? 2 : 4;
    if (versionIloc === 1 || versionIloc === 2) pos += 2; // reservado(12) + construction_method(4)
    pos += 2; // data_reference_index
    const baseOffset = baseOffsetSize > 0 ? leerUIntBE(view, pos, baseOffsetSize) : 0;
    pos += baseOffsetSize;
    const extentCount = view.getUint16(pos, false);
    pos += 2;

    let primerExtentOffset: number | null = null;
    let primerExtentLength = 0;
    for (let e = 0; e < extentCount; e++) {
      if (indexSize > 0) pos += indexSize;
      const extentOffset = offsetSize > 0 ? leerUIntBE(view, pos, offsetSize) : 0;
      pos += offsetSize;
      const extentLength = lengthSize > 0 ? leerUIntBE(view, pos, lengthSize) : 0;
      pos += lengthSize;
      if (e === 0) {
        primerExtentOffset = baseOffset + extentOffset;
        primerExtentLength = extentLength;
      }
    }
    if (primerExtentOffset === null) continue;
    if (itemId === exifItemId) exifExtent = { offset: primerExtentOffset, length: primerExtentLength };
    if (itemId === xmpItemId) xmpExtent = { offset: primerExtentOffset, length: primerExtentLength };
  }

  let exif: ArchivoMetadata | null = null;
  const palabrasClave: string[] = [];

  if (exifExtent && exifExtent.length >= 8) {
    const offsetInterno = view.getUint32(exifExtent.offset, false);
    const tiffStart = exifExtent.offset + 4 + offsetInterno;
    if (tiffStart + 8 <= bytes.length) {
      exif = extraerDeTiff(view, tiffStart);
      palabrasClave.push(...leerPalabrasClaveDeTiffEmbebido(bytes, view, tiffStart));
    }
  }
  if (xmpExtent && xmpExtent.length > 0 && xmpExtent.offset + xmpExtent.length <= bytes.length) {
    const texto = new TextDecoder("utf-8").decode(bytes.subarray(xmpExtent.offset, xmpExtent.offset + xmpExtent.length));
    palabrasClave.push(...extraerPalabrasClaveDeXmp(texto));
  }

  if (!exif && palabrasClave.length === 0) return null;
  return { ...(exif ?? VACIO), palabrasClave: [...new Set(palabrasClave)] };
}

/**
 * Lee los metadatos disponibles de una imagen (camara, fecha de captura,
 * software, ISO, velocidad, diafragma, distancia focal, palabras clave),
 * sin depender de ninguna libreria externa. Soporta JPEG, TIFF y HEIC/HEIF
 * (las palabras clave, por IPTC/XMP, solo en JPEG y TIFF). Si el archivo no
 * es de un formato reconocido o no trae esos datos, devuelve todos los
 * campos en null (o la lista de palabras clave vacia) sin lanzar error.
 */
export function readImageMetadata(bytes: Uint8Array): ArchivoMetadata {
  try {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8) {
      const exif = leerExifDeJpeg(bytes, view);
      return { ...(exif ?? VACIO), palabrasClave: leerPalabrasClaveDeJpeg(bytes, view) };
    }
    const tiff = leerExifDeTiff(bytes, view);
    if (tiff) return { ...tiff, palabrasClave: leerPalabrasClaveDeTiff(bytes, view) };
    return leerExifDeHeic(bytes, view) ?? VACIO;
  } catch {
    return VACIO;
  }
}
