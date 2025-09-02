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
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { setTheme } from "@/redux/slices/themeSlice";
import { configureGoogleSignin } from "@/utils/auth/google";
// import { getAuth, signInAnonymously } from "@react-native-firebase/auth";

const lightTheme = {
  ...DefaultTheme,
  dark: false,
  colors: {
    ...DefaultTheme.colors,
    primary: "#429690",
    background: "#fffff7",
    // background: "#F5F6FA",

    // quick tile
    quickTile1: "#F1F5F9",
    quickTile2: "#EEF2FF",
    quickTile3: "#FFF7ED",
    quickTile4: "#E0F7FA",

    quickTileText1: "#111827",
    quickTileText2: "#111827",
    quickTileText3: "#111827",
    quickTileText4: "#111827",

    tabActive: "#429690",

    incomeCard: "#E9FDF2",
    expenseCard: "#FDEBEC",

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
    ...DefaultTheme.colors,
    primary: "#03211fff", // Keep same for brand identity
    background: "#121212", // Dark background
    // background: "#0D1117",

    // quick tile
    quickTile1: "#1E293B", // Dark slate
    quickTile2: "#3f180cff", // Deep indigo
    quickTile3: "#3C2A1E", // Dark brown
    quickTile4: "#004D40", // Teal-ish dark

    quickTileText1: "#F9FAFB", // Light text
    quickTileText2: "#F9FAFB",
    quickTileText3: "#F9FAFB",
    quickTileText4: "#F9FAFB",

    tabActive: "#429690", // Highlight stays teal

    incomeCard: "#333333ff",
    expenseCard: "#333333ff",

    card: "#1E1E1E", // Dark card background
    text: "#E5E7EB", // Light gray text
    textBalance: "#D1D5DB", // Slightly lighter gray
    border: "#2D2D2D", // Dark border
    notification: "#EF4444", // Keep red (works on dark)

    // extra tokens for app UI
    onPrimary: "#FFFFFF",
    primaryContainer: "#1B3A37", // Dark teal variant
    secondary: "#021816ff", // Lighter teal for dark mode
    onSecondary: "#0F0F0F", // Dark text on light secondary
    secondaryContainer: "#134E4A", // Deep teal container
    onSecondaryContainer: "#E5E7EB", // Light gray text
    surface: "#1E1E1E", // Matches card
    onSurface: "#E5E7EB", // Light text
    surfaceVariant: "#2D2D2D", // Darker gray surface
    onSurfaceVariant: "#CBD5E1", // Muted light gray text
    outline: "#374151", // Subtle outline
    error: "#CF6679", // Material dark red
    onError: "#000000", // Black text for contrast
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
    // debugToken: "",
    debugToken: "59E0AC3B-C562-45E0-86F9-743B3FA14C3E",
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

  // const [themePreference, setThemePreference] = useState<string>(
  //   !!colorScheme ? colorScheme : "light"
  // );

  // const [theme, setTheme] = useState(
  //   themePreference === "dark" ? darkTheme : lightTheme
  // );

  // const theme = lightTheme;
  const { themePref } = useAppSelector((state) => state.theme);

  const theme = useMemo(() => {
    let currentTheme = themePref || (!!colorScheme ? colorScheme : "light");

    return currentTheme === "dark" ? darkTheme : lightTheme;
  }, [themePref]);

  RNStatusBar.setBarStyle("light-content");
  if (Platform.OS === "android") {
    RNStatusBar.setBackgroundColor(theme.colors.primary);
    RNStatusBar.setTranslucent(false);
  }

  const dispatch = useAppDispatch();

  // useEffect(() => {
  //   if (!themePref) {
  //     dispatch(setTheme(!!colorScheme ? colorScheme : "light"));
  //   }
  // }, [themePref, theme]);

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

  // useEffect(() => {
  //   signInAnonymously(getAuth())
  //     .then(() => {
  //       console.log("User signed in anonymously");
  //     })
  //     .catch((error) => {
  //       if (error.code === "auth/operation-not-allowed") {
  //         console.log("Enable anonymous in your firebase console.");
  //       }

  //       console.error(error);
  //     });
  // }, []);

  useEffect(() => {
    configureGoogleSignin(
      "429536141601-0eqkt3d88ngoreihr1bgds2dbeaos9uu.apps.googleusercontent.com"
    );
  }, []);

  return (
    <ThemeProvider value={theme}>
      <TransactionProvider>
        <Stack
          screenOptions={{
            navigationBarColor: theme.colors.surface,
          }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
        <Toast />
      </TransactionProvider>
    </ThemeProvider>
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
