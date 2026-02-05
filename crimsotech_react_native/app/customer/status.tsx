import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView, 
  TouchableOpacity, 
  StatusBar 
} from 'react-native';
import { 
  ArrowLeft, MoreHorizontal, Truck, ChevronRight, MapPin, Copy, 
  CheckCircle2, XCircle, Clock, RotateCcw, MessageSquare, Search, 
  PackageCheck, PackageX, Home, Gavel, ShieldCheck, Hourglass, Box
} from 'lucide-react-native';

// --- 1. THE 14 STATUS UI FUNCTIONS ---

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

const RejectedStatusUI = () => (
  <View style={styles.statusSection}>
    <View style={styles.statusRow}>
      <XCircle size={24} color="#EF4444" fill="#FEE2E2" />
      <View style={styles.statusTextContainer}>
        <Text style={styles.statusTitle}>Refund Rejected</Text>
        <Text style={styles.statusSubtitle}>The seller declined your request.</Text>
      </View>
    </View>
    <TouchableOpacity style={styles.disputeBtn}><Text style={styles.disputeBtnText}>Dispute Rejection</Text></TouchableOpacity>
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

const ReturnRejectedUI = () => (
  <View style={styles.statusSection}>
    <View style={styles.statusRow}>
      <PackageX size={24} color="#EF4444" fill="#FEE2E2" />
      <View style={styles.statusTextContainer}>
        <Text style={styles.statusTitle}>Return Rejected</Text>
        <Text style={styles.statusSubtitle}>Item did not pass quality check.</Text>
      </View>
    </View>
    <TouchableOpacity style={styles.disputeBtn}><Text style={styles.disputeBtnText}>Dispute Decision</Text></TouchableOpacity>
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

// --- MAIN SCREEN ---

export default function RefundDetailScreen() {
  const [status, setStatus] = useState('PENDING');

  const renderRefundStatus = () => {
    switch (status) {
      case 'PENDING': return <PendingStatusUI />;
      case 'NEGOTIATION': return <NegotiationStatusUI />;
      case 'REJECTED': return <RejectedStatusUI />;
      case 'APPROVED': return <ApprovedStatusUI />;
      case 'WAITING': return <WaitingStatusUI />;
      case 'TO_VERIFY': return <ToVerifyStatusUI />;
      case 'RETURN_ACCEPTED': return <ReturnAcceptedUI />;
      case 'RETURN_REJECTED': return <ReturnRejectedUI />;
      case 'SHIPPED': return <ShippedStatusUI />;
      case 'RECEIVED': return <ReceivedStatusUI />;
      case 'DISPUTE': return <DisputeStatusUI />;
      case 'COMPLETED': return <CompletedStatusUI />;
      case 'PROCESSING': return <ProcessingRefundUI />;
      case 'RETURN_SHIP': return <ReturnShipStatusUI />;
      default: return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity><ArrowLeft color="#000" size={24} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Refund Detail</Text>
        <TouchableOpacity><MoreHorizontal color="#000" size={24} /></TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContainer}>
        
        {/* 1. STATUS BANNER */}
        {renderRefundStatus()}

        {/* 2. SHIPPING INFO */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.rowBetween}>
            <View style={styles.row}>
              <Truck size={20} color="#333" />
              <Text style={styles.sectionTitle}>Shipping Information</Text>
            </View>
            <ChevronRight size={20} color="#999" />
          </TouchableOpacity>
          <Text style={styles.subText}>Logistics Carrier: Standard Express</Text>
        </View>

        {/* 3. DELIVERY ADDRESS (RESTORED) */}
        <View style={styles.section}>
          <View style={styles.row}>
            <MapPin size={20} color="#333" />
            <Text style={styles.sectionTitle}>Delivery Address</Text>
          </View>
          <View style={styles.addressContent}>
            <Text style={styles.addressName}>John Doe ()</Text>
            <Text style={styles.addressText}>ff, fg, ggg, vg, ccf, 55, Philippines</Text>
          </View>
        </View>

        {/* 4. PRODUCT ITEM */}
        <View style={styles.section}>
          <View style={styles.productRow}>
            <View style={styles.productImagePlaceholder} />
            <View style={styles.productInfo}>
              <View style={styles.rowBetween}>
                <Text style={styles.productName}>Mobile Phone Vivo</Text>
                <Text style={styles.priceText}>₱6000.00</Text>
              </View>
              <View style={[styles.rowBetween, { marginTop: 8 }]}>
                <Text style={styles.qtyText}>Refund Qty: 1</Text>
                <Text style={styles.refundTotalText}>Refund: ₱6000.00</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 5. META DATA (Responsive Order Number) */}
        <View style={[styles.section, { paddingBottom: 40 }]}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Order Number:</Text>
            <View style={styles.metaRightSide}>
              <Text style={styles.metaValue} numberOfLines={1} ellipsizeMode="middle">f52dc2c3-d283-4b59-97de-6c3d0c12872a</Text>
              <TouchableOpacity style={{ marginLeft: 6 }}><Copy size={14} color="#666" /></TouchableOpacity>
            </View>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Request Date:</Text>
            <View style={styles.metaRightSide}><Text style={styles.metaValue}>01/25/2026, 09:00 AM</Text></View>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Reason:</Text>
            <View style={styles.metaRightSide}><Text style={styles.metaValue}>Item defective</Text></View>
          </View>
        </View>

        {/* STATUS PICKER (For testing) */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.devTools}>
          {['PENDING', 'NEGOTIATION', 'REJECTED', 'APPROVED', 'WAITING', 'TO_VERIFY', 'RETURN_ACCEPTED', 'RETURN_REJECTED', 'SHIPPED', 'RECEIVED', 'DISPUTE', 'COMPLETED', 'PROCESSING', 'RETURN_SHIP'].map(s => (
            <TouchableOpacity key={s} onPress={() => setStatus(s)} style={styles.devBtn}>
              <Text style={styles.devBtnText}>{s[0]}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scrollContainer: { flex: 1 },
  section: { backgroundColor: '#FFF', padding: 16, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  
  // Status Section
  statusSection: { backgroundColor: '#FFF', padding: 16, marginBottom: 8 },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  statusTextContainer: { marginLeft: 12, flex: 1 },
  statusTitle: { fontSize: 16, fontWeight: '700', color: '#000' },
  statusSubtitle: { fontSize: 13, color: '#888' },
  disputeBtn: { marginTop: 12, borderWidth: 1, borderColor: '#EF4444', padding: 10, borderRadius: 8, alignItems: 'center' },
  disputeBtnText: { color: '#EF4444', fontWeight: '700' },

  // Restoration of Address Styles
  sectionTitle: { fontSize: 15, fontWeight: '700', marginLeft: 8 },
  subText: { fontSize: 13, color: '#888', marginTop: 8, marginLeft: 28 },
  addressContent: { marginLeft: 28, marginTop: 8 },
  addressName: { fontSize: 14, fontWeight: '600', color: '#333' },
  addressText: { fontSize: 13, color: '#666', marginTop: 2, lineHeight: 18 },

  // Product Row
  productRow: { flexDirection: 'row' },
  productImagePlaceholder: { width: 60, height: 60, backgroundColor: '#EEE', borderRadius: 4 },
  productInfo: { flex: 1, marginLeft: 12 },
  productName: { fontSize: 14, color: '#333' },
  priceText: { fontSize: 14, color: '#F59E0B', fontWeight: '700' },
  qtyText: { fontSize: 13, color: '#888' },
  refundTotalText: { fontSize: 13, color: '#10B981', fontWeight: '700' },

  // Meta Data
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  metaLabel: { fontSize: 13, color: '#999', flexShrink: 0 },
  metaRightSide: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginLeft: 20 },
  metaValue: { fontSize: 13, color: '#333', textAlign: 'right', flexShrink: 1 },

  // Dev Tools
  devTools: { padding: 10, backgroundColor: '#EEE' },
  devBtn: { backgroundColor: '#333', padding: 12, borderRadius: 6, marginRight: 8 },
  devBtnText: { color: '#FFF', fontSize: 12 }
});