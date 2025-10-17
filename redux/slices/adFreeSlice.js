// features/adConfigSlice.js
import { createSlice } from "@reduxjs/toolkit";

const adFree = createSlice({
  name: "adFreeConfig",
  initialState: {
    /* advertisement related */
    isAdFree: false,
    adFreeStartTime: null, // Store when ad-free period started

    adFreeUnlockTime: null,
    isFetchedAndActivated: false,
  },
  reducers: {
    updateAdFree: (state, action) => {
      return { ...state, ...action.payload };
    },
    startAdFree: (state) => {
      state.isAdFree = true;
      state.adFreeStartTime = Date.now(); // Store current timestamp
    },
    checkAdFreeStatus: (state) => {
      if (state.adFreeStartTime) {
        const twentyFourHours = 5 * 60 * 60 * 1000; // 24 hours in milliseconds
        const timeElapsed = Date.now() - state.adFreeStartTime;

        if (timeElapsed >= twentyFourHours) {
          // 24 hours passed, reset ad-free status
          state.isAdFree = false;
          state.adFreeStartTime = null;
        } else {
          // Still within 24 hours
          state.isAdFree = true;
        }
      }
    },
    updateAdFreeUnlockTime: (state, action) => {
      state.adFreeUnlockTime = action.payload;
    },
    updateIsFetchedAndActivated: (state, action) => {
      state.isFetchedAndActivated = action.payload;
    },
  },
});

export const {
  updateAdFree,
  startAdFree,
  checkAdFreeStatus,
  updateAdFreeUnlockTime,
  updateIsFetchedAndActivated,
} = adFree.actions;
export default adFree.reducer;
