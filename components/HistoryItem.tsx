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
import { router } from "expo-router";
import { useDeleteTransactionMutation } from "@/redux/api/localTxApi";
import { useAppSelector } from "@/redux/hooks";

interface HistoryItemProps {
  item: Transaction;
  index: number;
}

export const HistoryItem: React.FC<HistoryItemProps> = ({ item }) => {
  const theme = useTheme();
  const [deleteTransaction] = useDeleteTransactionMutation();
  const uid = useAppSelector((s) => s.transactionsUI.uid) ?? "__local__";

  const handleDeleteTransaction = (id: string) => {
    deleteTransaction({ id, userId: uid });
  };

  const iconName = item.type === "income" ? "add-circle" : "remove-circle";
  const iconColor =
    item.type === "income"
      ? (theme.colors as any).tabActive
      : theme.colors.notification;

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
      !item.synced ? -1 : 1,
      false
    );
    return () => {
      rotation.value = 0;
    };
  }, []);

  const { themePref } = useAppSelector((s) => s.theme);

  console.log(themePref);

  return (
    <>
      {/* <View
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
              {new Date(item.dateIso).toLocaleDateString()}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            style={{ marginLeft: 12 }}
            onPress={() =>
              router.push({
                pathname: `/add`,
                params: {
                  txId: item.id,
                },
              })
            }>
            <Ionicons
              name="create-outline"
              size={21}
              color={(theme.colors as any).tabActive}
            />
          </TouchableOpacity>

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
      </View> */}
      <View
        style={[
          {
            padding: 16,
            alignItems: "center",
            marginVertical: 2,
            borderRadius: 12,
            borderWidth: 1,
            shadowOpacity: 0.1,
            shadowOffset: { width: 0, height: 3 },
            shadowRadius: 5,
            elevation: 3,
            backgroundColor: theme.colors.card,
            shadowColor: theme.colors.text,
            borderColor: (theme as any).dark
              ? "rgba(255,255,255,0.1)"
              : "rgba(0,0,0,0.08)",
          },
        ]}>
        <View
          style={[
            {
              flexDirection: "row",
              alignItems: "center",
            },
          ]}>
          <View>
            <Animated.View
              style={[!item.synced && animatedStyle, styles.leftIcon]}>
              <Ionicons name={iconName as any} size={25} color={iconColor} />
            </Animated.View>
          </View>

          <View
            style={[
              {
                flexDirection: "row",
                flex: 1,
              },
            ]}>
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
              {/* <Text
                style={[
                  styles.date,
                  {
                    color:
                      (theme.colors as any).onSurfaceVariant ??
                      theme.colors.text + "60",
                  },
                ]}>
                {new Date(item.dateIso).toLocaleDateString()}
              </Text> */}
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
            </View>
          </View>
        </View>

        <View
          style={{
            height: 1,
            backgroundColor:
              themePref === "dark" ? "rgba(255, 255, 255)" : "rgba(0,0,0,0.06)",
            marginLeft: 12,
            // marginTop: 6,
          }}
        />

        <View
          style={{
            flexDirection: "row",
            gap: 4,
            marginTop: 15,
            borderTopColor:
              themePref === "dark" ? "rgba(59, 59, 59, 1)" : "rgba(0,0,0,0.06)",
            borderTopWidth: 1,
            width: "90%",
            justifyContent: "space-between",
            paddingTop: 15,
            alignItems: "center",
          }}>
          <TouchableOpacity
            activeOpacity={0.7}
            style={[
              styles.actionBtn,
              {
                flexDirection: "column",
                justifyContent: "center",
                alignContent: "center",
              },
            ]}
            onPress={() =>
              router.push({ pathname: `/add`, params: { txId: item.id } })
            }>
            <Ionicons
              name="create-outline"
              size={19}
              color={(theme.colors as any).tabActive}
            />
            {/* <Text
              style={{
                fontSize: 9,
              }}>
              Update
            </Text> */}
          </TouchableOpacity>

          <Text
            style={[
              styles.date,
              {
                color:
                  (theme.colors as any).onSurfaceVariant ??
                  theme.colors.text + "60",
                fontWeight: "bold",
              },
            ]}>
            {Intl.DateTimeFormat("en-IN", {
              day: "2-digit",
              month: "short", // "short" → Sep | "long" → September | "numeric" → 09
              year: "numeric",
            }).format(new Date(item.dateIso))}
          </Text>

          <TouchableOpacity
            activeOpacity={0.7}
            style={[
              styles.actionBtn,
              {
                flexDirection: "column",
                justifyContent: "center",
                alignContent: "center",
              },
            ]}
            onPress={() => handleDeleteTransaction(item.id)}>
            <Ionicons
              name="trash"
              size={19}
              color={(theme.colors as any).tabActive}
            />
            {/* <Text
              style={{
                fontSize: 9,
              }}>
              Delete
            </Text> */}
          </TouchableOpacity>
        </View>
      </View>
    </>
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

  // container: {
  //   flexDirection: "row",
  //   alignItems: "center",
  //   paddingVertical: 12,
  //   borderBottomWidth: StyleSheet.hairlineWidth,
  // },
  // icon: { marginRight: 12 },
  // content: { flex: 1 },
  // title: { fontSize: 16, fontWeight: "600" },
  // description: { fontSize: 12, marginTop: 2 },
  // right: { flexDirection: "row", alignItems: "center" },
  // amountContainer: { alignItems: "flex-end" },
  // amount: { fontSize: 16, fontWeight: "700" },
  // date: { fontSize: 12, marginTop: 2 },
  // syncStatus: { fontSize: 18, marginLeft: 8 },
});
