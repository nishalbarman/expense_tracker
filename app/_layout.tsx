import React, { useMemo } from "react";
import { Slot, Stack } from "expo-router";
import {
  Platform,
  useColorScheme,
  StatusBar as RNStatusBar,
} from "react-native";

import { StatusBar } from "expo-status-bar";

import Toast from "react-native-toast-message";
import { TransactionProvider } from "@/context/TransactionContext";
import {
  DarkTheme,
  ThemeProvider,
  DefaultTheme,
} from "@react-navigation/native";

const lightTheme = {
  ...DefaultTheme,
  dark: false,
  colors: {
    ...DefaultTheme.colors,
    primary: "#429690",
    background: "#fffff7",
    // background: "#F5F6FA",
    card: "#FFFFFF",
    text: "#2F3542",
    border: "#E6E8EF",
    notification: "#E53935",
    // extra tokens for app UI
    onPrimary: "#FFFFFF",
    primaryContainer: "#efe9f5",
    secondary: "#1B5C58",
    onSecondary: "#FFFFFF",
    secondaryContainer: "#2a817bff",
    onSecondaryContainer: "#ffffffff",
    surface: "#FFFFFF",
    onSurface: "#2F3542",
    surfaceVariant: "#E6E8EF",
    onSurfaceVariant: "#4A5568",
    outline: "#efe9f5",
    error: "#B00020",
    onError: "#FFFFFF",
  },
};

const darkTheme = {
  ...DarkTheme,
  dark: true,
  colors: {
    ...DarkTheme.colors,
    primary: "#8AD7D1", // adjusted for contrast on dark
    background: "#0E1116",
    card: "#151922",
    text: "#E6EAF2",
    border: "#2A2F3A",
    notification: "#FF6B6B",
    // mirrored tokens for custom UI
    onPrimary: "#0B0F12",
    primaryContainer: "#1F2A2A",
    secondary: "#71C7C2",
    onSecondary: "#0B0F12",
    secondaryContainer: "#1B3634",
    onSecondaryContainer: "#DFF5F4",
    surface: "#151922",
    onSurface: "#E6EAF2",
    surfaceVariant: "#222735",
    onSurfaceVariant: "#A0A6B3",
    outline: "#2A2F3A",
    error: "#FF6B6B",
    onError: "#0B0F12",
  },
};

export const BAR_HEIGHT = 72;

export function getBottomContentPadding(insetBottom: number, extra = 16) {
  return BAR_HEIGHT + Math.max(insetBottom, 0) + extra;
}

export default function AppLayout() {
  const colorScheme = useColorScheme();
  // const theme = colorScheme === "dark" ? darkTheme : lightTheme;
  const theme = lightTheme;

  RNStatusBar.setBarStyle("light-content");
  if (Platform.OS === "android") {
    RNStatusBar.setBackgroundColor(theme.colors.primary);
    RNStatusBar.setTranslucent(false);
  }

  const GRADIENT = useMemo(() => {
    return [theme.colors.primary, theme.colors.secondary];
  }, [theme.colors]);

  return (
    <ThemeProvider value={theme}>
      <TransactionProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
        <Toast />
      </TransactionProvider>
    </ThemeProvider>
  );
}
