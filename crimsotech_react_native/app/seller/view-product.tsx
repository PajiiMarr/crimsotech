import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  
  // Dimension fields
  length?: string | null;
  width?: string | null;
  height?: string | null;
  dimension_unit?: string;
  
  // Weight fields
  weight?: string | null;
  weight_unit?: string;
  
  // Status fields
  is_active?: boolean;
  is_refundable?: boolean;
  refund_days?: number;
  
  // Swap fields
  allow_swap?: boolean;
  swap_type?: string;
  swap_description?: string | null;
  minimum_additional_payment?: string | null;
  maximum_additional_payment?: string | null;
  
  // Depreciation fields
  original_price?: string | null;
  usage_period?: number | null;
  usage_unit?: string | null;
  depreciation_rate?: number | null;
  
  // Stock alerts
  critical_trigger?: number | null;
  critical_stock?: number | null;
  
  // Images
  image?: string | null;
  proof_image?: string | null;
  
  // Timestamps
  created_at?: string;
  updated_at?: string;
  
  // Options
  options?: Array<{
    id: string;
    name: string;
    value: string;
    title: string;
  }>;
};

type MediaItem = {
  id: string;
  file_data?: string | null;
  file_type?: string;
};

type ProductDetail = {
  id: string;
  name: string;
  description?: string;
  condition?: number; // Now integer 1-5
  upload_status?: string;
  status?: string;
  is_refundable?: boolean;
  refund_days?: number;
  is_removed?: boolean;
  removal_reason?: string | null;
  removed_at?: string | null;
  
  // Categories
  category_admin?: { id: string; name: string } | null;
  category?: { id: string; name: string } | null;
  
  // Shop info
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
    created_at?: string;
    is_suspended?: boolean;
  } | null;
  
  // Customer info
  customer?: {
    id: string;
    username?: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    contact_number?: string;
    product_limit?: number;
    current_product_count?: number;
  } | null;
  
  // Pricing
  price_range?: { min?: string | null; max?: string | null };
  quantity?: number;
  
  // Stats
  variant_stats?: {
    total_variants: number;
    active_variants: number;
    total_stock: number;
    min_price?: string | null;
    max_price?: string | null;
    low_stock_variants: number;
    out_of_stock_variants: number;
  };
  
  // Related data
  variants?: Variant[];
  media?: MediaItem[];
  reviews?: Array<any>;
  favorites_count?: number;
  average_rating?: number;
  total_reviews?: number;
  
  // Timestamps
  created_at?: string;
  updated_at?: string;
};

// Condition scale matching CreateProductForm
const CONDITION_SCALE: Record<number, { label: string; shortLabel: string; stars: number }> = {
  1: { label: 'Poor - Heavy signs of use, may not function perfectly', shortLabel: 'Poor', stars: 1 },
  2: { label: 'Fair - Visible wear, fully functional', shortLabel: 'Fair', stars: 2 },
  3: { label: 'Good - Normal wear, well-maintained', shortLabel: 'Good', stars: 3 },
  4: { label: 'Very Good - Minimal wear, almost like new', shortLabel: 'Very Good', stars: 4 },
  5: { label: 'Like New - No signs of use, original packaging', shortLabel: 'Like New', stars: 5 },
};

const statusColor = (status?: string) => {
  const value = String(status || "").toLowerCase();
  if (value === "published") return "#16A34A";
  if (value === "draft") return "#D97706";
  if (value === "archived") return "#64748B";
  return "#475569";
};

const resolveMediaUrl = (url?: string | null) => {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const base = String(AxiosInstance.defaults.baseURL || "").replace(
    /\/api\/?$/,
    "",
  );
  if (!base) return url;
  return url.startsWith("/") ? `${base}${url}` : `${base}/${url}`;
};

const formatDate = (dateString?: string) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const StarRow = ({ count }: { count: number }) => (
  <View style={{ flexDirection: 'row', gap: 2 }}>
    {[1, 2, 3, 4, 5].map((i) => (
      <Text key={i} style={{ color: i <= count ? '#F59E0B' : '#D1D5DB', fontSize: 14 }}>★</Text>
    ))}
  </View>
);

// Image Gallery Modal Component
// Image Gallery Modal Component
const ImageGalleryModal = ({ 
  visible, 
  images, 
  initialIndex = 0,
  onClose 
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
      // Use setTimeout to ensure the layout is ready
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: initialIndex,
          animated: false,
        });
      }, 100);
    }
  }, [visible, initialIndex]);

  const getItemLayout = (data: any, index: number) => ({
    length: SCREEN_WIDTH,
    offset: SCREEN_WIDTH * index,
    index,
  });

  const onScrollToIndexFailed = (info: {
    index: number;
    highestMeasuredFrameIndex: number;
    averageItemLength: number;
  }) => {
    const wait = new Promise(resolve => setTimeout(resolve, 500));
    wait.then(() => {
      flatListRef.current?.scrollToIndex({ index: info.index, animated: false });
    });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)' }}>
        <TouchableOpacity 
          style={{ position: 'absolute', top: 50, right: 20, zIndex: 10 }}
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
          getItemLayout={getItemLayout}
          onScrollToIndexFailed={onScrollToIndexFailed}
          onScroll={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
            setCurrentIndex(index);
          }}
          renderItem={({ item }) => (
            <View style={{ width: SCREEN_WIDTH, justifyContent: 'center', alignItems: 'center' }}>
              <Image 
                source={{ uri: item }} 
                style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH, resizeMode: 'contain' }}
              />
            </View>
          )}
          keyExtractor={(_, index) => index.toString()}
        />
        
        {images.length > 1 && (
          <View style={{ 
            position: 'absolute', 
            bottom: 50, 
            alignSelf: 'center',
            backgroundColor: 'rgba(0,0,0,0.5)',
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
          }}>
            <Text style={{ color: '#FFFFFF', fontSize: 14 }}>
              {currentIndex + 1} / {images.length}
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
};

export default function SellerViewProductScreen() {
  const { userId } = useAuth();
  const params = useLocalSearchParams<{
    productId?: string;
    shopId?: string;
  }>();
  const productId = params.productId ? String(params.productId) : "";
  const shopId = params.shopId ? String(params.shopId) : "";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [expandedVariants, setExpandedVariants] = useState<Record<string, boolean>>({});
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const fetchProduct = useCallback(async () => {
    if (!productId || !userId) {
      setLoading(false);
      return;
    }

    try {
      const response = await AxiosInstance.get(
        `/seller-products/${productId}/get_product/?user_id=${userId}`,
      );
      if (response.data?.success) {
        setProduct(response.data.product || null);
      } else {
        setProduct(null);
      }
    } catch (error) {
      console.error("Failed to fetch seller product details:", error);
      Alert.alert("Error", "Unable to load product details.");
      setProduct(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [productId, userId]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProduct();
  };

  // Get all product images from media
  const productImages = useMemo(() => {
    return (product?.media || [])
      .map(media => resolveMediaUrl(media.file_data))
      .filter((url): url is string => url !== null);
  }, [product]);

  // Get variant images
  const variantImages = useMemo(() => {
    return (product?.variants || [])
      .filter(v => v.image)
      .map(v => resolveMediaUrl(v.image))
      .filter((url): url is string => url !== null);
  }, [product]);

  // Get proof images
  const proofImages = useMemo(() => {
    return (product?.variants || [])
      .filter(v => v.proof_image)
      .map(v => resolveMediaUrl(v.proof_image))
      .filter((url): url is string => url !== null);
  }, [product]);

  // All images for gallery
  const allImages = useMemo(() => {
    return [...productImages, ...variantImages, ...proofImages];
  }, [productImages, variantImages, proofImages]);

  // Hero image (first product image or first variant image)
  const heroImage = useMemo(() => {
    return productImages[0] || variantImages[0] || null;
  }, [productImages, variantImages]);

  const toggleVariantExpand = (variantId: string) => {
    setExpandedVariants((prev) => ({ ...prev, [variantId]: !prev[variantId] }));
  };

  const openGallery = (index: number = 0) => {
    setSelectedImageIndex(index);
    setGalleryVisible(true);
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
        <ActivityIndicator size="small" color="#EA580C" />
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
        <Text
          style={{ fontSize: 18, fontWeight: "700", color: "#111827", flex: 1 }}
        >
          Product Details
        </Text>
        <TouchableOpacity
          onPress={() => {
            const productData = encodeURIComponent(JSON.stringify(product));
            router.push({
              pathname: "/seller/components/seller-edit-product",
              params: {
                productId: product.id,
                shopId: shopId,
                product: productData,
              },
            });
          }}
          style={{
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: "#E5E7EB",
            backgroundColor: "#FFFFFF",
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: "600", color: "#111827" }}>
            Edit
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Hero Image Card */}
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
          <TouchableOpacity
            onPress={() => allImages.length > 0 && openGallery(0)}
            activeOpacity={0.8}
            style={{
              height: 190,
              backgroundColor: "#F3F4F6",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {heroImage ? (
              <Image
                source={{ uri: heroImage }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            ) : (
              <Ionicons name="image-outline" size={40} color="#9CA3AF" />
            )}
            
            {/* Image count badge */}
            {allImages.length > 1 && (
              <View style={{
                position: 'absolute',
                bottom: 8,
                right: 8,
                backgroundColor: 'rgba(0,0,0,0.6)',
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
              }}>
                <Ionicons name="images" size={14} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 12 }}>{allImages.length}</Text>
              </View>
            )}
          </TouchableOpacity>
          
          <View style={{ padding: 14 }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#111827" }}>
              {product.name}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
              {product.condition && (
                <>
                  <StarRow count={product.condition} />
                  <Text style={{ fontSize: 12, color: "#6B7280", marginLeft: 4 }}>
                    {CONDITION_SCALE[product.condition]?.shortLabel || `Condition ${product.condition}/5`}
                  </Text>
                </>
              )}
            </View>
            <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }}>
              {product.category_admin?.name || product.category?.name || "Uncategorized"}
            </Text>
            <View style={{ marginTop: 10, flexDirection: "row", gap: 8, flexWrap: 'wrap' }}>
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 999,
                  backgroundColor: "#F1F5F9",
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    color: statusColor(product.upload_status),
                    fontWeight: "700",
                  }}
                >
                  {(product.upload_status || "unknown").toUpperCase()}
                </Text>
              </View>
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 999,
                  backgroundColor: "#F8FAFC",
                }}
              >
                <Text
                  style={{ fontSize: 12, color: "#334155", fontWeight: "600" }}
                >
                  Stock: {product.variant_stats?.total_stock || product.quantity || 0}
                </Text>
              </View>
              {product.is_refundable && (
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 999,
                    backgroundColor: "#DCFCE7",
                  }}
                >
                  <Text style={{ fontSize: 12, color: "#166534", fontWeight: "600" }}>
                    Refundable ({product.refund_days || 0} days)
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>



        {/* Description Card */}
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
              fontSize: 13,
              fontWeight: "700",
              color: "#111827",
              marginBottom: 8,
            }}
          >
            Description
          </Text>
          <Text style={{ fontSize: 13, color: "#374151", lineHeight: 20 }}>
            {product.description || "No description provided."}
          </Text>
        </View>

        {/* Pricing Card */}
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
              fontSize: 13,
              fontWeight: "700",
              color: "#111827",
              marginBottom: 8,
            }}
          >
            Pricing
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 13, color: "#374151" }}>
              Min: {product.price_range?.min ? `₱${parseFloat(product.price_range.min).toLocaleString()}` : "N/A"}
            </Text>
            <Text style={{ fontSize: 13, color: "#374151" }}>
              Max: {product.price_range?.max ? `₱${parseFloat(product.price_range.max).toLocaleString()}` : "N/A"}
            </Text>
          </View>
          <Text style={{ fontSize: 13, color: "#374151", marginTop: 4 }}>
            Status: {product.status || "N/A"}
          </Text>
        </View>

        {/* Shop Info Card */}
        {product.shop && (
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
                fontSize: 13,
                fontWeight: "700",
                color: "#111827",
                marginBottom: 8,
              }}
            >
              Shop Information
            </Text>
            <Text style={{ fontSize: 13, color: "#374151" }}>{product.shop.name}</Text>
            {product.shop.verified && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
                <Text style={{ fontSize: 12, color: "#16A34A" }}>Verified Shop</Text>
              </View>
            )}
            <Text style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>
              {[product.shop.street, product.shop.barangay, product.shop.city].filter(Boolean).join(', ')}
            </Text>
          </View>
        )}

        {/* Removed Product Warning */}
        {product.is_removed && (
          <View
            style={{
              backgroundColor: "#FEF2F2",
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#FECACA",
              padding: 14,
              marginBottom: 12,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#B91C1C" }}>
              Removed Product
            </Text>
            <Text style={{ fontSize: 13, color: "#991B1B", marginTop: 6 }}>
              {product.removal_reason || "No removal reason available."}
            </Text>
            {product.removed_at && (
              <Text style={{ fontSize: 12, color: "#991B1B", marginTop: 4 }}>
                Removed on: {formatDate(product.removed_at)}
              </Text>
            )}
          </View>
        )}

        {/* Variants Section */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#E5E7EB",
            padding: 14,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: "700",
              color: "#111827",
              marginBottom: 8,
            }}
          >
            Variants ({product.variants?.length || 0})
          </Text>
          {(product.variants || []).length === 0 ? (
            <Text style={{ fontSize: 13, color: "#6B7280" }}>
              No variants available.
            </Text>
          ) : (
            (product.variants || []).map((variant) => (
              <View key={variant.id} style={{ marginBottom: 12 }}>
                {/* Variant Header */}
                <TouchableOpacity
                  onPress={() => toggleVariantExpand(variant.id)}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: '#F9FAFB',
                    padding: 12,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {variant.image ? (
                      <Image 
                        source={{ uri: resolveMediaUrl(variant.image) }} 
                        style={{ width: 40, height: 40, borderRadius: 4 }}
                      />
                    ) : (
                      <View style={{ width: 40, height: 40, backgroundColor: '#F3F4F6', borderRadius: 4, justifyContent: 'center', alignItems: 'center' }}>
                        <Ionicons name="cube-outline" size={20} color="#9CA3AF" />
                      </View>
                    )}
                    <View>
                      <Text style={{ fontSize: 14, fontWeight: "600", color: "#111827" }}>
                        {variant.title || variant.sku_code || "Variant"}
                      </Text>
                      <Text style={{ fontSize: 12, color: "#EA580C", fontWeight: "500" }}>
                        ₱{variant.price ? parseFloat(variant.price).toLocaleString() : "0.00"}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {variant.quantity === 0 && (
                      <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                        <Text style={{ fontSize: 10, color: '#DC2626' }}>Out of Stock</Text>
                      </View>
                    )}
                    <Ionicons 
                      name={expandedVariants[variant.id] ? "chevron-up" : "chevron-down"} 
                      size={20} 
                      color="#6B7280" 
                    />
                  </View>
                </TouchableOpacity>

                {/* Expanded Variant Details */}
                {expandedVariants[variant.id] && (
                  <View style={{
                    backgroundColor: '#FFFFFF',
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                    borderTopWidth: 0,
                    borderBottomLeftRadius: 8,
                    borderBottomRightRadius: 8,
                    padding: 12,
                  }}>
                    {/* Basic Info */}
                    <View style={{ marginBottom: 12 }}>
                      <Text style={{ fontSize: 12, fontWeight: "600", color: "#6B7280", marginBottom: 4 }}>SKU</Text>
                      <Text style={{ fontSize: 13, color: "#111827" }}>{variant.sku_code || "N/A"}</Text>
                    </View>

                    {/* Pricing */}
                    <View style={{ flexDirection: 'row', gap: 16, marginBottom: 12 }}>
                      <View>
                        <Text style={{ fontSize: 12, fontWeight: "600", color: "#6B7280", marginBottom: 4 }}>Price</Text>
                        <Text style={{ fontSize: 14, color: "#111827" }}>₱{variant.price ? parseFloat(variant.price).toLocaleString() : "0.00"}</Text>
                      </View>
                      {variant.compare_price && (
                        <View>
                          <Text style={{ fontSize: 12, fontWeight: "600", color: "#6B7280", marginBottom: 4 }}>Compare Price</Text>
                          <Text style={{ fontSize: 14, color: "#9CA3AF", textDecorationLine: 'line-through' }}>
                            ₱{parseFloat(variant.compare_price).toLocaleString()}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Stock */}
                    <View style={{ marginBottom: 12 }}>
                      <Text style={{ fontSize: 12, fontWeight: "600", color: "#6B7280", marginBottom: 4 }}>Stock</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 14, color: variant.quantity === 0 ? "#DC2626" : "#111827" }}>
                          {variant.quantity ?? 0} units
                        </Text>
                        {variant.critical_trigger && variant.quantity <= variant.critical_trigger && variant.quantity > 0 && (
                          <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                            <Text style={{ fontSize: 10, color: '#D97706' }}>Low Stock Alert</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Status Toggles */}
                    <View style={{ flexDirection: 'row', gap: 16, marginBottom: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: variant.is_active ? '#16A34A' : '#9CA3AF' }} />
                        <Text style={{ fontSize: 13, color: variant.is_active ? '#16A34A' : '#6B7280' }}>
                          {variant.is_active ? 'Active' : 'Inactive'}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="refresh" size={12} color={variant.is_refundable ? '#EA580C' : '#9CA3AF'} />
                        <Text style={{ fontSize: 13, color: variant.is_refundable ? '#EA580C' : '#6B7280' }}>
                          {variant.is_refundable ? `Refundable (${variant.refund_days || 0} days)` : 'Non-refundable'}
                        </Text>
                      </View>
                    </View>

                    {/* Dimensions */}
                    {(variant.length || variant.width || variant.height) && (
                      <View style={{ marginBottom: 12 }}>
                        <Text style={{ fontSize: 12, fontWeight: "600", color: "#6B7280", marginBottom: 4 }}>Dimensions</Text>
                        <Text style={{ fontSize: 13, color: "#111827" }}>
                          {variant.length || '0'} × {variant.width || '0'} × {variant.height || '0'} {variant.dimension_unit || 'cm'}
                        </Text>
                      </View>
                    )}

                    {/* Weight */}
                    {variant.weight && (
                      <View style={{ marginBottom: 12 }}>
                        <Text style={{ fontSize: 12, fontWeight: "600", color: "#6B7280", marginBottom: 4 }}>Weight</Text>
                        <Text style={{ fontSize: 13, color: "#111827" }}>
                          {variant.weight} {variant.weight_unit || 'g'}
                        </Text>
                      </View>
                    )}

                    {/* Depreciation Info */}
                    {variant.original_price && (
                      <View style={{ backgroundColor: '#FFF7ED', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                        <Text style={{ fontSize: 12, fontWeight: "600", color: "#C2410C", marginBottom: 4 }}>Depreciation</Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: 12, color: "#92400E" }}>Original:</Text>
                          <Text style={{ fontSize: 12, color: "#111827" }}>₱{parseFloat(variant.original_price).toLocaleString()}</Text>
                        </View>
                        {variant.usage_period && variant.usage_unit && (
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                            <Text style={{ fontSize: 12, color: "#92400E" }}>Usage:</Text>
                            <Text style={{ fontSize: 12, color: "#111827" }}>{variant.usage_period} {variant.usage_unit}</Text>
                          </View>
                        )}
                        {variant.depreciation_rate && (
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                            <Text style={{ fontSize: 12, color: "#92400E" }}>Depreciation Rate:</Text>
                            <Text style={{ fontSize: 12, color: "#111827" }}>{variant.depreciation_rate}% / year</Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Swap Info */}
                    {variant.allow_swap && (
                      <View style={{ backgroundColor: '#EFF6FF', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                          <Ionicons name="swap-horizontal" size={14} color="#1E40AF" />
                          <Text style={{ fontSize: 12, fontWeight: "600", color: "#1E40AF" }}>Swap Available</Text>
                        </View>
                        <Text style={{ fontSize: 12, color: "#374151" }}>Type: {variant.swap_type}</Text>
                        {variant.swap_description && (
                          <Text style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{variant.swap_description}</Text>
                        )}
                        {(variant.minimum_additional_payment && variant.minimum_additional_payment !== "0.00") || 
                         (variant.maximum_additional_payment && variant.maximum_additional_payment !== "0.00") ? (
                          <View style={{ marginTop: 4 }}>
                            <Text style={{ fontSize: 11, color: "#1E40AF" }}>
                              Additional Payment: ₱{parseFloat(variant.minimum_additional_payment || '0').toLocaleString()} - ₱{parseFloat(variant.maximum_additional_payment || '0').toLocaleString()}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    )}

                    {/* Critical Stock Alert */}
                    {variant.critical_stock && (
                      <View style={{ marginBottom: 12 }}>
                        <Text style={{ fontSize: 12, fontWeight: "600", color: "#6B7280", marginBottom: 4 }}>Critical Stock Level</Text>
                        <Text style={{ fontSize: 13, color: "#111827" }}>{variant.critical_stock} units</Text>
                      </View>
                    )}

                    {/* Proof Image */}
                    {variant.proof_image && (
                      <View>
                        <Text style={{ fontSize: 12, fontWeight: "600", color: "#6B7280", marginBottom: 4 }}>Proof of Ownership</Text>
                        <TouchableOpacity onPress={() => {
                          const proofIndex = proofImages.findIndex(url => url === resolveMediaUrl(variant.proof_image));
                          openGallery(productImages.length + (variantImages.findIndex(url => url === resolveMediaUrl(variant.image)) + 1) + proofIndex);
                        }}>
                          <Image 
                            source={{ uri: resolveMediaUrl(variant.proof_image) }} 
                            style={{ width: 80, height: 80, borderRadius: 4 }}
                          />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Image Gallery Modal */}
      <ImageGalleryModal
        visible={galleryVisible}
        images={allImages}
        initialIndex={selectedImageIndex}
        onClose={() => setGalleryVisible(false)}
      />
    </SafeAreaView>
  );
}