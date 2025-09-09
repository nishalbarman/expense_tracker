// src/store/transactionSlice.ts
import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import auth from "@react-native-firebase/auth";
import NetInfo from "@react-native-community/netinfo";
import { requestSyncWithCooldown, runSync } from "../thunk/txThunk";

type UIState = {
  uid: string | null;
  loading: boolean;
  isSyncing: boolean;
  autoSync: boolean;
  lastSyncTriggeredAt: number;
};

const initialState: UIState = {
  uid: null,
  loading: true,
  isSyncing: false,
  autoSync: true,
  lastSyncTriggeredAt: 0,
};

export const startAuthWatch = createAsyncThunk(
  "txUI/startAuthWatch",
  async (_, { dispatch }) => {
    auth().onAuthStateChanged(async (user) => {
      dispatch(setUid(user?.uid ?? null));
      if (user?.uid) dispatch(requestSyncWithCooldown());
      dispatch(setLoading(false));
    });
  }
);

export const startNetWatch = createAsyncThunk(
  "txUI/startNetWatch",
  async (_, { getState, dispatch }) => {
    NetInfo.addEventListener((state) => {
      const uid = auth().currentUser?.uid;
      const auto = (getState() as any).transactionsUI.autoSync;
      if (state.isConnected && auto && uid) {
        dispatch(requestSyncWithCooldown());
      }
    });
  }
);

const slice = createSlice({
  name: "transactionsUI",
  initialState,
  reducers: {
    setUid(state, action: PayloadAction<string | null>) {
      state.uid = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setIsSyncing(state, action: PayloadAction<boolean>) {
      state.isSyncing = action.payload;
    },
    setLastSyncTriggeredAt(state, action: PayloadAction<number>) {
      state.lastSyncTriggeredAt = action.payload;
    },
    setAutoSyncState(state, action: PayloadAction<boolean>) {
      state.autoSync = action.payload;
    },
  },
});

export const {
  setUid,
  setLoading,
  setIsSyncing,
  setLastSyncTriggeredAt,
  setAutoSyncState,
} = slice.actions;

export default slice.reducer;
