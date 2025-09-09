import { mmkvStorage } from "@/mmkv/mmkvStorage";
import * as SQLite from "expo-sqlite";
import { insertTx } from "./repos/transactionRepo";
import { database } from "./client";

// Persistent DB
const db = SQLite.openDatabaseSync("app.db");

function withTransaction(fn: () => void) {
  db.withTransactionSync(fn);
}

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

function getAppliedMigrations(): Set<string> {
  const rows = db.getAllSync(`SELECT name FROM migrations`) as Array<{
    name: string;
  }>;
  return new Set(rows.map((r) => r.name));
}

function markApplied(name: string) {
  db.runSync(
    `INSERT INTO migrations (name, applied_at) VALUES (?, ?)`,
    name,
    Date.now()
  );
}

function getUserVersion(): number {
  const row = db.getFirstSync(`PRAGMA user_version`) as any;
  return Number(row?.user_version ?? 0);
}

function setUserVersion(v: number) {
  db.execSync(`PRAGMA user_version = ${v}`);
}

// ---------------------------
// Define migrations
// ---------------------------
const migrations: Array<{ name: string; up: () => void }> = [
  {
    name: "001_init_schema",
    up: () => {
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

      db.execSync(`
        CREATE INDEX IF NOT EXISTS idx_tx_user_date 
        ON transactions(user_id, date_iso DESC);
      `);
      db.execSync(`
        CREATE INDEX IF NOT EXISTS idx_tx_user_type 
        ON transactions(user_id, type, amount);
      `);
      // db.execSync(`
      //   CREATE INDEX IF NOT EXISTS idx_tx_user_currency
      //   ON transactions(user_id, currency);
      // `);
      db.execSync(`
        CREATE INDEX IF NOT EXISTS idx_tx_user_updated 
        ON transactions(user_id, updated_at DESC);
      `);
      db.execSync(`
        CREATE INDEX IF NOT EXISTS idx_tx_user_deleted 
        ON transactions(user_id, deleted);
      `);

      db.execSync(`
        CREATE TABLE IF NOT EXISTS sync_state (
          user_id TEXT PRIMARY KEY,
          last_pull_cursor TEXT,
          last_pull_ms INTEGER,
          last_push_ms INTEGER
        );
      `);

      db.execSync(`
        CREATE TABLE IF NOT EXISTS user_summary (
          user_id TEXT PRIMARY KEY,
          total_income REAL NOT NULL DEFAULT 0,
          total_expense REAL NOT NULL DEFAULT 0,
          balance AS (total_income - total_expense) STORED
        );
      `);

      // --- TRIGGERS for user_summary ---
      db.execSync(`
        CREATE TRIGGER IF NOT EXISTS trg_tx_ins AFTER INSERT ON transactions
        BEGIN
          INSERT OR IGNORE INTO user_summary(user_id, total_income, total_expense)
          VALUES (NEW.user_id, 0, 0);

          UPDATE user_summary
          SET 
            total_income  = COALESCE(total_income, 0)  + CASE WHEN NEW.type = 'income'  AND NEW.deleted = 0 THEN NEW.amount ELSE 0 END,
            total_expense = COALESCE(total_expense, 0) + CASE WHEN NEW.type = 'expense' AND NEW.deleted = 0 THEN NEW.amount ELSE 0 END
          WHERE user_id = NEW.user_id;
        END;
      `);

      db.execSync(`
        CREATE TRIGGER IF NOT EXISTS trg_tx_upd AFTER UPDATE ON transactions
        BEGIN

          UPDATE user_summary
          SET 
            total_income  = COALESCE(total_income, 0)  - CASE WHEN OLD.type='income'  AND OLD.deleted=0 THEN OLD.amount ELSE 0 END,
            total_expense = COALESCE(total_expense, 0) - CASE WHEN OLD.type='expense' AND OLD.deleted=0 THEN OLD.amount ELSE 0 END
          WHERE user_id = OLD.user_id;

          UPDATE user_summary
          SET 
            total_income  = COALESCE(total_income, 0)  + CASE WHEN NEW.type='income'  AND NEW.deleted=0 THEN NEW.amount ELSE 0 END,
            total_expense = COALESCE(total_expense, 0) + CASE WHEN NEW.type='expense' AND NEW.deleted=0 THEN NEW.amount ELSE 0 END
          WHERE user_id = NEW.user_id;
        END;
      `);

      db.execSync(`
        CREATE TRIGGER IF NOT EXISTS trg_tx_del AFTER DELETE ON transactions
        BEGIN
          UPDATE user_summary
          SET 
            total_income  = COALESCE(total_income, 0)  - CASE WHEN OLD.type='income'  AND OLD.deleted=0 THEN OLD.amount ELSE 0 END,
            total_expense = COALESCE(total_expense, 0) - CASE WHEN OLD.type='expense' AND OLD.deleted=0 THEN OLD.amount ELSE 0 END
          WHERE user_id = OLD.user_id;
        END;
      `);

      // --- Monthly summary ---
      db.execSync(`
        CREATE TABLE IF NOT EXISTS monthly_summary (
          user_id TEXT NOT NULL,
          year INTEGER NOT NULL,
          month INTEGER NOT NULL,
          income REAL NOT NULL DEFAULT 0,
          expense REAL NOT NULL DEFAULT 0,
          PRIMARY KEY (user_id, year, month)
        );
      `);

      db.execSync(`
        CREATE TRIGGER IF NOT EXISTS trg_tx_ins_month AFTER INSERT ON transactions
        BEGIN
          INSERT OR IGNORE INTO monthly_summary(user_id, year, month)
          VALUES (NEW.user_id, CAST(strftime('%Y', NEW.date_iso) AS INTEGER), CAST(strftime('%m', NEW.date_iso) AS INTEGER));

          UPDATE monthly_summary
            SET income  = income  + CASE WHEN NEW.type='income'  AND NEW.deleted=0 THEN NEW.amount ELSE 0 END,
                expense = expense + CASE WHEN NEW.type='expense' AND NEW.deleted=0 THEN NEW.amount ELSE 0 END
          WHERE user_id = NEW.user_id
            AND year   = CAST(strftime('%Y', NEW.date_iso) AS INTEGER)
            AND month  = CAST(strftime('%m', NEW.date_iso) AS INTEGER);
        END;
      `);

      db.execSync(`
        CREATE TRIGGER IF NOT EXISTS trg_tx_upd_month AFTER UPDATE ON transactions
        BEGIN
          
          UPDATE monthly_summary
            SET income  = income  - CASE WHEN OLD.type='income'  AND OLD.deleted=0 THEN OLD.amount ELSE 0 END,
                expense = expense - CASE WHEN OLD.type='expense' AND OLD.deleted=0 THEN OLD.amount ELSE 0 END
          WHERE user_id = OLD.user_id
            AND year   = CAST(strftime('%Y', OLD.date_iso) AS INTEGER)
            AND month  = CAST(strftime('%m', OLD.date_iso) AS INTEGER);

          INSERT OR IGNORE INTO monthly_summary(user_id, year, month)
          VALUES (NEW.user_id, CAST(strftime('%Y', NEW.date_iso) AS INTEGER), CAST(strftime('%m', NEW.date_iso) AS INTEGER));

          UPDATE monthly_summary
            SET income  = income  + CASE WHEN NEW.type='income'  AND NEW.deleted=0 THEN NEW.amount ELSE 0 END,
                expense = expense + CASE WHEN NEW.type='expense' AND NEW.deleted=0 THEN NEW.amount ELSE 0 END
          WHERE user_id = NEW.user_id
            AND year   = CAST(strftime('%Y', NEW.date_iso) AS INTEGER)
            AND month  = CAST(strftime('%m', NEW.date_iso) AS INTEGER);
        END;
      `);

      db.execSync(`
        CREATE TRIGGER IF NOT EXISTS trg_tx_del_month AFTER DELETE ON transactions
        BEGIN
          UPDATE monthly_summary
            SET income  = income  - CASE WHEN OLD.type='income'  AND OLD.deleted=0 THEN OLD.amount ELSE 0 END,
                expense = expense - CASE WHEN OLD.type='expense' AND OLD.deleted=0 THEN OLD.amount ELSE 0 END
          WHERE user_id = OLD.user_id
            AND year   = CAST(strftime('%Y', OLD.date_iso) AS INTEGER)
            AND month  = CAST(strftime('%m', OLD.date_iso) AS INTEGER);
        END;
      `);
    },
  },
  // {
  //   name: "002_removed_soft_delete_introduced_hard_delete",
  //   up: () => {
  //     db.execSync(`
  //       ALTER TABLE transactions RENAME TO transactions_old;
  //     `);

  //     db.execSync(`
  //       CREATE TABLE transactions (
  //         id TEXT PRIMARY KEY,
  //         user_id TEXT NOT NULL,
  //         amount REAL NOT NULL,
  //         category TEXT NOT NULL,
  //         date_iso TEXT NOT NULL,
  //         notes TEXT,
  //         type TEXT NOT NULL,
  //         synced INTEGER NOT NULL DEFAULT 0,
  //         updated_at INTEGER NOT NULL DEFAULT 0,
  //       );
  //     `);

  //     db.execSync(`
  //      INSERT INTO transactions (id, user_id, amount, category, date_iso, notes, type, synced, updated_at) SELECT id, user_id, amount, category, date_iso, notes, type, synced, updated_at FROM transactions_old;
  //     `);

  //     db.execSync(`
  //       CREATE TABLE IF NOT EXISTS pending_deletes (
  //         id TEXT PRIMARY KEY,
  //         user_id TEXT NOT NULL
  //       );
  //     `);

  //     db.execSync(`
  //       INSERT INTO pending_deletes (id, user_id) SELECT id, user_id FROM transactions_old;
  //     `);

  //     db.execSync(`
  //       CREATE INDEX IF NOT EXISTS idx_tx_user_date
  //         ON transactions(user_id, date_iso DESC);
  //     `);

  //     db.execSync(`
  //       CREATE INDEX IF NOT EXISTS idx_tx_user_type
  //         ON transactions(user_id, type, amount);
  //     `);

  //     db.execSync(`
  //       CREATE INDEX IF NOT EXISTS idx_tx_user_updated
  //         ON transactions(user_id, updated_at DESC);
  //     `);

  //     db.execSync(`
  //      CREATE TRIGGER IF NOT EXISTS trg_tx_ins AFTER INSERT ON transactions
  //       BEGIN
  //         INSERT OR IGNORE INTO user_summary(user_id, total_income, total_expense)
  //         VALUES (NEW.user_id, 0, 0);

  //         UPDATE user_summary
  //         SET
  //           total_income  = COALESCE(total_income, 0)  + CASE WHEN NEW.type = 'income'  THEN NEW.amount ELSE 0 END,
  //           total_expense = COALESCE(total_expense, 0) + CASE WHEN NEW.type = 'expense' THEN NEW.amount ELSE 0 END
  //         WHERE user_id = NEW.user_id;
  //       END;
  //     `);

  //     db.execSync(`
  //      CREATE TRIGGER IF NOT EXISTS trg_tx_upd AFTER UPDATE ON transactions
  //       BEGIN
  //         UPDATE user_summary
  //         SET
  //           total_income  = COALESCE(total_income, 0)  - CASE WHEN OLD.type='income'  THEN OLD.amount ELSE 0 END,
  //           total_expense = COALESCE(total_expense, 0) - CASE WHEN OLD.type='expense' THEN OLD.amount ELSE 0 END
  //         WHERE user_id = OLD.user_id;

  //         UPDATE user_summary
  //         SET
  //           total_income  = COALESCE(total_income, 0)  + CASE WHEN NEW.type='income'  THEN NEW.amount ELSE 0 END,
  //           total_expense = COALESCE(total_expense, 0) + CASE WHEN NEW.type='expense' THEN NEW.amount ELSE 0 END
  //         WHERE user_id = NEW.user_id;
  //       END;
  //     `);

  //     db.execSync(`
  //      CREATE TRIGGER IF NOT EXISTS trg_tx_del AFTER DELETE ON transactions
  //       BEGIN
  //         UPDATE user_summary
  //         SET
  //           total_income  = COALESCE(total_income, 0)  - CASE WHEN OLD.type='income'  THEN OLD.amount ELSE 0 END,
  //           total_expense = COALESCE(total_expense, 0) - CASE WHEN OLD.type='expense' THEN OLD.amount ELSE 0 END
  //         WHERE user_id = OLD.user_id;
  //       END;
  //     `);

  //     // // monthly_summary triggers

  //     db.execSync(`
  //      CREATE TRIGGER IF NOT EXISTS trg_tx_ins_month AFTER INSERT ON transactions
  //       BEGIN
  //         INSERT OR IGNORE INTO monthly_summary(user_id, year, month)
  //         VALUES (NEW.user_id, CAST(strftime('%Y', NEW.date_iso) AS INTEGER), CAST(strftime('%m', NEW.date_iso) AS INTEGER));

  //         UPDATE monthly_summary
  //           SET income  = income  + CASE WHEN NEW.type='income'  THEN NEW.amount ELSE 0 END,
  //               expense = expense + CASE WHEN NEW.type='expense' THEN NEW.amount ELSE 0 END
  //         WHERE user_id = NEW.user_id
  //           AND year   = CAST(strftime('%Y', NEW.date_iso) AS INTEGER)
  //           AND month  = CAST(strftime('%m', NEW.date_iso) AS INTEGER);
  //       END;
  //     `);

  //     db.execSync(`
  //      CREATE TRIGGER IF NOT EXISTS trg_tx_upd_month AFTER UPDATE ON transactions
  //       BEGIN
  //         UPDATE monthly_summary
  //           SET income  = income  - CASE WHEN OLD.type='income'  THEN OLD.amount ELSE 0 END,
  //               expense = expense - CASE WHEN OLD.type='expense' THEN OLD.amount ELSE 0 END
  //         WHERE user_id = OLD.user_id
  //           AND year   = CAST(strftime('%Y', OLD.date_iso) AS INTEGER)
  //           AND month  = CAST(strftime('%m', OLD.date_iso) AS INTEGER);

  //         INSERT OR IGNORE INTO monthly_summary(user_id, year, month)
  //         VALUES (NEW.user_id, CAST(strftime('%Y', NEW.date_iso) AS INTEGER), CAST(strftime('%m', NEW.date_iso) AS INTEGER));

  //         UPDATE monthly_summary
  //           SET income  = income  + CASE WHEN NEW.type='income'  THEN NEW.amount ELSE 0 END,
  //               expense = expense + CASE WHEN NEW.type='expense' THEN NEW.amount ELSE 0 END
  //         WHERE user_id = NEW.user_id
  //           AND year   = CAST(strftime('%Y', NEW.date_iso) AS INTEGER)
  //           AND month  = CAST(strftime('%m', NEW.date_iso) AS INTEGER);
  //       END;
  //     `);

  //     db.execSync(`
  //      CREATE TRIGGER IF NOT EXISTS trg_tx_del_month AFTER DELETE ON transactions
  //       BEGIN
  //         UPDATE monthly_summary
  //           SET income  = income  - CASE WHEN OLD.type='income'  THEN OLD.amount ELSE 0 END,
  //               expense = expense - CASE WHEN OLD.type='expense' THEN OLD.amount ELSE 0 END
  //         WHERE user_id = OLD.user_id
  //           AND year   = CAST(strftime('%Y', OLD.date_iso) AS INTEGER)
  //           AND month  = CAST(strftime('%m', OLD.date_iso) AS INTEGER);
  //       END;
  //     `);
  //   },
  // },
];

// ---------------------------
// Runner
// ---------------------------
export function migrateDbIfNeeded() {
  ensureMigrationsTable();
  const applied = getAppliedMigrations();
  const currentUserVersion = getUserVersion();

  for (const m of migrations) {
    if (applied.has(m.name)) continue;
    withTransaction(() => {
      m.up();
      markApplied(m.name);
    });
  }

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
    await mmkvStorage.removeItem(KEY_TX_ALL);
  } catch (e) {
    console.warn("MMKV -> SQLite import failed:", e);
  }
}
