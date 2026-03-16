import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { BadgeCheck, Star } from 'lucide-react-native';
import CustomerLayout from './CustomerLayout';

export default function ViewCompletedOrderPage() {
  const params = useLocalSearchParams<{ orderId?: string; productId?: string }>();
  const orderId = params.orderId || '';
  const productId = params.productId || '';

  return (
    <SafeAreaView style={styles.safeArea}>
      <CustomerLayout disableScroll>
        <View style={styles.container}>
          <View style={styles.hero}>
            <BadgeCheck size={56} color="#10B981" />
            <Text style={styles.title}>Order Completed</Text>
            <Text style={styles.subtitle}>Order #{orderId || 'N/A'} was delivered successfully.</Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push(`/customer/product-rate?orderId=${orderId}&productId=${productId}`)}
            >
              <Star size={16} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Rate This Order</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push(`/customer/view-order?orderId=${orderId}`)}
            >
              <Text style={styles.secondaryButtonText}>View Full Details</Text>
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
  hero: {
    marginTop: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1FAE5',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
  },
  title: { marginTop: 10, fontSize: 20, fontWeight: '800', color: '#111827' },
  subtitle: { marginTop: 6, textAlign: 'center', fontSize: 13, color: '#6B7280' },
  actions: { marginTop: 16, gap: 10 },
  primaryButton: {
    backgroundColor: '#F97316',
    minHeight: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    minHeight: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: { color: '#374151', fontWeight: '700', fontSize: 14 },
});
