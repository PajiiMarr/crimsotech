// app/customer/return-refund.tsx
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

// Types for refund data
interface OrderItem {
  checkout_id: string;
  product_name: string;
  shop_name: string;
  quantity: number;
  price: string;
  subtotal: string;
  product_image?: string;
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
  medias?: any[];
  dispute_request?: any;
  evidence?: any[];
  available_actions?: string[];
  return_request?: {
    status: string;
  };
  order_items?: OrderItem[];
  buyer_notified_at?: string;
  [key: string]: any;
}

type RefundResponse = RefundItem[];

// EXACT 4 tabs as requested
const STATUS_TABS = [
  { id: 'pending-request', label: 'Pending' },
  { id: 'to-process', label: 'To Process' },
  { id: 'disputes', label: 'Disputes' },
  { id: 'completed', label: 'Completed' },
];

// Status configuration for badges
const STATUS_CONFIG: Record<string, { label: string; bgColor: string; textColor: string }> = {
  pending: { label: 'Pending', bgColor: '#FEF3C7', textColor: '#92400E' },
  negotiation: { label: 'Negotiation', bgColor: '#DBEAFE', textColor: '#1E40AF' },
  approved: { label: 'Approved', bgColor: '#D1FAE5', textColor: '#065F46' },
  to_ship: { label: 'To Ship', bgColor: '#FED7AA', textColor: '#9A3412' },
  shipped: { label: 'Shipped', bgColor: '#DBEAFE', textColor: '#1E40AF' },
  received: { label: 'Received', bgColor: '#E9D5FF', textColor: '#6B21A8' },
  inspected: { label: 'Inspected', bgColor: '#C7D2FE', textColor: '#3730A3' },
  dispute: { label: 'Dispute', bgColor: '#FEE2E2', textColor: '#991B1B' },
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

  // Get refunds for current tab
  const getRefundsForTab = (tabId: string): RefundItem[] => {
    if (!refundData) return [];

    const refunds = Array.isArray(refundData) ? refundData : [];

    switch(tabId) {
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

          if (st === 'negotiation' && paymentStatus === 'pending') return true;
          if (rtype === 'return' && st === 'approved' && paymentStatus === 'pending' && (!rrStatus || !['shipped','received'].includes(rrStatus))) return true;
          if (rtype === 'return' && st === 'approved' && rrStatus === 'shipped') return true;
          if (rtype === 'return' && st === 'approved' && rrStatus === 'received') return true;
          if (rtype === 'return' && st === 'approved' && rrStatus === 'inspected') return true;
          if (st === 'approved' && (
            (rtype === 'keep' && paymentStatus === 'processing') ||
            (rtype === 'return' && paymentStatus === 'processing' && rrStatus === 'approved')
          )) return true;

          return false;
        });

      case 'disputes':
        return refunds.filter(refund => {
          const st = String(refund.status || '').toLowerCase();
          return st === 'dispute';
        });

      case 'completed':
        return refunds.filter(refund => {
          const st = String(refund.status || '').toLowerCase();
          const paymentStatus = String(refund.refund_payment_status || '').toLowerCase();
          
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

  // Handle success message from navigation state
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
        headers: {
          'X-User-Id': user?.id || ''
        }
      });
      
      setRefundData(response.data);
      
    } catch (error: any) {
      console.error('Error fetching refunds:', error);
      
      Alert.alert(
        'Error Loading Refunds',
        `Status: ${error.response?.status || 'Network Error'}\nPlease check your connection and try again.`
      );
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

  const getStatusBadge = (refund: RefundItem) => {
    let status = refund.status;
    if (refund.return_request?.status) {
      status = refund.return_request.status;
    }
    
    const config = STATUS_CONFIG[status] || 
                  { label: status, bgColor: '#F3F4F6', textColor: '#1F2937' };

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
            <Text style={styles.loadingText}>Loading refunds...</Text>
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
          {/* Status Tabs - EXACT same style as purchases page */}
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
          <ScrollView 
            style={styles.refundsList}
            showsVerticalScrollIndicator={false}
          >
            {filteredRefunds.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="shopping-bag" size={48} color="#E5E7EB" />
                <Text style={styles.emptyTitle}>No refunds found</Text>
                <Text style={styles.emptyText}>
                  {activeTab === 'pending-request' ? 'No pending refund requests' :
                   activeTab === 'to-process' ? 'No refunds to process' :
                   activeTab === 'disputes' ? 'No disputes' :
                   'No completed refunds'}
                </Text>
              </View>
            ) : (
              filteredRefunds.map((refund) => {
                const isExpanded = expandedRefunds.has(refund.refund_id);

                return (
                  <View key={refund.refund_id} style={styles.refundCard}>
                    {/* Header Section - Like purchases */}
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
                          onPress={() => toggleRefundExpansion(refund.refund_id)}
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

                    {/* Product Preview - Like purchases */}
                    <View style={styles.productPreview}>
                      {refund.order_items && refund.order_items.length > 0 ? (
                        refund.order_items.length === 1 ? (
                          <View style={styles.singleProduct}>
                            <Image
                              source={{ uri: refund.order_items[0].product_image || "https://via.placeholder.com/40" }}
                              style={styles.productImage}
                            />
                            <View style={styles.productDetails}>
                              <Text style={styles.productName} numberOfLines={1}>
                                {refund.order_items[0].product_name}
                              </Text>
                              <Text style={styles.productMeta}>
                                Qty: {refund.order_items[0].quantity} • ₱{parseFloat(refund.order_items[0].price).toFixed(2)}
                              </Text>
                            </View>
                          </View>
                        ) : (
                          <View style={styles.multipleProducts}>
                            <View style={styles.imageStack}>
                              {refund.order_items.slice(0, 3).map((item: any, index: number) => (
                                <Image
                                  key={index}
                                  source={{ uri: item.product_image || "https://via.placeholder.com/40" }}
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
                              {refund.order_items.length} products
                            </Text>
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
                          <Text style={styles.detailItem}>Type: {refund.refund_type === 'return' ? 'Return Item' : 'Keep Item'}</Text>
                          <Text style={styles.detailItem}>Method: {refund.buyer_preferred_refund_method || 'N/A'}</Text>
                          <Text style={styles.detailItem}>Payment Status: {refund.refund_payment_status}</Text>
                          {refund.return_request && (
                            <Text style={styles.detailItem}>Return Status: {refund.return_request.status}</Text>
                          )}
                          {refund.dispute_request && (
                            <Text style={styles.detailItem}>Dispute Status: {refund.dispute_request.status}</Text>
                          )}
                        </View>
                      </View>
                    )}

                    {/* Footer Actions */}
                    <View style={styles.cardFooter}>
                      <TouchableOpacity
                        style={styles.viewButton}
                        onPress={() => handleViewDetails(refund.refund_id)}
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
    paddingTop: 52,
  },
  tabsScrollView: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    height: 52,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
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
    marginTop: 60,
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
    paddingTop: 60,
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