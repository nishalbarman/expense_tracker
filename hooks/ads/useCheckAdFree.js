import { checkAdFreeStatus } from "@/redux/slices/adFreeSlice"; // adjust import path as needed
import { useAppSelector } from "@/redux/hooks";
import { useCallback } from "react";
import { useDispatch } from "react-redux";

// 🪄 Custom Hook: useCheckAdFree
export default function useCheckAdFree() {
  const dispatch = useDispatch();

  // get ad-free state from Redux
  const { isAdFree, adFreeStartTime, adFreeUnlockTime, isFetchedAndActivated } =
    useAppSelector((state) => state.adFreeConfig);

  // function to check if ad-free mode is still valid
  const checkIsAdFree = useCallback(() => {
    // if there's no start time, ad-free is not active
    if (!adFreeStartTime) return false;
    if (!(adFreeUnlockTime && isFetchedAndActivated)) return false;

    const twentyFourHours = adFreeUnlockTime * 60 * 60 * 1000; // 24 hours in milliseconds
    const timeElapsed = Date.now() - adFreeStartTime;

    // if 24 hours passed, reset the ad-free status
    if (timeElapsed >= twentyFourHours) {
      dispatch(checkAdFreeStatus());
      return false;
    }

    // if not expired, ad-free is still valid
    return true;
  }, [adFreeStartTime, adFreeUnlockTime, isFetchedAndActivated, dispatch]);

  const getRemainingTime = useCallback(() => {
    if (!adFreeStartTime) return null;
    if (!(adFreeUnlockTime && isFetchedAndActivated)) return null;

    const twentyFourHours = adFreeUnlockTime * 60 * 60 * 1000;
    const timeElapsed = Date.now() - adFreeStartTime;
    const remaining = twentyFourHours - timeElapsed;

    if (remaining <= 0) return null;

    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m`;
  }, [adFreeStartTime, adFreeUnlockTime, isFetchedAndActivated]);

  return {
    isAdFree,
    adFreeStartTime,
    adFreeUnlockTime,
    isFetchedAndActivated,
    checkIsAdFree,
    getRemainingTime,
  };
}
