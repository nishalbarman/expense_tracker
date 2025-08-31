import React from "react";
import { View, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import type { Transaction } from "../types";

interface TransactionItemProps {
  transaction: Transaction;
}

export const TransactionItem = ({ transaction }: TransactionItemProps) => {
  const theme = useTheme();

  const iconColor =
    transaction.type === "income"
      ? theme.colors.tabActive
      : theme.colors.notification;

  return (
    <View key={transaction.id} style={styles.transactionItem}>
      <View
        style={[
          styles.iconContainer,
          // { backgroundColor: iconColor + '20' } // Adding transparency for background
        ]}>
        <Ionicons
          name={transaction.type === "income" ? "add-circle" : "remove-circle"}
          size={24}
          color={iconColor}
        />
      </View>

      <View style={styles.transactionDetails}>
        <Text
          style={[styles.transactionCategory, { color: theme.colors.text }]}>
          {transaction.category}
        </Text>
        <Text
          style={[styles.transactionDate, { color: theme.colors.text + "60" }]}>
          {new Date(transaction.date).toLocaleDateString()}
        </Text>
      </View>

      <View>
        <Text
          style={[
            styles.transactionAmount,
            {
              color:
                transaction.type === "income"
                  ? theme.colors.tabActive
                  : theme.colors.notification,
            },
          ]}>
          ₹{transaction.amount.toFixed(2)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  transactionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  iconContainer: {
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 11,
    padding: 4,
    width: 32,
    height: 32,
  },
  transactionDetails: {
    flex: 1,
    justifyContent: "center",
    marginLeft: 12,
    paddingBottom: 0,
  },
  transactionCategory: {
    fontSize: 16,
    fontWeight: "500",
  },
  transactionDate: {
    marginTop: 4,
    fontSize: 12,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: "bold",
  },
});
