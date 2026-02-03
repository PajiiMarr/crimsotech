import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { ClipboardList, Package, Truck, Undo2, MessageSquare, Clock } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { router } from 'expo-router';
import CustomerLayout from './CustomerLayout';
import AxiosInstance from '../../contexts/axios';

interface OrderSummary {
  order_id: string;
  status: string;
  total_amount: string;
  created_at: string;
}

export default function OrderPage() {
  const { user, userRole } = useAuth();
  // State to track which tab is active
  const [activeTab, setActiveTab] = useState('To Process');
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchOrders();
    }
  }, [user?.id]);

  const fetchOrders = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await AxiosInstance.get('/purchases-buyer/user_purchases/', {
        headers: { 'X-User-Id': String(user.id) },
      });
      const list = response.data?.purchases || [];
      setOrders(list);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const filteredOrders = useMemo(() => {
    if (activeTab === 'All') return orders;
    if (activeTab === 'To Process') return orders.filter((o) => o.status === 'pending' || o.status === 'processing');
    if (activeTab === 'To Ship') return orders.filter((o) => o.status === 'processing' || o.status === 'confirmed');
    if (activeTab === 'Shipped') return orders.filter((o) => o.status === 'shipped' || o.status === 'delivered');
    if (activeTab === 'Returns') return orders.filter((o) => o.status === 'cancelled' || o.status === 'refunded');
    if (activeTab === 'Review') return orders.filter((o) => o.status === 'completed' || o.status === 'delivered');
    return orders;
  }, [activeTab, orders]);

  const tabCounts = useMemo(() => {
    return {
      all: orders.length,
      toProcess: orders.filter((o) => o.status === 'pending' || o.status === 'processing').length,
      toShip: orders.filter((o) => o.status === 'processing' || o.status === 'confirmed').length,
      shipped: orders.filter((o) => o.status === 'shipped' || o.status === 'delivered').length,
      returns: orders.filter((o) => o.status === 'cancelled' || o.status === 'refunded').length,
      review: orders.filter((o) => o.status === 'completed' || o.status === 'delivered').length,
    };
  }, [orders]);

  // Simple role guard
  if (userRole && userRole !== 'customer') {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.message}>Not authorized to view this page</Text>
      </SafeAreaView>
    );
  }

  const tabs = [
    { label: 'All', icon: ClipboardList, badge: tabCounts.all },
    { label: 'To Process', icon: ClipboardList, badge: tabCounts.toProcess },
    { label: 'To Ship', icon: Package, badge: tabCounts.toShip },
    { label: 'Shipped', icon: Truck, badge: tabCounts.shipped },
    { label: 'Returns', icon: Undo2, badge: tabCounts.returns },
    { label: 'Review', icon: MessageSquare, badge: tabCounts.review },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <CustomerLayout refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* Added Label Section */}
        <View style={styles.headerLabelContainer}>
          <Text style={styles.headerLabel}>Personal Listing</Text>
        </View>

        <View style={styles.tabBarWrapper}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.tabBar}
          >
            {tabs.map((tab) => (
              <TouchableOpacity 
                key={tab.label} 
                onPress={() => setActiveTab(tab.label)}
                style={[
                  styles.tabItem, 
                  activeTab === tab.label && styles.activeTabItem
                ]}
              >
                <Text style={[
                  styles.tabLabel, 
                  activeTab === tab.label && styles.activeTabLabel
                ]}>
                  {tab.label}
                </Text>
                {tab.badge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{tab.badge}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Content Area */}
        <View style={styles.content}>
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#111827" />
              <Text style={styles.loadingText}>Loading orders...</Text>
            </View>
          ) : filteredOrders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Clock size={60} color="#D1D5DB" strokeWidth={1} />
              </View>
              <Text style={styles.emptyText}>It is empty here..</Text>

              {(activeTab === 'Review' || activeTab === 'Rate') && (
                <TouchableOpacity
                  style={styles.rateButton}
                  onPress={() => router.push('/customer/purchases?tab=Rate')}
                >
                  <Text style={styles.rateButtonText}>Rate</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.orderList}>
              {filteredOrders.map((order) => (
                <TouchableOpacity
                  key={order.order_id}
                  style={styles.orderCard}
                  onPress={() => router.push(`/customer/view-order?orderId=${order.order_id}`)}
                >
                  <View style={styles.orderRow}>
                    <Text style={styles.orderTitle}>Order #{order.order_id.slice(0, 8)}</Text>
                    <Text style={styles.orderAmount}>₱{Number(order.total_amount || 0).toFixed(2)}</Text>
                  </View>
                  <Text style={styles.orderMeta}>{new Date(order.created_at).toLocaleDateString()}</Text>
                  <Text style={styles.orderStatus}>{order.status}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </CustomerLayout>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  message: { fontSize: 16, color: '#6B7280' },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { marginTop: 10, color: '#6B7280' },

  // Label Styles
  headerLabelContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  headerLabel: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },

  // Tab Bar Styles
  tabBarWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tabBar: {
    paddingHorizontal: 10,
    height: 50,
    alignItems: 'center',
  },
  tabItem: {
    paddingHorizontal: 15,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
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
  badge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 6,
    marginLeft: 4,
    borderWidth: 1,
    borderColor: '#111827'
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#111827',
  },

  // Empty State Styles
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderList: { width: '100%', paddingHorizontal: 16, paddingBottom: 24 },
  orderCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 12,
  },
  orderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  orderAmount: { fontSize: 14, fontWeight: '700', color: '#F97316' },
  orderMeta: { marginTop: 6, fontSize: 12, color: '#6B7280' },
  orderStatus: { marginTop: 6, fontSize: 12, color: '#2563EB', fontWeight: '600', textTransform: 'capitalize' },
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
    fontWeight: '500',
  },
  rateButton: {
    marginTop: 18,
    backgroundColor: '#F97316',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  rateButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});