// import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
// import auth from '@react-native-firebase/auth';
// import NetInfo from '@react-native-community/netinfo';
// import { migrateMmkvToWatermelon } from '@/migrations/mmkvToWm';
// import { syncWithFirestore } from '@/sync/firestoreSync';

// type UIState = {
//   uid: string | null;
//   loading: boolean;
//   isSyncing: boolean;
//   autoSync: boolean;
//   lastSyncTriggeredAt: number;
// };

// const initialState: UIState = {
//   uid: null,
//   loading: true,
//   isSyncing: false,
//   autoSync: true,
//   lastSyncTriggeredAt: 0,
// };

// export const startAuthWatch = createAsyncThunk('txUI/startAuthWatch', async (_, { dispatch }) => {
//   auth().onAuthStateChanged(async (user) => {
//     const nextUid = user?.uid ?? null;
//     dispatch(setUid(nextUid));
//     // Run MMKV->Watermelon migration once during rollout
//     await migrateMmkvToWatermelon(nextUid ?? undefined);
//     // Optionally kick a sync when logged in
//     if (nextUid) {
//       dispatch(requestSyncWithCooldown());
//     }
//     dispatch(setLoading(false));
//   });
// });

// export const startNetWatch = createAsyncThunk('txUI/startNetWatch', async (_, { getState, dispatch }) => {
//   NetInfo.addEventListener((state) => {
//     const uid = auth().currentUser?.uid;
//     const auto = (getState() as any).transactionsUI.autoSync;
//     if (state.isConnected && auto && uid) {
//       dispatch(requestSyncWithCooldown());
//     }
//   });
// });

// export const requestSyncWithCooldown = createAsyncThunk('txUI/requestSync', async (_, { getState, dispatch }) => {
//   const state = (getState() as any).transactionsUI as UIState;
//   const now = Date.now();
//   if (now - state.lastSyncTriggeredAt < 4000 || state.isSyncing) return;
//   dispatch(setLastSyncTriggeredAt(now));
//   dispatch(runSync());
// });

// export const runSync = createAsyncThunk('txUI/runSync', async (_, { dispatch }) => {
//   try {
//     dispatch(setIsSyncing(true));
//     await syncWithFirestore();
//   } finally {
//     dispatch(setIsSyncing(false));
//   }
// });

// const slice = createSlice({
//   name: 'transactionsUI',
//   initialState,
//   reducers: {
//     setUid(state, action: PayloadAction<string | null>) {
//       state.uid = action.payload;
//     },
//     setLoading(state, action: PayloadAction<boolean>) {
//       state.loading = action.payload;
//     },
//     setIsSyncing(state, action: PayloadAction<boolean>) {
//       state.isSyncing = action.payload;
//     },
//     setLastSyncTriggeredAt(state, action: PayloadAction<number>) {
//       state.lastSyncTriggeredAt = action.payload;
//     },
//     setAutoSyncState(state, action: PayloadAction<boolean>) {
//       state.autoSync = action.payload;
//     },
//   },
// });

// export const { setUid, setLoading, setIsSyncing, setLastSyncTriggeredAt, setAutoSyncState } = slice.actions;
// export default slice.reducer;
