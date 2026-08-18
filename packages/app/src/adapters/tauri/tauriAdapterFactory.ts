import { Store } from "@tauri-apps/plugin-store";
import type { PlatformAdapterFactory, WorkspaceId } from "@registro/core";
import { createTauriDatabaseAdapter } from "./TauriDatabaseAdapter.js";
import { TauriFileSystemAdapter, pickTauriRootDirectory } from "./TauriFileSystemAdapter.js";

const STORE_FILE = "workspace-roots.json";

async function getOrPickRoot(store: Store, workspace: WorkspaceId): Promise<string> {
  const existing = await store.get<string>(workspace);
  if (existing) return existing;

  const picked = await pickTauriRootDirectory();
  if (!picked) {
    throw new Error(`Se necesita elegir una carpeta para el registro "${workspace}"`);
  }

  await store.set(workspace, picked);
  await store.save();
  return picked;
}

export async function createTauriAdapterFactory(): Promise<PlatformAdapterFactory> {
  const store = await Store.load(STORE_FILE);

  return {
    async createDatabaseAdapter(workspace) {
      const root = await getOrPickRoot(store, workspace);
      return createTauriDatabaseAdapter(`${root}/registro.db`);
    },
    async createFileSystemAdapter(workspace) {
      const root = await getOrPickRoot(store, workspace);
      const fs = new TauriFileSystemAdapter(root);
      await fs.ensureDir("obras");
      await fs.ensureDir("certificados");
      return fs;
    },
  };
}
