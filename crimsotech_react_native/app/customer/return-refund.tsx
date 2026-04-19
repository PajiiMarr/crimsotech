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

// Types
interface OrderItem {
  checkout_id: string;
  product_name: string;
  shop_name: string;
  quantity: number;
  price: string;
  subtotal: string;
  product_image?: string;
}

interface PaymentDetail {
  payment_id: string;
  payment_method: string;
  account_name: string;
  account_number: string;
  bank_name?: string;
  is_default: boolean;
}

interface MediaItem {
  refundmedia: string;
  file_url?: string;
  file_type: string;
  uploaded_at: string;
}

interface ReturnRequest {
  status: string;
  tracking_number?: string;
  shipped_at?: string;
  received_at?: string;
  notes?: string;
}

interface RefundItem {
  refund_id: string;
  reason: string;
  detailed_reason?: string;
  buyer_preferred_refund_method: string;
  refund_type: string;
  status: string;
  customer_note?: string;
  final_refund_method?: string;
  refund_payment_status: string;
  requested_at: string;
  processed_at?: string;
  order_id: string;
  order_info?: any;
  medias?: MediaItem[];
  dispute_request?: any;
  evidence?: any[];
  available_actions?: string[];
  return_request?: ReturnRequest;
  order_items?: OrderItem[];
  buyer_notified_at?: string;
  payment_detail?: PaymentDetail;
  [key: string]: any;
}

type RefundResponse = RefundItem[];

const STATUS_TABS = [
  { id: 'pending-request', label: 'Pending' },
  { id: 'to-process', label: 'To Process' },
  { id: 'disputes', label: 'Disputes' },
  { id: 'completed', label: 'Completed' },
];

const STATUS_CONFIG: Record<string, { label: string; bgColor: string; textColor: string }> = {
  pending: { label: 'Pending', bgColor: '#FEF3C7', textColor: '#92400E' },
  negotiation: { label: 'Negotiation', bgColor: '#DBEAFE', textColor: '#1E40AF' },
  approved: { label: 'Approved', bgColor: '#D1FAE5', textColor: '#065F46' },
  'approved-waiting': { label: 'Waiting for Return', bgColor: '#EFF6FF', textColor: '#3B82F6' },
  shipped: { label: 'Shipped', bgColor: '#DBEAFE', textColor: '#1E40AF' },
  received: { label: 'Received', bgColor: '#E9D5FF', textColor: '#6B21A8' },
  inspected: { label: 'Inspected', bgColor: '#C7D2FE', textColor: '#3730A3' },
  'return-accepted': { label: 'Return Accepted', bgColor: '#D1FAE5', textColor: '#065F46' },
  'return-rejected': { label: 'Return Rejected', bgColor: '#FEE2E2', textColor: '#991B1B' },
  dispute: { label: 'Dispute', bgColor: '#FEE2E2', textColor: '#991B1B' },
  processing: { label: 'Processing Refund', bgColor: '#F5F3FF', textColor: '#7C3AED' },
  completed: { label: 'Completed', bgColor: '#D1FAE5', textColor: '#065F46' },
  cancelled: { label: 'Cancelled', bgColor: '#F3F4F6', textColor: '#1F2937' },
  rejected: { label: 'Rejected', bgColor: '#FEE2E2', textColor: '#991B1B' },
  failed: { label: 'Failed', bgColor: '#FEE2E2', textColor: '#991B1B' },
};

export default function ReturnRefund() {
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState<string>((params.tab as string) || 'pending-request');
  const [expandedRefunds, setExpandedRefunds] = useState<Set<string>>(new Set());
  const [filteredRefunds, setFilteredRefunds] = useState<RefundItem[]>([]);
  const [refundData, setRefundData] = useState<RefundResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingRefund, setCancellingRefund] = useState<string | null>(null);

  const getRefundsForTab = (tabId: string): RefundItem[] => {
    if (!refundData) return [];
    const refunds = Array.isArray(refundData) ? refundData : [];
  
    switch (tabId) {
      case 'pending-request':
        return refunds.filter(refund =>
          String(refund.status).toLowerCase() === 'pending' &&
          String(refund.refund_payment_status).toLowerCase() === 'pending'
        );
      
      case 'to-process':
        return refunds.filter(refund => {
          const st = String(refund.status || '').toLowerCase();
          const rtype = String(refund.refund_type || '').toLowerCase();
          const rrStatus = (refund.return_request?.status || '').toLowerCase();
          const paymentStatus = String(refund.refund_payment_status || '').toLowerCase();
  
          // CRITICAL: If payment is completed, this should NOT be in to-process
          if (paymentStatus === 'completed') return false;
  
          // Negotiation status
          if (st === 'negotiation' && paymentStatus === 'pending') return true;
          
          // KEEP type refund: approved and payment pending
          if (rtype === 'keep' && st === 'approved' && paymentStatus === 'pending') return true;
          
          // REPLACE type refund: approved (needs to return item for replacement)
          if (rtype === 'replace' && st === 'approved') return true;
          
          // RETURN type refund: approved and waiting for buyer to ship
          if (rtype === 'return' && st === 'approved' && paymentStatus === 'pending' && (!rrStatus || !['shipped', 'received', 'inspected', 'approved'].includes(rrStatus))) return true;
          
          // RETURN type refund: shipped (waiting for seller to receive)
          if (rtype === 'return' && st === 'approved' && rrStatus === 'shipped') return true;
          
          // RETURN type refund: received (waiting for inspection)
          if (rtype === 'return' && st === 'approved' && rrStatus === 'received') return true;
          
          // RETURN type refund: inspected (waiting for seller to accept/reject)
          if (rtype === 'return' && st === 'approved' && rrStatus === 'inspected') return true;
          
          // RETURN type refund: approved (seller accepted, admin processing payment)
          if (rtype === 'return' && st === 'approved' && rrStatus === 'approved' && paymentStatus === 'processing') return true;
          
          // Any approved refund with processing payment status
          if (st === 'approved' && paymentStatus === 'processing') return true;
          
          // For 'return' type with 'approved' status
          if (rtype === 'return' && st === 'approved') return true;
          
          // For 'keep' type with 'approved' status
          if (rtype === 'keep' && st === 'approved') return true;
          
          // For 'replace' type with 'approved' status
          if (rtype === 'replace' && st === 'approved') return true;
          
          return false;
        });
      
      case 'disputes':
        return refunds.filter(refund => String(refund.status || '').toLowerCase() === 'dispute');
      
      case 'completed':
        return refunds.filter(refund => {
          const st = String(refund.status || '').toLowerCase();
          const paymentStatus = String(refund.refund_payment_status || '').toLowerCase();
          
          // CRITICAL: When status is 'approved' AND payment_status is 'completed', show in Completed tab
          if (st === 'approved' && paymentStatus === 'completed') return true;
          
          return paymentStatus === 'completed' ||
            ['rejected', 'cancelled', 'failed'].includes(st) ||
            (st === 'approved' && refund.return_request?.status === 'rejected');
        });
      
      default:
        return refunds;
    }
  };

  useEffect(() => {
    fetchRefundData();
  }, []);

  useEffect(() => {
    if (params.success && params.message) {
      setSuccessMessage(params.message as string);
      router.setParams({});
    }
  }, [params]);

  useEffect(() => {
    if (refundData) {
      const tabRefunds = getRefundsForTab(activeTab);
      setFilteredRefunds(tabRefunds);
    }
  }, [activeTab, refundData]);

  const fetchRefundData = async () => {
    try {
      setLoading(true);
      const response = await AxiosInstance.get('/return-refund/get_my_refunds/', {
        headers: { 'X-User-Id': user?.id || '' }
      });
      setRefundData(response.data);
    } catch (error: any) {
      console.error('Error fetching refunds:', error);
      Alert.alert('Error Loading Refunds', `Status: ${error.response?.status || 'Network Error'}`);
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
        month: 'short', day: 'numeric', year: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  const getStatusBadge = (refund: RefundItem) => {
    let statusKey = refund.status?.toLowerCase() || 'pending';
    const refundType = refund.refund_type?.toLowerCase();
    const returnStatus = refund.return_request?.status?.toLowerCase();
    const paymentStatus = refund.refund_payment_status?.toLowerCase();
  
    // CRITICAL: Check for completed payment first
    // If refund.status is 'approved' AND payment_status is 'completed', show Completed
    if (statusKey === 'approved' && paymentStatus === 'completed') {
      const config = STATUS_CONFIG.completed;
      return (
        <View style={[styles.statusBadge, { backgroundColor: config.bgColor }]}>
          <Text style={[styles.statusText, { color: config.textColor }]}>{config.label}</Text>
        </View>
      );
    }
  
    // For replace type with approved status
    if (refundType === 'replace' && statusKey === 'approved') {
      return (
        <View style={[styles.statusBadge, { backgroundColor: STATUS_CONFIG.approved.bgColor }]}>
          <Text style={[styles.statusText, { color: STATUS_CONFIG.approved.textColor }]}>Replacement - Approved</Text>
        </View>
      );
    }
    
    // For return type with approved status, show return status if available
    if (refundType === 'return' && statusKey === 'approved' && returnStatus) {
      const returnStatusMap: Record<string, string> = {
        'pending': 'Waiting for Shipment',
        'shipped': 'Shipped',
        'received': 'Received',
        'inspected': 'Inspected',
        'approved': 'Return Accepted',
        'completed': 'Completed',
        'rejected': 'Return Rejected'
      };
      const displayStatus = returnStatusMap[returnStatus] || returnStatus;
      const config = STATUS_CONFIG[displayStatus === 'Waiting for Shipment' ? 'approved-waiting' : 
                                  displayStatus === 'Shipped' ? 'shipped' :
                                  displayStatus === 'Received' ? 'received' :
                                  displayStatus === 'Inspected' ? 'inspected' :
                                  displayStatus === 'Return Accepted' ? 'return-accepted' :
                                  displayStatus === 'Return Rejected' ? 'return-rejected' : 'approved'];
      return (
        <View style={[styles.statusBadge, { backgroundColor: config.bgColor }]}>
          <Text style={[styles.statusText, { color: config.textColor }]}>{displayStatus}</Text>
        </View>
      );
    }
    
    // For negotiation status
    if (statusKey === 'negotiation') {
      const config = STATUS_CONFIG.negotiation;
      return (
        <View style={[styles.statusBadge, { backgroundColor: config.bgColor }]}>
          <Text style={[styles.statusText, { color: config.textColor }]}>{config.label}</Text>
        </View>
      );
    }
    
    // For dispute status
    if (statusKey === 'dispute') {
      const config = STATUS_CONFIG.dispute;
      return (
        <View style={[styles.statusBadge, { backgroundColor: config.bgColor }]}>
          <Text style={[styles.statusText, { color: config.textColor }]}>{config.label}</Text>
        </View>
      );
    }
    
    // For processing payment status
    if (statusKey === 'approved' && paymentStatus === 'processing') {
      const config = STATUS_CONFIG.processing;
      return (
        <View style={[styles.statusBadge, { backgroundColor: config.bgColor }]}>
          <Text style={[styles.statusText, { color: config.textColor }]}>{config.label}</Text>
        </View>
      );
    }
    
    // For completed
    if (statusKey === 'completed' || paymentStatus === 'completed') {
      const config = STATUS_CONFIG.completed;
      return (
        <View style={[styles.statusBadge, { backgroundColor: config.bgColor }]}>
          <Text style={[styles.statusText, { color: config.textColor }]}>{config.label}</Text>
        </View>
      );
    }
    
    const config = STATUS_CONFIG[statusKey] || STATUS_CONFIG.pending;
    return (
      <View style={[styles.statusBadge, { backgroundColor: config.bgColor }]}>
        <Text style={[styles.statusText, { color: config.textColor }]}>{config.label}</Text>
      </View>
    );
  };

  const getTabCount = (tabId: string) => {
    if (!refundData) return 0;
    return getRefundsForTab(tabId).length;
  };

  const toggleRefundExpansion = (refundId: string, e?: any) => {
    if (e) e.stopPropagation();
    const newExpanded = new Set(expandedRefunds);
    if (newExpanded.has(refundId)) newExpanded.delete(refundId);
    else newExpanded.add(refundId);
    setExpandedRefunds(newExpanded);
  };

  const handleViewDetails = (refundId: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(refundId)) {
      router.push({ pathname: '/customer/view-refund', params: { refundId } });
    } else {
      Alert.alert('Error', 'Invalid refund ID');
    }
  };

  const handleCancelRefund = async (refundId: string, e: any) => {
    e.stopPropagation();
    Alert.alert(
      'Cancel Refund Request',
      'Are you sure you want to cancel this refund request? This action cannot be undone.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setCancellingRefund(refundId);
            try {
              await AxiosInstance.post(`/return-refund/${refundId}/cancel_refund/`, {}, {
                headers: { 'X-User-Id': user?.id }
              });
              await fetchRefundData();
              Alert.alert('Success', 'Refund request cancelled successfully.');
            } catch (error: any) {
              console.error('Error cancelling refund:', error);
              Alert.alert('Error', error.response?.data?.error || 'Failed to cancel refund');
            } finally {
              setCancellingRefund(null);
            }
          }
        }
      ]
    );
  };

  // Helper to get image URL (falls back to placeholder)
  const getImageUrl = (url?: string): string => {
    if (!url) return 'https://via.placeholder.com/40';
    return url;
  };

  // Helper function to safely get order items
  const getOrderItems = (refund: RefundItem): OrderItem[] => {
    return refund.order_items || [];
  };

  // Helper function to safely get first order item
  const getFirstOrderItem = (refund: RefundItem): OrderItem | null => {
    const items = getOrderItems(refund);
    return items.length > 0 ? items[0] : null;
  };

  if (loading) {
    return (
      <RoleGuard allowedRoles={['customer']}>
        <CustomerLayout
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F97316" />
            <Text style={styles.loadingText}>Loading refunds...</Text>
          </View>
        </CustomerLayout>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={['customer']}>
      <CustomerLayout
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.container}>
          {/* Tabs */}
          <View style={styles.tabsWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabsContainer}
            >
              {STATUS_TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                const count = getTabCount(tab.id);
                return (
                  <TouchableOpacity
                    key={tab.id}
                    style={[styles.tab, isActive && styles.activeTab]}
                    onPress={() => setActiveTab(tab.id)}
                  >
                    <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>
                      {tab.label}
                    </Text>
                    {count > 0 && (
                      <View style={[styles.tabBadge, isActive && styles.activeTabBadge]}>
                        <Text style={[styles.tabBadgeText, isActive && styles.activeTabBadgeText]}>
                          {count}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Success Message */}
          {successMessage !== '' && (
            <View style={styles.successAlert}>
              <MaterialIcons name="check-circle" size={16} color="#166534" />
              <Text style={styles.successText}>{successMessage}</Text>
              <TouchableOpacity onPress={() => setSuccessMessage('')}>
                <MaterialIcons name="close" size={16} color="#166534" />
              </TouchableOpacity>
            </View>
          )}

          {/* Refunds List */}
          <ScrollView style={styles.refundsList} showsVerticalScrollIndicator={false}>
            {filteredRefunds.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="shopping-bag" size={48} color="#E5E7EB" />
                <Text style={styles.emptyTitle}>No refunds found</Text>
                <Text style={styles.emptyText}>
                  {activeTab === 'pending-request' ? 'No pending refund requests' :
                   activeTab === 'to-process' ? 'No refunds to process' :
                   activeTab === 'disputes' ? 'No disputes' : 'No completed refunds'}
                </Text>
              </View>
            ) : (
              filteredRefunds.map((refund) => {
                const isExpanded = expandedRefunds.has(refund.refund_id);
                const isPending = activeTab === 'pending-request';
                const firstItem = getFirstOrderItem(refund);
                const orderItems = getOrderItems(refund);
                const productCount = orderItems.length;
                const productImage = firstItem ? getImageUrl(firstItem.product_image) : 'https://via.placeholder.com/40';
                const productName = firstItem?.product_name || 'Product information not available';
                const productMeta = firstItem ? `Qty: ${firstItem.quantity} • ₱${parseFloat(firstItem.price).toFixed(2)}` : '';

                return (
                  <TouchableOpacity
                    key={refund.refund_id}
                    activeOpacity={0.85}
                    onPress={() => handleViewDetails(refund.refund_id)}
                  >
                    <View style={styles.refundCard}>
                      {/* Header */}
                      <View style={styles.cardHeader}>
                        <View style={styles.headerLeft}>
                          <View style={styles.refundIdContainer}>
                            <MaterialIcons name="assignment" size={16} color="#6B7280" />
                            <Text style={styles.refundId}>Refund #{refund.refund_id.slice(0, 8)}</Text>
                          </View>
                          <View style={styles.orderInfo}>
                            <Text style={styles.orderId}>Order #{refund.order_id.slice(0, 8)}</Text>
                            <Text style={styles.dot}>•</Text>
                            <Text style={styles.dateText}>{formatDate(refund.requested_at)}</Text>
                          </View>
                        </View>
                        <View style={styles.headerRight}>
                          {getStatusBadge(refund)}
                          <TouchableOpacity
                            onPress={(e) => toggleRefundExpansion(refund.refund_id, e)}
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
                        {firstItem ? (
                          productCount === 1 ? (
                            <View style={styles.singleProduct}>
                              <Image source={{ uri: productImage }} style={styles.productImage} />
                              <View style={styles.productDetails}>
                                <Text style={styles.productName} numberOfLines={1}>
                                  {productName}
                                </Text>
                                <Text style={styles.productMeta}>{productMeta}</Text>
                              </View>
                            </View>
                          ) : (
                            <View style={styles.multipleProducts}>
                              <View style={styles.imageStack}>
                                {orderItems.slice(0, 3).map((item, idx) => (
                                  <Image
                                    key={idx}
                                    source={{ uri: getImageUrl(item.product_image) }}
                                    style={[styles.stackImage, { marginLeft: idx > 0 ? -15 : 0 }]}
                                  />
                                ))}
                                {productCount > 3 && (
                                  <View style={[styles.moreBadge, { marginLeft: -15 }]}>
                                    <Text style={styles.moreText}>+{productCount - 3}</Text>
                                  </View>
                                )}
                              </View>
                              <Text style={styles.productCount}>{productCount} products</Text>
                            </View>
                          )
                        ) : (
                          <Text style={styles.noProductText}>Product information not available</Text>
                        )}
                      </View>

                      {/* Reason Preview */}
                      <View style={styles.reasonPreview}>
                        <MaterialIcons name="info-outline" size={14} color="#6B7280" />
                        <Text style={styles.reasonText} numberOfLines={1}>{refund.reason}</Text>
                      </View>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <View style={styles.expandedSection}>
                          <Text style={styles.expandedTitle}>Refund Details</Text>
                          <View style={styles.detailsGrid}>
                            <Text style={styles.detailItem}>Type: {refund.refund_type === 'return' ? 'Return Item' : refund.refund_type === 'replace' ? 'Replacement' : 'Keep Item'}</Text>
                            <Text style={styles.detailItem}>Method: {refund.buyer_preferred_refund_method || 'N/A'}</Text>
                            <Text style={styles.detailItem}>Payment Status: {refund.refund_payment_status}</Text>
                            {refund.return_request && (
                              <Text style={styles.detailItem}>Return Status: {refund.return_request.status}</Text>
                            )}
                            {refund.dispute_request && (
                              <Text style={styles.detailItem}>Dispute Status: {refund.dispute_request.status}</Text>
                            )}
                            {refund.payment_detail && (
                              <View style={styles.paymentDetailContainer}>
                                <Text style={styles.detailItem}>Payment Method:</Text>
                                <Text style={styles.detailItem}>
                                  {refund.payment_detail.payment_method === 'gcash' ? 'GCash' :
                                   refund.payment_detail.payment_method === 'paymaya' ? 'PayMaya' :
                                   refund.payment_detail.payment_method === 'bank' ? 'Bank Account' :
                                   refund.payment_detail.payment_method}
                                </Text>
                                <Text style={styles.detailItem}>Account: {refund.payment_detail.account_name}</Text>
                                <Text style={styles.detailItem}>
                                  Number: {refund.payment_detail.account_number.slice(-4).padStart(refund.payment_detail.account_number.length, '*')}
                                </Text>
                              </View>
                            )}
                            {/* Evidence images preview */}
                            {refund.medias && refund.medias.length > 0 && (
                              <View style={styles.evidenceContainer}>
                                <Text style={styles.detailItem}>Evidence:</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.evidenceScroll}>
                                  {refund.medias.map((media, idx) => (
                                    media.file_url && (
                                      <Image
                                        key={idx}
                                        source={{ uri: media.file_url }}
                                        style={styles.evidenceImage}
                                      />
                                    )
                                  ))}
                                </ScrollView>
                              </View>
                            )}
                          </View>
                        </View>
                      )}

                      {/* Footer - Cancel button only for pending tab */}
                      {isPending && (
                        <View style={styles.cardFooter}>
                          <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={(e) => handleCancelRefund(refund.refund_id, e)}
                            disabled={cancellingRefund === refund.refund_id}
                          >
                            {cancellingRefund === refund.refund_id ? (
                              <ActivityIndicator size="small" color="#EF4444" />
                            ) : (
                              <>
                                <MaterialIcons name="cancel" size={14} color="#EF4444" />
                                <Text style={styles.cancelButtonText}>Cancel Request</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
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
    paddingBottom: Platform.OS === 'ios' ? 74 : 64,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
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
  tabsContainer: {
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 110,
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
  successAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 8,
    padding: 12,
    margin: 16,
    gap: 8,
  },
  successText: {
    flex: 1,
    fontSize: 13,
    color: '#166534',
  },
  refundsList: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
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
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
      android: { elevation: 2 },
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
  reasonPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  reasonText: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
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
    marginBottom: 6,
  },
  detailsGrid: {
    gap: 4,
  },
  detailItem: {
    fontSize: 12,
    color: '#6B7280',
  },
  paymentDetailContainer: {
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 4,
  },
  evidenceContainer: {
    marginTop: 8,
  },
  evidenceScroll: {
    flexDirection: 'row',
    marginTop: 4,
  },
  evidenceImage: {
    width: 50,
    height: 50,
    borderRadius: 6,
    marginRight: 6,
    backgroundColor: '#F3F4F6',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    backgroundColor: 'transparent',
    gap: 6,
  },
  cancelButtonText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#EF4444',
  },
});