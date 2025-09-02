import React, { useMemo, useState, useContext, useEffect } from "react";
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
import { AntDesign, Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@react-navigation/native";
import { BAR_HEIGHT, getBottomContentPadding } from "../_layout";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { toggleTheme } from "@/redux/slices/themeSlice";
import Animated from "react-native-reanimated";
import { mmkvStorage } from "@/mmkv/mmkvStorage";
import { useTransactions } from "@/context/TransactionContext";
import { router } from "expo-router";
import auth from "@react-native-firebase/auth";

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
          backgroundColor: theme.colors.tabActive,
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
    mode === "contained" && { backgroundColor: theme.colors.tabActive },
    mode === "contained-tonal" && {
      backgroundColor: theme.colors.incomeCard,
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
      {typeof icon === "string" ? (
        <Ionicons name={icon as any} size={size} color={iconColor} />
      ) : (
        icon()
      )}
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

/* Support components */
const LabeledInput = ({ label, rightIcon, style, ...props }: any) => {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={[{ marginBottom: 8 }, style]}>
      {!!label && (
        <Text
          style={{
            color: theme.colors.text,
            fontSize: 12,
            fontWeight: "600",
            marginBottom: 6,
          }}>
          {label}
        </Text>
      )}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          borderWidth: 1,
          borderRadius: 8,
          paddingHorizontal: 12,
          minHeight: 44,
          borderColor: focused ? theme.colors.primary : theme.colors.border,
          backgroundColor: theme.colors.card,
        }}>
        <TextInput
          {...props}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          placeholderTextColor={theme.colors.text + "80"}
          style={{
            flex: 1,
            color: theme.colors.text,
            paddingVertical: 8,
            fontSize: 16,
          }}
        />
        {rightIcon && (
          <Ionicons name={rightIcon} size={18} color={theme.colors.text} />
        )}
      </View>
    </View>
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
  // Firebase Auth state
  const [fbUser, setFbUser] = useState(auth().currentUser ?? null);
  const [authInit, setAuthInit] = useState(true);

  console.log("Who is currently signed in: ", fbUser);

  useEffect(() => {
    const unsub = auth().onAuthStateChanged((u) => {
      setFbUser(u);
      setAuthInit(false);
    });
    return unsub;
  }, []);

  // Local editable state
  const [profile, setProfile] = useState<Profile>({
    ...INITIAL_PROFILE,
    name: fbUser?.displayName ?? "",
    email: fbUser?.email ?? "",
    // phone: fbUser?.phoneNumber ?? "",
  });
  const [editing, setEditing] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [preferredFormat, setPreferredFormat] = useState<
    "system" | "indian" | "international"
  >("system");

  const { autoSync, syncAllTransactions, setAutoSync } = useTransactions();

  const initials = useMemo(() => {
    const base = profile.name || profile.email || "U";
    const parts = base.trim().split(/\s+/);
    return parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("");
  }, [profile.name, profile.email]);

  useEffect(() => {
    if (fbUser) {
      setProfile((prev) => ({
        ...prev,
        name: fbUser.displayName ?? "",
        email: fbUser.email ?? "",
        phone: fbUser.phoneNumber ?? "",
      }));
    }
  }, [fbUser?.displayName, fbUser?.email, fbUser?.phoneNumber]);

  const onSave = async () => {
    if (!fbUser) {
      Alert.alert("Sign in required", "Please sign in to update your profile.");
      return;
    }
    try {
      if (profile.name !== (fbUser.displayName ?? "")) {
        await fbUser.updateProfile({ displayName: profile.name });
      }
      if (profile.email !== (fbUser.email ?? "")) {
        await fbUser.updateEmail(profile.email);
      }
      setEditing(false);
      Alert.alert("Saved", "Account details updated successfully.");
    } catch (e: any) {
      Alert.alert("Update failed", e?.message ?? "Could not update profile.");
    }
  };

  const onCancel = () => {
    setProfile({
      ...profile,
      name: fbUser?.displayName ?? "",
      email: fbUser?.email ?? "",
      phone: fbUser?.phoneNumber ?? "",
    });
    setEditing(false);
  };

  const onExport = () => {
    Alert.alert("Export started", "Preparing a CSV export of transactions…");
  };

  const onBackup = () => {
    syncAllTransactions();
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
            await mmkvStorage.clear();
            Alert.alert("Cleared", "Local data removed.");
          },
        },
      ]
    );
  };

  const onSignOut = async () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          try {
            await auth().signOut();
            Alert.alert("Signed out", "Come back soon!");
          } catch (e: any) {
            Alert.alert("Sign out failed", e?.message ?? "Please try again.");
          }
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
                <Text style={[styles.helloSmall]}>Account</Text>
              </View>
              <TouchableOpacity
                onPress={onSignOut}
                style={styles.badgeIcon}
                activeOpacity={0.7}>
                {!!fbUser ? (
                  <Ionicons name="log-out-outline" size={18} color="#FFFFFF" />
                ) : (
                  <Ionicons name="log-in-outline" size={18} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
            <View
              style={{
                flexDirection: "column",
                alignItems: "center",
              }}>
              {!!fbUser ? (
                <Button
                  style={{
                    marginLeft: 8,
                    width: "40%",
                    backgroundColor: theme.colors.primary,
                    borderWidth: 1,
                    borderColor: "white",
                  }}
                  textColor={"#ffffff"}
                  onPress={onBackup}
                  compact>
                  Sync now
                </Button>
              ) : (
                <Button
                  style={{
                    marginLeft: 8,
                    width: "40%",
                    backgroundColor: theme.colors.primary,
                    borderWidth: 1,
                    borderColor: "white",
                  }}
                  textColor={"#ffffff"}
                  onPress={() => {
                    router.push("/login");
                  }}
                  compact>
                  Login to Sync
                </Button>
              )}
            </View>
          </Animated.View>
        </LinearGradient>

        {/* Signed-out view: Sign-in CTA */}
        {!fbUser ? (
          <Card>
            <CardTitle title="Account" />
            <Divider />
            <View style={{ padding: 16 }}>
              <ListItem
                title="Not signed in"
                description={"Sign in to back up and sync data"}
                leftIcon="person-circle-outline"
                rightComponent={
                  !!fbUser ? (
                    <Button
                      style={{
                        marginLeft: 8,
                        // width: "40%",
                        backgroundColor: theme.colors.tabActive,
                      }}
                      textColor={"#ffffff"}
                      onPress={onBackup}
                      compact>
                      Sync now
                    </Button>
                  ) : (
                    <Button
                      style={{
                        marginLeft: 8,
                        // width: "40%",
                        backgroundColor: theme.colors.tabActive,
                      }}
                      textColor={"#ffffff"}
                      onPress={() => {
                        router.push("/login");
                      }}
                      compact>
                      Login
                    </Button>
                  )
                }
              />
            </View>
          </Card>
        ) : (
          <>
            {/* Signed-in view: Profile Header */}
            <Card>
              <View style={{ padding: 16 }}>
                <View style={styles.headerRow}>
                  <Avatar label={initials || "A"} size={64} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    {!editing ? (
                      <>
                        <Text
                          style={[
                            styles.name,
                            { color: theme.colors.text, fontSize: 18 },
                          ]}>
                          {profile.name || "Unnamed"}
                        </Text>
                        <Text
                          style={{ opacity: 0.7, color: theme.colors.text }}>
                          {profile.email || "No email"}
                        </Text>
                      </>
                    ) : (
                      <>
                        <LabeledInput
                          label="Name"
                          value={profile.name}
                          onChangeText={(t: string) =>
                            setProfile((p) => ({ ...p, name: t }))
                          }
                          style={{ marginBottom: 8 }}
                        />
                        <LabeledInput
                          label="Email"
                          keyboardType="email-address"
                          autoCapitalize="none"
                          value={profile.email}
                          onChangeText={(t: string) =>
                            setProfile((p) => ({ ...p, email: t }))
                          }
                        />
                      </>
                    )}
                  </View>
                  {!editing && (
                    <IconButton
                      icon={() => {
                        return (
                          <AntDesign
                            name="edit"
                            color={theme.colors.text}
                            size={15}
                          />
                        );
                      }}
                      mode="contained-tonal"
                      onPress={() => setEditing(true)}
                    />
                  )}
                </View>
                {!!editing && (
                  <View
                    style={{
                      flexDirection: "row",
                      marginLeft: 8,
                      justifyContent: "center",
                      gap: 5,
                      marginTop: 2,
                    }}>
                    <IconButton
                      icon={() => {
                        return (
                          <AntDesign name="save" color={"white"} size={18} />
                        );
                      }}
                      mode="contained"
                      onPress={onSave}
                    />
                    <IconButton
                      icon={() => {
                        return (
                          <AntDesign name="close" color={"white"} size={18} />
                        );
                      }}
                      mode="contained"
                      onPress={onCancel}
                    />
                  </View>
                )}
              </View>
            </Card>

            {/* Personal details */}
            {/* <Card>
              <CardTitle title="Personal details" />
              <Divider />
              <View style={{ padding: 16, paddingTop: 8 }}>
                {!editing ? (
                  <View style={{ gap: 10 }}>
                    <ListItem
                      title="Phone"
                      description={profile.phone || "Not set"}
                      leftIcon="call-outline"
                    />
                    <ListItem
                      title="Currency"
                      description={profile.currency}
                      leftIcon="cash-outline"
                    />
                    <ListItem
                      title="Country"
                      description={profile.country}
                      leftIcon="location-outline"
                    />
                  </View>
                ) : (
                  <>
                    <LabeledInput
                      label="Phone"
                      keyboardType="phone-pad"
                      value={profile.phone || ""}
                      onChangeText={(t: string) =>
                        setProfile((p) => ({ ...p, phone: t }))
                      }
                      style={{ marginBottom: 12 }}
                    />
                    <LabeledInput
                      label="Currency"
                      value={profile.currency}
                      onChangeText={(t: string) =>
                        setProfile((p) => ({ ...p, currency: t }))
                      }
                      rightIcon="chevron-down"
                      style={{ marginBottom: 12 }}
                    />
                    <LabeledInput
                      label="Country"
                      value={profile.country}
                      onChangeText={(t: string) =>
                        setProfile((p) => ({ ...p, country: t }))
                      }
                      rightIcon="chevron-down"
                    />
                  </>
                )}
              </View>
            </Card> */}
          </>
        )}

        {/* Preferences */}
        <Card>
          <CardTitle title="Preferences" />
          <Divider />
          <View style={{ padding: 16 }}>
            <ListItem
              title="Dark mode"
              leftIcon={themePref === "dark" ? "moon" : "sunny-outline"}
              rightComponent={
                <Switch
                  value={themePref === "dark"}
                  onValueChange={handleToggleTheme}
                />
              }
            />
            {/* <Divider style={{ marginVertical: 8 }} /> */}
            {/* <Text
              style={{
                marginBottom: 8,
                color: theme.colors.text,
                fontWeight: "600",
              }}>
              Number/Currency format
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {(["system", "indian", "international"] as const).map((opt) => (
                <Chip
                  key={opt}
                  selected={preferredFormat === opt}
                  onPress={() => setPreferredFormat(opt)}
                  selectedColor={theme.colors.primary}>
                  {opt === "system"
                    ? "System default"
                    : opt === "indian"
                    ? "Indian (1,00,000)"
                    : "International (100,000)"}
                </Chip>
              ))}
            </View> */}
          </View>
        </Card>

        {/* Data & Security */}
        <Card>
          <CardTitle title="Data & security" />
          <Divider />
          <View style={{ padding: 16 }}>
            <ListItem
              title="Backup & Sync"
              description={autoSync ? "Auto sync enabled" : "Manual sync"}
              leftIcon="cloud-outline"
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
              leftIcon="log-out-outline"
              onPress={onExport}
            />
            <Divider />
            <ListItem
              title="Clear local data"
              description="Remove data from this device"
              leftIcon="trash-outline"
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
              leftIcon="information-circle-outline"
            />
            <Divider />
            <ListItem
              title="Privacy policy"
              leftIcon="shield-outline"
              onPress={() => Linking.openURL("https://example.com/privacy")}
            />
            <Divider />
            <ListItem
              title="Terms of use"
              leftIcon="document-text-outline"
              onPress={() => Linking.openURL("https://example.com/terms")}
            />
          </View>
        </Card>

        {/* Sign out */}
        {!!fbUser ? (
          <Button
            contentStyle={{
              backgroundColor: theme.colors.primary,
            }}
            textColor={"white"}
            mode="contained-tonal"
            icon="exit"
            onPress={onSignOut}
            color="white"
            style={{ alignSelf: "center", marginTop: 4 }}>
            Sign out
          </Button>
        ) : (
          <Button
            contentStyle={{
              backgroundColor: theme.colors.primary,
            }}
            textColor={"white"}
            mode="contained-tonal"
            icon="exit"
            onPress={() => {
              router.push("/login");
            }}
            color="white"
            style={{ alignSelf: "center", marginTop: 4 }}>
            Sign in
          </Button>
        )}
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
