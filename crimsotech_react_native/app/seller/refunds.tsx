import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import AxiosInstance from '../../contexts/axios';
import { useAuth } from '../../contexts/AuthContext';

type RefundItem = {
  id: string;
  order_id: string;
  product_name: string;
  amount: number;
  status: string;
  created_at: string;
};

const FILTERS = ['all', 'pending', 'approved', 'rejected', 'dispute'];

export default function SellerRefundsPage() {
  const { userId, shopId } = useAuth();
  const [items, setItems] = useState<RefundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchRefunds = useCallback(async () => {
    if (!shopId) {
      setLoading(false);
      return;
    }

    try {
      if (!refreshing) setLoading(true);
      const params: Record<string, string> = { shop_id: shopId };
      if (statusFilter !== 'all') params.status = statusFilter;

      const res = await AxiosInstance.get('/return-refund/get_shop_refunds/', {
        params,
        headers: {
          'X-User-Id': userId || '',
          'X-Shop-Id': shopId || '',
        },
      });

      const list = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.results)
          ? res.data.results
          : [];

      const mapped: RefundItem[] = list.map((r: any) => ({
        id: String(r.refund_id || r.refund || r.id || ''),
        order_id: String(r.order_id || r.order_info?.order_id || ''),
        product_name: String(r.order_items?.[0]?.product_name || r.product?.name || 'Product'),
        amount: Number(r.refund_amount || r.amount || 0),
        status: String(r.status || 'pending'),
        created_at: String(r.created_at || ''),
      }));

      setItems(mapped);
    } catch (err) {
      console.error('Failed to fetch refunds:', err);
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing, shopId, statusFilter, userId]);

  useEffect(() => {
    fetchRefunds();
  }, [fetchRefunds]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) =>
      i.order_id.toLowerCase().includes(q) ||
      i.product_name.toLowerCase().includes(q) ||
      i.id.toLowerCase().includes(q)
    );
  }, [items, query]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRefunds();
  };

  const renderItem = ({ item }: { item: RefundItem }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/seller/view-refund-details?id=${item.id}` as any)}
      activeOpacity={0.8}
    >
      <View style={styles.rowBetween}>
        <Text style={styles.title} numberOfLines={1}>{item.product_name}</Text>
        <Text style={styles.status}>{item.status.toUpperCase()}</Text>
      </View>
      <Text style={styles.meta}>Order: {item.order_id || '-'}</Text>
      <Text style={styles.meta}>Amount: PHP {item.amount.toLocaleString()}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Refunds', headerTitleAlign: 'center', headerShadowVisible: false }} />
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search refund/order"
          placeholderTextColor="#94A3B8"
        />
      </View>
      <FlatList
        horizontal
        data={FILTERS}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterList}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setStatusFilter(item)}
            style={[styles.filterChip, statusFilter === item && styles.filterChipActive]}
          >
            <Text style={[styles.filterText, statusFilter === item && styles.filterTextActive]}>{item}</Text>
          </TouchableOpacity>
        )}
      />
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={styles.empty}>{loading ? 'Loading...' : 'No refund requests found'}</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  searchWrap: { paddingHorizontal: 16, paddingTop: 12 },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    color: '#0F172A',
  },
  filterList: { paddingHorizontal: 12, paddingVertical: 10 },
  filterChip: {
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    marginHorizontal: 4,
    backgroundColor: '#FFFFFF',
  },
  filterChipActive: { borderColor: '#EE4D2D', backgroundColor: '#FFF1EE' },
  filterText: { color: '#475569', fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  filterTextActive: { color: '#EE4D2D' },
  list: { paddingHorizontal: 16, paddingBottom: 20 },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 14, fontWeight: '700', color: '#0F172A', flex: 1, marginRight: 8 },
  status: { fontSize: 10, fontWeight: '800', color: '#EE4D2D' },
  meta: { marginTop: 4, fontSize: 12, color: '#475569' },
  empty: { textAlign: 'center', marginTop: 40, color: '#94A3B8' },
});

