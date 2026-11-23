import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";

export type FormatoExportacion = "jpg" | "tiff" | "original";
export type LadoExportacion = "corto" | "largo";

export type Profundidad = 8 | 16;
export type UnidadExportacion = "px" | "cm";

/** Opciones de tamaño y color de la exportación (las mismas en "Exportar imagen…" y "Exportar fotos"). */
export interface OpcionesTamanoColor {
  /** Si no se tilda, la imagen sale con su tamaño original. */
  cambiarTamano: boolean;
  lado: LadoExportacion;
  unidad: UnidadExportacion;
  medida: string;
  /** Resolución en píxeles por pulgada: pasa los centímetros a píxeles y queda anotada en el archivo. */
  ppp: string;
  /** Solo cambia el TIFF; el JPG siempre es de 8 bits. */
  profundidad: Profundidad;
}

export const OPCIONES_TAMANO_COLOR_POR_DEFECTO: OpcionesTamanoColor = {
  cambiarTamano: false,
  lado: "largo",
  unidad: "px",
  medida: "3000",
  ppp: "300",
  profundidad: 8,
};

/** Pasa las opciones elegidas a lo que entiende el exportador, o devuelve la clave del error si algo no es válido. */
export function resolverOpcionesTamanoColor(
  o: OpcionesTamanoColor,
): { medida?: number; ppp?: number; profundidad: Profundidad } | { error: "medida" | "ppp" } {
  if (!o.cambiarTamano) return { profundidad: o.profundidad };
  const valor = Number(o.medida);
  if (!valor || valor <= 0) return { error: "medida" };
  if (o.unidad === "px") return { medida: Math.round(valor), profundidad: o.profundidad };
  const ppp = Number(o.ppp);
  if (!ppp || ppp <= 0) return { error: "ppp" };
  return { medida: Math.max(1, Math.round((valor / 2.54) * ppp)), ppp: Math.round(ppp), profundidad: o.profundidad };
}

function extensionDe(ruta: string): string {
  const punto = ruta.lastIndexOf(".");
  return punto >= 0 ? ruta.slice(punto + 1) : "";
}

/**
 * Exporta una copia nueva de la imagen de una obra: primero abre el diálogo nativo "Guardar
 * como" (para elegir carpeta, nombre y, si corresponde, confirmar la extensión) y recién ahí le
 * pide a Rust que lea el archivo original, lo procese y escriba el resultado directo en el
 * destino elegido. Los bytes de la imagen (que pueden pesar cientos de MB) nunca pasan por el
 * canal de IPC: todo el trabajo pesado queda del lado de Rust.
 *
 * Devuelve la ruta de destino si se exportó, o null si el usuario canceló el diálogo.
 */
export async function exportarImagenConDialogo(opciones: {
  rutaOriginal: string;
  nombreSugerido: string;
  formato: FormatoExportacion;
  lado?: LadoExportacion;
  /** Medida en píxeles del lado de referencia; sin ella la imagen sale con su tamaño original. */
  medida?: number;
  copyright?: string | null;
  profundidad?: Profundidad;
  ppp?: number;
}): Promise<string | null> {
  const { rutaOriginal, nombreSugerido, formato, lado, medida, copyright, profundidad, ppp } = opciones;
  const extension = formato === "original" ? extensionDe(rutaOriginal) : formato === "tiff" ? "tif" : "jpg";

  const destino = await save({
    defaultPath: extension ? `${nombreSugerido}.${extension}` : nombreSugerido,
    filters: extension ? [{ name: extension.toUpperCase(), extensions: [extension] }] : undefined,
  });
  if (!destino) return null;

  await invoke("exportar_imagen_obra", {
    rutaOriginal,
    rutaDestino: destino,
    formato,
    lado: formato === "original" || !medida ? null : lado,
    medida: formato === "original" ? null : medida ?? null,
    copyright: formato === "original" ? null : copyright || null,
    profundidad: formato === "tiff" ? profundidad ?? 8 : null,
    ppp: formato === "original" ? null : ppp ?? null,
  });
  return destino;
}

export interface ObraParaExportar {
  titulo: string;
  nombreArtista: string;
  rutaOriginal: string | null;
}

export interface ResultadoExportacionLote {
  carpeta: string;
  exportadas: number;
  sinArchivo: string[];
  conError: { titulo: string; mensaje: string }[];
}

/** Nombre de archivo seguro a partir del título (mismo criterio que al exportar una sola foto). */
function nombreSeguro(titulo: string): string {
  return titulo.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "obra";
}

/**
 * Exporta varias obras a una carpeta que se elige una sola vez, con el mismo criterio que al exportar una
 * foto desde su ficha (formato, lado de referencia, medida y copyright; siempre partiendo del archivo
 * original). `copyright` en null usa "© <artista> <año>" de cada obra. Nunca pisa archivos: si el nombre
 * ya existe en la carpeta, agrega _2, _3… Las obras sin archivo original se informan aparte.
 * Devuelve null si el usuario cancela la elección de carpeta.
 */
export async function exportarImagenesEnLote(opciones: {
  obras: ObraParaExportar[];
  formato: FormatoExportacion;
  lado?: LadoExportacion;
  /** Medida en píxeles del lado de referencia; sin ella cada imagen sale con su tamaño original. */
  medida?: number;
  /** Texto fijo de copyright, o null para "© <artista> <año>" en cada obra. */
  copyright: string | null;
  profundidad?: Profundidad;
  ppp?: number;
  onProgreso?: (hechas: number, total: number) => void;
}): Promise<ResultadoExportacionLote | null> {
  const { obras, formato, lado, medida, copyright, profundidad, ppp, onProgreso } = opciones;
  const { open } = await import("@tauri-apps/plugin-dialog");
  const elegida = await open({ directory: true, multiple: false });
  if (!elegida || Array.isArray(elegida)) return null;
  const carpeta = elegida;
  const separador = carpeta.includes("\\") && !carpeta.includes("/") ? "\\" : "/";
  const anio = new Date().getFullYear();

  const resultado: ResultadoExportacionLote = { carpeta, exportadas: 0, sinArchivo: [], conError: [] };
  const usados = new Set<string>();
  const exportables = obras.filter((o) => {
    if (!o.rutaOriginal) {
      resultado.sinArchivo.push(o.titulo);
      return false;
    }
    return true;
  });

  let hechas = 0;
  for (const obra of exportables) {
    const original = obra.rutaOriginal as string;
    const extension = formato === "original" ? extensionDe(original) : formato === "tiff" ? "tif" : "jpg";
    const base = nombreSeguro(obra.titulo);
    let n = 1;
    let destino: string;
    for (;;) {
      const nombre = `${n === 1 ? base : `${base}_${n}`}${extension ? `.${extension}` : ""}`;
      destino = `${carpeta}${separador}${nombre}`;
      const yaExiste = usados.has(destino) || (await invoke<boolean>("fs_existe_absoluta", { path: destino }));
      if (!yaExiste) break;
      n++;
    }
    usados.add(destino);
    try {
      await invoke("exportar_imagen_obra", {
        rutaOriginal: original,
        rutaDestino: destino,
        formato,
        lado: formato === "original" || !medida ? null : lado,
        medida: formato === "original" ? null : medida ?? null,
        copyright:
          formato === "original"
            ? null
            : (copyright ?? (obra.nombreArtista ? `© ${obra.nombreArtista} ${anio}` : `© ${anio}`)) || null,
        profundidad: formato === "tiff" ? profundidad ?? 8 : null,
        ppp: formato === "original" ? null : ppp ?? null,
      });
      resultado.exportadas++;
    } catch (err) {
      resultado.conError.push({ titulo: obra.titulo, mensaje: err instanceof Error ? err.message : String(err) });
    }
    hechas++;
    onProgreso?.(hechas, exportables.length);
  }
  return resultado;
}
