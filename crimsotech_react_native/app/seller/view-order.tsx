// app/seller/view-order.tsx
import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
interface ProofImage {
  id: string;
  file_url: string;
  file_type: string;
  uploaded_at: string;
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
  pickup_expire_date?: string; 
  proof_images?: ProofImage[]; 
  metadata?: {  // Add this
    pickup_code?: string;
  }; 
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
    rider_assigned: {
      label: 'Rider Assigned - Waiting for Confirmation',
      color: '#8B5CF6', 
      bgColor: '#F5F3FF', 
      icon: 'person-outline',
      description: 'A rider has been assigned and is waiting to confirm the delivery. Once confirmed, you can mark the order as ready for pickup.',
    },
    rider_accepted: {
      label: 'Rider Accepted',
      color: '#10B981', bgColor: '#ECFDF5', icon: 'checkmark-circle-outline',
      description: 'Rider has accepted the delivery. Click "Ready to Ship" when items are packed.',
    },
    pending_rider: {
      label: 'Pending Rider',
      color: '#F97316', bgColor: '#FFF7ED', icon: 'time-outline',
      description: 'No riders available. Click "Arrange Shipment" to try again.',
    },
    waiting_for_rider: {
      label: 'Waiting for Rider',
      color: '#F97316', bgColor: '#FFF7ED', icon: 'person-outline',
      description: 'Waiting for a rider to accept the delivery assignment.',
    },
    waiting_for_pickup: {
      label: 'Waiting for Rider Pickup',
      color: '#F97316', bgColor: '#FFF7ED', icon: 'package-outline',
      description: 'Order is ready. Waiting for rider to pick up the item from your store.',
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
  const [proofImages, setProofImages] = useState<ProofImage[]>([]);
const [loadingProofs, setLoadingProofs] = useState(false);
const [previewVisible, setPreviewVisible] = useState(false);
const [selectedImage, setSelectedImage] = useState<string | null>(null);
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
        // DEBUG: Log the pickup_date
        console.log('=== PICKUP DATE FROM API ===');
        console.log('pickup_date:', response.data.data.pickup_date);
        console.log('Full response data:', response.data.data);
        
        setOrder(response.data.data);
        
        if (response.data.data.status === 'delivered' && response.data.data.proof_images) {
          setProofImages(response.data.data.proof_images);
        }
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

  const generatePickupCode = async () => {
    if (!orderId || !shopId) return;
    
    try {
      setProcessing(true);
      const response = await AxiosInstance.post(
        `/seller-order-list/${orderId}/generate_pickup_code/`,
        { shop_id: shopId }
      );
      
      if (response.data.success) {
        Alert.alert('Success', 'Pickup code generated successfully');
        await fetchOrderDetails(); // Refresh to get the new code
      } else {
        Alert.alert('Error', response.data.message || 'Failed to generate pickup code');
      }
    } catch (error: any) {
      console.error('Error generating pickup code:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to generate pickup code');
    } finally {
      setProcessing(false);
    }
  };

  const fetchProofImages = async (deliveryId: string) => {
  if (!deliveryId) return;
  try {
    setLoadingProofs(true);
    const response = await AxiosInstance.get(
      `/rider-proof/delivery/${deliveryId}/proofs/`,
      { headers: { "X-User-Id": userId } }
    );
    if (response.data?.success) {
      setProofImages(response.data.proofs || []);
    }
  } catch (error) {
    console.error('Error fetching proofs:', error);
  } finally {
    setLoadingProofs(false);
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
      console.log('Available actions from backend:', response.data.data.available_actions);
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
      // Remove the Alert.alert - just close modal and refresh
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

  // Check if cancel should be hidden (when rider has accepted)
  const isRiderAccepted = order?.delivery_info?.status === 'accepted';
  const shouldHideCancel = isRiderAccepted;

  return {
    showConfirm:          availableActions.includes('confirm'),
    showCancel:           availableActions.includes('cancel') && !shouldHideCancel,
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
    
    // DEBUG: Log the actual values
    console.log('=== STATUS DEBUG ===');
    console.log('Order status:', order.status);
    console.log('Delivery info status:', order?.delivery_info?.status);
    console.log('Rider name:', order?.delivery_info?.rider_name);
    
    let displayStatus = order.status;
    let customDescription = '';
    let customLabel = '';
    let customIcon = undefined;
    
    // Case 1: Rider assigned but waiting for confirmation
    if ((displayStatus === 'rider_assigned' || displayStatus === 'waiting_for_rider') && 
        order?.delivery_info?.rider_name && 
        (!order?.delivery_info?.status || order?.delivery_info?.status === 'pending')) {
      customLabel = 'Rider Assigned - Waiting for Confirmation';
      customDescription = 'A rider has been assigned and is waiting to confirm the delivery. Once the rider accepts, you can mark the order as ready for pickup.';
      customIcon = 'person-outline';
    }
    // Case 2: Rider accepted the delivery - waiting for pickup
    else if ((displayStatus === 'rider_assigned' || displayStatus === 'waiting_for_rider') && 
             order?.delivery_info?.status === 'accepted') {
      customLabel = 'Rider Assigned - Accepted';
      customDescription = 'The rider has accepted the delivery and will pick up the items from your store. Please prepare the items and click "Ready to Ship" when ready.';
      customIcon = 'checkmark-circle-outline';
    }
    // Case 3: Waiting for rider (no rider assigned yet)
    else if (displayStatus === 'waiting_for_rider' && !order?.delivery_info?.rider_name) {
      customLabel = 'Waiting for Rider';
      customDescription = 'Waiting for a rider to accept the delivery assignment.';
      customIcon = 'time-outline';
    }
    // Case 4: Out for Delivery - rider picked up and on the way (to_deliver status)
    else if (displayStatus === 'to_deliver') {
      customLabel = 'Item Shipped - Rider Picked Up';
      customDescription = 'The rider has picked up the items from your store and is on the way to deliver to the customer.';
      customIcon = 'car-outline';
    }
    // For waiting_for_pickup status
    else if (displayStatus === 'waiting_for_pickup') {
      customDescription = 'Order is ready. Waiting for rider to pick up the item from your store for delivery to the customer.';
      customIcon = 'package-outline';
    }
    // For ready_for_pickup status
    // For ready_for_pickup status
else if (displayStatus === 'ready_for_pickup') {
  customDescription = 'Order is ready at your store. Customer has been notified.';
  customIcon = 'storefront-outline';
  
  // Add pickup code display inside the status card
  const pickupCode = order?.metadata?.pickup_code;
  if (pickupCode) {
    customDescription = `Order is ready at your store. Customer has been notified.\n\nPickup Code: ${pickupCode}`;
  }
}
    
    const config = getStatusConfig(displayStatus);
    
    // Use custom values if available, otherwise use config values
    const finalLabel = customLabel || config.label;
    const finalDescription = customDescription || config.description;
    const finalIcon = customIcon || config.icon;
    const finalColor = config.color;
    const finalBgColor = config.bgColor;
    
    return (
      <View style={[styles.statusCard, { backgroundColor: finalBgColor, borderLeftColor: finalColor }]}>
        <View style={styles.statusCardHeader}>
          <View style={styles.statusRow}>
            <Ionicons name={finalIcon as any} size={22} color={finalColor} />
            <Text style={[styles.statusCardTitle, { color: finalColor }]}>
              {finalLabel}
            </Text>
          </View>
        </View>
        <Text style={styles.statusCardDescription}>
          {finalDescription}
        </Text>
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

  
const renderProofOfDelivery = () => {
  if (order?.status !== 'delivered') return null;
  
  const proofs = order?.proof_images || [];
  if (proofs.length === 0) return null;

  return (
    <View style={styles.infoCard}>
      <View style={styles.cardHeader}>
        <MaterialIcons name="photo-camera" size={20} color="#111827" />
        <Text style={styles.cardTitle}>Proof of Delivery</Text>
      </View>
      <View style={styles.cardContent}>
        <View style={styles.proofGrid}>
          {proofs.map((proof) => (
            <TouchableOpacity
              key={proof.id}
              onPress={() => {
                setSelectedImage(proof.file_url);
                setPreviewVisible(true);
              }}
            >
              <Image source={{ uri: proof.file_url }} style={styles.proofImage} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
};

const renderPickupInfo = () => {
  if (!isPickupOrder()) return null;
  
  // Note: You need to have pickup_expire_date in your OrderDetails interface
  // Add this to your OrderDetails interface if not already there
  const pickupExpireDate = (order as any)?.pickup_expire_date;
  if (!pickupExpireDate) return null;
  
  const expireDate = new Date(pickupExpireDate);
  const now = new Date();
  const isExpired = now > expireDate;
  
  return (
    <View style={styles.infoCard}>
      <View style={styles.cardHeader}>
        <MaterialIcons name="schedule" size={20} color="#111827" />
        <Text style={styles.cardTitle}>Pickup Information</Text>
      </View>
      <View style={styles.cardContent}>
        <View style={styles.pickupInfoRow}>
          <Ionicons name="calendar-outline" size={16} color="#6B7280" />
          <Text style={styles.pickupExpireText}>
            {isExpired ? 'Expired on: ' : 'Expires on: '}
            {expireDate.toLocaleDateString('en-PH', {
              month: 'short', day: 'numeric', year: 'numeric',
              hour: '2-digit', minute: '2-digit'
            })}
          </Text>
        </View>
        {isExpired && (
          <View style={styles.expiredWarning}>
            <Ionicons name="warning-outline" size={16} color="#EF4444" />
            <Text style={styles.expiredWarningText}>
              This pickup order has expired. Please contact the customer.
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

  // Check for print_waybill in available actions
  const showPrintWaybill = availableActions.includes('print_waybill');

  // Get current order status
  const currentStatus = order?.status?.toLowerCase() || '';
  const isProcessing = currentStatus === 'processing';
  const isReadyToShip = currentStatus === 'ready_to_ship';
  const isPickup = isPickupOrder();

  const hasAnyAction = showConfirm || showCancel || showReadyToShip ||
    showArrangeShipment || showReadyForPickup || showPickedUp ||
    showToDeliver || showDelivered || showComplete || showPrintWaybill;

  if (!hasAnyAction) return null;

  // Handle print waybill - Open in browser
  const handlePrintWaybill = async () => {
    try {
      setProcessing(true);
      
      // Construct the URL
      const waybillUrl = `${AxiosInstance.defaults.baseURL}/seller-order-list/${orderId}/generate_waybill/?shop_id=${shopId}`;
      
      // Open in browser - the browser will handle PDF display and printing
      const { Linking } = await import('react-native');
      await Linking.openURL(waybillUrl);
      
      Alert.alert('Success', 'Waybill opened in browser. You can print from there.');
    } catch (error: any) {
      console.error('Error generating waybill:', error);
      Alert.alert('Error', error?.message || 'Failed to generate waybill');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <View style={styles.stickyFooter}>
      <View style={styles.buttonContainer}>
        {/* Print Waybill Button - for delivery orders only */}
        {!isPickup && showPrintWaybill && (
          <TouchableOpacity
            style={[styles.actionButton, styles.printWaybillButton]}
            onPress={handlePrintWaybill}
            disabled={processing}
          >
            <Text style={styles.actionButtonText}>Print Waybill</Text>
          </TouchableOpacity>
        )}

        {/* Confirm Order Button */}
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

        {/* For processing status: Show Arrange Shipment */}
        {isProcessing && showArrangeShipment && !isPickup && (
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

        {/* For waiting_for_pickup status: Show Ready to Ship button (disabled until rider accepts) */}
        {currentStatus === 'waiting_for_pickup' && showReadyToShip && !isPickup && (
          <TouchableOpacity
            style={[
              styles.actionButton, 
              styles.readyToShipButton,
              (order?.delivery_info?.status !== 'accepted') && styles.readyToShipButtonDisabled
            ]}
            onPress={() => showActionConfirmation(
              'ready_to_ship', 'Ready to Ship', 
              'Mark order as ready to ship? Rider will be notified to pick up.'
            )}
            disabled={processing || order?.delivery_info?.status !== 'accepted'}
          >
            <Text style={styles.actionButtonText}>Ready to Ship</Text>
          </TouchableOpacity>
        )}

        {/* For rider_accepted status OR when delivery.status === 'accepted': Show Ready to Ship button */}
        {(currentStatus === 'rider_accepted' || (currentStatus === 'rider_assigned' && order?.delivery_info?.status === 'accepted')) && showReadyToShip && !isPickup && (
          <TouchableOpacity
            style={[styles.actionButton, styles.readyToShipButton]}
            onPress={() => showActionConfirmation(
              'ready_to_ship', 'Ready to Ship', 
              'Mark order as ready to ship? Rider will be notified to pick up.'
            )}
            disabled={processing}
          >
            <Text style={styles.actionButtonText}>Ready to Ship</Text>
          </TouchableOpacity>
        )}

        {/* For pending_rider status: Show Arrange Shipment */}
        {currentStatus === 'pending_rider' && showArrangeShipment && !isPickup && (
          <TouchableOpacity
            style={[styles.actionButton, styles.readyToShipButton]}
            onPress={() => showActionConfirmation(
              'arrange_shipment', 'Arrange Shipment',
              'No riders available. Try assigning riders again?'
            )}
            disabled={processing}
          >
            <Text style={styles.actionButtonText}>Retry Arrange Shipment</Text>
          </TouchableOpacity>
        )}

        {/* For ready_to_ship status: Show Ready to Ship button */}
        {isReadyToShip && showReadyToShip && !isPickup && (
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

        {/* For other statuses that need Arrange Shipment */}
        {!isProcessing && !isReadyToShip && showArrangeShipment && !isPickup && (
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

        {/* Out for Delivery Button */}
        {showToDeliver && !isPickup && (
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

        {/* Ready for Pickup Button (Pickup orders) */}
        {showReadyForPickup && isPickup && (
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

        
        {/* Picked Up Button (Pickup orders) */}
        {showPickedUp && isPickup && (
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

        {/* Delivered Button */}
        {/* {showDelivered && !isPickup && (
          <TouchableOpacity
            style={[styles.actionButton, styles.confirmButton]}
            onPress={() => showActionConfirmation(
              'delivered', 'Mark as Delivered', 'Mark this order as delivered?'
            )}
            disabled={processing}
          >
            <Text style={styles.actionButtonText}>Mark as Delivered</Text>
          </TouchableOpacity>
        )} */}

        {/* Complete Button */}
        {/* {showComplete && (
          <TouchableOpacity
            style={[styles.actionButton, styles.confirmButton]}
            onPress={() => showActionConfirmation(
              'complete', 'Complete Order', 'Mark this order as completed?'
            )}
            disabled={processing}
          >
            <Text style={styles.actionButtonText}>Complete Order</Text>
          </TouchableOpacity>
        )} */}

        {/* Cancel Order Button */}
        {/* Cancel Order Button */}
{showCancel && (
  <TouchableOpacity
    style={[styles.actionButton, styles.cancelButton]}
    onPress={() => {
      // Determine if this is a shipment cancellation or order cancellation
      const isShipmentCancel = order?.status === 'rider_assigned' || 
                               order?.status === 'waiting_for_rider' ||
                               (order?.delivery_info?.status === 'pending');
      
      const title = isShipmentCancel ? 'Cancel Shipment' : 'Cancel Order';
      const description = isShipmentCancel 
        ? 'Are you sure you want to cancel this shipment? The order will be reverted to processing.'
        : 'Are you sure you want to cancel this order? This cannot be undone.';
      
      showActionConfirmation('cancel', title, description);
    }}
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
        {renderPickupInfo()}
        {renderProofOfDelivery()} 

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
{/* Image Preview Modal */}
<Modal visible={previewVisible} transparent animationType="fade">
  <View style={styles.modalOverlayImage}>
    <TouchableOpacity
      style={styles.closeButton}
      onPress={() => setPreviewVisible(false)}
    >
      <Ionicons name="close" size={30} color="#FFFFFF" />
    </TouchableOpacity>
    {selectedImage && (
      <Image source={{ uri: selectedImage }} style={styles.previewImage} />
    )}
  </View>
</Modal>
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
  proofGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 8,
},
proofImage: {
  width: 80,
  height: 80,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: '#E5E7EB',
},
modalOverlayImage: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.95)',
  justifyContent: 'center',
  alignItems: 'center',
},
closeButton: {
  position: 'absolute',
  top: 50,
  right: 20,
  zIndex: 10,
  padding: 8,
},
previewImage: {
  width: '90%',
  height: '70%',
  resizeMode: 'contain',
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
  readyToShipButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.7,
  },
  printWaybillButton: { backgroundColor: '#8B5CF6' },
  deliveredButton: { backgroundColor: '#10B981' },
  pickupInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  pickupExpireText: {
    fontSize: 13,
    color: '#6B7280',
  },
  expiredWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
    padding: 8,
    borderRadius: 8,
  },
  expiredWarningText: {
    fontSize: 12,
    color: '#DC2626',
    flex: 1,
  },
});