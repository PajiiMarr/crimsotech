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
  TextInput,
  Image,
  Alert,
  Dimensions
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';

import RoleGuard from '../guards/RoleGuard';
import CustomerLayout from './CustomerLayout';
import { useAuth } from '../../contexts/AuthContext';
import AxiosInstance from '../../contexts/axios';

const { width } = Dimensions.get('window');

// Types for refund data - EXACTLY copied from web version
interface OrderItem {
  checkout_id: string;
  product_name: string;
  shop_name: string;
  quantity: number;
  price: string;
  subtotal: string;
  product_image?: string;
}

interface OrderInfo {
  order_id: string;
  total_amount: string;
  items: OrderItem[];
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
  [key: string]: any; // For additional fields
}

type RefundResponse = RefundItem[];

// EXACT TABS from web version - 4 tabs as requested
const STATUS_TABS = [
  { id: 'pending-request', label: 'Pending Request', icon: 'access-time' },
  { id: 'to-process', label: 'To Process', icon: 'refresh' },
  { id: 'disputes', label: 'Disputes', icon: 'warning' },
  { id: 'completed', label: 'Completed', icon: 'check-circle' },
];

// Status configuration for badges - EXACT colors mapped to mobile
const STATUS_CONFIG: Record<string, { label: string; bgColor: string; icon: keyof typeof MaterialIcons.glyphMap; textColor: string }> = {
  pending: { label: 'Pending', bgColor: '#FEF3C7', icon: 'access-time', textColor: '#92400E' },
  negotiation: { label: 'Negotiation', bgColor: '#DBEAFE', icon: 'message', textColor: '#1E40AF' },
  approved: { label: 'Approved', bgColor: '#D1FAE5', icon: 'check-circle', textColor: '#065F46' },
  to_ship: { label: 'To Ship', bgColor: '#FED7AA', icon: 'local-shipping', textColor: '#9A3412' },
  shipped: { label: 'Shipped', bgColor: '#DBEAFE', icon: 'local-shipping', textColor: '#1E40AF' },
  received: { label: 'Received', bgColor: '#E9D5FF', icon: 'inventory', textColor: '#6B21A8' },
  inspected: { label: 'Inspected', bgColor: '#C7D2FE', icon: 'visibility', textColor: '#3730A3' },
  dispute: { label: 'Dispute', bgColor: '#FEE2E2', icon: 'warning', textColor: '#991B1B' },
  completed: { label: 'Completed', bgColor: '#D1FAE5', icon: 'check-circle', textColor: '#065F46' },
  cancelled: { label: 'Cancelled', bgColor: '#F3F4F6', icon: 'cancel', textColor: '#1F2937' },
  rejected: { label: 'Rejected', bgColor: '#FEE2E2', icon: 'cancel', textColor: '#991B1B' },
  failed: { label: 'Failed', bgColor: '#FEE2E2', icon: 'error', textColor: '#991B1B' },
};

export default function ReturnRefund() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState<string>((params.tab as string) || 'pending-request');
  const [expandedRefunds, setExpandedRefunds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [filteredRefunds, setFilteredRefunds] = useState<RefundItem[]>([]);
  const [refundData, setRefundData] = useState<RefundResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);

  // EXACT getRefundsForTab logic copied from web version
  const getRefundsForTab = (tabId: string): RefundItem[] => {
    if (!refundData) return [];

    // refundData is an array of refunds from get_my_refunds API
    const refunds = Array.isArray(refundData) ? refundData : [];

    switch(tabId) {
      case 'pending-request':
        // Pending Request: New refund requests pending seller review
        return refunds.filter(refund =>
          String(refund.status).toLowerCase() === 'pending' &&
          String(refund.refund_payment_status).toLowerCase() === 'pending'
        );

      case 'to-process':
        // To Process tab - buyer-side items they need to act on or track
        return refunds.filter(refund => {
          const st = String(refund.status || '').toLowerCase();
          const rtype = String(refund.refund_type || '').toLowerCase();
          const rrStatus = (refund.return_request?.status || '').toLowerCase();
          const paymentStatus = String(refund.refund_payment_status || '').toLowerCase();

          // Negotiations awaiting buyer response
          if (st === 'negotiation' && paymentStatus === 'pending') return true;

          // Awaiting Shipment: approved returns waiting for buyer to ship
          if (rtype === 'return' && st === 'approved' && paymentStatus === 'pending' && (!rrStatus || !['shipped','received'].includes(rrStatus))) return true;

          // In Transit (shipped by buyer)
          if (rtype === 'return' && st === 'approved' && rrStatus === 'shipped') return true;

          // Received (need inspection)
          if (rtype === 'return' && st === 'approved' && rrStatus === 'received') return true;

          // Inspection Complete (decision)
          if (rtype === 'return' && st === 'approved' && rrStatus === 'inspected') return true;

          // Ready to Process Payment
          if (st === 'approved' && (
            (rtype === 'keep' && paymentStatus === 'processing') ||
            (rtype === 'return' && paymentStatus === 'processing' && rrStatus === 'approved')
          )) return true;

          return false;
        });

      case 'disputes':
        // Disputes tab - only disputes
        return refunds.filter(refund => {
          const st = String(refund.status || '').toLowerCase();
          return st === 'dispute';
        });

      case 'completed':
        // Completed: Includes completed, rejected, cancelled, failed
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
      // Clear params to prevent showing again
      router.setParams({});
    }
  }, [params]);

  useEffect(() => {
    if (refundData) {
      const tabRefunds = getRefundsForTab(activeTab);
      let filtered = tabRefunds;

      if (search) {
        filtered = filtered.filter((refund: RefundItem) =>
          refund.reason.toLowerCase().includes(search.toLowerCase()) ||
          refund.refund_id.toLowerCase().includes(search.toLowerCase()) ||
          refund.order_id.toLowerCase().includes(search.toLowerCase())
        );
      }

      setFilteredRefunds(filtered);
    }
  }, [search, activeTab, refundData]);

  // EXACT fetchRefundData from web version
 const fetchRefundData = async () => {
  try {
    setLoading(true);
    
    // Log the full URL being called
    console.log('BaseURL:', AxiosInstance.defaults.baseURL);
    console.log('Full URL:', `${AxiosInstance.defaults.baseURL}return-refund/get_my_refunds/`);
    
    const response = await AxiosInstance.get('return-refund/get_my_refunds/', {
      headers: {
        'X-User-Id': user?.id || ''
      }
    });
    
    console.log('Success:', response.data);
    setRefundData(response.data);
    
  } catch (error: any) {
    console.error('Error details:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data?.substring?.(0, 200) + '...', // First 200 chars of HTML
      message: error.message
    });
    
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

  // EXACT formatDate from web
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

  // EXACT getStatusBadge logic adapted for mobile
  const getStatusBadge = (refund: RefundItem) => {
    // If there's a return request status, use that for more specific status
    let status = refund.status;
    if (refund.return_request?.status) {
      status = refund.return_request.status;
    }
    
    const config = STATUS_CONFIG[status] || 
                  { label: status, bgColor: '#F3F4F6', icon: 'access-time', textColor: '#1F2937' };

    return (
      <View style={[styles.statusBadge, { backgroundColor: config.bgColor }]}>
        <MaterialIcons name={config.icon} size={10} color={config.textColor} />
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

  // EXACT getActionButtons logic adapted for mobile
  const getActionIcon = (refund: RefundItem) => {
    const returnStatus = refund.return_request?.status;
    
    if (returnStatus === 'shipped' || returnStatus === 'received' || returnStatus === 'inspected') {
      return { name: 'local-shipping', color: '#2563EB', bgColor: '#EFF6FF' };
    }
    
    // Show ship action when buyer has been notified and hasn't created a return_request yet
    if (refund.refund_type === 'return' && refund.status === 'approved' && refund.buyer_notified_at && !refund.return_request) {
      return { name: 'local-shipping', color: '#EA580C', bgColor: '#FFF7ED' };
    }
    
    switch(refund.status) {
      case 'pending':
      case 'negotiation':
        return { name: 'visibility', color: '#2563EB', bgColor: '#EFF6FF' };
      case 'approved':
        return { name: 'check-circle', color: '#16A34A', bgColor: '#F0FDF4' };
      case 'dispute':
        return { name: 'warning', color: '#DC2626', bgColor: '#FEF2F2' };
      case 'rejected':
      case 'cancelled':
      case 'failed':
        return { name: 'description', color: '#4B5563', bgColor: '#F9FAFB' };
      default:
        return { name: 'visibility', color: '#2563EB', bgColor: '#EFF6FF' };
    }
  };

  const handleViewDetails = (refundId: string) => {
    // Validate that refund_id is a valid UUID - EXACT from web
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
            <ActivityIndicator size="large" color="#EE4D2D" />
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
        <ScrollView 
          style={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {/* Header - EXACT from web */}
          <View style={styles.header}>
            <Text style={styles.title}>Returns & Cancellations</Text>
            <Text style={styles.subtitle}>Manage your refund requests and returns</Text>
          </View>

          {/* Success Message - EXACT from web */}
          {successMessage !== '' && (
            <View style={styles.successAlert}>
              <MaterialIcons name="check-circle" size={16} color="#166534" />
              <Text style={styles.successText}>{successMessage}</Text>
              <TouchableOpacity onPress={() => setSuccessMessage('')}>
                <MaterialIcons name="close" size={16} color="#166534" />
              </TouchableOpacity>
            </View>
          )}

          {/* Search Bar - EXACT from web */}
          <View style={styles.searchContainer}>
            <MaterialIcons name="search" size={16} color="#9CA3AF" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search refunds..."
              value={search}
              onChangeText={setSearch}
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Status Tabs - EXACT 4 tabs as requested, styled like image */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.tabsScrollView}
            contentContainerStyle={styles.tabsContainer}
          >
            {STATUS_TABS.map((tab) => {
              const count = getTabCount(tab.id);
              const isActive = activeTab === tab.id;

              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[
                    styles.tab,
                    isActive && styles.activeTab
                  ]}
                  onPress={() => setActiveTab(tab.id)}
                >
                  <MaterialIcons 
                    name={tab.icon as keyof typeof MaterialIcons.glyphMap} 
                    size={14} 
                    color={isActive ? '#2563EB' : '#6B7280'} 
                  />
                  <Text style={[
                    styles.tabLabel,
                    isActive && styles.activeTabLabel
                  ]}>
                    {tab.label}
                  </Text>
                  {count > 0 && (
                    <View style={[
                      styles.tabCount,
                      isActive && styles.activeTabCount
                    ]}>
                      <Text style={[
                        styles.tabCountText,
                        isActive && styles.activeTabCountText
                      ]}>
                        {count}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Refunds List - EXACT structure from web */}
          <View style={styles.refundsList}>
            {filteredRefunds.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="shopping-bag" size={48} color="#D1D5DB" />
                <Text style={styles.emptyStateText}>
                  {activeTab === 'pending-request' ? 'No pending refund requests found' :
                   activeTab === 'to-process' ? 'No refunds require your action' :
                   activeTab === 'disputes' ? 'No disputes found' :
                   activeTab === 'completed' ? 'No completed, rejected, or cancelled refunds' :
                   'No refunds found'}
                </Text>
              </View>
            ) : (
              filteredRefunds.map((refund) => {
                const isExpanded = expandedRefunds.has(refund.refund_id);
                const actionIcon = getActionIcon(refund);

                return (
                  <View key={refund.refund_id} style={styles.refundCard}>
                    {/* Top Section - Header */}
                    <View style={styles.cardHeader}>
                      <View style={styles.headerLeft}>
                        <View style={styles.refundIdContainer}>
                          <MaterialIcons name="inventory" size={14} color="#6B7280" />
                          <Text style={styles.refundId}>Refund #{refund.refund_id.slice(0, 8)}</Text>
                        </View>
                        <View style={styles.productInfo}>
                          {refund.order_items && refund.order_items.length > 0 ? (
                            refund.order_items.length === 1 ? (
                              <View style={styles.singleProduct}>
                                <Image
                                  source={{ uri: refund.order_items[0].product_image || "https://via.placeholder.com/24" }}
                                  style={styles.productImage}
                                />
                                <Text style={styles.productName} numberOfLines={1}>
                                  {refund.order_items[0].product_name}
                                </Text>
                              </View>
                            ) : (
                              <View style={styles.multipleProducts}>
                                <View style={styles.imageStack}>
                                  {refund.order_items.slice(0, 3).map((item: any, index: number) => (
                                    <Image
                                      key={index}
                                      source={{ uri: item.product_image || "https://via.placeholder.com/24" }}
                                      style={[
                                        styles.stackImage,
                                        { marginLeft: index > 0 ? -12 : 0 }
                                      ]}
                                    />
                                  ))}
                                  {refund.order_items.length > 3 && (
                                    <View style={[styles.moreBadge, { marginLeft: -12 }]}>
                                      <Text style={styles.moreText}>+{refund.order_items.length - 3}</Text>
                                    </View>
                                  )}
                                </View>
                                <Text style={styles.productCount} numberOfLines={1}>
                                  {refund.order_items.length} product{refund.order_items.length > 1 ? 's' : ''} for refund
                                </Text>
                              </View>
                            )
                          ) : (
                            <Text style={styles.productName}>Product information not available</Text>
                          )}
                        </View>
                        <View style={styles.orderInfo}>
                          <Text style={styles.orderText}>Order: {refund.order_id.slice(0, 8)}</Text>
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
                            size={16} 
                            color="#9CA3AF" 
                          />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Middle Section - Summary */}
                    <View style={styles.summarySection}>
                      <View style={styles.reasonContainer}>
                        <MaterialIcons name="refresh" size={12} color="#4B5563" />
                        <Text style={styles.reasonText} numberOfLines={1}>{refund.reason}</Text>
                      </View>
                      <Text style={styles.typeText} numberOfLines={1}>
                        Type: {refund.refund_type === 'return' ? 'Return Item' : 'Keep Item'} • 
                        Method: {refund.buyer_preferred_refund_method || 'N/A'}
                      </Text>
                      {refund.refund_payment_status && (
                        <Text style={styles.paymentStatus} numberOfLines={1}>
                          Payment Status: {refund.refund_payment_status}
                        </Text>
                      )}
                    </View>

                    {/* Expanded Section - Details - EXACT from web */}
                    {isExpanded && (
                      <View style={styles.expandedSection}>
                        <Text style={styles.sectionTitle}>Products Being Refunded</Text>
                        <View style={styles.productsList}>
                          {refund.order_items?.map((item: any, index: number) => (
                            <View key={index} style={styles.productItem}>
                              <Image
                                source={{ uri: item.product_image || "https://via.placeholder.com/48" }}
                                style={styles.detailProductImage}
                              />
                              <View style={styles.productDetails}>
                                <Text style={styles.detailProductName} numberOfLines={2}>
                                  {item.product_name}
                                </Text>
                                <Text style={styles.shopText} numberOfLines={1}>
                                  {item.shop_name || 'Shop'} • Qty: {item.quantity}
                                </Text>
                              </View>
                              <View style={styles.priceContainer}>
                                <Text style={styles.subtotal}>₱{item.subtotal || item.price}</Text>
                                <Text style={styles.unitPrice}>₱{item.price} each</Text>
                              </View>
                            </View>
                          )) || (
                            <Text style={styles.noInfoText}>No product information available</Text>
                          )}
                        </View>

                        <Text style={[styles.sectionTitle, styles.marginTop]}>Refund Details</Text>
                        <View style={styles.detailsGrid}>
                          <Text style={styles.detailText}>Refund ID: {refund.refund_id}</Text>
                          <Text style={styles.detailText}>Order ID: {refund.order_id}</Text>
                          <Text style={styles.detailText}>Request Date: {formatDate(refund.requested_at)}</Text>
                          <Text style={styles.detailText}>Refund Type: {refund.refund_type === 'return' ? 'Return Item' : 'Keep Item'}</Text>
                          <Text style={styles.detailText}>Preferred Method: {refund.buyer_preferred_refund_method || 'N/A'}</Text>
                          <Text style={styles.detailText}>Payment Status: {refund.refund_payment_status || 'pending'}</Text>
                          {refund.return_request && (
                            <Text style={styles.detailText}>Return Status: {refund.return_request.status}</Text>
                          )}
                          {refund.dispute_request && (
                            <Text style={styles.detailText}>Dispute Status: {refund.dispute_request.status}</Text>
                          )}
                        </View>
                      </View>
                    )}

                    {/* Bottom Section - Actions - EXACT from web */}
                    <View style={styles.cardFooter}>
                      <TouchableOpacity
                        style={styles.viewDetailsButton}
                        onPress={() => handleViewDetails(refund.refund_id)}
                      >
                        <MaterialIcons name="visibility" size={14} color="#2563EB" />
                        <Text style={styles.viewDetailsText}>View Details</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: actionIcon.bgColor }]}
                        onPress={() => handleViewDetails(refund.refund_id)}
                      >
                        <MaterialIcons name={actionIcon.name as keyof typeof MaterialIcons.glyphMap} size={14} color={actionIcon.color} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
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
    backgroundColor: '#F8F9FA',
  },
  header: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
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
    marginTop: 0,
    gap: 8,
  },
  successText: {
    flex: 1,
    fontSize: 13,
    color: '#166534',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    margin: 16,
    marginTop: 0,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
    color: '#111827',
  },
  tabsScrollView: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  activeTab: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabLabel: {
    color: '#2563EB',
  },
  tabCount: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 2,
  },
  activeTabCount: {
    backgroundColor: '#BFDBFE',
  },
  tabCountText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#4B5563',
  },
  activeTabCountText: {
    color: '#1E40AF',
  },
  refundsList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  refundCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  refundIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  refundId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  productInfo: {
    marginBottom: 6,
  },
  singleProduct: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  productImage: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
  },
  productName: {
    flex: 1,
    fontSize: 13,
    color: '#4B5563',
  },
  multipleProducts: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  imageStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stackImage: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    backgroundColor: '#F3F4F6',
  },
  moreBadge: {
    width: 24,
    height: 24,
    borderRadius: 4,
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
    flex: 1,
    fontSize: 13,
    color: '#4B5563',
    marginLeft: 4,
  },
  orderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orderText: {
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
    alignItems: 'flex-end',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '500',
  },
  expandButton: {
    padding: 4,
  },
  summarySection: {
    padding: 12,
    gap: 6,
  },
  reasonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reasonText: {
    flex: 1,
    fontSize: 13,
    color: '#4B5563',
  },
  typeText: {
    fontSize: 12,
    color: '#6B7280',
  },
  paymentStatus: {
    fontSize: 12,
    color: '#6B7280',
  },
  expandedSection: {
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  marginTop: {
    marginTop: 12,
  },
  productsList: {
    gap: 12,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  detailProductImage: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  productDetails: {
    flex: 1,
    gap: 4,
  },
  detailProductName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#111827',
  },
  shopText: {
    fontSize: 11,
    color: '#6B7280',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  subtotal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  unitPrice: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  noInfoText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  detailsGrid: {
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  viewDetailsText: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '500',
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});