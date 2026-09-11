import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { FileSystemAdapter } from "@registro/core";

export class TauriFileSystemAdapter implements FileSystemAdapter {
  readonly rootDir: string;

  constructor(rootDir: string) {
    this.rootDir = rootDir;
  }

  async ensureDir(relativePath: string): Promise<void> {
    await invoke("fs_ensure_dir", { root: this.rootDir, relativePath });
  }

  async writeFile(relativePath: string, data: Uint8Array): Promise<void> {
    await invoke("fs_write_file", { root: this.rootDir, relativePath, data: Array.from(data) });
  }

  async readFile(relativePath: string): Promise<Uint8Array> {
    // fs_read_file devuelve una respuesta IPC "cruda" (ArrayBuffer), no un
    // JSON con un numero por byte: para las miniaturas/imagenes que se leen
    // todo el tiempo, evita el costo (mucho mas notorio en una computadora
    // con un procesador mas modesto) de serializar cada byte como numero.
    const bytes = await invoke<ArrayBuffer>("fs_read_file", { root: this.rootDir, relativePath });
    return new Uint8Array(bytes);
  }

  async exists(relativePath: string): Promise<boolean> {
    return invoke<boolean>("fs_exists", { root: this.rootDir, relativePath });
  }

  async remove(relativePath: string): Promise<void> {
    await invoke("fs_remove", { root: this.rootDir, relativePath });
  }

  async resolveAbsolutePath(relativePath: string): Promise<string> {
    return invoke<string>("fs_resolve_absolute", { root: this.rootDir, relativePath });
  }

  async pickRootDirectory(): Promise<string> {
    const picked = await pickTauriRootDirectory();
    if (!picked) throw new Error("Selección de carpeta cancelada");
    return picked;
  }
}

/** Standalone picker used by the factory, before a FileSystemAdapter (which needs a rootDir) exists. */
export async function pickTauriRootDirectory(): Promise<string | null> {
  const selected = await open({ directory: true, multiple: false });
  return typeof selected === "string" ? selected : null;
}

/** Lets the user browse the filesystem and pick a single file's path (used for "ubicación física actual"). */
export async function pickTauriFilePath(): Promise<string | null> {
  const selected = await open({ directory: false, multiple: false });
  return typeof selected === "string" ? selected : null;
}

/**
 * Reads the bytes of an absolute path the user already picked explicitly
 * (e.g. via pickTauriFilePath), to read its metadata. `maxBytes`, when
 * given, caps how much gets read from the start of the file instead of
 * reading it whole — worth it for formats that can be huge (PSD/PSB, camera
 * RAW) since the metadata this app looks for always lives near the start.
 */
export async function readAbsoluteFileBytes(path: string, maxBytes?: number): Promise<Uint8Array> {
  const bytes = await invoke<number[]>("fs_read_absolute", { path, maxBytes });
  return new Uint8Array(bytes);
}
