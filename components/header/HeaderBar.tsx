import { useAppDispatch } from "@/redux/hooks";
import { toggleTheme } from "@/redux/slices/themeSlice";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Text, TouchableOpacity } from "react-native";
import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function CustomHeaderBar({ headerName }: any): JSX.Element {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const dispatch = useAppDispatch();

  const handleToggleTheme = () => {
    dispatch(toggleTheme());
  };
  return (
    <LinearGradient
      colors={[theme.colors.primary, theme.colors.secondary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.hero, { paddingTop: insets.top + 12 }]}>
      <Animated.View>
        <View style={[styles.heroHeader, { backgroundColor: "transparent" }]}>
          <View>
            <Text style={[styles.helloSmall]}>{headerName}</Text>
          </View>
          <TouchableOpacity
            onPress={handleToggleTheme}
            style={styles.badgeIcon}
            activeOpacity={0.7}>
            (
            <Ionicons
              name={
                theme.colors.primary === "#429690"
                  ? "partly-sunny"
                  : "cloudy-night"
              }
              size={18}
              color="#FFFFFF"
            />
            )
          </TouchableOpacity>
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  badgeIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },

  hero: {
    paddingHorizontal: 16,
    paddingBottom: 18,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  helloSmall: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 16,
    fontWeight: "bold",
  },
});
