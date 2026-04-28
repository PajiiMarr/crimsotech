import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
  Dimensions,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import AxiosInstance from '../../contexts/axios';

const { width } = Dimensions.get('window');

interface OrderItem {
  checkout_id: string;
  product_id: string;
  product_name: string;
  product_image?: string;
  shop_name: string;
  shop_id: string;
  seller_name: string;
  quantity: number;
  unit_price: string;
  total: string;
  remarks: string | null;
  variant_name?: string;
  dimensions?: string;
  weight?: string;
  length?: string;
  width?: string;
  height?: string;
  dimension_unit?: string;
  shop_street?: string;
  shop_barangay?: string;
  shop_city?: string;
  shop_province?: string;
  shop_latitude?: number;
  shop_longitude?: number;
}

interface OrderDetails {
  order_id: string;
  order_status: string;
  total_amount: string;
  payment_method: string;
  delivery_method: string;
  created_at: string;
  updated_at: string;
  customer: {
    id: string;
    name: string;
    contact_number: string;
    email: string;
  };
  shipping_address: {
    recipient_name: string;
    recipient_phone: string;
    full_address: string;
    city: string;
    province: string;
    barangay: string;
    zip_code: string;
    latitude?: number;
    longitude?: number;
  };
  delivery: {
    id: string;
    status: string;
    delivery_fee?: number;
    rider_id: string;
    rider_name: string;
    rider_contact: string;
    picked_at: string | null;
    delivered_at: string | null;
    created_at: string;
    failed_reason?: string;
    delivery_type?: string; 
    refund_id?: string; 
  };
  return_request?: {  // ADD THIS
    status: string;
    return_id: string;
    return_method?: string;
    refund_id?: string; 
    tracking_number?: string;
    logistic_service?: string;
  };
  refund_id?: string; 
  refund_items?: RefundItem[]; 
  payment: {
    id: string;
    status: string;
    amount: string;
    method: string;
    transaction_date: string;
  };
  items: OrderItem[];
}
interface RefundItem {
  checkout_id: string;
  quantity: number;
  amount: string;
}

export default function RiderViewOrder() {
  const { user } = useAuth();
  const { deliveryId, orderId } = useLocalSearchParams<{ deliveryId: string; orderId: string }>();
  const [isReturnDelivery, setIsReturnDelivery] = useState(false);
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [proofImages, setProofImages] = useState<any[]>([]);
  const [loadingProofs, setLoadingProofs] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [failedReasonModalVisible, setFailedReasonModalVisible] = useState(false);
const [selectedFailedReason, setSelectedFailedReason] = useState<string | null>(null);

  const [confirmationModalVisible, setConfirmationModalVisible] = useState(false);
const [confirmationConfig, setConfirmationConfig] = useState({
  title: '',
  message: '',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  confirmColor: '#EE4D2D',
  onConfirm: () => {},
  icon: 'warning-outline' as keyof typeof Ionicons.glyphMap,
  iconColor: '#EE4D2D',
});

const showConfirmationModal = (config: {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  onConfirm: () => void;
}) => {
  setConfirmationConfig({
    title: config.title,
    message: config.message,
    confirmText: config.confirmText || 'Confirm',
    cancelText: config.cancelText || 'Cancel',
    confirmColor: config.confirmColor || '#EE4D2D',
    icon: config.icon || 'warning-outline',
    iconColor: config.iconColor || config.confirmColor || '#EE4D2D',
    onConfirm: config.onConfirm,
  });
  setConfirmationModalVisible(true);
};

  // Fetch proof images
  const fetchProofImages = async (deliveryIdParam: string) => {
    if (!deliveryIdParam) return;
    
    try {
      setLoadingProofs(true);
      const response = await AxiosInstance.get(
        `/rider-proof/delivery/${deliveryIdParam}/proofs/`,
        { headers: { "X-User-Id": user?.user_id } }
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

  // Fetch order details
  const fetchOrderDetails = async () => {
    try {
      setIsLoading(true);
      
      if (!orderId) {
        throw new Error('Order ID is required');
      }
      
      const response = await AxiosInstance.get(`/rider-orders-active/order-details/${orderId}/`, {
        headers: {
          'X-User-Id': user?.user_id
        }
      });
      
      if (response.data) {
        console.log('=== ORDER DETAILS RESPONSE ===');
        console.log('delivery object:', response.data.delivery);
        console.log('delivery_type:', response.data.delivery?.delivery_type);
        
        setOrderDetails(response.data);
        
        // Check for delivery_type === 'return'
        if (response.data.delivery?.delivery_type === 'return') {
          console.log('✅ This is a RETURN delivery!');
          setIsReturnDelivery(true);
        } else {
          console.log('❌ This is NOT a return delivery, delivery_type =', response.data.delivery?.delivery_type);
        }
        
        // Fetch proofs after getting delivery ID
        if (response.data.delivery?.id) {
          await fetchProofImages(response.data.delivery.id);
        }
      }
    } catch (error: any) {
      console.error('Error fetching order details:', error);
      
      let errorMessage = 'Failed to load order details';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.status === 404) {
        errorMessage = 'Order not found';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error. Please check your connection and try again.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handleAcceptDelivery = async () => {
    if (!orderDetails?.delivery?.id) return;
    
    // Check if this is a return delivery
    const isReturn = orderDetails.delivery?.delivery_type === 'return';
    
    // Get the refund_id from return_request object or top-level refund_id
    const refundId = orderDetails?.return_request?.refund_id || orderDetails?.refund_id;
    
    showConfirmationModal({
      title: isReturn ? 'Accept Return Pickup' : 'Accept Order',
      message: isReturn ? 'Are you sure you want to accept this return pickup?' : 'Are you sure you want to accept this delivery?',
      confirmText: 'Accept',
      confirmColor: '#EE4D2D',
      icon: 'checkmark-circle-outline',
      iconColor: '#10B981',
      onConfirm: async () => {
        try {
          setIsActionLoading(true);
          
          let response;
          if (isReturn) {
            // For return pickups, call the respond_to_return_pickup endpoint
            if (!refundId) {
              Alert.alert('Error', 'Cannot accept return: refund ID not found');
              setIsActionLoading(false);
              return;
            }
            
            response = await AxiosInstance.post('/rider-orders-active/respond_to_return_pickup/', {
              refund_id: refundId,
              response: 'accept'
            }, {
              headers: { 'X-User-Id': user?.user_id }
            });
          } else {
            // For regular orders, use accept_order
            const formData = new FormData();
            formData.append('order_id', orderDetails.delivery.id);
            response = await AxiosInstance.post('/rider-orders-active/accept_order/', formData, {
              headers: { 'X-User-Id': user?.user_id }
            });
          }
  
          if (response.data.success) {
            Alert.alert('Success', isReturn ? 'Return pickup accepted successfully' : 'Order accepted successfully');
            fetchOrderDetails();
          } else {
            Alert.alert('Error', response.data.error || 'Failed to accept');
          }
        } catch (err: any) {
          console.error('Error accepting:', err);
          Alert.alert('Error', err?.response?.data?.error || 'Failed to accept');
        } finally {
          setIsActionLoading(false);
        }
      },
    });
  };

  // Add a new state for decline limit info
  const [declineLimitInfo, setDeclineLimitInfo] = useState({
    todayDeclines: 0,
    maxDeclines: 3,
    declinesRemaining: 3,
    hasReachedLimit: false
  });
  
  // Add function to fetch decline limit info
  const fetchDeclineLimitInfo = async () => {
    try {
      const response = await AxiosInstance.get('/rider-orders-active/get_decline_limit_info/', {
        headers: { 'X-User-Id': user?.user_id }
      });
      if (response.data.success) {
        setDeclineLimitInfo({
          todayDeclines: response.data.today_declines,
          maxDeclines: response.data.max_declines_per_day,
          declinesRemaining: response.data.declines_remaining,
          hasReachedLimit: response.data.has_reached_limit
        });
      }
    } catch (error) {
      console.error('Error fetching decline limit:', error);
    }
  };
  
  // Call this in useEffect
  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
      fetchDeclineLimitInfo(); // Add this line
    }
  }, [orderId]);
  
  // Update handleDeclineDelivery to check limit first
  const handleDeclineDelivery = async () => {
    if (!orderDetails?.delivery?.id) return;
    
    // Check if rider has reached daily decline limit
    if (declineLimitInfo.hasReachedLimit) {
      Alert.alert(
        'Limit Reached',
        `You have reached the maximum of ${declineLimitInfo.maxDeclines} declines per day. You cannot decline more orders today.`,
        [{ text: 'OK' }]
      );
      return;
    }
    
    showConfirmationModal({
      title: 'Decline Order',
      message: `Are you sure you want to decline this delivery? You have ${declineLimitInfo.declinesRemaining} decline${declineLimitInfo.declinesRemaining !== 1 ? 's' : ''} remaining today.`,
      confirmText: 'Decline',
      confirmColor: '#DC2626',
      icon: 'close-circle-outline',
      iconColor: '#DC2626',
      onConfirm: async () => {
        try {
          setIsActionLoading(true);
          const formData = new FormData();
          formData.append('order_id', orderDetails.delivery.id);
  
          const response = await AxiosInstance.post('/rider-orders-active/decline_order/', formData, {
            headers: { 'X-User-Id': user?.user_id }
          });
  
          if (response.data.success) {
            Alert.alert('Success', 'Order declined successfully');
            router.back();
          } else {
            Alert.alert('Error', response.data.error || 'Failed to decline order');
          }
        } catch (err: any) {
          console.error('Error declining delivery:', err);
          // Check if error is due to decline limit
          if (err?.response?.data?.error && err.response.data.error.includes('maximum of 3 declines')) {
            Alert.alert('Limit Reached', err.response.data.error);
          } else {
            Alert.alert('Error', err?.response?.data?.error || 'Failed to decline order');
          }
        } finally {
          setIsActionLoading(false);
        }
      },
    });
  };
  

  // Handle mark as picked up
  // Handle mark as picked up
const handleMarkPickedUp = async () => {
  if (!orderDetails?.delivery?.id) return;
  
  showConfirmationModal({
    title: 'Mark as Picked Up',
    message: 'Have you picked up the items from the seller?',
    confirmText: 'Yes, Picked Up',
    confirmColor: '#3B82F6',
    icon: 'cube-outline',
    iconColor: '#3B82F6',
    onConfirm: async () => {
      try {
        setIsActionLoading(true);
        const formData = new FormData();
        formData.append('delivery_id', orderDetails.delivery.id);

        const response = await AxiosInstance.post('/rider-orders-active/pickup_order/', formData, {
          headers: { 'X-User-Id': user?.user_id }
        });

        if (response.data.success) {
          Alert.alert('Success', 'Order marked as picked up successfully');
          fetchOrderDetails();
        } else {
          Alert.alert('Error', response.data.error || 'Failed to mark as picked up');
        }
      } catch (err: any) {
        console.error('Error marking as picked up:', err);
        Alert.alert('Error', err?.response?.data?.error || 'Failed to mark as picked up');
      } finally {
        setIsActionLoading(false);
      }
    },
  });
};
  // Handle mark as delivered - Navigate to add proof page first
  const handleMarkDelivered = async () => {
    if (!orderDetails?.delivery?.id) return;
    
    router.push({
      pathname: '/rider/add-proof',
      params: { deliveryId: orderDetails.delivery.id }
    });
  };

  // Handle view route - Navigate to map
  const handleViewRoute = () => {
    const sellerInfo = orderDetails?.items?.[0];
    const customerAddress = orderDetails?.shipping_address;
    
    // Check if buyer has pinned location coordinates
    if (!customerAddress?.latitude || !customerAddress?.longitude) {
      Alert.alert(
        'Location Not Available',
        'The buyer has not pinned their exact location on the map yet. Please contact the buyer for directions.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    console.log('Buyer pinned coordinates:', {
      lat: customerAddress.latitude,
      lng: customerAddress.longitude,
      address: customerAddress.full_address
    });
    
    // Navigate to map with buyer's pinned coordinates
    router.push({
      pathname: '/rider/RiderMapScreen',
      params: {
        // Buyer's pinned location (destination)
        destLat: customerAddress.latitude.toString(),
        destLng: customerAddress.longitude.toString(),
        // Seller's location (pickup)
        sellerLat: sellerInfo?.shop_latitude?.toString() || '',
        sellerLng: sellerInfo?.shop_longitude?.toString() || '',
        // Address strings for display
        customerAddress: customerAddress.full_address || '',
        sellerAddress: sellerInfo ? formatShopAddress(sellerInfo) : '',
        deliveryId: orderDetails?.delivery?.id || '',
        orderId: orderDetails?.order_id || '',
      }
    });
  };

  // Handle failed delivery
  // Handle failed delivery
  // Handle failed delivery - Show reason selection modal
  const handleFailedDelivery = async () => {
    if (!orderDetails?.delivery?.id) return;
    setFailedReasonModalVisible(true);
  };
  
  // Submit failed delivery with selected reason
  const submitFailedDelivery = async (reason: string) => {
    setIsActionLoading(true);
    try {
      const formData = new FormData();
      formData.append('delivery_id', orderDetails?.delivery?.id || '');
      formData.append('status', 'failed');
      formData.append('failed_reason', reason);
  
      const response = await AxiosInstance.post('/rider-orders-active/update_delivery_status/', formData, {
        headers: { 'X-User-Id': user?.user_id }
      });
  
      if (response.data.success) {
        Alert.alert('Info', 'Delivery marked as failed');
        router.back();
      } else {
        Alert.alert('Error', response.data.error || 'Failed to mark delivery as failed');
      }
    } catch (err: any) {
      console.error('Error marking delivery as failed:', err);
      Alert.alert('Error', err?.response?.data?.error || 'Failed to mark delivery as failed');
    } finally {
      setIsActionLoading(false);
      setFailedReasonModalVisible(false);
      setSelectedFailedReason(null);
    }
  };
  
  const showFailedReasonDialog = (reason: string) => {
    showConfirmationModal({
      title: 'Confirm Failed Delivery',
      message: `Reason: ${reason}\n\nAre you sure you want to mark this delivery as failed?`,
      confirmText: 'Confirm',
      confirmColor: '#DC2626',
      icon: 'warning-outline',
      iconColor: '#DC2626',
      onConfirm: async () => {
        try {
          setIsActionLoading(true);
          const formData = new FormData();
          formData.append('delivery_id', orderDetails?.delivery?.id || '');
          formData.append('status', 'cancelled');
          formData.append('reason', reason);
  
          const response = await AxiosInstance.post('/rider-orders-active/update_delivery_status/', formData, {
            headers: { 'X-User-Id': user?.user_id }
          });
  
          if (response.data.success) {
            Alert.alert('Info', 'Delivery marked as failed');
            router.back();
          } else {
            Alert.alert('Error', response.data.error || 'Failed to mark delivery as failed');
          }
        } catch (err: any) {
          console.error('Error marking delivery as failed:', err);
          Alert.alert('Error', err?.response?.data?.error || 'Failed to mark delivery as failed');
        } finally {
          setIsActionLoading(false);
        }
      },
    });
  };

  {/* Failed Delivery Reason Modal */}


  // Handle cancel order (for accepted status)
  // Handle cancel order (for accepted status)
const handleCancelAcceptedOrder = async () => {
  if (!orderDetails?.delivery?.id) return;
  
  showConfirmationModal({
    title: 'Cancel Order',
    message: 'Are you sure you want to cancel this delivery? This action cannot be undone.',
    confirmText: 'Yes, Cancel',
    confirmColor: '#DC2626',
    icon: 'warning-outline',
    iconColor: '#DC2626',
    onConfirm: async () => {
      try {
        setIsActionLoading(true);
        const formData = new FormData();
        formData.append('order_id', orderDetails.delivery.id);
        formData.append('reason', 'Rider cancelled the delivery');

        const response = await AxiosInstance.post('/rider-orders-active/decline_order/', formData, {
          headers: { 'X-User-Id': user?.user_id }
        });

        if (response.data.success) {
          Alert.alert('Success', 'Order cancelled successfully');
          router.back();
        } else {
          Alert.alert('Error', response.data.error || 'Failed to cancel order');
        }
      } catch (err: any) {
        console.error('Error cancelling order:', err);
        Alert.alert('Error', err?.response?.data?.error || 'Failed to cancel order');
      } finally {
        setIsActionLoading(false);
      }
    },
  });
};

  // Handle image loading error
  const handleImageError = (productId: string) => {
    setImageErrors(prev => ({ ...prev, [productId]: true }));
  };

  // Format date
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'N/A';
    }
  };

  // Format currency
  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `₱${numAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  };

  // Get status color
  // Get status color
  // Get status color
  const getStatusColor = (status: string) => {
    // For return deliveries, use purple theme
    if (isReturnDelivery) {
      // Check for return waiting for buyer - use amber/warning color
      if (orderDetails?.delivery?.status === 'accepted' && 
          orderDetails?.return_request?.status === 'pickup_accepted') {
        return '#F59E0B'; // Amber/Warning color for waiting
      }
      
      switch (status?.toLowerCase()) {
        case 'pending':
        case 'pending_offer':
          return '#8B5CF6'; // Purple for pending return
        case 'accepted':
          if (orderDetails?.order_status === 'waiting_for_rider') {
            return '#8B5CF6';
          }
          return '#8B5CF6';
        case 'picked_up':
          return '#8B5CF6';
        case 'delivered':
          return '#10B981';
        case 'failed':
          return '#EF4444';
        case 'cancelled':
          return '#EF4444';
        default:
          return '#8B5CF6';
      }
    }
    
    // Original colors for normal deliveries
    switch (status?.toLowerCase()) {
      case 'pending':
        return '#F59E0B';
      case 'pending_offer':
        return '#F59E0B';
      case 'accepted':
        if (orderDetails?.order_status === 'waiting_for_rider') {
          return '#10B981';
        }
        return '#F59E0B';
      case 'picked_up':
        return '#3B82F6';
      case 'delivered':
        return '#10B981';
      case 'failed':
        if (orderDetails?.delivery?.failed_reason === 'return_to_seller') {
          return '#D97706';
        }
        return '#EF4444';
      case 'cancelled':
        return '#EF4444';
      case 'declined':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

// Get status label
// Get status label
const getStatusLabel = (status: string) => {
  // For return deliveries, add "Return" prefix
  const prefix = isReturnDelivery ? 'Return: ' : '';
  
  // Check for return waiting for buyer
  if (isReturnDelivery && 
      orderDetails?.delivery?.status === 'accepted' && 
      orderDetails?.return_request?.status === 'pickup_accepted') {
    return prefix + 'Waiting for Buyer';
  }
  
  switch (status?.toLowerCase()) {
    case 'picked_up':
      return prefix + 'In Transit';
    case 'pending_offer':
      return prefix + 'Pending';
    case 'accepted':
      if (orderDetails?.order_status === 'rider_assigned') {
        return prefix + 'Accepted - Waiting for pickup';
      }
      if (orderDetails?.order_status === 'waiting_for_rider') {
        return prefix + 'Approved - Ready for pickup';
      }
      return prefix + 'Accepted';
    case 'failed':
      if (orderDetails?.delivery?.failed_reason === 'return_to_seller') {
        return prefix + 'Failed - Return to Seller';
      }
      return prefix + 'Failed';
    default:
      return (status?.charAt(0).toUpperCase() + status?.slice(1)) || 'Unknown';
  }
};

// Get status message
// Get status message
const getStatusMessage = (status: string) => {
  // Check for return delivery waiting for buyer
  if (isReturnDelivery && 
      orderDetails?.delivery?.status === 'accepted' && 
      orderDetails?.return_request?.status === 'pickup_accepted') {
    return 'Waiting for buyer to mark the item as ready for pickup. You will be notified once ready.';
  }

  if (isReturnDelivery && orderDetails?.return_request?.status === 'pickup_accepted') {
    return 'You have accepted this return pickup. Please proceed to pick up the item from the buyer.';
  }
  
  // For return deliveries, show return-specific messages
  if (isReturnDelivery) {
    switch (status?.toLowerCase()) {
      case 'accepted':
        if (orderDetails?.order_status === 'rider_assigned') {
          return 'You have accepted this return delivery. Waiting for the buyer to mark the item as ready for pickup.';
        }
        if (orderDetails?.order_status === 'waiting_for_rider') {
          return 'Return order is approved and ready for pickup. Please proceed to the buyer to pick up the returned item.';
        }
        return 'You have accepted this return delivery. Waiting for the buyer to mark it as ready for pickup.';
      case 'pending':
        return 'This return order is pending your response. Please accept or decline within the time limit.';
      case 'picked_up':
        return 'You have picked up the returned item from the buyer and are now on your way to deliver it back to the seller.';
      case 'delivered':
        return 'This return has been successfully delivered back to the seller.';
      case 'failed':
        if (orderDetails?.delivery?.failed_reason === 'return_to_seller') {
          return 'Return delivery failed. Items are being returned to the seller.';
        }
        return 'This return delivery has failed. Please check the reason for more details.';
      default:
        return getDefaultStatusMessage(status);
    }
  }
  
  // Original messages for normal deliveries
  switch (status?.toLowerCase()) {
    case 'accepted':
      if (orderDetails?.order_status === 'rider_assigned') {
        return 'You have accepted this delivery. Waiting for the seller to mark the order as ready for pickup.';
      }
      if (orderDetails?.order_status === 'waiting_for_rider') {
        return 'Order is approved and ready for pickup. Please proceed to the seller to pick up the items.';
      }
      return 'You have accepted this delivery. Waiting for the seller to mark it as ready for pickup.';
    case 'pending':
      return 'This order is pending your response. Please accept or decline within the time limit.';
    case 'picked_up':
      return 'You have picked up the items and are now on your way to deliver to the customer.';
    case 'delivered':
      return 'This order has been successfully delivered to the customer.';
    case 'failed':
      if (orderDetails?.delivery?.failed_reason === 'return_to_seller') {
        return 'Delivery failed. Items are being returned to the seller.';
      }
      return 'This delivery has failed. Please check the reason for more details.';
    case 'cancelled':
      return 'This order has been cancelled.';
    case 'declined':
      return 'You have declined this delivery order.';
    default:
      return '';
  }
};

// Helper function for default messages
const getDefaultStatusMessage = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'cancelled':
      return 'This return has been cancelled.';
    case 'declined':
      return 'You have declined this return order.';
    default:
      return '';
  }
};

  // Format shop address from shop fields
  const formatShopAddress = (item: OrderItem) => {
    const parts = [];
    if (item.shop_street) parts.push(item.shop_street);
    if (item.shop_barangay) parts.push(item.shop_barangay);
    if (item.shop_city) parts.push(item.shop_city);
    if (item.shop_province) parts.push(item.shop_province);
    return parts.length > 0 ? parts.join(', ') : 'Shop address not available';
  };

  // Refresh control
  const onRefresh = () => {
    setRefreshing(true);
    fetchOrderDetails();
  };

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    } else {
      setIsLoading(false);
      Alert.alert('Error', 'Order ID is missing');
    }
  }, [orderId]);

  // Loading skeleton
  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={{ padding: 16 }}>
          <ActivityIndicator size="large" color="#EE4D2D" />
          <Text style={{ textAlign: 'center', marginTop: 16, color: '#6B7280' }}>Loading order details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!orderDetails) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }}>
          <Ionicons name="alert-circle-outline" size={64} color="#9CA3AF" />
          <Text style={{ fontSize: 16, color: '#6B7280', marginTop: 16, textAlign: 'center' }}>
            Order details not found
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginTop: 24, backgroundColor: '#EE4D2D', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const showAcceptDecline = orderDetails.delivery?.status === 'pending' || orderDetails.delivery?.status === 'pending_offer';
  const isReturnPickupAccepted = orderDetails?.return_request?.status === 'pickup_accepted';
  // Check if this is a return delivery waiting for buyer to mark as ready
  const isReturnWaitingForBuyer = isReturnDelivery && 
    orderDetails.delivery?.status === 'accepted' && 
    orderDetails?.return_request?.status === 'pickup_accepted';
  
  // Show accepted actions ALWAYS when conditions are met (but we'll disable the button when waiting)
  const showAcceptedActions = (orderDetails.delivery?.status === 'accepted') || 
    (isReturnDelivery && isReturnPickupAccepted);
  const showInTransitActions = orderDetails.delivery?.status === 'picked_up';
  const showDelivered = orderDetails.delivery?.status === 'delivered';
  const statusMessage = getStatusMessage(orderDetails.delivery?.status);
  const isAccepted = orderDetails.delivery?.status === 'accepted';
  const statusColor = getStatusColor(orderDetails.delivery?.status);
  const statusLabel = getStatusLabel(orderDetails.delivery?.status);

  // Get unique seller info from first item (assuming all items are from same seller for this delivery)
  const sellerInfo = orderDetails.items?.[0] || null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Custom Header with Back Button and Title - Edge to Edge */}
      {/* Custom Header with Back Button and Title - Edge to Edge */}
<View style={{ 
  backgroundColor: '#FFFFFF', 
  paddingTop: 12, 
  paddingBottom: 12,
  borderBottomWidth: 1,
  borderBottomColor: '#F3F4F6'
}}>
  <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 }}>
    <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
      <Ionicons name="arrow-back" size={24} color="#1F2937" />
    </TouchableOpacity>
    <Text style={{ fontSize: 18, fontWeight: '600', color: '#1F2937' }}>
      {isReturnDelivery ? 'Return Order Details' : 'Order Details'}
    </Text>
    {isReturnDelivery && (
      <View style={{ 
        marginLeft: 8, 
        backgroundColor: '#8B5CF6', 
        paddingHorizontal: 8, 
        paddingVertical: 2, 
        borderRadius: 12 
      }}>
        <Text style={{ fontSize: 10, color: '#FFFFFF', fontWeight: '600' }}>RETURN</Text>
      </View>
    )}
  </View>
</View>
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Combined Status Card - Edge to Edge */}
        <View style={{ 
          backgroundColor: '#FFFFFF', 
          borderBottomWidth: 1, 
          borderTopWidth: 1, 
          borderColor: '#F3F4F6',
          marginBottom: -1
        }}>
          <View style={{ padding: 16 }}>
            {/* Status Badge Row */}
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: statusMessage ? 12 : 0
            }}>
              <Text style={{ fontSize: 14, color: '#6B7280' }}>Order Status</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: statusColor, marginRight: 6 }} />
                <Text style={{ fontSize: 14, fontWeight: '600', color: statusColor }}>
                  {statusLabel}
                </Text>
              </View>
            </View>

            
            {/* Status Message */}
            {statusMessage ? (
              <View style={{ 
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: isAccepted ? '#EFF6FF' : '#FEF3C7',
                padding: 12,
                borderRadius: 8,
                marginTop: 8,
              }}>
                <Ionicons 
                  name={isAccepted ? "information-circle" : "information-circle"} 
                  size={20} 
                  color={isAccepted ? "#3B82F6" : "#F59E0B"} 
                />
                <Text style={{ 
                  fontSize: 13, 
                  color: isAccepted ? '#1E40AF' : '#92400E', 
                  marginLeft: 10, 
                  flex: 1,
                  lineHeight: 18
                }}>
                  {statusMessage}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* FAILED SECTION - Shown when status is failed */}
{/* FAILED SECTION - Shown when status is failed */}
{orderDetails.delivery?.status === 'failed' && (
  <View style={{ 
    backgroundColor: '#FFFFFF', 
    borderBottomWidth: 1, 
    borderTopWidth: 1, 
    borderColor: '#F3F4F6',
    marginBottom: -1,
    marginTop: -1
  }}>
    <View style={{ padding: 16 }}>
      {/* Determine which failed UI to show */}
      {orderDetails.delivery?.failed_reason === 'return_to_seller' ? (
        // Return to Seller UI
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Ionicons name="return-down-back-outline" size={20} color="#D97706" />
            <Text style={{ fontSize: 15, fontWeight: '600', marginLeft: 8, color: '#92400E' }}>
              Failed - Return to Seller
            </Text>
          </View>
          
          <View style={{ backgroundColor: '#FFFBEB', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#FDE68A' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="time-outline" size={14} color="#B45309" />
              <Text style={{ fontSize: 12, color: '#92400E', marginLeft: 6 }}>
                Failed on {formatDate(orderDetails.delivery?.created_at)} {/* Changed from updated_at to created_at */}
              </Text>
            </View>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="alert-circle-outline" size={14} color="#B45309" />
              <Text style={{ fontSize: 12, color: '#92400E', marginLeft: 6, flex: 1 }}>
                Items are being returned to the seller
              </Text>
            </View>
            
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <Ionicons name="storefront-outline" size={14} color="#B45309" style={{ marginTop: 1 }} />
              <Text style={{ fontSize: 12, color: '#92400E', marginLeft: 6, flex: 1 }}>
                Return to: {sellerInfo?.shop_name || 'Seller'}
              </Text>
            </View>
          </View>
        </>
      ) : (
        // Generic Failed UI
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Ionicons name="close-circle-outline" size={20} color="#DC2626" />
            <Text style={{ fontSize: 15, fontWeight: '600', marginLeft: 8, color: '#DC2626' }}>
              Delivery Failed
            </Text>
          </View>
          
          <View style={{ backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#FEE2E2' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="time-outline" size={14} color="#DC2626" />
              <Text style={{ fontSize: 12, color: '#991B1B', marginLeft: 6 }}>
                Failed on {formatDate(orderDetails.delivery?.created_at)} {/* Changed from updated_at to created_at */}
              </Text>
            </View>
            
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <Ionicons name="information-circle-outline" size={14} color="#DC2626" style={{ marginTop: 1 }} />
              <Text style={{ fontSize: 12, color: '#991B1B', marginLeft: 6, flex: 1 }}>
                Reason: {orderDetails.delivery?.failed_reason?.replace(/_/g, ' ') || 'Unknown'}
              </Text>
            </View>
          </View>
        </>
      )}
    </View>
  </View>
)}

        {/* DELIVERED SECTION - Shown when status is delivered */}
        {showDelivered && (
          <View style={{ 
            backgroundColor: '#FFFFFF', 
            borderBottomWidth: 1, 
            borderTopWidth: 1, 
            borderColor: '#F3F4F6',
            marginBottom: -1,
            marginTop: -1
          }}>
            <View style={{ padding: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={{ fontSize: 15, fontWeight: '600', marginLeft: 8, color: '#1F2937' }}>Delivery Complete</Text>
              </View>
              
              <View style={{ backgroundColor: '#F0FDF4', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#BBF7D0' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Ionicons name="time-outline" size={14} color="#059669" />
                  <Text style={{ fontSize: 12, color: '#065F46', marginLeft: 6 }}>
                    Delivered on {formatDate(orderDetails.delivery?.delivered_at)}
                  </Text>
                </View>
                
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 }}>
                  <Ionicons name="location-outline" size={14} color="#059669" style={{ marginTop: 1 }} />
                  <Text style={{ fontSize: 12, color: '#065F46', marginLeft: 6, flex: 1 }}>
                    {orderDetails.shipping_address?.full_address || 'Address not available'}
                  </Text>
                </View>

                {/* Proof Images Gallery - Smaller */}
                {loadingProofs ? (
                  <ActivityIndicator size="small" color="#10B981" />
                ) : proofImages.length > 0 ? (
                  <View>
                    <Text style={{ fontSize: 11, color: '#065F46', marginBottom: 8, fontWeight: '500' }}>
                      Proof of Delivery ({proofImages.length})
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {proofImages.map((proof, index) => {
                        const imageUrl = proof.file_url || proof.file_data;
                        if (!imageUrl) return null;
                        return (
                          <TouchableOpacity
                            key={proof.id || index}
                            onPress={() => {
                              setSelectedImage(imageUrl);
                              setPreviewVisible(true);
                            }}
                          >
                            <Image 
                              source={{ uri: imageUrl }} 
                              style={{ width: 60, height: 60, borderRadius: 8, borderWidth: 1, borderColor: '#BBF7D0' }}
                            />
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ) : (
                  <Text style={{ fontSize: 11, color: '#065F46', fontStyle: 'italic' }}>
                    No proof photos available
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* CARD 1: Order Information (Buyer Info + Order Details) - Edge to Edge */}
        {/* CARD 1: Order/Refund Information - Edge to Edge */}
<View style={{ backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderTopWidth: 1, borderColor: '#F3F4F6', marginBottom: -1, marginTop: -1 }}>
  <View style={{ padding: 16 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
      <Ionicons name={isReturnDelivery ? "cash-outline" : "receipt-outline"} size={22} color="#EE4D2D" />
      <Text style={{ fontSize: 16, fontWeight: '600', marginLeft: 8 }}>
        {isReturnDelivery ? 'Refund Information' : 'Order Information'}
      </Text>
    </View>
    
    {/* For Return Deliveries - Show Refund Details */}
    {isReturnDelivery ? (
      <>
        {/* Refund ID */}
        <View style={{ marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontSize: 13, color: '#6B7280' }}>Refund ID</Text>
            <Text style={{ fontSize: 13, fontWeight: '500', color: '#1F2937' }}>#{orderDetails.refund_id?.slice(-12) || 'N/A'}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontSize: 13, color: '#6B7280' }}>Refund Status</Text>
            <Text style={{ fontSize: 13, fontWeight: '500', color: '#10B981' }}>
              {orderDetails.return_request?.status?.replace(/_/g, ' ').toUpperCase() || 'N/A'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontSize: 13, color: '#6B7280' }}>Refund Type</Text>
            <Text style={{ fontSize: 13, fontWeight: '500', color: '#1F2937' }}>Return Item</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 13, color: '#6B7280' }}>Refund Method</Text>
            <Text style={{ fontSize: 13, fontWeight: '500', color: '#1F2937' }}>
              {orderDetails.return_request?.return_method || 'N/A'}
            </Text>
          </View>
        </View>
        
        {/* Total Refund Amount - Highlighted */}
        <View style={{ marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#1F2937' }}>Total Refund Amount</Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#10B981' }}>
              {formatCurrency(
                orderDetails.refund_items?.reduce((sum, item) => sum + parseFloat(item.amount), 0) || 0
              )}
            </Text>
          </View>
        </View>
        
        {/* Original Order Details (collapsible/inline) */}
        <View>
          <Text style={{ fontSize: 13, fontWeight: '500', color: '#6B7280', marginBottom: 8 }}>Original Order Details</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ fontSize: 12, color: '#9CA3AF' }}>Order ID</Text>
            <Text style={{ fontSize: 12, color: '#6B7280' }}>#{orderDetails.order_id?.slice(-12)}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ fontSize: 12, color: '#9CA3AF' }}>Original Total</Text>
            <Text style={{ fontSize: 12, color: '#6B7280' }}>{formatCurrency(orderDetails.total_amount)}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ fontSize: 12, color: '#9CA3AF' }}>Payment Method</Text>
            <Text style={{ fontSize: 12, color: '#6B7280' }}>{orderDetails.payment_method || 'N/A'}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 12, color: '#9CA3AF' }}>Order Date</Text>
            <Text style={{ fontSize: 12, color: '#6B7280' }}>{formatDate(orderDetails.created_at)}</Text>
          </View>
        </View>
      </>
    ) : (
      // For Normal Deliveries - Show Order Details
      <>
        {/* Order Details */}
        <View style={{ marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontSize: 13, color: '#6B7280' }}>Order ID</Text>
            <Text style={{ fontSize: 13, fontWeight: '500', color: '#1F2937' }}>#{orderDetails.order_id?.slice(-12)}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontSize: 13, color: '#6B7280' }}>Total Amount</Text>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#EE4D2D' }}>{formatCurrency(orderDetails.total_amount)}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontSize: 13, color: '#6B7280' }}>Delivery Fee</Text>
            <Text style={{ fontSize: 13, fontWeight: '500', color: '#1F2937' }}>
              {formatCurrency(orderDetails.delivery?.delivery_fee || 0)}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontSize: 13, color: '#6B7280' }}>Payment Method</Text>
            <Text style={{ fontSize: 13, color: '#1F2937' }}>{orderDetails.payment_method || 'N/A'}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontSize: 13, color: '#6B7280' }}>Delivery Method</Text>
            <Text style={{ fontSize: 13, color: '#1F2937' }}>{orderDetails.delivery_method || 'Standard'}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 13, color: '#6B7280' }}>Order Date</Text>
            <Text style={{ fontSize: 13, color: '#1F2937' }}>{formatDate(orderDetails.created_at)}</Text>
          </View>
        </View>
        
        {/* Buyer Information - Using Shipping Address for contact */}
        <View>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 12 }}>Buyer Information</Text>
          <Text style={{ fontSize: 14, fontWeight: '500', color: '#1F2937', marginBottom: 4 }}>
            {orderDetails.shipping_address?.recipient_name || orderDetails.customer?.name || 'N/A'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name="call-outline" size={14} color="#6B7280" />
            <Text style={{ fontSize: 13, color: '#6B7280', marginLeft: 6 }}>
              {orderDetails.shipping_address?.recipient_phone || 'N/A'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name="mail-outline" size={14} color="#6B7280" />
            <Text style={{ fontSize: 13, color: '#6B7280', marginLeft: 6 }}>
              {orderDetails.customer?.email || 'N/A'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <Ionicons name="location-outline" size={14} color="#6B7280" style={{ marginTop: 2 }} />
            <Text style={{ fontSize: 13, color: '#6B7280', marginLeft: 6, flex: 1 }}>
              {orderDetails.shipping_address?.full_address || 'N/A'}
            </Text>
          </View>
        </View>
      </>
    )}
  </View>
</View>

        {/* CARD 2: Seller Information - Edge to Edge */}
        <View style={{ backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderTopWidth: 1, borderColor: '#F3F4F6', marginBottom: -1, marginTop: -1 }}>
          <View style={{ padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Ionicons name="storefront-outline" size={22} color="#EE4D2D" />
              <Text style={{ fontSize: 16, fontWeight: '600', marginLeft: 8 }}>Seller Information</Text>
            </View>
            
            <Text style={{ fontSize: 14, fontWeight: '500', color: '#1F2937', marginBottom: 4 }}>
              {sellerInfo?.seller_name || 'N/A'}
            </Text>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="business-outline" size={14} color="#6B7280" />
              <Text style={{ fontSize: 13, color: '#6B7280', marginLeft: 6 }}>Shop: {sellerInfo?.shop_name || 'N/A'}</Text>
            </View>
            
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <Ionicons name="location-outline" size={14} color="#6B7280" style={{ marginTop: 2 }} />
              <Text style={{ fontSize: 13, color: '#6B7280', marginLeft: 6, flex: 1 }}>
                {sellerInfo ? formatShopAddress(sellerInfo) : 'Shop address not available'}
              </Text>
            </View>
          </View>
        </View>

      

        {/* CARD 3: Order Items - Edge to Edge */}
{/* CARD 3: Order Items - Edge to Edge */}
<View style={{ backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderTopWidth: 1, borderColor: '#F3F4F6', marginBottom: (showAcceptDecline || showAcceptedActions || showInTransitActions || showDelivered) ? 0 : 80, marginTop: -1 }}>
  <View style={{ padding: 16 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
      <Ionicons name="cube-outline" size={22} color="#EE4D2D" />
      <Text style={{ fontSize: 16, fontWeight: '600', marginLeft: 8 }}>Order Items</Text>
      <Text style={{ fontSize: 13, color: '#6B7280', marginLeft: 6 }}>({orderDetails.items?.length || 0})</Text>
    </View>
    
    {orderDetails.items && orderDetails.items.map((item, index) => {
      // For return deliveries, find the refund amount from refund_items
      let refundAmount = null;
      if (isReturnDelivery && orderDetails.refund_items && orderDetails.refund_items.length > 0) {
        const refundItem = orderDetails.refund_items.find(
          (ri: any) => ri.checkout_id === item.checkout_id
        );
        if (refundItem) {
          refundAmount = parseFloat(refundItem.amount);
          console.log(`Found refund amount for ${item.product_name}: ${refundAmount}`);
        } else {
          console.log(`No refund item found for checkout_id: ${item.checkout_id}`);
        }
      }
      
      return (
        <View key={item.checkout_id} style={{ marginBottom: index === orderDetails.items.length - 1 ? 0 : 16, paddingBottom: index === orderDetails.items.length - 1 ? 0 : 16, borderBottomWidth: index === orderDetails.items.length - 1 ? 0 : 1, borderBottomColor: '#F3F4F6' }}>
          <View style={{ flexDirection: 'row' }}>
            {/* Product Image */}
            <View style={{ width: 70, height: 70, borderRadius: 8, backgroundColor: '#F3F4F6', marginRight: 12, overflow: 'hidden' }}>
              {item.product_image && !imageErrors[item.product_id] ? (
                <Image 
                  source={{ uri: item.product_image }} 
                  style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
                  onError={() => handleImageError(item.product_id)}
                />
              ) : (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="image-outline" size={24} color="#9CA3AF" />
                </View>
              )}
            </View>
            
            {/* Product Details */}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 4 }}>{item.product_name}</Text>
              
              {item.variant_name && item.variant_name !== 'Default' && (
                <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 2 }}>
                  Variant: {item.variant_name}
                </Text>
              )}
              
              {item.dimensions && (
                <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 2 }}>
                  Dimensions: {item.dimensions}
                </Text>
              )}
              
              {item.weight && (
                <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 2 }}>
                  Weight: {item.weight}
                </Text>
              )}
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                <Text style={{ fontSize: 12, color: '#6B7280' }}>Quantity: {item.quantity}</Text>
                {/* Show refund amount for return deliveries, regular price for normal deliveries */}
                {isReturnDelivery && refundAmount !== null ? (
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#10B981' }}>
                    Refund: {formatCurrency(refundAmount)}
                  </Text>
                ) : (
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#0e0a09' }}>
                    {formatCurrency(item.total)}
                  </Text>
                )}
              </View>
              
              {/* Show original price for comparison on return deliveries */}
              {isReturnDelivery && refundAmount !== null && (
                <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                  Original: {formatCurrency(item.total)}
                </Text>
              )}
              
              {item.remarks && (
                <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
                  Note: {item.remarks}
                </Text>
              )}
            </View>
          </View>
        </View>
      );
    })}
  </View>
</View>
      </ScrollView>

      {/* Custom Confirmation Modal */}
<Modal
  visible={confirmationModalVisible}
  transparent={true}
  animationType="none"
  onRequestClose={() => setConfirmationModalVisible(false)}
>
  <View style={{
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  }}>
    <View style={{
      backgroundColor: '#FFFFFF',
      borderRadius: 20,
      width: width - 48,
      maxWidth: 340,
      padding: 24,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    }}>
      {/* Icon */}
      <View style={{
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: `${confirmationConfig.iconColor}15`,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
      }}>
        <Ionicons
          name={confirmationConfig.icon}
          size={32}
          color={confirmationConfig.iconColor}
        />
      </View>

      {/* Title */}
      <Text style={{
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
        textAlign: 'center',
        marginBottom: 8,
      }}>
        {confirmationConfig.title}
      </Text>

      {/* Message */}
      <Text style={{
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
      }}>
        {confirmationConfig.message}
      </Text>

      {/* Buttons */}
      <View style={{
        flexDirection: 'row',
        gap: 12,
        width: '100%',
      }}>
       <TouchableOpacity
  onPress={() => {
    setConfirmationModalVisible(false);
    // Just close the modal, don't call onConfirm
  }}
  style={{
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  }}
>
          <Text style={{
            fontSize: 15,
            fontWeight: '600',
            color: '#6B7280',
            textAlign: 'center',
          }}>
            {confirmationConfig.cancelText}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setConfirmationModalVisible(false);
            confirmationConfig.onConfirm();
          }}
          style={{
            flex: 1,
            backgroundColor: confirmationConfig.confirmColor,
            paddingVertical: 12,
            borderRadius: 10,
          }}
        >
          <Text style={{
            fontSize: 15,
            fontWeight: '600',
            color: '#FFFFFF',
            textAlign: 'center',
          }}>
            {confirmationConfig.confirmText}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>

{/* Failed Delivery Reason Modal */}
<Modal
  visible={failedReasonModalVisible}
  transparent={true}
  animationType="none"
  onRequestClose={() => setFailedReasonModalVisible(false)}
>
  <View style={{
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  }}>
    <View style={{
      backgroundColor: '#FFFFFF',
      borderRadius: 20,
      width: width - 48,
      maxWidth: 340,
      padding: 24,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    }}>
      {/* Icon */}
      <View style={{
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#FEE2E2',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
      }}>
        <Ionicons name="alert-circle-outline" size={32} color="#DC2626" />
      </View>

      {/* Title */}
      <Text style={{
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
        textAlign: 'center',
        marginBottom: 8,
      }}>
        Why did the delivery fail?
      </Text>

      {/* Message */}
      <Text style={{
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
      }}>
        Please select the reason for failed delivery
      </Text>

      {/* Reason Options */}
      <View style={{ width: '100%', gap: 12, marginBottom: 24 }}>
        {/* Customer Unreachable Option */}
        <TouchableOpacity
          onPress={() => {
            setSelectedFailedReason('customer_unreachable');
            submitFailedDelivery('customer_unreachable');
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: 16,
            backgroundColor: '#FEF2F2',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#FEE2E2',
          }}
        >
          <View style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: '#FEE2E2',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12,
          }}>
            <Ionicons name="call-outline" size={20} color="#DC2626" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937' }}>
              Customer Unreachable
            </Text>
            <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
              Unable to contact or locate the customer
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        {/* Return to Seller (RTS) Option */}
        <TouchableOpacity
          onPress={() => {
            setSelectedFailedReason('return_to_seller');
            submitFailedDelivery('return_to_seller');
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: 16,
            backgroundColor: '#FFFBEB',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#FDE68A',
          }}
        >
          <View style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: '#FEF3C7',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12,
          }}>
            <Ionicons name="return-down-back-outline" size={20} color="#D97706" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937' }}>
              Return to Seller (RTS)
            </Text>
            <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
              Items need to be returned to the seller
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* Cancel Button */}
      <TouchableOpacity
        onPress={() => {
          setFailedReasonModalVisible(false);
          setSelectedFailedReason(null);
        }}
        style={{
          width: '100%',
          backgroundColor: '#F3F4F6',
          paddingVertical: 12,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: '#E5E7EB',
        }}
      >
        <Text style={{
          fontSize: 15,
          fontWeight: '600',
          color: '#6B7280',
          textAlign: 'center',
        }}>
          Cancel
        </Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>

          {showAcceptDecline && (
            <View style={{ 
              backgroundColor: '#FFFFFF', 
              borderTopWidth: 1, 
              borderTopColor: '#E5E7EB',
              paddingTop: 12,
              paddingBottom: 20,
            }}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  onPress={handleDeclineDelivery}
                  disabled={isActionLoading || declineLimitInfo.hasReachedLimit}
                  style={{
                    flex: 1,
                    backgroundColor: declineLimitInfo.hasReachedLimit ? '#9CA3AF' : '#FFFFFF',
                    paddingVertical: 14,
                    borderRadius: 0,
                    borderWidth: 1,
                    borderColor: '#DC2626',
                    marginLeft: 16,
                    opacity: declineLimitInfo.hasReachedLimit ? 0.7 : 1,
                  }}
                >
                  <Text style={{ 
                    fontSize: 16, 
                    fontWeight: '600', 
                    color: declineLimitInfo.hasReachedLimit ? '#FFFFFF' : '#DC2626', 
                    textAlign: 'center' 
                  }}>
                    {declineLimitInfo.hasReachedLimit ? 'Limit Reached' : (isActionLoading ? 'Processing...' : `Decline (${declineLimitInfo.declinesRemaining} left)`)}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={handleAcceptDelivery}
                  disabled={isActionLoading}
                  style={{
                    flex: 1,
                    backgroundColor: '#EE4D2D',
                    paddingVertical: 14,
                    borderRadius: 0,
                    marginRight: 16,
                  }}
                >
                  <Text style={{ 
                    fontSize: 16, 
                    fontWeight: '600', 
                    color: '#FFFFFF', 
                    textAlign: 'center' 
                  }}>
                    {isActionLoading ? 'Processing...' : 'Accept'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

      {/* Edge-to-Edge Action Buttons for Accepted Status - Mark as Picked Up and Cancel */}
      {/* Edge-to-Edge Action Buttons for Accepted Status - Mark as Picked Up and Cancel */}
{showAcceptedActions && (
  <View style={{ 
    backgroundColor: '#FFFFFF', 
    borderTopWidth: 1, 
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
    paddingBottom: 20,
  }}>
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <TouchableOpacity
        onPress={handleCancelAcceptedOrder}
        disabled={isActionLoading}
        style={{
          flex: 1,
          backgroundColor: '#FFFFFF',
          paddingVertical: 14,
          borderRadius: 0,
          borderWidth: 1,
          borderColor: '#DC2626',
          marginLeft: 16,
        }}
      >
        <Text style={{ 
          fontSize: 16, 
          fontWeight: '600', 
          color: '#DC2626', 
          textAlign: 'center' 
        }}>
          {isActionLoading ? 'Processing...' : 'Cancel'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        onPress={handleMarkPickedUp}
        disabled={isActionLoading || isReturnWaitingForBuyer || orderDetails?.order_status === 'rider_assigned'}
        style={{
          flex: 1,
          backgroundColor: (isReturnWaitingForBuyer || orderDetails?.order_status === 'rider_assigned') ? '#9CA3AF' : '#3B82F6',
          paddingVertical: 14,
          borderRadius: 0,
          marginRight: 16,
          opacity: (isReturnWaitingForBuyer || orderDetails?.order_status === 'rider_assigned') ? 0.7 : 1,
        }}
      >
        <Text style={{ 
          fontSize: 16, 
          fontWeight: '600', 
          color: '#FFFFFF', 
          textAlign: 'center' 
        }}>
          {isReturnWaitingForBuyer 
            ? 'Waiting for Buyer' 
            : (orderDetails?.order_status === 'rider_assigned' 
              ? 'Waiting for Seller' 
              : (isActionLoading ? 'Processing...' : 'Mark as Picked Up'))}
        </Text>
      </TouchableOpacity>
    </View>
  </View>
)}

      {/* Edge-to-Edge Action Buttons for In Transit Status - View Route, Failed, and Mark as Delivered */}
      {showInTransitActions && (
        <View style={{ 
          backgroundColor: '#FFFFFF', 
          borderTopWidth: 1, 
          borderTopColor: '#E5E7EB',
          paddingTop: 12,
          paddingBottom: 20,
        }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              onPress={handleViewRoute}
              disabled={isActionLoading}
              style={{
                flex: 1,
                backgroundColor: '#3B82F6',
                paddingVertical: 14,
                borderRadius: 0,
                marginLeft: 16,
              }}
            >
              <Text style={{ 
                fontSize: 16, 
                fontWeight: '600', 
                color: '#FFFFFF', 
                textAlign: 'center' 
              }}>
                View Route
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={handleFailedDelivery}
              disabled={isActionLoading}
              style={{
                flex: 1,
                backgroundColor: '#FFFFFF',
                paddingVertical: 14,
                borderRadius: 0,
                borderWidth: 1,
                borderColor: '#DC2626',
              }}
            >
              <Text style={{ 
                fontSize: 16, 
                fontWeight: '600', 
                color: '#DC2626', 
                textAlign: 'center' 
              }}>
                {isActionLoading ? 'Processing...' : 'Failed'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={handleMarkDelivered}
              disabled={isActionLoading}
              style={{
                flex: 1,
                backgroundColor: '#10B981',
                paddingVertical: 14,
                borderRadius: 0,
                marginRight: 16,
              }}
            >
              <Text style={{ 
                fontSize: 16, 
                fontWeight: '600', 
                color: '#FFFFFF', 
                textAlign: 'center' 
              }}>
                {isActionLoading ? 'Processing...' : 'Delivered'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Image Preview Modal */}
      <Modal visible={previewVisible} transparent animationType="none">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity
            style={{ position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 8 }}
            onPress={() => setPreviewVisible(false)}
          >
            <Ionicons name="close" size={30} color="#FFFFFF" />
          </TouchableOpacity>
          {selectedImage && (
            <Image source={{ uri: selectedImage }} style={{ width: '90%', height: '70%', resizeMode: 'contain' }} />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}