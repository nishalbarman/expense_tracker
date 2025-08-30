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
  Modal,
  PixelRatio,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
// import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInUp, FadeIn } from "react-native-reanimated";
import TextRecognition from "@react-native-ml-kit/text-recognition";
import {
  launchImageLibrary,
  launchCamera,
  ImagePickerResponse,
} from "react-native-image-picker";
import Clipboard from "@react-native-clipboard/clipboard";
import { useTheme } from "@react-navigation/native";
import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend,
  Schema,
} from "@react-native-firebase/ai";
// import * as Progress from "react-native-progress";
import { getApp } from "@react-native-firebase/app";
import { transactionCategories } from "@/data/transactionCategories";
import appCheck from "@react-native-firebase/app-check";
import auth from "@react-native-firebase/auth";
import Toast from "react-native-toast-message";
import { useTransactions } from "@/context/TransactionContext";

const { width: screenWidth } = Dimensions.get("window");

// interface RecognizedText {
//   text: string;
//   blocks: Array<{
//     text: string;
//     frame: { x: number; y: number; width: number; height: number };
//     lines: Array<{
//       text: string;
//       frame: { x: number; y: number; width: number; height: number };
//     }>;
//   }>;
// }

interface RecognizedText {
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

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BASE_WIDTH = 375; // iPhone 11 baseline
const widthScale = SCREEN_WIDTH / BASE_WIDTH;

// Moderated scale for fonts: avoids over-scaling
const moderateScale = (size: number, factor = 0.5) =>
  size + (widthScale * size - size) * factor;

const responsiveFontSize = (fontSize: number, factor = 0.5) => {
  const newSize = moderateScale(fontSize, factor);
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
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
  return (
    <View style={styles.card}>
      <Row label="Amount" value={recognizedText?.amount ?? "—"} />
      <Divider />
      <Row label="Category" value={recognizedText?.category ?? "—"} />
      <Divider />
      <Row label="Note" value={recognizedText?.note ?? "—"} multiline />
      <Divider />
      <Row label="Type" value={recognizedText?.type ?? "—"} />
    </View>
  );
};

const Row = ({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}:</Text>
    <Text
      style={[styles.value, multiline && styles.valueMultiline]}
      numberOfLines={multiline ? 0 : 1}>
      {value}
    </Text>
  </View>
);

const Divider = () => <View style={styles.divider} />;

export default function ScanImageScreen(): JSX.Element {
  const insets = useSafeAreaInsets();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [recognizedText, setRecognizedText] = useState<RecognizedText | null>(
    null
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasResult, setHasResult] = useState(false);

  // Image picker options
  const imagePickerOptions = {
    mediaType: "photo" as const,
    includeBase64: false,
    maxHeight: 2000,
    maxWidth: 2000,
    quality: 0.8,
  };

  // Handle image selection from camera
  const takePicture = useCallback(() => {
    launchCamera(imagePickerOptions, (response: ImagePickerResponse) => {
      if (response.didCancel || response.errorMessage) {
        return;
      }
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

  // Handle image selection from gallery
  const selectFromGallery = useCallback(() => {
    launchImageLibrary(imagePickerOptions, (response: ImagePickerResponse) => {
      if (response.didCancel || response.errorMessage) {
        return;
      }
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

  const extractTransactionDetails = useCallback(async (text) => {
    const app = getApp();
    // Can also pass an instance of auth which will pass in an auth token if a user is signed-in
    const authInstance = auth(app);
    const appCheckInstance = appCheck(app);
    // Configure appCheck instance as per docs....
    const options = {
      appCheck: appCheckInstance,
      auth: authInstance,
      backend: new GoogleAIBackend(),
    };

    const ai = getAI(app, options);

    const jsonSchema = Schema.object({
      properties: {
        amount: Schema.string(),
        category: Schema.string(),
        note: Schema.string(),
        type: Schema.string(),
      },
    });

    let systemIntruction = `
      You are an AI that extracts structured financial information from text. 
      The text will describe a transaction. From the text, identify and return the following fields in JSON format:

      - amount: The numeric value of money (without currency symbol).
      - category: The main category of the transaction, select from "${transactionCategories.expense.join(
        ","
      )},${transactionCategories.income.join(",")}".
      - note: Any additional description or details from the text.
      - type: Either "expense" or "income" (determine based on the context).

      If any field is missing, leave it as an empty string.  

      Example Input:  
      "Bought groceries for 500 rupees at Reliance Fresh"  

      Example Output:  
      {
        "amount": "500",
        "category": "Groceries",
        "note": "Bought groceries at Reliance Fresh",
        "type": "expense"
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

    console.log(systemIntruction);

    const prompt = `Extract transaction details from the following text:\n\n"${text}"\n\nReturn the response in JSON format.`;

    let result = await model.generateContent(prompt);
    // console.log(result.response.text());
    return result.response.text();
  }, []);

  // Perform OCR text recognition
  const performTextRecognition = useCallback(async () => {
    if (!selectedImage) return;

    setIsProcessing(true);
    try {
      const result = await TextRecognition.recognize(selectedImage);

      const transactionalData = await extractTransactionDetails(result.text);
      console.log("Transactional Data: ", transactionalData);

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
  }, [selectedImage]);

  const formatAmountInput = (txt: string) => {
    const cleaned = txt.replace(/[^\d.]/g, "");
    const parts = cleaned.split(".");
    const normalized =
      parts.length > 1
        ? `${parts[0].replace(/^0+(?=\d)/, "") || "0"}.${parts[1].slice(0, 2)}`
        : (parts[0] || "").replace(/^0+(?=\d)/, "");
    return normalized;
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addTransaction } = useTransactions();

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
        amount: amt,
        category: recognizedText.category,
        type: recognizedText.type,
        date: new Date().toISOString(),
        notes: recognizedText.note?.trim() || "",
        synced: false,
      };
      await addTransaction(newTransaction);
      Toast.show({ type: "success", text1: "Transaction added" });
      // reset();
      // Keyboard.dismiss();
      // router.replace("/");
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

  // Reset screen
  const resetScreen = useCallback(() => {
    setSelectedImage(null);
    setRecognizedText(null);
    setHasResult(false);
    setIsProcessing(false);
  }, []);

  // Show action sheet for image selection
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

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      {/* <LinearGradient
        colors={[theme.colors.primary, theme.colors.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Scanner</Text>
          <Text style={styles.headerSubtitle}>
            Scan your bill from images using AI
          </Text>
        </View>
      </LinearGradient> */}

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
            <View style={styles.emptyIcon}>
              <Ionicons name="scan-outline" size={64} color="#4ECDC4" />
            </View>
            <Text style={styles.emptyTitle}>Select an Image</Text>
            <Text style={styles.emptySubtitle}>
              Choose an image from your camera or gallery to extract text
            </Text>
            <TouchableOpacity
              style={[
                styles.selectButton,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={showImagePicker}>
              <Ionicons name="add" size={24} color="#FFFFFF" />
              <Text style={styles.selectButtonText}>Select Image</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          /* Image Preview and Actions */
          <Animated.View
            entering={FadeIn.duration(500)}
            style={styles.imageSection}>
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: selectedImage }}
                style={styles.previewImage}
              />
              <TouchableOpacity
                style={styles.changeImageButton}
                onPress={showImagePicker}>
                <Ionicons name="camera-outline" size={20} color="#4ECDC4" />
              </TouchableOpacity>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.scanButton]}
                onPress={performTextRecognition}
                disabled={isProcessing}>
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons
                    name="document-text-outline"
                    size={20}
                    color="#FFFFFF"
                  />
                )}
                <Text style={styles.actionButtonText}>
                  {isProcessing ? "Processing..." : "Scan Image"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.resetButton]}
                onPress={resetScreen}>
                <Ionicons name="refresh-outline" size={20} color="#666" />
                <Text style={[styles.actionButtonText, { color: "#666" }]}>
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
            style={styles.resultsSection}>
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>Recognized Transaction</Text>
              {recognizedText && (
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={handleCopyTransaction}>
                  {isSubmitting ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Ionicons name="add-outline" size={18} color="#4ECDC4" />
                  )}
                  <Text style={styles.copyButtonText}>ADD</Text>
                </TouchableOpacity>
              )}
            </View>

            {recognizedText ? (
              <TextResultCard recognizedText={recognizedText} />
            ) : (
              <View style={styles.noTextContainer}>
                <Ionicons name="document-text-outline" size={48} color="#CCC" />
                <Text style={styles.noTextMessage}>
                  No text found in the image
                </Text>
                <Text style={styles.noTextSubtitle}>
                  Try with an image that contains clear text
                </Text>
              </View>
            )}

            {/* Text Statistics */}
            {/* {recognizedText.text && (
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {recognizedText.blocks.length}
                  </Text>
                  <Text style={styles.statLabel}>Text Blocks</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {recognizedText.blocks.reduce(
                      (sum, block) => sum + block.lines.length,
                      0
                    )}
                  </Text>
                  <Text style={styles.statLabel}>Lines</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {recognizedText.text.split(" ").length}
                  </Text>
                  <Text style={styles.statLabel}>Words</Text>
                </View>
              </View>
            )} */}
          </Animated.View>
        )}
      </ScrollView>

      {/* <Modal
        visible={!llm.isReady}
        animationType="slide"
        transparent
        collapsable={false}>
        <Modal visible={!llm.isReady} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.sheetContainer,
                { backgroundColor: theme.colors.card },
              ]}>
              <Text
                style={{
                  marginBottom: 12,
                }}>
                Please Wait ..
              </Text>
              <Progress.Bar progress={llm.downloadProgress} width={200} />
            </View>
          </View>
        </Modal>
      </Modal> */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    alignItems: "center",
  },
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
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

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
    backgroundColor: "#E0F8F6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  selectButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4ECDC4",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 12,
  },
  selectButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },

  // Image Section
  imageSection: {
    marginBottom: 24,
  },
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
    backgroundColor: "rgba(255, 255, 255, 0.9)",
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
  actionButtons: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  scanButton: {
    backgroundColor: "#4ECDC4",
  },
  resetButton: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  // Results Section
  resultsSection: {
    backgroundColor: "#FFFFFF",
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
  resultsTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#E0F8F6",
    gap: 6,
  },
  copyButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4ECDC4",
  },

  // Text Results
  textResultContainer: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  recognizedText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#374151",
  },

  // No Text State
  noTextContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  noTextMessage: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 16,
    marginBottom: 8,
  },
  noTextSubtitle: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
  },

  // Statistics
  statsContainer: {
    flexDirection: "row",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#4ECDC4",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
  },
  statDivider: {
    width: 1,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 16,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  sheetContainer: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
  },

  card: {
    padding: 16,
    // borderRadius: 12,
    backgroundColor: "#FFFFFF",
    // iOS shadow
    // shadowColor: "#000",
    // shadowOffset: { width: 0, height: 8 },
    // shadowOpacity: 0.12,
    // shadowRadius: 12,
    // Android shadow
    // elevation: 6,
    // Layout
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  label: {
    width: 88,
    color: "#6B7280", // gray-500
    fontWeight: "600",
    fontSize: responsiveFontSize(13),
  },
  value: {
    flex: 1,
    fontWeight: "bold",
    color: "#111827", // gray-900
    fontSize: responsiveFontSize(15),
  },
  valueMultiline: {
    lineHeight: responsiveFontSize(20),
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#E5E7EB", // gray-200
    marginVertical: 4,
  },
});
