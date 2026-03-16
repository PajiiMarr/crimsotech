import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ban, MessageCircleWarning } from 'lucide-react-native';
import CustomerLayout from './CustomerLayout';

export default function ViewCancelledOrderPage() {
  const params = useLocalSearchParams<{ orderId?: string; reason?: string }>();
  const orderId = params.orderId || '';
  const reason = params.reason || 'The order was cancelled by the system or seller.';

  return (
    <SafeAreaView style={styles.safeArea}>
      <CustomerLayout disableScroll>
        <View style={styles.container}>
          <View style={styles.card}>
            <Ban size={52} color="#EF4444" />
            <Text style={styles.title}>Order Cancelled</Text>
            <Text style={styles.subtitle}>Order #{orderId || 'N/A'}</Text>

            <View style={styles.reasonBox}>
              <MessageCircleWarning size={16} color="#B45309" />
              <Text style={styles.reasonText}>{reason}</Text>
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push('/customer/purchases?tab=all')}
            >
              <Text style={styles.primaryButtonText}>Back to Purchases</Text>
            </TouchableOpacity>
          </View>
        </View>
      </CustomerLayout>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  container: { flex: 1, padding: 16 },
  card: {
    marginTop: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    padding: 16,
    alignItems: 'center',
  },
  title: { marginTop: 10, fontSize: 20, fontWeight: '800', color: '#111827' },
  subtitle: { marginTop: 6, fontSize: 13, color: '#6B7280' },
  reasonBox: {
    marginTop: 14,
    width: '100%',
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    gap: 8,
  },
  reasonText: { flex: 1, color: '#92400E', fontSize: 13, lineHeight: 18 },
  primaryButton: {
    marginTop: 14,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
