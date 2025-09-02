import React, { useEffect, useMemo, useState } from "react";
import { Slot, Stack } from "expo-router";
import {
  Platform,
  useColorScheme,
  StatusBar as RNStatusBar,
} from "react-native";

import { StatusBar } from "expo-status-bar";

import Toast from "react-native-toast-message";
import { TransactionProvider } from "@/context/TransactionContext";
import { ThemeProvider, useTheme } from "@react-navigation/native";
import { initializeAppCheck } from "@react-native-firebase/app-check";
import { getApp } from "@react-native-firebase/app";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import CustomHeaderBar from "@/components/header/HeaderBar";
// import { getAuth, signInAnonymously } from "@react-native-firebase/auth";

function Layout() {
  const colorScheme = useColorScheme();
  const theme = useTheme();
  const { themePref } = useAppSelector((state) => state.theme);

  RNStatusBar.setBarStyle("light-content");
  if (Platform.OS === "android") {
    RNStatusBar.setBackgroundColor(theme.colors.primary);
    RNStatusBar.setTranslucent(false);
  }

  const dispatch = useAppDispatch();

  return (
    <Stack
      screenOptions={
        {
          // navigationBarColor: theme.colors.surface,
        }
      }>
      <Stack.Screen
        name="login"
        options={{
          headerShown: false,
          header: () => {
            return <CustomHeaderBar headerName="Login" />;
          },
        }}
      />
      <Stack.Screen
        name="signup"
        options={{
          headerShown: false,
          header: () => {
            return <CustomHeaderBar headerName="Signup" />;
          },
        }}
      />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default Layout;
