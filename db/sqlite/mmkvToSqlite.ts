import * as SQLite from 'expo-sqlite';
import { mmkvStorage } from '@/mmkv/mmkvStorage';

const KEY_TX_ALL = 'transactions';
const LOCAL_UID = '__local__';

function toLowerType(v: any): 'income'|'expense'|'transfer' {
  const s = String(v ?? '').toLowerCase();
  return (s === 'income' || s === 'expense' || s === 'transfer') ? s : 'expense';
}
function toISODate(v: any): string {
  if (typeof v === 'string') return v;
  if (v?.toDate) { try { return v.toDate().toISOString(); } catch {} }
  return new Date(0).toISOString();
}

export async function migrateMmkvToSqlite(currentUid?: string) {
  const raw = await mmkvStorage.getItem(KEY_TX_ALL);
  if (!raw) return;
  const db = SQLite.openDatabaseSync('app.db'); // [1]
  try {
    const arr = JSON.parse(raw) as Array<any>;
    if (!Array.isArray(arr) || arr.length === 0) return;
    const stmt = db.prepareSync(
      `INSERT OR REPLACE INTO transactions
        (id, user_id, amount, category, date_iso, notes, type, synced, updated_at, deleted)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const now = Date.now();
    db.withTransactionSync(() => {
      for (const t of arr) {
        const id = String(t?.id ?? '');
        if (!id) continue;
        const userId = String(t?.userId ?? currentUid ?? LOCAL_UID);
        const amount = Number(t?.amount) || 0;
        const category = String(t?.category ?? '');
        const dateIso = toISODate(t?.date);
        const notes = String(t?.notes ?? '');
        const type = toLowerType(t?.type);
        const synced = t?.synced ? 1 : 0;
        const deleted = t?.deleted ? 1 : 0;

        stmt.executeSync(id, userId, amount, category, dateIso, notes, type, synced, now, deleted);
      }
    });
    stmt.finalizeSync();
    // Optionally clear legacy key:
    // await mmkvStorage.removeItem(KEY_TX_ALL);
  } catch (e) {
    console.warn('MMKV -> SQLite migration failed:', e);
  }
}
