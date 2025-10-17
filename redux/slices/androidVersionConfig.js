// features/adConfigSlice.js
import {createSlice} from '@reduxjs/toolkit';

const inititalState = {
  version_code: 49,
  force_update: true,
};

const androidVersionConfig = createSlice({
  name: 'adConfig',
  initialState: inititalState,
  reducers: {
    updateAdnroidVersionConfig: (state, action) => {
      return {...state, ...action.payload};
    },
  },
});

export const {updateAdnroidVersionConfig} = androidVersionConfig.actions;
export default androidVersionConfig.reducer;
