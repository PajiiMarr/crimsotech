import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import AxiosInstance from '../../contexts/axios';
import { useAuth } from '../../contexts/AuthContext';

type BoostDetail = {
  id: string;
  status: string;
  payment_method?: string;
  payment_verified?: boolean;
  has_receipt?: boolean;
  receipt_url?: string;
  start_date?: string;
  end_date?: string;
  created_at?: string;
  days_remaining?: number;
  product?: { name?: string; condition?: string; status?: string };
  shop?: { name?: string; city?: string; province?: string };
  plan?: { name?: string; price?: number; duration?: number; time_unit?: string };
  verification?: { verified?: boolean; verified_at?: string; verified_by?: string };
};

export default function BoostDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId, shopId } = useAuth();

  const [loading, setLoading] = useState(true);
  const [boost, setBoost] = useState<BoostDetail | null>(null);

  useEffect(() => {
    const fetchBoost = async () => {
      if (!id || !userId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await AxiosInstance.get(`/seller-boosts/user/${userId}/`, {
          params: { status: 'all' },
          headers: {
            'X-User-Id': userId || '',
            'X-Shop-Id': shopId || '',
          },
        });

        const list = Array.isArray(res.data?.boosts) ? res.data.boosts : [];
        const found = list.find((b: any) => String(b.id) === String(id));
        setBoost(found || null);
      } catch (err) {
        console.error('Failed to fetch boost details:', err);
        setBoost(null);
      } finally {
        setLoading(false);
      }
    };

    fetchBoost();
  }, [id, userId, shopId]);

  const statusColor = useMemo(() => {
    const status = (boost?.status || '').toLowerCase();
    if (status === 'active') return '#16A34A';
    if (status === 'pending') return '#D97706';
    if (status === 'expired') return '#6B7280';
    if (status === 'cancelled') return '#DC2626';
    return '#6B7280';
  }, [boost?.status]);

  const formatDate = (value?: string) => {
    if (!value) return '-';
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return '-';
    return dt.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const openReceipt = async () => {
    if (!boost?.receipt_url) return;

    try {
      const supported = await Linking.canOpenURL(boost.receipt_url);
      if (!supported) {
        Alert.alert('Cannot Open Link', 'Receipt URL is not supported on this device.');
        return;
      }
      await Linking.openURL(boost.receipt_url);
    } catch {
      Alert.alert('Error', 'Unable to open receipt URL.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Boost Details</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#EE4D2D" />
        </View>
      </SafeAreaView>
    );
  }

  if (!boost) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Boost Details</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={38} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>Boost not found</Text>
          <Text style={styles.emptyText}>This boost may have been removed or is unavailable.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Boost Details</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.topRow}>
            <Text style={styles.productName}>{boost.product?.name || 'Boosted Product'}</Text>
            <Text style={[styles.status, { color: statusColor }]}>{(boost.status || 'unknown').toUpperCase()}</Text>
          </View>
          <Text style={styles.meta}>{boost.plan?.name || 'Boost Plan'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Plan Information</Text>
          <InfoRow label="Plan" value={boost.plan?.name || '-'} />
          <InfoRow label="Price" value={`PHP ${Number(boost.plan?.price || 0).toLocaleString()}`} />
          <InfoRow
            label="Duration"
            value={boost.plan?.duration ? `${boost.plan.duration} ${boost.plan.time_unit || 'days'}` : '-'}
          />
          <InfoRow label="Days Remaining" value={String(boost.days_remaining ?? 0)} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Timeline</Text>
          <InfoRow label="Created" value={formatDate(boost.created_at)} />
          <InfoRow label="Start Date" value={formatDate(boost.start_date)} />
          <InfoRow label="End Date" value={formatDate(boost.end_date)} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Payment</Text>
          <InfoRow label="Method" value={boost.payment_method || '-'} />
          <InfoRow label="Verified" value={boost.payment_verified ? 'Yes' : 'No'} />
          <InfoRow label="Has Receipt" value={boost.has_receipt ? 'Yes' : 'No'} />
          {boost.verification?.verified_at ? (
            <InfoRow label="Verified At" value={formatDate(boost.verification.verified_at)} />
          ) : null}
          {boost.verification?.verified_by ? (
            <InfoRow label="Verified By" value={boost.verification.verified_by} />
          ) : null}

          {boost.has_receipt && boost.receipt_url ? (
            <TouchableOpacity style={styles.receiptBtn} onPress={openReceipt}>
              <Ionicons name="document-text-outline" size={16} color="#EE4D2D" />
              <Text style={styles.receiptBtnText}>View Receipt</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1F2937' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { marginTop: 10, fontSize: 15, fontWeight: '700', color: '#1F2937' },
  emptyText: { marginTop: 6, fontSize: 12, color: '#6B7280' },
  content: { padding: 16, paddingBottom: 28 },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  productName: { flex: 1, marginRight: 8, fontSize: 15, fontWeight: '700', color: '#1F2937' },
  status: { fontSize: 11, fontWeight: '800' },
  meta: { marginTop: 6, fontSize: 12, color: '#6B7280' },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#1F2937', marginBottom: 8 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingVertical: 8,
  },
  infoLabel: { fontSize: 12, color: '#6B7280' },
  infoValue: { fontSize: 12, fontWeight: '600', color: '#1F2937', maxWidth: '60%', textAlign: 'right' },
  receiptBtn: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EE4D2D',
    borderRadius: 10,
    paddingVertical: 10,
    gap: 6,
  },
  receiptBtnText: { fontSize: 13, fontWeight: '700', color: '#EE4D2D' },
});
