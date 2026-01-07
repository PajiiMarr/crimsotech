import { useAuth } from '@/contexts/AuthContext';
import { addFavorite, checkFavorite, getProductReviews, removeFavorite } from '@/utils/api';
import { API_CONFIG } from '@/utils/config';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { width } = Dimensions.get('window');

interface Review {
  id: string;
  user_name: string;
  rating: number;
  comment: string;
  created_at: string;
  images?: string[];
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  condition: string;
  quantity: number;
  category: string;
  images?: string[];
  media_files?: Array<{ file_data: string; file_type: string }>;
  length?: number;
  width?: number;
  height?: number;
  weight?: number;
  unit?: string;
  shop?: {
    id: string;
    name: string;
    barangay: string;
    city: string;
    province: string;
  };
  customer?: {
    id?: string;
    username: string;
  };
  rating?: number;
  review_count?: number;
}

export default function ProductDetailScreen() {
  const { addToCart, user } = useAuth();
  const userId = useMemo(() => {
    if (!user) return null;
    return (user as any).user_id || (user as any).id || null;
  }, [user]);
  const { productId } = useLocalSearchParams<{ productId: string }>();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  useEffect(() => {
    if (productId) {
      fetchProductDetails();
      fetchReviews();
    }
  }, [productId]);

  useEffect(() => {
    if (userId && productId) {
      checkIfFavorite();
    }
  }, [userId, productId]);

  const checkIfFavorite = async () => {
    if (!userId || !productId) return;
    try {
      const response = await checkFavorite(userId, productId);
      setIsFavorite(response.is_favorite);
    } catch (error) {
      console.error('Failed to check favorite status:', error);
    }
  };

  const handleToggleFavorite = async () => {
    if (!userId) {
      Alert.alert('Login Required', 'Please log in to save favorites', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log In', onPress: () => router.push('/(auth)/login') },
      ]);
      return;
    }

    if (!productId) return;

    setFavoriteLoading(true);
    try {
      if (isFavorite) {
        await removeFavorite(userId, productId);
        setIsFavorite(false);
      } else {
        await addFavorite(userId, productId);
        setIsFavorite(true);
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      Alert.alert('Error', 'Failed to update favorites');
    } finally {
      setFavoriteLoading(false);
    }
  };

  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      console.log('Fetching product with ID:', productId);
      
      const url = `${API_CONFIG.BASE_URL}/api/public-products/${productId}/`;
      console.log('Fetch URL:', url);
      
      const response = await fetch(url);

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('Fetch result:', result);
      
      // Map media files to full URLs
      const images = result.media_files?.map((media: any) => {
        const path = media.file_data || media.url || '';
        if (path.startsWith('http')) return path;
        return `${API_CONFIG.BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
      }) || [];

      setProduct({
        ...result,
        images,
        price: parseFloat(result.price) || 0,
      });
    } catch (error: any) {
      console.error('Error fetching product:', error);
      console.error('Error message:', error.message);
      Alert.alert('Error', `Failed to load product: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    if (!productId) return;
    try {
      const response = await getProductReviews(productId);
      if (response.success) {
        const mappedReviews: Review[] = response.reviews.map((r: any) => ({
          id: r.id,
          user_name: r.customer_name || 'Anonymous',
          rating: r.rating,
          comment: r.comment || '',
          created_at: r.created_at,
        }));
        setReviews(mappedReviews);
      }
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
      setReviews([]);
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;
    try {
      await addToCart(String(product.id), quantity);
      Alert.alert('Added to Cart', 'After you place your order at checkout, the seller or shop owner will review and approve it. You will see "Pending approval" until it is accepted.', [
        { text: 'Continue Shopping', style: 'cancel' },
        { text: 'View Cart', onPress: () => router.push('/pages/cart') },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to add to cart');
    }
  };

  const handleBuyNow = async () => {
    if (!product) return;
    try {
      // Add to cart in backend for consistency, then go straight to checkout for this product
      await addToCart(product.id as any, quantity as any);
    } catch (e) {
      // Non-blocking; still allow proceeding to checkout
      console.warn('Buy Now addToCart failed, proceeding anyway');
    }
    router.push({ pathname: '/pages/checkout', params: { productId: String(product.id), qty: String(quantity) } });
  };

  const renderStars = (rating: number, size: number = 16, color: string = '#FFC107') => {
    return (
      <View style={{ flexDirection: 'row', gap: 2 }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <MaterialIcons
            key={star}
            name={star <= rating ? 'star' : 'star-border'}
            size={size}
            color={color}
          />
        ))}
      </View>
    );
  };

  const renderReviewItem = ({ item }: { item: Review }) => (
    <View style={styles.reviewItem}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewUserInfo}>
          <View style={styles.reviewAvatar}>
            <MaterialIcons name="person" size={20} color="#666" />
          </View>
          <View>
            <Text style={styles.reviewUserName}>{item.user_name}</Text>
            <Text style={styles.reviewDate}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
        {renderStars(item.rating, 14)}
      </View>
      <Text style={styles.reviewComment}>{item.comment}</Text>
      {item.images && item.images.length > 0 && (
        <ScrollView horizontal style={styles.reviewImagesContainer}>
          {item.images.map((img, idx) => (
            <Image key={idx} source={{ uri: img }} style={styles.reviewImage} />
          ))}
        </ScrollView>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Product Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ff6d0b" />
        </View>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Product Not Found</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color="#ccc" />
          <Text style={styles.errorText}>Product not found</Text>
        </View>
      </View>
    );
  }

  const avgRating = reviews.length > 0 
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
    : 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Product Details</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.favoriteButton} 
            onPress={handleToggleFavorite}
            disabled={favoriteLoading}
          >
            <MaterialIcons 
              name={isFavorite ? "favorite" : "favorite-border"} 
              size={24} 
              color={isFavorite ? "#E91E63" : "#333"} 
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareButton}>
            <MaterialIcons name="share" size={24} color="#333" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image Gallery */}
        <View style={styles.imageGallery}>
          {product.images && product.images.length > 0 ? (
            <>
              <Image
                source={{ uri: product.images[selectedImageIndex] }}
                style={styles.mainImage}
                resizeMode="contain"
              />
              <View style={styles.imagePagination}>
                <Text style={styles.imageCount}>
                  {selectedImageIndex + 1}/{product.images.length}
                </Text>
              </View>
              {product.images.length > 1 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.imageThumbnails}
                >
                  {product.images.map((img, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => setSelectedImageIndex(idx)}
                      style={[
                        styles.thumbnail,
                        selectedImageIndex === idx && styles.thumbnailActive,
                      ]}
                    >
                      <Image source={{ uri: img }} style={styles.thumbnailImage} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </>
          ) : (
            <View style={styles.noImageContainer}>
              <MaterialIcons name="image-not-supported" size={64} color="#ccc" />
              <Text style={styles.noImageText}>No images available</Text>
            </View>
          )}
        </View>

        {/* Product Info */}
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{product.name}</Text>
          
          {/* Rating */}
          <View style={styles.ratingContainer}>
            {renderStars(Math.round(avgRating), 18)}
            <Text style={styles.ratingText}>
              {avgRating.toFixed(1)} ({reviews.length} reviews)
            </Text>
          </View>

          {/* Price */}
          <View style={styles.priceContainer}>
            <Text style={styles.price}>₱{product.price.toLocaleString()}</Text>
          </View>

          {/* Description */}
          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{product.description}</Text>
          </View>

          {/* Product Details - Required & Optional */}
          <View style={styles.detailsSection}>
            <Text style={styles.sectionTitle}>Product Details</Text>
            
            {/* Condition - Required */}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Condition</Text>
              <Text style={styles.detailValue}>{product.condition}</Text>
            </View>

            {/* Category - Required */}
            {product.category && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Category</Text>
                <Text style={styles.detailValue}>{product.category}</Text>
              </View>
            )}

            {/* Dimensions - Optional, only show if filled */}
            {(product.length || product.width || product.height || product.weight) && (
              <>
                <View style={styles.dimensionsDivider} />
                <Text style={styles.dimensionsTitle}>Dimensions</Text>
                {product.length && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Length</Text>
                    <Text style={styles.detailValue}>{product.length} cm</Text>
                  </View>
                )}
                {product.width && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Width</Text>
                    <Text style={styles.detailValue}>{product.width} cm</Text>
                  </View>
                )}
                {product.height && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Height</Text>
                    <Text style={styles.detailValue}>{product.height} cm</Text>
                  </View>
                )}
                {product.weight && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Weight</Text>
                    <Text style={styles.detailValue}>{product.weight} {product.unit || 'kg'}</Text>
                  </View>
                )}
              </>
            )}
          </View>

          {/* Quantity Selector */}
          <View style={styles.quantitySection}>
            <Text style={styles.sectionTitle}>Quantity</Text>
            <View style={styles.quantitySelector}>
              <TouchableOpacity
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
                style={styles.quantityButton}
              >
                <MaterialIcons name="remove" size={20} color="#333" />
              </TouchableOpacity>
              <Text style={styles.quantityText}>{quantity}</Text>
              <TouchableOpacity
                onPress={() => setQuantity(Math.min(product.quantity, quantity + 1))}
                style={styles.quantityButton}
              >
                <MaterialIcons name="add" size={20} color="#333" />
              </TouchableOpacity>
            </View>
            <Text style={styles.stockText}>{product.quantity} available</Text>
          </View>
        </View>

        {/* Seller Info */}
        {(product.shop || product.customer) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Seller Information</Text>
            {product.shop ? (
              <TouchableOpacity
                style={styles.sellerCard}
                onPress={() => router.push(`/shop/${product.shop?.id}`)}
              >
                <View style={styles.sellerInfo}>
                  <View style={styles.sellerIcon}>
                    <MaterialIcons name="store" size={24} color="#ff6d0b" />
                  </View>
                  <View style={styles.sellerDetails}>
                    <Text style={styles.sellerName}>{product.shop.name}</Text>
                    <Text style={styles.sellerLocation}>
                      {product.shop.barangay}, {product.shop.city}
                    </Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={24} color="#999" />
              </TouchableOpacity>
            ) : (
              <View style={styles.sellerCard}>
                <View style={styles.sellerInfo}>
                  <View style={styles.sellerIcon}>
                    <MaterialIcons name="person" size={24} color="#ff6d0b" />
                  </View>
                  <View style={styles.sellerDetails}>
                    <Text style={styles.sellerName}>{product.customer?.username || 'Personal Seller'}</Text>
                    <Text style={styles.sellerLocation}>
                      Personal Listing
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Reviews Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Reviews ({reviews.length})
          </Text>

          {reviews.length > 0 ? (
            <FlatList
              data={reviews}
              renderItem={renderReviewItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.noReviews}>
              <MaterialIcons name="rate-review" size={48} color="#ccc" />
              <Text style={styles.noReviewsText}>No reviews yet</Text>
              <Text style={styles.noReviewsSubtext}>Be the first to review this product</Text>
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity style={styles.addToCartButton} onPress={handleAddToCart}>
          <MaterialIcons name="shopping-cart" size={20} color="#ff6d0b" />
          <Text style={styles.addToCartText}>Add to Cart</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.buyNowButton} onPress={handleBuyNow}>
          <Text style={styles.buyNowText}>Buy Now</Text>
        </TouchableOpacity>
      </View>
    </View>
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
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  favoriteButton: {
    padding: 8,
  },
  shareButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  imageGallery: {
    backgroundColor: '#fff',
    paddingBottom: 16,
  },
  mainImage: {
    width: width,
    height: width,
    backgroundColor: '#f5f5f5',
  },
  imagePagination: {
    position: 'absolute',
    bottom: 70,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  imageCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  imageThumbnails: {
    paddingHorizontal: 16,
    marginTop: 12,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  thumbnailActive: {
    borderColor: '#ff6d0b',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  noImageContainer: {
    width: width,
    height: width,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  noImageText: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
  },
  productInfo: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 8,
  },
  productName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  price: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ff6d0b',
  },
  descriptionSection: {
    marginTop: 16,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  detailsSection: {
    marginTop: 16,
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
  },
  dimensionsDivider: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginVertical: 12,
  },
  dimensionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    marginVertical: 8,
  },
  conditionBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  conditionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
  },
  quantitySection: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    minWidth: 40,
    textAlign: 'center',
  },
  stockText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  dimensionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sellerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sellerDetails: {
    flex: 1,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
  },
  sellerLocation: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  writeReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  writeReviewText: {
    fontSize: 14,
    color: '#ff6d0b',
    fontWeight: '600',
  },
  reviewItem: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
  },
  reviewDate: {
    fontSize: 12,
    color: '#999',
  },
  reviewComment: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  reviewImagesContainer: {
    marginTop: 8,
  },
  reviewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
  },
  noReviews: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noReviewsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
  },
  noReviewsSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  bottomActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  addToCartButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ff6d0b',
    backgroundColor: '#fff',
  },
  addToCartText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ff6d0b',
  },
  buyNowButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#ff6d0b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyNowText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212529',
  },
  ratingSelector: {
    marginBottom: 20,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12,
  },
  starButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  commentSection: {
    marginBottom: 20,
  },
  commentLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#212529',
    minHeight: 120,
  },
  submitButton: {
    backgroundColor: '#ff6d0b',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
