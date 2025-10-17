import {
  trackDailyAdClick,
  trackFrequentAdClick,
  updateAnyAdLastShownTime,
  updateLastRewardedAdShownTime,
} from "@/redux/slices/adActivitySlice";
import { useAppSelector } from "@/redux/hooks";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useRewardedAd } from "react-native-google-mobile-ads";
import { useDispatch } from "react-redux";
import useCheckAdFree from "./useCheckAdFree";
import { getAdRequestOptions } from "@/utils/AdManager";

export default function useScreenRewardedAd(screenKey) {
  const dispatch = useDispatch();

  const [error, setError] = useState(null);

  // Redux config
  const {
    rewardedAdPauseTime,
    maximumAllowedFrequentClicks,
    rewarded_id,
    isEnabled,
  } = useAppSelector((state) => state.adConfig);

  const lastAdShownTime = useAppSelector(
    (state) => state.adActivity.lastAdShownTime.rewarded[screenKey]
  );
  const frequentAdClickCount = useAppSelector(
    (state) => state.adActivity.frequentAdClickCount
  );

  const isUserBlocked = useAppSelector(
    (state) => state.adActivity.isUserBlocked
  );

  console.log("Frequest ad click count: ", frequentAdClickCount);

  const currentTime = new Date().getTime();

  //   console.log("Last ad shown time " + screenKey + ": ", lastAdShownTime);
  //   console.log("Current time " + screenKey + ": ", currentTime);
  //   console.log(
  //     "Last ad shown time and current time different " + screenKey + ": ",
  //     currentTime - lastAdShownTime
  //   );
  //   console.log(
  //     "rewarded Ad Pause Time " + screenKey + ": ",
  //     rewardedAdPauseTime
  //   );

  const {
    isLoaded,
    isClosed,
    isOpened,
    isClicked,
    isEarnedReward,
    reward,
    error: adError,
    show,
    load,
  } = useRewardedAd(rewarded_id, {
    requestNonPersonalizedAdsOnly:
      getAdRequestOptions()?.requestNonPersonalizedAdsOnly ?? true,
  });

  // const { isAdFree, adFreeStartTime } = useAppSelector(
  //   (state) => state.adFreeConfig
  // );

  const {
    isAdFree,
    adFreeStartTime,
    adFreeUnlockTime,
    isFetchedAndActivated,
    checkIsAdFree,
    getRemainingTime,
  } = useCheckAdFree();

  console.log("Is ad loaded: ", isLoaded);
  console.log("Is ad closed: ", isClosed);
  console.log("Is ad opened: ", isOpened);
  console.log("Is ad error: ", error);

  const canLoadAd = useCallback(() => {
    if (!isEnabled || isUserBlocked || isAdFree) return false;

    if (frequentAdClickCount >= maximumAllowedFrequentClicks) {
      console.warn("⚠️ User flagged for invalid ad clicks. Block showing ads.");
      return false;
    }

    if (lastAdShownTime) {
      //   const currentTime = new Date().getTime();
      //   if (currentTime - lastAdShownTime < rewardedAdPauseTime) {
      const diff = Date.now() - lastAdShownTime;
      if (diff < rewardedAdPauseTime) {
        console.log(
          `⏳ Ad cooldown active. Wait ${
            rewardedAdPauseTime - (currentTime - lastAdShownTime)
          }ms more.`
        );
        return false;
      }
    }

    if (checkIsAdFree()) {
      return false;
      // const twentyFourHours = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      // const timeElapsed = Date.now() - adFreeStartTime;

      // if (timeElapsed >= twentyFourHours) {
      //   // 24 hours passed, reset ad-free status
      //   dispatch(checkAdFreeStatus());
      //   return false;
      // }
    }

    return true;
  }, [
    isEnabled,
    isUserBlocked,
    frequentAdClickCount,
    maximumAllowedFrequentClicks,
    lastAdShownTime,
    rewardedAdPauseTime,
  ]);

  const loadAd = useCallback(() => {
    if (!canLoadAd()) return;

    try {
      load();
      return true;
    } catch (err) {
      console.error("❌ Failed to show ad:", err);
      setError(err?.message || "Unknown ad error");
      return false;
    }
  }, [canLoadAd, load]);

  // Safety check
  const canShowAd = useCallback(() => {
    if (!isEnabled || isUserBlocked) return false;

    if (frequentAdClickCount >= maximumAllowedFrequentClicks) {
      console.warn("⚠️ User flagged for invalid ad clicks. Block showing ads.");
      return false;
    }

    if (lastAdShownTime) {
      //   if (currentTime - lastAdShownTime < rewardedAdPauseTime) {
      const diff = Date.now() - lastAdShownTime;
      if (diff < rewardedAdPauseTime) {
        console.log(
          `⏳ Ad cooldown active. Wait ${
            rewardedAdPauseTime - (currentTime - lastAdShownTime)
          }ms more.`
        );
        return false;
      }
    }

    return isLoaded;
  }, [
    isEnabled,
    isUserBlocked,
    isLoaded,
    frequentAdClickCount,
    maximumAllowedFrequentClicks,
    lastAdShownTime,
    rewardedAdPauseTime,
  ]);

  // Show ad
  const showAd = useCallback(async () => {
    if (!canShowAd()) return false;

    try {
      show();
      return true;
    } catch (err) {
      console.error("❌ Failed to show ad:", err);
      setError(err?.message || "Unknown ad error");
      return false;
    }
  }, [canShowAd, dispatch, screenKey]);

  useEffect(() => {
    if (isOpened) {
      console.log(
        "Is Ad Loaded true of false, does it change after ad gets opened. : ",
        isLoaded
      );
      dispatch(
        updateLastRewardedAdShownTime({
          [screenKey]: Date.now(),
        })
      );
      dispatch(updateAnyAdLastShownTime(Date.now()));
    }
  }, [isOpened]);

  useEffect(() => {
    if (adError) {
      console.log("What type of error is this?", adError);
      setError(adError);
    }
  }, [adError]);

  useEffect(() => {
    if (isClicked) {
      dispatch(
        trackFrequentAdClick({
          frequentInterval,
          maximumAllowedFrequentClicks,
        })
      );

      dispatch(trackDailyAdClick()); // ✅ count daily clicks

      if (isUserBlocked) {
        console.warn("🚫 User blocked during open ad. Future ads disabled.");
        // You can also navigate away or dim the UI if needed
        router.push("/index");
      }
    }
  }, [isClicked, isUserBlocked]);

  return {
    isLoaded,
    isOpened,
    isClosed,
    isEarnedReward,
    reward,
    error,
    canLoadAd,
    canShowAd,
    loadAd,
    showAd,
  };
}
