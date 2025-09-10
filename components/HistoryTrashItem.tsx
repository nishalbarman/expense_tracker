// components/HistoryItem.tsx
import React from "react";
import { View, StyleSheet, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { Transaction } from "../types";
import { router } from "expo-router";
import {
  useDeleteTransactionMutation,
  useRestoreDeletedTxMutation,
} from "@/redux/api/localTxApi";
import { useAppSelector } from "@/redux/hooks";

interface HistoryItemProps {
  item: Transaction;
}

export const HistoryTrashItem: React.FC<HistoryItemProps> = ({ item }) => {
  const theme = useTheme();
  const [deleteTransaction] = useDeleteTransactionMutation();
  const [restoreDeletedTransaction] = useRestoreDeletedTxMutation();
  const uid = useAppSelector((s) => s.transactionsUI.uid) ?? "__local__";

  const handleDeleteTransaction = (id: string) => {
    deleteTransaction({ id, userId: uid });
  };

  const handleRestoreDeletedTx = () => {
    restoreDeletedTransaction({ id: item.id });
  };

  const iconName = item.type === "income" ? "add-circle" : "remove-circle";
  const iconColor =
    item.type === "income"
      ? (theme.colors as any).tabActive
      : theme.colors.notification;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.card,
          shadowColor: theme.colors.text,
          borderColor: (theme as any).dark
            ? "rgba(255,255,255,0.1)"
            : "rgba(0,0,0,0.08)",
        },
      ]}>
      <View style={styles.leftIcon}>
        <Ionicons name={iconName as any} size={25} color={iconColor} />
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {item.category}
        </Text>
        {!!item.notes && (
          <Text
            style={[
              styles.notes,
              {
                color:
                  (theme.colors as any).onSurfaceVariant ??
                  theme.colors.text + "80",
              },
            ]}>
            {item.notes}
          </Text>
        )}
        <Text
          style={[
            styles.date,
            {
              color:
                (theme.colors as any).onSurfaceVariant ??
                theme.colors.text + "60",
            },
          ]}>
          {new Date(item.dateIso).toLocaleDateString()}
        </Text>
      </View>

      <View style={styles.actions}>
        <View>
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
        </View>

        <View
          style={{
            flexDirection: "column",
            gap: 4,
          }}>
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.actionBtn}
            onPress={handleRestoreDeletedTx}>
            <Ionicons
              name="refresh-outline"
              size={19}
              color={(theme.colors as any).tabActive}
            />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.actionBtn}
            onPress={() => handleDeleteTransaction(item.id)}>
            <Ionicons
              name="trash"
              size={19}
              color={(theme.colors as any).tabActive}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 5,
    elevation: 3,
  },
  leftIcon: { marginRight: 16 },
  content: { flex: 1 },
  title: { fontSize: 16, fontWeight: "700", marginBottom: 2 },
  notes: { fontSize: 13, marginBottom: 4 },
  date: { fontSize: 11 },
  actions: { flexDirection: "row", alignItems: "center" },
  amount: { fontSize: 16, fontWeight: "700", marginRight: 12 },
  actionBtn: {
    marginLeft: 12,
    padding: 6,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
});
