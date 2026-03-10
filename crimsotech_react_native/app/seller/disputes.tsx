import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import AxiosInstance from '../../contexts/axios';
import { useAuth } from '../../contexts/AuthContext';

type DisputeItem = {
  id: string;
  order_id: string;
  reason: string;
  status: string;
  created_at: string;
};

export default function SellerDisputesPage() {
  const { userId, shopId } = useAuth();
  const [items, setItems] = useState<DisputeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDisputes = useCallback(async () => {
    if (!shopId) {
      setLoading(false);
      return;
    }

    try {
      if (!refreshing) setLoading(true);
      const res = await AxiosInstance.get('/return-refund/get_shop_refunds/', {
        params: { shop_id: shopId, status: 'dispute' },
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

      const mapped: DisputeItem[] = list.map((r: any) => ({
        id: String(r.refund_id || r.refund || r.id || ''),
        order_id: String(r.order_id || r.order_info?.order_id || ''),
        reason: String(r.dispute_reason || r.reason || 'No reason provided'),
        status: String(r.dispute?.status || r.status || 'pending'),
        created_at: String(r.created_at || ''),
      }));

      setItems(mapped);
    } catch (err) {
      console.error('Failed to fetch disputes:', err);
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing, shopId, userId]);

  useEffect(() => {
    fetchDisputes();
  }, [fetchDisputes]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDisputes();
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Disputes', headerTitleAlign: 'center', headerShadowVisible: false }} />
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={styles.empty}>{loading ? 'Loading...' : 'No disputes found'}</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/seller/view-refund-details?id=${item.id}` as any)}
          >
            <View style={styles.rowBetween}>
              <Text style={styles.order}>Order: {item.order_id || '-'}</Text>
              <Text style={styles.status}>{item.status.toUpperCase()}</Text>
            </View>
            <Text style={styles.reason} numberOfLines={2}>{item.reason}</Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  list: { padding: 16 },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  order: { color: '#0F172A', fontWeight: '700', fontSize: 13 },
  status: { color: '#EE4D2D', fontWeight: '800', fontSize: 10 },
  reason: { color: '#475569', fontSize: 12, marginTop: 6 },
  empty: { textAlign: 'center', marginTop: 40, color: '#94A3B8' },
});

