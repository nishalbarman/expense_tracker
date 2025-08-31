import React, { useMemo, useState, useContext } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
  Platform,
  TouchableOpacity,
  Text,
  TextInput,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@react-navigation/native";
import { BAR_HEIGHT, getBottomContentPadding } from "../_layout";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { toggleTheme } from "@/redux/slices/themeSlice";
import Animated from "react-native-reanimated";

type Profile = {
  name: string;
  email: string;
  phone?: string;
  currency: string;
  country: string;
};

const INITIAL_PROFILE: Profile = {
  name: "Nishal Barman",
  email: "demo@gmail.com",
  phone: "9101114906",
  currency: "INR ₹",
  country: "India",
};

// Custom Avatar Component
const Avatar = ({ label, size = 64 }: { label: string; size?: number }) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.colors.primary,
        },
      ]}>
      <Text
        style={[
          styles.avatarText,
          { color: theme.colors.card, fontSize: size / 2.5 },
        ]}>
        {label}
      </Text>
    </View>
  );
};

// Custom Card Component
const Card = ({ children, style, ...props }: any) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.colors.card, marginHorizontal: 16 },
        style,
      ]}
      {...props}>
      {children}
    </View>
  );
};

// Custom Card Title Component
const CardTitle = ({ title }: { title: string }) => {
  const theme = useTheme();
  return (
    <View style={styles.cardHeader}>
      <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
        {title}
      </Text>
    </View>
  );
};

// Custom Divider Component
const Divider = ({ style }: any) => {
  const theme = useTheme();
  return (
    <View
      style={[styles.divider, { backgroundColor: theme.colors.border }, style]}
    />
  );
};

// Custom Button Component
const Button = ({
  children,
  onPress,
  mode = "contained",
  icon,
  style,
  textColor,
  contentStyle,
  compact = false,
  ...props
}: any) => {
  const theme = useTheme();

  const buttonStyle = [
    styles.button,
    compact && styles.compactButton,
    mode === "contained" && { backgroundColor: theme.colors.primary },
    mode === "contained-tonal" && { backgroundColor: theme.colors.background },
    contentStyle,
    style,
  ];

  const textStyle = [
    styles.buttonText,
    compact && styles.compactButtonText,
    {
      color:
        textColor ||
        (mode === "contained" ? theme.colors.card : theme.colors.primary),
    },
  ];

  return (
    <TouchableOpacity style={buttonStyle} onPress={onPress} {...props}>
      {icon && (
        <Ionicons
          name={icon}
          size={compact ? 16 : 20}
          color={
            textColor ||
            (mode === "contained" ? theme.colors.card : theme.colors.primary)
          }
          style={{ marginRight: 8 }}
        />
      )}
      <Text style={textStyle}>{children}</Text>
    </TouchableOpacity>
  );
};

// Custom IconButton Component
const IconButton = ({ icon, onPress, mode = "standard", size = 24 }: any) => {
  const theme = useTheme();

  const buttonStyle = [
    styles.iconButton,
    mode === "contained" && { backgroundColor: theme.colors.primary },
    mode === "contained-tonal" && {
      backgroundColor: theme.colors.primaryContainer,
    },
  ];

  const iconColor =
    mode === "contained"
      ? theme.colors.card
      : mode === "contained-tonal"
      ? theme.colors.primary
      : theme.colors.text;

  return (
    <TouchableOpacity style={buttonStyle} onPress={onPress}>
      <Ionicons name={icon} size={size} color={iconColor} />
    </TouchableOpacity>
  );
};

// Custom List Item Component
const ListItem = ({
  title,
  description,
  onPress,
  leftIcon,
  rightComponent,
}: any) => {
  const theme = useTheme();

  return (
    <TouchableOpacity
      style={styles.listItem}
      onPress={onPress}
      disabled={!onPress}>
      {leftIcon && (
        <View style={styles.listItemLeft}>
          <Ionicons name={leftIcon} size={24} color={theme.colors.text} />
        </View>
      )}
      <View style={styles.listItemContent}>
        <Text style={[styles.listItemTitle, { color: theme.colors.text }]}>
          {title}
        </Text>
        {description && (
          <Text
            style={[
              styles.listItemDescription,
              { color: theme.colors.text, opacity: 0.7 },
            ]}>
            {description}
          </Text>
        )}
      </View>
      {rightComponent && (
        <View style={styles.listItemRight}>{rightComponent}</View>
      )}
    </TouchableOpacity>
  );
};

// Custom Chip Component
const Chip = ({ children, selected, onPress, selectedColor }: any) => {
  const theme = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.chip,
        {
          backgroundColor: selected
            ? selectedColor || theme.colors.primary
            : "transparent",
          borderColor: selected
            ? selectedColor || theme.colors.primary
            : theme.colors.border,
        },
      ]}
      onPress={onPress}>
      <Text
        style={[
          styles.chipText,
          {
            color: selected ? theme.colors.card : theme.colors.text,
          },
        ]}>
        {children}
      </Text>
    </TouchableOpacity>
  );
};

export default function AccountScreen(): JSX.Element {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  // Local editable state
  const [profile, setProfile] = useState<Profile>(INITIAL_PROFILE);
  const [editing, setEditing] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [autoSync, setAutoSync] = useState(true);
  const [preferredFormat, setPreferredFormat] = useState<
    "system" | "indian" | "international"
  >("system");

  const initials = useMemo(() => {
    const parts = profile.name.trim().split(/\s+/);
    return parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("");
  }, [profile.name]);

  const onSave = () => {
    setEditing(false);
    Alert.alert("Saved", "Account details updated successfully.");
  };

  const onCancel = () => {
    setEditing(false);
  };

  const onExport = () => {
    Alert.alert("Export started", "Preparing a CSV export of transactions…");
  };

  const onBackup = () => {
    Alert.alert(
      "Backup & Sync",
      autoSync ? "Auto sync is ON. Syncing now…" : "Syncing once…"
    );
  };

  const onClearLocal = () => {
    Alert.alert(
      "Clear local data",
      "This will remove local transactions and preferences on this device. Cloud data will be unaffected.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.clear();
            Alert.alert("Cleared", "Local data removed.");
          },
        },
      ]
    );
  };

  const onSignOut = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          Alert.alert("Signed out", "Come back soon!");
        },
      },
    ]);
  };

  const { themePref } = useAppSelector((state) => state.theme);
  const dispatch = useAppDispatch();

  const handleToggleTheme = () => {
    dispatch(toggleTheme());
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          // padding: 16,
          paddingBottom: getBottomContentPadding(insets.bottom, 50),
          gap: 16,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + 12 }]}>
          <Animated.View>
            <View
              style={[styles.heroHeader, { backgroundColor: "transparent" }]}>
              <View>
                <Text style={[styles.helloSmall]}>
                  Account
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleToggleTheme}
                style={styles.badgeIcon}
                activeOpacity={0.7}>
                {themePref === "dark" ? (
                  <Ionicons name="partly-sunny" size={18} color="#FFFFFF" />
                ) : (
                  <Ionicons name="cloudy-night" size={18} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
            <View
              style={{
                flexDirection: "column",
                alignItems: "center",
              }}>
              <Button
                style={{
                  marginLeft: 8,
                  width: "40%",
                  backgroundColor: theme.colors.primary,
                }}
                textColor={"#ffffff"}
                onPress={onBackup}
                compact>
                Sync now
              </Button>
            </View>
          </Animated.View>
        </LinearGradient>

        {/* Data & Security */}
        <Card>
          <CardTitle title="Data & security" />
          <Divider />
          <View style={{ padding: 16 }}>
            <ListItem
              title="Backup & Sync"
              description={autoSync ? "Auto sync enabled" : "Manual sync"}
              leftIcon="cloud"
              rightComponent={
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Switch value={autoSync} onValueChange={setAutoSync} />
                </View>
              }
            />
            <Divider />
            <ListItem
              title="Export transactions (CSV)"
              description="Download a CSV of all transactions"
              leftIcon="log-out-sharp"
              onPress={onExport}
            />
            <Divider />
            <ListItem
              title="Clear local data"
              description="Remove data from this device"
              leftIcon="trash"
              onPress={onClearLocal}
            />
          </View>
        </Card>

        {/* About */}
        <Card>
          <CardTitle title="About" />
          <Divider />
          <View style={{ padding: 16 }}>
            <ListItem
              title="Version"
              description={Platform.select({
                ios: "1.0.0 (100)",
                android: "1.0.0 (100)",
              })}
              leftIcon="information-circle"
            />
            <ListItem
              title="Privacy policy"
              leftIcon="shield"
              onPress={() => Linking.openURL("https://example.com/privacy")}
            />
            <ListItem
              title="Terms of use"
              leftIcon="document-text"
              onPress={() => Linking.openURL("https://example.com/terms")}
            />
          </View>
        </Card>

        {/* Sign out */}
        <Button
          contentStyle={{
            backgroundColor: theme.colors.primary,
          }}
          textColor={theme.colors.text}
          mode="contained-tonal"
          icon="exit"
          onPress={onSignOut}
          style={{ alignSelf: "center", marginTop: 4 }}>
          Sign out
        </Button>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },

  // Single scroll hero
  hero: {
    paddingHorizontal: 16,
    paddingBottom: 18,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  helloSmall: { color: "rgba(255,255,255,0.9)", fontSize: 13 },
  helloName: { color: "#fff", fontSize: 20, fontWeight: "800", marginTop: 2 },
  badgeIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Avatar styles
  avatar: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontWeight: "bold",
  },

  // Card styles
  card: {
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  cardHeader: {
    padding: 16,
    paddingBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
  },

  // Divider styles
  divider: {
    height: StyleSheet.hairlineWidth,
    width: "100%",
  },

  // Button styles
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    minHeight: 40,
  },
  compactButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 32,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  compactButtonText: {
    fontSize: 12,
  },

  // IconButton styles
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  // List Item styles
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    minHeight: 56,
  },
  listItemLeft: {
    marginRight: 16,
    width: 24,
    alignItems: "center",
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: "400",
  },
  listItemDescription: {
    fontSize: 14,
    marginTop: 2,
  },
  listItemRight: {
    marginLeft: 16,
  },

  // Chip styles
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "500",
  },

  // Header row styles
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  name: {
    fontWeight: "700",
  },
});
