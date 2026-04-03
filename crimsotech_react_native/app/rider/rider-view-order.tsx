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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router, Stack } from 'expo-router';
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
  };
  payment: {
    id: string;
    status: string;
    amount: string;
    method: string;
    transaction_date: string;
  };
  items: OrderItem[];
}

export default function RiderViewOrder() {
  const { user } = useAuth();
  const { deliveryId, orderId } = useLocalSearchParams<{ deliveryId: string; orderId: string }>();
  
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

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
        setOrderDetails(response.data);
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

  // Handle accept delivery
  const handleAcceptDelivery = async () => {
    if (!orderDetails?.delivery?.id) return;
    
    Alert.alert(
      'Accept Order',
      'Are you sure you want to accept this delivery?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              setIsActionLoading(true);
              const formData = new FormData();
              formData.append('order_id', orderDetails.delivery.id);

              const response = await AxiosInstance.post('/rider-orders-active/accept_order/', formData, {
                headers: { 'X-User-Id': user?.user_id }
              });

              if (response.data.success) {
                Alert.alert('Success', 'Order accepted successfully');
                router.back();
              } else {
                Alert.alert('Error', response.data.error || 'Failed to accept order');
              }
            } catch (err: any) {
              console.error('Error accepting delivery:', err);
              Alert.alert('Error', err?.response?.data?.error || 'Failed to accept order');
            } finally {
              setIsActionLoading(false);
            }
          }
        }
      ]
    );
  };

  // Handle decline delivery
  const handleDeclineDelivery = async () => {
    if (!orderDetails?.delivery?.id) return;
    
    Alert.alert(
      'Decline Order',
      'Are you sure you want to decline this delivery?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
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
              Alert.alert('Error', err?.response?.data?.error || 'Failed to decline order');
            } finally {
              setIsActionLoading(false);
            }
          }
        }
      ]
    );
  };

  // Handle image loading error
  const handleImageError = (productId: string) => {
    setImageErrors(prev => ({ ...prev, [productId]: true }));
  };

  // Format date
  const formatDate = (dateString?: string) => {
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
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return '#F59E0B';
      case 'pending_offer':
        return '#F59E0B';
      case 'accepted':
        return '#10B981';
      case 'picked_up':
        return '#3B82F6';
      case 'delivered':
        return '#10B981';
      case 'cancelled':
        return '#EF4444';
      case 'declined':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  // Get status label
  const getStatusLabel = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'picked_up':
        return 'In Transit';
      case 'pending_offer':
        return 'Pending';
      default:
        return status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown';
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

  // Get unique seller info from first item (assuming all items are from same seller for this delivery)
  const sellerInfo = orderDetails.items?.[0] || null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Stack.Screen
        options={{
          headerTitle: "Order Details",
          headerTitleStyle: { fontSize: 18, fontWeight: '600' },
          headerShadowVisible: false,
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 8 }}>
              <Ionicons name="arrow-back" size={24} color="#1F2937" />
            </TouchableOpacity>
          ),
        }}
      />
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Order Status Banner - Edge to Edge */}
        <View style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 14, color: '#6B7280' }}>Order Status</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: getStatusColor(orderDetails.delivery?.status), marginRight: 6 }} />
              <Text style={{ fontSize: 14, fontWeight: '600', color: getStatusColor(orderDetails.delivery?.status) }}>
                {getStatusLabel(orderDetails.delivery?.status)}
              </Text>
            </View>
          </View>
        </View>

        {/* CARD 1: Order Information (Buyer Info + Order Details) - Edge to Edge */}
        <View style={{ backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderTopWidth: 1, borderColor: '#F3F4F6', marginBottom: -1 }}>
          <View style={{ padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Ionicons name="receipt-outline" size={22} color="#EE4D2D" />
              <Text style={{ fontSize: 16, fontWeight: '600', marginLeft: 8 }}>Order Information</Text>
            </View>
            
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
        <View style={{ backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderTopWidth: 1, borderColor: '#F3F4F6', marginBottom: showAcceptDecline ? 0 : 80, marginTop: -1 }}>
          <View style={{ padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Ionicons name="cube-outline" size={22} color="#EE4D2D" />
              <Text style={{ fontSize: 16, fontWeight: '600', marginLeft: 8 }}>Order Items</Text>
              <Text style={{ fontSize: 13, color: '#6B7280', marginLeft: 6 }}>({orderDetails.items?.length || 0})</Text>
            </View>
            
            {orderDetails.items && orderDetails.items.map((item, index) => (
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
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#EE4D2D' }}>{formatCurrency(item.total)}</Text>
                    </View>
                    
                    {item.remarks && (
                      <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
                        Note: {item.remarks}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Edge-to-Edge Action Buttons */}
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
                {isActionLoading ? 'Processing...' : 'Decline'}
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
    </SafeAreaView>
  );
}