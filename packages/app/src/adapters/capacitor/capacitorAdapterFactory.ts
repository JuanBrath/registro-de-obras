import type { PlatformAdapterFactory } from "@registro/core";
import { createCapacitorDatabaseAdapter } from "./CapacitorDatabaseAdapter.js";
import { CapacitorFileSystemAdapter } from "./CapacitorFileSystemAdapter.js";

export async function createCapacitorAdapterFactory(): Promise<PlatformAdapterFactory> {
  return {
    async createDatabaseAdapter(workspace) {
      return createCapacitorDatabaseAdapter(`registro_${workspace}`);
    },
    async createFileSystemAdapter(workspace) {
      const fs = new CapacitorFileSystemAdapter(`registro-${workspace}`);
      await fs.ensureDir("obras");
      await fs.ensureDir("certificados");
      return fs;
    },
  };
}
