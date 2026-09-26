import type { DatabaseAdapter } from "../adapters/DatabaseAdapter.js";

/**
 * Correcciones de datos hechas desde la pantalla del certificado de
 * autenticidad. Cada campo se guarda en el registro donde se cargo
 * originalmente (la obra, la copia o la venta), no solo en el certificado.
 * Solo estan los datos que corresponden a una unica columna: los que
 * dependen de otros (el numero de copia, las pruebas de autor, el subtipo de
 * fotografia, el artista) se siguen cambiando en su propio formulario.
 */
export interface CorreccionesRegistro {
  /** obra.titulo */
  titulo?: string;
  /** obra_fotografia.serie_proyecto */
  serieProyecto?: string;
  /** obra.anio_periodo */
  anioPeriodo?: string;
  /** Solo el año de obra_fotografia.fecha_captura (el mes y el dia, si estan, se conservan) */
  anioCaptura?: string;
  /** obra_fotografia.anio_edicion */
  anioEdicion?: string;
  /** ejemplar.dimensiones */
  medidas?: string;
  /** ejemplar.tipo_impresion */
  tipoImpresion?: string;
  /** ejemplar.soporte_impresion */
  soporteImpresion?: string;
  /** ejemplar.ubicacion_firma */
  ubicacionFirma?: string;
  /** venta.lugar_venta */
  lugar?: string;
  /** venta.fecha_venta (AAAA-MM-DD) */
  fecha?: string;
}

export type CampoCorregible = keyof CorreccionesRegistro;

/** Donde vive cada dato: es lo que se le avisa a la persona antes de guardar. */
export const DESTINO_CORRECCION: Record<CampoCorregible, "obra" | "copia" | "venta"> = {
  titulo: "obra",
  serieProyecto: "obra",
  anioPeriodo: "obra",
  anioCaptura: "obra",
  anioEdicion: "obra",
  medidas: "copia",
  tipoImpresion: "copia",
  soporteImpresion: "copia",
  ubicacionFirma: "copia",
  lugar: "venta",
  fecha: "venta",
};

const DESCRIPCION_CAMPO: Record<CampoCorregible, string> = {
  titulo: "título",
  serieProyecto: "serie",
  anioPeriodo: "año de la obra",
  anioCaptura: "año de la toma",
  anioEdicion: "año de edición",
  medidas: "medidas",
  tipoImpresion: "tipo de impresión",
  soporteImpresion: "soporte de impresión",
  ubicacionFirma: "ubicación de la firma",
  lugar: "lugar de la venta",
  fecha: "fecha de la venta",
};

export interface DestinoCorrecciones {
  obraId: number;
  ejemplarId: number;
  /** null si la copia no tiene venta (entonces no se pueden corregir lugar ni fecha). */
  ventaId: number | null;
}

export interface ErrorCorreccion {
  campo: CampoCorregible;
  motivo: "obligatorio" | "anio" | "fecha";
}

const ANIO = /^\d{4}$/;

function fechaIsoValida(texto: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  const [anio, mes, dia] = texto.split("-").map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia;
}

/** Devuelve lo que esta mal en las correcciones (lista vacia si se puede guardar). */
export function validarCorrecciones(c: CorreccionesRegistro): ErrorCorreccion[] {
  const errores: ErrorCorreccion[] = [];
  if (c.titulo !== undefined && c.titulo.trim() === "") errores.push({ campo: "titulo", motivo: "obligatorio" });
  // El año de la toma va dentro de una fecha completa: si se borrara, se perderia tambien el mes y el dia.
  if (c.anioCaptura !== undefined && !ANIO.test(c.anioCaptura.trim())) errores.push({ campo: "anioCaptura", motivo: "anio" });
  if (c.anioEdicion !== undefined && c.anioEdicion.trim() !== "" && !ANIO.test(c.anioEdicion.trim())) {
    errores.push({ campo: "anioEdicion", motivo: "anio" });
  }
  if (c.fecha !== undefined && !fechaIsoValida(c.fecha.trim())) errores.push({ campo: "fecha", motivo: "fecha" });
  return errores;
}

/** Los campos que traen algun cambio, en el mismo orden en que se listan arriba. */
export function camposConCambios(c: CorreccionesRegistro): CampoCorregible[] {
  return (Object.keys(DESTINO_CORRECCION) as CampoCorregible[]).filter((campo) => c[campo] !== undefined);
}

function textoOnull(valor: string): string | null {
  const limpio = valor.trim();
  return limpio === "" ? null : limpio;
}

/**
 * Guarda las correcciones en el registro, todas juntas o ninguna. Cada UPDATE
 * toca una sola columna y tiene que afectar exactamente un renglon: si el
 * registro no existe (por ejemplo, la obra no es fotografia y se intenta
 * corregir el año de edicion) se cancela todo en vez de perder el cambio en
 * silencio. Deja una nota en el historial de la obra.
 */
export async function guardarCorrecciones(
  db: DatabaseAdapter,
  destino: DestinoCorrecciones,
  correcciones: CorreccionesRegistro,
): Promise<void> {
  const errores = validarCorrecciones(correcciones);
  if (errores.length > 0) throw new Error(`Correcciones no válidas: ${errores.map((e) => `${e.campo} (${e.motivo})`).join(", ")}`);
  const campos = camposConCambios(correcciones);
  if (campos.length === 0) return;

  await db.transaction(async (tx) => {
    async function actualizar(sql: string, params: unknown[], que: string) {
      const { rowsAffected } = await tx.execute(sql, params);
      if (rowsAffected !== 1) throw new Error(`No se pudo guardar ${que}: no se encontró el registro.`);
    }

    const c = correcciones;
    if (c.titulo !== undefined) {
      await actualizar("UPDATE obra SET titulo = ? WHERE id = ?", [c.titulo.trim(), destino.obraId], "el título");
    }
    if (c.anioPeriodo !== undefined) {
      await actualizar("UPDATE obra SET anio_periodo = ? WHERE id = ?", [textoOnull(c.anioPeriodo), destino.obraId], "el año de la obra");
    }
    if (c.serieProyecto !== undefined) {
      await actualizar(
        "UPDATE obra_fotografia SET serie_proyecto = ? WHERE obra_id = ?",
        [textoOnull(c.serieProyecto), destino.obraId],
        "la serie",
      );
    }
    if (c.anioEdicion !== undefined) {
      await actualizar(
        "UPDATE obra_fotografia SET anio_edicion = ? WHERE obra_id = ?",
        [textoOnull(c.anioEdicion), destino.obraId],
        "el año de edición",
      );
    }
    if (c.anioCaptura !== undefined) {
      const anio = c.anioCaptura.trim();
      const filas = await tx.query<{ fecha_captura: string | null }>(
        "SELECT fecha_captura FROM obra_fotografia WHERE obra_id = ?",
        [destino.obraId],
      );
      if (filas.length !== 1) throw new Error("No se pudo guardar el año de la toma: no se encontró el registro.");
      // Se cambia solo el año: "2023-05-14" pasa a "2022-05-14", y "2023" a "2022".
      const resto = (filas[0].fecha_captura ?? "").slice(4);
      await actualizar(
        "UPDATE obra_fotografia SET fecha_captura = ?, anio_toma = ? WHERE obra_id = ?",
        [`${anio}${resto}`, Number(anio), destino.obraId],
        "el año de la toma",
      );
    }
    if (c.medidas !== undefined) {
      await actualizar("UPDATE ejemplar SET dimensiones = ? WHERE id = ?", [textoOnull(c.medidas), destino.ejemplarId], "las medidas");
    }
    if (c.tipoImpresion !== undefined) {
      await actualizar(
        "UPDATE ejemplar SET tipo_impresion = ? WHERE id = ?",
        [textoOnull(c.tipoImpresion), destino.ejemplarId],
        "el tipo de impresión",
      );
    }
    if (c.soporteImpresion !== undefined) {
      await actualizar(
        "UPDATE ejemplar SET soporte_impresion = ? WHERE id = ?",
        [textoOnull(c.soporteImpresion), destino.ejemplarId],
        "el soporte de impresión",
      );
    }
    if (c.ubicacionFirma !== undefined) {
      await actualizar(
        "UPDATE ejemplar SET ubicacion_firma = ? WHERE id = ?",
        [textoOnull(c.ubicacionFirma), destino.ejemplarId],
        "la ubicación de la firma",
      );
    }
    if (c.lugar !== undefined || c.fecha !== undefined) {
      if (destino.ventaId === null) throw new Error("No se pudo guardar el lugar o la fecha: la copia no tiene venta.");
    }
    if (c.lugar !== undefined) {
      await actualizar("UPDATE venta SET lugar_venta = ? WHERE id = ?", [textoOnull(c.lugar), destino.ventaId], "el lugar de la venta");
    }
    if (c.fecha !== undefined) {
      await actualizar("UPDATE venta SET fecha_venta = ? WHERE id = ?", [c.fecha.trim(), destino.ventaId], "la fecha de la venta");
    }

    await tx.execute("INSERT INTO historial_evento (obra_id, tipo, descripcion) VALUES (?, 'edicion', ?)", [
      destino.obraId,
      `Datos corregidos desde el certificado de autenticidad: ${campos.map((campo) => DESCRIPCION_CAMPO[campo]).join(", ")}`,
    ]);
  });
}
