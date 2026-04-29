// app/customer/rate.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  TextInput,
  Platform,
  StatusBar,
  Modal,
  FlatList,
} from 'react-native';
import {
  MaterialIcons,
  Ionicons
} from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import AxiosInstance from '../../contexts/axios';
import * as ImagePicker from 'expo-image-picker';

// ================================
// Interfaces
// ================================
interface ProductImage {
  id: string;
  url: string;
  file_type: string;
}

interface OrderItem {
  checkout_id: string;
  product_id: string;
  product_name: string;
  product_description?: string;
  variant_title?: string;
  quantity: number;
  price: string;
  primary_image?: ProductImage;
  product_images?: ProductImage[];
  can_review?: boolean;
}

interface RiderInfo {
  id: string;
  rider_id: string;
  name: string;
  vehicle_type?: string;
  plate_number?: string;
}

interface ReviewMedia {
  id: string;
  file_url: string;
  file_type: string;
  uploaded_at: string;
}

interface ReviewData {
  id: string;
  condition_rating: number;
  accuracy_rating: number;
  value_rating: number;
  delivery_rating: number;
  comment: string;
  created_at: string;
  media?: ReviewMedia[];
}

interface SelectedMedia {
  uri: string;
  type: 'image' | 'video';
  name: string;
}

// ================================
// RatingStars Component - Mobile Optimized
// ================================
function RatingStars({ 
  rating, 
  onRate,
  size = "lg",
  readonly = false
}: { 
  rating: number; 
  onRate?: (rating: number) => void;
  size?: "sm" | "md" | "lg";
  readonly?: boolean;
}) {
  const sizeMap = {
    sm: 24,
    md: 32,
    lg: 40
  };
  
  const iconSize = sizeMap[size];

  return (
    <View style={styles.ratingContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => !readonly && onRate?.(star)}
          disabled={readonly}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="star"
            size={iconSize}
            color={star <= rating ? '#F59E0B' : '#D1D5DB'}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ================================
// CriteriaCard Component - Mobile Optimized
// ================================
function CriteriaCard({
  title,
  description,
  rating,
  onRate,
  icon,
  readonly = false
}: {
  title: string;
  description: string;
  rating: number;
  onRate?: (rating: number) => void;
  icon: keyof typeof MaterialIcons.glyphMap;
  readonly?: boolean;
}) {
  return (
    <View style={styles.criteriaCard}>
      <View style={styles.criteriaHeader}>
        <View style={styles.criteriaIconContainer}>
          <MaterialIcons name={icon} size={20} color="#6B7280" />
        </View>
        <View style={styles.criteriaTextContainer}>
          <Text style={styles.criteriaTitle}>{title}</Text>
          <Text style={styles.criteriaDescription}>{description}</Text>
        </View>
      </View>
      <RatingStars rating={rating} onRate={onRate} size="lg" readonly={readonly} />
    </View>
  );
}

// ================================
// MediaItem Component
// ================================
function MediaItem({ media, onRemove, readonly }: { media: SelectedMedia | ReviewMedia; onRemove?: () => void; readonly?: boolean }) {
  const getMediaUrl = (media: SelectedMedia | ReviewMedia): string => {
    if ('file_url' in media) {
      return media.file_url;
    }
    return media.uri;
  };

  const getMediaType = (media: SelectedMedia | ReviewMedia): string => {
    if ('file_type' in media) {
      return media.file_type;
    }
    return media.type;
  };

  const isVideo = getMediaType(media) === 'video';
  const mediaUrl = getMediaUrl(media);

  return (
    <View style={styles.mediaItem}>
      {isVideo ? (
        <View style={styles.videoPreview}>
          <View style={styles.mediaPlaceholder}>
            <Ionicons name="videocam" size={32} color="#6B7280" />
          </View>
          <View style={styles.videoBadge}>
            <Ionicons name="play-circle" size={20} color="#FFFFFF" />
          </View>
        </View>
      ) : (
        <Image source={{ uri: mediaUrl }} style={styles.mediaImage} />
      )}
      {!readonly && onRemove && (
        <TouchableOpacity style={styles.removeMediaButton} onPress={onRemove}>
          <Ionicons name="close-circle" size={24} color="#EF4444" />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ================================
// MediaPicker Component
// ================================
function MediaPicker({ onMediaSelected, existingMedia = [], readonly = false }: { 
  onMediaSelected?: (media: SelectedMedia[]) => void;
  existingMedia?: ReviewMedia[];
  readonly?: boolean;
}) {
  const [mediaItems, setMediaItems] = useState<SelectedMedia[]>([]);
  const [showMediaOptions, setShowMediaOptions] = useState(false);
  

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to upload images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const newMedia: SelectedMedia = {
        uri: result.assets[0].uri,
        type: 'image',
        name: result.assets[0].fileName || `image_${Date.now()}.jpg`,
      };
      const updatedMedia = [...mediaItems, newMedia];
      setMediaItems(updatedMedia);
      onMediaSelected?.(updatedMedia);
    }
    setShowMediaOptions(false);
  };

  const pickVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to upload videos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const newMedia: SelectedMedia = {
        uri: result.assets[0].uri,
        type: 'video',
        name: result.assets[0].fileName || `video_${Date.now()}.mp4`,
      };
      const updatedMedia = [...mediaItems, newMedia];
      setMediaItems(updatedMedia);
      onMediaSelected?.(updatedMedia);
    }
    setShowMediaOptions(false);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera permissions to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const newMedia: SelectedMedia = {
        uri: result.assets[0].uri,
        type: 'image',
        name: `photo_${Date.now()}.jpg`,
      };
      const updatedMedia = [...mediaItems, newMedia];
      setMediaItems(updatedMedia);
      onMediaSelected?.(updatedMedia);
    }
    setShowMediaOptions(false);
  };

  const removeMedia = (index: number) => {
    const updatedMedia = mediaItems.filter((_, i) => i !== index);
    setMediaItems(updatedMedia);
    onMediaSelected?.(updatedMedia);
  };

  if (readonly) {
    return (
      <View style={styles.existingMediaContainer}>
        <Text style={styles.reviewSectionTitle}>Review Media</Text>
        <FlatList
          data={existingMedia}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => <MediaItem media={item} readonly />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.mediaList}
          ListEmptyComponent={
            <Text style={styles.noMediaText}>No media attached</Text>
          }
        />
      </View>
    );
  }

  return (
    <>
      <View style={styles.mediaSection}>
        <Text style={styles.sectionTitle}>Add Photos or Videos (Optional)</Text>
        <TouchableOpacity 
          style={styles.addMediaButton}
          onPress={() => setShowMediaOptions(true)}
        >
          <Ionicons name="add-circle-outline" size={24} color="#10B981" />
          <Text style={styles.addMediaText}>Add photos or videos</Text>
        </TouchableOpacity>
        
        {mediaItems.length > 0 && (
          <FlatList
            data={mediaItems}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item, index }) => (
              <MediaItem media={item} onRemove={() => removeMedia(index)} />
            )}
            keyExtractor={(item, index) => index.toString()}
            contentContainerStyle={styles.mediaList}
          />
        )}
      </View>

      <Modal
        visible={showMediaOptions}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMediaOptions(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMediaOptions(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Media</Text>
            <TouchableOpacity style={styles.modalOption} onPress={takePhoto}>
              <Ionicons name="camera" size={24} color="#3B82F6" />
              <Text style={styles.modalOptionText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOption} onPress={pickImage}>
              <Ionicons name="images" size={24} color="#10B981" />
              <Text style={styles.modalOptionText}>Choose from Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOption} onPress={pickVideo}>
              <Ionicons name="videocam" size={24} color="#F59E0B" />
              <Text style={styles.modalOptionText}>Choose Video</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowMediaOptions(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

// ================================
// ViewReviewCard Component - Mobile Optimized with Media
// ================================
function ViewReviewCard({ review }: { review: ReviewData }) {
  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewHeaderLeft}>
          <View style={styles.checkIconContainer}>
            <MaterialIcons name="check-circle" size={20} color="#10B981" />
          </View>
          <Text style={styles.reviewTitle}>You've already reviewed this order</Text>
        </View>
        <View style={styles.reviewBadge}>
          <Text style={styles.reviewBadgeText}>
            {new Date(review.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>

      <View style={styles.reviewContent}>
        {/* Product Ratings */}
        <View style={styles.reviewSection}>
          <Text style={styles.reviewSectionTitle}>Your Product Ratings</Text>
          <View style={styles.ratingsGrid}>
            <View style={styles.ratingItem}>
              <Text style={styles.ratingLabel}>Condition</Text>
              <RatingStars rating={review.condition_rating} size="sm" readonly />
            </View>
            <View style={styles.ratingItem}>
              <Text style={styles.ratingLabel}>Accuracy</Text>
              <RatingStars rating={review.accuracy_rating} size="sm" readonly />
            </View>
            <View style={styles.ratingItem}>
              <Text style={styles.ratingLabel}>Value</Text>
              <RatingStars rating={review.value_rating} size="sm" readonly />
            </View>
            <View style={styles.ratingItem}>
              <Text style={styles.ratingLabel}>Delivery</Text>
              <RatingStars rating={review.delivery_rating} size="sm" readonly />
            </View>
          </View>
        </View>

        {/* Comment */}
        {review.comment && (
          <View style={styles.reviewCommentSection}>
            <Text style={styles.reviewSectionTitle}>Your Comment</Text>
            <View style={styles.commentBox}>
              <Text style={styles.commentText}>"{review.comment}"</Text>
            </View>
          </View>
        )}

        {/* Media */}
        {review.media && review.media.length > 0 && (
          <MediaPicker existingMedia={review.media} readonly />
        )}
      </View>
    </View>
  );
}

// ================================
// Main Component
// ================================
export default function RatePage() {
  const { userId, user } = useAuth();
  const params = useLocalSearchParams();
  const orderId = params.orderId as string;
  const productId = params.productId as string;
  const productName = params.productName as string;
  const variantTitleParam = params.variantTitle as string | undefined;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [currentItem, setCurrentItem] = useState<OrderItem | null>(null);
  const [riderInfo, setRiderInfo] = useState<RiderInfo | null>(null);
  const [existingReview, setExistingReview] = useState<ReviewData | null>(null);
  const [existingReviewMedia, setExistingReviewMedia] = useState<ReviewMedia[]>([]);
  const [isEditingReview, setIsEditingReview] = useState(false);
  const [isPickupOrder, setIsPickupOrder] = useState(false);

  // Product ratings
  const [conditionRating, setConditionRating] = useState(0);
  const [accuracyRating, setAccuracyRating] = useState(0);
  const [valueRating, setValueRating] = useState(0);

  // Rider rating (delivery_rating) - only for delivery orders
  const [deliveryRating, setDeliveryRating] = useState(0);

  // Comments
  const [comment, setComment] = useState('');

  // Media
  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia[]>([]);
  const [deletedMediaIds, setDeletedMediaIds] = useState<string[]>([]);

  // Review status
  const [hasReviewed, setHasReviewed] = useState(false);

  // Check if product ratings are complete
  const productRated = conditionRating > 0 && accuracyRating > 0 && valueRating > 0;
  
  // For delivery orders, need rider rating; for pickup orders, only product ratings needed
  const allRated = isPickupOrder ? productRated : (productRated && deliveryRating > 0);

  // ================================
  // Fetch Functions
  // ================================
  const fetchOrderDetails = async () => {
    try {
      setError(null);
      
      // Fetch order details to get product info
      const orderResponse = await AxiosInstance.get(`/purchases-buyer/${orderId}/view-order/`, {
        headers: {
          'X-User-Id': userId
        }
      });
      
      if (orderResponse.data) {
        // Find the specific product in the order
        const product = orderResponse.data.items?.find(
          (item: OrderItem) => item.product_id === productId
        );
        if (product) {
          setCurrentItem({
            ...product,
            variant_title: product.variant_title || variantTitleParam || undefined,
          });
        }
        
        // Check if this is a pickup order
        const deliveryMethod = orderResponse.data.shipping_info?.delivery_method || '';
        const isPickup = deliveryMethod.toLowerCase().includes('pickup');
        setIsPickupOrder(isPickup);
      }
      
      // Fetch rider info only for delivery orders (not pickup)
      if (!isPickupOrder) {
        try {
          const riderResponse = await AxiosInstance.get(`/purchases-buyer/${orderId}/get-rider-info/`, {
            headers: {
              'X-User-Id': userId
            }
          });
          
          if (riderResponse.data?.success && riderResponse.data?.riders?.length > 0) {
            const rider = riderResponse.data.riders[0];
            setRiderInfo({
              id: rider.id,
              rider_id: rider.rider_id,
              name: rider.user ? `${rider.user.first_name || ''} ${rider.user.last_name || ''}`.trim() : 'Rider',
              vehicle_type: 'Motorcycle',
              plate_number: 'N/A'
            });
          }
        } catch (riderErr) {
          console.log("No rider info available for this delivery order");
        }
      }

      // Check existing reviews
      await checkExistingReviews();
      
    } catch (err) {
      console.error("Error fetching order details:", err);
      setError("Failed to load order details");
    } finally {
      setLoading(false);
    }
  };

  const checkExistingReviews = async () => {
    try {
      // Check if this product has been reviewed
      const reviewResponse = await AxiosInstance.get('/reviews/', {
        params: {
          product_id: productId,
          customer_id: userId
        },
        headers: {
          'X-User-Id': userId
        }
      });
      
      if (reviewResponse.data?.data?.reviews?.length > 0) {
        const review = reviewResponse.data.data.reviews[0];
        setHasReviewed(true);
        setExistingReview({
          id: review.id,
          condition_rating: review.condition_rating || 0,
          accuracy_rating: review.accuracy_rating || 0,
          value_rating: review.value_rating || 0,
          delivery_rating: review.delivery_rating || 0,
          comment: review.comment || '',
          created_at: review.created_at,
          media: review.media || []
        });
        setExistingReviewMedia(review.media || []);
      } else {
        setHasReviewed(false);
        setExistingReview(null);
        setExistingReviewMedia([]);
      }
      
    } catch (err) {
      console.error("Error checking reviews:", err);
      setHasReviewed(false);
      setExistingReview(null);
      setExistingReviewMedia([]);
    }
  };

  // ================================
  // Submit Function with Media Upload
  // ================================
  const handleSubmitReview = async () => {
    // Validate based on order type
    if (!hasReviewed && !productRated) {
      setError("Please rate all product criteria: Condition, Accuracy, and Value");
      return;
    }
    
    // For delivery orders, validate rider rating
    if (!isPickupOrder && !hasReviewed && deliveryRating === 0) {
      setError("Please rate the delivery experience");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Create form data for multipart upload
      const formData = new FormData();
      formData.append('customer_id', userId || '');
      formData.append('product_id', productId);
      formData.append('condition_rating', conditionRating.toString());
      formData.append('accuracy_rating', accuracyRating.toString());
      formData.append('value_rating', valueRating.toString());
      formData.append('comment', comment);
      
      // Add rider rating only for delivery orders
      if (!isPickupOrder && riderInfo?.rider_id) {
        formData.append('rider_id', riderInfo.rider_id);
        formData.append('delivery_rating', deliveryRating.toString());
      }

      // Append media files
      for (let i = 0; i < selectedMedia.length; i++) {
        const media = selectedMedia[i];
        const uriParts = media.uri.split('.');
        const fileExtension = uriParts[uriParts.length - 1];
        
        formData.append('media', {
          uri: media.uri,
          name: media.name,
          type: media.type === 'image' ? `image/${fileExtension}` : `video/${fileExtension}`,
        } as any);
      }

      // Append deleted media IDs for edit operations
      if (isEditingReview && deletedMediaIds.length > 0) {
        formData.append('deleted_media_ids', JSON.stringify(deletedMediaIds));
      }

      console.log("=== SUBMITTING REVIEW ===");
      console.log("customer_id:", userId);
      console.log("product_id:", productId);
      console.log("condition_rating:", conditionRating);
      console.log("accuracy_rating:", accuracyRating);
      console.log("value_rating:", valueRating);
      console.log("comment:", comment);
      console.log("delivery_rating:", deliveryRating);
      console.log("rider_id:", riderInfo?.rider_id);
      console.log("selectedMedia count:", selectedMedia.length);
      console.log("deletedMediaIds:", deletedMediaIds);
      console.log("FormData entries:");
      for (let pair of (formData as any)._parts) {
        console.log(pair[0], pair[1]);
      }

      console.log("Submitting review with media:", selectedMedia.length);

      let response;
      if (isEditingReview && existingReview?.id) {
        response = await AxiosInstance.put(`/reviews/${existingReview.id}/`, formData, {
          headers: {
            'X-User-Id': userId,
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        response = await AxiosInstance.post('/reviews/', formData, {
          headers: {
            'X-User-Id': userId,
            'Content-Type': 'multipart/form-data',
          },
        });
      }

      if (response.data?.status === 'success') {
        setSubmitted(true);
        
        setTimeout(() => {
          router.push('/customer/purchases');
        }, 2000);
      } else {
        setError(response.data?.message || "Failed to submit review");
      }

    } catch (err: any) {
      console.error("Error submitting review:", err);
      if (err.response) {
        const errorMsg = err.response.data?.message || 
                         err.response.data?.error || 
                         JSON.stringify(err.response.data);
        setError(errorMsg);
      } else {
        setError(err.message || "Failed to submit review");
      }
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (orderId && productId) {
      fetchOrderDetails();
    }
  }, [orderId, productId]);

  // ================================
  // Render Functions
  // ================================
  if (loading) {
    return (
      <View style={styles.fullScreenContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Loading order details...</Text>
        </View>
      </View>
    );
  }

  if (submitted) {
    return (
      <View style={styles.fullScreenContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.successContainer}>
          <View style={styles.successIconContainer}>
            <MaterialIcons name="check-circle" size={64} color="#10B981" />
          </View>
          <Text style={styles.successTitle}>Thank You!</Text>
          <Text style={styles.successText}>Your review has been submitted successfully.</Text>
          <Text style={styles.redirectText}>Redirecting to purchases page...</Text>
        </View>
      </View>
    );
  }

  const imageUrl = currentItem?.primary_image?.url 
    ? (currentItem.primary_image.url.startsWith('http') 
        ? currentItem.primary_image.url 
        : `${AxiosInstance.defaults.baseURL}${currentItem.primary_image.url}`)
    : null;

  return (
    <View style={styles.fullScreenContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Edge-to-Edge Header */}
      <View style={styles.edgeHeader}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.edgeBackButton}
        >
          <MaterialIcons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <View style={styles.edgeHeaderTextContainer}>
          <Text style={styles.edgeHeaderTitle}>Rate Your Experience</Text>
          <Text style={styles.edgeHeaderSubtitle}>
            Order #{orderId?.slice(0,8)} • {currentItem?.product_name || 'Product'}
            {isPickupOrder && <Text style={styles.pickupBadge}> (Pickup)</Text>}
          </Text>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error" size={20} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Show existing review if already reviewed */}
        {hasReviewed && existingReview && !isEditingReview ? (
          <>
            <ViewReviewCard review={existingReview} />
            <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
              <TouchableOpacity
                style={{
                  backgroundColor: '#F97316',
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
                onPress={() => {
                  // Prefill form with existing review values and enter edit mode
                  setConditionRating(existingReview.condition_rating || 0);
                  setAccuracyRating(existingReview.accuracy_rating || 0);
                  setValueRating(existingReview.value_rating || 0);
                  setDeliveryRating(existingReview.delivery_rating || 0);
                  setComment(existingReview.comment || '');
                  setSelectedMedia([]);
                  setDeletedMediaIds([]);
                  setIsEditingReview(true);
                }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Edit Review</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            {/* Product Review Card */}
            <View style={styles.productCard}>
              <View style={styles.productHeader}>
                <View style={styles.productImageContainer}>
                  {imageUrl ? (
                    <Image 
                      source={{ uri: imageUrl }} 
                      style={styles.productImage}
                    />
                  ) : (
                    <View style={styles.productImagePlaceholder}>
                      <MaterialIcons name="inventory" size={32} color="#9CA3AF" />
                    </View>
                  )}
                </View>
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{currentItem?.product_name || 'Product'}</Text>
                  <Text style={styles.productDetails}>
                    Qty: {currentItem?.quantity || 1}
                    {currentItem?.variant_title && ` • ${currentItem.variant_title}`}
                  </Text>
                </View>
              </View>

              {/* Comment */}
              <View style={styles.commentSection}>
                <Text style={styles.commentLabel}>Your Comments</Text>
                <TextInput
                  style={styles.commentInput}
                  value={comment}
                  onChangeText={setComment}
                  placeholder="Share your thoughts about the product and delivery experience..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              {/* Product Ratings Section */}
              <View style={styles.ratingsSection}>
                <Text style={styles.sectionTitle}>Rate the Product</Text>
                <View style={styles.criteriaGrid}>
                  <CriteriaCard
                    title="Condition"
                    description="Material quality"
                    rating={conditionRating}
                    onRate={setConditionRating}
                    icon="shield"
                  />
                  <CriteriaCard
                    title="Accuracy"
                    description="Matches description"
                    rating={accuracyRating}
                    onRate={setAccuracyRating}
                    icon="straighten"
                  />
                  <CriteriaCard
                    title="Value"
                    description="Worth the price"
                    rating={valueRating}
                    onRate={setValueRating}
                    icon="inventory"
                  />
                </View>
              </View>

              {/* Rider Ratings Section - Only for delivery orders */}
              {!isPickupOrder && riderInfo && (
                <View style={styles.ratingsSection}>
                  <View style={styles.riderHeader}>
                    <MaterialIcons name="person" size={20} color="#6B7280" />
                    <Text style={styles.sectionTitle}>Rate the Rider: {riderInfo.name}</Text>
                  </View>
                  <View style={styles.criteriaGrid}>
                    <CriteriaCard
                      title="Delivery Experience"
                      description="Professionalism & handling"
                      rating={deliveryRating}
                      onRate={setDeliveryRating}
                      icon="local-shipping"
                    />
                  </View>
                </View>
              )}

              {/* Media Section - Unified display for all media in edit mode */}
              {isEditingReview && (
                <View style={styles.mediaSection}>
                  <Text style={styles.sectionTitle}>Review Media</Text>
                  
                  {/* Display existing media with delete buttons */}
                  {existingReviewMedia.length > 0 && (
                    <View>
                      <Text style={styles.subSectionTitle}>Existing Media</Text>
                      <FlatList
                        data={existingReviewMedia}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        renderItem={({ item }) => (
                          <View style={styles.mediaItemContainer}>
                            <MediaItem media={item} readonly={true} />
                            <TouchableOpacity
                              style={styles.deleteMediaButton}
                              onPress={() => {
                                setDeletedMediaIds([...deletedMediaIds, item.id]);
                                setExistingReviewMedia(existingReviewMedia.filter(m => m.id !== item.id));
                              }}
                            >
                              <Ionicons name="close" size={18} color="#FFFFFF" />
                            </TouchableOpacity>
                          </View>
                        )}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.mediaList}
                      />
                    </View>
                  )}

                  {/* Display newly added media with delete buttons */}
                  {selectedMedia.length > 0 && (
                    <View style={{ marginTop: 12 }}>
                      <Text style={styles.subSectionTitle}>New Media</Text>
                      <FlatList
                        data={selectedMedia}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        renderItem={({ item, index }) => (
                          <View style={styles.mediaItemContainer}>
                            <MediaItem media={item} readonly={true} />
                            <TouchableOpacity
                              style={styles.deleteMediaButton}
                              onPress={() => {
                                setSelectedMedia(selectedMedia.filter((_, i) => i !== index));
                              }}
                            >
                              <Ionicons name="close" size={18} color="#FFFFFF" />
                            </TouchableOpacity>
                          </View>
                        )}
                        keyExtractor={(_, index) => index.toString()}
                        contentContainerStyle={styles.mediaList}
                      />
                    </View>
                  )}
                </View>
              )}

              {/* Media Picker - shown in both edit and normal modes */}
              <MediaPicker 
                onMediaSelected={setSelectedMedia} 
                existingMedia={[]}
                readonly={false}
              />


            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => router.back()}
                disabled={submitting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (submitting || !allRated) && styles.submitButtonDisabled
                ]}
                onPress={handleSubmitReview}
                disabled={submitting || !allRated}
              >
                {submitting ? (
                  <View style={styles.submittingContainer}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.submitButtonText}> Submitting...</Text>
                  </View>
                ) : (
                  <Text style={styles.submitButtonText}>Submit Review</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
        
        {/* Bottom padding for safe area */}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

// ================================
// Styles
// ================================
const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
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
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  successIconContainer: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  successText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  redirectText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  edgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  edgeBackButton: {
    padding: 8,
    marginRight: 8,
  },
  edgeHeaderTextContainer: {
    flex: 1,
  },
  edgeHeaderTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  edgeHeaderSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  pickupBadge: {
    color: '#F97316',
    fontWeight: '500',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    marginLeft: 8,
    flex: 1,
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  productHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  productImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
    marginRight: 12,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  productDetails: {
    fontSize: 14,
    color: '#6B7280',
  },
  ratingsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 12,
  },
  riderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  criteriaGrid: {
    gap: 12,
  },
  criteriaCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  criteriaHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  criteriaIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  criteriaTextContainer: {
    flex: 1,
  },
  criteriaTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 2,
  },
  criteriaDescription: {
    fontSize: 12,
    color: '#6B7280',
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  commentSection: {
    marginTop: 8,
  },
  commentLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  commentInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  submitButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#10B981',
  },
  submitButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  submittingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  reviewHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkIconContainer: {
    marginRight: 8,
  },
  reviewTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#10B981',
    flex: 1,
  },
  reviewBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  reviewBadgeText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#10B981',
  },
  reviewContent: {
    gap: 16,
  },
  reviewSection: {
    marginBottom: 8,
  },
  reviewSectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 12,
  },
  ratingsGrid: {
    gap: 12,
  },
  ratingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  ratingLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  reviewCommentSection: {
    marginTop: 8,
  },
  commentBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  commentText: {
    fontSize: 14,
    color: '#4B5563',
    fontStyle: 'italic',
  },
  bottomPadding: {
    height: Platform.OS === 'ios' ? 20 : 10,
  },
  // Media styles
  mediaSection: {
    marginBottom: 16,
  },
  addMediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    marginBottom: 12,
    gap: 8,
  },
  addMediaText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#10B981',
  },
  mediaList: {
    gap: 8,
    paddingVertical: 8,
  },
  mediaItem: {
    position: 'relative',
    marginRight: 8,
  },
  mediaImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  mediaPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPreview: {
    position: 'relative',
  },
  videoBadge: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -10 }, { translateY: -10 }],
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: 4,
  },
  removeMediaButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  existingMediaContainer: {
    marginTop: 8,
  },
  noMediaText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#374151',
  },
  modalCancel: {
    marginTop: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  mediaItemContainer: {
    position: 'relative',
    marginRight: 12,
  },
  deleteMediaButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    marginTop: 8,
    textTransform: 'uppercase',
  },
});