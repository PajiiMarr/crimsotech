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
  product_id: string | null;  // Can be null
  product_name: string;
  product_description?: string;
  product_condition?: number;
  product_status?: string;
  variant_id?: string | null;
  variant_title?: string | null;
  variant_sku?: string | null;
  shop_id: string | null;
  shop_name: string | null;
  shop_picture?: string | null;
  seller_username: string | null;
  quantity: number;
  price: string;
  subtotal: string;
  status: string;
  remarks: string | null;
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
    id?: string;
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
  pickup_date: string | null;
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
  product_id: string | null;
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
  item: OrderItem;
  is_refundable: boolean;
  can_review: boolean;
  variant_info?: {
    title: string;
    sku: string;
  };
}

// Status tabs configuration - All 8 tabs from web
const STATUS_TABS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'processing', label: 'Processing' },
  { id: 'to_pickup', label: 'To Pickup' },
  { id: 'shipped', label: 'Shipped' },
  { id: 'completed', label: 'Completed' },
  { id: 'rate', label: 'Rate' },
  { id: 'returns', label: 'Returns' },
];

// Status configuration for badges
const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
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
    label: 'Ready for Pickup', 
    color: '#3B82F6',
    bgColor: '#DBEAFE'
  },
  picked_up: { 
    label: 'Picked Up', 
    color: '#10B981',
    bgColor: '#D1FAE5'
  },
  completed: { 
    label: 'Completed', 
    color: '#10B981',
    bgColor: '#D1FAE5'
  },
  cancelled: { 
    label: 'Cancelled', 
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
    case 'to_ship':
      return 'to_ship';
    case 'to_receive':
      return 'to_receive';
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
    case 'return_refund':
      return 'return_refund';
    default:
      return 'pending';
  }
};

// Detect Cash on Pickup orders
const isCashOnPickup = (order: PurchaseOrder): boolean => {
  const method = (order.payment_method || '').toLowerCase();
  const delivery = (order.delivery_method || '').toLowerCase();
  return method.includes('cash') && (method.includes('pickup') || delivery.includes('pickup'));
};

// Format a datetime string nicely
const formatPickupDateTime = (dt: string): string => {
  try {
    const date = new Date(dt);
    return date.toLocaleString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return dt;
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
    pending: 0,
    processing: 0,
    to_pickup: 0,
    shipped: 0,
    completed: 0,
    rate: 0,
    returns: 0,
    all: 0
  });

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const response = await AxiosInstance.get<PurchasesResponse>('/purchases-buyer/user-purchases/', {
        headers: {
          'X-User-Id': userId
        }
      });

      const purchasesData = response.data;
      const items: PurchaseItem[] = [];

      purchasesData.purchases.forEach((order: PurchaseOrder) => {
        // Check if order has items
        if (order.items && order.items.length > 0) {
          order.items.forEach((item: OrderItem, index: number) => {
            // Skip items with no product_id (unavailable items)
            // But we still want to show them? Let's show them as "Item no longer available"
            const statusToUse = item.status || order.status || 'pending';
            const mappedStatus = mapStatus(statusToUse);
            
            // Get image URL - check primary_image first, then product_images
            let imageUrl = 'https://via.placeholder.com/100?text=No+Image';
            
            if (item.primary_image?.url) {
              const formatted = formatImageUrl(item.primary_image.url);
              if (formatted) imageUrl = formatted;
            } else if (item.product_images && item.product_images.length > 0 && item.product_images[0]?.url) {
              const formatted = formatImageUrl(item.product_images[0].url);
              if (formatted) imageUrl = formatted;
            }

            const purchaseItem: PurchaseItem = {
              id: `${order.order_id}-${index}`,
              order_id: order.order_id,
              product_id: item.product_id,
              product_name: item.product_name || 'Item no longer available',
              shop_name: item.shop_name || 'Unknown Shop',
              shop_id: item.shop_id,
              quantity: item.quantity,
              status: mappedStatus,
              purchased_at: item.purchased_at,
              total_amount: parseFloat(item.subtotal) || 0,
              image: imageUrl,
              order: order,
              item: item,
              is_refundable: item.is_refundable || false,
              can_review: item.can_review || false,
              variant_info: item.variant_title ? {
                title: item.variant_title,
                sku: item.variant_sku || ''
              } : undefined
            };

            if (item.status === 'cancelled' && item.remarks) {
              purchaseItem.reason = item.remarks;
            }

            items.push(purchaseItem);
          });
        }
        // If order has no items, we can optionally show a placeholder
        // For now, we'll just skip orders with no items
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
      pending: 0,
      processing: 0,
      to_pickup: 0,
      shipped: 0,
      completed: 0,
      rate: 0,
      returns: 0,
      all: items.length
    };

    items.forEach((item) => {
      const status = item.status;
      const paymentMethod = (item.order.payment_method || '').toString().toLowerCase();
      const deliveryMethod = (item.order.delivery_method || '').toString().toLowerCase();

      const isPickupCash = paymentMethod.includes('cash on pickup') && deliveryMethod.includes('pickup');

      if (status === 'pending') counts.pending++;
      if (status === 'in_progress') counts.processing++;
      if (status === 'ready_for_pickup' || (isPickupCash && status === 'pending')) counts.to_pickup++;

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

      if (status === 'picked_up' || status === 'completed') {
        counts.completed++;
      }

      // Rate tab shows completed orders that can be reviewed
      if ((status === 'picked_up' || status === 'completed') && item.can_review) {
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

    // Apply tab filter - All 8 tabs
    if (activeTab !== 'all') {
      switch (activeTab) {
        case 'pending':
          filtered = filtered.filter(item => item.status === 'pending');
          break;
        case 'processing':
          filtered = filtered.filter(item => {
            const paymentMethod = (item.order.payment_method || '').toString().toLowerCase();
            const deliveryMethod = (item.order.delivery_method || '').toString().toLowerCase();
            const isPickupCash = paymentMethod.includes('cash on pickup') && deliveryMethod.includes('pickup');

            if (isPickupCash) {
              return item.status === 'in_progress' || item.status === 'pending';
            }
            return item.status === 'in_progress';
          });
          break;
        case 'to_pickup':
          filtered = filtered.filter(item => {
            const paymentMethod = (item.order.payment_method || '').toString().toLowerCase();
            const deliveryMethod = (item.order.delivery_method || '').toString().toLowerCase();
            const isPickupCash = paymentMethod.includes('cash on pickup') && deliveryMethod.includes('pickup');
            return item.status === 'ready_for_pickup' || (isPickupCash && item.status === 'pending');
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
        case 'completed':
          filtered = filtered.filter(item => 
            item.status === 'picked_up' || item.status === 'completed'
          );
          break;
        case 'rate':
          filtered = filtered.filter(item => 
            (item.status === 'picked_up' || item.status === 'completed') && item.can_review
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
    const config = STATUS_CONFIG[status] || { label: status, color: '#6B7280', bgColor: '#F3F4F6' };
    
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
          onPress: async () => {
            try {
              await AxiosInstance.post(`/purchases-buyer/${item.order_id}/cancel/`, {}, {
                headers: { 'X-User-Id': userId }
              });
              Alert.alert('Success', 'Order cancelled successfully');
              fetchPurchases(); // Refresh list
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel order');
            }
          }
        }
      ]
    );
  };

  const renderOrderCard = ({ item }: { item: PurchaseItem }) => {
    const pickupDate = item.order.pickup_date;
    const showPickupBanner =
      isCashOnPickup(item.order) &&
      (item.status === 'in_progress' || item.status === 'ready_for_pickup' || item.status === 'pending') &&
      !!pickupDate;

    return (
      <TouchableOpacity 
        style={[styles.orderCard, showPickupBanner && styles.orderCardWithBanner]}
        onPress={() => router.push(`/customer/view-order?orderId=${item.order_id}`)}
        activeOpacity={0.7}
      >
        {/* Pickup Date Banner */}
        {showPickupBanner && (
          <View style={styles.pickupBanner}>
            <View style={styles.pickupBannerIcon}>
              <MaterialIcons name="event" size={16} color="#F59E0B" />
            </View>
            <View style={styles.pickupBannerContent}>
              <Text style={styles.pickupBannerTitle}>Pickup Scheduled</Text>
              <Text style={styles.pickupBannerDate}>
                {formatPickupDateTime(pickupDate)}
              </Text>
              <View style={styles.pickupBannerLocation}>
                <MaterialIcons name="location-on" size={10} color="#F59E0B" />
                <Text style={styles.pickupBannerLocationText}>Pick up at shop</Text>
              </View>
            </View>
            <View style={styles.pickupBannerBadge}>
              <Text style={styles.pickupBannerBadgeText}>Cash on Pickup</Text>
            </View>
          </View>
        )}

        {/* Shop Header */}
        <View style={styles.shopHeader}>
          <View style={styles.shopInfo}>
            <MaterialIcons name="store" size={16} color="#6B7280" />
            <Text style={styles.shopName} numberOfLines={1}>{item.shop_name}</Text>
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
            {item.variant_info && item.variant_info.title && (
              <View style={styles.infoRow}>
                <MaterialIcons name="label-outline" size={14} color="#9CA3AF" />
                <Text style={styles.infoText} numberOfLines={1}>{item.variant_info.title}</Text>
              </View>
            )}

            {/* Payment Method */}
            <View style={styles.infoRow}>
              <MaterialIcons name="payment" size={14} color="#9CA3AF" />
              <Text style={styles.infoText} numberOfLines={1}>{item.order.payment_method}</Text>
            </View>

            {/* Status Badge */}
            <View style={styles.statusContainer}>
              {getStatusBadge(item.status)}
            </View>

            {/* Quantity and Price */}
            <View style={styles.priceRow}>
              <Text style={styles.quantity}>x{item.quantity}</Text>
              <Text style={styles.price}>{formatCurrency(item.total_amount)}</Text>
            </View>
          </View>
        </View>

        {/* Voucher Applied */}
        {item.item?.voucher_applied && (
          <View style={styles.voucherContainer}>
            <MaterialIcons name="local-offer" size={14} color="#10B981" />
            <Text style={styles.voucherText} numberOfLines={1}>
              {item.item.voucher_applied.name} ({item.item.voucher_applied.code})
            </Text>
          </View>
        )}

        {/* Total and Action */}
        <View style={styles.footer}>
          <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total to Pay:</Text>
          <Text style={styles.totalAmount}>{formatCurrency(parseFloat(item.order.total_amount))}</Text>
        </View>

          {/* Action Buttons - Matches web version exactly */}
          <View style={styles.actionButtons}>
            {/* Cancel button for pending/in_progress items */}
            {(item.status === 'pending' || item.status === 'in_progress') && (
              <TouchableOpacity 
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => handleCancelOrder(item)}
              >
                <MaterialIcons name="cancel" size={14} color="#EF4444" />
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            )}

            {/* Track button for to_ship/to_receive items (but not delivered) */}
            {/* {(item.status === 'to_ship' || item.status === 'to_receive') && (
              <TouchableOpacity 
                style={[styles.actionButton, styles.trackButton]}
                onPress={() => router.push(`/customer/track-order?orderId=${item.order_id}&status=${item.status}`)}
              >
                <MaterialIcons name="location-on" size={14} color="#3B82F6" />
                <Text style={styles.trackButtonText}>Track</Text>
              </TouchableOpacity>
            )} */}

            {/* For delivered items - Shows Rate button (like web version) */}
            {item.status === 'delivered' && (
              <>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.rateButton]}
                  onPress={() => router.push(`/customer/rate?productId=${item.product_id}&orderId=${item.order_id}&productName=${encodeURIComponent(item.product_name)}`)}
                >
                  <MaterialIcons name="star" size={14} color="#F97316" />
                  <Text style={styles.rateButtonText}>Rate</Text>
                </TouchableOpacity>
                
                {item.is_refundable && item.product_id && (
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.refundButton]}
                    onPress={() => router.push(`/customer/request-refund?orderId=${item.order_id}&productId=${item.product_id}`)}
                  >
                    <MaterialIcons name="refresh" size={14} color="#F97316" />
                    <Text style={styles.refundButtonText}>Refund</Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            {/* For picked_up/completed items - Rate button only if can_review */}
            {(item.status === 'picked_up' || item.status === 'completed') && item.can_review && item.product_id && (
              <TouchableOpacity 
                style={[styles.actionButton, styles.rateButton]}
                onPress={() => router.push(`/customer/order-review?productId=${item.product_id}&orderId=${item.order_id}&productName=${encodeURIComponent(item.product_name)}`)}
              >
                <MaterialIcons name="star" size={14} color="#F97316" />
                <Text style={styles.rateButtonText}>Rate</Text>
              </TouchableOpacity>
            )}

            {/* For picked_up/completed items without review - View button */}
            {(item.status === 'picked_up' || item.status === 'completed') && !item.can_review && (
              <TouchableOpacity 
                style={[styles.actionButton, styles.viewButton]}
                onPress={() => router.push(`/customer/view-order?orderId=${item.order_id}`)}
              >
                <MaterialIcons name="visibility" size={14} color="#6B7280" />
                <Text style={styles.viewButtonText}>View</Text>
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
        {/* Status Tabs - All 8 tabs */}
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
               activeTab === 'pending' ? 'No pending orders' :
               activeTab === 'processing' ? 'No processing orders' :
               activeTab === 'to_pickup' ? 'No orders ready for pickup' :
               activeTab === 'shipped' ? 'No shipped orders' :
               activeTab === 'completed' ? 'No completed orders' :
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
    paddingTop: 52,
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
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    minHeight: 52,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 100,
    paddingHorizontal: 8,
    paddingVertical: 6,
    paddingRight: 12,
    borderRadius: 0,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    justifyContent: 'center',
    height: 36,
    position: 'relative',
  },
  activeTab: {
    backgroundColor: 'transparent',
    borderBottomWidth: 3,
    borderBottomColor: '#F97316',
    borderRadius: 0,
    paddingBottom: 6,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    flexShrink: 0,
    textAlign: 'center',
    includeFontPadding: false,
  },
  activeTabLabel: {
    color: '#111827',
    fontWeight: '700',
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
    right: 8,
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
  orderCardWithBanner: {
    borderColor: '#FCD34D',
  },
  pickupBanner: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FCD34D',
    gap: 12,
  },
  pickupBannerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickupBannerContent: {
    flex: 1,
  },
  pickupBannerTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  pickupBannerDate: {
    fontSize: 14,
    fontWeight: '700',
    color: '#B45309',
    marginTop: 2,
  },
  pickupBannerLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  pickupBannerLocationText: {
    fontSize: 10,
    color: '#B45309',
  },
  pickupBannerBadge: {
    backgroundColor: '#FDE68A',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  pickupBannerBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#92400E',
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
    flex: 1,
  },
  shopName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
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
  voucherContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    padding: 8,
    backgroundColor: '#F0FDF4',
    borderRadius: 6,
  },
  voucherText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '500',
    flex: 1,
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