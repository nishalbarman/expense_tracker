import { createAsyncThunk } from '@reduxjs/toolkit';
import { insertTx, updateTx, softDeleteTx } from '@/db/sqlite/repo';
import { v4 as uuidv4 } from 'uuid';
import auth from '@react-native-firebase/auth';

export const addTxnThunk = createAsyncThunk<
  void,
  { amount: number; category: string; dateIso: string; notes?: string; type: 'income'|'expense'|'transfer' }
>('tx/add', async (payload) => {
  const uid = auth().currentUser?.uid ?? '__local__';
  const id = uuidv4();
  const now = Date.now();
  insertTx({
    id,
    userId: uid,
    amount: payload.amount,
    category: payload.category,
    dateIso: payload.dateIso,
    notes: payload.notes,
    type: payload.type,
    synced: !!auth().currentUser,
    updatedAt: now,
    deleted: false,
  });
});

export const updateTxnThunk = createAsyncThunk<
  void,
  { id: string; patch: Partial<{ amount: number; category: string; dateIso: string; notes?: string; type: string }> }
>('tx/update', async ({ id, patch }) => {
  const now = Date.now();
  updateTx(id, { ...patch, synced: false, updatedAt: now });
});

export const softDeleteTxnThunk = createAsyncThunk<void, string>(
  'tx/softDelete',
  async (id) => {
    const now = Date.now();
    softDeleteTx(id, now);
  }
);
