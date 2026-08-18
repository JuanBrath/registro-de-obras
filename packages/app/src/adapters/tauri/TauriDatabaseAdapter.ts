import Database from "@tauri-apps/plugin-sql";
import { invoke } from "@tauri-apps/api/core";
import type { DatabaseAdapter, ExecuteResult, TransactionOptions } from "@registro/core";

// tauri-plugin-sql keeps a POOL of connections: each execute()/select() call
// grabs whichever connection is idle, so a raw "BEGIN"/…/"COMMIT" sent as
// separate calls can land on different physical connections — the write
// never actually happens inside the transaction, and the dangling open
// transaction on the other connection eventually causes "database is
// locked". For real atomicity, transaction() routes through Rust commands
// (db_commands.rs) that pin ONE dedicated connection for the whole
// transaction's lifetime. Plain execute()/query() outside a transaction are
// single autocommit statements, so the pool is fine for those.
class TauriDatabaseAdapter implements DatabaseAdapter {
  private readonly db: Database;
  private readonly dbPath: string;

  constructor(db: Database, dbPath: string) {
    this.db = db;
    this.dbPath = dbPath;
  }

  async execute(sql: string, params: unknown[] = []): Promise<ExecuteResult> {
    const result = await this.db.execute(sql, params);
    return { rowsAffected: result.rowsAffected, lastInsertId: result.lastInsertId };
  }

  async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    return this.db.select<T[]>(sql, params);
  }

  async transaction<T>(fn: (tx: DatabaseAdapter) => Promise<T>, options?: TransactionOptions): Promise<T> {
    const txId = await invoke<string>("db_begin", { dbPath: this.dbPath, foreignKeys: options?.foreignKeys ?? true });

    const txAdapter: DatabaseAdapter = {
      execute: async (sql: string, params: unknown[] = []) => {
        return invoke<ExecuteResult>("db_tx_execute", { txId, sql, params });
      },
      query: async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) => {
        return invoke<T[]>("db_tx_query", { txId, sql, params });
      },
      transaction: () => {
        throw new Error("No se admiten transacciones anidadas");
      },
      close: async () => {},
    };

    try {
      const result = await fn(txAdapter);
      await invoke("db_commit", { txId });
      return result;
    } catch (error) {
      await invoke("db_rollback", { txId }).catch(() => {});
      throw error;
    }
  }

  async close(): Promise<void> {
    await this.db.close();
  }
}

export async function createTauriDatabaseAdapter(dbFilePath: string): Promise<DatabaseAdapter> {
  const db = await Database.load(`sqlite:${dbFilePath}`);
  await db.execute("PRAGMA foreign_keys = ON");
  return new TauriDatabaseAdapter(db, dbFilePath);
}
