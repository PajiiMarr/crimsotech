// app/customer/personal-order-listing.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Platform,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import RoleGuard from '../guards/RoleGuard';
import CustomerLayout from './CustomerLayout';
import AxiosInstance from '../../contexts/axios';

// Types based on web version
interface DeliveryInfo {
  delivery_id?: string;
  rider_name?: string;
  status?: string;
  tracking_number?: string;
  estimated_delivery?: string;
  submitted_at?: string;
  is_pending_offer?: boolean;
}

interface SellerInfo {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
}

interface OrderItem {
  id: string;
  cart_item: {
    id: string;
    product: {
      id: string;
      name: string;
      price: number;
      variant: string;
      seller?: SellerInfo;
    };
    quantity: number;
  };
  quantity: number;
  total_amount: number;
  status: string;
  created_at: string;
  is_shipped?: boolean;
  shipping_method?: string | null;
  tracking_number?: string | null;
  estimated_delivery?: string | null;
  is_processed?: boolean;
  shipping_status?: string;
  waybill_url?: string;
}

interface Order {
  order_id: string;
  buyer: {
    id: string;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    phone?: string;
  };
  status: string;
  total_amount: number;
  payment_method: string | null;
  delivery_method?: string | null;
  shipping_method?: string | null;
  delivery_address: string | null;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
  delivery_info?: DeliveryInfo;
  is_pickup?: boolean;
  is_personal_listing?: boolean;
}

interface ApiResponse {
  success: boolean;
  message: string;
  data: Order[];
  data_source: string;
  count?: number;
}

// Status badges configuration
const STATUS_CONFIG = {
  pending_shipment: { 
    label: 'Pending', 
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    icon: 'schedule'
  },
  to_ship: { 
    label: 'Processing', 
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    icon: 'schedule'
  },
  processing: {
    label: 'Processing',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    icon: 'schedule'
  },
  ready_for_pickup: { 
    label: 'Ready for Pickup', 
    color: '#3B82F6',
    bgColor: '#DBEAFE',
    icon: 'store'
  },
  shipped: { 
    label: 'Shipped', 
    color: '#3B82F6',
    bgColor: '#DBEAFE',
    icon: 'truck'
  },
  in_transit: { 
    label: 'In Transit', 
    color: '#8B5CF6',
    bgColor: '#EDE9FE',
    icon: 'truck-fast'
  },
  out_for_delivery: { 
    label: 'Out for Delivery', 
    color: '#6366F1',
    bgColor: '#E0E7FF',
    icon: 'truck-delivery'
  },
  completed: { 
    label: 'Completed', 
    color: '#10B981',
    bgColor: '#D1FAE5',
    icon: 'check-circle'
  },
  cancelled: { 
    label: 'Cancelled', 
    color: '#EF4444',
    bgColor: '#FEE2E2',
    icon: 'close-circle'
  },
  arrange_shipment: { 
    label: 'Arrange Shipment', 
    color: '#F97316',
    bgColor: '#FFEDD5',
    icon: 'handshake'
  },
  pending_offer: { 
    label: 'Pending Offer', 
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    icon: 'message'
  },
  default: { 
    label: 'Unknown', 
    color: '#6B7280',
    bgColor: '#F3F4F6',
    icon: 'help-circle'
  }
};

// Tabs configuration - fixed sizes
const STATUS_TABS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'processing', label: 'Processing' },
  { id: 'shipped', label: 'Shipped' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' }
];

export default function PersonalOrderListing() {
  const { userId } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [availableActions, setAvailableActions] = useState<Record<string, string[]>>({});
  const [loadingActions, setLoadingActions] = useState<Record<string, boolean>>({});
  const [deliveryStatuses, setDeliveryStatuses] = useState<Record<string, DeliveryInfo>>({});
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [stats, setStats] = useState({
    all: 0,
    pending: 0,
    processing: 0,
    shipped: 0,
    completed: 0,
    cancelled: 0
  });

  // Fetch orders
  const fetchOrders = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('Fetching orders for seller:', userId);
      const response = await AxiosInstance.get<ApiResponse>('/customer-order-list/order_list/', {
        params: { user_id: userId }
      });

      console.log('Orders response:', response.data);

      if (response.data.success) {
        const ordersData = response.data.data || [];
        setOrders(ordersData);
        calculateStats(ordersData);
        setAvailableActions({});
        setDeliveryStatuses({});
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      Alert.alert('Error', 'Failed to load orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [userId]);

  // Calculate stats
  const calculateStats = (ordersData: Order[]) => {
    const counts = {
      all: ordersData.length,
      pending: ordersData.filter(o => o.status?.toLowerCase() === 'pending_shipment').length,
      processing: ordersData.filter(o => o.status?.toLowerCase() === 'to_ship' || o.status?.toLowerCase() === 'processing').length,
      shipped: ordersData.filter(o => {
        const s = o.status?.toLowerCase();
        return ['shipped', 'in_transit', 'out_for_delivery', 'arrange_shipment'].includes(s || '');
      }).length,
      completed: ordersData.filter(o => o.status?.toLowerCase() === 'completed').length,
      cancelled: ordersData.filter(o => o.status?.toLowerCase() === 'cancelled').length
    };
    setStats(counts);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  // Load available actions for an order
  const loadAvailableActions = async (orderId: string) => {
    if (!userId || loadingActions[orderId]) return;
    
    setLoadingActions(prev => ({ ...prev, [orderId]: true }));
    
    try {
      const response = await AxiosInstance.get(
        `/customer-order-list/${orderId}/available_actions/`,
        { params: { user_id: userId } }
      );
      
      if (response.data.success) {
        const actions = response.data.data.available_actions || [];
        setAvailableActions(prev => ({
          ...prev,
          [orderId]: actions
        }));
      }
    } catch (error) {
      console.error('Error loading available actions:', error);
    } finally {
      setLoadingActions(prev => ({ ...prev, [orderId]: false }));
    }
  };

  // Check delivery status for orders with arrange_shipment action
  const checkDeliveryStatus = async (orderId: string) => {
    if (!userId) return;
    
    try {
      const response = await AxiosInstance.get(
        `/customer-arrange-shipment/${orderId}/check_delivery_status/`,
        { params: { user_id: userId } }
      );
      
      if (response.data.success) {
        setDeliveryStatuses(prev => ({
          ...prev,
          [orderId]: response.data.data
        }));
      }
    } catch (error) {
      const order = orders.find(o => o.order_id === orderId);
      if (order?.delivery_info) {
        setDeliveryStatuses(prev => ({
          ...prev,
          [orderId]: order.delivery_info!
        }));
      }
    }
  };

  // Load actions when component mounts
  useEffect(() => {
    if (userId && orders.length > 0) {
      orders.slice(0, 10).forEach(order => {
        if (!availableActions[order.order_id]) {
          loadAvailableActions(order.order_id);
        }
        
        if (order.status === 'arrange_shipment' || order.delivery_info?.status === 'pending_offer') {
          checkDeliveryStatus(order.order_id);
        }
      });
    }
  }, [userId, orders]);

  // Check if order has pending delivery offer
  const hasPendingDeliveryOffer = (order: Order): boolean => {
    return order.delivery_info?.status === 'pending_offer';
  };

  // Check if order has active delivery
  const hasActiveDelivery = (order: Order): boolean => {
    return !!(order.delivery_info?.delivery_id && 
             order.delivery_info?.status !== 'pending_offer');
  };

  // Check if order is for delivery (not pickup)
  const isDeliveryOrder = (order: Order): boolean => {
    const method = order.delivery_method || order.shipping_method || '';
    return !(method.toLowerCase().includes('pickup') || method.toLowerCase().includes('store'));
  };

  // Check if order is for pickup
  const isPickupOrder = (order: Order): boolean => {
    const method = order.delivery_method || order.shipping_method || '';
    return method.toLowerCase().includes('pickup') || method.toLowerCase().includes('store');
  };

  const formatBuyerName = (buyer: { first_name: string; last_name: string }) => {
    return `${buyer.first_name} ${buyer.last_name}`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return '';
    }
  };

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  };

  const toggleOrderExpansion = (orderId: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  const getFilteredOrders = () => {
    let filtered = orders;

    if (activeTab !== 'all') {
      switch (activeTab) {
        case 'pending':
          filtered = filtered.filter(order => 
            order.status?.toLowerCase() === 'pending_shipment'
          );
          break;
        case 'processing':
          filtered = filtered.filter(order => 
            order.status?.toLowerCase() === 'to_ship' || 
            order.status?.toLowerCase() === 'processing'
          );
          break;
        case 'shipped':
          filtered = filtered.filter(order => {
            const s = order.status?.toLowerCase();
            return ['shipped', 'in_transit', 'out_for_delivery', 'arrange_shipment'].includes(s || '');
          });
          break;
        case 'completed':
          filtered = filtered.filter(order => 
            order.status?.toLowerCase() === 'completed'
          );
          break;
        case 'cancelled':
          filtered = filtered.filter(order => 
            order.status?.toLowerCase() === 'cancelled'
          );
          break;
      }
    }

    return filtered;
  };

  const getStatusBadge = (status: string, order: Order) => {
    const isPickup = isPickupOrder(order);
    const hasPendingOffer = hasPendingDeliveryOffer(order);
    const hasActiveDelivery = order.delivery_info?.status === 'pending';

    let statusKey = (status || 'default').toLowerCase();

    if (hasPendingOffer) statusKey = 'pending_offer';
    else if (hasActiveDelivery && statusKey === 'arrange_shipment') statusKey = 'pending_offer';
    else if (isPickup && statusKey === 'pending_shipment') statusKey = 'ready_for_pickup';

    const config = STATUS_CONFIG[statusKey as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.default;

    return (
      <View style={[styles.statusBadge, { backgroundColor: config.bgColor }]}>
        <MaterialIcons name={config.icon as any} size={12} color={config.color} />
        <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
      </View>
    );
  };

  // Handle arrange shipment navigation
  const handleArrangeShipment = (orderId: string) => {
  router.push(`/customer/arrange-shipment?orderId=${orderId}&userId=${userId}`);
};

  // Handle view offer
  const handleViewOffer = (orderId: string) => {
    // router.push(`/customer/view-offer?orderId=${orderId}`);
  };

  // Handle prepare shipment
  const handlePrepareShipment = async (orderId: string) => {
    try {
      setLoadingActions(prev => ({ ...prev, [orderId]: true }));
      
      const response = await AxiosInstance.post(
        `/customer-order-list/${orderId}/prepare_shipment/`,
        {},
        { params: { user_id: userId } }
      );
      
      if (response.data.success) {
        Alert.alert('Success', response.data.message || 'Order prepared for shipment');
        fetchOrders();
      }
    } catch (error: any) {
      console.error('Error preparing shipment:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to prepare shipment');
    } finally {
      setLoadingActions(prev => ({ ...prev, [orderId]: false }));
    }
  };

  // Handle confirm order
  const handleConfirmOrder = async (orderId: string) => {
    try {
      const response = await AxiosInstance.patch(
        `/customer-order-list/${orderId}/update_status/`,
        { action_type: 'confirm' },
        { params: { user_id: userId } }
      );
      
      if (response.data.success) {
        Alert.alert('Success', response.data.message || 'Order confirmed');
        fetchOrders();
      }
    } catch (error: any) {
      console.error('Error confirming order:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to confirm order');
    }
  };

  // Handle cancel order
  const handleCancelOrder = async (orderId: string) => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await AxiosInstance.patch(
                `/customer-order-list/${orderId}/update_status/`,
                { action_type: 'cancel' },
                { params: { user_id: userId } }
              );
              
              if (response.data.success) {
                Alert.alert('Success', response.data.message || 'Order cancelled');
                fetchOrders();
              }
            } catch (error: any) {
              console.error('Error cancelling order:', error);
              Alert.alert('Error', error.response?.data?.message || 'Failed to cancel order');
            }
          }
        }
      ]
    );
  };

  const openActionModal = (order: Order) => {
    setSelectedOrder(order);
    setActionModalVisible(true);
  };

  const renderOrderCard = ({ item }: { item: Order }) => {
    const isExpanded = expandedOrders.has(item.order_id);
    const primaryItem = item.items[0];
    const buyerName = formatBuyerName(item.buyer);
    const isPending = item.status?.toLowerCase() === 'pending_shipment';
    const isToShip = item.status?.toLowerCase() === 'to_ship';
    const canCancel = !['cancelled', 'completed', 'refunded'].includes(item.status?.toLowerCase() || '');
    const actions = availableActions[item.order_id] || [];
    const isLoading = loadingActions[item.order_id];
    const riderAssignedPending = Boolean(item.delivery_info?.rider_name && item.delivery_info?.status === 'pending');
    const riderAcceptedProcessing = item.delivery_info?.status === 'accepted';

    return (
      <View style={styles.orderCard}>
        {/* Header */}
        <TouchableOpacity 
          style={styles.orderHeader}
          onPress={() => toggleOrderExpansion(item.order_id)}
          activeOpacity={0.7}
        >
          <View style={styles.orderHeaderLeft}>
            <MaterialIcons name="shopping-bag" size={16} color="#6B7280" />
            <View style={styles.orderInfo}>
              <Text style={styles.orderId} numberOfLines={1}>
                {item.order_id.slice(-8)}
              </Text>
              <Text style={styles.orderDate}>{formatDate(item.created_at)}</Text>
            </View>
          </View>
          <View style={styles.orderHeaderRight}>
            {getStatusBadge(item.status, item)}
            <MaterialIcons 
              name={isExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} 
              size={20} 
              color="#9CA3AF" 
            />
          </View>
        </TouchableOpacity>

        {/* Rider waiting message */}
        {activeTab === 'processing' && 
         (item.status?.toLowerCase() === 'to_ship' || item.status?.toLowerCase() === 'processing') &&
         item.delivery_info?.status === 'pending' && 
         item.delivery_info?.rider_name && (
          <View style={styles.riderWaitingCard}>
            <MaterialIcons name="motorcycle" size={16} color="#F59E0B" />
            <Text style={styles.riderWaitingText}>
              Waiting for rider {item.delivery_info.rider_name} to accept the order
            </Text>
          </View>
        )}

        {/* Rider accepted message */}
        {item.delivery_info?.status === 'accepted' && 
         (item.status?.toLowerCase() === 'to_ship' || item.status?.toLowerCase() === 'processing') && (
          <View style={styles.riderAcceptedCard}>
            <MaterialIcons name="check-circle" size={16} color="#10B981" />
            <Text style={styles.riderAcceptedText}>
              Rider will pick up the order
            </Text>
          </View>
        )}

        {/* Product Info */}
        <View style={styles.productContainer}>
          <View style={styles.productImagePlaceholder}>
            <MaterialIcons name="inventory-2" size={24} color="#9CA3AF" />
          </View>
          <View style={styles.productDetails}>
            <Text style={styles.productName} numberOfLines={1}>
              {primaryItem?.cart_item?.product?.name || 'Order Items'}
              {item.items.length > 1 && ` +${item.items.length - 1} more`}
            </Text>
            
            <View style={styles.buyerRow}>
              <MaterialIcons name="person" size={12} color="#9CA3AF" />
              <Text style={styles.buyerName} numberOfLines={1}>{buyerName}</Text>
            </View>

            <View style={styles.deliveryRow}>
              {isPickupOrder(item) ? (
                <>
                  <MaterialIcons name="store" size={12} color="#9CA3AF" />
                  <Text style={styles.deliveryText}>Pickup</Text>
                </>
              ) : (
                <>
                  <MaterialIcons name="local-shipping" size={12} color="#9CA3AF" />
                  <Text style={styles.deliveryText}>Delivery</Text>
                </>
              )}
              <Text style={styles.dot}>•</Text>
              <Text style={styles.quantityText}>
                Qty: {item.items.reduce((sum, i) => sum + i.quantity, 0)}
              </Text>
            </View>

            <View style={styles.paymentRow}>
              <Text style={styles.paymentMethod}>{item.payment_method || 'N/A'}</Text>
              <Text style={styles.totalAmount}>{formatCurrency(item.total_amount)}</Text>
            </View>
          </View>
        </View>

        {/* Product Images Preview */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
          {item.items.slice(0, 3).map((orderItem, idx) => (
            <View key={idx} style={styles.productThumb}>
              <MaterialIcons name="image" size={20} color="#9CA3AF" />
            </View>
          ))}
          {item.items.length > 3 && (
            <View style={styles.productThumb}>
              <Text style={styles.moreItemsText}>+{item.items.length - 3}</Text>
            </View>
          )}
        </ScrollView>

        {/* Expanded Details */}
        {isExpanded && (
          <View style={styles.expandedSection}>
            <View style={styles.expandedContent}>
              <Text style={styles.expandedTitle}>Buyer Details</Text>
              <View style={styles.expandedRow}>
                <Text style={styles.expandedLabel}>Name:</Text>
                <Text style={styles.expandedValue}>{buyerName}</Text>
              </View>
              <View style={styles.expandedRow}>
                <Text style={styles.expandedLabel}>Email:</Text>
                <Text style={styles.expandedValue}>{item.buyer.email}</Text>
              </View>
              {item.buyer.phone && (
                <View style={styles.expandedRow}>
                  <Text style={styles.expandedLabel}>Phone:</Text>
                  <Text style={styles.expandedValue}>{item.buyer.phone}</Text>
                </View>
              )}

              <Text style={[styles.expandedTitle, { marginTop: 12 }]}>Delivery Information</Text>
              <View style={styles.expandedRow}>
                <Text style={styles.expandedLabel}>Address:</Text>
                <Text style={styles.expandedValue}>{item.delivery_address || 'N/A'}</Text>
              </View>
              <View style={styles.expandedRow}>
                <Text style={styles.expandedLabel}>Method:</Text>
                <Text style={styles.expandedValue}>{item.delivery_method || item.shipping_method || 'N/A'}</Text>
              </View>
              {item.delivery_info?.rider_name && (
                <View style={styles.expandedRow}>
                  <Text style={styles.expandedLabel}>Rider:</Text>
                  <Text style={styles.expandedValue}>{item.delivery_info.rider_name}</Text>
                </View>
              )}
              {item.delivery_info?.tracking_number && (
                <View style={styles.expandedRow}>
                  <Text style={styles.expandedLabel}>Tracking:</Text>
                  <Text style={styles.expandedValue}>{item.delivery_info.tracking_number}</Text>
                </View>
              )}

              <Text style={[styles.expandedTitle, { marginTop: 12 }]}>Order Items</Text>
              {item.items.map((orderItem, idx) => (
                <View key={idx} style={styles.itemRow}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {orderItem.cart_item?.product?.name} x{orderItem.quantity}
                  </Text>
                  <Text style={styles.itemPrice}>{formatCurrency(orderItem.total_amount)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Pending Offer Message */}
        {item.delivery_info?.status === 'pending_offer' && (
          <View style={styles.pendingOfferCard}>
            <MaterialIcons name="message" size={16} color="#F59E0B" />
            <Text style={styles.pendingOfferText}>
              A rider will soon provide a delivery fee offer.
            </Text>
          </View>
        )}

        {/* Footer Actions */}
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.viewButton}
            onPress={() => toggleOrderExpansion(item.order_id)}
          >
            <MaterialIcons name="visibility" size={14} color="#6B7280" />
            <Text style={styles.viewButtonText}>
              {isExpanded ? 'Show Less' : 'View Details'}
            </Text>
          </TouchableOpacity>

          <View style={styles.actionButtons}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#F97316" />
            ) : (
              <>
                {/* Pending orders */}
                {isPending && (
                  <>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.confirmButton]}
                      onPress={() => handleConfirmOrder(item.order_id)}
                    >
                      <MaterialIcons name="check" size={14} color="#10B981" />
                      <Text style={styles.confirmButtonText}>Confirm</Text>
                    </TouchableOpacity>

                    {canCancel && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.cancelButton]}
                        onPress={() => handleCancelOrder(item.order_id)}
                      >
                        <MaterialIcons name="close" size={14} color="#EF4444" />
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}

                {/* To Ship orders */}
                {isToShip && (
                  <>
                    {!riderAssignedPending && !riderAcceptedProcessing && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.arrangeButton]}
                        onPress={() => handleArrangeShipment(item.order_id)}
                      >
                        <MaterialIcons name="local-shipping" size={14} color="#3B82F6" />
                        <Text style={styles.arrangeButtonText}>Arrange</Text>
                      </TouchableOpacity>
                    )}

                    {canCancel && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.cancelButton]}
                        onPress={() => handleCancelOrder(item.order_id)}
                      >
                        <MaterialIcons name="close" size={14} color="#EF4444" />
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}

                {/* Prepare Shipment action */}
                {actions.includes('prepare_shipment') && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.prepareButton]}
                    onPress={() => handlePrepareShipment(item.order_id)}
                  >
                    <MaterialIcons name="inventory-2" size={14} color="#8B5CF6" />
                    <Text style={styles.prepareButtonText}>Prepare</Text>
                  </TouchableOpacity>
                )}

                {/* Arrange Shipment action */}
                {item.status === 'arrange_shipment' && !riderAcceptedProcessing && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.arrangeButton]}
                    onPress={() => handleArrangeShipment(item.order_id)}
                  >
                    <MaterialIcons name="local-shipping" size={14} color="#3B82F6" />
                    <Text style={styles.arrangeButtonText}>Arrange</Text>
                  </TouchableOpacity>
                )}

                {/* View Offer action */}
                {actions.includes('view_offer') && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.offerButton]}
                    onPress={() => handleViewOffer(item.order_id)}
                  >
                    <MaterialIcons name="message" size={14} color="#8B5CF6" />
                    <Text style={styles.offerButtonText}>Offer</Text>
                  </TouchableOpacity>
                )}

                {/* More Actions button for mobile */}
                <TouchableOpacity
                  style={styles.moreButton}
                  onPress={() => openActionModal(item)}
                >
                  <MaterialIcons name="more-vert" size={16} color="#6B7280" />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    );
  };

  const filteredOrders = getFilteredOrders();

  if (loading && !refreshing) {
    return (
      <RoleGuard allowedRoles={['customer']}>
        <CustomerLayout
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F97316" />
            <Text style={styles.loadingText}>Loading orders...</Text>
          </View>
        </CustomerLayout>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={['customer']}>
      <CustomerLayout disableScroll={true}>
        <View style={styles.container}>
          {/* Tabs - Fixed size, no stats or search */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.tabsScroll}
            contentContainerStyle={styles.tabsContainer}
          >
            {STATUS_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const count = stats[tab.id as keyof typeof stats] || 0;

              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.tab, isActive && styles.activeTab]}
                  onPress={() => setActiveTab(tab.id)}
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

          {/* Orders List */}
          {filteredOrders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="shopping-bag" size={48} color="#E5E7EB" />
              <Text style={styles.emptyTitle}>No orders found</Text>
              <Text style={styles.emptyText}>
                {activeTab === 'all' ? 'No personal listing orders found' :
                 activeTab === 'pending' ? 'No pending orders' :
                 activeTab === 'processing' ? 'No orders to process' :
                 activeTab === 'shipped' ? 'No shipped orders' :
                 activeTab === 'completed' ? 'No completed orders' :
                 'No cancelled orders'}
              </Text>
              <TouchableOpacity style={styles.refreshButton} onPress={fetchOrders}>
                <MaterialIcons name="refresh" size={16} color="#FFFFFF" />
                <Text style={styles.refreshButtonText}>Refresh Orders</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={filteredOrders}
              renderItem={renderOrderCard}
              keyExtractor={(item) => item.order_id}
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

          {/* Action Modal */}
          <Modal
            visible={actionModalVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setActionModalVisible(false)}
          >
            <TouchableOpacity 
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setActionModalVisible(false)}
            >
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Order Actions</Text>
                  <TouchableOpacity onPress={() => setActionModalVisible(false)}>
                    <MaterialIcons name="close" size={20} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                {selectedOrder && (
                  <>
                    <TouchableOpacity 
                      style={styles.modalItem}
                      onPress={() => {
                        setActionModalVisible(false);
                        toggleOrderExpansion(selectedOrder.order_id);
                      }}
                    >
                      <MaterialIcons name="visibility" size={20} color="#3B82F6" />
                      <Text style={styles.modalItemText}>View Details</Text>
                    </TouchableOpacity>

                    {availableActions[selectedOrder.order_id]?.includes('prepare_shipment') && (
                      <TouchableOpacity 
                        style={styles.modalItem}
                        onPress={() => {
                          setActionModalVisible(false);
                          handlePrepareShipment(selectedOrder.order_id);
                        }}
                      >
                        <MaterialIcons name="inventory-2" size={20} color="#8B5CF6" />
                        <Text style={styles.modalItemText}>Prepare Shipment</Text>
                      </TouchableOpacity>
                    )}

                    {selectedOrder.status === 'arrange_shipment' && (
                      <TouchableOpacity 
                        style={styles.modalItem}
                        onPress={() => {
                          setActionModalVisible(false);
                          handleArrangeShipment(selectedOrder.order_id);
                        }}
                      >
                        <MaterialIcons name="local-shipping" size={20} color="#3B82F6" />
                        <Text style={styles.modalItemText}>Arrange Shipping</Text>
                      </TouchableOpacity>
                    )}

                    {availableActions[selectedOrder.order_id]?.includes('view_offer') && (
                      <TouchableOpacity 
                        style={styles.modalItem}
                        onPress={() => {
                          setActionModalVisible(false);
                          handleViewOffer(selectedOrder.order_id);
                        }}
                      >
                        <MaterialIcons name="message" size={20} color="#8B5CF6" />
                        <Text style={styles.modalItemText}>View Offer</Text>
                      </TouchableOpacity>
                    )}

                    {!['cancelled', 'completed', 'refunded'].includes(selectedOrder.status?.toLowerCase() || '') && (
                      <TouchableOpacity 
                        style={[styles.modalItem, styles.modalItemDelete]}
                        onPress={() => {
                          setActionModalVisible(false);
                          handleCancelOrder(selectedOrder.order_id);
                        }}
                      >
                        <MaterialIcons name="cancel" size={20} color="#EF4444" />
                        <Text style={styles.modalItemDeleteText}>Cancel Order</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>
            </TouchableOpacity>
          </Modal>
        </View>
      </CustomerLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingBottom: Platform.OS === 'ios' ? 74 : 64
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666'
  },
  tabsScroll: {
    marginTop: 16,
    marginBottom: 16,
  },
  tabsContainer: {
    paddingRight: 12,
    gap: 6,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 84,
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 0,
    backgroundColor: '#F3F4F6',
    marginRight: 6,
    gap: 4,
    height: 32, // Reduced fixed height
  },
  activeTab: {
    backgroundColor: 'transparent',
    borderBottomWidth: 3,
    borderBottomColor: '#F97316',
    borderRadius: 0,
    paddingBottom: 4,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabLabel: {
    color: '#111827',
    fontWeight: '700',
  },
  tabBadge: {
    backgroundColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 2,
    minWidth: 18,
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
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  orderHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  orderInfo: {
    flex: 1,
  },
  orderId: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  orderDate: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  orderHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  riderWaitingCard: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
    alignItems: 'center',
  },
  riderWaitingText: {
    flex: 1,
    fontSize: 11,
    color: '#92400E',
  },
  riderAcceptedCard: {
    flexDirection: 'row',
    backgroundColor: '#D1FAE5',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
    alignItems: 'center',
  },
  riderAcceptedText: {
    flex: 1,
    fontSize: 11,
    color: '#065F46',
  },
  productContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  productImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  productDetails: {
    flex: 1,
  },
  productName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  buyerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  buyerName: {
    fontSize: 11,
    color: '#6B7280',
    flex: 1,
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  deliveryText: {
    fontSize: 11,
    color: '#6B7280',
  },
  dot: {
    fontSize: 11,
    color: '#6B7280',
  },
  quantityText: {
    fontSize: 11,
    color: '#6B7280',
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentMethod: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  totalAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  imageScroll: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  productThumb: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  moreItemsText: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500',
  },
  expandedSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  expandedContent: {
    gap: 4,
  },
  expandedTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  expandedRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  expandedLabel: {
    width: 60,
    fontSize: 11,
    color: '#6B7280',
  },
  expandedValue: {
    flex: 1,
    fontSize: 11,
    color: '#111827',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  itemName: {
    flex: 1,
    fontSize: 11,
    color: '#4B5563',
    marginRight: 8,
  },
  itemPrice: {
    fontSize: 11,
    fontWeight: '500',
    color: '#111827',
  },
  pendingOfferCard: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    gap: 8,
    alignItems: 'center',
  },
  pendingOfferText: {
    flex: 1,
    fontSize: 11,
    color: '#92400E',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewButtonText: {
    fontSize: 11,
    color: '#6B7280',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  confirmButton: {
    backgroundColor: '#D1FAE5',
  },
  confirmButtonText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#10B981',
  },
  cancelButton: {
    backgroundColor: '#FEE2E2',
  },
  cancelButtonText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#EF4444',
  },
  arrangeButton: {
    backgroundColor: '#DBEAFE',
  },
  arrangeButtonText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#3B82F6',
  },
  prepareButton: {
    backgroundColor: '#EDE9FE',
  },
  prepareButtonText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#8B5CF6',
  },
  offerButton: {
    backgroundColor: '#EDE9FE',
  },
  offerButtonText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#8B5CF6',
  },
  moreButton: {
    padding: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: 16,
    paddingHorizontal: 32,
  },
  refreshButton: {
    backgroundColor: '#F97316',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '80%',
    maxWidth: 300,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  modalItemText: {
    fontSize: 14,
    color: '#374151',
  },
  modalItemDelete: {
    marginTop: 4,
  },
  modalItemDeleteText: {
    fontSize: 14,
    color: '#EF4444',
  },
});