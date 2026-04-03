// app/seller/components/seller-create-gift-form.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  Switch,
  Platform,
  PanResponder,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import AxiosInstance from "../../../contexts/axios";
import { useAuth } from "../../../contexts/AuthContext";

// --- INTERFACE DEFINITIONS ---
interface User {
  id: string;
  username: string;
}
interface Category {
  id: string;
  name: string;
  shop: string | null;
  user: User;
}
interface Shop {
  id: string;
  name: string;
  description: string;
  shop_picture?: string;
}
interface FormErrors {
  message?: string;
  name?: string;
  description?: string;
  condition?: string;
  category_admin_id?: string;
  [key: string]: string | undefined;
}
interface MediaPreview {
  file: any;
  preview: string;
  type: "image" | "video";
}
interface GiftVariant {
  id: string;
  title: string;
  quantity: number | "";
  sku_code?: string;
  image?: any | null;
  imagePreview?: string;
  proofImage?: any | null;
  proofImagePreview?: string;
  length?: number | "";
  width?: number | "";
  height?: number | "";
  dimension_unit?: string;
  weight?: number | "";
  weight_unit?: "g" | "kg" | "lb" | "oz";
  critical_trigger?: number | "";
  is_active?: boolean;
}
interface PredictionResult {
  success?: boolean;
  predicted_category?: {
    category_name: string;
    confidence: number;
    category_uuid?: string | null;
  };
  alternative_categories?: Array<{ category_name: string; confidence: number }>;
  all_predictions?: Record<string, number>;
  predicted_class?: string;
  error?: string;
}
interface CreateGiftFormProps {
  selectedShop: Shop | null;
  globalCategories: Category[];
  modelClasses: string[];
  errors: FormErrors;
}

const generateId = () => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

const SCREEN_WIDTH = Dimensions.get("window").width;

// --- CONDITION SCALE ---
const CONDITION_SCALE = {
  1: {
    label: "Poor - Heavy signs of use, may not function perfectly",
    shortLabel: "Poor",
    color: "#FEE2E2",
    textColor: "#991B1B",
    borderColor: "#FECACA",
    stars: 1,
  },
  2: {
    label: "Fair - Visible wear, fully functional",
    shortLabel: "Fair",
    color: "#FFEDD5",
    textColor: "#9A3412",
    borderColor: "#FED7AA",
    stars: 2,
  },
  3: {
    label: "Good - Normal wear, well-maintained",
    shortLabel: "Good",
    color: "#FEF9C3",
    textColor: "#854D0E",
    borderColor: "#FDE047",
    stars: 3,
  },
  4: {
    label: "Very Good - Minimal wear, almost like new",
    shortLabel: "Very Good",
    color: "#DBEAFE",
    textColor: "#1E40AF",
    borderColor: "#BFDBFE",
    stars: 4,
  },
  5: {
    label: "Like New - No signs of use, original packaging",
    shortLabel: "Like New",
    color: "#DCFCE7",
    textColor: "#166534",
    borderColor: "#BBF7D0",
    stars: 5,
  },
} as const;

type ConditionValue = keyof typeof CONDITION_SCALE;

const weightUnitOptions = ["g", "kg", "lb", "oz"];
const dimensionUnitOptions = ["cm", "m", "in", "ft"];

const normalizeText = (s: string) => {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .join(" ");
};

const tokenSimilarity = (a: string, b: string) => {
  const ta = new Set(normalizeText(a).split(" "));
  const tb = new Set(normalizeText(b).split(" "));
  if (ta.size === 0 || tb.size === 0) return 0;
  const inter = [...ta].filter((x) => tb.has(x)).length;
  const union = new Set([...ta, ...tb]).size;
  return union === 0 ? 0 : inter / union;
};

const findBestCategoryMatch = (predictedName: string, globalCategories: Category[]) => {
  const scores = globalCategories.map((gc) => ({
    category: gc,
    score: tokenSimilarity(predictedName, gc.name),
  }));
  scores.sort((a, b) => b.score - a.score);
  return scores[0] || null;
};

export default function CreateGiftForm({
  selectedShop,
  globalCategories,
  modelClasses,
  errors: externalErrors,
}: CreateGiftFormProps) {
  const { userId } = useAuth();

  // Form state
  const [giftName, setGiftName] = useState("");
  const [giftDescription, setGiftDescription] = useState("");
  const [giftCondition, setGiftCondition] = useState<ConditionValue | "">("");
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>("");

  // Media state
  const [mainMedia, setMainMedia] = useState<MediaPreview[]>([]);

  // Variants state - NO PRICE FIELDS (gifts are free)
  const [variants, setVariants] = useState<GiftVariant[]>([
    {
      id: generateId(),
      title: "",
      quantity: "",
      sku_code: "",
      weight_unit: "g",
      dimension_unit: "cm",
      is_active: true,
    },
  ]);

  // UI state
  const [currentStep, setCurrentStep] = useState(1);
  const [expandedVariants, setExpandedVariants] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiResponseError, setApiResponseError] = useState<string | null>(null);

  // Modal state
  const [conditionModalVisible, setConditionModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [weightUnitModal, setWeightUnitModal] = useState<{
    visible: boolean;
    variantId: string | null;
  }>({ visible: false, variantId: null });
  const [dimensionUnitModal, setDimensionUnitModal] = useState<{
    visible: boolean;
    variantId: string | null;
  }>({ visible: false, variantId: null });

  // Prediction state
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);
  const [predictionError, setPredictionError] = useState<string | null>(null);
  const predictionAbortController = useRef<AbortController | null>(null);

  // Update first variant title when gift name changes
  useEffect(() => {
    setVariants((prev) =>
      prev.map((variant, index) =>
        index === 0 ? { ...variant, title: giftName || "Default" } : variant,
      ),
    );
  }, [giftName]);

  // --- MEDIA ---
  const pickMedia = async () => {
    if (mainMedia.length >= 9) {
      Alert.alert("Limit Reached", "Maximum 9 media files allowed");
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow access to your camera");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const fileName = asset.uri.split("/").pop() || `photo_${Date.now()}.jpg`;

      const newMedia = {
        file: {
          uri: asset.uri,
          name: fileName,
          type: "image/jpeg",
        },
        preview: asset.uri,
        type: "image" as const,
      };

      setMainMedia((prev) => [...prev, newMedia]);
      analyzeImages([
        {
          uri: asset.uri,
          name: fileName,
          type: "image/jpeg",
        },
      ]);
    }
  };

  const removeMainMedia = (index: number) => {
    setMainMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const analyzeImages = async (files: any[]) => {
    if (files.length === 0) return;

    if (predictionAbortController.current) {
      predictionAbortController.current.abort();
    }
    predictionAbortController.current = new AbortController();

    setIsPredicting(true);
    setPredictionError(null);

    try {
      const requests = files.map((file) => {
        const formData = new FormData();
        formData.append("image", {
          uri: file.uri,
          name: file.name,
          type: file.type,
        } as any);

        return AxiosInstance.post("/predict/", formData, {
          headers: { "Content-Type": "multipart/form-data" },
          signal: predictionAbortController.current!.signal,
        });
      });

      const settled = await Promise.allSettled(requests);
      const successful = settled.filter(
        (s) => s.status === "fulfilled",
      ) as PromiseFulfilledResult<any>[];

      if (successful.length === 0) {
        setPredictionError("All image predictions failed");
        return;
      }

      const aggregateScores: Record<string, number> = {};
      let count = 0;

      successful.forEach((res) => {
        const data = res.value?.data;
        if (!data || !data.success || !data.predictions) return;
        const p = data.predictions;

        if (p.all_predictions && typeof p.all_predictions === "object") {
          Object.entries(p.all_predictions).forEach(([cls, score]) => {
            aggregateScores[cls] =
              (aggregateScores[cls] || 0) + Number(score || 0);
          });
        } else if (p.predicted_class) {
          const cls = String(p.predicted_class);
          const conf = Number(p.confidence || 1);
          aggregateScores[cls] = (aggregateScores[cls] || 0) + conf;
        }

        count += 1;
      });

      if (count === 0) {
        setPredictionError("No valid predictions received");
        return;
      }

      Object.keys(aggregateScores).forEach((k) => {
        aggregateScores[k] = aggregateScores[k] / count;
      });

      const sorted = Object.entries(aggregateScores).sort(
        (a, b) => b[1] - a[1],
      );
      const topClass = sorted[0]?.[0] || "Unknown";
      const topConfidence = Number(sorted[0]?.[1] || 0);

      const mapped: PredictionResult = {
        success: true,
        predicted_category: {
          category_name: topClass,
          confidence: topConfidence,
          category_uuid: null,
        },
        alternative_categories: sorted
          .slice(1, 4)
          .map((s) => ({ category_name: s[0], confidence: s[1] })),
        all_predictions: Object.fromEntries(sorted),
        predicted_class: topClass,
      };

      setPredictionResult(mapped);

      if (mapped.predicted_category?.category_name && globalCategories) {
        const predictedName = mapped.predicted_category.category_name.toLowerCase();
        const found = globalCategories.find(
          (gc: any) => gc.name.toLowerCase() === predictedName,
        );
        if (found) {
          setSelectedCategoryName(found.name);
        }
      }
    } catch (error: any) {
      if (error.name === "AbortError" || error.code === "ERR_CANCELED") {
        return;
      }
      setPredictionError("Prediction request failed");
    } finally {
      setIsPredicting(false);
      predictionAbortController.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (predictionAbortController.current) {
        predictionAbortController.current.abort();
      }
      mainMedia.forEach((item) => URL.revokeObjectURL(item.preview));
      variants.forEach((variant) => {
        if (variant.imagePreview) URL.revokeObjectURL(variant.imagePreview);
        if (variant.proofImagePreview)
          URL.revokeObjectURL(variant.proofImagePreview);
      });
    };
  }, []);

  // --- VARIANTS ---
  const addVariant = () => {
    setVariants((prev) => [
      ...prev,
      {
        id: generateId(),
        title: `Variant ${prev.length + 1}`,
        quantity: "",
        sku_code: "",
        weight_unit: "g",
        dimension_unit: "cm",
        is_active: true,
      },
    ]);
  };

  const removeVariant = (variantId: string) => {
    if (variants.length <= 1) {
      Alert.alert("Cannot Remove", "Gifts must have at least one variant");
      return;
    }

    const variant = variants.find((v) => v.id === variantId);
    if (variant?.imagePreview) URL.revokeObjectURL(variant.imagePreview);
    if (variant?.proofImagePreview)
      URL.revokeObjectURL(variant.proofImagePreview);

    setVariants((prev) => prev.filter((v) => v.id !== variantId));
  };

  const updateVariantField = (
    variantId: string,
    field: keyof GiftVariant,
    value: any,
  ) => {
    setVariants((prev) =>
      prev.map((v) => (v.id === variantId ? { ...v, [field]: value } : v)),
    );
  };

  const handleVariantImagePick = async (variantId: string) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow camera access");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setVariants((prev) =>
        prev.map((v) =>
          v.id === variantId
            ? {
                ...v,
                image: {
                  uri: asset.uri,
                  name: asset.uri.split("/").pop() || `variant_${variantId}.jpg`,
                  type: "image/jpeg",
                },
                imagePreview: asset.uri,
              }
            : v,
        ),
      );
    }
  };

  const handleProofImagePick = async (variantId: string) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow camera access");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setVariants((prev) =>
        prev.map((v) =>
          v.id === variantId
            ? {
                ...v,
                proofImage: {
                  uri: asset.uri,
                  name: asset.uri.split("/").pop() || `proof_${variantId}.jpg`,
                  type: "image/jpeg",
                },
                proofImagePreview: asset.uri,
              }
            : v,
        ),
      );
    }
  };

  const toggleVariantExpand = (variantId: string) => {
    setExpandedVariants((prev) => ({ ...prev, [variantId]: !prev[variantId] }));
  };

  // --- VALIDATION & SUBMIT ---
  const validateForm = () => {
    if (!giftName.trim()) {
      Alert.alert("Validation Error", "Gift name is required");
      return false;
    }
    if (!giftDescription.trim()) {
      Alert.alert("Validation Error", "Description is required");
      return false;
    }
    if (!giftCondition) {
      Alert.alert("Validation Error", "Condition rating is required");
      return false;
    }
    if (variants.length === 0) {
      Alert.alert("Validation Error", "At least one variant is required");
      return false;
    }
    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      if (!v.title) {
        Alert.alert("Validation Error", `Variant ${i + 1} title is required`);
        return false;
      }
      if (!v.quantity || Number(v.quantity) <= 0) {
        Alert.alert(
          "Validation Error",
          `Variant ${i + 1} quantity must be greater than 0`,
        );
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    if (!userId) {
      Alert.alert("Error", "User not authenticated");
      return;
    }

    setSubmitting(true);
    setApiResponseError(null);

    try {
      const formData = new FormData();

      // Basic fields
      formData.append("name", giftName.trim());
      formData.append("description", giftDescription.trim());
      formData.append("condition", giftCondition.toString());
      formData.append("shop", selectedShop?.id ?? "");
      formData.append("status", "active");
      formData.append("customer_id", userId);
      formData.append("is_gift", "true");

      // Price is forced to 0 for gifts
      formData.append("price", "0");
      formData.append("is_refundable", "false");
      formData.append("refundable", "false");
      formData.append("refund_days", "0");

      // Category handling
      if (selectedCategoryName?.trim()) {
        let match = globalCategories.find(
          (gc) => gc.name.toLowerCase() === selectedCategoryName.toLowerCase(),
        );
        if (!match) {
          const best = findBestCategoryMatch(selectedCategoryName, globalCategories);
          if (best && best.score >= 0.25) {
            match = best.category;
          }
        }

        if (match) {
          formData.append("category_admin_id", match.id);
        } else {
          const nameToSend =
            selectedCategoryName && selectedCategoryName.toLowerCase() === "others"
              ? "others"
              : selectedCategoryName;
          formData.append("category_admin_name", nameToSend);
        }
      }

      // Add media files
      mainMedia.forEach((file) => {
        if (file.file.size > 0) {
          formData.append("media_files", {
            uri: file.file.uri,
            name: file.file.name,
            type: file.file.type,
          } as any);
        }
      });

      // Add variants payload - NO PRICE FIELDS
      const variantsPayload = variants.map((v) => ({
        id: v.id,
        title: v.title,
        price: 0, // Gifts are free
        quantity: v.quantity,
        length: v.length !== undefined && v.length !== "" ? Number(v.length) : null,
        width: v.width !== undefined && v.width !== "" ? Number(v.width) : null,
        height: v.height !== undefined && v.height !== "" ? Number(v.height) : null,
        dimension_unit: v.dimension_unit || "cm",
        weight: v.weight !== undefined && v.weight !== "" ? Number(v.weight) : null,
        weight_unit: v.weight_unit || "g",
        sku_code: v.sku_code,
        critical_trigger: v.critical_trigger || null,
        is_refundable: false,
        is_active: v.is_active ?? true,
        // No depreciation fields for gifts
      }));

      formData.append("variants", JSON.stringify(variantsPayload));

      // Add variant images
      variants.forEach((v) => {
        if (v.image) {
          formData.append(`variant_image_${v.id}`, {
            uri: v.image.uri,
            name: v.image.name,
            type: v.image.type,
          } as any);
        }
        if (v.proofImage) {
          formData.append(`proof_image_${v.id}`, {
            uri: v.proofImage.uri,
            name: v.proofImage.name,
            type: v.proofImage.type,
          } as any);
        }
      });

      const response = await AxiosInstance.post("/seller-products/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.success) {
        Alert.alert("Success", "Gift created successfully!", [
          {
            text: "OK",
            onPress: () =>
              router.replace(`/seller/gifts?shopId=${selectedShop?.id}`),
          },
        ]);
      } else {
        throw new Error(response.data.message || "Gift creation failed");
      }
    } catch (err: any) {
      console.error("Gift creation failed:", err.response?.data || err.message);

      if (err.response?.data) {
        const apiErrors = err.response.data;
        if (typeof apiErrors === "object") {
          const fieldErrors = Object.keys(apiErrors)
            .map(
              (field) =>
                `${field}: ${Array.isArray(apiErrors[field]) ? apiErrors[field][0] : apiErrors[field]}`,
            )
            .join("\n");
          setApiResponseError(fieldErrors);
        } else if (typeof apiErrors === "string") {
          setApiResponseError(apiErrors);
        }
      } else {
        setApiResponseError(err.message || "Gift creation failed");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // --- STEP INDICATOR ---
  const StepIndicator = () => (
    <View style={styles.progressContainer}>
      {[
        { n: 1, label: "1. Basic" },
        { n: 2, label: "2. Media" },
        { n: 3, label: "3. Variants" },
        { n: 4, label: "4. Review" },
      ].map(({ n, label }, i, arr) => (
        <React.Fragment key={n}>
          <View
            style={[styles.stepBadge, currentStep >= n && styles.stepActive]}
          >
            <Text
              style={[
                styles.stepBadgeText,
                currentStep >= n && styles.stepTextActive,
              ]}
            >
              {label}
            </Text>
          </View>
          {i < arr.length - 1 && (
            <View
              style={[
                styles.stepLine,
                currentStep > n && styles.stepLineActive,
              ]}
            />
          )}
        </React.Fragment>
      ))}
    </View>
  );

  // --- CONDITION STARS ---
  const StarRow = ({ count }: { count: number }) => (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Text
          key={i}
          style={{ color: i <= count ? "#F59E0B" : "#D1D5DB", fontSize: 14 }}
        >
          ★
        </Text>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <StepIndicator />

      {/* ===== STEP 1: Basic Information ===== */}
      {currentStep === 1 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons name="gift-outline" size={20} color="#EA580C" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Basic Information</Text>
              <Text style={styles.sectionSubtitle}>
                Start with gift details. AI will suggest a category when you upload images.
              </Text>
            </View>
          </View>

          {selectedShop && (
            <View style={styles.shopInfoCard}>
              <Ionicons name="storefront-outline" size={16} color="#EA580C" />
              <Text style={styles.shopInfoText}>Shop: {selectedShop.name}</Text>
            </View>
          )}

          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Gift Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={giftName}
              onChangeText={setGiftName}
              placeholder="Enter gift name"
              placeholderTextColor="#9CA3AF"
              maxLength={100}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Condition Rating <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setConditionModalVisible(true)}
            >
              {giftCondition ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    flex: 1,
                  }}
                >
                  <StarRow count={CONDITION_SCALE[giftCondition].stars} />
                  <Text style={styles.selectButtonText} numberOfLines={1}>
                    {CONDITION_SCALE[giftCondition].shortLabel}
                  </Text>
                </View>
              ) : (
                <Text style={styles.placeholderText}>
                  Select condition rating
                </Text>
              )}
              <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
            </TouchableOpacity>
            {giftCondition ? (
              <View
                style={[
                  styles.conditionBadge,
                  {
                    backgroundColor: CONDITION_SCALE[giftCondition].color,
                    borderColor: CONDITION_SCALE[giftCondition].borderColor,
                  },
                ]}
              >
                <StarRow count={CONDITION_SCALE[giftCondition].stars} />
                <Text
                  style={[
                    styles.conditionBadgeText,
                    { color: CONDITION_SCALE[giftCondition].textColor },
                  ]}
                >
                  {CONDITION_SCALE[giftCondition].label}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Description <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={giftDescription}
              onChangeText={setGiftDescription}
              placeholder="Describe your gift in detail..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              maxLength={1000}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
            style={styles.nextButton}
            onPress={() => setCurrentStep(2)}
          >
            <Text style={styles.nextButtonText}>Next: Media</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* ===== STEP 2: Media & Category ===== */}
      {currentStep === 2 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons name="camera" size={20} color="#EA580C" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Gift Photos</Text>
              <Text style={styles.sectionSubtitle}>
                Take photos with your camera (max 9). First photo is the cover.
              </Text>
            </View>
            <View style={styles.mediaCountBadge}>
              <Text style={styles.mediaCountBadgeText}>
                {mainMedia.length}/9
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.cameraArea} onPress={pickMedia}>
            <Ionicons name="camera" size={40} color="#9CA3AF" />
            <Text style={styles.cameraAreaText}>
              Take photos of your gift (max 9 photos)
            </Text>
            <View style={styles.cameraButton}>
              <Ionicons name="camera-outline" size={16} color="#EA580C" />
              <Text style={styles.cameraButtonText}>Open Camera</Text>
            </View>
          </TouchableOpacity>

          {mainMedia.length > 0 && (
            <View style={styles.mediaGrid}>
              {mainMedia.map((item, index) => (
                <View key={index} style={styles.mediaGridItem}>
                  <Image
                    source={{ uri: item.preview }}
                    style={styles.mediaGridImage}
                  />
                  {index === 0 && (
                    <View style={styles.coverBadge}>
                      <Text style={styles.coverBadgeText}>Cover</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.removeMediaBtn}
                    onPress={() => removeMainMedia(index)}
                  >
                    <Ionicons name="close-circle" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
              {mainMedia.length < 9 && (
                <TouchableOpacity
                  style={styles.addMoreMedia}
                  onPress={pickMedia}
                >
                  <Ionicons name="camera" size={24} color="#9CA3AF" />
                  <Text style={styles.addMoreMediaText}>Take Another</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={styles.aiSection}>
            <View style={styles.aiHeader}>
              <View style={styles.aiTitleContainer}>
                <Ionicons name="sparkles" size={18} color="#EA580C" />
                <Text style={styles.aiTitle}>AI Category Prediction</Text>
              </View>
              {predictionResult && (
                <View style={styles.aiReadyBadge}>
                  <Text style={styles.aiReadyText}>Ready</Text>
                </View>
              )}
            </View>
            <View style={styles.aiContent}>
              <View style={styles.aiRow}>
                <Text style={styles.aiDescription}>
                  Analyze photos to get AI category suggestions
                </Text>
                <TouchableOpacity
                  style={[
                    styles.analyzeButton,
                    (mainMedia.length === 0 || isPredicting) &&
                      styles.analyzeButtonDisabled,
                  ]}
                  onPress={() =>
                    analyzeImages(
                      mainMedia
                        .filter((m) => m.type === "image")
                        .map((m) => m.file),
                    )
                  }
                  disabled={mainMedia.length === 0 || isPredicting}
                >
                  {isPredicting ? (
                    <ActivityIndicator size="small" color="#EA580C" />
                  ) : (
                    <Text style={styles.analyzeButtonText}>Analyze Photos</Text>
                  )}
                </TouchableOpacity>
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Category</Text>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => setCategoryModalVisible(true)}
                >
                  <Text
                    style={
                      selectedCategoryName
                        ? styles.selectButtonText
                        : styles.placeholderText
                    }
                  >
                    {selectedCategoryName || "Select category"}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
              {predictionResult && predictionResult.predicted_category && (
                <View style={styles.predictionCard}>
                  <Text style={styles.predictionTitle}>AI Suggestion</Text>
                  <View style={styles.predictionRow}>
                    <Text style={styles.predictionCategory}>
                      {predictionResult.predicted_category.category_name}
                    </Text>
                    <Text style={styles.predictionConfidence}>
                      {Math.round(
                        (predictionResult.predicted_category.confidence || 0) *
                          100,
                      )}
                      % confidence
                    </Text>
                  </View>
                  {predictionResult.alternative_categories &&
                    predictionResult.alternative_categories.length > 0 && (
                      <Text style={styles.alternativeText}>
                        Also considered:{" "}
                        {predictionResult.alternative_categories
                          .map((a) => a.category_name)
                          .join(", ")}
                      </Text>
                    )}
                </View>
              )}
              {predictionError && (
                <View style={styles.errorCard}>
                  <Text style={styles.errorCardText}>{predictionError}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.navigationButtons}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setCurrentStep(1)}
            >
              <Ionicons name="arrow-back" size={20} color="#6B7280" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.nextButton}
              onPress={() => setCurrentStep(3)}
            >
              <Text style={styles.nextButtonText}>Next: Variants</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ===== STEP 3: Variants ===== */}
      {currentStep === 3 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons name="cube" size={20} color="#EA580C" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Gift Variants</Text>
              <Text style={styles.sectionSubtitle}>
                Each gift must have at least one variant with stock
              </Text>
            </View>
            <View style={styles.requiredBadge}>
              <Text style={styles.requiredBadgeText}>Required</Text>
            </View>
          </View>

          {variants.map((variant, index) => (
            <View key={variant.id} style={styles.variantCard}>
              <TouchableOpacity
                style={styles.variantHeader}
                onPress={() => toggleVariantExpand(variant.id)}
              >
                <View style={styles.variantHeaderLeft}>
                  <View style={styles.variantNumber}>
                    <Text style={styles.variantNumberText}>{index + 1}</Text>
                  </View>
                  <View>
                    <Text style={styles.variantTitle}>
                      {variant.title || `Variant ${index + 1}`}
                    </Text>
                  </View>
                </View>
                <View style={styles.variantHeaderRight}>
                  {index === 0 && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>Default</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    onPress={() => removeVariant(variant.id)}
                    disabled={variants.length === 1}
                  >
                    <Ionicons
                      name="close"
                      size={20}
                      color={variants.length === 1 ? "#D1D5DB" : "#EF4444"}
                    />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>

              {expandedVariants[variant.id] && (
                <View style={styles.variantContent}>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Variant Image</Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      {variant.imagePreview ? (
                        <View style={styles.variantImageContainer}>
                          <Image
                            source={{ uri: variant.imagePreview }}
                            style={styles.variantImage}
                          />
                          <TouchableOpacity
                            style={styles.removeVariantImage}
                            onPress={() => {
                              updateVariantField(variant.id, "image", null);
                              updateVariantField(
                                variant.id,
                                "imagePreview",
                                undefined,
                              );
                            }}
                          >
                            <Ionicons
                              name="close-circle"
                              size={20}
                              color="#EF4444"
                            />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.addVariantImageBtn}
                          onPress={() => handleVariantImagePick(variant.id)}
                        >
                          <Ionicons name="camera" size={24} color="#9CA3AF" />
                          <Text style={styles.addVariantImageText}>
                            Add Photo
                          </Text>
                        </TouchableOpacity>
                      )}
                      <Text style={styles.variantImageHint}>
                        Main gift image for this variant
                      </Text>
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>
                      Title <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                      style={styles.input}
                      value={variant.title}
                      onChangeText={(text) =>
                        updateVariantField(variant.id, "title", text)
                      }
                      placeholder="e.g., Small, Red, etc."
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>

                  <View style={styles.row}>
                    <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                      <Text style={[styles.label, { marginBottom: 6 }]}>
                        Stock <Text style={styles.required}>*</Text>
                      </Text>
                      <TextInput
                        style={styles.input}
                        value={variant.quantity?.toString() || ""}
                        onChangeText={(text) =>
                          updateVariantField(
                            variant.id,
                            "quantity",
                            parseInt(text) || "",
                          )
                        }
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                    <View style={[styles.formGroup, { flex: 1 }]}>
                      <Text style={styles.label}>SKU Code</Text>
                      <TextInput
                        style={styles.input}
                        value={variant.sku_code || ""}
                        onChangeText={(text) =>
                          updateVariantField(variant.id, "sku_code", text)
                        }
                        placeholder="Optional"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                  </View>

                  <View style={styles.toggleRow}>
                    <View style={styles.toggleContainer}>
                      <Switch
                        value={variant.is_active !== false}
                        onValueChange={(value) =>
                          updateVariantField(variant.id, "is_active", value)
                        }
                        trackColor={{ false: "#E5E7EB", true: "#F97316" }}
                        thumbColor={
                          variant.is_active !== false ? "#EA580C" : "#9CA3AF"
                        }
                      />
                      <Text style={styles.toggleLabel}>Active</Text>
                    </View>
                    <View style={styles.toggleContainer}>
                      <Switch
                        value={false}
                        disabled={true}
                        trackColor={{ false: "#E5E7EB", true: "#F97316" }}
                        thumbColor={"#9CA3AF"}
                      />
                      <Text style={[styles.toggleLabel, { color: "#9CA3AF" }]}>
                        Refundable (Gifts cannot be refunded)
                      </Text>
                    </View>
                  </View>

                  <View style={styles.sectionDivider}>
                    <View style={styles.advancedSectionHeader}>
                      <Ionicons
                        name="resize-outline"
                        size={15}
                        color="#EA580C"
                      />
                      <Text style={styles.advancedSectionTitle}>
                        Dimensions
                      </Text>
                    </View>
                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Size (L × W × H)</Text>
                      <View style={{ flexDirection: "row", gap: 6 }}>
                        <TextInput
                          style={[styles.input, { flex: 1 }]}
                          value={variant.length?.toString() || ""}
                          onChangeText={(t) =>
                            updateVariantField(
                              variant.id,
                              "length",
                              parseFloat(t) || "",
                            )
                          }
                          keyboardType="numeric"
                          placeholder="L"
                          placeholderTextColor="#9CA3AF"
                        />
                        <TextInput
                          style={[styles.input, { flex: 1 }]}
                          value={variant.width?.toString() || ""}
                          onChangeText={(t) =>
                            updateVariantField(
                              variant.id,
                              "width",
                              parseFloat(t) || "",
                            )
                          }
                          keyboardType="numeric"
                          placeholder="W"
                          placeholderTextColor="#9CA3AF"
                        />
                        <TextInput
                          style={[styles.input, { flex: 1 }]}
                          value={variant.height?.toString() || ""}
                          onChangeText={(t) =>
                            updateVariantField(
                              variant.id,
                              "height",
                              parseFloat(t) || "",
                            )
                          }
                          keyboardType="numeric"
                          placeholder="H"
                          placeholderTextColor="#9CA3AF"
                        />
                        <TouchableOpacity
                          style={[styles.selectButton, { width: 56 }]}
                          onPress={() =>
                            setDimensionUnitModal({
                              visible: true,
                              variantId: variant.id,
                            })
                          }
                        >
                          <Text
                            style={[styles.selectButtonText, { fontSize: 12 }]}
                          >
                            {variant.dimension_unit || "cm"}
                          </Text>
                          <Ionicons
                            name="chevron-down"
                            size={12}
                            color="#9CA3AF"
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Weight</Text>
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <TextInput
                          style={[styles.input, { flex: 1 }]}
                          value={variant.weight?.toString() || ""}
                          onChangeText={(t) =>
                            updateVariantField(
                              variant.id,
                              "weight",
                              parseFloat(t) || "",
                            )
                          }
                          keyboardType="numeric"
                          placeholder="0.00"
                          placeholderTextColor="#9CA3AF"
                        />
                        <TouchableOpacity
                          style={[styles.selectButton, { width: 70 }]}
                          onPress={() =>
                            setWeightUnitModal({
                              visible: true,
                              variantId: variant.id,
                            })
                          }
                        >
                          <Text style={styles.selectButtonText}>
                            {variant.weight_unit || "g"}
                          </Text>
                          <Ionicons
                            name="chevron-down"
                            size={14}
                            color="#9CA3AF"
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Low Stock Alert</Text>
                      <TextInput
                        style={styles.input}
                        value={variant.critical_trigger?.toString() || ""}
                        onChangeText={(t) =>
                          updateVariantField(
                            variant.id,
                            "critical_trigger",
                            parseInt(t) || "",
                          )
                        }
                        keyboardType="numeric"
                        placeholder="Alert when stock below this number"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                  </View>

                  <View style={styles.sectionDivider}>
                    <View style={styles.advancedSectionHeader}>
                      <Ionicons
                        name="shield-checkmark-outline"
                        size={15}
                        color="#EA580C"
                      />
                      <Text style={styles.advancedSectionTitle}>
                        Proof of Ownership
                      </Text>
                    </View>
                    <View style={styles.formGroup}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        {variant.proofImagePreview ? (
                          <View style={styles.variantImageContainer}>
                            <Image
                              source={{ uri: variant.proofImagePreview }}
                              style={[
                                styles.variantImage,
                                { borderColor: "#34D399", borderWidth: 2 },
                              ]}
                            />
                            <TouchableOpacity
                              style={styles.removeVariantImage}
                              onPress={() => {
                                updateVariantField(
                                  variant.id,
                                  "proofImage",
                                  null,
                                );
                                updateVariantField(
                                  variant.id,
                                  "proofImagePreview",
                                  undefined,
                                );
                              }}
                            >
                              <Ionicons
                                name="close-circle"
                                size={20}
                                color="#EF4444"
                              />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.addVariantImageBtn}
                            onPress={() => handleProofImagePick(variant.id)}
                          >
                            <Ionicons name="camera" size={24} color="#9CA3AF" />
                            <Text style={styles.addVariantImageText}>
                              Add Proof
                            </Text>
                          </TouchableOpacity>
                        )}
                        <Text style={styles.variantImageHint}>
                          Upload proof of authenticity or condition (receipt,
                          certificate, etc.)
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}
            </View>
          ))}

          <TouchableOpacity
            style={styles.addVariantButton}
            onPress={addVariant}
          >
            <Ionicons name="add" size={20} color="#EA580C" />
            <Text style={styles.addVariantButtonText}>Add Another Variant</Text>
          </TouchableOpacity>

          <View style={styles.variantSummary}>
            <Text style={styles.variantSummaryText}>
              Total Variants: {variants.length}
            </Text>
            <Text style={styles.variantSummaryText}>
              Total Stock:{" "}
              {variants.reduce((sum, v) => sum + (Number(v.quantity) || 0), 0)}{" "}
              units
            </Text>
          </View>

          <View style={styles.navigationButtons}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setCurrentStep(2)}
            >
              <Ionicons name="arrow-back" size={20} color="#6B7280" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.nextButton}
              onPress={() => setCurrentStep(4)}
            >
              <Text style={styles.nextButtonText}>Next: Review</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ===== STEP 4: Review & Submit ===== */}
      {currentStep === 4 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons name="checkmark-circle" size={20} color="#EA580C" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Review & Submit</Text>
              <Text style={styles.sectionSubtitle}>
                Review your gift details before creating
              </Text>
            </View>
          </View>

          <View style={styles.reviewCard}>
            <Text style={styles.reviewCardTitle}>Gift Summary</Text>
            {[
              { label: "Shop", value: selectedShop?.name || "No shop" },
              { label: "Name", value: giftName },
              {
                label: "Condition",
                value: giftCondition
                  ? `${CONDITION_SCALE[giftCondition].shortLabel} (${CONDITION_SCALE[giftCondition].stars}★)`
                  : "Not set",
              },
              {
                label: "Category",
                value: selectedCategoryName || "Not selected",
              },
              { label: "Media", value: `${mainMedia.length} files` },
              { label: "Variants", value: String(variants.length) },
              {
                label: "Total Stock",
                value: `${variants.reduce((sum, v) => sum + (Number(v.quantity) || 0), 0)} units`,
              },
              { label: "Price", value: "FREE (₱0.00)" },
            ].map(({ label, value }) => (
              <View key={label} style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>{label}:</Text>
                <Text style={styles.reviewValue}>{value}</Text>
              </View>
            ))}
          </View>

          {apiResponseError && (
            <View style={styles.apiErrorContainer}>
              <Ionicons name="alert-circle" size={20} color="#EF4444" />
              <Text style={styles.apiErrorText}>{apiResponseError}</Text>
            </View>
          )}

          <View style={styles.submitContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setCurrentStep(3)}
            >
              <Text style={styles.cancelButtonText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.submitButton,
                submitting && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>Create Gift</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ===== MODALS ===== */}

      {/* Condition Modal */}
      <Modal
        visible={conditionModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setConditionModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setConditionModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Condition Rating</Text>
              <TouchableOpacity onPress={() => setConditionModalVisible(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={
                Object.entries(CONDITION_SCALE) as [
                  string,
                  (typeof CONDITION_SCALE)[1],
                ][]
              }
              keyExtractor={([key]) => key}
              renderItem={({ item: [key, cond] }) => {
                const val = parseInt(key) as ConditionValue;
                const isSelected = giftCondition === val;
                return (
                  <TouchableOpacity
                    style={[
                      styles.modalItem,
                      isSelected && { backgroundColor: "#FFF7ED" },
                    ]}
                    onPress={() => {
                      setGiftCondition(val);
                      setConditionModalVisible(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 2,
                        }}
                      >
                        <StarRow count={cond.stars} />
                        <Text
                          style={[styles.modalItemText, { fontWeight: "600" }]}
                        >
                          {cond.shortLabel}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 12, color: "#6B7280" }}>
                        {cond.label}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark" size={20} color="#EA580C" />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Category Modal */}
      <Modal
        visible={categoryModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setCategoryModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity onPress={() => setCategoryModalVisible(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={["Others", ...modelClasses]}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    selectedCategoryName === item && {
                      backgroundColor: "#FFF7ED",
                    },
                  ]}
                  onPress={() => {
                    setSelectedCategoryName(item);
                    setCategoryModalVisible(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item}</Text>
                  {selectedCategoryName === item && (
                    <Ionicons name="checkmark" size={20} color="#EA580C" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Weight Unit Modal */}
      <Modal
        visible={weightUnitModal.visible}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setWeightUnitModal({ visible: false, variantId: null })
        }
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() =>
            setWeightUnitModal({ visible: false, variantId: null })
          }
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Weight Unit</Text>
              <TouchableOpacity
                onPress={() =>
                  setWeightUnitModal({ visible: false, variantId: null })
                }
              >
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={weightUnitOptions}
              keyExtractor={(item) => item}
              renderItem={({ item }) => {
                const current = weightUnitModal.variantId
                  ? variants.find((v) => v.id === weightUnitModal.variantId)
                      ?.weight_unit
                  : null;
                return (
                  <TouchableOpacity
                    style={[
                      styles.modalItem,
                      current === item && { backgroundColor: "#FFF7ED" },
                    ]}
                    onPress={() => {
                      if (weightUnitModal.variantId)
                        updateVariantField(
                          weightUnitModal.variantId,
                          "weight_unit",
                          item,
                        );
                      setWeightUnitModal({ visible: false, variantId: null });
                    }}
                  >
                    <Text style={styles.modalItemText}>{item}</Text>
                    {current === item && (
                      <Ionicons name="checkmark" size={20} color="#EA580C" />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Dimension Unit Modal */}
      <Modal
        visible={dimensionUnitModal.visible}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setDimensionUnitModal({ visible: false, variantId: null })
        }
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() =>
            setDimensionUnitModal({ visible: false, variantId: null })
          }
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Dimension Unit</Text>
              <TouchableOpacity
                onPress={() =>
                  setDimensionUnitModal({ visible: false, variantId: null })
                }
              >
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={dimensionUnitOptions}
              keyExtractor={(item) => item}
              renderItem={({ item }) => {
                const current = dimensionUnitModal.variantId
                  ? variants.find((v) => v.id === dimensionUnitModal.variantId)
                      ?.dimension_unit
                  : null;
                return (
                  <TouchableOpacity
                    style={[
                      styles.modalItem,
                      current === item && { backgroundColor: "#FFF7ED" },
                    ]}
                    onPress={() => {
                      if (dimensionUnitModal.variantId)
                        updateVariantField(
                          dimensionUnitModal.variantId,
                          "dimension_unit",
                          item,
                        );
                      setDimensionUnitModal({
                        visible: false,
                        variantId: null,
                      });
                    }}
                  >
                    <Text style={styles.modalItemText}>{item}</Text>
                    {current === item && (
                      <Ionicons name="checkmark" size={20} color="#EA580C" />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================
const styles = StyleSheet.create({
  container: { flex: 1 },

  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  stepBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  stepActive: { backgroundColor: "#F97316" },
  stepInactive: { backgroundColor: "#F3F4F6" },
  stepBadgeText: { fontSize: 10, fontWeight: "500", color: "#6B7280" },
  stepTextActive: { color: "#FFFFFF" },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 4,
  },
  stepLineActive: { backgroundColor: "#F97316" },

  section: { padding: 16 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
    gap: 12,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFF7ED",
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: { fontSize: 18, fontWeight: "600", color: "#111827" },
  sectionSubtitle: { fontSize: 12, color: "#6B7280", marginTop: 2 },

  shopInfoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF7ED",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  shopInfoText: { fontSize: 14, color: "#C2410C", fontWeight: "500" },

  formGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "500", color: "#374151", marginBottom: 6 },
  required: { color: "#EF4444" },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#FFFFFF",
  },
  textArea: { minHeight: 100, textAlignVertical: "top" },
  errorText: { fontSize: 12, color: "#EF4444", marginTop: 4 },

  conditionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  conditionBadgeText: { fontSize: 12, fontWeight: "500", flex: 1 },

  selectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
  },
  selectButtonText: { fontSize: 14, color: "#111827" },
  placeholderText: { fontSize: 14, color: "#9CA3AF" },

  nextButton: {
    backgroundColor: "#F97316",
    borderRadius: 10,
    minHeight: 50,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  nextButtonText: { fontSize: 15, fontWeight: "600", color: "#FFFFFF" },
  navigationButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    gap: 12,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    minHeight: 50,
    paddingHorizontal: 14,
    gap: 8,
    backgroundColor: "#FFFFFF",
  },
  backButtonText: { fontSize: 14, fontWeight: "500", color: "#6B7280" },

  mediaCountBadge: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  mediaCountBadgeText: { fontSize: 12, color: "#6B7280" },
  cameraArea: {
    borderWidth: 2,
    borderColor: "#D1D5DB",
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
    backgroundColor: "#F9FAFB",
  },
  cameraAreaText: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 8,
    marginBottom: 12,
    textAlign: "center",
  },
  cameraButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#FED7AA",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
  },
  cameraButtonText: { fontSize: 14, color: "#EA580C", fontWeight: "500" },
  mediaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  mediaGridItem: { position: "relative", width: 80, height: 80 },
  mediaGridImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  coverBadge: {
    position: "absolute",
    top: 4,
    left: 4,
    backgroundColor: "#F97316",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  coverBadgeText: { fontSize: 9, fontWeight: "600", color: "#FFFFFF" },
  removeMediaBtn: { position: "absolute", top: -6, right: -6 },
  addMoreMedia: {
    width: 80,
    height: 80,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    borderStyle: "dashed",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
  },
  addMoreMediaText: { fontSize: 10, color: "#9CA3AF", marginTop: 4 },

  aiSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 20,
    overflow: "hidden",
  },
  aiHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFF7ED",
  },
  aiTitleContainer: { flexDirection: "row", alignItems: "center", gap: 8 },
  aiTitle: { fontSize: 15, fontWeight: "600", color: "#111827" },
  aiReadyBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  aiReadyText: { fontSize: 11, fontWeight: "600", color: "#059669" },
  aiContent: { padding: 16 },
  aiRow: { marginBottom: 16 },
  aiDescription: { fontSize: 13, color: "#6B7280", marginBottom: 8 },
  analyzeButton: {
    borderWidth: 1,
    borderColor: "#FED7AA",
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignSelf: "flex-start",
    backgroundColor: "#FFF7ED",
  },
  analyzeButtonDisabled: { opacity: 0.5 },
  analyzeButtonText: { fontSize: 13, fontWeight: "500", color: "#EA580C" },
  predictionCard: {
    backgroundColor: "#FFF7ED",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  predictionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#C2410C",
    marginBottom: 4,
  },
  predictionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  predictionCategory: { fontSize: 14, fontWeight: "500", color: "#7C2D12" },
  predictionConfidence: { fontSize: 12, color: "#EA580C" },
  alternativeText: { fontSize: 11, color: "#EA580C", marginTop: 4 },
  errorCard: {
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  errorCardText: { fontSize: 12, color: "#991B1B" },

  requiredBadge: {
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FED7AA",
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  requiredBadgeText: { fontSize: 12, color: "#EA580C", fontWeight: "500" },

  variantCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  variantHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#F9FAFB",
  },
  variantHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  variantNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F97316",
    alignItems: "center",
    justifyContent: "center",
  },
  variantNumberText: { fontSize: 12, fontWeight: "700", color: "#FFFFFF" },
  variantTitle: { fontSize: 14, fontWeight: "600", color: "#111827" },
  variantHeaderRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  defaultBadge: {
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  defaultBadgeText: { fontSize: 10, fontWeight: "600", color: "#EA580C" },
  variantContent: { padding: 16 },

  variantImageContainer: { position: "relative" },
  variantImage: { width: 80, height: 80, borderRadius: 8 },
  addVariantImageBtn: {
    width: 80,
    height: 80,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    borderStyle: "dashed",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
  },
  addVariantImageText: { fontSize: 10, color: "#9CA3AF", marginTop: 4 },
  variantImageHint: { fontSize: 11, color: "#9CA3AF", flex: 1 },
  removeVariantImage: { position: "absolute", top: -6, right: -6 },

  row: { flexDirection: "row" },

  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    marginBottom: 16,
  },
  toggleContainer: { flexDirection: "row", alignItems: "center", gap: 8 },
  toggleLabel: { fontSize: 14, color: "#374151" },

  sectionDivider: {
    marginTop: 12,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  advancedSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  advancedSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },

  addVariantButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FED7AA",
    borderStyle: "dashed",
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
    gap: 8,
  },
  addVariantButtonText: { fontSize: 14, fontWeight: "500", color: "#EA580C" },
  variantSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  variantSummaryText: { fontSize: 13, color: "#4B5563" },

  reviewCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  reviewCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 16,
  },
  reviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  reviewLabel: { fontSize: 14, color: "#6B7280" },
  reviewValue: { fontSize: 14, fontWeight: "500", color: "#111827" },

  apiErrorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  apiErrorText: { flex: 1, fontSize: 13, color: "#991B1B" },

  submitContainer: { flexDirection: "row", gap: 12, marginTop: 20 },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  cancelButtonText: { fontSize: 14, fontWeight: "500", color: "#6B7280" },
  submitButton: {
    flex: 2,
    backgroundColor: "#F97316",
    borderRadius: 8,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  submitButtonDisabled: { backgroundColor: "#9CA3AF" },
  submitButtonText: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: { fontSize: 18, fontWeight: "600", color: "#111827" },
  modalItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalItemText: { fontSize: 15, color: "#374151" },
});