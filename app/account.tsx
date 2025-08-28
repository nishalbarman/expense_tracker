import React, { useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
  Platform,
} from "react-native";
import {
  Avatar,
  Button,
  Card,
  Divider,
  IconButton,
  List,
  Switch,
  Text,
  TextInput,
  useTheme,
  Chip,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BAR_HEIGHT, getBottomContentPadding } from "../app/_layout"; // adjust path if needed

type Profile = {
  name: string;
  email: string;
  phone?: string;
  currency: string;
  country: string;
};

const INITIAL_PROFILE: Profile = {
  name: "Alex Johnson",
  email: "alex@example.com",
  phone: "+91 98765 43210",
  currency: "INR ₹",
  country: "India",
};

export default function AccountScreen(): JSX.Element {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  // Local editable state; in production, hydrate from storage/backend
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
    // TODO: persist profile + preferences
    setEditing(false);
    Alert.alert("Saved", "Account details updated successfully.");
  };

  const onCancel = () => {
    // TODO: restore from persisted state if needed
    setEditing(false);
  };

  const onExport = () => {
    // TODO: implement export to CSV from transaction store
    Alert.alert("Export started", "Preparing a CSV export of transactions…");
  };

  const onBackup = () => {
    // TODO: push to cloud (Drive/iCloud/own backend)
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
            // TODO: clear async storage/db and rehydrate providers
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
          // TODO: auth signOut + navigate to auth stack
          Alert.alert("Signed out", "Come back soon!");
        },
      },
    ]);
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: getBottomContentPadding(insets.bottom, 50),
          gap: 16,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {/* Profile header */}
        {/* <Card
          mode="elevated"
          style={[styles.card, { backgroundColor: "white" }]}>
          <Card.Content>
            <View style={styles.headerRow}>
              <Avatar.Text
                size={64}
                label={initials || "A"}
                style={{ backgroundColor: theme.colors.primary }}
                color={theme.colors.onPrimary}
              />
              <View style={{ flex: 1, marginLeft: 12 }}>
                {!editing ? (
                  <>
                    <Text variant="titleMedium" style={styles.name}>
                      {profile.name}
                    </Text>
                    <Text variant="bodyMedium" style={{ opacity: 0.7 }}>
                      {profile.email}
                    </Text>
                  </>
                ) : (
                  <>
                    <TextInput
                      mode="outlined"
                      label="Name"
                      value={profile.name}
                      onChangeText={(t) =>
                        setProfile((p) => ({ ...p, name: t }))
                      }
                      style={{ marginBottom: 8 }}
                    />
                    <TextInput
                      mode="outlined"
                      label="Email"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={profile.email}
                      onChangeText={(t) =>
                        setProfile((p) => ({ ...p, email: t }))
                      }
                    />
                  </>
                )}
              </View>
              {!editing ? (
                <IconButton
                  icon="pencil"
                  mode="contained-tonal"
                  onPress={() => setEditing(true)}
                />
              ) : (
                <View style={{ flexDirection: "row" }}>
                  <IconButton
                    icon="content-save"
                    mode="contained"
                    onPress={onSave}
                  />
                  <IconButton
                    icon="close"
                    mode="contained-tonal"
                    onPress={onCancel}
                  />
                </View>
              )}
            </View>
          </Card.Content>
        </Card> */}

        {/* Personal details */}
        {/* <Card mode="elevated"  style={[styles.card, { backgroundColor: "white" }]}>>
          <Card.Title title="Personal details" />
          <Divider />
          <Card.Content style={{ paddingTop: 8 }}>
            {editing ? (
              <>
                <TextInput
                  mode="outlined"
                  label="Phone"
                  keyboardType="phone-pad"
                  value={profile.phone || ""}
                  onChangeText={(t) => setProfile((p) => ({ ...p, phone: t }))}
                  style={{ marginBottom: 12 }}
                />
                <TextInput
                  mode="outlined"
                  label="Currency"
                  value={profile.currency}
                  onChangeText={(t) =>
                    setProfile((p) => ({ ...p, currency: t }))
                  }
                  right={<TextInput.Icon icon="chevron-down" />}
                  style={{ marginBottom: 12 }}
                />
                <TextInput
                  mode="outlined"
                  label="Country"
                  value={profile.country}
                  onChangeText={(t) =>
                    setProfile((p) => ({ ...p, country: t }))
                  }
                  right={<TextInput.Icon icon="chevron-down" />}
                />
              </>
            ) : (
              <View style={{ gap: 10 }}>
                <List.Item
                  title="Phone"
                  description={profile.phone || "Not set"}
                  left={(p) => <List.Icon {...p} icon="phone" />}
                />
                <List.Item
                  title="Currency"
                  description={profile.currency}
                  left={(p) => <List.Icon {...p} icon="currency-inr" />}
                />
                <List.Item
                  title="Country"
                  description={profile.country}
                  left={(p) => <List.Icon {...p} icon="map-marker" />}
                />
              </View>
            )}
          </Card.Content>
        </Card> */}

        {/* Preferences */}
        {/* <Card
          mode="elevated"
          style={[styles.card, { backgroundColor: "white" }]}>
          <Card.Title title="Preferences" />
          <Divider />
          <Card.Content>
            <List.Item
              title="Dark mode"
              left={(p) => (
                <List.Icon
                  {...p}
                  icon={darkMode ? "weather-night" : "white-balance-sunny"}
                />
              )}
              right={() => (
                <Switch value={darkMode} onValueChange={setDarkMode} />
              )}
            />
            <Divider style={{ marginVertical: 8 }} />
            <Text variant="labelLarge" style={{ marginBottom: 8 }}>
              Number/Currency format
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {(["system", "indian", "international"] as const).map((opt) => (
                <Chip
                  key={opt}
                  selected={preferredFormat === opt}
                  onPress={() => setPreferredFormat(opt)}
                  mode="outlined"
                  selectedColor={theme.colors.primary}>
                  {opt === "system"
                    ? "System default"
                    : opt === "indian"
                    ? "Indian (1,00,000)"
                    : "International (100,000)"}
                </Chip>
              ))}
            </View>
          </Card.Content>
        </Card> */}

        {/* Data & Security */}
        <Card
          mode="elevated"
          style={[styles.card, { backgroundColor: "white" }]}>
          <Card.Title title="Data & security" />
          <Divider />
          <Card.Content>
            <List.Item
              title="Backup & Sync"
              description={autoSync ? "Auto sync enabled" : "Manual sync"}
              left={(p) => <List.Icon {...p} icon="cloud-sync" />}
              right={() => (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Switch value={autoSync} onValueChange={setAutoSync} />
                  <Button onPress={onBackup} compact>
                    Sync now
                  </Button>
                </View>
              )}
            />
            <Divider />
            <List.Item
              title="Export transactions (CSV)"
              description="Download a CSV of all transactions"
              left={(p) => <List.Icon {...p} icon="file-delimited" />}
              onPress={onExport}
            />
            <Divider />
            <List.Item
              title="Clear local data"
              description="Remove data from this device"
              left={(p) => <List.Icon {...p} icon="delete-alert" />}
              onPress={onClearLocal}
            />
          </Card.Content>
        </Card>

        {/* About */}
        <Card
          mode="elevated"
          style={[styles.card, { backgroundColor: "white" }]}>
          <Card.Title title="About" />
          <Divider />
          <Card.Content>
            <List.Item
              title="Version"
              description={Platform.select({
                ios: "1.0.0 (100)",
                android: "1.0.0 (100)",
              })}
              left={(p) => <List.Icon {...p} icon="information-outline" />}
            />
            <List.Item
              title="Privacy policy"
              left={(p) => <List.Icon {...p} icon="shield-lock-outline" />}
              onPress={() => Linking.openURL("https://example.com/privacy")}
            />
            <List.Item
              title="Terms of use"
              left={(p) => <List.Icon {...p} icon="file-document-outline" />}
              onPress={() => Linking.openURL("https://example.com/terms")}
            />
          </Card.Content>
        </Card>

        {/* Sign out */}
        <Button
          contentStyle={{
            backgroundColor: theme.colors.primary,
          }}
          textColor="white"
          mode="contained-tonal"
          icon="logout"
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
  card: { borderRadius: 12 },
  headerRow: { flexDirection: "row", alignItems: "center" },
  name: { fontWeight: "700" },
});
