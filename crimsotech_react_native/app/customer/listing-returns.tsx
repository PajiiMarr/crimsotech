// app/customer/personal-return-refund.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Platform,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import RoleGuard from '../guards/RoleGuard';
import CustomerLayout from './CustomerLayout';
import { useAuth } from '../../contexts/AuthContext';
import AxiosInstance from '../../contexts/axios';

const { width } = Dimensions.get('window');

// Interface for return/refund/cancel items (SELLER view for personal listings)
interface ReturnItem {
  id: string;
  refund_id?: string;
  order_id: string;
  request_number?: string;
  buyer: {
    id: string;
    name: string;
    email?: string;
  };
  product: {
    id: string;
    name: string;
    price: number;
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
  final_refund_method?: string;
  refund_method?: string;
  refund_payment_status?: string | null;
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
  counter_requests?: Array<{
    id: string;
    status: string;
    counter_refund_method: string;
    counter_refund_type: string;
    counter_refund_amount?: number;
    notes?: string;
    requested_at: string;
  }>;
  buyer_suggested_method?: string;
  buyer_suggested_type?: string;
  buyer_suggested_amount?: number;
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

// Status tabs for seller view (personal listings) - 4 tabs as requested
const STATUS_TABS = [
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'disputes', label: 'Disputes' },
  { id: 'completed', label: 'Completed' },
];

// Status configuration
const STATUS_CONFIG = {
  pending: { label: 'Pending', bgColor: '#FEF3C7', textColor: '#92400E' },
  negotiation: { label: 'Negotiation', bgColor: '#DBEAFE', textColor: '#1E40AF' },
  approved: { label: 'Approved', bgColor: '#D1FAE5', textColor: '#065F46' },
  dispute: { label: 'Dispute', bgColor: '#FEE2E2', textColor: '#991B1B' },
  rejected: { label: 'Rejected', bgColor: '#FEE2E2', textColor: '#991B1B' },
  cancelled: { label: 'Cancelled', bgColor: '#F3F4F6', textColor: '#1F2937' },
  failed: { label: 'Failed', bgColor: '#FEE2E2', textColor: '#991B1B' },
};

// Type configuration
const TYPE_CONFIG = {
  return: { label: 'Return', bgColor: '#DBEAFE', textColor: '#1E40AF' },
  refund: { label: 'Refund', bgColor: '#D1FAE5', textColor: '#065F46' },
  cancellation: { label: 'Cancellation', bgColor: '#FEE2E2', textColor: '#991B1B' },
  failed_delivery: { label: 'Failed Delivery', bgColor: '#FEE2E2', textColor: '#991B1B' },
};

export default function PersonalReturnRefund() {
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState<string>((params.tab as string) || 'pending');
  const [expandedRefunds, setExpandedRefunds] = useState<Set<string>>(new Set());
  const [filteredRefunds, setFilteredRefunds] = useState<ReturnItem[]>([]);
  const [refundData, setRefundData] = useState<ReturnItem[]>([]);
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Get refunds for current tab
  const getRefundsForTab = (tabId: string): ReturnItem[] => {
    if (!refundData) return [];

    switch(tabId) {
      case 'pending':
        return refundData.filter(refund => 
          refund.status === 'pending' || refund.status === 'negotiation'
        );
      case 'approved':
        return refundData.filter(refund => refund.status === 'approved');
      case 'disputes':
        return refundData.filter(refund => 
          refund.status === 'dispute' || refund.dispute?.status === 'under_review'
        );
      case 'completed':
        return refundData.filter(refund => 
          refund.status === 'rejected' || 
          refund.status === 'cancelled' || 
          refund.status === 'failed'
        );
      default:
        return refundData;
    }
  };

  useEffect(() => {
    fetchRefundData();
  }, []);

  useEffect(() => {
    if (refundData.length > 0) {
      const tabRefunds = getRefundsForTab(activeTab);
      setFilteredRefunds(tabRefunds);
    }
  }, [activeTab, refundData]);

  const fetchRefundData = async () => {
    try {
      setLoading(true);
      
      const response = await AxiosInstance.get('/personal-refunds/get_personal_refunds/', {
        headers: {
          'X-User-Id': user?.id || ''
        }
      });
      
      const data = response.data;
      const items = Array.isArray(data) ? data : (data.results || data);
      
      setRefundData(items);
      
      // Calculate stats
      const newStats = {
        total_requests: items.length,
        pending: items.filter((i: ReturnItem) => i.status === 'pending').length,
        negotiation: items.filter((i: ReturnItem) => i.status === 'negotiation').length,
        approved: items.filter((i: ReturnItem) => i.status === 'approved').length,
        dispute: items.filter((i: ReturnItem) => i.status === 'dispute').length,
        rejected: items.filter((i: ReturnItem) => i.status === 'rejected').length,
        cancelled: items.filter((i: ReturnItem) => i.status === 'cancelled').length,
        failed: items.filter((i: ReturnItem) => i.status === 'failed').length,
        return_refund_requests: items.filter((i: ReturnItem) => i.type === 'return' || i.type === 'refund').length,
        cancellation_requests: items.filter((i: ReturnItem) => i.type === 'cancellation').length,
        failed_delivery_requests: items.filter((i: ReturnItem) => i.type === 'failed_delivery').length,
        under_review: items.filter((i: ReturnItem) => ['pending','negotiation'].includes(i.status)).length,
        returning: items.filter((i: ReturnItem) => i.status === 'approved' && i.refund_type === 'return').length,
        refunded: items.filter((i: ReturnItem) => i.status === 'approved').length,
        disputed: items.filter((i: ReturnItem) => i.status === 'dispute').length,
        rejected_cancelled: items.filter((i: ReturnItem) => ['rejected','cancelled','failed'].includes(i.status)).length,
      };
      
      setStats(newStats);
      
    } catch (error) {
      console.error('Error fetching refund data:', error);
      Alert.alert('Error', 'Failed to load refund requests');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchRefundData();
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ||
                   { label: status, bgColor: '#F3F4F6', textColor: '#1F2937' };

    return (
      <View style={[styles.statusBadge, { backgroundColor: config.bgColor }]}>
        <Text style={[styles.statusText, { color: config.textColor }]}>{config.label}</Text>
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
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(refundId)) {
      router.push({ 
        pathname: '/customer/return-refund', 
        params: { refundId, tab: activeTab } 
      });
    } else {
      console.error('Invalid refund_id:', refundId);
      Alert.alert('Error', 'Invalid refund ID');
    }
  };

  if (loading) {
    return (
      <RoleGuard allowedRoles={['customer']}>
        <CustomerLayout
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F97316" />
            <Text style={styles.loadingText}>Loading refund requests...</Text>
          </View>
        </CustomerLayout>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={['customer']}>
      <CustomerLayout
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.container}>
          {/* Non-absolute tabs - integrated into layout */}
          <View style={styles.tabsWrapper}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.tabsScrollView}
              contentContainerStyle={styles.tabsContainer}
            >
              {STATUS_TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                const count = getTabCount(tab.id);

                return (
                  <TouchableOpacity
                    key={tab.id}
                    style={[
                      styles.tab,
                      isActive && styles.activeTab
                    ]}
                    onPress={() => setActiveTab(tab.id)}
                  >
                    <Text style={[
                      styles.tabLabel,
                      isActive && styles.activeTabLabel
                    ]}>
                      {tab.label}
                    </Text>
                    {count > 0 && (
                      <View style={[
                        styles.tabBadge,
                        isActive && styles.activeTabBadge
                      ]}>
                        <Text style={[
                          styles.tabBadgeText,
                          isActive && styles.activeTabBadgeText
                        ]}>
                          {count}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Stats Cards - Directly below tabs with no gap */}
          <View style={styles.statsContainer}>
            <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
              <Text style={styles.statLabel}>Total</Text>
              <Text style={[styles.statValue, { color: '#92400E' }]}>{stats.total_requests}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#DBEAFE' }]}>
              <Text style={styles.statLabel}>Pending</Text>
              <Text style={[styles.statValue, { color: '#1E40AF' }]}>{stats.pending + stats.negotiation}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#D1FAE5' }]}>
              <Text style={styles.statLabel}>Approved</Text>
              <Text style={[styles.statValue, { color: '#065F46' }]}>{stats.approved}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#FEE2E2' }]}>
              <Text style={styles.statLabel}>Disputes</Text>
              <Text style={[styles.statValue, { color: '#991B1B' }]}>{stats.dispute}</Text>
            </View>
          </View>

          {/* Refunds List */}
          <ScrollView 
            style={styles.refundsList}
            showsVerticalScrollIndicator={false}
          >
            {filteredRefunds.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="shopping-bag" size={48} color="#E5E7EB" />
                <Text style={styles.emptyTitle}>No refund requests found</Text>
                <Text style={styles.emptyText}>
                  {activeTab === 'pending' ? 'No pending refund requests' :
                   activeTab === 'approved' ? 'No approved refunds' :
                   activeTab === 'disputes' ? 'No disputes' :
                   'No completed refunds'}
                </Text>
              </View>
            ) : (
              filteredRefunds.map((refund) => {
                const isExpanded = expandedRefunds.has(refund.id);

                return (
                  <View key={refund.id} style={styles.refundCard}>
                    {/* Header Section */}
                    <View style={styles.cardHeader}>
                      <View style={styles.headerLeft}>
                        <View style={styles.refundIdContainer}>
                          <MaterialIcons name="assignment" size={16} color="#6B7280" />
                          <Text style={styles.refundId}>
                            Refund #{refund.request_number || refund.id.slice(0, 8)}
                          </Text>
                        </View>
                        <View style={styles.orderInfo}>
                          <Text style={styles.orderId}>Order #{refund.order_id.slice(0, 8)}</Text>
                          <Text style={styles.dot}>•</Text>
                          <Text style={styles.dateText}>{formatDate(refund.created_at)}</Text>
                        </View>
                      </View>
                      <View style={styles.headerRight}>
                        {getStatusBadge(refund.status)}
                        <TouchableOpacity
                          onPress={() => toggleRefundExpansion(refund.id)}
                          style={styles.expandButton}
                        >
                          <MaterialIcons 
                            name={isExpanded ? 'expand-less' : 'expand-more'} 
                            size={20} 
                            color="#9CA3AF" 
                          />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Product Preview */}
                    <View style={styles.productPreview}>
                      {refund.order_items && refund.order_items.length > 0 ? (
                        refund.order_items.length === 1 ? (
                          <View style={styles.singleProduct}>
                            <Image
                              source={{ uri: refund.order_items[0].product?.image || "https://via.placeholder.com/40" }}
                              style={styles.productImage}
                            />
                            <View style={styles.productDetails}>
                              <Text style={styles.productName} numberOfLines={1}>
                                {refund.order_items[0].product?.name || 'Product'}
                              </Text>
                              <Text style={styles.productMeta}>
                                Qty: {refund.order_items[0].quantity} • ₱{refund.order_items[0].price}
                              </Text>
                            </View>
                          </View>
                        ) : (
                          <View style={styles.multipleProducts}>
                            <View style={styles.imageStack}>
                              {refund.order_items.slice(0, 3).map((item: any, index: number) => (
                                <Image
                                  key={index}
                                  source={{ uri: item.product?.image || "https://via.placeholder.com/40" }}
                                  style={[
                                    styles.stackImage,
                                    { marginLeft: index > 0 ? -15 : 0 }
                                  ]}
                                />
                              ))}
                              {refund.order_items.length > 3 && (
                                <View style={[styles.moreBadge, { marginLeft: -15 }]}>
                                  <Text style={styles.moreText}>+{refund.order_items.length - 3}</Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.productCount}>
                              {refund.order_items.length} items
                            </Text>
                          </View>
                        )
                      ) : (
                        <Text style={styles.noProductText}>Product information not available</Text>
                      )}
                    </View>

                    {/* Buyer Info */}
                    <View style={styles.buyerInfo}>
                      <MaterialIcons name="person" size={14} color="#6B7280" />
                      <Text style={styles.buyerName}>{refund.buyer?.name || 'Buyer'}</Text>
                    </View>

                    {/* Reason Preview */}
                    <View style={styles.reasonPreview}>
                      <MaterialIcons name="info-outline" size={14} color="#6B7280" />
                      <Text style={styles.reasonText} numberOfLines={1}>{refund.reason}</Text>
                    </View>

                    {/* Amount */}
                    <View style={styles.amountContainer}>
                      <Text style={styles.amountLabel}>Amount:</Text>
                      <Text style={styles.amountValue}>₱{refund.refund_amount || refund.amount}</Text>
                      {refund.refund_type && (
                        <Text style={styles.typeText}>
                          • {refund.refund_type === 'return' ? 'Return' : 'Keep Item'}
                        </Text>
                      )}
                    </View>

                    {/* Return Status */}
                    {refund.return_request && refund.return_request.status && (
                      <View style={styles.returnStatus}>
                        <MaterialIcons name="local-shipping" size={14} color="#2563EB" />
                        <Text style={styles.returnStatusText}>
                          Return: {refund.return_request.status.replace('_', ' ')}
                        </Text>
                      </View>
                    )}

                    {/* Expanded Details */}
                    {isExpanded && (
                      <View style={styles.expandedSection}>
                        <Text style={styles.expandedTitle}>Refund Details</Text>
                        
                        {/* Products List */}
                        {refund.order_items && refund.order_items.length > 0 && (
                          <View style={styles.expandedProducts}>
                            {refund.order_items.map((item: any, index: number) => (
                              <View key={index} style={styles.expandedProductItem}>
                                <Image
                                  source={{ uri: item.product?.image || "https://via.placeholder.com/48" }}
                                  style={styles.expandedProductImage}
                                />
                                <View style={styles.expandedProductDetails}>
                                  <Text style={styles.expandedProductName} numberOfLines={2}>
                                    {item.product?.name || 'Product'}
                                  </Text>
                                  <Text style={styles.expandedProductMeta}>
                                    Qty: {item.quantity} • ₱{item.price} each
                                  </Text>
                                </View>
                                <Text style={styles.expandedProductPrice}>
                                  ₱{item.amount || item.price}
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}

                        {/* Details Grid */}
                        <View style={styles.detailsGrid}>
                          <Text style={styles.detailItem}>Refund ID: {refund.id.slice(0, 8)}</Text>
                          <Text style={styles.detailItem}>Order ID: {refund.order_id.slice(0, 8)}</Text>
                          <Text style={styles.detailItem}>Request Date: {formatDate(refund.created_at)}</Text>
                          <Text style={styles.detailItem}>Last Updated: {formatDate(refund.updated_at)}</Text>
                          <Text style={styles.detailItem}>Preferred Method: {refund.preferred_refund_method || 'N/A'}</Text>
                          <Text style={styles.detailItem}>Payment Status: {refund.refund_payment_status || 'pending'}</Text>
                          {refund.final_refund_method && (
                            <Text style={styles.detailItem}>Final Method: {refund.final_refund_method}</Text>
                          )}
                        </View>

                        {/* Buyer Suggestion */}
                        {refund.status === 'negotiation' && refund.buyer_suggested_amount && (
                          <View style={styles.suggestionBox}>
                            <Text style={styles.suggestionTitle}>Buyer Suggested:</Text>
                            <Text style={styles.suggestionText}>
                              ₱{refund.buyer_suggested_amount} 
                              {refund.buyer_suggested_type && ` (${refund.buyer_suggested_type === 'return' ? 'Return' : 'Keep'})`}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Footer Actions */}
                    <View style={styles.cardFooter}>
                      <TouchableOpacity
                        style={styles.viewButton}
                        onPress={() => handleViewDetails(refund.id)}
                      >
                        <MaterialIcons name="visibility" size={14} color="#F97316" />
                        <Text style={styles.viewButtonText}>View Details</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </CustomerLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingBottom: Platform.OS === 'ios' ? 74 : 64
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666'
  },
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  tabsWrapper: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tabsScrollView: {
    height: 52,
  },
  tabsContainer: {
    paddingHorizontal: 12,
    paddingVertical: 0,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    minHeight: 52,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 100,
    paddingHorizontal: 8,
    paddingVertical: 6,
    paddingRight: 12,
    borderRadius: 0,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    justifyContent: 'center',
    height: 36,
    position: 'relative',
  },
  activeTab: {
    backgroundColor: 'transparent',
    borderBottomWidth: 3,
    borderBottomColor: '#F97316',
    borderRadius: 0,
    paddingBottom: 6,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    flexShrink: 0,
    textAlign: 'center',
    includeFontPadding: false,
  },
  activeTabLabel: {
    color: '#111827',
    fontWeight: '700',
  },
  tabBadge: {
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    height: 20,
    minWidth: 22,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    right: 8,
    top: 6,
  },
  activeTabBadge: {
    backgroundColor: '#FFFFFF',
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTabBadgeText: {
    color: '#F97316',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  statCard: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  refundsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  refundCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  refundIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  refundId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  orderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orderId: {
    fontSize: 12,
    color: '#6B7280',
  },
  dot: {
    fontSize: 12,
    color: '#6B7280',
  },
  dateText: {
    fontSize: 12,
    color: '#6B7280',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  expandButton: {
    padding: 4,
  },
  productPreview: {
    marginBottom: 8,
  },
  singleProduct: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  productImage: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
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
  productMeta: {
    fontSize: 11,
    color: '#6B7280',
  },
  multipleProducts: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  imageStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stackImage: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    backgroundColor: '#F3F4F6',
  },
  moreBadge: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#D1D5DB',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4B5563',
  },
  productCount: {
    fontSize: 13,
    color: '#4B5563',
  },
  noProductText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  buyerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  buyerName: {
    fontSize: 12,
    color: '#6B7280',
  },
  reasonPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  reasonText: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  amountLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  amountValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  typeText: {
    fontSize: 12,
    color: '#6B7280',
  },
  returnStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  returnStatusText: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '500',
  },
  expandedSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  expandedTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  expandedProducts: {
    marginBottom: 12,
  },
  expandedProductItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  expandedProductImage: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    marginRight: 12,
  },
  expandedProductDetails: {
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
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  detailsGrid: {
    gap: 4,
  },
  detailItem: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 16,
  },
  suggestionBox: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#DBEAFE',
    borderRadius: 6,
  },
  suggestionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 2,
  },
  suggestionText: {
    fontSize: 11,
    color: '#1E40AF',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FED7AA',
    backgroundColor: 'transparent',
    gap: 6,
  },
  viewButtonText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#F97316',
  },
});