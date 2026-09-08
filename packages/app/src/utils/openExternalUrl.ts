import { isTauri } from "../adapters/detectPlatform.js";

export async function openExternalUrl(url: string): Promise<void> {
  if (isTauri()) {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

// Para rutas de archivo locales (ej. "Ubicacion del archivo original"), no
// una URL web: solo tiene sentido en desktop, un navegador no puede acceder
// al sistema de archivos del usuario. Muestra el archivo seleccionado en el
// explorador del sistema (Finder en Mac, Explorador en Windows) en vez de
// abrirlo con su aplicacion por defecto — asi el usuario ve donde esta
// ubicado sin depender de tener un programa que sepa abrir ese formato.
export async function revealInFileManager(path: string): Promise<void> {
  if (!isTauri()) return;
  const { revealItemInDir } = await import("@tauri-apps/plugin-opener");
  await revealItemInDir(path);
}
