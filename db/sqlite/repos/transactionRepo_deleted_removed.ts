import { Transaction } from "@/types";
import { db } from "../client";

export async function insertTx(tx: Transaction) {
  console.log("Inserting:", tx);
  const database = await db();
  try {
    const stmt = await database.runAsync(
      `INSERT INTO transactions
      (id, user_id, amount, category, date_iso, notes, type, synced, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        user_id   = excluded.user_id,
        amount    = excluded.amount,
        category  = excluded.category,
        date_iso  = excluded.date_iso,
        notes     = excluded.notes,
        type      = excluded.type,
        synced    = excluded.synced,
        updated_at= excluded.updated_at,
        deleted   = excluded.deleted;`,
      [
        tx.id,
        tx.userId,
        tx.amount,
        tx.category,
        tx.dateIso,
        tx.notes ?? "",
        tx.type,
        tx.synced ? 1 : 0,
        tx.updatedAt || Date.now(),
        tx.deleted ? 1 : 0,
      ]
    );
  } catch (error) {
    console.warn(error);
  }
  // try {
  //   await stmt.executeAsync(
  //     tx.id,
  //     tx.userId,
  //     tx.amount,
  //     tx.category,
  //     tx.dateIso,
  //     tx.notes ?? "",
  //     tx.type,
  //     tx.synced ? 1 : 0,
  //     tx.updatedAt || null,
  //     tx.deleted ? 1 : 0
  //   );
  //   // check if row inserted/replaced
  //   const res = await database.runAsync("SELECT changes() as affected");
  //   await stmt.finalizeAsync();

  //   console.log("Rows affected:", res);
  // } catch (err) {
  //   console.warn("Insert failed:", err);
  // } finally {
  //   await stmt.finalizeAsync();
  // }
}

export async function updateTx(
  id: string,
  patch: Partial<Omit<Transaction, "id">>
) {
  const database = await db();

  const fields: string[] = [];
  const values: any[] = [];
  const map: Record<string, string> = {
    userId: "user_id",
    amount: "amount",
    category: "category",
    dateIso: "date_iso",
    notes: "notes",
    type: "type",
    synced: "synced",
    updatedAt: "updated_at",
    deleted: "deleted",
  };
  Object.entries(patch).forEach(([k, v]) => {
    const col = map[k];
    if (!col) return;
    if (k === "synced" || k === "deleted") {
      fields.push(`${col}=?`);
      values.push(v ? 1 : 0);
    } else {
      fields.push(`${col}=?`);
      values.push(v);
    }
  });
  if (!fields.length) return;
  values.push(id);

  const sql = `UPDATE transactions SET ${fields.join(", ")} WHERE id=?`;
  try {
    const stmt = await database.runAsync(sql, [...values]);
  } catch (error) {
    console.warn(error);
  }
  // try {
  //   stmt.executeSync(...values);
  // } finally {
  //   // awaitstmt.finalizeSync();
  //   await stmt.finalizeAsync();
  // }
}

export async function upsertManyTx(rows: Transaction[]) {
  const database = await db();

  try {
    await database.withTransactionAsync(async () => {
      for (const r of rows) {
        await database.runAsync(
          `INSERT OR REPLACE INTO transactions
      (id, user_id, amount, category, date_iso, notes, type, synced, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            r.id,
            r.userId,
            r.amount,
            r.category,
            r.dateIso,
            r.notes ?? "",
            r.type,
            r.synced ? 1 : 0,
            r.updatedAt || null,
            r.deleted ? 1 : 0,
          ]
        );
      }
    });
  } finally {
  }
}

export async function softDeleteTx(id: string, userId: string) {
  const database = await db();
  try {
    // const stmt = await database.runAsync(
    //   `UPDATE transactions SET deleted=1, synced=0, updated_at=? WHERE id=?`,
    //   [updatedAt, id]
    // );
    const stmt = await database.runAsync(`DELETE transactions WHERE id=?`, [
      id,
    ]);
    await database.runAsync(
      `INSERT INTO pending_deletes (id, user_id) values (?,?)`,
      [id, userId]
    );
    console.log(stmt.lastInsertRowId);
  } catch (error) {
    console.warn(error);
  }
  // try {
  //   stmt.executeSync();
  // } finally {
  //   stmt.finalizeSync();
  // }
}

export async function pageByCursor(
  userId: string,
  pageSize: number,
  cursor?: { dateIso: string; id: string }
) {
  let sql = `
    SELECT id, user_id as userId, amount, category, date_iso as dateIso, notes, type, synced, updated_at as updatedAt FROM transactions WHERE user_id=?
  `;
  const params: any[] = [userId];
  if (cursor) {
    sql += ` AND (date_iso < ?)`;
    params.push(cursor.dateIso);
  }
  sql += ` ORDER BY date_iso DESC, id DESC LIMIT ?`;
  params.push(pageSize);
  const database = await db();
  const rows = (await database.getAllAsync(sql, ...params)) as any[];
  const items = rows.map((r) => ({
    ...r,
    synced: !!r.synced,
    deleted: !!r.deleted,
  }));
  const nextCursor = items.length
    ? {
        dateIso: items[items.length - 1].dateIso,
        id: items[items.length - 1].id,
      }
    : undefined;
  return { items, nextCursor };
}

export async function getRecent5Transactions(
  userId: string,
  pageSize: number,
  cursor?: { dateIso: string; id: string }
) {
  let sql = `
    SELECT id, user_id as userId, amount, category, date_iso as dateIso, notes, type, synced, updated_at as updatedAt FROM transactions WHERE user_id=?
  `;
  const params: any[] = [userId];
  if (cursor) {
    sql += ` AND (date_iso < ?)`;
    params.push(cursor.dateIso);
  }
  sql += ` ORDER BY date_iso DESC, id DESC LIMIT ?`;
  params.push(pageSize);
  const database = await db();
  const rows = (await database.getAllAsync(sql, ...params)) as any[];
  const items = rows.map((r) => ({
    ...r,
    synced: !!r.synced,
    deleted: !!r.deleted,
  }));
  const nextCursor = items.length
    ? {
        dateIso: items[items.length - 1].dateIso,
        id: items[items.length - 1].id,
      }
    : undefined;
  return { items, nextCursor };
}

export async function searchByTerm(userId: string, term: string, limit = 40) {
  const q = `${term.trim()}%`;
  const database = await db();
  const rows = (await database.getAllAsync(
    `SELECT id, user_id as userId, amount, category, date_iso as dateIso, notes, type,
            synced, updated_at as updatedAt
     FROM transactions
     WHERE user_id=? AND deleted=0 AND LOWER(category) LIKE LOWER(?)
     ORDER BY date_iso DESC, id DESC
     LIMIT ?`,
    userId,
    q,
    limit
  )) as any[];
  return rows.map((r) => ({ ...r, synced: !!r.synced }));
}

export async function getUnsynced(userId: string) {
  const database = await db();
  const rows = (await database.getAllAsync(
    `SELECT id, user_id as userId, amount, category, date_iso as dateIso, notes, type,
            synced, updated_at as updatedAt
     FROM transactions
     WHERE user_id=? AND synced=0`,
    userId
  )) as any[];
  return rows.map((r) => ({ ...r, synced: !!r.synced }));
}

export async function getPendingUnsynced(userId: string) {
  const database = await db();
  const rows = (await database.getAllAsync(
    `SELECT id, user_id as userId
     FROM transactions
     WHERE user_id=?`,
    userId
  )) as any[];
  return rows.map((r) => ({ ...r }));
}

export async function getSyncState(userId: string) {
  const database = await db();
  const row = (await database.getFirstAsync(
    `SELECT user_id as userId, last_pull_cursor as lastPullCursor, last_pull_ms as lastPullMs, last_push_ms as lastPushMs
     FROM sync_state WHERE user_id=?`,
    userId
  )) as any;
  return row ?? null;
}

export async function upsertSyncState(
  userId: string,
  patch: Partial<{
    lastPullCursor: string | null;
    lastPullMs: number | null;
    lastPushMs: number | null;
  }>
) {
  const current = await getSyncState(userId);
  const merged = {
    userId,
    lastPullCursor: current?.lastPullCursor ?? null,
    lastPullMs: current?.lastPullMs ?? null,
    lastPushMs: current?.lastPushMs ?? null,
    ...patch,
  };
  const database = await db();
  try {
    const stmt = await database.runAsync(
      `INSERT INTO sync_state (user_id, last_pull_cursor, last_pull_ms, last_push_ms)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       last_pull_cursor=excluded.last_pull_cursor,
       last_pull_ms=excluded.last_pull_ms,
       last_push_ms=excluded.last_push_ms`,
      [userId, merged.lastPullCursor, merged.lastPullMs, merged.lastPushMs]
    );
  } catch (error) {
    console.warn(error);
  }
  // try {
  //   await stmt.executeAsync(
  //     userId,
  //     merged.lastPullCursor,
  //     merged.lastPullMs,
  //     merged.lastPushMs
  //   );
  // } finally {
  //   stmt.finalizeSync();
  // }
}

export async function getUserSummary(userId: string) {
  try {
    const database = await db();

    // 1. Get totals grouped by type
    const totals = await database.getAllAsync<{
      type: "income" | "expense";
      sum: number;
    }>(
      `SELECT type, SUM(amount) as sum 
        FROM transactions
        WHERE user_id=?
        GROUP BY type`,
      [userId]
    );

    let totalIncome = 0;
    let totalExpense = 0;

    totals.forEach((row) => {
      if (row.type === "income") totalIncome = row.sum ?? 0;
      if (row.type === "expense") totalExpense = row.sum ?? 0;
    });
    return { balance: totalIncome - totalExpense, totalIncome, totalExpense };
  } catch (error) {
    console.warn(error);
  }
}
