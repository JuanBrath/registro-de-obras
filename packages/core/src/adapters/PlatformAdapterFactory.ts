import type { DatabaseAdapter } from "./DatabaseAdapter.js";
import type { FileSystemAdapter } from "./FileSystemAdapter.js";

export type WorkspaceId = "personal" | "galeria";

export interface PlatformAdapterFactory {
  createDatabaseAdapter(workspace: WorkspaceId): Promise<DatabaseAdapter>;
  createFileSystemAdapter(workspace: WorkspaceId): Promise<FileSystemAdapter>;
}
