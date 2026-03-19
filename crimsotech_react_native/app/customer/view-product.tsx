// app/(customer)/product/view-product.tsx
import React, { useEffect, useState, useRef } from 'react';
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
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import CustomerLayout from './CustomerLayout';
import { useAuth } from '../../contexts/AuthContext';
import AxiosInstance from '../../contexts/axios';

// Ensure URLs are absolute
const ensureAbsoluteUrl = (url?: string | null) => {
  if (!url) return null;
  if (typeof url !== 'string') return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = AxiosInstance.defaults?.baseURL?.replace(/\/$/, '') || 'http://localhost:8000';
  if (url.startsWith('/')) return `${base}${url}`;
  return `${base}/${url}`;
};

// Icons
import {
  Ionicons,
  MaterialIcons,
  MaterialCommunityIcons,
} from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  in_stock?: boolean;
  available_quantity?: number;
  stock_status?: string;
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
  type: 'shop' | 'seller';
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
  in_stock_variant_count?: number;
  has_stock?: boolean;
  total_available_stock?: number;
  total_ordered_stock?: number;
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
  
  if (product.name.toLowerCase().includes('gift')) {
    return true;
  }
  
  if (product.price_display === "FREE GIFT" || 
      product.price_display === "₱0" || 
      product.price_display === "₱0.00") {
    return true;
  }
  
  if (product.price_range) {
    if (product.price_range.min === 0 && product.price_range.max === 0) {
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

// Define thumbnail item type
interface ThumbnailItem {
  url: string;
  type: 'product' | 'variant';
  id?: string;
}

export default function ViewProductPage() {
  const params = useLocalSearchParams();
  const productId = params.productId as string;
  const { user } = useAuth();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [sellerInfo, setSellerInfo] = useState<SellerInfo | null>(null);
  const [loadingSeller, setLoadingSeller] = useState(false);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [activeImage, setActiveImage] = useState(0);
  const [addingToCart, setAddingToCart] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);
  const [currentVariant, setCurrentVariant] = useState<Variant | null>(null);
  const [startingSwap, setStartingSwap] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [thumbnailUrls, setThumbnailUrls] = useState<ThumbnailItem[]>([]);
  const flatListRef = useRef<FlatList>(null);

  const isGift = isProductGift(product);
  const displayPrice = getProductDisplayPrice(product);
  const isPersonalListing = !product?.shop;
  const hasVariants = !!(product?.variants && Array.isArray(product.variants) && product.variants.length > 0);

  const isRefundable = !!(currentVariant?.is_refundable || product?.is_refundable);
  const refundDays = currentVariant?.is_refundable 
    ? (currentVariant.refund_days ?? product?.refund_days ?? 0) 
    : (product?.is_refundable ? (product.refund_days ?? 0) : 0);
  const refundText = `refundable (${refundDays} day${refundDays === 1 ? '' : 's'})`;

  const isExplicitlyNonRefundable = (currentVariant?.is_refundable === false) || (product?.is_refundable === false);
  const isAvailableForSwap = hasVariants ? (currentVariant && currentVariant.allow_swap) : false;

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
          const response = await AxiosInstance.get(`/public-products/${product.id}/seller/`);
          setSellerInfo(response.data);
        } catch (err) {
          console.error("Error fetching seller info:", err);
        } finally {
          setLoadingSeller(false);
        }
      }
    };
    fetchSellerInfo();
  }, [product?.id, isPersonalListing]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await AxiosInstance.get(`/public-products/${productId}/`);
      setProduct(response.data);
      
      if (response.data.default_variant) {
        setCurrentVariant(response.data.default_variant);
      } else if (response.data.variants && response.data.variants.length > 0) {
        const inStockVariant = response.data.variants.find((v: Variant) => v.in_stock === true);
        setCurrentVariant(inStockVariant || response.data.variants[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectVariant = (variant: Variant) => {
    setCurrentVariant(variant);
    
    // Find the index of this variant's image in thumbnailUrls
    const variantImageUrl = variant.image_url || variant.image;
    if (variantImageUrl) {
      const fullUrl = ensureAbsoluteUrl(variantImageUrl);
      const variantImageIndex = thumbnailUrls.findIndex(
        thumb => thumb.url === fullUrl
      );
      if (variantImageIndex !== -1) {
        setActiveImage(variantImageIndex);
      }
    }
    setQuantity(1);
  };

  // Build thumbnail URLs
  useEffect(() => {
    if (!product) return;
    
    const urls: ThumbnailItem[] = [];
    const seen = new Set<string>();

    // Add primary image first
    if (product.primary_image?.url) {
      const url = ensureAbsoluteUrl(product.primary_image.url);
      if (url && !seen.has(url)) {
        urls.push({ url, type: 'product' });
        seen.add(url);
      }
    }

    // Add media files
    if (product.media_files && Array.isArray(product.media_files)) {
      product.media_files.forEach((media) => {
        const url = ensureAbsoluteUrl(media.file_data || media.file_url);
        if (url && !seen.has(url)) {
          urls.push({ url, type: 'product' });
          seen.add(url);
        }
      });
    }

    // Add variant images - IMPORTANT: Use image_url first, then image
    if (product.variants && Array.isArray(product.variants)) {
      product.variants.forEach((variant) => {
        const variantImageUrl = variant.image_url || variant.image;
        if (variantImageUrl) {
          const url = ensureAbsoluteUrl(variantImageUrl);
          if (url && !seen.has(url)) {
            urls.push({ url, type: 'variant', id: variant.id });
            seen.add(url);
          }
        }
      });
    }

    setThumbnailUrls(urls);
    setActiveImage(0);
  }, [product]);

  useEffect(() => {
    if (activeImage >= thumbnailUrls.length) {
      setActiveImage(0);
    }
  }, [thumbnailUrls.length, activeImage]);

  const handleAddToCart = async () => {
    if (!product || !user?.id) {
      Alert.alert('Login Required', 'Please login to add items to cart');
      return;
    }

    if (!currentVariant) {
      Alert.alert('Selection Required', 'Please select a variant');
      return;
    }

    setAddingToCart(true);

    try {
      const payload = {
        user_id: user.id,
        product_id: product.id,
        variant_id: currentVariant.id,
        quantity,
      };

      const response = await AxiosInstance.post("/cart/add/", payload);

      if (response.data.success) {
        Alert.alert('Success', 'Product added to cart!');
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to add to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleStartSwap = () => {
    Alert.alert('Coming Soon', 'Swap functionality will be available soon!');
  };

  const handleShare = () => {
    Alert.alert('Share', `Check out ${product?.name}`);
  };

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
  };

  const handleVisitShop = () => {
    if (product?.shop?.id) {
      router.push(`/customer/view-shop?shopId=${product.shop.id}`);
    }
  };

  const decreaseQuantity = () => {
    if (quantity > 1) setQuantity(quantity - 1);
  };

  const increaseQuantity = () => {
    const maxQuantity = currentVariant?.available_quantity || currentVariant?.quantity || 0;
    if (quantity < maxQuantity) setQuantity(quantity + 1);
  };

  const getSellerDisplayName = () => {
    if (!sellerInfo) return 'Unknown Seller';
    if (sellerInfo.full_name) return sellerInfo.full_name;
    if (sellerInfo.first_name || sellerInfo.last_name) {
      return `${sellerInfo.first_name || ''} ${sellerInfo.last_name || ''}`.trim();
    }
    return sellerInfo.name || 'Unknown Seller';
  };

  const getSellerPicture = () => {
    if (sellerInfo?.type === 'shop') {
      return ensureAbsoluteUrl(sellerInfo.shop_picture) || 'https://via.placeholder.com/60';
    }
    return ensureAbsoluteUrl(sellerInfo?.profile_picture) || 'https://via.placeholder.com/60';
  };

  const renderStars = (rating: number = 0) => {
    return Array.from({ length: 5 }).map((_, idx) => (
      <Ionicons
        key={idx}
        name={idx < Math.floor(rating) ? 'star' : 'star-outline'}
        size={14}
        color={idx < rating ? '#FFD700' : '#D1D5DB'}
      />
    ));
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <CustomerLayout disableScroll hideBottomTab={true}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F97316" />
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
          </View>
        </CustomerLayout>
      </SafeAreaView>
    );
  }

  const displayImageUrl = thumbnailUrls.length > 0 ? thumbnailUrls[activeImage]?.url : 'https://via.placeholder.com/400';
  const currentVariantPrice = currentVariant ? safeToNumber(currentVariant.price, 0) : 0;
  const currentVariantComparePrice = currentVariant?.compare_price ? safeToNumber(currentVariant.compare_price) : undefined;

  const handleImageSelect = (index: number) => {
    setActiveImage(index);
    
    // If the selected image is from a variant, select that variant
    if (thumbnailUrls[index].type === 'variant' && thumbnailUrls[index].id && product?.variants) {
      const variantId = thumbnailUrls[index].id;
      const variant = product.variants.find(v => v.id === variantId);
      if (variant) {
        setCurrentVariant(variant);
      }
    }
  };

  const handleImagePress = () => setImageModalVisible(true);
  
  const onMomentumScrollEnd = (event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveImage(index);
  };

  const renderImageThumbnail = ({ item, index }: { item: ThumbnailItem; index: number }) => (
    <TouchableOpacity
      onPress={() => handleImageSelect(index)}
      style={[
        styles.thumbnailContainer,
        activeImage === index && styles.thumbnailActive
      ]}
    >
      <Image source={{ uri: item.url }} style={styles.thumbnail} resizeMode="cover" />
    </TouchableOpacity>
  );

  const renderVariantItem = ({ item }: { item: Variant }) => {
    const isSelected = currentVariant?.id === item.id;
    const variantPrice = safeToNumber(item.price, 0);
    const variantComparePrice = item.compare_price ? safeToNumber(item.compare_price) : undefined;
    const inStock = item.in_stock === true;
    
    // Get variant image URL - prioritize image_url over image
    const variantImageUrl = item.image_url || item.image;
    const imageSource = variantImageUrl ? ensureAbsoluteUrl(variantImageUrl) : null;
    
    return (
      <TouchableOpacity
        style={[
          styles.variantItem,
          isSelected && styles.variantItemSelected,
          !inStock && styles.variantItemOutOfStock
        ]}
        onPress={() => handleSelectVariant(item)}
        disabled={!inStock}
      >
        {imageSource ? (
          <Image
            source={{ uri: imageSource }}
            style={styles.variantImage}
            resizeMode="cover"
            onError={(e) => console.log('Variant image failed to load:', item.id, e.nativeEvent.error)}
          />
        ) : (
          <View style={styles.variantImagePlaceholder}>
            <MaterialIcons name="inventory" size={16} color="#9CA3AF" />
          </View>
        )}
        <View style={styles.variantInfo}>
          <Text style={styles.variantTitle} numberOfLines={1}>
            {item.title || 'Variant'}
          </Text>
          <View style={styles.variantPriceRow}>
            <Text style={styles.variantPrice}>₱{variantPrice.toFixed(2)}</Text>
            {variantComparePrice && variantComparePrice > variantPrice && (
              <Text style={styles.variantComparePrice}>₱{variantComparePrice.toFixed(2)}</Text>
            )}
          </View>
        </View>
        {!inStock && (
          <View style={styles.variantOutOfStockBadge}>
            <Text style={styles.variantOutOfStockText}>Out of Stock</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderLightboxItem = ({ item }: { item: ThumbnailItem }) => (
    <View style={styles.modalImageContainer}>
      <Image source={{ uri: item.url }} style={styles.modalImage} resizeMode="contain" />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <CustomerLayout disableScroll hideBottomTab={true}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Product Images */}
          <View style={styles.imageSection}>
            <TouchableOpacity 
              style={styles.mainImageContainer}
              onPress={handleImagePress}
              activeOpacity={0.9}
            >
              <Image
                key={`main-image-${activeImage}`}
                source={{ uri: displayImageUrl }}
                style={styles.mainImage}
                resizeMode="cover"
              />
              
              {thumbnailUrls.length > 1 && (
                <View style={styles.imageCounter}>
                  <Text style={styles.imageCounterText}>
                    {activeImage + 1} / {thumbnailUrls.length}
                  </Text>
                </View>
              )}
              
              {thumbnailUrls.length > 1 && (
                <>
                  <TouchableOpacity
                    style={[styles.navArrow, styles.leftArrow]}
                    onPress={() => setActiveImage(prev => 
                      prev === 0 ? thumbnailUrls.length - 1 : prev - 1
                    )}
                  >
                    <Ionicons name="chevron-back" size={24} color="#FFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.navArrow, styles.rightArrow]}
                    onPress={() => setActiveImage(prev => 
                      prev === thumbnailUrls.length - 1 ? 0 : prev + 1
                    )}
                  >
                    <Ionicons name="chevron-forward" size={24} color="#FFF" />
                  </TouchableOpacity>
                </>
              )}
            </TouchableOpacity>

            {thumbnailUrls.length > 1 && (
              <FlatList
                horizontal
                data={thumbnailUrls}
                keyExtractor={(item, index) => index.toString()}
                renderItem={renderImageThumbnail}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.thumbnailList}
                extraData={activeImage}
              />
            )}
          </View>

          {/* Product Info */}
          <View style={styles.productInfo}>
            <View style={styles.titleRow}>
              <View style={styles.titleContainer}>
                <Text style={styles.productName}>{product.name}</Text>
                {isGift && (
                  <View style={styles.giftBadge}>
                    <MaterialCommunityIcons name="gift" size={14} color="#9A3412" />
                    <Text style={styles.giftBadgeText}>FREE GIFT</Text>
                  </View>
                )}
              </View>
              <View style={styles.actionButtons}>
                <TouchableOpacity onPress={toggleFavorite} style={styles.iconButton}>
                  <Ionicons 
                    name={isFavorite ? "heart" : "heart-outline"} 
                    size={24} 
                    color={isFavorite ? "#EF4444" : "#6B7280"} 
                  />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleShare} style={styles.iconButton}>
                  <Ionicons name="share-social-outline" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.ratingRow}>
              <View style={styles.ratingContainer}>
                {renderStars(product.shop?.avg_rating || 0)}
                <Text style={styles.ratingText}>{product.shop?.avg_rating?.toFixed(1) || '0.0'}</Text>
              </View>
              <Text style={styles.conditionText}>{product.condition}</Text>

              {!isGift && (
                isRefundable ? (
                  <View style={styles.refundableBadge}>
                    <MaterialCommunityIcons name="shield-check" size={14} color="#065F46" />
                    <Text style={styles.refundableText}>{refundText}</Text>
                  </View>
                ) : isExplicitlyNonRefundable && (
                  <View style={styles.nonRefundableBadge}>
                    <MaterialCommunityIcons name="shield-off" size={14} color="#991B1B" />
                    <Text style={styles.nonRefundableText}>Non-refundable</Text>
                  </View>
                )
              )}
            </View>

            {currentVariant && (
              <View style={styles.priceContainer}>
                <Text style={[styles.price, isGift && styles.giftPrice]}>
                  ₱{currentVariantPrice.toFixed(2)}
                </Text>
                {currentVariantComparePrice && currentVariantComparePrice > currentVariantPrice && (
                  <Text style={styles.comparePrice}>₱{currentVariantComparePrice.toFixed(2)}</Text>
                )}
              </View>
            )}

            {currentVariant && (
              <View style={styles.stockContainer}>
                <Text style={[
                  styles.stockText,
                  (currentVariant.available_quantity || currentVariant.quantity || 0) <= 0 && styles.outOfStock
                ]}>
                  Stock: {currentVariant.available_quantity || currentVariant.quantity || 0} 
                  {(currentVariant.available_quantity || currentVariant.quantity || 0) <= 0 ? " (Out of Stock)" : ""}
                </Text>
              </View>
            )}

            {/* Variants Section */}
            {hasVariants && product.variants && !isGift && (
              <View style={styles.variantsSection}>
                <Text style={styles.variantsTitle}>
                  Variants ({product.variants.length})
                </Text>
                <FlatList
                  data={product.variants}
                  renderItem={renderVariantItem}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  contentContainerStyle={styles.variantsList}
                />
              </View>
            )}

            <Text style={styles.description}>{product.description}</Text>
          </View>

          {/* Quantity */}
          <View style={styles.quantitySection}>
            <Text style={styles.quantityTitle}>Quantity</Text>
            <View style={styles.quantitySelector}>
              <TouchableOpacity
                style={[styles.quantityButton, quantity <= 1 && styles.quantityButtonDisabled]}
                onPress={decreaseQuantity}
                disabled={quantity <= 1}
              >
                <Ionicons name="remove" size={20} color={quantity <= 1 ? "#9CA3AF" : "#111827"} />
              </TouchableOpacity>
              <Text style={styles.quantityText}>{quantity}</Text>
              <TouchableOpacity
                style={[styles.quantityButton, quantity >= (currentVariant?.available_quantity || currentVariant?.quantity || 0) && styles.quantityButtonDisabled]}
                onPress={increaseQuantity}
                disabled={quantity >= (currentVariant?.available_quantity || currentVariant?.quantity || 0)}
              >
                <Ionicons name="add" size={20} color={quantity >= (currentVariant?.available_quantity || currentVariant?.quantity || 0) ? "#9CA3AF" : "#111827"} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Seller/Shop Information */}
          {isPersonalListing ? (
            <View style={styles.sellerSection}>
              <Text style={styles.sectionTitle}>Seller Information</Text>
              {loadingSeller ? (
                <ActivityIndicator size="small" color="#8B5CF6" />
              ) : sellerInfo ? (
                <TouchableOpacity style={styles.sellerInfo}>
                  <View style={styles.sellerAvatar}>
                    {sellerInfo.profile_picture ? (
                      <Image source={{ uri: getSellerPicture() }} style={styles.sellerImage} />
                    ) : (
                      <Ionicons name="person" size={24} color="#8B5CF6" />
                    )}
                  </View>
                  <View style={styles.sellerDetails}>
                    <Text style={styles.sellerName}>{getSellerDisplayName()}</Text>
                    <View style={styles.personalListingBadge}>
                      <Text style={styles.personalListingText}>Personal Listing</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ) : (
                <Text style={styles.noInfoText}>Seller information not available</Text>
              )}
            </View>
          ) : (
            product.shop && (
              <TouchableOpacity onPress={handleVisitShop} style={styles.shopSection}>
                <Text style={styles.sectionTitle}>Shop Information</Text>
                <View style={styles.shopInfo}>
                  <Image
                    source={{ uri: ensureAbsoluteUrl(product.shop.shop_picture) || 'https://via.placeholder.com/60' }}
                    style={styles.shopImage}
                  />
                  <View style={styles.shopDetails}>
                    <Text style={styles.shopName}>{product.shop.name}</Text>
                    {product.shop.avg_rating !== null && (
                      <View style={styles.shopRating}>
                        {renderStars(product.shop.avg_rating)}
                        <Text style={styles.shopRatingText}>{product.shop.avg_rating?.toFixed(1)}</Text>
                      </View>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </View>
              </TouchableOpacity>
            )
          )}
        </ScrollView>

        {/* Action Bar */}
        <View style={styles.actionBar}>
          <View style={styles.priceSummary}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalPrice}>
              {isGift ? 'FREE' : `₱${((currentVariant?.price ? safeToNumber(currentVariant.price) : 0) * quantity).toFixed(2)}`}
            </Text>
          </View>

          <View style={styles.actionButtonsContainer}>
            {!isGift && isAvailableForSwap && (currentVariant?.available_quantity || currentVariant?.quantity || 0) > 0 && (
              <TouchableOpacity
                style={[styles.actionButton, styles.swapButton]}
                onPress={handleStartSwap}
                disabled={startingSwap}
              >
                <MaterialCommunityIcons name="swap-horizontal" size={18} color="#FFF" />
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[
                styles.actionButton, 
                styles.cartButton,
              ]}
              onPress={handleAddToCart}
              disabled={addingToCart || (currentVariant?.available_quantity || currentVariant?.quantity || 0) <= 0}
            >
              {addingToCart ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Ionicons name="cart-outline" size={18} color="#FFF" />
                  <Text style={styles.buttonText}>Cart</Text>
                </>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.actionButton, 
                styles.buyButton,
              ]}
              onPress={handleAddToCart}
              disabled={(currentVariant?.available_quantity || currentVariant?.quantity || 0) <= 0}
            >
              <Text style={styles.buttonText}>Buy</Text>
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
            <TouchableOpacity onPress={() => setImageModalVisible(false)} style={styles.modalCloseButton}>
              <Ionicons name="close" size={28} color="#FFF" />
            </TouchableOpacity>

            {thumbnailUrls.length > 0 && (
              <FlatList
                ref={flatListRef}
                data={thumbnailUrls}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                initialScrollIndex={activeImage}
                onMomentumScrollEnd={onMomentumScrollEnd}
                getItemLayout={(data, index) => ({
                  length: SCREEN_WIDTH,
                  offset: SCREEN_WIDTH * index,
                  index,
                })}
                keyExtractor={(item, index) => index.toString()}
                renderItem={renderLightboxItem}
              />
            )}

            {thumbnailUrls.length > 1 && (
              <View style={styles.modalCounter}>
                <Text style={styles.modalCounterText}>
                  {activeImage + 1} / {thumbnailUrls.length}
                </Text>
              </View>
            )}
          </View>
        </Modal>
      </CustomerLayout>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { fontSize: 18, color: '#374151', marginTop: 16 },
  
  // Image Section
  imageSection: { backgroundColor: '#F9FAFB' },
  mainImageContainer: { width: SCREEN_WIDTH, height: SCREEN_WIDTH, backgroundColor: '#F3F4F6', position: 'relative' },
  mainImage: { width: '100%', height: '100%' },
  imageCounter: { position: 'absolute', top: 16, right: 16, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  imageCounterText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  navArrow: { position: 'absolute', top: '50%', marginTop: -20, backgroundColor: 'rgba(0,0,0,0.5)', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  leftArrow: { left: 16 },
  rightArrow: { right: 16 },
  thumbnailList: { paddingHorizontal: 16, paddingVertical: 12 },
  thumbnailContainer: { width: 60, height: 60, borderRadius: 8, marginRight: 8, borderWidth: 2, borderColor: 'transparent', overflow: 'hidden' },
  thumbnail: { width: '100%', height: '100%' },
  thumbnailActive: { borderColor: '#F97316' },
  
  // Product Info
  productInfo: { padding: 16 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  titleContainer: { flex: 1, marginRight: 12 },
  productName: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 4 },
  giftBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFEDD5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 16, alignSelf: 'flex-start', gap: 4 },
  giftBadgeText: { fontSize: 12, fontWeight: '600', color: '#9A3412' },
  actionButtons: { flexDirection: 'row' },
  iconButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  
  // Rating Row
  ratingRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  ratingContainer: { flexDirection: 'row', alignItems: 'center' },
  ratingText: { marginLeft: 4, fontSize: 14, fontWeight: '600', color: '#374151' },
  conditionText: { fontSize: 14, color: '#6B7280' },
  refundableBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 16, gap: 4 },
  refundableText: { fontSize: 11, color: '#065F46', fontWeight: '600' },
  nonRefundableBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 16, gap: 4 },
  nonRefundableText: { fontSize: 11, color: '#991B1B', fontWeight: '600' },
  
  // Price and Stock
  priceContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  price: { fontSize: 24, fontWeight: '700', color: '#F97316' },
  giftPrice: { color: '#9A3412' },
  comparePrice: { fontSize: 18, color: '#9CA3AF', textDecorationLine: 'line-through', marginLeft: 12 },
  stockContainer: { marginBottom: 16 },
  stockText: { fontSize: 14, color: '#374151' },
  outOfStock: { color: '#EF4444' },
  description: { fontSize: 14, lineHeight: 20, color: '#4B5563', marginBottom: 16 },
  
  // Variants Section - Smaller Cards
  variantsSection: { marginBottom: 16 },
  variantsTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 8 },
  variantsList: { gap: 8 },
  variantItem: { 
    flexDirection: 'row', 
    backgroundColor: '#F9FAFB', 
    borderRadius: 8, 
    padding: 8, 
    borderWidth: 1, 
    borderColor: '#F3F4F6',
    alignItems: 'center',
  },
  variantItemSelected: { borderColor: '#F97316', backgroundColor: '#FFF4E5' },
  variantItemOutOfStock: { opacity: 0.5 },
  variantImage: { width: 40, height: 40, borderRadius: 6, marginRight: 10 },
  variantImagePlaceholder: { width: 40, height: 40, borderRadius: 6, marginRight: 10, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  variantInfo: { flex: 1 },
  variantTitle: { fontSize: 13, fontWeight: '600', color: '#111827', marginBottom: 2 },
  variantPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  variantPrice: { fontSize: 13, fontWeight: '700', color: '#F97316' },
  variantComparePrice: { fontSize: 11, color: '#9CA3AF', textDecorationLine: 'line-through' },
  variantOutOfStockBadge: { position: 'absolute', top: 4, right: 4, backgroundColor: '#EF4444', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  variantOutOfStockText: { fontSize: 8, color: '#FFFFFF', fontWeight: '600' },
  
  // Quantity
  quantitySection: { padding: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  quantityTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 8 },
  quantitySelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 8, padding: 8, alignSelf: 'flex-start' },
  quantityButton: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  quantityButtonDisabled: { backgroundColor: '#F3F4F6', borderColor: '#F3F4F6' },
  quantityText: { width: 50, textAlign: 'center', fontSize: 16, fontWeight: '600', color: '#111827' },
  
  // Seller/Shop Info
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 12 },
  sellerSection: { padding: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  sellerInfo: { flexDirection: 'row', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12 },
  sellerAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#EDE9FE', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  sellerImage: { width: '100%', height: '100%' },
  sellerDetails: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  sellerName: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 4 },
  personalListingBadge: { backgroundColor: '#EDE9FE', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, alignSelf: 'flex-start' },
  personalListingText: { fontSize: 10, color: '#6D28D9', fontWeight: '600' },
  noInfoText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', padding: 16 },
  shopSection: { padding: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  shopInfo: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12 },
  shopImage: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#E5E7EB' },
  shopDetails: { flex: 1, marginLeft: 12 },
  shopName: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 4 },
  shopRating: { flexDirection: 'row', alignItems: 'center' },
  shopRatingText: { fontSize: 12, color: '#6B7280', marginLeft: 4 },
  
  // Action Bar
  actionBar: { backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  priceSummary: { flex: 1 },
  totalLabel: { fontSize: 11, color: '#9CA3AF', marginBottom: 2 },
  totalPrice: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  actionButtonsContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 8, height: 42, paddingHorizontal: 12, gap: 4 },
  swapButton: { backgroundColor: '#059669', width: 42, paddingHorizontal: 0 },
  cartButton: { backgroundColor: '#F97316' },
  buyButton: { backgroundColor: '#DC2626' },
  buttonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  
  // Modal
  modalContainer: { flex: 1, backgroundColor: '#000000' },
  modalCloseButton: { position: 'absolute', top: Platform.OS === 'ios' ? 50 : 20, right: 20, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalImageContainer: { width: SCREEN_WIDTH, height: SCREEN_WIDTH, justifyContent: 'center', alignItems: 'center' },
  modalImage: { width: '100%', height: '100%' },
  modalCounter: { position: 'absolute', bottom: Platform.OS === 'ios' ? 40 : 20, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  modalCounterText: { color: '#FFFFFF', fontSize: 14 },
});