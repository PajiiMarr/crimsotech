import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import AxiosInstance from '../../contexts/axios';
import { useAuth } from '../../contexts/AuthContext';

type EarningsState = {
  total_sales: number;
  total_orders: number;
  pending_refunds: number;
  net_earnings: number;
};

export default function SellerEarningsPage() {
  const { userId, shopId } = useAuth();
  const [data, setData] = useState<EarningsState>({
    total_sales: 0,
    total_orders: 0,
    pending_refunds: 0,
    net_earnings: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!shopId) {
      setLoading(false);
      return;
    }

    try {
      if (!refreshing) setLoading(true);

      const [dashRes, refundsRes] = await Promise.all([
        AxiosInstance.get('/seller-dashboard/get_dashboard/', {
          params: { shop_id: shopId },
          headers: { 'X-User-Id': userId || '', 'X-Shop-Id': shopId || '' },
        }),
        AxiosInstance.get('/return-refund/get_shop_refunds/', {
          params: { shop_id: shopId, status: 'pending' },
          headers: { 'X-User-Id': userId || '', 'X-Shop-Id': shopId || '' },
        }),
      ]);

      const dashboard = dashRes.data || {};
      const totalSales = Number(dashboard.total_sales || dashboard.sales || 0);
      const totalOrders = Number(dashboard.total_orders || dashboard.orders || 0);

      const refundList = Array.isArray(refundsRes.data)
        ? refundsRes.data
        : Array.isArray(refundsRes.data?.results)
          ? refundsRes.data.results
          : [];

      const pendingRefunds = refundList.reduce((sum: number, r: any) => {
        return sum + Number(r.refund_amount || r.amount || 0);
      }, 0);

      setData({
        total_sales: totalSales,
        total_orders: totalOrders,
        pending_refunds: pendingRefunds,
        net_earnings: totalSales - pendingRefunds,
      });
    } catch (err) {
      console.error('Failed to fetch earnings:', err);
      setData({ total_sales: 0, total_orders: 0, pending_refunds: 0, net_earnings: 0 });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing, shopId, userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Earnings', headerTitleAlign: 'center', headerShadowVisible: false }} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
      >
        <View style={styles.cardPrimary}>
          <Text style={styles.primaryLabel}>Net Earnings</Text>
          <Text style={styles.primaryValue}>PHP {data.net_earnings.toLocaleString()}</Text>
          <Text style={styles.primaryMeta}>{loading ? 'Loading...' : 'Updated from seller dashboard'}</Text>
        </View>

        <View style={styles.grid}>
          <View style={styles.card}><Text style={styles.label}>Total Sales</Text><Text style={styles.value}>PHP {data.total_sales.toLocaleString()}</Text></View>
          <View style={styles.card}><Text style={styles.label}>Total Orders</Text><Text style={styles.value}>{data.total_orders}</Text></View>
          <View style={styles.card}><Text style={styles.label}>Pending Refunds</Text><Text style={styles.value}>PHP {data.pending_refunds.toLocaleString()}</Text></View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16, paddingBottom: 24 },
  cardPrimary: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  primaryLabel: { color: '#CBD5E1', fontSize: 12, fontWeight: '600' },
  primaryValue: { color: '#FFFFFF', fontSize: 28, fontWeight: '800', marginTop: 6 },
  primaryMeta: { color: '#94A3B8', fontSize: 12, marginTop: 6 },
  grid: { gap: 10 },
  card: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 14 },
  label: { color: '#64748B', fontSize: 12, fontWeight: '600' },
  value: { color: '#0F172A', fontSize: 20, fontWeight: '800', marginTop: 6 },
});
