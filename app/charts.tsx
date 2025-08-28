import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { PieChart, BarChart, LineChart } from "react-native-chart-kit";
import Animated, { FadeInUp, FadeIn } from "react-native-reanimated";
import { useTransactions } from "../context/TransactionContext";
import { getBottomContentPadding } from "./_layout";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "react-native-paper";

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
  const { transactions } = useTransactions();
  const insets = useSafeAreaInsets();
  const [chartType, setChartType] = useState<ChartType>("pie");

  // Calculate financial data
  const financialData = useMemo(() => {
    const byCat: Record<string, number> = {};
    let totalExpenses = 0;
    let totalIncome = 0;

    for (const t of transactions) {
      if (t.type === "expense") {
        byCat[t.category] = (byCat[t.category] || 0) + t.amount;
        totalExpenses += t.amount;
      } else if (t.type === "income") {
        totalIncome += t.amount;
      }
    }

    return {
      expensesByCategory: byCat,
      totalExpenses,
      totalIncome,
      totalBalance: totalIncome - totalExpenses,
    };
  }, [transactions]);

  // Monthly expense data
  const monthsData = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const monthly = Array(12).fill(0);

    for (const t of transactions) {
      if (t.type !== "expense") continue;
      const d = new Date(t.date);
      if (d.getFullYear() !== year) continue;
      monthly[d.getMonth()] += t.amount;
    }
    return monthly;
  }, [transactions]);

  // Bright, vibrant color palette that complements the teal theme
  const palette = [
    "#FF6B6B", // Coral Red
    "#4ECDC4", // Bright Teal
    "#45B7D1", // Sky Blue
    "#96CEB4", // Mint Green
    "#FECA57", // Golden Yellow
    "#FF9FF3", // Pink
    "#54A0FF", // Blue
    "#5F27CD", // Purple
    "#00D2D3", // Cyan
    "#FF9F43", // Orange
    "#10AC84", // Emerald
    "#EE5A24", // Red Orange
    "#0078FF", // Bright Blue
    "#833471", // Magenta
    "#006BA6", // Deep Blue
  ];

  // Chart configurations
  const pieData = useMemo(() => {
    return Object.entries(financialData.expensesByCategory).map(
      ([category, amount], idx) => ({
        name: category,
        population: amount,
        color: palette[idx % palette.length],
        legendFontColor: "#1F2937",
        legendFontSize: 12,
      })
    );
  }, [financialData.expensesByCategory]);

  const barChartData = useMemo(() => {
    const labels = Object.keys(financialData.expensesByCategory).map((l) =>
      l.length > 8 ? l.slice(0, 7) + "…" : l
    );
    const data = Object.values(financialData.expensesByCategory);
    return { labels, datasets: [{ data }] };
  }, [financialData.expensesByCategory]);

  const lineChartData = useMemo(
    () => ({
      labels: monthKeys,
      datasets: [{ data: monthsData }],
    }),
    [monthsData]
  );

  const chartConfig = {
    backgroundColor: "#ffffff",
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(78, 205, 196, ${opacity})`, // Using teal theme color
    labelColor: (opacity = 1) => `rgba(31, 41, 55, ${opacity})`,
    barPercentage: 0.7,
    propsForLabels: { fontSize: 11, fontFamily: "System" },
    propsForBackgroundLines: {
      strokeDasharray: "3 6",
      stroke: "rgba(156, 163, 175, 0.3)",
    },
    propsForDots: {
      r: "5",
      strokeWidth: "2",
      stroke: "#4ECDC4",
      fill: "#4ECDC4",
    },
    fillShadowGradientFrom: "#4ECDC4",
    fillShadowGradientTo: "#45B7D1",
    fillShadowGradientFromOpacity: 0.7,
    fillShadowGradientToOpacity: 0.2,
  };

  const hasExpenseData = financialData.totalExpenses > 0;

  // Progress Bar Component
  const ProgressBar = ({
    percentage,
    color,
  }: {
    percentage: number;
    color: string;
  }) => (
    <View style={styles.progressBarContainer}>
      <View style={styles.progressBarBackground}>
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

  const theme = useTheme();

  const GRADIENT = useMemo(() => {
    return [theme.colors.primary, theme.colors.secondary];
  }, [theme.colors]);

  // Chart Type Selector
  const ChartSelector = () => (
    <>
      <LinearGradient
        colors={GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + 12 }]}>
        <View style={styles.heroHeader}>
          <View>
            <Text style={styles.helloSmall}>Chart Option</Text>
          </View>
        </View>

        <Animated.View
        // entering={FadeInUp.delay(120).duration(600)}
        //  style={styles.slabShadow}
        >
          <View style={styles.chartTabs}>
            {(["pie", "bar", "line"] as ChartType[]).map((type, index) => {
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
                      backgroundColor: theme.colors.primary, // Using theme teal color
                    },
                  ]}
                  onPress={() => setChartType(type)}>
                  <Ionicons
                    name={icon as any}
                    size={18}
                    color={isActive ? "#ffffff" : "#6B7280"}
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
      <Animated.View entering={FadeInUp.delay(500)} style={styles.legendCard}>
        <View style={styles.legendHeader}>
          <Text style={styles.legendTitle}>Category Breakdown</Text>
          <View style={styles.totalBadge}>
            <Text style={styles.totalAmount}>
              ₹{financialData.totalExpenses.toFixed(2)}
            </Text>
          </View>
        </View>

        <View style={styles.legendList}>
          {Object.entries(financialData.expensesByCategory)
            .sort(([, a], [, b]) => b - a) // Sort by amount descending
            .slice(0, 8) // Show top 8 categories
            .map(([category, amount], idx) => {
              const percentage = (amount / financialData.totalExpenses) * 100;
              const color = palette[idx % palette.length];

              return (
                <View key={category} style={styles.legendItem}>
                  <View style={styles.legendItemHeader}>
                    <View style={styles.legendItemLeft}>
                      <View
                        style={[styles.categoryDot, { backgroundColor: color }]}
                      />
                      <Text style={styles.categoryName}>{category}</Text>
                    </View>
                    <View style={styles.amountContainer}>
                      <Text style={styles.categoryAmount}>
                        ₹{amount.toFixed(0)}
                      </Text>
                      <Text style={styles.categoryPercent}>
                        {percentage.toFixed(1)}%
                      </Text>
                    </View>
                  </View>
                  <ProgressBar percentage={percentage} color={color} />
                </View>
              );
            })}
        </View>

        {/* Summary Stats */}
        <View style={styles.summaryStats}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Categories</Text>
            <Text style={styles.statValue}>
              {Object.keys(financialData.expensesByCategory).length}
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Avg per Category</Text>
            <Text style={styles.statValue}>
              ₹
              {(
                financialData.totalExpenses /
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
    <Animated.View entering={FadeInUp.delay(400)} style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name="analytics-outline" size={48} color="#9CA3AF" />
      </View>
      <Text style={styles.emptyTitle}>No Data Available</Text>
      <Text style={styles.emptySubtitle}>
        Start adding transactions to see your expense analytics
      </Text>
    </Animated.View>
  );

  // Chart Renderer
  const renderChart = () => {
    if (!hasExpenseData && chartType !== "line") {
      return <EmptyState />;
    }

    const commonProps = {
      width: CHART_WIDTH,
      height: CHART_HEIGHT,
      chartConfig,
    };

    switch (chartType) {
      case "pie":
        return (
          <Animated.View entering={FadeInUp.delay(400)}>
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Expense Categories</Text>
              <PieChart
                data={pieData}
                {...commonProps}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="5"
                hasLegend={true}
                center={[10, 0]}
                absolute
              />
            </View>
            <Legend />
          </Animated.View>
        );

      case "bar":
        return (
          <Animated.View entering={FadeInUp.delay(400)}>
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Category Comparison</Text>
              <BarChart
                data={barChartData}
                {...commonProps}
                yAxisLabel="₹"
                fromZero
                showBarTops={false}
                verticalLabelRotation={
                  barChartData.labels.some((l) => l.length > 6) ? 25 : 0
                }
                style={styles.chart}
              />
            </View>
            <Legend />
          </Animated.View>
        );

      case "line":
        const hasMonthlyData = monthsData.some((value) => value > 0);
        if (!hasMonthlyData) {
          return <EmptyState />;
        }

        return (
          <Animated.View entering={FadeInUp.delay(400)}>
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Monthly Spending Trend</Text>
              <LineChart
                data={lineChartData}
                {...commonProps}
                yAxisLabel="₹"
                fromZero
                bezier
                segments={4}
                style={styles.chart}
                verticalLabelRotation={90}
                formatYLabel={(value) => {
                  const num = Number(value);
                  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
                  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
                  return `${num}`;
                }}
              />
            </View>
          </Animated.View>
        );
    }
  };

  return (
    <View style={styles.container}>
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
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },

  // Content Area
  scrollContainer: {
    flex: 1,
    // marginTop: 16,
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

  // Chart Selector
  selectorCard: {
    backgroundColor: "#ffffff",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 20,
  },
  chartTabs: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
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
  activeTab: {
    backgroundColor: "#4ECDC4", // Using theme teal color
  },

  // Chart Card
  chartCard: {
    backgroundColor: "#ffffff",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
    alignItems: "center",
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 16,
    alignSelf: "flex-start",
  },
  chart: {
    borderRadius: 16,
  },

  // Enhanced Legend with Progress Bars
  legendCard: {
    backgroundColor: "#ffffff",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  legendHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  legendTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  totalBadge: {
    backgroundColor: "#E6FFFA", // Light teal background
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  totalAmount: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4ECDC4", // Teal color
  },
  legendList: {
    gap: 20, // Increased gap for progress bars
  },
  legendItem: {
    gap: 8, // Space between header and progress bar
  },
  legendItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  legendItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  categoryDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 14,
  },
  categoryName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: "#374151",
  },
  amountContainer: {
    alignItems: "flex-end",
  },
  categoryAmount: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  categoryPercent: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
    marginTop: 2,
  },

  // Progress Bar Styles
  progressBarContainer: {
    marginLeft: 28, // Align with category name
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
    minWidth: 4, // Minimum width for very small percentages
  },

  // Summary Stats
  summaryStats: {
    flexDirection: "row",
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    gap: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#4ECDC4",
  },

  // Empty State
  emptyState: {
    backgroundColor: "#ffffff",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 48,
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
  },
});
