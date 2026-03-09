// app/customer/purchases.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Alert,
  Platform
} from 'react-native';
import {
  MaterialIcons
} from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import CustomerLayout from './CustomerLayout';
import AxiosInstance from '../../contexts/axios';

// Define interfaces based on backend response
interface OrderItem {
  checkout_id: string;
  cart_item_id: string | null;
  product_id: string;
  product_name: string;
  shop_id: string | null;
  shop_name: string | null;
  seller_username: string | null;
  quantity: number;
  price: string;
  subtotal: string;
  status: string;
  remarks: string;
  purchased_at: string;
  voucher_applied: {
    id: string;
    name: string;
    code: string;
  } | null;
  can_review: boolean;
  is_refundable: boolean;
  primary_image?: {
    url: string;
    file_type: string;
  } | null;
  product_images?: Array<{
    url: string;
    file_type: string;
  }>;
}

interface PurchaseOrder {
  order_id: string;
  status: string;
  total_amount: string;
  payment_method: string;
  delivery_method: string | null;
  delivery_address: string;
  created_at: string;
  completed_at: string | null;
  payment_status: string | null;
  delivery_status: string | null;
  delivery_rider: string | null;
  items: OrderItem[];
}

interface PurchasesResponse {
  user_id: string;
  username: string;
  total_purchases: number;
  purchases: PurchaseOrder[];
}

interface PurchaseItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  shop_name: string;
  shop_id: string | null;
  quantity: number;
  status: 'pending' | 'in_progress' | 'to_ship' | 'to_receive' | 'delivered' | 'completed' | 'cancelled' | 'return_refund' | 'ready_for_pickup' | 'picked_up';
  purchased_at: string;
  total_amount: number;
  image: string;
  reason?: string;
  refund_request_id?: string;
  order: PurchaseOrder;
  item?: OrderItem;
  is_refundable: boolean;
  can_review: boolean;
}

// Status tabs configuration
const STATUS_TABS = [
  { id: 'all', label: 'All' },
  { id: 'processing', label: 'Processing' },
  { id: 'shipped', label: 'Shipped' },
  { id: 'rate', label: 'Rate' },
];

// Status configuration for badges
const STATUS_CONFIG = {
  pending: { 
    label: 'Pending', 
    color: '#F59E0B',
    bgColor: '#FEF3C7'
  },
  in_progress: { 
    label: 'In Progress', 
    color: '#3B82F6',
    bgColor: '#DBEAFE'
  },
  to_ship: { 
    label: 'To Ship', 
    color: '#6366F1',
    bgColor: '#E0E7FF'
  },
  to_receive: { 
    label: 'To Receive', 
    color: '#3B82F6',
    bgColor: '#DBEAFE'
  },
  delivered: {
    label: 'Delivered',
    color: '#14B8A6',
    bgColor: '#CCFBF1'
  },
  ready_for_pickup: { 
    label: 'To Pickup', 
    color: '#3B82F6',
    bgColor: '#DBEAFE'
  },
  completed: { 
    label: 'Completed', 
    color: '#10B981',
    bgColor: '#D1FAE5'
  },
  cancelled: { 
    label: 'Order cancelled', 
    color: '#EF4444',
    bgColor: '#FEE2E2'
  },
  return_refund: { 
    label: 'Return/Refund', 
    color: '#F97316',
    bgColor: '#FFEDD5'
  }
};

// Helper function to format image URL
const formatImageUrl = (url: string | null | undefined): string | null => {
  if (!url || url.trim() === '') return null;

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  const baseURL = (AxiosInstance.defaults && AxiosInstance.defaults.baseURL) 
    ? AxiosInstance.defaults.baseURL.replace(/\/$/, '') 
    : 'http://localhost:8000';
  
  if (url.startsWith('/')) {
    return `${baseURL}${url}`;
  }

  return `${baseURL}/${url}`;
};

// Helper function to map backend status to frontend status
const mapStatus = (backendStatus: string): PurchaseItem['status'] => {
  const normalized = (backendStatus || '').toString().trim().toLowerCase();

  switch (normalized) {
    case 'pending':
      return 'pending';
    case 'processing':
      return 'in_progress';
    case 'shipped':
      return 'to_ship';
    case 'ready_for_pickup':
      return 'ready_for_pickup';
    case 'picked_up':
      return 'picked_up';
    case 'delivered':
      return 'delivered';
    case 'completed':
      return 'completed';
    case 'cancelled':
      return 'cancelled';
    case 'refunded':
      return 'return_refund';
    default:
      return 'pending';
  }
};

const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch (error) {
    return dateString;
  }
};

const formatCurrency = (amount: number) => {
  return `₱${amount.toFixed(2)}`;
};

export default function PurchasesPage() {
  const { userId, loading: authLoading } = useAuth();
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [orderCounts, setOrderCounts] = useState({
    processing: 0,
    shipped: 0,
    rate: 0,
    all: 0
  });

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const response = await AxiosInstance.get<PurchasesResponse>('/purchases-buyer/user_purchases/', {
        headers: {
          'X-User-Id': userId
        }
      });

      const purchasesData = response.data;
      const items: PurchaseItem[] = [];

      purchasesData.purchases.forEach((order: PurchaseOrder) => {
        if (order.items && order.items.length > 0) {
          order.items.forEach((item: OrderItem, index: number) => {
            const statusToUse = item.status || order.status || 'pending';
            const mappedStatus = mapStatus(statusToUse);
            
            const imageUrl = formatImageUrl(
              item.primary_image?.url || 
              (item.product_images && item.product_images[0]?.url)
            ) || 'https://via.placeholder.com/100';

            const purchaseItem: PurchaseItem = {
              id: `${order.order_id}-${index}`,
              order_id: order.order_id,
              product_id: item.product_id,
              product_name: item.product_name,
              shop_name: item.shop_name || 'Unknown Shop',
              shop_id: item.shop_id,
              quantity: item.quantity,
              status: mappedStatus,
              purchased_at: item.purchased_at,
              total_amount: parseFloat(item.subtotal),
              image: imageUrl,
              order: order,
              item: item,
              is_refundable: item.is_refundable || false,
              can_review: item.can_review || false
            };

            if (item.status === 'cancelled' && item.remarks) {
              purchaseItem.reason = item.remarks;
            }

            items.push(purchaseItem);
          });
        }
      });

      setPurchaseItems(items);
      calculateOrderCounts(items);
    } catch (error) {
      console.error('Error fetching purchases:', error);
      Alert.alert('Error', 'Failed to load purchases');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateOrderCounts = (items: PurchaseItem[]) => {
    const counts = {
      processing: 0,
      shipped: 0,
      rate: 0,
      returns: 0,
      all: items.length
    };

    items.forEach((item) => {
      const status = item.status;
      const paymentMethod = (item.order.payment_method || '').toString().toLowerCase();
      const deliveryMethod = (item.order.delivery_method || '').toString().toLowerCase();

      const isPickupCash = paymentMethod.includes('cash on pickup') && deliveryMethod.includes('pickup');

      if ((status === 'pending' || status === 'in_progress') || (isPickupCash && status === 'ready_for_pickup')) {
        counts.processing++;
      }

      const rawOrderStatus = (item.order?.status || '').toString().trim().toLowerCase();
      if (
        status === 'to_ship' ||
        status === 'to_receive' ||
        status === 'delivered' ||
        status === 'picked_up' ||
        status === 'completed' ||
        rawOrderStatus === 'delivered'
      ) {
        counts.shipped++;
      }

      // Rate tab shows ALL completed orders, not just those with can_review
      if (status === 'completed') {
        counts.rate++;
      }

      if (status === 'cancelled' || status === 'return_refund') {
        counts.returns++;
      }
    });

    setOrderCounts(counts);
  };

  useEffect(() => {
    if (!authLoading && userId) {
      fetchPurchases();
    }
  }, [authLoading, userId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPurchases();
  };

  const getFilteredItems = () => {
    let filtered = purchaseItems;

    // Apply tab filter
    if (activeTab !== 'all') {
      switch (activeTab) {
        case 'processing':
          filtered = filtered.filter(item => {
            const paymentMethod = (item.order.payment_method || '').toString().toLowerCase();
            const deliveryMethod = (item.order.delivery_method || '').toString().toLowerCase();
            const isPickupCash = paymentMethod.includes('cash on pickup') && deliveryMethod.includes('pickup');

            if (isPickupCash) {
              return item.status === 'pending' || item.status === 'in_progress' || item.status === 'ready_for_pickup';
            }
            return item.status === 'pending' || item.status === 'in_progress';
          });
          break;
        case 'shipped':
          filtered = filtered.filter(item => {
            const rawOrderStatus = (item.order?.status || '').toString().trim().toLowerCase();
            return (
              item.status === 'to_ship' ||
              item.status === 'to_receive' ||
              item.status === 'delivered' ||
              item.status === 'picked_up' ||
              item.status === 'completed' ||
              rawOrderStatus === 'delivered'
            );
          });
          break;
        case 'rate':
          // FIXED: Show ALL completed orders, not just those with can_review
          filtered = filtered.filter(item => 
            item.status === 'completed'
          );
          break;
        case 'returns':
          filtered = filtered.filter(item => 
            item.status === 'cancelled' || item.status === 'return_refund'
          );
          break;
      }
    }

    return filtered;
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || 
                   { label: status, color: '#6B7280', bgColor: '#F3F4F6' };
    
    return (
      <View style={[styles.statusBadge, { backgroundColor: config.bgColor }]}>
        <Text style={[styles.statusText, { color: config.color }]}>
          {config.label}
        </Text>
      </View>
    );
  };

  const handleCancelOrder = (item: PurchaseItem) => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes, Cancel', 
          style: 'destructive',
          onPress: () => {
            // Navigate to cancel order page
            // router.push(`/cancel-order/${item.order_id}?item_id=${item.id}`);
          }
        }
      ]
    );
  };

  const renderOrderCard = ({ item }: { item: PurchaseItem }) => {
    return (
      <TouchableOpacity 
        style={styles.orderCard}
        onPress={() => router.push(`/customer/view-order?orderId=${item.order_id}`)}
        activeOpacity={0.7}
      >
        {/* Shop Header */}
        <View style={styles.shopHeader}>
          <View style={styles.shopInfo}>
            <MaterialIcons name="store" size={16} color="#6B7280" />
            <Text style={styles.shopName}>{item.shop_name}</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color="#9CA3AF" />
        </View>

        {/* Product Info */}
        <View style={styles.productContainer}>
          <Image 
            source={{ uri: item.image }} 
            style={styles.productImage}
            defaultSource={require('../../assets/images/icon.png')}
          />
          <View style={styles.productDetails}>
            <Text style={styles.productName} numberOfLines={2}>
              {item.product_name}
            </Text>
            
            {/* Variant - if available */}
            {item.item?.remarks && (
              <View style={styles.infoRow}>
                <MaterialIcons name="label-outline" size={14} color="#9CA3AF" />
                <Text style={styles.infoText} numberOfLines={1}>{item.item.remarks}</Text>
              </View>
            )}

            {/* Payment Method */}
            <View style={styles.infoRow}>
              <MaterialIcons name="payment" size={14} color="#9CA3AF" />
              <Text style={styles.infoText} numberOfLines={1}>{item.order.payment_method}</Text>
            </View>

            {/* Status Badge - Only show if cancelled or return/refund */}
            {(item.status === 'cancelled' || item.status === 'return_refund') && (
              <View style={styles.statusContainer}>
                {getStatusBadge(item.status)}
              </View>
            )}

            {/* Quantity and Price */}
            <View style={styles.priceRow}>
              <Text style={styles.quantity}>x{item.quantity}</Text>
              <Text style={styles.price}>{formatCurrency(item.total_amount)}</Text>
            </View>
          </View>
        </View>

        {/* Total and Action */}
        <View style={styles.footer}>
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalAmount}>{formatCurrency(item.total_amount)}</Text>
          </View>

          {/* Action Buttons - Professional border-only style */}
          <View style={styles.actionButtons}>
            {/* Cancel button for processing items */}
            {(item.status === 'pending' || item.status === 'in_progress') && (
              <TouchableOpacity 
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => handleCancelOrder(item)}
              >
                <MaterialIcons name="cancel" size={14} color="#EF4444" />
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            )}

            {/* Track button for shipped items */}
            {(item.status === 'to_ship' || item.status === 'to_receive' || item.status === 'delivered') && (
              <TouchableOpacity 
                style={[styles.actionButton, styles.trackButton]}
                // onPress={() => router.push(`/customer/track-order?orderId=${item.order_id}`)}
              >
                <MaterialIcons name="location-on" size={14} color="#3B82F6" />
                <Text style={styles.trackButtonText}>Track</Text>
              </TouchableOpacity>
            )}

            {/* Refund button for delivered items */}
            {(item.status === 'delivered' || item.status === 'to_receive') && item.is_refundable && (
              <TouchableOpacity 
                style={[styles.actionButton, styles.refundButton]}
                onPress={() => router.push(`/customer/request-refund?orderId=${item.order_id}&productId=${item.product_id}`)}
              >
                <MaterialIcons name="refresh" size={14} color="#F97316" />
                <Text style={styles.refundButtonText}>Refund</Text>
              </TouchableOpacity>
            )}

            {/* Rate button for completed items */}
            {item.status === 'completed' && (
              <TouchableOpacity 
                style={[styles.actionButton, styles.rateButton]}
                // onPress={() => router.push(`/customer/product-rate?productId=${item.product_id}&orderId=${item.order_id}`)}
              >
                <MaterialIcons name="star" size={14} color="#F97316" />
                <Text style={styles.rateButtonText}>Rate</Text>
              </TouchableOpacity>
            )}

            {/* View Details button for returns */}
            {(item.status === 'cancelled' || item.status === 'return_refund') && (
              <TouchableOpacity 
                style={[styles.actionButton, styles.detailsButton]}
                onPress={() => router.push(`/customer/view-refund?orderId=${item.order_id}`)}
              >
                <MaterialIcons name="visibility" size={14} color="#6B7280" />
                <Text style={styles.detailsButtonText}>Details</Text>
              </TouchableOpacity>
            )}

            {/* Always show View Order button for all other statuses */}
            {item.status !== 'pending' && 
             item.status !== 'in_progress' && 
             item.status !== 'to_ship' && 
             item.status !== 'to_receive' && 
             item.status !== 'delivered' && 
             item.status !== 'completed' && 
             item.status !== 'cancelled' && 
             item.status !== 'return_refund' && (
              <TouchableOpacity 
                style={[styles.actionButton, styles.viewButton]}
                onPress={() => router.push(`/customer/view-order?orderId=${item.order_id}`)}
              >
                <MaterialIcons name="visibility" size={14} color="#6B7280" />
                <Text style={styles.viewButtonText}>View</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Cancelled Reason - if available */}
        {item.reason && (
          <View style={styles.reasonContainer}>
            <Text style={styles.reasonText}>{item.reason}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const filteredItems = getFilteredItems();

  if (authLoading || loading) {
    return (
      <CustomerLayout disableScroll>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F97316" />
          <Text style={styles.loadingText}>Loading purchases...</Text>
        </View>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout disableScroll>
      <View style={styles.container}>
        {/* Status Tabs */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.tabsScrollView}
          contentContainerStyle={styles.tabsContainer}
        >
          {STATUS_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const count = orderCounts[tab.id as keyof typeof orderCounts] || 0;

            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tab, isActive && styles.activeTab]}
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>
                  {tab.label}
                </Text>
                {count > 0 && (
                  <View style={[styles.tabBadge, isActive && styles.activeTabBadge]}>
                    <Text style={[styles.tabBadgeText, isActive && styles.activeTabBadgeText]}>
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Purchases List */}
        {filteredItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="shopping-bag" size={48} color="#E5E7EB" />
            <Text style={styles.emptyTitle}>No purchases found</Text>
            <Text style={styles.emptyText}>
              {activeTab === 'all' ? 'Start shopping to see your purchases' :
               activeTab === 'processing' ? 'No processing orders' :
               activeTab === 'shipped' ? 'No shipped orders' :
               activeTab === 'rate' ? 'No orders to rate' :
               'No returns or refunds'}
            </Text>
            <TouchableOpacity 
              style={styles.shopButton}
              onPress={() => router.push('/customer/home')}
            >
              <Text style={styles.shopButtonText}>Start Shopping</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filteredItems}
            renderItem={renderOrderCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh}
                colors={['#F97316']}
                tintColor="#F97316"
              />
            }
          />
        )}
      </View>
    </CustomerLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingTop: 52, // reserve space for fixed tabs
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 400,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  tabsScrollView: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    height: 52,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
  },
  tabsContainer: {
    paddingHorizontal: 12,
    paddingVertical: 0,
    // use horizontal layout spacing via margin on children
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    minHeight: 52,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    paddingRight: 12,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    // flexShrink: 0,
    // minWidth: 100,
    justifyContent: 'center',
    height: 36,
    position: 'relative',
  },
  activeTab: {
    backgroundColor: '#F97316',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    // allow label to size naturally
    flexShrink: 0,
    textAlign: 'center',
    includeFontPadding: false,
  },
  activeTabLabel: {
    color: '#FFFFFF',
  },
  tabBadge: {
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    height: 20,
    minWidth: 22,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    right: -8,
    top: 6,
  },
  activeTabBadge: {
    backgroundColor: '#FFFFFF',
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTabBadgeText: {
    color: '#F97316',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    padding: 12,
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
  shopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  shopInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shopName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  productContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  productDetails: {
    flex: 1,
    gap: 4,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  infoText: {
    fontSize: 12,
    color: '#6B7280',
    flex: 1,
  },
  statusContainer: {
    marginVertical: 4,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  quantity: {
    fontSize: 13,
    color: '#6B7280',
  },
  price: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F97316',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  totalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  totalLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  totalAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: 'transparent',
    gap: 4,
  },
  viewButton: {
    borderColor: '#D1D5DB',
  },
  viewButtonText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
  },
  cancelButton: {
    borderColor: '#FECACA',
  },
  cancelButtonText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#EF4444',
  },
  trackButton: {
    borderColor: '#BFDBFE',
  },
  trackButtonText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#3B82F6',
  },
  refundButton: {
    borderColor: '#FED7AA',
  },
  refundButtonText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#F97316',
  },
  rateButton: {
    borderColor: '#FED7AA',
  },
  rateButtonText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#F97316',
  },
  detailsButton: {
    borderColor: '#D1D5DB',
  },
  detailsButtonText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
  },
  reasonContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 6,
  },
  reasonText: {
    fontSize: 12,
    color: '#EF4444',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 20,
  },
  shopButton: {
    backgroundColor: '#F97316',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  shopButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});