// app/seller/orders.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import AxiosInstance from '../../contexts/axios';
import { SafeAreaView } from 'react-native-safe-area-context';

// Interfaces
interface MediaItem {
  id: string;
  url: string;
  file_type: string;
}

interface DeliveryInfo {
  delivery_id?: string;
  rider_name?: string;
  status?: string;
  tracking_number?: string;
  estimated_delivery?: string;
  submitted_at?: string;
  is_pending_offer?: boolean;
}

interface OrderItemProduct {
  id: string;
  name: string;
  price: number;
  variant: string;
  shop: {
    id: string;
    name: string;
  };
  media?: MediaItem[];
  primary_image?: MediaItem | null;
  variant_image?: string | null;
}

interface OrderItemCartItem {
  id: string;
  product: OrderItemProduct;
  quantity: number;
  variant_id?: string | null;
}

interface OrderItem {
  id: string;
  cart_item: OrderItemCartItem;
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
  user: {
    id: string;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    phone?: string;
  };
  approval: string;
  status: string;
  total_amount: number;
  payment_method: string | null;
  delivery_method?: string | null;
  shipping_method?: string | null;
  delivery_address: string | null;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
  is_pickup?: boolean;
  delivery_info?: DeliveryInfo;
  receipt_url?: string | null;
}

// Status configuration
const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: keyof typeof Ionicons.glyphMap }> = {
  pending_shipment: { label: 'Pending', color: '#f59e0b', bgColor: '#fffbeb', icon: 'time-outline' },
  to_ship: { label: 'Processing', color: '#f59e0b', bgColor: '#fffbeb', icon: 'refresh-outline' },
  processing: { label: 'Processing', color: '#f59e0b', bgColor: '#fffbeb', icon: 'refresh-outline' },
  ready_for_pickup: { label: 'Ready for Pickup', color: '#3b82f6', bgColor: '#eff6ff', icon: 'storefront-outline' },
  shipped: { label: 'Shipped', color: '#3b82f6', bgColor: '#eff6ff', icon: 'car-outline' },
  in_transit: { label: 'In Transit', color: '#8b5cf6', bgColor: '#f5f3ff', icon: 'car-outline' },
  out_for_delivery: { label: 'Out for Delivery', color: '#8b5cf6', bgColor: '#f5f3ff', icon: 'car-outline' },
  completed: { label: 'Completed', color: '#10b981', bgColor: '#ecfdf5', icon: 'checkmark-circle-outline' },
  cancelled: { label: 'Cancelled', color: '#ef4444', bgColor: '#fef2f2', icon: 'close-circle-outline' },
  arrange_shipment: { label: 'Arrange Shipment', color: '#f97316', bgColor: '#fff7ed', icon: 'hand-left-outline' },
  pending_offer: { label: 'Pending Offer', color: '#f59e0b', bgColor: '#fffbeb', icon: 'chatbubble-outline' },
  pending_approval: { label: 'Pending Approval', color: '#8b5cf6', bgColor: '#f5f3ff', icon: 'time-outline' },
  approved: { label: 'Approved', color: '#10b981', bgColor: '#ecfdf5', icon: 'checkmark-circle-outline' },
  default: { label: 'Unknown', color: '#6b7280', bgColor: '#f3f4f6', icon: 'help-circle-outline' }
};

// Tabs configuration
const STATUS_TABS = [
  { id: 'all', label: 'All', icon: 'list-outline' },
  { id: 'pending_shipment', label: 'Pending', icon: 'time-outline' },
  { id: 'to_ship', label: 'To Process', icon: 'refresh-outline' },
  { id: 'waiting_rider', label: 'Waiting Rider', icon: 'person-outline' },
  { id: 'shipped', label: 'Shipped', icon: 'car-outline' },
  { id: 'completed', label: 'Completed', icon: 'checkmark-circle-outline' },
  { id: 'cancelled', label: 'Cancelled', icon: 'close-circle-outline' }
];

export default function Orders() {
  const router = useRouter();
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  const { userId } = useAuth();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [availableActions, setAvailableActions] = useState<Record<string, string[]>>({});
  const [loadingActions, setLoadingActions] = useState<Record<string, boolean>>({});
  const [deliveryStatuses, setDeliveryStatuses] = useState<Record<string, DeliveryInfo>>({});
  const [pendingApprovalStatus, setPendingApprovalStatus] = useState<Record<string, boolean>>({});
  
  // Modal states
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [confirmationModal, setConfirmationModal] = useState({
    visible: false,
    type: 'confirm' as 'confirm' | 'cancel' | 'prepare' | null,
    orderId: null as string | null,
    title: '',
    description: '',
    confirmText: '',
  });

  useEffect(() => {
    if (shopId && userId) {
      fetchOrders();
    }
  }, [shopId, userId]);

  useEffect(() => {
    filterOrders();
  }, [searchTerm, activeTab, orders]);

  useEffect(() => {
    if (shopId && orders.length > 0) {
      // Load actions for first few orders
      const ordersToLoad = orders.slice(0, 10);
      ordersToLoad.forEach(order => {
        if (!availableActions[order.order_id]) {
          loadAvailableActions(order.order_id);
        }
      });
    }
  }, [shopId, orders]);

  const fetchOrders = async () => {
    if (!userId || !shopId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await AxiosInstance.get('/seller-order-list/order_list/', {
        params: { shop_id: shopId }
      });

      if (response.data.success) {
        setOrders(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      Alert.alert('Error', 'Failed to load orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const loadAvailableActions = async (orderId: string) => {
    if (!shopId || loadingActions[orderId]) return;
    
    setLoadingActions(prev => ({ ...prev, [orderId]: true }));
    
    try {
      const response = await AxiosInstance.get(
        `/seller-order-list/${orderId}/available_actions/`,
        { params: { shop_id: shopId } }
      );
      
      if (response.data.success) {
        const actions = response.data.data.available_actions || [];
        const isPendingApprovalFromBackend = response.data.data.is_pending_approval || false;
        
        setPendingApprovalStatus(prev => ({
          ...prev,
          [orderId]: isPendingApprovalFromBackend
        }));
        
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

  const handleUpdateStatus = async (orderId: string, actionType: string) => {
    try {
      const response = await AxiosInstance.patch(
        `/seller-order-list/${orderId}/update_status/`,
        { action_type: actionType },
        { params: { shop_id: shopId } }
      );
      
      if (response.data.success) {
        const { updated_order, updated_available_actions } = response.data.data;
        
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order.order_id === orderId 
              ? { ...updated_order, order_id: orderId }
              : order
          )
        );
        
        if (updated_available_actions) {
          setAvailableActions(prev => ({
            ...prev,
            [orderId]: updated_available_actions
          }));
        }

        // If action was 'confirm' and order is for delivery, trigger rider assignment
        if (actionType === 'confirm' && !isPickupOrder(orders.find(o => o.order_id === orderId)!)) {
          triggerRiderAssignment(orderId);
        }
        
        Alert.alert('Success', 'Order status updated successfully');
        setActionModalVisible(false);
        setConfirmationModal(prev => ({ ...prev, visible: false }));
      }
    } catch (error: any) {
      console.error('Error updating order status:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to update order status');
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      const response = await AxiosInstance.patch(
        `/seller-order-list/${orderId}/update_status/`,
        { action_type: 'cancel' },
        { params: { shop_id: shopId } }
      );
      
      if (response.data.success) {
        await fetchOrders();
        await loadAvailableActions(orderId);
        Alert.alert('Success', 'Order cancelled successfully');
        setActionModalVisible(false);
        setConfirmationModal(prev => ({ ...prev, visible: false }));
      }
    } catch (error: any) {
      console.error('Error cancelling order:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to cancel order');
    }
  };

  const handlePrepareShipment = async (orderId: string) => {
    try {
      setLoadingActions(prev => ({ ...prev, [orderId]: true }));
      
      const response = await AxiosInstance.post(
        `/seller-order-list/${orderId}/prepare_shipment/`,
        {},
        { params: { shop_id: shopId } }
      );
      
      if (response.data.success) {
        const { updated_order, updated_available_actions } = response.data.data;
        
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order.order_id === orderId 
              ? { ...updated_order, order_id: orderId }
              : order
          )
        );
        
        if (updated_available_actions) {
          setAvailableActions(prev => ({
            ...prev,
            [orderId]: updated_available_actions
          }));
        }
        
        Alert.alert('Success', response.data.message || 'Order prepared for shipment');
        setActionModalVisible(false);
        setConfirmationModal(prev => ({ ...prev, visible: false }));
      }
    } catch (error: any) {
      console.error('Error preparing shipment:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to prepare shipment');
    } finally {
      setLoadingActions(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const triggerRiderAssignment = async (orderId: string) => {
    try {
      await AxiosInstance.post('/seller-order-list/assign_deliveries/', {}, {
        params: { order_id: orderId }
      });
      
      // Check responses after delay
      setTimeout(async () => {
        try {
          await AxiosInstance.post('/seller-order-list/check_delivery_responses/', {}, {
            params: { order_id: orderId }
          });
        } catch (error) {
          console.error('Error checking delivery responses:', error);
        }
      }, 2000);
    } catch (error) {
      console.error('Error triggering rider assignment:', error);
    }
  };

  const filterOrders = () => {
    let filtered = orders.filter(order => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      const customerName = `${order.user.first_name} ${order.user.last_name}`.toLowerCase();
      
      return (
        customerName.includes(searchLower) ||
        order.order_id.toLowerCase().includes(searchLower) ||
        order.user.email.toLowerCase().includes(searchLower) ||
        order.items.some(item => 
          item.cart_item?.product?.name?.toLowerCase().includes(searchLower)
        )
      );
    });

    if (activeTab !== 'all') {
      switch (activeTab) {
        case 'pending_shipment':
          filtered = filtered.filter(order => 
            order.status?.toLowerCase() === 'pending_shipment'
          );
          break;
        case 'to_ship':
          filtered = filtered.filter(order => 
            order.status?.toLowerCase() === 'to_ship'
          );
          break;
        case 'waiting_rider':
          filtered = filtered.filter(order => isWaitingForRider(order));
          break;
        case 'shipped':
          filtered = filtered.filter(order => {
            const s = order.status?.toLowerCase();
            return ['shipped', 'in_transit', 'out_for_delivery'].includes(s || '');
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

    setFilteredOrders(filtered);
  };

  const formatCustomerName = (user: Order['user']) => {
    return `${user.first_name} ${user.last_name}`.trim() || user.username;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-PH', {
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

  const isPickupOrder = (order: Order) => {
    return order.is_pickup === true;
  };

  const isDeliveryOrder = (order: Order) => {
    const method = order.delivery_method || order.shipping_method || '';
    return !method?.toLowerCase().includes('pickup');
  };

  const isPendingApproval = (order: Order): boolean => {
    return order.approval?.toLowerCase() === 'pending' && order.receipt_url !== null;
  };

  const isApproved = (order: Order): boolean => {
    return order.approval?.toLowerCase() === 'accepted';
  };

  const isCancelledOrder = (order: Order) => {
    return order.status?.toLowerCase() === 'cancelled';
  };

  const hasPendingDeliveryOffer = (order: Order): boolean => {
    return order.delivery_info?.status === 'pending_offer';
  };

  const isWaitingForRider = (order: Order): boolean => {
    return order.status?.toLowerCase() === 'to_ship' && 
           order.delivery_info?.status === 'pending_offer' &&
           !!order.delivery_info?.rider_name;
  };

  const getStatusBadge = (status: string, order: Order) => {
    const isPickup = isPickupOrder(order);
    const hasPendingOffer = hasPendingDeliveryOffer(order);
    const pendingApproval = pendingApprovalStatus[order.order_id] || isPendingApproval(order);
    const approved = isApproved(order);

    let statusKey = (status || 'default').toLowerCase();

    if (hasPendingOffer) statusKey = 'pending_offer';
    else if (isPickup && statusKey === 'pending_shipment') statusKey = 'ready_for_pickup';
    else if (pendingApproval) statusKey = 'pending_approval';
    else if (approved) statusKey = 'approved';

    const config = STATUS_CONFIG[statusKey] || STATUS_CONFIG.default;

    return (
      <View style={[styles.statusBadge, { backgroundColor: config.bgColor }]}>
        <Ionicons name={config.icon} size={10} color={config.color} />
        <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
      </View>
    );
  };

  const getProductImageUrl = (item: OrderItem): string => {
    if (item.cart_item?.product?.variant_image) {
      return item.cart_item.product.variant_image;
    }
    if (item.cart_item?.product?.primary_image?.url) {
      return item.cart_item.product.primary_image.url;
    }
    if (item.cart_item?.product?.media && item.cart_item.product.media.length > 0) {
      return item.cart_item.product.media[0].url;
    }
    return 'https://via.placeholder.com/100';
  };

  const getBorderColor = (order: Order): string => {
    const pendingApproval = pendingApprovalStatus[order.order_id] || isPendingApproval(order);
    const approved = isApproved(order);
    const waitingForRider = isWaitingForRider(order);
    const isPickup = isPickupOrder(order);
    const hasPendingOffer = hasPendingDeliveryOffer(order);
    const isCancelled = isCancelledOrder(order);

    let statusKey = (order.status || 'default').toLowerCase();

    if (hasPendingOffer) statusKey = 'pending_offer';
    else if (waitingForRider) statusKey = 'pending_offer';
    else if (isPickup && statusKey === 'pending_shipment') statusKey = 'ready_for_pickup';
    else if (pendingApproval) statusKey = 'pending_approval';
    else if (approved) statusKey = 'approved';
    else if (isCancelled) statusKey = 'cancelled';

    const config = STATUS_CONFIG[statusKey] || STATUS_CONFIG.default;
    return config.color;
  };

  const counts = {
    all: orders.length,
    pending_shipment: orders.filter(o => o.status?.toLowerCase() === 'pending_shipment').length,
    to_ship: orders.filter(o => o.status?.toLowerCase() === 'to_ship').length,
    waiting_rider: orders.filter(o => isWaitingForRider(o)).length,
    shipped: orders.filter(o => {
      const s = o.status?.toLowerCase();
      return ['shipped', 'in_transit', 'out_for_delivery'].includes(s || '');
    }).length,
    completed: orders.filter(o => o.status?.toLowerCase() === 'completed').length,
    cancelled: orders.filter(o => o.status?.toLowerCase() === 'cancelled').length,
    pending_approval: orders.filter(o => pendingApprovalStatus[o.order_id] || isPendingApproval(o)).length
  };

  const ActionModal = () => {
    const order = selectedOrder;
    if (!order) return null;

    const isCancelled = isCancelledOrder(order);
    const isPickup = isPickupOrder(order);
    const actions = availableActions[order.order_id] || [];
    const isLoading = loadingActions[order.order_id];
    const pendingApproval = pendingApprovalStatus[order.order_id] || isPendingApproval(order);
    const approved = isApproved(order);
    const isPending = order.status?.toLowerCase() === 'pending_shipment' && !pendingApproval;
    const canCancel = !isCancelled && !['cancelled', 'completed', 'refunded'].includes(order.status?.toLowerCase() || '');

    return (
      <Modal
        visible={actionModalVisible}
        transparent
        animationType="slide"
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
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.actionList}>
              {/* View Details */}
              <TouchableOpacity 
                style={styles.actionItem}
                onPress={() => {
                  setActionModalVisible(false);
                  // router.push(`/seller/order/${order.order_id}?shopId=${shopId}`);
                }}
              >
                <Ionicons name="eye-outline" size={20} color="#3b82f6" />
                <Text style={styles.actionItemText}>View Details</Text>
              </TouchableOpacity>

              {/* View Receipt */}
              {pendingApproval && order.receipt_url && (
                <TouchableOpacity 
                  style={styles.actionItem}
                  onPress={() => {
                    setActionModalVisible(false);
                    Linking.openURL(order.receipt_url!);
                  }}
                >
                  <Ionicons name="receipt-outline" size={20} color="#8b5cf6" />
                  <Text style={styles.actionItemText}>View Receipt</Text>
                </TouchableOpacity>
              )}

              {/* Confirm Button - for pending orders */}
              {isPending && (
                <TouchableOpacity 
                  style={styles.actionItem}
                  onPress={() => {
                    setActionModalVisible(false);
                    setConfirmationModal({
                      visible: true,
                      type: 'confirm',
                      orderId: order.order_id,
                      title: 'Confirm Order',
                      description: 'Are you sure you want to confirm this order?',
                      confirmText: 'Yes, Confirm'
                    });
                  }}
                >
                  <Ionicons name="checkmark-circle-outline" size={20} color="#10b981" />
                  <Text style={styles.actionItemText}>Confirm Order</Text>
                </TouchableOpacity>
              )}

              {/* Prepare Shipment */}
              {actions.includes('prepare_shipment') && !pendingApproval && (
                <TouchableOpacity 
                  style={styles.actionItem}
                  onPress={() => {
                    setActionModalVisible(false);
                    setConfirmationModal({
                      visible: true,
                      type: 'prepare',
                      orderId: order.order_id,
                      title: 'Prepare Shipment',
                      description: 'Prepare this order for shipment?',
                      confirmText: 'Yes, Prepare'
                    });
                  }}
                >
                  <Ionicons name="cube-outline" size={20} color="#3b82f6" />
                  <Text style={styles.actionItemText}>Prepare Shipment</Text>
                </TouchableOpacity>
              )}

              {/* Cancel Order */}
              {canCancel && !pendingApproval && (
                <TouchableOpacity 
                  style={[styles.actionItem, styles.actionItemDestructive]}
                  onPress={() => {
                    setActionModalVisible(false);
                    setConfirmationModal({
                      visible: true,
                      type: 'cancel',
                      orderId: order.order_id,
                      title: 'Cancel Order',
                      description: 'Are you sure you want to cancel this order? This action cannot be undone.',
                      confirmText: 'Yes, Cancel'
                    });
                  }}
                >
                  <Ionicons name="close-circle-outline" size={20} color="#ef4444" />
                  <Text style={[styles.actionItemText, styles.actionItemTextDestructive]}>Cancel Order</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  const ConfirmationModal = () => (
    <Modal
      visible={confirmationModal.visible}
      transparent
      animationType="fade"
      onRequestClose={() => setConfirmationModal(prev => ({ ...prev, visible: false }))}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setConfirmationModal(prev => ({ ...prev, visible: false }))}
      >
        <View style={[styles.modalContent, styles.confirmationModal]}>
          <Text style={styles.confirmationTitle}>{confirmationModal.title}</Text>
          <Text style={styles.confirmationDescription}>{confirmationModal.description}</Text>
          
          <View style={styles.confirmationButtons}>
            <TouchableOpacity
              style={[styles.confirmationButton, styles.cancelButton]}
              onPress={() => setConfirmationModal(prev => ({ ...prev, visible: false }))}
            >
              <Text style={styles.cancelButtonText}>No, Keep</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.confirmationButton, styles.confirmButton]}
              onPress={() => {
                if (confirmationModal.type === 'confirm' && confirmationModal.orderId) {
                  handleUpdateStatus(confirmationModal.orderId, 'confirm');
                } else if (confirmationModal.type === 'cancel' && confirmationModal.orderId) {
                  handleCancelOrder(confirmationModal.orderId);
                } else if (confirmationModal.type === 'prepare' && confirmationModal.orderId) {
                  handlePrepareShipment(confirmationModal.orderId);
                }
              }}
            >
              <Text style={styles.confirmButtonText}>{confirmationModal.confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  if (!shopId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Ionicons name="cart-outline" size={64} color="#E2E8F0" />
          <Text style={styles.noShopTitle}>No Shop Selected</Text>
          <Text style={styles.noShopText}>Select a shop to view orders</Text>
          <TouchableOpacity 
            style={styles.shopButton}
            onPress={() => router.push('/customer/shops')}
          >
            <Text style={styles.shopButtonText}>Choose Shop</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
        }
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Order Management</Text>
              <Text style={styles.subtitle}>Manage customer orders and shipments</Text>
            </View>
          </View>

          {/* Pending Approval Notice */}
          {counts.pending_approval > 0 && (
            <View style={styles.pendingApprovalNotice}>
              <Ionicons name="time-outline" size={16} color="#8b5cf6" />
              <Text style={styles.pendingApprovalText}>
                {counts.pending_approval} order(s) pending admin approval
              </Text>
            </View>
          )}

          {/* Stats Cards */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{counts.all}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: '#f59e0b' }]}>{counts.pending_shipment}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: '#f59e0b' }]}>{counts.to_ship}</Text>
                <Text style={styles.statLabel}>To Process</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: '#f97316' }]}>{counts.waiting_rider}</Text>
                <Text style={styles.statLabel}>Waiting Rider</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: '#3b82f6' }]}>{counts.shipped}</Text>
                <Text style={styles.statLabel}>Shipped</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: '#10b981' }]}>{counts.completed}</Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>
            </View>
          </ScrollView>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={18} color="#94A3B8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search orders by ID, customer, or product..."
                placeholderTextColor="#94A3B8"
                value={searchTerm}
                onChangeText={setSearchTerm}
              />
              {searchTerm ? (
                <TouchableOpacity onPress={() => setSearchTerm('')}>
                  <Ionicons name="close-circle" size={16} color="#94A3B8" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* Tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
            <View style={styles.tabsContainer}>
              {STATUS_TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                const count = counts[tab.id as keyof typeof counts] || 0;

                return (
                  <TouchableOpacity
                    key={tab.id}
                    style={[
                      styles.tabButton,
                      isActive && styles.tabButtonActive
                    ]}
                    onPress={() => setActiveTab(tab.id)}
                  >
                    <Ionicons 
                      name={tab.icon as any} 
                      size={14} 
                      color={isActive ? '#3b82f6' : '#64748B'} 
                    />
                    <Text style={[
                      styles.tabText,
                      isActive && styles.tabTextActive
                    ]}>
                      {tab.label}
                    </Text>
                    {count > 0 && (
                      <View style={[
                        styles.tabBadge,
                        isActive && styles.tabBadgeActive
                      ]}>
                        <Text style={[
                          styles.tabBadgeText,
                          isActive && styles.tabBadgeTextActive
                        ]}>{count}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Orders List */}
          <View style={styles.listContainer}>
            {filteredOrders.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="cart-outline" size={48} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>No orders found</Text>
                <Text style={styles.emptyText}>
                  {activeTab === 'all' ? 'No orders found' :
                   activeTab === 'pending_shipment' ? 'No pending orders' :
                   activeTab === 'to_ship' ? 'No orders to process' :
                   activeTab === 'waiting_rider' ? 'No orders waiting for rider' :
                   activeTab === 'shipped' ? 'No shipped orders' :
                   activeTab === 'completed' ? 'No completed orders' :
                   'No cancelled orders'}
                </Text>
              </View>
            ) : (
              filteredOrders.map((order) => {
                const isExpanded = expandedOrders.has(order.order_id);
                const primaryItem = order.items[0];
                const customerName = formatCustomerName(order.user);
                const pendingApproval = pendingApprovalStatus[order.order_id] || isPendingApproval(order);
                const waitingForRider = isWaitingForRider(order);
                const borderColor = getBorderColor(order);
                const isPending = order.status?.toLowerCase() === 'pending_shipment' && !pendingApproval;

                return (
                  <TouchableOpacity
                    key={order.order_id}
                    style={[styles.orderCard, { borderLeftColor: borderColor, borderLeftWidth: 4 }]}
                    onPress={() => {
                      setSelectedOrder(order);
                      setActionModalVisible(true);
                    }}
                    activeOpacity={0.7}
                  >
                    {/* Status Note */}
                    {waitingForRider && (
                      <View style={styles.statusNote}>
                        <Ionicons name="person-outline" size={12} color="#f97316" />
                        <Text style={styles.statusNoteText}>
                          Waiting for rider {order.delivery_info?.rider_name} to accept
                        </Text>
                      </View>
                    )}

                    {pendingApproval && (
                      <View style={[styles.statusNote, styles.pendingApprovalNote]}>
                        <Ionicons name="time-outline" size={12} color="#8b5cf6" />
                        <Text style={[styles.statusNoteText, { color: '#8b5cf6' }]}>
                          Pending admin approval
                        </Text>
                      </View>
                    )}

                    {/* Header */}
                    <View style={styles.orderHeader}>
                      <View style={styles.orderHeaderLeft}>
                        <View style={styles.orderIdContainer}>
                          <Ionicons name="cube-outline" size={14} color="#64748B" />
                          <Text style={styles.orderId} numberOfLines={1}>
                            {primaryItem?.cart_item?.product?.name || 'Order Items'}
                            {order.items.length > 1 && ` +${order.items.length - 1} more`}
                          </Text>
                        </View>
                        <View style={styles.orderMeta}>
                          <Text style={styles.orderIdText}>{order.order_id.slice(0, 8)}</Text>
                          <Text style={styles.metaDot}>•</Text>
                          <Text style={styles.orderDate}>{formatDate(order.created_at)}</Text>
                        </View>
                      </View>
                      {getStatusBadge(order.status, order)}
                    </View>

                    {/* Customer Info */}
                    <View style={styles.customerInfo}>
                      <Ionicons name="person-outline" size={10} color="#64748B" />
                      <Text style={styles.customerName}>{customerName}</Text>
                    </View>

                    {/* Delivery Method */}
                    <View style={styles.deliveryInfo}>
                      {isPickupOrder(order) ? (
                        <>
                          <Ionicons name="storefront-outline" size={10} color="#64748B" />
                          <Text style={styles.deliveryText}>Pickup</Text>
                        </>
                      ) : (
                        <>
                          <Ionicons name="car-outline" size={10} color="#64748B" />
                          <Text style={styles.deliveryText}>Delivery</Text>
                        </>
                      )}
                      <Text style={styles.metaDot}>•</Text>
                      <Text style={styles.quantityText}>
                        Qty: {order.items.reduce((sum, item) => sum + item.quantity, 0)}
                      </Text>
                    </View>

                    {/* Payment and Total */}
                    <View style={styles.paymentRow}>
                      <Text style={styles.paymentMethod}>{order.payment_method || 'N/A'}</Text>
                      <Text style={styles.totalAmount}>{formatCurrency(order.total_amount)}</Text>
                    </View>

                    {/* Product Images */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesScroll}>
                      <View style={styles.imagesContainer}>
                        {order.items.slice(0, 5).map((item, idx) => (
                          <View key={idx} style={styles.productImageWrapper}>
                            <Image 
                              source={{ uri: getProductImageUrl(item) }}
                              style={styles.productImage}
                              onError={(e) => {
                                // Fallback to placeholder on error
                                const target = e.target as any;
                                target.src = 'https://via.placeholder.com/100';
                              }}
                            />
                          </View>
                        ))}
                        {order.items.length > 5 && (
                          <View style={styles.moreProductsBadge}>
                            <Text style={styles.moreProductsText}>+{order.items.length - 5}</Text>
                          </View>
                        )}
                      </View>
                    </ScrollView>

                    {/* Footer with action hint */}
                    <View style={styles.cardFooter}>
                      <Text style={styles.tapHint}>Tap for more actions</Text>
                      <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>

      {/* Modals */}
      <ActionModal />
      <ConfirmationModal />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  pendingApprovalNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f3ff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    gap: 6,
  },
  pendingApprovalText: {
    fontSize: 11,
    color: '#8b5cf6',
    fontWeight: '500',
  },
  statsScroll: {
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    minWidth: 70,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 9,
    color: '#6B7280',
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
    padding: 0,
  },
  tabsScroll: {
    marginBottom: 16,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 4,
  },
  tabButtonActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  tabText: {
    fontSize: 11,
    color: '#64748B',
  },
  tabTextActive: {
    color: '#3b82f6',
    fontWeight: '500',
  },
  tabBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 16,
    alignItems: 'center',
  },
  tabBadgeActive: {
    backgroundColor: '#3b82f6',
  },
  tabBadgeText: {
    fontSize: 8,
    color: '#475569',
  },
  tabBadgeTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    gap: 12,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statusNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff7ed',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
    gap: 4,
  },
  pendingApprovalNote: {
    backgroundColor: '#f5f3ff',
  },
  statusNoteText: {
    fontSize: 10,
    color: '#f97316',
    flex: 1,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  orderHeaderLeft: {
    flex: 1,
    marginRight: 8,
  },
  orderIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  orderId: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  orderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  orderIdText: {
    fontSize: 10,
    color: '#6B7280',
  },
  metaDot: {
    fontSize: 10,
    color: '#6B7280',
  },
  orderDate: {
    fontSize: 10,
    color: '#6B7280',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 2,
  },
  statusText: {
    fontSize: 8,
    fontWeight: '500',
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  customerName: {
    fontSize: 10,
    color: '#4B5563',
  },
  deliveryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  deliveryText: {
    fontSize: 10,
    color: '#4B5563',
  },
  quantityText: {
    fontSize: 10,
    color: '#4B5563',
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentMethod: {
    fontSize: 10,
    color: '#6B7280',
  },
  totalAmount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  imagesScroll: {
    marginBottom: 8,
  },
  imagesContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  productImageWrapper: {
    width: 40,
    height: 40,
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  productImage: {
    width: 40,
    height: 40,
  },
  moreProductsBadge: {
    width: 40,
    height: 40,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreProductsText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4B5563',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  tapHint: {
    fontSize: 10,
    color: '#94A3B8',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  noShopTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 6,
  },
  noShopText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
    textAlign: 'center',
  },
  shopButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  shopButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  confirmationModal: {
    margin: 20,
    borderRadius: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  actionList: {
    gap: 8,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 12,
  },
  actionItemText: {
    fontSize: 14,
    color: '#111827',
  },
  actionItemDestructive: {
    marginTop: 4,
  },
  actionItemTextDestructive: {
    color: '#ef4444',
  },
  confirmationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  confirmationDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  confirmationButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmationButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  confirmButton: {
    backgroundColor: '#3b82f6',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});