import * as SQLite from 'expo-sqlite';

export const db = SQLite.openDatabaseSync('app.db'); // persistent DB [1]

export function runMigrations() {
  db.execSync('PRAGMA journal_mode=WAL;'); // performance & durability [3]

  db.execSync(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  db.execSync(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      date_iso TEXT NOT NULL,
      notes TEXT,
      type TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL DEFAULT 0,
      deleted INTEGER NOT NULL DEFAULT 0
    );
  `);

  db.execSync(`CREATE INDEX IF NOT EXISTS idx_tx_user_date ON transactions(user_id, date_iso DESC);`);
  db.execSync(`CREATE INDEX IF NOT EXISTS idx_tx_user_type ON transactions(user_id, type);`);
  db.execSync(`CREATE INDEX IF NOT EXISTS idx_tx_user_updated ON transactions(user_id, updated_at);`);

  db.execSync(`
    CREATE TABLE IF NOT EXISTS sync_state (
      user_id TEXT PRIMARY KEY,
      last_pull_cursor TEXT,
      last_pull_ms INTEGER,
      last_push_ms INTEGER
    );
  `);
}
