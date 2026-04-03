import React, { useState, useEffect, useMemo } from 'react';
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
import RiderPageHeader from './includes/riderPageHeader';

interface OrderHistoryData {
  id: string;
  order_id: string;
  order_number: string;
  customer_name: string;
  customer_contact?: string;
  customer_email?: string;
  
  pickup_location: string;
  delivery_location: string;
  recipient_name: string;
  recipient_phone: string;
  
  status: 'pending' | 'picked_up' | 'in_progress' | 'delivered' | 'completed' | 'cancelled';
  distance_km?: number;
  estimated_minutes?: number;
  actual_minutes?: number;
  delivery_rating?: number;
  notes?: string;
  proofs_count?: number;
  product_image?: string;
  delivery_fee?: number;
  
  refund_status?: string;
  refund_reason?: string;
  refund_reject_code?: string;
  refund_reject_details?: string;
  dispute_reason?: string;
  dispute_status?: string;
  
  order_amount: number;
  payment_method: string;
  payment_status: 'success' | 'failed';
  
  shop_name?: string;
  shop_contact?: string;
  
  order_created_at: string;
  picked_at?: string;
  delivered_at?: string;
  created_at: string;
  
  items_count?: number;
  items_summary?: string;
  is_late?: boolean;
  time_elapsed?: string;
}

interface Proof {
  id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  uploaded_at: string;
  proof_type: string;
  delivery_id: string;
}

// Status badges configuration
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  pending: { 
    label: 'Pending', 
    color: '#FEF3C7',
    icon: 'time-outline'
  },
  accepted: {
    label: 'Accepted',
    color: '#E0E7FF',
    icon: 'checkmark-circle-outline'
  },
  picked_up: { 
    label: 'In Transit', 
    color: '#DBEAFE',
    icon: 'car-outline'
  },
  in_progress: { 
    label: 'In Progress', 
    color: '#E0E7FF',
    icon: 'car-outline'
  },
  delivered: { 
    label: 'Delivered', 
    color: '#D1FAE5',
    icon: 'checkmark-circle-outline'
  },
  completed: { 
    label: 'Completed', 
    color: '#D1FAE5',
    icon: 'ribbon-outline'
  },
  cancelled: { 
    label: 'Cancelled', 
    color: '#FEE2E2',
    icon: 'alert-circle-outline'
  },
  default: { 
    label: 'Unknown', 
    color: '#F3F4F6',
    icon: 'alert-circle-outline'
  }
};

// Tabs configuration - Active, Completed, Cancelled
const STATUS_TABS: Array<{ id: 'active' | 'completed' | 'cancelled'; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: 'active', label: 'Active', icon: 'car-outline' },
  { id: 'completed', label: 'Completed', icon: 'checkmark-circle-outline' },
  { id: 'cancelled', label: 'Cancelled', icon: 'alert-circle-outline' }
];

export default function OrderHistory() {
  const { user } = useAuth();
  const { width } = Dimensions.get('window');
  
  const [historyData, setHistoryData] = useState<OrderHistoryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'cancelled'>('active');
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  // Proof modal states
  const [showProofModal, setShowProofModal] = useState(false);
  const [selectedProofs, setSelectedProofs] = useState<Proof[]>([]);
  const [selectedProofIndex, setSelectedProofIndex] = useState(0);
  const [loadingProofs, setLoadingProofs] = useState(false);
  const [currentDeliveryId, setCurrentDeliveryId] = useState<string | null>(null);

  // Fetch data function
  const fetchHistoryData = async () => {
    try {
      setIsLoading(true);
      
      const response = await AxiosInstance.get('/rider-history/order_history/', {
        headers: {
          'X-User-Id': user?.user_id || user?.id
        }
      });

      if (response.data) {
        setHistoryData(response.data.deliveries || []);
      }
    } catch (error) {
      console.error('Error fetching order history:', error);
      setHistoryData([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch proofs for a delivery
  const fetchDeliveryProofs = async (deliveryId: string) => {
    setLoadingProofs(true);
    setCurrentDeliveryId(deliveryId);
    try {
      const response = await AxiosInstance.get(`/rider-proof/delivery/${deliveryId}/proofs/`, {
        headers: { 'X-User-Id': user?.user_id }
      });
      
      if (response.data?.success) {
        const proofs = response.data.proofs || [];
        setSelectedProofs(proofs);
        setSelectedProofIndex(0);
        setShowProofModal(true);
        setImageErrors({});
      }
    } catch (error) {
      console.error('Error fetching proofs:', error);
      Alert.alert('Error', 'Failed to load proofs');
    } finally {
      setLoadingProofs(false);
      setCurrentDeliveryId(null);
    }
  };

  // Handle image error
  const handleImageError = (proofId: string) => {
    setImageErrors(prev => ({ ...prev, [proofId]: true }));
  };

  // Handle next/previous proof
  const handleNextProof = () => {
    if (selectedProofIndex < selectedProofs.length - 1) {
      setSelectedProofIndex(selectedProofIndex + 1);
    }
  };

  const handlePrevProof = () => {
    if (selectedProofIndex > 0) {
      setSelectedProofIndex(selectedProofIndex - 1);
    }
  };

  // Handle card press - navigate to order details
  const handleCardPress = (delivery: OrderHistoryData) => {
    router.push({
      pathname: '/rider/rider-view-order',
      params: {
        deliveryId: delivery.id,
        orderId: delivery.order_id,
      }
    });
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.default;
    
    return (
      <View style={{ backgroundColor: config.color, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }}>
        <Ionicons name={config.icon} size={10} color="#4B5563" />
        <Text style={{ fontSize: 10, marginLeft: 2, color: '#1F2937' }}>{config.label}</Text>
      </View>
    );
  };

  // Format date
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

  // Format currency
  const formatCurrency = (amount?: number | string | null) => {
    const numericAmount = typeof amount === 'number' ? amount : Number(amount) || 0;
    return `₱${numericAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  };

  // Get filtered data based on active tab
  const filteredData = useMemo(() => {
    const activeStatuses = ['pending', 'accepted', 'picked_up', 'in_progress'];
    const completedStatuses = ['delivered', 'completed'];

    switch (activeTab) {
      case 'active':
        return historyData.filter(d => activeStatuses.includes(d.status));
      case 'completed':
        return historyData.filter(d => completedStatuses.includes(d.status));
      case 'cancelled':
        return historyData.filter(d => d.status === 'cancelled');
      default:
        return [];
    }
  }, [historyData, activeTab]);

  // Get tab count
  const getTabCount = (tabId: string) => {
    const activeStatuses = ['pending', 'accepted', 'picked_up', 'in_progress'];
    const completedStatuses = ['delivered', 'completed'];

    switch (tabId) {
      case 'active':
        return historyData.filter(d => activeStatuses.includes(d.status)).length;
      case 'completed':
        return historyData.filter(d => completedStatuses.includes(d.status)).length;
      case 'cancelled':
        return historyData.filter(d => d.status === 'cancelled').length;
      default:
        return 0;
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchHistoryData();
  }, []);

  // Refresh control
  const onRefresh = () => {
    setRefreshing(true);
    fetchHistoryData();
  };

  // Loading skeleton
  const LoadingSkeleton = () => (
    <View style={{ backgroundColor: '#F3F4F6', padding: 16, borderRadius: 12, marginBottom: 12 }}>
      <View style={{ height: 16, backgroundColor: '#E5E7EB', borderRadius: 4, width: '60%', marginBottom: 8 }} />
      <View style={{ height: 12, backgroundColor: '#E5E7EB', borderRadius: 4, width: '40%', marginBottom: 8 }} />
      <View style={{ height: 12, backgroundColor: '#E5E7EB', borderRadius: 4, width: '80%' }} />
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <RiderPageHeader 
        title="Order History" 
        subtitle="Track your past deliveries"
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
          {/* Full Width Tabs */}
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

          {/* Deliveries List - Cards with padding and rounded corners */}
          <View style={{ padding: 5 }}>
            {isLoading ? (
              <>
                <LoadingSkeleton />
                <LoadingSkeleton />
                <LoadingSkeleton />
              </>
            ) : filteredData.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 48 }}>
                <Ionicons name="bag-outline" size={48} color="#D1D5DB" />
                <Text style={{ color: '#9CA3AF', fontSize: 14, marginTop: 12 }}>
                  No {activeTab} deliveries found
                </Text>
              </View>
            ) : (
              filteredData.map((delivery) => (
                <TouchableOpacity 
                  key={delivery.id} 
                  onPress={() => handleCardPress(delivery)}
                  activeOpacity={0.7}
                  style={{ marginBottom: 5}}
                >
                  <View style={{ 
                    backgroundColor: 'white', 
                    borderWidth: 1, 
                    borderColor: '#F3F4F6',
                    padding: 16,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 2,
                    elevation: 2,
                  }}>
                    {/* Product Image and Header Row */}
                    <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                      {/* Product Image */}
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
                      
                      {/* Order Info */}
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                          <Ionicons name="cube-outline" size={14} color="#6B7280" />
                          <Text style={{ fontSize: 13, fontWeight: '600', marginLeft: 6 }} numberOfLines={1}>
                            Order #{delivery.order_number?.slice(-8) || delivery.id.slice(-8)}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                          <Text style={{ fontSize: 11, color: '#6B7280' }} numberOfLines={1}>
                            {delivery.customer_name || delivery.recipient_name}
                          </Text>
                          <Text style={{ fontSize: 11, color: '#9CA3AF', marginHorizontal: 4 }}>•</Text>
                          <Text style={{ fontSize: 11, color: '#6B7280' }}>{formatDate(delivery.order_created_at)}</Text>
                        </View>
                        
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: '#EE4D2D' }}>
                            {formatCurrency(delivery.order_amount)}
                          </Text>
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

                    {/* Address and Contact */}
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                        <Ionicons name="location-outline" size={12} color="#6B7280" />
                        <Text style={{ fontSize: 11, color: '#4B5563', marginLeft: 6, flex: 1 }} numberOfLines={2}>
                          {delivery.delivery_location || 'No address'}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                        <Ionicons name="call-outline" size={12} color="#6B7280" />
                        <Text style={{ fontSize: 11, color: '#4B5563', marginLeft: 6 }}>
                          {delivery.recipient_phone || delivery.customer_contact || 'No contact'}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="card-outline" size={12} color="#6B7280" />
                        <Text style={{ fontSize: 11, color: '#6B7280', marginLeft: 6 }}>
                          {delivery.payment_method || 'N/A'}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <Ionicons name="cash-outline" size={12} color="#6B7280" />
                        <Text style={{ fontSize: 11, color: '#6B7280', marginLeft: 6 }}>
                          Delivery Fee: {formatCurrency(delivery.delivery_fee || 0)}
                        </Text>
                      </View>
                    </View>

                    {/* Time Elapsed */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                      <Ionicons name="time-outline" size={11} color="#9CA3AF" />
                      <Text style={{ fontSize: 10, color: '#9CA3AF', marginLeft: 4 }}>
                        {delivery.time_elapsed || 'Completed'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Proof of Delivery Modal */}
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

            {selectedProofs.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 12, color: '#6B7280' }}>
                  {selectedProofIndex + 1} of {selectedProofs.length} • {selectedProofs[selectedProofIndex]?.proof_type || 'Proof'}
                </Text>
              </View>
            )}

            <ScrollView showsVerticalScrollIndicator={false}>
              {loadingProofs ? (
                <View style={{ alignItems: 'center', justifyContent: 'center', height: 300 }}>
                  <ActivityIndicator size="large" color="#2563EB" />
                  <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 12 }}>Loading proofs...</Text>
                </View>
              ) : selectedProofs.length > 0 ? (
                <View>
                  <View style={{ backgroundColor: '#F3F4F6', borderRadius: 12, overflow: 'hidden', marginBottom: 16, aspectRatio: 1, justifyContent: 'center', alignItems: 'center' }}>
                    {selectedProofs[selectedProofIndex]?.file_url && !imageErrors[selectedProofs[selectedProofIndex].id] ? (
                      <Image 
                        source={{ uri: selectedProofs[selectedProofIndex].file_url }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="contain"
                        onError={() => handleImageError(selectedProofs[selectedProofIndex].id)}
                      />
                    ) : (
                      <View style={{ alignItems: 'center' }}>
                        <Ionicons name="image-outline" size={48} color="#9CA3AF" />
                        <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 8 }}>Image not available</Text>
                      </View>
                    )}
                  </View>

                  {selectedProofs.length > 1 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                      <View style={{ flexDirection: 'row' }}>
                        {selectedProofs.map((proof, index) => (
                          <TouchableOpacity
                            key={proof.id}
                            onPress={() => setSelectedProofIndex(index)}
                            style={{
                              width: 60,
                              height: 60,
                              marginRight: 8,
                              borderRadius: 8,
                              overflow: 'hidden',
                              borderWidth: 2,
                              borderColor: index === selectedProofIndex ? '#2563EB' : 'transparent'
                            }}
                          >
                            {proof.file_url && !imageErrors[proof.id] ? (
                              <Image 
                                source={{ uri: proof.file_url }}
                                style={{ width: '100%', height: '100%' }}
                                resizeMode="cover"
                                onError={() => handleImageError(proof.id)}
                              />
                            ) : (
                              <View style={{ width: '100%', height: '100%', backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' }}>
                                <Ionicons name="image-outline" size={20} color="#9CA3AF" />
                              </View>
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  )}

                  <View style={{ backgroundColor: '#F9FAFB', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                    <View style={{ marginBottom: 8 }}>
                      <Text style={{ fontSize: 10, color: '#6B7280' }}>Uploaded At</Text>
                      <Text style={{ fontSize: 12, fontWeight: '500' }}>
                        {selectedProofs[selectedProofIndex]?.uploaded_at 
                          ? formatDate(selectedProofs[selectedProofIndex].uploaded_at)
                          : 'N/A'}
                      </Text>
                    </View>
                    <View>
                      <Text style={{ fontSize: 10, color: '#6B7280' }}>File Type</Text>
                      <Text style={{ fontSize: 12, fontWeight: '500' }}>{selectedProofs[selectedProofIndex]?.file_type || 'N/A'}</Text>
                    </View>
                  </View>

                  {selectedProofs.length > 1 && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                      <TouchableOpacity
                        onPress={handlePrevProof}
                        disabled={selectedProofIndex === 0}
                        style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: selectedProofIndex === 0 ? '#F3F4F6' : '#2563EB', borderRadius: 8 }}
                      >
                        <Text style={{ fontSize: 12, color: selectedProofIndex === 0 ? '#9CA3AF' : 'white' }}>Previous</Text>
                      </TouchableOpacity>
                      <Text style={{ fontSize: 12, color: '#6B7280', alignSelf: 'center' }}>
                        {selectedProofIndex + 1} / {selectedProofs.length}
                      </Text>
                      <TouchableOpacity
                        onPress={handleNextProof}
                        disabled={selectedProofIndex === selectedProofs.length - 1}
                        style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: selectedProofIndex === selectedProofs.length - 1 ? '#F3F4F6' : '#2563EB', borderRadius: 8 }}
                      >
                        <Text style={{ fontSize: 12, color: selectedProofIndex === selectedProofs.length - 1 ? '#9CA3AF' : 'white' }}>Next</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ) : (
                <View style={{ alignItems: 'center', justifyContent: 'center', height: 300 }}>
                  <Ionicons name="camera-outline" size={48} color="#D1D5DB" />
                  <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 12 }}>No proofs available for this delivery</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}