// // src/store/txThunks.ts
// import { createAsyncThunk } from '@reduxjs/toolkit';
// import {
//   addTransaction as repoAddTransaction,
//   updateTransaction as repoUpdateTransaction,
//   deleteTransaction as repoDeleteTransaction,
// } from '@/db/sqlite/repo';
// import { syncWithFirestore } from '@/sync/firestoreSync';
// import { AppDispatch } from './store';
// import { setIsSyncing, setLastSyncTriggeredAt } from './transactionSlice';

// export type Transaction = {
//   id?: string | number;
//   userId: string;
//   amount: number;
//   note?: string;
//   category?: string;
//   date: number;
// };

// // Insert
// export const insertTransaction = createAsyncThunk<
//   { id: string | number; tx: Transaction },
//   { tx: Transaction; triggerSync?: boolean },
//   { rejectValue: string; dispatch: AppDispatch }
// >('tx/insert', async ({ tx, triggerSync = true }, { rejectWithValue, dispatch }) => {
//   try {
//     const id = await repoAddTransaction(tx);
//     if (triggerSync) dispatch(runSync());
//     return { id, tx };
//   } catch (err: any) {
//     return rejectWithValue(err?.message ?? 'Insert failed');
//   }
// });

// // Update
// export const updateTransaction = createAsyncThunk<
//   { id: string | number; tx: Partial<Transaction> },
//   { id: string | number; changes: Partial<Transaction>; triggerSync?: boolean },
//   { rejectValue: string; dispatch: AppDispatch }
// >('tx/update', async ({ id, changes, triggerSync = true }, { rejectWithValue, dispatch }) => {
//   try {
//     const affected = await repoUpdateTransaction(id, changes);
//     if (!affected) return rejectWithValue('No rows updated');
//     if (triggerSync) dispatch(runSync());
//     return { id, tx: changes };
//   } catch (err: any) {
//     return rejectWithValue(err?.message ?? 'Update failed');
//   }
// });

// // Delete
// export const deleteTransaction = createAsyncThunk<
//   { id: string | number },
//   { id: string | number; triggerSync?: boolean },
//   { rejectValue: string; dispatch: AppDispatch }
// >('tx/delete', async ({ id, triggerSync = true }, { rejectWithValue, dispatch }) => {
//   try {
//     const affected = await repoDeleteTransaction(id);
//     if (!affected) return rejectWithValue('No rows deleted');
//     if (triggerSync) dispatch(runSync());
//     return { id };
//   } catch (err: any) {
//     return rejectWithValue(err?.message ?? 'Delete failed');
//   }
// });

// // Sync
// export const runSync = createAsyncThunk('tx/runSync', async (_, { dispatch, rejectWithValue }) => {
//   try {
//     dispatch(setIsSyncing(true));
//     await syncWithFirestore();
//     return;
//   } catch (err: any) {
//     return rejectWithValue(err?.message ?? 'Sync failed');
//   } finally {
//     dispatch(setIsSyncing(false));
//   }
// });

// // Sync with cooldown
// export const requestSyncWithCooldown = createAsyncThunk(
//   'tx/requestSyncCooldown',
//   async (_, { getState, dispatch }) => {
//     const s = (getState() as any).transactionsUI;
//     const now = Date.now();
//     if (s.isSyncing || now - s.lastSyncTriggeredAt < 4000) return;
//     dispatch(setLastSyncTriggeredAt(now));
//     dispatch(runSync());
//   }
// );
