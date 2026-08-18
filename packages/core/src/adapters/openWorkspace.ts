import { ALL_MIGRATIONS } from "../schema/migrations/0001_init.js";
import { applyMigrations } from "../schema/migrationRunner.js";
import type { DatabaseAdapter } from "./DatabaseAdapter.js";
import type { FileSystemAdapter } from "./FileSystemAdapter.js";
import type { PlatformAdapterFactory, WorkspaceId } from "./PlatformAdapterFactory.js";

export interface WorkspaceContext {
  workspace: WorkspaceId;
  db: DatabaseAdapter;
  fs: FileSystemAdapter;
}

export async function openWorkspace(
  workspace: WorkspaceId,
  factory: PlatformAdapterFactory,
): Promise<WorkspaceContext> {
  const db = await factory.createDatabaseAdapter(workspace);
  await applyMigrations(db, ALL_MIGRATIONS);
  const fs = await factory.createFileSystemAdapter(workspace);
  return { workspace, db, fs };
}
