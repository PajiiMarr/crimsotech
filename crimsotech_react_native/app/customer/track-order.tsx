import React, { useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { CheckCircle2, Circle, Truck, Package, Clock3 } from 'lucide-react-native';
import CustomerLayout from './CustomerLayout';

const STEPS = [
  { key: 'placed', label: 'Order Placed', icon: Clock3 },
  { key: 'processing', label: 'Processing', icon: Package },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle2 },
] as const;

const getProgressIndex = (status?: string): number => {
  const normalized = (status || '').toLowerCase();
  if (normalized.includes('delivered') || normalized.includes('completed')) return 3;
  if (normalized.includes('ship') || normalized.includes('transit')) return 2;
  if (normalized.includes('process') || normalized.includes('confirm') || normalized.includes('pack')) return 1;
  return 0;
};

export default function TrackOrderPage() {
  const params = useLocalSearchParams<{ orderId?: string; status?: string }>();
  const orderId = params.orderId || '';

  const progressIndex = useMemo(() => getProgressIndex(params.status), [params.status]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <CustomerLayout disableScroll>
        <View style={styles.container}>
          <Text style={styles.title}>Track Order</Text>
          <Text style={styles.subtitle}>Order #{orderId || 'N/A'}</Text>

          <View style={styles.card}>
            {STEPS.map((step, index) => {
              const done = index <= progressIndex;
              const Icon = step.icon;

              return (
                <View key={step.key} style={styles.stepRow}>
                  <View style={styles.iconWrap}>
                    {done ? <Icon size={18} color="#10B981" /> : <Circle size={16} color="#9CA3AF" />}
                  </View>
                  <View style={styles.stepTextWrap}>
                    <Text style={[styles.stepLabel, done && styles.stepDone]}>{step.label}</Text>
                    {index < STEPS.length - 1 && <View style={[styles.stepLine, done && styles.stepLineDone]} />}
                  </View>
                </View>
              );
            })}
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push(`/customer/view-order?orderId=${orderId}`)}
            disabled={!orderId}
          >
            <Text style={styles.primaryButtonText}>View Order Details</Text>
          </TouchableOpacity>
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
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', minHeight: 56 },
  iconWrap: { width: 26, alignItems: 'center', paddingTop: 2 },
  stepTextWrap: { flex: 1 },
  stepLabel: { fontSize: 14, color: '#374151', fontWeight: '600' },
  stepDone: { color: '#10B981' },
  stepLine: {
    marginTop: 8,
    width: 2,
    height: 28,
    backgroundColor: '#E5E7EB',
    marginLeft: 1,
  },
  stepLineDone: { backgroundColor: '#10B981' },
  primaryButton: {
    marginTop: 16,
    backgroundColor: '#F97316',
    borderRadius: 10,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
