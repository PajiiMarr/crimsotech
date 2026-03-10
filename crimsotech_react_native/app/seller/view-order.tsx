import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import AxiosInstance from '../../contexts/axios';
import { useAuth } from '../../contexts/AuthContext';

type OrderItem = {
  id: string;
  product_name: string;
  quantity: number;
  price: number;
};

type OrderDetail = {
  order_id: string;
  status: string;
  total_amount: number;
  payment_method: string | null;
  delivery_address: string | null;
  created_at: string;
  user_name: string;
  items: OrderItem[];
};

export default function SellerViewOrderPage() {
  const { userId, shopId } = useAuth();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrder = useCallback(async () => {
    if (!id || !shopId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await AxiosInstance.get('/seller-order-list/seller_view_order/', {
        params: { order_id: id, shop_id: shopId },
        headers: {
          'X-User-Id': userId || '',
          'X-Shop-Id': shopId || '',
        },
      });

      const payload = res.data?.data || res.data || {};
      const items = Array.isArray(payload.items) ? payload.items : [];

      setOrder({
        order_id: String(payload.order_id || id),
        status: String(payload.status || 'pending_shipment'),
        total_amount: Number(payload.total_amount || 0),
        payment_method: payload.payment_method || null,
        delivery_address: payload.delivery_address || null,
        created_at: String(payload.created_at || ''),
        user_name: String(payload.user?.first_name || payload.user?.username || 'Customer'),
        items: items.map((it: any) => ({
          id: String(it.id || it.cart_item?.id || Math.random()),
          product_name: String(it.cart_item?.product?.name || 'Product'),
          quantity: Number(it.quantity || it.cart_item?.quantity || 0),
          price: Number(it.total_amount || it.cart_item?.product?.price || 0),
        })),
      });
    } catch (err) {
      console.error('Failed to fetch order details:', err);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [id, shopId, userId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Order Details', headerTitleAlign: 'center', headerShadowVisible: false }} />
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#EE4D2D" /></View>
      ) : !order ? (
        <View style={styles.center}><Text style={styles.empty}>Order details unavailable.</Text></View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Text style={styles.heading}>Order #{order.order_id}</Text>
            <Text style={styles.meta}>Status: {order.status}</Text>
            <Text style={styles.meta}>Customer: {order.user_name}</Text>
            <Text style={styles.meta}>Payment: {order.payment_method || '-'}</Text>
            <Text style={styles.meta}>Address: {order.delivery_address || '-'}</Text>
            <Text style={styles.meta}>Total: PHP {order.total_amount.toLocaleString()}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.subheading}>Items</Text>
            {order.items.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <Text style={styles.itemName}>{item.product_name}</Text>
                <Text style={styles.itemMeta}>x{item.quantity}</Text>
                <Text style={styles.itemMeta}>PHP {item.price.toLocaleString()}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { color: '#94A3B8', fontWeight: '600' },
  content: { padding: 16, paddingBottom: 24 },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  heading: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
  subheading: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 8 },
  meta: { color: '#475569', fontSize: 12, marginBottom: 4 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  itemName: { flex: 1, color: '#0F172A', fontWeight: '600', marginRight: 8 },
  itemMeta: { color: '#475569', fontSize: 12, fontWeight: '600' },
  backBtn: { height: 44, borderRadius: 10, backgroundColor: '#EE4D2D', alignItems: 'center', justifyContent: 'center' },
  backText: { color: '#FFFFFF', fontWeight: '800' },
});
