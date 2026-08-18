import type { DatabaseAdapter } from "../adapters/DatabaseAdapter.js";
import type { Migration } from "./migrations/0001_init.js";

const ENSURE_MIGRATIONS_TABLE = `
CREATE TABLE IF NOT EXISTS _migrations (
  name TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

export async function applyMigrations(db: DatabaseAdapter, migrations: Migration[]): Promise<void> {
  await db.execute(ENSURE_MIGRATIONS_TABLE);

  const applied = await db.query<{ name: string }>("SELECT name FROM _migrations");
  const appliedNames = new Set(applied.map((row) => row.name));

  for (const migration of migrations) {
    if (appliedNames.has(migration.name)) continue;

    // Las migraciones corren sin FK enforcement: algunas reconstruyen una
    // tabla completa (CREATE + INSERT + DROP + RENAME) y, con FK activas, el
    // DROP dispara las acciones ON DELETE de las tablas que la referencian
    // (ej. pone en null ejemplar.venta_id). PRAGMA foreign_keys es un no-op
    // dentro de una transaccion ya abierta, por eso el adapter tiene que
    // aplicarlo ANTES del BEGIN — ver TransactionOptions.foreignKeys.
    await db.transaction(
      async (tx) => {
        for (const statement of splitStatements(migration.sql)) {
          await tx.execute(statement);
        }
        await tx.execute("INSERT INTO _migrations (name) VALUES (?)", [migration.name]);
      },
      { foreignKeys: false },
    );
  }
}

// Splits on top-level ";" only, ignoring ";" characters that appear inside
// single-quoted string literals (SQL escapes a literal quote as '').
export function splitStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let insideString = false;

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    current += char;

    if (char === "'") {
      insideString = !insideString;
    } else if (char === ";" && !insideString) {
      const trimmed = current.slice(0, -1).trim();
      if (trimmed.length > 0) statements.push(trimmed);
      current = "";
    }
  }

  const trailing = current.trim();
  if (trailing.length > 0) statements.push(trailing);

  return statements;
}
