import { MMKV } from "react-native-mmkv";

// Create MMKV instance
export const storage = new MMKV();

// Adapter for redux-persist
export const mmkvStorage = {
  setItem: async (
    key: string,
    value: string | number | boolean | ArrayBuffer
  ) => {
    storage.set(key, value);
  },
  getItem: async (key: string) => {
    const value = storage.getString(key);
    return value ?? null;
  },
  removeItem: async (key: string) => {
    storage.delete(key);
  },
  clear: async () => {
    storage.clearAll();
  },
};
