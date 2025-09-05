import { db } from './client';

export type TxRow = {
  id: string;
  userId: string;
  amount: number;
  category: string;
  dateIso: string;
  notes?: string;
  type: 'income'|'expense'|'transfer';
  synced: boolean;
  updatedAt: number;
  deleted?: boolean;
};

export function insertTx(tx: TxRow) {
  const stmt = db.prepareSync(
    `INSERT OR REPLACE INTO transactions
      (id, user_id, amount, category, date_iso, notes, type, synced, updated_at, deleted)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  try {
    stmt.executeSync(
      tx.id, tx.userId, tx.amount, tx.category, tx.dateIso, tx.notes ?? '', tx.type,
      tx.synced ? 1 : 0, tx.updatedAt, tx.deleted ? 1 : 0
    );
  } finally {
    stmt.finalizeSync();
  }
}

export function updateTx(id: string, patch: Partial<Omit<TxRow, 'id'>>) {
  const fields: string[] = [];
  const values: any[] = [];
  const map: Record<string, string> = {
    userId: 'user_id', amount: 'amount', category: 'category', dateIso: 'date_iso',
    notes: 'notes', type: 'type', synced: 'synced', updatedAt: 'updated_at', deleted: 'deleted',
  };
  Object.entries(patch).forEach(([k, v]) => {
    const col = map[k];
    if (!col) return;
    if (k === 'synced' || k === 'deleted') {
      fields.push(`${col}=?`);
      values.push(v ? 1 : 0);
    } else {
      fields.push(`${col}=?`);
      values.push(v);
    }
  });
  if (!fields.length) return;
  values.push(id);

  const sql = `UPDATE transactions SET ${fields.join(', ')} WHERE id=?`;
  const stmt = db.prepareSync(sql);
  try {
    stmt.executeSync(...values);
  } finally {
    stmt.finalizeSync();
  }
}

export function upsertManyTx(rows: TxRow[]) {
  const stmt = db.prepareSync(
    `INSERT OR REPLACE INTO transactions
      (id, user_id, amount, category, date_iso, notes, type, synced, updated_at, deleted)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  try {
    db.withTransactionSync(() => {
      for (const r of rows) {
        stmt.executeSync(
          r.id, r.userId, r.amount, r.category, r.dateIso, r.notes ?? '', r.type,
          r.synced ? 1 : 0, r.updatedAt, r.deleted ? 1 : 0
        );
      }
    });
  } finally {
    stmt.finalizeSync();
  }
}

export function softDeleteTx(id: string, updatedAt: number) {
  const stmt = db.prepareSync(`UPDATE transactions SET deleted=1, synced=0, updated_at=? WHERE id=?`);
  try {
    stmt.executeSync(updatedAt, id);
  } finally {
    stmt.finalizeSync();
  }
}

export function pageByCursor(userId: string, pageSize: number, cursor?: { dateIso: string; id: string }) {
  let sql = `
    SELECT id, user_id as userId, amount, category, date_iso as dateIso, notes, type, synced, updated_at as updatedAt, deleted FROM transactions WHERE user_id=? AND deleted=0
  `;
  const params: any[] = [userId];
  if (cursor) {
    sql += ` AND (date_iso < ?)`;
    params.push(cursor.dateIso);
  }
  sql += ` ORDER BY date_iso DESC, id DESC LIMIT ?`;
  params.push(pageSize);

  const rows = db.getAllSync(sql, ...params) as any[];
  const items = rows.map((r) => ({ ...r, synced: !!r.synced, deleted: !!r.deleted }));
  const nextCursor = items.length ? { dateIso: items[items.length - 1].dateIso, id: items[items.length - 1].id } : undefined;
  return { items, nextCursor };
}

export function searchByTerm(userId: string, term: string, limit = 40) {
  const q = `${term.trim()}%`;
  const rows = db.getAllSync(
    `SELECT id, user_id as userId, amount, category, date_iso as dateIso, notes, type,
            synced, updated_at as updatedAt, deleted
     FROM transactions
     WHERE user_id=? AND deleted=0 AND LOWER(category) LIKE LOWER(?)
     ORDER BY date_iso DESC, id DESC
     LIMIT ?`,
    userId, q, limit
  ) as any[];
  return rows.map((r) => ({ ...r, synced: !!r.synced, deleted: !!r.deleted }));
}

export function getUnsynced(userId: string) {
  const rows = db.getAllSync(
    `SELECT id, user_id as userId, amount, category, date_iso as dateIso, notes, type,
            synced, updated_at as updatedAt, deleted
     FROM transactions
     WHERE user_id=? AND synced=0 AND deleted=0`,
    userId
  ) as any[];
  return rows.map((r) => ({ ...r, synced: !!r.synced, deleted: !!r.deleted }));
}

export function getSyncState(userId: string) {
  const row = db.getFirstSync(
    `SELECT user_id as userId, last_pull_cursor as lastPullCursor, last_pull_ms as lastPullMs, last_push_ms as lastPushMs
     FROM sync_state WHERE user_id=?`,
    userId
  ) as any;
  return row ?? null;
}

export function upsertSyncState(userId: string, patch: Partial<{ lastPullCursor: string|null; lastPullMs: number|null; lastPushMs: number|null }>) {
  const current = getSyncState(userId);
  const merged = {
    userId,
    lastPullCursor: current?.lastPullCursor ?? null,
    lastPullMs: current?.lastPullMs ?? null,
    lastPushMs: current?.lastPushMs ?? null,
    ...patch,
  };
  const stmt = db.prepareSync(
    `INSERT INTO sync_state (user_id, last_pull_cursor, last_pull_ms, last_push_ms)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       last_pull_cursor=excluded.last_pull_cursor,
       last_pull_ms=excluded.last_pull_ms,
       last_push_ms=excluded.last_push_ms`
  );
  try {
    stmt.executeSync(userId, merged.lastPullCursor, merged.lastPullMs, merged.lastPushMs);
  } finally {
    stmt.finalizeSync();
  }
}
