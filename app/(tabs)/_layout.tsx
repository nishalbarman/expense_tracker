import React, { useMemo } from "react";
import { Slot, Tabs } from "expo-router";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  useColorScheme,
  StatusBar as RNStatusBar,
  Text,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import Svg, { Path } from "react-native-svg";
import { TransactionProvider } from "@/context/TransactionContext";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@react-navigation/native";

export const BAR_HEIGHT = 72;
const FAB_SIZE = 64;

export function getBottomContentPadding(insetBottom: number, extra = 16) {
  return BAR_HEIGHT + Math.max(insetBottom, 0) + extra;
}

type RouteName = "index" | "add" | "scanner" | "history" | "charts" | "account";

export default function AppLayout() {
  const theme = useTheme();

  const GRADIENT = useMemo(() => {
    return [theme.colors.primary, theme.colors.secondary];
  }, [theme.colors]);

  return (
    <TransactionProvider>
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.primary },
          headerTitleAlign: "center",
          headerTitleStyle: { color: "white", fontWeight: "700" },
          headerTintColor: "white",
          tabBarStyle: { display: "none" },
          headerBackground: (props) => {
            return (
              <LinearGradient
                height="100%"
                colors={GRADIENT}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.hero]}
              />
            );
          },
        }}
        tabBar={(props) => <CustomBottomBar {...props} theme={theme} />}>
        <Tabs.Screen
          name="index"
          options={{ title: "Dashboard", headerShown: false }}
        />
        <Tabs.Screen name="add" options={{ title: "Add New Transaction" }} />
        <Tabs.Screen name="scanner" options={{ title: "Scanner" }} />
        <Tabs.Screen name="history" options={{ title: "History" }} />
        <Tabs.Screen
          name="charts"
          options={{
            title: "Analytics",
            headerShown: true,
            headerShadowVisible: false,
          }}
        />
        <Tabs.Screen name="account" options={{ title: "Account" }} />
      </Tabs>
      <Toast />
    </TransactionProvider>
  );
}

function CustomBottomBar({
  state,
  descriptors,
  navigation,
  theme,
}: any & { theme: any }) {
  const insets = useSafeAreaInsets();
  const active = theme.colors.primary;
  const inactive = theme.colors.onSurface + "99";
  const bg = theme.colors.surface;

  const leftTabs: RouteName[] = ["index", "history"];
  const rightTabs: RouteName[] = ["charts", "account"];

  const [barWidth, setBarWidth] = React.useState(0);

  const corner = 18;
  const R = FAB_SIZE / 2 + 8;
  const buildPath = (w: number, h: number) => {
    if (!w) return "";
    const cx = w / 2;
    return [
      `M0,${h}`,
      `L0,${corner} Q0,0 ${corner},0`,
      `L${w - corner},0 Q${w},0 ${w},${corner}`,
      `L${w},${h}`,
      "Z",
      `M${cx},0 m${-R},0`,
      `a${R},${R} 0 1,0 ${2 * R},0`,
      `a${R},${R} 0 1,0 ${-2 * R},0`,
    ].join(" ");
  };

  const renderTab = (
    routeKey: string,
    routeName: RouteName,
    label?: string
  ) => {
    const { options } = descriptors[routeKey];
    const isFocused = state.routes[state.index].name === routeName;

    const icon = getIcon(routeName, isFocused);
    const onPress = () => {
      const event = navigation.emit({
        type: "tabPress",
        target: routeKey,
        canPreventDefault: true,
      });
      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(routeName);
      }
    };
    const onLongPress = () => {
      navigation.emit({ type: "tabLongPress", target: routeKey });
    };

    return (
      <TouchableOpacity
        key={routeKey}
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        accessibilityLabel={options.tabBarAccessibilityLabel}
        testID={options.tabBarTestID}
        onPress={onPress}
        onLongPress={onLongPress}
        style={styles.tabItem}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        activeOpacity={0.8}>
        <Ionicons
          name={icon}
          size={24}
          color={isFocused ? active : inactive}
          style={{ marginBottom: 2 }}
        />
        <Text
          style={{
            color: isFocused ? active : inactive,
            fontSize: 9,
            fontWeight: isFocused ? "700" : "600",
          }}
          numberOfLines={1}>
          {label ?? options.tabBarLabel ?? options.title ?? routeName}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView edges={["bottom"]} style={{ backgroundColor: "transparent" }}>
      <View style={[styles.wrapper]} pointerEvents="box-none">
        {/* Underlay view to mask the notch hole (fixes white showing through) */}
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: BAR_HEIGHT + Math.max(insets.bottom, 0) + 6,
            backgroundColor: bg,
            borderTopLeftRadius: 18,
            borderTopRightRadius: 18,
          }}
          pointerEvents="none"
        />

        <View
          style={[
            styles.bar,
            {
              backgroundColor: "transparent", // background via SVG
              marginBottom: Math.max(insets.bottom, 0),
            },
          ]}
          onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}>
          {barWidth > 0 && (
            <Svg
              width={barWidth}
              height={BAR_HEIGHT}
              style={StyleSheet.absoluteFill}
              pointerEvents="none">
              <Path
                d={buildPath(barWidth, BAR_HEIGHT)}
                fill={bg}
                fillRule="evenodd"
              />
            </Svg>
          )}

          <View style={styles.cluster}>
            {leftTabs.map((name) => {
              const idx = state.routes.findIndex((r: any) => r.name === name);
              if (idx === -1) return null;
              const route = state.routes[idx];
              return renderTab(route.key, name);
            })}
          </View>

          <View style={styles.notchSpacer} />

          <View style={styles.cluster}>
            {rightTabs.map((name) => {
              const idx = state.routes.findIndex((r: any) => r.name === name);
              if (idx === -1) return null;
              const route = state.routes[idx];
              return renderTab(route.key, name);
            })}
          </View>
        </View>

        {/* Center FAB */}
        <TouchableOpacity
          onPress={() => navigation.navigate("add")}
          activeOpacity={0.9}
          style={[
            styles.fab,
            {
              backgroundColor: theme.colors.primary,
              shadowColor: "#000",
              bottom: BAR_HEIGHT - FAB_SIZE / 2 + Math.max(insets.bottom, 0),
            },
          ]}>
          <Ionicons name="add" size={30} color="white" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function getIcon(
  route: RouteName,
  focused: boolean
): keyof typeof Ionicons.glyphMap {
  switch (route) {
    case "index":
      return focused ? "home" : "home-outline";
    case "history":
      return focused ? "list" : "list-outline";
    case "charts":
      return focused ? "pie-chart" : "pie-chart-outline";
    case "scanner":
      return focused ? "scan" : "scan";
    case "add":
      return focused ? "add" : "add-outline";
    case "account":
      return focused ? "apps" : "apps-outline";
    default:
      return "ellipse-outline";
  }
}

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: 16,
    paddingBottom: 18,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  helloSmall: { color: "rgba(255,255,255,0.9)", fontSize: 13 },

  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
  },
  bar: {
    alignSelf: "stretch",
    marginHorizontal: 5,
    height: BAR_HEIGHT,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    ...Platform.select({
      android: { elevation: 8 },
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
    }),
  },
  cluster: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  notchSpacer: {
    width: FAB_SIZE + 24,
    height: "100%",
  },
  tabItem: {
    minWidth: 58,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  fab: {
    position: "absolute",
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      android: { elevation: 10 },
      ios: {
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 10,
      },
    }),
  },
});
