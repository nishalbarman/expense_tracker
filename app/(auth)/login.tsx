// app/(auth)/login.tsx
import React, { useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import auth from "@react-native-firebase/auth";
import { useTheme } from "@react-navigation/native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { signInWithGoogleFirebase } from "@/utils/auth/google";

export default function Login() {
  const theme = useTheme();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [touched, setTouched] = useState<{ email?: boolean; pw?: boolean }>({});

  const emailError = useMemo(() => {
    if (!touched.email) return "";
    if (!email.trim()) return "Email is required";
    const ok = /\S+@\S+\.\S+/.test(email.trim());
    return ok ? "" : "Enter a valid email";
  }, [email, touched.email]);

  const pwError = useMemo(() => {
    if (!touched.pw) return "";
    if (!pw.trim()) return "Password is required";
    if (pw.length < 6) return "Minimum 6 characters";
    return "";
  }, [pw, touched.pw]);

  const onLogin = async () => {
    if (emailError || pwError || !email || !pw) return;
    try {
      setLoading(true);
      await auth().signInWithEmailAndPassword(email.trim(), pw);
      router.replace("/");
    } catch (e: any) {
      const msg =
        e?.code === "auth/invalid-email"
          ? "Invalid email address."
          : e?.code === "auth/user-not-found"
          ? "No account found with this email."
          : e?.code === "auth/wrong-password"
          ? "Incorrect password."
          : e?.message ?? "Login failed";
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = async () => {
    try {
      setLoading(true);
      await signInWithGoogleFirebase();
      router.replace("/");
    } catch (e: any) {
      alert(e?.message ?? "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.scroll,
        { backgroundColor: theme.colors.background },
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      <LinearGradient
        colors={[
          theme.colors.primary,
          (theme.colors as any).secondary ?? theme.colors.primary,
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}>
        <View style={styles.heroContent}>
          <View style={styles.badge}>
            <Ionicons name="wallet-outline" size={24} color="#fff" />
          </View>
          <Text style={styles.heroTitle}>Welcome back</Text>
          <Text style={styles.heroSubtitle}>Sign in to continue</Text>
          {/* Google CTA */}
          <TouchableOpacity
            style={[
              styles.googleBtn,
              {
                paddingHorizontal: 10,
                marginTop: 20,
                backgroundColor: theme.colors.tabActive,
              },
            ]}
            onPress={onGoogle}
            activeOpacity={0.85}
            disabled={loading}>
            <Ionicons
              name="logo-google"
              size={18}
              color={"white"}
              style={{ marginRight: 10 }}
            />
            <Text style={[styles.googleText, { color: "white" }]}>
              Sign in with Google
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.kav}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
            },
          ]}>
          {/* Email */}
          <Text style={[styles.label, { color: theme.colors.text }]}>
            Email
          </Text>
          <View
            style={[
              styles.inputWrapper,
              {
                borderColor:
                  emailError && touched.email ? "#ef4444" : theme.colors.border,
                backgroundColor: theme.colors.surface ?? theme.colors.card,
              },
            ]}>
            <Ionicons
              name="mail-outline"
              size={18}
              color={theme.colors.text + "99"}
              style={{ marginRight: 8 }}
            />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="name@example.com"
              placeholderTextColor={theme.colors.text + "60"}
              keyboardType="email-address"
              autoCapitalize="none"
              style={[styles.textInput, { color: theme.colors.text }]}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              returnKeyType="next"
            />
          </View>
          {!!emailError && <Text style={styles.errorText}>{emailError}</Text>}

          {/* Password */}
          <Text
            style={[styles.label, { color: theme.colors.text, marginTop: 14 }]}>
            Password
          </Text>
          <View
            style={[
              styles.inputWrapper,
              {
                borderColor:
                  pwError && touched.pw ? "#ef4444" : theme.colors.border,
                backgroundColor: theme.colors.surface ?? theme.colors.card,
              },
            ]}>
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color={theme.colors.text + "99"}
              style={{ marginRight: 8 }}
            />
            <TextInput
              value={pw}
              onChangeText={setPw}
              placeholder="••••••••"
              placeholderTextColor={theme.colors.text + "60"}
              secureTextEntry={!showPw}
              autoCapitalize="none"
              style={[styles.textInput, { color: theme.colors.text }]}
              onBlur={() => setTouched((t) => ({ ...t, pw: true }))}
              returnKeyType="done"
              onSubmitEditing={onLogin}
            />
            <TouchableOpacity
              onPress={() => setShowPw((s) => !s)}
              style={styles.iconButton}
              activeOpacity={0.7}>
              <Ionicons
                name={showPw ? "eye-off-outline" : "eye-outline"}
                size={18}
                color={theme.colors.text + "99"}
              />
            </TouchableOpacity>
          </View>
          {!!pwError && <Text style={styles.errorText}>{pwError}</Text>}

          {/* Primary CTA */}
          <TouchableOpacity
            style={[
              styles.primaryButton,
              {
                backgroundColor: theme.colors.tabActive,
                // borderColor: theme.colors.text + "20",
              },
            ]}
            onPress={onLogin}
            disabled={loading || !email || !pw || !!emailError || !!pwError}
            activeOpacity={0.85}>
            {loading ? (
              <ActivityIndicator
                color={(theme.colors as any).onPrimary ?? "#FFF"}
              />
            ) : (
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "center",
                  alignItems: "center",
                }}>
                <Ionicons
                  name="log-in-outline"
                  size={18}
                  color={(theme.colors as any).onPrimary ?? "#FFF"}
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={[
                    styles.buttonText,
                    { color: (theme.colors as any).onPrimary ?? "#FFF" },
                  ]}>
                  Sign in
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Separator */}
          <View style={styles.dividerRow}>
            <View
              style={[styles.divider, { backgroundColor: theme.colors.border }]}
            />
            <Text style={[styles.orText, { color: theme.colors.text + "80" }]}>
              or
            </Text>
            <View
              style={[styles.divider, { backgroundColor: theme.colors.border }]}
            />
          </View>

          {/* Secondary CTA */}
          <TouchableOpacity
            style={[
              styles.secondaryButton,
              { borderColor: theme.colors.text + "30" },
            ]}
            onPress={() => router.replace("/(auth)/signup")}
            activeOpacity={0.85}>
            <Ionicons
              name="person-outline"
              size={16}
              color={theme.colors.text}
              style={{ marginRight: 8 }}
            />
            <Text style={[styles.secondaryText, { color: theme.colors.text }]}>
              Create account
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  hero: {
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 36,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  heroContent: { alignItems: "center" },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  heroTitle: { color: "#fff", fontSize: 24, fontWeight: "800" },
  heroSubtitle: { color: "rgba(255,255,255,0.9)", fontSize: 13, marginTop: 6 },
  kav: { paddingHorizontal: 20, paddingTop: 18 },
  card: {
    borderRadius: 16,
    padding: 18,
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 3 },
    }),
  },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 6 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  textInput: { flex: 1, fontSize: 16, paddingVertical: 10 },
  iconButton: { padding: 6, marginLeft: 6 },
  errorText: { color: "#ef4444", fontSize: 12, marginTop: 6 },
  primaryButton: {
    marginTop: 16,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: { fontSize: 16, fontWeight: "700" },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 14,
  },
  divider: { height: StyleSheet.hairlineWidth, flex: 1 },
  orText: { fontSize: 12, marginHorizontal: 10 },
  googleBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  googleText: { fontSize: 14, fontWeight: "700" },
  secondaryButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  secondaryText: { fontSize: 14, fontWeight: "600" },
});
