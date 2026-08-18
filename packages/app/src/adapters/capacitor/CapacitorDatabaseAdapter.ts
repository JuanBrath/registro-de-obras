import { CapacitorSQLite, SQLiteConnection, type SQLiteDBConnection } from "@capacitor-community/sqlite";
import type { DatabaseAdapter, ExecuteResult, TransactionOptions } from "@registro/core";

class CapacitorDatabaseAdapter implements DatabaseAdapter {
  private readonly conn: SQLiteDBConnection;

  constructor(conn: SQLiteDBConnection) {
    this.conn = conn;
  }

  async execute(sql: string, params: unknown[] = []): Promise<ExecuteResult> {
    const result = await this.conn.run(sql, params, false);
    return { rowsAffected: result.changes?.changes ?? 0, lastInsertId: result.changes?.lastId };
  }

  async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    const result = await this.conn.query(sql, params);
    return (result.values ?? []) as T[];
  }

  async transaction<T>(fn: (tx: DatabaseAdapter) => Promise<T>, options?: TransactionOptions): Promise<T> {
    // PRAGMA foreign_keys es un no-op dentro de una transaccion, por eso se
    // ajusta antes de abrirla (una sola conexion persistente, a diferencia
    // del pool de tauri-plugin-sql) y se restaura siempre al terminar.
    const foreignKeys = options?.foreignKeys ?? true;
    if (!foreignKeys) await this.conn.execute("PRAGMA foreign_keys = OFF;");
    try {
      await this.conn.beginTransaction();
      try {
        const result = await fn(this);
        await this.conn.commitTransaction();
        return result;
      } catch (error) {
        await this.conn.rollbackTransaction();
        throw error;
      }
    } finally {
      if (!foreignKeys) await this.conn.execute("PRAGMA foreign_keys = ON;");
    }
  }

  async close(): Promise<void> {
    await this.conn.close();
  }
}

export async function createCapacitorDatabaseAdapter(dbName: string): Promise<DatabaseAdapter> {
  const sqlite = new SQLiteConnection(CapacitorSQLite);

  const isConsistent = (await sqlite.checkConnectionsConsistency()).result;
  const alreadyOpen = (await sqlite.isConnection(dbName, false)).result;
  const conn =
    isConsistent && alreadyOpen
      ? await sqlite.retrieveConnection(dbName, false)
      : await sqlite.createConnection(dbName, false, "no-encryption", 1, false);

  await conn.open();
  await conn.execute("PRAGMA foreign_keys = ON;");
  return new CapacitorDatabaseAdapter(conn);
}
