import React, { useMemo, useState, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  SafeAreaView,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { Searchbar, Chip, useTheme, Text, Card } from "react-native-paper";
import { useTransactions } from "../context/TransactionContext";
import type { Transaction } from "../types";
import Animated, { FadeInUp } from "react-native-reanimated";
import { HistoryItem } from "@/components/HistoryItem";
import { getBottomContentPadding } from "./_layout";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

type FilterType = "all" | "income" | "expense";

export default function TransactionHistoryScreen(): JSX.Element {
  const { transactions } = useTransactions();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<FilterType>("all");
  const [refreshing, setRefreshing] = useState(false);

  // Sort once (desc by date)
  const sorted = useMemo(
    () =>
      [...transactions].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    [transactions]
  );

  // Filter by chips and search
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sorted.filter((t) => {
      const matchesType = selectedType === "all" || t.type === selectedType;
      if (!q) return matchesType;
      const hay = `${t.category} ${t.notes || ""}`.toLowerCase();
      return matchesType && hay.includes(q);
    });
  }, [sorted, searchQuery, selectedType]);

  const renderItem = useCallback(
    ({ item, index }: { item: Transaction; index: number }) => (
      <Animated.View
        style={{
          paddingHorizontal: 10,
        }}
        entering={FadeInUp.delay(Math.min(index, 12) * 40).duration(280)}>
        <HistoryItem index={index} item={item} />
      </Animated.View>
    ),
    []
  );

  const keyExtractor = useCallback((item: Transaction) => item.id, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // If server sync exists, trigger it here; otherwise just debounce UX refresh.
    await new Promise((r) => setTimeout(r, 600));
    setRefreshing(false);
  }, []);

  const GRADIENT = useMemo(() => {
    return [theme.colors.primary, theme.colors.secondary];
  }, [theme.colors]);

  // Header that scrolls WITH the list
  const ListHeader = (
    <>
      <LinearGradient
        colors={GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + 12 }]}>
        {/* <View style={styles.heroHeader}>
          <View>
            <Text style={styles.helloSmall}>Chart Option</Text>
          </View>
        </View> */}

        <Animated.View
        // entering={FadeInUp.delay(120).duration(600)}
        //  style={styles.slabShadow}
        >
          <Searchbar
            placeholder="Search category or notes"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[
              styles.searchBar,
              { backgroundColor: theme.colors.surface },
            ]}
            inputStyle={{ fontSize: 15 }}
            elevation={2}
            autoCorrect
            autoCapitalize="none"
          />
        </Animated.View>
      </LinearGradient>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        {/* Horizontal chips (scrolls with the list) */}

        <Animated.View
        // entering={FadeInUp.delay(120).duration(600)}
        //  style={styles.slabShadow}
        >
          <View style={[styles.chartTabs, { marginBottom: 5 }]}>
            {(["all", "income", "expense"] as FilterType[]).map(
              (type, index) => {
                const isActive = selectedType === type;
                const icon =
                  type === "all"
                    ? "pie-chart"
                    : type === "income"
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
                    onPress={() => setSelectedType(type)}>
                    {/* <Ionicons
                      name={icon as any}
                      size={18}
                      color={isActive ? "#ffffff" : "#6B7280"}
                    /> */}
                    <Text
                      style={{
                        fontSize: 13,
                        color: isActive ? "white" : "black",
                      }}>
                      {type.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              }
            )}
          </View>
        </Animated.View>

        {/* <FlatList
          data={[
            { key: "all", label: "All", icon: "infinity" },
            { key: "income", label: "Income", icon: "arrow-up" },
            { key: "expense", label: "Expense", icon: "arrow-down" },
          ]}
          keyExtractor={(i) => i.key}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
          renderItem={({ item }) => {
            const active = selectedType === (item.key as FilterType);
            return (
              <Chip
                mode="outlined"
                selected={active}
                onPress={() => setSelectedType(item.key as FilterType)}
                selectedColor={theme.colors.primary}
                elevated={active}
                style={[styles.chip, active && styles.chipSelected]}
                textStyle={[styles.chipText, active && styles.chipTextSelected]}
                icon={item.icon as any}>
                {item.label}
              </Chip>
            );
          }}
        /> */}
      </View>
    </>
  );

  const ListEmpty = () => (
    <Card mode="elevated" style={[styles.emptyCard]}>
      <Card.Content>
        <Text
          variant="titleMedium"
          style={{ textAlign: "center", marginBottom: 6 }}>
          No transactions found
        </Text>
        <Text
          variant="bodyMedium"
          style={{ textAlign: "center", opacity: 0.7 }}>
          Try changing the filter or clearing the search.
        </Text>
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <FlatList
        style={{ flex: 1, backgroundColor: "white" }}
        data={filtered}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: getBottomContentPadding(insets.bottom) },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={12}
        windowSize={10}
        removeClippedSubviews
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            progressBackgroundColor={theme.colors.surface}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

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

  listContent: { paddingBottom: 24 },
  searchBar: {
    borderRadius: 5,
    borderBottomRightRadius: 17,
    borderBottomLeftRadius: 17,
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

  chipsRow: {
    paddingTop: 13,
    paddingBottom: 8,
    gap: 8,
    alignItems: "center",
    paddingRight: 6,
  },
  chip: { borderRadius: 999, minHeight: 36 },
  chipSelected: { backgroundColor: "#efe9f5", borderColor: "transparent" },
  chipText: { fontWeight: "600" },
  chipTextSelected: { fontWeight: "700" },
  separator: { height: 0 },
  emptyCard: { marginHorizontal: 16, marginTop: 12, borderRadius: 12 },
});
