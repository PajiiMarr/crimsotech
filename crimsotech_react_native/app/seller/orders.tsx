import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { 
  SafeAreaView, View, Text, StyleSheet, FlatList, 
  TouchableOpacity, Image, TextInput, ScrollView, ActivityIndicator 
} from 'react-native';
import { Package, Truck, Search, Copy, Clock, AlertCircle } from 'lucide-react-native';
// 1. Import Stack for the centered header fix
import { Stack, useFocusEffect } from 'expo-router';
import AxiosInstance from '../../contexts/axios';
import { useAuth } from '../../contexts/AuthContext';

const FALLBACK_IMAGE = 'https://via.placeholder.com/200x200?text=No+Image';

type OrderItem = {
  id: string;
  customer: string;
  item: string;
  itemImg: string;
  total: number;
  status: 'Pending' | 'To Ship' | 'Completed' | 'Cancelled';
  date: string;
  courier: string;
};

const TABS = ['All', 'Pending', 'To Ship', 'Completed'];

export default function SellerOrdersPage() {
  const { userId, shopId } = useAuth();
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mapStatus = (status?: string): OrderItem['status'] => {
    switch ((status || '').toLowerCase()) {
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      case 'to_ship':
      case 'ready_for_pickup':
      case 'shipped':
      case 'in_transit':
      case 'out_for_delivery':
        return 'To Ship';
      case 'pending_shipment':
      case 'arrange_shipment':
      default:
        return 'Pending';
    }
  };

  const formatDate = (iso?: string) => {
    if (!iso) return '—';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const fetchOrders = useCallback(async () => {
    if (!shopId) {
      setError('Shop not found. Please select a shop.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await AxiosInstance.get('/seller-order-list/order_list/', {
        params: { shop_id: shopId },
        headers: {
          'X-User-Id': userId || '',
          'X-Shop-Id': shopId || '',
        }
      });

      const apiOrders = response.data?.data || [];
      const mapped: OrderItem[] = apiOrders.map((order: any) => {
        const firstItem = order.items?.[0];
        const product = firstItem?.cart_item?.product;
        return {
          id: order.order_id || order.id || '—',
          customer: order.user?.first_name || order.user?.username || 'Unknown Customer',
          item: product?.name || 'Order Item',
          itemImg: product?.image || product?.thumbnail || FALLBACK_IMAGE,
          total: Number(order.total_amount || 0),
          status: mapStatus(order.status),
          date: formatDate(order.created_at),
          courier: order.shipping_method || 'Standard Shipping'
        };
      });

      setOrders(mapped);
    } catch (err: any) {
      console.error('Failed to load orders:', err);
      setError(err?.response?.data?.message || 'Failed to load orders.');
    } finally {
      setLoading(false);
    }
  }, [shopId, userId]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [fetchOrders])
  );

  const filteredOrders = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return orders.filter((o) => {
      const matchesTab = activeTab === 'All' || o.status === activeTab;
      const matchesQuery =
        o.id.toLowerCase().includes(query) ||
        o.customer.toLowerCase().includes(query) ||
        o.item.toLowerCase().includes(query);
      return matchesTab && matchesQuery;
    });
  }, [orders, activeTab, searchQuery]);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Pending': return { bg: '#FEF3C7', text: '#D97706' };
      case 'To Ship': return { bg: '#E0F2FE', text: '#0284C7' };
      case 'Completed': return { bg: '#DCFCE7', text: '#16A34A' };
      default: return { bg: '#F1F5F9', text: '#475569' };
    }
  };

  const renderOrder = ({ item }: { item: OrderItem }) => {
    const statusStyle = getStatusStyle(item.status);
    
    return (
      <View style={styles.orderCard}>
        {/* CARD HEADER */}
        <View style={styles.cardHeader}>
          <View style={styles.idRow}>
            <Text style={styles.orderIdText}>{item.id}</Text>
            <TouchableOpacity hitSlop={10}><Copy size={12} color="#94A3B8" /></TouchableOpacity>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>{item.status}</Text>
          </View>
        </View>

        {/* PRODUCT INFO */}
        <View style={styles.productRow}>
          <Image source={{ uri: item.itemImg }} style={styles.itemThumb} />
          <View style={styles.itemDetails}>
            <Text style={styles.customerLine}>{item.customer} ordered</Text>
            <Text style={styles.itemName} numberOfLines={1}>{item.item}</Text>
            <Text style={styles.itemPrice}>₱{item.total.toLocaleString()}</Text>
          </View>
        </View>

        {/* LOGISTICS & INFO */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Truck size={14} color="#64748B" />
            <Text style={styles.metaText}>{item.courier}</Text>
          </View>
          <View style={styles.metaItem}>
            <Clock size={14} color="#64748B" />
            <Text style={styles.metaText}>{item.date}</Text>
          </View>
        </View>

        {/* ACTIONS */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.secondaryBtn}>
            <Text style={styles.secondaryBtnText}>Details</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[
            styles.primaryBtn, 
            item.status === 'Completed' && { backgroundColor: '#F1F5F9' }
          ]}>
            <Text style={[
              styles.primaryBtnText,
              item.status === 'Completed' && { color: '#475569' }
            ]}>
              {item.status === 'Pending' ? 'Arrange Shipment' : 
               item.status === 'To Ship' ? 'Print Waybill' : 'Archive'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 2. Centered Header via Stack.Screen */}
      <Stack.Screen options={{ 
        title: 'Manage Orders', 
        headerTitleAlign: 'center',
        headerShadowVisible: false,
        headerStyle: { backgroundColor: '#fff' }
      }} />

      {/* SEARCH SECTION */}
      <View style={styles.topSection}>
        <View style={styles.searchBar}>
          <Search color="#94A3B8" size={18} />
          <TextInput 
            placeholder="Search Order ID or Customer..." 
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94A3B8"
          />
        </View>

        {/* TABS */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
          {TABS.map((tab) => (
            <TouchableOpacity 
              key={tab} 
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredOrders}
        renderItem={renderOrder}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            {loading ? (
              <>
                <ActivityIndicator size="small" color="#0F172A" />
                <Text style={styles.emptyText}>Loading orders...</Text>
              </>
            ) : (
              <>
                <AlertCircle size={48} color="#CBD5E1" />
                <Text style={styles.emptyText}>{error || 'No orders found'}</Text>
              </>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  topSection: { backgroundColor: '#fff', paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  
  searchBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F1F5F9', 
    marginHorizontal: 16, 
    marginVertical: 12, 
    paddingHorizontal: 12, 
    borderRadius: 12, 
    height: 45 
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 14, color: '#1E293B', fontWeight: '500' },

  tabsScroll: { paddingLeft: 16 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, marginRight: 8, borderRadius: 10 },
  activeTab: { backgroundColor: '#F1F5F9' },
  tabText: { fontSize: 13, color: '#94A3B8', fontWeight: '600' },
  activeTabText: { color: '#0F172A', fontWeight: '800' },

  listContent: { padding: 16 },
  orderCard: { 
    backgroundColor: '#fff', 
    borderRadius: 20, 
    padding: 16, 
    marginBottom: 16, 
    borderWidth: 1, 
    borderColor: '#E2E8F0',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  orderIdText: { fontSize: 13, fontWeight: '800', color: '#1E293B' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },

  productRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  itemThumb: { width: 64, height: 64, borderRadius: 12, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#F1F5F9' },
  itemDetails: { marginLeft: 12, flex: 1 },
  customerLine: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  itemName: { fontSize: 15, fontWeight: '700', color: '#1E293B', marginVertical: 2 },
  itemPrice: { fontSize: 16, fontWeight: '800', color: '#0F172A' },

  metaRow: { 
    flexDirection: 'row', 
    paddingTop: 12, 
    borderTopWidth: 1, 
    borderTopColor: '#F1F5F9', 
    marginBottom: 15 
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', marginRight: 20, gap: 6 },
  metaText: { fontSize: 11, color: '#64748B', fontWeight: '600' },

  actionRow: { flexDirection: 'row', gap: 10 },
  primaryBtn: { backgroundColor: '#0F172A', flex: 1.5, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  secondaryBtn: { backgroundColor: '#fff', flex: 1, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  primaryBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  secondaryBtnText: { color: '#475569', fontSize: 12, fontWeight: '700' },

  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#94A3B8', fontSize: 14, fontWeight: '600', marginTop: 10 }
});