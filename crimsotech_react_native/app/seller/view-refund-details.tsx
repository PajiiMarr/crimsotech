// app/seller/view-refund-details.tsx
import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, TextInput, Modal, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import AxiosInstance from '../../contexts/axios';
import { useAuth } from '../../contexts/AuthContext';

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  negotiation: '#8B5CF6',
  approved: '#10B981',
  waiting: '#6B7280',
  to_verify: '#3B82F6',
  to_process: '#0EA5E9',
  dispute: '#EF4444',
  completed: '#059669',
  rejected: '#DC2626',
  cancelled: '#9CA3AF',
};

export default function ViewRefundDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId, shopId } = useAuth();

  const [refund, setRefund] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    if (id) fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const res = await AxiosInstance.get(`/return-refund/${id}/`, {
        headers: { 'X-User-Id': userId || '', 'X-Shop-Id': shopId || '' },
      });
      setRefund(res.data?.refund || res.data);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to load refund details');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    Alert.alert('Approve Refund', 'Are you sure you want to approve this refund?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve', style: 'default',
        onPress: async () => {
          try {
            setActionLoading(true);
            await AxiosInstance.post(`/return-refund/${id}/approve_refund/`, {}, {
              headers: { 'X-User-Id': userId || '', 'X-Shop-Id': shopId || '' },
            });
            Alert.alert('Success', 'Refund approved successfully');
            fetchDetail();
          } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.error || 'Failed to approve refund');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      Alert.alert('Required', 'Please provide a reason for rejection');
      return;
    }
    try {
      setActionLoading(true);
      await AxiosInstance.post(`/return-refund/${id}/reject_refund/`, { reason: rejectReason }, {
        headers: { 'X-User-Id': userId || '', 'X-Shop-Id': shopId || '' },
      });
      Alert.alert('Success', 'Refund rejected');
      setShowRejectModal(false);
      setRejectReason('');
      fetchDetail();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to reject refund');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendResponse = async () => {
    if (!responseText.trim()) return;
    try {
      setActionLoading(true);
      await AxiosInstance.post(`/return-refund/${id}/add_seller_response/`, { response: responseText }, {
        headers: { 'X-User-Id': userId || '', 'X-Shop-Id': shopId || '' },
      });
      Alert.alert('Success', 'Response sent to customer');
      setShowResponseModal(false);
      setResponseText('');
      fetchDetail();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to send response');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFileDispute = () => {
    router.push(`/seller/file-dispute?refundId=${id}` as any);
  };

  const statusColor = STATUS_COLORS[refund?.status] || '#9CA3AF';

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Refund Details</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.center}><ActivityIndicator size="large" color="#EE4D2D" /></View>
      </SafeAreaView>
    );
  }

  if (!refund) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Refund Details</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.center}><Text style={styles.emptyText}>Refund not found</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Refund Details</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Text style={styles.requestNumber}>#{refund.request_number || String(id).slice(0, 8).toUpperCase()}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {(refund.status || 'pending').replace('_', ' ').toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.dateText}>
            Requested: {refund.requested_at ? new Date(refund.requested_at).toLocaleDateString() : 'N/A'}
          </Text>
        </View>

        {/* Order Items */}
        {refund.order_items && refund.order_items.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Order Items</Text>
            {refund.order_items.map((item: any, i: number) => (
              <View key={i} style={styles.itemRow}>
                {item.product?.media_files?.[0]?.file_url ? (
                  <Image source={{ uri: item.product.media_files[0].file_url }} style={styles.itemImage} />
                ) : (
                  <View style={[styles.itemImage, styles.imagePlaceholder]}>
                    <Ionicons name="cube-outline" size={20} color="#9CA3AF" />
                  </View>
                )}
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.product?.name || 'Product'}</Text>
                  <Text style={styles.itemDetail}>Qty: {item.checkout_quantity || 1}</Text>
                  <Text style={styles.itemDetail}>₱{Number(item.checkout_total_amount || item.price || 0).toFixed(2)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Refund Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Refund Information</Text>
          <InfoRow label="Reason" value={refund.reason || 'N/A'} />
          <InfoRow label="Total Amount" value={`₱${Number(refund.total_refund_amount || 0).toFixed(2)}`} />
          {refund.approved_refund_amount != null && (
            <InfoRow label="Approved Amount" value={`₱${Number(refund.approved_refund_amount).toFixed(2)}`} />
          )}
          <InfoRow label="Refund Method" value={refund.preferred_refund_method || refund.final_refund_method || 'N/A'} />
          <InfoRow label="Refund Type" value={refund.refund_type || refund.final_refund_type || 'N/A'} />
          {refund.customer_note && <InfoRow label="Customer Note" value={refund.customer_note} />}
          {refund.seller_response && <InfoRow label="Your Response" value={refund.seller_response} />}
        </View>

        {/* Return Info */}
        {refund.return_request && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Return Shipment</Text>
            <InfoRow label="Method" value={refund.return_request.return_method || 'N/A'} />
            <InfoRow label="Tracking" value={refund.return_request.tracking_number || 'N/A'} />
            <InfoRow label="Status" value={refund.return_request.status || 'N/A'} />
          </View>
        )}

        {/* Return Address */}
        {refund.return_address && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Return Address</Text>
            <InfoRow label="Recipient" value={refund.return_address.recipient_name || 'N/A'} />
            <InfoRow label="Contact" value={refund.return_address.contact_number || 'N/A'} />
            <InfoRow
              label="Address"
              value={[
                refund.return_address.street,
                refund.return_address.barangay,
                refund.return_address.city,
                refund.return_address.province,
              ].filter(Boolean).join(', ') || 'N/A'}
            />
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsCard}>
          <Text style={styles.cardTitle}>Actions</Text>
          <View style={styles.actionsRow}>
            {['pending', 'negotiation', 'waiting', 'to_verify'].includes(refund.status) && (
              <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]} onPress={handleApprove} disabled={actionLoading}>
                <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                <Text style={styles.actionBtnText}>Approve</Text>
              </TouchableOpacity>
            )}
            {['pending', 'negotiation'].includes(refund.status) && (
              <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => setShowRejectModal(true)} disabled={actionLoading}>
                <Ionicons name="close-circle-outline" size={16} color="#fff" />
                <Text style={styles.actionBtnText}>Reject</Text>
              </TouchableOpacity>
            )}
            {!['completed', 'cancelled', 'rejected', 'dispute'].includes(refund.status) && (
              <TouchableOpacity style={[styles.actionBtn, styles.respondBtn]} onPress={() => setShowResponseModal(true)} disabled={actionLoading}>
                <Ionicons name="chatbubble-outline" size={16} color="#fff" />
                <Text style={styles.actionBtnText}>Respond</Text>
              </TouchableOpacity>
            )}
            {!['completed', 'cancelled', 'dispute'].includes(refund.status) && (
              <TouchableOpacity style={[styles.actionBtn, styles.disputeBtn]} onPress={handleFileDispute} disabled={actionLoading}>
                <Ionicons name="alert-circle-outline" size={16} color="#fff" />
                <Text style={styles.actionBtnText}>Dispute</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Response Modal */}
      <Modal visible={showResponseModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Send Response</Text>
            <Text style={styles.modalSubtitle}>Your message will be sent to the customer.</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Type your response..."
              multiline
              numberOfLines={4}
              value={responseText}
              onChangeText={setResponseText}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowResponseModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleSendResponse} disabled={actionLoading}>
                {actionLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalConfirmText}>Send</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reject Modal */}
      <Modal visible={showRejectModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Reject Refund</Text>
            <Text style={styles.modalSubtitle}>Please provide a reason for rejecting this refund.</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Enter rejection reason..."
              multiline
              numberOfLines={4}
              value={rejectReason}
              onChangeText={setRejectReason}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowRejectModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalConfirm, { backgroundColor: '#DC2626' }]} onPress={handleReject} disabled={actionLoading}>
                {actionLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalConfirmText}>Reject</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#6B7280', fontSize: 14 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1F2937' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  statusCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  requestNumber: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700' },
  dateText: { fontSize: 12, color: '#6B7280' },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#1F2937', marginBottom: 12 },
  itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  itemImage: { width: 52, height: 52, borderRadius: 8, marginRight: 12 },
  imagePlaceholder: { backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 13, fontWeight: '600', color: '#1F2937', marginBottom: 2 },
  itemDetail: { fontSize: 12, color: '#6B7280' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  infoLabel: { fontSize: 13, color: '#6B7280', flex: 1 },
  infoValue: { fontSize: 13, color: '#1F2937', fontWeight: '500', flex: 2, textAlign: 'right' },
  actionsCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8, gap: 5 },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  approveBtn: { backgroundColor: '#10B981' },
  rejectBtn: { backgroundColor: '#EF4444' },
  respondBtn: { backgroundColor: '#3B82F6' },
  disputeBtn: { backgroundColor: '#F59E0B' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#1F2937', marginBottom: 4 },
  modalSubtitle: { fontSize: 13, color: '#6B7280', marginBottom: 14 },
  textArea: {
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, padding: 12,
    fontSize: 14, color: '#1F2937', height: 100, textAlignVertical: 'top', marginBottom: 16,
  },
  modalBtns: { flexDirection: 'row', gap: 10 },
  modalCancel: { flex: 1, backgroundColor: '#F3F4F6', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  modalCancelText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  modalConfirm: { flex: 1, backgroundColor: '#EE4D2D', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  modalConfirmText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});

