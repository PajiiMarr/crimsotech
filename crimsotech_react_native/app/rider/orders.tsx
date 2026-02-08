import React, { useState, useEffect } from 'react';
import { 
  SafeAreaView, 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  ActivityIndicator
} from 'react-native';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { router } from 'expo-router';
import { getRiderOrderHistory, acceptDeliveryOrder } from '../../utils/riderApi';

// --- Theme Colors (Consistent with Home/Schedule) ---
const COLORS = {
  primary: '#DC2626',
  primaryLight: '#FEF2F2',
  secondary: '#1E293B',
  muted: '#64748B',
  bg: '#FFFFFF',
  cardBg: '#FFFFFF',
  danger: '#DC2626',
  success: '#10B981',
  warning: '#F59E0B',
  border: '#E2E8F0'
};

export default function OrdersPage() {
  const { userRole, userId } = useAuth();
  const [activeTab, setActiveTab] = useState<'pending' | 'delivered'>('pending');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch deliveries from API
  const fetchDeliveries = async () => {
    if (!userId) return;
    
    try {
      setError(null);
      const data = await getRiderOrderHistory(userId, { status: 'all' });
      setDeliveries(data.deliveries || []);
    } catch (err: any) {
      console.error('Error fetching deliveries:', err);
      setError(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, [userId]);

  // Filter orders based on active tab
  const pendingOrders = deliveries.filter(d => d.status === 'pending' || d.status === 'pending_offer' || d.status === 'picked_up' || d.status === 'in_progress');
  const deliveredOrders = deliveries.filter(d => d.status === 'delivered');

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDeliveries();
    setRefreshing(false);
  };

  const handleAcceptOrder = async (deliveryId: string, order: any) => {
    if (!userId) return;
    
    try {
      await acceptDeliveryOrder(userId, deliveryId);
      // After accepting, navigate to delivery details
      const deliveryData = {
        id: order.id,
        order_id: order.order_id,
        customer_name: order.customer_name || order.order?.user?.first_name,
        delivery_location: order.delivery_location || order.order?.delivery_address_text,
        distance_km: order.distance_km,
        estimated_minutes: order.estimated_minutes,
        delivery_fee: order.delivery_fee,
        status: 'pending', // Status remains pending until pickup photo taken
        order: order.order,
      };
      
      router.push({
        pathname: '/rider/delivery-details',
        params: { delivery: encodeURIComponent(JSON.stringify(deliveryData)) }
      });
    } catch (err: any) {
      alert('Failed to accept order: ' + err.message);
    }
  };

  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `₱${(numAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (userRole && userRole !== 'rider') {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.message}>Not authorized to view this page</Text>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading orders...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <MaterialIcons name="error-outline" size={48} color={COLORS.danger} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchDeliveries}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const renderOrderCard = (order: any, isToDeliver: boolean = false) => {
    const customerName = order.order?.user 
      ? `${order.order.user.first_name} ${order.order.user.last_name}`.trim()
      : order.customer_name || 'Customer';
    
    const address = order.order?.delivery_address_text || order.delivery_location || 'Address not available';
    const amount = order.order?.total_amount || order.order_amount || 0;
    const orderId = order.order_id || order.id;
    const deliveryFee = typeof order.delivery_fee === 'string' ? parseFloat(order.delivery_fee) : (order.delivery_fee || 0);
    
    return (
    <TouchableOpacity 
      key={order.id}
      style={styles.orderCard}
      // onPress={() => router.push(`/rider/order-details/${order.id}`)}
    >
      <View style={styles.orderHeader}>
        <View style={styles.orderIdContainer}>
          <MaterialIcons name="receipt" size={16} color={COLORS.muted} />
          <Text style={styles.orderId}>Order #{orderId.substring(0, 8)}</Text>
        </View>
        <View style={[styles.statusBadge, isToDeliver ? styles.deliverBadge : styles.pendingBadge]}>
          <Text style={[styles.statusText, isToDeliver ? { color: COLORS.success } : { color: COLORS.primary }]}>
            {isToDeliver ? 'Delivered' : 'Pending'}
          </Text>
        </View>
      </View>

      <View style={styles.orderDetails}>
        <View style={styles.detailRow}>
          <MaterialIcons name="person" size={16} color={COLORS.muted} />
          <Text style={styles.detailText}>{customerName}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <MaterialIcons name="location-on" size={16} color={COLORS.muted} />
          <Text style={styles.detailText} numberOfLines={1}>{address}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <MaterialIcons name="schedule" size={16} color={COLORS.muted} />
          <Text style={styles.detailText}>
            {order.scheduled_delivery_time 
              ? `Deliver by: ${formatTime(order.scheduled_delivery_time)}`
              : 'Time not set'}
          </Text>
        </View>
        
        {!isToDeliver && order.picked_at && (
          <View style={styles.detailRow}>
            <MaterialIcons name="inventory" size={16} color={COLORS.muted} />
            <Text style={styles.detailText}>
              Picked up: {formatTime(order.picked_at)}
            </Text>
          </View>
        )}
        
        {isToDeliver && order.delivered_at && (
          <View style={styles.detailRow}>
            <MaterialIcons name="check-circle" size={16} color={COLORS.success} />
            <Text style={styles.detailText}>
              Delivered: {formatTime(order.delivered_at)}
            </Text>
          </View>
        )}
        
        <View style={styles.detailRow}>
          <MaterialIcons name="directions-bike" size={16} color={COLORS.muted} />
          <Text style={styles.detailText}>
            {order.distance_km ? `${order.distance_km} km away` : 'Distance not set'}
          </Text>
        </View>
        
        {deliveryFee > 0 && (
          <View style={styles.detailRow}>
            <MaterialIcons name="payments" size={16} color={COLORS.success} />
            <Text style={[styles.detailText, { color: COLORS.success, fontWeight: '600' }]}>
              Delivery Fee: {formatCurrency(deliveryFee)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.orderFooter}>
        <View style={styles.orderInfo}>
          <Text style={styles.orderAmount}>{formatCurrency(amount)}</Text>
          <Text style={styles.orderItems}>{order.items_count || 1} item{(order.items_count || 1) > 1 ? 's' : ''}</Text>
        </View>
        
        {!isToDeliver && (
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => {
              if (order.status === 'pending' || order.status === 'pending_offer') {
                // Accept order
                handleAcceptOrder(order.id, order);
              } else {
                // Already accepted, view details
                const deliveryData = {
                  id: order.id,
                  order_id: order.order_id,
                  customer_name: order.customer_name || order.order?.user?.first_name,
                  delivery_location: order.delivery_location || order.order?.delivery_address_text,
                  distance_km: order.distance_km,
                  estimated_minutes: order.estimated_minutes,
                  delivery_fee: order.delivery_fee,
                  status: order.status,
                  order: order.order,
                };
                router.push({
                  pathname: '/rider/delivery-details',
                  params: { delivery: encodeURIComponent(JSON.stringify(deliveryData)) }
                });
              }
            }}
          >
            <Text style={styles.actionButtonText}>
              {order.status === 'pending' || order.status === 'pending_offer' ? 'Accept Order' : 'View Details'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
    );
  };

  const currentOrders = activeTab === 'pending' ? pendingOrders : deliveredOrders;
  const isEmpty = currentOrders.length === 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.cardBg} />
      
      {/* --- Standardized Header --- */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Orders</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.iconButton} 
            onPress={() => console.log('Notifications')}
          >
            <Feather name="bell" size={22} color={COLORS.secondary} />
            <View style={styles.notificationBadge}>
              {/* <Text style={styles.badgeText}>2</Text> */}
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.iconButton} 
            onPress={() => router.push('/rider/settings')}
          >
            <Feather name="settings" size={22} color={COLORS.secondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
            Pending
          </Text>
          {activeTab === 'pending' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'delivered' && styles.activeTab]}
          onPress={() => setActiveTab('delivered')}
        >
          <Text style={[styles.tabText, activeTab === 'delivered' && styles.activeTabText]}>
            Delivered
          </Text>
          {activeTab === 'delivered' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
      </View>

      {/* Orders List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isEmpty ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="inventory" size={64} color={COLORS.muted} />
            <Text style={styles.emptyTitle}>No Orders</Text>
            <Text style={styles.emptyText}>
              {activeTab === 'pending' 
                ? 'No pending orders available'
                : 'No delivered orders yet'}
            </Text>
          </View>
        ) : (
          currentOrders.map(order => renderOrderCard(order, activeTab === 'delivered'))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  message: {
    fontSize: 14,
    color: COLORS.muted,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.muted,
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.danger,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Header
  header: {
    backgroundColor: COLORS.cardBg,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.secondary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    padding: 8,
    backgroundColor: COLORS.border,
    borderRadius: 8,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: COLORS.danger,
    borderRadius: 4,
    width: 8,
    height: 8,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  activeTab: {
    backgroundColor: COLORS.primaryLight,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.muted,
  },
  activeTabText: {
    color: COLORS.primary,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: 2,
    backgroundColor: COLORS.primary,
  },

  // List
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Space for bottom tab
  },

  // Order Card
  orderCard: {
    backgroundColor: COLORS.cardBg,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orderId: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.secondary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  pendingBadge: {
    backgroundColor: COLORS.primaryLight,
  },
  deliverBadge: {
    backgroundColor: '#D1FAE5', // Light green
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  orderDetails: {
    gap: 6,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 12,
    color: COLORS.muted,
    flex: 1,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  orderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  orderItems: {
    fontSize: 11,
    color: COLORS.muted,
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 64,
    paddingHorizontal: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.secondary,
    marginTop: 12,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
});