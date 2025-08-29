import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  StyleSheet,
  ScrollView,
  View,
  Keyboard,
  Platform,
  TouchableOpacity,
  Text,
  TextInput,
  ActivityIndicator,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTransactions } from "../../context/TransactionContext";
import Animated, { FadeInUp } from "react-native-reanimated";
import { router, usePathname } from "expo-router";
import { transactionCategories } from "../../data/transactionCategories";
import { useForm, Controller } from "react-hook-form";
import { useTheme } from "@react-navigation/native";
import Toast from "react-native-toast-message";

type FormValues = {
  type: "expense" | "income";
  amount: string;
  category: string;
  notes: string;
};

const CURRENCY = "₹";

// Custom SegmentedButtons Component
const SegmentedButtons = ({ value, onValueChange, buttons, style }: any) => {
  const theme = useTheme();

  return (
    <View style={[styles.segmentedContainer, style]}>
      {buttons.map((button: any, index: number) => {
        const isSelected = value === button.value;
        const isFirst = index === 0;
        const isLast = index === buttons.length - 1;

        return (
          <TouchableOpacity
            key={button.value}
            style={[
              styles.segmentedButton,
              isFirst && styles.segmentedButtonFirst,
              isLast && styles.segmentedButtonLast,
              isSelected && {
                backgroundColor: theme.colors.primary,
              },
              !isSelected && {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
              },
            ]}
            onPress={() => onValueChange(button.value)}>
            {button.icon && (
              <Ionicons
                name={button.icon}
                size={16}
                color={isSelected ? theme.colors.card : theme.colors.text}
                style={{ marginRight: 6 }}
              />
            )}
            <Text
              style={[
                styles.segmentedButtonText,
                {
                  color: isSelected ? theme.colors.card : theme.colors.text,
                },
              ]}>
              {button.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// Custom TextInput Component
const CustomTextInput = ({
  label,
  value,
  onChangeText,
  error,
  leftPrefix,
  rightIcon,
  onRightIconPress,
  multiline = false,
  numberOfLines = 1,
  placeholder,
  keyboardType = "default",
  returnKeyType = "default",
  onFocus,
  style,
  ...props
}: any) => {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.inputContainer, style]}>
      <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
        {label}
      </Text>
      <View
        style={[
          styles.inputWrapper,
          {
            borderColor: error
              ? "#ef4444"
              : isFocused
              ? theme.colors.primary
              : theme.colors.border,
            backgroundColor: theme.colors.card,
          },
          multiline && { height: numberOfLines * 20 + 32 },
        ]}>
        {leftPrefix && (
          <Text style={[styles.inputPrefix, { color: theme.colors.text }]}>
            {leftPrefix}
          </Text>
        )}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.text + "80"}
          keyboardType={keyboardType}
          returnKeyType={returnKeyType}
          multiline={multiline}
          numberOfLines={numberOfLines}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={() => setIsFocused(false)}
          style={[
            styles.textInput,
            { color: theme.colors.text },
            multiline && { textAlignVertical: "top" },
          ]}
          {...props}
        />
        {rightIcon && (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={styles.inputRightIcon}>
            <Ionicons name={rightIcon} size={20} color={theme.colors.text} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// Custom Button Component
const CustomButton = ({
  children,
  onPress,
  mode = "contained",
  disabled = false,
  icon,
  style,
  ...props
}: any) => {
  const theme = useTheme();

  const buttonStyle = [
    styles.button,
    mode === "contained" && {
      backgroundColor: disabled
        ? theme.colors.text + "40"
        : theme.colors.primary,
    },
    mode === "text" && {
      backgroundColor: "transparent",
    },
    style,
  ];

  const textColor =
    mode === "contained" ? theme.colors.card : theme.colors.primary;

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      {...props}>
      <View style={styles.buttonContent}>
        {icon && (
          <Ionicons
            name={icon}
            size={16}
            color={disabled ? theme.colors.text + "60" : textColor}
            style={{ marginRight: 8 }}
          />
        )}
        {typeof children === "string" ? (
          <Text
            style={[
              styles.buttonText,
              {
                color: disabled ? theme.colors.text + "60" : textColor,
              },
            ]}>
            {children}
          </Text>
        ) : (
          children
        )}
      </View>
    </TouchableOpacity>
  );
};

// Custom Chip Component
const CustomChip = ({ children, onPress, mode = "outlined" }: any) => {
  const theme = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.chip,
        {
          backgroundColor:
            mode === "outlined" ? "transparent" : theme.colors.primary,
          borderColor: theme.colors.border,
        },
      ]}
      onPress={onPress}>
      <Text
        style={[
          styles.chipText,
          {
            color: mode === "outlined" ? theme.colors.text : theme.colors.card,
          },
        ]}>
        {children}
      </Text>
    </TouchableOpacity>
  );
};

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
    if (!categoryQuery.trim()) return transactionCategories[typeValue];
    const q = categoryQuery.toLowerCase();
    return transactionCategories[typeValue].filter((c) =>
      c.toLowerCase().includes(q)
    );
  }, [categoryQuery, typeValue]);

  const recentCategories = useMemo(() => {
    return ["Food", "Transport", "Shopping", "Bills", "Salary"].filter((c) =>
      transactionCategories[typeValue].includes(c)
    );
  }, [typeValue]);

  const formatAmountInput = (txt: string) => {
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
      router.replace("/");
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
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      keyboardShouldPersistTaps="handled">
      <Animated.View entering={FadeInUp.delay(120).duration(600)}>
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
            <>
              <CustomTextInput
                label="Amount"
                value={value}
                onChangeText={(t) => onChange(formatAmountInput(t))}
                keyboardType={Platform.select({
                  ios: "decimal-pad",
                  android: "numeric",
                })}
                error={!!errors.amount}
                leftPrefix={CURRENCY}
                placeholder="0.00"
                returnKeyType="next"
              />
              {errors.amount && (
                <Text style={styles.errorText}>{errors.amount.message}</Text>
              )}
            </>
          )}
        />

        {/* Category picker */}
        <Controller
          control={control}
          name="category"
          rules={{ required: "Category is required" }}
          render={({ field: { onChange, value } }) => (
            <>
              <CustomTextInput
                label="Category"
                value={value}
                error={!!errors.category}
                rightIcon="chevron-down"
                onRightIconPress={() => setCategorySheetVisible(true)}
                onFocus={() => setCategorySheetVisible(true)}
                placeholder="Select category"
              />
              {errors.category && (
                <Text style={styles.errorText}>{errors.category.message}</Text>
              )}

              <Modal
                visible={categorySheetVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setCategorySheetVisible(false)}>
                <View style={styles.modalOverlay}>
                  <View
                    style={[
                      styles.sheetContainer,
                      { backgroundColor: theme.colors.card },
                    ]}>
                    <Text
                      style={[styles.sheetTitle, { color: theme.colors.text }]}>
                      Choose {typeValue[0].toLocaleUpperCase()}
                      {typeValue.substring(1)} Category
                    </Text>

                    <CustomTextInput
                      placeholder="Search category"
                      value={categoryQuery}
                      onChangeText={setCategoryQuery}
                      leftPrefix="🔍"
                      style={{ marginBottom: 12 }}
                    />

                    {/* Recent quick chips */}
                    {recentCategories.length > 0 && (
                      <View style={styles.chipContainer}>
                        {recentCategories.map((c) => (
                          <CustomChip
                            key={c}
                            onPress={() => {
                              onChange(c);
                              setValue("category", c, {
                                shouldValidate: true,
                                shouldDirty: true,
                              });
                              setCategorySheetVisible(false);
                            }}>
                            {c}
                          </CustomChip>
                        ))}
                      </View>
                    )}

                    <ScrollView style={{ maxHeight: 300 }}>
                      {filteredCategories.map((cat) => {
                        const selected = cat === value;
                        return (
                          <CustomButton
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
                            style={{
                              justifyContent: "flex-start",
                              marginBottom: 4,
                            }}>
                            {cat}
                          </CustomButton>
                        );
                      })}
                      {filteredCategories.length === 0 && (
                        <Text
                          style={[
                            styles.noResultsText,
                            { color: theme.colors.text },
                          ]}>
                          No categories match your search
                        </Text>
                      )}
                    </ScrollView>

                    <View style={{ marginTop: 8 }}>
                      <CustomButton
                        mode="text"
                        onPress={() => setCategorySheetVisible(false)}>
                        Close
                      </CustomButton>
                    </View>
                  </View>
                </View>
              </Modal>
            </>
          )}
        />

        {/* Notes */}
        <Controller
          control={control}
          name="notes"
          render={({ field: { onChange, value } }) => (
            <CustomTextInput
              label="Notes"
              value={value}
              onChangeText={onChange}
              multiline
              numberOfLines={3}
              placeholder={
                typeValue === "expense"
                  ? "e.g., Lunch with team"
                  : "e.g., Project payout"
              }
            />
          )}
        />

        {/* Submit */}
        <CustomButton
          mode="contained"
          onPress={handleSubmit(onSubmit)}
          style={styles.submitButton}
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
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="white" size="small" />
              <Text style={{ color: "white", marginLeft: 8 }}>Saving…</Text>
            </View>
          ) : (
            "Add Transaction"
          )}
        </CustomButton>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },

  // Segmented Buttons
  segmentedContainer: {
    flexDirection: "row",
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 16,
  },
  segmentedButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  segmentedButtonFirst: {
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  segmentedButtonLast: {
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    borderLeftWidth: 0,
  },
  segmentedButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },

  // Input styles
  inputContainer: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  inputPrefix: {
    fontSize: 16,
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
  },
  inputRightIcon: {
    padding: 4,
  },

  // Button styles
  button: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  submitButton: {
    marginTop: 12,
    paddingVertical: 16,
  },

  // Chip styles
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "500",
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: "80%",
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },

  // Other styles
  errorText: {
    color: "#ef4444",
    fontSize: 12,
    marginTop: -10,
    marginBottom: 8,
  },
  noResultsText: {
    opacity: 0.6,
    textAlign: "center",
    paddingVertical: 16,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
});
