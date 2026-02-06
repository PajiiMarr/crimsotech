import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Copy, Truck, CheckCircle2, XCircle, Clock, RotateCcw, Box, Hourglass } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import AxiosInstance from '../../contexts/axios';

export default function ViewRefundPage() {
  const { user } = useAuth();
  const { refundId } = useLocalSearchParams();
  const router = useRouter();
  const [refund, setRefund] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRefund();
  }, [refundId, user?.id]);

  const fetchRefund = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const resp = await AxiosInstance.get('/return-refund/get_my_refunds/', { headers: { 'X-User-Id': user.id } });
      const list = Array.isArray(resp.data) ? resp.data : (resp?.data?.results || []);
      const found = list.find((r: any) => String(r.refund_id || r.id) === String(refundId));
      setRefund(found || null);
    } catch (err) {
      console.error('Failed to fetch refund', err);
      setRefund(null);
    } finally {
      setLoading(false);
    }
  };

  const statusBanner = (status: string | undefined) => {
    switch ((status || '').toUpperCase()) {
      case 'PENDING': return { title: 'Refund Pending', subtitle: 'Waiting for seller to review your request', color: '#F59E0B', Icon: Clock };
      case 'APPROVED': return { title: 'Refund Approved', subtitle: 'Seller approved this refund', color: '#10B981', Icon: CheckCircle2 };
      case 'REJECTED': return { title: 'Refund Rejected', subtitle: 'Seller rejected the request', color: '#EF4444', Icon: XCircle };
      case 'PROCESSING': return { title: 'Processing Refund', subtitle: 'Funds are being transferred', color: '#3B82F6', Icon: RotateCcw };
      case 'RETURN_SHIP': return { title: 'Return Shipping', subtitle: 'Your parcel has been picked up', color: '#3B82F6', Icon: Truck };
      case 'RETURN_ACCEPTED': return { title: 'Return Accepted', subtitle: 'Please ship the item back now', color: '#10B981', Icon: Box };
      default: return { title: status || 'Unknown', subtitle: '', color: '#6B7280', Icon: Hourglass };
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}><ActivityIndicator size="large" color="#F97316" /></SafeAreaView>
    );
  }

  if (!refund) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}><TouchableOpacity onPress={() => router.back()}><ArrowLeft color="#000" size={20} /></TouchableOpacity><Text style={styles.headerTitle}>Refund Detail</Text><View style={{ width: 24 }} /></View>
        <View style={styles.empty}><Text style={styles.emptyText}>Refund information not found.</Text></View>
      </SafeAreaView>
    );
  }

  const banner = statusBanner(refund.status);
  const item = (refund.order_items && refund.order_items[0]) || refund.product || {};
  const imageUrl = (item.primary_image && item.primary_image.url) || item.image || null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><ArrowLeft color="#000" size={20} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Refund Detail</Text>
        <TouchableOpacity onPress={() => {}}><Copy color="#000" size={18} /></TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 12 }}>
        <View style={[styles.banner, { backgroundColor: '#FFF', borderLeftColor: banner.color }]}> 
          <banner.Icon size={24} color={banner.color} />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={[styles.bannerTitle, { color: '#111827' }]}>{banner.title}</Text>
            <Text style={styles.bannerSubtitle}>{banner.subtitle}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.productRow}>
            <Image source={imageUrl ? { uri: imageUrl } : require('../../assets/images/icon.png')} style={styles.thumb} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.productName}>{item.product_name || item.name || refund.title || 'Product'}</Text>
              <Text style={styles.productMeta}>Qty: {item.quantity || item.qty || 1}</Text>
              <Text style={styles.productMeta}>Refund: {refund.refund_amount || refund.refund_total || ''}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.rowBetween}><Text style={styles.metaLabel}>Order Number</Text><Text style={styles.metaValue}>{String(refund.order?.order_id || refund.order || refund.order_id || '-')}</Text></View>
          <View style={styles.rowBetween}><Text style={styles.metaLabel}>Request Date</Text><Text style={styles.metaValue}>{String(refund.created_at || refund.requested_at || refund.request_date || '')}</Text></View>
          <View style={styles.rowBetween}><Text style={styles.metaLabel}>Reason</Text><Text style={styles.metaValue}>{String(refund.reason || refund.customer_note || refund.reason_text || '-')}</Text></View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.sectionText}>{refund.admin_note || refund.seller_note || refund.note || 'No additional notes.'}</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  scroll: { flex: 1 },
  banner: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 8, borderLeftWidth: 4, marginBottom: 12, backgroundColor: '#FFF' },
  bannerTitle: { fontSize: 16, fontWeight: '700' },
  bannerSubtitle: { fontSize: 13, color: '#666', marginTop: 4 },
  section: { backgroundColor: '#FFF', padding: 12, marginBottom: 12, borderRadius: 8 },
  productRow: { flexDirection: 'row', alignItems: 'center' },
  thumb: { width: 64, height: 64, borderRadius: 6, backgroundColor: '#EEE' },
  productName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  productMeta: { fontSize: 13, color: '#6B7280', marginTop: 6 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  metaLabel: { fontSize: 13, color: '#999' },
  metaValue: { fontSize: 13, color: '#333', fontWeight: '600' },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  sectionText: { fontSize: 13, color: '#666' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { color: '#9CA3AF' }
});
