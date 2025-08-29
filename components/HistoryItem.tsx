import React from "react";
import { View, StyleSheet, Text, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Transaction } from "../types";
import { useTheme } from "@react-navigation/native";

interface HistoryItemProps {
  item: Transaction;
  index: number;
}

export const HistoryItem: React.FC<HistoryItemProps> = ({ item }) => {
  const theme = useTheme();

  const iconName = item.type === "income" ? "add-circle" : "remove-circle";
  const iconColor =
    item.type === "income" ? theme.colors.primary : theme.colors.notification;

  return (
    <View style={styles.container}>
      <Ionicons
        name={iconName as any}
        size={24}
        color={iconColor}
        style={styles.icon}
      />
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {item.category}
        </Text>
        {!!item.notes && (
          <Text
            style={[styles.description, { color: theme.colors.text + "80" }]}>
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
                    ? theme.colors.primary
                    : theme.colors.notification,
              },
            ]}>
            ₹{item.amount.toFixed(2)}
          </Text>
          <Text style={[styles.date, { color: theme.colors.text + "60" }]}>
            {new Date(item.date).toLocaleDateString()}
          </Text>
        </View>
        <Text style={styles.syncStatus}>{item.synced ? "✅" : "🔄"}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    // borderBlockColor: "#000000",
    backgroundColor: "#FFFFFF",
  },
  icon: {
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
  },
  description: {
    fontSize: 12,
    marginTop: 2,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
  },
  amountContainer: {
    alignItems: "flex-end",
  },
  amount: {
    fontSize: 16,
    fontWeight: "700",
  },
  date: {
    fontSize: 12,
    marginTop: 2,
  },
  syncStatus: {
    fontSize: 18,
    marginLeft: 8,
  },
});
