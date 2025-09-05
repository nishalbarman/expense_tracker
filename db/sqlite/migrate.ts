import * as SQLite from "expo-sqlite";
import { insertTx } from "@/db/sqlite/repo";
import { mmkvStorage } from "@/mmkv/mmkvStorage";

// Open persistent database
const db = SQLite.openDatabaseSync("app.db");

// Run a block within a transaction (all or nothing)
function withTransaction(fn: () => void) {
  db.withTransactionSync(fn);
}

// Ensure migrations table exists
function ensureMigrationsTable() {
  db.execSync(`
    PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at INTEGER NOT NULL
    );
  `);
}

// Return names of applied migrations
function getAppliedMigrations(): Set<string> {
  const rows = db.getAllSync(
    `SELECT name FROM migrations ORDER BY id ASC`
  ) as Array<{ name: string }>;
  return new Set(rows.map((r) => r.name));
}

// Mark a migration as applied
function markApplied(name: string) {
  const now = Date.now();
  db.runSync(
    `INSERT INTO migrations (name, applied_at) VALUES (?, ?)`,
    name,
    now
  );
}

// Optional: read PRAGMA user_version
function getUserVersion(): number {
  const row = db.getFirstSync(`PRAGMA user_version`) as any;
  // expo-sqlite returns { user_version: 0 } on native
  return Number(row?.user_version ?? 0);
}

// Optional: set PRAGMA user_version
function setUserVersion(v: number) {
  db.execSync(`PRAGMA user_version = ${v};`);
}

/**
 * Define migrations in order. Each migration has:
 * - name: unique identifier
 * - up(): executes SQL to move schema forward (wrapped in a transaction by runner)
 */
const migrations: Array<{ name: string; up: () => void }> = [
  {
    name: "001_init_schema",
    up: () => {
      // Base schema
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
      db.execSync(
        `CREATE INDEX IF NOT EXISTS idx_tx_user_date ON transactions(user_id, date_iso DESC);`
      );
      db.execSync(
        `CREATE INDEX IF NOT EXISTS idx_tx_user_type ON transactions(user_id, type);`
      );
      db.execSync(
        `CREATE INDEX IF NOT EXISTS idx_tx_user_updated ON transactions(user_id, updated_at);`
      );

      db.execSync(`
        CREATE TABLE IF NOT EXISTS sync_state (
          user_id TEXT PRIMARY KEY,
          last_pull_cursor TEXT,
          last_pull_ms INTEGER,
          last_push_ms INTEGER
        );
      `);
    },
  },
  {
    name: "002_add_currency_column",
    up: () => {
      // Add a new column if not exists (SQLite ALTER TABLE ADD COLUMN works only if not present)
      // Guard pattern: try add; if it fails with duplicate column, ignore
      try {
        db.execSync(
          `ALTER TABLE transactions ADD COLUMN currency TEXT DEFAULT 'INR';`
        );
      } catch {
        // Column may already exist; ignore
      }
      // Optional index for currency if you filter by it often
      // SQLite does not support IF NOT EXISTS for CREATE INDEX with same name prior to 3.8.0+
      try {
        db.execSync(
          `CREATE INDEX IF NOT EXISTS idx_tx_user_currency ON transactions(user_id, currency);`
        );
      } catch {}
    },
  },
  {
    name: "003_index_category",
    up: () => {
      try {
        db.execSync(
          `CREATE INDEX IF NOT EXISTS idx_tx_user_category ON transactions(user_id, category);`
        );
      } catch {}
    },
  },
];

/**
 * Run all pending migrations exactly once.
 * This function is safe to call on every app startup.
 */
export function migrateDbIfNeeded() {
  ensureMigrationsTable();
  const applied = getAppliedMigrations();

  // Optionally sync user_version with number of migrations
  const currentUserVersion = getUserVersion();

  for (const m of migrations) {
    if (applied.has(m.name)) continue;
    withTransaction(() => {
      m.up();
      markApplied(m.name);
    });
  }

  // Bump PRAGMA user_version to the number of migrations applied
  const targetVersion = migrations.length;
  if (currentUserVersion < targetVersion) {
    setUserVersion(targetVersion);
  }
}

const KEY_TX_ALL = "transactions";
const LOCAL_UID = "__local__";

export async function importFromMmkvToSqlite(currentUid?: string) {
  const raw = await mmkvStorage.getItem(KEY_TX_ALL);
  if (!raw) return;
  try {
    const items = JSON.parse(raw) as Array<any>;
    const now = Date.now();
    // Batch insert with a transaction
    const db = (await import("expo-sqlite")).openDatabaseSync("app.db");
    db.withTransactionSync(() => {
      for (const t of items) {
        insertTx({
          id: String(t.id),
          userId: String(t.userId ?? currentUid ?? LOCAL_UID),
          amount: Number(t.amount) || 0,
          category: String(t.category || ""),
          dateIso:
            typeof t.date === "string" ? t.date : new Date(0).toISOString(),
          notes: String(t.notes || ""),
          type: String(t.type || "expense").toLowerCase() as any,
          synced: !!t.synced,
          updatedAt: now,
          deleted: !!t.deleted,
        });
      }
    });
    // Optionally clear old key
    // await mmkvStorage.removeItem(KEY_TX_ALL);
  } catch (e) {
    console.warn("MMKV -> SQLite import failed:", e);
  }
}
