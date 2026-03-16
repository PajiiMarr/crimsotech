import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { CheckCircle2, CircleX, Hourglass } from 'lucide-react-native';
import CustomerLayout from './CustomerLayout';

type DecisionStatus = 'approved' | 'rejected' | 'under_review';

const STATUS_CONFIG: Record<DecisionStatus, { title: string; subtitle: string; color: string; bgColor: string; icon: any }> = {
  approved: {
    title: 'Refund Approved',
    subtitle: 'Your request has been approved. You may proceed to item return if required.',
    color: '#047857',
    bgColor: '#ECFDF5',
    icon: CheckCircle2,
  },
  rejected: {
    title: 'Refund Rejected',
    subtitle: 'Your request was rejected based on review findings and policy checks.',
    color: '#B91C1C',
    bgColor: '#FEF2F2',
    icon: CircleX,
  },
  under_review: {
    title: 'Decision Pending',
    subtitle: 'Your dispute is still under review. Please check back soon.',
    color: '#B45309',
    bgColor: '#FFFBEB',
    icon: Hourglass,
  },
};

export default function DecisionPage() {
  const params = useLocalSearchParams<{ orderId?: string; refundId?: string; status?: string; needsReturn?: string }>();
  const status = ((params.status || 'under_review').toLowerCase() as DecisionStatus);
  const resolvedStatus: DecisionStatus = STATUS_CONFIG[status] ? status : 'under_review';
  const config = STATUS_CONFIG[resolvedStatus];
  const Icon = config.icon;
  const needsReturn = (params.needsReturn || '').toLowerCase() === 'true';

  return (
    <SafeAreaView style={styles.safeArea}>
      <CustomerLayout disableScroll>
        <View style={styles.container}>
          <View style={[styles.banner, { backgroundColor: config.bgColor }]}> 
            <Icon size={48} color={config.color} />
            <Text style={[styles.title, { color: config.color }]}>{config.title}</Text>
            <Text style={styles.subtitle}>{config.subtitle}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Summary</Text>
            <Text style={styles.metaText}>Order: #{params.orderId || 'N/A'}</Text>
            <Text style={styles.metaText}>Refund Request: #{params.refundId || 'N/A'}</Text>
          </View>

          {resolvedStatus === 'approved' && needsReturn && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push(`/customer/process-return-item?orderId=${params.orderId || ''}&refundId=${params.refundId || ''}`)}
            >
              <Text style={styles.primaryButtonText}>Process Return Item</Text>
            </TouchableOpacity>
          )}
        </View>
      </CustomerLayout>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  container: { flex: 1, padding: 16, gap: 12 },
  banner: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    alignItems: 'center',
  },
  title: { marginTop: 10, fontSize: 20, fontWeight: '800' },
  subtitle: { marginTop: 8, fontSize: 13, color: '#4B5563', textAlign: 'center' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 8 },
  metaText: { color: '#6B7280', fontSize: 13, marginBottom: 4 },
  primaryButton: {
    backgroundColor: '#F97316',
    borderRadius: 10,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
