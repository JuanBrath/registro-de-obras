import { isTauri } from "../adapters/detectPlatform.js";

export async function openExternalUrl(url: string): Promise<void> {
  if (isTauri()) {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

// Para rutas de archivo locales (ej. "Ubicacion fisica actual"), no una URL
// web: solo tiene sentido en desktop, un navegador no puede abrir una ruta
// del sistema de archivos del usuario.
export async function openLocalPath(path: string): Promise<void> {
  if (!isTauri()) return;
  const { openPath } = await import("@tauri-apps/plugin-opener");
  await openPath(path);
}
