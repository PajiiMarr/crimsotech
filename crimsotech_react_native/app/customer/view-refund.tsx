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
} from 'react-native';
import { 
  ArrowLeft, Copy, Truck, CheckCircle2, XCircle, Clock, 
  RotateCcw, Box, Hourglass, MessageSquare, Search, PackageCheck, 
  PackageX, Home, Gavel, ShieldCheck, MapPin, ChevronRight,
  MoreHorizontal
} from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import AxiosInstance from '../../contexts/axios';

// --- STATUS UI COMPONENTS ---

const PendingStatusUI = () => (
  <View style={styles.statusSection}>
    <View style={styles.statusRow}>
      <Clock size={24} color="#F59E0B" fill="#FEF3C7" />
      <View style={styles.statusTextContainer}>
        <Text style={styles.statusTitle}>Refund Pending</Text>
        <Text style={styles.statusSubtitle}>Waiting for seller to review your request.</Text>
      </View>
    </View>
  </View>
);

const NegotiationStatusUI = () => (
  <View style={styles.statusSection}>
    <View style={styles.statusRow}>
      <MessageSquare size={24} color="#3B82F6" fill="#DBEAFE" />
      <View style={styles.statusTextContainer}>
        <Text style={styles.statusTitle}>In Negotiation</Text>
        <Text style={styles.statusSubtitle}>Seller proposed a counter-offer. Check chat.</Text>
      </View>
    </View>
  </View>
);

const RejectedStatusUI = ({ onDispute }: { onDispute?: () => void }) => (
  <View style={styles.statusSection}>
    <View style={styles.statusRow}>
      <XCircle size={24} color="#EF4444" fill="#FEE2E2" />
      <View style={styles.statusTextContainer}>
        <Text style={styles.statusTitle}>Refund Rejected</Text>
        <Text style={styles.statusSubtitle}>The seller declined your request.</Text>
      </View>
    </View>
    {onDispute && (
      <TouchableOpacity style={styles.disputeBtn} onPress={onDispute}>
        <Text style={styles.disputeBtnText}>Dispute Rejection</Text>
      </TouchableOpacity>
    )}
  </View>
);

const ApprovedStatusUI = () => (
  <View style={styles.statusSection}>
    <View style={styles.statusRow}>
      <CheckCircle2 size={24} color="#10B981" fill="#D1FAE5" />
      <View style={styles.statusTextContainer}>
        <Text style={styles.statusTitle}>Refund Approved</Text>
        <Text style={styles.statusSubtitle}>The seller has approved your refund request.</Text>
      </View>
    </View>
  </View>
);

const WaitingStatusUI = () => (
  <View style={styles.statusSection}>
    <View style={styles.statusRow}>
      <Hourglass size={24} color="#6B7280" fill="#F3F4F6" />
      <View style={styles.statusTextContainer}>
        <Text style={styles.statusTitle}>Waiting for Action</Text>
        <Text style={styles.statusSubtitle}>Please provide requested info.</Text>
      </View>
    </View>
  </View>
);

const ToVerifyStatusUI = () => (
  <View style={styles.statusSection}>
    <View style={styles.statusRow}>
      <Search size={24} color="#3B82F6" fill="#DBEAFE" />
      <View style={styles.statusTextContainer}>
        <Text style={styles.statusTitle}>To Verify</Text>
        <Text style={styles.statusSubtitle}>Quality team is verifying the claim.</Text>
      </View>
    </View>
  </View>
);

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

const ReceivedStatusUI = () => (
  <View style={styles.statusSection}>
    <View style={styles.statusRow}>
      <Home size={24} color="#3B82F6" fill="#DBEAFE" />
      <View style={styles.statusTextContainer}>
        <Text style={styles.statusTitle}>Item Received</Text>
        <Text style={styles.statusSubtitle}>Warehouse has received your package.</Text>
      </View>
    </View>
  </View>
);

const DisputeStatusUI = () => (
  <View style={styles.statusSection}>
    <View style={styles.statusRow}>
      <Gavel size={24} color="#7C3AED" fill="#EDE9FE" />
      <View style={styles.statusTextContainer}>
        <Text style={styles.statusTitle}>Dispute Opened</Text>
        <Text style={styles.statusSubtitle}>A platform agent is mediating the case.</Text>
      </View>
    </View>
  </View>
);

const CompletedStatusUI = () => (
  <View style={styles.statusSection}>
    <View style={styles.statusRow}>
      <ShieldCheck size={24} color="#10B981" fill="#D1FAE5" />
      <View style={styles.statusTextContainer}>
        <Text style={styles.statusTitle}>Case Completed</Text>
        <Text style={styles.statusSubtitle}>This refund case is now closed.</Text>
      </View>
    </View>
  </View>
);

const ProcessingRefundUI = () => (
  <View style={styles.statusSection}>
    <View style={styles.statusRow}>
      <RotateCcw size={24} color="#3B82F6" fill="#DBEAFE" />
      <View style={styles.statusTextContainer}>
        <Text style={styles.statusTitle}>Processing Refund</Text>
        <Text style={styles.statusSubtitle}>Funds are being transferred to you.</Text>
      </View>
    </View>
  </View>
);

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

// --- MAIN COMPONENT ---

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

  const handleDispute = () => {
    // Navigate to dispute page or open dispute modal
    console.log('Opening dispute for refund:', refundId);
    // router.push(`/dispute/${refundId}`);
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

  const renderRefundStatus = (status: string) => {
    switch ((status || '').toUpperCase()) {
      case 'PENDING': return <PendingStatusUI />;
      case 'NEGOTIATION': 
      case 'NEGOTIATING': return <NegotiationStatusUI />;
      case 'REJECTED': return <RejectedStatusUI onDispute={handleDispute} />;
      case 'APPROVED': return <ApprovedStatusUI />;
      case 'WAITING': 
      case 'AWAITING_INFO': return <WaitingStatusUI />;
      case 'TO_VERIFY': 
      case 'VERIFICATION': return <ToVerifyStatusUI />;
      case 'RETURN_ACCEPTED': return <ReturnAcceptedUI />;
      case 'RETURN_REJECTED': return <ReturnRejectedUI onDispute={handleDispute} />;
      case 'SHIPPED': 
      case 'ITEM_SHIPPED': return <ShippedStatusUI />;
      case 'RECEIVED': 
      case 'ITEM_RECEIVED': return <ReceivedStatusUI />;
      case 'DISPUTE': 
      case 'DISPUTE_OPENED': return <DisputeStatusUI />;
      case 'COMPLETED': 
      case 'CLOSED': return <CompletedStatusUI />;
      case 'PROCESSING': 
      case 'PROCESSING_REFUND': return <ProcessingRefundUI />;
      case 'RETURN_SHIP': 
      case 'RETURN_SHIPPING': return <ReturnShipStatusUI />;
      default: return <PendingStatusUI />;
    }
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
  const shipping = refund.shipping_info || {};

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
            <Text style={styles.addressName}>
              {shipping.recipient_name || order.recipient_name || 'N/A'}
            </Text>
            <Text style={styles.addressText}>
              {shipping.address_line1 || ''}
              {shipping.city ? `, ${shipping.city}` : ''}
              {shipping.province ? `, ${shipping.province}` : ''}
              {shipping.postal_code ? `, ${shipping.postal_code}` : ''}
              {shipping.country ? `, ${shipping.country}` : ''}
            </Text>
            {shipping.phone && (
              <Text style={styles.addressPhone}>Phone: {shipping.phone}</Text>
            )}
          </View>
        </View>

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
          {['PENDING', 'WAITING', 'AWAITING_INFO'].includes((refund.status || '').toUpperCase()) && (
            <TouchableOpacity style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Provide Additional Info</Text>
            </TouchableOpacity>
          )}
          
          {['RETURN_ACCEPTED'].includes((refund.status || '').toUpperCase()) && (
            <TouchableOpacity style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Print Shipping Label</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Contact Support</Text>
          </TouchableOpacity>
        </View>

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
    color: '#000' 
  },
  statusSubtitle: { 
    fontSize: 13, 
    color: '#888' 
  },
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
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
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