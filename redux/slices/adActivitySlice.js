// features/adConfigSlice.js
import { createSlice } from "@reduxjs/toolkit";

const adActivitySlice = createSlice({
  name: "adActivity",
  initialState: {
    lastAdShownTime: {
      anyAdLastShownTime: null,
      interstitial: {
        lastShown: null,
        home: null,
        calendar: null,
        events: null,
        date_details: null,
        note: null,
        add_note: null,
      },
      rewarded: {
        lastShown: null,
        home: null,
        calendar: null,
        events: null,
        date_details: null,
        note: null,
        add_note: null,
        ad_free_unlock: null,
      },
      appOpen: null,
    },

    totalAdClickCount: 0,
    frequentAdClickCount: 0,
    lastClickTimestamp: null, // NEW field for tracking

    // NEW fields for daily tracking
    totalAdClickCountToday: 0,
    lastClickDate: null,
    isUserBlocked: false,
  },
  reducers: {
    updateLastInterstitialAdShownTime: (state, action) => {
      state.lastAdShownTime.interstitial = {
        ...state.lastAdShownTime.interstitial,
        ...action?.payload,
      };
    },
    updateLastRewardedAdShownTime: (state, action) => {
      state.lastAdShownTime.rewarded = {
        ...state.lastAdShownTime.rewarded,
        ...action?.payload,
      };
    },

    updateLastShownInterstitial: (state, action) => {
      state.lastAdShownTime.interstitial.lastShown = action?.payload || null;
    },

    updateLastAppOpenAdShownTime: (state, action) => {
      state.lastAdShownTime.appOpen = action?.payload;
    },

    updateAnyAdLastShownTime: (state, action) => {
      state.lastAdShownTime.anyAdLastShownTime = action?.payload;
    },

    increaseTotalAdClickCount: (state, action) => {
      state.totalAdClickCount += 1;
    },
    increaseFrequentAdClickCount: (state, action) => {
      state.frequentAdClickCount += 1;
    },

    trackFrequentAdClick: (state, action) => {
      const { frequentInterval, maximumAllowedFrequentClicks } = action.payload;
      const now = Date.now();

      if (
        state.lastClickTimestamp &&
        now - state.lastClickTimestamp <= frequentInterval
      ) {
        // Click happened inside the interval → count as frequent
        state.frequentAdClickCount += 1;

        if (state.frequentAdClickCount > maximumAllowedFrequentClicks) {
          console.warn("⚠️ User exceeded max frequent ad clicks. Block ads.");
        }
      } else {
        // Reset counter if gap is larger than interval
        state.frequentAdClickCount = 1;
      }

      state.lastClickTimestamp = now;
    },

    // NEW: Track daily ad clicks
    trackDailyAdClick: (state) => {
      if (state.isUserBlocked) return; // already blocked

      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

      if (state.lastClickDate !== today) {
        // Reset if it's a new day
        state.totalAdClickCountToday = 0;
        state.lastClickDate = today;
      }

      state.totalAdClickCountToday += 1;

      if (state.totalAdClickCountToday > 10) {
        console.warn(
          "🚫 User clicked more than 10 ads in one day. Blocking permanently."
        );
        state.isUserBlocked = true;
      }
    },
  },
});

export const {
  updateLastInterstitialAdShownTime,
  updateLastShownInterstitial,
  increaseTotalAdClickCount,
  increaseFrequentAdClickCount,
  trackFrequentAdClick,
  trackDailyAdClick,

  updateLastRewardedAdShownTime,

  updateAnyAdLastShownTime,
  updateLastAppOpenAdShownTime,
} = adActivitySlice.actions;
export default adActivitySlice.reducer;
