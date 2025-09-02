// app/(auth)/signup.tsx
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Signup() {
  const theme = useTheme();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [cpw, setCpw] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [touched, setTouched] = useState<{
    name?: boolean;
    email?: boolean;
    pw?: boolean;
    cpw?: boolean;
  }>({});

  const nameError = useMemo(() => {
    if (!touched.name) return "";
    if (!name.trim()) return "Name is required";
    if (name.trim().length < 2) return "Enter at least 2 characters";
    return "";
  }, [name, touched.name]);

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

  const cpwError = useMemo(() => {
    if (!touched.cpw) return "";
    if (!cpw.trim()) return "Confirm your password";
    if (cpw !== pw) return "Passwords do not match";
    return "";
  }, [cpw, pw, touched.cpw]);

  const onSignup = async () => {
    if (nameError || emailError || pwError || cpwError) return;
    if (!email || !pw || !cpw) return;
    try {
      setLoading(true);
      const res = await auth().createUserWithEmailAndPassword(email.trim(), pw);
      const user = res?.user;
      if (user && name.trim()) {
        await user.updateProfile({ displayName: name.trim() });
      }
      router.replace("/");
    } catch (e: any) {
      const msg =
        e?.code === "auth/email-already-in-use"
          ? "Email already in use."
          : e?.code === "auth/invalid-email"
          ? "Invalid email."
          : e?.code === "auth/weak-password"
          ? "Weak password."
          : e?.message ?? "Signup failed";
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

  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      contentContainerStyle={[
        styles.scroll,
        {
          backgroundColor: theme.colors.background,
          marginBottom: insets.bottom,
          paddingBottom: insets.bottom + 77,
        },
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
            <Ionicons name="person-add-outline" size={24} color="#fff" />
          </View>
          <Text style={styles.heroTitle}>Create account</Text>
          <Text style={styles.heroSubtitle}>Start tracking today</Text>
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
              Continue with Google
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
          {/* Name */}
          <Text style={[styles.label, { color: theme.colors.text }]}>Name</Text>
          <View
            style={[
              styles.inputWrapper,
              {
                borderColor:
                  nameError && touched.name ? "#ef4444" : theme.colors.border,
                backgroundColor: theme.colors.surface ?? theme.colors.card,
              },
            ]}>
            <Ionicons
              name="person-outline"
              size={18}
              color={theme.colors.text + "99"}
              style={{ marginRight: 8 }}
            />
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="NT"
              placeholderTextColor={theme.colors.text + "60"}
              style={[styles.textInput, { color: theme.colors.text }]}
              onBlur={() => setTouched((t) => ({ ...t, name: true }))}
              returnKeyType="next"
            />
          </View>
          {!!nameError && <Text style={styles.errorText}>{nameError}</Text>}

          {/* Email */}
          <Text
            style={[styles.label, { color: theme.colors.text, marginTop: 14 }]}>
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
              returnKeyType="next"
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

          {/* Confirm Password */}
          <Text
            style={[styles.label, { color: theme.colors.text, marginTop: 14 }]}>
            Confirm password
          </Text>
          <View
            style={[
              styles.inputWrapper,
              {
                borderColor:
                  cpwError && touched.cpw ? "#ef4444" : theme.colors.border,
                backgroundColor: theme.colors.surface ?? theme.colors.card,
              },
            ]}>
            <Ionicons
              name="checkmark-done-outline"
              size={18}
              color={theme.colors.text + "99"}
              style={{ marginRight: 8 }}
            />
            <TextInput
              value={cpw}
              onChangeText={setCpw}
              placeholder="••••••••"
              placeholderTextColor={theme.colors.text + "60"}
              secureTextEntry={!showPw}
              autoCapitalize="none"
              style={[styles.textInput, { color: theme.colors.text }]}
              onBlur={() => setTouched((t) => ({ ...t, cpw: true }))}
              returnKeyType="done"
              onSubmitEditing={onSignup}
            />
          </View>
          {!!cpwError && <Text style={styles.errorText}>{cpwError}</Text>}

          {/* Primary CTA */}
          <TouchableOpacity
            style={[
              styles.primaryButton,
              {
                backgroundColor: theme.colors.tabActive,
                borderColor: theme.colors.text + "20",
              },
            ]}
            onPress={onSignup}
            disabled={
              loading ||
              !name ||
              !email ||
              !pw ||
              !cpw ||
              !!nameError ||
              !!emailError ||
              !!pwError ||
              !!cpwError
            }
            activeOpacity={0.85}>
            {loading ? (
              <ActivityIndicator
                color={(theme.colors as any).onPrimary ?? "#FFF"}
              />
            ) : (
              <View style={styles.btnRow}>
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={(theme.colors as any).onPrimary ?? "#FFF"}
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={[
                    styles.buttonText,
                    { color: (theme.colors as any).onPrimary ?? "#FFF" },
                  ]}>
                  Create account
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

          {/* Secondary */}
          <TouchableOpacity
            style={[
              styles.secondaryButton,
              { borderColor: theme.colors.text + "30" },
            ]}
            onPress={() => router.replace("/(auth)/login")}
            activeOpacity={0.85}>
            <Text style={[styles.secondaryText, { color: theme.colors.text }]}>
              Already have an account? Sign in
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
  btnRow: { flexDirection: "row", alignItems: "center" },
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
  },
  secondaryText: { fontSize: 14, fontWeight: "600" },
});
