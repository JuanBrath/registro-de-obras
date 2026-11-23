import { invoke } from "@tauri-apps/api/core";
import { obraMiniaturaPath, obraOriginalPath } from "@registro/core";
import type { WorkspaceContext } from "@registro/core";
import {
  convertirImagenAJpeg,
  EXTENSIONES_A_CONVERTIR,
  EXTENSIONES_DE_IMAGEN,
  extensionDe,
  leerArchivoCrudo,
  nombreDe,
  TIPO_MIME_POR_EXTENSION,
} from "./convertirImagen.js";
import { generarMiniatura } from "./generarMiniatura.js";
import { limitImageResolution } from "./limitImageResolution.js";

/** Lo que hace falta saber de una obra para rehacer sus imagenes. */
export interface ObraParaRehacer {
  id: number;
  ubicacion_fisica_actual: string | null;
  miniatura_path: string | null;
}

/**
 * - rehecha: se volvieron a generar la imagen de la ficha y la miniatura a partir del archivo original.
 * - sin_cambios: el archivo original no cambio desde que se generaron (solo con `forzar: false`).
 * - sin_archivo: la obra no tiene archivo original registrado, no se encuentra o no es un formato de imagen que se pueda leer.
 * - error: el archivo existe pero no se pudo procesar.
 */
export type ResultadoRehacer = "rehecha" | "sin_cambios" | "sin_archivo" | "error";

async function modificadoMs(ruta: string): Promise<number | null> {
  return invoke<number | null>("fs_modificado_ms", { path: ruta });
}

/** Lee el archivo original y lo deja como una imagen JPG/PNG/etc. de a lo sumo el lado maximo de la ficha. */
async function imagenDeLaFichaDesdeOriginal(ruta: string): Promise<File> {
  const extension = extensionDe(ruta);
  if (EXTENSIONES_A_CONVERTIR.includes(extension)) {
    const jpeg = await convertirImagenAJpeg(ruta);
    return limitImageResolution(new File([jpeg as BlobPart], nombreDe(ruta).replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }));
  }
  const bytes = await leerArchivoCrudo(ruta);
  const archivo = new File([bytes as BlobPart], nombreDe(ruta), { type: TIPO_MIME_POR_EXTENSION[extension] ?? "" });
  const bitmap = await createImageBitmap(archivo); // falla si no es una imagen valida
  bitmap.close();
  return limitImageResolution(archivo);
}

/**
 * Vuelve a generar, a partir del archivo original registrado en la obra, la imagen que se ve en la ficha y la
 * miniatura que usan las tarjetas, las columnas y la vista de imagenes (son dos archivos distintos, se rehacen juntos).
 * Con `forzar: false` solo lo hace si el original se modifico despues de generada la miniatura (o si falta).
 */
export async function rehacerImagenesDeObra(
  context: Pick<WorkspaceContext, "db" | "fs">,
  obra: ObraParaRehacer,
  { forzar }: { forzar: boolean },
): Promise<ResultadoRehacer> {
  const ruta = obra.ubicacion_fisica_actual?.trim();
  if (!ruta || !EXTENSIONES_DE_IMAGEN.includes(extensionDe(ruta))) return "sin_archivo";
  const modificadoOriginal = await modificadoMs(ruta);
  if (modificadoOriginal === null) return "sin_archivo";

  if (!forzar && obra.miniatura_path) {
    const modificadoMiniatura = await modificadoMs(await context.fs.resolveAbsolutePath(obra.miniatura_path));
    if (modificadoMiniatura !== null && modificadoOriginal <= modificadoMiniatura) return "sin_cambios";
  }

  try {
    const archivo = await imagenDeLaFichaDesdeOriginal(ruta);
    const bytes = new Uint8Array(await archivo.arrayBuffer());
    const miniaturaBytes = await generarMiniatura(archivo, bytes);
    const extension = archivo.name.split(".").pop() || "jpg";
    const altaPath = obraOriginalPath(obra.id, extension);
    const miniaturaPath = obraMiniaturaPath(obra.id);

    const anterior = (
      await context.db.query<{ imagen_alta_resolucion_path: string | null }>(
        "SELECT imagen_alta_resolucion_path FROM obra WHERE id = ?",
        [obra.id],
      )
    )[0]?.imagen_alta_resolucion_path;

    await context.fs.writeFile(altaPath, bytes);
    await context.fs.writeFile(miniaturaPath, miniaturaBytes);
    await context.db.execute(`UPDATE obra SET imagen_alta_resolucion_path = ?, miniatura_path = ? WHERE id = ?`, [
      altaPath,
      miniaturaPath,
      obra.id,
    ]);
    if (anterior && anterior !== altaPath) {
      await context.fs.remove(anterior).catch(() => {});
    }
    return "rehecha";
  } catch {
    return "error";
  }
}
