import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ClipboardCheck, Star, ArrowRight } from 'lucide-react-native';
import CustomerLayout from './CustomerLayout';

export default function OrderReviewPage() {
  const params = useLocalSearchParams<{ orderId?: string; productId?: string; productName?: string }>();
  const orderId = params.orderId || '';
  const productId = params.productId || '';

  return (
    <SafeAreaView style={styles.safeArea}>
      <CustomerLayout disableScroll>
        <View style={styles.container}>
          <Text style={styles.title}>Order Review</Text>
          <Text style={styles.subtitle}>Review your completed item and leave feedback.</Text>

          <View style={styles.card}>
            <View style={styles.row}>
              <ClipboardCheck size={18} color="#3B82F6" />
              <Text style={styles.rowText}>Order #{orderId || 'N/A'}</Text>
            </View>
            <View style={styles.row}>
              <Star size={18} color="#F59E0B" />
              <Text style={styles.rowText}>{params.productName || productId || 'Selected Product'}</Text>
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push(`/customer/product-rate?orderId=${orderId}&productId=${productId}&productName=${encodeURIComponent(params.productName || '')}`)}
            >
              <Text style={styles.primaryButtonText}>Continue to Rating</Text>
              <ArrowRight size={16} color="#FFFFFF" />
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
  title: { fontSize: 22, fontWeight: '800', color: '#111827' },
  subtitle: { marginTop: 6, fontSize: 13, color: '#6B7280' },
  card: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
  },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  rowText: { marginLeft: 8, color: '#374151', fontWeight: '600' },
  primaryButton: {
    marginTop: 8,
    backgroundColor: '#F97316',
    minHeight: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
