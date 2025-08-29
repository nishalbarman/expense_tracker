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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInUp, FadeIn } from "react-native-reanimated";
import TextRecognition from "@react-native-ml-kit/text-recognition";
import {
  launchImageLibrary,
  launchCamera,
  ImagePickerResponse,
} from "react-native-image-picker";
import Clipboard from "@react-native-clipboard/clipboard";

const { width: screenWidth } = Dimensions.get("window");

interface RecognizedText {
  text: string;
  blocks: Array<{
    text: string;
    frame: { x: number; y: number; width: number; height: number };
    lines: Array<{
      text: string;
      frame: { x: number; y: number; width: number; height: number };
    }>;
  }>;
}

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

  // Perform OCR text recognition
  const performTextRecognition = useCallback(async () => {
    if (!selectedImage) return;

    setIsProcessing(true);
    try {
      const result = await TextRecognition.recognize(selectedImage);
      setRecognizedText(result);
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

  // Copy text to clipboard
  const copyToClipboard = useCallback(() => {
    if (recognizedText?.text) {
      Clipboard.setString(recognizedText.text);
      Alert.alert("Copied", "Text copied to clipboard!");
    }
  }, [recognizedText]);

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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <LinearGradient
        colors={["#4ECDC4", "#45B7D1"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Text Scanner</Text>
          <Text style={styles.headerSubtitle}>
            Scan text from images using AI
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
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
              style={styles.selectButton}
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
                  <Ionicons name="text-outline" size={20} color="#FFFFFF" />
                )}
                <Text style={styles.actionButtonText}>
                  {isProcessing ? "Processing..." : "Scan Text"}
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
              <Text style={styles.resultsTitle}>Recognized Text</Text>
              {recognizedText.text && (
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={copyToClipboard}>
                  <Ionicons name="copy-outline" size={18} color="#4ECDC4" />
                  <Text style={styles.copyButtonText}>Copy</Text>
                </TouchableOpacity>
              )}
            </View>

            {recognizedText.text ? (
              <View style={styles.textResultContainer}>
                <Text style={styles.recognizedText}>{recognizedText.text}</Text>
              </View>
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
            {recognizedText.text && (
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
            )}
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
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
});
