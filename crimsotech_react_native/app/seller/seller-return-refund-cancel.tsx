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
  Modal,
  Alert,
  FlatList,
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
  const [expandedRefunds, setExpandedRefunds] = useState<Set<string>>(new Set());
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

    // Based on your Django view, the response structure is:
    // {
    //   "shops": [{"id": "...", "name": "..."}],
    //   "results": [...]  // This is the refunds array
    // }
    
    let serverList = [];
    
    if (response.data && response.data.results) {
      // Structure from your Django view
      serverList = response.data.results;
      console.log('Found results array with length:', serverList.length);
    } else if (Array.isArray(response.data)) {
      serverList = response.data;
    } else {
      console.log('Unexpected response structure:', response.data);
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
          case 'rejected': return [];
          case 'cancelled': return [];
          case 'failed': return [];
          default: return [];
        }
      })(r.status)
    }));

    console.log('Processed return items:', returnItems.length);
    setRefundData(returnItems);

    // Calculate stats
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

  // Get refunds for current tab based on exact logic from web
  const getRefundsForTab = (tabId: string): ReturnItem[] => {
    if (!refundData) return [];

    switch(tabId) {
      case 'all':
        return refundData;

      case 'new':
        // New Requests: status='pending' AND refund_payment_status='pending'
        return refundData.filter(refund =>
          refund.status === 'pending' &&
          refund.refund_payment_status === 'pending'
        );

      case 'to-process':
        // To Process tab - include refunds that require seller action or are in-progress
        return refundData.filter(refund => {
          const st = refund.status;
          const rtype = refund.refund_type || '';
          const rrStatus = refund.return_request?.status || '';
          const paymentStatus = refund.refund_payment_status || '';

          // Exclude final states
          if (['completed', 'rejected', 'cancelled', 'failed'].includes(st)) return false;

          // Negotiations awaiting buyer response
          if (st === 'negotiation' && paymentStatus === 'pending') return true;

          // Awaiting Shipment: approved returns waiting for buyer to ship
          if (rtype === 'return' && st === 'approved' && paymentStatus === 'pending' && (!rrStatus || !['shipped', 'received'].includes(rrStatus))) return true;

          // In Transit (shipped by buyer)
          if (rtype === 'return' && st === 'approved' && rrStatus === 'shipped') return true;

          // Received (need inspection)
          if (rtype === 'return' && st === 'approved' && rrStatus === 'received') return true;

          // Inspection complete (seller decision needed)
          if (rtype === 'return' && st === 'approved' && rrStatus === 'inspected') return true;

          // Ready to Process Payment
          if (st === 'approved' && (
            (rtype === 'keep' && paymentStatus === 'processing') ||
            (rtype === 'return' && paymentStatus === 'processing' && rrStatus === 'approved')
          )) return true;

          return false;
        });

      case 'disputes':
        return refundData.filter(refund => 
          refund.status === 'dispute' || 
          refund.dispute?.status === 'under_review'
        );

      case 'completed':
        // Completed: payment_status='completed' OR status IN ('rejected', 'cancelled', 'failed')
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

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    return (
      <View style={[styles.statusBadge, { backgroundColor: config.bgColor }]}>
        <Ionicons name={config.icon} size={10} color={config.color} />
        <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
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

  const toggleRefundExpansion = (refundId: string) => {
    const newExpanded = new Set(expandedRefunds);
    if (newExpanded.has(refundId)) {
      newExpanded.delete(refundId);
    } else {
      newExpanded.add(refundId);
    }
    setExpandedRefunds(newExpanded);
  };

  const handleViewDetails = (refundId: string) => {
    router.push(`/seller/view-refund-details?refundId=${refundId}&shopId=${shopId}&tab=${activeTab}`);
  };

  const getActionIcon = (refund: ReturnItem) => {
    switch(refund.status) {
      case 'pending':
      case 'negotiation':
        return { name: 'eye-outline', color: '#3b82f6' };
      case 'approved':
        return { name: 'checkmark-circle-outline', color: '#10b981' };
      case 'dispute':
        return { name: 'warning-outline', color: '#8b5cf6' };
      case 'rejected':
      case 'cancelled':
      case 'failed':
        return { name: 'document-text-outline', color: '#6b7280' };
      default:
        return { name: 'eye-outline', color: '#6b7280' };
    }
  };

  const getActionButtons = (refund: ReturnItem) => {
    const actionIcon = getActionIcon(refund);
    
    return (
      <TouchableOpacity
        style={[styles.actionIconButton, { backgroundColor: `${actionIcon.color}10` }]}
        onPress={() => handleViewDetails(refund.id)}
      >
        <Ionicons name={actionIcon.name as any} size={14} color={actionIcon.color} />
      </TouchableOpacity>
    );
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

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={18} color="#94A3B8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search refunds..."
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

          {/* Status Tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
            <View style={styles.tabsContainer}>
              {STATUS_TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                const count = getTabCount(tab.id);

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

          {/* Stats Cards */}
          <View style={styles.statsGrid}>
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
                const isExpanded = expandedRefunds.has(refund.id);

                return (
                  <View key={refund.id} style={styles.refundCard}>
                    {/* Top Section - Header */}
                    <View style={styles.cardHeader}>
                      <View style={styles.cardHeaderLeft}>
                        <View style={styles.refundIdContainer}>
                          <Ionicons name="cube-outline" size={14} color="#64748B" />
                          <Text style={styles.refundId}>Refund #{refund.id.slice(0, 8)}</Text>
                        </View>
                        <View style={styles.refundMeta}>
                          <Text style={styles.orderId}>Order: {refund.order_id.slice(0, 8)}</Text>
                          <Text style={styles.metaDot}>•</Text>
                          <Text style={styles.refundDate}>{formatDate(refund.created_at)}</Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={() => toggleRefundExpansion(refund.id)}
                        style={styles.expandButton}
                      >
                        {getStatusBadge(refund.status)}
                        <Ionicons 
                          name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                          size={18} 
                          color="#94A3B8" 
                        />
                      </TouchableOpacity>
                    </View>

                    {/* Product Info */}
                    <View style={styles.productInfo}>
                      {refund.order_items && refund.order_items.length > 0 ? (
                        <View style={styles.productImages}>
                          {refund.order_items.slice(0, 3).map((item: any, index: number) => (
                            <View key={index} style={styles.productImageWrapper}>
                              {item.product?.image ? (
                                <Image 
                                  source={{ uri: item.product.image }} 
                                  style={styles.productThumb}
                                />
                              ) : (
                                <View style={[styles.productThumb, styles.productThumbPlaceholder]}>
                                  <Ionicons name="cube-outline" size={12} color="#CBD5E1" />
                                </View>
                              )}
                            </View>
                          ))}
                          {refund.order_items.length > 3 && (
                            <View style={styles.moreProductsBadge}>
                              <Text style={styles.moreProductsText}>+{refund.order_items.length - 3}</Text>
                            </View>
                          )}
                        </View>
                      ) : (
                        <View style={styles.productImageWrapper}>
                          <View style={[styles.productThumb, styles.productThumbPlaceholder]}>
                            <Ionicons name="cube-outline" size={16} color="#CBD5E1" />
                          </View>
                        </View>
                      )}
                      <View style={styles.productDetails}>
                        <Text style={styles.productName} numberOfLines={1}>
                          {refund.order_items?.[0]?.product?.name || refund.product?.name || 'Product'}
                        </Text>
                        <View style={styles.productTypeRow}>
                          {getTypeBadge(refund.type)}
                          <Text style={styles.productQuantity}>Qty: {refund.quantity}</Text>
                        </View>
                      </View>
                    </View>

                    {/* Reason */}
                    <View style={styles.reasonContainer}>
                      <Ionicons name="chatbubble-outline" size={12} color="#64748B" />
                      <Text style={styles.reasonText} numberOfLines={1}>{refund.reason}</Text>
                    </View>

                    {/* Payment Status */}
                    {refund.refund_payment_status && (
                      <View style={styles.paymentStatus}>
                        <Text style={styles.paymentStatusLabel}>Payment Status:</Text>
                        <Text style={styles.paymentStatusValue}>{refund.refund_payment_status}</Text>
                      </View>
                    )}

                    {/* Expanded Section - Details */}
                    {isExpanded && (
                      <View style={styles.expandedDetails}>
                        <View style={styles.divider} />
                        
                        <Text style={styles.expandedTitle}>Products Being Refunded</Text>
                        {refund.order_items?.map((item: any, index: number) => (
                          <View key={index} style={styles.expandedProductItem}>
                            <View style={styles.expandedProductImage}>
                              {item.product?.image ? (
                                <Image source={{ uri: item.product.image }} style={styles.expandedProductThumb} />
                              ) : (
                                <View style={[styles.expandedProductThumb, styles.placeholderThumb]}>
                                  <Ionicons name="cube-outline" size={16} color="#CBD5E1" />
                                </View>
                              )}
                            </View>
                            <View style={styles.expandedProductInfo}>
                              <Text style={styles.expandedProductName} numberOfLines={1}>{item.product?.name}</Text>
                              <Text style={styles.expandedProductMeta}>
                                {item.product?.shop?.name || 'Shop'} • Qty: {item.quantity}
                              </Text>
                            </View>
                            <View style={styles.expandedProductPrice}>
                              <Text style={styles.priceAmount}>₱{item.amount || item.price}</Text>
                              <Text style={styles.priceEach}>₱{item.price} each</Text>
                            </View>
                          </View>
                        ))}

                        <Text style={styles.expandedTitle}>Refund Details</Text>
                        <View style={styles.detailsGrid}>
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Refund ID:</Text>
                            <Text style={styles.detailValue}>{refund.id}</Text>
                          </View>
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Order ID:</Text>
                            <Text style={styles.detailValue}>{refund.order_id}</Text>
                          </View>
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Amount:</Text>
                            <Text style={styles.detailValue}>₱{refund.refund_amount || refund.amount || 'N/A'}</Text>
                          </View>
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Request Date:</Text>
                            <Text style={styles.detailValue}>{formatDate(refund.created_at)}</Text>
                          </View>
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Refund Type:</Text>
                            <Text style={styles.detailValue}>{refund.type}</Text>
                          </View>
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Method:</Text>
                            <Text style={styles.detailValue}>{refund.refund_type === 'return' ? 'Return Item' : 'Keep Item'}</Text>
                          </View>
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Preferred Method:</Text>
                            <Text style={styles.detailValue}>{refund.preferred_refund_method || 'N/A'}</Text>
                          </View>
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Payment Status:</Text>
                            <Text style={styles.detailValue}>{refund.refund_payment_status || 'pending'}</Text>
                          </View>
                          {refund.return_request && (
                            <View style={styles.detailRow}>
                              <Text style={styles.detailLabel}>Return Status:</Text>
                              <Text style={styles.detailValue}>{refund.return_request.status}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    )}

                    {/* Bottom Section - Actions */}
                    <View style={styles.cardFooter}>
                      <TouchableOpacity
                        style={styles.viewDetailsButton}
                        onPress={() => handleViewDetails(refund.id)}
                      >
                        <Ionicons name="eye-outline" size={14} color="#3b82f6" />
                        <Text style={styles.viewDetailsText}>View Details</Text>
                      </TouchableOpacity>

                      <View style={styles.actionButtons}>
                        {getActionButtons(refund)}
                      </View>
                    </View>
                  </View>
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
    fontSize: 14,
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '18%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 9,
    color: '#6B7280',
    textAlign: 'center',
  },
  listContainer: {
    gap: 12,
  },
  refundCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
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
  },
  refundIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  refundId: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  refundMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  orderId: {
    fontSize: 11,
    color: '#6B7280',
  },
  metaDot: {
    fontSize: 11,
    color: '#6B7280',
  },
  refundDate: {
    fontSize: 11,
    color: '#6B7280',
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
  productImages: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productImageWrapper: {
    marginRight: -4,
  },
  productThumb: {
    width: 32,
    height: 32,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  productThumbPlaceholder: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreProductsBadge: {
    width: 32,
    height: 32,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -8,
  },
  moreProductsText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4B5563',
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
    marginBottom: 4,
  },
  reasonText: {
    flex: 1,
    fontSize: 11,
    color: '#4B5563',
  },
  paymentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  paymentStatusLabel: {
    fontSize: 10,
    color: '#6B7280',
  },
  paymentStatusValue: {
    fontSize: 10,
    fontWeight: '500',
    color: '#3b82f6',
  },
  expandedDetails: {
    marginTop: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginBottom: 12,
  },
  expandedTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  expandedProductItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 8,
  },
  expandedProductImage: {
    width: 40,
    height: 40,
    borderRadius: 6,
    overflow: 'hidden',
  },
  expandedProductThumb: {
    width: 40,
    height: 40,
  },
  placeholderThumb: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandedProductInfo: {
    flex: 1,
  },
  expandedProductName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  expandedProductMeta: {
    fontSize: 10,
    color: '#6B7280',
  },
  expandedProductPrice: {
    alignItems: 'flex-end',
  },
  priceAmount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  priceEach: {
    fontSize: 9,
    color: '#9CA3AF',
  },
  detailsGrid: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 10,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 10,
    fontWeight: '500',
    color: '#111827',
    flex: 1,
    textAlign: 'right',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  viewDetailsText: {
    fontSize: 11,
    color: '#3b82f6',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  actionIconButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
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