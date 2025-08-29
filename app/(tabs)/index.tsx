import React, { useMemo } from "react";
import {
  View,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Text,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInUp } from "react-native-reanimated";
import { router } from "expo-router";
import { useTransactions } from "../../context/TransactionContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getBottomContentPadding } from "./_layout";
import { LinearGradient } from "expo-linear-gradient";
import { TransactionItem } from "@/components/TransactionItem";
import { useTheme } from "@react-navigation/native";

// Custom Card Component
const CustomCard = ({ children, style, onPress, ...props }: any) => {
  const Card = onPress ? TouchableOpacity : View;
  return (
    <Card
      style={[styles.card, style]}
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
      {...props}>
      {children}
    </Card>
  );
};

// Custom Button Component
const CustomButton = ({ children, onPress, compact = false, style }: any) => {
  const theme = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.button,
        compact && styles.compactButton,
        { borderColor: theme.colors.primary },
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.7}>
      <Text
        style={[
          styles.buttonText,
          compact && styles.compactButtonText,
          { color: theme.colors.primary },
        ]}>
        {children}
      </Text>
    </TouchableOpacity>
  );
};

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

  const GRADIENT = useMemo(() => {
    return [
      theme.colors.primary,
      theme.colors.secondary || theme.colors.primary,
    ];
  }, [theme.colors]);

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="light-content" />

      {/* Single ScrollView page */}
      <ScrollView
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
            </View>
            {/* <TouchableOpacity style={styles.badgeIcon} activeOpacity={0.7}>
              <Ionicons
                name="notifications-outline"
                size={18}
                color="#FFFFFF"
              />
            </TouchableOpacity> */}
          </View>

          {/* Balance slab */}
          <Animated.View
            entering={FadeInUp.delay(120).duration(600)}
            style={[styles.slabShadow, { backgroundColor: "#fffaeeff" }]}>
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
                    <Ionicons name="arrow-down" size={16} color={"#22C55E"} />
                  </View>
                  <View style={{ marginLeft: 8 }}>
                    <Text style={styles.kpiTitle}>Income</Text>
                    <Text style={[styles.kpiValue, { color: "#22C55E" }]}>
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
                    <Ionicons name="arrow-up" size={16} color={"#EF4444"} />
                  </View>
                  <View style={{ marginLeft: 8 }}>
                    <Text style={styles.kpiTitle}>Expenses</Text>
                    <Text style={[styles.kpiValue, { color: "#EF4444" }]}>
                      ₹{totalExpenses.toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </Animated.View>
        </LinearGradient>

        {/* Quick tiles */}
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
          <CustomButton compact onPress={() => router.push("/history")}>
            View all
          </CustomButton>
        </View>

        <Animated.View
          style={{ paddingHorizontal: 15 }}
          entering={FadeInUp.delay(150).duration(600)}>
          <CustomCard style={styles.cardList}>
            <View style={[styles.cardContent]}>
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
            </View>
          </CustomCard>
        </Animated.View>
      </ScrollView>
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
    <CustomCard
      style={[styles.tile, { backgroundColor: color }]}
      onPress={onPress}>
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
    </CustomCard>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },

  // Card Component
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
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
  cardContent: {
    paddingTop: 6,
    paddingBottom: 6,
    paddingHorizontal: 16,
  },

  // Button Component
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: "transparent",
  },
  compactButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  compactButtonText: {
    fontSize: 12,
  },

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
    marginTop: 20,
    marginBottom: 10,
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
  tile: {
    width: "48%",
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
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
