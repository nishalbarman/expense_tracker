// features/adConfigSlice.js
import { createSlice } from "@reduxjs/toolkit";

const adConfigSlice = createSlice({
  name: "adConfig",
  initialState: {
    /* advertisement related */
    isEnabled: false,
    banner_id: "ca-app-pub-3940256099942544/9214589741",
    appopen_id: "ca-app-pub-3940256099942544/9257395921",
    interstitial_id: "ca-app-pub-3940256099942544/1033173712",
    rewarded_id: "ca-app-pub-3940256099942544/5224354917",
    native_id: "ca-app-pub-3940256099942544/2247696110",

    apOpenAdPauseTime: 120000, // using only for app open ad
    interstitialAdPauseTime: 120000,
    rewardedAdPauseTime: 120000,

    /* Tracking Related Configs
     * frequentInterval: What should be the duration for tracking frequent ad clicks? If the user clicks on ads multiple times within this duration, it indicates frequent clicking.
     *
     * maximumAllowedFrequentClicks: After how many ad clicks should the user be restricted from seeing more ads? This can help prevent excessive ad interactions.
     */
    frequentInterval: 7000,
    maximumAllowedFrequentClicks: 3,
    /*
     * In one second user can click 3 times on an ad, after that ad will not be shown
     */
  },
  reducers: {
    updateAdConfig: (state, action) => {
      return { ...state, ...action.payload };
    },
  },
});

export const { updateAdConfig } = adConfigSlice.actions;
export default adConfigSlice.reducer;
