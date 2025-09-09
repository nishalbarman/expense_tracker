import * as SQLite from "expo-sqlite";

export const db = async () => {
  const database = await SQLite.openDatabaseAsync("app.db", {
    useNewConnection: true,
  });
  return database;
}; // persistent DB [1]

export const database = SQLite.openDatabaseSync("app.db", {
  useNewConnection: true,
});

// export async function runMigrations() {
//   const database = await db();

//   await database.execAsync("PRAGMA journal_mode=WAL;"); // performance & durability [3]

//   await database.execAsync(`
//     CREATE TABLE IF NOT EXISTS meta (
//       key TEXT PRIMARY KEY,
//       value TEXT
//     );
//   `);

//   await database.execAsync(`
//     CREATE TABLE IF NOT EXISTS transactions (
//       id TEXT PRIMARY KEY,
//       user_id TEXT NOT NULL,
//       amount REAL NOT NULL,
//       category TEXT NOT NULL,
//       date_iso TEXT NOT NULL,
//       notes TEXT,
//       type TEXT NOT NULL,
//       currency TEXT DEFAULT 'INR',
//       synced INTEGER NOT NULL DEFAULT 0,
//       updated_at INTEGER NOT NULL DEFAULT 0,
//       deleted INTEGER NOT NULL DEFAULT 0
//     );
//   `);

//   await database.execAsync(
//     `CREATE INDEX IF NOT EXISTS idx_tx_user_date ON transactions(user_id, date_iso DESC);`
//   );
//   await database.execAsync(
//     `CREATE INDEX IF NOT EXISTS idx_tx_user_type ON transactions(user_id, type, amount);`
//   );

//   await database.execAsync(
//           `CREATE INDEX IF NOT EXISTS idx_tx_user_currency ON transactions(user_id, currency);`
//   );

//   await database.execAsync(
//     `CREATE INDEX IF NOT EXISTS idx_tx_user_updated ON transactions(user_id, updated_at DESC);`
//   );

//   await database.execAsync(
//     `CREATE INDEX IF NOT EXISTS idx_tx_user_deleted ON transactions(user_id, deleted);`
//   );

//   await database.execAsync(`
//     CREATE TABLE IF NOT EXISTS sync_state (
//       user_id TEXT PRIMARY KEY,
//       last_pull_cursor TEXT,
//       last_pull_ms INTEGER,
//       last_push_ms INTEGER
//     );
//   `);

//   await database.execAsync(`
//     CREATE TABLE IF NOT EXISTS user_summary (
//       user_id TEXT PRIMARY KEY,
//       total_income REAL NOT NULL DEFAULT 0,
//       total_expense REAL NOT NULL DEFAULT 0,
//       balance AS (totalIncome - totalExpense) STORED
//     );
//   `);

//   await database.execAsync(`
//     CREATE TRIGGER IF NOT EXISTS trg_tx_ins AFTER INSERT ON transactions
//     BEGIN
//       UPDATE user_summary
//         SET totalIncome = totalIncome + CASE WHEN NEW.type='income' AND NEW.deleted=0 THEN NEW.amount ELSE 0 END,
//             totalExpense = totalExpense + CASE WHEN NEW.type='expense' AND NEW.deleted=0 THEN NEW.amount ELSE 0 END
//       WHERE userId = NEW.userId;

//       INSERT INTO user_summary(userId)
//         SELECT NEW.userId
//         WHERE NOT EXISTS (SELECT 1 FROM user_summary WHERE userId = NEW.userId);

//       UPDATE user_summary
//         SET totalIncome = totalIncome + CASE WHEN NEW.type='income' AND NEW.deleted=0 THEN NEW.amount ELSE 0 END,
//             totalExpense = totalExpense + CASE WHEN NEW.type='expense' AND NEW.deleted=0 THEN NEW.amount ELSE 0 END
//       WHERE userId = NEW.userId;
//     END;
//   `);

//   await database.execAsync(`
//     CREATE TRIGGER IF NOT EXISTS trg_tx_upd AFTER UPDATE ON transactions
//     BEGIN
//       -- remove old contribution
//       UPDATE user_summary
//         SET totalIncome = totalIncome - CASE WHEN OLD.type='income' AND OLD.deleted=0 THEN OLD.amount ELSE 0 END,
//             totalExpense = totalExpense - CASE WHEN OLD.type='expense' AND OLD.deleted=0 THEN OLD.amount ELSE 0 END
//       WHERE userId = OLD.userId;

//       -- add new contribution
//       UPDATE user_summary
//         SET totalIncome = totalIncome + CASE WHEN NEW.type='income' AND NEW.deleted=0 THEN NEW.amount ELSE 0 END,
//             totalExpense = totalExpense + CASE WHEN NEW.type='expense' AND NEW.deleted=0 THEN NEW.amount ELSE 0 END
//       WHERE userId = NEW.userId;

//       -- userId change edge-case: if user moved, fix the old user too
//       UPDATE user_summary
//         SET totalIncome = totalIncome - CASE WHEN NEW.userId <> OLD.userId AND OLD.type='income' AND OLD.deleted=0 THEN 0 ELSE 0 END,
//             totalExpense = totalExpense - CASE WHEN NEW.userId <> OLD.userId AND OLD.type='expense' AND OLD.deleted=0 THEN 0 ELSE 0 END
//       WHERE userId = OLD.userId;
//     END;
//   `);

//   await database.execAsync(`
//     CREATE TRIGGER IF NOT EXISTS trg_tx_del AFTER DELETE ON transactions
//     BEGIN
//       UPDATE user_summary
//         SET totalIncome = totalIncome - CASE WHEN OLD.type='income' AND OLD.deleted=0 THEN OLD.amount ELSE 0 END,
//             totalExpense = totalExpense - CASE WHEN OLD.type='expense' AND OLD.deleted=0 THEN OLD.amount ELSE 0 END
//       WHERE userId = OLD.userId;
//     END;
//   `);

//   await database.execAsync(`
//     CREATE TABLE IF NOT EXISTS monthly_summary (
//       userId TEXT NOT NULL,
//       year INTEGER NOT NULL,
//       month INTEGER NOT NULL,  -- 1..12
//       income REAL NOT NULL DEFAULT 0,
//       expense REAL NOT NULL DEFAULT 0,
//       PRIMARY KEY (userId, year, month)
//     );
//   `);

//   await database.execAsync(`
//     CREATE TRIGGER IF NOT EXISTS trg_tx_ins_month AFTER INSERT ON transactions
//     BEGIN
//       INSERT OR IGNORE INTO monthly_summary(userId, year, month)
//       VALUES (NEW.userId, CAST(strftime('%Y', NEW.dateIso) AS INTEGER), CAST(strftime('%m', NEW.dateIso) AS INTEGER));

//       UPDATE monthly_summary
//         SET income  = income  + CASE WHEN NEW.type='income'  AND NEW.deleted=0 THEN NEW.amount ELSE 0 END,
//             expense = expense + CASE WHEN NEW.type='expense' AND NEW.deleted=0 THEN NEW.amount ELSE 0 END
//       WHERE userId = NEW.userId
//         AND year   = CAST(strftime('%Y', NEW.dateIso) AS INTEGER)
//         AND month  = CAST(strftime('%m', NEW.dateIso) AS INTEGER);
//     END;
//   `);

//   await database.execAsync(`
//     CREATE TRIGGER IF NOT EXISTS trg_tx_upd_month AFTER UPDATE ON transactions
//     BEGIN
//       -- ensure buckets exist
//       INSERT OR IGNORE INTO monthly_summary(userId, year, month)
//       VALUES (OLD.userId, CAST(strftime('%Y', OLD.dateIso) AS INTEGER), CAST(strftime('%m', OLD.dateIso) AS INTEGER));
//       INSERT OR IGNORE INTO monthly_summary(userId, year, month)
//       VALUES (NEW.userId, CAST(strftime('%Y', NEW.dateIso) AS INTEGER), CAST(strftime('%m', NEW.dateIso) AS INTEGER));

//       -- remove from OLD bucket if it contributed
//       UPDATE monthly_summary
//         SET income  = income  - CASE WHEN OLD.type='income'  AND OLD.deleted=0 THEN OLD.amount ELSE 0 END,
//             expense = expense - CASE WHEN OLD.type='expense' AND OLD.deleted=0 THEN OLD.amount ELSE 0 END
//       WHERE userId = OLD.userId
//         AND year   = CAST(strftime('%Y', OLD.dateIso) AS INTEGER)
//         AND month  = CAST(strftime('%m', OLD.dateIso) AS INTEGER);

//       -- add to NEW bucket if it contributes
//       UPDATE monthly_summary
//         SET income  = income  + CASE WHEN NEW.type='income'  AND NEW.deleted=0 THEN NEW.amount ELSE 0 END,
//             expense = expense + CASE WHEN NEW.type='expense' AND NEW.deleted=0 THEN NEW.amount ELSE 0 END
//       WHERE userId = NEW.userId
//         AND year   = CAST(strftime('%Y', NEW.dateIso) AS INTEGER)
//         AND month  = CAST(strftime('%m', NEW.dateIso) AS INTEGER);
//     END;
//   `);

//   await database.execAsync(`
//     CREATE TRIGGER IF NOT EXISTS trg_tx_del_month AFTER DELETE ON transactions
//     BEGIN
//       UPDATE monthly_summary
//         SET income  = income  - CASE WHEN OLD.type='income'  AND OLD.deleted=0 THEN OLD.amount ELSE 0 END,
//             expense = expense - CASE WHEN OLD.type='expense' AND OLD.deleted=0 THEN OLD.amount ELSE 0 END
//       WHERE userId = OLD.userId
//         AND year   = CAST(strftime('%Y', OLD.dateIso) AS INTEGER)
//         AND month  = CAST(strftime('%m', OLD.dateIso) AS INTEGER);
//     END;
//   `);

// }
