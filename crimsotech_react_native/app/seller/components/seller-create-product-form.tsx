// app/seller/components/CreateProductForm.tsx
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
interface Depreciation {
  originalPrice: number | "";
  usagePeriod: number | "";
  usageUnit: "weeks" | "months" | "years";
  depreciationRate: number | "";
  calculatedPrice: number | "";
  purchaseDate?: Date | null;
}
interface Variant {
  id: string;
  title: string;
  price: number | "";
  compare_price?: number | "";
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
  refundable?: boolean;
  depreciation: Depreciation;
  attributes?: Record<string, string>;
  value_added_tax?: number | ""; // VAT field
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
interface CreateProductFormProps {
  selectedShop: Shop | null;
  globalCategories: Category[];
  modelClasses: string[];
  errors: FormErrors;
}
const generateId = () => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};
// --- CONDITION SCALE (matches web UI) ---
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
const usageUnitOptions = [
  { label: "Weeks", value: "weeks" },
  { label: "Months", value: "months" },
  { label: "Years", value: "years" },
];
const SCREEN_WIDTH = Dimensions.get("window").width;
// Simple date picker helper
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
function formatDate(date: Date): string {
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}
function diffInMonths(from: Date, to: Date): number {
  const yearDiff = to.getFullYear() - from.getFullYear();
  const monthDiff = to.getMonth() - from.getMonth();
  let months = yearDiff * 12 + monthDiff;
  if (to.getDate() < from.getDate()) {
    months--;
  }
  return Math.max(0, months);
}
function diffInWeeks(from: Date, to: Date): number {
  const diffTime = Math.abs(to.getTime() - from.getTime());
  const weeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
  return Math.max(0, weeks);
}
function diffInYears(from: Date, to: Date): number {
  let years = to.getFullYear() - from.getFullYear();
  if (
    to.getMonth() < from.getMonth() ||
    (to.getMonth() === from.getMonth() && to.getDate() < from.getDate())
  ) {
    years--;
  }
  return Math.max(0, years);
}
// --- SLIDER COMPONENT ---
interface SliderProps {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}
function OrangeSlider({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 0.5,
}: SliderProps) {
  const sliderWidth = SCREEN_WIDTH - 96;
  const thumbSize = 22;
  const valueToX = (v: number) =>
    ((v - min) / (max - min)) * (sliderWidth - thumbSize);
  const xToValue = (x: number) => {
    const raw = (x / (sliderWidth - thumbSize)) * (max - min) + min;
    const stepped = Math.round(raw / step) * step;
    return Math.max(min, Math.min(max, parseFloat(stepped.toFixed(1))));
  };
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const x = evt.nativeEvent.locationX - thumbSize / 2;
        onValueChange(xToValue(x));
      },
      onPanResponderMove: (evt) => {
        const x = evt.nativeEvent.locationX - thumbSize / 2;
        onValueChange(xToValue(x));
      },
    }),
  ).current;
  const thumbX = valueToX(value);
  const fillWidth = thumbX + thumbSize / 2;
  return (
    <View
      style={{ height: 40, justifyContent: "center" }}
      {...panResponder.panHandlers}
    >
      <View style={sliderStyles.track}>
        <View style={[sliderStyles.fill, { width: Math.max(0, fillWidth) }]} />
        <View style={[sliderStyles.thumb, { left: Math.max(0, thumbX) }]} />
      </View>
      <View style={sliderStyles.ticks}>
        {[0, 25, 50, 75, 100].map((tick) => (
          <Text key={tick} style={sliderStyles.tickLabel}>
            {tick}%
          </Text>
        ))}
      </View>
    </View>
  );
}
const sliderStyles = StyleSheet.create({
  track: {
    height: 6,
    backgroundColor: "#FED7AA",
    borderRadius: 3,
    position: "relative",
  },
  fill: {
    position: "absolute",
    left: 0,
    top: 0,
    height: 6,
    backgroundColor: "#F97316",
    borderRadius: 3,
  },
  thumb: {
    position: "absolute",
    top: -8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#EA580C",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  ticks: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
  },
  tickLabel: {
    fontSize: 10,
    color: "#9CA3AF",
    fontWeight: "500",
  },
});
// --- DATE PICKER MODAL ---
interface DatePickerModalProps {
  visible: boolean;
  selectedDate?: Date | null;
  onSelect: (date: Date) => void;
  onClose: () => void;
}
function DatePickerModal({
  visible,
  selectedDate,
  onSelect,
  onClose,
}: DatePickerModalProps) {
  const today = new Date();
  const [year, setYear] = useState(
    selectedDate?.getFullYear() ?? today.getFullYear(),
  );
  const [month, setMonth] = useState(
    selectedDate?.getMonth() ?? today.getMonth(),
  );
  const [day, setDay] = useState(selectedDate?.getDate() ?? today.getDate());
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const years = Array.from({ length: 30 }, (_, i) => today.getFullYear() - i);
  const handleConfirm = () => {
    const safeDay = Math.min(day, daysInMonth);
    onSelect(new Date(year, month, safeDay));
    onClose();
  };
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={dpStyles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={dpStyles.container}>
          <View style={dpStyles.header}>
            <Text style={dpStyles.title}>Purchase Date</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </View>
          <View style={dpStyles.pickerRow}>
            <View style={dpStyles.pickerCol}>
              <Text style={dpStyles.pickerLabel}>Month</Text>
              <ScrollView
                style={dpStyles.pickerScroll}
                showsVerticalScrollIndicator={false}
              >
                {MONTHS.map((m, i) => (
                  <TouchableOpacity
                    key={m}
                    style={[
                      dpStyles.pickerItem,
                      month === i && dpStyles.pickerItemActive,
                    ]}
                    onPress={() => setMonth(i)}
                  >
                    <Text
                      style={[
                        dpStyles.pickerItemText,
                        month === i && dpStyles.pickerItemTextActive,
                      ]}
                    >
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <View style={dpStyles.pickerCol}>
              <Text style={dpStyles.pickerLabel}>Day</Text>
              <ScrollView
                style={dpStyles.pickerScroll}
                showsVerticalScrollIndicator={false}
              >
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(
                  (d) => (
                    <TouchableOpacity
                      key={d}
                      style={[
                        dpStyles.pickerItem,
                        day === d && dpStyles.pickerItemActive,
                      ]}
                      onPress={() => setDay(d)}
                    >
                      <Text
                        style={[
                          dpStyles.pickerItemText,
                          day === d && dpStyles.pickerItemTextActive,
                        ]}
                      >
                        {d}
                      </Text>
                    </TouchableOpacity>
                  ),
                )}
              </ScrollView>
            </View>
            <View style={dpStyles.pickerCol}>
              <Text style={dpStyles.pickerLabel}>Year</Text>
              <ScrollView
                style={dpStyles.pickerScroll}
                showsVerticalScrollIndicator={false}
              >
                {years.map((y) => (
                  <TouchableOpacity
                    key={y}
                    style={[
                      dpStyles.pickerItem,
                      year === y && dpStyles.pickerItemActive,
                    ]}
                    onPress={() => setYear(y)}
                  >
                    <Text
                      style={[
                        dpStyles.pickerItemText,
                        year === y && dpStyles.pickerItemTextActive,
                      ]}
                    >
                      {y}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
          <TouchableOpacity
            style={dpStyles.confirmButton}
            onPress={handleConfirm}
          >
            <Text style={dpStyles.confirmButtonText}>Confirm Date</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
const dpStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  pickerRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  pickerCol: {
    flex: 1,
  },
  pickerLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  pickerScroll: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
  },
  pickerItem: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  pickerItemActive: {
    backgroundColor: "#FFF7ED",
  },
  pickerItemText: {
    fontSize: 14,
    color: "#374151",
  },
  pickerItemTextActive: {
    color: "#EA580C",
    fontWeight: "700",
  },
  confirmButton: {
    backgroundColor: "#F97316",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  confirmButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
});
// ============================================================
// MAIN COMPONENT
// ============================================================
export default function CreateProductForm({
  selectedShop,
  globalCategories,
  modelClasses,
  errors: externalErrors,
}: CreateProductFormProps) {
  const { userId } = useAuth();
  // Form state
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productCondition, setProductCondition] = useState<ConditionValue | "">(
    "",
  );
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>("");
  const [productRefundable, setProductRefundable] = useState(true);
  // Media state
  const [mainMedia, setMainMedia] = useState<MediaPreview[]>([]);
  // Variants state
  const [variants, setVariants] = useState<Variant[]>([
    {
      id: generateId(),
      title: "",
      price: "",
      quantity: "",
      sku_code: "",
      weight_unit: "g",
      dimension_unit: "cm",
      is_active: true,
      refundable: true,
      value_added_tax: 12,  // Changed from 0 to 12 (12% default)
      depreciation: {
        originalPrice: "",
        usagePeriod: "",
        usageUnit: "months",
        depreciationRate: 10,
        calculatedPrice: "",
        purchaseDate: null,
      },
    },
  ]);
  // UI state
  const [currentStep, setCurrentStep] = useState(1);
  const [expandedVariants, setExpandedVariants] = useState<
    Record<string, boolean>
  >({});
  const [expandedAdvanced, setExpandedAdvanced] = useState<
    Record<string, boolean>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [apiResponseError, setApiResponseError] = useState<string | null>(null);
  const [apiResponseMessage, setApiResponseMessage] = useState<string | null>(
    null,
  );
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
  const [usageUnitModalVisible, setUsageUnitModalVisible] = useState<{
    visible: boolean;
    variantId: string | null;
  }>({ visible: false, variantId: null });
  const [datePickerModal, setDatePickerModal] = useState<{
    visible: boolean;
    variantId: string | null;
  }>({ visible: false, variantId: null });
  // Prediction state
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictionResult, setPredictionResult] =
    useState<PredictionResult | null>(null);
  const [predictionError, setPredictionError] = useState<string | null>(null);
  const predictionAbortController = useRef<AbortController | null>(null);
  // Update first variant title when product name changes
  useEffect(() => {
    setVariants((prev) =>
      prev.map((variant, index) =>
        index === 0 ? { ...variant, title: productName || "Default" } : variant,
      ),
    );
  }, [productName]);
  // --- DEPRECIATION ---
  const calculateDepreciatedPrice = (
    originalPrice: number,
    usagePeriod: number,
    usageUnit: string,
    depreciationRate: number,
  ): number => {
    if (!originalPrice || originalPrice <= 0) return originalPrice;
    if (!usagePeriod || usagePeriod <= 0) return originalPrice;
    if (!depreciationRate || depreciationRate <= 0) return originalPrice;
    // Convert usage period to years
    let years = usagePeriod;
    if (usageUnit === "months") years = usagePeriod / 12;
    else if (usageUnit === "weeks") years = usagePeriod / 52;
    else if (usageUnit === "days") years = usagePeriod / 365;
    // Calculate depreciated value: P * (1 - r)^n
    const rate = depreciationRate / 100;
    const depreciatedValue = originalPrice * Math.pow(1 - rate, years);
    return Math.round(Math.max(0, depreciatedValue) * 100) / 100;
  };

  const calcAndUpdate = (v: Variant, updatedDep: Depreciation): Variant => {
    const origPrice = Number(updatedDep.originalPrice);
    const usagePeriod = Number(updatedDep.usagePeriod);
    const deprRate = Number(updatedDep.depreciationRate);
  
    if (origPrice > 0 && usagePeriod > 0 && deprRate > 0) {
      const cp = calculateDepreciatedPrice(
        origPrice,
        usagePeriod,
        updatedDep.usageUnit,
        deprRate,
      );
      const filledDep = { ...updatedDep, calculatedPrice: cp };
      // cp is the depreciated base price (without VAT)
      const priceWithVAT = calculatePriceWithVAT(cp);  // Selling price (includes VAT)
      return { 
        ...v, 
        depreciation: filledDep, 
        price: priceWithVAT
        // value_added_tax_amount is NOT stored in frontend state
        // It will be calculated on the backend
      };
    }
    return { ...v, depreciation: updatedDep };
  };

  const handleDepreciationChange = (
    variantId: string,
    field: keyof Depreciation,
    value: any,
  ) => {
    setVariants((prev) =>
      prev.map((v) => {
        if (v.id !== variantId) return v;
        const updatedDep = { ...v.depreciation, [field]: value };
        return calcAndUpdate(v, updatedDep);   // ← pass v, not variantId
      }),
    );
  };

  const handlePurchaseDateChange = (variantId: string, date: Date) => {
    setVariants((prev) =>
      prev.map((v) => {
        if (v.id !== variantId) return v;
        const today = new Date();
        let usagePeriod: number;
        const usageUnit = v.depreciation.usageUnit || "months";
        if (usageUnit === "weeks") {
          usagePeriod = diffInWeeks(date, today);
        } else if (usageUnit === "years") {
          usagePeriod = diffInYears(date, today);
        } else {
          usagePeriod = diffInMonths(date, today);
        }
        usagePeriod = Math.max(0, usagePeriod);
        const updatedDep = {
          ...v.depreciation,
          purchaseDate: date,
          usagePeriod,
        };
        return calcAndUpdate(v, updatedDep);   // ← pass v, not variantId
      }),
    );
  };

  const handleDepreciationRateSlider = (variantId: string, rate: number) => {
    setVariants((prev) =>
      prev.map((v) => {
        if (v.id !== variantId) return v;
        const updatedDep = { ...v.depreciation, depreciationRate: rate };
        return calcAndUpdate(v, updatedDep);   // ← pass v, not variantId
      }),
    );
  };

  // --- CATEGORY ---
  const normalizeText = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean)
      .join(" ");
  const tokenSimilarity = (a: string, b: string) => {
    const ta = new Set(normalizeText(a).split(" "));
    const tb = new Set(normalizeText(b).split(" "));
    if (ta.size === 0 || tb.size === 0) return 0;
    const inter = [...ta].filter((x) => tb.has(x)).length;
    const union = new Set([...ta, ...tb]).size;
    return union === 0 ? 0 : inter / union;
  };
  const findBestCategoryMatch = (predictedName: string) => {
    const scores = globalCategories.map((gc) => ({
      category: gc,
      score: tokenSimilarity(predictedName, gc.name),
    }));
    scores.sort((a, b) => b.score - a.score);
    return scores[0] || null;
  };
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
        file: { uri: asset.uri, name: fileName, type: "image/jpeg" },
        preview: asset.uri,
        type: "image" as const,
      };
      setMainMedia((prev) => [...prev, newMedia]);
      analyzeImages([{ uri: asset.uri, name: fileName, type: "image/jpeg" }]);
    }
  };
  const removeMainMedia = (index: number) => {
    setMainMedia((prev) => prev.filter((_, i) => i !== index));
  };
  const analyzeImages = async (files: any[]) => {
    if (files.length === 0) return;
    if (predictionAbortController.current)
      predictionAbortController.current.abort();
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
          aggregateScores[cls] =
            (aggregateScores[cls] || 0) + Number(p.confidence || 1);
        }
        count += 1;
      });
      if (count === 0) {
        setPredictionError("No valid predictions received");
        return;
      }
      Object.keys(aggregateScores).forEach((k) => {
        aggregateScores[k] /= count;
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
        const predictedName =
          mapped.predicted_category.category_name.toLowerCase();
        const found = globalCategories.find(
          (gc: any) => gc.name.toLowerCase() === predictedName,
        );
        if (found) setSelectedCategoryName(found.name);
      }
    } catch (error: any) {
      if (error.name === "AbortError" || error.code === "ERR_CANCELED") return;
      setPredictionError("Prediction request failed");
    } finally {
      setIsPredicting(false);
      predictionAbortController.current = null;
    }
  };
  useEffect(() => {
    return () => {
      if (predictionAbortController.current)
        predictionAbortController.current.abort();
    };
  }, []);
  // --- VARIANTS ---
  const addVariant = () => {
    setVariants((prev) => [
      ...prev,
      {
        id: generateId(),
        title: `Variant ${prev.length + 1}`,
        price: "",
        quantity: "",
        sku_code: "",
        weight_unit: "g",
        dimension_unit: "cm",
        is_active: true,
        refundable: productRefundable,
        value_added_tax: 12,  // Changed from 0 to 12 (12% default)
        depreciation: {
          originalPrice: "",
          usagePeriod: "",
          usageUnit: "months",
          depreciationRate: 10,
          calculatedPrice: "",
          purchaseDate: null,
        },
      },
    ]);
  };
  const removeVariant = (variantId: string) => {
    if (variants.length <= 1) {
      Alert.alert("Cannot Remove", "Products must have at least one variant");
      return;
    }
    setVariants((prev) => prev.filter((v) => v.id !== variantId));
  };
  const updateVariantField = (
    variantId: string,
    field: keyof Variant,
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
                  name: asset.uri.split("/").pop() || "image.jpg",
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
                  name: asset.uri.split("/").pop() || "proof.jpg",
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
  const toggleAdvancedExpand = (variantId: string) => {
    setExpandedAdvanced((prev) => ({ ...prev, [variantId]: !prev[variantId] }));
  };
  // --- VAT Calculation ---
  const calculateVAT = (price: number): number => {
    const vatRate = 0.12;
    return price * vatRate;
  };
  const calculatePriceWithVAT = (price: number): number => {
    return price + calculateVAT(price);
  };
  const formatPrice = (price: number | ""): string => {
    if (price === "" || price === null || price === undefined) return "0.00";
    return price.toFixed(2);
  };
  // Calculate totals across all variants
  const totalVariantsCount = variants.length;
  const totalStock = variants.reduce(
    (sum, v) => sum + (Number(v.quantity) || 0),
    0,
  );
  const totalBasePrice = variants.reduce(
    (sum, v) => sum + (typeof v.price === "number" ? v.price : 0),
    0,
  );
  const totalVAT = variants.reduce(
    (sum, v) => sum + calculateVAT(typeof v.price === "number" ? v.price : 0),
    0,
  );
  const totalWithVAT = totalBasePrice + totalVAT;
  // --- VALIDATION & SUBMIT ---
  const validateForm = () => {
    if (!productName.trim()) {
      Alert.alert("Validation Error", "Product name is required");
      return false;
    }
    if (!productDescription.trim()) {
      Alert.alert("Validation Error", "Description is required");
      return false;
    }
    if (!productCondition) {
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
      if (!v.price) {
        Alert.alert(
          "Validation Error",
          `Variant ${i + 1}: fill in depreciation fields to auto-calculate price`,
        );
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
      formData.append("name", productName.trim());
      formData.append("description", productDescription.trim());
      formData.append("condition", productCondition.toString());
      formData.append("shop", selectedShop?.id ?? "");
      formData.append("status", "active");
      formData.append("customer_id", userId);
      if (selectedCategoryName?.trim()) {
        let match = globalCategories.find(
          (gc) => gc.name.toLowerCase() === selectedCategoryName.toLowerCase(),
        );
        if (!match) {
          const best = findBestCategoryMatch(selectedCategoryName);
          if (best && best.score >= 0.25) match = best.category;
        }
        if (match) formData.append("category_admin_id", match.id);
        else
          formData.append(
            "category_admin_name",
            selectedCategoryName.toLowerCase() === "others"
              ? "others"
              : selectedCategoryName,
          );
      }
      mainMedia.forEach((file) => {
        formData.append("media_files", {
          uri: file.file.uri,
          name: file.file.name,
          type: file.file.type,
        } as any);
      });
      const variantsPayload = variants.map((v) => ({
        id: v.id,
        title: v.title, 
        price: v.price,
        compare_price: v.compare_price,
        quantity: v.quantity,
        length: v.length !== undefined && v.length !== "" ? Number(v.length) : null,
        width: v.width !== undefined && v.width !== "" ? Number(v.width) : null,
        height: v.height !== undefined && v.height !== "" ? Number(v.height) : null,
        dimension_unit: v.dimension_unit || "cm",
        weight: v.weight !== undefined && v.weight !== "" ? Number(v.weight) : null,
        weight_unit: v.weight_unit || "g",
        sku_code: v.sku_code,
        critical_trigger: v.critical_trigger || null,
        refundable: v.refundable ?? productRefundable,
        is_refundable: v.refundable ?? productRefundable,
        is_active: v.is_active ?? true,
        original_price: v.depreciation.originalPrice !== "" ? Number(v.depreciation.originalPrice) : null,
        usage_period: v.depreciation.usagePeriod !== "" ? Number(v.depreciation.usagePeriod) : null,
        usage_unit: v.depreciation.usageUnit || "months",
        depreciation_rate: v.depreciation.depreciationRate !== "" ? Number(v.depreciation.depreciationRate) : null,
        purchase_date: v.depreciation.purchaseDate ? v.depreciation.purchaseDate.toISOString() : null,
        attributes: v.attributes || {},
        // IMPORTANT: value_added_tax should be the PERCENTAGE (12 for 12%), not the calculated amount
        value_added_tax: v.value_added_tax !== undefined && v.value_added_tax !== "" ? Number(v.value_added_tax) : 12,
      }));
      formData.append("variants", JSON.stringify(variantsPayload));
      variants.forEach((v) => {
        if (v.image)
          formData.append(`variant_image_${v.id}`, {
            uri: v.image.uri,
            name: v.image.name,
            type: v.image.type,
          } as any);
        if (v.proofImage)
          formData.append(`proof_image_${v.id}`, {
            uri: v.proofImage.uri,
            name: v.proofImage.name,
            type: v.proofImage.type,
          } as any);
      });
      const response = await AxiosInstance.post("/seller-products/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (response.data.success) {
        Alert.alert("Success", "Product created successfully!", [
          {
            text: "OK",
            onPress: () =>
              router.replace(`/seller/product-list?shopId=${selectedShop?.id}`),
          },
        ]);
      } else {
        throw new Error(response.data.message || "Product creation failed");
      }
    } catch (err: any) {
      if (err.response?.data) {
        const apiErrors = err.response.data;
        if (typeof apiErrors === "object") {
          setApiResponseError(
            Object.keys(apiErrors)
              .map(
                (f) =>
                  `${f}: ${Array.isArray(apiErrors[f]) ? apiErrors[f][0] : apiErrors[f]}`,
              )
              .join("\n"),
          );
        } else {
          setApiResponseError(String(apiErrors));
        }
      } else {
        setApiResponseError(err.message || "Product creation failed");
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
  // current date picker variant ref
  const dpVariantId = datePickerModal.variantId;
  const dpVariant = dpVariantId
    ? variants.find((v) => v.id === dpVariantId)
    : null;
  return (
    <View style={styles.container}>
      <StepIndicator />
      {/* ===== STEP 1: Basic Information ===== */}
      {currentStep === 1 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons name="sparkles" size={20} color="#EA580C" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Basic Information</Text>
              <Text style={styles.sectionSubtitle}>
                Start with product details. AI will suggest a category when you
                upload images.
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
              Product Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={productName}
              onChangeText={setProductName}
              placeholder="Enter product name"
              placeholderTextColor="#9CA3AF"
              maxLength={100}
            />
            {externalErrors.name && (
              <Text style={styles.errorText}>{externalErrors.name}</Text>
            )}
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Condition Rating <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setConditionModalVisible(true)}
            >
              {productCondition ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    flex: 1,
                  }}
                >
                  <StarRow count={CONDITION_SCALE[productCondition].stars} />
                  <Text style={styles.selectButtonText} numberOfLines={1}>
                    {CONDITION_SCALE[productCondition].shortLabel}
                  </Text>
                </View>
              ) : (
                <Text style={styles.placeholderText}>
                  Select condition rating
                </Text>
              )}
              <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
            </TouchableOpacity>
            {productCondition ? (
              <View
                style={[
                  styles.conditionBadge,
                  {
                    backgroundColor: CONDITION_SCALE[productCondition].color,
                    borderColor: CONDITION_SCALE[productCondition].borderColor,
                  },
                ]}
              >
                <StarRow count={CONDITION_SCALE[productCondition].stars} />
                <Text
                  style={[
                    styles.conditionBadgeText,
                    { color: CONDITION_SCALE[productCondition].textColor },
                  ]}
                >
                  {CONDITION_SCALE[productCondition].label}
                </Text>
              </View>
            ) : null}
            {externalErrors.condition && (
              <Text style={styles.errorText}>{externalErrors.condition}</Text>
            )}
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Description <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={productDescription}
              onChangeText={setProductDescription}
              placeholder="Describe your product in detail..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              maxLength={1000}
              textAlignVertical="top"
            />
            {externalErrors.description && (
              <Text style={styles.errorText}>{externalErrors.description}</Text>
            )}
          </View>
          <TouchableOpacity
            style={[styles.nextButton, styles.singleStepButton]}
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
              <Text style={styles.sectionTitle}>Product Photos</Text>
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
              Take photos of your product (max 9 photos)
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
              style={[styles.backButton, styles.navButton]}
              onPress={() => setCurrentStep(1)}
            >
              <Ionicons name="arrow-back" size={20} color="#6B7280" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.nextButton, styles.navButton]}
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
              <Text style={styles.sectionTitle}>Product Variants</Text>
              <Text style={styles.sectionSubtitle}>
                Each product must have at least one variant with price and stock
              </Text>
            </View>
            <View style={styles.requiredBadge}>
              <Text style={styles.requiredBadgeText}>Required</Text>
            </View>
          </View>
          {variants.map((variant, index) => {
            const variantPrice =
            typeof variant.price === "number" ? variant.price : 0;
          // Get the depreciated base price (without VAT)
          const depreciatedBasePrice = variant.depreciation.calculatedPrice || 0;
          // Calculate VAT from the depreciated base price, NOT from the selling price
          const variantVAT = calculateVAT(depreciatedBasePrice);
          const variantTotalWithVAT = variantPrice; // This is already the selling price with VAT
            return (
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
                      {variant.price ? (
  <Text style={styles.variantPrice}>
    ₱{formatPrice(variantPrice)}
  </Text>
) : null}
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
                {/* VAT Display in Variant Header */}
                {/* VAT Display in Variant Header - Simplified */}

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
                          Main product image for this variant
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
  <View
    style={{
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 6,
    }}
  >
    <Text style={styles.label}>
      Selling Price (incl. VAT) <Text style={styles.required}>*</Text>
    </Text>
    {variant.depreciation.calculatedPrice ? (
      <View style={styles.autoBadgeInline}>
        <Text style={styles.autoBadgeInlineText}>Auto</Text>
      </View>
    ) : null}
  </View>
  <View style={styles.priceInputContainer}>
    <Text style={styles.currencySymbol}>₱</Text>
    <TextInput
  style={[
    styles.priceInput,
    {
      backgroundColor: "#F9FAFB",
      color: variant.depreciation.calculatedPrice
        ? "#EA580C"
        : "#9CA3AF",
    },
  ]}
  value={
    variant.price ? formatPrice(variantPrice) : ""
  }
  editable={false}
  placeholder="Auto-calculated"
  placeholderTextColor="#9CA3AF"
/>
  </View>
  <Text style={styles.basePriceNote}>
  Base price (excl. VAT): ₱{formatPrice(variant.depreciation.calculatedPrice || 0)}
</Text>
</View>
                      <View style={[styles.formGroup, { flex: 1 }]}>
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
                    </View>
                    {/* VAT Display for this variant */}
                    {/* VAT Display for this variant */}
<View style={styles.variantVATSection}>
<Text style={styles.variantVATSectionTitle}>VAT Details</Text>
<View style={styles.variantVATRow}>
<Text style={styles.variantVATLabel}>VAT (12%):</Text>
<Text style={styles.variantVATValue}>
  ₱{formatPrice(variant.price ? (variant.price * 0.12 / 1.12) : 0)}
</Text>
</View>
<View style={styles.variantVATRow}>
  <Text style={styles.variantVATLabel}>Depreciated Base Price:</Text>
  <Text style={styles.variantVATValue}>
    ₱{formatPrice(variant.depreciation.calculatedPrice || 0)}
  </Text>
</View>
<Text style={styles.variantVATNote}>
  * Selling Price = Depreciated Base Price + 12% VAT
</Text>
</View>
                    {/* ── DEPRECIATION SECTION ── */}
                    <View style={styles.depreciationSection}>
                      <View style={styles.depreciationHeader}>
                        <Ionicons name="calculator" size={16} color="#EA580C" />
                        <Text style={styles.depreciationTitle}>
                          Price Depreciation Calculator
                        </Text>
                      </View>

                      {/* Original Price */}
                      <View style={styles.formGroup}>
                        <Text style={styles.depLabel}>Original Price</Text>
                        <View style={styles.priceInputContainer}>
                          <Text style={styles.currencySymbol}>₱</Text>
                          <TextInput
                            style={styles.priceInput}
                            value={
                              variant.depreciation.originalPrice?.toString() ||
                              ""
                            }
                            onChangeText={(text) =>
                              handleDepreciationChange(
                                variant.id,
                                "originalPrice",
                                text === "" ? "" : parseFloat(text) || "",
                              )
                            }
                            keyboardType="numeric"
                            placeholder="0.00"
                            placeholderTextColor="#9CA3AF"
                          />
                        </View>
                      </View>

                      {/* Purchase Date */}
                      <View style={styles.formGroup}>
                        <Text style={styles.depLabel}>Purchase Date</Text>
                        <TouchableOpacity
                          style={styles.datePickerButton}
                          onPress={() =>
                            setDatePickerModal({
                              visible: true,
                              variantId: variant.id,
                            })
                          }
                        >
                          <Ionicons
                            name="calendar-outline"
                            size={16}
                            color="#EA580C"
                          />
                          <Text
                            style={
                              variant.depreciation.purchaseDate
                                ? styles.datePickerTextSet
                                : styles.datePickerTextPlaceholder
                            }
                          >
                            {variant.depreciation.purchaseDate
                              ? formatDate(variant.depreciation.purchaseDate)
                              : "Pick a date (auto-fills usage period)"}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {/* Usage Period — manual input so user can type directly */}
                      <View style={styles.formGroup}>
                        <Text style={styles.depLabel}>
                          Usage Period{" "}
                          <Text style={{ color: "#9CA3AF", fontSize: 11 }}>
                            (or type manually)
                          </Text>
                        </Text>
                        <View style={{ flexDirection: "row", gap: 8 }}>
                          <View style={[styles.priceInputContainer, { flex: 1 }]}>
                            <TextInput
                              style={[styles.priceInput, { paddingLeft: 12 }]}
                              value={
                                variant.depreciation.usagePeriod?.toString() ||
                                ""
                              }
                              onChangeText={(text) =>
                                handleDepreciationChange(
                                  variant.id,
                                  "usagePeriod",
                                  text === "" ? "" : parseFloat(text) || "",
                                )
                              }
                              keyboardType="numeric"
                              placeholder="e.g. 6"
                              placeholderTextColor="#9CA3AF"
                            />
                          </View>
                          <TouchableOpacity
                            style={[styles.selectButton, { width: 90 }]}
                            onPress={() =>
                              setUsageUnitModalVisible({
                                visible: true,
                                variantId: variant.id,
                              })
                            }
                          >
                            <Text style={styles.selectButtonText}>
                              {variant.depreciation.usageUnit || "months"}
                            </Text>
                            <Ionicons
                              name="chevron-down"
                              size={14}
                              color="#9CA3AF"
                            />
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Depreciation Rate Slider */}
                      <View style={styles.sliderSection}>
                        <View style={styles.sliderHeader}>
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <Ionicons
                              name="trending-down-outline"
                              size={16}
                              color="#EA580C"
                            />
                            <Text style={styles.sliderTitle}>
                              Annual Depreciation Rate
                            </Text>
                          </View>
                          <View style={styles.rateBadge}>
                            <Text style={styles.rateBadgeText}>
                              {variant.depreciation.depreciationRate || 0}%
                            </Text>
                          </View>
                        </View>
                        <OrangeSlider
                          value={
                            Number(variant.depreciation.depreciationRate) || 0
                          }
                          onValueChange={(val) =>
                            handleDepreciationRateSlider(variant.id, val)
                          }
                          min={0}
                          max={100}
                          step={0.5}
                        />
                      </View>

                      {/* Calculated Price Card */}
                      <View style={styles.calculatedPriceCard}>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                            marginBottom: 12,
                          }}
                        >
                          <Ionicons
                            name="calculator"
                            size={18}
                            color="rgba(255,255,255,0.85)"
                          />
                          <Text style={styles.calcCardLabel}>
                            Calculated Price
                          </Text>
                        </View>
                        {variant.depreciation.calculatedPrice ? (
                          <View>
                            <Text style={styles.calcCardPrice}>
                              ₱
                              {Number(
                                variant.depreciation.calculatedPrice,
                              ).toLocaleString("en-PH", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </Text>
                            <View style={styles.calcCardInfo}>
                              <Ionicons
                                name="calendar-outline"
                                size={12}
                                color="rgba(255,255,255,0.7)"
                              />
                              <Text style={styles.calcCardInfoText}>
                                Based on {variant.depreciation.usagePeriod}{" "}
                                {variant.depreciation.usageUnit} of use @{" "}
                                {variant.depreciation.depreciationRate}%/yr
                              </Text>
                            </View>
                          </View>
                        ) : (
                          <View style={{ alignItems: "center" }}>
                            <Text style={styles.calcCardEmpty}>—</Text>
                            <View style={styles.calcCardHint}>
                              <Ionicons
                                name="information-circle-outline"
                                size={12}
                                color="rgba(255,255,255,0.8)"
                              />
                              <Text style={styles.calcCardHintText}>
                                Fill original price + usage period + rate
                              </Text>
                            </View>
                          </View>
                        )}
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
                          value={variant.refundable !== false}
                          onValueChange={(value) =>
                            updateVariantField(variant.id, "refundable", value)
                          }
                          trackColor={{ false: "#E5E7EB", true: "#F97316" }}
                          thumbColor={
                            variant.refundable !== false ? "#EA580C" : "#9CA3AF"
                          }
                        />
                        <Text style={styles.toggleLabel}>Refundable</Text>
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
                              style={[
                                styles.selectButtonText,
                                { fontSize: 12 },
                              ]}
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
                              <Ionicons
                                name="camera"
                                size={24}
                                color="#9CA3AF"
                              />
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
            );
          })}
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
              style={[styles.backButton, styles.navButton]}
              onPress={() => setCurrentStep(2)}
            >
              <Ionicons name="arrow-back" size={20} color="#6B7280" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.nextButton, styles.navButton]}
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
                Review your product details before creating
              </Text>
            </View>
          </View>
          <ScrollView style={{ maxHeight: "70%" }}>
            <View style={styles.reviewCard}>
              <Text style={styles.reviewCardTitle}>Product Summary</Text>
              {[
                { label: "Shop", value: selectedShop?.name || "No shop" },
                { label: "Name", value: productName },
                {
                  label: "Condition",
                  value: productCondition
                    ? `${CONDITION_SCALE[productCondition].shortLabel} (${CONDITION_SCALE[productCondition].stars}★)`
                    : "Not set",
                },
                {
                  label: "Category",
                  value: selectedCategoryName || "Not selected",
                },
                { label: "Media", value: `${mainMedia.length} files` },
                { label: "Variants", value: String(variants.length) },
                { label: "Total Stock", value: `${totalStock} units` },
              ].map(({ label, value }) => (
                <View key={label} style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>{label}:</Text>
                  <Text style={styles.reviewValue}>{value}</Text>
                </View>
              ))}
              {/* All Variants Summary Section with Individual VAT */}
              <View style={styles.allVariantsSection}>
                <Text style={styles.allVariantsTitle}>
                  All Variants Summary
                </Text>
                <View style={styles.allVariantsList}>
                  <Text style={styles.allVariantsSubtitle}>
                    Variant Details:
                  </Text>
                  {variants.map((variant, idx) => {
  // variant.price already includes VAT (selling price)
  const sellingPrice = typeof variant.price === "number" ? variant.price : 0;
  // Get the depreciated base price (without VAT)
  const basePrice = variant.depreciation.calculatedPrice || 0;
  // Calculate VAT amount from base price
  const vatAmount = calculateVAT(basePrice);
  
  return (
    <View key={variant.id} style={styles.allVariantsItem}>
      <View style={styles.allVariantsItemHeader}>
        <Text style={styles.allVariantsItemNumber}>
          {idx + 1}
        </Text>
        <Text style={styles.allVariantsItemTitle}>
          {variant.title || `Variant ${idx + 1}`}
        </Text>
      </View>
      <View style={styles.allVariantsItemDetails}>
        <View style={styles.allVariantsItemPriceRow}>
          <Text style={styles.allVariantsItemLabel}>Selling Price (incl. VAT):</Text>
          <Text style={styles.allVariantsItemPrice}>
            ₱{formatPrice(sellingPrice)}
          </Text>
        </View>
        <View style={styles.allVariantsItemBasePriceRow}>
          <Text style={styles.allVariantsItemBasePriceLabel}>Depreciated Base Price:</Text>
          <Text style={styles.allVariantsItemBasePrice}>
            ₱{formatPrice(basePrice)}
          </Text>
        </View>
        <View style={styles.allVariantsItemStockRow}>
          <Text style={styles.allVariantsItemLabel}>Stock:</Text>
          <Text style={styles.allVariantsItemStock}>
            {variant.quantity || 0} units
          </Text>
        </View>
      </View>
      <View style={styles.variantVATDetails}>
        <View style={styles.variantVATRow}>
          <Text style={styles.variantVATLabel}>VAT Amount (12% of Base Price):</Text>
          <Text style={styles.variantVATValue}>
            ₱{formatPrice(vatAmount)}
          </Text>
        </View>
      </View>
    </View>
  );
})}
                </View>
                <View style={styles.allVariantsStats}>
                  <View style={styles.allVariantsStat}>
                    <Text style={styles.allVariantsStatLabel}>
                      Total Variants
                    </Text>
                    <Text style={styles.allVariantsStatValue}>
                      {totalVariantsCount}
                    </Text>
                  </View>
                  <View style={styles.allVariantsStat}>
                    <Text style={styles.allVariantsStatLabel}>Total Stock</Text>
                    <Text style={styles.allVariantsStatValue}>
                      {totalStock} units
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.vatSection}>
                <Text style={styles.vatTitle}>
                  VAT Summary (All Variants Combined)
                </Text>
                <View style={styles.vatRow}>
                  <Text style={styles.vatLabel}>
                    Total Base Price (All Variants):
                  </Text>
                  <Text style={styles.vatValue}>
                    ₱{formatPrice(totalBasePrice)}
                  </Text>
                </View>
                <View style={styles.vatRow}>
                  <Text style={styles.vatLabel}>Total VAT (12% of Total):</Text>
                  <Text style={styles.vatValue}>₱{formatPrice(totalVAT)}</Text>
                </View>
                <View style={styles.vatTotalRow}>
                  <Text style={styles.vatTotalLabel}>
                    Total with VAT (All Variants):
                  </Text>
                  <Text style={styles.vatTotalValue}>
                    ₱{formatPrice(totalWithVAT)}
                  </Text>
                </View>
                <Text style={styles.vatNote}>
                  * VAT is calculated as 12% of each variant's price. This will
                  be applied during checkout per variant.
                </Text>
              </View>
            </View>
          </ScrollView>
          {apiResponseError && (
            <View style={styles.apiErrorContainer}>
              <Ionicons name="alert-circle" size={20} color="#EF4444" />
              <Text style={styles.apiErrorText}>{apiResponseError}</Text>
            </View>
          )}
          {apiResponseMessage && (
            <View style={styles.apiSuccessContainer}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.apiSuccessText}>{apiResponseMessage}</Text>
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
                  <Text style={styles.submitButtonText}>Create Product</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
      {/* ===== MODALS ===== */}
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
                const isSelected = productCondition === val;
                return (
                  <TouchableOpacity
                    style={[
                      styles.modalItem,
                      isSelected && { backgroundColor: "#FFF7ED" },
                    ]}
                    onPress={() => {
                      setProductCondition(val);
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
      <Modal
        visible={usageUnitModalVisible.visible}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setUsageUnitModalVisible({ visible: false, variantId: null })
        }
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() =>
            setUsageUnitModalVisible({ visible: false, variantId: null })
          }
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Time Unit</Text>
              <TouchableOpacity
                onPress={() =>
                  setUsageUnitModalVisible({ visible: false, variantId: null })
                }
              >
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={usageUnitOptions}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => {
                const current = usageUnitModalVisible.variantId
                  ? variants.find(
                      (v) => v.id === usageUnitModalVisible.variantId,
                    )?.depreciation.usageUnit
                  : null;
                return (
                  <TouchableOpacity
                    style={[
                      styles.modalItem,
                      current === item.value && { backgroundColor: "#FFF7ED" },
                    ]}
                    onPress={() => {
                      if (usageUnitModalVisible.variantId) {
                        handleDepreciationChange(
                          usageUnitModalVisible.variantId,
                          "usageUnit",
                          item.value,
                        );
                      }
                      setUsageUnitModalVisible({
                        visible: false,
                        variantId: null,
                      });
                    }}
                  >
                    <Text style={styles.modalItemText}>{item.label}</Text>
                    {current === item.value && (
                      <Ionicons name="checkmark" size={20} color="#EA580C" />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
      <DatePickerModal
        visible={datePickerModal.visible}
        selectedDate={dpVariant?.depreciation.purchaseDate}
        onSelect={(date) => {
          if (datePickerModal.variantId)
            handlePurchaseDateChange(datePickerModal.variantId, date);
        }}
        onClose={() => setDatePickerModal({ visible: false, variantId: null })}
      />
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
  inputDisabled: { backgroundColor: "#F3F4F6", color: "#9CA3AF" },
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
  singleStepButton: { marginTop: 20 },
  nextButtonText: { fontSize: 15, fontWeight: "600", color: "#FFFFFF" },
  navigationButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    gap: 12,
  },
  navButton: { flex: 1 },
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
  variantPrice: { fontSize: 12, color: "#EA580C", fontWeight: "500" },
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
  variantHeaderVAT: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#F9FAFB",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  variantHeaderVATRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  variantHeaderVATLabel: { fontSize: 11, color: "#6B7280" },
  variantHeaderVATValue: { fontSize: 12, fontWeight: "600", color: "#059669" },
  variantHeaderVATTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  variantHeaderVATTotalLabel: { fontSize: 11, fontWeight: "600", color: "#374151" },
  variantHeaderVATTotalValue: { fontSize: 13, fontWeight: "700", color: "#EA580C" },
  variantContent: { padding: 16 },
  variantVATSection: {
    backgroundColor: "#F0FDF4",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  variantVATSectionTitle: { fontSize: 13, fontWeight: "600", color: "#166534", marginBottom: 8 },
  variantVATRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  variantVATLabel: { fontSize: 12, color: "#374151" },
  variantVATValue: { fontSize: 12, fontWeight: "600", color: "#059669" },
  variantVATTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#D1D5DB",
  },
  variantVATTotalLabel: { fontSize: 13, fontWeight: "600", color: "#065F46" },
  variantVATTotalValue: { fontSize: 13, fontWeight: "700", color: "#EA580C" },
  variantVATNote: { fontSize: 10, color: "#6B7280", marginTop: 6, fontStyle: "italic" },
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
  priceInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
  },
  currencySymbol: { fontSize: 14, color: "#6B7280", paddingLeft: 12 },
  priceInput: {
    flex: 1,
    paddingVertical: 12,
    paddingRight: 12,
    fontSize: 14,
    color: "#111827",
  },
  autoBadgeInline: {
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  autoBadgeInlineText: { fontSize: 9, fontWeight: "600", color: "#EA580C" },
  depreciationSection: {
    backgroundColor: "#FFF7ED",
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  depreciationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
  },
  depreciationTitle: { fontSize: 13, fontWeight: "600", color: "#C2410C" },
  depLabel: { fontSize: 13, fontWeight: "500", color: "#92400E", marginBottom: 6 },
  datePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#FED7AA",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
  },
  datePickerTextSet: { fontSize: 14, color: "#111827" },
  datePickerTextPlaceholder: { fontSize: 14, color: "#9CA3AF" },
  sliderSection: {
    backgroundColor: "#FFFBEB",
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  sliderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sliderTitle: { fontSize: 13, fontWeight: "500", color: "#92400E" },
  rateBadge: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FED7AA",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  rateBadgeText: { fontSize: 15, fontWeight: "700", color: "#EA580C" },
  calculatedPriceCard: {
    backgroundColor: "#EA580C",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#EA580C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  calcCardLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  calcCardPrice: { fontSize: 34, fontWeight: "700", color: "#FFFFFF", marginBottom: 6 },
  calcCardInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  calcCardInfoText: { fontSize: 11, color: "rgba(255,255,255,0.8)" },
  calcCardEmpty: { fontSize: 32, color: "rgba(255,255,255,0.4)", marginBottom: 8 },
  calcCardHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  calcCardHintText: { fontSize: 11, color: "rgba(255,255,255,0.85)" },
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
  advancedSectionTitle: { fontSize: 14, fontWeight: "600", color: "#374151" },
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
  reviewCardTitle: { fontSize: 16, fontWeight: "600", color: "#111827", marginBottom: 16 },
  reviewRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  reviewLabel: { fontSize: 14, color: "#6B7280" },
  reviewValue: { fontSize: 14, fontWeight: "500", color: "#111827" },
  allVariantsSection: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 12,
  },
  allVariantsTitle: { fontSize: 14, fontWeight: "700", color: "#374151", marginBottom: 12 },
  allVariantsStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  allVariantsStat: { flex: 1, alignItems: "center" },
  allVariantsStatLabel: { fontSize: 11, color: "#6B7280", marginBottom: 4 },
  allVariantsStatValue: { fontSize: 13, fontWeight: "600", color: "#374151" },
  allVariantsList: { marginTop: 4 },
  allVariantsSubtitle: { fontSize: 12, fontWeight: "600", color: "#6B7280", marginBottom: 8 },
  allVariantsItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  allVariantsItemHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  allVariantsItemNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#F97316",
    textAlign: "center",
    textAlignVertical: "center",
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    overflow: "hidden",
  },
  allVariantsItemTitle: { fontSize: 13, fontWeight: "600", color: "#111827", flex: 1 },
  allVariantsItemDetails: { flexDirection: "column", marginTop: 6 },
  allVariantsItemPriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  allVariantsItemStockRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  allVariantsItemLabel: { fontSize: 11, color: "#6B7280" },
  allVariantsItemPrice: { fontSize: 13, fontWeight: "700", color: "#EA580C" },
  allVariantsItemStock: { fontSize: 11, color: "#374151", fontWeight: "500" },
  variantVATDetails: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  vatSection: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#F0FDF4",
    borderRadius: 8,
    padding: 12,
  },
  vatTitle: { fontSize: 14, fontWeight: "700", color: "#166534", marginBottom: 8 },
  vatRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  vatLabel: { fontSize: 13, color: "#374151" },
  vatValue: { fontSize: 13, fontWeight: "600", color: "#374151" },
  vatTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#D1D5DB",
  },
  vatTotalLabel: { fontSize: 14, fontWeight: "700", color: "#065F46" },
  vatTotalValue: { fontSize: 14, fontWeight: "700", color: "#065F46" },
  vatNote: { fontSize: 10, color: "#6B7280", marginTop: 8, fontStyle: "italic" },
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
  apiSuccessContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  apiSuccessText: { flex: 1, fontSize: 13, color: "#166534" },
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
  basePriceNote: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 4,
    fontStyle: "italic",
  },
  allVariantsItemBasePriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  allVariantsItemBasePriceLabel: {
    fontSize: 11,
    color: "#6B7280",
  },
  allVariantsItemBasePrice: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  modalItemText: { fontSize: 15, color: "#374151" },
});