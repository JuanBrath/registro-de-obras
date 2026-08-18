use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};

use serde_json::Value as JsonValue;
use sqlx::sqlite::{SqliteConnectOptions, SqliteRow};
use sqlx::{Column, Connection, Row, SqliteConnection, TypeInfo};
use tauri::State;
use tokio::sync::Mutex;

// tauri-plugin-sql keeps a POOL of connections and hands out whichever is idle
// on each execute()/select() call — a raw "BEGIN"/…/"COMMIT" sent as separate
// calls can therefore land on different physical connections, breaking
// atomicity and leaving dangling open transactions ("database is locked").
// This module opens one dedicated connection per logical transaction and
// keeps it pinned in memory (keyed by a transaction id) for the lifetime of
// that transaction, so every statement in it truly runs on the same session.
#[derive(Default)]
pub struct TxState(Mutex<HashMap<String, SqliteConnection>>);

static NEXT_TX_ID: AtomicU64 = AtomicU64::new(1);

fn json_to_sql_argument<'q>(
    query: sqlx::query::Query<'q, sqlx::Sqlite, sqlx::sqlite::SqliteArguments<'q>>,
    value: &'q JsonValue,
) -> sqlx::query::Query<'q, sqlx::Sqlite, sqlx::sqlite::SqliteArguments<'q>> {
    match value {
        JsonValue::Null => query.bind(None::<String>),
        JsonValue::Bool(b) => query.bind(*b as i64),
        JsonValue::Number(n) => {
            if let Some(i) = n.as_i64() {
                query.bind(i)
            } else {
                query.bind(n.as_f64())
            }
        }
        JsonValue::String(s) => query.bind(s.as_str()),
        other => query.bind(other.to_string()),
    }
}

fn row_to_json(row: &SqliteRow) -> HashMap<String, JsonValue> {
    let mut map = HashMap::new();
    for (i, column) in row.columns().iter().enumerate() {
        let type_name = column.type_info().name();
        let value = if let Ok(v) = row.try_get::<i64, _>(i) {
            if type_name == "BOOLEAN" {
                JsonValue::Bool(v != 0)
            } else {
                JsonValue::Number(v.into())
            }
        } else if let Ok(v) = row.try_get::<f64, _>(i) {
            serde_json::Number::from_f64(v).map(JsonValue::Number).unwrap_or(JsonValue::Null)
        } else if let Ok(v) = row.try_get::<String, _>(i) {
            JsonValue::String(v)
        } else {
            JsonValue::Null
        };
        map.insert(column.name().to_string(), value);
    }
    map
}

#[tauri::command]
pub async fn db_begin(
    state: State<'_, TxState>,
    db_path: String,
    foreign_keys: Option<bool>,
) -> Result<String, String> {
    let options = SqliteConnectOptions::new()
        .filename(&db_path)
        .busy_timeout(std::time::Duration::from_secs(5));
    let mut conn = SqliteConnection::connect_with(&options)
        .await
        .map_err(|e| e.to_string())?;
    let fk_pragma = if foreign_keys.unwrap_or(true) {
        "PRAGMA foreign_keys = ON"
    } else {
        "PRAGMA foreign_keys = OFF"
    };
    sqlx::query(fk_pragma)
        .execute(&mut conn)
        .await
        .map_err(|e| e.to_string())?;
    sqlx::query("BEGIN")
        .execute(&mut conn)
        .await
        .map_err(|e| e.to_string())?;

    let tx_id = NEXT_TX_ID.fetch_add(1, Ordering::SeqCst).to_string();
    state.0.lock().await.insert(tx_id.clone(), conn);
    Ok(tx_id)
}

#[tauri::command]
pub async fn db_tx_execute(
    state: State<'_, TxState>,
    tx_id: String,
    sql: String,
    params: Vec<JsonValue>,
) -> Result<HashMap<String, JsonValue>, String> {
    let mut guard = state.0.lock().await;
    let conn = guard.get_mut(&tx_id).ok_or("transaccion desconocida o ya finalizada")?;

    let mut query = sqlx::query(&sql);
    for param in &params {
        query = json_to_sql_argument(query, param);
    }
    let result = query.execute(conn).await.map_err(|e| e.to_string())?;

    let mut out = HashMap::new();
    out.insert("rowsAffected".to_string(), JsonValue::Number(result.rows_affected().into()));
    out.insert(
        "lastInsertId".to_string(),
        JsonValue::Number(result.last_insert_rowid().into()),
    );
    Ok(out)
}

#[tauri::command]
pub async fn db_tx_query(
    state: State<'_, TxState>,
    tx_id: String,
    sql: String,
    params: Vec<JsonValue>,
) -> Result<Vec<HashMap<String, JsonValue>>, String> {
    let mut guard = state.0.lock().await;
    let conn = guard.get_mut(&tx_id).ok_or("transaccion desconocida o ya finalizada")?;

    let mut query = sqlx::query(&sql);
    for param in &params {
        query = json_to_sql_argument(query, param);
    }
    let rows = query.fetch_all(conn).await.map_err(|e| e.to_string())?;
    Ok(rows.iter().map(row_to_json).collect())
}

#[tauri::command]
pub async fn db_commit(state: State<'_, TxState>, tx_id: String) -> Result<(), String> {
    let mut conn = state
        .0
        .lock()
        .await
        .remove(&tx_id)
        .ok_or("transaccion desconocida o ya finalizada")?;
    sqlx::query("COMMIT").execute(&mut conn).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn db_rollback(state: State<'_, TxState>, tx_id: String) -> Result<(), String> {
    let Some(mut conn) = state.0.lock().await.remove(&tx_id) else {
        return Ok(());
    };
    let _ = sqlx::query("ROLLBACK").execute(&mut conn).await;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    async fn open_test_db() -> (SqliteConnection, String) {
        let path = std::env::temp_dir().join(format!(
            "registro_tx_test_{}.db",
            NEXT_TX_ID.fetch_add(1, Ordering::SeqCst)
        ));
        let path = path.to_string_lossy().to_string();
        let _ = std::fs::remove_file(&path);

        let options = SqliteConnectOptions::new().filename(&path).create_if_missing(true);
        let conn = SqliteConnection::connect_with(&options).await.unwrap();
        (conn, path)
    }

    // Reproduces the exact multi-statement pattern VentaForm runs inside a
    // transaction (read a counter, increment it, insert a row depending on
    // that value, update a second row, insert a log row) — all on a single
    // pinned connection, the way db_begin/db_tx_execute/db_commit do it for
    // real through the Tauri commands above.
    #[tokio::test]
    async fn multi_statement_transaction_commits_atomically_on_one_connection() {
        let (mut conn, path) = open_test_db().await;

        sqlx::query(
            "CREATE TABLE contador (id INTEGER PRIMARY KEY, siguiente INTEGER NOT NULL);
             CREATE TABLE items (id INTEGER PRIMARY KEY AUTOINCREMENT, numero INTEGER, estado TEXT);
             CREATE TABLE log (id INTEGER PRIMARY KEY AUTOINCREMENT, mensaje TEXT);",
        )
        .execute(&mut conn)
        .await
        .unwrap();
        sqlx::query("INSERT INTO contador (id, siguiente) VALUES (1, 5)")
            .execute(&mut conn)
            .await
            .unwrap();
        sqlx::query("INSERT INTO items (numero, estado) VALUES (0, 'disponible')")
            .execute(&mut conn)
            .await
            .unwrap();

        drop(conn);

        // From here on, mimic exactly what db_begin/db_tx_execute/db_commit do.
        let options = SqliteConnectOptions::new()
            .filename(&path)
            .busy_timeout(std::time::Duration::from_secs(5));
        let mut tx_conn = SqliteConnection::connect_with(&options).await.unwrap();
        sqlx::query("BEGIN").execute(&mut tx_conn).await.unwrap();

        let row = sqlx::query("SELECT siguiente FROM contador WHERE id = 1")
            .fetch_one(&mut tx_conn)
            .await
            .unwrap();
        let numero: i64 = row.try_get("siguiente").unwrap();
        assert_eq!(numero, 5);

        sqlx::query("UPDATE contador SET siguiente = siguiente + 1 WHERE id = 1")
            .execute(&mut tx_conn)
            .await
            .unwrap();
        sqlx::query("UPDATE items SET numero = ?, estado = 'vendida' WHERE id = 1")
            .bind(numero)
            .execute(&mut tx_conn)
            .await
            .unwrap();
        sqlx::query("INSERT INTO log (mensaje) VALUES (?)")
            .bind(format!("vendido #{numero}"))
            .execute(&mut tx_conn)
            .await
            .unwrap();

        sqlx::query("COMMIT").execute(&mut tx_conn).await.unwrap();
        drop(tx_conn);

        let mut verify_conn = SqliteConnection::connect_with(
            &SqliteConnectOptions::new().filename(&path),
        )
        .await
        .unwrap();

        let contador_row = sqlx::query("SELECT siguiente FROM contador WHERE id = 1")
            .fetch_one(&mut verify_conn)
            .await
            .unwrap();
        let siguiente: i64 = contador_row.try_get("siguiente").unwrap();
        assert_eq!(siguiente, 6);

        let item_row = sqlx::query("SELECT numero, estado FROM items WHERE id = 1")
            .fetch_one(&mut verify_conn)
            .await
            .unwrap();
        let item_numero: i64 = item_row.try_get("numero").unwrap();
        let item_estado: String = item_row.try_get("estado").unwrap();
        assert_eq!(item_numero, 5);
        assert_eq!(item_estado, "vendida");

        let log_row = sqlx::query("SELECT mensaje FROM log WHERE id = 1")
            .fetch_one(&mut verify_conn)
            .await
            .unwrap();
        let mensaje: String = log_row.try_get("mensaje").unwrap();
        assert_eq!(mensaje, "vendido #5");

        let _ = std::fs::remove_file(&path);
    }

    // Reproduces migration 0017 (packages/core): a CHECK constraint can only
    // be widened in SQLite by rebuilding the table (CREATE + INSERT SELECT +
    // DROP + RENAME). With FK enforcement on, DROPping the referenced table
    // nulls out every row that pointed to it via ON DELETE SET NULL — this
    // confirms that opening the transaction with foreign_keys=false (as
    // db_begin now allows) avoids that and the reference survives the rebuild
    // once FK enforcement is turned back on.
    #[tokio::test]
    async fn table_rebuild_with_foreign_keys_disabled_preserves_child_references() {
        let (mut conn, path) = open_test_db().await;

        sqlx::query(
            "CREATE TABLE padre (id INTEGER PRIMARY KEY AUTOINCREMENT, tipo TEXT NOT NULL CHECK (tipo IN ('a','b')));
             CREATE TABLE hijo (id INTEGER PRIMARY KEY AUTOINCREMENT, padre_id INTEGER REFERENCES padre(id) ON DELETE SET NULL);",
        )
        .execute(&mut conn)
        .await
        .unwrap();
        sqlx::query("INSERT INTO padre (tipo) VALUES ('a')").execute(&mut conn).await.unwrap();
        sqlx::query("INSERT INTO hijo (padre_id) VALUES (1)").execute(&mut conn).await.unwrap();
        drop(conn);

        // Mimic db_begin(foreign_keys: Some(false)) followed by the rebuild
        // statements a migration would send through db_tx_execute.
        let options = SqliteConnectOptions::new()
            .filename(&path)
            .busy_timeout(std::time::Duration::from_secs(5));
        let mut tx_conn = SqliteConnection::connect_with(&options).await.unwrap();
        sqlx::query("PRAGMA foreign_keys = OFF").execute(&mut tx_conn).await.unwrap();
        sqlx::query("BEGIN").execute(&mut tx_conn).await.unwrap();

        sqlx::query("CREATE TABLE padre_new (id INTEGER PRIMARY KEY AUTOINCREMENT, tipo TEXT NOT NULL CHECK (tipo IN ('a','b','c')))")
            .execute(&mut tx_conn)
            .await
            .unwrap();
        sqlx::query("INSERT INTO padre_new (id, tipo) SELECT id, tipo FROM padre")
            .execute(&mut tx_conn)
            .await
            .unwrap();
        sqlx::query("DROP TABLE padre").execute(&mut tx_conn).await.unwrap();
        sqlx::query("ALTER TABLE padre_new RENAME TO padre").execute(&mut tx_conn).await.unwrap();

        sqlx::query("COMMIT").execute(&mut tx_conn).await.unwrap();
        drop(tx_conn);

        let mut verify_conn = SqliteConnection::connect_with(&SqliteConnectOptions::new().filename(&path))
            .await
            .unwrap();
        let hijo_row = sqlx::query("SELECT padre_id FROM hijo WHERE id = 1")
            .fetch_one(&mut verify_conn)
            .await
            .unwrap();
        let padre_id: Option<i64> = hijo_row.try_get("padre_id").unwrap();
        assert_eq!(padre_id, Some(1));

        let _ = std::fs::remove_file(&path);
    }
}
