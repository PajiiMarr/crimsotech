import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  Image,
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { router } from 'expo-router';
import AxiosInstance from '../../contexts/axios';
import * as ImagePicker from 'expo-image-picker';
import RiderPageHeader from './includes/riderPageHeader';

interface Delivery {
  id: string;
  product_image?: string;
  delivery_fee?: number;
  order: {
    order_id: string;
    customer: {
      id: string;
      username: string;
      first_name: string;
      last_name: string;
      contact_number: string;
    };
    shipping_address: {
      id: string;
      recipient_name: string;
      recipient_phone: string;
      street: string;
      barangay: string;
      city: string;
      province: string;
      full_address: string;
    };
    total_amount: number;
    payment_method: string;
    delivery_method: string;
    status: string;
    created_at: string;
  };
  status: string;
  proofs_count?: number;
  picked_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
  time_elapsed: string;
  is_late: boolean;
  failed_reason?: string; 
  delivery_type?: 'normal' | 'return';
  refund_amount?: number;
  refund_id?: string;
  original_total?: number;
  shop_id?: string;
  shop_name?: string;
}

interface ActiveOrderMetrics {
  total_active_orders: number;
  pending_pickup: number;
  in_transit: number;
  completed_deliveries: number;
  expected_earnings: number;
  declined_orders: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  pending: { 
    label: 'Pending', 
    color: '#FEF3C7',
    icon: 'time-outline'
  },
  pending_offer: { 
    label: 'Pending Offer', 
    color: '#FDE68A',
    icon: 'time-outline'
  },
  accepted: {
    label: 'Accepted',
    color: '#E0E7FF',
    icon: 'checkmark-circle-outline'
  },
  declined: {
    label: 'Declined',
    color: '#FEE2E2',
    icon: 'alert-circle-outline'
  },
  picked_up: { 
    label: 'In Transit', 
    color: '#DBEAFE',
    icon: 'car-outline'
  },
  delivered: { 
    label: 'Delivered', 
    color: '#D1FAE5',
    icon: 'checkmark-circle-outline'
  },
  failed: { 
    label: 'Failed', 
    color: '#FEE2E2',
    icon: 'alert-circle-outline'
  },
  default: { 
    label: 'Unknown', 
    color: '#F3F4F6',
    icon: 'alert-circle-outline'
  }
};

const STATUS_TABS: Array<{ id: 'pending' | 'to_process'; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: 'pending', label: 'Pending', icon: 'time-outline' },
  { id: 'to_process', label: 'To Process', icon: 'car-outline' }
];

export default function ActiveOrders() {
  const { user } = useAuth();
  const { width } = Dimensions.get('window');
  
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [metrics, setMetrics] = useState<ActiveOrderMetrics>({
    total_active_orders: 0,
    pending_pickup: 0,
    in_transit: 0,
    completed_deliveries: 0,
    expected_earnings: 0,
    declined_orders: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [actionType, setActionType] = useState<'pickup' | 'deliver' | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'to_process'>('pending');
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [showPickupDialog, setShowPickupDialog] = useState(false);
  const [showProofModal, setShowProofModal] = useState(false);
  

  const [proofMedia, setProofMedia] = useState<Array<{
    
    file: {
      uri: string;
      name: string;
      type: string;
    };
    preview: string;
    type: 'image' | 'video';
  }>>([]);
  const [uploadingProofs, setUploadingProofs] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fetchDeliveryData = async () => {
    try {
      setIsLoading(true);

      const [metricsResponse, deliveriesResponse] = await Promise.all([
        AxiosInstance.get('/rider-orders-active/get_metrics/', {
          headers: { 'X-User-Id': user?.user_id }
        }),
        AxiosInstance.get('/rider-orders-active/get_deliveries/?page=1&page_size=50&status=all', {
          headers: { 'X-User-Id': user?.user_id }
        })
      ]);

      if (metricsResponse.data?.success && metricsResponse.data?.metrics) {
        const m = metricsResponse.data.metrics;
        setMetrics({
          total_active_orders: Number(m.total_active_orders || 0),
          pending_pickup: Number(m.pending_pickup || 0),
          in_transit: Number(m.in_transit || 0),
          completed_deliveries: Number(m.completed_deliveries || 0),
          expected_earnings: Number(m.expected_earnings || 0),
          declined_orders: Number(m.declined_orders || 0),
        });
      }

      if (deliveriesResponse.data?.success) {
        setDeliveries(deliveriesResponse.data.deliveries || []);
      }

    } catch (error) {
      console.error('Error fetching delivery data:', error);
      setDeliveries([]);
      setMetrics({
        total_active_orders: 0,
        pending_pickup: 0,
        in_transit: 0,
        completed_deliveries: 0,
        expected_earnings: 0,
        declined_orders: 0,
      });
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };
  

  const handleImageError = (deliveryId: string) => {
    setImageErrors(prev => ({ ...prev, [deliveryId]: true }));
  };

  const pickMedia = async () => {
    if (proofMedia.length >= 6) {
      Alert.alert('Limit Reached', 'Maximum 6 media files allowed');
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your camera');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const isVideo = asset.type?.startsWith('video') || false;
      const fileName = asset.uri.split('/').pop() || 'file';
      
      const newMedia = {
        file: {
          uri: asset.uri,
          name: fileName,
          type: isVideo ? 'video/mp4' : 'image/jpeg',
        },
        preview: asset.uri,
        type: isVideo ? 'video' : 'image' as 'image' | 'video',
      };

      setProofMedia(prev => [...prev, newMedia]);
    }
  };

  const handleRemoveMedia = (index: number) => {
    setProofMedia(prev => prev.filter((_, i) => i !== index));
  };

  const handleDeliverWithProof = async () => {
    if (!selectedDelivery) return;

    if (proofMedia.length === 0) {
      Alert.alert('Error', 'Please take at least one photo or video as proof of delivery');
      return;
    }

    try {
      setUploadingProofs(true);
      setUploadProgress(0);

      for (let i = 0; i < proofMedia.length; i++) {
        const media = proofMedia[i];
        const formData = new FormData();
        formData.append('proof_type', 'delivery');
        formData.append('file', media.file as any);

        await AxiosInstance.post(
          `/rider-proof/upload/${selectedDelivery.id}/`,
          formData,
          {
            headers: {
              'X-User-Id': user?.user_id,
              'Content-Type': 'multipart/form-data'
            }
          }
        );
        
        setUploadProgress(((i + 1) / proofMedia.length) * 100);
      }

      const deliverFormData = new FormData();
      deliverFormData.append('delivery_id', selectedDelivery.id);
      if (selectedDelivery.order?.order_id) {
        deliverFormData.append('order_id', selectedDelivery.order.order_id);
      }

      const deliverResponse = await AxiosInstance.post(
        '/rider-orders-active/deliver_order/',
        deliverFormData,
        { headers: { 'X-User-Id': user?.user_id } }
      );

      if (deliverResponse.data.success) {
        await fetchDeliveryData();
        setShowProofModal(false);
        setProofMedia([]);
        setSelectedDelivery(null);
        setActionType(null);
        Alert.alert('Success', 'Order delivered successfully with proof!');
      } else {
        Alert.alert('Error', deliverResponse.data.error || 'Failed to mark order as delivered');
      }
    } catch (error: any) {
      console.error('Error uploading proofs or marking delivery:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to complete delivery');
    } finally {
      setUploadingProofs(false);
      setUploadProgress(0);
    }
  };

  const confirmPickup = async () => {
    if (!selectedDelivery) return;

    try {
      setIsActionLoading(true);

      const formData = new FormData();
      formData.append('delivery_id', selectedDelivery.id);
      if (selectedDelivery.order?.order_id) {
        formData.append('order_id', selectedDelivery.order.order_id);
      }

      const response = await AxiosInstance.post('/rider-orders-active/pickup_order/', formData, {
        headers: { 'X-User-Id': user?.user_id }
      });

      if (response.data.success) {
        await fetchDeliveryData();
        setShowPickupDialog(false);
        setSelectedDelivery(null);
        setActionType(null);
        Alert.alert('Success', 'Order picked up successfully!');
      } else {
        Alert.alert('Error', response.data.error || 'Failed to pickup order');
      }
    } catch (error: any) {
      console.error('Error performing action:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to pickup order');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleAcceptDelivery = async (delivery: Delivery) => {
    try {
      setIsActionLoading(true);
      const formData = new FormData();
      formData.append('order_id', delivery.id);

      const response = await AxiosInstance.post('/rider-orders-active/accept_order/', formData, {
        headers: { 'X-User-Id': user?.user_id }
      });

      if (response.data.success) {
        setDeliveries(prev => prev.map(d => d.id === delivery.id ? { ...d, status: 'accepted' } : d));
        Alert.alert('Success', 'Order accepted');
      } else {
        Alert.alert('Error', response.data.error || 'Failed to accept order');
      }
    } catch (err: any) {
      console.error('Error accepting delivery:', err);
      Alert.alert('Error', err?.response?.data?.error || 'Failed to accept order');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeclineDelivery = async (delivery: Delivery) => {
    Alert.alert(
      'Decline Delivery',
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
              formData.append('order_id', delivery.id);

              const response = await AxiosInstance.post('/rider-orders-active/decline_order/', formData, {
                headers: { 'X-User-Id': user?.user_id }
              });

              if (!response.data?.success) {
                Alert.alert('Error', response.data?.error || 'Failed to decline order');
                return;
              }

              await fetchDeliveryData();
              Alert.alert('Success', 'Order declined');
            } catch (err: any) {
              console.error('Decline failed:', err);
              Alert.alert('Error', err?.response?.data?.error || 'Failed to decline order');
            } finally {
              setIsActionLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleCardPress = (delivery: Delivery) => {
    router.push({
      pathname: '/rider/rider-view-order',
      params: {
        deliveryId: delivery.id,
        orderId: delivery.order.order_id,
        shopId: delivery.shop_id || '', 
      }
    });
  };

  const handleMarkFailed = async (delivery: Delivery) => {
    Alert.alert(
      'Mark as Failed',
      'Mark this delivery as failed? This will unassign you from the delivery.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Failed',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsActionLoading(true);
              const formData = new FormData();
              formData.append('delivery_id', delivery.id);
              formData.append('status', 'declined');

              const res = await AxiosInstance.post('/rider-orders-active/update_delivery_status/', formData, {
                headers: { 'X-User-Id': user?.user_id }
              });

              if (res.data.success) {
                await fetchDeliveryData();
                Alert.alert('Success', 'Delivery marked as failed');
              } else {
                Alert.alert('Error', res.data.error || 'Failed to mark delivery as failed');
              }
            } catch (err: any) {
              console.error('Failed to mark failed:', err);
              Alert.alert('Error', err?.response?.data?.error || 'Failed to mark delivery as failed');
            } finally {
              setIsActionLoading(false);
            }
          }
        }
      ]
    );
  };

  const pendingStatuses = ['pending', 'pending_offer'];
  const toProcessStatuses = ['accepted', 'picked_up', 'failed'];
  
  const filteredDeliveries = useMemo(() => {
    return activeTab === 'pending' 
      ? deliveries.filter(d => pendingStatuses.includes(d.status))
      : deliveries.filter(d => toProcessStatuses.includes(d.status));
  }, [deliveries, activeTab]);

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.default;
    
    return (
      <View style={{ backgroundColor: config.color, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }}>
        <Ionicons name={config.icon} size={10} color="#4B5563" />
        <Text style={{ fontSize: 10, marginLeft: 2, color: '#1F2937' }}>{config.label}</Text>
      </View>
    );
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

  const getDisplayAmount = (delivery: Delivery) => {
    if (delivery.delivery_type === 'return' && delivery.refund_amount) {
      return delivery.refund_amount;
    }
    return delivery.order.total_amount;
  };

  const getDisplayAmountLabel = (delivery: Delivery) => {
    if (delivery.delivery_type === 'return') {
      return 'Refund Amount';
    }
    return 'Order Subtotal';
  };

  const getTabCount = (tabId: string) => {
    if (tabId === 'pending') {
      return deliveries.filter(d => pendingStatuses.includes(d.status)).length;
    } else {
      return deliveries.filter(d => toProcessStatuses.includes(d.status)).length;
    }
  };

  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
const [availableShops, setAvailableShops] = useState<Array<{id: string; name: string}>>([]);

// Extract unique shops from deliveries
useEffect(() => {
  const shops = new Map<string, string>();
  deliveries.forEach(delivery => {
    if (delivery.shop_id && delivery.shop_name) {
      shops.set(delivery.shop_id, delivery.shop_name);
    }
  });
  setAvailableShops(Array.from(shops.entries()).map(([id, name]) => ({ id, name })));
}, [deliveries]);

// Filter deliveries by selected shop
const filteredByShopDeliveries = useMemo(() => {
  if (!selectedShopId) return filteredDeliveries;
  return filteredDeliveries.filter(d => d.shop_id === selectedShopId);
}, [filteredDeliveries, selectedShopId]);
  useEffect(() => {
    const shops = new Map<string, string>();
    deliveries.forEach(delivery => {
      if (delivery.shop_id && delivery.shop_name) {
        shops.set(delivery.shop_id, delivery.shop_name);
      }
    });
    setAvailableShops(Array.from(shops.entries()).map(([id, name]) => ({ id, name })));
  }, [deliveries]);
  

  const onRefresh = () => {
    setRefreshing(true);
    fetchDeliveryData();
  };

  const LoadingSkeleton = () => (
    <View style={{ backgroundColor: '#F3F4F6', padding: 16, borderRadius: 8, marginBottom: 8 }}>
      <View style={{ height: 16, backgroundColor: '#E5E7EB', borderRadius: 4, width: '60%', marginBottom: 8 }} />
      <View style={{ height: 12, backgroundColor: '#E5E7EB', borderRadius: 4, width: '40%', marginBottom: 8 }} />
      <View style={{ height: 12, backgroundColor: '#E5E7EB', borderRadius: 4, width: '80%' }} />
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <RiderPageHeader 
        title="Active Orders" 
        subtitle="Manage your deliveries"
      />
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 80 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
            {STATUS_TABS.map((tab) => {
              const count = getTabCount(tab.id);
              const isActive = activeTab === tab.id;
              
              return (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => setActiveTab(tab.id)}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    paddingVertical: 12,
                    backgroundColor: isActive ? '#FFFFFF' : '#F9FAFB',
                    borderBottomWidth: 2,
                    borderBottomColor: isActive ? '#EE4D2D' : 'transparent',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name={tab.icon} size={18} color={isActive ? '#EE4D2D' : '#6B7280'} />
                    <Text style={{ 
                      fontSize: 14, 
                      marginLeft: 6, 
                      color: isActive ? '#EE4D2D' : '#6B7280', 
                      fontWeight: isActive ? '600' : '500' 
                    }}>
                      {tab.label}
                    </Text>
                    {count > 0 && (
                      <View style={{
                        marginLeft: 6,
                        paddingHorizontal: 5,
                        paddingVertical: 2,
                        borderRadius: 10,
                        backgroundColor: isActive ? '#FEE2E2' : '#F3F4F6'
                      }}>
                        <Text style={{ fontSize: 10, color: isActive ? '#EE4D2D' : '#4B5563', fontWeight: '500' }}>
                          {count}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={{ padding: 12 }}>
            {isLoading ? (
              <>
                <LoadingSkeleton />
                <LoadingSkeleton />
                <LoadingSkeleton />
              </>
            ) : filteredDeliveries.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 48 }}>
                <Ionicons name="bag-outline" size={48} color="#D1D5DB" />
                <Text style={{ color: '#9CA3AF', fontSize: 14, marginTop: 12 }}>
                  {activeTab === 'pending' ? 'No pending deliveries' : 'No orders to process'}
                </Text>
              </View>
            ) : (
              filteredDeliveries.map((delivery) => {
                const customer = delivery.order.customer;
                const address = delivery.order.shipping_address;
                const displayAmount = getDisplayAmount(delivery);
                const amountLabel = getDisplayAmountLabel(delivery);
                const isReturnDelivery = delivery.delivery_type === 'return';
              
                const getFailedReasonDisplay = () => {
                  if (delivery.status !== 'failed') return null;
                  const reason = delivery.failed_reason;
                  if (reason === 'return_to_seller') {
                    return { text: 'Return to Seller', color: '#D97706', bgColor: '#FFFBEB' };
                  }
                  return { text: reason?.replace(/_/g, ' ') || 'Failed', color: '#DC2626', bgColor: '#FEF2F2' };
                };
                
                const failedReason = getFailedReasonDisplay();
                
                return (
                  <TouchableOpacity 
                    key={delivery.id} 
                    onPress={() => handleCardPress(delivery)}
                    activeOpacity={0.7}
                    style={{ marginBottom: 8 }}
                  >
                    <View style={{ 
                        backgroundColor: 'white', 
                        padding: 5,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.1,
                        shadowRadius: 2,
                        elevation: 2,
                      }}>
                      <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                        <View style={{ width: 60, height: 60, borderRadius: 8, backgroundColor: '#F3F4F6', marginRight: 12, overflow: 'hidden' }}>
                          {delivery.product_image && !imageErrors[delivery.id] ? (
                            <Image 
                              source={{ uri: delivery.product_image }} 
                              style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
                              onError={() => handleImageError(delivery.id)}
                            />
                          ) : (
                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                              <Ionicons name="image-outline" size={24} color="#9CA3AF" />
                            </View>
                          )}
                        </View>
                        
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                            <Ionicons name="cube-outline" size={14} color="#6B7280" />
                            <Text style={{ fontSize: 13, fontWeight: '600', marginLeft: 6 }} numberOfLines={1}>
                              {isReturnDelivery ? 'Return #' : 'Order #'}{delivery.order.order_id?.slice(-8)}
                            </Text>
                            {isReturnDelivery && (
                              <View style={{ 
                                marginLeft: 6, 
                                backgroundColor: '#8B5CF6', 
                                paddingHorizontal: 6, 
                                paddingVertical: 2, 
                                borderRadius: 4 
                              }}>
                                <Text style={{ fontSize: 8, color: '#FFFFFF', fontWeight: '600' }}>RETURN</Text>
                              </View>
                            )}
                          </View>
                          {delivery.shop_name && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
          <Ionicons name="storefront-outline" size={12} color="#3B82F6" />
          <Text style={{ fontSize: 11, color: '#3B82F6', marginLeft: 4, fontWeight: '500' }} numberOfLines={1}>
            {delivery.shop_name}
          </Text>
        </View>
      )}
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                            <Text style={{ fontSize: 11, color: '#6B7280' }} numberOfLines={1}>
                              {customer.first_name} {customer.last_name}
                            </Text>
                            <Text style={{ fontSize: 11, color: '#9CA3AF', marginHorizontal: 4 }}>•</Text>
                            <Text style={{ fontSize: 11, color: '#6B7280' }}>{formatDate(delivery.created_at)}</Text>
                          </View>
                          
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <View>
                              <Text style={{ fontSize: 10, color: '#6B7280', marginBottom: 2 }}>
                                {amountLabel}
                              </Text>
                              <Text style={{ fontSize: 14, fontWeight: '700', color: isReturnDelivery ? '#8B5CF6' : '#EE4D2D' }}>
                                {formatCurrency(displayAmount)}
                              </Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              {getStatusBadge(delivery.status)}
                              {delivery.is_late && (
                                <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, marginLeft: 6 }}>
                                  <Text style={{ fontSize: 8, color: '#DC2626', fontWeight: '500' }}>Late</Text>
                                </View>
                              )}
                            </View>
                          </View>
                        </View>
                      </View>
              
                      <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                          <Ionicons name="location-outline" size={12} color="#6B7280" />
                          <Text style={{ fontSize: 11, color: '#4B5563', marginLeft: 6, flex: 1 }} numberOfLines={2}>
                            {address?.full_address || 'No address'}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                          <Ionicons name="call-outline" size={12} color="#6B7280" />
                          <Text style={{ fontSize: 11, color: '#4B5563', marginLeft: 6 }}>
                            {address?.recipient_phone || 'No contact'}
                          </Text>
                        </View>
                        
                        {failedReason && (
                          <View style={{ 
                            flexDirection: 'row', 
                            alignItems: 'center', 
                            marginBottom: 6,
                            backgroundColor: failedReason.bgColor,
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 6,
                            marginTop: 4
                          }}>
                            <Ionicons name="alert-circle-outline" size={12} color={failedReason.color} />
                            <Text style={{ fontSize: 11, color: failedReason.color, marginLeft: 6, fontWeight: '500' }}>
                              {failedReason.text}
                            </Text>
                          </View>
                        )}
                        
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Ionicons name="card-outline" size={12} color="#6B7280" />
                          <Text style={{ fontSize: 11, color: '#6B7280', marginLeft: 6 }}>
                            {delivery.order.payment_method || 'N/A'}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                          <Ionicons name="cash-outline" size={12} color="#6B7280" />
                          <Text style={{ fontSize: 11, color: '#6B7280', marginLeft: 6 }}>
                            Delivery Fee: {formatCurrency(delivery.delivery_fee || 0)}
                          </Text>
                        </View>
                      </View>
              
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                        <Ionicons name="time-outline" size={11} color="#9CA3AF" />
                        <Text style={{ fontSize: 10, color: '#9CA3AF', marginLeft: 4 }}>
                          {delivery.time_elapsed}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={showPickupDialog}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPickupDialog(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
          <View style={{ backgroundColor: 'white', borderRadius: 12, padding: 16, width: '100%', maxWidth: 400 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Ionicons name="cube-outline" size={20} color="#2563EB" />
              <Text style={{ fontSize: 16, fontWeight: '600', marginLeft: 8 }}>Pick Up Order</Text>
            </View>
            
            <Text style={{ fontSize: 13, color: '#4B5563', marginBottom: 16 }}>
              Are you sure you want to mark this order as picked up?
            </Text>

            {selectedDelivery && (
              <View style={{ backgroundColor: '#F3F4F6', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: '500' }}>Order ID:</Text>
                  <Text style={{ fontSize: 12 }}>#{selectedDelivery.order.order_id?.slice(-8)}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: '500' }}>Customer:</Text>
                  <Text style={{ fontSize: 12 }}>{selectedDelivery.order.customer.first_name} {selectedDelivery.order.customer.last_name}</Text>
                </View>
                {selectedDelivery.delivery_type === 'return' && selectedDelivery.shop_name && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: 12, fontWeight: '500' }}>Shop:</Text>
              <Text style={{ fontSize: 12, color: '#3B82F6' }}>{selectedDelivery.shop_name}</Text>
            </View>
          )}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, fontWeight: '500' }}>Amount:</Text>
                  <Text style={{ fontSize: 12, fontWeight: '600' }}>{formatCurrency(selectedDelivery.order.total_amount)}</Text>
                </View>
              </View>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <TouchableOpacity
                onPress={() => setShowPickupDialog(false)}
                disabled={isActionLoading}
                style={{ paddingHorizontal: 16, paddingVertical: 8, marginRight: 8 }}
              >
                <Text style={{ fontSize: 13, color: '#6B7280' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmPickup}
                disabled={isActionLoading}
                style={{ backgroundColor: '#2563EB', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center' }}
              >
                {isActionLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={{ fontSize: 13, color: 'white' }}>Yes, Pick Up</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showProofModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProofModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="camera-outline" size={24} color="#2563EB" />
                <Text style={{ fontSize: 18, fontWeight: '600', marginLeft: 8 }}>Proof of Delivery</Text>
              </View>
              <TouchableOpacity onPress={() => setShowProofModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>
              Take up to 6 photos or videos as proof of delivery. Media is captured in real-time using your camera.
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4, marginBottom: 16 }}>
                {proofMedia.map((media, index) => (
                  <View key={index} style={{ width: '33.33%', padding: 4 }}>
                    <View style={{ aspectRatio: 1, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB' }}>
                      <Image source={{ uri: media.preview }} style={{ width: '100%', height: '100%' }} />
                      {media.type === 'video' && (
                        <View style={{ position: 'absolute', top: 4, left: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 4, padding: 2 }}>
                          <Ionicons name="videocam" size={12} color="white" />
                        </View>
                      )}
                      <TouchableOpacity
                        onPress={() => handleRemoveMedia(index)}
                        style={{ position: 'absolute', top: 4, right: 4, backgroundColor: '#DC2626', borderRadius: 12, padding: 2 }}
                        disabled={uploadingProofs}
                      >
                        <Ionicons name="close" size={12} color="white" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
                {proofMedia.length < 6 && (
                  <View style={{ width: '33.33%', padding: 4 }}>
                    <TouchableOpacity
                      onPress={pickMedia}
                      disabled={uploadingProofs}
                      style={{ aspectRatio: 1, borderRadius: 8, borderWidth: 2, borderColor: '#D1D5DB', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' }}
                    >
                      <Ionicons name="camera-outline" size={24} color="#9CA3AF" />
                      <Text style={{ fontSize: 9, color: '#9CA3AF', marginTop: 4 }}>Capture</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {uploadingProofs && (
                <View style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 11, color: '#6B7280' }}>Uploading proofs...</Text>
                    <Text style={{ fontSize: 11, color: '#2563EB' }}>{Math.round(uploadProgress)}%</Text>
                  </View>
                  <View style={{ height: 4, backgroundColor: '#E5E7EB', borderRadius: 2 }}>
                    <View style={{ height: 4, backgroundColor: '#10B981', borderRadius: 2, width: `${uploadProgress}%` }} />
                  </View>
                </View>
              )}

              <Text style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 16 }}>
                {proofMedia.length}/6 media files captured. All files are uploaded in real-time.
              </Text>
            </ScrollView>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6' }}>
              <TouchableOpacity
                onPress={() => {
                  setShowProofModal(false);
                  setProofMedia([]);
                  setSelectedDelivery(null);
                  setActionType(null);
                }}
                disabled={uploadingProofs}
                style={{ paddingHorizontal: 16, paddingVertical: 10 }}
              >
                <Text style={{ fontSize: 14, color: '#6B7280' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDeliverWithProof}
                disabled={proofMedia.length === 0 || uploadingProofs}
                style={{ backgroundColor: proofMedia.length === 0 ? '#D1D5DB' : '#10B981', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center' }}
              >
                {uploadingProofs ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Text style={{ fontSize: 14, color: 'white', marginRight: 4 }}>
                      Confirm Delivery ({proofMedia.length})
                    </Text>
                    <Ionicons name="checkmark-circle" size={16} color="white" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}