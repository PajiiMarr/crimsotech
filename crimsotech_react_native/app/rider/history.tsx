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
  FlatList,
  Platform,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
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
  
  // Shipping address info
  pickup_location: string;
  delivery_location: string;
  recipient_name: string;
  recipient_phone: string;
  
  // Delivery details
  status: 'pending' | 'picked_up' | 'in_progress' | 'delivered' | 'completed' | 'cancelled';
  distance_km?: number;
  estimated_minutes?: number;
  actual_minutes?: number;
  delivery_rating?: number;
  notes?: string;
  proofs_count?: number;
  
  // refund/dispute metadata
  refund_status?: string;
  refund_reason?: string;
  refund_reject_code?: string;
  refund_reject_details?: string;
  dispute_reason?: string;
  dispute_status?: string;
  
  // Order financials
  order_amount: number;
  delivery_fee?: number;
  payment_method: string;
  payment_status: 'success' | 'failed';
  
  // Shop information
  shop_name?: string;
  shop_contact?: string;
  
  // Timestamps
  order_created_at: string;
  picked_at?: string;
  delivered_at?: string;
  created_at: string;
  
  // Additional metadata
  items_count?: number;
  items_summary?: string;
  is_late?: boolean;
  time_elapsed?: string;
}

interface HistoryMetrics {
  total_deliveries: number;
  delivered_count: number;
  completed_count: number;
  cancelled_count: number;
  total_earnings: number;
  avg_delivery_time: number;
  avg_rating: number;
  on_time_percentage: number;
  today_deliveries: number;
  week_earnings: number;
  has_data: boolean;
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

// Tabs configuration
const STATUS_TABS: Array<{ id: 'active' | 'completed' | 'cancelled'; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: 'active', label: 'Active', icon: 'car-outline' },
  { id: 'completed', label: 'Completed', icon: 'checkmark-circle-outline' },
  { id: 'cancelled', label: 'Cancelled', icon: 'alert-circle-outline' }
];

type RangeType = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

export default function OrderHistory() {
  const { user } = useAuth();
  const { width } = Dimensions.get('window');
  
  // State for data
  const [historyData, setHistoryData] = useState<OrderHistoryData[]>([]);
  const [metrics, setMetrics] = useState<HistoryMetrics>({
    total_deliveries: 0,
    delivered_count: 0,
    completed_count: 0,
    cancelled_count: 0,
    total_earnings: 0,
    avg_delivery_time: 0,
    avg_rating: 0,
    on_time_percentage: 0,
    today_deliveries: 0,
    week_earnings: 0,
    has_data: false
  });

  // State for loading and UI
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedDeliveries, setExpandedDeliveries] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'cancelled'>('active');

  // State for proof modal
  const [showProofModal, setShowProofModal] = useState(false);
  const [selectedProofs, setSelectedProofs] = useState<Proof[]>([]);
  const [selectedProofIndex, setSelectedProofIndex] = useState(0);
  const [loadingProofs, setLoadingProofs] = useState(false);
  const [currentDeliveryId, setCurrentDeliveryId] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  // Date range controls synced with web behavior presets
  const [rangeType, setRangeType] = useState<RangeType>('monthly');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date(),
  });
  const [showCustomRangeModal, setShowCustomRangeModal] = useState(false);
  const [customRangeDraft, setCustomRangeDraft] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date(),
  });
  const [pickingDate, setPickingDate] = useState<'start' | 'end' | null>(null);

  // Fetch data function
  const fetchHistoryData = async () => {
    try {
      setIsLoading(true);
      
      const params = new URLSearchParams({
        start_date: dateRange.start.toISOString().split('T')[0],
        end_date: dateRange.end.toISOString().split('T')[0],
        range_type: rangeType,
      });

      const response = await AxiosInstance.get(`/rider-history/order_history/?${params}`, {
        headers: {
          'X-User-Id': user?.user_id || user?.id
        }
      });

      if (response.data) {
        setHistoryData(response.data.deliveries || []);
        setMetrics(response.data.metrics || {
          total_deliveries: 0,
          delivered_count: 0,
          completed_count: 0,
          cancelled_count: 0,
          total_earnings: 0,
          avg_delivery_time: 0,
          avg_rating: 0,
          on_time_percentage: 0,
          today_deliveries: 0,
          week_earnings: 0,
          has_data: false
        });
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
    const numericAmount =
      typeof amount === 'number'
        ? amount
        : typeof amount === 'string'
          ? Number(amount)
          : 0;

    const safeAmount = Number.isFinite(numericAmount) ? numericAmount : 0;
    return `₱${safeAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  };

  // Format time
  const formatTime = (minutes?: number) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const toggleDeliveryExpansion = (deliveryId: string) => {
    const newExpanded = new Set(expandedDeliveries);
    if (newExpanded.has(deliveryId)) {
      newExpanded.delete(deliveryId);
    } else {
      newExpanded.add(deliveryId);
    }
    setExpandedDeliveries(newExpanded);
  };

  // Filter table data by selected tab
  const filteredTableData = useMemo(() => {
    const activeStatuses = ['pending', 'accepted', 'picked_up', 'in_progress'];
    const completedStatuses = ['delivered', 'completed'];

    let filtered = historyData;
    
    switch (activeTab) {
      case 'active':
        filtered = historyData.filter(d => activeStatuses.includes(d.status));
        break;
      case 'completed':
        filtered = historyData.filter(d => completedStatuses.includes(d.status));
        break;
      case 'cancelled':
        filtered = historyData.filter(d => d.status === 'cancelled');
        break;
    }

    return filtered;
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
  }, [dateRange, rangeType]);

  const applyRangePreset = (preset: RangeType) => {
    if (preset === 'custom') {
      setCustomRangeDraft({
        start: dateRange.start,
        end: dateRange.end,
      });
      setShowCustomRangeModal(true);
      return;
    }

    const now = new Date();
    const start = new Date(now);

    if (preset === 'daily') {
      start.setHours(0, 0, 0, 0);
    } else if (preset === 'weekly') {
      start.setDate(now.getDate() - 7);
    } else if (preset === 'monthly') {
      start.setDate(now.getDate() - 30);
    } else {
      start.setFullYear(now.getFullYear() - 1);
    }

    setRangeType(preset);
    setDateRange({ start, end: now });
  };

  const formatShortDate = (date: Date) => {
    try {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  const onCustomDateChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setPickingDate(null);
    }

    if (!selectedDate || !pickingDate) return;

    setCustomRangeDraft((prev) => {
      if (pickingDate === 'start') {
        const nextStart = selectedDate;
        const nextEnd = prev.end < nextStart ? nextStart : prev.end;
        return { start: nextStart, end: nextEnd };
      }

      const nextEnd = selectedDate;
      const nextStart = prev.start > nextEnd ? nextEnd : prev.start;
      return { start: nextStart, end: nextEnd };
    });
  };

  const applyCustomRange = () => {
    if (customRangeDraft.end < customRangeDraft.start) {
      Alert.alert('Invalid Range', 'End date must be on or after start date.');
      return;
    }

    setRangeType('custom');
    setDateRange({
      start: customRangeDraft.start,
      end: customRangeDraft.end,
    });
    setShowCustomRangeModal(false);
    setPickingDate(null);
  };

  // Refresh control
  const onRefresh = () => {
    setRefreshing(true);
    fetchHistoryData();
  };

  // Metric Card Component
  const MetricCard = ({ title, value, subtitle, icon, color }: any) => (
    <View style={{ flex: 1, backgroundColor: 'white', borderRadius: 8, padding: 12, marginHorizontal: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, color: '#6B7280' }}>{title}</Text>
          <Text style={{ fontSize: 16, fontWeight: 'bold', marginTop: 2 }}>{value}</Text>
          {subtitle && <Text style={{ fontSize: 9, color: '#9CA3AF', marginTop: 2 }}>{subtitle}</Text>}
        </View>
        <View style={{ backgroundColor: color, padding: 6, borderRadius: 20 }}>
          <Ionicons name={icon} size={16} color="#FFFFFF" />
        </View>
      </View>
    </View>
  );

  // Loading skeleton
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
        title="Order History" 
        subtitle="Track your past deliveries and performance"
      />
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 80 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>

          {/* Date Range Presets */}
          <View style={{ flexDirection: 'row', marginBottom: 14 }}>
            {([
              { id: 'daily', label: 'Today' },
              { id: 'weekly', label: '7 Days' },
              { id: 'monthly', label: '30 Days' },
              { id: 'yearly', label: '1 Year' },
              { id: 'custom', label: 'Custom' },
            ] as const).map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => applyRangePreset(item.id)}
                style={{
                  marginRight: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 14,
                  backgroundColor: rangeType === item.id ? '#111827' : '#F3F4F6',
                }}
              >
                <Text style={{ color: rangeType === item.id ? 'white' : '#4B5563', fontSize: 11, fontWeight: '600' }}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {rangeType === 'custom' && (
            <Text style={{ fontSize: 11, color: '#6B7280', marginBottom: 12 }}>
              {formatShortDate(dateRange.start)} - {formatShortDate(dateRange.end)}
            </Text>
          )}

          {/* Metrics Cards */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', paddingHorizontal: 4 }}>
              {isLoading ? (
                <>
                  <View style={{ width: 140, height: 70, backgroundColor: '#E5E7EB', borderRadius: 8, marginRight: 8 }} />
                  <View style={{ width: 140, height: 70, backgroundColor: '#E5E7EB', borderRadius: 8, marginRight: 8 }} />
                </>
              ) : (
                <>
                  <MetricCard
                    title="Total Deliveries"
                    value={metrics.total_deliveries}
                    subtitle={`${metrics.delivered_count + metrics.completed_count} completed · ${metrics.cancelled_count} cancelled`}
                    icon="cube-outline"
                    color="#3B82F6"
                  />
                  <MetricCard
                    title="Total Earnings"
                    value={formatCurrency(metrics.total_earnings)}
                    subtitle={`${formatCurrency(metrics.week_earnings)} this week`}
                    icon="cash-outline"
                    color="#10B981"
                  />
                  <MetricCard
                    title="Avg Rating"
                    value={metrics.avg_rating > 0 ? metrics.avg_rating.toFixed(1) : '0'}
                    subtitle={`${metrics.on_time_percentage}% on-time`}
                    icon="star-outline"
                    color="#F59E0B"
                  />
                  <MetricCard
                    title="Avg Delivery Time"
                    value={formatTime(metrics.avg_delivery_time)}
                    subtitle={`${metrics.today_deliveries} today`}
                    icon="time-outline"
                    color="#8B5CF6"
                  />
                </>
              )}
            </View>
          </ScrollView>

          {/* History Card */}
          <View style={{ backgroundColor: 'white', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 }}>
            {/* Tabs */}
            <View style={{ flexDirection: 'row', marginBottom: 16 }}>
              {STATUS_TABS.map((tab) => {
                const count = getTabCount(tab.id);
                const isActive = activeTab === tab.id;
                
                return (
                  <TouchableOpacity
                    key={tab.id}
                    onPress={() => setActiveTab(tab.id)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 20,
                      marginRight: 8,
                      backgroundColor: isActive ? '#EFF6FF' : 'transparent',
                      borderWidth: 1,
                      borderColor: isActive ? '#BFDBFE' : '#E5E7EB'
                    }}
                  >
                    <Ionicons name={tab.icon} size={14} color={isActive ? '#2563EB' : '#6B7280'} />
                    <Text style={{ fontSize: 12, marginLeft: 4, color: isActive ? '#2563EB' : '#6B7280' }}>
                      {tab.label}
                    </Text>
                    {count > 0 && (
                      <View style={{
                        marginLeft: 4,
                        paddingHorizontal: 4,
                        paddingVertical: 1,
                        borderRadius: 10,
                        backgroundColor: isActive ? '#BFDBFE' : '#F3F4F6'
                      }}>
                        <Text style={{ fontSize: 9, color: isActive ? '#1E40AF' : '#4B5563' }}>{count}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Deliveries List */}
            <View>
              {isLoading ? (
                <>
                  <LoadingSkeleton />
                  <LoadingSkeleton />
                  <LoadingSkeleton />
                </>
              ) : filteredTableData.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                  <Ionicons name="bag-outline" size={40} color="#D1D5DB" />
                  <Text style={{ color: '#9CA3AF', fontSize: 13, marginTop: 8 }}>
                    No deliveries found
                  </Text>
                </View>
              ) : (
                filteredTableData.map((delivery) => {
                  const isExpanded = expandedDeliveries.has(delivery.id);
                  
                  return (
                    <View key={delivery.id} style={{ backgroundColor: 'white', borderWidth: 1, borderColor: '#F3F4F6', borderRadius: 12, marginBottom: 12 }}>
                      {/* Header */}
                      <View style={{ padding: 12 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Ionicons name="cube-outline" size={14} color="#6B7280" />
                              <Text style={{ fontSize: 12, fontWeight: '500', marginLeft: 4 }} numberOfLines={1}>
                                Order #{delivery.order_number?.slice(-8) || delivery.id.slice(-8)}
                              </Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                              <Text style={{ fontSize: 10, color: '#6B7280' }} numberOfLines={1}>
                                {delivery.customer_name || delivery.recipient_name}
                              </Text>
                              <Text style={{ fontSize: 10, color: '#9CA3AF', marginHorizontal: 4 }}>•</Text>
                              <Text style={{ fontSize: 10, color: '#6B7280' }}>{formatDate(delivery.order_created_at)}</Text>
                            </View>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            {getStatusBadge(delivery.status)}
                            {delivery.is_late && (
                              <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 8, marginLeft: 4 }}>
                                <Text style={{ fontSize: 8, color: '#DC2626' }}>Late</Text>
                              </View>
                            )}
                            <TouchableOpacity onPress={() => toggleDeliveryExpansion(delivery.id)} style={{ marginLeft: 8, padding: 2 }}>
                              <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color="#9CA3AF" />
                            </TouchableOpacity>
                          </View>
                        </View>

                        {/* Address and Contact */}
                        <View style={{ marginBottom: 8 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                            <Ionicons name="location-outline" size={10} color="#6B7280" />
                            <Text style={{ fontSize: 10, color: '#4B5563', marginLeft: 4, flex: 1 }} numberOfLines={1}>
                              {delivery.delivery_location || 'No address'}
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                            <Ionicons name="call-outline" size={10} color="#6B7280" />
                            <Text style={{ fontSize: 10, color: '#4B5563', marginLeft: 4 }}>
                              {delivery.recipient_phone || delivery.customer_contact || 'No contact'}
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Ionicons name="card-outline" size={10} color="#6B7280" />
                              <Text style={{ fontSize: 10, color: '#6B7280', marginLeft: 4 }}>
                                {delivery.payment_method || 'N/A'}
                              </Text>
                            </View>
                            <Text style={{ fontSize: 12, fontWeight: '600' }}>
                              {formatCurrency(delivery.order_amount)}
                            </Text>
                          </View>
                        </View>

                        {/* Time Elapsed */}
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Ionicons name="time-outline" size={10} color="#9CA3AF" />
                          <Text style={{ fontSize: 9, color: '#9CA3AF', marginLeft: 2 }}>
                            {delivery.time_elapsed || formatTime(delivery.actual_minutes)}
                          </Text>
                        </View>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' }}>
                            {/* Dispute Information (if any) */}
                            {((delivery.refund_status === 'dispute') || delivery.refund_reject_code === 'good_condition_handed') && (
                              <View style={{ backgroundColor: '#FEF2F2', padding: 8, borderRadius: 6, borderWidth: 1, borderColor: '#FEE2E2', marginBottom: 12 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                  <Ionicons name="alert-circle" size={12} color="#DC2626" />
                                  <Text style={{ fontSize: 10, fontWeight: '500', color: '#DC2626', marginLeft: 4 }}>Dispute Notice</Text>
                                </View>
                                <Text style={{ fontSize: 9, color: '#DC2626' }}>
                                  {delivery.refund_reason && `Reason: ${delivery.refund_reason}`}
                                  {delivery.refund_reject_code && `\nRejected: ${delivery.refund_reject_code}${delivery.refund_reject_details ? ` – ${delivery.refund_reject_details}` : ''}`}
                                </Text>
                              </View>
                            )}

                            <Text style={{ fontSize: 10, fontWeight: '500', color: '#374151', marginBottom: 4 }}>Recipient Information</Text>
                            <View style={{ marginBottom: 8 }}>
                              <Text style={{ fontSize: 10, color: '#6B7280' }}>Name: {delivery.recipient_name}</Text>
                              <Text style={{ fontSize: 10, color: '#6B7280' }}>Phone: {delivery.recipient_phone || 'N/A'}</Text>
                            </View>
                            
                            <Text style={{ fontSize: 10, fontWeight: '500', color: '#374151', marginBottom: 4 }}>Delivery Details</Text>
                            <View style={{ marginBottom: 8 }}>
                              {delivery.pickup_location && (
                                <Text style={{ fontSize: 10, color: '#6B7280' }}>Pickup: {delivery.pickup_location}</Text>
                              )}
                              {delivery.distance_km && (
                                <Text style={{ fontSize: 10, color: '#6B7280' }}>Distance: {delivery.distance_km} km</Text>
                              )}
                              {delivery.delivery_rating && (
                                <Text style={{ fontSize: 10, color: '#6B7280' }}>Rating: {delivery.delivery_rating} ★</Text>
                              )}
                              {delivery.picked_at && (
                                <Text style={{ fontSize: 10, color: '#6B7280' }}>Picked Up: {formatDate(delivery.picked_at)}</Text>
                              )}
                              {delivery.delivered_at && (
                                <Text style={{ fontSize: 10, color: '#6B7280' }}>Delivered: {formatDate(delivery.delivered_at)}</Text>
                              )}
                            </View>

                            {delivery.items_summary && (
                              <>
                                <Text style={{ fontSize: 10, fontWeight: '500', color: '#374151', marginBottom: 4 }}>Items</Text>
                                <Text style={{ fontSize: 10, color: '#6B7280', marginBottom: 8 }}>
                                  {delivery.items_summary || `${delivery.items_count || 0} items`}
                                </Text>
                              </>
                            )}
                          </View>
                        )}

                        {/* Actions */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' }}>
                          <TouchableOpacity onPress={() => toggleDeliveryExpansion(delivery.id)} style={{ padding: 4 }}>
                            <Text style={{ fontSize: 10, color: '#6B7280' }}>{isExpanded ? 'Show Less' : 'View Details'}</Text>
                          </TouchableOpacity>
                          
                          <View style={{ flexDirection: 'row' }}>
                            <TouchableOpacity
                              // onPress={() => router.push(`/rider/deliveries/${delivery.id}`)}
                              style={{ paddingHorizontal: 8, paddingVertical: 4, marginRight: 8, flexDirection: 'row', alignItems: 'center' }}
                            >
                              <Ionicons name="eye-outline" size={12} color="#6B7280" />
                              <Text style={{ fontSize: 10, color: '#6B7280', marginLeft: 2 }}>View</Text>
                            </TouchableOpacity>
                            
                            {/* Show View Proof button for completed/delivered orders */}
                            {(delivery.status === 'delivered' || delivery.status === 'completed') && (
                              <TouchableOpacity
                                onPress={() => fetchDeliveryProofs(delivery.id)}
                                disabled={loadingProofs && currentDeliveryId === delivery.id}
                                style={{ backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }}
                              >
                                {loadingProofs && currentDeliveryId === delivery.id ? (
                                  <ActivityIndicator size="small" color="#6B7280" />
                                ) : (
                                  <>
                                    <Ionicons name="camera-outline" size={12} color="#6B7280" />
                                    <Text style={{ fontSize: 10, color: '#6B7280', marginLeft: 2 }}>
                                      Proof {(delivery.proofs_count || 0) > 0 && `(${delivery.proofs_count})`}
                                    </Text>
                                  </>
                                )}
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Custom Date Range Modal */}
      <Modal
        visible={showCustomRangeModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowCustomRangeModal(false);
          setPickingDate(null);
        }}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: 'white', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>Custom Date Range</Text>
              <TouchableOpacity onPress={() => setShowCustomRangeModal(false)}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => setPickingDate('start')}
              style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 12, marginBottom: 10 }}
            >
              <Text style={{ fontSize: 11, color: '#6B7280' }}>Start Date</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827', marginTop: 3 }}>
                {formatShortDate(customRangeDraft.start)}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setPickingDate('end')}
              style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 12, marginBottom: 12 }}
            >
              <Text style={{ fontSize: 11, color: '#6B7280' }}>End Date</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827', marginTop: 3 }}>
                {formatShortDate(customRangeDraft.end)}
              </Text>
            </TouchableOpacity>

            {pickingDate && (
              <DateTimePicker
                value={pickingDate === 'start' ? customRangeDraft.start : customRangeDraft.end}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                maximumDate={new Date()}
                onChange={onCustomDateChange}
              />
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
              <TouchableOpacity
                onPress={() => {
                  setShowCustomRangeModal(false);
                  setPickingDate(null);
                }}
                style={{ paddingHorizontal: 14, paddingVertical: 9, marginRight: 8 }}
              >
                <Text style={{ fontSize: 13, color: '#6B7280' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={applyCustomRange}
                style={{ backgroundColor: '#111827', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 8 }}
              >
                <Text style={{ fontSize: 13, color: 'white', fontWeight: '700' }}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
                  {/* Main Image */}
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

                  {/* Thumbnail Grid */}
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

                  {/* Proof Details */}
                  <View style={{ backgroundColor: '#F9FAFB', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                    <View style={{ marginBottom: 8 }}>
                      <Text style={{ fontSize: 10, color: '#6B7280' }}>Uploaded At</Text>
                      <Text style={{ fontSize: 12, fontWeight: '500' }}>
                        {selectedProofs[selectedProofIndex]?.uploaded_at 
                          ? formatDate(selectedProofs[selectedProofIndex].uploaded_at)
                          : 'N/A'}
                      </Text>
                    </View>
                    <View style={{ marginBottom: 8 }}>
                      <Text style={{ fontSize: 10, color: '#6B7280' }}>File Type</Text>
                      <Text style={{ fontSize: 12, fontWeight: '500' }}>{selectedProofs[selectedProofIndex]?.file_type || 'N/A'}</Text>
                    </View>
                    <View>
                      <Text style={{ fontSize: 10, color: '#6B7280' }}>File Name</Text>
                      <Text style={{ fontSize: 11, fontWeight: '500' }} numberOfLines={1}>
                        {selectedProofs[selectedProofIndex]?.file_name || 'N/A'}
                      </Text>
                    </View>
                  </View>

                  {/* Navigation Buttons */}
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