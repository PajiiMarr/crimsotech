import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import AxiosInstance from '../../contexts/axios';

const formatCurrency = (amount: number) =>
  `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function RemitAmount() {
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toRemit, setToRemit] = useState(0);
  const [deliveriesCount, setDeliveriesCount] = useState(0);
  const [formattedDate, setFormattedDate] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchTodayData = async () => {
    try {
      setIsLoading(true);
      const today = new Date();
      const startDate = today.toISOString().split('T')[0];

      const response = await AxiosInstance.get(
        `/rider-history/order_history/?start_date=${startDate}&end_date=${startDate}`,
        { headers: { 'X-User-Id': user?.user_id || user?.id } }
      );

      if (response.data?.success) {
        const deliveries = response.data.deliveries || [];
        const delivered = deliveries.filter((d: any) => d.status === 'delivered');
        const totalCollected = delivered.reduce(
          (sum: number, d: any) => sum + (d.order_amount || 0),
          0
        );
        const totalEarnings = delivered.reduce(
          (sum: number, d: any) => sum + (d.delivery_fee || 0),
          0
        );
        setToRemit(Math.max(0, totalCollected - totalEarnings));
        setDeliveriesCount(delivered.length);
        setFormattedDate(
          today.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })
        );
      }
    } catch (error) {
      console.error('Error fetching remittance data:', error);
      Alert.alert('Error', 'Failed to load remittance data. Please try again.');
    } finally {
      setIsLoading(false);
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

  const handleConfirmRemit = () => {
    setSubmitting(true);
    setTimeout(() => {
      const ref = 'REM' + Math.random().toString(36).substring(2, 10).toUpperCase();
      setReferenceNumber(ref);
      setShowConfirmDialog(false);
      setShowSuccessDialog(true);
      setSubmitting(false);
    }, 1500);
  };

  if (isLoading) {
    return (
      <SafeAreaView
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' }}
      >
        <ActivityIndicator size="large" color="#EA580C" />
        <Text style={{ marginTop: 12, color: '#6B7280', fontSize: 14 }}>Loading remittance data...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      {/* Header */}
      <View style={{ backgroundColor: '#EA580C', paddingTop: 4, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 4, marginRight: 12 }}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: '600', color: 'white' }}>Remit Amount</Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {toRemit > 0 ? (
          <View
            style={{
              backgroundColor: 'white',
              borderRadius: 16,
              padding: 24,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            {/* Date */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
                paddingBottom: 16,
                borderBottomWidth: 1,
                borderBottomColor: '#F3F4F6',
              }}
            >
              <Ionicons name="calendar-outline" size={16} color="#EA580C" />
              <Text style={{ marginLeft: 6, fontSize: 13, color: '#6B7280' }}>{formattedDate}</Text>
            </View>

            {/* Amount */}
            <View style={{ alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 10 }}>Amount to Remit</Text>
              <Text style={{ fontSize: 42, fontWeight: '700', color: '#EA580C' }}>
                {formatCurrency(toRemit)}
              </Text>
            </View>

            {/* Delivery Count */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 28,
              }}
            >
              <Ionicons name="time-outline" size={14} color="#9CA3AF" />
              <Text style={{ fontSize: 12, color: '#9CA3AF', marginLeft: 4 }}>
                Based on {deliveriesCount} completed{' '}
                {deliveriesCount === 1 ? 'delivery' : 'deliveries'}
              </Text>
            </View>

            {/* Remit Button */}
            <TouchableOpacity
              onPress={() => setShowConfirmDialog(true)}
              style={{
                backgroundColor: '#EA580C',
                borderRadius: 12,
                paddingVertical: 14,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="send" size={18} color="white" />
              <Text style={{ fontSize: 15, fontWeight: '600', color: 'white', marginLeft: 8 }}>
                Remit Now
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View
            style={{
              backgroundColor: 'white',
              borderRadius: 16,
              padding: 40,
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <View
              style={{
                backgroundColor: '#FFF7ED',
                width: 64,
                height: 64,
                borderRadius: 32,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <Ionicons name="time-outline" size={32} color="#EA580C" />
            </View>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
              No amount to remit today
            </Text>
            <Text style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginBottom: 24 }}>
              Complete deliveries today to see your remittance amount
            </Text>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{
                borderWidth: 1,
                borderColor: '#FDDCB5',
                borderRadius: 10,
                paddingVertical: 10,
                paddingHorizontal: 24,
              }}
            >
              <Text style={{ fontSize: 14, color: '#EA580C' }}>Go Back</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Confirm Dialog */}
      <Modal
        visible={showConfirmDialog}
        transparent
        animationType="fade"
        onRequestClose={() => !submitting && setShowConfirmDialog(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: 'white',
              borderRadius: 20,
              padding: 24,
              width: '100%',
              maxWidth: 340,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 4 }}>
              Confirm Remittance
            </Text>
            <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 20 }}>
              Are you sure you want to remit this amount?
            </Text>
            <View
              style={{
                backgroundColor: '#FFF7ED',
                borderRadius: 12,
                padding: 16,
                alignItems: 'center',
                marginBottom: 20,
              }}
            >
              <Text style={{ fontSize: 12, color: '#EA580C', marginBottom: 4 }}>Amount to Remit</Text>
              <Text style={{ fontSize: 28, fontWeight: '700', color: '#C2410C' }}>
                {formatCurrency(toRemit)}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => setShowConfirmDialog(false)}
                disabled={submitting}
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                  borderRadius: 10,
                  paddingVertical: 12,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 14, color: '#6B7280' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmRemit}
                disabled={submitting}
                style={{
                  flex: 1,
                  backgroundColor: '#EA580C',
                  borderRadius: 10,
                  paddingVertical: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                }}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={{ fontSize: 14, fontWeight: '600', color: 'white' }}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Dialog */}
      <Modal visible={showSuccessDialog} transparent animationType="fade" onRequestClose={() => {}}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: 'white',
              borderRadius: 20,
              padding: 24,
              width: '100%',
              maxWidth: 340,
              alignItems: 'center',
            }}
          >
            <View
              style={{
                backgroundColor: '#D1FAE5',
                width: 64,
                height: 64,
                borderRadius: 32,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <Ionicons name="checkmark-circle" size={36} color="#059669" />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 6 }}>
              Remittance Successful
            </Text>
            <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 20 }}>
              Your remittance has been processed
            </Text>
            <View
              style={{
                backgroundColor: '#F3F4F6',
                borderRadius: 10,
                padding: 14,
                width: '100%',
                marginBottom: 20,
              }}
            >
              <Text style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>Reference Number</Text>
              <Text style={{ fontSize: 15, color: '#111827', fontWeight: '600', letterSpacing: 1 }}>
                {referenceNumber}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => {
                setShowSuccessDialog(false);
                router.push('/rider/earnings');
              }}
              style={{
                backgroundColor: '#059669',
                borderRadius: 10,
                paddingVertical: 13,
                width: '100%',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '600', color: 'white' }}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
