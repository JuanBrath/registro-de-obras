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
    const bytes = await invoke<number[]>("fs_read_file", { root: this.rootDir, relativePath });
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
