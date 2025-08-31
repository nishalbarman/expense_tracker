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
import {
  DarkTheme,
  ThemeProvider,
  DefaultTheme,
} from "@react-navigation/native";
import {
  initializeAppCheck,
  ReactNativeFirebaseAppCheckProvider,
} from "@react-native-firebase/app-check";
import { getApp } from "@react-native-firebase/app";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { persistor, store } from "@/redux/store";

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
    textBalance: "#4B5563",
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
    primary: "#000000ff", // adjusted for contrast on dark
    background: "#0E1116",
    card: "#151922",
    text: "#cacacbff",
    textBalance: "#E6EAF2",
    border: "#2A2F3A",
    notification: "#FF6B6B",
    // mirrored tokens for custom UI
    onPrimary: "#0B0F12",
    primaryContainer: "#1F2A2A",
    secondary: "#3e3e3eff",
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

const rnfbProvider = new ReactNativeFirebaseAppCheckProvider();
rnfbProvider.configure({
  android: {
    provider: __DEV__ ? "debug" : "playIntegrity",
    debugToken: "",
    // debugToken: "59E0AC3B-C562-45E0-86F9-743B3FA14C3E",
  },
  apple: {
    provider: __DEV__ ? "debug" : "appAttestWithDeviceCheckFallback",
    debugToken:
      "some token you have configured for your project firebase web console",
  },
  web: {
    provider: "reCaptchaV3",
    siteKey: "unknown",
  },
});

function AppContainer() {
  const colorScheme = useColorScheme();

  const [themePreference, setThemePreference] = useState<string>(
    !!colorScheme ? colorScheme : "light"
  );

  // const theme = colorScheme === "dark" ? darkTheme : lightTheme;
  // const theme = colorScheme === "dark" ? lightTheme : darkTheme;
  // const [theme, setTheme] = useState(
  //   themePreference === "dark" ? darkTheme : lightTheme
  // );

  // const theme = lightTheme;

  RNStatusBar.setBarStyle("light-content");
  if (Platform.OS === "android") {
    RNStatusBar.setBackgroundColor(theme.colors.primary);
    RNStatusBar.setTranslucent(false);
  }

  useEffect(() => {
    (async () => {
      const appCheck = await initializeAppCheck(getApp(), {
        provider: rnfbProvider,
        isTokenAutoRefreshEnabled: true,
      });

      // try {
      //   // `appCheckInstance` is the saved return value from initializeAppCheck
      //   const { token } = await appCheck.getToken(true);

      //   if (token.length > 0) {
      //     console.log("AppCheck verification passed");
      //   }
      // } catch (error) {
      //   console.log("AppCheck verification failed");
      // }
    })();
  }, []);

  // useEffect(() => {
  //   AsyncStorage.getItem("themePreference").then((preference) => {
  //     if (!preference) {
  //       AsyncStorage.setItem("themePreference", themePreference);
  //       setThemePreference(themePreference);
  //     } else {
  //       setThemePreference(preference);
  //     }
  //   });
  // }, []);

  // useEffect(() => {
  //   setTheme(themePreference === "dark" ? darkTheme : lightTheme);
  // }, [themePreference]);

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
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
      </PersistGate>
    </Provider>
  );
}

// function AppContainer() {
//   const mode = useAppSelector((state) => state.theme.mode); // Redux: "light" | "dark"
//   const theme = mode === "dark" ? darkTheme : lightTheme;

//   // StatusBar styling
//   RNStatusBar.setBarStyle(mode === "dark" ? "light-content" : "dark-content");
//   if (Platform.OS === "android") {
//     RNStatusBar.setBackgroundColor(theme.colors.primary);
//     RNStatusBar.setTranslucent(false);
//   }

//   return (
//     <ThemeProvider value={theme}>
//       <TransactionProvider>
//         <Stack>
//           <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
//           <Stack.Screen name="+not-found" />
//         </Stack>
//         <StatusBar style="auto" />
//         <Toast />
//       </TransactionProvider>
//     </ThemeProvider>
//   );
// }

export default function AppLayout() {
  useEffect(() => {
    (async () => {
      await initializeAppCheck(getApp(), {
        provider: rnfbProvider,
        isTokenAutoRefreshEnabled: true,
      });
    })();
  }, []);

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <AppContainer />
      </PersistGate>
    </Provider>
  );
}
