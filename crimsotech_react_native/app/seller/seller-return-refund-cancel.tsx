// app/seller/refunds.tsx
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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import AxiosInstance from '../../contexts/axios';
import { SafeAreaView } from 'react-native-safe-area-context';

// Interface for return/refund/cancel items
interface ReturnItem {
  id: string;
  order_id: string;
  request_number?: string;
  product: {
    id: string;
    name: string;
    price: number;
    shop: {
      id: string;
      name: string;
    };
    image?: string;
  };
  quantity: number;
  amount: number;
  type: 'return' | 'refund' | 'cancellation' | 'failed_delivery';
  refund_type?: 'return' | 'keep';
  status: 'pending' | 'approved' | 'negotiation' | 'rejected' | 'dispute' | 'cancelled' | 'failed';
  reason: string;
  description?: string;
  created_at: string;
  updated_at: string;
  refund_amount?: number;
  preferred_refund_method?: string;
  refund_method?: string;
  tracking_number?: string;
  dispute_reason?: string;
  resolution?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  estimated_refund_date?: string;
  actual_refund_date?: string;
  pickup_scheduled_date?: string;
  courier?: string;
  notes?: string;
  seller_response?: string;
  available_actions?: string[];
  order_items?: any[];
  evidence?: any[];
  delivery?: any;
  seller_offer?: any;
  detailed?: boolean;
  buyer_notified_at?: string | null;
  refund_payment_status?: string | null;
  return_request?: {
    status: 'waiting_shipment' | 'shipped' | 'received' | 'inspected' | 'approved' | 'completed' | 'problem' | 'rejected';
    tracking_number?: string;
    shipped_at?: string;
    received_at?: string;
    notes?: string;
  };
  dispute?: {
    status: 'pending' | 'under_review' | 'resolved';
    reason?: string;
    resolution?: string;
  };
}

interface ReturnStats {
  total_requests: number;
  pending: number;
  negotiation: number;
  approved: number;
  dispute: number;
  rejected: number;
  cancelled: number;
  failed: number;
  return_refund_requests: number;
  cancellation_requests: number;
  failed_delivery_requests: number;
  under_review: number;
  returning: number;
  refunded: number;
  disputed: number;
  rejected_cancelled: number;
}

// Status configuration
const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: keyof typeof Ionicons.glyphMap }> = {
  pending: { label: 'Pending Review', color: '#f59e0b', bgColor: '#fffbeb', icon: 'time-outline' },
  negotiation: { label: 'Negotiation', color: '#3b82f6', bgColor: '#eff6ff', icon: 'chatbubble-outline' },
  approved: { label: 'Approved', color: '#10b981', bgColor: '#ecfdf5', icon: 'checkmark-circle-outline' },
  dispute: { label: 'Dispute', color: '#8b5cf6', bgColor: '#f5f3ff', icon: 'warning-outline' },
  rejected: { label: 'Rejected', color: '#ef4444', bgColor: '#fef2f2', icon: 'close-circle-outline' },
  cancelled: { label: 'Cancelled', color: '#6b7280', bgColor: '#f9fafb', icon: 'close-outline' },
  failed: { label: 'Failed', color: '#dc2626', bgColor: '#fef2f2', icon: 'alert-circle-outline' }
};

// Type configuration
const TYPE_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: keyof typeof Ionicons.glyphMap }> = {
  return: { label: 'Return', color: '#3b82f6', bgColor: '#eff6ff', icon: 'refresh-outline' },
  refund: { label: 'Refund', color: '#10b981', bgColor: '#ecfdf5', icon: 'cash-outline' },
  cancellation: { label: 'Cancellation', color: '#ef4444', bgColor: '#fef2f2', icon: 'close-outline' },
  failed_delivery: { label: 'Failed Delivery', color: '#dc2626', bgColor: '#fef2f2', icon: 'car-outline' }
};

// ========== STATUS HELPER FUNCTIONS ==========
const getDisplayStatus = (refund: ReturnItem) => {
  if (!refund) return '';
  const status = refund.status?.toLowerCase();
  const refundType = refund.refund_type;
  
  if (status === 'approved' && refundType === 'return') {
    return 'Approved - Waiting for return';
  }
  
  return STATUS_CONFIG[status]?.label || (refund.status || 'pending').replace('_', ' ').toUpperCase();
};

const getStatusColor = (refund: ReturnItem) => {
  if (!refund) return '#9CA3AF';
  const status = refund.status?.toLowerCase();
  const refundType = refund.refund_type;
  
  if (status === 'approved' && refundType === 'return') {
    return '#3B82F6';
  }
  
  return STATUS_CONFIG[status]?.color || '#9CA3AF';
};

const getStatusBgColor = (refund: ReturnItem) => {
  if (!refund) return '#f9fafb';
  const status = refund.status?.toLowerCase();
  const refundType = refund.refund_type;
  
  if (status === 'approved' && refundType === 'return') {
    return '#EFF6FF';
  }
  
  return STATUS_CONFIG[status]?.bgColor || '#f9fafb';
};

const getStatusIcon = (refund: ReturnItem): keyof typeof Ionicons.glyphMap => {
  if (!refund) return 'time-outline';
  const status = refund.status?.toLowerCase();
  const refundType = refund.refund_type;
  
  if (status === 'approved' && refundType === 'return') {
    return 'time-outline';
  }
  
  return STATUS_CONFIG[status]?.icon || 'time-outline';
};

// Tabs
const STATUS_TABS = [
  { id: 'all', label: 'All Requests', icon: 'list-outline' },
  { id: 'new', label: 'New Requests', icon: 'time-outline' },
  { id: 'to-process', label: 'To Process', icon: 'refresh-outline' },
  { id: 'disputes', label: 'Disputes', icon: 'warning-outline' },
  { id: 'completed', label: 'Completed', icon: 'checkmark-done-outline' },
];

export default function Refunds() {
  const router = useRouter();
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  const { userId } = useAuth();
  
  const [refundData, setRefundData] = useState<ReturnItem[]>([]);
  const [filteredRefunds, setFilteredRefunds] = useState<ReturnItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');
  const [stats, setStats] = useState<ReturnStats>({
    total_requests: 0,
    pending: 0,
    negotiation: 0,
    approved: 0,
    dispute: 0,
    rejected: 0,
    cancelled: 0,
    failed: 0,
    return_refund_requests: 0,
    cancellation_requests: 0,
    failed_delivery_requests: 0,
    under_review: 0,
    returning: 0,
    refunded: 0,
    disputed: 0,
    rejected_cancelled: 0,
  });
  
  const [successMessage, setSuccessMessage] = useState<string>('');

  useEffect(() => {
    if (shopId && userId) {
      fetchRefundData();
    }
  }, [shopId, userId]);

  useEffect(() => {
    filterRefunds();
  }, [searchQuery, activeTab, refundData]);

  const fetchRefundData = async () => {
    if (!userId || !shopId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      console.log('Fetching refund data for seller:', { userId, shopId });
      
      const response = await AxiosInstance.get('/return-refund/get_shop_refunds/', {
        headers: {
          'X-User-Id': userId,
          'X-Shop-Id': shopId,
          'Accept': 'application/json'
        },
        params: { shop_id: shopId }
      });

      console.log('Refund API Response:', response.data);

      let serverList = [];
      
      if (response.data && response.data.results) {
        serverList = response.data.results;
      } else if (Array.isArray(response.data)) {
        serverList = response.data;
      } else {
        serverList = [];
      }

      const returnItems: ReturnItem[] = serverList.map((r: any) => ({
        id: r.refund_id || r.refund || r.id,
        order_id: r.order_id || r.order_info?.order_id || r.order?.order || '',
        buyer_notified_at: r.buyer_notified_at || null,
        product: {
          id: r.order_items?.[0]?.product_id || r.order_items?.[0]?.product?.id || 'unknown',
          name: r.order_items?.[0]?.product_name || r.order_items?.[0]?.product?.name || r.order_items?.[0]?.name || 'Product',
          price: Number(r.order_items?.[0]?.price) || Number(r.amount) || 0,
          shop: r.shop || r.order_items?.[0]?.shop || { id: shopId, name: '' },
          image: r.order_items?.[0]?.product_image || ''
        },
        quantity: r.order_items?.[0]?.quantity || 1,
        amount: Number(r.amount) || Number(r.order_items?.[0]?.total) || 0,
        type: r.refund_type === 'return' ? 'return' : 'refund',
        refund_type: r.refund_type || 'keep',
        status: r.status || 'pending',
        reason: r.reason || '',
        description: r.customer_note || r.detailed_reason || '',
        created_at: r.requested_at || '',
        updated_at: r.updated_at || r.requested_at || '',
        refund_amount: r.amount ? Number(r.amount) : undefined,
        refund_method: r.final_refund_method || r.buyer_preferred_refund_method || undefined,
        refund_payment_status: r.refund_payment_status || 'pending',
        tracking_number: r.return_request?.tracking_number || undefined,
        dispute_reason: r.dispute?.reason || undefined,
        resolution: r.dispute?.resolution || undefined,
        reviewed_by: r.processed_by?.username || undefined,
        reviewed_at: r.processed_at || undefined,
        courier: r.return_request?.logistic_service || undefined,
        notes: r.customer_note || r.notes || '',
        order_items: r.order_items || [],
        return_request: r.return_request ? {
          status: r.return_request.status,
          tracking_number: r.return_request.tracking_number,
          shipped_at: r.return_request.shipped_at,
          received_at: r.return_request.received_at,
          notes: r.return_request.notes
        } : undefined,
        dispute: r.dispute ? {
          status: r.dispute.status,
          reason: r.dispute.reason,
          resolution: r.dispute.resolution
        } : undefined,
        available_actions: (function(status){
          switch(status){
            case 'pending': return ['approve','reject','propose_negotiation'];
            case 'negotiation': return ['propose_negotiation','contact_customer'];
            case 'approved': return ['schedule_pickup','process_refund'];
            case 'dispute': return ['contact_customer','resolve_dispute'];
            default: return [];
          }
        })(r.status)
      }));

      setRefundData(returnItems);

      const newStats = {
        total_requests: returnItems.length,
        pending: returnItems.filter(i => i.status === 'pending').length,
        negotiation: returnItems.filter(i => i.status === 'negotiation').length,
        approved: returnItems.filter(i => i.status === 'approved').length,
        dispute: returnItems.filter(i => i.status === 'dispute').length,
        rejected: returnItems.filter(i => i.status === 'rejected').length,
        cancelled: returnItems.filter(i => i.status === 'cancelled').length,
        failed: returnItems.filter(i => i.status === 'failed').length,
        return_refund_requests: returnItems.filter(i => i.type === 'return' || i.type === 'refund').length,
        cancellation_requests: returnItems.filter(i => i.type === 'cancellation').length,
        failed_delivery_requests: returnItems.filter(i => i.type === 'failed_delivery').length,
        under_review: returnItems.filter(i => ['pending', 'negotiation'].includes(i.status)).length,
        returning: returnItems.filter(i => i.status === 'approved').length,
        refunded: returnItems.filter(i => i.status === 'approved').length,
        disputed: returnItems.filter(i => i.status === 'dispute').length,
        rejected_cancelled: returnItems.filter(i => ['rejected', 'cancelled', 'failed'].includes(i.status)).length,
      };

      setStats(newStats);

    } catch (error) {
      console.error('Error fetching refund data:', error);
      Alert.alert('Error', 'Failed to load refund requests');
      setRefundData([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchRefundData();
  };

  const getRefundsForTab = (tabId: string): ReturnItem[] => {
    if (!refundData) return [];

    switch(tabId) {
      case 'all':
        return refundData;
      case 'new':
        return refundData.filter(refund =>
          refund.status === 'pending' &&
          refund.refund_payment_status === 'pending'
        );
      case 'to-process':
        return refundData.filter(refund => {
          const st = refund.status;
          const rtype = refund.refund_type || '';
          const rrStatus = refund.return_request?.status || '';
          const paymentStatus = refund.refund_payment_status || '';

          if (['completed', 'rejected', 'cancelled', 'failed'].includes(st)) return false;
          if (st === 'negotiation') return true;
          if (rtype === 'return' && st === 'approved' && paymentStatus === 'pending' && (!rrStatus || !['shipped', 'received'].includes(rrStatus))) return true;
          if (rtype === 'return' && st === 'approved' && rrStatus === 'shipped') return true;
          if (rtype === 'return' && st === 'approved' && rrStatus === 'received') return true;
          if (rtype === 'return' && st === 'approved' && rrStatus === 'inspected') return true;
          if (st === 'approved' && ((rtype === 'keep' && paymentStatus === 'processing') || (rtype === 'return' && paymentStatus === 'processing' && rrStatus === 'approved'))) return true;
          return false;
        });
      case 'disputes':
        return refundData.filter(refund => 
          refund.status === 'dispute' || 
          refund.dispute?.status === 'under_review'
        );
      case 'completed':
        return refundData.filter(refund => 
          refund.refund_payment_status === 'completed' ||
          ['rejected', 'cancelled', 'failed'].includes(refund.status) ||
          (refund.status === 'approved' && refund.return_request?.status === 'rejected')
        );
      default:
        return refundData;
    }
  };

  const filterRefunds = () => {
    const tabRefunds = getRefundsForTab(activeTab);
    let filtered = tabRefunds;

    if (searchQuery) {
      filtered = filtered.filter((refund: ReturnItem) =>
        refund.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
        refund.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        refund.order_id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredRefunds(filtered);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  };

  const getStatusBadge = (refund: ReturnItem) => {
    const displayStatus = getDisplayStatus(refund);
    const statusColor = getStatusColor(refund);
    const statusBgColor = getStatusBgColor(refund);
    const statusIcon = getStatusIcon(refund);
    
    return (
      <View style={[styles.statusBadge, { backgroundColor: statusBgColor }]}>
        <Ionicons name={statusIcon} size={10} color={statusColor} />
        <Text style={[styles.statusText, { color: statusColor }]}>{displayStatus}</Text>
      </View>
    );
  };

  const getTypeBadge = (type: string) => {
    const config = TYPE_CONFIG[type] || TYPE_CONFIG.refund;
    return (
      <View style={[styles.typeBadge, { backgroundColor: config.bgColor }]}>
        <Ionicons name={config.icon} size={10} color={config.color} />
        <Text style={[styles.typeText, { color: config.color }]}>{config.label}</Text>
      </View>
    );
  };

  const getTabCount = (tabId: string): number => {
    return getRefundsForTab(tabId).length;
  };

  const getProductImageUrl = (refund: ReturnItem): string => {
    if (refund.order_items?.[0]?.product_image) return refund.order_items[0].product_image;
    if (refund.product?.image) return refund.product.image;
    return 'https://via.placeholder.com/40';
  };

  const getBorderColor = (refund: ReturnItem): string => {
    const statusColor = getStatusColor(refund);
    return statusColor;
  };

  const handleCardPress = (refundId: string) => {
    router.push(`/seller/view-refund-details?refundId=${refundId}&shopId=${shopId}&tab=${activeTab}`);
  };

  const counts = {
    all: refundData.length,
    new: getRefundsForTab('new').length,
    'to-process': getRefundsForTab('to-process').length,
    disputes: getRefundsForTab('disputes').length,
    completed: getRefundsForTab('completed').length,
  };

  if (!shopId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Ionicons name="refresh-circle-outline" size={64} color="#E2E8F0" />
          <Text style={styles.noShopTitle}>No Shop Selected</Text>
          <Text style={styles.noShopText}>Select a shop to view refund requests</Text>
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
          <Text style={styles.loadingText}>Loading refund requests...</Text>
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
              <Text style={styles.title}>Returns & Cancellations</Text>
              <Text style={styles.subtitle}>Manage your refund requests and returns</Text>
            </View>
          </View>

          {/* Success Message */}
          {successMessage ? (
            <View style={styles.successContainer}>
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              <Text style={styles.successText}>{successMessage}</Text>
              <TouchableOpacity onPress={() => setSuccessMessage('')}>
                <Ionicons name="close" size={16} color="#10b981" />
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Stats Cards */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.total_requests}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: '#f59e0b' }]}>{stats.pending}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: '#3b82f6' }]}>{stats.negotiation}</Text>
                <Text style={styles.statLabel}>Negotiation</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: '#10b981' }]}>{stats.approved}</Text>
                <Text style={styles.statLabel}>Approved</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: '#8b5cf6' }]}>{stats.dispute}</Text>
                <Text style={styles.statLabel}>Dispute</Text>
              </View>
            </View>
          </ScrollView>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={18} color="#94A3B8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search refunds by ID or reason..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
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
                    style={[styles.tabButton, isActive && styles.tabButtonActive]}
                    onPress={() => setActiveTab(tab.id)}
                  >
                    <Ionicons name={tab.icon as any} size={14} color={isActive ? '#3b82f6' : '#64748B'} />
                    <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                      {tab.label}
                    </Text>
                    {count > 0 && (
                      <View style={[styles.tabBadge, isActive && styles.tabBadgeActive]}>
                        <Text style={[styles.tabBadgeText, isActive && styles.tabBadgeTextActive]}>{count}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Refunds List */}
          <View style={styles.listContainer}>
            {filteredRefunds.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="refresh-circle-outline" size={48} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>No requests found</Text>
                <Text style={styles.emptyText}>
                  {activeTab === 'all' ? 'No refund requests found' :
                   activeTab === 'new' ? 'No new refund requests' :
                   activeTab === 'to-process' ? 'No refunds ready to process' :
                   activeTab === 'completed' ? 'No completed, rejected, or cancelled refunds' :
                   'No refunds found'}
                </Text>
              </View>
            ) : (
              filteredRefunds.map((refund) => {
                const borderColor = getBorderColor(refund);
                const primaryItem = refund.order_items?.[0];
                const productName = primaryItem?.product_name || refund.product?.name || 'Product';
                const productImage = getProductImageUrl(refund);
                const itemCount = refund.order_items?.length || 1;

                return (
                  <TouchableOpacity
                    key={refund.id}
                    style={[styles.refundCard, { borderLeftColor: borderColor, borderLeftWidth: 4 }]}
                    onPress={() => handleCardPress(refund.id)}
                    activeOpacity={0.7}
                  >
                    {/* Header */}
                    <View style={styles.cardHeader}>
                      <View style={styles.cardHeaderLeft}>
                        <View style={styles.refundIdContainer}>
                          <Ionicons name="cube-outline" size={14} color="#64748B" />
                          <Text style={styles.refundId} numberOfLines={1}>
                            {productName}
                            {itemCount > 1 && ` +${itemCount - 1} more`}
                          </Text>
                        </View>
                        <View style={styles.refundMeta}>
                          <Text style={styles.orderId}>Refund #{refund.id.slice(0, 8)}</Text>
                          <Text style={styles.metaDot}>•</Text>
                          <Text style={styles.refundDate}>{formatDate(refund.created_at)}</Text>
                        </View>
                      </View>
                      {getStatusBadge(refund)}
                    </View>

                    {/* Product Info */}
                    <View style={styles.productInfo}>
                      <View style={styles.productImageWrapper}>
                        <Image source={{ uri: productImage }} style={styles.productThumb} />
                      </View>
                      <View style={styles.productDetails}>
                        <Text style={styles.productName} numberOfLines={1}>
                          {productName}
                        </Text>
                        <View style={styles.productTypeRow}>
                          {getTypeBadge(refund.type)}
                          <Text style={styles.productQuantity}>Qty: {refund.quantity}</Text>
                        </View>
                      </View>
                    </View>

                    {/* Reason */}
                    <View style={styles.reasonContainer}>
                      <Ionicons name="chatbubble-outline" size={10} color="#64748B" />
                      <Text style={styles.reasonText} numberOfLines={1}>{refund.reason}</Text>
                    </View>

                    {/* Payment Status and Amount */}
                    <View style={styles.paymentRow}>
                      <Text style={styles.paymentStatus}>
                        Payment: {refund.refund_payment_status || 'pending'}
                      </Text>
                      <Text style={styles.totalAmount}>{formatCurrency(refund.amount || 0)}</Text>
                    </View>

                    {/* Footer with chevron */}
                    <View style={styles.cardFooter}>
                      <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>
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
    marginBottom: 16,
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
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  successText: {
    flex: 1,
    fontSize: 13,
    color: '#166534',
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
  refundCard: {
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardHeaderLeft: {
    flex: 1,
    marginRight: 8,
  },
  refundIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  refundId: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  refundMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  orderId: {
    fontSize: 10,
    color: '#6B7280',
  },
  metaDot: {
    fontSize: 10,
    color: '#6B7280',
  },
  refundDate: {
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
  productInfo: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 8,
  },
  productImageWrapper: {
    width: 40,
    height: 40,
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  productThumb: {
    width: 40,
    height: 40,
  },
  productDetails: {
    flex: 1,
  },
  productName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  productTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 8,
    gap: 2,
  },
  typeText: {
    fontSize: 8,
    fontWeight: '500',
  },
  productQuantity: {
    fontSize: 9,
    color: '#6B7280',
  },
  reasonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  reasonText: {
    flex: 1,
    fontSize: 10,
    color: '#4B5563',
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentStatus: {
    fontSize: 10,
    color: '#6B7280',
  },
  totalAmount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
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
});