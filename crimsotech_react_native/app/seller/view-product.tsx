// app/seller/view-product.tsx
import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Dimensions,
  Modal,
} from 'react-native';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import AxiosInstance from '../../contexts/axios';

const { width } = Dimensions.get('window');

// Interfaces
interface Variant {
  id: string;
  title: string;
  option_title: string | null;
  sku_code: string | null;
  price: string | null;
  compare_price: string | null;
  quantity: number;
  length: string | null;
  width: string | null;
  height: string | null;
  dimension_unit: string;
  value_added_tax: string;
  value_added_tax_amount: string;
  price_with_vat: string | null;
  weight: string | null;
  weight_unit: string;
  critical_trigger: number | null;
  critical_stock: number | null;
  is_active: boolean;
  is_refundable: boolean;
  refund_days: number;
  allow_swap: boolean;
  swap_type: string;
  swap_description: string | null;
  original_price: string | null;
  usage_period: number | null;
  usage_unit: string | null;
  depreciation_rate: number | null;
  minimum_additional_payment: string;
  maximum_additional_payment: string;
  image: string | null;
  proof_image: string | null;
  created_at: string;
  updated_at: string;
}

interface Media {
  id: string;
  file_data: string;
  file_type: string;
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  customer: {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
  } | null;
  created_at: string;
  updated_at: string;
}

interface Shop {
  id: string;
  name: string;
  shop_picture: string | null;
  verified: boolean;
  city: string;
  barangay: string;
  street: string;
  contact_number: string;
  total_sales: string;
  created_at: string;
  is_suspended: boolean;
}

interface Category {
  id: string;
  name: string;
}

interface VariantStats {
  total_variants: number;
  active_variants: number;
  total_stock: number;
  min_price: string | null;
  max_price: string | null;
  low_stock_variants: number;
  out_of_stock_variants: number;
}

interface Product {
  id: string;
  name: string;
  description: string;
  quantity: number;
  price_range: {
    min: string | null;
    max: string | null;
  };
  upload_status: string;
  status: string;
  condition: number;
  is_refundable: boolean;
  refund_days: number;
  created_at: string;
  updated_at: string;
  is_removed: boolean;
  removal_reason: string | null;
  removed_at: string | null;
  active_report_count: number;
  favorites_count: number;
  average_rating: number;
  total_reviews: number;
  shop: Shop | null;
  customer: {
    id: string;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    contact_number: string;
    product_limit: number;
    current_product_count: number;
  } | null;
  category: Category | null;
  category_admin: Category | null;
  media: Media[];
  variants: Variant[];
  reviews: Review[];
  variant_stats: VariantStats;
  reports: {
    active: number;
    resolved: number;
    total: number;
    active_reports: any[];
  };
}

export default function SellerViewProduct() {
  const router = useRouter();
  const { productId, shopId } = useLocalSearchParams<{ productId: string; shopId: string }>();
  const { userId } = useAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    variants: false,
    reviews: false,
  });

  useEffect(() => {
    if (productId && userId) {
      fetchProduct();
    }
  }, [productId, userId]);

  const fetchProduct = async () => {
    if (!productId || !userId) return;

    try {
      console.log('Fetching product:', productId);
      console.log('User ID:', userId);
      
      const response = await AxiosInstance.get(
        `/seller-products/${productId}/get_product/`,
        {
          params: { user_id: userId },
        }
      );

      console.log('Product response:', response.data);

      if (response.data.success) {
        setProduct(response.data.product);
      } else {
        Alert.alert('Error', response.data.error || 'Failed to load product');
        router.back();
      }
    } catch (error: any) {
      console.error('Error fetching product:', error);
      console.error('Error response:', error.response?.data);
      
      let errorMessage = 'Failed to load product';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to view this product';
      } else if (error.response?.status === 404) {
        errorMessage = 'Product not found';
      }
      
      Alert.alert('Error', errorMessage);
      router.back();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchProduct();
  };

  const getProductImages = (): string[] => {
    const images: string[] = [];
    if (product?.media && product.media.length > 0) {
      images.push(...product.media.map(m => m.file_data));
    }
    if (product?.variants && product.variants.length > 0) {
      for (const variant of product.variants) {
        if (variant.image && !images.includes(variant.image)) {
          images.push(variant.image);
        }
      }
    }
    return images;
  };

  const formatCurrency = (amount: string | number | null) => {
    if (!amount) return '₱0.00';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `₱${num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getConditionLabel = (condition: number) => {
    switch (condition) {
      case 1: return { label: 'Poor', color: '#EF4444' };
      case 2: return { label: 'Fair', color: '#F59E0B' };
      case 3: return { label: 'Good', color: '#3B82F6' };
      case 4: return { label: 'Very Good', color: '#8B5CF6' };
      case 5: return { label: 'Like New', color: '#10B981' };
      default: return { label: 'Unknown', color: '#6B7280' };
    }
  };

  const getStatusBadge = () => {
    if (!product) return null;
    
    if (product.is_removed) {
      return { label: 'Removed', color: '#EF4444', bg: '#FEE2E2' };
    }
    
    switch (product.upload_status) {
      case 'published':
        return { label: 'Published', color: '#22C55E', bg: '#E6F7E6' };
      case 'draft':
        return { label: 'Draft', color: '#6B7280', bg: '#F3F4F6' };
      case 'archived':
        return { label: 'Archived', color: '#F59E0B', bg: '#FEF3C7' };
      default:
        return { label: product.upload_status || 'Unknown', color: '#6B7280', bg: '#F3F4F6' };
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Ionicons key={`star-${i}`} name="star" size={14} color="#F59E0B" />);
    }
    if (hasHalfStar) {
      stars.push(<Ionicons key="half-star" name="star-half" size={14} color="#F59E0B" />);
    }
    const emptyStars = 5 - stars.length;
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Ionicons key={`empty-${i}`} name="star-outline" size={14} color="#D1D5DB" />);
    }
    return stars;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading product details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>Product Not Found</Text>
          <Text style={styles.errorText}>Unable to load product details</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const badge = getStatusBadge();
  const conditionInfo = getConditionLabel(product.condition);
  const productImages = getProductImages();
  const variantStats = product.variant_stats;
  const priceRange = product.price_range;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButtonHeader}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Product Details</Text>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => router.push(`/seller/components/seller-edit-product?productId=${product.id}&shopId=${shopId}&product=${encodeURIComponent(JSON.stringify(product))}`)}
        >
          <MaterialIcons name="edit" size={22} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3B82F6']} />
        }
      >
        {/* Image Gallery */}
        {productImages.length > 0 && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.imageGallery}
            contentContainerStyle={styles.imageGalleryContent}
          >
            {productImages.map((image, index) => (
              <TouchableOpacity 
                key={index} 
                onPress={() => {
                  setSelectedImage(image);
                  setPreviewVisible(true);
                }}
              >
                <Image source={{ uri: image }} style={styles.galleryImage} resizeMode="cover" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {productImages.length === 0 && (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="image-outline" size={64} color="#CBD5E1" />
            <Text style={styles.imagePlaceholderText}>No Images</Text>
          </View>
        )}

        <View style={styles.content}>
          {/* Status and Basic Info */}
          <View style={styles.statusBar}>
            <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.statusText, { color: badge.color }]}>{badge.label}</Text>
            </View>
            <View style={[styles.conditionBadge, { backgroundColor: `${conditionInfo.color}10` }]}>
              <Text style={[styles.conditionText, { color: conditionInfo.color }]}>
                {conditionInfo.label}
              </Text>
            </View>
          </View>

          {/* Product Name */}
          <Text style={styles.productName}>{product.name}</Text>

          {/* Price Range */}
          <View style={styles.priceSection}>
            <Text style={styles.priceLabel}>Price Range</Text>
            <View style={styles.priceRange}>
              {priceRange.min && (
                <Text style={styles.priceValue}>
                  {formatCurrency(priceRange.min)} - {formatCurrency(priceRange.max)}
                </Text>
              )}
              {!priceRange.min && (
                <Text style={styles.priceValue}>No price set</Text>
              )}
            </View>
          </View>

          {/* Stats Cards */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <MaterialIcons name="inventory" size={20} color="#6B7280" />
              <Text style={styles.statValue}>{variantStats.total_stock}</Text>
              <Text style={styles.statLabel}>Total Stock</Text>
            </View>
            <View style={styles.statCard}>
              <MaterialIcons name="style" size={20} color="#6B7280" />
              <Text style={styles.statValue}>{variantStats.active_variants}</Text>
              <Text style={styles.statLabel}>Active Variants</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="star" size={20} color="#6B7280" />
              <Text style={styles.statValue}>{product.average_rating.toFixed(1)}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="heart" size={20} color="#6B7280" />
              <Text style={styles.statValue}>{product.favorites_count}</Text>
              <Text style={styles.statLabel}>Favorites</Text>
            </View>
          </View>

          {/* Description */}
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Description</Text>
            <Text style={styles.descriptionText}>{product.description}</Text>
          </View>

          {/* Return Policy */}
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Return Policy</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Refundable</Text>
              <Text style={[styles.infoValue, { color: product.is_refundable ? '#22C55E' : '#EF4444' }]}>
                {product.is_refundable ? 'Yes' : 'No'}
              </Text>
            </View>
            {product.is_refundable && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Refund Period</Text>
                <Text style={styles.infoValue}>{product.refund_days} days</Text>
              </View>
            )}
          </View>

          {/* Category */}
          {product.category_admin && (
            <View style={styles.infoCard}>
              <Text style={styles.cardTitle}>Category</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Global Category</Text>
                <Text style={styles.infoValue}>{product.category_admin.name}</Text>
              </View>
            </View>
          )}

          {/* Shop Info */}
          {product.shop && (
            <View style={styles.infoCard}>
              <Text style={styles.cardTitle}>Shop Information</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Shop Name</Text>
                <Text style={styles.infoValue}>{product.shop.name}</Text>
              </View>
              {product.shop.contact_number && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Contact</Text>
                  <Text style={styles.infoValue}>{product.shop.contact_number}</Text>
                </View>
              )}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Address</Text>
                <Text style={styles.infoValue}>
                  {[product.shop.street, product.shop.barangay, product.shop.city]
                    .filter(Boolean)
                    .join(', ')}
                </Text>
              </View>
            </View>
          )}

          {/* Variants Section */}
          {product.variants && product.variants.length > 0 && (
            <View style={styles.infoCard}>
              <TouchableOpacity 
                style={styles.sectionHeader}
                onPress={() => setExpandedSections(prev => ({ ...prev, variants: !prev.variants }))}
              >
                <Text style={styles.cardTitle}>Variants ({product.variants.length})</Text>
                <Ionicons 
                  name={expandedSections.variants ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color="#6B7280" 
                />
              </TouchableOpacity>

              {expandedSections.variants && (
                <View>
                  {product.variants.map((variant, index) => (
                    <View key={variant.id} style={styles.variantItem}>
                      <View style={styles.variantHeader}>
                        <Text style={styles.variantTitle}>
                          {variant.title || `Variant ${index + 1}`}
                        </Text>
                        <View style={[
                          styles.variantStatusBadge,
                          { backgroundColor: variant.is_active ? '#E6F7E6' : '#F3F4F6' }
                        ]}>
                          <Text style={[
                            styles.variantStatusText,
                            { color: variant.is_active ? '#22C55E' : '#6B7280' }
                          ]}>
                            {variant.is_active ? 'Active' : 'Inactive'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.variantDetails}>
                        <View style={styles.variantPriceRow}>
                          <Text style={styles.variantPrice}>{formatCurrency(variant.price)}</Text>
                          {variant.compare_price && (
                            <Text style={styles.variantComparePrice}>
                              {formatCurrency(variant.compare_price)}
                            </Text>
                          )}
                        </View>
                        <View style={styles.variantMetaRow}>
                          <Text style={styles.variantStock}>Stock: {variant.quantity}</Text>
                          {variant.sku_code && (
                            <Text style={styles.variantSku}>SKU: {variant.sku_code}</Text>
                          )}
                        </View>
                        {(variant.length || variant.width || variant.height) && (
                          <Text style={styles.variantDimensions}>
                            Dimensions: {variant.length || 0} × {variant.width || 0} × {variant.height || 0} {variant.dimension_unit}
                          </Text>
                        )}
                        {variant.weight && (
                          <Text style={styles.variantWeight}>
                            Weight: {variant.weight} {variant.weight_unit}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {!expandedSections.variants && (
                <View style={styles.variantSummary}>
                  <Text style={styles.variantSummaryText}>
                    {variantStats.active_variants} active variants • {variantStats.total_stock} total stock
                  </Text>
                  <Text style={styles.variantSummarySubtext}>
                    Price: {formatCurrency(variantStats.min_price)} - {formatCurrency(variantStats.max_price)}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Reviews Section */}
          {product.reviews && product.reviews.length > 0 && (
            <View style={styles.infoCard}>
              <TouchableOpacity 
                style={styles.sectionHeader}
                onPress={() => setExpandedSections(prev => ({ ...prev, reviews: !prev.reviews }))}
              >
                <Text style={styles.cardTitle}>Reviews ({product.total_reviews})</Text>
                <Ionicons 
                  name={expandedSections.reviews ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color="#6B7280" 
                />
              </TouchableOpacity>

              {expandedSections.reviews && (
                <View>
                  {product.reviews.map((review) => (
                    <View key={review.id} style={styles.reviewItem}>
                      <View style={styles.reviewHeader}>
                        <View style={styles.reviewUser}>
                          <Text style={styles.reviewUserName}>
                            {review.customer?.first_name} {review.customer?.last_name}
                          </Text>
                          <View style={styles.reviewStars}>
                            {renderStars(review.rating)}
                          </View>
                        </View>
                        <Text style={styles.reviewDate}>{formatDate(review.created_at)}</Text>
                      </View>
                      {review.comment && (
                        <Text style={styles.reviewComment}>{review.comment}</Text>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {!expandedSections.reviews && (
                <View style={styles.reviewSummary}>
                  <View style={styles.reviewSummaryStars}>
                    {renderStars(product.average_rating)}
                    <Text style={styles.reviewSummaryText}>
                      {product.average_rating.toFixed(1)} out of 5
                    </Text>
                  </View>
                  <Text style={styles.reviewSummaryCount}>
                    Based on {product.total_reviews} reviews
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Date Info */}
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Product Timeline</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Created</Text>
              <Text style={styles.infoValue}>{formatDate(product.created_at)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Last Updated</Text>
              <Text style={styles.infoValue}>{formatDate(product.updated_at)}</Text>
            </View>
          </View>

          {/* Removal Reason */}
          {product.is_removed && product.removal_reason && (
            <View style={[styles.infoCard, styles.removedCard]}>
              <Text style={[styles.cardTitle, { color: '#EF4444' }]}>Removal Information</Text>
              <Text style={styles.removalReasonText}>{product.removal_reason}</Text>
              {product.removed_at && (
                <Text style={styles.removalDateText}>
                  Removed on: {formatDate(product.removed_at)}
                </Text>
              )}
            </View>
          )}

          {/* Spacing for bottom */}
          <View style={styles.bottomSpacing} />
        </View>
      </ScrollView>

      {/* Image Preview Modal */}
      <Modal
        visible={previewVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPreviewVisible(false)}
      >
        <View style={styles.previewOverlay}>
          <TouchableOpacity style={styles.previewClose} onPress={() => setPreviewVisible(false)}>
            <Ionicons name="close" size={30} color="#FFFFFF" />
          </TouchableOpacity>
          {selectedImage && (
            <Image source={{ uri: selectedImage }} style={styles.previewImage} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButtonHeader: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  editButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  imageGallery: {
    backgroundColor: '#FFFFFF',
  },
  imageGalleryContent: {
    padding: 16,
    gap: 12,
  },
  galleryImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  imagePlaceholder: {
    backgroundColor: '#FFFFFF',
    padding: 40,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  imagePlaceholderText: {
    marginTop: 12,
    fontSize: 14,
    color: '#9CA3AF',
  },
  content: {
    padding: 16,
  },
  statusBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  conditionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  conditionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  productName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  priceSection: {
    marginBottom: 16,
  },
  priceLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  priceRange: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F97316',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 6,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    flex: 1,
    textAlign: 'right',
    marginLeft: 12,
  },
  descriptionText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  variantItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  variantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  variantTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  variantStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  variantStatusText: {
    fontSize: 10,
    fontWeight: '500',
  },
  variantDetails: {
    gap: 6,
  },
  variantPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  variantPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F97316',
  },
  variantComparePrice: {
    fontSize: 13,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  variantMetaRow: {
    flexDirection: 'row',
    gap: 16,
  },
  variantStock: {
    fontSize: 13,
    color: '#6B7280',
  },
  variantSku: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  variantDimensions: {
    fontSize: 12,
    color: '#6B7280',
  },
  variantWeight: {
    fontSize: 12,
    color: '#6B7280',
  },
  variantSummary: {
    paddingTop: 8,
  },
  variantSummaryText: {
    fontSize: 13,
    color: '#6B7280',
  },
  variantSummarySubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  reviewItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  reviewUser: {
    flex: 1,
  },
  reviewUserName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  reviewStars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewDate: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  reviewComment: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
  reviewSummary: {
    alignItems: 'center',
    paddingTop: 8,
  },
  reviewSummaryStars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  reviewSummaryText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#111827',
  },
  reviewSummaryCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  removedCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
  },
  removalReasonText: {
    fontSize: 14,
    color: '#991B1B',
    marginBottom: 8,
  },
  removalDateText: {
    fontSize: 12,
    color: '#7F1D1D',
  },
  bottomSpacing: {
    height: 40,
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  previewImage: {
    width: width - 40,
    height: width - 40,
  },
});