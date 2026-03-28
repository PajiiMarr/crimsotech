// app/seller/view-refund-details.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  Image,
  Dimensions,
  Platform,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import AxiosInstance from '../../contexts/axios';
import { useAuth } from '../../contexts/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ========== STATUS COLORS ==========
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

// ========== HELPERS ==========
const formatCurrency = (value: any): string => {
  const num = parseFloat(value);
  if (isNaN(num)) return '₱0.00';
  return `₱${num.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getAbsoluteUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const baseUrl = AxiosInstance.defaults.baseURL || '';
  const cleanBase = baseUrl.replace(/\/$/, '');
  return `${cleanBase}${url.startsWith('/') ? url : `/${url}`}`;
};

export default function ViewRefundDetails() {
  const { refundId, shopId: paramShopId } = useLocalSearchParams<{ refundId: string; shopId: string }>();
  const { userId, shopId: authShopId } = useAuth();
  const effectiveShopId = paramShopId || authShopId;

  const [refund, setRefund] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [uploadingProofs, setUploadingProofs] = useState(false);

  // Media viewer state
  const [mediaModalVisible, setMediaModalVisible] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<{ url: string; type: string } | null>(null);
  const videoRef = useRef<Video>(null);

  // Modal states for actions (unchanged)
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveAmount, setApproveAmount] = useState('');
  const [approveNote, setApproveNote] = useState('');

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectCode, setRejectCode] = useState('');

  const [showNegotiateModal, setShowNegotiateModal] = useState(false);
  const [counterMethod, setCounterMethod] = useState('');
  const [counterType, setCounterType] = useState('');
  const [counterAmount, setCounterAmount] = useState('');
  const [counterNotes, setCounterNotes] = useState('');

  const [showProcessModal, setShowProcessModal] = useState(false);
  const [processFinalMethod, setProcessFinalMethod] = useState('');
  const [processStatus, setProcessStatus] = useState('');
  const [processProofs, setProcessProofs] = useState<any[]>([]);

  const [showReturnStatusModal, setShowReturnStatusModal] = useState(false);
  const [returnAction, setReturnAction] = useState('');
  const [returnNotes, setReturnNotes] = useState('');

  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyResult, setVerifyResult] = useState('');
  const [verifyNotes, setVerifyNotes] = useState('');

  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [trackingService, setTrackingService] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [shippedAt, setShippedAt] = useState('');
  const [trackingMedia, setTrackingMedia] = useState<any[]>([]);

  const [showProofModal, setShowProofModal] = useState(false);
  const [proofFiles, setProofFiles] = useState<any[]>([]);
  const [proofNotes, setProofNotes] = useState('');

  useEffect(() => {
    if (refundId && userId && effectiveShopId) fetchDetail();
    else if (refundId) {
      Alert.alert('Error', 'Shop ID is missing. Please select a shop first.');
      router.back();
    } else {
      Alert.alert('Error', 'Refund ID is missing.');
      router.back();
    }
  }, [refundId, userId, effectiveShopId]);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const res = await AxiosInstance.get(`/return-refund/${refundId}/get_seller_refund_details/`, {
        headers: { 'X-User-Id': userId || '', 'X-Shop-Id': effectiveShopId || '' },
      });
      setRefund(res.data);
    } catch (err: any) {
      console.error('Error fetching refund details:', err);
      Alert.alert('Error', err?.response?.data?.error || 'Failed to load refund details');
    } finally {
      setLoading(false);
    }
  };

  // ========== API ACTIONS (unchanged) ==========
  const handleApprove = async () => {
    try {
      setActionLoading(true);
      const payload: any = { action: 'approve', notes: approveNote };
      if (approveAmount && !isNaN(parseFloat(approveAmount))) {
        payload.approved_refund_amount = parseFloat(approveAmount);
      }
      await AxiosInstance.post(`/return-refund/${refundId}/seller_respond_to_refund/`, payload, {
        headers: { 'X-User-Id': userId || '', 'X-Shop-Id': effectiveShopId || '' },
      });
      Alert.alert('Success', 'Refund approved successfully');
      setShowApproveModal(false);
      setApproveAmount('');
      setApproveNote('');
      fetchDetail();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to approve refund');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      Alert.alert('Required', 'Please provide a reason for rejection');
      return;
    }
    try {
      setActionLoading(true);
      await AxiosInstance.post(`/return-refund/${refundId}/seller_respond_to_refund/`, {
        action: 'reject',
        notes: rejectReason,
        reason_code: rejectCode,
      }, {
        headers: { 'X-User-Id': userId || '', 'X-Shop-Id': effectiveShopId || '' },
      });
      Alert.alert('Success', 'Refund rejected');
      setShowRejectModal(false);
      setRejectReason('');
      setRejectCode('');
      fetchDetail();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to reject refund');
    } finally {
      setActionLoading(false);
    }
  };

  const handleNegotiate = async () => {
    if (!counterMethod) {
      Alert.alert('Required', 'Please select a refund method');
      return;
    }
    if (!counterType) {
      Alert.alert('Required', 'Please select a refund type (keep/return)');
      return;
    }
    if (counterType !== 'keep' && !counterAmount) {
      Alert.alert('Required', 'Counter amount is required');
      return;
    }
    try {
      setActionLoading(true);
      await AxiosInstance.post(`/return-refund/${refundId}/seller_respond_to_refund/`, {
        action: 'negotiate',
        counter_refund_method: counterMethod,
        counter_refund_type: counterType,
        counter_refund_amount: parseFloat(counterAmount),
        counter_notes: counterNotes,
      }, {
        headers: { 'X-User-Id': userId || '', 'X-Shop-Id': effectiveShopId || '' },
      });
      Alert.alert('Success', 'Counter offer sent');
      setShowNegotiateModal(false);
      setCounterMethod('');
      setCounterType('');
      setCounterAmount('');
      setCounterNotes('');
      fetchDetail();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to send counter offer');
    } finally {
      setActionLoading(false);
    }
  };

  const handleProcessRefund = async () => {
    if (!processFinalMethod && !processStatus) {
      Alert.alert('Required', 'Please select a method and status');
      return;
    }
    try {
      setActionLoading(true);
      const formData = new FormData();
      if (processFinalMethod) formData.append('final_refund_method', processFinalMethod);
      if (processStatus) formData.append('set_status', processStatus);
      if (processProofs.length) {
        for (const file of processProofs) {
          formData.append('file_data', file);
        }
      }
      await AxiosInstance.post(`/return-refund/${refundId}/process_refund/`, formData, {
        headers: { 'X-User-Id': userId || '', 'X-Shop-Id': effectiveShopId || '', 'Content-Type': 'multipart/form-data' },
      });
      Alert.alert('Success', 'Refund processed');
      setShowProcessModal(false);
      setProcessFinalMethod('');
      setProcessStatus('');
      setProcessProofs([]);
      fetchDetail();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to process refund');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateReturnStatus = async () => {
    try {
      setActionLoading(true);
      await AxiosInstance.post(`/return-refund/${refundId}/update_return_status/`, {
        action: returnAction,
        notes: returnNotes,
      }, {
        headers: { 'X-User-Id': userId || '', 'X-Shop-Id': effectiveShopId || '' },
      });
      Alert.alert('Success', `Return status updated to ${returnAction.replace('mark_', '')}`);
      setShowReturnStatusModal(false);
      setReturnAction('');
      setReturnNotes('');
      fetchDetail();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to update return status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyItem = async () => {
    if (!verifyResult) {
      Alert.alert('Required', 'Please select approve or reject');
      return;
    }
    try {
      setActionLoading(true);
      await AxiosInstance.post(`/return-refund/${refundId}/verify_item/`, {
        verification_result: verifyResult,
        verification_notes: verifyNotes,
      }, {
        headers: { 'X-User-Id': userId || '', 'X-Shop-Id': effectiveShopId || '' },
      });
      Alert.alert('Success', `Item verification ${verifyResult}`);
      setShowVerifyModal(false);
      setVerifyResult('');
      setVerifyNotes('');
      fetchDetail();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to verify item');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateTracking = async () => {
    if (!trackingService || !trackingNumber) {
      Alert.alert('Required', 'Please provide both service and tracking number');
      return;
    }
    try {
      setActionLoading(true);
      const formData = new FormData();
      formData.append('logistic_service', trackingService);
      formData.append('tracking_number', trackingNumber);
      if (shippedAt) formData.append('shipped_at', shippedAt);
      if (trackingMedia.length) {
        for (const media of trackingMedia) {
          formData.append('media_files', media);
        }
      }
      await AxiosInstance.post(`/return-refund/${refundId}/update_tracking/`, formData, {
        headers: { 'X-User-Id': userId || '', 'Content-Type': 'multipart/form-data' },
      });
      Alert.alert('Success', 'Tracking updated');
      setShowTrackingModal(false);
      setTrackingService('');
      setTrackingNumber('');
      setShippedAt('');
      setTrackingMedia([]);
      fetchDetail();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to update tracking');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUploadProofs = async () => {
    if (!proofFiles.length) {
      Alert.alert('Required', 'Please select at least one file');
      return;
    }
    try {
      setUploadingProofs(true);
      const formData = new FormData();
      for (const file of proofFiles) {
        formData.append('file_data', file);
      }
      if (proofNotes) formData.append('notes', proofNotes);
      await AxiosInstance.post(`/return-refund/${refundId}/add_proof/`, formData, {
        headers: { 'X-User-Id': userId || '', 'X-Shop-Id': effectiveShopId || '', 'Content-Type': 'multipart/form-data' },
      });
      Alert.alert('Success', 'Proofs uploaded');
      setShowProofModal(false);
      setProofFiles([]);
      setProofNotes('');
      fetchDetail();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to upload proofs');
    } finally {
      setUploadingProofs(false);
    }
  };

  // ========== UI HELPERS ==========
  const pickImage = async (setter: Function) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      const files = result.assets.map(asset => ({
        uri: asset.uri,
        type: asset.type === 'image' ? 'image/jpeg' : 'video/mp4',
        name: asset.fileName || `file_${Date.now()}`,
      }));
      setter((prev: any[]) => [...prev, ...files]);
    }
  };

  const pickDocument = async (setter: Function) => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'video/*'],
      copyToCacheDirectory: true,
      multiple: true,
    });
    if (!result.canceled && result.assets) {
      const files = result.assets.map(asset => ({
        uri: asset.uri,
        type: asset.mimeType || 'application/octet-stream',
        name: asset.name,
      }));
      setter((prev: any[]) => [...prev, ...files]);
    }
  };

  const openMediaViewer = (url: string, type: string) => {
    const absoluteUrl = getAbsoluteUrl(url);
    if (!absoluteUrl) return;
    setSelectedMedia({ url: absoluteUrl, type });
    setMediaModalVisible(true);
  };

  const renderMedia = (mediaList: any[], title: string) => {
    if (!mediaList?.length) return null;
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{title}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaScroll}>
          {mediaList.map((item, idx) => {
            const fileUrl = getAbsoluteUrl(item.file_url);
            if (!fileUrl) return null;
            const isVideo = item.file_type?.startsWith('video/') || item.file_type === 'video';
            return (
              <TouchableOpacity
                key={idx}
                style={styles.mediaThumbWrapper}
                onPress={() => openMediaViewer(item.file_url, item.file_type)}
              >
                {isVideo ? (
                  <View style={styles.videoThumb}>
                    <Image source={{ uri: fileUrl }} style={styles.mediaThumb} />
                    <View style={styles.playOverlay}>
                      <Ionicons name="play-circle" size={30} color="#fff" />
                    </View>
                  </View>
                ) : (
                  <Image source={{ uri: fileUrl }} style={styles.mediaThumb} />
                )}
                {item.notes && <Text style={styles.mediaNote} numberOfLines={1}>{item.notes}</Text>}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  // ========== STATUS DESCRIPTION ==========
  const getStatusDescription = () => {
    if (!refund) return '';
    const status = refund.status?.toLowerCase();
    const orderId = refund.order?.order_id || refund.order_id || '';
    switch (status) {
      case 'pending':
        return `Pending request for order #${orderId.slice(0, 8)}. Please review the refund request. If you do not respond within 48 hours, the refund will be automatically approved.`;
      case 'negotiation':
        return `You have sent a counter‑offer. Waiting for the buyer to accept or reject.`;
      case 'approved':
        if (refund.refund_type === 'return') return `Return approved. Please wait for the buyer to ship the item back.`;
        return `Refund approved. You can now process the payment.`;
      case 'dispute':
        return `A dispute has been opened. Please check the details and respond.`;
      case 'rejected':
        return `Refund request rejected. The buyer can file a dispute if they disagree.`;
      case 'completed':
        return `Refund completed. The payment has been sent to the buyer.`;
      default:
        return `Status: ${refund.status}`;
    }
  };

  // ========== ACTION BUTTONS (same as before) ==========
  const renderActionButtons = () => {
    if (!refund) return null;
    const status = refund.status?.toLowerCase();
    const returnStatus = refund.return_request?.status?.toLowerCase();
    const isReturn = refund.refund_type === 'return';

    let buttons: React.ReactNode[] = [];

    if (status === 'pending') {
      buttons = [
        <TouchableOpacity key="approve" style={[styles.actionBtn, styles.approveBtn]} onPress={() => setShowApproveModal(true)} disabled={actionLoading}>
          <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
          <Text style={styles.actionBtnText}>Approve</Text>
        </TouchableOpacity>,
        <TouchableOpacity key="reject" style={[styles.actionBtn, styles.rejectBtn]} onPress={() => setShowRejectModal(true)} disabled={actionLoading}>
          <Ionicons name="close-circle-outline" size={16} color="#fff" />
          <Text style={styles.actionBtnText}>Reject</Text>
        </TouchableOpacity>,
        <TouchableOpacity key="negotiate" style={[styles.actionBtn, styles.negotiateBtn]} onPress={() => setShowNegotiateModal(true)} disabled={actionLoading}>
          <Ionicons name="chatbubbles-outline" size={16} color="#fff" />
          <Text style={styles.actionBtnText}>Negotiate</Text>
        </TouchableOpacity>,
      ];
    } else {
      if (status === 'approved' && !isReturn) {
        buttons.push(
          <TouchableOpacity key="process" style={[styles.actionBtn, styles.processBtn]} onPress={() => setShowProcessModal(true)} disabled={actionLoading}>
            <Ionicons name="cash-outline" size={16} color="#fff" />
            <Text style={styles.actionBtnText}>Process Payment</Text>
          </TouchableOpacity>
        );
      }

      if (isReturn && status === 'approved') {
        if (['pending', 'approved'].includes(returnStatus || '')) {
          buttons.push(
            <TouchableOpacity key="tracking" style={[styles.actionBtn, styles.trackingBtn]} onPress={() => setShowTrackingModal(true)} disabled={actionLoading}>
              <Ionicons name="send-outline" size={16} color="#fff" />
              <Text style={styles.actionBtnText}>Provide Tracking</Text>
            </TouchableOpacity>
          );
        }
        if (['shipped', 'received'].includes(returnStatus || '')) {
          buttons.push(
            <TouchableOpacity key="returnStatus" style={[styles.actionBtn, styles.returnStatusBtn]} onPress={() => {
              setReturnAction(returnStatus === 'shipped' ? 'mark_received' : 'mark_inspected');
              setShowReturnStatusModal(true);
            }} disabled={actionLoading}>
              <Ionicons name="refresh-outline" size={16} color="#fff" />
              <Text style={styles.actionBtnText}>Update Return Status</Text>
            </TouchableOpacity>
          );
        }
        if (returnStatus === 'inspected') {
          buttons.push(
            <TouchableOpacity key="verify" style={[styles.actionBtn, styles.verifyBtn]} onPress={() => setShowVerifyModal(true)} disabled={actionLoading}>
              <Ionicons name="checkbox-outline" size={16} color="#fff" />
              <Text style={styles.actionBtnText}>Verify Item</Text>
            </TouchableOpacity>
          );
        }
        if (returnStatus === 'approved') {
          buttons.push(
            <TouchableOpacity key="processReturn" style={[styles.actionBtn, styles.processBtn]} onPress={() => setShowProcessModal(true)} disabled={actionLoading}>
              <Ionicons name="cash-outline" size={16} color="#fff" />
              <Text style={styles.actionBtnText}>Process Payment</Text>
            </TouchableOpacity>
          );
        }
      }

      if (status !== 'pending') {
        buttons.push(
          <TouchableOpacity key="proofs" style={[styles.actionBtn, styles.proofBtn]} onPress={() => setShowProofModal(true)} disabled={uploadingProofs}>
            <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
            <Text style={styles.actionBtnText}>Upload Proofs</Text>
          </TouchableOpacity>
        );
      }
    }

    if (buttons.length === 0) return null;

    return (
      <View style={styles.actionsContainer}>
        {buttons.map((btn, idx) => (
          <View key={idx} style={styles.actionItem}>
            {btn}
          </View>
        ))}
      </View>
    );
  };

  // ========== MODALS (unchanged) ==========
  const renderModals = () => (
    <>
      {/* Approve Modal */}
      <Modal visible={showApproveModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Approve Refund</Text>
            <Text style={styles.modalSubtitle}>You may optionally set an approved amount (default full amount).</Text>
            <TextInput
              style={styles.input}
              placeholder="Approved amount (optional)"
              keyboardType="decimal-pad"
              value={approveAmount}
              onChangeText={setApproveAmount}
            />
            <TextInput
              style={styles.textArea}
              placeholder="Note (optional)"
              multiline
              value={approveNote}
              onChangeText={setApproveNote}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowApproveModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleApprove} disabled={actionLoading}>
                {actionLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalConfirmText}>Approve</Text>}
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
            <TextInput
              style={styles.input}
              placeholder="Reason code (optional)"
              value={rejectCode}
              onChangeText={setRejectCode}
            />
            <TextInput
              style={styles.textArea}
              placeholder="Reason details"
              multiline
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

      {/* Negotiate Modal */}
      <Modal visible={showNegotiateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Counter Offer</Text>
            <View style={styles.row}>
              <View style={styles.flex1}>
                <Text style={styles.label}>Refund Type</Text>
                <View style={styles.radioGroup}>
                  {['keep', 'return'].map(type => (
                    <TouchableOpacity key={type} style={styles.radio} onPress={() => setCounterType(type)}>
                      <Ionicons name={counterType === type ? 'radio-button-on' : 'radio-button-off'} size={20} color="#EE4D2D" />
                      <Text style={styles.radioText}>{type === 'keep' ? 'Keep Item' : 'Return Item'}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.flex1}>
                <Text style={styles.label}>Refund Method</Text>
                <View style={styles.radioGroup}>
                  {['wallet', 'bank', 'remittance', 'voucher'].map(method => (
                    <TouchableOpacity key={method} style={styles.radio} onPress={() => setCounterMethod(method)}>
                      <Ionicons name={counterMethod === method ? 'radio-button-on' : 'radio-button-off'} size={20} color="#EE4D2D" />
                      <Text style={styles.radioText}>{method}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Counter amount (required if type is keep/return)"
              keyboardType="decimal-pad"
              value={counterAmount}
              onChangeText={setCounterAmount}
            />
            <TextInput
              style={styles.textArea}
              placeholder="Notes (optional)"
              multiline
              value={counterNotes}
              onChangeText={setCounterNotes}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowNegotiateModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleNegotiate} disabled={actionLoading}>
                {actionLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalConfirmText}>Send Offer</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Process Payment Modal */}
      <Modal visible={showProcessModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Process Refund Payment</Text>
            <Text style={styles.label}>Final Refund Method</Text>
            <View style={styles.radioGroupRow}>
              {['wallet', 'bank', 'remittance', 'voucher'].map(method => (
                <TouchableOpacity key={method} style={styles.radio} onPress={() => setProcessFinalMethod(method)}>
                  <Ionicons name={processFinalMethod === method ? 'radio-button-on' : 'radio-button-off'} size={20} color="#EE4D2D" />
                  <Text style={styles.radioText}>{method}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>Set Payment Status</Text>
            <View style={styles.radioGroupRow}>
              {['processing', 'completed', 'failed'].map(status => (
                <TouchableOpacity key={status} style={styles.radio} onPress={() => setProcessStatus(status)}>
                  <Ionicons name={processStatus === status ? 'radio-button-on' : 'radio-button-off'} size={20} color="#EE4D2D" />
                  <Text style={styles.radioText}>{status}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>Proofs (optional)</Text>
            <TouchableOpacity style={styles.uploadBtn} onPress={() => pickDocument(setProcessProofs)}>
              <Ionicons name="cloud-upload-outline" size={20} color="#EE4D2D" />
              <Text style={styles.uploadText}>Select files</Text>
            </TouchableOpacity>
            {processProofs.length > 0 && <Text style={styles.fileCount}>{processProofs.length} file(s) selected</Text>}
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowProcessModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleProcessRefund} disabled={actionLoading}>
                {actionLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalConfirmText}>Process</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Update Return Status Modal */}
      <Modal visible={showReturnStatusModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Update Return Status</Text>
            <Text style={styles.label}>Action</Text>
            <View style={styles.radioGroupRow}>
              {returnAction === 'mark_received' && (
                <TouchableOpacity style={styles.radio} onPress={() => setReturnAction('mark_received')}>
                  <Ionicons name="radio-button-on" size={20} color="#EE4D2D" />
                  <Text style={styles.radioText}>Mark Received</Text>
                </TouchableOpacity>
              )}
              {returnAction === 'mark_inspected' && (
                <TouchableOpacity style={styles.radio} onPress={() => setReturnAction('mark_inspected')}>
                  <Ionicons name="radio-button-on" size={20} color="#EE4D2D" />
                  <Text style={styles.radioText}>Mark Inspected</Text>
                </TouchableOpacity>
              )}
              {returnAction === 'mark_completed' && (
                <TouchableOpacity style={styles.radio} onPress={() => setReturnAction('mark_completed')}>
                  <Ionicons name="radio-button-on" size={20} color="#EE4D2D" />
                  <Text style={styles.radioText}>Mark Completed</Text>
                </TouchableOpacity>
              )}
            </View>
            <TextInput
              style={styles.textArea}
              placeholder="Notes (optional)"
              multiline
              value={returnNotes}
              onChangeText={setReturnNotes}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowReturnStatusModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleUpdateReturnStatus} disabled={actionLoading}>
                {actionLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalConfirmText}>Update</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Verify Item Modal */}
      <Modal visible={showVerifyModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Verify Returned Item</Text>
            <View style={styles.radioGroupRow}>
              <TouchableOpacity style={styles.radio} onPress={() => setVerifyResult('approved')}>
                <Ionicons name={verifyResult === 'approved' ? 'radio-button-on' : 'radio-button-off'} size={20} color="#EE4D2D" />
                <Text style={styles.radioText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.radio} onPress={() => setVerifyResult('rejected')}>
                <Ionicons name={verifyResult === 'rejected' ? 'radio-button-on' : 'radio-button-off'} size={20} color="#EE4D2D" />
                <Text style={styles.radioText}>Reject</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.textArea}
              placeholder="Notes (optional)"
              multiline
              value={verifyNotes}
              onChangeText={setVerifyNotes}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowVerifyModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleVerifyItem} disabled={actionLoading}>
                {actionLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalConfirmText}>Submit</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Provide Tracking Modal */}
      <Modal visible={showTrackingModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Provide Tracking Info</Text>
            <TextInput
              style={styles.input}
              placeholder="Logistic Service (e.g., LBC, J&T)"
              value={trackingService}
              onChangeText={setTrackingService}
            />
            <TextInput
              style={styles.input}
              placeholder="Tracking Number"
              value={trackingNumber}
              onChangeText={setTrackingNumber}
            />
            <TextInput
              style={styles.input}
              placeholder="Shipped At (YYYY-MM-DD)"
              value={shippedAt}
              onChangeText={setShippedAt}
            />
            <Text style={styles.label}>Media (optional)</Text>
            <TouchableOpacity style={styles.uploadBtn} onPress={() => pickDocument(setTrackingMedia)}>
              <Ionicons name="cloud-upload-outline" size={20} color="#EE4D2D" />
              <Text style={styles.uploadText}>Select files</Text>
            </TouchableOpacity>
            {trackingMedia.length > 0 && <Text style={styles.fileCount}>{trackingMedia.length} file(s) selected</Text>}
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowTrackingModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleUpdateTracking} disabled={actionLoading}>
                {actionLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalConfirmText}>Submit</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Upload Proofs Modal */}
      <Modal visible={showProofModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Upload Proofs</Text>
            <TouchableOpacity style={styles.uploadBtn} onPress={() => pickDocument(setProofFiles)}>
              <Ionicons name="cloud-upload-outline" size={20} color="#EE4D2D" />
              <Text style={styles.uploadText}>Select files</Text>
            </TouchableOpacity>
            {proofFiles.length > 0 && <Text style={styles.fileCount}>{proofFiles.length} file(s) selected</Text>}
            <TextInput
              style={styles.textArea}
              placeholder="Notes (optional)"
              multiline
              value={proofNotes}
              onChangeText={setProofNotes}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowProofModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleUploadProofs} disabled={uploadingProofs}>
                {uploadingProofs ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalConfirmText}>Upload</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Media Viewer Modal */}
      <Modal visible={mediaModalVisible} transparent animationType="fade" onRequestClose={() => setMediaModalVisible(false)}>
        <View style={styles.mediaModalOverlay}>
          <TouchableOpacity style={styles.mediaCloseButton} onPress={() => setMediaModalVisible(false)}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          {selectedMedia?.type === 'image' ? (
            <Image source={{ uri: selectedMedia.url }} style={styles.fullscreenImage} resizeMode="contain" />
          ) : (
            <Video
              ref={videoRef}
              source={{ uri: selectedMedia?.url }}
              style={styles.fullscreenVideo}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
              isLooping={false}
            />
          )}
        </View>
      </Modal>
    </>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
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

  const statusColor = STATUS_COLORS[refund.status?.toLowerCase()] || '#9CA3AF';
  const order = refund.order || {};
  const shippingAddress = order.shipping_address || {};
  const paymentDetails = refund.payment_details?.selected_payment || {};

  // Buyer contact number
  const buyerPhone = shippingAddress?.recipient_phone ||
                      order?.shipping_address?.recipient_phone ||
                      (order?.delivery_address_text?.match(/[0-9]{7,}/) || [''])[0];

  // Delivery address components
  const deliveryRecipient = shippingAddress?.recipient_name || 'N/A';
  const deliveryPhone = shippingAddress?.recipient_phone || 'N/A';
  const deliveryFullAddress = shippingAddress?.full_address ||
                              (shippingAddress?.street ? `${shippingAddress.street}, ${shippingAddress.barangay}, ${shippingAddress.city}, ${shippingAddress.province} ${shippingAddress.zip_code}, ${shippingAddress.country}` : '') ||
                              order?.delivery_address_text ||
                              'No address provided';

  // Build refund items: merge order_items with refund.items
  const orderItems = refund.order_items || [];
  const refundItems = refund.items || []; // refund.items from API (RefundItem objects)
  const refundMap = new Map();
  refundItems.forEach((ri: any) => refundMap.set(ri.checkout_id, ri));

  const mergedItems = orderItems.map((oi: any) => {
    const ri = refundMap.get(oi.checkout_id);
    return {
      ...oi,
      refundQuantity: ri ? ri.quantity : 0,
      refundAmount: ri ? ri.amount : 0,
    };
  });

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

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Text style={styles.requestNumber}>#{refund.request_number || String(refundId).slice(0, 8).toUpperCase()}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {(refund.status || 'pending').replace('_', ' ').toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.statusDescription}>{getStatusDescription()}</Text>
          <Text style={styles.dateText}>Requested: {formatDate(refund.requested_at)}</Text>
        </View>

        {/* Buyer Information */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Buyer Information</Text>
          <InfoRow label="Name" value={order?.customer_username || refund.requested_by_username || 'N/A'} />
          <InfoRow label="Email" value={order?.customer_email || refund.requested_by_email || 'N/A'} />
          <InfoRow label="Contact Number" value={buyerPhone || 'N/A'} />
        </View>

        {/* Delivery Address */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Delivery Address</Text>
          <InfoRow label="Recipient" value={deliveryRecipient} />
          <InfoRow label="Phone" value={deliveryPhone} />
          <InfoRow label="Address" value={deliveryFullAddress} multiline />
        </View>

        {/* Items to Refund (with refund quantities and amounts) */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Items to Refund</Text>
          {mergedItems.length > 0 ? (
            mergedItems.map((item, idx) => {
              const name = item.product_name || item.product?.name || 'Product';
              const imageUrl = item.product_image || item.product?.image;
              const originalQty = parseInt(item.quantity) || 0;
              const refundQty = parseInt(item.refundQuantity) || 0;
              const priceEach = parseFloat(item.price) || 0;
              const refundAmount = parseFloat(item.refundAmount) || 0;
              return (
                <View key={idx} style={styles.refundItemRow}>
                  <View style={styles.refundItemImage}>
                    {imageUrl ? (
                      <Image source={{ uri: getAbsoluteUrl(imageUrl) }} style={styles.refundItemImageThumb} />
                    ) : (
                      <View style={[styles.refundItemImageThumb, styles.imagePlaceholder]}>
                        <Ionicons name="cube-outline" size={20} color="#9CA3AF" />
                      </View>
                    )}
                  </View>
                  <View style={styles.refundItemInfo}>
                    <Text style={styles.refundItemName}>{name}</Text>
                    <Text style={styles.refundItemMeta}>Original Qty: {originalQty} | Refund Qty: {refundQty}</Text>
                    <Text style={styles.refundItemPrice}>{formatCurrency(priceEach)} each</Text>
                    <Text style={styles.refundItemAmount}>Total Refund: {formatCurrency(refundAmount)}</Text>
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={styles.emptyItemText}>No items found</Text>
          )}
        </View>

        {/* Payment Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Refund Payment Details</Text>
          <InfoRow label="Method" value={paymentDetails.payment_method || refund.buyer_preferred_refund_method || refund.final_refund_method || 'N/A'} />
          {paymentDetails.payment_method === 'bank' && (
            <>
              <InfoRow label="Bank Name" value={paymentDetails.bank_name || 'N/A'} />
              <InfoRow label="Account Name" value={paymentDetails.account_name || 'N/A'} />
              <InfoRow label="Account Number" value={paymentDetails.account_number || 'N/A'} />
            </>
          )}
          {paymentDetails.payment_method === 'wallet' && (
            <>
              <InfoRow label="Provider" value={paymentDetails.provider || 'GCash/PayMaya'} />
              <InfoRow label="Account Name" value={paymentDetails.account_name || 'N/A'} />
              <InfoRow label="Account Number" value={paymentDetails.account_number || 'N/A'} />
            </>
          )}
          {paymentDetails.payment_method === 'remittance' && (
            <>
              <InfoRow label="Provider" value={paymentDetails.provider || 'N/A'} />
              <InfoRow label="Full Name" value={paymentDetails.full_name || 'N/A'} />
              <InfoRow label="Contact Number" value={paymentDetails.contact_number || 'N/A'} />
              <InfoRow label="Address" value={paymentDetails.address || 'N/A'} />
            </>
          )}
          {paymentDetails.payment_method === 'voucher' && (
            <InfoRow label="Details" value="Store Voucher will be issued" />
          )}
          {Object.keys(paymentDetails).length === 0 && !refund.buyer_preferred_refund_method && (
            <Text style={styles.noPaymentText}>No payment details provided</Text>
          )}
        </View>

        {/* Refund Info (existing) */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Refund Information</Text>
          <InfoRow label="Reason" value={refund.reason || 'N/A'} />
          <InfoRow label="Total Amount" value={formatCurrency(refund.total_refund_amount)} />
          {refund.approved_refund_amount != null && (
            <InfoRow label="Approved Amount" value={formatCurrency(refund.approved_refund_amount)} />
          )}
          {refund.customer_note && <InfoRow label="Customer Note" value={refund.customer_note} />}
          {refund.seller_note && <InfoRow label="Seller Note" value={refund.seller_note} />}
        </View>

        {/* Return Request */}
        {refund.return_request && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Return Request</Text>
            <InfoRow label="Method" value={refund.return_request.return_method || 'N/A'} />
            <InfoRow label="Logistic Service" value={refund.return_request.logistic_service || 'N/A'} />
            <InfoRow label="Tracking Number" value={refund.return_request.tracking_number || 'N/A'} />
            <InfoRow label="Status" value={refund.return_request.status || 'N/A'} />
            <InfoRow label="Shipped At" value={formatDate(refund.return_request.shipped_at)} />
            <InfoRow label="Received At" value={formatDate(refund.return_request.received_at)} />
            <InfoRow label="Return Deadline" value={formatDate(refund.return_request.return_deadline)} />
            {refund.return_request.notes && <InfoRow label="Notes" value={refund.return_request.notes} />}
            {renderMedia(refund.return_request.media, 'Return Media')}
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
                refund.return_address.country,
              ].filter(Boolean).join(', ') || 'N/A'}
            />
            <InfoRow label="ZIP Code" value={refund.return_address.zip_code || 'N/A'} />
          </View>
        )}

        {/* Evidence (buyer) */}
        {refund.evidence?.length > 0 && renderMedia(refund.evidence, 'Evidence (Buyer)')}

        {/* Proofs (seller) */}
        {refund.proofs?.length > 0 && renderMedia(refund.proofs, 'Proofs (Seller)')}

        {/* Counter Offers */}
        {refund.counter_requests && refund.counter_requests.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Counter Offers</Text>
            {refund.counter_requests.map((cr: any, idx: number) => (
              <View key={idx} style={styles.counterItem}>
                <Text style={styles.counterDate}>{formatDate(cr.requested_at)}</Text>
                <Text style={styles.counterDetail}>
                  {cr.counter_refund_type === 'keep' ? 'Keep Item' : 'Return Item'} - {cr.counter_refund_method}
                  {cr.counter_refund_amount != null && ` - ${formatCurrency(cr.counter_refund_amount)}`}
                </Text>
                {cr.notes && <Text style={styles.counterNote}>{cr.notes}</Text>}
                <Text style={styles.counterStatus}>Status: {cr.status}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Fixed Action Buttons */}
      <View style={styles.fixedActions}>{renderActionButtons()}</View>

      {/* Modals */}
      {renderModals()}
    </SafeAreaView>
  );
}

// ========== HELPER COMPONENT ==========
function InfoRow({ label, value, multiline = false }: { label: string; value: string; multiline?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, multiline && styles.infoValueMultiline]} numberOfLines={multiline ? 0 : 1}>
        {value}
      </Text>
    </View>
  );
}

// ========== STYLES ==========
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#6B7280', fontSize: 14 },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 80 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 40 : 38,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1F2937' },
  statusCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  requestNumber: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700' },
  statusDescription: { fontSize: 13, color: '#374151', marginBottom: 8, lineHeight: 18 },
  dateText: { fontSize: 12, color: '#6B7280' },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#1F2937', marginBottom: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  infoLabel: { fontSize: 13, color: '#6B7280', flex: 1 },
  infoValue: { fontSize: 13, color: '#1F2937', fontWeight: '500', flex: 2, textAlign: 'right' },
  infoValueMultiline: { textAlign: 'left', flex: 2 },
  refundItemRow: { flexDirection: 'row', marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  refundItemImage: { marginRight: 12 },
  refundItemImageThumb: { width: 60, height: 60, borderRadius: 8, backgroundColor: '#F3F4F6' },
  imagePlaceholder: { justifyContent: 'center', alignItems: 'center' },
  refundItemInfo: { flex: 1 },
  refundItemName: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 4 },
  refundItemMeta: { fontSize: 12, color: '#6B7280', marginBottom: 2 },
  refundItemPrice: { fontSize: 12, color: '#6B7280', marginBottom: 2 },
  refundItemAmount: { fontSize: 13, fontWeight: '600', color: '#10B981', marginTop: 4 },
  emptyItemText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingVertical: 16 },
  noPaymentText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginTop: 8 },
  mediaScroll: { flexDirection: 'row', marginTop: 8 },
  mediaThumbWrapper: { marginRight: 8, alignItems: 'center' },
  mediaThumb: { width: 80, height: 80, borderRadius: 8, backgroundColor: '#F3F4F6' },
  videoThumb: { position: 'relative' },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  mediaNote: { fontSize: 10, color: '#6B7280', width: 80, textAlign: 'center', marginTop: 4 },
  counterItem: { marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingBottom: 8 },
  counterDate: { fontSize: 11, color: '#6B7280' },
  counterDetail: { fontSize: 13, color: '#1F2937', fontWeight: '500' },
  counterNote: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  counterStatus: { fontSize: 11, color: '#EE4D2D', marginTop: 4 },
  fixedActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionItem: { flex: 1 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  actionBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  approveBtn: { backgroundColor: '#10B981' },
  rejectBtn: { backgroundColor: '#EF4444' },
  negotiateBtn: { backgroundColor: '#8B5CF6' },
  processBtn: { backgroundColor: '#0EA5E9' },
  trackingBtn: { backgroundColor: '#3B82F6' },
  returnStatusBtn: { backgroundColor: '#F97316' },
  verifyBtn: { backgroundColor: '#8B5CF6' },
  proofBtn: { backgroundColor: '#6B7280' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#1F2937', marginBottom: 4 },
  modalSubtitle: { fontSize: 13, color: '#6B7280', marginBottom: 14 },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 12,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#1F2937',
    height: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  label: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6 },
  radioGroup: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  radioGroupRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  radio: { flexDirection: 'row', alignItems: 'center', marginRight: 16, marginBottom: 8 },
  radioText: { marginLeft: 6, fontSize: 13, color: '#1F2937' },
  row: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  flex1: { flex: 1 },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#EE4D2D', borderRadius: 8, padding: 10, marginBottom: 8 },
  uploadText: { marginLeft: 8, color: '#EE4D2D', fontSize: 14 },
  fileCount: { fontSize: 12, color: '#6B7280', textAlign: 'center', marginBottom: 12 },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 8 },
  modalCancel: { flex: 1, backgroundColor: '#F3F4F6', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  modalCancelText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  modalConfirm: { flex: 1, backgroundColor: '#EE4D2D', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  modalConfirmText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  mediaModalOverlay: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaCloseButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  fullscreenImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
  fullscreenVideo: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
});