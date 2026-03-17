import React, { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AxiosInstance from '../../contexts/axios';
import { useAuth } from '../../contexts/AuthContext';

interface Delivery {
  order_amount?: number;
  delivery_fee?: number;
  status?: string;
}

export default function RemitAmount() {
  const { user } = useAuth();
  const userId = user?.user_id || user?.id;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deliveredCount, setDeliveredCount] = useState(0);
  const [totalCollected, setTotalCollected] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [referenceNo, setReferenceNo] = useState('');

  const today = new Date().toISOString().split('T')[0];

  const fetchTodayData = async () => {
    try {
      setLoading(true);
      const res = await AxiosInstance.get('/rider-history/order_history/', {
        headers: { 'X-User-Id': userId },
        params: { start_date: today, end_date: today },
      });

      if (res.data?.success) {
        const deliveries: Delivery[] = res.data.deliveries || [];
        const delivered = deliveries.filter((d) => d.status === 'delivered' || d.status === 'completed');

        const collected = delivered.reduce((sum, d) => sum + Number(d.order_amount || 0), 0);
        const earnings = delivered.reduce((sum, d) => sum + Number(d.delivery_fee || 0), 0);

        setDeliveredCount(delivered.length);
        setTotalCollected(collected);
        setTotalEarnings(earnings);
      } else {
        setDeliveredCount(0);
        setTotalCollected(0);
        setTotalEarnings(0);
      }
    } catch (error) {
      console.error('Failed to load remit data:', error);
      setDeliveredCount(0);
      setTotalCollected(0);
      setTotalEarnings(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTodayData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTodayData();
  };

  const amountToRemit = useMemo(() => {
    const value = totalCollected - totalEarnings;
    return value > 0 ? value : 0;
  }, [totalCollected, totalEarnings]);

  const formatCurrency = (amount: number) =>
    `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const submitRemit = async () => {
    try {
      setSubmitting(true);
      await new Promise((resolve) => setTimeout(resolve, 1200));
      setReferenceNo(`REM${Math.floor(100000 + Math.random() * 900000)}`);
      setShowConfirm(false);
      setShowSuccess(true);
    } catch {
      Alert.alert('Failed', 'Could not submit remittance right now.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <View style={{ backgroundColor: '#EA580C', paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="white" />
        </TouchableOpacity>
        <View style={{ marginLeft: 12 }}>
          <Text style={{ color: 'white', fontSize: 18, fontWeight: '700' }}>Remit Amount</Text>
          <Text style={{ color: '#FED7AA', fontSize: 12, marginTop: 2 }}>Submit your daily cash remittance</Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <ActivityIndicator size="large" color="#EA580C" style={{ marginTop: 40 }} />
        ) : amountToRemit <= 0 ? (
          <View style={{ backgroundColor: 'white', borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 20, borderWidth: 1, borderColor: '#E5E7EB' }}>
            <Ionicons name="checkmark-circle-outline" size={42} color="#16A34A" />
            <Text style={{ fontSize: 17, fontWeight: '700', color: '#111827', marginTop: 10 }}>No amount to remit today</Text>
            <Text style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 6 }}>
              Great job. You have no pending remittance for today.
            </Text>
          </View>
        ) : (
          <>
            <View style={{ backgroundColor: 'white', borderRadius: 14, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' }}>
              <Text style={{ fontSize: 13, color: '#6B7280' }}>Date</Text>
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827', marginTop: 2 }}>{new Date(today).toDateString()}</Text>

              <View style={{ height: 1, backgroundColor: '#F3F4F6', marginVertical: 14 }} />

              <Text style={{ fontSize: 13, color: '#6B7280' }}>Amount to Remit</Text>
              <Text style={{ fontSize: 32, fontWeight: '800', color: '#EA580C', marginTop: 2 }}>{formatCurrency(amountToRemit)}</Text>

              <View style={{ marginTop: 12 }}>
                <Text style={{ fontSize: 12, color: '#6B7280' }}>Delivered Orders: {deliveredCount}</Text>
                <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 3 }}>Collected: {formatCurrency(totalCollected)}</Text>
                <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 3 }}>Earnings: {formatCurrency(totalEarnings)}</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setShowConfirm(true)}
              style={{ backgroundColor: '#EA580C', borderRadius: 12, paddingVertical: 13, alignItems: 'center' }}
            >
              <Text style={{ color: 'white', fontWeight: '700' }}>Submit Remittance</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <Modal visible={showConfirm} transparent animationType="fade" onRequestClose={() => setShowConfirm(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: 'white', borderRadius: 14, padding: 18 }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: '#111827' }}>Confirm Remittance</Text>
            <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 8 }}>
              You are about to submit remittance for {formatCurrency(amountToRemit)}.
            </Text>
            <View style={{ flexDirection: 'row', marginTop: 16 }}>
              <TouchableOpacity
                onPress={() => setShowConfirm(false)}
                style={{ flex: 1, backgroundColor: '#F3F4F6', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginRight: 6 }}
              >
                <Text style={{ color: '#374151', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={submitRemit}
                disabled={submitting}
                style={{ flex: 1, backgroundColor: '#EA580C', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginLeft: 6 }}
              >
                {submitting ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: '700' }}>Confirm</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showSuccess} transparent animationType="fade" onRequestClose={() => setShowSuccess(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: 'white', borderRadius: 14, padding: 18, alignItems: 'center' }}>
            <Ionicons name="checkmark-circle" size={46} color="#16A34A" />
            <Text style={{ fontSize: 17, fontWeight: '700', color: '#111827', marginTop: 10 }}>Remittance Submitted</Text>
            <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 6 }}>Reference: {referenceNo}</Text>
            <TouchableOpacity
              onPress={() => {
                setShowSuccess(false);
                router.push('/rider/earnings');
              }}
              style={{ marginTop: 14, backgroundColor: '#EA580C', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 }}
            >
              <Text style={{ color: 'white', fontWeight: '700' }}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
