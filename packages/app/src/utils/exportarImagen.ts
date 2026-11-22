import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";

export type FormatoExportacion = "jpg" | "tiff" | "original";
export type LadoExportacion = "corto" | "largo";

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
  medida?: number;
  copyright?: string | null;
}): Promise<string | null> {
  const { rutaOriginal, nombreSugerido, formato, lado, medida, copyright } = opciones;
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
    lado: formato === "original" ? null : lado,
    medida: formato === "original" ? null : medida,
    copyright: formato === "original" ? null : copyright || null,
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
  medida?: number;
  /** Texto fijo de copyright, o null para "© <artista> <año>" en cada obra. */
  copyright: string | null;
  onProgreso?: (hechas: number, total: number) => void;
}): Promise<ResultadoExportacionLote | null> {
  const { obras, formato, lado, medida, copyright, onProgreso } = opciones;
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
        lado: formato === "original" ? null : lado,
        medida: formato === "original" ? null : medida,
        copyright:
          formato === "original"
            ? null
            : (copyright ?? (obra.nombreArtista ? `© ${obra.nombreArtista} ${anio}` : `© ${anio}`)) || null,
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
