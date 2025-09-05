import { configureStore, combineReducers } from "@reduxjs/toolkit";
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import { mmkvStorage } from "@/mmkv/mmkvStorage";

import transactionsUI from "@/redux/slices/transactionsUISlice";
import themeReducer from "./slices/themeSlice";
import { localTxApi } from "./api/localTxApi";

const rootReducer = combineReducers({
  //   user: userReducer,
  theme: themeReducer,
  transactionsUI: transactionsUI,
  [localTxApi.reducerPath]: localTxApi.reducer,
});

const persistConfig = {
  key: "root",
  storage: mmkvStorage,
  whitelist: [
    // "user",
    "theme",
    "transactionsUI",
  ], // persist both
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(localTxApi.middleware),
});

// 🔹 Infer types for useDispatch & useSelector
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const persistor = persistStore(store);
