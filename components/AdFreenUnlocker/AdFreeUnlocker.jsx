import useCheckAdFree from "@/hooks/ads/useCheckAdFree";
import useScreenRewardedAd from "@/hooks/ads/useScreenRewared";
import { lang } from "@/language/lang";
import { checkAdFreeStatus, startAdFree } from "@/redux/slices/adFreeSlice";
import { useAppSelector } from "@/redux/hooks";
import { darkThemeDefault, lightThemeDefault, themeColor } from "@/themeColors";
import { useEffect, useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useDispatch } from "react-redux";
import CustomLoadingModal from "../CustomLoadingModal";

const AdFreeUnlocker = () => {
  const dispatch = useDispatch();

  const { isDarkMode } = useAppSelector((state) => state.darkModePref);
  const { preferedLanguage } = useAppSelector((state) => state.language);
  const theme = useAppSelector((state) => state.theme);

  const [isAdModalVisible, setAdModalVisible] = useState(false);

  const {
    isLoaded,

    isEarnedReward,
    error,

    loadAd,
    showAd,
  } = useScreenRewardedAd("ad_free_unlock");

  useEffect(() => {
    if (isLoaded) {
      setAdModalVisible(false);
      showAd();
    }
  }, [isLoaded]);

  useEffect(() => {
    if (error) {
      setAdModalVisible(false);
      showAd();
    }
  }, [error]);

  useEffect(() => {
    if (isEarnedReward) {
      dispatch(startAdFree());
    }
  }, [isEarnedReward]);

  const handleLoadShow = () => {
    setAdModalVisible(true);
    loadAd();
  };

  const {
    isAdFree,
    adFreeStartTime,
    adFreeUnlockTime,
    isFetchedAndActivated,
    checkIsAdFree,
    getRemainingTime,
  } = useCheckAdFree();

  useEffect(() => {
    // Check ad-free status when component loads
    dispatch(checkAdFreeStatus());
  }, [dispatch]);

  return (
    <>
      <View
        style={[
          styles.container,
          {
            backgroundColor: isDarkMode
              ? darkThemeDefault.card
              : lightThemeDefault.card,
            marginBottom: 21,
          },
        ]}>
        <Text style={styles.icon}>📢</Text>
        <Text
          style={[
            styles.title,
            {
              color: isDarkMode
                ? "#d3d3d3ff"
                : "black" || themeColor[`${theme}Theme`]?.primaryColor,
            },
          ]}>
          {!isAdFree ? "Ad-Free Experience" : "You are now Ad-Free."}
        </Text>
        <Text
          style={[
            styles.description,
            {
              marginTop: 6,
            },
          ]}>
          Enjoy our app without any interruptions or ads for next{" "}
          {adFreeUnlockTime < 1
            ? `${adFreeUnlockTime * 60} minutes`
            : `${adFreeUnlockTime} hours`}
          .
        </Text>
        <View
          style={{
            marginTop: 16,
          }}>
          {isAdFree ? (
            <View
              style={{
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
              }}>
              <Text style={[{ color: "#525252ff" }]}>
                Thank you for your support!
              </Text>
              {getRemainingTime() && (
                <Text
                  style={[
                    { marginTop: 11, fontWeight: "bold", color: "#5a5a5aff" },
                  ]}>
                  Time remaining: {getRemainingTime()} ⏱️
                </Text>
              )}
            </View>
          ) : (
            <TouchableOpacity
              style={{
                paddingVertical: 11,
                paddingHorizontal: 15,
                borderRadius: 12,
                backgroundColor: themeColor?.[`${theme}Theme`]?.primaryColor,
                color: "white",
              }}
              onPress={handleLoadShow}>
              <Text
                style={{
                  color: "white",
                  fontWeight: "bold",
                }}>
                Watch Ad to Remove All Ads
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* custom loading */}
      <CustomLoadingModal
        isVisible={isAdModalVisible}
        title={lang?.[preferedLanguage]?.ad_will_be_shown}
        cancelButton={() => {
          setAdModalVisible(true);
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  icon: {
    fontSize: 36,
    marginBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 6,
  },
  description: {
    fontSize: 16,
    color: "#525252ff",
    textAlign: "center",
  },
});

export default AdFreeUnlocker;
