import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
} from "react-native";
import { PieChart, BarChart, LineChart } from "react-native-gifted-charts";
import Animated, { FadeInUp, FadeIn } from "react-native-reanimated";
import { useTransactions } from "../../context/TransactionContext";
import { getBottomContentPadding } from "../_layout";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@react-navigation/native";

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
  const theme = useTheme();
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
  const palette = useMemo(() => {
    return [
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
      "#A3CB38", // Lime Green
      "#F368E0", // Hot Pink
      "#222F3E", // Dark Navy
      "#C4E538", // Bright Lime
      "#1DD1A1", // Aquamarine
    ];
  }, []);

  // Build a map of category -> color
  const categoryColors = useMemo(() => {
    const entries = Object.keys(financialData.expensesByCategory);
    const map: Record<string, string> = {};
    entries.forEach((cat, idx) => {
      map[cat] = palette[idx % palette.length];
    });
    return map;
  }, [financialData.expensesByCategory]);

  // Get all categories in a consistent order (alphabetical or by amount)
  const allCategoriesOrdered = useMemo(() => {
    return (
      Object.entries(financialData.expensesByCategory)
        // .sort(([, a], [, b]) => b - a) // Sort by amount (same as legend)
        .map(([category, amount]) => {
          return { category, amount };
        })
    );
  }, [financialData.expensesByCategory]);

  // Pie data
  // Pie data
  const pieData = useMemo(() => {
    return allCategoriesOrdered.map(({ category, amount }, idx) => ({
      value: amount,
      text: category,
      color: categoryColors[category],
      label: category,
    }));
  }, [allCategoriesOrdered]);

  console.log(pieData);

  // Bar data
  const barData = useMemo(() => {
    return allCategoriesOrdered.map(({ category, amount }, idx) => ({
      value: amount,
      label: category,
      frontColor: categoryColors[category],
    }));
  }, [allCategoriesOrdered]);

  // Line data
  const lineData = useMemo(() => {
    return monthsData.map((val, idx) => ({
      value: val,
      label: monthKeys[idx],
    }));
  }, [monthsData]);

  const chartConfig = {
    backgroundColor: "#ffffff",
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(78, 205, 196, ${opacity})`,
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

  const GRADIENT = useMemo(() => {
    return [
      theme.colors.primary,
      theme.colors.secondary || theme.colors.primary,
    ];
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
            <Text style={styles.helloSmall}>Chart Options</Text>
          </View>
        </View>

        <Animated.View>
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
                      backgroundColor: theme.colors.primary,
                    },
                  ]}
                  onPress={() => setChartType(type)}
                  activeOpacity={0.7}>
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
          <Text style={[styles.legendTitle, { color: theme.colors.text }]}>
            Category Breakdown
          </Text>
          <View
            style={[
              styles.totalBadge,
              { backgroundColor: theme.colors.primary + "20" },
            ]}>
            <Text style={[styles.totalAmount, { color: theme.colors.primary }]}>
              ₹{financialData.totalExpenses.toFixed(2)}
            </Text>
          </View>
        </View>

        <View style={styles.legendList}>
          {allCategoriesOrdered
            .sort((a, b) => b.amount - a.amount)
            // .slice(0, 8)
            .map(({ category, amount }, idx) => {
              const percentage = (amount / financialData.totalExpenses) * 100;
              const color = categoryColors[category];

              return (
                <View key={category} style={styles.legendItem}>
                  <View
                    style={[styles.categoryDot, { backgroundColor: color }]}
                  />
                  {/* Block Section */}
                  <View style={{ flex: 1 }}>
                    {/* Category */}
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
                          ₹{amount.toFixed(0)}
                        </Text>
                      </View>
                    </View>

                    {/* Progress Bar with Percentage */}
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}>
                      <ProgressBar percentage={percentage} color={color} />
                      <Text
                        style={[
                          styles.categoryPercent,
                          { color: theme.colors.text + "80", marginLeft: 8 },
                        ]}>
                        {percentage.toFixed(1)}%
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
        </View>

        {/* Summary Stats */}
        <View style={styles.summaryStats}>
          <View
            style={[
              styles.statBox,
              { backgroundColor: theme.colors.background },
            ]}>
            <Text
              style={[styles.statLabel, { color: theme.colors.text + "80" }]}>
              Categories
            </Text>
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>
              {Object.keys(financialData.expensesByCategory).length}
            </Text>
          </View>
          <View
            style={[
              styles.statBox,
              { backgroundColor: theme.colors.background },
            ]}>
            <Text
              style={[styles.statLabel, { color: theme.colors.text + "80" }]}>
              Avg per Category
            </Text>
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>
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
    <Animated.View
      entering={FadeInUp.delay(400)}
      style={[styles.emptyState, { backgroundColor: theme.colors.card }]}>
      <View
        style={[
          styles.emptyIcon,
          { backgroundColor: theme.colors.background },
        ]}>
        <Ionicons
          name="analytics-outline"
          size={48}
          color={theme.colors.text + "60"}
        />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
        No Data Available
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.colors.text + "80" }]}>
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
                centerLabelComponent={() => (
                  <Text
                    style={{ fontWeight: "bold", color: theme.colors.text }}>
                    ~₹
                    {(() => {
                      const num = Number(
                        financialData.totalExpenses.toFixed(0)
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
                barBorderColor={"black"}
                roundedTop={false}
                showYAxisIndices={false}
                hideRules={true}
                yAxisTextStyle={{ color: theme.colors.text + 90, fontSize: 11 }}
                xAxisLabelTextStyle={{
                  color: theme.colors.text + 90,
                  fontSize: 11,
                }}
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
        const hasMonthlyData = monthsData.some((value) => value > 0);
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
                // isAnimated
                thickness={3}
                showVerticalLines={false}
                hideDataPoints={false}
                yAxisTextStyle={{ color: theme.colors.text + 90, fontSize: 11 }}
                xAxisLabelTextStyle={{
                  color: theme.colors.text + 90,
                  fontSize: 11,
                }}
                height={CHART_HEIGHT}
                width={CHART_WIDTH - 40}
                color1="#4ECDC4"
                color2="#45B7D1"
                startFillColor="#4ECDC4"
                endFillColor="#45B7D1"
                startOpacity={0.6}
                endOpacity={0.1}
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
  container: {
    flex: 1,
  },

  // Content Area
  scrollContainer: {
    flex: 1,
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
    borderBottomColor: "#E5E7EB",
  },
  legendTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  totalBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  totalAmount: {
    fontSize: 14,
    fontWeight: "700",
  },
  legendList: {
    gap: 20,
  },
  legendItem: {
    gap: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  legendItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flex: 1,
  },
  legendItemLeft: {
    // flexDirection: "row",
    alignItems: "center",
    // flex: 1,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 7,
    marginRight: 8,
  },
  categoryName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
  amountContainer: {
    alignItems: "flex-end",
  },
  categoryAmount: {
    fontSize: 15,
    fontWeight: "700",
  },
  categoryPercent: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 7,
  },

  // Progress Bar Styles
  progressBarContainer: {
    flex: 1,
    marginTop: 8,
    // marginLeft: 28,
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
    minWidth: 4,
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
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
  },

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
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
});
