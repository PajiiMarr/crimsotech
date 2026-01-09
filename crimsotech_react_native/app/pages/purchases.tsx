import { useAuth } from '@/contexts/AuthContext';
import { submitReview } from '@/utils/api';
import { getOrders } from '@/utils/cartApi';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Platform
} from 'react-native';

const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;

type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'completed' | 'cancelled';
type FilterType = 'all' | 'unpaid' | 'to_ship' | 'shipped' | 'to_review' | 'returns' | 'cancelled';

type OrderItem = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  itemStatus?: string;
  remarks?: string;
  isReviewed?: boolean;
};

type Order = {
  id: string;
  orderId: string;
  date: string;
  total: number;
  status: OrderStatus;
  items: OrderItem[];
  store?: string;
  location?: string;
};

export default function PurchasesScreen() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewItem, setReviewItem] = useState<{ orderId: string; checkoutId: string; productId: string; productName: string } | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const loadOrders = async () => {
    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const userId = (user as any).user_id || (user as any).id;
      const resp = await getOrders(userId);
      if (resp.success && resp.orders) {
        const mapped: Order[] = resp.orders.map((o: any) => ({
          id: o.order_id,
          orderId: o.order_id,
          date: new Date(o.created_at).toLocaleDateString('en-US', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          }),
          total: parseFloat(o.total_amount) || 0,
          status: (o.status || 'pending') as OrderStatus,
          store: o.store_name || 'Default Store',
          location: o.store_location || 'Unknown Location',
          items: (o.items || []).map((it: any) => ({
            id: it.id,
            productId: it.product_id || '',
            productName: it.product_name,
            quantity: it.quantity,
            price: parseFloat(it.price) || 0,
            itemStatus: it.item_status || 'pending',
            remarks: it.remarks || '',
            isReviewed: it.is_reviewed || false,
          })),
        }));
        setOrders(mapped);
      } else {
        setOrders([]);
      }
    } catch (e) {
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
  };

  const statusFilters = [
    { key: 'all', label: 'All Purchases' },
    { key: 'unpaid', label: 'Pending' },
    { key: 'to_ship', label: 'To Ship' },
    { key: 'shipped', label: 'To Receive' },
    { key: 'to_review', label: 'Completed' },
    { key: 'returns', label: 'Return & Refund' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  const getFilteredOrders = () => {
    let filtered = orders;
    
    // Apply status filter
    switch (activeFilter) {
      case 'unpaid':
        filtered = filtered.filter(o => o.status === 'pending');
        break;
      case 'to_ship':
        filtered = filtered.filter(o => o.status === 'processing');
        break;
      case 'shipped':
        filtered = filtered.filter(o => o.status === 'shipped');
        break;
      case 'to_review':
        filtered = filtered.filter(o => 
          (o.status === 'delivered' || o.status === 'completed') && 
          o.items.some(item => !item.isReviewed)
        );
        break;
      case 'returns':
        filtered = filtered.filter(o => o.status === 'cancelled');
        break;
      case 'cancelled':
        filtered = filtered.filter(o => o.status === 'cancelled');
        break;
      case 'all':
      default:
        break;
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(order => 
        order.orderId.toLowerCase().includes(query) ||
        order.items.some(item => 
          item.productName.toLowerCase().includes(query)
        ) ||
        order.store?.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  const filteredOrders = getFilteredOrders();

  // Group orders by store
  const ordersByStore = filteredOrders.reduce((acc, order) => {
    const store = order.store || 'Default Store';
    if (!acc[store]) {
      acc[store] = [];
    }
    acc[store].push(order);
    return acc;
  }, {} as Record<string, Order[]>);

  const handleOpenReviewModal = (orderId: string, checkoutId: string, productId: string, productName: string) => {
    setReviewItem({ orderId, checkoutId, productId, productName });
    setReviewRating(5);
    setReviewComment('');
    setShowReviewModal(true);
  };

  const handleSubmitReview = async () => {
    if (!user || !reviewItem) return;
    
    try {
      const userId = (user as any).user_id || (user as any).id;
      await submitReview({
        customer_id: userId,
        product_id: reviewItem.productId,
        order_id: reviewItem.orderId,
        checkout_id: reviewItem.checkoutId,
        rating: reviewRating,
        comment: reviewComment,
      });
      
      Alert.alert('Success', 'Review submitted successfully!');
      setShowReviewModal(false);
      setReviewItem(null);
      await loadOrders();
    } catch (error) {
      Alert.alert('Error', 'Failed to submit review. Please try again.');
      console.error('Review submission error:', error);
    }
  };

  const formatPrice = (price: number) => {
    return `₱${price.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getStatusLabel = (status: OrderStatus | string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'processing': return 'To Ship';
      case 'shipped': return 'To Receive';
      case 'delivered':
      case 'completed':
        return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: {
        const s = String(status);
        return s.charAt(0).toUpperCase() + s.slice(1);
      }
    }
  };

  const navigateToOrderDetails = (order: Order) => {
    router.push({
      pathname: '/purchase-details',
      params: {
        id: order.id,
        orderId: order.orderId,
        date: order.date,
        total: order.total.toString(),
        status: order.status,
        store: order.store || '',
        location: order.location || '',
        items: JSON.stringify(order.items),
      },
    } as any);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Purchases</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
          contentContainerStyle={styles.filtersContainer}
        >
          {statusFilters.map((filter, index) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterTab,
                activeFilter === filter.key && styles.activeFilterTab,
              ]}
              onPress={() => setActiveFilter(filter.key as FilterType)}
            >
              <Text
                style={[
                  styles.filterText,
                  activeFilter === filter.key && styles.activeFilterText,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <MaterialIcons name="search" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search purchases..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        <View style={styles.divider} />

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#FF6B35" />
            <Text style={styles.emptySubtitle}>Loading orders</Text>
          </View>
        ) : filteredOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="shopping-bag" size={60} color="#E0E0E0" />
            <Text style={styles.emptyTitle}>No Orders Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? 'Try a different search term' : 'Your order history will appear here'}
            </Text>
            {searchQuery && (
              <TouchableOpacity
                style={styles.browseButton}
                onPress={() => setSearchQuery('')}
              >
                <Text style={styles.browseButtonText}>Clear Search</Text>
              </TouchableOpacity>
            )}
            {!searchQuery && (
              <TouchableOpacity
                style={styles.browseButton}
                onPress={() => router.push('/main/home')}
              >
                <Text style={styles.browseButtonText}>Browse Products</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.purchasesContainer}>
            {Object.entries(ordersByStore).map(([store, storeOrders]) => (
              <View key={store} style={styles.storeSection}>
                <View style={styles.storeHeader}>
                  <View style={styles.storeTitleContainer}>
                    <MaterialIcons name="location-on" size={18} color="#FF6B35" />
                    <Text style={styles.storeTitle}>{store}</Text>
                  </View>
                </View>

                {storeOrders.map((order) => (
                  <TouchableOpacity 
                    key={order.id} 
                    style={styles.purchaseItem}
                    onPress={() => navigateToOrderDetails(order)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.itemRow}>
                      <View style={styles.itemDetails}>
                        <Text style={styles.itemName}>
                          Order #{order.orderId.slice(0, 8).toUpperCase()}
                        </Text>
                        <Text style={styles.itemVariation}>
                          {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                        </Text>
                        <View style={styles.itemLocation}>
                          <MaterialIcons name="location-on" size={12} color="#666" />
                          <Text style={styles.locationText}>{order.location || 'Unknown Location'}</Text>
                        </View>
                      </View>
                      
                      {/* BLACK AND WHITE STATUS BADGE */}
                      <View style={styles.statusBadge}>
                        <Text style={styles.statusText}>
                          {getStatusLabel(order.status)}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.bottomRow}>
                      <Text style={styles.itemDate}>{order.date}</Text>
                      
                      <View style={styles.bottomRight}>
                        <Text style={styles.priceText}>{formatPrice(order.total)}</Text>
                        
                        <TouchableOpacity 
                          style={styles.viewDetailsButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            navigateToOrderDetails(order);
                          }}
                        >
                          <Text style={styles.viewDetailsText}>View Details</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Quick Review Buttons for Completed Orders */}
                    {(order.status === 'delivered' || order.status === 'completed') && (
                      <View style={styles.reviewSection}>
                        {order.items.filter(item => !item.isReviewed).map((item) => (
                          <TouchableOpacity
                            key={item.id}
                            style={styles.reviewButton}
                            onPress={(e) => {
                              e.stopPropagation();
                              handleOpenReviewModal(order.orderId, item.id, item.productId, item.productName);
                            }}
                          >
                            <Text style={styles.reviewButtonText}>Rate: {item.productName}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            ))}
            
            <View style={styles.bottomSpacing} />
          </View>
        )}
      </ScrollView>
      
      {/* Review Modal */}
      <Modal
        visible={showReviewModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReviewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Rate Product</Text>
              <TouchableOpacity onPress={() => setShowReviewModal(false)}>
                <MaterialIcons name="close" size={24} color="#6C757D" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalProductName}>{reviewItem?.productName}</Text>
            
            <View style={styles.ratingContainer}>
              <Text style={styles.ratingLabel}>Rating</Text>
              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setReviewRating(star)}
                  >
                    <MaterialIcons
                      name={star <= reviewRating ? 'star' : 'star-border'}
                      size={36}
                      color="#FFA726"
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <View style={styles.commentContainer}>
              <Text style={styles.commentLabel}>Comment (optional)</Text>
              <TextInput
                style={styles.commentInput}
                placeholder="Share your experience..."
                multiline
                numberOfLines={4}
                value={reviewComment}
                onChangeText={setReviewComment}
                textAlignVertical="top"
              />
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowReviewModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitReviewButton}
                onPress={handleSubmitReview}
              >
                <Text style={styles.submitReviewButtonText}>Submit Review</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    flex: 1,
  },
  headerSpacer: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  filtersScroll: {
    backgroundColor: '#fff',
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  activeFilterTab: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  filterText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  activeFilterText: {
    color: '#fff',
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#000',
  },
  divider: {
    height: 8,
    backgroundColor: '#f5f5f5',
  },
  purchasesContainer: {
    padding: 16,
    backgroundColor: '#fff',
  },
  storeSection: {
    marginBottom: 24,
  },
  storeHeader: {
    marginBottom: 12,
  },
  storeTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  storeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  purchaseItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  itemVariation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  itemLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  itemDate: {
    fontSize: 14,
    color: '#666',
  },
  bottomRight: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  viewDetailsButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    minWidth: 100,
    alignItems: 'center',
  },
  viewDetailsText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  reviewSection: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5',
    paddingTop: 12,
  },
  reviewButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  bottomSpacing: {
    height: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
  },
  browseButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212529',
  },
  modalProductName: {
    fontSize: 16,
    color: '#6C757D',
    marginBottom: 20,
  },
  ratingContainer: {
    marginBottom: 20,
  },
  ratingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  commentContainer: {
    marginBottom: 20,
  },
  commentLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#DEE2E6',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#212529',
    minHeight: 100,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DEE2E6',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6C757D',
  },
  submitReviewButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
  },
  submitReviewButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});