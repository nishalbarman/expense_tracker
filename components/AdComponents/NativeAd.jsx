import useCheckAdFree from "@/hooks/ads/useCheckAdFree";
import { lang } from "@/language/lang";
import {
  trackDailyAdClick,
  trackFrequentAdClick,
} from "@/redux/slices/adActivitySlice";
import { useAppSelector } from "@/redux/hooks";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import {
  NativeAd,
  NativeAdEventType,
  NativeAdView,
  NativeAsset,
  NativeAssetType,
  NativeMediaView,
} from "react-native-google-mobile-ads";
import { useDispatch } from "react-redux";

const AdLabel = ({ backgroundColor = "#FFCC00", textColor = "#000" }) => {
  const { isDarkMode } = useAppSelector((state) => state.darkModePref);
  return (
    <View
      style={[
        styles.labelContainer,
        {
          backgroundColor: isDarkMode ? "#555" : backgroundColor,
          marginTop: 0,
          marginBottom: 15,
        },
      ]}>
      <Text
        style={[styles.labelText, { color: isDarkMode ? "white" : textColor }]}>
        Advertisement
      </Text>
    </View>
  );
};

const NativeAdItem = () => {
  const [nativeAd, setNativeAd] = useState(null);
  const { isDarkMode } = useAppSelector((state) => state.darkModePref);
  const {
    isEnabled,
    native_id,
    frequentInterval,
    maximumAllowedFrequentClicks,
  } = useAppSelector((state) => state.adConfig);
  const { isUserBlocked } = useAppSelector((state) => state.adActivity);
  const { preferedLanguage } = useAppSelector((state) => state.language);

  // console.log("Using Native Ad ID:", native_id);

  const dispatch = useDispatch();

  const {
    // isAdFree,
    // adFreeStartTime,
    // adFreeUnlockTime,
    // isFetchedAndActivated,
    checkIsAdFree,
    // getRemainingTime,
  } = useCheckAdFree();

  useEffect(() => {
    if (!isEnabled || checkIsAdFree()) return;
    // NativeAd.createForAdRequest(__DEV__ ? TestIds.NATIVE : native_id)
    NativeAd.createForAdRequest(native_id)
      .then(setNativeAd)
      .catch(console.error);

    // Cleanup function to destroy the ad when the component unmounts
    return () => {
      if (nativeAd) {
        nativeAd?.destroy();
        console.log("Native ad destroyed");
      }
    };
  }, [checkIsAdFree]);

  useEffect(() => {
    if (!nativeAd || checkIsAdFree()) return;
    const listener = nativeAd.addAdEventListener(
      NativeAdEventType.CLICKED,
      () => {
        console.log("Native ad clicked");
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
    );
    return () => {
      listener.remove();
      // or
      nativeAd?.destroy();
    };
  }, [nativeAd, checkIsAdFree]);

  if (checkIsAdFree()) return null;

  return (
    <View
      style={[
        styles.adContainer,
        {
          backgroundColor: isDarkMode ? "#1E1E1E" : "#fff",
          padding: 15,
          borderColor: isDarkMode
            ? "#4b4b4bff"
            : themeColor?.[`${theme}Theme`]?.primaryColor,
          borderWidth: 1,
        },
      ]}>
      {!nativeAd ? (
        <View
          style={{
            flexGrow: 1,
            justifyContent: "center",
            alignItems: "center",
            width: "100%",
          }}>
          {/* <AdLabel /> */}
          <Text>{lang?.[preferedLanguage]?.ad_will_be_shown}</Text>
        </View>
      ) : (
        <>
          {/* Ad Label */}
          <AdLabel />
          <NativeAdView nativeAd={nativeAd}>
            <View style={{ flexDirection: "row" }}>
              {/* App Icon */}
              {nativeAd?.icon && (
                <View style={{ justifyContent: "start" }}>
                  <NativeAsset assetType={NativeAssetType.ICON}>
                    {nativeAd?.icon ? (
                      <Image
                        source={{ uri: nativeAd.icon.url }}
                        style={{
                          width: 50,
                          height: 50,
                          borderRadius: 8,
                          marginRight: 5,
                          alignSelf: "center",
                        }}
                        contentFit="cover"
                      />
                    ) : (
                      <View
                        style={{
                          width: 50,
                          height: 50,
                          borderRadius: 8,
                          backgroundColor: "#ddd",
                        }}
                      />
                    )}
                  </NativeAsset>
                </View>
              )}

              <View style={{ flex: 1, marginLeft: 9 }}>
                {/* Headline */}
                {nativeAd?.headline && (
                  <NativeAsset assetType={NativeAssetType.HEADLINE}>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "bold",
                        color: isDarkMode ? "#ccc" : "#333",
                      }}>
                      {nativeAd.headline}
                    </Text>
                  </NativeAsset>
                )}

                {/* Body */}
                {nativeAd?.body && (
                  <NativeAsset assetType={NativeAssetType.BODY}>
                    <Text
                      style={{
                        marginTop: 4,
                        fontSize: 13,
                        color: isDarkMode ? "#aaa" : "#555",
                      }}>
                      {nativeAd.body}
                    </Text>
                  </NativeAsset>
                )}

                {/* Advertiser */}
                {nativeAd?.advertiser && (
                  <NativeAsset assetType={NativeAssetType.ADVERTISER}>
                    <Text style={{ marginTop: 4, fontSize: 12, color: "#888" }}>
                      {nativeAd.advertiser}
                    </Text>
                  </NativeAsset>
                )}

                <View
                  style={{
                    justifyContent: "center",
                    padding: 11,
                    borderRadius: 11,
                    marginLeft: nativeAd?.icon ? -59 : -9,
                  }}>
                  {/* Large Media (image/video) */}
                  <NativeMediaView
                    resizeMode={"contain"}
                    style={{
                      width: "100%",
                      aspectRatio: 16 / 9,
                      marginTop: 15,
                      borderRadius: 8,
                      backgroundColor: "transparent",
                    }}
                  />

                  {/* Store */}
                  {nativeAd?.store && (
                    <NativeAsset assetType={NativeAssetType.STORE}>
                      <Text
                        style={{ marginTop: 4, fontSize: 12, color: "#888" }}>
                        {nativeAd.store}
                      </Text>
                    </NativeAsset>
                  )}

                  {/* Price */}
                  {nativeAd?.price && (
                    <NativeAsset assetType={NativeAssetType.PRICE}>
                      <Text
                        style={{ marginTop: 4, fontSize: 12, color: "#888" }}>
                        {nativeAd.price}
                      </Text>
                    </NativeAsset>
                  )}

                  {/* Star Rating */}
                  {nativeAd?.starRating && (
                    <NativeAsset assetType={NativeAssetType.STAR_RATING}>
                      <Text
                        style={{ marginTop: 4, fontSize: 12, color: "#888" }}>
                        ⭐ {nativeAd.starRating}
                      </Text>
                    </NativeAsset>
                  )}

                  {/* CTA Button */}
                  {nativeAd.callToAction && (
                    <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
                      <View
                        style={[
                          styles.ctaButton,
                          {
                            backgroundColor: isDarkMode ? "#444" : "#007BFF",
                            marginTop: 15,
                            paddingVertical: 11,
                            width: "100%",
                            justifyContent: "center",
                            alignItems: "center",
                          },
                        ]}>
                        <Text
                          style={{
                            color: "#fff",
                            fontWeight: "600",
                            fontSize: 13,
                          }}>
                          {nativeAd.callToAction}
                        </Text>
                      </View>
                    </NativeAsset>
                  )}
                </View>
              </View>
            </View>
          </NativeAdView>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  labelContainer: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: "flex-start",
    marginBottom: 6,
  },
  labelText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  adContainer: {
    // minHeight: 200,
    flexGrow: 1,
    width: "100%",
    borderRadius: 12,
    marginBottom: 15,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
      },
      android: { elevation: 2 },
    }),
  },
  ctaButton: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
});

export default NativeAdItem;
