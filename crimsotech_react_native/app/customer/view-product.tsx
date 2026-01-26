// view-product.tsx
import React, { useEffect, useState } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
// import * as Sharing from 'expo-sharing';
// import * as Clipboard from 'expo-clipboard';
import AxiosInstance from '../../contexts/axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Ensure URLs are absolute (sometimes backend returns relative paths)
const ensureAbsoluteUrl = (url?: string | null) => {
  if (!url) return null;
  if (typeof url !== 'string') return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = AxiosInstance.defaults?.baseURL?.replace(/\/$/, '') || 'http://localhost:8000';
  if (url.startsWith('/')) return `${base}${url}`;
  return `${base}/${url}`;
};

// Icons (you'll need to install these or use your own)
import {
  Ionicons,
  MaterialIcons,
  MaterialCommunityIcons,
  FontAwesome,
  FontAwesome5,
  AntDesign,
  Feather,
} from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_SIZE = SCREEN_WIDTH - 32;

interface VariantOption {
  id: string;
  title: string;
  image?: string | null;
  price?: string;
  quantity?: number;
}

interface VariantGroup {
  id: string;
  title: string;
  options: VariantOption[];
}

interface SKU {
  id: string;
  option_ids: string[];
  option_map: Record<string, string>;
  sku_code?: string;
  price: number;
  compare_price?: number;
  quantity: number;
  image?: string | null;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  weight?: number | null;
  weight_unit?: string;
  allow_swap?: boolean;
  swap_type?: string;
  minimum_additional_payment?: number;
  maximum_additional_payment?: number;
  swap_description?: string;
  accepted_categories?: { id: string; name: string }[];
}

interface Product {
  id: string;
  name: string;
  description: string;
  quantity: number;
  price: number;
  compare_price?: number;
  category?: { name: string };
  shop?: {
    id?: string;
    shop_picture?: string;
    name?: string;
    address?: string;
    avg_rating?: number;
  };
  media_files?: { file_url: string }[];
  sold?: number;
  reviews_count?: number;
  rating?: number;
  variants?: VariantGroup[];
  skus?: SKU[];
  open_for_swap?: boolean;
  swap_type?: string;
  minimum_additional_payment?: number;
  maximum_additional_payment?: number;
  swap_description?: string;
  accepted_categories?: { id: string; name: string }[];
  length?: number | null;
  width?: number | null;
  height?: number | null;
  weight?: number | null;
  weight_unit?: string | null;
  applied_gift?: any;
}

export default function ViewProductPage() {
  const params = useLocalSearchParams();
  const productId = params.productId as string;
  const { user } = useAuth();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [activeImage, setActiveImage] = useState(0);
  const [addingToCart, setAddingToCart] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);
  const [currentSKU, setCurrentSKU] = useState<SKU | null>(null);
  const [startingSwap, setStartingSwap] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [swipeEnabled, setSwipeEnabled] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);

  const hasVariants = product?.variants && product.variants.length > 0;
  const isAvailableForSwap = hasVariants
    ? (currentSKU && currentSKU.allow_swap)
    : (product?.open_for_swap || false);

  // Fetch product data
  useEffect(() => {
    fetchProduct();
  }, [productId]);

  // Update current SKU when options change
  useEffect(() => {
    if (!hasVariants || !product?.skus || Object.keys(selectedOptions).length === 0) {
      setCurrentSKU(null);
      return;
    }

    const selectedOptionIds = Object.values(selectedOptions);
    const matchingSKU = product.skus.find(sku => {
      const skuOptionIds = (sku.option_ids || []).map(String);
      const selectedIds = selectedOptionIds.map(String);
      if (skuOptionIds.length !== selectedOptionIds.length) return false;
      return selectedIds.every(id => skuOptionIds.includes(id));
    });

    setCurrentSKU(matchingSKU || null);
  }, [selectedOptions, product?.skus, hasVariants]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await AxiosInstance.get(`/public-products/${productId}/`);
      setProduct(response.data);
      
      // Initialize variant selections
      if (response.data.variants?.length) {
        const initial: Record<string, string> = {};
        response.data.variants.forEach((g: VariantGroup) => {
          const firstOption = g.options && g.options[0];
          if (firstOption) initial[g.id] = firstOption.id;
        });
        setSelectedOptions(initial);
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      Alert.alert('Error', 'Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const getAvailableOptionIdsForGroup = (
    skus: SKU[],
    selectedOptions: Record<string, string>,
    groupId: string
  ): Set<string> => {
    const otherSelected = Object.entries(selectedOptions)
      .filter(([g, optId]) => g !== groupId && !!optId)
      .map(([, optId]) => String(optId));

    if (otherSelected.length === 0) {
      return new Set<string>(skus.flatMap((s) => (s.option_ids || []).map(String)));
    }

    const matchingSkus = skus.filter((sku) => {
      const skuOptionIds = (sku.option_ids || []).map(String);
      return otherSelected.every((id) => skuOptionIds.includes(id));
    });

    return new Set<string>(matchingSkus.flatMap((s) => (s.option_ids || []).map(String)));
  };

  const handleSelectOption = (groupId: string, optionId: string) => {
    const variants = product?.variants || [];
    const groupIndex = variants.findIndex((g) => g.id === groupId);

    const newSelectedOptions: Record<string, string> = { ...selectedOptions, [groupId]: optionId };

    if (groupIndex >= 0) {
      for (let i = groupIndex + 1; i < variants.length; i++) {
        delete newSelectedOptions[variants[i].id];
      }
    }

    setSelectedOptions(newSelectedOptions);
  };

  const increaseQuantity = () => {
    const maxQty = hasVariants
      ? (currentSKU ? currentSKU.quantity : product?.skus?.reduce((sum, sku) => sum + (sku.quantity || 0), 0) || 0)
      : (product?.quantity || 0);
    
    if (quantity < maxQty) {
      setQuantity(prev => prev + 1);
    }
  };

  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  // Normalize pricing and stock to numbers to avoid runtime errors when API returns strings
  const rawDisplayPrice = hasVariants 
    ? (currentSKU?.price ?? product?.price ?? 0)
    : (product?.price ?? 0);
  const displayPrice = typeof rawDisplayPrice === 'number' ? rawDisplayPrice : (Number(rawDisplayPrice) || 0);
  
  const rawComparePrice = hasVariants
    ? (currentSKU?.compare_price ?? product?.compare_price)
    : product?.compare_price;
  const displayComparePrice = rawComparePrice === undefined || rawComparePrice === null ? undefined : (typeof rawComparePrice === 'number' ? rawComparePrice : (Number(rawComparePrice) || undefined));

  const displayStock = hasVariants
    ? (currentSKU ? (Number(currentSKU.quantity) || 0) : (product?.skus?.reduce((sum, sku) => sum + (Number(sku.quantity || 0)), 0) || 0))
    : (Number(product?.quantity || 0));

  const selectedChoicesText = hasVariants && product?.variants
    ? product.variants
        .map((group) => {
          const selectedId = selectedOptions[group.id];
          if (!selectedId) return null;
          const opt = group.options.find((o) => o.id === selectedId);
          return opt ? opt.title : null;
        })
        .filter(Boolean)
        .join(' × ')
    : '';

  const handleAddToCart = async () => {
    if (!product || !user?.id) {
      setCartError("Please login to add items to cart");
      Alert.alert('Login Required', 'Please login to add items to cart');
      return;
    }

    if (hasVariants) {
      const allSelected = product.variants!.every(g => selectedOptions[g.id]);
      if (!allSelected) {
        setCartError("Please select all variant options");
        Alert.alert('Selection Required', 'Please select all variant options');
        return;
      }

      if (!currentSKU) {
        setCartError("Please select valid variant options");
        Alert.alert('Invalid Selection', 'Please select valid variant options');
        return;
      }
    }

    setAddingToCart(true);
    setCartError(null);

    try {
      const payload: any = {
        user_id: user.id,
        product_id: product.id,
        quantity,
      };

      if (hasVariants && currentSKU) {
        payload.sku_id = currentSKU.id;
      }

      if (hasVariants && Object.keys(selectedOptions).length > 0) {
        payload.variant_selection = selectedOptions;
      }

      const response = await AxiosInstance.post("/cart/add/", payload);

      if (response.data.success) {
        Alert.alert('Success', 'Product added to cart!');
      } else {
        setCartError(response.data.error || "Failed to add to cart");
        Alert.alert('Error', response.data.error || "Failed to add to cart");
      }
    } catch (err) {
      console.error(err);
      setCartError("An error occurred while adding to cart");
      Alert.alert('Error', 'An error occurred while adding to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleStartSwap = async () => {
    if (!product || !user?.id) {
      setSwapError("Please login to start a swap");
      Alert.alert('Login Required', 'Please login to start a swap');
      return;
    }

    if (hasVariants) {
      const allSelected = product.variants!.every(g => selectedOptions[g.id]);
      if (!allSelected) {
        setSwapError("Please select all variant options to swap");
        Alert.alert('Selection Required', 'Please select all variant options to swap');
        return;
      }

      if (!currentSKU) {
        setSwapError("Please select valid variant options to swap");
        Alert.alert('Invalid Selection', 'Please select valid variant options to swap');
        return;
      }

      if (!currentSKU.allow_swap) {
        setSwapError("This variant is not available for swap");
        Alert.alert('Not Available', 'This variant is not available for swap');
        return;
      }
    } else {
      if (!product.open_for_swap) {
        setSwapError("This product is not available for swap");
        Alert.alert('Not Available', 'This product is not available for swap');
        return;
      }
    }

    setStartingSwap(true);
    setSwapError(null);

    try {
      // For now, show coming soon message
      Alert.alert(
        'Coming Soon',
        'Swap functionality will be available soon!',
        [{ text: 'OK' }]
      );
    } catch (err: any) {
      console.error(err);
      setSwapError("An error occurred while initiating swap");
      Alert.alert('Error', 'An error occurred while initiating swap');
    } finally {
      setStartingSwap(false);
    }
  };

 const handleShare = async () => {
  try {
    const message = `Check out ${product?.name} on our app!\nPrice: ₱${displayPrice.toFixed(2)}`;
    
    // Simple alert for now
    Alert.alert(
      'Share Product',
      message,
      [
        { text: 'Copy to Clipboard', onPress: () => {
          // You can implement clipboard functionality later
          Alert.alert('Copied!', 'Product info copied to clipboard');
        }},
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  } catch (error) {
    console.error('Error sharing:', error);
    Alert.alert('Error', 'Failed to share product');
  }
};

  const toggleFavorite = async () => {
    // Implement favorite functionality
    setIsFavorite(!isFavorite);
    // You might want to make an API call here
  };

  const handleVisitShop = () => {
    if (product?.shop?.id) {
      // router.push(`/shop/${product.shop.id}`);
    }
  };

  const getMediaUrls = () => {
    if (!product) return [];
    
    const urls: string[] = [];
    
    // Add product images
    if (product.media_files) {
      product.media_files.forEach(img => {
        if (img.file_url) {
          const abs = ensureAbsoluteUrl(img.file_url);
          if (abs) urls.push(abs);
        }
      });
    }

    // Add SKU image if available
    if (currentSKU?.image) {
      const abs = ensureAbsoluteUrl(currentSKU.image);
      if (abs) urls.push(abs);
    }

    // Add variant option images
    if (product.variants) {
      product.variants.forEach(group => {
        group.options.forEach(option => {
          const abs = ensureAbsoluteUrl(option.image);
          if (abs && !urls.includes(abs)) {
            urls.push(abs);
          }
        });
      });
    }

    // Deduplicate and return
    const unique = Array.from(new Set(urls.filter(Boolean)));
    return unique.length > 0 ? unique : ['https://via.placeholder.com/400'];
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
        <CustomerLayout disableScroll>
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
        <CustomerLayout disableScroll>
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={64} color="#EF4444" />
            <Text style={styles.errorText}>Product not found</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={fetchProduct}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </CustomerLayout>
      </SafeAreaView>
    );
  }

  const mediaUrls = getMediaUrls();

  return (
    <SafeAreaView style={styles.container}>
      <CustomerLayout disableScroll>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Product Images */}
          <View style={styles.imageSection}>
            <TouchableOpacity 
              style={styles.mainImageContainer}
              onPress={() => setImageModalVisible(true)}
              activeOpacity={0.9}
            >
              <Image
                source={{ uri: mediaUrls[activeImage] || mediaUrls[0] }}
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
                    onPress={() => setActiveImage(prev => 
                      prev === 0 ? mediaUrls.length - 1 : prev - 1
                    )}
                  >
                    <Ionicons name="chevron-back" size={24} color="#FFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.navArrow, styles.rightArrow]}
                    onPress={() => setActiveImage(prev => 
                      prev === mediaUrls.length - 1 ? 0 : prev + 1
                    )}
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
                      activeImage === index && styles.thumbnailActive
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
              <Text style={styles.productName}>{product.name}</Text>
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

            {/* Rating and Sold */}
            <View style={styles.ratingRow}>
              <View style={styles.ratingContainer}>
                {renderStars(product.rating || 0)}
                <Text style={styles.ratingText}>{product.rating?.toFixed(1) || '0.0'}</Text>
                <Text style={styles.reviewCount}>({product.reviews_count || 0})</Text>
              </View>
              <Text style={styles.soldText}>{product.sold || 0} sold</Text>
            </View>

            {/* Price */}
            <View style={styles.priceContainer}>
              <Text style={styles.price}>₱{displayPrice.toFixed(2)}</Text>
              {displayComparePrice && displayComparePrice > displayPrice && (
                <Text style={styles.comparePrice}>₱{displayComparePrice.toFixed(2)}</Text>
              )}
            </View>

            {/* Stock */}
            <View style={styles.stockContainer}>
              <Text style={[
                styles.stockText,
                displayStock <= 0 && styles.outOfStock
              ]}>
                Stock: {displayStock} {displayStock <= 0 ? "(Out of Stock)" : ""}
              </Text>
              {selectedChoicesText ? (
                <Text style={styles.selectedVariantText}>
                  Selected: {selectedChoicesText}
                </Text>
              ) : null}
            </View>

            {/* Description */}
            <Text style={styles.description}>{product.description}</Text>
          </View>

          {/* Variants */}
          {hasVariants && product.variants && (
            <View style={styles.variantsSection}>
              <Text style={styles.sectionTitle}>Variants</Text>
              {product.variants.map((group, groupIndex) => (
                <View key={group.id} style={styles.variantGroup}>
                  <Text style={styles.variantGroupTitle}>{group.title}</Text>
                  <View style={styles.variantOptions}>
                    {group.options.map((opt) => {
                      const isSelected = selectedOptions[group.id] === opt.id;
                      const previousSelected = product.variants!
                        .slice(0, groupIndex)
                        .every((g) => !!selectedOptions[g.id]);
                      const availableSet = product.skus
                        ? getAvailableOptionIdsForGroup(product.skus, selectedOptions, group.id)
                        : new Set<string>();
                      const isAvailable = previousSelected && availableSet.has(String(opt.id));

                      return (
                        <TouchableOpacity
                          key={opt.id}
                          style={[
                            styles.variantOption,
                            isSelected && styles.variantOptionSelected,
                            !isAvailable && styles.variantOptionDisabled
                          ]}
                          onPress={() => handleSelectOption(group.id, opt.id)}
                          disabled={!isAvailable}
                        >
                          <Text style={[
                            styles.variantOptionText,
                            isSelected && styles.variantOptionTextSelected,
                            !isAvailable && styles.variantOptionTextDisabled
                          ]}>
                            {opt.title}
                          </Text>
                          {opt.price && (
                            <Text style={styles.variantOptionPrice}>{opt.price}</Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Quantity Selector */}
          <View style={styles.quantitySection}>
            <Text style={styles.sectionTitle}>Quantity</Text>
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
                style={[styles.quantityButton, quantity >= displayStock && styles.quantityButtonDisabled]}
                onPress={increaseQuantity}
                disabled={quantity >= displayStock}
              >
                <Ionicons name="add" size={20} color={quantity >= displayStock ? "#9CA3AF" : "#111827"} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Shop Information */}
          {product.shop && (
            <TouchableOpacity onPress={handleVisitShop} style={styles.shopSection}>
              <Text style={styles.sectionTitle}>Shop Information</Text>
              <View style={styles.shopInfo}>
                <Image
                  source={{ 
                    uri: ensureAbsoluteUrl(product.shop.shop_picture) || 'https://via.placeholder.com/60'
                  }}
                  style={styles.shopImage}
                />
                <View style={styles.shopDetails}>
                  <Text style={styles.shopName}>{product.shop.name || "Unknown Shop"}</Text>
                  {product.shop.address && (
                    <View style={styles.shopAddress}>
                      <Ionicons name="location-outline" size={14} color="#6B7280" />
                      <Text style={styles.shopAddressText} numberOfLines={1}>
                        {product.shop.address}
                      </Text>
                    </View>
                  )}
                  {product.shop.avg_rating !== undefined && (
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
          )}

          {/* Product Details */}
          <View style={styles.detailsSection}>
            <Text style={styles.sectionTitle}>Product Details</Text>
            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>SKU Code</Text>
                <Text style={styles.detailValue}>
                  {hasVariants 
                    ? (currentSKU?.sku_code || "No SKU Code") 
                    : "Standard Product"}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Price</Text>
                <Text style={styles.detailPrice}>₱{displayPrice.toFixed(2)}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Stock</Text>
                <Text style={styles.detailValue}>{displayStock} units</Text>
              </View>
              
              {/* Physical Properties */}
              {(currentSKU?.length || product.length) && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Dimensions</Text>
                  <Text style={styles.detailValue}>
                    {hasVariants
                      ? `${currentSKU?.length || '-'} × ${currentSKU?.width || '-'} × ${currentSKU?.height || '-'} cm`
                      : `${product.length || '-'} × ${product.width || '-'} × ${product.height || '-'} cm`
                    }
                  </Text>
                </View>
              )}
              
              {(currentSKU?.weight || product.weight) && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Weight</Text>
                  <Text style={styles.detailValue}>
                    {hasVariants
                      ? `${currentSKU?.weight || '-'} ${currentSKU?.weight_unit || 'kg'}`
                      : `${product.weight || '-'} ${product.weight_unit || 'kg'}`
                    }
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Swap Options */}
          {isAvailableForSwap && (
            <View style={styles.swapSection}>
              <Text style={styles.sectionTitle}>Swap Options</Text>
              <View style={styles.swapInfo}>
                <View style={styles.swapType}>
                  <MaterialCommunityIcons 
                    name="swap-horizontal" 
                    size={20} 
                    color="#059669" 
                  />
                  <Text style={styles.swapTypeText}>
                    {hasVariants
                      ? currentSKU?.swap_type?.replace('_', ' ')
                      : product.swap_type?.replace('_', ' ')
                    }
                  </Text>
                </View>
                
                {(hasVariants ? currentSKU?.swap_description : product.swap_description) && (
                  <Text style={styles.swapDescription}>
                    {hasVariants ? currentSKU?.swap_description : product.swap_description}
                  </Text>
                )}
                
                {(hasVariants ? currentSKU?.accepted_categories : product.accepted_categories)?.length > 0 && (
                  <View style={styles.acceptedCategories}>
                    <Text style={styles.categoriesLabel}>Accepted Categories:</Text>
                    <View style={styles.categoryTags}>
                      {(hasVariants ? currentSKU?.accepted_categories : product.accepted_categories)?.map((cat) => (
                        <View key={cat.id} style={styles.categoryTag}>
                          <Text style={styles.categoryTagText}>{cat.name}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Fixed Action Bar */}
        <View style={styles.actionBar}>
          <View style={styles.priceSummary}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalPrice}>₱{(displayPrice * quantity).toFixed(2)}</Text>
          </View>
          <View style={styles.actionButtonsContainer}>
            {/* Swap Button */}
            {isAvailableForSwap && displayStock > 0 && (
              <TouchableOpacity
                style={[styles.actionButton, styles.swapButton]}
                onPress={handleStartSwap}
                disabled={startingSwap}
              >
                {startingSwap ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="swap-horizontal" size={18} color="#FFF" />
                    <Text style={styles.swapButtonText}>Swap</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            
            {/* Add to Cart Button */}
            <TouchableOpacity
              style={[styles.actionButton, styles.cartButton]}
              onPress={handleAddToCart}
              disabled={addingToCart || displayStock <= 0}
            >
              {addingToCart ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Ionicons name="cart-outline" size={18} color="#FFF" />
                  <Text style={styles.cartButtonText}>
                    {displayStock <= 0 ? "Out of Stock" : "Add to Cart"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            
            {/* Buy Now Button */}
            <TouchableOpacity
              style={[styles.actionButton, styles.buyButton]}
              onPress={handleAddToCart} // You might want a separate buy now function
              disabled={displayStock <= 0}
            >
              <Text style={styles.buyButtonText}>
                {displayStock <= 0 ? "Out of Stock" : "Buy Now"}
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
              onMomentumScrollEnd={(event) => {
                const index = Math.round(
                  event.nativeEvent.contentOffset.x / SCREEN_WIDTH
                );
                setActiveImage(index);
              }}
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
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#374151',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#F97316',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  imageSection: {
    backgroundColor: '#F9FAFB',
  },
  mainImageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    backgroundColor: '#F3F4F6',
    position: 'relative',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  imageCounter: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  imageCounterText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  navArrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
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
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailActive: {
    borderColor: '#F97316',
  },
  productInfo: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  productName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    marginRight: 12,
  },
  actionButtons: {
    flexDirection: 'row',
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  reviewCount: {
    marginLeft: 4,
    fontSize: 14,
    color: '#6B7280',
  },
  soldText: {
    fontSize: 14,
    color: '#6B7280',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  price: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F97316',
  },
  comparePrice: {
    fontSize: 18,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
    marginLeft: 12,
  },
  stockContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  stockText: {
    fontSize: 14,
    color: '#374151',
  },
  outOfStock: {
    color: '#EF4444',
  },
  selectedVariantText: {
    fontSize: 12,
    color: '#6B7280',
    flexShrink: 1,
    textAlign: 'right',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: '#4B5563',
  },
  variantsSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  variantGroup: {
    marginBottom: 20,
  },
  variantGroupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  variantOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  variantOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    margin: 4,
    minWidth: 80,
    alignItems: 'center',
  },
  variantOptionSelected: {
    borderColor: '#F97316',
    backgroundColor: '#FFF7ED',
  },
  variantOptionDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  variantOptionText: {
    fontSize: 14,
    color: '#374151',
  },
  variantOptionTextSelected: {
    color: '#F97316',
    fontWeight: '600',
  },
  variantOptionTextDisabled: {
    color: '#9CA3AF',
  },
  variantOptionPrice: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  quantitySection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 8,
    alignSelf: 'flex-start',
  },
  quantityButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quantityButtonDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#F3F4F6',
  },
  quantityText: {
    width: 60,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  shopSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  shopInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
  },
  shopImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E5E7EB',
  },
  shopDetails: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  shopName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  shopAddress: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  shopAddressText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
    flex: 1,
  },
  shopRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shopRatingText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  detailsSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  detailItem: {
    width: '50%',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  detailPrice: {
    fontSize: 16,
    color: '#F97316',
    fontWeight: '700',
  },
  swapSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  swapInfo: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
  },
  swapType: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  swapTypeText: {
    fontSize: 14,
    color: '#065F46',
    fontWeight: '600',
    marginLeft: 8,
    textTransform: 'capitalize',
  },
  swapDescription: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  acceptedCategories: {
    marginTop: 8,
  },
  categoriesLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    marginBottom: 8,
  },
  categoryTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  categoryTag: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    margin: 4,
  },
  categoryTagText: {
    fontSize: 12,
    color: '#065F46',
    fontWeight: '500',
  },
  actionBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  priceSummary: {
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  totalPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  swapButton: {
    backgroundColor: '#059669',
    flex: 0.8,
  },
  swapButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  cartButton: {
    backgroundColor: '#F97316',
    flex: 1.2,
  },
  cartButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  buyButton: {
    backgroundColor: '#DC2626',
    flex: 1,
  },
  buyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  modalHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 44 : 16,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
  },
  modalImageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  modalFooter: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 34 : 16,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  modalImageCounter: {
    color: '#FFFFFF',
    fontSize: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
});