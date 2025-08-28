import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, ScrollView, View, Keyboard, Platform } from "react-native";
import {
  TextInput,
  Button,
  SegmentedButtons,
  useTheme,
  Text,
  Chip,
  Portal,
  Modal,
  ActivityIndicator,
} from "react-native-paper";
import { useTransactions } from "../context/TransactionContext";
import Animated, { FadeInUp } from "react-native-reanimated";
import { router, usePathname } from "expo-router";
import { transactionCategories } from "../data/sampleTransactions";
import { useForm, Controller } from "react-hook-form";
import Toast from "react-native-toast-message";

type FormValues = {
  type: "expense" | "income";
  amount: string;
  category: string;
  notes: string;
};

const CURRENCY = "₹";

export default function AddTransactionScreen(): JSX.Element {
  const pathname = usePathname();
  const { addTransaction } = useTransactions();
  const theme = useTheme();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categorySheetVisible, setCategorySheetVisible] = useState(false);
  const [categoryQuery, setCategoryQuery] = useState("");

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isValid, isDirty },
  } = useForm<FormValues>({
    mode: "onChange",
    defaultValues: { amount: "", category: "", notes: "", type: "expense" },
  });

  const typeValue = watch("type");
  const amountValue = watch("amount");
  const categoryValue = watch("category");

  useEffect(() => {
    if (pathname === "/add") reset();
  }, [pathname, reset]);

  const filteredCategories = useMemo(() => {
    if (!categoryQuery.trim()) return transactionCategories;
    const q = categoryQuery.toLowerCase();
    return transactionCategories.filter((c) => c.toLowerCase().includes(q));
  }, [categoryQuery]);

  const recentCategories = useMemo(() => {
    // In production, source from user history. For now, pick a few common.
    return ["Food", "Transport", "Shopping", "Bills", "Salary"].filter((c) =>
      transactionCategories.includes(c)
    );
  }, []);

  const formatAmountInput = (txt: string) => {
    // Keep digits and a single dot; prevent leading zeros like 0001
    const cleaned = txt.replace(/[^\d.]/g, "");
    const parts = cleaned.split(".");
    const normalized =
      parts.length > 1
        ? `${parts[0].replace(/^0+(?=\d)/, "") || "0"}.${parts[1].slice(0, 2)}`
        : (parts[0] || "").replace(/^0+(?=\d)/, "");
    return normalized;
  };

  const onSubmit = async (data: FormValues) => {
    if (!isValid) return;
    try {
      setIsSubmitting(true);
      const amt = parseFloat(data.amount);
      if (Number.isNaN(amt) || amt <= 0) {
        Toast.show({
          type: "error",
          text1: "Invalid amount",
          text2: "Enter a valid amount greater than 0.",
        });
        setIsSubmitting(false);
        return;
      }
      const newTransaction = {
        amount: amt,
        category: data.category,
        type: data.type,
        date: new Date().toISOString(),
        notes: data.notes?.trim() || "",
        synced: false,
      };
      await addTransaction(newTransaction);
      Toast.show({ type: "success", text1: "Transaction added" });
      reset();
      Keyboard.dismiss();
      router.replace("/"); // return to dashboard
    } catch (e) {
      Toast.show({
        type: "error",
        text1: "Failed to add",
        text2: "Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Animated.View entering={FadeInUp.delay(120).duration(600)}>
        {/* <Text style={[styles.title, { color: theme.colors.onSurface }]}>
          Add New Transaction
        </Text> */}

        {/* Type toggle */}
        <Controller
          control={control}
          name="type"
          render={({ field: { onChange, value } }) => (
            <SegmentedButtons
              value={value}
              onValueChange={(val) => onChange(val as FormValues["type"])}
              buttons={[
                { value: "expense", label: "Expense", icon: "arrow-down" },
                { value: "income", label: "Income", icon: "arrow-up" },
              ]}
              style={styles.segmentedButtons}
            />
          )}
        />

        {/* Amount with currency prefix */}
        <Controller
          control={control}
          name="amount"
          rules={{
            required: "Amount is required",
            validate: (v) => {
              const n = parseFloat(v);
              if (Number.isNaN(n)) return "Enter a number";
              if (n <= 0) return "Amount must be greater than 0";
              if (n > 100000000) return "Amount too large";
              return true;
            },
          }}
          render={({ field: { onChange, value } }) => (
            <TextInput
              label="Amount"
              value={value}
              onChangeText={(t) => onChange(formatAmountInput(t))}
              keyboardType={Platform.select({
                ios: "decimal-pad",
                android: "numeric",
              })}
              style={styles.input}
              mode="outlined"
              error={!!errors.amount}
              left={<TextInput.Affix text={CURRENCY} />}
              placeholder="0.00"
              returnKeyType="next"
            />
          )}
        />
        {errors.amount && (
          <Text style={styles.errorText}>{errors.amount.message}</Text>
        )}

        {/* Category picker as bottom sheet-like modal */}
        <Controller
          control={control}
          name="category"
          rules={{ required: "Category is required" }}
          render={({ field: { onChange, value } }) => (
            <>
              <TextInput
                label="Category"
                value={value}
                mode="outlined"
                style={styles.input}
                error={!!errors.category}
                right={
                  <TextInput.Icon
                    icon="chevron-down"
                    onPress={() => setCategorySheetVisible(true)}
                  />
                }
                onFocus={() => setCategorySheetVisible(true)}
              />
              {errors.category && (
                <Text style={styles.errorText}>{errors.category.message}</Text>
              )}

              <Portal>
                <Modal
                  visible={categorySheetVisible}
                  onDismiss={() => setCategorySheetVisible(false)}
                  contentContainerStyle={[
                    styles.sheetContainer,
                    { backgroundColor: theme.colors.surface },
                  ]}>
                  <Text
                    style={[
                      styles.sheetTitle,
                      { color: theme.colors.onSurface },
                    ]}>
                    Choose Category
                  </Text>

                  <TextInput
                    mode="outlined"
                    placeholder="Search category"
                    value={categoryQuery}
                    onChangeText={setCategoryQuery}
                    left={<TextInput.Icon icon="magnify" />}
                    style={{ marginBottom: 12 }}
                  />

                  {/* Recent quick chips */}
                  {recentCategories.length > 0 && (
                    <View
                      style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        gap: 8,
                        marginBottom: 12,
                      }}>
                      {recentCategories.map((c) => (
                        <Chip
                          key={c}
                          mode="outlined"
                          onPress={() => {
                            onChange(c);
                            setValue("category", c, {
                              shouldValidate: true,
                              shouldDirty: true,
                            });
                            setCategorySheetVisible(false);
                          }}>
                          {c}
                        </Chip>
                      ))}
                    </View>
                  )}

                  <ScrollView style={{ maxHeight: 300 }}>
                    {filteredCategories.map((cat) => {
                      const selected = cat === value;
                      return (
                        <Button
                          key={cat}
                          mode={selected ? "contained" : "text"}
                          onPress={() => {
                            onChange(cat);
                            setValue("category", cat, {
                              shouldValidate: true,
                              shouldDirty: true,
                            });
                            setCategorySheetVisible(false);
                          }}
                          style={{ justifyContent: "flex-start" }}
                          contentStyle={{ justifyContent: "flex-start" }}>
                          {cat}
                        </Button>
                      );
                    })}
                    {filteredCategories.length === 0 && (
                      <Text
                        style={{
                          opacity: 0.6,
                          textAlign: "center",
                          paddingVertical: 16,
                        }}>
                        No categories match your search
                      </Text>
                    )}
                  </ScrollView>

                  <View style={{ marginTop: 8 }}>
                    <Button onPress={() => setCategorySheetVisible(false)}>
                      Close
                    </Button>
                  </View>
                </Modal>
              </Portal>
            </>
          )}
        />

        {/* Notes */}
        <Controller
          control={control}
          name="notes"
          render={({ field: { onChange, value } }) => (
            <TextInput
              label="Notes"
              value={value}
              onChangeText={onChange}
              multiline
              numberOfLines={3}
              style={styles.input}
              mode="outlined"
              placeholder={
                typeValue === "expense"
                  ? "e.g., Lunch with team"
                  : "e.g., Project payout"
              }
            />
          )}
        />

        {/* Submit */}
        <Button
          mode="contained"
          onPress={handleSubmit(onSubmit)}
          style={styles.button}
          labelStyle={styles.buttonLabel}
          disabled={
            !isValid ||
            !isDirty ||
            isSubmitting ||
            !amountValue ||
            !categoryValue
          }
          icon={
            isSubmitting
              ? undefined
              : typeValue === "expense"
              ? "arrow-down"
              : "arrow-up"
          }>
          {isSubmitting ? (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <ActivityIndicator color="white" />
              <Text style={{ color: "white" }}>Saving…</Text>
            </View>
          ) : (
            "Add Transaction"
          )}
        </Button>

        {/* Secondary: Save & Add Another (optional) */}
        {/* <Button mode="text" onPress={handleSubmit(onSubmit)} disabled={!isValid || isSubmitting}>Save & Add Another</Button> */}
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "white" },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  segmentedButtons: { marginBottom: 16 },
  input: { marginBottom: 14 },
  button: { marginTop: 12, paddingVertical: 8, borderRadius: 10 },
  buttonLabel: { fontSize: 16, fontWeight: "700" },
  errorText: { color: "red", fontSize: 12, marginBottom: 8 },
  sheetContainer: {
    marginHorizontal: 12,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
  },
  sheetTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
});
