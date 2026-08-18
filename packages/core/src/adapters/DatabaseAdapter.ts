export interface ExecuteResult {
  rowsAffected: number;
  lastInsertId?: number;
}

export interface TransactionOptions {
  /**
   * Por defecto (true) las transacciones corren con FK enforcement, igual
   * que el resto de la app. Pasar false solo para migraciones que reconstruyen
   * una tabla completa (CREATE + INSERT + DROP + RENAME): con FK activas, el
   * DROP de la tabla vieja dispara las acciones ON DELETE de las tablas que
   * la referencian (ej. pone en null ejemplar.venta_id).
   */
  foreignKeys?: boolean;
}

export interface DatabaseAdapter {
  execute(sql: string, params?: unknown[]): Promise<ExecuteResult>;
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  transaction<T>(fn: (tx: DatabaseAdapter) => Promise<T>, options?: TransactionOptions): Promise<T>;
  close(): Promise<void>;
}
