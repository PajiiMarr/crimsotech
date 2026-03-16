import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import AxiosInstance from '../../contexts/axios';

type Delivery = {
  id: string;
  status: string;
  proofs_count?: number;
  time_elapsed?: string;
  picked_at?: string | null;
  delivered_at?: string | null;
  order: {
    order_id: string;
    total_amount: number;
    payment_method: string;
    delivery_method: string;
    created_at: string;
    customer: {
      first_name: string;
      last_name: string;
      contact_number: string;
    };
    shipping_address?: {
      recipient_name?: string;
      recipient_phone?: string;
      full_address?: string;
      city?: string;
      province?: string;
    };
  };
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  pending_offer: 'Pending Offer',
  accepted: 'Accepted',
  picked_up: 'In Transit',
  delivered: 'Delivered',
  declined: 'Declined',
};

export default function ActiveOrderDetails() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{ deliveryId?: string }>();
  const deliveryId = params.deliveryId ? String(params.deliveryId) : '';

  const [loading, setLoading] = useState(true);
  const [delivery, setDelivery] = useState<Delivery | null>(null);

  const formatDate = (value?: string | null) => {
    if (!value) return 'N/A';
    try {
      return new Date(value).toLocaleString();
    } catch {
      return value;
    }
  };

  const formatCurrency = (amount?: number) => {
    const safe = Number(amount || 0);
    return `P${safe.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  };

  const fetchDetails = async () => {
    if (!deliveryId || !user?.user_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await AxiosInstance.get('/rider-orders-active/get_deliveries/?page=1&page_size=100&status=all', {
        headers: {
          'X-User-Id': user.user_id,
        },
      });

      const list: Delivery[] = response.data?.deliveries || [];
      const found = list.find((item) => String(item.id) === deliveryId);
      setDelivery(found || null);
    } catch (error) {
      console.error('Failed to fetch active order details:', error);
      Alert.alert('Error', 'Unable to load order details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [deliveryId, user?.user_id]);

  const statusText = useMemo(() => {
    const key = String(delivery?.status || '').toLowerCase();
    return STATUS_LABELS[key] || 'Unknown';
  }, [delivery?.status]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="small" color="#2563EB" />
      </SafeAreaView>
    );
  }

  if (!delivery) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
        <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 6, marginRight: 8 }}>
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>Order Details</Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center' }}>Order not found or no longer assigned.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <View style={{ paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: '#FFFFFF' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 6, marginRight: 8 }}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>Order Details</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', padding: 14, marginBottom: 12 }}>
          <Text style={{ fontSize: 12, color: '#6B7280' }}>Order ID</Text>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginTop: 2 }}>#{delivery.order.order_id}</Text>
          <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 6 }}>Status: {statusText}</Text>
          <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Elapsed: {delivery.time_elapsed || 'N/A'}</Text>
        </View>

        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', padding: 14, marginBottom: 12 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 8 }}>Customer</Text>
          <Text style={{ fontSize: 13, color: '#374151' }}>{delivery.order.customer.first_name} {delivery.order.customer.last_name}</Text>
          <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>{delivery.order.customer.contact_number || 'No contact number'}</Text>
        </View>

        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', padding: 14, marginBottom: 12 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 8 }}>Delivery Address</Text>
          <Text style={{ fontSize: 13, color: '#374151' }}>{delivery.order.shipping_address?.full_address || 'No address available'}</Text>
          <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
            Recipient: {delivery.order.shipping_address?.recipient_name || 'N/A'} ({delivery.order.shipping_address?.recipient_phone || 'N/A'})
          </Text>
        </View>

        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', padding: 14 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 8 }}>Payment & Timeline</Text>
          <Text style={{ fontSize: 12, color: '#374151' }}>Amount: {formatCurrency(delivery.order.total_amount)}</Text>
          <Text style={{ fontSize: 12, color: '#374151', marginTop: 4 }}>Payment: {delivery.order.payment_method || 'N/A'}</Text>
          <Text style={{ fontSize: 12, color: '#374151', marginTop: 4 }}>Method: {delivery.order.delivery_method || 'N/A'}</Text>
          <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 8 }}>Created: {formatDate(delivery.order.created_at)}</Text>
          <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>Picked Up: {formatDate(delivery.picked_at)}</Text>
          <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>Delivered: {formatDate(delivery.delivered_at)}</Text>
          <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>Proofs: {delivery.proofs_count || 0}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
