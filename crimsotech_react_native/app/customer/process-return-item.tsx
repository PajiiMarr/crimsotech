import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { PackageCheck, ClipboardList, MapPin, CheckCircle2 } from 'lucide-react-native';
import CustomerLayout from './CustomerLayout';

export default function ProcessReturnItemPage() {
  const params = useLocalSearchParams<{ orderId?: string; refundId?: string }>();
  const [confirmed, setConfirmed] = useState(false);

  const confirmReady = () => {
    setConfirmed(true);
    Alert.alert('Confirmed', 'Return preparation marked as ready.');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <CustomerLayout disableScroll>
        <View style={styles.container}>
          <Text style={styles.title}>Process Return Item</Text>
          <Text style={styles.subtitle}>Refund #{params.refundId || 'N/A'} • Order #{params.orderId || 'N/A'}</Text>

          <View style={styles.card}>
            <View style={styles.stepRow}>
              <ClipboardList size={18} color="#3B82F6" />
              <Text style={styles.stepText}>1. Repack item with all accessories.</Text>
            </View>
            <View style={styles.stepRow}>
              <MapPin size={18} color="#3B82F6" />
              <Text style={styles.stepText}>2. Attach return label or booking reference.</Text>
            </View>
            <View style={styles.stepRow}>
              <PackageCheck size={18} color="#3B82F6" />
              <Text style={styles.stepText}>3. Hand over to courier or drop-off point.</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={confirmReady}>
            <Text style={styles.primaryButtonText}>Mark as Ready for Return</Text>
          </TouchableOpacity>

          {confirmed && (
            <TouchableOpacity
              style={styles.successButton}
              onPress={() => router.push(`/customer/view-refund?orderId=${params.orderId || ''}`)}
            >
              <CheckCircle2 size={16} color="#047857" />
              <Text style={styles.successButtonText}>Go to Refund Details</Text>
            </TouchableOpacity>
          )}
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
    borderColor: '#E5E7EB',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepText: { color: '#374151', fontSize: 13, fontWeight: '500', flex: 1 },
  primaryButton: {
    marginTop: 14,
    backgroundColor: '#F97316',
    borderRadius: 10,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  successButton: {
    marginTop: 10,
    backgroundColor: '#ECFDF5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  successButtonText: { color: '#047857', fontWeight: '700', fontSize: 14 },
});
