import React, { useMemo, useState, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  SafeAreaView,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Text,
  TextInput,
  Platform,
} from "react-native";
import { useTransactions } from "../../context/TransactionContext";
import type { Transaction } from "../../types";
import Animated, { FadeInUp } from "react-native-reanimated";
import { HistoryItem } from "@/components/HistoryItem";
import { getBottomContentPadding } from "../_layout";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";

type FilterType = "all" | "income" | "expense";

// Custom SearchBar Component
const CustomSearchBar = ({
  placeholder,
  value,
  onChangeText,
  style,
  ...props
}: any) => {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View
      style={[
        styles.searchContainer,
        {
          backgroundColor: theme.colors.card,
          borderColor: isFocused ? theme.colors.primary : theme.colors.border,
        },
        style,
      ]}>
      <Ionicons
        name="search"
        size={20}
        color={theme.colors.text}
        style={styles.searchIcon}
      />
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={theme.colors.text + "70"}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={[styles.searchInput, { color: theme.colors.text }]}
        {...props}
      />
    </View>
  );
};

// Custom Card Component
const CustomCard = ({ children, style, ...props }: any) => {
  const theme = useTheme();
  return (
    <View
      style={[styles.card, { backgroundColor: theme.colors.card }, style]}
      {...props}>
      {children}
    </View>
  );
};

// Custom Chip Component (if you want to use the commented out FlatList approach)
const CustomChip = ({ children, selected, onPress, icon, style }: any) => {
  const theme = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.chip,
        {
          backgroundColor: selected ? theme.colors.primary : "transparent",
          borderColor: selected ? theme.colors.primary : theme.colors.border,
        },
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.7}>
      {icon && (
        <Ionicons
          name={icon}
          size={16}
          color={selected ? theme.colors.card : theme.colors.text}
          style={{ marginRight: 6 }}
        />
      )}
      <Text
        style={[
          styles.chipText,
          {
            color: selected ? theme.colors.card : theme.colors.text,
            fontWeight: selected ? "700" : "600",
          },
        ]}>
        {children}
      </Text>
    </TouchableOpacity>
  );
};

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
          borderRadius: 5,
          paddingHorizontal: 10,
          backgroundColor: "#FFFFFF",
          marginHorizontal: 16,

          ...Platform.select({
            ios: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
            },
            android: {
              elevation: 2,
            },
          }),
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
    return [
      theme.colors.primary,
      theme.colors.secondary || theme.colors.primary,
    ];
  }, [theme.colors]);

  // Header that scrolls WITH the list
  const ListHeader = (
    <>
      <LinearGradient
        colors={GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: 21 }]}>
        <Animated.View>
          <CustomSearchBar
            placeholder="Search category or notes"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchBar}
            autoCorrect
            autoCapitalize="none"
          />
        </Animated.View>
      </LinearGradient>

      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        {/* Horizontal tabs */}
        <Animated.View>
          <View style={[styles.chartTabs, { marginBottom: 5 }]}>
            {(["all", "income", "expense"] as FilterType[]).map(
              (type, index) => {
                const isActive = selectedType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.tab,
                      isActive && {
                        backgroundColor: theme.colors.primary,
                      },
                    ]}
                    onPress={() => setSelectedType(type)}
                    activeOpacity={0.7}>
                    <Text
                      style={[
                        styles.tabText,
                        {
                          color: isActive ? "white" : theme.colors.text,
                        },
                      ]}>
                      {type.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              }
            )}
          </View>
        </Animated.View>

        {/* Alternative: Using Custom Chips (uncomment if preferred) */}
        {/* <FlatList
          data={[
            { key: "all", label: "All", icon: "infinite" },
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
              <CustomChip
                selected={active}
                onPress={() => setSelectedType(item.key as FilterType)}
                icon={item.icon}
                style={styles.chipStyle}
              >
                {item.label}
              </CustomChip>
            );
          }}
        /> */}
      </View>
    </>
  );

  const ListEmpty = () => (
    <CustomCard style={styles.emptyCard}>
      <View style={styles.emptyCardContent}>
        <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
          No transactions found
        </Text>
        <Text style={[styles.emptyDescription, { color: theme.colors.text }]}>
          Try changing the filter or clearing the search.
        </Text>
      </View>
    </CustomCard>
  );

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <FlatList
        style={[styles.flatList, { backgroundColor: theme.colors.background }]}
        data={filtered}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingBottom: getBottomContentPadding(insets.bottom, 57),
          },
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
            progressBackgroundColor={theme.colors.card}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flatList: { flex: 1 },

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

  // Search Bar Styles
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 5,
    borderBottomRightRadius: 17,
    borderBottomLeftRadius: 17,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 4,
  },
  searchBar: {
    // Additional search bar specific styles if needed
    height: 50,
  },

  // Tab Styles
  chartTabs: {
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 4,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
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
  tabText: {
    fontSize: 13,
    fontWeight: "600",
  },

  // Card Styles
  card: {
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },

  // Chip Styles (for alternative implementation)
  chipsRow: {
    paddingTop: 13,
    paddingBottom: 8,
    gap: 8,
    alignItems: "center",
    paddingRight: 6,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    minHeight: 36,
    borderWidth: 1,
  },
  chipStyle: {
    marginRight: 8,
  },
  chipText: {
    fontSize: 12,
  },

  // Empty State Styles
  emptyCard: {
    marginHorizontal: 16,
    marginTop: 12,
  },
  emptyCardContent: {
    padding: 16,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 6,
  },
  emptyDescription: {
    fontSize: 14,
    textAlign: "center",
    opacity: 0.7,
  },

  // Other Styles
  separator: { height: 1 },
});
