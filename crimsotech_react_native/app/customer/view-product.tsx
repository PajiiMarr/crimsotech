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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
  // API returns media_files (not media)
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

const statusColor = (status?: string) => {
  const value = String(status || "").toLowerCase();
  if (value === "published") return "#16A34A";
  if (value === "draft") return "#D97706";
  if (value === "archived") return "#64748B";
  return "#475569";
};

// Prefer _url over raw S3 URL (file_url / image_url are already public Supabase URLs)
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
  return `₱${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#FED7AA",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          marginBottom: 10,
        }}
      >
        <Ionicons name="time-outline" size={16} color="#EA580C" />
        <Text style={{ fontSize: 14, fontWeight: "700", color: "#111827" }}>
          Item History & Ownership
        </Text>
      </View>

      {variant.original_price && (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 6,
          }}
        >
          <Text style={{ fontSize: 13, color: "#6B7280" }}>Original Price</Text>
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
          <Text style={{ fontSize: 13, color: "#6B7280" }}>Current Price</Text>
          <Text style={{ fontSize: 13, fontWeight: "700", color: "#EA580C" }}>
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
          <Text style={{ fontSize: 12, color: "#059669", fontWeight: "600" }}>
            You Save
          </Text>
          <Text style={{ fontSize: 12, color: "#059669", fontWeight: "700" }}>
            {formatCurrency(savings)} (
            {Math.round((savings / parseFloat(variant.original_price!)) * 100)}
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
          <Text style={{ fontSize: 13, color: "#6B7280" }}>Purchase Date</Text>
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
          <Text style={{ fontSize: 13, color: "#6B7280" }}>Usage Period</Text>
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
  );
};

// Make sure this is what you have at the top of SellerInfoCard:
const SellerInfoCard = ({ product, onPress }: { product: ProductDetail; onPress: () => void }) => {
  if (!product.seller_name) return null;
  return (
    <TouchableOpacity
      onPress={onPress}   // ← this line is missing
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
          backgroundColor: "#FFF7ED",
          justifyContent: "center",
          alignItems: "center",
          marginRight: 12,
        }}
      >
        {product.seller_avatar ? (
          <Image
            source={{ uri: product.seller_avatar }}
            style={{ width: 48, height: 48, borderRadius: 24 }}
          />
        ) : (
          <Ionicons name="storefront-outline" size={24} color="#EA580C" />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: "700", color: "#111827" }}>
          {product.seller_name}
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
              {product.listing_type === "shop" ? "Shop" : "Personal Seller"}
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
  const params = useLocalSearchParams<{ id: string }>();
  const productId = params.id ? String(params.id) : "";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [expandedVariants, setExpandedVariants] = useState<
    Record<string, boolean>
  >({});
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);

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
        if (response.data.default_variant) {
          setSelectedVariant(response.data.default_variant);
        } else if (response.data.variants?.length > 0) {
          const inStock = response.data.variants.find(
            (v: Variant) => v.in_stock,
          );
          setSelectedVariant(inStock || response.data.variants[0]);
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
  }, [productId, userId]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  // ── Media resolution ──────────────────────────────────────────────────────
  // API returns media_files (not media)
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

  const proofImages = useMemo(() => {
    return (product?.variants ?? [])
      .map(resolveProofImageUrl)
      .filter((url): url is string => !!url);
  }, [product]);

  // Gallery = product photos + variant images (proof images opened separately)
  const galleryImages = useMemo(
    () => [...productImages, ...variantImages],
    [productImages, variantImages],
  );

  const heroImage = useMemo(
    () => productImages[0] || variantImages[0] || null,
    [productImages, variantImages],
  );

  const openGallery = (index: number = 0) => {
    setSelectedImageIndex(index);
    setGalleryVisible(true);
  };

  const openProofGallery = (url: string) => {
    // Show proof image in its own single-image gallery
    setSelectedImageIndex(0);
    setGalleryVisible(false);
    // We'll open a temporary gallery for just this proof image
    setProofGalleryImages([url]);
    setProofGalleryVisible(true);
  };

  const [proofGalleryVisible, setProofGalleryVisible] = useState(false);
  const [proofGalleryImages, setProofGalleryImages] = useState<string[]>([]);

  const toggleVariantExpand = (variantId: string) => {
    setExpandedVariants((prev) => ({ ...prev, [variantId]: !prev[variantId] }));
  };

  const toggleFavorite = async () => {
    if (!userId) {
      Alert.alert("Sign In Required", "Please sign in to add to favorites");
      return;
    }
    Alert.alert("Coming Soon", "Favorite functionality will be implemented");
  };

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
    try {
      await AxiosInstance.post("/view-cart/", {
        user_id: userId,
        variant_id: selectedVariant.id,
        quantity,
      });
      Alert.alert(
        "Added to Cart",
        `${product?.name} has been added to your cart.`,
      );
    } catch (err: any) {
      const msg =
        err.response?.data?.error ??
        err.response?.data?.detail ??
        "Failed to add to cart.";
      Alert.alert("Error", msg);
    } finally {
      setAddingToCart(false);
    }
  };

  const buyNow = () => {
    if (!userId) {
      Alert.alert("Sign In Required", "Please sign in to purchase");
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
    // Navigate to checkout with this item pre-selected
    // The checkout page expects selected cart item IDs;
    // for Buy Now we pass the variant directly as a query param
    router.push({
      pathname: "/customer/checkout",
      params: {
        buyNow: "true",
        variantId: selectedVariant.id,
        productId: product?.id,
        quantity: quantity.toString(),
      },
    });
  };

  // ── Loading / error states ─────────────────────────────────────────────────
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
      {/* Header */}
      {/* Header */}

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
          style={{ fontSize: 18, fontWeight: "700", color: "#111827", flex: 1 }}
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
        {/* Hero Image Carousel */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#E5E7EB",
            overflow: "hidden",
            marginBottom: 12,
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
                    style={{ width: SCREEN_WIDTH - 2, height: 260 }}
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
              {/* Dot indicators */}
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
                height: 260,
                backgroundColor: "#F3F4F6",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Ionicons name="image-outline" size={48} color="#9CA3AF" />
            </View>
          )}

          <View style={{ padding: 14 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginBottom: 6,
              }}
            >
              <Text
                style={{ fontSize: 20, fontWeight: "700", color: "#111827" }}
              >
                {product.name}
              </Text>
              <TouchableOpacity
                onPress={toggleFavorite}
                style={{ padding: 8, marginRight: 4 }}
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
          </View>
        </View>

        {/* Media Strip — all product photos */}

        {/* Seller Info */}
        <SellerInfoCard
          product={product}
onPress={() => {
  console.log('shop:', product.shop);
  console.log('seller_id:', product.seller_id);
  console.log('seller_name:', product.seller_name);
  
  const shopId = product.shop?.id ?? product.seller_id;
  console.log('shopId resolved:', shopId);
  
  if (shopId) {
    router.push({
      pathname: '/customer/view-shop',
      params: { shopId },
    });
  } else {
    Alert.alert('Error', 'Shop not found');
  }
}}
        />

        {/* Description */}
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

        {/* Variant Selection */}
        {product.variants && product.variants.length > 0 && (
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
                  setSelectedVariant(variant);
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
                  <View>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: "#111827",
                      }}
                    >
                      {variant.title || variant.sku_code || "Variant"}
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
                    {variant.original_price && (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                          marginTop: 2,
                        }}
                      >
                        <Ionicons
                          name="time-outline"
                          size={10}
                          color="#6B7280"
                        />
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
                {selectedVariant?.id === variant.id && (
                  <Ionicons name="checkmark-circle" size={24} color="#EA580C" />
                )}
                {!variant.in_stock && (
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
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Ownership Info for selected variant */}
        {selectedVariant && (
          <OwnershipInfoCard
            variant={selectedVariant}
            onProofImagePress={openProofGallery}
          />
        )}

        {/* Quantity Selector */}
        {selectedVariant && selectedVariant.in_stock && (
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
            <Text
              style={{
                fontSize: 14,
                fontWeight: "700",
                color: "#111827",
                marginBottom: 12,
              }}
            >
              Quantity
            </Text>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 16 }}
            >
              <TouchableOpacity
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
                style={{
                  width: 40,
                  height: 40,
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
                  minWidth: 32,
                  textAlign: "center",
                }}
              >
                {quantity}
              </Text>
              <TouchableOpacity
                onPress={() =>
                  setQuantity(
                    Math.min(
                      selectedVariant.available_quantity ?? 99,
                      quantity + 1,
                    ),
                  )
                }
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  backgroundColor: "#F3F4F6",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons name="add" size={20} color="#374151" />
              </TouchableOpacity>
              <Text
                style={{ fontSize: 13, color: "#6B7280", marginLeft: "auto" }}
              >
                {selectedVariant.available_quantity ?? 0} available
              </Text>
            </View>
          </View>
        )}

        {/* Variant Details (collapsible) */}
        {product.variants && product.variants.length > 0 && (
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
            <Text
              style={{
                fontSize: 14,
                fontWeight: "700",
                color: "#111827",
                marginBottom: 8,
              }}
            >
              All Variant Details ({product.variants.length})
            </Text>
            {product.variants.map((variant) => (
              <View key={variant.id} style={{ marginBottom: 8 }}>
                <TouchableOpacity
                  onPress={() => toggleVariantExpand(variant.id)}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    backgroundColor: "#F9FAFB",
                    padding: 10,
                    borderRadius: 8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: "#111827",
                    }}
                  >
                    {variant.title || variant.sku_code || "Variant"}
                  </Text>
                  <Ionicons
                    name={
                      expandedVariants[variant.id]
                        ? "chevron-up"
                        : "chevron-down"
                    }
                    size={18}
                    color="#6B7280"
                  />
                </TouchableOpacity>
                {expandedVariants[variant.id] && (
                  <View style={{ padding: 10, gap: 4 }}>
                    {variant.sku_code && (
                      <Text style={{ fontSize: 12, color: "#6B7280" }}>
                        SKU: {variant.sku_code}
                      </Text>
                    )}
                    <Text
                      style={{
                        fontSize: 12,
                        color: variant.in_stock ? "#16A34A" : "#DC2626",
                      }}
                    >
                      {variant.in_stock
                        ? `In Stock (${variant.available_quantity ?? 0} available)`
                        : "Out of Stock"}
                    </Text>
                    {variant.original_price && (
                      <Text style={{ fontSize: 12, color: "#6B7280" }}>
                        Original Price: {formatCurrency(variant.original_price)}
                      </Text>
                    )}
                    {variant.purchase_date && (
                      <Text style={{ fontSize: 12, color: "#6B7280" }}>
                        Purchased: {formatDate(variant.purchase_date)}
                      </Text>
                    )}
                    {(variant.length || variant.width || variant.height) && (
                      <Text style={{ fontSize: 12, color: "#6B7280" }}>
                        Dimensions: {variant.length ?? "?"} ×{" "}
                        {variant.width ?? "?"} × {variant.height ?? "?"}{" "}
                        {variant.dimension_unit ?? "cm"}
                      </Text>
                    )}
                    {variant.weight && (
                      <Text style={{ fontSize: 12, color: "#6B7280" }}>
                        Weight: {variant.weight} {variant.weight_unit ?? "g"}
                      </Text>
                    )}
                    {variant.is_refundable && (
                      <Text style={{ fontSize: 12, color: "#6B7280" }}>
                        Refundable ({variant.refund_days ?? 0} days)
                      </Text>
                    )}
                    {variant.allow_swap && (
                      <Text style={{ fontSize: 12, color: "#1E40AF" }}>
                        Swap available: {variant.swap_type}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Reviews */}
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
            style={{
              flex: 1,
              backgroundColor: "#EA580C",
              borderRadius: 10,
              paddingVertical: 14,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
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

      {/* Product photo gallery */}
      <ImageGalleryModal
        visible={galleryVisible}
        images={galleryImages}
        initialIndex={selectedImageIndex}
        onClose={() => setGalleryVisible(false)}
      />

      {/* Proof image gallery */}
      <ImageGalleryModal
        visible={proofGalleryVisible}
        images={proofGalleryImages}
        initialIndex={0}
        onClose={() => setProofGalleryVisible(false)}
      />
    </SafeAreaView>
  );
}
