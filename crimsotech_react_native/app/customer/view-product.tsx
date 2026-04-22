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
  Animated,
  findNodeHandle,
  UIManager,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import AxiosInstance from "../../contexts/axios";
import { useAuth } from "../../contexts/AuthContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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
  shop_picture_url?: string | null;
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
    average_rating?: number;
    condition_rating?: number;
    accuracy_rating?: number;
    value_rating?: number;
    delivery_rating?: number;
    comment?: string;
    customer?: { id: string; username?: string; name?: string };
    created_at?: string;
    variant_title?: string;
    media?: Array<{
      id: string;
      file_url?: string;
      file_data?: string;
      file_type?: string;
    }>;
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

// ─── Center Toast Notification for Favorites ───────────────────────────────────
const CenterToast = ({
  visible,
  message,
  onHide,
}: {
  visible: boolean;
  message: string;
  onHide: () => void;
}) => {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.spring(scale, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => onHide());
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center",
        zIndex: 10000,
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={{
          backgroundColor: "transparent",
          paddingHorizontal: 24,
          paddingVertical: 12,
          alignItems: "center",
          justifyContent: "center",
          transform: [{ scale }],
          opacity,
        }}
      >
        <Ionicons name="heart" size={32} color="#EA580C" />
        <Text
          style={{
            fontSize: 16,
            fontWeight: "600",
            color: "#EA580C",
            marginTop: 8,
            textAlign: "center",
          }}
        >
          {message}
        </Text>
      </Animated.View>
    </View>
  );
};

// ─── Added to Cart Overlay ─────────────────────────────────────────────────────
const AddedToCartOverlay = ({
  visible,
  onHide,
}: {
  visible: boolean;
  onHide: () => void;
}) => {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.spring(scale, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => onHide());
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={{
          backgroundColor: "transparent",
          alignItems: "center",
          gap: 8,
          transform: [{ scale }],
          opacity,
        }}
      >
        <Ionicons name="cart-outline" size={48} color="#EA580C" />
        <Text style={{ fontSize: 16, fontWeight: "600", color: "#EA580C" }}>
          Added to Cart
        </Text>
      </Animated.View>
    </View>
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
        borderRadius: 0,
        marginBottom: 0,
        borderWidth: 0,
        borderColor: "#FED7AA",
        overflow: "hidden",
        borderBottomWidth: 1,
        borderBottomColor: "#FFEDD5",
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

// ─── Seller Info Card ─────────────────────────────────────────────────────────
const SellerInfoCard = ({
  product,
  onPress,
  shopInfo,
}: {
  product: ProductDetail;
  onPress: () => void;
  shopInfo?: {
    followers?: number;
    rating?: number;
    address?: string;
  };
}) => {
  const displayName = product.shop?.name || product.seller_name;
  if (!displayName) return null;

  const ensureAbsoluteUrl = (url?: string | null) => {
    if (!url) return null;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    const base = AxiosInstance.defaults?.baseURL?.replace(/\/$/, "") || "";
    if (!base) return url;
    if (url.startsWith("/")) return `${base}${url}`;
    return `${base}/${url}`;
  };

  const displayAvatar =
    product.shop_picture_url ||
    product.shop?.shop_picture ||
    product.seller_avatar;

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
        borderRadius: 0,
        borderWidth: 0,
        borderColor: "#E5E7EB",
        padding: 16,
        marginBottom: 0,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View
          style={{
            width: 60,
            height: 60,
            borderRadius: 30,
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
              style={{ width: 60, height: 60, borderRadius: 30 }}
            />
          ) : (
            <Text style={{ fontSize: 20, fontWeight: "700", color: "#FFFFFF" }}>
              {getInitials(displayName)}
            </Text>
          )}
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: "#111827",
              marginBottom: 4,
            }}
          >
            {displayName}
          </Text>

          {(product.shop?.street ||
            product.shop?.barangay ||
            product.shop?.city ||
            shopInfo?.address) && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                marginBottom: 4,
              }}
            >
              <Ionicons name="location-outline" size={12} color="#6B7280" />
              <Text style={{ fontSize: 12, color: "#6B7280" }} numberOfLines={1}>
                {shopInfo?.address ||
                  [
                    product.shop?.street,
                    product.shop?.barangay,
                    product.shop?.city,
                  ]
                    .filter(Boolean)
                    .join(", ")}
              </Text>
            </View>
          )}

          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            {shopInfo?.followers !== undefined && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Ionicons name="people-outline" size={12} color="#6B7280" />
                <Text style={{ fontSize: 12, color: "#4B5563" }}>
                  {shopInfo.followers}{" "}
                  {shopInfo.followers === 1 ? "follower" : "followers"}
                </Text>
              </View>
            )}

            {shopInfo?.rating ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Ionicons name="star" size={12} color="#F59E0B" />
                <Text style={{ fontSize: 12, color: "#4B5563" }}>
                  {shopInfo.rating.toFixed(1)}
                </Text>
              </View>
            ) : product.shop?.verified ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Ionicons name="checkmark-circle" size={12} color="#16A34A" />
                <Text style={{ fontSize: 11, color: "#16A34A" }}>Verified</Text>
              </View>
            ) : null}
          </View>
        </View>

        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      </View>
    </TouchableOpacity>
  );
};

// ─── Reviews Section ───────────────────────────────────────────────────────────
const ReviewsSection = ({
  reviews,
  averageRating,
  totalReviews,
  productName,
}: {
  reviews?: any[];
  averageRating?: number;
  totalReviews?: number;
  productName?: string;
}) => {
  const [expandedReview, setExpandedReview] = useState<string | null>(null);
  const [mediaModalVisible, setMediaModalVisible] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<string[]>([]);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);

  const ensureAbsoluteUrl = (url?: string | null) => {
    if (!url) return null;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    const base = AxiosInstance.defaults?.baseURL?.replace(/\/$/, "") || "";
    if (!base) return url;
    if (url.startsWith("/")) return `${base}${url}`;
    return `${base}/${url}`;
  };

  if (!reviews || reviews.length === 0) {
    return (
      <View
        style={{
          backgroundColor: "#FFFFFF",
          padding: 20,
          alignItems: "center",
        }}
      >
        <Ionicons name="chatbubble-outline" size={32} color="#9CA3AF" />
        <Text style={{ fontSize: 14, color: "#6B7280", marginTop: 8 }}>
          No reviews yet
        </Text>
        <Text style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>
          Be the first to review this product
        </Text>
      </View>
    );
  }

  const openMediaGallery = (mediaUrls: string[], startIndex: number = 0) => {
    setSelectedMedia(mediaUrls);
    setSelectedMediaIndex(startIndex);
    setMediaModalVisible(true);
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((part) => part.charAt(0))
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <>
      <View
        style={{
          backgroundColor: "#FFFFFF",
          padding: 16,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827" }}>
            Customer Reviews ({totalReviews || 0})
          </Text>
          {averageRating ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <StarRow count={Math.round(averageRating)} />
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#EA580C" }}>
                {averageRating.toFixed(1)}
              </Text>
            </View>
          ) : null}
        </View>

        {reviews.map((review) => {
          const profilePicUrl = ensureAbsoluteUrl(
            review.customer?.profile_picture,
          );

          return (
            <View
              key={review.id}
              style={{
                borderBottomWidth: 1,
                borderBottomColor: "#F3F4F6",
                paddingVertical: 14,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  {profilePicUrl ? (
                    <Image
                      source={{ uri: profilePicUrl }}
                      style={{ width: 36, height: 36, borderRadius: 18 }}
                    />
                  ) : (
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: "#EA580C",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "600",
                          color: "#FFFFFF",
                        }}
                      >
                        {getInitials(
                          review.customer?.name ||
                            review.customer?.username ||
                            "User",
                        )}
                      </Text>
                    </View>
                  )}
                  <View>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: "#111827",
                      }}
                    >
                      {review.customer?.name ||
                        review.customer?.username ||
                        "Anonymous"}
                    </Text>
                    <Text style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>
                      {formatDate(review.created_at)}
                    </Text>
                  </View>
                </View>
                <StarRow
                  count={Math.round(
                    review.average_rating || review.rating || 0,
                  )}
                />
              </View>

              <View style={{ marginBottom: 12, marginTop: 4 }}>
                <Text style={{ fontSize: 12, color: "#6B7280", marginBottom: 2 }}>
                  Product:
                </Text>
                <Text style={{ fontSize: 14, fontWeight: "600", color: "#111827" }}>
                  {productName}
                  {review.variant_title ? ` / ${review.variant_title}` : ""}
                </Text>
              </View>

              <View style={{ marginBottom: 10 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  {review.condition_rating && (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        flex: 1,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "500",
                          color: "#374151",
                        }}
                      >
                        Condition:
                      </Text>
                      <StarRow count={review.condition_rating} />
                    </View>
                  )}
                  {review.accuracy_rating && (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        flex: 1,
                        marginLeft: 8,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "500",
                          color: "#374151",
                        }}
                      >
                        Accuracy:
                      </Text>
                      <StarRow count={review.accuracy_rating} />
                    </View>
                  )}
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  {review.value_rating && (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        flex: 1,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "500",
                          color: "#374151",
                        }}
                      >
                        Value:
                      </Text>
                      <StarRow count={review.value_rating} />
                    </View>
                  )}
                  {review.delivery_rating && (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        flex: 1,
                        marginLeft: 8,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "500",
                          color: "#374151",
                        }}
                      >
                        Delivery:
                      </Text>
                      <StarRow count={review.delivery_rating} />
                    </View>
                  )}
                </View>
              </View>

              {review.comment && (
                <Text
                  style={{
                    fontSize: 13,
                    color: "#374151",
                    lineHeight: 18,
                    marginBottom: 10,
                  }}
                  numberOfLines={expandedReview === review.id ? undefined : 3}
                >
                  {review.comment}
                </Text>
              )}

              {review.comment &&
                review.comment.length > 150 &&
                expandedReview !== review.id && (
                  <TouchableOpacity onPress={() => setExpandedReview(review.id)}>
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#EA580C",
                        fontWeight: "500",
                      }}
                    >
                      Read more
                    </Text>
                  </TouchableOpacity>
                )}

              {review.media && review.media.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginTop: 8 }}
                  contentContainerStyle={{ gap: 8 }}
                >
                  {review.media.map((media: any, idx: number) => {
                    const mediaUrls = review.media
                      .map((m: any) => m.file_url || m.file_data)
                      .filter(Boolean);
                    return (
                      <TouchableOpacity
                        key={media.id}
                        onPress={() => openMediaGallery(mediaUrls, idx)}
                      >
                        <Image
                          source={{ uri: media.file_url || media.file_data }}
                          style={{
                            width: 70,
                            height: 70,
                            borderRadius: 8,
                            backgroundColor: "#F3F4F6",
                          }}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          );
        })}
      </View>

      <Modal
        visible={mediaModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMediaModalVisible(false)}
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
            onPress={() => setMediaModalVisible(false)}
          >
            <Ionicons name="close" size={30} color="#FFFFFF" />
          </TouchableOpacity>
          <FlatList
            data={selectedMedia}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={selectedMediaIndex}
            getItemLayout={(_, index) => ({
              length: SCREEN_WIDTH,
              offset: SCREEN_WIDTH * index,
              index,
            })}
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
        </View>
      </Modal>
    </>
  );
};

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function CustomerViewProductScreen() {
  const { userId } = useAuth();
  const insets = useSafeAreaInsets();
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
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [proofGalleryVisible, setProofGalleryVisible] = useState(false);
  const [proofGalleryImages, setProofGalleryImages] = useState<string[]>([]);
  const [centerToastVisible, setCenterToastVisible] = useState(false);
  const [centerToastMessage, setCenterToastMessage] = useState("");
  const [shopInfo, setShopInfo] = useState<{
    followers?: number;
    rating?: number;
    address?: string;
  } | null>(null);
  const [cartItemCount, setCartItemCount] = useState(0);
  const cartBadgeScale = useRef(new Animated.Value(1)).current;
  const cartIconRef = useRef<View>(null);
  const productImageRef = useRef<View>(null);
  
  // Store selected variant ID in a ref to ensure we always have the latest value
  const selectedVariantIdRef = useRef<string | null>(null);

  // Fly-to-cart animation
  const flyToCartX = useRef(new Animated.Value(0)).current;
  const flyToCartY = useRef(new Animated.Value(0)).current;
  const flyToCartScale = useRef(new Animated.Value(1)).current;
  const flyToCartOpacity = useRef(new Animated.Value(0)).current;
  const [flyToCartVisible, setFlyToCartVisible] = useState(false);
  const [flyToCartImageUri, setFlyToCartImageUri] = useState<string>("");

  // Toast state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "info">(
    "success",
  );
  const [showAddedToCartOverlay, setShowAddedToCartOverlay] = useState(false);

  const showToast = (
    message: string,
    type: "success" | "error" | "info" = "success",
  ) => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const fetchCartCount = async () => {
    if (!userId) return;
    try {
      const response = await AxiosInstance.get(`/view-cart/?user_id=${userId}`);
      if (response.data.success && response.data.cart_items) {
        const totalItems = response.data.cart_items.reduce(
          (sum: number, item: any) => sum + item.quantity,
          0,
        );
        setCartItemCount(totalItems);
      }
    } catch (error) {
      console.error("Error fetching cart count:", error);
    }
  };

  const animateCartBadge = () => {
    Animated.sequence([
      Animated.spring(cartBadgeScale, {
        toValue: 1.6,
        useNativeDriver: true,
        damping: 8,
        stiffness: 150,
        mass: 0.5,
      }),
      Animated.spring(cartBadgeScale, {
        toValue: 1,
        useNativeDriver: true,
        damping: 8,
        stiffness: 150,
        mass: 0.5,
      }),
    ]).start();
  };

  const fetchShopInfo = useCallback(
    async (shopId: string) => {
      if (!shopId) return;
      try {
        const headers: any = {};
        if (userId) headers["X-User-Id"] = userId;
        const response = await AxiosInstance.get(`/shops/${shopId}/`, {
          headers,
        });
        const data = response.data;
        setShopInfo({
          followers: data.total_followers || 0,
          rating: data.rating,
          address: data.address,
        });
      } catch (error) {
        console.error("Error fetching shop info:", error);
      }
    },
    [userId],
  );

  const animateFlyToCart = async (imageUri: string) => {
    if (!cartIconRef.current) return;
    try {
      flyToCartX.setValue(0);
      flyToCartY.setValue(0);
      flyToCartScale.setValue(1);
      flyToCartOpacity.setValue(1);
      setFlyToCartImageUri(imageUri);
      setFlyToCartVisible(true);
      const cartHandle = findNodeHandle(cartIconRef.current);
      if (!cartHandle) return;
      const cartPos = await new Promise<any>((resolve) => {
        UIManager.measure(cartHandle, (x, y, w, h, px, py) => {
          resolve({ x: px, y: py, width: w, height: h });
        });
      });
      const startX = SCREEN_WIDTH / 2 - 40;
      const startY = Dimensions.get("window").height / 2 - 40;
      const deltaX = cartPos.x - startX + (cartPos.width - 80) / 2;
      const deltaY = cartPos.y - startY + (cartPos.height - 80) / 2;
      Animated.parallel([
        Animated.timing(flyToCartX, {
          toValue: deltaX,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(flyToCartY, {
          toValue: deltaY,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(flyToCartScale, {
          toValue: 0.1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(flyToCartOpacity, {
          toValue: 0,
          duration: 600,
          delay: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setFlyToCartVisible(false);
      });
    } catch (error) {
      console.log("Fly-to-cart animation error:", error);
      setFlyToCartVisible(false);
    }
  };

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
        if (response.data.shop?.id) {
          await fetchShopInfo(response.data.shop.id);
        }
        if (response.data.default_variant) {
          setSelectedVariant(response.data.default_variant);
          selectedVariantIdRef.current = response.data.default_variant.id;
        } else if (response.data.variants?.length > 0) {
          const inStock = response.data.variants.find(
            (v: Variant) => v.in_stock,
          );
          const defaultVariant = inStock || response.data.variants[0];
          setSelectedVariant(defaultVariant);
          selectedVariantIdRef.current = defaultVariant.id;
        }
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
  }, [productId, userId, fetchShopInfo]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  useEffect(() => {
    if (userId) {
      fetchCartCount();
    }
  }, [userId]);

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
    try {
      if (product?.is_favorite) {
        const response = await AxiosInstance.delete("/customer-favorites/", {
          data: { product: productId, customer: userId },
          headers: { "X-User-Id": userId },
        });
        if (response.data.success) {
          setProduct((prev) => (prev ? { ...prev, is_favorite: false } : null));
          setCenterToastMessage("Removed from favorites");
          setCenterToastVisible(true);
        }
      } else {
        const response = await AxiosInstance.post(
          "/customer-favorites/",
          { product: productId, customer: userId },
          { headers: { "X-User-Id": userId } },
        );
        if (response.data.success) {
          setProduct((prev) => (prev ? { ...prev, is_favorite: true } : null));
          setCenterToastMessage("Added to favorites");
          setCenterToastVisible(true);
        }
      }
    } catch (error: any) {
      console.error("Favorite error:", error);
      if (
        error.response?.status === 400 &&
        error.response?.data?.message === "Product is already in favorites"
      ) {
        fetchProduct();
        setCenterToastMessage("Product already in favorites");
        setCenterToastVisible(true);
      } else {
        setCenterToastMessage(
          error.response?.data?.message || "Failed to update favorites",
        );
        setCenterToastVisible(true);
      }
    }
  };

  // ── Add to Cart ───────────────────────────────────────────────────────────────
  const addToCart = async () => {
    if (!userId) {
      Alert.alert("Sign In Required", "Please sign in to add items to cart");
      return;
    }
    if (!selectedVariant) {
      Alert.alert("Error", "Please select a variant");
      return;
    }
    if (!selectedVariant.in_stock) {
      Alert.alert("Out of Stock", "This variant is currently out of stock");
      return;
    }

    setAddingToCart(true);

    const imageUri =
      resolveVariantImageUrl(selectedVariant) ||
      productImages[selectedImageIndex];
    if (imageUri) {
      animateFlyToCart(imageUri);
    }

    try {
      await AxiosInstance.post("/view-cart/", {
        user_id: userId,
        variant_id: selectedVariant.id,
        quantity,
      });
      setShowAddedToCartOverlay(true);
      await fetchCartCount();
      animateCartBadge();
    } catch (err: any) {
      const errorData = err.response?.data;
      if (
        errorData?.error &&
        errorData.error.includes("Only") &&
        errorData.error.includes("available")
      ) {
        showToast(errorData.error, "info");
      } else if (errorData?.error) {
        showToast(errorData.error, "info");
      } else if (errorData?.detail) {
        showToast(errorData.detail, "info");
      } else {
        console.log("Add to cart error:", err);
      }
    } finally {
      setAddingToCart(false);
    }
  };

  // ── Buy Now ───────────────────────────────────────────────────────────────
  const buyNow = useCallback(() => {
    // Use selectedVariant from state or fallback to the ID from ref
    const variantToUse = selectedVariant || (selectedVariantIdRef.current ? product?.variants?.find(v => v.id === selectedVariantIdRef.current) : null);
    
    console.log("🔍 buyNow called - selectedVariant:", variantToUse?.id, variantToUse?.title);
    
    if (!userId) {
      Alert.alert("Sign In Required", "Please sign in to purchase");
      return;
    }
    if (!variantToUse) {
      Alert.alert("Error", "Please select a variant");
      return;
    }
    if (!variantToUse.in_stock) {
      Alert.alert("Out of Stock", "This variant is currently out of stock");
      return;
    }

    console.log("🚀 Navigating to checkout with variantId:", variantToUse.id);
    
    router.push({
      pathname: "/customer/checkout",
      params: {
        productId: productId,
        variantId: variantToUse.id,
        quantity: String(quantity),
      },
    });
  }, [userId, selectedVariant, productId, quantity, product?.variants]);

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
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#F9FAFB" }}
      edges={["bottom", "left", "right"]}
    >
      <ToastNotification
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() => setToastVisible(false)}
      />

      <CenterToast
        visible={centerToastVisible}
        message={centerToastMessage}
        onHide={() => setCenterToastVisible(false)}
      />

      <AddedToCartOverlay
        visible={showAddedToCartOverlay}
        onHide={() => setShowAddedToCartOverlay(false)}
      />

      {/* Header */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: insets.top + 10,
          paddingBottom: 10,
          flexDirection: "row",
          alignItems: "center",
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
          style={{ fontSize: 18, fontWeight: "700", color: "#111827", flex: 1 }}
          numberOfLines={1}
        >
          Product Details
        </Text>
        <View ref={cartIconRef}>
          <TouchableOpacity
            onPress={() => router.push("/customer/cart")}
            style={{ padding: 8, position: "relative" }}
          >
            <Ionicons name="cart-outline" size={24} color="#111827" />
            {cartItemCount > 0 && (
              <Animated.View
                style={{
                  position: "absolute",
                  top: 2,
                  right: 2,
                  backgroundColor: "#F97316",
                  borderRadius: 10,
                  minWidth: 18,
                  height: 18,
                  justifyContent: "center",
                  alignItems: "center",
                  paddingHorizontal: 4,
                  transform: [{ scale: cartBadgeScale }],
                }}
              >
                <Text
                  style={{ fontSize: 10, fontWeight: "bold", color: "#FFFFFF" }}
                >
                  {cartItemCount > 99 ? "99+" : cartItemCount}
                </Text>
              </Animated.View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 0, paddingBottom: 120 }}
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
        {/* Hero Image Carousel */}
        <View
          ref={productImageRef}
          style={{
            backgroundColor: "#FFFFFF",
            overflow: "hidden",
            marginBottom: 0,
            marginTop: 20,
            marginHorizontal: 0,
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

          <View style={{ padding: 16, marginTop: 12 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                justifyContent: "space-between",
                marginBottom: 8,
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

            {product.average_rating && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                <StarRow count={Math.round(product.average_rating)} />
                <Text style={{ fontSize: 13, color: "#6B7280" }}>
                  {product.average_rating.toFixed(1)} (
                  {product.total_reviews || 0} reviews)
                </Text>
              </View>
            )}

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
            <View style={{ marginTop: 8 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <Text
                  style={{
                    fontSize: 26,
                    fontWeight: "700",
                    color: "#EA580C",
                  }}
                >
                  {selectedVariant
                    ? (formatCurrency(selectedVariant.price) ?? "₱0.00")
                    : product.price_range?.min === product.price_range?.max
                      ? (formatCurrency(product.price_range?.min) ?? "₱0.00")
                      : `${formatCurrency(product.price_range?.min) ?? "₱0.00"} – ${formatCurrency(product.price_range?.max) ?? "₱0.00"}`}
                </Text>
                {selectedVariant?.original_price &&
                  parseFloat(selectedVariant.original_price) >
                    parseFloat(selectedVariant.price || "0") && (
                    <Text
                      style={{
                        fontSize: 16,
                        color: "#9CA3AF",
                        textDecorationLine: "line-through",
                      }}
                    >
                      {formatCurrency(selectedVariant.original_price)}
                    </Text>
                  )}
              </View>
            </View>
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
          shopInfo={shopInfo || undefined}
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

        {/* Variant Selection */}
        {product.variants && product.variants.length > 0 && (
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 0,
              borderWidth: 0,
              borderColor: "#E5E7EB",
              padding: 16,
              marginBottom: 0,
              marginHorizontal: 0,
              paddingTop: 12,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "700",
                color: "#111827",
                marginBottom: 12,
              }}
            >
              Select Variant
            </Text>
            {product.variants.map((variant) => (
              <TouchableOpacity
                key={variant.id}
                onPress={() => {
                  console.log("📦 Variant selected:", variant.id, variant.title);
                  setSelectedVariant(variant);
                  selectedVariantIdRef.current = variant.id;
                  setQuantity(1);
                }}
                disabled={!variant.in_stock}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: 12,
                  borderWidth: 2,
                  borderColor:
                    selectedVariant?.id === variant.id ? "#EA580C" : "#E5E7EB",
                  borderRadius: 10,
                  marginBottom: 8,
                  backgroundColor:
                    selectedVariant?.id === variant.id ? "#FFF7ED" : "#FFFFFF",
                  opacity: variant.in_stock ? 1 : 0.5,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  {resolveVariantImageUrl(variant) ? (
                    <Image
                      source={{ uri: resolveVariantImageUrl(variant)! }}
                      style={{ width: 44, height: 44, borderRadius: 6 }}
                    />
                  ) : (
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        backgroundColor: "#F3F4F6",
                        borderRadius: 6,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Ionicons name="cube-outline" size={20} color="#9CA3AF" />
                    </View>
                  )}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      numberOfLines={2}
                      ellipsizeMode="tail"
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: "#111827",
                        lineHeight: 18,
                      }}
                    >
                      {variant.title || variant.sku_code || "Variant"}
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        flexWrap: "wrap",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          color: "#EA580C",
                          fontWeight: "700",
                        }}
                      >
                        {formatCurrency(variant.price) ?? "₱0.00"}
                      </Text>
                      {variant.original_price &&
                        parseFloat(variant.original_price) >
                          parseFloat(variant.price || "0") && (
                          <Text
                            style={{
                              fontSize: 12,
                              color: "#9CA3AF",
                              textDecorationLine: "line-through",
                            }}
                          >
                            {formatCurrency(variant.original_price)}
                          </Text>
                        )}
                    </View>
                    {variant.original_price && (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                          marginTop: 2,
                        }}
                      >
                        <Ionicons name="time-outline" size={10} color="#6B7280" />
                        <Text style={{ fontSize: 10, color: "#6B7280" }}>
                          Pre-owned
                        </Text>
                      </View>
                    )}
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
                <View
                  style={{
                    marginLeft: 8,
                    minWidth: 84,
                    alignItems: "flex-end",
                    justifyContent: "center",
                  }}
                >
                  {!variant.in_stock ? (
                    <View
                      style={{
                        backgroundColor: "#FEE2E2",
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 4,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          color: "#DC2626",
                          fontWeight: "600",
                        }}
                      >
                        Out of Stock
                      </Text>
                    </View>
                  ) : selectedVariant?.id === variant.id ? (
                    <Ionicons name="checkmark-circle" size={24} color="#EA580C" />
                  ) : null}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {selectedVariant && (
          <OwnershipInfoCard
            variant={selectedVariant}
            onProofImagePress={openProofGallery}
          />
        )}

        {selectedVariant && selectedVariant.in_stock && (
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 0,
              borderWidth: 0,
              borderColor: "#E5E7EB",
              paddingHorizontal: 16,
              paddingVertical: 12,
              marginBottom: 0,
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
              Quantity
            </Text>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text style={{ fontSize: 13, color: "#6B7280" }}>
                {selectedVariant.available_quantity ?? 0} available
              </Text>

              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <TouchableOpacity
                  onPress={() => setQuantity(Math.max(1, quantity - 1))}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    backgroundColor: "#F3F4F6",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Ionicons name="remove" size={18} color="#374151" />
                </TouchableOpacity>

                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: "#111827",
                    minWidth: 28,
                    textAlign: "center",
                  }}
                >
                  {quantity}
                </Text>

                <TouchableOpacity
                  onPress={() => {
                    const maxQty = selectedVariant.available_quantity ?? 99;
                    if (quantity + 1 > maxQty) {
                      showToast(`Maximum ${maxQty} items available`, "info");
                    } else {
                      setQuantity(quantity + 1);
                    }
                  }}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    backgroundColor: "#F3F4F6",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Ionicons name="add" size={18} color="#374151" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        <ReviewsSection
          reviews={product.reviews}
          averageRating={product.average_rating}
          totalReviews={product.total_reviews}
          productName={product.name}
        />
        <View
          style={{
            height: 1,
            backgroundColor: "#E5E7EB",
            marginTop: 12,
            marginBottom: 8,
          }}
        />
      </ScrollView>

      {/* Footer Action Bar */}
      {isInStock ? (
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: "#FFFFFF",
            borderTopWidth: 1,
            borderTopColor: "#F3F4F6",
            paddingHorizontal: 16,
            paddingVertical: 10,
            paddingBottom: 16,
            flexDirection: "row",
            gap: 10,
          }}
        >
          <TouchableOpacity
            onPress={addToCart}
            disabled={addingToCart}
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: "#EA580C",
              borderRadius: 8,
              paddingVertical: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              backgroundColor: "#FFFFFF",
              opacity: addingToCart ? 0.6 : 1,
            }}
          >
            <Ionicons name="cart-outline" size={18} color="#EA580C" />
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#EA580C" }}>
              Add to Cart
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={buyNow}
            disabled={addingToCart}
            style={{
              flex: 1,
              backgroundColor: "#EA580C",
              borderRadius: 8,
              paddingVertical: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              opacity: addingToCart ? 0.6 : 1,
            }}
          >
            <Ionicons name="flash-outline" size={18} color="#FFFFFF" />
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#FFFFFF" }}>
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
            backgroundColor: "#FFFFFF",
            borderTopWidth: 1,
            borderTopColor: "#F3F4F6",
            paddingHorizontal: 16,
            paddingVertical: 12,
            paddingBottom: 16,
          }}
        >
          <View
            style={{
              backgroundColor: "#FEE2E2",
              borderRadius: 8,
              paddingVertical: 10,
              paddingHorizontal: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 13, color: "#DC2626", fontWeight: "600" }}>
              Currently Out of Stock
            </Text>
          </View>
        </View>
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

      {flyToCartVisible && flyToCartImageUri && (
        <Animated.View
          style={{
            position: "absolute",
            top: Dimensions.get("window").height / 2 - 40,
            left: Dimensions.get("window").width / 2 - 40,
            zIndex: 9999,
            width: 80,
            height: 80,
            transform: [
              { translateX: flyToCartX },
              { translateY: flyToCartY },
              { scale: flyToCartScale },
            ],
            opacity: flyToCartOpacity,
          }}
        >
          <Image
            source={{ uri: flyToCartImageUri }}
            style={{
              width: "100%",
              height: "100%",
              borderRadius: 8,
            }}
            resizeMode="cover"
          />
        </Animated.View>
      )}
    </SafeAreaView>
  );
}