// view-order.tsx
import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl
} from 'react-native';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useLocalSearchParams, router } from 'expo-router';
import AxiosInstance from '../../contexts/axios';

interface OrderItem {
  checkout_id: string;
  product_id: string;
  product_name: string;
  product_description: string;
  product_variant: string;
  quantity: number;
  price: string;
  original_price: string;
  subtotal: string;
  status: string;
  purchased_at: string;
  product_images: Array<{
    id: string;
    url: string;
    file_type: string;
  }>;
  primary_image: {
    url: string;
    file_type: string;
  } | null;
  shop_info: {
    id: string;
    name: string;
    picture: string | null;
    description: string;
    items_count: number;
    followers_count: number;
    is_choices: boolean;
    is_new: boolean;
  };
  can_review: boolean;
  can_return: boolean;
  return_deadline: string | null;
}

interface ShippingInfo {
  logistics_carrier: string;
  tracking_number: string | null;
  delivery_method: string;
  estimated_delivery: string | null;
}

interface DeliveryAddress {
  recipient_name: string;
  phone_number: string;
  address: string;
  address_details: {
    street: string;
    barangay: string;
    city: string;
    province: string;
    postal_code: string;
  };
}

interface OrderSummary {
  subtotal: string;
  shipping_fee: string;
  tax: string;
  discount: string;
  total: string;
  payment_fee: string;
}

interface TimelineEvent {
  event: string;
  date: string | null;
  description: string;
  icon: string;
  color: string;
  completed: boolean;
}

interface OrderData {
  order: {
    id: string;
    status: string;
    status_display: string;
    status_color: string;
    created_at: string;
    updated_at: string | null;
    completed_at: string | null;
    payment_method: string;
    payment_status: string | null;
    delivery_status: string | null;
    delivery_rider: string | null;
    delivery_notes: string | null;
    delivery_date: string | null;
    shop_name?: string; 
    shop_id?: string;
  };
  shipping_info: ShippingInfo;
  delivery_address: DeliveryAddress;
  items: OrderItem[];
  order_summary: OrderSummary;
  summary_counts: {
    total_items: number;
    total_unique_items: number;
  };
  timeline: TimelineEvent[];
  actions: {
    can_cancel: boolean;
    can_track: boolean;
    can_review: boolean;
    can_return: boolean;
    can_contact_seller: boolean;
    can_buy_again: boolean;
  };
  proof_images?: Array<{  
    id: string;
    file_url: string;
    file_type: string;
    uploaded_at: string;
    proof_type?: string;
    proof_type_display?: string;
  }>;
}

export default function ViewTrackOrderPage() {
  const { user, userRole } = useAuth();
  const { orderId } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [proofs, setProofs] = useState<any[]>([]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id && orderId) {
      fetchOrderData();
    }
  }, [user?.id, orderId]);

  const fetchOrderData = async () => {
    if (!user?.id || !orderId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await AxiosInstance.get(
        `/purchases-buyer/${orderId}/view-order/`,
        {
          headers: {
            'X-User-Id': user.id,
          },
        }
      );
      
      if (response.data) {
        // Normalize response to avoid runtime crashes when fields are missing
        const data = response.data as any;

        // Ensure items is an array and each item has required sub-objects
        data.items = Array.isArray(data.items) ? data.items.map((item: any) => ({
          checkout_id: item.checkout_id || '',
          product_id: item.product_id || '',
          product_name: item.product_name || 'Unknown Product',
          product_description: item.product_description || '',
          product_variant: item.product_variant || '',
          quantity: item.quantity ?? 0,
          price: item.price ?? '0',
          original_price: item.original_price ?? '0',
          subtotal: item.subtotal ?? '0',
          status: item.status ?? '',
          purchased_at: item.purchased_at ?? null,
          product_images: Array.isArray(item.product_images) ? item.product_images : [],
          primary_image: item.primary_image || { url: null, file_type: null },
          shop_info: item.shop_info || {
            id: '',
            name: item.shop_name || 'Unknown Shop', // Fallback to shop_name if available
            picture: null,
            description: '',
            items_count: 0,
            followers_count: 0,
            is_choices: false,
            is_new: false,
          },
          can_review: item.can_review ?? false,
          can_return: item.can_return ?? false,
          return_deadline: item.return_deadline ?? null,
        })) : [];

        data.timeline = Array.isArray(data.timeline) ? data.timeline : [];

        // Normalize order summary and compute total if missing
        const rawSummary = data.order_summary || {};
        const computedSubtotal = data.items.reduce((sum: number, it: any) => sum + (parseFloat(it.subtotal || '0') || 0), 0).toFixed(2);
        const subtotalStr = rawSummary.subtotal ?? computedSubtotal;
        const shippingFeeStr = rawSummary.shipping_fee ?? '0';
        const discountStr = rawSummary.discount ?? '0';
        const taxStr = rawSummary.tax ?? '0';
        const totalStr = rawSummary.total ?? ((parseFloat(subtotalStr || '0') + parseFloat(shippingFeeStr || '0') - parseFloat(discountStr || '0') + parseFloat(taxStr || '0')).toFixed(2));

        data.order_summary = {
          subtotal: subtotalStr,
          shipping_fee: shippingFeeStr,
          tax: taxStr,
          discount: discountStr,
          total: totalStr,
          payment_fee: rawSummary.payment_fee ?? '0'
        };

        data.summary_counts = data.summary_counts || { total_items: data.items.length || 0, total_unique_items: data.items.length || 0 };
        data.actions = data.actions || { can_cancel: false, can_track: false, can_review: false, can_return: false, can_contact_seller: false, can_buy_again: false };
        data.shipping_info = data.shipping_info || { logistics_carrier: '', tracking_number: null, delivery_method: '', estimated_delivery: null };
        data.delivery_address = data.delivery_address || { recipient_name: '', phone_number: '', address: '', address_details: { street: '', barangay: '', city: '', province: '', postal_code: '' } };

        // Ensure order object has shop_name if available from first item
        // Ensure order object has shop_name and shop_id if available from first item
          if (!data.order.shop_name && data.items.length > 0 && data.items[0].shop_info?.name) {
            data.order.shop_name = data.items[0].shop_info.name;
            data.order.shop_id = data.items[0].shop_info.id;
          }

        setOrderData(data);
// Set proofs from order data if available (like seller side)
if (data.proof_images && data.proof_images.length > 0) {
  setProofs(data.proof_images);
} else {
  setProofs([]);
}
      }
    } catch (error: any) {
      console.error('Error fetching order details:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to load order details'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrderData();
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });
  };



  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: string) => {
    return `₱${parseFloat(amount).toFixed(2)}`;
  };

  // Map internal status values to user-facing labels
  const getStatusText = (orderObj: any) => {
    const s = String(orderObj?.status || '').toLowerCase();
    switch (s) {
      case 'pending':
        return 'Pending';
      case 'processing':
        return 'Processing';
      case 'ready_for_pickup':
        return 'Ready for Pickup';
      case 'shipped':
        return 'Shipped';
      case 'delivered':
        return 'Delivered';
      case 'cancelled':
        return 'Cancelled';
      case 'refunded':
        return 'Refunded';
      case 'picked_up':
        return 'Picked up';
      default:
        return orderObj?.status_display || orderObj?.status || '';
    }
  }; 

  const handleCancelOrder = () => {
    if (!orderId || !user?.id) return;
    
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              const response = await AxiosInstance.post(
                `/purchases-buyer/${orderId}/cancel/`,
                null,
                {
                  headers: {
                    'X-User-Id': user.id,
                  },
                }
              );
              
              if (response.data.success) {
                Alert.alert('Success', 'Order cancelled successfully');
                fetchOrderData(); // Refresh data
              }
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.error || 'Failed to cancel order');
            }
          }
        }
      ]
    );
  };
  const handleOrderReceived = async () => {
    if (!orderId || !user?.id) return;
    
    Alert.alert(
      'Confirm Order Received',
      'Have you received your order? This will mark the order as completed.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              const response = await AxiosInstance.patch(
                `/purchases-buyer/${orderId}/complete/`,
                {},
                {
                  headers: {
                    'X-User-Id': user.id,
                  },
                }
              );
              
              if (response.data.success) {
                Alert.alert('Success', 'Order marked as completed successfully');
                fetchOrderData(); // Refresh data
              } else {
                Alert.alert('Error', response.data.message || 'Failed to complete order');
              }
            } catch (error: any) {
              console.error('Error completing order:', error);
              Alert.alert('Error', error.response?.data?.message || 'Failed to complete order');
            }
          }
        }
      ]
    );
  };
const renderProofOfDelivery = () => {
  if (orderData?.order?.status !== 'delivered') return null;
  
  const proofs = orderData?.proof_images || [];
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

const renderRiderInfo = () => {
  // Only show for delivered orders that have a rider assigned
  if (orderData?.order?.status !== 'delivered') return null;
  if (!orderData?.order?.delivery_rider) return null;
  
  return (
    <View style={styles.infoCard}>
      <View style={styles.cardHeader}>
        <MaterialCommunityIcons name="motorbike" size={20} color="#111827" />
        <Text style={styles.cardTitle}>Rider Information</Text>
      </View>
      <View style={styles.cardContent}>
        <View style={styles.riderInfoRow}>
          <Ionicons name="person-outline" size={16} color="#6B7280" />
          <Text style={styles.riderName}>{orderData.order.delivery_rider}</Text>
        </View>
      </View>
    </View>
  );
};

  const handleReviewProduct = (productId: string) => {
    router.push(`/customer/order-review?productId=${productId}&orderId=${orderId}`);
  };

  const handleReturnProduct = (checkoutId: string) => {
    // router.push(`/return/${checkoutId}?orderId=${orderId}`);
  };

  const handleContactSeller = (shopId: string) => {
    router.push(`/customer/messages?shopId=${shopId}`);
  };
  

  const handleTrackOrder = () => {
    // Navigate to shipping timeline route with orderId
    if (!orderId) {
      Alert.alert('Error', 'Order ID not available');
      return;
    }
    router.push(`/customer/components/shipping-timeline?orderId=${orderId}`);
  };

  const handleBuyAgain = (productId: string) => {
    // router.push(`/product/${productId}`);
  };

  if (userRole && userRole !== 'customer') {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.message}>Not authorized to view this page</Text>
      </SafeAreaView>
    );
  }

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

  if (!orderData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color="#EF4444" />
          <Text style={styles.errorText}>Order not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { order, shipping_info, delivery_address, items, order_summary, timeline, actions } = orderData;
  const orderStatusLower = String(order?.status || '').toLowerCase();

  return (
    <View style={styles.container}>
      {/* Header */}
      <SafeAreaView style={styles.headerSafeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Detail</Text>
          <View style={styles.headerIcons}>
            <TouchableOpacity>
              <Ionicons name="ellipsis-horizontal" size={24} color="black" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#F97316']}
            tintColor="#F97316"
          />
        }
      >
        {/* Order Status Banner */}
        {(() => {
          const deliveryDateDisplay = order.delivery_date ? formatDate(order.delivery_date) : null;
          const baseStyle = [styles.statusBanner, { backgroundColor: `${order.status_color}20` }];
          const statusLower = String(order?.status || '').toLowerCase();

          // Pending status UI
          if (String(order?.status || '').toLowerCase() === 'pending') {
            return (
              <View style={baseStyle}>
                <View>
                  <View style={styles.statusRow}>
                    <Ionicons name="time" size={18} color={order.status_color} />
                    <Text style={[styles.statusText, { color: order.status_color }]}> 
                      {getStatusText(order)}
                    </Text>
                  </View>
                  <Text style={styles.subStatusText}>
                    Awaiting confirmation from the seller. We will notify you once processing starts.
                  </Text>
                </View>
              </View>
            );
            
          }

          // Processing status UI (includes ready_for_pickup variant)
          if (statusLower === 'processing' || statusLower === 'ready_for_pickup') {
            const isReadyForPickup = statusLower === 'ready_for_pickup';
            return (
              <View style={baseStyle}>
                <View>
                  <View style={styles.statusRow}>
                    {isReadyForPickup ? (
                      <MaterialCommunityIcons name="store-outline" size={20} color={order.status_color} />
                    ) : (
                      <Ionicons name="time" size={18} color={order.status_color} />
                    )}
                    <Text style={[styles.statusText, { color: order.status_color, marginLeft: 8 }]}> 
                      {getStatusText(order)}
                    </Text>
                  </View>
                  <Text style={styles.subStatusText}>
                    {isReadyForPickup
                      ? 'Your order is ready for pickup. Please collect it from the store. Contact the seller for pickup instructions.'
                      : 'Your order is being processed by the seller.'}
                  </Text>
                </View>
              </View>
            );
          }

          // Picked up UI
          if (statusLower === 'picked_up') {
            const deliveryMethodRawForPicked = String(shipping_info?.delivery_method || '').toLowerCase();
            const isPickupForPicked = deliveryMethodRawForPicked.includes('pickup');
            const pickupDateDisplay = order?.updated_at ? formatDateTime(order.updated_at) : null;
            return (
              <View style={baseStyle}>
                <View>
                  <View style={styles.statusRow}>
                    <MaterialCommunityIcons name="store-check-outline" size={20} color={order.status_color} />
                    <Text style={[styles.statusText, { color: order.status_color, marginLeft: 8 }]}> 
                      {getStatusText(order)}
                    </Text>
                  </View>
                  <Text style={styles.subStatusText}>
                    {isPickupForPicked
                      ? `Your order has been picked up from the store${pickupDateDisplay ? ' on ' + pickupDateDisplay : ''}.`
                      : `Your order has been picked up${pickupDateDisplay ? ' on ' + pickupDateDisplay : ''}.`}
                  </Text>
                </View>
              </View>
            );
          }

          // Default behavior for other statuses (delivered, shipped, etc.)
          return (
            <View style={baseStyle}>
              <View>
                <View style={styles.statusRow}>
                  <Ionicons 
                    name={order.status === 'delivered' ? "checkmark-circle" : "time"} 
                    size={18} 
                    color={order.status_color} 
                  />
                  <Text style={[styles.statusText, { color: order.status_color }]}> 
                    {getStatusText(order)}{deliveryDateDisplay ? `: ${deliveryDateDisplay}` : ''}
                  </Text>
                </View>
                {order.status === 'delivered' && items[0]?.return_deadline && (
                  <Text style={styles.subStatusText}>
                    Returnable time: before {formatDateTime(items[0]?.return_deadline || '')}
                  </Text>
                )}
              </View>
            </View>
          );
        })()}
        {renderRiderInfo()}
        {renderProofOfDelivery()}

        {/* Shipping / Pickup Information */}
        {(() => {
          const deliveryMethodRaw = String(shipping_info?.delivery_method || '').toLowerCase();
          const isPickup = deliveryMethodRaw.includes('pickup');

          if (isPickup) {
            // Show pickup location set by seller and hide shipping & delivery address
            return (
              <View style={styles.infoCard}>
                <View style={styles.cardHeader}>
                  <MaterialCommunityIcons name="store-outline" size={20} color="#111827" />
                  <Text style={styles.cardTitle}>Pickup Location</Text>
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.recipientName}>{delivery_address.recipient_name || (order?.shop_name || 'Store Pickup')}</Text>
                  {delivery_address.phone_number ? (
                    <Text style={styles.phoneNumber}>{delivery_address.phone_number}</Text>
                  ) : null}
                  <Text style={styles.addressText}>
                    {delivery_address.address || `${delivery_address.address_details?.street || ''}${delivery_address.address_details?.barangay ? ', ' + delivery_address.address_details.barangay : ''}${delivery_address.address_details?.city ? ', ' + delivery_address.address_details.city : ''}${delivery_address.address_details?.province ? ', ' + delivery_address.address_details.province : ''}`.replace(/^,\s*/, '') || 'Pickup address not provided'}
                  </Text>

                  {order?.updated_at ? (
                    <View style={{ marginTop: 8, paddingLeft: 4 }}>
                      <Text style={styles.pickupLabel}>Picked up</Text>
                      <Text style={styles.pickupValue}>{formatDateTime(order.updated_at)}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            );
          }

          // Default: Show shipping info and delivery address
          return (
            <>
              <TouchableOpacity 
                style={styles.infoCard} 
                activeOpacity={0.7}
                onPress={handleTrackOrder}
              >
                <View style={styles.cardHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialCommunityIcons name="truck-delivery-outline" size={20} color="#111827" />
                    <Text style={styles.cardTitle}>Shipping Information</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                </View>
                
                <View style={styles.cardContent}>
                  <View style={styles.shippingRow}>
                    <Text style={styles.shippingLabel}>Logistics Carrier:</Text>
                    <Text style={styles.shippingValue}>{shipping_info.logistics_carrier || 'N/A'}</Text>
                  </View>
                  {/* {shipping_info.tracking_number && (
                    <View style={styles.shippingRow}>
                      <Text style={styles.shippingLabel}>Tracking Number:</Text>
                      <Text style={styles.shippingValue}>{shipping_info.tracking_number}</Text>
                    </View>
                  )} */}
                  {shipping_info.estimated_delivery && (
                    <View style={styles.shippingRow}>
                      <Text style={styles.shippingLabel}>Estimated Delivery:</Text>
                      <Text style={styles.shippingValue}>{shipping_info.estimated_delivery}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>

              {/* Delivery Information Card */}
              <View style={styles.infoCard}>
                <View style={styles.cardHeader}>
                  <MaterialCommunityIcons name="map-marker-outline" size={20} color="#111827" />
                  <Text style={styles.cardTitle}>Delivery Address</Text>
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.recipientName}>
                    {delivery_address.recipient_name} 
                    <Text style={styles.phoneNumber}> ({delivery_address.phone_number})</Text>
                  </Text>
                  <Text style={styles.addressText}>
                    {delivery_address.address}
                  </Text>
                </View>
              </View>
            </>
          );
        })()}
        {/* Completed Information - for completed orders */}
{orderStatusLower === 'completed' && (
  <View style={styles.infoCard}>
    <View style={styles.cardHeader}>
      <MaterialIcons name="check-circle" size={20} color="#10B981" />
      <Text style={styles.cardTitle}>Order Completed</Text>
    </View>
    <View style={styles.cardContent}>
      <View style={styles.completedRow}>
        <Ionicons name="calendar-outline" size={16} color="#6B7280" />
        <Text style={styles.completedLabel}>Completed on:</Text>
        <Text style={styles.completedValue}>
          {order.completed_at ? formatDateTime(order.completed_at) : formatDateTime(order.updated_at)}
        </Text>
      </View>
      <View style={styles.completedMessageContainer}>
        <Ionicons name="happy-outline" size={20} color="#10B981" />
        <Text style={styles.completedMessage}>
          Your order has been successfully completed! Thank you for shopping with us.
        </Text>
      </View>
    </View>
  </View>
)}

        {/* Order Timeline */}
        {timeline.length > 0 && (
          <View style={styles.infoCard}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="timeline" size={20} color="#111827" />
              <Text style={styles.cardTitle}>Order Timeline</Text>
            </View>
            <View style={styles.timelineContainer}>
              {timeline.map((event, index) => (
                <View key={index} style={styles.timelineItem}>
                  <View style={[styles.timelineDot, { backgroundColor: event.completed ? event.color : '#E5E7EB' }]} />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineEvent}>{event.event}</Text>
                    <Text style={styles.timelineDescription}>{event.description}</Text>
                    {event.date && (
                      <Text style={styles.timelineDate}>{formatDateTime(event.date)}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Product Cards */}
        {items.map((item, index) => (
          <View key={item.checkout_id} style={styles.productCard}>
            {/* Shop Header */}
            {/* Shop Header */}
{/* Shop Header */}
{item.shop_info && item.shop_info.name ? (
  <TouchableOpacity 
    style={styles.storeHeader}
    activeOpacity={0.7}
    onPress={() => router.push({
      pathname: "/customer/view-shop",
      params: { shopId: item.shop_info.id }
    })}
  >
    {item.shop_info.picture ? (
      <Image 
        source={{ uri: item.shop_info.picture }} 
        style={styles.storeLogo} 
      />
    ) : (
      <View style={styles.storeLogo}>
        <Text style={styles.logoText}>
          {item.shop_info.name.substring(0, 2).toUpperCase()}
        </Text>
      </View>
    )}
    <View style={styles.storeInfo}>
      <View style={styles.storeTitleRow}>
        <Text style={styles.storeName}>{item.shop_info.name}</Text>
        {item.shop_info.is_choices && (
          <View style={styles.choicesBadge}>
            <Text style={styles.badgeText}>Choices</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
      </View>
      <Text style={styles.followerText}>
        {item.shop_info.items_count} Items | {item.shop_info.followers_count?.toLocaleString() || 0} followers
      </Text>
    </View>
  </TouchableOpacity>
) : (
  // Fallback shop header if shop_info is missing
  <TouchableOpacity 
    style={styles.storeHeader}
    activeOpacity={0.7}
    onPress={order?.shop_id ? () => router.push({
      pathname: "/customer/view-shop",
      params: { shopId: order.shop_id }
    }) : undefined}
  >
    <View style={styles.storeLogo}>
      <Text style={styles.logoText}>SH</Text>
    </View>
    <View style={styles.storeInfo}>
      <View style={styles.storeTitleRow}>
        <Text style={styles.storeName}>{order?.shop_name || 'Shop'}</Text>
        <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
      </View>
    </View>
  </TouchableOpacity>
)}
            {/* Product Body */}
            <View style={styles.productBody}>
              <Image 
                source={{ 
                  uri: item.primary_image?.url || 'https://via.placeholder.com/80'
                }} 
                style={styles.productImage} 
              />
              <View style={styles.productDetails}>
                <Text style={styles.productName} numberOfLines={2}>
                  {item.product_name}
                </Text>
                <Text style={styles.productVariant}>{item.product_variant}</Text>
                <Text style={styles.productQuantity}>Quantity: {item.quantity}</Text>
              </View>
              <View style={styles.priceContainer}>
                <View style={styles.priceRow}>
                  <Text style={styles.currentPrice}>{formatCurrency(item.price)}</Text>
                  <Ionicons name="help-circle-outline" size={14} color="#9CA3AF" />
                </View>
                <Text style={styles.oldPrice}>{formatCurrency(item.original_price)}</Text>
                <Text style={styles.subtotal}>Subtotal: {formatCurrency(item.subtotal)}</Text>
              </View>
            </View>

            {/* Action Buttons - Rate & Review and Return buttons removed */}
            <View style={styles.productActions}>
              {/* Rate & Review button removed */}
              {/* Return button removed */}
              
              {/* Contact Seller button (optional - uncomment if needed) */}
              {/* {actions.can_contact_seller && (
                <TouchableOpacity
                  style={styles.chatButton}
                  onPress={() => handleContactSeller(item.shop_info.id)}
                >
                  <Ionicons name="chatbubble-outline" size={16} color="#3B82F6" />
                  <Text style={styles.chatButtonText}>Contact Seller</Text>
                </TouchableOpacity>
              )} */}
              
              {/* Buy Again button (optional - uncomment if needed) */}
              {/* <TouchableOpacity
                style={styles.buyAgainButton}
                onPress={() => handleBuyAgain(item.product_id)}
              >
                <Ionicons name="cart-outline" size={16} color="#000000" />
                <Text style={styles.buyAgainButtonText}>Buy Again</Text>
              </TouchableOpacity> */}
            </View>
          </View>
        ))}

        {/* Order Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal ({orderData.summary_counts.total_items} items):</Text>
            <Text style={styles.summaryValue}>{formatCurrency(order_summary.subtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Shipping Fee:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(order_summary.shipping_fee)}</Text>
          </View>
          {/* <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(order_summary.tax)}</Text>
          </View> */}
          {parseFloat(order_summary.discount) > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Discount:</Text>
              <Text style={[styles.summaryValue, styles.discountText]}>
                -{formatCurrency(order_summary.discount)}
              </Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatCurrency(order_summary.total)}</Text>
          </View>
        </View>

        {/* Order Information */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Order Number:</Text>
            <View style={styles.infoValueContainer}>
              <Text style={styles.infoValue}>{order.id}</Text>
              <TouchableOpacity onPress={() => {
                // Copy to clipboard
                Alert.alert('Copied', 'Order number copied to clipboard');
              }}>
                <Ionicons name="copy-outline" size={16} color="#4B5563" style={{ marginLeft: 5 }} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Order Date:</Text>
            <Text style={styles.infoValue}>{formatDateTime(order.created_at)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Payment Method:</Text>
            <Text style={styles.infoValue}>{order.payment_method}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Delivery Method:</Text>
            <Text style={styles.infoValue}>{shipping_info.delivery_method || 'N/A'}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        {/* Action Buttons */}
<View style={styles.actionButtonsContainer}>
  {actions.can_cancel && (
    <TouchableOpacity
      style={styles.cancelOrderButton}
      onPress={handleCancelOrder}
    >
      <Text style={styles.cancelOrderButtonText}>Cancel Order</Text>
    </TouchableOpacity>
  )}

  {/* Order Received Button - for delivered or picked_up orders */}
  {(orderStatusLower === 'delivered' || orderStatusLower === 'picked_up') && (
    <TouchableOpacity
      style={styles.orderReceivedButton}
      onPress={handleOrderReceived}
    >
      <Text style={styles.orderReceivedButtonText}>Order Received</Text>
    </TouchableOpacity>
  )}

  {/* Request Refund Button - for completed orders */}
  {orderStatusLower === 'completed' && (
    <TouchableOpacity
      style={styles.requestRefundButton}
      onPress={() => router.push(`/customer/request-refund?orderId=${order.id}`)}
    >
      <Text style={styles.requestRefundButtonText}>Request Refund</Text>
    </TouchableOpacity>
  )}

  {/* Rate Button - for completed orders */}
  {/* Rate Button - for completed orders */}
{orderStatusLower === 'completed' && items.length > 0 && (
  <TouchableOpacity
    style={styles.rateButton}
    onPress={() => {
      // Navigate to rate page with first product
      const firstItem = items[0];
      router.push({
        pathname: '/customer/rate',
        params: {
          orderId: order.id,
          productId: firstItem.product_id,
          productName: firstItem.product_name
        }
      });
    }}
  >
    <Text style={styles.rateButtonText}>Rate</Text>
  </TouchableOpacity>
)}

  {/* Need Help button removed */}
</View>
      </ScrollView>

      {/* Image Preview Modal */}
<Modal
  visible={previewVisible}
  transparent={true}
  animationType="fade"
  onRequestClose={() => setPreviewVisible(false)}
>
  <View style={styles.modalOverlay}>
    <TouchableOpacity
      style={styles.closeButton}
      onPress={() => setPreviewVisible(false)}
    >
      <Ionicons name="close" size={30} color="#FFFFFF" />
    </TouchableOpacity>
    {selectedImage && (
      <Image 
        source={{ uri: selectedImage }} 
        style={styles.fullScreenImage}
        resizeMode="contain"
      />
    )}
  </View>
</Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  headerSafeArea: { backgroundColor: '#FFF', paddingTop: Platform.OS === 'android' ? 40 : 0 },
  header: { 
    height: 56, 
    paddingHorizontal: 16, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between' 
  },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  headerIcons: { flexDirection: 'row' },
  content: { flex: 1 },
  
  // Loading States
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
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#EF4444',
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#F97316',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  message: { 
    fontSize: 16, 
    color: '#6B7280' 
  },

  /* STATUS BANNER */
  statusBanner: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    padding: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: '#E0E0E0'
  },
  statusRow: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  statusText: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    marginLeft: 6 
  },
  subStatusText: { 
    fontSize: 12, 
    color: '#6B7280', 
    marginTop: 4 
  },
  trackButton: { 
    backgroundColor: '#FFF', 
    paddingHorizontal: 20, 
    paddingVertical: 6, 
    borderRadius: 20, 
    borderWidth: 1, 
    borderColor: '#D1D5DB' 
  },
  trackButtonText: { 
    fontSize: 14, 
    fontWeight: '500' 
  },

  /* INFO CARDS */
  infoCard: { 
    backgroundColor: '#FFF', 
    marginTop: 10, 
    padding: 16 
  },
  cardHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 10 
  },
  cardTitle: { 
    fontSize: 15, 
    fontWeight: '600', 
    marginLeft: 8, 
    color: '#111827' 
  },
  cardContent: { 
    paddingLeft: 28 
  },
  recipientName: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#111827', 
    marginBottom: 4 
  },
  phoneNumber: { 
    fontWeight: '400', 
    color: '#6B7280' 
  },
  addressText: { 
    fontSize: 13, 
    color: '#4B5563', 
    lineHeight: 18 
  },
  pickupLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  pickupValue: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
    marginTop: 2,
  },

  shippingRow: { 
    flexDirection: 'row', 
    marginBottom: 4 
  },
  shippingLabel: { 
    fontSize: 13, 
    color: '#6B7280', 
    width: 110 
  },
  shippingValue: { 
    fontSize: 13, 
    color: '#111827', 
    flex: 1 
  },

  /* TIMELINE */
  timelineContainer: {
    paddingLeft: 28,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
    marginRight: 12,
  },
  timelineContent: {
    flex: 1,
  },
  timelineEvent: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  timelineDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  timelineDate: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },

  /* PRODUCT CARD */
  productCard: { 
    backgroundColor: '#FFF', 
    padding: 16, 
    marginTop: 10 
  },
  storeHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 15 
  },
  storeLogo: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: '#EDE9FE', 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: '#DDD' 
  },
  logoText: { 
    fontSize: 8, 
    fontWeight: 'bold', 
    color: '#7C3AED', 
    textAlign: 'center' 
  },
  storeInfo: { 
    marginLeft: 10, 
    flex: 1 
  },
  storeTitleRow: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  storeName: { 
    fontWeight: 'bold', 
    fontSize: 15, 
    marginRight: 5 
  },
  choicesBadge: { 
    backgroundColor: '#333', 
    paddingHorizontal: 4, 
    borderRadius: 3, 
    marginRight: 4 
  },
  badgeText: { 
    color: '#FFF', 
    fontSize: 10, 
    fontWeight: 'bold', 
    fontStyle: 'italic' 
  },
  newBadge: { 
    borderWidth: 1, 
    borderColor: '#10B981', 
    paddingHorizontal: 4, 
    borderRadius: 3, 
    marginRight: 4 
  },
  newBadgeText: { 
    color: '#10B981', 
    fontSize: 10 
  },
  followerText: { 
    fontSize: 12, 
    color: '#6B7280' 
  },
  productBody: { 
    flexDirection: 'row', 
    marginBottom: 12 
  },
  productImage: { 
    width: 80, 
    height: 100, 
    borderRadius: 4 
  },
  productDetails: { 
    flex: 1, 
    paddingHorizontal: 10 
  },
  productName: { 
    fontSize: 14, 
    color: '#374151', 
    lineHeight: 20 
  },
  productVariant: { 
    fontSize: 13, 
    color: '#6B7280', 
    marginTop: 4 
  },
  productQuantity: { 
    fontSize: 13, 
    color: '#6B7280', 
    marginTop: 4 
  },
  priceContainer: { 
    alignItems: 'flex-end' 
  },
  priceRow: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  currentPrice: { 
    fontWeight: 'bold', 
    fontSize: 14, 
    color: '#F97316', 
    marginRight: 4 
  },
  oldPrice: { 
    fontSize: 12, 
    color: '#9CA3AF', 
    textDecorationLine: 'line-through',
    marginTop: 4 
  },
  subtotal: { 
    fontSize: 12, 
    color: '#111827', 
    fontWeight: '600',
    marginTop: 8 
  },
  
  // Product Actions - Rate & Review and Return button styles removed
  productActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  reviewButton: {
    backgroundColor: '#F97316',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  reviewButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  returnButton: {
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  returnButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  chatButton: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  chatButtonText: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  buyAgainButton: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  buyAgainButtonText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },

  /* ORDER SUMMARY */
  summaryCard: {
    backgroundColor: '#FFF',
    padding: 16,
    marginTop: 10,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  discountText: {
    color: '#10B981',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },

  /* ORDER INFORMATION */
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  infoValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },

  /* ACTION BUTTONS */
  actionButtonsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  cancelOrderButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
    alignItems: 'center',
  },
  cancelOrderButtonText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  helpButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  helpButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
  },
  requestRefundButton: {
    flex: 1,
    backgroundColor: '#FFF',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F97316',
    alignItems: 'center',
  },
  requestRefundButtonText: {
    color: '#F97316',
    fontSize: 14,
    fontWeight: '600',
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
modalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0, 0, 0, 0.95)',
  justifyContent: 'center',
  alignItems: 'center',
},
closeButton: {
  position: 'absolute',
  top: Platform.OS === 'ios' ? 60 : 40,
  right: 20,
  zIndex: 10,
  padding: 8,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  borderRadius: 20,
},
fullScreenImage: {
  width: '100%',
  height: '80%',
},
orderReceivedButton: {
  flex: 1,
  backgroundColor: '#10B981',
  paddingVertical: 12,
  borderRadius: 8,
  alignItems: 'center',
},
orderReceivedButtonText: {
  color: '#FFFFFF',
  fontSize: 14,
  fontWeight: '600',
},
rateButton: {
  flex: 1,
  backgroundColor: '#3B82F6',
  paddingVertical: 12,
  borderRadius: 8,
  alignItems: 'center',
},
rateButtonText: {
  color: '#FFFFFF',
  fontSize: 14,
  fontWeight: '600',
},
completedRow: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 12,
  flexWrap: 'wrap',
},
completedLabel: {
  fontSize: 14,
  color: '#6B7280',
  marginLeft: 8,
  marginRight: 4,
},
completedValue: {
  fontSize: 14,
  color: '#111827',
  fontWeight: '600',
},
completedMessageContainer: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  backgroundColor: '#ECFDF5',
  padding: 12,
  borderRadius: 8,
  marginTop: 8,
  gap: 8,
},
completedMessage: {
  fontSize: 13,
  color: '#065F46',
  flex: 1,
  lineHeight: 18,
},
});