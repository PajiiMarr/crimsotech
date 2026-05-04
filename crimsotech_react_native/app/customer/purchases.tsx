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
  product_id: string | null;
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

// Grouped order by shop - each shop gets its own "order" entry
interface ShopGroupOrder {
  id: string; // Combination of order_id + shop_id
  original_order_id: string;
  shop_id: string;
  shop_name: string;
  shop_picture?: string | null;
  status: string; // Status from OrderShopStatus or derived from items
  total_amount: string; // Only items from this shop
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
  // Original order reference
  original_order: {
    order_id: string;
    total_amount: string;
    status: string;
  };
}

interface PurchasesResponse {
  user_id: string;
  username: string;
  total_purchases: number;
  purchases: PurchaseOrder[];
}

// Backend order response (unchanged)
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

// New: ShopGroup interface for separated orders
interface ShopGroup {
  groupId: string;
  originalOrderId: string;
  shopId: string;
  shopName: string;
  shopPicture?: string | null;
  createdAt: string;
  items: PurchaseItem[];
  totalAmount: number;
  status: string;
  paymentMethod: string;
  deliveryMethod: string | null;
  deliveryAddress: string;
  paymentStatus: string | null;
  deliveryStatus: string | null;
  pickupDate: string | null;
}

// Status tabs configuration
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
const mapStatus = (backendStatus: string, checkoutStatus?: string): PurchaseItem['status'] => {
  // If there's a checkout status and it's cancelled, use that
  if (checkoutStatus === 'cancelled') {
    return 'cancelled';
  }
  
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
    case 'canceled':
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

// Format a datetime string nicely with proper Philippine format
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
    return date.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    return dateString;
  }
};

const formatCurrency = (amount: number) => {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Format large numbers with commas
const formatNumber = (num: number): string => {
  return num.toLocaleString('en-PH');
};

export default function PurchasesPage() {
  const { userId, loading: authLoading } = useAuth();
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [shopGroups, setShopGroups] = useState<ShopGroup[]>([]); // New: grouped by shop
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
        if (order.items && order.items.length > 0) {
          order.items.forEach((item: OrderItem, index: number) => {
            // IMPORTANT: Use item.status for cancelled items, fallback to order.status
            const effectiveStatus = item.status === 'cancelled' 
              ? item.status 
              : (item.status || order.status || 'pending');
            
            const mappedStatus = mapStatus(effectiveStatus, item.status);
            
            let imageUrl = 'https://via.placeholder.com/70?text=No+Image';
            
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
      });
  
      setPurchaseItems(items);
      
      // Group items by shop within the same original order
      const groups = groupItemsByShop(items);
      setShopGroups(groups);
      
      calculateOrderCounts(items);
    } catch (error) {
      console.error('Error fetching purchases:', error);
      Alert.alert('Error', 'Failed to load purchases');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // NEW: Group items by shop (separate orders from different shops)
  const groupItemsByShop = (items: PurchaseItem[]): ShopGroup[] => {
    const groupsMap = new Map<string, ShopGroup>();
    
    items.forEach((item) => {
      // Create unique key: original_order_id + shop_id
      const shopId = item.shop_id || 'unknown-shop';
      const groupKey = `${item.order_id}-${shopId}`;
      
      if (!groupsMap.has(groupKey)) {
        // Get all items from this order that belong to this shop
        const shopItems = items.filter(
          i => i.order_id === item.order_id && (i.shop_id || 'unknown-shop') === shopId
        );
        
        // Calculate total amount for this shop group
        const totalAmount = shopItems.reduce((sum, i) => sum + i.total_amount, 0);
        
        // Determine group status - use highest priority status from items
        const statusPriority: Record<string, number> = {
          'cancelled': 0,
          'pending': 1,
          'in_progress': 2,
          'ready_for_pickup': 3,
          'to_ship': 4,
          'to_receive': 5,
          'delivered': 6,
          'picked_up': 7,
          'completed': 8,
        };
        
        let groupStatus = 'pending';
        let highestPriority = -1;
        
        shopItems.forEach((i) => {
          const priority = statusPriority[i.status] ?? 1;
          if (priority > highestPriority) {
            highestPriority = priority;
            groupStatus = i.status;
          }
        });
        
        groupsMap.set(groupKey, {
          groupId: groupKey,
          originalOrderId: item.order_id,
          shopId: shopId,
          shopName: item.shop_name,
          shopPicture: item.item.shop_picture,
          createdAt: item.order.created_at,
          items: shopItems,
          totalAmount: totalAmount,
          status: groupStatus,
          paymentMethod: item.order.payment_method,
          deliveryMethod: item.order.delivery_method,
          deliveryAddress: item.order.delivery_address,
          paymentStatus: item.order.payment_status,
          deliveryStatus: item.order.delivery_status,
          pickupDate: item.order.pickup_date,
        });
      }
    });
    
    // Convert map to array and sort by created_at (newest first)
    return Array.from(groupsMap.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
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
      const isCancelledItem = status === 'cancelled';
      
      if (status === 'pending') counts.pending++;
      if (status === 'in_progress') counts.processing++;
      if (status === 'ready_for_pickup') counts.to_pickup++;
  
      const rawOrderStatus = (item.order?.status || '').toString().trim().toLowerCase();
      if (
        status === 'to_ship' ||
        status === 'to_receive' ||
        status === 'delivered' ||
        status === 'picked_up' ||
        status === 'completed' ||
        rawOrderStatus === 'delivered'
      ) {
        if (!isCancelledItem) counts.shipped++;
      }
  
      if (status === 'picked_up' || status === 'completed') {
        if (!isCancelledItem) counts.completed++;
      }
  
      if ((status === 'picked_up' || status === 'completed') && item.can_review) {
        if (!isCancelledItem) counts.rate++;
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

  // NEW: Filter shop groups by tab
  const getFilteredGroups = (): ShopGroup[] => {
    let filtered = shopGroups;
  
    if (activeTab !== 'all') {
      switch (activeTab) {
        case 'pending':
          filtered = filtered.filter(group => 
            group.items.some(item => item.status === 'pending')
          );
          break;
        case 'processing':
          filtered = filtered.filter(group => 
            group.items.some(item => item.status === 'in_progress')
          );
          break;
        case 'to_pickup':
          filtered = filtered.filter(group => 
            group.items.some(item => item.status === 'ready_for_pickup')
          );
          break;
        case 'shipped':
          filtered = filtered.filter(group => 
            group.items.some(item => 
              item.status === 'to_ship' ||
              item.status === 'to_receive' ||
              item.status === 'delivered' ||
              item.status === 'picked_up' ||
              item.status === 'completed'
            )
          );
          break;
        case 'completed':
          filtered = filtered.filter(group => 
            group.items.some(item => 
              item.status === 'picked_up' || item.status === 'completed'
            )
          );
          break;
        case 'rate':
          filtered = filtered.filter(group => 
            group.items.some(item => 
              (item.status === 'picked_up' || item.status === 'completed') && item.can_review
            )
          );
          break;
        case 'returns':
          filtered = filtered.filter(group => 
            group.items.some(item => 
              item.status === 'cancelled' || item.status === 'return_refund'
            )
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

  // NEW: Render a shop group card (separate order per shop)
  const renderShopGroupCard = ({ item: group }: { item: ShopGroup }) => {
    // Determine if this group has Cash on Pickup
    const showPickupBanner = 
      isCashOnPickup({
        order_id: group.originalOrderId,
        status: group.status,
        total_amount: String(group.totalAmount),
        payment_method: group.paymentMethod,
        delivery_method: group.deliveryMethod,
        delivery_address: group.deliveryAddress,
        created_at: group.createdAt,
        completed_at: null,
        payment_status: group.paymentStatus,
        delivery_status: group.deliveryStatus,
        delivery_rider: null,
        pickup_date: group.pickupDate,
        items: []
      }) &&
      group.items.some(item => 
        item.status === 'in_progress' || 
        item.status === 'ready_for_pickup' || 
        item.status === 'pending'
      ) &&
      !!group.pickupDate;

    // Get the first item for display (or show multiple if needed)
    const primaryItem = group.items[0];
    const hasMultipleItems = group.items.length > 1;

    return (
      <TouchableOpacity 
        style={[styles.orderCard, showPickupBanner && styles.orderCardWithBanner]}
        onPress={() => {
          // Pass both orderId AND shopId to filter by shop
          router.push({
            pathname: '/customer/view-order',
            params: { 
              orderId: group.originalOrderId,
              shopId: group.shopId,
              shopName: group.shopName
            }
          });
        }}
        activeOpacity={0.7}
      >
        {/* Pickup Date Banner */}
        {showPickupBanner && (
          <View style={styles.pickupBanner}>
            <View style={styles.pickupBannerIcon}>
              <MaterialIcons name="event" size={14} color="#F59E0B" />
            </View>
            <View style={styles.pickupBannerContent}>
              <Text style={styles.pickupBannerTitle}>Pickup Scheduled</Text>
              <Text style={styles.pickupBannerDate}>
                {formatPickupDateTime(group.pickupDate!)}
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

        {/* Shop Header - This is the key differentiator for multi-shop orders */}
        <View style={styles.shopHeader}>
          <View style={styles.shopInfo}>
            <MaterialIcons name="store" size={14} color="#6B7280" />
            <Text style={styles.shopName} numberOfLines={1}>{group.shopName}</Text>
          </View>
          <MaterialIcons name="chevron-right" size={16} color="#9CA3AF" />
        </View>

        {/* Multiple items indicator */}
        {hasMultipleItems && (
          <View style={styles.multipleItemsBadge}>
            <MaterialIcons name="apps" size={12} color="#6B7280" />
            <Text style={styles.multipleItemsText}>{group.items.length} items from this shop</Text>
          </View>
        )}

        {/* Primary Product Info */}
        <View style={styles.productContainer}>
          <Image 
            source={{ uri: primaryItem.image }} 
            style={styles.productImage}
            defaultSource={require('../../assets/images/icon.png')}
          />
          <View style={styles.productDetails}>
            <Text style={styles.productName} numberOfLines={2}>
              {primaryItem.product_name}
              {hasMultipleItems && ` +${group.items.length - 1} more`}
            </Text>
            
            {/* Variant - if available */}
            {primaryItem.variant_info && primaryItem.variant_info.title && (
              <View style={styles.infoRow}>
                <MaterialIcons name="label-outline" size={12} color="#9CA3AF" />
                <Text style={styles.infoText} numberOfLines={1}>{primaryItem.variant_info.title}</Text>
              </View>
            )}

            {/* Payment Method */}
            <View style={styles.infoRow}>
              <MaterialIcons name="payment" size={12} color="#9CA3AF" />
              <Text style={styles.infoText} numberOfLines={1}>{group.paymentMethod}</Text>
            </View>

            {/* Status Badge */}
            <View style={styles.statusContainer}>
              {getStatusBadge(group.status)}
            </View>

            {/* Quantity and Price */}
            <View style={styles.priceRow}>
              <Text style={styles.quantity}>x{formatNumber(primaryItem.quantity)}</Text>
              <Text style={styles.price}>{formatCurrency(group.totalAmount)}</Text>
            </View>
          </View>
        </View>

        {/* Voucher Applied (from first item) */}
        {primaryItem.item?.voucher_applied && (
          <View style={styles.voucherContainer}>
            <MaterialIcons name="local-offer" size={12} color="#10B981" />
            <Text style={styles.voucherText} numberOfLines={1}>
              {primaryItem.item.voucher_applied.name} ({primaryItem.item.voucher_applied.code})
            </Text>
          </View>
        )}

        {/* Total and Action */}
        <View style={styles.footer}>
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Shop Total:</Text>
            <Text style={styles.totalAmount}>{formatCurrency(group.totalAmount)}</Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {/* View Details button for returns - only for return_refund, not cancelled */}
            {group.status === 'return_refund' && (
              <TouchableOpacity 
                style={[styles.actionButton, styles.detailsButton]}
                onPress={() => router.push(`/customer/view-refund?orderId=${group.originalOrderId}`)}
              >
                <MaterialIcons name="visibility" size={12} color="#6B7280" />
                <Text style={styles.detailsButtonText}>Details</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const filteredGroups = getFilteredGroups();

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
        {/* Status Tabs - Box style */}
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
                      {formatNumber(count)}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Purchases List - Now showing shop groups instead of individual items */}
        {filteredGroups.length === 0 ? (
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
            data={filteredGroups}
            renderItem={renderShopGroupCard}
            keyExtractor={(item) => item.groupId}
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
    height: 48,
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
    minHeight: 48,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    borderRadius: 0,
    height: 36,
  },
  activeTab: {
    backgroundColor: '#F97316',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabLabel: {
    color: '#FFFFFF',
  },
  tabBadge: {
    backgroundColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginLeft: 6,
    minWidth: 20,
    alignItems: 'center',
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
    padding: 12,
    paddingBottom: 80,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginBottom: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F0F0F0',
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
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FCD34D',
    gap: 8,
  },
  pickupBannerIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickupBannerContent: {
    flex: 1,
  },
  pickupBannerTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400E',
  },
  pickupBannerDate: {
    fontSize: 12,
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
    fontSize: 9,
    color: '#B45309',
  },
  pickupBannerBadge: {
    backgroundColor: '#FDE68A',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  pickupBannerBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#92400E',
  },
  shopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  shopInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  shopName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  multipleItemsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    paddingVertical: 4,
  },
  multipleItemsText: {
    fontSize: 11,
    color: '#6B7280',
  },
  productContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  productImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  productDetails: {
    flex: 1,
    gap: 4,
  },
  productName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  infoText: {
    fontSize: 11,
    color: '#6B7280',
    flex: 1,
  },
  statusContainer: {
    marginVertical: 4,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  quantity: {
    fontSize: 11,
    color: '#6B7280',
  },
  price: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F97316',
  },
  voucherContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
    padding: 6,
    backgroundColor: '#F0FDF4',
    borderRadius: 6,
  },
  voucherText: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '500',
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  totalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  totalLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  totalAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: 'transparent',
    gap: 4,
  },
  detailsButton: {
    borderColor: '#D1D5DB',
  },
  detailsButtonText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#6B7280',
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