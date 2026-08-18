import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { isTauri } from "../adapters/detectPlatform.js";

/**
 * Guarda bytes ya generados eligiendo el destino con el diálogo nativo
 * "Guardar como" en Tauri. Fuera de Tauri (web/dev) cae a la descarga
 * estándar del navegador. Devuelve false si el usuario cancela.
 */
async function saveBytesWithDialog(
  bytes: Uint8Array,
  defaultFileName: string,
  mimeType: string,
  filterName: string,
  extensions: string[],
): Promise<boolean> {
  if (!isTauri()) {
    const blob = new Blob([bytes as BlobPart], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = defaultFileName;
    a.click();
    URL.revokeObjectURL(url);
    return true;
  }

  const path = await save({
    defaultPath: defaultFileName,
    filters: [{ name: filterName, extensions }],
  });
  if (!path) return false;

  await invoke("fs_write_absolute", { path, data: Array.from(bytes) });
  return true;
}

export async function savePdfWithDialog(bytes: Uint8Array, defaultFileName: string): Promise<boolean> {
  return saveBytesWithDialog(bytes, defaultFileName, "application/pdf", "PDF", ["pdf"]);
}

export async function saveXlsxWithDialog(bytes: Uint8Array, defaultFileName: string): Promise<boolean> {
  return saveBytesWithDialog(
    bytes,
    defaultFileName,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Excel",
    ["xlsx"],
  );
}
