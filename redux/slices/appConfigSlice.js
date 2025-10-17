// features/adConfigSlice.js
import { createSlice } from "@reduxjs/toolkit";

const appConfig = createSlice({
  name: "appConfig",
  initialState: { versionCode: 72, force_update: true, fetchedActivated: false },
  reducers: {
    updateAppConfig: (state, action) => {
      return { ...state, ...action.payload };
    },
  },
});

export const { updateAppConfig } = appConfig.actions;
export default appConfig.reducer;
