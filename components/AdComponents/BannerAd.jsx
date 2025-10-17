import useCheckAdFree from "@/hooks/ads/useCheckAdFree";
import { lang } from "@/language/lang";
import {
  trackDailyAdClick,
  trackFrequentAdClick,
} from "@/redux/slices/adActivitySlice";
import { useAppSelector } from "@/redux/hooks";
import { getAdRequestOptions } from "@/utils/AdManager";
import { router } from "expo-router";
import { memo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
import { useDispatch } from "react-redux";

function BannerFooter() {
  const dispatch = useDispatch();

  const { isDarkMode } = useAppSelector((state) => state.darkModePref);
  const { preferedLanguage } = useAppSelector((state) => state.language);
  const {
    isEnabled,
    banner_id,
    frequentInterval,
    maximumAllowedFrequentClicks,
  } = useAppSelector((state) => state.adConfig);
  const { isUserBlocked } = useAppSelector((state) => state.adActivity);

  const [isBannerError, setBannerError] = useState(true);

  const { checkIsAdFree } = useCheckAdFree();

  if (checkIsAdFree()) return null;

  return (
    <View style={[styles.BannerAdOuterView]}>
      {isEnabled && !isBannerError && banner_id ? (
        <BannerAd
          onAdFailedToLoad={(e) => {
            setBannerError(true);
          }}
          onAdLoaded={() => {
            setBannerError(false);
          }}
          onAdClicked={() => {
            dispatch(
              trackFrequentAdClick({
                frequentInterval,
                maximumAllowedFrequentClicks,
              })
            );

            dispatch(trackDailyAdClick()); // ✅ count daily clicks

            if (isUserBlocked) {
              console.warn(
                "🚫 User blocked during open ad. Future ads disabled."
              );
              // You can also navigate away or dim the UI if needed
              router.push("/index");
            }
          }}
          unitId={banner_id}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          requestOptions={{
            ...getAdRequestOptions(),
          }}
        />
      ) : (
        <Text
          style={{
            fontSize: 13,
            color: isDarkMode ? "white" : "black",
          }}>
          {lang[preferedLanguage]?.assamese_calendar}
        </Text>
      )}
    </View>
  );
}

export default memo(BannerFooter);

const styles = StyleSheet.create({
  BannerAdOuterView: {
    minHeight: 75,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderTopColor: "rgba(0,0,0,0.1)",
    borderTopWidth: 1,
  },
});
