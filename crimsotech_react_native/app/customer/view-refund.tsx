// view-returns.tsx
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
import { 
  ArrowLeft, Copy, Truck, CheckCircle2, XCircle, Clock, 
  RotateCcw, Box, Hourglass, MessageSquare, Search, PackageCheck, 
  PackageX, Wallet, Home, Gavel, ShieldCheck, MapPin, ChevronRight,
  MoreHorizontal, AlertTriangle, Ban, ThumbsUp, ThumbsDown, 
  FileText, Upload, ShoppingBag, Store, ExternalLink, Calendar,
  Printer, Eye, ArrowUpRight, ChevronDown, ChevronUp
} from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import AxiosInstance from '../../contexts/axios';

// ========== STATUS CONFIGURATION ==========
// You can easily modify these conditions to control which UI shows

export const STATUS_CONDITIONS = {
  // Status: 'pending'
  showPendingStatus: (status: string) => status === 'PENDING',
  
  // Status: 'negotiation' or 'negotiating'
  showNegotiationStatus: (status: string) => 
    status === 'NEGOTIATION' || status === 'NEGOTIATING',
  
  // Status: 'rejected'
  showRejectedStatus: (status: string) => status === 'REJECTED',
  
  // Status: 'approved'
  showApprovedStatus: (status: string) => status === 'APPROVED',
  
  // Status: 'waiting' or 'awaiting_info'
  showWaitingStatus: (status: string) => 
    status === 'WAITING' || status === 'AWAITING_INFO',
  
  // Status: 'to_verify' or 'verification'
  showToVerifyStatus: (status: string) => 
    status === 'TO_VERIFY' || status === 'VERIFICATION',
  
  // Status: 'return_accepted'
  showReturnAcceptedStatus: (status: string) => status === 'RETURN_ACCEPTED',
  
  // Status: 'return_rejected'
  showReturnRejectedStatus: (status: string) => status === 'RETURN_REJECTED',
  
  // Status: 'shipped' or 'item_shipped'
  showShippedStatus: (status: string) => 
    status === 'SHIPPED' || status === 'ITEM_SHIPPED',
  
  // Status: 'received' or 'item_received'
  showReceivedStatus: (status: string) => 
    status === 'RECEIVED' || status === 'ITEM_RECEIVED',
  
  // Status: 'dispute' or 'dispute_opened'
  showDisputeStatus: (status: string) => 
    status === 'DISPUTE' || status === 'DISPUTE_OPENED',
  
  // Status: 'completed' or 'closed'
  showCompletedStatus: (status: string) => 
    status === 'COMPLETED' || status === 'CLOSED',
  
  // Status: 'processing' or 'processing_refund'
  showProcessingStatus: (status: string) => 
    status === 'PROCESSING' || status === 'PROCESSING_REFUND',
  
  // Status: 'return_ship' or 'return_shipping'
  showReturnShipStatus: (status: string) => 
    status === 'RETURN_SHIP' || status === 'RETURN_SHIPPING',
  
  // Status: 'cancelled'
  showCancelledStatus: (status: string) => status === 'CANCELLED',
};

// ========== STATUS UI COMPONENTS ==========

// --- PENDING STATUS ---
const PendingStatusUI = ({ refund }: { refund?: any }) => {
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

// --- NEGOTIATION STATUS ---
const NegotiationStatusUI = ({ refund, formatCurrency }: { refund: any, formatCurrency: (amount: string | number) => string }) => {
  // Get seller suggestion label similar to web
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

  return (
    <View style={styles.statusSection}>
      <View style={styles.statusRow}>
        <MessageSquare size={24} color="#3B82F6" fill="#DBEAFE" />
        <View style={styles.statusTextContainer}>
          <Text style={styles.statusTitle}>Negotiation - Seller's Counter Offer</Text>
          <Text style={styles.statusSubtitle}>Review the seller's proposed solution</Text>
          
          <View style={styles.negotiationDetails}>
            {(() => {
              // Prefer using explicit counter request details when available
              const latestCounter = Array.isArray(refund?.counter_requests) ? refund.counter_requests[0] : null;
              const counterType = latestCounter?.counter_refund_type || refund.seller_suggested_type;
              const counterMethod = latestCounter?.counter_refund_method || refund.seller_suggested_method;
              const counterAmount = latestCounter?.counter_refund_amount || refund.seller_suggested_amount;

              // Local friendly formatter (avoid using `friendlyLabel` before it's defined)
              const localFriendly = (s?: string) => {
                if (s === undefined || s === null) return 'N/A';
                return String(s)
                  .replace(/_/g, ' ')
                  .split(' ')
                  .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
                  .join(' ');
              };

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
                      <Text style={[styles.negotiationValue, styles.amountValue]}>
                        {formatCurrency(counterAmount)}
                      </Text>
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

// --- REJECTED STATUS ---
const RejectedStatusUI = ({ onDispute, refund, formatCurrency }: { onDispute?: () => void, refund: any, formatCurrency: (amount: string | number) => string }) => {
  const latestCounter = refund?.counter_requests?.[0];
  
  // Case: negotiation ended because buyer rejected seller's counter
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
              You rejected the seller's counter-offer
              {amt != null ? ` of ${formatCurrency(amt)}` : ''}
              {method ? ` via ${method}` : ''}.
            </Text>
            {latestCounter.notes && (
              <Text style={styles.sellerNote}>Seller notes: {latestCounter.notes}</Text>
            )}
            <Text style={styles.disputeHint}>
              Use the actions card to file a dispute for this case.
            </Text>
          </View>
        </View>
        {onDispute && (
          <TouchableOpacity style={styles.disputeBtn} onPress={onDispute}>
            <Text style={styles.disputeBtnText}>File a Dispute</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Case: seller directly rejected the buyer's original request
  return (
    <View style={styles.statusSection}>
      <View style={styles.statusRow}>
        <XCircle size={24} color="#EF4444" fill="#FEE2E2" />
        <View style={styles.statusTextContainer}>
          <Text style={styles.statusTitle}>Refund Rejected</Text>
          <Text style={styles.statusSubtitle}>
            {refund.seller_response || 'No specific reason provided by seller'}
          </Text>
          <Text style={styles.disputeHint}>
            Use the actions card to file a dispute for this case.
          </Text>
        </View>
      </View>
      {onDispute && (
        <TouchableOpacity style={styles.disputeBtn} onPress={onDispute}>
          <Text style={styles.disputeBtnText}>File a Dispute</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// --- APPROVED STATUS ---
const ApprovedStatusUI = ({ refund, onOpenTrackingDialog, formatCurrency, formatDate }: { 
  refund: any, 
  onOpenTrackingDialog?: () => void, 
  formatCurrency: (amount: string | number) => string,
  formatDate: (dateString: string) => string
}) => {
  const isReturnItem = refund.refund_type === 'return';
  const rr = refund.return_request || {};
  const rrStatus = String(rr?.status || '').toLowerCase();
  const payStatus = String(refund.refund_payment_status || '').toLowerCase();
  const hasShippingInfo = Boolean(rr.tracking_number) || rrStatus === 'shipped' || rrStatus === 'received';
  
  // Check if processing
  const dr = refund.dispute || refund.dispute_request || null;
  const isProcessing = (
    (isReturnItem && rrStatus === 'approved' && payStatus === 'processing' && refund.status?.toLowerCase() === 'approved') ||
    (!isReturnItem && payStatus === 'processing' && refund.status?.toLowerCase() === 'approved') ||
    (dr && dr.status?.toLowerCase() === 'approved' && refund.status?.toLowerCase() === 'approved' && payStatus === 'processing')
  );

  const finalType = String(refund.final_refund_type || refund.refund_type || '').toLowerCase();
  const isReturnAcceptedWaitingModeration = rrStatus === 'approved' && refund.status?.toLowerCase() === 'approved' && payStatus === 'pending' && finalType === 'return';

  if (isProcessing) {
    return (
      <ProcessingStatusUI refund={refund} formatCurrency={formatCurrency} />
    );
  }

  if ((payStatus === 'completed' && refund.status?.toLowerCase() === 'approved') || refund.status?.toLowerCase() === 'completed') {
    return (
      <PaymentCompletedUI refund={refund} formatCurrency={formatCurrency} formatDate={formatDate} />
    );
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
              <ReturnAcceptedModerationUI refund={refund} formatDate={formatDate} />
            ) : !hasShippingInfo ? (
              <Text style={styles.statusSubtitle}>Please return the item to complete your refund</Text>
            ) : null
          )}
        </View>
      </View>

      {/* Return deadline and address for return refunds */}
      {isReturnItem && !hasShippingInfo && (
        <View style={styles.returnDetails}>
          <View style={styles.returnDetailRow}>
            <Text style={styles.returnDetailLabel}>Return Deadline:</Text>
            <Text style={styles.returnDetailValue}>
              {rr.return_deadline || refund.return_deadline ? 
                formatDate(rr.return_deadline || refund.return_deadline) : 
                'Not set'}
            </Text>
          </View>
          
          <View style={styles.returnDetailRow}>
            <Text style={styles.returnDetailLabel}>Return Address:</Text>
            <View style={styles.returnAddress}>
              {refund.return_address ? (
                <>
                  <Text style={styles.addressName}>{refund.return_address.recipient_name} — {refund.return_address.contact_number}</Text>
                  <Text style={styles.addressText}>
                    {refund.return_address.street}, {refund.return_address.barangay}, {refund.return_address.city}, 
                    {refund.return_address.province} {refund.return_address.zip_code}, {refund.return_address.country}
                  </Text>
                  {refund.return_address.notes && (
                    <Text style={styles.addressNotes}>{refund.return_address.notes}</Text>
                  )}
                </>
              ) : (
                <Text style={styles.addressText}>Not provided</Text>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Return shipment info if shipped */}
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

// --- WAITING STATUS ---
const WaitingStatusUI = ({ refund, onOpenTrackingDialog, formatDate }: { 
  refund: any, 
  onOpenTrackingDialog?: () => void, 
  formatDate: (dateString: string) => string 
}) => {
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
          <Text style={styles.statusSubtitle}>
            {isShipped ? 'Your return is in progress. Track the status below.' : 'Please prepare your shipment to send the item back to the seller.'}
          </Text>
        </View>
      </View>

      {refund.return_address && (
        <View style={styles.returnAddressCard}>
          <Text style={styles.returnAddressTitle}>Return address</Text>
          <Text style={styles.returnAddressText}>
            {refund.return_address.recipient_name} — {refund.return_address.contact_number}
          </Text>
          <Text style={styles.returnAddressText}>
            {refund.return_address.street}, {refund.return_address.barangay}, {refund.return_address.city}, 
            {refund.return_address.province} {refund.return_address.zip_code}, {refund.return_address.country}
          </Text>
        </View>
      )}

      <View style={styles.waitingDetails}>
        {rr.return_method && (
          <View style={styles.waitingDetailRow}>
            <Truck size={16} color="#666" />
            <Text style={styles.waitingDetailText}>Method: {rr.return_method}</Text>
          </View>
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
          
          {onOpenTrackingDialog && (
            <TouchableOpacity style={styles.updateShippingBtn} onPress={onOpenTrackingDialog}>
              <Text style={styles.updateShippingText}>Update shipping info</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <TouchableOpacity 
        style={styles.toggleDetailsBtn} 
        onPress={() => setShowDetails(!showDetails)}
      >
        <Text style={styles.toggleDetailsText}>
          {showDetails ? 'Hide return details' : 'Show return details'}
        </Text>
        {showDetails ? <ChevronUp size={16} color="#3B82F6" /> : <ChevronDown size={16} color="#3B82F6" />}
      </TouchableOpacity>
    </View>
  );
};

// --- RETURN ACCEPTED MODERATION UI ---
const ReturnAcceptedModerationUI = ({ refund, formatDate }: { refund: any, formatDate: (dateString: string) => string }) => (
  <View style={styles.moderationCard}>
    <Text style={styles.moderationTitle}>Return Accepted</Text>
    <Text style={styles.moderationText}>
      Seller accepted your return request. Waiting for the moderation team to process the refund.
    </Text>
    {refund.return_request?.return_deadline && (
      <Text style={styles.moderationDeadline}>
        Return Deadline: {formatDate(refund.return_request.return_deadline)}
      </Text>
    )}
  </View>
);

// --- PROCESSING STATUS ---
const ProcessingStatusUI = ({ refund, formatCurrency }: { refund: any, formatCurrency: (amount: string | number) => string }) => (
  <View style={styles.statusSection}>
    <View style={styles.statusRow}>
      <RotateCcw size={24} color="#3B82F6" fill="#DBEAFE" />
      <View style={styles.statusTextContainer}>
        <Text style={styles.statusTitle}>Refund Processing</Text>
        <Text style={styles.statusSubtitle}>Your refund is being processed</Text>
        <View style={styles.processingDetails}>
          <Text style={styles.processingDetail}>
            Amount: <Text style={styles.amountText}>{formatCurrency(refund.total_refund_amount || 0)}</Text>
          </Text>
          <Text style={styles.processingDetail}>
            Method: <Text style={styles.methodText}>{refund.final_refund_method || refund.buyer_preferred_refund_method}</Text>
          </Text>
        </View>
      </View>
    </View>
  </View>
);

// --- PAYMENT COMPLETED UI ---
const PaymentCompletedUI = ({ refund, formatCurrency, formatDate }: { refund: any, formatCurrency: (amount: string | number) => string, formatDate: (dateString: string) => string }) => {
  const processedAt = refund.processed_at || refund.processedAt;
  const method = refund.final_refund_method || refund.buyer_preferred_refund_method || '—';
  
  return (
    <View style={styles.statusSection}>
      <View style={styles.statusRow}>
        <ShieldCheck size={24} color="#10B981" fill="#D1FAE5" />
        <View style={styles.statusTextContainer}>
          <Text style={styles.statusTitle}>Refund Payment Completed</Text>
          <Text style={styles.statusSubtitle}>
            Your refund payment has been completed. The amount has been sent via the selected method.
          </Text>
          
          <View style={styles.completedDetails}>
            <View style={styles.completedDetail}>
              <Text style={styles.completedLabel}>Amount:</Text>
              <Text style={styles.completedValue}>{formatCurrency(refund.total_refund_amount || 0)}</Text>
            </View>
            
            <View style={styles.completedDetail}>
              <Text style={styles.completedLabel}>Method:</Text>
              <Text style={styles.completedValue}>{method}</Text>
            </View>
            
            {processedAt && (
              <View style={styles.completedDetail}>
                <Text style={styles.completedLabel}>Completed At:</Text>
                <Text style={styles.completedValue}>{formatDate(processedAt)}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
};

// --- DISPUTE STATUS ---
const DisputeStatusUI = ({ refund, formatCurrency, formatDate, onAcknowledgeDispute }: { 
  refund: any, 
  formatCurrency: (amount: string | number) => string,
  formatDate: (dateString: string) => string,
  onAcknowledgeDispute?: () => void 
}) => {
  const dr = refund.dispute || refund.dispute_request || null;
  
  // Special case: dispute approved by admin and return_request was previously rejected
  if (dr && dr.status?.toLowerCase() === 'approved' && refund.return_request?.status?.toLowerCase() === 'rejected') {
    return (
      <View style={styles.statusSection}>
        <View style={styles.statusRow}>
          <CheckCircle2 size={24} color="#10B981" fill="#D1FAE5" />
          <View style={styles.statusTextContainer}>
            <Text style={styles.statusTitle}>Dispute Approved</Text>
            <Text style={styles.statusSubtitle}>
              Your dispute has been approved by the administrator. The admin will process the refund request — you will be notified once the refund is processed.
            </Text>
            {dr.resolved_at && (
              <Text style={styles.disputeDate}>Approved at: {formatDate(dr.resolved_at)}</Text>
            )}
          </View>
        </View>
      </View>
    );
  }

  // Handle specific dispute workflow states: under_review and partial
  if (dr && dr.status?.toLowerCase() === 'under_review') {
    return (
      <View style={styles.statusSection}>
        <View style={styles.statusRow}>
          <Hourglass size={24} color="#0EA5E9" fill="#E0F2FE" />
          <View style={styles.statusTextContainer}>
            <Text style={styles.statusTitle}>Under Review</Text>
            <Text style={styles.statusSubtitle}>
              Your dispute is currently under review by the moderation team. We will notify you once a decision has been made.
            </Text>
            {dr.created_at && (
              <Text style={styles.disputeDate}>Filed at: {formatDate(dr.created_at)}</Text>
            )}
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
            <Text style={styles.statusSubtitle}>
              The moderation team decided to issue a partial refund.
            </Text>
            {amt != null && (
              <Text style={styles.partialAmount}>Amount: {formatCurrency(amt)}</Text>
            )}
            {dr.updated_at && (
              <Text style={styles.disputeDate}>Decided at: {formatDate(dr.updated_at)}</Text>
            )}
          </View>
        </View>
      </View>
    );
  }

  // Show processing UI for disputes only if backend has already set refund to approved+processing
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
              <Text style={styles.statusSubtitle}>
                Your dispute has been approved by the administrator. The admin will process the refund.
              </Text>
              {dr.resolved_at && (
                <Text style={styles.disputeDate}>Approved at: {formatDate(dr.resolved_at)}</Text>
              )}
              <View style={styles.processingDetails}>
                <ProcessingStatusUI refund={refund} formatCurrency={formatCurrency} />
              </View>
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
            <Text style={styles.statusSubtitle}>
              Your dispute has been approved by the administrator. The admin will process the refund request — you will be notified once the refund is processed.
            </Text>
            {dr.resolved_at && (
              <Text style={styles.disputeDate}>Approved at: {formatDate(dr.resolved_at)}</Text>
            )}          </View>
        </View>
      </View>
    );
  }

  // If admin rejected the dispute but refund still shows 'dispute'
  if (dr && dr.status?.toLowerCase() === 'rejected' && refund.status?.toLowerCase() === 'dispute') {
    return (
      <View style={styles.statusSection}>
        <View style={styles.statusRow}>
          <XCircle size={24} color="#EF4444" fill="#FEE2E2" />
          <View style={styles.statusTextContainer}>
            <Text style={styles.statusTitle}>Dispute Rejected</Text>
            <Text style={styles.statusSubtitle}>
              The administrator has rejected your dispute for this refund. The refund remains in dispute — if you believe this is a mistake, you can confirm you received this decision.
            </Text>
            
            {onAcknowledgeDispute && (
              <TouchableOpacity style={styles.acknowledgeBtn} onPress={onAcknowledgeDispute}>
                <Text style={styles.acknowledgeBtnText}>Confirm Decision</Text>
              </TouchableOpacity>
            )}
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
          <Text style={styles.statusSubtitle}>
            Case is under administrative review. An administrator will review all evidence and communications.
          </Text>
        </View>
      </View>
    </View>
  );
};

// --- COMPLETED STATUS ---
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CompletedStatusUI = ({ refund, formatCurrency, formatDate }: { refund: any, formatCurrency: (amount: string | number) => string, formatDate: (dateString: string) => string }) => {
  const dr = refund.dispute || refund.dispute_request || null;
  const isResolved = dr && dr.status?.toLowerCase() === 'resolved';

  // Local state for proof viewer
  const [proofModalVisible, setProofModalVisible] = React.useState(false);
  const [proofUrls, setProofUrls] = React.useState<string[]>([]);
  const [proofIndex, setProofIndex] = React.useState(0);

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
            {refund.approved_refund_amount && (
              <Text style={styles.amountText}> {formatCurrency(refund.approved_refund_amount)}</Text>
            )}
          </Text>

          {isResolved && (
            <View style={styles.resolvedCard}>
              <Text style={styles.resolvedTitle}>Resolved After Dispute</Text>
              <Text style={styles.resolvedText}>
                This refund was completed after an administrative review of the dispute.
              </Text>
              {dr.processed_by && (
                <Text style={styles.resolvedDetail}>
                  Processed by: <Text style={styles.resolvedValue}>{dr.processed_by?.username || dr.processed_by?.email || 'Admin'}</Text>
                </Text>
              )}
              {dr.resolved_at && (
                <Text style={styles.resolvedDetail}>
                  Resolved at: {formatDate(dr.resolved_at)}
                </Text>
              )}
            </View>
          )}

          {/* Proof Thumbnails */}
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

          {/* Proof Viewer Modal */}
          <Modal animationType="fade" transparent={true} visible={proofModalVisible} onRequestClose={() => setProofModalVisible(false)}>
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContainer, { width: '95%', padding: 0, backgroundColor: '#000' }]}>
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={() => setProofModalVisible(false)} style={styles.closeButton}>
                    <Ionicons name="close" size={28} color="#FFF" />
                  </TouchableOpacity>
                </View>

                <FlatList
                  data={proofUrls}
                  keyExtractor={(item, i) => `${i}`}
                  horizontal
                  pagingEnabled
                  initialScrollIndex={proofIndex}
                  getItemLayout={(_data, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
                  onMomentumScrollEnd={(event) => {
                    const idx = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                    setProofIndex(idx);
                  }}
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

// --- TO VERIFY STATUS ---
const ToVerifyStatusUI = () => (
  <View style={styles.statusSection}>
    <View style={styles.statusRow}>
      <Search size={24} color="#3B82F6" fill="#DBEAFE" />
      <View style={styles.statusTextContainer}>
        <Text style={styles.statusTitle}>Item Verification in Progress</Text>
        <Text style={styles.statusSubtitle}>
          Seller is checking the returned item's condition. This usually takes 1-3 business days.
        </Text>
      </View>
    </View>
  </View>
);

// --- RETURN ACCEPTED STATUS ---
const ReturnAcceptedUI = () => (
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

// --- RETURN REJECTED STATUS ---
const ReturnRejectedUI = ({ onDispute }: { onDispute?: () => void }) => (
  <View style={styles.statusSection}>
    <View style={styles.statusRow}>
      <PackageX size={24} color="#EF4444" fill="#FEE2E2" />
      <View style={styles.statusTextContainer}>
        <Text style={styles.statusTitle}>Return Rejected</Text>
        <Text style={styles.statusSubtitle}>Item did not pass quality check.</Text>
      </View>
    </View>
    {onDispute && (
      <TouchableOpacity style={styles.disputeBtn} onPress={onDispute}>
        <Text style={styles.disputeBtnText}>Dispute Decision</Text>
      </TouchableOpacity>
    )}
  </View>
);

// --- SHIPPED STATUS ---
const ShippedStatusUI = () => (
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

// --- INSPECTED STATUS ---
const InspectedStatusUI = () => (
  <View style={styles.statusSection}>
    <View style={styles.statusRow}>
      <Eye size={24} color="#3B82F6" fill="#DBEAFE" />
      <View style={styles.statusTextContainer}>
        <Text style={styles.statusTitle}>Item Inspected</Text>
        <Text style={styles.statusSubtitle}>Seller inspected the item. The seller will decide to accept or reject the return request</Text>
      </View>
    </View>
  </View>
);

// --- RECEIVED STATUS ---
const ReceivedStatusUI = () => (
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

// --- CANCELLED STATUS ---
const CancelledStatusUI = () => (
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

// --- RETURN SHIP STATUS ---
const ReturnShipStatusUI = () => (
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

// --- APPROVED PICKUP STATUS (for cash pickup returns) ---
const ApprovedPickupStatusUI = () => (
  <View style={styles.statusSection}>
    <View style={styles.statusRow}>
      <CheckCircle2 size={24} color="#10B981" fill="#D1FAE5" />
      <View style={styles.statusTextContainer}>
        <Text style={styles.statusTitle}>Approved</Text>
        <Text style={styles.statusSubtitle}>
          Please return the item within the specified return window (days/time) to complete your refund.
        </Text>
      </View>
    </View>
  </View>
);

// ========== ACTION BUTTONS COMPONENTS ==========

// --- PENDING ACTIONS ---
const PendingActions = ({ onCancel, loading }: { onCancel: () => void, loading: boolean }) => (
  <TouchableOpacity 
    style={[styles.secondaryButton, loading && styles.disabledButton]} 
    onPress={onCancel}
    disabled={loading}
  >
    <Ban size={16} color="#374151" />
    <Text style={styles.secondaryButtonText}>Cancel Request</Text>
  </TouchableOpacity>
);

// --- NEGOTIATION ACTIONS ---
const NegotiationActions = ({ 
  onAccept, 
  onReject, 
  loading, 
  isAccepting 
}: { 
  onAccept: () => void, 
  onReject: () => void, 
  loading: boolean,
  isAccepting: boolean
}) => (
  <>
    <TouchableOpacity 
      style={[styles.primaryButton, (loading || isAccepting) && styles.disabledButton]} 
      onPress={onAccept}
      disabled={loading || isAccepting}
    >
      <ThumbsUp size={16} color="#FFF" />
      <Text style={styles.primaryButtonText}>Accept Offer</Text>
    </TouchableOpacity>
    
    <TouchableOpacity 
      style={[styles.secondaryButton, loading && styles.disabledButton]} 
      onPress={onReject}
      disabled={loading}
    >
      <ThumbsDown size={16} color="#374151" />
      <Text style={styles.secondaryButtonText}>Reject Offer</Text>
    </TouchableOpacity>
  </>
);

// --- APPROVED/WAITING ACTIONS (for returns) ---
const ReturnActions = ({ 
  onAddTracking, 
  onWalkIn,
  loading 
}: { 
  onAddTracking: () => void, 
  onWalkIn?: () => void,
  loading: boolean 
}) => (
  <>
    <TouchableOpacity 
      style={[styles.primaryButton, loading && styles.disabledButton]} 
      onPress={onAddTracking}
      disabled={loading}
    >
      <Upload size={16} color="#FFF" />
      <Text style={styles.primaryButtonText}>Provide Shipping Info</Text>
    </TouchableOpacity>

    {/* Walk in Return button below */}
    <TouchableOpacity 
      style={[styles.secondaryButton, loading && styles.disabledButton]}
      onPress={onWalkIn}
      disabled={loading}
    >
      <Store size={16} color="#374151" />
      <Text style={styles.secondaryButtonText}>Walk in Return</Text>
    </TouchableOpacity>
  </>
);

// --- REJECTED ACTIONS ---
const RejectedActions = ({ 
  onFileDispute, 
  loading 
}: { 
  onFileDispute: () => void, 
  loading: boolean
}) => (
  <TouchableOpacity 
    style={[styles.primaryButton, loading && styles.disabledButton]} 
    onPress={onFileDispute}
    disabled={loading}
  >
    <AlertTriangle size={16} color="#FFF" />
    <Text style={styles.primaryButtonText}>File a Dispute</Text>
  </TouchableOpacity>
);

// --- DISPUTE ACTIONS ---
const DisputeActions = ({ 
  onAcknowledge, 
  loading, 
  acknowledged 
}: { 
  onAcknowledge: () => void, 
  loading: boolean,
  acknowledged: boolean
}) => (
  <>
    <TouchableOpacity 
      style={[styles.primaryButton, (loading || acknowledged) && styles.disabledButton]} 
      onPress={onAcknowledge}
      disabled={loading || acknowledged}
    >
      <Text style={styles.primaryButtonText}>
        {loading ? 'Confirming...' : acknowledged ? 'Acknowledged' : 'Confirm Decision'}
      </Text>
    </TouchableOpacity>
  </>
);

// --- DEFAULT ACTIONS (back button) ---
const DefaultActions = ({ onBack }: { onBack: () => void }) => (
  <TouchableOpacity style={styles.secondaryButton} onPress={onBack}>
    <ArrowLeft size={16} color="#374151" />
    <Text style={styles.secondaryButtonText}>Back to Requests</Text>
  </TouchableOpacity>
);

// ========== MAIN COMPONENT ==========

export default function ViewRefundPage() {
  const { user } = useAuth();
  const { refundId } = useLocalSearchParams();
  const router = useRouter();
  const [refund, setRefund] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  
  // Fetched when refund/order does not include a delivery address
  const [shippingAddress, setShippingAddress] = useState<any | null>(null);
  const [loadingShippingAddress, setLoadingShippingAddress] = useState(false);

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

      // Try the detailed endpoint first (guarantees shipping/payment details)
      try {
        const detailResp = await AxiosInstance.get(`/return-refund/${encodeURIComponent(String(refundId))}/get_my_refund/`, {
          headers: { 'X-User-Id': user.id }
        });
        if (detailResp?.data) {
          setRefund(detailResp.data);
          return;
        }
      } catch (detailErr) {
        console.warn('Detailed refund fetch failed, falling back to list', detailErr?.message || detailErr);
      }

      // Fallback: list endpoint (faster but may omit nested details)
      const resp = await AxiosInstance.get('/return-refund/get_my_refunds/', { 
        headers: { 'X-User-Id': user.id } 
      });
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

  // If refund/order doesn't contain shipping info, fetch user's default shipping address
  useEffect(() => {
    if (!refund) return;

    const hasShipping = !!(
      (refund.shipping_info && (refund.shipping_info.recipient_name || refund.shipping_info.full_address)) ||
      (refund.order && refund.order.shipping_address)
    );

    if (hasShipping) return;
    if (!user?.id) return;

    let mounted = true;

    const fetchDefaultAddress = async () => {
      try {
        setLoadingShippingAddress(true);
        const resp = await AxiosInstance.get('/shipping-address/get_shipping_addresses/', {
          params: { user_id: user.id }
        });

        if (resp.data && resp.data.success) {
          const defaultAddr = resp.data.default_shipping_address || (resp.data.shipping_addresses && resp.data.shipping_addresses[0]) || null;
          if (mounted && defaultAddr) {
            setShippingAddress(defaultAddr);
          }
        }
      } catch (e) {
        console.error('Failed to fetch default shipping address', e);
      } finally {
        if (mounted) setLoadingShippingAddress(false);
      }
    };

    fetchDefaultAddress();

    return () => { mounted = false; };
  }, [refund, user?.id]);

  const handleDispute = () => {
    Alert.alert(
      'File a Dispute',
      'Explain why you believe the seller\'s decision was incorrect.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: async () => {
            try {
              setActionLoading(true);
              await AxiosInstance.post(`/return-refund/${refundId}/file_dispute/`, {
                dispute_reason: 'Buyer disagree with seller decision',
              }, {
                headers: { 'X-User-Id': user?.id }
              });
              Alert.alert('Success', 'Dispute filed successfully');
              await fetchRefund();
            } catch (err: any) {
              console.error('Failed to file dispute', err);
              Alert.alert('Error', err?.response?.data?.error || err?.message || 'Failed to file dispute');
            } finally {
              setActionLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleCancelRefund = () => {
    if (!refund) return;
    const id = refund.refund_id || refund.id;
    Alert.alert(
      'Cancel Refund',
      'Are you sure you want to cancel this refund request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              setActionLoading(true);
              await AxiosInstance.post(`/return-refund/${encodeURIComponent(String(id))}/cancel_refund/`, null, {
                headers: { 'X-User-Id': user?.id }
              });
              Alert.alert('Success', 'Refund cancelled successfully');
              await fetchRefund();
            } catch (err: any) {
              console.error('Failed to cancel refund', err);
              Alert.alert('Error', err?.response?.data?.error || err?.message || 'Failed to cancel refund');
            } finally {
              setActionLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleRejectOffer = () => {
    Alert.alert(
      'Reject Offer',
      'Provide a reason for rejecting the seller\'s offer.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          onPress: async () => {
            try {
              setActionLoading(true);
              await AxiosInstance.post(`/return-refund/${refundId}/respond_to_negotiation/`, {
                action: 'reject',
                reason: 'Buyer rejected the offer'
              }, {
                headers: { 'X-User-Id': user?.id }
              });
              Alert.alert('Success', 'Offer rejected successfully');
              await fetchRefund();
            } catch (err: any) {
              console.error('Failed to reject offer', err);
              Alert.alert('Error', err?.response?.data?.error || err?.message || 'Failed to reject offer');
            } finally {
              setActionLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleAcceptOffer = async () => {
    if (!refund) return;
    
    const method = (refund.seller_suggested_method || '').toString().toLowerCase().trim();
    
    // Check if buyer has payment details for this method
    const hasPaymentDetail = () => {
      const pd = refund.payment_details || {};
      switch (method) {
        case 'wallet':
          return Boolean(pd.wallet && (pd.wallet.account_number || pd.wallet.wallet_id || pd.wallet.provider));
        case 'bank':
          return Boolean(pd.bank && (pd.bank.account_number || pd.bank.bank_name));
        case 'remittance':
          return Boolean(pd.remittance && (pd.remittance.reference || pd.remittance.receiver_name || pd.remittance.provider));
        default:
          return true; // voucher or other methods
      }
    };

    if (method === 'voucher' || !method || hasPaymentDetail()) {
      // Proceed directly to accept
      try {
        setIsAccepting(true);
        await AxiosInstance.post(`/return-refund/${refundId}/respond_to_negotiation/`, {
          action: 'accept',
          reason: 'Accepted seller offer'
        }, {
          headers: { 'X-User-Id': user?.id }
        });
        Alert.alert('Success', 'Offer accepted successfully');
        await fetchRefund();
      } catch (err: any) {
        console.error('Failed to accept offer', err);
        Alert.alert('Error', err?.response?.data?.error || err?.message || 'Failed to accept offer');
      } finally {
        setIsAccepting(false);
      }
    } else {
      // Ask user to add payment method first
      Alert.alert(
        'Payment Method Required',
        'You need to add a payment method before accepting this offer.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Add Payment Method',
            onPress: () => {
              // Navigate to add payment method screen
              // router.push(`/payment-method/add?refundId=${refundId}&method=${method}`);
            }
          }
        ]
      );
    }
  };

  // Tracking form state and handlers (let user input shipping info)
  const [showTrackingForm, setShowTrackingForm] = useState(false);
  const [trackingForm, setTrackingForm] = useState({ logistic_service: '', tracking_number: '', shipped_at: '', notes: '' });

  // Walk-in confirm modal state
  const [showWalkInConfirm, setShowWalkInConfirm] = useState(false);

  const handleOpenTrackingForm = () => {
    setTrackingForm({ logistic_service: '', tracking_number: '', shipped_at: '', notes: '' });
    setShowTrackingForm(true);
  };

  // Backwards-compatible alias used by action components
  const handleAddTracking = () => handleOpenTrackingForm();

  // Open Walk-in confirmation modal
  const handleOpenWalkInConfirm = () => {
    setShowWalkInConfirm(true);
  };

  // Confirm Walk-in return: create return process if missing then submit update_tracking with walk-in logistic service
  const handleConfirmWalkIn = async () => {
    try {
      setActionLoading(true);

      // Start return process if missing
      if (!refund.return_request) {
        await AxiosInstance.post(`/return-refund/${refundId}/start_return_process/`, {}, {
          headers: { 'X-User-Id': user?.id }
        });
      }

      // Submit walk-in tracking details by sending an empty payload so fields remain null (indicates Walk-in)
      const payload: any = {};

      await AxiosInstance.post(`/return-refund/${refundId}/update_tracking/`, payload, {
        headers: { 'X-User-Id': user?.id }
      });

      Alert.alert('Success', 'Walk-in return recorded. Please bring the item to the store address shown.');
      setShowWalkInConfirm(false);
      await fetchRefund();
    } catch (err: any) {
      console.error('Failed to confirm walk-in return', err);
      Alert.alert('Error', err?.response?.data?.error || err?.message || 'Failed to record walk-in return');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitTrackingForm = async () => {
    if (!trackingForm.logistic_service || !trackingForm.tracking_number) {
      Alert.alert('Missing fields', 'Please provide both service and tracking number');
      return;
    }

    try {
      setActionLoading(true);

      // Start return process if missing
      if (!refund.return_request) {
        await AxiosInstance.post(`/return-refund/${refundId}/start_return_process/`, {}, {
          headers: { 'X-User-Id': user?.id }
        });
      }

      // Submit tracking details
      const payload: any = {
        logistic_service: trackingForm.logistic_service,
        tracking_number: trackingForm.tracking_number,
      };
      if (trackingForm.shipped_at) payload.shipped_at = trackingForm.shipped_at;
      if (trackingForm.notes) payload.notes = trackingForm.notes;

      await AxiosInstance.post(`/return-refund/${refundId}/update_tracking/`, payload, {
        headers: { 'X-User-Id': user?.id }
      });

      Alert.alert('Success', 'Shipping information submitted');
      setShowTrackingForm(false);
      await fetchRefund();

    } catch (err: any) {
      console.error('Failed to submit tracking', err);
      Alert.alert('Error', err?.response?.data?.error || err?.message || 'Failed to submit tracking info');
    } finally {
      setActionLoading(false);
    }
  };


  const handleAcknowledgeDispute = async () => {
    const dr = refund?.dispute || refund?.dispute_request;
    if (!dr?.id) return;
    
    try {
      setActionLoading(true);
      const resp = await AxiosInstance.post(`/disputes/${dr.id}/acknowledge/`, {}, {
        headers: { 'X-User-Id': user?.id }
      });
      
      if (resp.status === 200) {
        setAcknowledged(true);
        Alert.alert('Success', 'You have acknowledged the admin decision.');
        await fetchRefund();
      }
    } catch (err: any) {
      console.error('Failed to acknowledge dispute', err);
      Alert.alert('Error', err?.response?.data?.error || err?.message || 'Failed to acknowledge dispute');
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    // Implement clipboard functionality
    console.log('Copy to clipboard:', text);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
    if (isNaN(num)) return '₱0.00';
    return `₱${num.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  };

  // Convert keys like 'return_item' -> 'Return Item'
  const friendlyLabel = (s?: string) => {
    if (s === undefined || s === null) return 'N/A';
    return String(s)
      .replace(/_/g, ' ')
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  // Parse refund method (supports formats like 'return:wallet')
  const parseRefundMethod = (r: any) => {
    const raw = r?.buyer_preferred_refund_method || r?.refund_method || r?.preferred_method || '';
    if (!raw) return '';
    const parts = String(raw).split(':').map((s: string) => s.trim()).filter(Boolean);
    if (parts.length === 0) return '';
    return (parts.length === 1 ? parts[0] : parts[parts.length - 1]).toLowerCase();
  };

  // Normalize address string and remove consecutive duplicate parts
  const normalizeAddress = (addr?: string) => {
    if (!addr) return '';
    const parts = String(addr).split(',').map(p => p.trim()).filter(Boolean);
    const deduped: string[] = [];
    parts.forEach((p, i) => {
      if (i === 0 || p !== parts[i - 1]) deduped.push(p);
    });
    return deduped.join(', ');
  };

  // Render status UI based on conditions
  const renderRefundStatus = (status: string) => {
    const statusUpper = (status || '').toUpperCase();

    // Debug helper: log chosen UI and key derived conditions to terminal
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
    const logAndReturn = (name: string, jsx: any) => {
      console.debug('renderRefundStatus: UI selected', { name, refundId: refund.refund_id || refund.id, statusUpper, refundTypeLog, payStatusLog, rrStatus: rrLog.status, itemStatusesLog });
      return jsx;
    };

    // You can easily modify these conditions by changing STATUS_CONDITIONS
    if (STATUS_CONDITIONS.showPendingStatus(statusUpper)) {
      return logAndReturn('PendingStatusUI', <PendingStatusUI refund={refund} />);
    }
    if (STATUS_CONDITIONS.showNegotiationStatus(statusUpper)) {
      return logAndReturn('NegotiationStatusUI', <NegotiationStatusUI refund={refund} formatCurrency={formatCurrency} />);
    }
    if (STATUS_CONDITIONS.showRejectedStatus(statusUpper)) {
      return logAndReturn('RejectedStatusUI', <RejectedStatusUI onDispute={handleDispute} refund={refund} formatCurrency={formatCurrency} />);
    }
    // Early inspection/received check (improved debug + accept variants): per spec — if it's a return, status approved, payment pending, and any return item or rr.status indicates inspected/received, show Inspected or Received UI.
    {
      const payStatusEarly = String(refund.refund_payment_status || '').toLowerCase();
      const refundTypeEarly = String(refund.final_refund_type || refund.refund_type || '').toLowerCase();
      const rrEarly = refund.return_request || {};
      const getReturnItemsEarly = () => {
        if (Array.isArray(rrEarly.items)) return rrEarly.items;
        if (Array.isArray(refund.return_request_items)) return refund.return_request_items;
        if (Array.isArray(refund.return_items)) return refund.return_items;
        if (Array.isArray(rrEarly.return_items)) return rrEarly.return_items;
        // Some backends return a map/object keyed by item id
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

      // Debug: always print these derived values to help identify mismatches
      console.debug('renderRefundStatus debug', {
        refundId: refund.refund_id || refund.id,
        refund_status: refund.status,
        statusUpper,
        refundTypeEarly,
        payStatusEarly,
        rrStatus: rrEarly.status,
        rrStatusEarlyLower,
        itemStatusesEarly,
        anyInspected,
        anyStrictReceived
      });

      if (statusUpper === 'APPROVED' && (refundTypeEarly === 'return' || refundTypeEarly === 'return_item') && payStatusEarly === 'pending' && anyInspected) {
        console.debug('renderRefundStatus: showing InspectedStatusUI due to return item inspected or rr.status', { refundId: refund.refund_id || refund.id, itemStatusesEarly });
        return logAndReturn('InspectedStatusUI', <InspectedStatusUI />);
      }

      if (statusUpper === 'APPROVED' && (refundTypeEarly === 'return' || refundTypeEarly === 'return_item') && payStatusEarly === 'pending' && anyStrictReceived) {
        console.debug('renderRefundStatus: showing ReceivedStatusUI due to return item received', { refundId: refund.refund_id || refund.id, itemStatusesEarly });
        return logAndReturn('ReceivedStatusUI', <ReceivedStatusUI />);
      }
    }

    if (STATUS_CONDITIONS.showApprovedStatus(statusUpper)) {
      return logAndReturn('ApprovedStatusUI', <ApprovedStatusUI refund={refund} onOpenTrackingDialog={handleAddTracking} formatCurrency={formatCurrency} formatDate={formatDate} />);
    }
    if (STATUS_CONDITIONS.showWaitingStatus(statusUpper)) {
      return logAndReturn('WaitingStatusUI', <WaitingStatusUI refund={refund} onOpenTrackingDialog={handleAddTracking} formatDate={formatDate} />);
    }
    if (STATUS_CONDITIONS.showToVerifyStatus(statusUpper)) {
      return logAndReturn('ToVerifyStatusUI', <ToVerifyStatusUI />);
    }
    if (STATUS_CONDITIONS.showReturnAcceptedStatus(statusUpper)) {
      return logAndReturn('ReturnAcceptedUI', <ReturnAcceptedUI />);
    }
    if (STATUS_CONDITIONS.showReturnRejectedStatus(statusUpper)) {
      return logAndReturn('ReturnRejectedUI', <ReturnRejectedUI onDispute={handleDispute} />);
    }
    if (STATUS_CONDITIONS.showShippedStatus(statusUpper)) {
      return logAndReturn('ShippedStatusUI', <ShippedStatusUI />);
    }

    // Show Received UI when all specific conditions are met:
    // - refund is a return
    // - refund status is APPROVED
    // - refund_payment_status is pending
    // - at least one return-request item has status 'received' (supports multiple backend variants)
    const payStatus = String(refund.refund_payment_status || '').toLowerCase();
    const refundTypeLower = String(refund.final_refund_type || refund.refund_type || '').toLowerCase();
    const rr = refund.return_request || {};
    const getReturnItems = () => {
      if (Array.isArray(rr.items)) return rr.items;
      if (Array.isArray(refund.return_request_items)) return refund.return_request_items;
      if (Array.isArray(refund.return_items)) return refund.return_items;
      if (Array.isArray(rr.return_items)) return rr.return_items;
      return [];
    };
    const returnItems = getReturnItems();
    const normalizeItemStatus = (it: any) => String(it?.status || it?.item_status || it?.return_status || it?.status_display || it?.state || '').toLowerCase();
    const itemStatuses = Array.isArray(returnItems) ? returnItems.map((it: any) => normalizeItemStatus(it)) : [];
    const receivedVariants = ['received', 'item_received', 'received_by_seller', 'seller_received', 'received_by_warehouse'];
    const anyReceived = itemStatuses.some(s => receivedVariants.includes(s));

    if (statusUpper === 'APPROVED' && (refundTypeLower === 'return' || refundTypeLower === 'return_item') && payStatus === 'pending' && anyReceived) {
      return logAndReturn('ReceivedStatusUI', <ReceivedStatusUI />);
    }

    if (STATUS_CONDITIONS.showReceivedStatus(statusUpper)) {
      return logAndReturn('ReceivedStatusUI (status)', <ReceivedStatusUI />);
    }

    // Special-case: if refund is in dispute but the dispute request is resolved and payment already completed,
    // show the Completed UI to the buyer (finalized by moderation)
    const drCheck = refund.dispute || refund.dispute_request || null;
    if (statusUpper === 'DISPUTE' && drCheck && drCheck.status?.toLowerCase() === 'resolved' && String(refund.refund_payment_status || '').toLowerCase() === 'completed') {
      return logAndReturn('CompletedStatusUI (dispute-resolved)', <CompletedStatusUI refund={refund} formatCurrency={formatCurrency} formatDate={formatDate} />);
    }

    if (STATUS_CONDITIONS.showDisputeStatus(statusUpper)) {
      return logAndReturn('DisputeStatusUI', <DisputeStatusUI refund={refund} formatCurrency={formatCurrency} formatDate={formatDate} onAcknowledgeDispute={handleAcknowledgeDispute} />);
    }
    if (STATUS_CONDITIONS.showCompletedStatus(statusUpper)) {
      return logAndReturn('CompletedStatusUI', <CompletedStatusUI refund={refund} formatCurrency={formatCurrency} formatDate={formatDate} />);
    }
    if (STATUS_CONDITIONS.showProcessingStatus(statusUpper)) {
      return logAndReturn('ProcessingStatusUI', <ProcessingStatusUI refund={refund} formatCurrency={formatCurrency} />);
    }
    if (STATUS_CONDITIONS.showReturnShipStatus(statusUpper)) {
      return logAndReturn('ReturnShipStatusUI', <ReturnShipStatusUI />);
    }
    if (STATUS_CONDITIONS.showCancelledStatus(statusUpper)) {
      return logAndReturn('CancelledStatusUI', <CancelledStatusUI />);
    }
    
    // Check for pickup returns
    const orderInfo = refund.order_info || {};
    const orderStatus = String(orderInfo.status || orderInfo.status_display || orderInfo.current_status || refund.order?.status || '').toLowerCase();
    const paymentMethod = String(orderInfo.payment_method || refund.order?.payment_method || '').toLowerCase();
    const deliveryMethod = String(orderInfo.delivery_method || refund.order?.delivery_method || '').toLowerCase();
    const isPickupCashCompleted = orderStatus.includes('completed') && paymentMethod.includes('cash') && deliveryMethod.includes('pickup');
    const isReturnType = refundTypeLower === 'return' || refundTypeLower === 'return_item';
    
    if ((statusUpper === 'APPROVED' || STATUS_CONDITIONS.showWaitingStatus(statusUpper)) && isReturnType && isPickupCashCompleted) {
      return logAndReturn('ApprovedPickupStatusUI', <ApprovedPickupStatusUI />);
    }
    
    // Default fallback
    return logAndReturn('PendingStatusUI (fallback)', <PendingStatusUI refund={refund} />);
  };

  // Render action buttons based on status
  const renderActionButtons = () => {
    if (!refund) return null;
    
    const statusUpper = (refund.status || '').toUpperCase();
    const rrStatus = String(refund.return_request?.status || '').toLowerCase();
    const payStatus = String(refund.refund_payment_status || '').toLowerCase();
    const finalType = String(refund.final_refund_type || refund.refund_type || '').toLowerCase();
    const isReturnAcceptedWaitingModeration = rrStatus === 'approved' && refund.status?.toLowerCase() === 'approved' && payStatus === 'pending' && finalType === 'return';
    
    // Check for return item needing tracking
    const isReturnItem = refund.refund_type === 'return';
    const showAddTrackingAction = (
      (statusUpper === 'APPROVED' && isReturnItem && !['shipped','received','inspected'].includes(rrStatus) && !(rrStatus === 'approved' && ['processing','completed'].includes(payStatus)) && !isReturnAcceptedWaitingModeration) ||
      STATUS_CONDITIONS.showWaitingStatus(statusUpper)
    );

    if (showAddTrackingAction) {
      return <ReturnActions onAddTracking={handleAddTracking} onWalkIn={handleOpenWalkInConfirm} loading={actionLoading} />;
    }
    
    if (STATUS_CONDITIONS.showPendingStatus(statusUpper)) {
      return <PendingActions onCancel={handleCancelRefund} loading={actionLoading} />;
    }
    
    if (STATUS_CONDITIONS.showNegotiationStatus(statusUpper)) {
      return (
        <NegotiationActions 
          onAccept={handleAcceptOffer} 
          onReject={handleRejectOffer} 
          loading={actionLoading}
          isAccepting={isAccepting}
        />
      );
    }
    
    if (STATUS_CONDITIONS.showRejectedStatus(statusUpper)) {
      return <RejectedActions onFileDispute={handleDispute} loading={actionLoading} />;
    }
    
    // Dispute actions for rejected disputes
    if (STATUS_CONDITIONS.showDisputeStatus(statusUpper)) {
      const dr = refund.dispute || refund.dispute_request || null;
      if (dr && dr.status?.toLowerCase() === 'rejected' && refund.status?.toLowerCase() === 'dispute') {
        return (
          <DisputeActions 
            onAcknowledge={handleAcknowledgeDispute} 
            loading={actionLoading} 
            acknowledged={acknowledged}
          />
        );
      }
    }
    
    // Default back button for other statuses
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
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft color="#000" size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Refund Detail</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Refund information not found.</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Extract refund data
  const item = (refund.order_items && refund.order_items[0]) || refund.product || {};
  const imageUrl = (item.primary_image && item.primary_image.url) || item.image || null;
  const order = refund.order || {};
  const shipping = refund.shipping_info || order.shipping_address || shippingAddress || {};

  // Resolve display-ready fields with sensible fallbacks
  const recipientName = shipping?.recipient_name || shipping?.to_address?.recipient || order?.shipping_address?.recipient_name || order?.delivery_address_text || 'N/A';
  const rawAddress = shipping?.full_address || (
    shipping?.address_line1
      ? `${shipping.address_line1}${shipping.city ? `, ${shipping.city}` : ''}${shipping.province ? `, ${shipping.province}` : ''}${shipping.postal_code ? `, ${shipping.postal_code}` : ''}${shipping.country ? `, ${shipping.country}` : ''}`
      : (order?.delivery_address_text || '')
  );
  const addressText = normalizeAddress(rawAddress);
  const phoneNumber = shipping?.phone || shipping?.phone_number || shipping?.recipient_phone || shipping?.to_address?.phone || order?.delivery_address?.phone_number || order?.shipping_address?.recipient_phone || '';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft color="#000" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Refund Detail</Text>
        <TouchableOpacity>
          <MoreHorizontal color="#000" size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* 1. STATUS BANNER */}
        {renderRefundStatus(refund.status)}

        {/* 2. SHIPPING INFO (if available) */}
        {(shipping.carrier || shipping.tracking_number) && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.rowBetween}>
              <View style={styles.row}>
                <Truck size={20} color="#333" />
                <Text style={styles.sectionTitle}>Shipping Information</Text>
              </View>
              <ChevronRight size={20} color="#999" />
            </TouchableOpacity>
            <Text style={styles.subText}>
              Carrier: {shipping.carrier || 'Standard Express'}
              {shipping.tracking_number && ` • Tracking: ${shipping.tracking_number}`}
            </Text>
          </View>
        )}

        {/* 3. DELIVERY ADDRESS */}
        <View style={styles.section}>
          <View style={styles.row}>
            <MapPin size={20} color="#333" />
            <Text style={styles.sectionTitle}>Delivery Address</Text>
          </View>
          <View style={styles.addressContent}>
            <Text style={styles.addressName}>{recipientName}</Text>
            {phoneNumber ? (
              <Text style={styles.addressPhone}>{phoneNumber}</Text>
            ) : null}
            {addressText ? (
              <Text style={styles.addressText}>{addressText}</Text>
            ) : null}
          </View>
        </View>

        {/* Refund Payment Details */}
        {(() => {
          const method = parseRefundMethod(refund);
          const pd = refund.payment_details || {};
          if (!method && (!pd || Object.keys(pd).length === 0)) return null;

          return (
            <View style={styles.section}>
              <View style={styles.row}>
                <Wallet size={20} color="#333" />
                <Text style={styles.sectionTitle}>Refund Payment Details</Text>
              </View>

              <View style={{ marginTop: 8 }}>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Method:</Text>
                  <View style={styles.metaRightSide}>
                    <Text style={styles.metaValue}>{friendlyLabel(method || '—')}</Text>
                  </View>
                </View>

                {(method === 'wallet' || (!method && pd.wallet)) && pd.wallet && (
                  <>
                    <View style={styles.metaRow}>
                      <Text style={styles.metaLabel}>Provider:</Text>
                      <View style={styles.metaRightSide}>
                        <Text style={styles.metaValue}>{pd.wallet.provider || pd.wallet.wallet_provider || '—'}</Text>
                      </View>
                    </View>
                    <View style={styles.metaRow}>
                      <Text style={styles.metaLabel}>Account:</Text>
                      <View style={styles.metaRightSide}>
                        <Text style={styles.metaValue}>{pd.wallet.account_number || pd.wallet.wallet_id || '—'}</Text>
                      </View>
                    </View>
                    <View style={styles.metaRow}>
                      <Text style={styles.metaLabel}>Account Name:</Text>
                      <View style={styles.metaRightSide}>
                        <Text style={styles.metaValue}>{pd.wallet.account_name || pd.wallet.owner_name || refund.requested_by_username || '—'}</Text>
                      </View>
                    </View>
                    {pd.wallet.contact_number && (
                      <View style={styles.metaRow}>
                        <Text style={styles.metaLabel}>Contact:</Text>
                        <View style={styles.metaRightSide}>
                          <Text style={styles.metaValue}>{pd.wallet.contact_number}</Text>
                        </View>
                      </View>
                    )}
                  </>
                )}

                {(method === 'bank' || (!method && pd.bank)) && pd.bank && (
                  <>
                    <View style={styles.metaRow}>
                      <Text style={styles.metaLabel}>Bank:</Text>
                      <View style={styles.metaRightSide}>
                        <Text style={styles.metaValue}>{pd.bank.bank_name || pd.bank.name || '—'}</Text>
                      </View>
                    </View>
                    <View style={styles.metaRow}>
                      <Text style={styles.metaLabel}>Account Name:</Text>
                      <View style={styles.metaRightSide}>
                        <Text style={styles.metaValue}>{pd.bank.account_name || refund.requested_by_username || '—'}</Text>
                      </View>
                    </View>
                    <View style={styles.metaRow}>
                      <Text style={styles.metaLabel}>Account Number:</Text>
                      <View style={styles.metaRightSide}>
                        <Text style={styles.metaValue}>{pd.bank.account_number || '—'}</Text>
                      </View>
                    </View>
                    {pd.bank.branch && (
                      <View style={styles.metaRow}>
                        <Text style={styles.metaLabel}>Branch:</Text>
                        <View style={styles.metaRightSide}>
                          <Text style={styles.metaValue}>{pd.bank.branch}</Text>
                        </View>
                      </View>
                    )}
                  </>
                )}

                {(method === 'remittance' || (!method && pd.remittance)) && pd.remittance && (
                  <>
                    <View style={styles.metaRow}>
                      <Text style={styles.metaLabel}>Provider:</Text>
                      <View style={styles.metaRightSide}>
                        <Text style={styles.metaValue}>{pd.remittance.provider || pd.remittance.service || '—'}</Text>
                      </View>
                    </View>
                    <View style={styles.metaRow}>
                      <Text style={styles.metaLabel}>Receiver:</Text>
                      <View style={styles.metaRightSide}>
                        <Text style={styles.metaValue}>{`${pd.remittance.first_name || ''}${pd.remittance.middle_name ? ' ' + pd.remittance.middle_name : ''} ${pd.remittance.last_name || ''}`.trim() || '—'}</Text>
                      </View>
                    </View>
                    {pd.remittance.reference && (
                      <View style={styles.metaRow}>
                        <Text style={styles.metaLabel}>Reference:</Text>
                        <View style={styles.metaRightSide}>
                          <Text style={styles.metaValue}>{pd.remittance.reference}</Text>
                        </View>
                      </View>
                    )}
                    {(pd.remittance.street || pd.remittance.city || pd.remittance.province) && (
                      <View style={styles.metaRow}>
                        <Text style={styles.metaLabel}>Address:</Text>
                        <View style={styles.metaRightSide}>
                          <Text style={styles.metaValue}>{`${pd.remittance.street || ''}${pd.remittance.barangay ? ', ' + pd.remittance.barangay : ''}${pd.remittance.city ? ', ' + pd.remittance.city : ''}${pd.remittance.province ? ', ' + pd.remittance.province : ''}${pd.remittance.zip_code ? ', ' + pd.remittance.zip_code : ''}`.replace(/^, /, '')}</Text>
                        </View>
                      </View>
                    )}
                    {pd.remittance.contact_number && (
                      <View style={styles.metaRow}>
                        <Text style={styles.metaLabel}>Contact:</Text>
                        <View style={styles.metaRightSide}>
                          <Text style={styles.metaValue}>{pd.remittance.contact_number}</Text>
                        </View>
                      </View>
                    )}
                  </>
                )}

                {method && (!pd[method] || Object.keys(pd[method]).length === 0) && (
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Details:</Text>
                    <View style={styles.metaRightSide}>
                      <Text style={[styles.metaValue, { color: '#9CA3AF' }]}>No payment details provided</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          );
        })()}

        {/* 4. PRODUCT ITEM */}
        <View style={styles.section}>
          <View style={styles.productRow}>
            <Image 
              source={imageUrl ? { uri: imageUrl } : require('../../assets/images/icon.png')} 
              style={styles.productImagePlaceholder} 
            />
            <View style={styles.productInfo}>
              <View style={styles.rowBetween}>
                <Text style={styles.productName} numberOfLines={2}>
                  {item.product_name || item.name || 'Product'}
                </Text>
                <Text style={styles.priceText}>
                  {formatCurrency(item.price || refund.refund_amount || 0)}
                </Text>
              </View>
              <View style={[styles.rowBetween, { marginTop: 8 }]}>
                <Text style={styles.qtyText}>
                  Refund Qty: {item.quantity || item.qty || 1}
                </Text>
                <Text style={styles.refundTotalText}>
                  Total: {formatCurrency(refund.total_refund_amount || refund.refund_total || 0)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 5. REFUND META DATA */}
        <View style={[styles.section, { paddingBottom: 40 }]}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Order Number:</Text>
            <View style={styles.metaRightSide}>
              <Text style={styles.metaValue} numberOfLines={1} ellipsizeMode="middle">
                {String(order.order_id || order.id || refund.order_id || '-')}
              </Text>
              <TouchableOpacity 
                style={{ marginLeft: 6 }} 
                onPress={() => copyToClipboard(String(order.order_id || refund.order_id || '-'))}
              >
                <Copy size={14} color="#666" />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Request Date:</Text>
            <View style={styles.metaRightSide}>
              <Text style={styles.metaValue}>
                {formatDate(refund.created_at || refund.requested_at)}
              </Text>
            </View>
          </View>
          
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Reason:</Text>
            <View style={styles.metaRightSide}>
              <Text style={styles.metaValue}>
                {refund.reason || refund.customer_note || 'Not specified'}
              </Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Refund Type:</Text>
            <View style={styles.metaRightSide}>
              <Text style={styles.metaValue}>{friendlyLabel(refund.refund_type || refund.refundType)}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Preferred Method:</Text>
            <View style={styles.metaRightSide}>
              <Text style={styles.metaValue}>{friendlyLabel(refund.buyer_preferred_refund_method || refund.refund_method || refund.preferred_method)}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Total Refund Amount:</Text>
            <View style={styles.metaRightSide}>
              <Text style={[styles.metaValue, { color: '#10B981' }]}>{formatCurrency(refund.total_refund_amount || refund.refund_amount || refund.refund_total || 0)}</Text>
            </View>
          </View>

          {refund.admin_note && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Admin Note:</Text>
              <View style={styles.metaRightSide}>
                <Text style={[styles.metaValue, { color: '#7C3AED' }]}>
                  {refund.admin_note}
                </Text>
              </View>
            </View>
          )}

          {refund.seller_note && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Seller Note:</Text>
              <View style={styles.metaRightSide}>
                <Text style={[styles.metaValue, { color: '#3B82F6' }]}>
                  {refund.seller_note}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* ACTION BUTTONS */}
        <View style={styles.actionSection}>
          {renderActionButtons()}
        </View>

        {/* TRACKING FORM MODAL */}
        {showTrackingForm && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Provide Shipping Info</Text>

              <TextInput
                style={styles.input}
                placeholder="Logistic Service (e.g., LBC, J&T)"
                value={trackingForm.logistic_service}
                onChangeText={(t) => setTrackingForm(prev => ({ ...prev, logistic_service: t }))}
              />

              <TextInput
                style={styles.input}
                placeholder="Tracking Number"
                value={trackingForm.tracking_number}
                onChangeText={(t) => setTrackingForm(prev => ({ ...prev, tracking_number: t }))}
              />

              <TextInput
                style={styles.input}
                placeholder="Shipped At (YYYY-MM-DD)"
                value={trackingForm.shipped_at}
                onChangeText={(t) => setTrackingForm(prev => ({ ...prev, shipped_at: t }))}
              />

              <TextInput
                style={[styles.input, { height: 80 }]}
                placeholder="Notes (optional)"
                value={trackingForm.notes}
                onChangeText={(t) => setTrackingForm(prev => ({ ...prev, notes: t }))}
                multiline
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.secondaryButton, { flex: 1, marginRight: 8 }]} onPress={() => setShowTrackingForm(false)} disabled={actionLoading}>
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.primaryButton, { flex: 1 }]} onPress={handleSubmitTrackingForm} disabled={actionLoading}>
                  <Text style={styles.primaryButtonText}>{actionLoading ? 'Submitting...' : 'Submit'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* WALK-IN CONFIRM MODAL */}
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
                <TouchableOpacity style={[styles.secondaryButton, { flex: 1, marginRight: 8 }]} onPress={() => setShowWalkInConfirm(false)} disabled={actionLoading}>
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.primaryButton, { flex: 1 }]} onPress={handleConfirmWalkIn} disabled={actionLoading}>
                  <Text style={styles.primaryButtonText}>{actionLoading ? 'Processing...' : 'Confirm'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F5F5F5' 
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    paddingTop: 50
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: '700',
    color: '#000'
  },
  scrollContainer: { 
    flex: 1 
  },
  
  // Status Section
  statusSection: { 
    backgroundColor: '#FFF', 
    padding: 16, 
    marginBottom: 8 
  },
  statusRow: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  statusTextContainer: { 
    marginLeft: 12, 
    flex: 1 
  },
  statusTitle: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#000',
    marginBottom: 4
  },
  statusSubtitle: { 
    fontSize: 13, 
    color: '#888',
    lineHeight: 18
  },
  boldText: {
    fontWeight: '700'
  },
  
  // Negotiation Specific
  negotiationDetails: {
    marginTop: 12,
    backgroundColor: '#F0F9FF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0F2FE'
  },
  negotiationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  negotiationLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500'
  },
  negotiationValue: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600'
  },
  amountValue: {
    color: '#10B981'
  },
  
  // Dispute & Rejected
  disputeBtn: { 
    marginTop: 12, 
    borderWidth: 1, 
    borderColor: '#EF4444', 
    padding: 10, 
    borderRadius: 8, 
    alignItems: 'center' 
  },
  disputeBtnText: { 
    color: '#EF4444', 
    fontWeight: '700' 
  },
  sellerNote: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 8,
    fontStyle: 'italic'
  },
  disputeHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic'
  },
  
  // Approved Return Details
  returnDetails: {
    marginTop: 16,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  returnDetailRow: {
    marginBottom: 12
  },
  returnDetailLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 4
  },
  returnDetailValue: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600'
  },
  returnAddress: {
    marginTop: 4
  },
  
  // Shipped Info
  shippedInfo: {
    marginTop: 16,
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DBEAFE'
  },
  shippedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 4
  },
  shippedSubtitle: {
    fontSize: 12,
    color: '#3B82F6',
    marginBottom: 8
  },
  shippingDetails: {
    marginTop: 8
  },
  shippingDetail: {
    flexDirection: 'row',
    marginBottom: 6
  },
  shippingLabel: {
    fontSize: 12,
    color: '#6B7280',
    width: 100
  },
  shippingValue: {
    fontSize: 12,
    color: '#111827',
    fontWeight: '500',
    flex: 1
  },
  updateShippingBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#3B82F6',
    borderRadius: 6
  },
  updateShippingText: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: '500'
  },
  
  // Waiting Status
  returnAddressCard: {
    marginTop: 12,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  returnAddressTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4
  },
  returnAddressText: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16
  },
  waitingDetails: {
    marginTop: 12
  },
  waitingDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  waitingDetailText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8
  },
  daysLeft: {
    fontWeight: '600'
  },
  daysLeftRed: {
    color: '#EF4444'
  },
  daysLeftYellow: {
    color: '#F59E0B'
  },
  daysLeftGreen: {
    color: '#10B981'
  },
  shippedCard: {
    marginTop: 12,
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DBEAFE'
  },
  toggleDetailsBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8
  },
  toggleDetailsText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '500',
    marginRight: 4
  },
  
  // Moderation Card
  moderationCard: {
    marginTop: 12,
    backgroundColor: '#EEF2FF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E7FF'
  },
  moderationTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4F46E5',
    marginBottom: 4
  },
  moderationText: {
    fontSize: 12,
    color: '#6366F1',
    lineHeight: 16
  },
  moderationDeadline: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4
  },
  
  // Processing Details
  processingDetails: {
    marginTop: 12,
    backgroundColor: '#F5F3FF',
    padding: 12,
    borderRadius: 8
  },
  processingDetail: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4
  },
  amountText: {
    fontWeight: '700',
    color: '#10B981'
  },
  methodText: {
    fontWeight: '600',
    color: '#3B82F6'
  },
  
  // Completed Details
  completedDetails: {
    marginTop: 12,
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DCFCE7'
  },
  completedDetail: {
    flexDirection: 'row',
    marginBottom: 8
  },
  completedLabel: {
    fontSize: 12,
    color: '#6B7280',
    width: 80
  },
  completedValue: {
    fontSize: 12,
    color: '#111827',
    fontWeight: '500',
    flex: 1
  },
  
  // Resolved Card
  resolvedCard: {
    marginTop: 12,
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DCFCE7'
  },
  resolvedTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 4
  },
  resolvedText: {
    fontSize: 12,
    color: '#065F46',
    marginBottom: 8
  },
  resolvedDetail: {
    fontSize: 11,
    color: '#6B7280'
  },
  resolvedValue: {
    fontWeight: '500',
    color: '#111827'
  },
  
  // Acknowledge Button
  acknowledgeBtn: {
    marginTop: 12,
    backgroundColor: '#3B82F6',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center'
  },
  acknowledgeBtnText: {
    color: '#FFF',
    fontWeight: '600'
  },
  
  // Dispute Date
  disputeDate: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 8
  },

  partialAmount: {
    marginTop: 8,
    fontSize: 13,
    color: '#111827',
    fontWeight: '700'
  },
  
  // Common Section
  section: { 
    backgroundColor: '#FFF', 
    padding: 16, 
    marginBottom: 8 
  },
  row: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  rowBetween: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  
  // Shipping & Address
  sectionTitle: { 
    fontSize: 15, 
    fontWeight: '700', 
    marginLeft: 8 
  },
  subText: { 
    fontSize: 13, 
    color: '#888', 
    marginTop: 8, 
    marginLeft: 28 
  },
  addressContent: { 
    marginLeft: 28, 
    marginTop: 8 
  },
  addressName: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#333' 
  },
  addressText: { 
    fontSize: 13, 
    color: '#666', 
    marginTop: 2, 
    lineHeight: 18 
  },
  addressPhone: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  addressNotes: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
    fontStyle: 'italic'
  },
  
  // Product Row
  productRow: { 
    flexDirection: 'row' 
  },
  productImagePlaceholder: { 
    width: 60, 
    height: 60, 
    backgroundColor: '#EEE', 
    borderRadius: 4 
  },
  productInfo: { 
    flex: 1, 
    marginLeft: 12 
  },
  productName: { 
    fontSize: 14, 
    color: '#333',
    flex: 1,
    marginRight: 8
  },
  priceText: { 
    fontSize: 14, 
    color: '#F59E0B', 
    fontWeight: '700',
    flexShrink: 0
  },
  qtyText: { 
    fontSize: 13, 
    color: '#888' 
  },
  refundTotalText: { 
    fontSize: 13, 
    color: '#10B981', 
    fontWeight: '700' 
  },
  
  // Meta Data
  metaRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 12 
  },
  metaLabel: { 
    fontSize: 13, 
    color: '#999', 
    flexShrink: 0 
  },
  metaRightSide: { 
    flex: 1, 
    flexDirection: 'row', 
    justifyContent: 'flex-end', 
    alignItems: 'center', 
    marginLeft: 20 
  },
  metaValue: { 
    fontSize: 13, 
    color: '#333', 
    textAlign: 'right', 
    flexShrink: 1 
  },
  
  // Action Buttons
  actionSection: {
    padding: 16,
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: '#F97316',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#FFF',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6
  },

  // Modal for tracking form
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContainer: {
    width: '90%',
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 16,
    maxHeight: '80%'
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#FFF'
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 8
  },

  // Proof thumbnails and modal
  proofRow: {
    paddingVertical: 4,
  },
  proofThumbWrapper: {
    marginRight: 8,
    width: 90,
    alignItems: 'center'
  },
  proofThumb: {
    width: 90,
    height: 90,
    borderRadius: 8,
    backgroundColor: '#F3F4F6'
  },
  proofNote: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 6,
    width: 90,
    textAlign: 'center'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 8,
  },
  closeButton: {
    padding: 8,
  },
  modalImageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalImage: {
    width: '100%',
    height: '100%'
  },
  modalFooter: {
    padding: 8,
    alignItems: 'center'
  },
  modalImageCounter: {
    color: '#FFF'
  },

  // Empty State
  empty: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 24 
  },
  emptyText: { 
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: '#F97316',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});