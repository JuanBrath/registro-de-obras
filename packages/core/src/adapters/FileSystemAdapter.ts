export interface FileSystemAdapter {
  readonly rootDir: string;
  ensureDir(relativePath: string): Promise<void>;
  writeFile(relativePath: string, data: Uint8Array, opts?: { overwrite?: boolean }): Promise<void>;
  readFile(relativePath: string): Promise<Uint8Array>;
  exists(relativePath: string): Promise<boolean>;
  remove(relativePath: string): Promise<void>;
  resolveAbsolutePath(relativePath: string): Promise<string>;
  /** Desktop-only: prompts the user to choose a root folder. Absent on mobile. */
  pickRootDirectory?(): Promise<string>;
}
