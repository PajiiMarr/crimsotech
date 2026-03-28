import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  StatusBar,
  Alert,
  TextInput,
  Modal,
  FlatList,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import {
  ArrowLeft, Copy, Truck, CheckCircle2, XCircle, Clock,
  RotateCcw, Box, Hourglass, MessageSquare, Search, PackageCheck,
  PackageX, Wallet, Home, Gavel, ShieldCheck, MapPin, ChevronRight,
  MoreHorizontal, AlertTriangle, Ban, ThumbsUp, ThumbsDown,
  FileText, Upload, ShoppingBag, Store, ExternalLink, Calendar,
  Printer, Eye, ArrowUpRight, ChevronDown, ChevronUp, Play
} from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import AxiosInstance from '../../contexts/axios';

// ========== STATUS CONDITION HELPERS ==========
export const STATUS_CONDITIONS = {
  showPendingStatus: (status: string) => status === 'PENDING',
  showNegotiationStatus: (status: string) => status === 'NEGOTIATION' || status === 'NEGOTIATING',
  showRejectedStatus: (status: string) => status === 'REJECTED',
  showApprovedStatus: (status: string) => status === 'APPROVED',
  showWaitingStatus: (status: string) => status === 'WAITING' || status === 'AWAITING_INFO',
  showToVerifyStatus: (status: string) => status === 'TO_VERIFY' || status === 'VERIFICATION',
  showReturnAcceptedStatus: (status: string) => status === 'RETURN_ACCEPTED',
  showReturnRejectedStatus: (status: string) => status === 'RETURN_REJECTED',
  showShippedStatus: (status: string) => status === 'SHIPPED' || status === 'ITEM_SHIPPED',
  showReceivedStatus: (status: string) => status === 'RECEIVED' || status === 'ITEM_RECEIVED',
  showDisputeStatus: (status: string) => status === 'DISPUTE' || status === 'DISPUTE_OPENED',
  showCompletedStatus: (status: string) => status === 'COMPLETED' || status === 'CLOSED',
  showProcessingStatus: (status: string) => status === 'PROCESSING' || status === 'PROCESSING_REFUND',
  showReturnShipStatus: (status: string) => status === 'RETURN_SHIP' || status === 'RETURN_SHIPPING',
  showCancelledStatus: (status: string) => status === 'CANCELLED',
};

// ========== 1. PENDING STATUS ==========
const PendingStatus = ({ refund }: { refund: any }) => {
  const refLabel = refund?.refund_id || refund?.refund || refund?.id || 'this request';
  return (
    <View style={styles.statusSection}>
      <View style={styles.statusRow}>
        <Clock size={24} color="#F59E0B" fill="#FEF3C7" />
        <View style={styles.statusTextContainer}>
          <Text style={styles.statusTitle}>Refund Pending</Text>
          <Text style={styles.statusSubtitle}>
            Your refund request <Text style={styles.boldText}>{refLabel}</Text> is pending review by the seller.
            Seller has 48 hours to respond. If the seller does not respond, the moderation team
            will automatically approve and process the refund within 3 days.
          </Text>
        </View>
      </View>
    </View>
  );
};

// ========== 2. NEGOTIATION STATUS ==========
const NegotiationStatus = ({ refund, formatCurrency }: { refund: any; formatCurrency: (amount: string | number) => string }) => {
  const getSellerSuggestionLabel = () => {
    if (!refund) return null;
    const method = (refund.seller_suggested_method || '').toString().toLowerCase().trim();
    const type = (refund.seller_suggested_type || '').toString().toLowerCase().trim();
    const m = method;
    const t = type;
    if (t === 'keep') {
      if (m === 'wallet') return 'Keep Item and Partial Refund to Wallet';
      if (m === 'bank') return 'Keep Item and Partial Bank Transfer';
      if (m === 'remittance') return 'Keep Item and Partial Money Back';
      if (m === 'voucher') return 'Keep Item and Partial Refund Voucher';
    }
    if (t === 'return') {
      if (m === 'wallet') return 'Return Item and Refund to Wallet';
      if (m === 'bank') return 'Return Item and Bank Transfer';
      if (m === 'remittance') return 'Return Item and Money Back';
      if (m === 'voucher') return 'Return Item and Store Voucher';
    }
    const fallback: Record<string, string> = {
      'wallet': 'Refund to Wallet',
      'bank': 'Bank Transfer',
      'remittance': 'Money Back',
      'voucher': 'Store Voucher'
    };
    return fallback[m] || method;
  };

  const localFriendly = (s?: string) => {
    if (s === undefined || s === null) return 'N/A';
    return String(s).replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  return (
    <View style={styles.statusSection}>
      <View style={styles.statusRow}>
        <MessageSquare size={24} color="#3B82F6" fill="#DBEAFE" />
        <View style={styles.statusTextContainer}>
          <Text style={styles.statusTitle}>Negotiation - Seller's Counter Offer</Text>
          <Text style={styles.statusSubtitle}>Review the seller's proposed solution</Text>
          <View style={styles.negotiationDetails}>
            {(() => {
              const latestCounter = Array.isArray(refund?.counter_requests) ? refund.counter_requests[0] : null;
              const counterType = latestCounter?.counter_refund_type || refund.seller_suggested_type;
              const counterMethod = latestCounter?.counter_refund_method || refund.seller_suggested_method;
              const counterAmount = latestCounter?.counter_refund_amount || refund.seller_suggested_amount;
              return (
                <>
                  <View style={styles.negotiationRow}>
                    <Text style={styles.negotiationLabel}>Seller proposed:</Text>
                    <Text style={styles.negotiationValue}>
                      {counterType ? `${localFriendly(counterType)}  ${localFriendly(counterMethod)}` : (getSellerSuggestionLabel() || refund.seller_suggested_method || 'Not specified')}
                    </Text>
                  </View>
                  {counterAmount != null && (
                    <View style={styles.negotiationRow}>
                      <Text style={styles.negotiationLabel}>Amount:</Text>
                      <Text style={[styles.negotiationValue, styles.amountValue]}>{formatCurrency(counterAmount)}</Text>
                    </View>
                  )}
                </>
              );
            })()}
          </View>
        </View>
      </View>
    </View>
  );
};

// ========== 3. REJECTED STATUS ==========
const RejectedStatus = ({ refund, formatCurrency, onDispute }: { refund: any; formatCurrency: (amount: string | number) => string; onDispute?: () => void }) => {
  const latestCounter = refund?.counter_requests?.[0];
  if (latestCounter && latestCounter.status === 'rejected') {
    const amt = latestCounter.counter_refund_amount;
    const method = latestCounter.counter_refund_method || '';
    return (
      <View style={styles.statusSection}>
        <View style={styles.statusRow}>
          <XCircle size={24} color="#EF4444" fill="#FEE2E2" />
          <View style={styles.statusTextContainer}>
            <Text style={styles.statusTitle}>Negotiation Closed</Text>
            <Text style={styles.statusSubtitle}>
              You rejected the seller's counter-offer{amt != null ? ` of ${formatCurrency(amt)}` : ''}{method ? ` via ${method}` : ''}.
            </Text>
            {latestCounter.notes && <Text style={styles.sellerNote}>Seller notes: {latestCounter.notes}</Text>}
            <Text style={styles.disputeHint}>Use the actions card to file a dispute for this case.</Text>
          </View>
        </View>
        {onDispute && <TouchableOpacity style={styles.disputeBtn} onPress={onDispute}><Text style={styles.disputeBtnText}>File a Dispute</Text></TouchableOpacity>}
      </View>
    );
  }
  return (
    <View style={styles.statusSection}>
      <View style={styles.statusRow}>
        <XCircle size={24} color="#EF4444" fill="#FEE2E2" />
        <View style={styles.statusTextContainer}>
          <Text style={styles.statusTitle}>Refund Rejected</Text>
          <Text style={styles.statusSubtitle}>{refund.seller_response || 'No specific reason provided by seller'}</Text>
          <Text style={styles.disputeHint}>Use the actions card to file a dispute for this case.</Text>
        </View>
      </View>
      {onDispute && <TouchableOpacity style={styles.disputeBtn} onPress={onDispute}><Text style={styles.disputeBtnText}>File a Dispute</Text></TouchableOpacity>}
    </View>
  );
};

// ========== 4. APPROVED STATUS ==========
const ApprovedStatus = ({ refund, onOpenTrackingDialog, formatCurrency, formatDate }: { refund: any; onOpenTrackingDialog?: () => void; formatCurrency: (amount: string | number) => string; formatDate: (dateString: string) => string }) => {
  const isReturnItem = refund.refund_type === 'return';
  const rr = refund.return_request || {};
  const rrStatus = String(rr?.status || '').toLowerCase();
  const payStatus = String(refund.refund_payment_status || '').toLowerCase();
  const hasShippingInfo = Boolean(rr.tracking_number) || rrStatus === 'shipped' || rrStatus === 'received';
  const dr = refund.dispute || refund.dispute_request || null;
  const isProcessing = (
    (isReturnItem && rrStatus === 'approved' && payStatus === 'processing' && refund.status?.toLowerCase() === 'approved') ||
    (!isReturnItem && payStatus === 'processing' && refund.status?.toLowerCase() === 'approved') ||
    (dr && dr.status?.toLowerCase() === 'approved' && refund.status?.toLowerCase() === 'approved' && payStatus === 'processing')
  );
  const finalType = String(refund.final_refund_type || refund.refund_type || '').toLowerCase();
  const isReturnAcceptedWaitingModeration = rrStatus === 'approved' && refund.status?.toLowerCase() === 'approved' && payStatus === 'pending' && finalType === 'return';
  const returnDeadline = refund.processed_at ? new Date(new Date(refund.processed_at).getTime() + 7 * 24 * 60 * 60 * 1000) : null;

  if (isProcessing) return <ProcessingStatus refund={refund} formatCurrency={formatCurrency} />;
  if ((payStatus === 'completed' && refund.status?.toLowerCase() === 'approved') || refund.status?.toLowerCase() === 'completed') {
    return <CompletedStatus refund={refund} formatCurrency={formatCurrency} formatDate={formatDate} />;
  }

  return (
    <View style={styles.statusSection}>
      <View style={styles.statusRow}>
        <CheckCircle2 size={24} color="#10B981" fill="#D1FAE5" />
        <View style={styles.statusTextContainer}>
          <Text style={styles.statusTitle}>Refund Approved</Text>
          {!isReturnItem ? (
            <Text style={styles.statusSubtitle}>Your refund will be processed soon</Text>
          ) : (
            isReturnAcceptedWaitingModeration ? (
              <View style={styles.moderationCard}>
                <Text style={styles.moderationTitle}>Return Accepted</Text>
                <Text style={styles.moderationText}>Seller accepted your return request. Waiting for the moderation team to process the refund.</Text>
                {refund.return_request?.return_deadline && <Text style={styles.moderationDeadline}>Return Deadline: {formatDate(refund.return_request.return_deadline)}</Text>}
              </View>
            ) : !hasShippingInfo ? (
              <Text style={styles.statusSubtitle}>Please return the item to complete your refund</Text>
            ) : null
          )}
        </View>
      </View>
      {isReturnItem && !hasShippingInfo && (
        <View style={styles.returnDetails}>
          <View style={styles.returnDetailRow}>
            <Text style={styles.returnDetailLabel}>Return Deadline:</Text>
            <Text style={styles.returnDetailValue}>
              {rr.return_deadline || refund.return_deadline ? formatDate(rr.return_deadline || refund.return_deadline) : (returnDeadline ? formatDate(returnDeadline.toISOString()) : 'Not set')}
            </Text>
          </View>
          <View style={styles.returnDetailRow}>
            <Text style={styles.returnDetailLabel}>Return Address:</Text>
            <View style={styles.returnAddress}>
              {refund.return_address ? (
                <>
                  <Text style={styles.addressName}>{refund.return_address.recipient_name} — {refund.return_address.contact_number}</Text>
                  <Text style={styles.addressText}>
                    {refund.return_address.street}, {refund.return_address.barangay}, {refund.return_address.city}, {refund.return_address.province} {refund.return_address.zip_code}, {refund.return_address.country}
                  </Text>
                  {refund.return_address.notes && <Text style={styles.addressNotes}>{refund.return_address.notes}</Text>}
                </>
              ) : (
                <Text style={styles.addressText}>Not provided</Text>
              )}
            </View>
          </View>
        </View>
      )}
      {isReturnItem && rrStatus === 'shipped' && (
        <View style={styles.shippedInfo}>
          <Text style={styles.shippedTitle}>Item has been shipped</Text>
          <Text style={styles.shippedSubtitle}>Waiting for the seller to receive the item.</Text>
          <View style={styles.shippingDetails}>
            {rr.tracking_number && (
              <View style={styles.shippingDetail}>
                <Text style={styles.shippingLabel}>Tracking Number:</Text>
                <Text style={styles.shippingValue}>{rr.tracking_number}</Text>
              </View>
            )}
            {rr.logistic_service && (
              <View style={styles.shippingDetail}>
                <Text style={styles.shippingLabel}>Shipping Service:</Text>
                <Text style={styles.shippingValue}>{rr.logistic_service}</Text>
              </View>
            )}
            {rr.shipped_at && (
              <View style={styles.shippingDetail}>
                <Text style={styles.shippingLabel}>Shipped At:</Text>
                <Text style={styles.shippingValue}>{formatDate(rr.shipped_at)}</Text>
              </View>
            )}
          </View>
          {onOpenTrackingDialog && !isReturnAcceptedWaitingModeration && (
            <TouchableOpacity style={styles.updateShippingBtn} onPress={onOpenTrackingDialog}>
              <Text style={styles.updateShippingText}>Update shipping info</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

// ========== 5. WAITING STATUS ==========
const WaitingStatus = ({ refund, onOpenTrackingDialog, formatDate }: { refund: any; onOpenTrackingDialog?: () => void; formatDate: (dateString: string) => string }) => {
  const rr = refund.return_request || {};
  const deadline = rr.return_deadline || refund.return_deadline;
  const deadlineDate = deadline ? new Date(deadline) : null;
  const daysLeft = deadlineDate ? Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
  const isShipped = ['shipped', 'received', 'inspected', 'completed'].includes(rr.status);
  const [showDetails, setShowDetails] = useState(false);
  return (
    <View style={styles.statusSection}>
      <View style={styles.statusRow}>
        <Box size={24} color="#3B82F6" fill="#DBEAFE" />
        <View style={styles.statusTextContainer}>
          <Text style={styles.statusTitle}>Waiting for Return</Text>
          <Text style={styles.statusSubtitle}>{isShipped ? 'Your return is in progress. Track the status below.' : 'Please prepare your shipment to send the item back to the seller.'}</Text>
        </View>
      </View>
      {refund.return_address && (
        <View style={styles.returnAddressCard}>
          <Text style={styles.returnAddressTitle}>Return address</Text>
          <Text style={styles.returnAddressText}>{refund.return_address.recipient_name} — {refund.return_address.contact_number}</Text>
          <Text style={styles.returnAddressText}>{refund.return_address.street}, {refund.return_address.barangay}, {refund.return_address.city}, {refund.return_address.province} {refund.return_address.zip_code}, {refund.return_address.country}</Text>
        </View>
      )}
      <View style={styles.waitingDetails}>
        {rr.return_method && (
          <View style={styles.waitingDetailRow}><Truck size={16} color="#666" /><Text style={styles.waitingDetailText}>Method: {rr.return_method}</Text></View>
        )}
        {deadlineDate && (
          <View style={styles.waitingDetailRow}>
            <Calendar size={16} color="#666" />
            <Text style={styles.waitingDetailText}>
              Deadline: {formatDate(deadlineDate.toISOString())}
              {daysLeft !== null && (
                <Text style={[styles.daysLeft, daysLeft <= 3 ? styles.daysLeftRed : daysLeft <= 7 ? styles.daysLeftYellow : styles.daysLeftGreen]}>
                  {' '}({daysLeft} day{daysLeft === 1 ? '' : 's'} left)
                </Text>
              )}
            </Text>
          </View>
        )}
      </View>
      {isShipped && rr.status === 'shipped' && (
        <View style={styles.shippedCard}>
          <Text style={styles.shippedTitle}>Item has been shipped</Text>
          <Text style={styles.shippedSubtitle}>Waiting for the seller to receive the item.</Text>
          {rr.tracking_number && (
            <View style={styles.shippingDetail}>
              <Text style={styles.shippingLabel}>Tracking:</Text>
              <Text style={styles.shippingValue}>{rr.tracking_number}</Text>
            </View>
          )}
          {onOpenTrackingDialog && <TouchableOpacity style={styles.updateShippingBtn} onPress={onOpenTrackingDialog}><Text style={styles.updateShippingText}>Update shipping info</Text></TouchableOpacity>}
        </View>
      )}
      <TouchableOpacity style={styles.toggleDetailsBtn} onPress={() => setShowDetails(!showDetails)}>
        <Text style={styles.toggleDetailsText}>{showDetails ? 'Hide return details' : 'Show return details'}</Text>
        {showDetails ? <ChevronUp size={16} color="#3B82F6" /> : <ChevronDown size={16} color="#3B82F6" />}
      </TouchableOpacity>
    </View>
  );
};

// ========== 6. TO VERIFY STATUS ==========
const ToVerifyStatus = () => (
  <View style={styles.statusSection}>
    <View style={styles.statusRow}>
      <Search size={24} color="#3B82F6" fill="#DBEAFE" />
      <View style={styles.statusTextContainer}>
        <Text style={styles.statusTitle}>Item Verification in Progress</Text>
        <Text style={styles.statusSubtitle}>Seller is checking the returned item's condition. This usually takes 1-3 business days.</Text>
      </View>
    </View>
  </View>
);

// ========== 7. RETURN ACCEPTED STATUS ==========
const ReturnAcceptedStatus = () => (
  <View style={styles.statusSection}>
    <View style={styles.statusRow}>
      <PackageCheck size={24} color="#10B981" fill="#D1FAE5" />
      <View style={styles.statusTextContainer}>
        <Text style={styles.statusTitle}>Return Accepted</Text>
        <Text style={styles.statusSubtitle}>Please ship the item back now.</Text>
      </View>
    </View>
  </View>
);

// ========== 8. RETURN REJECTED STATUS ==========
const ReturnRejectedStatus = ({ onDispute }: { onDispute?: () => void }) => (
  <View style={styles.statusSection}>
    <View style={styles.statusRow}>
      <PackageX size={24} color="#EF4444" fill="#FEE2E2" />
      <View style={styles.statusTextContainer}>
        <Text style={styles.statusTitle}>Return Rejected</Text>
        <Text style={styles.statusSubtitle}>Item did not pass quality check.</Text>
      </View>
    </View>
    {onDispute && <TouchableOpacity style={styles.disputeBtn} onPress={onDispute}><Text style={styles.disputeBtnText}>Dispute Decision</Text></TouchableOpacity>}
  </View>
);

// ========== 9. SHIPPED STATUS ==========
const ShippedStatus = () => (
  <View style={styles.statusSection}>
    <View style={styles.statusRow}>
      <Truck size={24} color="#3B82F6" fill="#DBEAFE" />
      <View style={styles.statusTextContainer}>
        <Text style={styles.statusTitle}>Item Shipped</Text>
        <Text style={styles.statusSubtitle}>The item is on its way to warehouse.</Text>
      </View>
    </View>
  </View>
);

// ========== 10. RECEIVED STATUS ==========
const ReceivedStatus = () => (
  <View style={styles.statusSection}>
    <View style={styles.statusRow}>
      <Home size={24} color="#3B82F6" fill="#DBEAFE" />
      <View style={styles.statusTextContainer}>
        <Text style={styles.statusTitle}>Item Received</Text>
        <Text style={styles.statusSubtitle}>Seller has received your package. Seller will inspect the item</Text>
      </View>
    </View>
  </View>
);

// ========== 11. DISPUTE STATUS ==========
const DisputeStatus = ({ refund, formatCurrency, formatDate, onAcknowledgeDispute }: { refund: any; formatCurrency: (amount: string | number) => string; formatDate: (dateString: string) => string; onAcknowledgeDispute?: () => void }) => {
  const dr = refund.dispute || refund.dispute_request || null;
  if (dr && dr.status?.toLowerCase() === 'approved' && refund.return_request?.status?.toLowerCase() === 'rejected') {
    return (
      <View style={styles.statusSection}>
        <View style={styles.statusRow}>
          <CheckCircle2 size={24} color="#10B981" fill="#D1FAE5" />
          <View style={styles.statusTextContainer}>
            <Text style={styles.statusTitle}>Dispute Approved</Text>
            <Text style={styles.statusSubtitle}>Your dispute has been approved by the administrator. The admin will process the refund request — you will be notified once the refund is processed.</Text>
            {dr.resolved_at && <Text style={styles.disputeDate}>Approved at: {formatDate(dr.resolved_at)}</Text>}
          </View>
        </View>
      </View>
    );
  }
  if (dr && dr.status?.toLowerCase() === 'under_review') {
    return (
      <View style={styles.statusSection}>
        <View style={styles.statusRow}>
          <Hourglass size={24} color="#0EA5E9" fill="#E0F2FE" />
          <View style={styles.statusTextContainer}>
            <Text style={styles.statusTitle}>Under Review</Text>
            <Text style={styles.statusSubtitle}>Your dispute is currently under review by the moderation team. We will notify you once a decision has been made.</Text>
            {dr.created_at && <Text style={styles.disputeDate}>Filed at: {formatDate(dr.created_at)}</Text>}
          </View>
        </View>
      </View>
    );
  }
  if (dr && dr.status?.toLowerCase() === 'partial') {
    const amt = refund.approved_refund_amount != null ? refund.approved_refund_amount : null;
    return (
      <View style={styles.statusSection}>
        <View style={styles.statusRow}>
          <ShieldCheck size={24} color="#7C3AED" fill="#F3E8FF" />
          <View style={styles.statusTextContainer}>
            <Text style={styles.statusTitle}>Partial Refund Decision</Text>
            <Text style={styles.statusSubtitle}>The moderation team decided to issue a partial refund.</Text>
            {amt != null && <Text style={styles.partialAmount}>Amount: {formatCurrency(amt)}</Text>}
            {dr.updated_at && <Text style={styles.disputeDate}>Decided at: {formatDate(dr.updated_at)}</Text>}
          </View>
        </View>
      </View>
    );
  }
  if (dr && dr.status?.toLowerCase() === 'approved') {
    const payStatus = String(refund.refund_payment_status || '').toLowerCase();
    const refundStatus = refund.status?.toLowerCase();
    if (refundStatus === 'approved' && payStatus === 'processing') {
      return (
        <View style={styles.statusSection}>
          <View style={styles.statusRow}>
            <CheckCircle2 size={24} color="#10B981" fill="#D1FAE5" />
            <View style={styles.statusTextContainer}>
              <Text style={styles.statusTitle}>Dispute Approved</Text>
              <Text style={styles.statusSubtitle}>Your dispute has been approved by the administrator. The admin will process the refund.</Text>
              {dr.resolved_at && <Text style={styles.disputeDate}>Approved at: {formatDate(dr.resolved_at)}</Text>}
              <View style={styles.processingDetails}><ProcessingStatus refund={refund} formatCurrency={formatCurrency} /></View>
            </View>
          </View>
        </View>
      );
    }
    return (
      <View style={styles.statusSection}>
        <View style={styles.statusRow}>
          <CheckCircle2 size={24} color="#10B981" fill="#D1FAE5" />
          <View style={styles.statusTextContainer}>
            <Text style={styles.statusTitle}>Dispute Approved</Text>
            <Text style={styles.statusSubtitle}>Your dispute has been approved by the administrator. The admin will process the refund request — you will be notified once the refund is processed.</Text>
            {dr.resolved_at && <Text style={styles.disputeDate}>Approved at: {formatDate(dr.resolved_at)}</Text>}
          </View>
        </View>
      </View>
    );
  }
  if (dr && dr.status?.toLowerCase() === 'rejected' && refund.status?.toLowerCase() === 'dispute') {
    return (
      <View style={styles.statusSection}>
        <View style={styles.statusRow}>
          <XCircle size={24} color="#EF4444" fill="#FEE2E2" />
          <View style={styles.statusTextContainer}>
            <Text style={styles.statusTitle}>Dispute Rejected</Text>
            <Text style={styles.statusSubtitle}>The administrator has rejected your dispute for this refund. The refund remains in dispute — if you believe this is a mistake, you can confirm you received this decision.</Text>
            {onAcknowledgeDispute && <TouchableOpacity style={styles.acknowledgeBtn} onPress={onAcknowledgeDispute}><Text style={styles.acknowledgeBtnText}>Confirm Decision</Text></TouchableOpacity>}
          </View>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.statusSection}>
      <View style={styles.statusRow}>
        <Gavel size={24} color="#7C3AED" fill="#EDE9FE" />
        <View style={styles.statusTextContainer}>
          <Text style={styles.statusTitle}>Dispute Opened</Text>
          <Text style={styles.statusSubtitle}>Case is under administrative review. An administrator will review all evidence and communications.</Text>
        </View>
      </View>
    </View>
  );
};

// ========== 12. COMPLETED STATUS ==========
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CompletedStatus = ({ refund, formatCurrency, formatDate }: { refund: any; formatCurrency: (amount: string | number) => string; formatDate: (dateString: string) => string }) => {
  const dr = refund.dispute || refund.dispute_request || null;
  const isResolved = dr && dr.status?.toLowerCase() === 'resolved';
  const [proofModalVisible, setProofModalVisible] = useState(false);
  const [proofUrls, setProofUrls] = useState<string[]>([]);
  const [proofIndex, setProofIndex] = useState(0);
  const proofs = Array.isArray(refund.proofs) ? refund.proofs : [];
  const openProofViewer = (index = 0) => {
    const urls = proofs.map((p: any) => p.file_url).filter(Boolean);
    if (urls.length === 0) return;
    setProofUrls(urls);
    setProofIndex(index);
    setProofModalVisible(true);
  };
  return (
    <View style={styles.statusSection}>
      <View style={styles.statusRow}>
        <ShieldCheck size={24} color="#10B981" fill="#D1FAE5" />
        <View style={styles.statusTextContainer}>
          <Text style={styles.statusTitle}>Refund Completed</Text>
          <Text style={styles.statusSubtitle}>
            Your refund has been successfully completed.
            {refund.approved_refund_amount && <Text style={styles.amountText}> {formatCurrency(refund.approved_refund_amount)}</Text>}
          </Text>
          {isResolved && (
            <View style={styles.resolvedCard}>
              <Text style={styles.resolvedTitle}>Resolved After Dispute</Text>
              <Text style={styles.resolvedText}>This refund was completed after an administrative review of the dispute.</Text>
              {dr.processed_by && <Text style={styles.resolvedDetail}>Processed by: <Text style={styles.resolvedValue}>{dr.processed_by?.username || dr.processed_by?.email || 'Admin'}</Text></Text>}
              {dr.resolved_at && <Text style={styles.resolvedDetail}>Resolved at: {formatDate(dr.resolved_at)}</Text>}
            </View>
          )}
          {proofs.length > 0 && (
            <View style={{ marginTop: 12 }}>
              <Text style={{ fontSize: 14, color: '#374151', marginBottom: 8, fontWeight: '600' }}>Proofs</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.proofRow}>
                {proofs.map((p: any, idx: number) => (
                  <TouchableOpacity key={p.id || idx} onPress={() => openProofViewer(idx)} style={styles.proofThumbWrapper}>
                    <Image source={{ uri: p.file_url }} style={styles.proofThumb} resizeMode="cover" />
                    {p.notes ? <Text style={styles.proofNote} numberOfLines={1}>{p.notes}</Text> : null}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          <Modal animationType="fade" transparent={true} visible={proofModalVisible} onRequestClose={() => setProofModalVisible(false)}>
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContainer, { width: '95%', padding: 0, backgroundColor: '#000' }]}>
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={() => setProofModalVisible(false)} style={styles.closeButton}><Ionicons name="close" size={28} color="#FFF" /></TouchableOpacity>
                </View>
                <FlatList
                  data={proofUrls}
                  keyExtractor={(item, i) => `${i}`}
                  horizontal
                  pagingEnabled
                  initialScrollIndex={proofIndex}
                  getItemLayout={(_data, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
                  onMomentumScrollEnd={(event) => { const idx = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH); setProofIndex(idx); }}
                  renderItem={({ item }) => (
                    <View style={styles.modalImageContainer}>
                      <Image source={{ uri: item }} style={styles.modalImage} resizeMode="contain" />
                    </View>
                  )}
                />
                <View style={styles.modalFooter}>
                  <Text style={styles.modalImageCounter}>{proofIndex + 1} / {proofUrls.length}</Text>
                </View>
              </View>
            </View>
          </Modal>
        </View>
      </View>
    </View>
  );
};

// ========== 13. PROCESSING STATUS ==========
const ProcessingStatus = ({ refund, formatCurrency }: { refund: any; formatCurrency: (amount: string | number) => string }) => (
  <View style={styles.statusSection}>
    <View style={styles.statusRow}>
      <RotateCcw size={24} color="#3B82F6" fill="#DBEAFE" />
      <View style={styles.statusTextContainer}>
        <Text style={styles.statusTitle}>Refund Processing</Text>
        <Text style={styles.statusSubtitle}>Your refund is being processed</Text>
        <View style={styles.processingDetails}>
          <Text style={styles.processingDetail}>Amount: <Text style={styles.amountText}>{formatCurrency(refund.total_refund_amount || 0)}</Text></Text>
          <Text style={styles.processingDetail}>Method: <Text style={styles.methodText}>{refund.final_refund_method || refund.buyer_preferred_refund_method}</Text></Text>
        </View>
      </View>
    </View>
  </View>
);

// ========== 14. RETURN SHIP STATUS ==========
const ReturnShipStatus = () => (
  <View style={styles.statusSection}>
    <View style={styles.statusRow}>
      <Box size={24} color="#3B82F6" fill="#DBEAFE" />
      <View style={styles.statusTextContainer}>
        <Text style={styles.statusTitle}>Return Shipping</Text>
        <Text style={styles.statusSubtitle}>Your parcel has been picked up.</Text>
      </View>
    </View>
  </View>
);

// ========== 15. CANCELLED STATUS ==========
const CancelledStatus = () => (
  <View style={styles.statusSection}>
    <View style={styles.statusRow}>
      <Ban size={24} color="#6B7280" fill="#F3F4F6" />
      <View style={styles.statusTextContainer}>
        <Text style={styles.statusTitle}>Request Cancelled</Text>
        <Text style={styles.statusSubtitle}>This refund request is no longer active</Text>
      </View>
    </View>
  </View>
);

// ========== 16. APPROVED PICKUP STATUS (for cash pickup returns) ==========
const ApprovedPickupStatus = () => (
  <View style={styles.statusSection}>
    <View style={styles.statusRow}>
      <CheckCircle2 size={24} color="#10B981" fill="#D1FAE5" />
      <View style={styles.statusTextContainer}>
        <Text style={styles.statusTitle}>Approved</Text>
        <Text style={styles.statusSubtitle}>Please return the item within the specified return window (days/time) to complete your refund.</Text>
      </View>
    </View>
  </View>
);

// ========== ACTION BUTTONS COMPONENTS ==========
const PendingActions = ({ onCancel, loading }: { onCancel: () => void; loading: boolean }) => (
  <TouchableOpacity style={[styles.secondaryButton, loading && styles.disabledButton]} onPress={onCancel} disabled={loading}>
    <Ban size={16} color="#374151" /><Text style={styles.secondaryButtonText}>Cancel Request</Text>
  </TouchableOpacity>
);

const NegotiationActions = ({ onAccept, onReject, loading, isAccepting }: { onAccept: () => void; onReject: () => void; loading: boolean; isAccepting: boolean }) => (
  <>
    <TouchableOpacity style={[styles.primaryButton, (loading || isAccepting) && styles.disabledButton]} onPress={onAccept} disabled={loading || isAccepting}>
      <ThumbsUp size={16} color="#FFF" /><Text style={styles.primaryButtonText}>Accept Offer</Text>
    </TouchableOpacity>
    <TouchableOpacity style={[styles.secondaryButton, loading && styles.disabledButton]} onPress={onReject} disabled={loading}>
      <ThumbsDown size={16} color="#374151" /><Text style={styles.secondaryButtonText}>Reject Offer</Text>
    </TouchableOpacity>
  </>
);

const ReturnActions = ({ onAddTracking, onWalkIn, loading }: { onAddTracking: () => void; onWalkIn?: () => void; loading: boolean }) => (
  <>
    <TouchableOpacity style={[styles.primaryButton, loading && styles.disabledButton]} onPress={onAddTracking} disabled={loading}>
      <Upload size={16} color="#FFF" /><Text style={styles.primaryButtonText}>Provide Shipping Info</Text>
    </TouchableOpacity>
    <TouchableOpacity style={[styles.secondaryButton, loading && styles.disabledButton]} onPress={onWalkIn} disabled={loading}>
      <Store size={16} color="#374151" /><Text style={styles.secondaryButtonText}>Walk in Return</Text>
    </TouchableOpacity>
  </>
);

const RejectedActions = ({ onFileDispute, loading }: { onFileDispute: () => void; loading: boolean }) => (
  <TouchableOpacity style={[styles.primaryButton, loading && styles.disabledButton]} onPress={onFileDispute} disabled={loading}>
    <AlertTriangle size={16} color="#FFF" /><Text style={styles.primaryButtonText}>File a Dispute</Text>
  </TouchableOpacity>
);

const DisputeActions = ({ onAcknowledge, loading, acknowledged }: { onAcknowledge: () => void; loading: boolean; acknowledged: boolean }) => (
  <TouchableOpacity style={[styles.primaryButton, (loading || acknowledged) && styles.disabledButton]} onPress={onAcknowledge} disabled={loading || acknowledged}>
    <Text style={styles.primaryButtonText}>{loading ? 'Confirming...' : acknowledged ? 'Acknowledged' : 'Confirm Decision'}</Text>
  </TouchableOpacity>
);

const DefaultActions = ({ onBack }: { onBack: () => void }) => (
  <TouchableOpacity style={styles.secondaryButton} onPress={onBack}>
    <ArrowLeft size={16} color="#374151" /><Text style={styles.secondaryButtonText}>Back to Requests</Text>
  </TouchableOpacity>
);

// ========== MAIN PAGE ==========
export default function ViewRefundPage() {
  const { user } = useAuth();
  const { refundId } = useLocalSearchParams();
  const router = useRouter();
  const [refund, setRefund] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [shippingAddress, setShippingAddress] = useState<any | null>(null);
  const [loadingShippingAddress, setLoadingShippingAddress] = useState(false);
  const [showTrackingForm, setShowTrackingForm] = useState(false);
  const [trackingForm, setTrackingForm] = useState({ logistic_service: '', tracking_number: '', shipped_at: '', notes: '' });
  const [showWalkInConfirm, setShowWalkInConfirm] = useState(false);
  const [proofModalVisible, setProofModalVisible] = useState(false);
  const [proofUrls, setProofUrls] = useState<string[]>([]);
  const [proofIndex, setProofIndex] = useState(0);
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);

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
      // Try detailed endpoint first
      try {
        const detailResp = await AxiosInstance.get(`/return-refund/${encodeURIComponent(String(refundId))}/get_my_refund/`, {
          headers: { 'X-User-Id': user.id }
        });
        if (detailResp?.data) {
          setRefund(detailResp.data);
          return;
        }
      } catch (detailErr) {
        console.warn('Detailed refund fetch failed, falling back to list', detailErr);
      }
      // Fallback to list
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

  useEffect(() => {
    if (!refund) return;
    const hasShipping = !!((refund.shipping_info && (refund.shipping_info.recipient_name || refund.shipping_info.full_address)) || (refund.order && refund.order.shipping_address));
    if (hasShipping) return;
    if (!user?.id) return;
    let mounted = true;
    const fetchDefaultAddress = async () => {
      try {
        setLoadingShippingAddress(true);
        const resp = await AxiosInstance.get('/shipping-address/get_shipping_addresses/', { params: { user_id: user.id } });
        if (resp.data && resp.data.success) {
          const defaultAddr = resp.data.default_shipping_address || (resp.data.shipping_addresses && resp.data.shipping_addresses[0]) || null;
          if (mounted && defaultAddr) setShippingAddress(defaultAddr);
        }
      } catch (e) { console.error(e); }
      finally { if (mounted) setLoadingShippingAddress(false); }
    };
    fetchDefaultAddress();
    return () => { mounted = false; };
  }, [refund, user?.id]);

  // Action handlers
  const handleDispute = () => {
    Alert.alert('File a Dispute', 'Explain why you believe the seller\'s decision was incorrect.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Continue', onPress: async () => {
        try {
          setActionLoading(true);
          await AxiosInstance.post(`/return-refund/${refundId}/file_dispute/`, { dispute_reason: 'Buyer disagree with seller decision' }, { headers: { 'X-User-Id': user?.id } });
          Alert.alert('Success', 'Dispute filed successfully');
          await fetchRefund();
        } catch (err: any) { Alert.alert('Error', err?.response?.data?.error || err?.message || 'Failed to file dispute'); }
        finally { setActionLoading(false); }
      }}
    ]);
  };
  const handleCancelRefund = () => {
    if (!refund) return;
    const id = refund.refund_id || refund.id;
    Alert.alert('Cancel Refund', 'Are you sure you want to cancel this refund request?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes', onPress: async () => {
        try {
          setActionLoading(true);
          await AxiosInstance.post(`/return-refund/${encodeURIComponent(String(id))}/cancel_refund/`, null, { headers: { 'X-User-Id': user?.id } });
          Alert.alert('Success', 'Refund cancelled successfully');
          await fetchRefund();
        } catch (err: any) { Alert.alert('Error', err?.response?.data?.error || err?.message || 'Failed to cancel refund'); }
        finally { setActionLoading(false); }
      }}
    ]);
  };
  const handleRejectOffer = () => {
    Alert.alert('Reject Offer', 'Provide a reason for rejecting the seller\'s offer.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reject', onPress: async () => {
        try {
          setActionLoading(true);
          await AxiosInstance.post(`/return-refund/${refundId}/respond_to_negotiation/`, { action: 'reject', reason: 'Buyer rejected the offer' }, { headers: { 'X-User-Id': user?.id } });
          Alert.alert('Success', 'Offer rejected successfully');
          await fetchRefund();
        } catch (err: any) { Alert.alert('Error', err?.response?.data?.error || err?.message || 'Failed to reject offer'); }
        finally { setActionLoading(false); }
      }}
    ]);
  };
  const handleAcceptOffer = async () => {
    if (!refund) return;
    const method = (refund.seller_suggested_method || '').toString().toLowerCase().trim();
    const hasPaymentDetail = () => {
      const selected = refund.payment_details?.selected_payment;
      if (!selected) return false;
      switch (method) {
        case 'wallet': return Boolean(selected.account_number);
        case 'bank': return Boolean(selected.account_number);
        case 'remittance': return Boolean(selected.account_number);
        default: return true;
      }
    };
    if (method === 'voucher' || !method || hasPaymentDetail()) {
      try {
        setIsAccepting(true);
        await AxiosInstance.post(`/return-refund/${refundId}/respond_to_negotiation/`, { action: 'accept', reason: 'Accepted seller offer' }, { headers: { 'X-User-Id': user?.id } });
        Alert.alert('Success', 'Offer accepted successfully');
        await fetchRefund();
      } catch (err: any) { Alert.alert('Error', err?.response?.data?.error || err?.message || 'Failed to accept offer'); }
      finally { setIsAccepting(false); }
    } else {
      Alert.alert('Payment Method Required', 'You need to add a payment method before accepting this offer.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Add Payment Method', onPress: () => { /* navigate to add payment method */ } }
      ]);
    }
  };
  const handleOpenTrackingForm = () => { setTrackingForm({ logistic_service: '', tracking_number: '', shipped_at: '', notes: '' }); setShowTrackingForm(true); };
  const handleAddTracking = () => handleOpenTrackingForm();
  const handleOpenWalkInConfirm = () => setShowWalkInConfirm(true);
  const handleConfirmWalkIn = async () => {
    try {
      setActionLoading(true);
      if (!refund.return_request) {
        await AxiosInstance.post(`/return-refund/${refundId}/start_return_process/`, {}, { headers: { 'X-User-Id': user?.id } });
      }
      await AxiosInstance.post(`/return-refund/${refundId}/update_tracking/`, {}, { headers: { 'X-User-Id': user?.id } });
      Alert.alert('Success', 'Walk-in return recorded. Please bring the item to the store address shown.');
      setShowWalkInConfirm(false);
      await fetchRefund();
    } catch (err: any) { Alert.alert('Error', err?.response?.data?.error || err?.message || 'Failed to record walk-in return'); }
    finally { setActionLoading(false); }
  };
  const handleSubmitTrackingForm = async () => {
    if (!trackingForm.logistic_service || !trackingForm.tracking_number) {
      Alert.alert('Missing fields', 'Please provide both service and tracking number');
      return;
    }
    try {
      setActionLoading(true);
      if (!refund.return_request) {
        await AxiosInstance.post(`/return-refund/${refundId}/start_return_process/`, {}, { headers: { 'X-User-Id': user?.id } });
      }
      const payload: any = {
        logistic_service: trackingForm.logistic_service,
        tracking_number: trackingForm.tracking_number,
      };
      if (trackingForm.shipped_at) payload.shipped_at = trackingForm.shipped_at;
      if (trackingForm.notes) payload.notes = trackingForm.notes;
      await AxiosInstance.post(`/return-refund/${refundId}/update_tracking/`, payload, { headers: { 'X-User-Id': user?.id } });
      Alert.alert('Success', 'Shipping information submitted');
      setShowTrackingForm(false);
      await fetchRefund();
    } catch (err: any) { Alert.alert('Error', err?.response?.data?.error || err?.message || 'Failed to submit tracking info'); }
    finally { setActionLoading(false); }
  };
  const handleAcknowledgeDispute = async () => {
    const dr = refund?.dispute || refund?.dispute_request;
    if (!dr?.id) return;
    try {
      setActionLoading(true);
      const resp = await AxiosInstance.post(`/disputes/${dr.id}/acknowledge/`, {}, { headers: { 'X-User-Id': user?.id } });
      if (resp.status === 200) {
        setAcknowledged(true);
        Alert.alert('Success', 'You have acknowledged the admin decision.');
        await fetchRefund();
      }
    } catch (err: any) { Alert.alert('Error', err?.response?.data?.error || err?.message || 'Failed to acknowledge dispute'); }
    finally { setActionLoading(false); }
  };
  const copyToClipboard = (text: string) => { console.log('Copy to clipboard:', text); };
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };
  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
    if (isNaN(num)) return '₱0.00';
    return `₱${num.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  };
  const friendlyLabel = (s?: string) => {
    if (!s) return 'N/A';
    return s.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };
  const normalizeAddress = (addr?: string) => {
    if (!addr) return '';
    const parts = String(addr).split(',').map(p => p.trim()).filter(Boolean);
    const deduped: string[] = [];
    parts.forEach((p, i) => { if (i === 0 || p !== parts[i-1]) deduped.push(p); });
    return deduped.join(', ');
  };

  const buildRefundItems = () => {
    const orderItems = refund.order_items || [];
    const refundItems = refund.items || [];
    const refundMap = new Map();
    refundItems.forEach((ri: any) => refundMap.set(ri.checkout_id, ri));
    return orderItems.map((oi: any) => {
      const ri = refundMap.get(oi.checkout_id);
      return {
        ...oi,
        refundQuantity: ri ? ri.quantity : 0,
        refundAmount: ri ? ri.amount : 0,
      };
    });
  };

  // Helper to check if media is video
  const isVideoMedia = (media: any) => {
    const url = media.file_url;
    if (!url) return false;
    const ext = url.split('.').pop()?.toLowerCase();
    return ['mp4', 'mov', 'm4v', '3gp', 'mkv', 'webm'].includes(ext || '');
  };

  const openVideoViewer = (url: string) => {
    setCurrentVideoUrl(url);
    setVideoModalVisible(true);
  };

  const renderRefundStatus = (status: string) => {
    const statusUpper = (status || '').toUpperCase();
    const payStatusLog = String(refund.refund_payment_status || '').toLowerCase();
    const refundTypeLog = String(refund.final_refund_type || refund.refund_type || '').toLowerCase();
    const rrLog = refund.return_request || {};
    const getReturnItemsLog = () => {
      if (Array.isArray(rrLog.items)) return rrLog.items;
      if (Array.isArray(refund.return_request_items)) return refund.return_request_items;
      if (Array.isArray(refund.return_items)) return refund.return_items;
      if (Array.isArray(rrLog.return_items)) return rrLog.return_items;
      if (rrLog.items && typeof rrLog.items === 'object' && !Array.isArray(rrLog.items)) return Object.values(rrLog.items);
      return [];
    };
    const returnItemsLog = getReturnItemsLog();
    const itemStatusesLog = Array.isArray(returnItemsLog) ? returnItemsLog.map((it: any) => String(it?.status || it?.item_status || it?.return_status || it?.status_display || it?.state || '').toLowerCase()) : [];

    if (STATUS_CONDITIONS.showPendingStatus(statusUpper)) return <PendingStatus refund={refund} />;
    if (STATUS_CONDITIONS.showNegotiationStatus(statusUpper)) return <NegotiationStatus refund={refund} formatCurrency={formatCurrency} />;
    if (STATUS_CONDITIONS.showRejectedStatus(statusUpper)) return <RejectedStatus refund={refund} formatCurrency={formatCurrency} onDispute={handleDispute} />;
    // early inspection/received checks
    {
      const payStatusEarly = String(refund.refund_payment_status || '').toLowerCase();
      const refundTypeEarly = String(refund.final_refund_type || refund.refund_type || '').toLowerCase();
      const rrEarly = refund.return_request || {};
      const getReturnItemsEarly = () => {
        if (Array.isArray(rrEarly.items)) return rrEarly.items;
        if (Array.isArray(refund.return_request_items)) return refund.return_request_items;
        if (Array.isArray(refund.return_items)) return refund.return_items;
        if (Array.isArray(rrEarly.return_items)) return rrEarly.return_items;
        if (rrEarly.items && typeof rrEarly.items === 'object' && !Array.isArray(rrEarly.items)) return Object.values(rrEarly.items);
        if (refund.return_items_map && typeof refund.return_items_map === 'object') return Object.values(refund.return_items_map);
        return [];
      };
      const returnItemsEarly = getReturnItemsEarly();
      const normalizeItemStatusEarly = (it: any) => String(it?.status || it?.item_status || it?.return_status || it?.status_display || it?.state || '').toLowerCase();
      const itemStatusesEarly = Array.isArray(returnItemsEarly) ? returnItemsEarly.map((it: any) => normalizeItemStatusEarly(it)) : [];
      const receivedVariantsEarly = ['received', 'item_received', 'received_by_seller', 'seller_received', 'received_by_warehouse'];
      const inspectedVariantsEarly = ['inspected', 'item_inspected', 'inspected_by_seller', 'seller_inspected', 'item_verified'];
      const rrStatusEarlyLower = String(rrEarly.status || rrEarly.state || '').toLowerCase();
      const anyInspected = itemStatusesEarly.some(s => inspectedVariantsEarly.includes(s)) || rrStatusEarlyLower === 'inspected' || rrStatusEarlyLower.includes('inspect');
      const anyStrictReceived = itemStatusesEarly.some(s => receivedVariantsEarly.includes(s)) || rrStatusEarlyLower === 'received' || rrStatusEarlyLower === 'item_received' || rrStatusEarlyLower.includes('received');
      if (statusUpper === 'APPROVED' && (refundTypeEarly === 'return' || refundTypeEarly === 'return_item') && payStatusEarly === 'pending' && anyInspected) {
        return <ToVerifyStatus />;
      }
      if (statusUpper === 'APPROVED' && (refundTypeEarly === 'return' || refundTypeEarly === 'return_item') && payStatusEarly === 'pending' && anyStrictReceived) {
        return <ReceivedStatus />;
      }
    }
    if (STATUS_CONDITIONS.showApprovedStatus(statusUpper)) return <ApprovedStatus refund={refund} onOpenTrackingDialog={handleAddTracking} formatCurrency={formatCurrency} formatDate={formatDate} />;
    if (STATUS_CONDITIONS.showWaitingStatus(statusUpper)) return <WaitingStatus refund={refund} onOpenTrackingDialog={handleAddTracking} formatDate={formatDate} />;
    if (STATUS_CONDITIONS.showToVerifyStatus(statusUpper)) return <ToVerifyStatus />;
    if (STATUS_CONDITIONS.showReturnAcceptedStatus(statusUpper)) return <ReturnAcceptedStatus />;
    if (STATUS_CONDITIONS.showReturnRejectedStatus(statusUpper)) return <ReturnRejectedStatus onDispute={handleDispute} />;
    if (STATUS_CONDITIONS.showShippedStatus(statusUpper)) return <ShippedStatus />;
    if (STATUS_CONDITIONS.showReceivedStatus(statusUpper)) return <ReceivedStatus />;
    const drCheck = refund.dispute || refund.dispute_request || null;
    if (statusUpper === 'DISPUTE' && drCheck && drCheck.status?.toLowerCase() === 'resolved' && String(refund.refund_payment_status || '').toLowerCase() === 'completed') {
      return <CompletedStatus refund={refund} formatCurrency={formatCurrency} formatDate={formatDate} />;
    }
    if (STATUS_CONDITIONS.showDisputeStatus(statusUpper)) return <DisputeStatus refund={refund} formatCurrency={formatCurrency} formatDate={formatDate} onAcknowledgeDispute={handleAcknowledgeDispute} />;
    if (STATUS_CONDITIONS.showCompletedStatus(statusUpper)) return <CompletedStatus refund={refund} formatCurrency={formatCurrency} formatDate={formatDate} />;
    if (STATUS_CONDITIONS.showProcessingStatus(statusUpper)) return <ProcessingStatus refund={refund} formatCurrency={formatCurrency} />;
    if (STATUS_CONDITIONS.showReturnShipStatus(statusUpper)) return <ReturnShipStatus />;
    if (STATUS_CONDITIONS.showCancelledStatus(statusUpper)) return <CancelledStatus />;
    const orderInfo = refund.order_info || {};
    const orderStatus = String(orderInfo.status || orderInfo.status_display || orderInfo.current_status || refund.order?.status || '').toLowerCase();
    const paymentMethod = String(orderInfo.payment_method || refund.order?.payment_method || '').toLowerCase();
    const deliveryMethod = String(orderInfo.delivery_method || refund.order?.delivery_method || '').toLowerCase();
    const isPickupCashCompleted = orderStatus.includes('completed') && paymentMethod.includes('cash') && deliveryMethod.includes('pickup');
    const isReturnType = refundTypeLog === 'return' || refundTypeLog === 'return_item';
    if ((statusUpper === 'APPROVED' || STATUS_CONDITIONS.showWaitingStatus(statusUpper)) && isReturnType && isPickupCashCompleted) {
      return <ApprovedPickupStatus />;
    }
    return <PendingStatus refund={refund} />;
  };

  const renderActionButtons = () => {
    if (!refund) return null;
    const statusUpper = (refund.status || '').toUpperCase();
    const rrStatus = String(refund.return_request?.status || '').toLowerCase();
    const payStatus = String(refund.refund_payment_status || '').toLowerCase();
    const finalType = String(refund.final_refund_type || refund.refund_type || '').toLowerCase();
    const isReturnAcceptedWaitingModeration = rrStatus === 'approved' && refund.status?.toLowerCase() === 'approved' && payStatus === 'pending' && finalType === 'return';
    const isReturnItem = refund.refund_type === 'return';
    const showAddTrackingAction = (
      (statusUpper === 'APPROVED' && isReturnItem && !['shipped','received','inspected'].includes(rrStatus) && !(rrStatus === 'approved' && ['processing','completed'].includes(payStatus)) && !isReturnAcceptedWaitingModeration) ||
      STATUS_CONDITIONS.showWaitingStatus(statusUpper)
    );
    if (showAddTrackingAction) return <ReturnActions onAddTracking={handleAddTracking} onWalkIn={handleOpenWalkInConfirm} loading={actionLoading} />;
    if (STATUS_CONDITIONS.showPendingStatus(statusUpper)) return <PendingActions onCancel={handleCancelRefund} loading={actionLoading} />;
    if (STATUS_CONDITIONS.showNegotiationStatus(statusUpper)) return <NegotiationActions onAccept={handleAcceptOffer} onReject={handleRejectOffer} loading={actionLoading} isAccepting={isAccepting} />;
    if (STATUS_CONDITIONS.showRejectedStatus(statusUpper)) return <RejectedActions onFileDispute={handleDispute} loading={actionLoading} />;
    if (STATUS_CONDITIONS.showDisputeStatus(statusUpper)) {
      const dr = refund.dispute || refund.dispute_request || null;
      if (dr && dr.status?.toLowerCase() === 'rejected' && refund.status?.toLowerCase() === 'dispute') {
        return <DisputeActions onAcknowledge={handleAcknowledgeDispute} loading={actionLoading} acknowledged={acknowledged} />;
      }
    }
    return <DefaultActions onBack={() => router.back()} />;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
        <ActivityIndicator size="large" color="#F97316" style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (!refund) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}><ArrowLeft color="#000" size={24} /></TouchableOpacity>
          <Text style={styles.headerTitle}>Refund Detail</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Refund information not found.</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}><Text style={styles.backButtonText}>Go Back</Text></TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const item = (refund.order_items && refund.order_items[0]) || refund.product || {};
  const imageUrl = item.product_image || (item.primary_image && item.primary_image.url) || item.image || null;
  const order = refund.order || {};
  const shipping = refund.shipping_info || order.shipping_address || shippingAddress || {};
  const recipientName = shipping?.recipient_name || shipping?.to_address?.recipient || order?.shipping_address?.recipient_name || order?.delivery_address_text || 'N/A';
  const rawAddress = shipping?.full_address || (shipping?.address_line1 ? `${shipping.address_line1}${shipping.city ? `, ${shipping.city}` : ''}${shipping.province ? `, ${shipping.province}` : ''}${shipping.postal_code ? `, ${shipping.postal_code}` : ''}${shipping.country ? `, ${shipping.country}` : ''}` : (order?.delivery_address_text || ''));
  const addressText = normalizeAddress(rawAddress);
  const phoneNumber = shipping?.phone || shipping?.phone_number || shipping?.recipient_phone || shipping?.to_address?.phone || order?.delivery_address?.phone_number || order?.shipping_address?.recipient_phone || '';

  const refundItemsWithDetails = buildRefundItems();
  const medias = refund.medias || [];
  const openProofViewer = (index = 0) => {
    const urls = (refund?.medias || []).map((m: any) => m.file_url).filter(Boolean);
    if (!urls || urls.length === 0) return;
    setProofUrls(urls);
    setProofIndex(index);
    setProofModalVisible(true);
  };
  const customerNote = refund.customer_note || refund.detailed_reason || '';
  const rejectReason = refund.reject_reason_code ? `${refund.reject_reason_code}${refund.reject_reason_details ? `: ${refund.reject_reason_details}` : ''}` : '';
  const sellerNote = refund.seller_note || '';
  const adminNote = refund.admin_note || '';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><ArrowLeft color="#000" size={24} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Refund Detail</Text>
        <TouchableOpacity><MoreHorizontal color="#000" size={24} /></TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {renderRefundStatus(refund.status)}

        {/* Shipping Info (if any) */}
        {(shipping.carrier || shipping.tracking_number) && (
          <View style={styles.section}>
            <View style={styles.rowBetween}>
              <View style={styles.row}><Truck size={20} color="#333" /><Text style={styles.sectionTitle}>Shipping Information</Text></View>
              <ChevronRight size={20} color="#999" />
            </View>
            <Text style={styles.subText}>Carrier: {shipping.carrier || 'Standard Express'}{shipping.tracking_number && ` • Tracking: ${shipping.tracking_number}`}</Text>
          </View>
        )}

        {/* Delivery Address */}
        <View style={styles.section}>
          <View style={styles.row}><MapPin size={20} color="#333" /><Text style={styles.sectionTitle}>Delivery Address</Text></View>
          <View style={styles.addressContent}>
            <Text style={styles.addressName}>{recipientName}</Text>
            {phoneNumber ? <Text style={styles.addressPhone}>{phoneNumber}</Text> : null}
            {addressText ? <Text style={styles.addressText}>{addressText}</Text> : null}
          </View>
        </View>

        {/* Payment Details */}
        {(() => {
          const selected = refund.payment_details?.selected_payment;
          if (!selected) return null;
          const method = selected.payment_method;
          const methodName = method === 'bank' ? 'Bank Transfer' : (method === 'gcash' ? 'GCash' : (method === 'paymaya' ? 'PayMaya' : friendlyLabel(method)));
          return (
            <View style={styles.section}>
              <View style={styles.row}><Wallet size={20} color="#333" /><Text style={styles.sectionTitle}>Refund Payment Details</Text></View>
              <View style={{ marginTop: 8 }}>
                <View style={styles.metaRow}><Text style={styles.metaLabel}>Method:</Text><View style={styles.metaRightSide}><Text style={styles.metaValue}>{methodName}</Text></View></View>
                {method === 'bank' && (
                  <>
                    <View style={styles.metaRow}><Text style={styles.metaLabel}>Bank:</Text><View style={styles.metaRightSide}><Text style={styles.metaValue}>{selected.bank_name || '—'}</Text></View></View>
                    <View style={styles.metaRow}><Text style={styles.metaLabel}>Account Name:</Text><View style={styles.metaRightSide}><Text style={styles.metaValue}>{selected.account_name || refund.requested_by_username || '—'}</Text></View></View>
                    <View style={styles.metaRow}><Text style={styles.metaLabel}>Account Number:</Text><View style={styles.metaRightSide}><Text style={styles.metaValue}>{selected.account_number || '—'}</Text></View></View>
                  </>
                )}
                {(method === 'gcash' || method === 'paymaya') && (
                  <>
                    <View style={styles.metaRow}><Text style={styles.metaLabel}>Provider:</Text><View style={styles.metaRightSide}><Text style={styles.metaValue}>{method === 'gcash' ? 'GCash' : 'PayMaya'}</Text></View></View>
                    <View style={styles.metaRow}><Text style={styles.metaLabel}>Account Name:</Text><View style={styles.metaRightSide}><Text style={styles.metaValue}>{selected.account_name || refund.requested_by_username || '—'}</Text></View></View>
                    <View style={styles.metaRow}><Text style={styles.metaLabel}>Account Number:</Text><View style={styles.metaRightSide}><Text style={styles.metaValue}>{selected.account_number || '—'}</Text></View></View>
                  </>
                )}
                {method === 'voucher' && <View style={styles.metaRow}><Text style={styles.metaLabel}>Details:</Text><View style={styles.metaRightSide}><Text style={styles.metaValue}>Store Voucher will be issued</Text></View></View>}
              </View>
            </View>
          );
        })()}

        {/* Items with refund quantities */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items to Refund</Text>
          {refundItemsWithDetails.map((item, idx) => {
            const variantName = item.product_variant || item.variant_title;
            return (
              <View key={item.checkout_id || idx} style={styles.productItem}>
                <Image source={{ uri: item.product_image || 'https://via.placeholder.com/60' }} style={styles.productImage} />
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{item.product_name}</Text>
                  {variantName ? <Text style={styles.variantName}>{variantName}</Text> : null}
                  <View style={styles.productMeta}>
                    <Text style={styles.productQty}>Original Qty: {item.quantity}</Text>
                    <Text style={styles.productPrice}>{formatCurrency(item.price)} each</Text>
                  </View>
                  <View style={styles.productMeta}>
                    <Text style={styles.refundQty}>Refund Qty: {item.refundQuantity}</Text>
                    <Text style={styles.refundAmount}>Refund Amount: {formatCurrency(item.refundAmount)}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Additional Information */}
        {(customerNote || rejectReason || sellerNote || adminNote) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Information</Text>
            {customerNote ? (
              <View style={styles.noteItem}>
                <Text style={styles.noteLabel}>Customer Note:</Text>
                <Text style={styles.noteText}>{customerNote}</Text>
              </View>
            ) : null}
            {rejectReason ? (
              <View style={styles.noteItem}>
                <Text style={styles.noteLabel}>Rejection Reason:</Text>
                <Text style={styles.noteText}>{rejectReason}</Text>
              </View>
            ) : null}
            {sellerNote ? (
              <View style={styles.noteItem}>
                <Text style={styles.noteLabel}>Seller Note:</Text>
                <Text style={styles.noteText}>{sellerNote}</Text>
              </View>
            ) : null}
            {adminNote ? (
              <View style={styles.noteItem}>
                <Text style={styles.noteLabel}>Admin Note:</Text>
                <Text style={styles.noteText}>{adminNote}</Text>
              </View>
            ) : null}
          </View>
        )}

        {/* Evidence */}
        {medias.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Evidence</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.evidenceScroll}>
              {medias.map((media, idx) => (
                <TouchableOpacity
                  key={media.id || idx}
                  onPress={() => isVideoMedia(media) ? openVideoViewer(media.file_url) : openProofViewer(idx)}
                  style={styles.evidenceThumb}
                >
                  {isVideoMedia(media) ? (
                    <>
                      <View style={styles.videoThumbContainer}>
                        <Image source={{ uri: media.file_url }} style={styles.evidenceImage} />
                        <View style={styles.playOverlay}>
                          <Play size={30} color="#FFF" />
                        </View>
                      </View>
                      <Text style={styles.evidenceDate}>Video</Text>
                    </>
                  ) : (
                    <>
                      <Image source={{ uri: media.file_url }} style={styles.evidenceImage} />
                      <Text style={styles.evidenceDate}>{formatDate(media.uploaded_at)}</Text>
                    </>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Metadata */}
        <View style={[styles.section, { paddingBottom: 40 }]}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Order Number:</Text>
            <View style={styles.metaRightSide}>
              <Text style={styles.metaValue} numberOfLines={1} ellipsizeMode="middle">{String(order.order_id || order.id || refund.order_id || '-')}</Text>
              <TouchableOpacity style={{ marginLeft: 6 }} onPress={() => copyToClipboard(String(order.order_id || refund.order_id || '-'))}><Copy size={14} color="#666" /></TouchableOpacity>
            </View>
          </View>
          <View style={styles.metaRow}><Text style={styles.metaLabel}>Request Date:</Text><View style={styles.metaRightSide}><Text style={styles.metaValue}>{formatDate(refund.created_at || refund.requested_at)}</Text></View></View>
          <View style={styles.metaRow}><Text style={styles.metaLabel}>Reason:</Text><View style={styles.metaRightSide}><Text style={styles.metaValue}>{refund.reason || refund.customer_note || 'Not specified'}</Text></View></View>
          <View style={styles.metaRow}><Text style={styles.metaLabel}>Refund Type:</Text><View style={styles.metaRightSide}><Text style={styles.metaValue}>{friendlyLabel(refund.refund_type)}</Text></View></View>
          <View style={styles.metaRow}><Text style={styles.metaLabel}>Preferred Method:</Text><View style={styles.metaRightSide}><Text style={styles.metaValue}>{friendlyLabel(refund.buyer_preferred_refund_method)}</Text></View></View>
          <View style={styles.metaRow}><Text style={styles.metaLabel}>Total Refund Amount:</Text><View style={styles.metaRightSide}><Text style={[styles.metaValue, { color: '#10B981' }]}>{formatCurrency(refund.total_refund_amount || 0)}</Text></View></View>
          {refund.admin_note && (
            <View style={styles.metaRow}><Text style={styles.metaLabel}>Admin Note:</Text><View style={styles.metaRightSide}><Text style={[styles.metaValue, { color: '#7C3AED' }]}>{refund.admin_note}</Text></View></View>
          )}
          {refund.seller_note && (
            <View style={styles.metaRow}><Text style={styles.metaLabel}>Seller Note:</Text><View style={styles.metaRightSide}><Text style={[styles.metaValue, { color: '#3B82F6' }]}>{refund.seller_note}</Text></View></View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          {renderActionButtons()}
        </View>

        {/* Modals for tracking and walk‑in */}
        {showTrackingForm && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Provide Shipping Info</Text>
              <TextInput style={styles.input} placeholder="Logistic Service (e.g., LBC, J&T)" value={trackingForm.logistic_service} onChangeText={(t) => setTrackingForm(prev => ({ ...prev, logistic_service: t }))} />
              <TextInput style={styles.input} placeholder="Tracking Number" value={trackingForm.tracking_number} onChangeText={(t) => setTrackingForm(prev => ({ ...prev, tracking_number: t }))} />
              <TextInput style={styles.input} placeholder="Shipped At (YYYY-MM-DD)" value={trackingForm.shipped_at} onChangeText={(t) => setTrackingForm(prev => ({ ...prev, shipped_at: t }))} />
              <TextInput style={[styles.input, { height: 80 }]} placeholder="Notes (optional)" value={trackingForm.notes} onChangeText={(t) => setTrackingForm(prev => ({ ...prev, notes: t }))} multiline />
              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.secondaryButton, { flex: 1, marginRight: 8 }]} onPress={() => setShowTrackingForm(false)} disabled={actionLoading}><Text style={styles.secondaryButtonText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.primaryButton, { flex: 1 }]} onPress={handleSubmitTrackingForm} disabled={actionLoading}><Text style={styles.primaryButtonText}>{actionLoading ? 'Submitting...' : 'Submit'}</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {showWalkInConfirm && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Walk in Return</Text>
              {(refund.return_address || refund.return_request?.return_address) ? (
                <View>
                  <Text style={[styles.returnAddressTitle, { marginTop: 0 }]}>Return Address</Text>
                  <Text style={styles.returnAddressText}>{(refund.return_address || refund.return_request?.return_address).recipient_name} — {(refund.return_address || refund.return_request?.return_address).contact_number}</Text>
                  <Text style={styles.returnAddressText}>{(refund.return_address || refund.return_request?.return_address).street}, {(refund.return_address || refund.return_request?.return_address).barangay}, {(refund.return_address || refund.return_request?.return_address).city}, {(refund.return_address || refund.return_request?.return_address).province} {(refund.return_address || refund.return_request?.return_address).zip_code}, {(refund.return_address || refund.return_request?.return_address).country}</Text>
                  {(refund.return_address || refund.return_request?.return_address).notes && <Text style={styles.addressNotes}>{(refund.return_address || refund.return_request?.return_address).notes}</Text>}
                </View>
              ) : (
                <Text style={styles.statusSubtitle}>Return address not available. Please contact the seller.</Text>
              )}
              <View style={{ height: 12 }} />
              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.secondaryButton, { flex: 1, marginRight: 8 }]} onPress={() => setShowWalkInConfirm(false)} disabled={actionLoading}><Text style={styles.secondaryButtonText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.primaryButton, { flex: 1 }]} onPress={handleConfirmWalkIn} disabled={actionLoading}><Text style={styles.primaryButtonText}>{actionLoading ? 'Processing...' : 'Confirm'}</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Image proof modal */}
        <Modal animationType="fade" transparent={true} visible={proofModalVisible} onRequestClose={() => setProofModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContainer, { width: '95%', padding: 0, backgroundColor: '#000' }]}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setProofModalVisible(false)} style={styles.closeButton}><Ionicons name="close" size={28} color="#FFF" /></TouchableOpacity>
              </View>
              <FlatList
                data={proofUrls}
                keyExtractor={(_item, i) => `${i}`}
                horizontal
                pagingEnabled
                initialScrollIndex={proofIndex}
                getItemLayout={(_data, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
                onMomentumScrollEnd={(event) => { const idx = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH); setProofIndex(idx); }}
                renderItem={({ item }) => (
                  <View style={styles.modalImageContainer}>
                    <Image source={{ uri: item }} style={styles.modalImage} resizeMode="contain" />
                  </View>
                )}
              />
              <View style={styles.modalFooter}>
                <Text style={styles.modalImageCounter}>{proofIndex + 1} / {proofUrls.length}</Text>
              </View>
            </View>
          </View>
        </Modal>

        {/* Video modal */}
        <Modal animationType="fade" transparent={true} visible={videoModalVisible} onRequestClose={() => setVideoModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContainer, { width: '95%', padding: 0, backgroundColor: '#000' }]}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setVideoModalVisible(false)} style={styles.closeButton}><Ionicons name="close" size={28} color="#FFF" /></TouchableOpacity>
              </View>
              {currentVideoUrl && (
                <Video
                  source={{ uri: currentVideoUrl }}
                  style={{ width: '100%', height: 300 }}
                  useNativeControls
                  resizeMode={ResizeMode.CONTAIN}
                  isLooping={false}
                />
              )}
              <View style={styles.modalFooter}>
                <Text style={styles.modalImageCounter}>Video Evidence</Text>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

// ========== STYLES ==========
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E5E5', paddingTop: 50 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#000' },
  scrollContainer: { flex: 1 },
  statusSection: { backgroundColor: '#FFF', padding: 16, marginBottom: 8 },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  statusTextContainer: { marginLeft: 12, flex: 1 },
  statusTitle: { fontSize: 16, fontWeight: '700', color: '#000', marginBottom: 4 },
  statusSubtitle: { fontSize: 13, color: '#888', lineHeight: 18 },
  boldText: { fontWeight: '700' },
  negotiationDetails: { marginTop: 12, backgroundColor: '#F0F9FF', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E0F2FE' },
  negotiationRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  negotiationLabel: { fontSize: 13, color: '#666', fontWeight: '500' },
  negotiationValue: { fontSize: 13, color: '#333', fontWeight: '600' },
  amountValue: { color: '#10B981' },
  disputeBtn: { marginTop: 12, borderWidth: 1, borderColor: '#EF4444', padding: 10, borderRadius: 8, alignItems: 'center' },
  disputeBtnText: { color: '#EF4444', fontWeight: '700' },
  sellerNote: { fontSize: 12, color: '#EF4444', marginTop: 8, fontStyle: 'italic' },
  disputeHint: { fontSize: 12, color: '#666', marginTop: 8, fontStyle: 'italic' },
  returnDetails: { marginTop: 16, backgroundColor: '#F9FAFB', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  returnDetailRow: { marginBottom: 12 },
  returnDetailLabel: { fontSize: 12, color: '#6B7280', fontWeight: '500', marginBottom: 4 },
  returnDetailValue: { fontSize: 13, color: '#111827', fontWeight: '600' },
  returnAddress: { marginTop: 4 },
  shippedInfo: { marginTop: 16, backgroundColor: '#EFF6FF', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#DBEAFE' },
  shippedTitle: { fontSize: 14, fontWeight: '600', color: '#1E40AF', marginBottom: 4 },
  shippedSubtitle: { fontSize: 12, color: '#3B82F6', marginBottom: 8 },
  shippingDetails: { marginTop: 8 },
  shippingDetail: { flexDirection: 'row', marginBottom: 6 },
  shippingLabel: { fontSize: 12, color: '#6B7280', width: 100 },
  shippingValue: { fontSize: 12, color: '#111827', fontWeight: '500', flex: 1 },
  updateShippingBtn: { marginTop: 12, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#3B82F6', borderRadius: 6 },
  updateShippingText: { fontSize: 12, color: '#FFF', fontWeight: '500' },
  returnAddressCard: { marginTop: 12, backgroundColor: '#F9FAFB', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  returnAddressTitle: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 4 },
  returnAddressText: { fontSize: 12, color: '#6B7280', lineHeight: 16 },
  waitingDetails: { marginTop: 12 },
  waitingDetailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  waitingDetailText: { fontSize: 12, color: '#666', marginLeft: 8 },
  daysLeft: { fontWeight: '600' },
  daysLeftRed: { color: '#EF4444' },
  daysLeftYellow: { color: '#F59E0B' },
  daysLeftGreen: { color: '#10B981' },
  shippedCard: { marginTop: 12, backgroundColor: '#EFF6FF', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#DBEAFE' },
  toggleDetailsBtn: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  toggleDetailsText: { fontSize: 12, color: '#3B82F6', fontWeight: '500', marginRight: 4 },
  moderationCard: { marginTop: 12, backgroundColor: '#EEF2FF', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E0E7FF' },
  moderationTitle: { fontSize: 13, fontWeight: '600', color: '#4F46E5', marginBottom: 4 },
  moderationText: { fontSize: 12, color: '#6366F1', lineHeight: 16 },
  moderationDeadline: { fontSize: 11, color: '#6B7280', marginTop: 4 },
  processingDetails: { marginTop: 12, backgroundColor: '#F5F3FF', padding: 12, borderRadius: 8 },
  processingDetail: { fontSize: 13, color: '#666', marginBottom: 4 },
  amountText: { fontWeight: '700', color: '#10B981' },
  methodText: { fontWeight: '600', color: '#3B82F6' },
  completedDetails: { marginTop: 12, backgroundColor: '#F0FDF4', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#DCFCE7' },
  completedDetail: { flexDirection: 'row', marginBottom: 8 },
  completedLabel: { fontSize: 12, color: '#6B7280', width: 80 },
  completedValue: { fontSize: 12, color: '#111827', fontWeight: '500', flex: 1 },
  resolvedCard: { marginTop: 12, backgroundColor: '#F0FDF4', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#DCFCE7' },
  resolvedTitle: { fontSize: 13, fontWeight: '600', color: '#059669', marginBottom: 4 },
  resolvedText: { fontSize: 12, color: '#065F46', marginBottom: 8 },
  resolvedDetail: { fontSize: 11, color: '#6B7280' },
  resolvedValue: { fontWeight: '500', color: '#111827' },
  acknowledgeBtn: { marginTop: 12, backgroundColor: '#3B82F6', padding: 10, borderRadius: 8, alignItems: 'center' },
  acknowledgeBtnText: { color: '#FFF', fontWeight: '600' },
  disputeDate: { fontSize: 11, color: '#6B7280', marginTop: 8 },
  partialAmount: { marginTop: 8, fontSize: 13, color: '#111827', fontWeight: '700' },
  section: { backgroundColor: '#FFF', padding: 16, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginLeft: 8 },
  subText: { fontSize: 13, color: '#888', marginTop: 8, marginLeft: 28 },
  addressContent: { marginLeft: 28, marginTop: 8 },
  addressName: { fontSize: 14, fontWeight: '600', color: '#333' },
  addressText: { fontSize: 13, color: '#666', marginTop: 2, lineHeight: 18 },
  addressPhone: { fontSize: 13, color: '#666', marginTop: 4 },
  addressNotes: { fontSize: 11, color: '#9CA3AF', marginTop: 2, fontStyle: 'italic' },
  productItem: { flexDirection: 'row', marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  productImage: { width: 60, height: 60, borderRadius: 8, marginRight: 12, backgroundColor: '#F3F4F6' },
  productInfo: { flex: 1 },
  productName: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 2 },
  variantName: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  productMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  productQty: { fontSize: 12, color: '#6B7280' },
  productPrice: { fontSize: 12, color: '#6B7280' },
  refundQty: { fontSize: 12, color: '#10B981', fontWeight: '500' },
  refundAmount: { fontSize: 12, color: '#10B981', fontWeight: '600' },
  noteItem: { marginBottom: 12 },
  noteLabel: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 4 },
  noteText: { fontSize: 13, color: '#4B5563', lineHeight: 18 },
  evidenceScroll: { flexDirection: 'row', marginTop: 8 },
  evidenceThumb: { marginRight: 12, alignItems: 'center' },
  evidenceImage: { width: 80, height: 80, borderRadius: 8, backgroundColor: '#F3F4F6' },
  evidenceDate: { fontSize: 10, color: '#9CA3AF', marginTop: 4 },
  videoThumbContainer: { position: 'relative', width: 80, height: 80 },
  playOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  metaLabel: { fontSize: 13, color: '#999', flexShrink: 0 },
  metaRightSide: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginLeft: 20 },
  metaValue: { fontSize: 13, color: '#333', textAlign: 'right', flexShrink: 1 },
  actionSection: { padding: 16, marginBottom: 20 },
  primaryButton: { backgroundColor: '#F97316', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 12, flexDirection: 'row', justifyContent: 'center', gap: 8 },
  primaryButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  secondaryButton: { backgroundColor: '#FFF', padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  secondaryButtonText: { color: '#374151', fontSize: 16, fontWeight: '600' },
  disabledButton: { opacity: 0.6 },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { width: '90%', backgroundColor: '#FFF', borderRadius: 8, padding: 16, maxHeight: '80%' },
  modalTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 6, padding: 10, marginBottom: 10, backgroundColor: '#FFF' },
  modalButtons: { flexDirection: 'row', marginTop: 8 },
  proofRow: { paddingVertical: 4 },
  proofThumbWrapper: { marginRight: 8, width: 90, alignItems: 'center' },
  proofThumb: { width: 90, height: 90, borderRadius: 8, backgroundColor: '#F3F4F6' },
  proofNote: { fontSize: 12, color: '#6B7280', marginTop: 6, width: 90, textAlign: 'center' },
  modalHeader: { flexDirection: 'row', justifyContent: 'flex-end', padding: 8 },
  closeButton: { padding: 8 },
  modalImageContainer: { width: SCREEN_WIDTH, height: SCREEN_WIDTH, justifyContent: 'center', alignItems: 'center' },
  modalImage: { width: '100%', height: '100%' },
  modalFooter: { padding: 8, alignItems: 'center' },
  modalImageCounter: { color: '#FFF' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 16, color: '#9CA3AF', marginBottom: 16 },
  backButton: { backgroundColor: '#F97316', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  backButtonText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
});