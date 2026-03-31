// app/seller/view-order.tsx
import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Modal,
  Platform,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import AxiosInstance from '../../contexts/axios';

const { width } = Dimensions.get('window');

// Interfaces
interface MediaItem {
  id: string;
  url: string;
  file_type: string;
}
interface OrderItemProduct {
  id: string;
  name: string;
  price: number;
  variant: string;
  shop: { id: string; name: string };
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
interface DeliveryInfo {
  delivery_id?: string;
  rider_name?: string;
  rider_phone?: string;
  status?: string;
  tracking_number?: string;
  estimated_delivery?: string;
  submitted_at?: string;
  is_pending_offer?: boolean;
}
interface ShippingAddress {
  id: string;
  recipient_name: string;
  recipient_phone: string;
  full_address: string;
  instructions?: string;
}
interface OrderDetails {
  order_id: string;
  user: {
    id: string;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    contact_number?: string;
  };
  status: string;
  total_amount: number;
  payment_method: string | null;
  delivery_method: string | null;
  delivery_address: string | null;
  shipping_address?: ShippingAddress | null;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  items: OrderItem[];
  delivery_info?: DeliveryInfo;
  pickup_date?: string;
}

// Status configuration — covers full delivery + pickup flow
const getStatusConfig = (status: string) => {
  const normalizedStatus = status?.toLowerCase() || 'default';

  const configs: Record<string, {
    label: string; color: string; bgColor: string; icon: string; description: string;
  }> = {
    pending_shipment: {
      label: 'Pending',
      color: '#F97316', bgColor: '#FFF7ED', icon: 'time-outline',
      description: 'Order placed and awaiting your confirmation. Review and confirm to start processing.',
    },
    processing: {
      label: 'Processing',
      color: '#3B82F6', bgColor: '#EFF6FF', icon: 'refresh-outline',
      description: 'Order confirmed. Prepare the items for shipment or pickup.',
    },
    ready_to_ship: {
      label: 'Ready to Ship',
      color: '#3B82F6', bgColor: '#EFF6FF', icon: 'cube-outline',
      description: 'Items are packed and ready. Arrange shipment to assign a rider.',
    },
    waiting_for_rider: {
      label: 'Waiting for Rider',
      color: '#F97316', bgColor: '#FFF7ED', icon: 'person-outline',
      description: 'Waiting for a rider to accept the delivery assignment.',
    },
    shipped: {
      label: 'Shipped',
      color: '#3B82F6', bgColor: '#EFF6FF', icon: 'car-outline',
      description: 'Order picked up by rider and on the way.',
    },
    to_deliver: {
      label: 'Out for Delivery',
      color: '#8B5CF6', bgColor: '#F5F3FF', icon: 'car-outline',
      description: 'Rider is on the way to deliver to the customer.',
    },
    delivered: {
      label: 'Delivered',
      color: '#10B981', bgColor: '#ECFDF5', icon: 'checkmark-circle-outline',
      description: 'Order delivered. Mark as complete to finalize.',
    },
    completed: {
      label: 'Completed',
      color: '#10B981', bgColor: '#ECFDF5', icon: 'checkmark-circle-outline',
      description: 'Order successfully completed. Thank you!',
    },
    ready_for_pickup: {
      label: 'Ready for Pickup',
      color: '#3B82F6', bgColor: '#EFF6FF', icon: 'storefront-outline',
      description: 'Order is ready at your store. Customer has been notified.',
    },
    picked_up: {
      label: 'Picked Up',
      color: '#10B981', bgColor: '#ECFDF5', icon: 'checkmark-circle-outline',
      description: 'Customer has collected the order. Mark as complete to finalize.',
    },
    cancelled: {
      label: 'Cancelled',
      color: '#EF4444', bgColor: '#FEF2F2', icon: 'close-circle-outline',
      description: 'This order has been cancelled. No further action required.',
    },
    default: {
      label: 'Unknown',
      color: '#6B7280', bgColor: '#F3F4F6', icon: 'help-circle-outline',
      description: 'Unable to determine order status.',
    },
  };

  return configs[normalizedStatus] || configs.default;
};

export default function SellerViewOrder() {
  const router = useRouter();
  const { orderId, shopId } = useLocalSearchParams<{ orderId: string; shopId: string }>();
  const { userId } = useAuth();

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [availableActions, setAvailableActions] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedAction, setSelectedAction] = useState<{
    type: string; title: string; description: string;
  } | null>(null);

  useEffect(() => {
    if (orderId && shopId) {
      fetchOrderDetails();
      fetchAvailableActions();
    }
  }, [orderId, shopId]);

  const fetchOrderDetails = async () => {
    if (!orderId || !shopId) return;
    try {
      const response = await AxiosInstance.get('/seller-order-list/seller_view_order/', {
        params: { order_id: orderId, shop_id: shopId },
      });
      if (response.data.success) {
        setOrder(response.data.data);
      } else {
        Alert.alert('Error', response.data.message || 'Failed to load order details');
      }
    } catch (error: any) {
      console.error('Error fetching order details:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to load order details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchAvailableActions = async () => {
    if (!orderId || !shopId) return;
    try {
      const response = await AxiosInstance.get(
        `/seller-order-list/${orderId}/available_actions/`,
        { params: { shop_id: shopId } },
      );
      if (response.data.success) {
        setAvailableActions(response.data.data.available_actions || []);
      }
    } catch (error) {
      console.error('Error fetching available actions:', error);
    }
  };

  const handleUpdateStatus = async (actionType: string) => {
    setProcessing(true);
    try {
      const response = await AxiosInstance.patch(
        `/seller-order-list/${orderId}/update_status/`,
        { action_type: actionType },
        { params: { shop_id: shopId } },
      );
      if (response.data.success) {
        Alert.alert('Success', response.data.message || 'Order status updated successfully');
        await fetchOrderDetails();
        await fetchAvailableActions();
        setShowConfirmation(false);
      } else {
        Alert.alert('Error', response.data.message || 'Failed to update order');
      }
    } catch (error: any) {
      console.error('Error updating order:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to update order');
    } finally {
      setProcessing(false);
    }
  };

  const showActionConfirmation = (actionType: string, title: string, description: string) => {
    setSelectedAction({ type: actionType, title, description });
    setShowConfirmation(true);
  };

  const executeAction = () => {
    if (!selectedAction) return;
    handleUpdateStatus(selectedAction.type);
  };

  // Purely driven by availableActions from backend
  const getActionButtons = () => {
    if (!order) return {
      showConfirm: false,
      showCancel: false,
      showReadyToShip: false,
      showArrangeShipment: false,
      showReadyForPickup: false,
      showPickedUp: false,
      showToDeliver: false,
      showDelivered: false,
      showComplete: false,
    };

    return {
      showConfirm:          availableActions.includes('confirm'),
      showCancel:           availableActions.includes('cancel'),
      showReadyToShip:      availableActions.includes('ready_to_ship'),
      showArrangeShipment:  availableActions.includes('arrange_shipment'),
      showReadyForPickup:   availableActions.includes('ready_for_pickup'),
      showPickedUp:         availableActions.includes('picked_up'),
      showToDeliver:        availableActions.includes('to_deliver'),
      showDelivered:        availableActions.includes('delivered'),
      showComplete:         availableActions.includes('complete'),
    };
  };

  const formatCurrency = (amount: number) =>
    `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

  const formatFullDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-PH', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return 'N/A';
    }
  };

  const getProductImageUrl = (item: OrderItem): string => {
    if (item.cart_item?.product?.variant_image) return item.cart_item.product.variant_image;
    if (item.cart_item?.product?.primary_image?.url) return item.cart_item.product.primary_image.url;
    if (item.cart_item?.product?.media && item.cart_item.product.media.length > 0)
      return item.cart_item.product.media[0].url;
    return 'https://via.placeholder.com/80';
  };

  const renderStatusCard = () => {
    if (!order) return null;
    const config = getStatusConfig(order.status);
    return (
      <View style={[styles.statusCard, { backgroundColor: config.bgColor, borderLeftColor: config.color }]}>
        <View style={styles.statusCardHeader}>
          <View style={styles.statusRow}>
            <Ionicons name={config.icon as any} size={22} color={config.color} />
            <Text style={[styles.statusCardTitle, { color: config.color }]}>
              {config.label}
            </Text>
          </View>
        </View>
        <Text style={styles.statusCardDescription}>{config.description}</Text>
      </View>
    );
  };

  const renderRiderInfo = () => {
    // Check delivery_info from order response
    const riderName = order?.delivery_info?.rider_name;
    const riderPhone = order?.delivery_info?.rider_phone;
    const deliveryStatus = order?.delivery_info?.status;
    
    if (!riderName && !deliveryStatus) return null;
    
    return (
      <View style={styles.infoCard}>
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons name="motorbike" size={20} color="#111827" />
          <Text style={styles.cardTitle}>Rider Information</Text>
        </View>
        <View style={styles.cardContent}>
          {riderName ? (
            <>
              <View style={styles.riderInfoRow}>
                <Ionicons name="person-outline" size={16} color="#6B7280" />
                <Text style={styles.riderName}>{riderName}</Text>
              </View>
              {riderPhone && (
                <View style={styles.riderInfoRow}>
                  <Ionicons name="call-outline" size={16} color="#6B7280" />
                  <Text style={styles.riderPhone}>{riderPhone}</Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.riderInfoRow}>
              <Ionicons name="time-outline" size={16} color="#F97316" />
              <Text style={styles.waitingText}>Waiting for rider assignment...</Text>
            </View>
          )}
          {deliveryStatus && (
            <View style={styles.deliveryStatusRow}>
              <MaterialCommunityIcons name="truck-fast" size={16} color="#3B82F6" />
              <Text style={styles.deliveryStatusText}>
                Status: {deliveryStatus.charAt(0).toUpperCase() + deliveryStatus.slice(1)}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderActionButtons = () => {
    const isCompleted = order?.status === 'completed';
    const isCancelled = order?.status === 'cancelled';
    if (isCompleted || isCancelled) return null;

    const {
      showConfirm, showCancel, showReadyToShip, showArrangeShipment,
      showReadyForPickup, showPickedUp, showToDeliver, showDelivered, showComplete,
    } = getActionButtons();

    const hasAnyAction = showConfirm || showCancel || showReadyToShip ||
      showArrangeShipment || showReadyForPickup || showPickedUp ||
      showToDeliver || showDelivered || showComplete;

    if (!hasAnyAction) return null;

    return (
      <View style={styles.stickyFooter}>
        <View style={styles.buttonContainer}>

          {/* --- DELIVERY FLOW --- */}
          {showConfirm && (
            <TouchableOpacity
              style={[styles.actionButton, styles.confirmButton]}
              onPress={() => showActionConfirmation(
                'confirm', 'Confirm Order', 'Confirm this order and start processing?'
              )}
              disabled={processing}
            >
              <Text style={styles.actionButtonText}>Confirm Order</Text>
            </TouchableOpacity>
          )}

          {showReadyToShip && (
            <TouchableOpacity
              style={[styles.actionButton, styles.readyToShipButton]}
              onPress={() => showActionConfirmation(
                'ready_to_ship', 'Ready to Ship', 'Mark this order as ready to ship?'
              )}
              disabled={processing}
            >
              <Text style={styles.actionButtonText}>Ready to Ship</Text>
            </TouchableOpacity>
          )}

          {showArrangeShipment && (
            <TouchableOpacity
              style={[styles.actionButton, styles.readyToShipButton]}
              onPress={() => showActionConfirmation(
                'arrange_shipment', 'Arrange Shipment',
                'Assign riders for this delivery? Nearby riders will be notified.'
              )}
              disabled={processing}
            >
              <Text style={styles.actionButtonText}>Arrange Shipment</Text>
            </TouchableOpacity>
          )}

          {showToDeliver && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#8B5CF6' }]}
              onPress={() => showActionConfirmation(
                'to_deliver', 'Out for Delivery', 'Mark this order as out for delivery?'
              )}
              disabled={processing}
            >
              <Text style={styles.actionButtonText}>Out for Delivery</Text>
            </TouchableOpacity>
          )}

          {showDelivered && (
            <TouchableOpacity
              style={[styles.actionButton, styles.confirmButton]}
              onPress={() => showActionConfirmation(
                'delivered', 'Mark Delivered', 'Confirm this order has been delivered to the customer?'
              )}
              disabled={processing}
            >
              <Text style={styles.actionButtonText}>Mark Delivered</Text>
            </TouchableOpacity>
          )}

          {/* --- PICKUP FLOW --- */}
          {showReadyForPickup && (
            <TouchableOpacity
              style={[styles.actionButton, styles.readyToShipButton]}
              onPress={() => showActionConfirmation(
                'ready_for_pickup', 'Ready for Pickup',
                'Notify the customer their order is ready for pickup?'
              )}
              disabled={processing}
            >
              <Text style={styles.actionButtonText}>Ready for Pickup</Text>
            </TouchableOpacity>
          )}

          {showPickedUp && (
            <TouchableOpacity
              style={[styles.actionButton, styles.confirmButton]}
              onPress={() => showActionConfirmation(
                'picked_up', 'Order Picked Up', 'Confirm the customer has collected the order?'
              )}
              disabled={processing}
            >
              <Text style={styles.actionButtonText}>Mark Picked Up</Text>
            </TouchableOpacity>
          )}

          {/* --- SHARED --- */}
          {showComplete && (
            <TouchableOpacity
              style={[styles.actionButton, styles.confirmButton]}
              onPress={() => showActionConfirmation(
                'complete', 'Complete Order',
                'Mark this order as completed? This finalizes the transaction.'
              )}
              disabled={processing}
            >
              <Text style={styles.actionButtonText}>Complete Order</Text>
            </TouchableOpacity>
          )}

          {showCancel && (
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => showActionConfirmation(
                'cancel', 'Cancel Order',
                'Are you sure you want to cancel this order? This cannot be undone.'
              )}
              disabled={processing}
            >
              <Text style={styles.actionButtonText}>Cancel Order</Text>
            </TouchableOpacity>
          )}

        </View>
      </View>
    );
  };

  const renderConfirmationModal = () => {
    if (!showConfirmation || !selectedAction) return null;
    return (
      <Modal
        visible={showConfirmation}
        transparent={true}
        animationType="none"
        onRequestClose={() => setShowConfirmation(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmationModal}>
            <View style={styles.confirmationIcon}>
              <Ionicons
                name={selectedAction.type === 'cancel' ? 'alert-circle' : 'checkmark-circle'}
                size={56}
                color={selectedAction.type === 'cancel' ? '#EF4444' : '#10B981'}
              />
            </View>
            <Text style={styles.confirmationTitle}>{selectedAction.title}</Text>
            <Text style={styles.confirmationDescription}>{selectedAction.description}</Text>
            <View style={styles.confirmationButtons}>
              <TouchableOpacity
                style={[styles.confirmationButton, styles.cancelConfirmButton]}
                onPress={() => setShowConfirmation(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelConfirmButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmationButton, styles.confirmActionButton]}
                onPress={executeAction}
                disabled={processing}
                activeOpacity={0.7}
              >
                {processing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmActionButtonText}>
                    {selectedAction.type === 'cancel' ? 'Yes, Cancel' : 'Confirm'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([fetchOrderDetails(), fetchAvailableActions()]);
  };

  const isPickupOrder = () =>
    order?.delivery_method?.toLowerCase().includes('pickup') || false;

  const hasActions = () => {
    const {
      showConfirm, showCancel, showReadyToShip, showArrangeShipment,
      showReadyForPickup, showPickedUp, showToDeliver, showDelivered, showComplete,
    } = getActionButtons();
    return showConfirm || showCancel || showReadyToShip || showArrangeShipment ||
      showReadyForPickup || showPickedUp || showToDeliver || showDelivered || showComplete;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F97316" />
          <Text style={styles.loadingText}>Loading order details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>Order Not Found</Text>
          <Text style={styles.errorText}>Unable to load order details</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const subtotal = order.items.reduce((sum, item) => sum + item.total_amount, 0);
  const total = order.total_amount;

  return (
    <View style={styles.container}>
      {/* Header */}
      <SafeAreaView style={styles.headerSafeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButtonHeader}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Details</Text>
          <View style={styles.headerRight} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#F97316']}
            tintColor="#F97316"
          />
        }
      >
        {/* Status Card */}
        {renderStatusCard()}

        {/* Rider Information - Display if available */}
        {renderRiderInfo()}

        {/* Delivery Address & Buyer Info */}
        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="map-marker-outline" size={20} color="#111827" />
            <Text style={styles.cardTitle}>Delivery Address</Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.recipientName}>
              {order.shipping_address?.recipient_name ||
                `${order.user.first_name} ${order.user.last_name}`}
            </Text>
            <Text style={styles.phoneNumber}>
              {order.shipping_address?.recipient_phone ||
                order.user.contact_number || 'No phone number'}
            </Text>
            <Text style={styles.addressText}>
              {order.shipping_address?.full_address ||
                order.delivery_address || 'No address provided'}
            </Text>
          </View>
        </View>

        {/* Order Details */}
        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="receipt" size={20} color="#111827" />
            <Text style={styles.cardTitle}>Order Details</Text>
          </View>
          <View style={styles.orderDetailsContent}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Order Number</Text>
              <Text style={styles.detailValue}>{order.order_id}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Order Date</Text>
              <Text style={styles.detailValue}>{formatFullDate(order.created_at)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Payment Method</Text>
              <Text style={styles.detailValue}>{order.payment_method || 'N/A'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Delivery Method</Text>
              <Text style={styles.detailValue}>
                {isPickupOrder() ? 'Store Pickup' : (order.delivery_method || 'Standard Delivery')}
              </Text>
            </View>
            {order.pickup_date && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Pickup Date</Text>
                <Text style={styles.detailValue}>{formatFullDate(order.pickup_date)}</Text>
              </View>
            )}
            {order.delivery_info?.tracking_number && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Tracking Number</Text>
                <Text style={styles.detailValue}>{order.delivery_info.tracking_number}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Order Items */}
        <View style={styles.itemsCard}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="shopping-bag" size={20} color="#111827" />
            <Text style={styles.cardTitle}>Items ({order.items.length})</Text>
          </View>
          {order.items.map((item, index) => (
            <View key={item.id || index} style={styles.orderItem}>
              <Image
                source={{ uri: getProductImageUrl(item) }}
                style={styles.itemImage}
              />
              <View style={styles.itemDetails}>
                <Text style={styles.itemName} numberOfLines={2}>
                  {item.cart_item?.product?.name || 'Product Name'}
                </Text>
                <Text style={styles.itemVariant}>
                  {item.cart_item?.product?.variant || 'Standard'}
                </Text>
                <View style={styles.itemPriceRow}>
                  <Text style={styles.itemPrice}>
                    {formatCurrency(item.cart_item?.product?.price || 0)}
                  </Text>
                  <Text style={styles.itemQuantity}>× {item.quantity}</Text>
                </View>
              </View>
              <Text style={styles.itemTotal}>
                {formatCurrency(item.total_amount)}
              </Text>
            </View>
          ))}
        </View>

        {/* Order Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="receipt-long" size={20} color="#111827" />
            <Text style={styles.cardTitle}>Order Summary</Text>
          </View>
          <View style={styles.summaryContent}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>{formatCurrency(subtotal)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Shipping Fee</Text>
              <Text style={styles.summaryValue}>{formatCurrency(0)}</Text>
            </View>
            <View style={styles.dividerLight} />
            <View style={styles.totalSummaryRow}>
              <Text style={styles.totalSummaryLabel}>Total</Text>
              <Text style={styles.totalSummaryValue}>{formatCurrency(total)}</Text>
            </View>
          </View>
        </View>

        {/* Extra padding for sticky footer */}
        {hasActions() && <View style={styles.footerPadding} />}
      </ScrollView>

      {/* Sticky Action Buttons */}
      {renderActionButtons()}

      {/* Confirmation Modal */}
      {renderConfirmationModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  headerSafeArea: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingTop: Platform.OS === 'ios' ? 44 : 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  backButtonHeader: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: { width: 40 },
  scrollView: { flex: 1 },
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
    padding: 40,
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
    backgroundColor: '#F97316',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  statusCard: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderLeftWidth: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  statusCardHeader: { marginBottom: 8 },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusCardTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  statusCardDescription: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginTop: 4,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  cardContent: { paddingLeft: 28 },
  recipientName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  phoneNumber: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
  orderDetailsContent: { paddingLeft: 28 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 13,
    color: '#8E8E93',
  },
  detailValue: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
  itemsCard: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  orderItem: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  itemImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  itemDetails: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  itemVariant: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 6,
  },
  itemPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemPrice: {
    fontSize: 13,
    color: '#8E8E93',
  },
  itemQuantity: {
    fontSize: 13,
    color: '#8E8E93',
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 'auto',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    marginBottom: 20,
  },
  summaryContent: { paddingLeft: 28 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#8E8E93',
  },
  summaryValue: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '500',
  },
  dividerLight: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 12,
  },
  totalSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  totalSummaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  totalSummaryValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F97316',
  },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingBottom: Platform.OS === 'ios' ? 8 : 5,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButton: { backgroundColor: '#10B981' },
  readyToShipButton: { backgroundColor: '#3B82F6' },
  cancelButton: { backgroundColor: '#EF4444' },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footerPadding: { height: 70 },
  confirmationIcon: { marginBottom: 16 },
  confirmationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  confirmationDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  confirmationButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmationButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelConfirmButton: { backgroundColor: '#F5F5F5' },
  cancelConfirmButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  confirmActionButton: { backgroundColor: '#F97316' },
  confirmActionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmationModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: width - 48,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  riderInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  riderName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  riderPhone: {
    fontSize: 13,
    color: '#3B82F6',
  },
  waitingText: {
    fontSize: 13,
    color: '#F97316',
    fontStyle: 'italic',
  },
  deliveryStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  deliveryStatusText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '500',
  },
});