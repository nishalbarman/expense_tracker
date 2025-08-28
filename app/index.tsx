import React, { useMemo } from "react";
import { View, StyleSheet, StatusBar } from "react-native";
import { Text, Card, useTheme, Button } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInUp } from "react-native-reanimated";
import { router } from "expo-router";
import { useTransactions } from "../context/TransactionContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getBottomContentPadding } from "./_layout";
import { LinearGradient } from "expo-linear-gradient";
import { TransactionItem } from "@/components/TransactionItem";

export default function HomeScreen(): JSX.Element {
  const { transactions } = useTransactions();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  // Metrics
  const totalIncome = useMemo(
    () =>
      transactions
        .filter((t) => t.type === "income")
        .reduce((s, t) => s + t.amount, 0),
    [transactions]
  );
  const totalExpenses = useMemo(
    () =>
      transactions
        .filter((t) => t.type === "expense")
        .reduce((s, t) => s + t.amount, 0),
    [transactions]
  );
  const balance = totalIncome - totalExpenses;

  const recent = useMemo(
    () =>
      [...transactions]
        .sort((a, b) => +new Date(b.date) - +new Date(a.date))
        .slice(0, 5),
    [transactions]
  );

  // Bright but friendly palette (keeps your theme intact elsewhere)
  // const GRADIENT = [theme.colors.primary, theme.colors.secondary];

  const GRADIENT = useMemo(() => {
    return [theme.colors.primary, theme.colors.secondary];
  }, [theme.colors]);

  const GREEN = "#22C55E";
  const RED = "#EF4444";

  return (
    <View style={[styles.screen, { backgroundColor: "#F7F7FB" }]}>
      <StatusBar barStyle="light-content" />

      {/* Single ScrollView page */}
      <Animated.ScrollView
        contentContainerStyle={{
          paddingBottom: getBottomContentPadding(insets.bottom, 50),
        }}
        showsVerticalScrollIndicator={false}>
        {/* Header section sits inside the same ScrollView */}
        <LinearGradient
          colors={GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + 12 }]}>
          <View style={styles.heroHeader}>
            <View>
              <Text style={styles.helloSmall}>Welcome</Text>
              {/* <Text style={styles.helloName}>MoneyTrack</Text> */}
            </View>
            <View style={styles.badgeIcon}>
              <Ionicons
                name="notifications-outline"
                size={18}
                color="#FFFFFF"
              />
            </View>
          </View>

          {/* Balance slab */}
          <Animated.View
            entering={FadeInUp.delay(120).duration(600)}
            style={styles.slabShadow}
            style={{ backgroundColor: "#fffaeeff" }}>
            <View style={styles.balanceSlab}>
              <View style={styles.balanceTopRow}>
                <Text style={styles.balanceLabel}>Current Balance</Text>
                <Ionicons
                  name="ellipsis-horizontal"
                  size={18}
                  color="#4B5563"
                />
              </View>
              <Text style={[styles.balanceAmount, { color: "#111827" }]}>
                ₹{balance.toFixed(2)}
              </Text>

              <View style={styles.kpiRow}>
                <View style={[styles.kpiChip, { backgroundColor: "#E9FDF2" }]}>
                  <View
                    style={[
                      styles.kpiIconWrap,
                      { backgroundColor: "#D1FAE5" },
                    ]}>
                    <Ionicons name="arrow-down" size={16} color={GREEN} />
                  </View>
                  <View style={{ marginLeft: 8 }}>
                    <Text style={styles.kpiTitle}>Income</Text>
                    <Text style={[styles.kpiValue, { color: GREEN }]}>
                      ₹{totalIncome.toFixed(2)}
                    </Text>
                  </View>
                </View>

                <View style={[styles.kpiChip, { backgroundColor: "#FDEBEC" }]}>
                  <View
                    style={[
                      styles.kpiIconWrap,
                      { backgroundColor: "#FEE2E2" },
                    ]}>
                    <Ionicons name="arrow-up" size={16} color={RED} />
                  </View>
                  <View style={{ marginLeft: 8 }}>
                    <Text style={styles.kpiTitle}>Expenses</Text>
                    <Text style={[styles.kpiValue, { color: RED }]}>
                      ₹{totalExpenses.toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </Animated.View>
        </LinearGradient>

        {/* Cute quick tiles (optional, stays in the same scroll) */}
        <View style={styles.quickGrid}>
          <QuickTile
            color="#EEF2FF"
            iconColor="#6366F1"
            icon="wallet-outline"
            title="Add"
            onPress={() => router.push("/add")}
          />
          <QuickTile
            color="#FFF7ED"
            iconColor="#F59E0B"
            icon="bar-chart-outline"
            title="Charts"
            onPress={() => router.push("/charts")}
          />
          <QuickTile
            color="#E0F7FA"
            iconColor="#06B6D4"
            icon="time-outline"
            title="History"
            onPress={() => router.push("/history")}
          />
          <QuickTile
            color="#F1F5F9"
            iconColor="#475569"
            icon="settings-outline"
            title="Account"
            onPress={() => router.push("/account")}
          />
        </View>

        {/* Recent Transactions */}
        <View style={[styles.sectionHeader, { paddingHorizontal: 15 }]}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <Button compact onPress={() => router.push("/history")}>
            View all
          </Button>
        </View>

        <Animated.View
          style={{ paddingHorizontal: 15 }}
          entering={FadeInUp.delay(150).duration(600)}>
          <Card mode="elevated" style={styles.cardList}>
            <Card.Content style={{ paddingTop: 6, paddingBottom: 6 }}>
              {recent.length > 0 ? (
                recent.map((t, idx) => (
                  <View key={t.id ?? idx} style={styles.rowWrap}>
                    <TransactionItem transaction={t} />
                    {idx !== recent.length - 1 && (
                      <View style={styles.rowDivider} />
                    )}
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No recent transactions</Text>
              )}
            </Card.Content>
          </Card>
        </Animated.View>
      </Animated.ScrollView>
    </View>
  );
}

function QuickTile({
  color,
  iconColor,
  icon,
  title,
  onPress,
}: {
  color: string;
  iconColor: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  onPress: () => void;
}) {
  return (
    <Card style={[styles.tile, { backgroundColor: color }]} onPress={onPress}>
      <View style={styles.tileInner}>
        <View
          style={[
            styles.tileIconWrap,
            { backgroundColor: "rgba(0,0,0,0.04)" },
          ]}>
          <Ionicons name={icon} size={20} color={iconColor} />
        </View>
        <Text style={styles.tileText}>{title}</Text>
      </View>
    </Card>
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
    marginBottom: 12,
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

  // Balance slab
  slabShadow: {
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    borderRadius: 18,
  },
  balanceSlab: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  balanceTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  balanceLabel: { fontSize: 13, color: "#6B7280", fontWeight: "700" },
  balanceAmount: { fontSize: 36, fontWeight: "900", marginTop: 6 },

  // KPIs inside slab
  kpiRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    gap: 12,
  },
  kpiChip: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  kpiIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  kpiTitle: { fontSize: 12, color: "#6B7280", fontWeight: "700" },
  kpiValue: { fontSize: 16, fontWeight: "800", marginTop: 2 },

  // Sections
  sectionHeader: {
    paddingHorizontal: 10,
    marginTop: 16,
    marginBottom: 10,
    // paddingHorizontal: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#0F172A" },

  cardList: { borderRadius: 16, backgroundColor: "#FFFFFF" },
  rowWrap: { paddingVertical: 2 },
  rowDivider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.06)",
    marginLeft: 12,
    marginTop: 6,
  },
  emptyText: { textAlign: "center", color: "#9CA3AF", paddingVertical: 12 },

  // Quick tiles
  quickGrid: {
    marginTop: 18,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
    paddingHorizontal: 10,
  },
  tile: { width: "48%", borderRadius: 16, elevation: 2 },
  tileInner: {
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  tileIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tileText: { fontSize: 14, fontWeight: "800", color: "#111827" },
});
