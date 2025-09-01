// components/HistoryItem.tsx
import React, { useEffect } from "react";
import { View, StyleSheet, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withRepeat,
  Easing,
} from "react-native-reanimated";
import { useTheme, useNavigation } from "@react-navigation/native";
import { Transaction } from "../types";
import { useTransactions } from "@/context/TransactionContext";
import { router } from "expo-router";

interface HistoryItemProps {
  item: Transaction;
  index: number;
}

export const HistoryItem: React.FC<HistoryItemProps> = ({ item }) => {
  const theme = useTheme();

  const iconName = item.type === "income" ? "add-circle" : "remove-circle";
  const iconColor =
    item.type === "income"
      ? (theme.colors as any).tabActive
      : theme.colors.notification;

  const { deleteTransaction } = useTransactions();

  const handleDeleteTransaction = (id: string) => {
    if (deleteTransaction) deleteTransaction(id);
  };

  // subtle rotation animation when not synced
  const rotation = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  useEffect(() => {
    rotation.value = withRepeat(
      withSequence(
        withTiming(120, { duration: 800, easing: Easing.linear }),
        withTiming(360, { duration: 300, easing: Easing.linear })
      ),
      -1,
      false
    );
    return () => {
      rotation.value = 0;
    };
  }, []);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.card,
          borderBottomColor: (theme as any).dark
            ? "rgba(255,255,255,0.08)"
            : "rgba(0,0,0,0.06)",
        },
      ]}>
      <Animated.View
        style={[!item.synced && animatedStyle, { marginRight: 12 }]}>
        <Ionicons name={iconName as any} size={24} color={iconColor} />
      </Animated.View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {item.category}
        </Text>
        {!!item.notes && (
          <Text
            style={[
              styles.description,
              {
                color:
                  (theme.colors as any).onSurfaceVariant ??
                  theme.colors.text + "80",
              },
            ]}>
            {item.notes}
          </Text>
        )}
      </View>

      <View style={styles.right}>
        <View style={styles.amountContainer}>
          <Text
            style={[
              styles.amount,
              {
                color:
                  item.type === "income"
                    ? (theme.colors as any).tabActive
                    : theme.colors.notification,
              },
            ]}>
            ₹{item.amount.toFixed(2)}
          </Text>
          <Text
            style={[
              styles.date,
              {
                color:
                  (theme.colors as any).onSurfaceVariant ??
                  theme.colors.text + "60",
              },
            ]}>
            {new Date(item.date).toLocaleDateString()}
          </Text>
        </View>

        {/* Edit */}
        <TouchableOpacity
          activeOpacity={0.7}
          style={{ marginLeft: 12 }}
          onPress={() =>
            router.navigate(`/add?mode=edit&t=${JSON.stringify(item)}`)
          }>
          <Ionicons
            name="create-outline"
            size={21}
            color={(theme.colors as any).tabActive}
          />
        </TouchableOpacity>

        {/* Delete */}
        <TouchableOpacity
          activeOpacity={0.7}
          style={{ marginLeft: 12 }}
          onPress={() => handleDeleteTransaction(item.id)}>
          <Ionicons
            name="trash"
            size={20}
            color={(theme.colors as any).tabActive}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  icon: { marginRight: 12 },
  content: { flex: 1 },
  title: { fontSize: 16, fontWeight: "600" },
  description: { fontSize: 12, marginTop: 2 },
  right: { flexDirection: "row", alignItems: "center" },
  amountContainer: { alignItems: "flex-end" },
  amount: { fontSize: 16, fontWeight: "700" },
  date: { fontSize: 12, marginTop: 2 },
  syncStatus: { fontSize: 18, marginLeft: 8 },
});
