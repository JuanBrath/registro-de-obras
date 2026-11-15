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
