import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
  PixelRatio,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInUp, FadeIn } from "react-native-reanimated";
import TextRecognition from "@react-native-ml-kit/text-recognition";
import {
  launchImageLibrary,
  launchCamera,
  ImagePickerResponse,
} from "react-native-image-picker";
import { useTheme } from "@react-navigation/native";
import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend,
  Schema,
} from "@react-native-firebase/ai";
import { getApp } from "@react-native-firebase/app";
import { transactionCategories } from "@/data/transactionCategories";
import appCheck from "@react-native-firebase/app-check";
import auth from "@react-native-firebase/auth";
import Toast from "react-native-toast-message";
import { useAddTransactionMutation } from "@/redux/api/localTxApi";
import { useAppSelector } from "@/redux/hooks";
import { v4 as uuid } from "uuid";

const { width: screenWidth } = Dimensions.get("window");

// responsive font helpers from your code
const BASE_WIDTH = 375;
const widthScale = screenWidth / BASE_WIDTH;
const moderateScale = (size: number, factor = 0.5) =>
  size + (widthScale * size - size) * factor;
const responsiveFontSize = (fontSize: number, factor = 0.5) => {
  const newSize = moderateScale(fontSize, factor);
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

interface RecognizedText {
  status: boolean;
  error: string;
  amount: string;
  category: string;
  note: string;
  type: "expense" | "income";
}

type FormValues = {
  type: "expense" | "income";
  amount: string;
  category: string;
  notes: string;
};

export const TextResultCard = ({
  recognizedText,
}: {
  recognizedText: {
    amount?: string;
    category?: string;
    note?: string;
    type?: string;
  };
}) => {
  const theme = useTheme();
  const onSurfaceVariant =
    (theme.colors as any).onSurfaceVariant ?? theme.colors.text + "70";

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
      <Row label="Amount" value={recognizedText?.amount ?? "—"} />
      <Divider />
      <Row label="Category" value={recognizedText?.category ?? "—"} />
      <Divider />
      <Row label="Note" value={recognizedText?.note ?? "—"} multiline />
      <Divider />
      <Row label="Type" value={recognizedText?.type ?? "—"} />
    </View>
  );

  function Row({
    label,
    value,
    multiline,
  }: {
    label: string;
    value: string;
    multiline?: boolean;
  }) {
    return (
      <View style={styles.row}>
        <Text
          style={[
            styles.label,
            { color: onSurfaceVariant, fontSize: responsiveFontSize(13) },
          ]}>
          {label}:
        </Text>
        <Text
          style={[
            styles.value,
            { color: theme.colors.text, fontSize: responsiveFontSize(15) },
            multiline && styles.valueMultiline,
          ]}
          numberOfLines={multiline ? 0 : 1}>
          {value}
        </Text>
      </View>
    );
  }

  function Divider() {
    return (
      <View
        style={[
          styles.divider,
          {
            backgroundColor: theme.dark ? "rgba(255,255,255,0.08)" : "#E5E7EB",
          },
        ]}
      />
    );
  }
};

export default function ScanImageScreen(): JSX.Element {
  const insets = useSafeAreaInsets();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [recognizedText, setRecognizedText] = useState<RecognizedText | null>(
    null
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasResult, setHasResult] = useState(false);

  const imagePickerOptions = {
    mediaType: "photo" as const,
    includeBase64: false,
    maxHeight: 2000,
    maxWidth: 2000,
    quality: 0.8,
  };

  const takePicture = useCallback(() => {
    launchCamera(imagePickerOptions, (response: ImagePickerResponse) => {
      if (response.didCancel || response.errorMessage) return;
      if (response.assets && response.assets[0]) {
        const imageUri = response.assets[0].uri;
        if (imageUri) {
          setSelectedImage(imageUri);
          setHasResult(false);
          setRecognizedText(null);
        }
      }
    });
  }, []);

  const selectFromGallery = useCallback(() => {
    launchImageLibrary(imagePickerOptions, (response: ImagePickerResponse) => {
      if (response.didCancel || response.errorMessage) return;
      if (response.assets && response.assets[0]) {
        const imageUri = response.assets[0].uri;
        if (imageUri) {
          setSelectedImage(imageUri);
          setHasResult(false);
          setRecognizedText(null);
        }
      }
    });
  }, []);

  const extractTransactionDetails = useCallback(async (text: string) => {
    const app = getApp();
    const authInstance = auth(app);
    const appCheckInstance = appCheck(app);

    const options = {
      appCheck: appCheckInstance,
      auth: authInstance,
      backend: new GoogleAIBackend(),
    };

    const ai = getAI(app, options);

    const jsonSchema = Schema.object({
      properties: {
        status: Schema.boolean(),
        error: Schema.string(),
        amount: Schema.string(),
        category: Schema.string(),
        note: Schema.string(),
        type: Schema.string(),
      },
    });

    const systemIntruction = `
      You are an AI that extracts structured financial information from text or images. 
      The input may be a written transaction description or content from documents such as bills, salary slips, or product price tags. 

      From the input, identify and return the following fields in JSON format:

      - amount: The numeric value of money (without any currency symbol).
      - category: The main category of the transaction, selected from "${transactionCategories.expense.join(
        ","
      )},${transactionCategories.income.join(",")}".
      - note: Any additional description or context found in the text or image.
      - type: Either "expense" or "income" (determine from the context).

      Rules:
      - If price-related information (e.g., bill total, salary amount, product price) is found, return a JSON with status=true and the extracted fields.
      - If a field cannot be determined, leave it as an empty string.
      - If no transaction or price-related data is present, return JSON with status=false and an error message.
      - Always return data in strict JSON format.

      ✅ Success Example Input:  
        "Bought groceries for 500 rupees at Reliance Fresh"  

      ✅ Example Output:  
      {
        "status": true,
        "error": "",
        "amount": "500",
        "category": "Groceries",
        "note": "Bought groceries at Reliance Fresh",
        "type": "expense"
      }

      ❌ Failed Example Input:  
        "I am a React Native developer working in an Android application."  

      ❌ Example Output:  
      {
        "status": false,
        "error": "No transaction or price-related information found.",
        "amount": "",
        "category": "",
        "note": "",
        "type": ""
      }
      `;

    const model = getGenerativeModel(ai, {
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: jsonSchema,
      },
      systemInstruction: systemIntruction,
    });

    const prompt = `Extract transaction details from the following text:\n\n"${text}"\n\nReturn the response in JSON format.`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  }, []);

  const performTextRecognition = useCallback(async () => {
    if (!selectedImage) return;

    setIsProcessing(true);
    try {
      const result = await TextRecognition.recognize(selectedImage);
      const transactionalData = await extractTransactionDetails(result.text);
      setRecognizedText(JSON.parse(transactionalData));
      setHasResult(true);
    } catch (error) {
      console.error("Text recognition error:", error);
      Alert.alert(
        "Error",
        "Failed to recognize text from the image. Please try again."
      );
    } finally {
      setIsProcessing(false);
    }
  }, [selectedImage, extractTransactionDetails]);

  const formatAmountInput = (txt: string) => {
    const cleaned = txt.replace(/[^\d.]/g, "");
    const parts = cleaned.split(".");
    const normalized =
      parts.length > 1
        ? `${parts[0].replace(/^0+(?=\d)/, "") || "0"}.${parts[1].slice(0, 2)}`
        : (parts[0] || "").replace(/^0+(?=\d)/, "");
    return normalized;
  };

  const uid = useAppSelector((s) => s.transactionsUI.uid) ?? "__local__";
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addTransaction, { error }] = useAddTransactionMutation();

  const handleCopyTransaction = async () => {
    if (!recognizedText) return;
    try {
      setIsSubmitting(true);
      const amt = parseFloat(formatAmountInput(recognizedText.amount));
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
        id: uuid(),
        userId: uid,
        amount: amt,
        category: recognizedText.category,
        type: recognizedText.type,
        dateIso: new Date().toISOString(),
        notes: recognizedText.note?.trim() || "",
        updatedAt: new Date().getTime(),
        synced: false,
      };
      await addTransaction(newTransaction).unwrap();
      Toast.show({ type: "success", text1: "Transaction added" });
      setHasResult(false);
      setSelectedImage(null);
      setRecognizedText(null);
    } catch (e) {
      console.error("Failed to add transaction:", e);
      Toast.show({
        type: "error",
        text1: "Failed to add",
        text2: "Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetScreen = useCallback(() => {
    setSelectedImage(null);
    setRecognizedText(null);
    setHasResult(false);
    setIsProcessing(false);
  }, []);

  const showImagePicker = useCallback(() => {
    Alert.alert(
      "Select Image",
      "Choose an option to select an image",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Camera", onPress: takePicture },
        { text: "Gallery", onPress: selectFromGallery },
      ],
      { cancelable: true }
    );
  }, [takePicture, selectFromGallery]);

  const theme = useTheme();
  const onPrimary = (theme.colors as any).onPrimary ?? "#FFFFFF";
  const onSurfaceVariant =
    (theme.colors as any).onSurfaceVariant ?? theme.colors.text + "70";

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 90 },
        ]}
        showsVerticalScrollIndicator={false}>
        {/* Image Selection Section */}
        {!selectedImage ? (
          <Animated.View
            entering={FadeInUp.delay(200).duration(600)}
            style={styles.emptyState}>
            <View
              style={[
                styles.emptyIcon,
                {
                  backgroundColor: theme.dark
                    ? "rgba(255,255,255,0.08)"
                    : "#E0F8F6",
                },
              ]}>
              <Ionicons
                name="scan-outline"
                size={64}
                color={theme.dark ? theme.colors.text : "#4ECDC4"}
              />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              Select an Image
            </Text>
            <Text style={[styles.emptySubtitle, { color: onSurfaceVariant }]}>
              Choose an image from camera or gallery to extract text
            </Text>
            <TouchableOpacity
              style={[
                styles.selectButton,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={showImagePicker}>
              <Ionicons name="add" size={24} color={onPrimary} />
              <Text style={[styles.selectButtonText, { color: onPrimary }]}>
                Select Image
              </Text>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <Animated.View
            entering={FadeIn.duration(500)}
            style={styles.imageSection}>
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: selectedImage }}
                style={styles.previewImage}
              />
              <TouchableOpacity
                style={[
                  styles.changeImageButton,
                  {
                    backgroundColor: theme.dark
                      ? "rgba(0,0,0,0.35)"
                      : "rgba(255, 255, 255, 0.9)",
                  },
                ]}
                onPress={showImagePicker}>
                <Ionicons
                  name="camera-outline"
                  size={20}
                  color={theme.dark ? theme.colors.card : theme.colors.primary}
                />
              </TouchableOpacity>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { backgroundColor: theme.colors.primary },
                ]}
                onPress={performTextRecognition}
                disabled={isProcessing}>
                {isProcessing ? (
                  <ActivityIndicator size="small" color={onPrimary} />
                ) : (
                  <Ionicons
                    name="document-text-outline"
                    size={20}
                    color={onPrimary}
                  />
                )}
                <Text style={[styles.actionButtonText, { color: onPrimary }]}>
                  {isProcessing ? "Processing..." : "Scan Image"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionButton,
                  {
                    backgroundColor: theme.colors.card,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                  },
                ]}
                onPress={resetScreen}>
                <Ionicons
                  name="refresh-outline"
                  size={20}
                  color={theme.colors.text}
                />
                <Text
                  style={[
                    styles.actionButtonText,
                    { color: theme.colors.text },
                  ]}>
                  Reset
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* Results Section */}
        {hasResult && recognizedText && (
          <Animated.View
            entering={FadeInUp.delay(300).duration(600)}
            style={[
              styles.resultsSection,
              { backgroundColor: theme.colors.card },
            ]}>
            <View style={styles.resultsHeader}>
              <Text style={[styles.resultsTitle, { color: theme.colors.text }]}>
                Recognized Transaction
              </Text>
              {recognizedText && (
                <TouchableOpacity
                  style={[
                    styles.copyButton,
                    {
                      backgroundColor:
                        (theme.colors as any).tabActive ??
                        theme.colors.primary + "20",  
                    },
                  ]}
                  onPress={handleCopyTransaction}>
                  {isSubmitting ? (
                    <ActivityIndicator
                      color={theme.colors.primary}
                      size="small"
                    />
                  ) : (
                    <Ionicons
                      name="add-outline"
                      size={18}
                      color={theme.colors.primary}
                    />
                  )}
                  <Text
                    style={[
                      styles.copyButtonText,
                      { color: theme.colors.primary },
                    ]}>
                    ADD
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {recognizedText?.status ? (
              <TextResultCard recognizedText={recognizedText} />
            ) : (
              <View style={styles.noTextContainer}>
                <Ionicons
                  name="document-text-outline"
                  size={48}
                  color={onSurfaceVariant}
                />
                <Text
                  style={[styles.noTextMessage, { color: theme.colors.text }]}>
                  No transaction found in the image
                </Text>
                <Text
                  style={[styles.noTextMessage, { color: theme.colors.text }]}>
                  Error: {recognizedText.error}
                </Text>
                <Text
                  style={[styles.noTextSubtitle, { color: onSurfaceVariant }]}>
                  Try with an image that contains transaction details
                </Text>
              </View>
            )}
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header (kept commented in JSX)
  header: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: { alignItems: "center" },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
  },

  scrollContainer: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },

  // Empty State
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  emptyTitle: { fontSize: 24, fontWeight: "700", marginBottom: 8 },
  emptySubtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  selectButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 12,
  },
  selectButtonText: { fontSize: 18, fontWeight: "600" },

  // Image Section
  imageSection: { marginBottom: 24 },
  imageContainer: {
    position: "relative",
    alignItems: "center",
    marginBottom: 20,
  },
  previewImage: {
    width: screenWidth - 40,
    height: 250,
    borderRadius: 16,
    resizeMode: "cover",
  },
  changeImageButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },

  // Action Buttons
  actionButtons: { flexDirection: "row", gap: 12 },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: { fontSize: 16, fontWeight: "600" },

  // Results Section
  resultsSection: {
    borderRadius: 16,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  resultsTitle: { fontSize: 20, fontWeight: "700" },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  copyButtonText: { fontSize: 14, fontWeight: "600" },

  // No Text State
  noTextContainer: { alignItems: "center", paddingVertical: 40 },
  noTextMessage: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  noTextSubtitle: { fontSize: 14, textAlign: "center" },

  // Card used inside TextResultCard
  card: {
    padding: 16,
    gap: 8,
    borderRadius: 12,
  },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  label: { width: 88, fontWeight: "600" },
  value: { flex: 1, fontWeight: "bold" },
  valueMultiline: { lineHeight: responsiveFontSize(20) },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 4 },
});
