import { invoke } from "@tauri-apps/api/core";
import { save, ask } from "@tauri-apps/plugin-dialog";
import { isTauri } from "../adapters/detectPlatform.js";
import { openLocalFile } from "./openExternalUrl.js";

/**
 * Guarda bytes ya generados eligiendo el destino con el diálogo nativo
 * "Guardar como" en Tauri. Fuera de Tauri (web/dev) cae a la descarga
 * estándar del navegador (en ese caso no hay una ruta real en disco que
 * despues se pueda abrir, por eso "path" da null). Devuelve saved:false si
 * el usuario cancela el diálogo de guardado.
 */
async function saveBytesWithDialog(
  bytes: Uint8Array,
  defaultFileName: string,
  mimeType: string,
  filterName: string,
  extensions: string[],
): Promise<{ saved: boolean; path: string | null }> {
  if (!isTauri()) {
    const blob = new Blob([bytes as BlobPart], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = defaultFileName;
    a.click();
    URL.revokeObjectURL(url);
    return { saved: true, path: null };
  }

  const path = await save({
    defaultPath: defaultFileName,
    filters: [{ name: filterName, extensions }],
  });
  if (!path) return { saved: false, path: null };

  await invoke("fs_write_absolute", { path, data: Array.from(bytes) });
  return { saved: true, path };
}

export async function savePdfWithDialog(bytes: Uint8Array, defaultFileName: string): Promise<boolean> {
  const { saved, path } = await saveBytesWithDialog(bytes, defaultFileName, "application/pdf", "PDF", ["pdf"]);
  if (saved && path) {
    const verlo = await ask("El informe en PDF se guardó correctamente. ¿Querés abrirlo para verlo ahora?", {
      title: "Informe generado",
      kind: "info",
      okLabel: "Abrir PDF",
      cancelLabel: "Cerrar",
    });
    if (verlo) await openLocalFile(path);
  }
  return saved;
}

export async function saveXlsxWithDialog(bytes: Uint8Array, defaultFileName: string): Promise<boolean> {
  const { saved } = await saveBytesWithDialog(
    bytes,
    defaultFileName,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Excel",
    ["xlsx"],
  );
  return saved;
}
