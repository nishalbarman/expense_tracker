import React, { useEffect } from "react";
import {
  View,
  StyleSheet,
  Text,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Transaction } from "../types";
import { useTheme } from "@react-navigation/native";
// import LottieView from "lottie-react-native";

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withRepeat,
  Easing,
} from "react-native-reanimated";

import { useTransactions } from "@/context/TransactionContext";

interface HistoryItemProps {
  item: Transaction;
  index: number;
}

export const HistoryItem: React.FC<HistoryItemProps> = ({ item }) => {
  const theme = useTheme();

  const iconName = item.type === "income" ? "add-circle" : "remove-circle";
  const iconColor =
    item.type === "income" ? theme.colors.primary : theme.colors.notification;

  const { deleteTransaction } = useTransactions();

  const handleDeleteTransaction = (id: string) => {
    if (deleteTransaction) deleteTransaction(id);
  };

  const rotation = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
      transformOrigin: "center",
    };
  });

  useEffect(() => {
    // Create the slow-fast-slow spinning pattern
    rotation.value = withRepeat(
      withSequence(
        // Slow start: 0 to 120 degrees over 1000ms with ease-out
        withTiming(120, {
          duration: 800,
          easing: Easing.linear,
        }),
        // Fast middle: 120 to 240 degrees over 400ms with linear easing
        withTiming(360, {
          duration: 300,
          easing: Easing.linear,
        })
        // // Slow end: 240 to 360 degrees over 1000ms with ease-in
        // withTiming(360, {
        //   duration: 1000,
        //   easing: Easing.linear,
        // })
      ),
      -1, // Infinite repetitions
      false // Don't reverse
    );

    // Reset to 0 after each full rotation to prevent value accumulation
    return () => {
      rotation.value = 0;
    };
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          animatedStyle,
          {
            marginRight: 12,
          },
        ]}>
        <Ionicons name={iconName} size={24} color={iconColor} />
      </Animated.View>

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
        <TouchableOpacity
          activeOpacity={0.7}
          style={{ marginLeft: 12 }}
          onPress={() => handleDeleteTransaction(item.id)}>
          <Ionicons name="trash" size={20} color={theme.colors.primary} />
        </TouchableOpacity>

        {/* <LottieView
          style={{ width: 17, height: 19, marginLeft: 8 }}
          source={require("../assets/animations/upload-cloud-light.json")}
          autoPlay
          loop
        /> */}
        {/* <Text style={styles.syncStatus}>{item.synced ? "✅" : "🔄"}</Text> */}
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
