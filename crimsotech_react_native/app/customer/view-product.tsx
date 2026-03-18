// app/(customer)/product/view-product.tsx
import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
  Platform,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import CustomerLayout from "./CustomerLayout";
import { useAuth } from "../../contexts/AuthContext";
import AxiosInstance from "../../contexts/axios";

// Ensure URLs are absolute
const ensureAbsoluteUrl = (url?: string | null) => {
  if (!url) return null;
  if (typeof url !== "string") return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const base =
    AxiosInstance.defaults?.baseURL?.replace(/\/$/, "") ||
    "http://localhost:8000";
  if (url.startsWith("/")) return `${base}${url}`;
  return `${base}/${url}`;
};

// Icons
import {
  Ionicons,
  MaterialIcons,
  MaterialCommunityIcons,
  FontAwesome,
  AntDesign,
  Feather,
} from "@expo/vector-icons";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const IMAGE_SIZE = SCREEN_WIDTH - 32;

// Types
interface Variant {
  id: string;
  product: string;
  shop: string;
  title: string;
  option_title: string;
  option_created_at: string;
  option_ids: string[];
  option_map: Record<string, string>;
  sku_code: string;
  price: string;
  compare_price: string | null;
  quantity: number;
  weight: string;
  weight_unit: string;
  critical_trigger: number;
  is_active: boolean;
  is_refundable: boolean;
  refund_days: number;
  allow_swap: boolean;
  swap_type: string;
  original_price: string;
  usage_period: number;
  usage_unit: string;
  depreciation_rate: number;
  minimum_additional_payment: string;
  maximum_additional_payment: string;
  swap_description: string;
  image: string | null;
  image_url: string | null;
  critical_stock: number | null;
  created_at: string;
  updated_at: string;
}

interface MediaFile {
  id: string;
  file_data: string;
  file_type: string;
  file_url: string;
}

interface PrimaryImage {
  id: string;
  url: string;
  file_type: string;
}

interface PriceRange {
  min: number;
  max: number;
  is_range: boolean;
}

interface Shop {
  id: string;
  address: string;
  avg_rating: number | null;
  shop_picture: string | null;
  description: string;
  name: string;
  province: string;
  city: string;
  barangay: string;
  street: string;
  contact_number: string;
  verified: boolean;
  status: string;
  total_sales: string;
  created_at: string;
  updated_at: string;
  is_suspended: boolean;
  suspension_reason: string | null;
  suspended_until: string | null;
  customer: string;
}

interface SellerInfo {
  type: "shop" | "seller";
  id: string;
  username?: string;
  email?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  contact_number?: string;
  profile_picture?: string | null;
  created_at?: string;
  is_suspended?: boolean;
  name?: string;
  address?: string;
  avg_rating?: number | null;
  shop_picture?: string | null;
  description?: string;
  verified?: boolean;
  total_sales?: string;
}

interface Customer {
  id: string;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  profile_picture?: string | null;
  contact_number?: string;
  avg_rating?: number | null;
  total_sales?: number;
  created_at?: string;
}

interface Category {
  id: string;
  name: string;
  shop: string | null;
  user: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  status: string;
  upload_status: string;
  condition: string;
  is_refundable: boolean;
  refund_days: number;
  created_at: string;
  updated_at: string;
  shop: Shop | null;
  customer?: Customer | null;
  category: Category | null;
  category_admin: Category | null;
  variants: Variant[];
  media_files: MediaFile[];
  primary_image: PrimaryImage | null;
  total_stock: number;
  price_display: string;
  price_range?: PriceRange | null;
  variant_count: number;
  default_variant: Variant | null;
}

// Helper function to safely convert to number
const safeToNumber = (value: any, defaultValue: number = 0): number => {
  if (value === null || value === undefined) return defaultValue;
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
};

// Helper function to check if product is a gift
const isProductGift = (product: Product | null): boolean => {
  if (!product) return false;

  // Check by name
  if (product.name.toLowerCase().includes("gift")) {
    return true;
  }

  // Check price_display
  if (
    product.price_display === "FREE GIFT" ||
    product.price_display === "₱0" ||
    product.price_display === "₱0.00" ||
    product.price_display === "Price unavailable" ||
    product.price_display === "Price not available"
  ) {
    if (product.name.toLowerCase().includes("gift")) {
      return true;
    }

    // Check if all variants have zero price
    if (product.variants && product.variants.length > 0) {
      const allZeroPrices = product.variants.every(
        (v) => safeToNumber(v.price) === 0,
      );
      if (allZeroPrices) {
        return true;
      }
    }
  }

  // Check if price_range has min and max both 0
  if (product.price_range) {
    if (product.price_range.min === 0 && product.price_range.max === 0) {
      return true;
    }
  }

  // Check if any variant has price 0
  if (product.variants && product.variants.length > 0) {
    const hasZeroPriceVariant = product.variants.some(
      (v) => safeToNumber(v.price) === 0,
    );
    if (hasZeroPriceVariant) {
      return true;
    }
  }

  return false;
};

// Helper function to get display price
const getProductDisplayPrice = (product: Product | null): string => {
  if (!product) return "Price unavailable";

  if (isProductGift(product)) {
    return "FREE GIFT";
  }

  return product.price_display || "Price unavailable";
};

export default function ViewProductPage() {
  const params = useLocalSearchParams();
  const productId = params.productId as string;
  const { user } = useAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [sellerInfo, setSellerInfo] = useState<SellerInfo | null>(null);
  const [loadingSeller, setLoadingSeller] = useState(false);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<
    Record<string, string>
  >({});
  const [activeImage, setActiveImage] = useState(0);
  const [addingToCart, setAddingToCart] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);
  const [currentVariant, setCurrentVariant] = useState<Variant | null>(null);
  const [startingSwap, setStartingSwap] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  // Determine if this is a gift product
  const isGift = isProductGift(product);
  const displayPrice = getProductDisplayPrice(product);

  // Determine if this is a personal listing (no shop)
  const isPersonalListing = !product?.shop;

  // Safely determine if product has variants
  const hasVariants = !!(
    product?.variants &&
    Array.isArray(product.variants) &&
    product.variants.length > 0
  );

  // Refund policy
  const isRefundable = !!(
    currentVariant?.is_refundable || product?.is_refundable
  );
  const refundDays = currentVariant?.is_refundable
    ? (currentVariant.refund_days ?? product?.refund_days ?? 0)
    : product?.is_refundable
      ? (product.refund_days ?? 0)
      : 0;
  const refundText = `refundable (${refundDays} day${refundDays === 1 ? "" : "s"})`;

  const isExplicitlyNonRefundable =
    currentVariant?.is_refundable === false || product?.is_refundable === false;

  const isAvailableForSwap = hasVariants
    ? currentVariant && currentVariant.allow_swap
    : false;

  // Fetch product data
  useEffect(() => {
    fetchProduct();
  }, [productId]);

  // Fetch seller information for personal listings
  useEffect(() => {
    const fetchSellerInfo = async () => {
      if (product?.id && isPersonalListing) {
        setLoadingSeller(true);
        try {
          const response = await AxiosInstance.get(
            `/public-products/${product.id}/seller/`,
          );
          setSellerInfo(response.data);
          console.log("Seller info loaded:", response.data);
        } catch (err) {
          console.error("Error fetching seller info:", err);
        } finally {
          setLoadingSeller(false);
        }
      }
    };

    fetchSellerInfo();
  }, [product?.id, isPersonalListing]);

  // Use default variant if available
  useEffect(() => {
    if (product?.default_variant && !currentVariant) {
      setCurrentVariant(product.default_variant);
    }
  }, [product?.default_variant]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await AxiosInstance.get(
        `/public-products/${productId}/`,
      );
      setProduct(response.data);

      // Initialize variant selections
      if (response.data.variants?.length) {
        const initial: Record<string, string> = {};
        // You'll need to implement proper variant group extraction
        setSelectedOptions(initial);
      }
    } catch (error) {
      console.error("Error fetching product:", error);
      Alert.alert("Error", "Failed to load product");
    } finally {
      setLoading(false);
    }
  };

  const getAvailableOptionIdsForGroup = (
    variants: Variant[],
    selectedOptions: Record<string, string>,
    groupId: string,
  ): Set<string> => {
    if (!variants || variants.length === 0) return new Set<string>();

    const otherSelected = Object.entries(selectedOptions)
      .filter(([g, optId]) => g !== groupId && !!optId)
      .map(([, optId]) => String(optId));

    if (otherSelected.length === 0) {
      return new Set<string>(
        variants.flatMap((v) => (v.option_ids || []).map(String)),
      );
    }

    const matchingVariants = variants.filter((variant) => {
      const variantOptionIds = (variant.option_ids || []).map(String);
      return otherSelected.every((id) => variantOptionIds.includes(id));
    });

    return new Set<string>(
      matchingVariants.flatMap((v) => (v.option_ids || []).map(String)),
    );
  };

  const handleSelectOption = (groupId: string, optionId: string) => {
    setSelectedOptions({ ...selectedOptions, [groupId]: optionId });
  };

  // Get display values from current variant or product defaults
  const displayVariantPrice = currentVariant
    ? safeToNumber(currentVariant.price, 0)
    : product?.price_range?.min || 0;

  const displayComparePrice = currentVariant?.compare_price
    ? safeToNumber(currentVariant.compare_price)
    : undefined;

  const displayStock = currentVariant
    ? safeToNumber(currentVariant.quantity, 0)
    : safeToNumber(product?.total_stock || 0, 0);

  const increaseQuantity = () => {
    if (quantity < displayStock) {
      setQuantity((prev) => prev + 1);
    }
  };

  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity((prev) => prev - 1);
    }
  };

  // Build media URLs
  const getMediaUrls = () => {
    if (!product) return ["https://via.placeholder.com/400"];

    const urls: string[] = [];
    const seen = new Set<string>();

    // Add product media files
    if (product.media_files && Array.isArray(product.media_files)) {
      product.media_files.forEach((img) => {
        const url = ensureAbsoluteUrl(img.file_data || img.file_url);
        if (url && !seen.has(url)) {
          urls.push(url);
          seen.add(url);
        }
      });
    }

    // Add variant images
    if (product.variants && Array.isArray(product.variants)) {
      product.variants.forEach((variant) => {
        if (variant.image || variant.image_url) {
          const url = ensureAbsoluteUrl(variant.image || variant.image_url);
          if (url && !seen.has(url)) {
            urls.push(url);
            seen.add(url);
          }
        }
      });
    }

    // Add primary image
    if (product.primary_image?.url) {
      const url = ensureAbsoluteUrl(product.primary_image.url);
      if (url && !seen.has(url)) {
        urls.unshift(url);
        seen.add(url);
      }
    }

    return urls.length > 0 ? urls : ["https://via.placeholder.com/400"];
  };

  const handleAddToCart = async () => {
    if (!product || !user?.id) {
      Alert.alert("Login Required", "Please login to add items to cart");
      return;
    }

    if (!currentVariant) {
      Alert.alert("Selection Required", "Please select a variant");
      return;
    }

    setAddingToCart(true);
    setCartError(null);

    try {
      const payload = {
        user_id: user.id,
        product_id: product.id,
        variant_id: currentVariant.id,
        quantity,
      };

      const response = await AxiosInstance.post("/cart/add/", payload);

      if (response.data.success) {
        let message = "Product added to cart!";
        switch (response.data.action) {
          case "updated":
            message = `Cart updated! Quantity is now ${response.data.new_quantity}`;
            break;
          case "recycled":
            message = "Item added to cart from previous order";
            break;
        }
        Alert.alert("Success", message);
      } else {
        Alert.alert("Error", response.data.error || "Failed to add to cart");
      }
    } catch (err: any) {
      console.error(err);
      let errorMsg = "An error occurred while adding to cart";
      if (err.response?.data?.error) {
        errorMsg = err.response.data.error;
      }
      Alert.alert("Error", errorMsg);
    } finally {
      setAddingToCart(false);
    }
  };

  const handleStartSwap = async () => {
    if (!product || !user?.id) {
      Alert.alert("Login Required", "Please login to start a swap");
      return;
    }

    if (!currentVariant || !currentVariant.allow_swap) {
      Alert.alert("Not Available", "This variant is not available for swap");
      return;
    }

    setStartingSwap(true);
    setSwapError(null);

    try {
      Alert.alert("Coming Soon", "Swap functionality will be available soon!", [
        { text: "OK" },
      ]);
    } catch (err: any) {
      console.error(err);
      Alert.alert("Error", "An error occurred while initiating swap");
    } finally {
      setStartingSwap(false);
    }
  };

  const handleShare = async () => {
    try {
      const message = `Check out ${product?.name} on our app!\nPrice: ${displayPrice}`;

      Alert.alert("Share Product", message, [
        {
          text: "Copy to Clipboard",
          onPress: () => {
            Alert.alert("Copied!", "Product info copied to clipboard");
          },
        },
        { text: "Cancel", style: "cancel" },
      ]);
    } catch (error) {
      console.error("Error sharing:", error);
      Alert.alert("Error", "Failed to share product");
    }
  };

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
  };

  const handleVisitShop = () => {
    if (product?.shop?.id) {
      router.push(`/customer/view-shop?shopId=${product.shop.id}`);
    }
  };

  // Get seller display name
  const getSellerDisplayName = () => {
    if (!sellerInfo) return "Unknown Seller";

    if (sellerInfo.full_name) return sellerInfo.full_name;
    if (sellerInfo.first_name || sellerInfo.last_name) {
      return `${sellerInfo.first_name || ""} ${sellerInfo.last_name || ""}`.trim();
    }
    if (sellerInfo.username) return sellerInfo.username;
    if (sellerInfo.name) return sellerInfo.name;
    return "Unknown Seller";
  };

  // Get seller profile picture
  const getSellerPicture = () => {
    if (sellerInfo?.type === "shop") {
      return (
        ensureAbsoluteUrl(sellerInfo.shop_picture) ||
        "https://via.placeholder.com/60"
      );
    } else {
      return (
        ensureAbsoluteUrl(sellerInfo?.profile_picture) ||
        "https://via.placeholder.com/60"
      );
    }
  };

  const renderStars = (rating: number = 0) => {
    return Array.from({ length: 5 }).map((_, idx) => (
      <Ionicons
        key={idx}
        name={idx < Math.floor(rating) ? "star" : "star-outline"}
        size={14}
        color={idx < rating ? "#FFD700" : "#D1D5DB"}
      />
    ));
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <CustomerLayout disableScroll hideBottomTab={true}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F97316" />
            <Text style={styles.loadingText}>Loading product...</Text>
          </View>
        </CustomerLayout>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.container}>
        <CustomerLayout disableScroll hideBottomTab={true}>
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={64} color="#EF4444" />
            <Text style={styles.errorText}>Product not found</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchProduct}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </CustomerLayout>
      </SafeAreaView>
    );
  }

  const mediaUrls = getMediaUrls();
  const mainImageFromVariant =
    currentVariant?.image || currentVariant?.image_url
      ? ensureAbsoluteUrl(currentVariant.image || currentVariant.image_url)
      : null;
  const displayImageUrl =
    mainImageFromVariant ?? mediaUrls[activeImage] ?? mediaUrls[0];

  return (
    <SafeAreaView style={styles.container}>
      <CustomerLayout disableScroll hideBottomTab={true}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Product Images */}
          <View style={styles.imageSection}>
            <TouchableOpacity
              style={styles.mainImageContainer}
              onPress={() => setImageModalVisible(true)}
              activeOpacity={0.9}
            >
              <Image
                source={{ uri: displayImageUrl }}
                style={styles.mainImage}
                resizeMode="cover"
              />

              {/* Image counter */}
              {mediaUrls.length > 1 && (
                <View style={styles.imageCounter}>
                  <Text style={styles.imageCounterText}>
                    {activeImage + 1} / {mediaUrls.length}
                  </Text>
                </View>
              )}

              {/* Navigation arrows */}
              {mediaUrls.length > 1 && (
                <>
                  <TouchableOpacity
                    style={[styles.navArrow, styles.leftArrow]}
                    onPress={() =>
                      setActiveImage((prev) =>
                        prev === 0 ? mediaUrls.length - 1 : prev - 1,
                      )
                    }
                  >
                    <Ionicons name="chevron-back" size={24} color="#FFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.navArrow, styles.rightArrow]}
                    onPress={() =>
                      setActiveImage((prev) =>
                        prev === mediaUrls.length - 1 ? 0 : prev + 1,
                      )
                    }
                  >
                    <Ionicons name="chevron-forward" size={24} color="#FFF" />
                  </TouchableOpacity>
                </>
              )}
            </TouchableOpacity>

            {/* Thumbnail strip */}
            {mediaUrls.length > 1 && (
              <FlatList
                horizontal
                data={mediaUrls}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item, index }) => (
                  <TouchableOpacity
                    onPress={() => setActiveImage(index)}
                    style={[
                      styles.thumbnailContainer,
                      activeImage === index && styles.thumbnailActive,
                    ]}
                  >
                    <Image
                      source={{ uri: item }}
                      style={styles.thumbnail}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                )}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.thumbnailList}
              />
            )}
          </View>

          {/* Product Info */}
          <View style={styles.productInfo}>
            {/* Title and Actions */}
            <View style={styles.titleRow}>
              <View style={styles.titleContainer}>
                <Text style={styles.productName}>{product.name}</Text>
                {isGift && (
                  <View style={styles.giftBadge}>
                    <MaterialCommunityIcons
                      name="gift"
                      size={14}
                      color="#9A3412"
                    />
                    <Text style={styles.giftBadgeText}>FREE GIFT</Text>
                  </View>
                )}
              </View>
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  onPress={toggleFavorite}
                  style={styles.iconButton}
                >
                  <Ionicons
                    name={isFavorite ? "heart" : "heart-outline"}
                    size={24}
                    color={isFavorite ? "#EF4444" : "#6B7280"}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleShare}
                  style={styles.iconButton}
                >
                  <Ionicons
                    name="share-social-outline"
                    size={24}
                    color="#6B7280"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Rating, Condition and Refund */}
            <View style={styles.ratingRow}>
              <View style={styles.ratingContainer}>
                {renderStars(product.shop?.avg_rating || 0)}
                <Text style={styles.ratingText}>
                  {product.shop?.avg_rating?.toFixed(1) || "0.0"}
                </Text>
              </View>
              <Text style={styles.conditionText}>{product.condition}</Text>

              {/* Refund info - only show if not a gift */}
              {!isGift &&
                (isRefundable ? (
                  <View style={styles.refundableBadge}>
                    <MaterialCommunityIcons
                      name="shield-check"
                      size={14}
                      color="#065F46"
                    />
                    <Text style={styles.refundableText}>{refundText}</Text>
                  </View>
                ) : (
                  isExplicitlyNonRefundable && (
                    <View style={styles.nonRefundableBadge}>
                      <MaterialCommunityIcons
                        name="shield-off"
                        size={14}
                        color="#991B1B"
                      />
                      <Text style={styles.nonRefundableText}>
                        Non-refundable
                      </Text>
                    </View>
                  )
                ))}
            </View>

            {/* Price */}
            <View style={styles.priceContainer}>
              <Text style={[styles.price, isGift && styles.giftPrice]}>
                {displayPrice}
              </Text>
              {!isGift &&
                displayComparePrice &&
                displayComparePrice > displayVariantPrice && (
                  <Text style={styles.comparePrice}>
                    ₱{displayComparePrice.toFixed(2)}
                  </Text>
                )}
            </View>

            {/* Stock and Price Range */}
            <View style={styles.stockContainer}>
              <Text
                style={[
                  styles.stockText,
                  displayStock <= 0 && styles.outOfStock,
                ]}
              >
                Stock: {displayStock}{" "}
                {displayStock <= 0 ? "(Out of Stock)" : ""}
              </Text>
              {!isGift &&
                product.price_range &&
                product.price_range.is_range && (
                  <Text style={styles.priceRangeText}>
                    Price range: ₱{product.price_range.min.toFixed(2)} - ₱
                    {product.price_range.max.toFixed(2)}
                  </Text>
                )}
            </View>

            {/* Description */}
            <Text style={styles.description}>{product.description}</Text>
          </View>

          {/* Variant count info */}
          {!isGift && product.variant_count > 1 && (
            <View style={styles.variantInfo}>
              <Text style={styles.variantInfoText}>
                This product has {product.variant_count} variants available.
                Please select your preferred variant.
              </Text>
            </View>
          )}

          {/* Variants */}
          {hasVariants && product.variants && !isGift && (
            <View style={styles.variantsSection}>
              <Text style={styles.sectionTitle}>Variants</Text>
              {/* You'll need to implement variant group rendering here */}
            </View>
          )}

          {/* Quantity - Always show */}
          <View style={styles.quantitySection}>
            <Text style={styles.sectionTitle}>Quantity</Text>
            <View style={styles.quantitySelector}>
              <TouchableOpacity
                style={[
                  styles.quantityButton,
                  quantity <= 1 && styles.quantityButtonDisabled,
                ]}
                onPress={decreaseQuantity}
                disabled={quantity <= 1}
              >
                <Ionicons
                  name="remove"
                  size={20}
                  color={quantity <= 1 ? "#9CA3AF" : "#111827"}
                />
              </TouchableOpacity>
              <Text style={styles.quantityText}>{quantity}</Text>
              <TouchableOpacity
                style={[
                  styles.quantityButton,
                  quantity >= displayStock && styles.quantityButtonDisabled,
                ]}
                onPress={increaseQuantity}
                disabled={quantity >= displayStock}
              >
                <Ionicons
                  name="add"
                  size={20}
                  color={quantity >= displayStock ? "#9CA3AF" : "#111827"}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Conditional Seller/Shop Information */}
          {isPersonalListing ? (
            /* Personal Listing - Show Seller Information */
            <View style={styles.sellerSection}>
              <Text style={styles.sectionTitle}>Seller Information</Text>
              {loadingSeller ? (
                <View style={styles.loadingSeller}>
                  <ActivityIndicator size="small" color="#8B5CF6" />
                  <Text style={styles.loadingSellerText}>
                    Loading seller information...
                  </Text>
                </View>
              ) : sellerInfo ? (
                <TouchableOpacity style={styles.sellerInfo}>
                  <View style={styles.sellerAvatar}>
                    {sellerInfo.profile_picture ? (
                      <Image
                        source={{ uri: getSellerPicture() }}
                        style={styles.sellerImage}
                      />
                    ) : (
                      <Ionicons name="person" size={24} color="#8B5CF6" />
                    )}
                  </View>
                  <View style={styles.sellerDetails}>
                    <Text style={styles.sellerName}>
                      {getSellerDisplayName()}
                    </Text>
                    {sellerInfo.email && (
                      <Text style={styles.sellerEmail}>{sellerInfo.email}</Text>
                    )}
                    {sellerInfo.contact_number && (
                      <Text style={styles.sellerContact}>
                        Contact: {sellerInfo.contact_number}
                      </Text>
                    )}
                    <View style={styles.personalListingBadge}>
                      <Text style={styles.personalListingText}>
                        Personal Listing
                      </Text>
                    </View>
                    {sellerInfo.created_at && (
                      <Text style={styles.memberSince}>
                        Member since{" "}
                        {new Date(sellerInfo.created_at).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ) : (
                <Text style={styles.noInfoText}>
                  Seller information not available
                </Text>
              )}
            </View>
          ) : (
            /* Shop Product - Show Shop Information */
            product.shop && (
              <TouchableOpacity
                onPress={handleVisitShop}
                style={styles.shopSection}
              >
                <Text style={styles.sectionTitle}>Shop Information</Text>
                <View style={styles.shopInfo}>
                  <Image
                    source={{
                      uri:
                        ensureAbsoluteUrl(product.shop.shop_picture) ||
                        "https://via.placeholder.com/60",
                    }}
                    style={styles.shopImage}
                  />
                  <View style={styles.shopDetails}>
                    <Text style={styles.shopName}>
                      {product.shop.name || "Unknown Shop"}
                    </Text>
                    {product.shop.address && (
                      <View style={styles.shopAddress}>
                        <Ionicons
                          name="location-outline"
                          size={14}
                          color="#6B7280"
                        />
                        <Text style={styles.shopAddressText} numberOfLines={1}>
                          {product.shop.address}
                        </Text>
                      </View>
                    )}
                    {product.shop.avg_rating !== undefined &&
                      product.shop.avg_rating !== null && (
                        <View style={styles.shopRating}>
                          {renderStars(product.shop.avg_rating)}
                          <Text style={styles.shopRatingText}>
                            {product.shop.avg_rating?.toFixed(1) || "N/A"}
                          </Text>
                        </View>
                      )}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </View>
              </TouchableOpacity>
            )
          )}
        </ScrollView>

        {/* Fixed Action Bar - Professional Minimalist Design */}
        <View style={styles.actionBar}>
          {/* Left side - Price Summary */}
          <View style={styles.priceSummary}>
            <Text style={styles.totalLabel}>Total</Text>
            <View style={styles.priceRow}>
              <Text style={styles.totalPrice}>
                {isGift
                  ? "FREE"
                  : `₱${(displayVariantPrice * quantity).toFixed(2)}`}
              </Text>
              {!isGift &&
                displayComparePrice &&
                displayComparePrice > displayVariantPrice && (
                  <Text style={styles.originalPrice}>
                    ₱{(displayComparePrice * quantity).toFixed(2)}
                  </Text>
                )}
            </View>
            {!isGift &&
              displayComparePrice &&
              displayComparePrice > displayVariantPrice && (
                <Text style={styles.savings}>
                  Save ₱
                  {(
                    (displayComparePrice - displayVariantPrice) *
                    quantity
                  ).toFixed(2)}
                </Text>
              )}
          </View>

          {/* Right side - Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            {/* Swap Button */}
            {!isGift && isAvailableForSwap && displayStock > 0 && (
              <TouchableOpacity
                style={[styles.actionButton, styles.swapButton]}
                onPress={handleStartSwap}
                disabled={startingSwap}
              >
                {startingSwap ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <MaterialCommunityIcons
                    name="swap-horizontal"
                    size={18}
                    color="#FFF"
                  />
                )}
              </TouchableOpacity>
            )}

            {/* Add to Cart Button */}
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.cartButton,
                !isGift && isAvailableForSwap
                  ? styles.cartButtonCompact
                  : styles.cartButtonFull,
              ]}
              onPress={handleAddToCart}
              disabled={addingToCart || displayStock <= 0}
            >
              {addingToCart ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Ionicons name="cart-outline" size={18} color="#FFF" />
                  <Text style={styles.buttonText}>
                    {displayStock <= 0 ? "Out of Stock" : "Cart"}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Buy Now Button */}
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.buyButton,
                !isGift && isAvailableForSwap
                  ? styles.buyButtonCompact
                  : styles.buyButtonFull,
              ]}
              onPress={handleAddToCart}
              disabled={displayStock <= 0}
            >
              <Text style={styles.buttonText}>
                {displayStock <= 0 ? "Out of Stock" : isGift ? "Claim" : "Buy"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Image Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={imageModalVisible}
          onRequestClose={() => setImageModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setImageModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={28} color="#FFF" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={mediaUrls}
              keyExtractor={(item, index) => index.toString()}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={activeImage}
              onMomentumScrollEnd={(event) => {
                const index = Math.round(
                  event.nativeEvent.contentOffset.x / SCREEN_WIDTH,
                );
                setActiveImage(index);
              }}
              getItemLayout={(data, index) => ({
                length: SCREEN_WIDTH,
                offset: SCREEN_WIDTH * index,
                index,
              })}
              renderItem={({ item }) => (
                <View style={styles.modalImageContainer}>
                  <Image
                    source={{ uri: item }}
                    style={styles.modalImage}
                    resizeMode="contain"
                  />
                </View>
              )}
            />

            <View style={styles.modalFooter}>
              <Text style={styles.modalImageCounter}>
                {activeImage + 1} / {mediaUrls.length}
              </Text>
            </View>
          </View>
        </Modal>
      </CustomerLayout>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6B7280",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: "#374151",
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: "#F97316",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  imageSection: {
    backgroundColor: "#F9FAFB",
  },
  mainImageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    backgroundColor: "#F3F4F6",
    position: "relative",
  },
  mainImage: {
    width: "100%",
    height: "100%",
  },
  imageCounter: {
    position: "absolute",
    top: 16,
    right: 16,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  imageCounterText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  navArrow: {
    position: "absolute",
    top: "50%",
    marginTop: -20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  leftArrow: {
    left: 16,
  },
  rightArrow: {
    right: 16,
  },
  thumbnailList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  thumbnailContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 2,
    borderColor: "transparent",
    overflow: "hidden",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  thumbnailActive: {
    borderColor: "#F97316",
  },
  productInfo: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  productName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  giftBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFEDD5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: "flex-start",
    gap: 4,
  },
  giftBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9A3412",
  },
  actionButtons: {
    flexDirection: "row",
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  conditionText: {
    fontSize: 14,
    color: "#6B7280",
  },
  refundableBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 4,
  },
  refundableText: {
    fontSize: 11,
    color: "#065F46",
    fontWeight: "600",
  },
  nonRefundableBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 4,
  },
  nonRefundableText: {
    fontSize: 11,
    color: "#991B1B",
    fontWeight: "600",
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  price: {
    fontSize: 24,
    fontWeight: "700",
    color: "#F97316",
  },
  giftPrice: {
    color: "#9A3412",
  },
  comparePrice: {
    fontSize: 18,
    color: "#9CA3AF",
    textDecorationLine: "line-through",
    marginLeft: 12,
  },
  stockContainer: {
    marginBottom: 16,
  },
  stockText: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 4,
  },
  outOfStock: {
    color: "#EF4444",
  },
  priceRangeText: {
    fontSize: 13,
    color: "#6B7280",
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: "#4B5563",
  },
  variantInfo: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
  },
  variantInfoText: {
    fontSize: 13,
    color: "#1E40AF",
    textAlign: "center",
  },
  variantsSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 16,
  },
  quantitySection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  quantitySelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 8,
    alignSelf: "flex-start",
  },
  quantityButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  quantityButtonDisabled: {
    backgroundColor: "#F3F4F6",
    borderColor: "#F3F4F6",
  },
  quantityText: {
    width: 60,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  sellerSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  loadingSeller: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    gap: 8,
  },
  loadingSellerText: {
    fontSize: 14,
    color: "#6B7280",
  },
  sellerInfo: {
    flexDirection: "row",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
  },
  sellerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#EDE9FE",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  sellerImage: {
    width: "100%",
    height: "100%",
  },
  sellerDetails: {
    flex: 1,
    marginLeft: 12,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  sellerEmail: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 2,
  },
  sellerContact: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 4,
  },
  personalListingBadge: {
    backgroundColor: "#EDE9FE",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  personalListingText: {
    fontSize: 11,
    color: "#6D28D9",
    fontWeight: "600",
  },
  memberSince: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  noInfoText: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    padding: 16,
  },
  shopSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  shopInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
  },
  shopImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#E5E7EB",
  },
  shopDetails: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  shopName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  shopAddress: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  shopAddressText: {
    fontSize: 12,
    color: "#6B7280",
    marginLeft: 4,
    flex: 1,
  },
  shopRating: {
    flexDirection: "row",
    alignItems: "center",
  },
  shopRatingText: {
    fontSize: 12,
    color: "#6B7280",
    marginLeft: 4,
  },
  detailsSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -8,
  },
  detailItem: {
    width: "50%",
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  detailItemFull: {
    width: "100%",
    paddingHorizontal: 8,
    marginBottom: 8,
    marginTop: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  detailPrice: {
    fontSize: 16,
    color: "#F97316",
    fontWeight: "700",
  },
  detailComparePrice: {
    fontSize: 14,
    color: "#9CA3AF",
    textDecorationLine: "line-through",
  },
  swapSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  swapInfo: {
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    padding: 16,
  },
  swapType: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  swapTypeText: {
    fontSize: 14,
    color: "#065F46",
    fontWeight: "600",
    marginLeft: 8,
    textTransform: "capitalize",
  },
  swapPayment: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  swapPaymentLabel: {
    fontSize: 13,
    color: "#374151",
  },
  swapPaymentValue: {
    fontSize: 13,
    color: "#059669",
    fontWeight: "600",
  },
  swapDescription: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
    marginTop: 8,
    fontStyle: "italic",
  },

  // PROFESSIONAL MINIMALIST ACTION BAR
  actionBar: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  priceSummary: {
    flex: 1,
    marginRight: 16,
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "#9CA3AF",
    letterSpacing: 0.5,
    marginBottom: 2,
    textTransform: "uppercase",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  totalPrice: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    letterSpacing: -0.5,
  },
  originalPrice: {
    fontSize: 14,
    color: "#9CA3AF",
    textDecorationLine: "line-through",
    fontWeight: "400",
  },
  savings: {
    fontSize: 11,
    color: "#10B981",
    fontWeight: "500",
    marginTop: 2,
    letterSpacing: 0.3,
  },
  actionButtonsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    height: 46,
    paddingHorizontal: 16,
    gap: 6,
  },
  swapButton: {
    backgroundColor: "#059669",
    width: 46,
    paddingHorizontal: 0,
  },
  cartButton: {
    backgroundColor: "#F97316",
  },
  cartButtonCompact: {
    width: 90,
  },
  cartButtonFull: {
    width: 110,
  },
  buyButton: {
    backgroundColor: "#DC2626",
  },
  buyButtonCompact: {
    width: 70,
  },
  buyButtonFull: {
    width: 90,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#000000",
  },
  modalHeader: {
    position: "absolute",
    top: Platform.OS === "ios" ? 44 : 16,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 20,
  },
  modalImageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    justifyContent: "center",
    alignItems: "center",
  },
  modalImage: {
    width: "100%",
    height: "100%",
  },
  modalFooter: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 34 : 16,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
  modalImageCounter: {
    color: "#FFFFFF",
    fontSize: 14,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
});
