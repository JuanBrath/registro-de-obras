import { Directory, Filesystem } from "@capacitor/filesystem";
import type { FileSystemAdapter } from "@registro/core";

function bytesToBase64(data: Uint8Array): string {
  let binary = "";
  for (const byte of data) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Mobile has no folder picker: each workspace gets a fixed, sandboxed
// subfolder under the app's Documents directory (Filesystem.Directory.Documents).
export class CapacitorFileSystemAdapter implements FileSystemAdapter {
  readonly rootDir: string;

  constructor(rootDir: string) {
    this.rootDir = rootDir;
  }

  private fullPath(relativePath: string): string {
    return `${this.rootDir}/${relativePath}`;
  }

  async ensureDir(relativePath: string): Promise<void> {
    await Filesystem.mkdir({
      path: this.fullPath(relativePath),
      directory: Directory.Documents,
      recursive: true,
    }).catch(() => undefined);
  }

  async writeFile(relativePath: string, data: Uint8Array): Promise<void> {
    await Filesystem.writeFile({
      path: this.fullPath(relativePath),
      directory: Directory.Documents,
      data: bytesToBase64(data),
      recursive: true,
    });
  }

  async readFile(relativePath: string): Promise<Uint8Array> {
    const result = await Filesystem.readFile({
      path: this.fullPath(relativePath),
      directory: Directory.Documents,
    });
    return base64ToBytes(result.data as string);
  }

  async exists(relativePath: string): Promise<boolean> {
    try {
      await Filesystem.stat({ path: this.fullPath(relativePath), directory: Directory.Documents });
      return true;
    } catch {
      return false;
    }
  }

  async remove(relativePath: string): Promise<void> {
    const stat = await Filesystem.stat({ path: this.fullPath(relativePath), directory: Directory.Documents });
    if (stat.type === "directory") {
      await Filesystem.rmdir({ path: this.fullPath(relativePath), directory: Directory.Documents, recursive: true });
    } else {
      await Filesystem.deleteFile({ path: this.fullPath(relativePath), directory: Directory.Documents });
    }
  }

  async resolveAbsolutePath(relativePath: string): Promise<string> {
    const result = await Filesystem.getUri({ path: this.fullPath(relativePath), directory: Directory.Documents });
    return result.uri;
  }
}
