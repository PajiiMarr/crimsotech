// app/customer/view-product.tsx
import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Modal,
  FlatList,
  Dimensions,
  TouchableWithoutFeedback,
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
  price?: string | null;
  quantity?: number;
  available_quantity?: number;
  in_stock?: boolean;
  image?: string | null;
  image_url?: string | null;
  sku_code?: string;
  proof_image?: string | null;
  original_price?: string | null;
  purchase_date?: string | null;
  usage_period?: number | null;
  usage_unit?: string | null;
  depreciation_rate?: number | null;
};

type ProductDetail = {
  id: string;
  name: string;
  description?: string;
  condition?: number;
  variants?: Variant[];
  media_files?: Array<{ file_data?: string; file_url?: string }>;
  has_stock?: boolean;
  is_favorite?: boolean;
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

const formatDate = (dateString?: string) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// ─── Image Gallery Modal ────────────────────────────────────────────────────
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
    if (visible) {
      setCurrentIndex(initialIndex);
      // Give the FlatList time to mount before scrolling
      if (initialIndex > 0) {
        const timer = setTimeout(() => {
          flatListRef.current?.scrollToIndex({
            index: initialIndex,
            animated: false,
          });
        }, 150);
        return () => clearTimeout(timer);
      }
    }
  }, [visible, initialIndex]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.95)" }}>
        {/* Close button */}
        <TouchableOpacity
          style={{
            position: "absolute",
            top: 50,
            right: 20,
            zIndex: 10,
            backgroundColor: "rgba(255,255,255,0.15)",
            borderRadius: 20,
            padding: 6,
          }}
          onPress={onClose}
        >
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Image counter */}
        {images.length > 1 && (
          <View
            style={{
              position: "absolute",
              top: 56,
              alignSelf: "center",
              zIndex: 10,
              backgroundColor: "rgba(0,0,0,0.5)",
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: 20,
            }}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "600" }}>
              {currentIndex + 1} / {images.length}
            </Text>
          </View>
        )}

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
            setTimeout(() => {
              flatListRef.current?.scrollToIndex({
                index: info.index,
                animated: false,
              });
            }, 500);
          }}
          onScroll={(e) => {
            const index = Math.round(
              e.nativeEvent.contentOffset.x / SCREEN_WIDTH
            );
            setCurrentIndex(index);
          }}
          scrollEventThrottle={16}
          renderItem={({ item }) => (
            <View
              style={{
                width: SCREEN_WIDTH,
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Image
                source={{ uri: item }}
                style={{
                  width: SCREEN_WIDTH,
                  height: SCREEN_WIDTH * 1.2,
                  resizeMode: "contain",
                }}
              />
            </View>
          )}
          keyExtractor={(_, index) => index.toString()}
        />
      </View>
    </Modal>
  );
};

// ─── Ownership Info Card ────────────────────────────────────────────────────
const OwnershipInfoCard = ({
  variant,
  onProofImagePress,
}: {
  variant: Variant;
  onProofImagePress: (url: string) => void;
}) => {
  // Default to expanded so proof image is immediately visible
  const [isExpanded, setIsExpanded] = useState(true);

  const hasOwnershipInfo =
    variant.original_price ||
    variant.purchase_date ||
    variant.proof_image ||
    variant.usage_period ||
    variant.depreciation_rate;

  if (!hasOwnershipInfo) return null;

  const originalPrice = variant.original_price
    ? parseFloat(variant.original_price)
    : null;
  const currentPrice = variant.price ? parseFloat(variant.price) : null;
  const savings =
    originalPrice && currentPrice && originalPrice > currentPrice
      ? originalPrice - currentPrice
      : null;
  const savingsPercent =
    savings && originalPrice
      ? Math.round((savings / originalPrice) * 100)
      : null;

  return (
    <View
      style={{
        backgroundColor: "#FFF7ED",
        borderRadius: 12,
        marginTop: 12,
        marginBottom: 4,
        borderWidth: 1,
        borderColor: "#FED7AA",
        overflow: "hidden",
      }}
    >
      {/* Header row */}
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

      {/* Expanded content */}
      {isExpanded && (
        <View style={{ padding: 14, paddingTop: 8 }}>
          {/* Original Price */}
          {variant.original_price && (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <Text style={{ fontSize: 13, color: "#6B7280" }}>
                Original Price
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: "#9CA3AF",
                  textDecorationLine: "line-through",
                }}
              >
                {formatCurrency(variant.original_price)}
              </Text>
            </View>
          )}

          {/* Current / Selling Price */}
          {variant.price && (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <Text style={{ fontSize: 13, color: "#6B7280" }}>
                Selling Price
              </Text>
              <Text
                style={{ fontSize: 13, fontWeight: "700", color: "#EA580C" }}
              >
                {formatCurrency(variant.price)}
              </Text>
            </View>
          )}

          {/* Savings badge */}
          {savings && savingsPercent && (
            <View
              style={{
                backgroundColor: "#DCFCE7",
                borderRadius: 8,
                padding: 8,
                marginBottom: 10,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
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
                {formatCurrency(savings)} ({savingsPercent}% off)
              </Text>
            </View>
          )}

          {/* Purchase Date */}
          {variant.purchase_date && (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 8,
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

          {/* Usage Period */}
          {variant.usage_period != null && variant.usage_unit && (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 8,
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

          {/* Depreciation Rate */}
          {variant.depreciation_rate != null && (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 8,
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

          {/* ── Proof of Ownership Image ─────────────────────── */}
          {variant.proof_image ? (
            <View style={{ marginTop: 12 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 10,
                }}
              >
                <Ionicons
                  name="shield-checkmark-outline"
                  size={15}
                  color="#EA580C"
                />
                <Text
                  style={{
                    fontSize: 13,
                    color: "#374151",
                    fontWeight: "600",
                  }}
                >
                  Proof of Ownership
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => onProofImagePress(variant.proof_image!)}
                activeOpacity={0.85}
                style={{
                  width: 110,
                  height: 110,
                  borderRadius: 10,
                  overflow: "hidden",
                  borderWidth: 2,
                  borderColor: "#34D399",
                }}
              >
                <Image
                  source={{ uri: variant.proof_image }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                  onError={(e) =>
                    console.log(
                      "Proof image load error:",
                      e.nativeEvent.error,
                      "URL:",
                      variant.proof_image
                    )
                  }
                />
                {/* Tap to view overlay */}
                <View
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: "rgba(52,211,153,0.85)",
                    paddingVertical: 4,
                    alignItems: "center",
                    flexDirection: "row",
                    justifyContent: "center",
                    gap: 4,
                  }}
                >
                  <Ionicons name="expand-outline" size={11} color="#FFFFFF" />
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: "700",
                      color: "#FFFFFF",
                    }}
                  >
                    Tap to view
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          ) : (
            // Show a placeholder so you know it's missing vs not rendered
            <View
              style={{
                marginTop: 12,
                padding: 10,
                backgroundColor: "#F3F4F6",
                borderRadius: 8,
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Ionicons name="image-outline" size={14} color="#9CA3AF" />
              <Text style={{ fontSize: 12, color: "#9CA3AF" }}>
                No proof of ownership image provided
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

// ─── Variant Selection Drawer Modal ────────────────────────────────────────
const VariantSelectionModal = ({
  visible,
  variants,
  selectedVariant,
  quantity,
  onSelectVariant,
  onQuantityChange,
  onConfirm,
  onClose,
  productName,
  productImage,
}: {
  visible: boolean;
  variants: Variant[];
  selectedVariant: Variant | null;
  quantity: number;
  onSelectVariant: (variant: Variant) => void;
  onQuantityChange: (quantity: number) => void;
  onConfirm: () => void;
  onClose: () => void;
  productName: string;
  productImage?: string | null;
}) => {
  const [tempQuantity, setTempQuantity] = useState(quantity);
  const [tempSelectedVariant, setTempSelectedVariant] =
    useState<Variant | null>(selectedVariant);

  useEffect(() => {
    if (visible) {
      setTempQuantity(quantity);
      setTempSelectedVariant(selectedVariant);
    }
  }, [visible, quantity, selectedVariant]);

  const handleConfirm = () => {
    if (tempSelectedVariant) {
      onSelectVariant(tempSelectedVariant);
      onQuantityChange(tempQuantity);
      onConfirm();
    } else {
      Alert.alert("Error", "Please select a variant");
    }
  };

  const getDisplayImage = () => {
    if (
      tempSelectedVariant &&
      (tempSelectedVariant.image_url || tempSelectedVariant.image)
    ) {
      return tempSelectedVariant.image_url || tempSelectedVariant.image;
    }
    return productImage || null;
  };

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
        {/* Header */}
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
          <Text
            style={{ fontSize: 18, fontWeight: "700", color: "#111827" }}
          >
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
          {/* Product preview */}
          <View
            style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}
          >
            {getDisplayImage() ? (
              <Image
                source={{ uri: getDisplayImage()! }}
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
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: "#111827",
                }}
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

          {/* Variant options */}
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: "#374151",
              marginBottom: 12,
            }}
          >
            Select Variant{" "}
            {variants.length > 1 ? `(${variants.length} options)` : ""}
          </Text>

          {variants.map((variant) => {
            const isSelected = tempSelectedVariant?.id === variant.id;
            const availableQty =
              variant.available_quantity ?? variant.quantity ?? 0;
            const isInStock = variant.in_stock ?? availableQty > 0;

            return (
              <TouchableOpacity
                key={variant.id}
                onPress={() => {
                  setTempSelectedVariant(variant);
                  setTempQuantity(1);
                }}
                disabled={!isInStock}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: 12,
                  borderWidth: 2,
                  borderColor: isSelected ? "#EA580C" : "#E5E7EB",
                  borderRadius: 10,
                  marginBottom: 10,
                  backgroundColor: isSelected ? "#FFF7ED" : "#FFFFFF",
                  opacity: isInStock ? 1 : 0.5,
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
                  {variant.image_url || variant.image ? (
                    <Image
                      source={{ uri: variant.image_url || variant.image! }}
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
                        color: isInStock ? "#16A34A" : "#DC2626",
                        marginTop: 2,
                      }}
                    >
                      {isInStock
                        ? `${availableQty} available`
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
            );
          })}

          {/* Quantity selector */}
          {tempSelectedVariant &&
            (tempSelectedVariant.in_stock ??
              (tempSelectedVariant.available_quantity ?? 0) > 0) && (
              <View style={{ marginTop: 20 }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: "#374151",
                    marginBottom: 12,
                  }}
                >
                  Quantity
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 16,
                  }}
                >
                  <TouchableOpacity
                    onPress={() =>
                      setTempQuantity(Math.max(1, tempQuantity - 1))
                    }
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 8,
                      backgroundColor: "#F3F4F6",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Ionicons name="remove" size={24} color="#374151" />
                  </TouchableOpacity>
                  <Text
                    style={{
                      fontSize: 20,
                      fontWeight: "600",
                      color: "#111827",
                      minWidth: 50,
                      textAlign: "center",
                    }}
                  >
                    {tempQuantity}
                  </Text>
                  <TouchableOpacity
                    onPress={() =>
                      setTempQuantity(
                        Math.min(
                          tempSelectedVariant.available_quantity ??
                            tempSelectedVariant.quantity ??
                            99,
                          tempQuantity + 1
                        )
                      )
                    }
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 8,
                      backgroundColor: "#F3F4F6",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Ionicons name="add" size={24} color="#374151" />
                  </TouchableOpacity>
                  <Text
                    style={{
                      fontSize: 13,
                      color: "#6B7280",
                      marginLeft: "auto",
                    }}
                  >
                    {tempSelectedVariant.available_quantity ??
                      tempSelectedVariant.quantity ??
                      0}{" "}
                    available
                  </Text>
                </View>
              </View>
            )}
        </ScrollView>

        {/* Footer */}
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
            <Text
              style={{ fontSize: 14, fontWeight: "600", color: "#6B7280" }}
            >
              Cancel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleConfirm}
            disabled={
              !tempSelectedVariant?.in_stock &&
              (tempSelectedVariant?.available_quantity ?? 0) === 0
            }
            style={{
              flex: 2,
              backgroundColor:
                tempSelectedVariant?.in_stock ??
                (tempSelectedVariant?.available_quantity ?? 0) > 0
                  ? "#EA580C"
                  : "#D1D5DB",
              borderRadius: 10,
              paddingVertical: 14,
              alignItems: "center",
            }}
          >
            <Text
              style={{ fontSize: 14, fontWeight: "700", color: "#FFFFFF" }}
            >
              Confirm Selection
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ─── Main Screen ────────────────────────────────────────────────────────────
export default function CustomerViewProductScreen() {
  const { userId } = useAuth();
  const params = useLocalSearchParams<{ id?: string }>();
  const productId = params.id ? String(params.id) : "";

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [variantModalVisible, setVariantModalVisible] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    "add_to_cart" | "buy_now" | null
  >(null);

  // Gallery state
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [galleryInitialIndex, setGalleryInitialIndex] = useState(0);

  const fetchProduct = useCallback(async () => {
    if (!productId) {
      setLoading(false);
      return;
    }
    try {
      const headers: Record<string, string> = {};
      if (userId) headers["X-User-Id"] = userId;

      const response = await AxiosInstance.get(
        `/public-products/${productId}/`,
        { headers }
      );

      if (response.data) {
        setProduct(response.data);

        // Debug: log all variants and their proof images
        if (__DEV__) {
          console.log(
            "[view-product] variants:",
            JSON.stringify(
              response.data.variants?.map((v: Variant) => ({
                id: v.id,
                title: v.title,
                proof_image: v.proof_image,
                original_price: v.original_price,
                purchase_date: v.purchase_date,
              })),
              null,
              2
            )
          );
        }

        if (response.data.variants?.length > 0) {
          const inStock = response.data.variants.find(
            (v: Variant) => v.in_stock
          );
          setSelectedVariant(inStock || response.data.variants[0]);
        }
      }
    } catch (error: any) {
      Alert.alert("Error", "Unable to load product details.");
      setProduct(null);
    } finally {
      setLoading(false);
    }
  }, [productId, userId]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  // All product media images
  const productImages = useMemo(() => {
    return (product?.media_files || [])
      .map((item) => item.file_url || item.file_data)
      .filter((url): url is string => !!url);
  }, [product]);

  // All proof images across variants (for the gallery)
  const allProofImages = useMemo(() => {
    return (product?.variants || [])
      .map((v) => v.proof_image)
      .filter((url): url is string => !!url);
  }, [product]);

  // Open proof image gallery at the tapped image
  const openProofGallery = (url: string) => {
    const index = allProofImages.findIndex((img) => img === url);
    setGalleryImages(allProofImages);
    setGalleryInitialIndex(index >= 0 ? index : 0);
    setGalleryVisible(true);
  };

  // Open product media gallery
  const openProductGallery = (index: number = 0) => {
    setGalleryImages(productImages);
    setGalleryInitialIndex(index);
    setGalleryVisible(true);
  };

  // Add to Cart
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
      await AxiosInstance.post("/view-cart/", {
        user_id: userId,
        variant_id: selectedVariant.id,
        quantity,
      });
      Alert.alert("Success", `${product?.name} has been added to your cart.`);
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.response?.data?.error || "Failed to add to cart."
      );
    } finally {
      setAddingToCart(false);
    }
  };

  // Buy Now
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

  // Execute the pending action after variant is confirmed
  const executePendingAction = async () => {
    if (!selectedVariant) return;

    if (pendingAction === "add_to_cart") {
      setAddingToCart(true);
      try {
        await AxiosInstance.post("/view-cart/", {
          user_id: userId,
          variant_id: selectedVariant.id,
          quantity,
        });
        Alert.alert(
          "Success",
          `${product?.name} has been added to your cart.`
        );
      } catch (err: any) {
        Alert.alert(
          "Error",
          err.response?.data?.error || "Failed to add to cart."
        );
      } finally {
        setAddingToCart(false);
        setPendingAction(null);
      }
    } else if (pendingAction === "buy_now") {
      router.push({
        pathname: "/customer/checkout",
        params: {
          productId,
          variantId: selectedVariant.id,
          quantity: String(quantity),
        },
      });
      setPendingAction(null);
    }
  };

  const handleVariantConfirm = () => {
    setVariantModalVisible(false);
    setTimeout(executePendingAction, 100);
  };

  // ── Render ──────────────────────────────────────────────────────────────

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
        <View style={{ padding: 16 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 6 }}>
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>
          <Text
            style={{ textAlign: "center", marginTop: 40, color: "#6B7280" }}
          >
            Product not found.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const isInStock = selectedVariant?.in_stock ?? product.has_stock;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
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

      {/* ── Scrollable body ────────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero image card */}
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
            onPress={() => openProductGallery(0)}
            activeOpacity={0.9}
          >
            {productImages.length > 0 ? (
              <View>
                <Image
                  source={{ uri: productImages[0] }}
                  style={{ width: "100%", height: 260 }}
                  resizeMode="cover"
                />
                {productImages.length > 1 && (
                  <View
                    style={{
                      position: "absolute",
                      bottom: 10,
                      right: 10,
                      backgroundColor: "rgba(0,0,0,0.55)",
                      borderRadius: 12,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Ionicons name="images-outline" size={13} color="#FFF" />
                    <Text
                      style={{
                        color: "#FFFFFF",
                        fontSize: 12,
                        fontWeight: "600",
                      }}
                    >
                      {productImages.length}
                    </Text>
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
          </TouchableOpacity>

          <View style={{ padding: 14 }}>
            <Text
              style={{ fontSize: 20, fontWeight: "700", color: "#111827" }}
            >
              {product.name}
            </Text>
            <Text
              style={{
                fontSize: 26,
                fontWeight: "700",
                color: "#EA580C",
                marginTop: 6,
              }}
            >
              {selectedVariant
                ? formatCurrency(selectedVariant.price) ?? "₱0.00"
                : "Price unavailable"}
            </Text>
            {product.description ? (
              <Text
                style={{
                  fontSize: 14,
                  color: "#374151",
                  marginTop: 12,
                  lineHeight: 20,
                }}
              >
                {product.description}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Variant selection button */}
        {product.variants && product.variants.length > 0 && (
          <TouchableOpacity
            onPress={() => setVariantModalVisible(true)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: "#FFFFFF",
              borderWidth: 1,
              borderColor: "#E5E7EB",
              borderRadius: 10,
              padding: 12,
              marginBottom: 4,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{ fontSize: 13, color: "#6B7280", marginBottom: 2 }}
              >
                Variant
              </Text>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "600",
                  color: "#111827",
                }}
              >
                {selectedVariant?.title ||
                  selectedVariant?.sku_code ||
                  "Select Option"}
              </Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
            >
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

        {/* ── Ownership Info Card (always rendered when variant selected) ── */}
        {selectedVariant && (
          <OwnershipInfoCard
            variant={selectedVariant}
            onProofImagePress={openProofGallery}
          />
        )}
      </ScrollView>

      {/* ── Footer action bar ───────────────────────────────────────────── */}
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
            paddingBottom: 28,
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
                  style={{
                    fontSize: 14,
                    fontWeight: "700",
                    color: "#F97316",
                  }}
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
            <Text
              style={{ fontSize: 14, fontWeight: "700", color: "#FFFFFF" }}
            >
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
            paddingBottom: 28,
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
            <Text
              style={{
                fontSize: 14,
                color: "#DC2626",
                fontWeight: "700",
              }}
            >
              Currently Out of Stock
            </Text>
          </View>
        </View>
      )}

      {/* ── Variant Selection Modal ─────────────────────────────────────── */}
      {product.variants && (
        <VariantSelectionModal
          visible={variantModalVisible}
          variants={product.variants}
          selectedVariant={selectedVariant}
          quantity={quantity}
          onSelectVariant={setSelectedVariant}
          onQuantityChange={setQuantity}
          onConfirm={handleVariantConfirm}
          onClose={() => setVariantModalVisible(false)}
          productName={product.name}
          productImage={productImages[0] ?? null}
        />
      )}

      {/* ── Unified Image Gallery Modal ─────────────────────────────────── */}
      <ImageGalleryModal
        visible={galleryVisible}
        images={galleryImages}
        initialIndex={galleryInitialIndex}
        onClose={() => setGalleryVisible(false)}
      />
    </SafeAreaView>
  );
}