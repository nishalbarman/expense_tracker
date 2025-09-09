import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  Platform,
} from "react-native";
import { PieChart, BarChart, LineChart } from "react-native-gifted-charts";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useTransactions } from "../../context/TransactionContext";
import { getBottomContentPadding } from "../_layout";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@react-navigation/native";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { toggleTheme } from "@/redux/slices/themeSlice";
import { useFetchUserSummaryChartQuery } from "@/redux/api/localTxApi";
import { useFocusEffect } from "expo-router";

type ChartType = "pie" | "bar" | "line";

const screenWidth = Dimensions.get("window").width;
const CHART_WIDTH = screenWidth - 32;
const CHART_HEIGHT = 220;

const monthKeys = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export default function ChartsScreen(): JSX.Element {
  // const { transactions } = useTransactions();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [chartType, setChartType] = useState<ChartType>("pie");

  const uid = useAppSelector((s) => s.transactionsUI.uid) ?? "__local__";
  const {
    data: financialData,
    isFetching,
    refetch,
    isUninitialized,
    error,
  } = useFetchUserSummaryChartQuery({ userId: uid }, { skip: !uid });

  console.log("Financial Data: ", financialData, error);

  // Calculate financial data
  // const financialData = useMemo(() => {
  //   const byCat: Record<string, number> = {};
  //   let totalExpenses = 0;
  //   let totalIncome = 0;

  //   for (const t of transactions) {
  //     if (t.type === "expense") {
  //       byCat[t.category] = (byCat[t.category] || 0) + t.amount;
  //       totalExpenses += t.amount;
  //     } else if (t.type === "income") {
  //       totalIncome += t.amount;
  //     }
  //   }

  //   return {
  //     expensesByCategory: byCat,
  //     totalExpenses,
  //     totalIncome,
  //     totalBalance: totalIncome - totalExpenses,
  //   };
  // }, [transactions]);

  // Monthly expense data

  // Color palette for categories (kept vivid for contrast on both themes)
  const palette = useMemo(
    () => [
      "#FF6B6B",
      "#4ECDC4",
      "#45B7D1",
      "#96CEB4",
      "#FECA57",
      "#FF9FF3",
      "#54A0FF",
      "#5F27CD",
      "#00D2D3",
      "#FF9F43",
      "#10AC84",
      "#EE5A24",
      "#0078FF",
      "#833471",
      "#006BA6",
      "#A3CB38",
      "#F368E0",
      "#222F3E",
      "#C4E538",
      "#1DD1A1",
    ],
    []
  );

  // Map category -> color
  const categoryColors = useMemo(() => {
    if (!financialData?.expensesByCategory) return {};
    const entries = Object.keys(financialData.expensesByCategory);
    const map: Record<string, string> = {};
    entries.forEach((cat, idx) => {
      map[cat] = palette[idx % palette.length];
    });
    return map;
  }, [financialData]);

  const allCategoriesOrdered = useMemo(() => {
    if (!financialData?.expensesByCategory) return [];
    return Object.entries(financialData.expensesByCategory).map(
      ([category, amount]) => ({ category, amount })
    );
  }, [financialData]);

  // Pie data
  const pieData = useMemo(() => {
    return allCategoriesOrdered.map(({ category, amount }) => ({
      value: amount,
      text: category,
      color: categoryColors[category],
      label: category,
    }));
  }, [allCategoriesOrdered, categoryColors]);

  // Bar data
  const barData = useMemo(() => {
    return allCategoriesOrdered.map(({ category, amount }) => ({
      value: amount,
      label: category,
      frontColor: categoryColors[category],
    }));
  }, [allCategoriesOrdered, categoryColors]);

  // Line data
  const lineData = useMemo(() => {
    if (!financialData?.monthlyExpenses) return [];
    return financialData.monthlyExpenses.map((val: any, idx: number) => ({
      value: val,
      label: monthKeys[idx],
    }));
  }, [financialData]);

  const hasExpenseData = financialData?.totalExpense || -1 > 0;

  // Theming for charts and UI elements
  const textOnPrimary = (theme.colors as any).onPrimary ?? "#FFFFFF";
  const onSurfaceVariant =
    (theme.colors as any).onSurfaceVariant ?? theme.colors.text + "80";
  const secondary = (theme.colors as any).secondary ?? theme.colors.primary;

  // Progress Bar Component
  const ProgressBar = ({
    percentage,
    color,
  }: {
    percentage: number;
    color: string;
  }) => (
    <View style={styles.progressBarContainer}>
      <View
        style={[
          styles.progressBarBackground,
          {
            backgroundColor: theme.dark
              ? "rgba(255,255,255,0.08)"
              : "rgba(0,0,0,0.06)",
          },
        ]}>
        <Animated.View
          entering={FadeInUp.delay(600)}
          style={[
            styles.progressBarFill,
            { width: `${percentage}%`, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );

  // const GRADIENT = useMemo(() => {
  //   return [theme.colors.primary, secondary];
  // }, [theme.colors, secondary]);

  const { themePref } = useAppSelector((state) => state.theme);

  const dispatch = useAppDispatch();

  const handleToggleTheme = () => {
    dispatch(toggleTheme());
  };

  // Chart Type Selector
  const ChartSelector = () => (
    <>
      <LinearGradient
        colors={[theme.colors.primary, secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + 12 }]}>
        <View style={styles.heroHeader}>
          <View>
            <Text style={styles.helloSmall}>Analytics</Text>
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
          {/* <View>
            <Text style={styles.helloSmall}>Chart Options</Text>
          </View> */}
        </View>

        <Animated.View>
          <View
            style={[styles.chartTabs, { backgroundColor: theme.colors.card }]}>
            {(["pie", "bar", "line"] as ChartType[]).map((type) => {
              const isActive = chartType === type;
              const icon =
                type === "pie"
                  ? "pie-chart"
                  : type === "bar"
                  ? "bar-chart"
                  : "trending-up";
              return (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.tab,
                    isActive && {
                      backgroundColor: theme.colors.primary,
                    },
                  ]}
                  onPress={() => setChartType(type)}
                  activeOpacity={0.7}>
                  <Ionicons
                    name={icon as any}
                    size={18}
                    color={isActive ? textOnPrimary : onSurfaceVariant}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </LinearGradient>
    </>
  );

  // Enhanced Legend Component with Progress Bars
  const Legend = () => {
    if (!hasExpenseData) return null;

    return (
      <Animated.View
        entering={FadeInUp.delay(500)}
        style={[styles.legendCard, { backgroundColor: theme.colors.card }]}>
        <View
          style={[
            styles.legendHeader,
            {
              borderBottomColor: theme.dark
                ? "rgba(255,255,255,0.08)"
                : "#E5E7EB",
            },
          ]}>
          <Text style={[styles.legendTitle, { color: theme.colors.text }]}>
            Category Breakdown
          </Text>
          <View
            style={[
              styles.totalBadge,
              { backgroundColor: theme.colors.primary + "20" },
            ]}>
            <Text style={[styles.totalAmount, { color: theme.colors.primary }]}>
              ₹{financialData?.totalExpense?.toFixed(2)}
            </Text>
          </View>
        </View>

        <View style={styles.legendList}>
          {financialData?.totalExpense &&
            Object.entries(financialData.expensesByCategory)
              .map(([category, amount]) => ({ category, amount }))
              // .sort((a, b) => b.amount - a.amount)
              .map(({ category, amount }) => {
                const percentage = (amount / financialData?.totalExpense) * 100;
                const color = categoryColors[category];

                return (
                  <View key={category} style={styles.legendItem}>
                    <View
                      style={[styles.categoryDot, { backgroundColor: color }]}
                    />
                    <View style={{ flex: 1 }}>
                      {/* Row header */}
                      <View style={styles.legendItemHeader}>
                        <View style={styles.legendItemLeft}>
                          <Text
                            style={[
                              styles.categoryName,
                              { color: theme.colors.text },
                            ]}>
                            {category}
                          </Text>
                        </View>
                        <View style={styles.amountContainer}>
                          <Text
                            style={[
                              styles.categoryAmount,
                              { color: theme.colors.text },
                            ]}>
                            ₹{amount?.toFixed(0)}
                          </Text>
                        </View>
                      </View>

                      {/* Progress + percent */}
                      <View
                        style={{ flexDirection: "row", alignItems: "center" }}>
                        <ProgressBar percentage={percentage} color={color} />
                        <Text
                          style={[
                            styles.categoryPercent,
                            { color: onSurfaceVariant, marginLeft: 8 },
                          ]}>
                          {percentage?.toFixed(1)}%
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
        </View>

        {/* Summary Stats */}
        <View
          style={[
            styles.summaryStats,
            {
              borderTopColor: theme.dark ? "rgba(255,255,255,0.08)" : "#E5E7EB",
            },
          ]}>
          <View
            style={[
              styles.statBox,
              { backgroundColor: theme.colors.background },
            ]}>
            <Text style={[styles.statLabel, { color: onSurfaceVariant }]}>
              Categories
            </Text>
            <Text style={[styles.statValue, { color: theme.colors.tabActive }]}>
              {financialData?.expensesByCategory &&
                Object.keys(financialData.expensesByCategory).length}
            </Text>
          </View>
          <View
            style={[
              styles.statBox,
              { backgroundColor: theme.colors.background },
            ]}>
            <Text style={[styles.statLabel, { color: onSurfaceVariant }]}>
              Avg per Category
            </Text>
            <Text style={[styles.statValue, { color: theme.colors.tabActive }]}>
              ₹
              {financialData?.totalExpense &&
                (
                  financialData.totalExpense /
                    Object.keys(financialData.expensesByCategory).length || 0
                ).toFixed(0)}
            </Text>
          </View>
        </View>
      </Animated.View>
    );
  };

  // Empty State
  const EmptyState = () => (
    <Animated.View
      entering={FadeInUp.delay(400)}
      style={[styles.emptyState, { backgroundColor: theme.colors.card }]}>
      <View
        style={[
          styles.emptyIcon,
          { backgroundColor: theme.colors.background },
        ]}>
        <Ionicons name="analytics-outline" size={48} color={onSurfaceVariant} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
        No Data Available
      </Text>
      <Text style={[styles.emptySubtitle, { color: onSurfaceVariant }]}>
        Start adding transactions to see your expense analytics
      </Text>
    </Animated.View>
  );

  // Chart Renderer
  const renderChart = () => {
    if (!hasExpenseData && chartType !== "line") {
      return <EmptyState />;
    }

    // Axis label colors themed
    const axisText = theme.colors.text + "90";
    const ruleColor = theme.dark
      ? "rgba(255,255,255,0.08)"
      : "rgba(156,163,175,0.3)";

    switch (chartType) {
      case "pie":
        return (
          <Animated.View entering={FadeInUp.delay(400)}>
            <View
              style={[
                styles.chartCard,
                { backgroundColor: theme.colors.card },
              ]}>
              <Text style={[styles.chartTitle, { color: theme.colors.text }]}>
                Expense Categories
              </Text>
              <PieChart
                data={pieData}
                donut
                showText={false}
                showGradient={false}
                textColor={theme.colors.text}
                textSize={12}
                radius={100}
                innerRadius={40}
                innerCircleColor={theme.colors.card}
                // innerCircleBorderColor={theme.colors.text}
                // backgroundColor={"transparent"}
                centerLabelComponent={() => (
                  <Text
                    style={{ fontWeight: "bold", color: theme.colors.text }}>
                    ~₹
                    {(() => {
                      const num = Number(
                        financialData?.totalExpense?.toFixed(0) || 0
                      );
                      if (num >= 1000000)
                        return `${(num / 1000000).toFixed(2)}M`;
                      if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
                      return `${num}`;
                    })()}
                  </Text>
                )}
              />
            </View>
            <Legend />
          </Animated.View>
        );

      case "bar":
        return (
          <Animated.View entering={FadeInUp.delay(400)}>
            <View
              style={[
                styles.chartCard,
                { backgroundColor: theme.colors.card },
              ]}>
              <Text style={[styles.chartTitle, { color: theme.colors.text }]}>
                Category Comparison
              </Text>
              <BarChart
                data={barData}
                barWidth={28}
                spacing={2}
                barBorderWidth={1}
                barBorderTopLeftRadius={7}
                barBorderTopRightRadius={7}
                barBorderColor={
                  theme.dark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)"
                }
                roundedTop={false}
                showYAxisIndices={false}
                hideRules={false}
                rulesColor={ruleColor}
                yAxisTextStyle={{ color: axisText, fontSize: 11 }}
                xAxisLabelTextStyle={{ color: axisText, fontSize: 11 }}
                width={CHART_WIDTH - 40}
                height={CHART_HEIGHT}
                formatYLabel={(value) => {
                  const num = Number(value);
                  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
                  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
                  return `${num}`;
                }}
                yAxisColor={"transparent"}
                xAxisColor={"transparent"}
              />
            </View>
            <Legend />
          </Animated.View>
        );

      case "line":
        const hasMonthlyData = financialData?.monthlyExpenses?.some(
          (value) => value > 0
        );
        if (!hasMonthlyData) {
          return <EmptyState />;
        }

        return (
          <Animated.View entering={FadeInUp.delay(400)}>
            <View
              style={[
                styles.chartCard,
                { backgroundColor: theme.colors.card },
              ]}>
              <Text style={[styles.chartTitle, { color: theme.colors.text }]}>
                Monthly Spending Trend
              </Text>
              <LineChart
                data={lineData}
                curved={false}
                thickness={3}
                showVerticalLines={false}
                hideDataPoints={false}
                yAxisTextStyle={{ color: axisText, fontSize: 11 }}
                xAxisLabelTextStyle={{ color: axisText, fontSize: 11 }}
                height={CHART_HEIGHT}
                width={CHART_WIDTH - 40}
                color1="#4ECDC4"
                color2="#45B7D1"
                startFillColor="#4ECDC4"
                endFillColor="#45B7D1"
                startOpacity={0.6}
                endOpacity={0.1}
                rulesColor={ruleColor}
                formatYLabel={(value) => {
                  const num = Number(value);
                  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
                  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
                  return `${num}`;
                }}
                yAxisColor={"transparent"}
                xAxisColor={"transparent"}
              />
            </View>
          </Animated.View>
        );
    }
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={{
          paddingBottom: getBottomContentPadding(insets.bottom, 50),
        }}
        showsVerticalScrollIndicator={false}>
        <ChartSelector />
        {renderChart()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Content Area
  scrollContainer: { flex: 1 },

  badgeIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },

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
  helloSmall: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
  },

  // Chart Selector
  chartTabs: {
    flexDirection: "row",
    borderRadius: 16,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 6,
  },

  // Chart Card
  chartCard: {
    overflow: "hidden",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    alignSelf: "flex-start",
  },

  // Enhanced Legend with Progress Bars
  legendCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  legendHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  legendTitle: { fontSize: 18, fontWeight: "600" },
  totalBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  totalAmount: { fontSize: 14, fontWeight: "700" },
  legendList: { gap: 20 },
  legendItem: { gap: 8, flexDirection: "row", alignItems: "center" },
  legendItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flex: 1,
  },
  legendItemLeft: { alignItems: "center" },
  categoryDot: { width: 12, height: 12, borderRadius: 7, marginRight: 8 },
  categoryName: { flex: 1, fontSize: 15, fontWeight: "500" },
  amountContainer: { alignItems: "flex-end" },
  categoryAmount: { fontSize: 15, fontWeight: "700" },
  categoryPercent: { fontSize: 12, fontWeight: "500", marginTop: 7 },

  // Progress Bar
  progressBarContainer: { flex: 1, marginTop: 8 },
  progressBarBackground: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressBarFill: { height: "100%", borderRadius: 3, minWidth: 4 },

  // Summary Stats
  summaryStats: {
    flexDirection: "row",
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    gap: 16,
  },
  statBox: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  statLabel: { fontSize: 12, fontWeight: "500", marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: "700" },

  // Empty State
  emptyState: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 48,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: "600", marginBottom: 8 },
  emptySubtitle: { fontSize: 15, textAlign: "center", lineHeight: 22 },
});
