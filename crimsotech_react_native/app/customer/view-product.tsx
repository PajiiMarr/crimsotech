// app/customer/view-product.tsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Modal,
  FlatList,
  Dimensions,
  TouchableWithoutFeedback,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import AxiosInstance from "../../contexts/axios";
import { useAuth } from "../../contexts/AuthContext";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

type Variant = {
  id: string;
  title?: string;
  option_title?: string;
  option_ids?: any[];
  option_map?: Record<string, any>;
  sku_code?: string;
  price?: string | null;
  compare_price?: string | null;
  quantity?: number;
  total_quantity?: number;
  ordered_quantity?: number;
  available_quantity?: number;
  in_stock?: boolean;
  out_of_stock?: boolean;
  stock_status?: "in_stock" | "out_of_stock";
  length?: string | null;
  width?: string | null;
  height?: string | null;
  dimension_unit?: string;
  weight?: string | null;
  weight_unit?: string;
  is_active?: boolean;
  is_refundable?: boolean;
  refund_days?: number;
  allow_swap?: boolean;
  swap_type?: string;
  swap_description?: string | null;
  minimum_additional_payment?: string | null;
  maximum_additional_payment?: string | null;
  original_price?: string | null;
  purchase_date?: string | null;
  usage_period?: number | null;
  usage_unit?: string | null;
  depreciation_rate?: number | null;
  proof_image?: string | null;
  proof_image_url?: string | null;
  critical_trigger?: number | null;
  critical_stock?: number | null;
  image?: string | null;
  image_url?: string | null;
  created_at?: string;
  updated_at?: string;
};

type MediaItem = {
  id: string;
  file_data?: string | null;
  file_url?: string | null;
  file_type?: string;
};

type ProductDetail = {
  id: string;
  name: string;
  description?: string;
  condition?: number;
  upload_status?: string;
  status?: string;
  is_refundable?: boolean;
  refund_days?: number;
  is_removed?: boolean;
  removal_reason?: string | null;
  category_admin?: { id: string; name: string } | null;
  category?: { id: string; name: string } | null;
  shop?: {
    id: string;
    name: string;
    shop_picture?: string | null;
    verified?: boolean;
    city?: string;
    barangay?: string;
    street?: string;
    contact_number?: string;
    total_sales?: string;
    is_suspended?: boolean;
  } | null;
  price_range?: { min?: string | null; max?: string | null };
  is_favorite?: boolean;
  listing_type?: "shop" | "personal" | "unknown";
  seller_id?: string | null;
  seller_name?: string | null;
  seller_avatar?: string | null;
  total_stock?: number;
  total_available_stock?: number;
  has_stock?: boolean;
  availability_status?: "in_stock" | "sold_out" | "out_of_stock";
  availability_message?: string;
  in_stock_variant_count?: number;
  default_variant?: Variant;
  reviews?: Array<{
    id: string;
    rating?: number;
    comment?: string;
    customer?: { id: string; username?: string };
    created_at?: string;
  }>;
  average_rating?: number;
  total_reviews?: number;
  favorites_count?: number;
  variants?: Variant[];
  media_files?: MediaItem[];
  media?: MediaItem[];
  created_at?: string;
  updated_at?: string;
};

const CONDITION_SCALE: Record<
  number,
  { label: string; shortLabel: string; stars: number }
> = {
  1: {
    label: "Poor - Heavy signs of use, may not function perfectly",
    shortLabel: "Poor",
    stars: 1,
  },
  2: {
    label: "Fair - Visible wear, fully functional",
    shortLabel: "Fair",
    stars: 2,
  },
  3: {
    label: "Good - Normal wear, well-maintained",
    shortLabel: "Good",
    stars: 3,
  },
  4: {
    label: "Very Good - Minimal wear, almost like new",
    shortLabel: "Very Good",
    stars: 4,
  },
  5: {
    label: "Like New - No signs of use, original packaging",
    shortLabel: "Like New",
    stars: 5,
  },
};
const resolveMediaUrl = (item: MediaItem): string | null => {
  return item.file_url || item.file_data || null;
};

const resolveVariantImageUrl = (variant: Variant): string | null => {
  return variant.image_url || variant.image || null;
};

const resolveProofImageUrl = (variant: Variant): string | null => {
  return variant.proof_image_url || variant.proof_image || null;
};

const formatDate = (dateString?: string) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatCurrency = (amount?: string | number | null) => {
  if (!amount && amount !== 0) return null;
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return null;
  return `₱${num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

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

// ─── Toast Notification ────────────────────────────────────────────────────────
const ToastNotification = ({
  visible,
  message,
  type = "success",
  onHide,
}: {
  visible: boolean;
  message: string;
  type?: "success" | "error" | "info";
  onHide: () => void;
}) => {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 10,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -100,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => onHide());
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  const bgColor =
    type === "success" ? "#16A34A" : type === "error" ? "#DC2626" : "#2563EB";
  const iconName =
    type === "success"
      ? "checkmark-circle"
      : type === "error"
        ? "close-circle"
        : "information-circle";

  return (
    <Animated.View
      style={{
        position: "absolute",
        top: 60,
        left: 16,
        right: 16,
        zIndex: 9999,
        transform: [{ translateY }],
        opacity,
      }}
    >
      <View
        style={{
          backgroundColor: bgColor,
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 14,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <Ionicons name={iconName as any} size={22} color="#FFFFFF" />
        <Text
          style={{
            flex: 1,
            fontSize: 14,
            fontWeight: "600",
            color: "#FFFFFF",
            lineHeight: 20,
          }}
        >
          {message}
        </Text>
        <TouchableOpacity onPress={onHide} style={{ padding: 2 }}>
          <Ionicons name="close" size={18} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

// ─── Image Gallery Modal ───────────────────────────────────────────────────────
const ImageGalleryModal = ({
  visible,
  images,
  initialIndex = 0,
  onClose,
}: {
  visible: boolean;
  images: string[];
  initialIndex?: number;
  onClose: () => void;
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (visible && flatListRef.current && initialIndex > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: initialIndex,
          animated: false,
        });
      }, 100);
    }
    setCurrentIndex(initialIndex);
  }, [visible, initialIndex]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.95)" }}>
        <TouchableOpacity
          style={{
            position: "absolute",
            top: 50,
            right: 20,
            zIndex: 10,
            padding: 8,
          }}
          onPress={onClose}
        >
          <Ionicons name="close" size={30} color="#FFFFFF" />
        </TouchableOpacity>
        <FlatList
          ref={flatListRef}
          data={images}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
          onScrollToIndexFailed={(info) => {
            setTimeout(
              () =>
                flatListRef.current?.scrollToIndex({
                  index: info.index,
                  animated: false,
                }),
              500,
            );
          }}
          onScroll={(e) => {
            setCurrentIndex(
              Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH),
            );
          }}
          renderItem={({ item }) => (
            <View
              style={{
                width: SCREEN_WIDTH,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Image
                source={{ uri: item }}
                style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH * 1.1 }}
                resizeMode="contain"
              />
            </View>
          )}
          keyExtractor={(_, index) => index.toString()}
        />
        {images.length > 1 && (
          <View
            style={{
              position: "absolute",
              bottom: 50,
              alignSelf: "center",
              backgroundColor: "rgba(0,0,0,0.6)",
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
            }}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 14 }}>
              {currentIndex + 1} / {images.length}
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
};

// ─── Variant Selection Drawer Modal ──────────────────────────────────────────
const VariantSelectionModal = ({
  visible,
  variants,
  selectedVariant,
  quantityMap,
  onSelectVariant,
  onQuantityChange,
  onConfirm,
  onClose,
  productName,
  pendingAction,
}: {
  visible: boolean;
  variants: Variant[];
  selectedVariant: Variant | null;
  quantityMap: Record<string, number>;
  onSelectVariant: (variant: Variant) => void;
  onQuantityChange: (variantId: string, quantity: number) => void;
  onConfirm: () => void;
  onClose: () => void;
  productName: string;
  pendingAction: "add_to_cart" | "buy_now" | null;
}) => {
  const [tempQuantityMap, setTempQuantityMap] = useState<
    Record<string, number>
  >({});
  const [tempSelectedVariant, setTempSelectedVariant] =
    useState<Variant | null>(selectedVariant);

  useEffect(() => {
    if (visible) {
      setTempQuantityMap({ ...quantityMap });
      setTempSelectedVariant(selectedVariant);
    }
  }, [visible, quantityMap, selectedVariant]);

  const getTempQuantity = (variantId: string) =>
    tempQuantityMap[variantId] ?? 1;

  const setTempQuantityForVariant = (variantId: string, qty: number) => {
    setTempQuantityMap((prev) => ({ ...prev, [variantId]: qty }));
  };

  const handleConfirm = () => {
    if (tempSelectedVariant) {
      onSelectVariant(tempSelectedVariant);
      Object.entries(tempQuantityMap).forEach(([variantId, qty]) => {
        onQuantityChange(variantId, qty);
      });
      onConfirm();
    } else {
      Alert.alert("Error", "Please select a variant");
    }
  };

  const confirmLabel = pendingAction === "buy_now" ? "Buy Now" : "Add to Cart";
  const confirmIcon =
    pendingAction === "buy_now" ? "flash-outline" : "cart-outline";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }} />
      </TouchableWithoutFeedback>
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "#FFFFFF",
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          maxHeight: SCREEN_HEIGHT * 0.85,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: "#F3F4F6",
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#111827" }}>
            Select Option
          </Text>
          <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20 }}
        >
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
            {tempSelectedVariant &&
            resolveVariantImageUrl(tempSelectedVariant) ? (
              <Image
                source={{ uri: resolveVariantImageUrl(tempSelectedVariant)! }}
                style={{ width: 80, height: 80, borderRadius: 8 }}
              />
            ) : (
              <View
                style={{
                  width: 80,
                  height: 80,
                  backgroundColor: "#F3F4F6",
                  borderRadius: 8,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons name="cube-outline" size={32} color="#9CA3AF" />
              </View>
            )}
            <View style={{ flex: 1, justifyContent: "center" }}>
              <Text
                style={{ fontSize: 16, fontWeight: "700", color: "#111827" }}
                numberOfLines={2}
              >
                {productName}
              </Text>
              {tempSelectedVariant && (
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "700",
                    color: "#EA580C",
                    marginTop: 4,
                  }}
                >
                  {formatCurrency(tempSelectedVariant.price) ?? "₱0.00"}
                </Text>
              )}
            </View>
          </View>

          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: "#374151",
              marginBottom: 12,
            }}
          >
            Select Variant
          </Text>

          {variants.map((variant) => {
            const isSelected = tempSelectedVariant?.id === variant.id;
            const variantQty = getTempQuantity(variant.id);
            return (
              <View key={variant.id} style={{ marginBottom: 12 }}>
                <TouchableOpacity
                  onPress={() => {
                    setTempSelectedVariant(variant);
                  }}
                  disabled={!variant.in_stock}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: 12,
                    borderWidth: 2,
                    borderColor: isSelected ? "#EA580C" : "#E5E7EB",
                    borderRadius: 10,
                    borderBottomLeftRadius:
                      isSelected && variant.in_stock ? 0 : 10,
                    borderBottomRightRadius:
                      isSelected && variant.in_stock ? 0 : 10,
                    backgroundColor: isSelected ? "#FFF7ED" : "#FFFFFF",
                    opacity: variant.in_stock ? 1 : 0.5,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      flex: 1,
                    }}
                  >
                    {resolveVariantImageUrl(variant) ? (
                      <Image
                        source={{ uri: resolveVariantImageUrl(variant)! }}
                        style={{ width: 50, height: 50, borderRadius: 8 }}
                      />
                    ) : (
                      <View
                        style={{
                          width: 50,
                          height: 50,
                          backgroundColor: "#F3F4F6",
                          borderRadius: 8,
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <Ionicons
                          name="cube-outline"
                          size={24}
                          color="#9CA3AF"
                        />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "600",
                          color: "#111827",
                        }}
                      >
                        {variant.title || variant.sku_code || "Standard"}
                      </Text>
                      <Text
                        style={{
                          fontSize: 14,
                          color: "#EA580C",
                          fontWeight: "700",
                        }}
                      >
                        {formatCurrency(variant.price) ?? "₱0.00"}
                      </Text>
                      <Text
                        style={{
                          fontSize: 11,
                          color: variant.in_stock ? "#16A34A" : "#DC2626",
                          marginTop: 2,
                        }}
                      >
                        {variant.in_stock
                          ? `${variant.available_quantity ?? 0} available`
                          : "Out of Stock"}
                      </Text>
                    </View>
                  </View>
                  {isSelected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color="#EA580C"
                    />
                  )}
                </TouchableOpacity>

                {isSelected && variant.in_stock && (
                  <View
                    style={{
                      borderWidth: 2,
                      borderTopWidth: 0,
                      borderColor: "#EA580C",
                      borderBottomLeftRadius: 10,
                      borderBottomRightRadius: 10,
                      backgroundColor: "#FFF7ED",
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: "#374151",
                      }}
                    >
                      Quantity
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <TouchableOpacity
                        onPress={() =>
                          setTempQuantityForVariant(
                            variant.id,
                            Math.max(1, variantQty - 1),
                          )
                        }
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          backgroundColor: "#F3F4F6",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <Ionicons name="remove" size={20} color="#374151" />
                      </TouchableOpacity>
                      <Text
                        style={{
                          fontSize: 18,
                          fontWeight: "600",
                          color: "#111827",
                          minWidth: 36,
                          textAlign: "center",
                        }}
                      >
                        {variantQty}
                      </Text>
                      <TouchableOpacity
                        onPress={() =>
                          setTempQuantityForVariant(
                            variant.id,
                            Math.min(
                              variant.available_quantity ?? 99,
                              variantQty + 1,
                            ),
                          )
                        }
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          backgroundColor: "#F3F4F6",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <Ionicons name="add" size={20} color="#374151" />
                      </TouchableOpacity>
                      <Text
                        style={{
                          fontSize: 12,
                          color: "#6B7280",
                          marginLeft: 4,
                        }}
                      >
                        / {variant.available_quantity ?? 0}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>

        <View
          style={{
            flexDirection: "row",
            gap: 12,
            paddingHorizontal: 20,
            paddingVertical: 16,
            borderTopWidth: 1,
            borderTopColor: "#F3F4F6",
            backgroundColor: "#FFFFFF",
          }}
        >
          <TouchableOpacity
            onPress={onClose}
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: "#E5E7EB",
              borderRadius: 10,
              paddingVertical: 14,
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#6B7280" }}>
              Cancel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleConfirm}
            style={{
              flex: 2,
              backgroundColor: "#EA580C",
              borderRadius: 10,
              paddingVertical: 14,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Ionicons name={confirmIcon as any} size={18} color="#FFFFFF" />
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#FFFFFF" }}>
              {confirmLabel}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ─── Ownership Info Card ───────────────────────────────────────────────────────
const OwnershipInfoCard = ({
  variant,
  onProofImagePress,
}: {
  variant: Variant;
  onProofImagePress: (url: string) => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const proofUrl = resolveProofImageUrl(variant);

  if (!variant.original_price && !variant.purchase_date && !proofUrl)
    return null;

  const savings =
    variant.original_price && variant.price
      ? parseFloat(variant.original_price) - parseFloat(variant.price)
      : null;

  return (
    <View
      style={{
        backgroundColor: "#FFF7ED",
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#FED7AA",
        overflow: "hidden",
      }}
    >
      <TouchableOpacity
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          padding: 14,
          backgroundColor: isExpanded ? "#FFEDD5" : "#FFF7ED",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="time-outline" size={16} color="#EA580C" />
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#111827" }}>
            Item History & Ownership
          </Text>
        </View>
        <Ionicons
          name={isExpanded ? "chevron-up" : "chevron-down"}
          size={20}
          color="#EA580C"
        />
      </TouchableOpacity>
      {isExpanded && (
        <View style={{ padding: 14, paddingTop: 4 }}>
          {variant.original_price && (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <Text style={{ fontSize: 13, color: "#6B7280" }}>
                Original Price
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: "#374151",
                  textDecorationLine: "line-through",
                }}
              >
                {formatCurrency(variant.original_price)}
              </Text>
            </View>
          )}
          {variant.price && (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <Text style={{ fontSize: 13, color: "#6B7280" }}>
                Current Price
              </Text>
              <Text
                style={{ fontSize: 13, fontWeight: "700", color: "#EA580C" }}
              >
                {formatCurrency(variant.price)}
              </Text>
            </View>
          )}
          {savings && savings > 0 && (
            <View
              style={{
                backgroundColor: "#DCFCE7",
                padding: 8,
                borderRadius: 8,
                marginBottom: 8,
                flexDirection: "row",
                justifyContent: "space-between",
              }}
            >
              <Text
                style={{ fontSize: 12, color: "#059669", fontWeight: "600" }}
              >
                You Save
              </Text>
              <Text
                style={{ fontSize: 12, color: "#059669", fontWeight: "700" }}
              >
                {formatCurrency(savings)} (
                {Math.round(
                  (savings / parseFloat(variant.original_price!)) * 100,
                )}
                %)
              </Text>
            </View>
          )}
          {variant.purchase_date && (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <Text style={{ fontSize: 13, color: "#6B7280" }}>
                Purchase Date
              </Text>
              <Text style={{ fontSize: 13, color: "#374151" }}>
                {formatDate(variant.purchase_date)}
              </Text>
            </View>
          )}
          {variant.usage_period && variant.usage_unit && (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <Text style={{ fontSize: 13, color: "#6B7280" }}>
                Usage Period
              </Text>
              <Text style={{ fontSize: 13, color: "#374151" }}>
                {variant.usage_period} {variant.usage_unit}
              </Text>
            </View>
          )}
          {variant.depreciation_rate && (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <Text style={{ fontSize: 13, color: "#6B7280" }}>
                Depreciation Rate
              </Text>
              <Text style={{ fontSize: 13, color: "#374151" }}>
                {variant.depreciation_rate}% / year
              </Text>
            </View>
          )}
          {proofUrl && (
            <View style={{ marginTop: 10 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  marginBottom: 8,
                }}
              >
                <Ionicons
                  name="shield-checkmark-outline"
                  size={14}
                  color="#EA580C"
                />
                <Text style={{ fontSize: 13, color: "#6B7280" }}>
                  Proof of Ownership
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => onProofImagePress(proofUrl)}
                style={{
                  width: 90,
                  height: 90,
                  borderRadius: 8,
                  overflow: "hidden",
                  borderWidth: 2,
                  borderColor: "#34D399",
                }}
              >
                <Image
                  source={{ uri: proofUrl }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
                <View
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: "rgba(52,211,153,0.8)",
                    paddingVertical: 3,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{ fontSize: 9, fontWeight: "700", color: "#FFFFFF" }}
                  >
                    Tap to view
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

// ─── Seller Info Card ──────────────────────────────────────────────────────────
const SellerInfoCard = ({
  product,
  onPress,
}: {
  product: ProductDetail;
  onPress: () => void;
}) => {
  const displayName = product.shop?.name || product.seller_name;
  if (!displayName) return null;

  const displayAvatar = product.shop?.shop_picture || product.seller_avatar;

  const getInitials = (name: string) => {
    if (!name) return "";
    return name
      .split(" ")
      .map((part) => part.charAt(0))
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        padding: 14,
        marginBottom: 12,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: "#EA580C",
          justifyContent: "center",
          alignItems: "center",
          marginRight: 12,
          overflow: "hidden",
        }}
      >
        {displayAvatar ? (
          <Image
            source={{ uri: displayAvatar }}
            style={{ width: 48, height: 48, borderRadius: 24 }}
          />
        ) : (
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#FFFFFF" }}>
            {getInitials(displayName)}
          </Text>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: "700", color: "#111827" }}>
          {displayName}
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginTop: 4,
          }}
        >
          <View
            style={{
              backgroundColor: "#FFF7ED",
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 4,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: "600", color: "#EA580C" }}>
              {product.shop
                ? "Shop"
                : product.listing_type === "shop"
                  ? "Shop"
                  : "Personal Seller"}
            </Text>
          </View>
          {product.shop?.verified && (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 2 }}
            >
              <Ionicons name="checkmark-circle" size={12} color="#16A34A" />
              <Text style={{ fontSize: 10, color: "#16A34A" }}>Verified</Text>
            </View>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );
};

// ─── Reviews Section ───────────────────────────────────────────────────────────
const ReviewsSection = ({
  reviews,
  averageRating,
  totalReviews,
}: {
  reviews?: any[];
  averageRating?: number;
  totalReviews?: number;
}) => {
  if (!reviews || reviews.length === 0) {
    return (
      <View
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 12,
          borderWidth: 1,
          borderColor: "#E5E7EB",
          padding: 20,
          marginBottom: 12,
          alignItems: "center",
        }}
      >
        <Ionicons name="chatbubble-outline" size={32} color="#9CA3AF" />
        <Text style={{ fontSize: 14, color: "#6B7280", marginTop: 8 }}>
          No reviews yet
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        padding: 14,
        marginBottom: 12,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <Text style={{ fontSize: 15, fontWeight: "700", color: "#111827" }}>
          Reviews ({totalReviews || 0})
        </Text>
        {averageRating ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <StarRow count={Math.round(averageRating)} />
            <Text style={{ fontSize: 13, color: "#6B7280", marginLeft: 4 }}>
              {averageRating.toFixed(1)}
            </Text>
          </View>
        ) : null}
      </View>
      {reviews.slice(0, 3).map((review) => (
        <View
          key={review.id}
          style={{
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: "#F3F4F6",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151" }}>
              {review.customer?.username || "Anonymous"}
            </Text>
            {review.rating && <StarRow count={review.rating} />}
          </View>
          <Text
            style={{
              fontSize: 13,
              color: "#6B7280",
              marginTop: 4,
              lineHeight: 18,
            }}
          >
            {review.comment || "No comment"}
          </Text>
          {review.created_at && (
            <Text style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>
              {formatDate(review.created_at)}
            </Text>
          )}
        </View>
      ))}
      {reviews.length > 3 && (
        <TouchableOpacity style={{ marginTop: 10, alignItems: "center" }}>
          <Text style={{ fontSize: 13, color: "#EA580C", fontWeight: "500" }}>
            See all {reviews.length} reviews
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function CustomerViewProductScreen() {
  const { userId } = useAuth();
  const params = useLocalSearchParams<{
    id?: string | string[];
    productId?: string | string[];
  }>();
  const rawProductId = params.id ?? params.productId;
  const productId = Array.isArray(rawProductId)
    ? String(rawProductId[0] ?? "")
    : rawProductId
      ? String(rawProductId)
      : "";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [quantityMap, setQuantityMap] = useState<Record<string, number>>({});
  const [addingToCart, setAddingToCart] = useState(false);
  const [variantModalVisible, setVariantModalVisible] = useState(false);
  const [proofGalleryVisible, setProofGalleryVisible] = useState(false);
  const [proofGalleryImages, setProofGalleryImages] = useState<string[]>([]);
  const [pendingAction, setPendingAction] = useState<
    "add_to_cart" | "buy_now" | null
  >(null);

  // Toast state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "info">(
    "success",
  );

  const showToast = (
    message: string,
    type: "success" | "error" | "info" = "success",
  ) => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const quantity = selectedVariant ? (quantityMap[selectedVariant.id] ?? 1) : 1;

  const fetchProduct = useCallback(async () => {
    if (!productId) {
      setLoading(false);
      return;
    }
    try {
      const headers: any = {};
      if (userId) headers["X-User-Id"] = userId;
      const response = await AxiosInstance.get(
        `/public-products/${productId}/`,
        { headers },
      );
      if (response.data) {
        setProduct(response.data);
        setSelectedVariant(null);
        const initialQuantityMap: Record<string, number> = {};
        response.data.variants?.forEach((v: Variant) => {
          initialQuantityMap[v.id] = 1;
        });
        setQuantityMap(initialQuantityMap);
      }
    } catch (error: any) {
      if (error.response?.status === 404)
        Alert.alert("Error", "Product not found.");
      else Alert.alert("Error", "Unable to load product details.");
      setProduct(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [productId, userId]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  const productImages = useMemo(() => {
    const mediaItems = product?.media_files ?? product?.media ?? [];
    return mediaItems
      .map(resolveMediaUrl)
      .filter((url): url is string => !!url);
  }, [product]);

  const variantImages = useMemo(() => {
    return (product?.variants ?? [])
      .map(resolveVariantImageUrl)
      .filter((url): url is string => !!url);
  }, [product]);

  const galleryImages = useMemo(
    () => [...productImages, ...variantImages],
    [productImages, variantImages],
  );

  const openGallery = (index: number = 0) => {
    setSelectedImageIndex(index);
    setGalleryVisible(true);
  };

  const openProofGallery = (url: string) => {
    setProofGalleryImages([url]);
    setProofGalleryVisible(true);
  };

  const toggleFavorite = async () => {
    if (!userId) {
      Alert.alert("Sign In Required", "Please sign in to add to favorites");
      return;
    }
    Alert.alert("Coming Soon", "Favorite functionality will be implemented");
  };

  const openVariantSelection = () => {
    if (product?.variants && product.variants.length > 0) {
      setVariantModalVisible(true);
    } else {
      Alert.alert("Error", "No variants available for this product");
    }
  };

  // ── Add to Cart ───────────────────────────────────────────────────────────
  const addToCart = async () => {
    if (!userId) {
      Alert.alert("Sign In Required", "Please sign in to add items to cart");
      return;
    }

    if (!selectedVariant) {
      if (product?.variants && product.variants.length > 0) {
        setPendingAction("add_to_cart");
        setVariantModalVisible(true);
      } else {
        Alert.alert("Error", "No variants available for this product");
      }
      return;
    }

    if (!selectedVariant.in_stock) {
      Alert.alert("Out of Stock", "This variant is currently out of stock");
      return;
    }

    setAddingToCart(true);
    try {
      const response = await AxiosInstance.post("/view-cart/", {
        user_id: userId,
        variant_id: selectedVariant.id,
        quantity,
      });
      const isCreated = response.data?.created === true;
      showToast(
        isCreated
          ? `${product?.name} added to cart!`
          : `Cart updated — ${response.data?.cart_item?.quantity ?? quantity} item(s) in cart.`,
        "success",
      );
    } catch (err: any) {
      const msg =
        err.response?.data?.error ??
        err.response?.data?.detail ??
        "Failed to add to cart.";
      showToast(msg, "error");
    } finally {
      setAddingToCart(false);
    }
  };

  // ── Buy Now ───────────────────────────────────────────────────────────────
  const buyNow = () => {
    if (!userId) {
      Alert.alert("Sign In Required", "Please sign in to purchase");
      return;
    }

    if (!selectedVariant) {
      if (product?.variants && product.variants.length > 0) {
        setPendingAction("buy_now");
        setVariantModalVisible(true);
      } else {
        Alert.alert("Error", "No variants available for this product");
      }
      return;
    }

    if (!selectedVariant.in_stock) {
      Alert.alert("Out of Stock", "This variant is currently out of stock");
      return;
    }

    router.push({
      pathname: "/customer/checkout",
      params: {
        productId,
        variantId: selectedVariant.id,
        quantity: String(quantity),
      },
    });
  };

  // ── Execute pending action after variant selection ───────────────────────
  const executePendingAction = async (
    resolvedVariant: Variant,
    resolvedQuantity: number,
  ) => {
    if (pendingAction === "add_to_cart") {
      setAddingToCart(true);
      try {
        const response = await AxiosInstance.post("/view-cart/", {
          user_id: userId,
          variant_id: resolvedVariant.id,
          quantity: resolvedQuantity,
        });
        const isCreated = response.data?.created === true;
        showToast(
          isCreated
            ? `${product?.name} added to cart!`
            : `Cart updated — ${response.data?.cart_item?.quantity ?? resolvedQuantity} item(s) in cart.`,
          "success",
        );
      } catch (err: any) {
        const msg =
          err.response?.data?.error ??
          err.response?.data?.detail ??
          "Failed to add to cart.";
        showToast(msg, "error");
      } finally {
        setAddingToCart(false);
        setPendingAction(null);
      }
    } else if (pendingAction === "buy_now") {
      setPendingAction(null);
      router.push({
        pathname: "/customer/checkout",
        params: {
          productId,
          variantId: resolvedVariant.id,
          quantity: String(resolvedQuantity),
        },
      });
    }
  };

  const handleVariantConfirm = () => {
    setVariantModalVisible(false);
    // selectedVariant and quantityMap are updated synchronously via onSelectVariant/onQuantityChange
    // Use a short timeout to let state settle, then read from refs
    setTimeout(() => {
      setSelectedVariant((currentVariant) => {
        setQuantityMap((currentQtyMap) => {
          if (currentVariant) {
            const currentQty = currentQtyMap[currentVariant.id] ?? 1;
            executePendingAction(currentVariant, currentQty);
          }
          return currentQtyMap;
        });
        return currentVariant;
      });
    }, 150);
  };

  const handleQuantityChange = (variantId: string, qty: number) => {
    setQuantityMap((prev) => ({ ...prev, [variantId]: qty }));
  };

  if (loading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: "#F9FAFB",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color="#EA580C" />
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 10,
            flexDirection: "row",
            alignItems: "center",
            borderBottomWidth: 1,
            borderBottomColor: "#E5E7EB",
            backgroundColor: "#FFFFFF",
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ padding: 6, marginRight: 8 }}
          >
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#111827" }}>
            Product Details
          </Text>
        </View>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 24,
          }}
        >
          <Text style={{ color: "#6B7280" }}>Product not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isInStock = selectedVariant?.in_stock ?? product.has_stock;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      {/* Toast */}
      <ToastNotification
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() => setToastVisible(false)}
      />

      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 10,
          flexDirection: "row",
          alignItems: "center",
          borderBottomWidth: 1,
          borderBottomColor: "#E5E7EB",
          backgroundColor: "#FFFFFF",
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ padding: 6, marginRight: 8 }}
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text
          style={{
            fontSize: 18,
            fontWeight: "700",
            color: "#111827",
            flex: 1,
          }}
          numberOfLines={1}
        >
          Product Details
        </Text>
        <TouchableOpacity
          onPress={() => router.push("/customer/cart")}
          style={{ padding: 8 }}
        >
          <Ionicons name="cart-outline" size={24} color="#111827" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchProduct();
            }}
          />
        }
      >
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderBottomWidth: 1,
            borderColor: "#E5E7EB",
            overflow: "hidden",
            marginBottom: 12,
            marginTop: -16,
            marginHorizontal: -16,
          }}
        >
          {productImages.length > 0 ? (
            <View>
              <FlatList
                data={productImages}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={(e) => {
                  const idx = Math.round(
                    e.nativeEvent.contentOffset.x / SCREEN_WIDTH,
                  );
                  setSelectedImageIndex(idx);
                }}
                scrollEventThrottle={16}
                renderItem={({ item, index }) => (
                  <TouchableOpacity
                    activeOpacity={0.92}
                    onPress={() => openGallery(index)}
                    style={{ width: SCREEN_WIDTH, height: 300 }}
                  >
                    <Image
                      source={{ uri: item }}
                      style={{ width: "100%", height: "100%" }}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                )}
                keyExtractor={(_, index) => index.toString()}
              />
              {productImages.length > 1 && (
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 6,
                    paddingVertical: 10,
                  }}
                >
                  {productImages.map((_, i) => (
                    <View
                      key={i}
                      style={{
                        width: selectedImageIndex === i ? 20 : 7,
                        height: 7,
                        borderRadius: 4,
                        backgroundColor:
                          selectedImageIndex === i ? "#EA580C" : "#D1D5DB",
                      }}
                    />
                  ))}
                </View>
              )}
            </View>
          ) : (
            <View
              style={{
                height: 300,
                backgroundColor: "#F3F4F6",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Ionicons name="image-outline" size={48} color="#9CA3AF" />
            </View>
          )}

          <View style={{ padding: 16 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 8,
                marginBottom: 6,
                minWidth: 0,
              }}
            >
              <Text
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: 20,
                  fontWeight: "700",
                  color: "#111827",
                  lineHeight: 28,
                }}
              >
                {product.name}
              </Text>
              <TouchableOpacity
                onPress={toggleFavorite}
                style={{ padding: 8, marginRight: 4, flexShrink: 0 }}
              >
                <Ionicons
                  name={product.is_favorite ? "heart" : "heart-outline"}
                  size={22}
                  color={product.is_favorite ? "#EF4444" : "#6B7280"}
                />
              </TouchableOpacity>
            </View>

            {product.condition && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 4,
                }}
              >
                <StarRow count={product.condition} />
                <Text style={{ fontSize: 12, color: "#6B7280" }}>
                  {CONDITION_SCALE[product.condition]?.shortLabel ??
                    `${product.condition}/5`}
                </Text>
              </View>
            )}

            <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }}>
              {product.category_admin?.name ||
                product.category?.name ||
                "Uncategorized"}
            </Text>

            <Text
              style={{
                fontSize: 26,
                fontWeight: "700",
                color: "#EA580C",
                marginTop: 8,
              }}
            >
              {selectedVariant
                ? (formatCurrency(selectedVariant.price) ?? "₱0.00")
                : product.price_range?.min === product.price_range?.max
                  ? (formatCurrency(product.price_range?.min) ?? "₱0.00")
                  : `${formatCurrency(product.price_range?.min) ?? "₱0.00"} – ${formatCurrency(product.price_range?.max) ?? "₱0.00"}`}
            </Text>

            <View
              style={{
                marginTop: 10,
                flexDirection: "row",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              {product.is_refundable && (
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 999,
                    backgroundColor: "#DCFCE7",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      color: "#166534",
                      fontWeight: "600",
                    }}
                  >
                    Refundable ({product.refund_days ?? 0} days)
                  </Text>
                </View>
              )}
            </View>

            {/* Variant Selection Button */}
            {product.variants && product.variants.length > 0 && (
              <TouchableOpacity
                onPress={openVariantSelection}
                style={{
                  marginTop: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: "#F9FAFB",
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  borderRadius: 10,
                  padding: 12,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 13,
                      color: "#6B7280",
                      marginBottom: 2,
                    }}
                  >
                    Variant & Quantity
                  </Text>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "600",
                      color: "#111827",
                    }}
                  >
                    {selectedVariant?.title || "Select Option"}
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  {selectedVariant && selectedVariant.in_stock && (
                    <Text
                      style={{
                        fontSize: 13,
                        color: "#6B7280",
                      }}
                    >
                      Qty: {quantity}
                    </Text>
                  )}
                  {selectedVariant && (
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "700",
                        color: "#EA580C",
                      }}
                    >
                      {formatCurrency(selectedVariant.price) ?? "₱0.00"}
                    </Text>
                  )}
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </View>
              </TouchableOpacity>
            )}

            <View
              style={{
                marginTop: 16,
                paddingTop: 16,
                borderTopWidth: 1,
                borderTopColor: "#E5E7EB",
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "700",
                  color: "#111827",
                  marginBottom: 8,
                }}
              >
                Description
              </Text>
              <Text style={{ fontSize: 14, color: "#374151", lineHeight: 22 }}>
                {product.description || "No description provided."}
              </Text>
            </View>
          </View>
        </View>

        <SellerInfoCard
          product={product}
          onPress={() => {
            const shopId = product.shop?.id ?? product.seller_id;
            if (shopId) {
              router.push({
                pathname: "/customer/view-shop",
                params: { shopId },
              });
            } else {
              Alert.alert("Error", "Shop not found");
            }
          }}
        />

        {selectedVariant && (
          <OwnershipInfoCard
            variant={selectedVariant}
            onProofImagePress={openProofGallery}
          />
        )}

        <ReviewsSection
          reviews={product.reviews}
          averageRating={product.average_rating}
          totalReviews={product.total_reviews}
        />
      </ScrollView>

      {/* ── Footer Action Bar ─────────────────────────────────────────────── */}
      {isInStock ? (
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: "#FFFFFF",
            borderTopWidth: 1,
            borderTopColor: "#E5E7EB",
            paddingHorizontal: 16,
            paddingVertical: 12,
            paddingBottom: 20,
            flexDirection: "row",
            gap: 10,
          }}
        >
          {/* Add to Cart */}
          <TouchableOpacity
            onPress={addToCart}
            disabled={addingToCart}
            style={{
              flex: 1,
              borderWidth: 2,
              borderColor: "#F97316",
              borderRadius: 10,
              paddingVertical: 14,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              backgroundColor: "#FFFFFF",
            }}
          >
            {addingToCart ? (
              <ActivityIndicator size="small" color="#F97316" />
            ) : (
              <>
                <Ionicons name="cart-outline" size={20} color="#F97316" />
                <Text
                  style={{ fontSize: 14, fontWeight: "700", color: "#F97316" }}
                >
                  Add to Cart
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Buy Now */}
          <TouchableOpacity
            onPress={buyNow}
            disabled={addingToCart}
            style={{
              flex: 1,
              backgroundColor: addingToCart ? "#F97316" : "#EA580C",
              borderRadius: 10,
              paddingVertical: 14,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              opacity: addingToCart ? 0.7 : 1,
            }}
          >
            <Ionicons name="flash-outline" size={20} color="#FFFFFF" />
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#FFFFFF" }}>
              Buy Now
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: "#F9FAFB",
            borderTopWidth: 1,
            borderTopColor: "#E5E7EB",
            padding: 16,
            paddingBottom: 20,
          }}
        >
          <View
            style={{
              backgroundColor: "#FEE2E2",
              borderRadius: 10,
              padding: 14,
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 14, color: "#DC2626", fontWeight: "700" }}>
              Currently Out of Stock
            </Text>
          </View>
        </View>
      )}

      {/* Variant Selection Modal */}
      {product.variants && (
        <VariantSelectionModal
          visible={variantModalVisible}
          variants={product.variants}
          selectedVariant={selectedVariant}
          quantityMap={quantityMap}
          onSelectVariant={setSelectedVariant}
          onQuantityChange={handleQuantityChange}
          onConfirm={handleVariantConfirm}
          onClose={() => {
            setVariantModalVisible(false);
            setPendingAction(null);
          }}
          productName={product.name}
          pendingAction={pendingAction}
        />
      )}

      <ImageGalleryModal
        visible={galleryVisible}
        images={galleryImages}
        initialIndex={selectedImageIndex}
        onClose={() => setGalleryVisible(false)}
      />

      <ImageGalleryModal
        visible={proofGalleryVisible}
        images={proofGalleryImages}
        initialIndex={0}
        onClose={() => setProofGalleryVisible(false)}
      />
    </SafeAreaView>
  );
}
