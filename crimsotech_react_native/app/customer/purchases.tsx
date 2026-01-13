// purchases.tsx
import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { ClipboardList, Truck, MessageSquare, Undo2, Clock, Star, Package, CheckCircle, XCircle } from 'lucide-react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import CustomerLayout from './CustomerLayout';
import AxiosInstance from '../../contexts/axios';

interface PurchaseItem {
  checkout_id: string;
  product_id: string;
  product_name: string;
  product_description: string;
  quantity: number;
  price: string;
  // optional original list price (if available from backend)
  original_price?: string;
  subtotal: string;
  status: string;
  purchased_at: string;
  primary_image: {
    url: string;
    file_type: string;
  } | null;
  shop_name: string;
  shop_picture: string | null;
  can_review: boolean;
}

interface PurchaseOrder {
  order_id: string;
  status: string;
  total_amount: string;
  payment_method: string;
  delivery_method: string | null;
  created_at: string;
  payment_status: string | null;
  delivery_status: string | null;
  items: PurchaseItem[];
}

interface PurchasesResponse {
  user_id: string;
  username: string;
  total_purchases: number;
  purchases: PurchaseOrder[];
}

export default function PurchasesPage() {
  const { user, userRole } = useAuth();
  const { tab } = useLocalSearchParams();
  
  const [activeTab, setActiveTab] = useState<string>('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [purchases, setPurchases] = useState<PurchasesResponse | null>(null);
  const [filteredOrders, setFilteredOrders] = useState<PurchaseOrder[]>([]);

  // Sync active tab with navigation params if they exist
  useEffect(() => {
    if (tab) {
      setActiveTab(tab as string);
    }
  }, [tab]);

  // Fetch purchases when component mounts or user changes
  useEffect(() => {
    if (user?.id) {
      fetchPurchases();
    }
  }, [user?.id]);

  // Filter orders based on active tab
  useEffect(() => {
    if (!purchases?.purchases) {
      setFilteredOrders([]);
      return;
    }

    let filtered = purchases.purchases;
    
    if (activeTab !== 'All') {
      switch (activeTab) {
        case 'Processing':
          filtered = purchases.purchases.filter(order => 
            order.status === 'pending' || order.status === 'processing'
          );
          break;
        case 'Shipped':
          filtered = purchases.purchases.filter(order => 
            order.status === 'shipped' || order.status === 'delivered'
          );
          break;
        case 'Rate':
          filtered = purchases.purchases.filter(order => 
            order.status === 'completed'
          );
          break;
        case 'Returns':
          filtered = purchases.purchases.filter(order => 
            order.status === 'cancelled' || order.status === 'refunded'
          );
          break;
        default:
          filtered = purchases.purchases;
      }
    }

    // Sort by date (newest first)
    filtered = filtered.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    setFilteredOrders(filtered);
  }, [purchases, activeTab]);

  const fetchPurchases = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await AxiosInstance.get('/api/purchases-buyer/user_purchases/', {
        headers: {
          'X-User-Id': user.id,
        },
      });
      
      if (response.data) {
        setPurchases(response.data);
      }
    } catch (error) {
      console.error('Error fetching purchases:', error);
      // Handle error appropriately
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPurchases();
  };

  const handleReviewPress = (productId: string) => {
    // router.push(`/review/${productId}`);
  };

  const handleTrackOrder = (orderId: string) => {
    // router.push(`/track-order/${orderId}`);
  };

  const handleViewOrderDetails = (orderId: string) => {
    // router.push(`/order/${orderId}`);
  };

  const handleRepurchase = (orderId: string) => {
    // stub: navigate to repurchase flow
    // router.push(`/repurchase/${orderId}`);
  };

  const handleReturnItem = (checkoutId: string) => {
    // router.push(`/return/${checkoutId}`);
  };

  const handleCancelOrder = (orderId: string) => {
    // stub: call cancel API or navigate to cancel flow
    // router.push(`/cancel/${orderId}`);
  };

  const handleRateOrder = (orderId: string) => {
    // stub: navigate to rate screen
    // router.push(`/rate/${orderId}`);
  };

  const handleViewRating = (orderId: string) => {
    // stub: navigate to view rating
    // router.push(`/order/${orderId}/rating`);
  };

  const handleBuyAgain = (orderId: string) => {
    // stub: navigate to buy again flow
    // router.push(`/repurchase/${orderId}`);
  };

  const handleRefund = (orderId: string) => {
    // stub: start refund flow
    // router.push(`/refund/${orderId}`);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
      case 'processing':
        return <Clock size={16} color="#F59E0B" />;
      case 'shipped':
        return <Truck size={16} color="#3B82F6" />;
      case 'delivered':
        return <CheckCircle size={16} color="#10B981" />;
      case 'cancelled':
      case 'refunded':
        return <XCircle size={16} color="#EF4444" />;
      default:
        return <Package size={16} color="#6B7280" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
      case 'processing':
        return '#F59E0B'; // Amber
      case 'shipped':
        return '#3B82F6'; // Blue
      case 'delivered':
        return '#10B981'; // Green
      case 'cancelled':
      case 'refunded':
        return '#EF4444'; // Red
      default:
        return '#6B7280'; // Gray
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'processing':
        return 'Processing';
      case 'shipped':
        return 'Shipped';
      case 'delivered':
        return 'Delivered';
      case 'cancelled':
        return 'Cancelled';
      case 'refunded':
        return 'Refunded';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: string) => {
    return `₱${parseFloat(amount).toFixed(2)}`;
  };

  // Format numeric currency, omit decimals when value is whole (e.g., ₱8000)
  const formatCurrencyNumber = (amount: number) => {
    return Number.isInteger(amount) ? `₱${amount}` : `₱${amount.toFixed(2)}`;
  };

  const renderOrderItem = ({ item }: { item: PurchaseItem }) => {
    return (
      <View style={styles.orderItem}>
        <View style={styles.orderItemHeader}>
          <Image
            source={{ 
              uri: item.primary_image?.url || '../../assets/images/icon.png'
            }}
            style={styles.productImage}
            defaultSource={require('../../assets/images/icon.png')}
          />

          <View style={styles.productInfo}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.shopName}>{item.shop_name}</Text>



            <Text style={styles.productName} numberOfLines={2}>{item.product_name}</Text>
          </View>

  
        </View>
          </View>
        </View>

        <View style={styles.orderItemFooter}>
        

          <View style={styles.actionButtons}>
           
            {(item.status === 'cancelled' || item.status === 'refunded') && (
              <TouchableOpacity
                style={[styles.actionButton, styles.returnButton]}
                onPress={() => handleReturnItem(item.checkout_id)}
              >
                <Undo2 size={14} color="#FFFFFF" />
                <Text style={styles.returnButtonText}>Return Details</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderOrderCard = ({ item }: { item: PurchaseOrder }) => {
    const totalItems = item.items.reduce((s, it) => s + it.quantity, 0);
    const itemsPrice = item.items.reduce((s, it) => s + parseFloat(it.price) * it.quantity, 0);
    const totalAmountNumber = parseFloat(item.total_amount);
    const isProcessing = item.status === 'pending' || item.status === 'processing';
    const isShipped = item.status === 'shipped';
    const isDelivered = item.status === 'delivered';
    const isRate = item.status === 'completed';
    const isReturns = item.status === 'cancelled' || item.status === 'refunded';
    const canReviewAny = item.items.some(it => it.can_review);

    return (
      <View style={styles.orderCard}>
        <TouchableOpacity 
          onPress={() => handleViewOrderDetails(item.order_id)}
          activeOpacity={0.7}
        >
          <View style={styles.orderHeader}>
            <View style={{ flex: 1 }}>
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
                <Text style={[styles.orderStatusText, { color: getStatusColor(item.status), marginLeft: 8 }]}>
                  {getStatusText(item.status)}
                </Text>
              </View>

             
            </View>

            <Text style={styles.orderDate}>{formatDate(item.created_at)}</Text>
          </View>

        </TouchableOpacity>

        <FlatList
          data={item.items}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.checkout_id}
          scrollEnabled={false}
          contentContainerStyle={styles.orderItemsList}
        />

        <View style={styles.orderTotalsBlock}>
          <Text style={styles.itemsPriceText}>{formatCurrencyNumber(itemsPrice)}</Text>

          <Text style={styles.itemsAndTotalText}>
            {totalItems} Item{totalItems > 1 ? 's' : ''} : <Text style={styles.totalPriceHighlight}>{formatCurrencyNumber(totalAmountNumber)}</Text>
          </Text>
        </View>
        

        

        <View style={styles.orderActions}>
          {isProcessing && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => handleCancelOrder(item.order_id)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}

          {isShipped && (
            // For shipped we only show Track
            <TouchableOpacity
              style={styles.trackButton}
              onPress={() => handleTrackOrder(item.order_id)}
            >
              <Text style={styles.trackButtonText}>Track</Text>
            </TouchableOpacity>
          )}

          {isDelivered && (
            <>
              <TouchableOpacity
                style={styles.trackButton}
                onPress={() => handleTrackOrder(item.order_id)}
              >
                <Text style={styles.trackButtonText}>Track</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.smallOutline}
                onPress={() => handleRefund(item.order_id)}
              >
                <Text style={styles.smallOutlineText}>Refund</Text>
              </TouchableOpacity>
            </>
          )}

          {isRate && canReviewAny && (
            <TouchableOpacity
              style={styles.rateButton}
              onPress={() => handleRateOrder(item.order_id)}
            >
              <Text style={styles.rateButtonText}>Rate</Text>
            </TouchableOpacity>
          )}

          {/* Returns: no buttons */}
        </View>
      </View>
    );
  };

  // Simple role guard
  if (userRole && userRole !== 'customer') {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.message}>Not authorized to view this page</Text>
      </SafeAreaView>
    );
  }

  const tabs = [
    { label: 'All', icon: ClipboardList },
    { label: 'Processing', icon: ClipboardList },
    { label: 'Shipped', icon: Truck },
    { label: 'Rate', icon: MessageSquare },
    { label: 'Returns', icon: Undo2 },
  ];

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <CustomerLayout disableScroll>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F97316" />
            <Text style={styles.loadingText}>Loading purchases...</Text>
          </View>
        </CustomerLayout>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <CustomerLayout disableScroll>
        {/* Header */}
        

        {/* Horizontal Tab Bar */}
        <View style={styles.tabBarWrapper}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.tabBar}
          >
            {tabs.map((t) => (
              <TouchableOpacity 
                key={t.label} 
                onPress={() => setActiveTab(t.label)}
                style={[
                  styles.tabItem, 
                  activeTab === t.label && styles.activeTabItem
                ]}
              >
                <Text style={[
                  styles.tabLabel, 
                  activeTab === t.label && styles.activeTabLabel
                ]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Content */}
        {filteredOrders.length === 0 ? (
          <View style={styles.content}>
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Clock size={60} color="#D1D5DB" strokeWidth={1} />
              </View>
              <Text style={styles.emptyText}>It is empty here..</Text>
              <Text style={styles.subEmptyText}>
                You don't have any {activeTab.toLowerCase()} orders.
              </Text>
              <TouchableOpacity
                style={styles.browseButton}
                onPress={() => router.push('/customer/home')}
              >
                <Text style={styles.browseButtonText}>Browse Products</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <FlatList
            data={filteredOrders}
            renderItem={renderOrderCard}
            keyExtractor={(item) => item.order_id}
            contentContainerStyle={styles.orderList}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#F97316']}
                tintColor="#F97316"
              />
            }
          />
        )}
      </CustomerLayout>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FFFFFF' 
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  message: { 
    fontSize: 16, 
    color: '#6B7280' 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },

  // Header
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },

  // Tabs
  tabBarWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  tabBar: {
    paddingHorizontal: 12,
    height: 48,
    alignItems: 'center',
  },
  tabItem: {
    paddingHorizontal: 16,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabItem: {
    borderBottomColor: '#111827', 
  },
  tabLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  activeTabLabel: {
    color: '#111827',
    fontWeight: '700',
  },

  // Empty State
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  emptyContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  emptyIconCircle: {
    marginBottom: 20,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600',
  },
  subEmptyText: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 8,
    marginBottom: 16,
  },
  browseButton: {
    backgroundColor: '#F97316',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Order List
  orderList: {
    padding: 12,
    paddingBottom: 60, // Reduced bottom padding for compact layout
  },

  // Order Card
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 10,
    overflow: 'hidden',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  orderId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  orderDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  orderStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderStatusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  orderSummary: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  paymentMethod: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  orderItemsList: {
    paddingTop: 8,
  },

  // Order Item
  orderItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  orderItemHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  productImage: {
    width: 64,
    height: 64,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  productInfo: {
    flex: 1,
    marginLeft: 8,
  },
  productName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  shopName: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  quantity: {
    fontSize: 12,
    color: '#6B7280',
  },
  price: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    marginTop: 4,
  },
  // Price variations
  originalPrice: {
    fontSize: 12,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
    marginBottom: 2,
  },
  currentPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  actualPriceLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 2,
  },

  // Order totals block
  orderTotalsBlock: {
    marginTop: 8,
    paddingHorizontal: 12,
    alignItems: 'flex-end',
  },
  itemsPriceText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  itemsAndTotalText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  totalPriceHighlight: {
    fontSize: 16,
    fontWeight: '800',
    color: '#13100d',
  },
  
  orderItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // small button row for delivered
  smallButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  smallOutline: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
    alignSelf: 'flex-start',
  },
  smallOutlineText: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '600',
  },
  smallOutlineDisabledText: {
    color: '#9CA3AF',
  },
  smallOrange: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F97316',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
    alignSelf: 'flex-start',
  },
  smallOrangeText: {
    color: '#F97316',
    fontSize: 12,
    fontWeight: '700',
  },

  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'row',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  reviewButton: {
    backgroundColor: '#F97316',
  },
  reviewButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  returnButton: {
    backgroundColor: '#EF4444',
  },
  returnButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },

  // Order Actions
  orderActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  trackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderRadius: 6,
    marginRight: 8,
  },
  trackButtonText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  detailsButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  detailsButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },

  // Status and header
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  orderIdFull: {
    marginTop: 6,
    fontSize: 12,
    color: '#6B7280',
  },

  // Badges
  badgesRow: {
    flexDirection: 'row',
    marginTop: 6,
    alignItems: 'center',
  },
  badge: {
    backgroundColor: '#111827',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
  },
  badgeSecondary: {
    backgroundColor: '#6B7280',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },

  // Price info on item
  priceInfo: {
    alignItems: 'flex-end',
  },
  itemsCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  actualPrice: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },

  // Buttons for actions
  outlineButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#111827',
    marginRight: 12,
  },
  outlineButtonText: {
    color: '#111827',
    fontWeight: '600',
  },
  disabledButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#E5E7EB',
    marginLeft: 'auto',
  },
  disabledButtonText: {
    color: '#9CA3AF',
    fontWeight: '600',
  },

  // New action button variations
  cancelButton: {
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#EF4444',
    fontWeight: '700',
    fontSize: 12,
  },
  rateButton: {
    backgroundColor: '#F97316',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginRight: 8,
  },
  rateButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },

});