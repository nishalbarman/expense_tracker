import React, { useMemo, useState, useCallback, useEffect } from "react";
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
import type { Transaction } from "../../types";
import Animated, { FadeInUp } from "react-native-reanimated";
import { HistoryItem } from "@/components/HistoryItem";
import { getBottomContentPadding } from "../_layout";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { toggleTheme } from "@/redux/slices/themeSlice";
import { useFetchTxPageQuery } from "@/redux/api/localTxApi"; // RTK Query over SQLite
import { router } from "expo-router";

type FilterType = "all" | "income" | "expense";

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

export default function TransactionHistoryScreen(): JSX.Element {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  // Auth uid from thin UI slice; fall back to guest profile
  const uid = useAppSelector((s) => s.transactionsUI.uid) ?? "__local__";

  // Client filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<FilterType>("all");

  // Cursor pagination state
  const PAGE_SIZE = 30;
  const [cursor, setCursor] = useState<
    { dateIso: string; id: string } | undefined
  >();
  const [pages, setPages] = useState<any[]>([]);

  // Fetch a page from SQLite
  const { data, isFetching, refetch, isUninitialized } = useFetchTxPageQuery(
    { userId: uid, pageSize: PAGE_SIZE, cursor },
    { skip: !uid }
  );

  // Accumulate pages when cursor advances
  useEffect(() => {
    if (!data?.items) return;
    // If cursor is undefined, we’re refreshing — reset pages
    if (!cursor) setPages(data.items);
    else setPages((prev) => [...prev, ...data.items]);
  }, [data?.items]); // eslint-disable-line react-hooks/exhaustive-deps

  // Derive list before UI filters
  const allItems = pages;

  // Client search/type filters (fast on current page set)
  const q = searchQuery.trim().toLowerCase();
  const filtered = useMemo(() => {
    return allItems.filter((t) => {
      const matchesType = selectedType === "all" || t.type === selectedType;
      if (!q) return matchesType;
      const hay = `${t.category} ${t.notes || ""}`.toLowerCase();
      return matchesType && hay.includes(q);
    });
  }, [allItems, selectedType, q]);

  const renderItem = useCallback(
    ({ item, index }: { item: any; index: number }) => (
      <Animated.View
        style={{
          borderRadius: 5,
          // paddingHorizontal: 10,
          // backgroundColor: theme.colors.card,
          marginHorizontal: 16,
          // ...Platform.select({
          //   ios: {
          //     shadowColor: "#000",
          //     shadowOffset: { width: 0, height: 2 },
          //     shadowOpacity: theme.dark ? 0.25 : 0.1,
          //     shadowRadius: theme.dark ? 10 : 8,
          //   },
          //   android: { elevation: 2 },
          // }),
        }}
        entering={FadeInUp.delay(Math.min(index, 12) * 40).duration(280)}>
        {/* HistoryItem expects fields: id, amount, category, dateIso, notes, type, synced */}
        <HistoryItem index={index} item={item} />
      </Animated.View>
    ),
    [theme.colors.card, theme.dark]
  );

  const keyExtractor = useCallback((item: any) => item.id, []);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Reset cursor to fetch newest page, and reset accumulated pages in effect
    setCursor(undefined);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const loadMore = useCallback(() => {
    if (isFetching) return;
    const next = data?.nextCursor;
    if (next) setCursor(next);
  }, [isFetching, data?.nextCursor]);

  const GRADIENT = useMemo(() => {
    const start = theme.colors.primary;
    const end = (theme.colors as any).secondary ?? theme.colors.primary;
    return [start, end];
  }, [theme.colors]);

  const dispatch = useAppDispatch();
  const { themePref } = useAppSelector((state) => state.theme);
  const handleToggleTheme = () => dispatch(toggleTheme());

  const ListHeader = (
    <>
      <LinearGradient
        colors={GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + 12 }]}>
        <Animated.View>
          <View style={[styles.heroHeader, { backgroundColor: "transparent" }]}>
            <View>
              <Text style={[styles.helloSmall, { color: "white" }]}>
                History
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                router.push("/historytrash");
              }}
              style={styles.badgeIcon}
              activeOpacity={0.7}>
              <Ionicons
                name={
                  theme.colors.primary === "#429690"
                    ? "trash-outline"
                    : "trash-outline"
                }
                size={18}
                color="#FFFFFF"
              />
            </TouchableOpacity>
            {/* <TouchableOpacity
              onPress={handleToggleTheme}
              style={styles.badgeIcon}
              activeOpacity={0.7}>
              {themePref === "dark" ? (
                <Ionicons name="partly-sunny" size={18} color="#FFFFFF" />
              ) : (
                <Ionicons name="cloudy-night" size={18} color="#FFFFFF" />
              )}
            </TouchableOpacity> */}
          </View>
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

      <View
        style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 }}>
        <Animated.View>
          <View
            style={[styles.chartTabs, { backgroundColor: theme.colors.card }]}>
            {(["all", "income", "expense"] as FilterType[]).map((type) => {
              const isActive = selectedType === type;
              return (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.tab,
                    isActive && { backgroundColor: theme.colors.primary },
                  ]}
                  onPress={() => setSelectedType(type)}
                  activeOpacity={0.7}>
                  <Text
                    style={[
                      styles.tabText,
                      {
                        color: isActive
                          ? (theme.colors as any).onPrimary ?? theme.colors.card
                          : theme.colors.text,
                      },
                    ]}>
                    {type.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </>
  );

  const ListEmpty = () => (
    <CustomCard style={styles.emptyCard}>
      <View style={styles.emptyCardContent}>
        <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
          No transactions found
        </Text>
        <Text
          style={[
            styles.emptyDescription,
            {
              color:
                (theme.colors as any).onSurfaceVariant ?? theme.colors.text,
            },
          ]}>
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
          { paddingBottom: getBottomContentPadding(insets.bottom, 57) },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={12}
        windowSize={10}
        removeClippedSubviews
        onEndReachedThreshold={0.5}
        onEndReached={loadMore}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || (isFetching && !cursor && !pages.length)}
            onRefresh={onRefresh}
            colors={[theme.colors.tabActive]}
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
  helloSmall: { fontSize: 13 },
  listContent: { paddingBottom: 24 },
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
      android: { elevation: 2 },
    }),
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 4 },
  searchBar: { height: 50 },
  chartTabs: {
    flexDirection: "row",
    borderRadius: 16,
    padding: 4,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
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
  tabText: { fontSize: 13, fontWeight: "600" },
  card: {
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
    }),
  },
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
  chipStyle: { marginRight: 8 },
  chipText: { fontSize: 12 },
  emptyCard: { marginHorizontal: 16, marginTop: 12 },
  emptyCardContent: { padding: 16, alignItems: "center" },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 6,
  },
  emptyDescription: { fontSize: 14, textAlign: "center", opacity: 0.7 },
  separator: { height: 1 },
});
