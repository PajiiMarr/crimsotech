import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { router } from 'expo-router';
import AxiosInstance from '../../contexts/axios';

// --- Types ---
interface DeliveryEarnings {
  id: string;
  delivery_fee: number;
  status: string;
  shop_name: string;
  created_at: string;
  delivered_at: string;
}

export default function EarningsPage() {
  const { userRole, userId } = useAuth();
  const [activeTab, setActiveTab] = useState('This Week');
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<DeliveryEarnings[]>([]);
  const [earningsSummary, setEarningsSummary] = useState({
    today: 0,
    this_week: 0,
    this_month: 0,
  });

  // Fetch earnings data from backend
  const fetchEarningsData = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await AxiosInstance.get('/rider-earnings/', {
        headers: {
          'X-User-Id': userId,
        },
      });
      
      if (response.data) {
        setDeliveries(response.data.deliveries || []);
        setEarningsSummary({
          today: response.data.today_earnings || 0,
          this_week: response.data.week_earnings || 0,
          this_month: response.data.month_earnings || 0,
        });
      }
    } catch (err: any) {
      console.error('Error fetching earnings:', err);
      setError(err.message || 'Failed to load earnings data');
      setDeliveries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEarningsData();
  }, [userId]);

  // Helper function to get earnings for current tab
  const getTabEarnings = () => {
    switch (activeTab) {
      case 'Today':
        return earningsSummary.today;
      case 'This Week':
        return earningsSummary.this_week;
      case 'This Month':
        return earningsSummary.this_month;
      default:
        return 0;
    }
  };

  if (userRole && userRole !== 'rider') {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>Not authorized to view this page</Text>
      </View>
    );
  }

  const renderParcelItem = (item: DeliveryEarnings) => (
    <TouchableOpacity 
      key={item.id}
      style={styles.parcelCard} 
      onPress={() => setSelectedItem(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardTop}>
        <View style={styles.iconInfoRow}>
          <View style={styles.deviceIconBg}>
            <MaterialCommunityIcons 
              name="truck"
              size={22} 
              color="#DC2626" 
            />
          </View>
          <View>
            <Text style={styles.parcelType}>{item.shop_name}</Text>
            <Text style={styles.parcelRoute}>Delivery Fee: ₱{Number(item.delivery_fee || 0).toFixed(2)}</Text>
          </View>
        </View>
        <View style={styles.amountColumn}>
          <Text style={styles.parcelAmount}>₱{Number(item.delivery_fee || 0).toFixed(2)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: '#DCFCE7' }]}>
            <Text style={[styles.statusText, { color: '#15803D' }]}>Delivered</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.cardBottom}>
        <Text style={styles.conditionText}>Status: <Text style={{fontWeight:'600'}}>Completed</Text></Text>
        <Text style={styles.timeText}>{new Date(item.delivered_at).toLocaleString('en-PH')}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* 1. Top Bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.topBarTitle}>My Earnings</Text>
          <Text style={styles.topBarSubtext}>Electronics Delivery</Text>
        </View>
        
        {/* Header Actions (Notifications & Settings) */}
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.iconBtn} 
            onPress={() => console.log('Notifications')}
          >
            <Feather name="bell" size={22} color="#111827" />
            <View style={styles.notifBadge} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.iconBtn} 
            onPress={() => router.push('/rider/settings')}
          >
            <Feather name="settings" size={22} color="#111827" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 }}>
        
        {/* 2. Total Earnings Card */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total Earnings</Text>
          {loading ? (
            <ActivityIndicator size="large" color="#DC2626" />
          ) : (
            <>
              <Text style={styles.totalAmount}>₱{getTabEarnings().toFixed(2)}</Text>
              <Text style={styles.totalPeriod}>{activeTab}</Text>
            </>
          )}
        </View>

        {/* 3. Filter Tabs */}
        <View style={styles.tabWrapper}>
          {['Today', 'This Week', 'This Month'].map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 4. Deliveries List */}
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Recent Deliveries</Text>
          <Text style={styles.deliveryCount}>{deliveries.length} completed</Text>
        </View>
        
        {!loading && deliveries.length > 0 ? (
          <View style={{ paddingHorizontal: 20 }}>
            {deliveries.map((item) => renderParcelItem(item))}
          </View>
        ) : loading ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="large" color="#DC2626" />
            <Text style={styles.emptyText}>Loading deliveries...</Text>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="package-variant" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>No deliveries yet</Text>
            <Text style={styles.emptySub}>Accept an electronics delivery to start earning.</Text>
          </View>
        )}
      </ScrollView>

      {/* 7. Deliveries Breakdown Modal */}
      <Modal visible={!!selectedItem} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Delivery Details</Text>
              <TouchableOpacity onPress={() => setSelectedItem(null)}>
                <Feather name="x" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            {selectedItem && (
              <View style={styles.modalBody}>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Shop</Text>
                  <Text style={styles.modalValue}>{selectedItem.shop_name}</Text>
                </View>
                
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Delivery Status</Text>
                  <Text style={styles.modalValue}>Delivered</Text>
                </View>
                
                <View style={styles.modalRow}>
                  <Text style={styles.highlightText}>Delivery Fee Earned</Text>
                  <Text style={styles.highlightText}>₱{Number(selectedItem.delivery_fee || 0).toFixed(2)}</Text>
                </View>
                
                <View style={styles.modalDivider} />
                
                <View style={styles.modalRow}>
                  <Text style={styles.boldText}>Total Earned</Text>
                  <Text style={styles.boldTotal}>₱{Number(selectedItem.delivery_fee || 0).toFixed(2)}</Text>
                </View>
                
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Delivered At</Text>
                  <Text style={styles.modalValue}>{new Date(selectedItem.delivered_at).toLocaleString('en-PH')}</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* 8. Withdraw Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.withdrawBtn}>
          <Text style={styles.withdrawText}>Withdraw Earnings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  message: { fontSize: 16, color: '#64748B' },

  // Header
  topBar: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 16, 
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0'
  },
  topBarTitle: { fontSize: 20, fontWeight: '600', color: '#1E293B' },
  topBarSubtext: { fontSize: 12, color: '#64748B', marginTop: 2 },

  // New Header Actions
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { 
    padding: 8, 
    backgroundColor: '#F3F4F6', 
    borderRadius: 8,
    position: 'relative' 
  },
  notifBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DC2626',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },

  // Total Card
  totalCard: { margin: 16, padding: 16, borderRadius: 12, backgroundColor: '#FEF2F2', borderWidth: 2, borderColor: '#DC2626', alignItems: 'center', elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2 },
  totalLabel: { fontSize: 11, color: '#64748B', marginBottom: 4 },
  totalAmount: { fontSize: 24, fontWeight: '700', color: '#DC2626' },
  totalPeriod: { fontSize: 11, color: '#1E293B', fontWeight: '600', marginTop: 4 },

  // Tabs
  tabWrapper: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 16, gap: 6 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: '#E2E8F0', alignItems: 'center' },
  tabActive: { backgroundColor: '#DC2626' },
  tabText: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  tabTextActive: { color: '#FFF' },

  // Parcel Card
  parcelCard: { backgroundColor: '#FFF', borderRadius: 8, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E2E8F0', marginHorizontal: 16 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between' },
  iconInfoRow: { flexDirection: 'row', gap: 8, flex: 1 },
  deviceIconBg: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center' },
  parcelType: { fontSize: 13, fontWeight: '600', color: '#1E293B' },
  parcelRoute: { fontSize: 11, color: '#64748B', marginTop: 2 },
  amountColumn: { alignItems: 'flex-end' },
  parcelAmount: { fontSize: 14, fontWeight: '700', color: '#DC2626' },
  statusBadge: { backgroundColor: '#E2E8F0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
  statusText: { fontSize: 9, color: '#64748B', fontWeight: '600' },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 6 },
  conditionText: { fontSize: 10, color: '#64748B' },
  timeText: { fontSize: 10, color: '#9CA3AF' },

  // Risk Card
  riskCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, padding: 10, borderRadius: 8, backgroundColor: '#F3F4F6', marginBottom: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: '#D1D5DB' },
  riskTitle: { fontSize: 12, fontWeight: '600', color: '#1E293B' },
  riskSub: { fontSize: 10, color: '#64748B' },
  riskAmount: { fontWeight: '700', color: '#1E293B' },

  // Bonus Card
  bonusCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 16, padding: 12, borderRadius: 8, backgroundColor: '#1E293B', marginBottom: 16 },
  bonusLeft: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  bonusEmoji: { fontSize: 20 },
  bonusTitle: { color: '#FFF', fontWeight: '600', fontSize: 13 },
  bonusGoal: { color: '#9CA3AF', fontSize: 10 },
  bonusEarned: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },

  // List Utils
  listHeader: { paddingHorizontal: 16, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  listTitle: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  deliveryCount: { fontSize: 12, color: '#64748B' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 12, borderTopRightRadius: 12, padding: 16, paddingBottom: 32 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  modalBody: { gap: 12 },
  modalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalLabel: { fontSize: 13, color: '#64748B' },
  modalValue: { fontSize: 13, color: '#1E293B', fontWeight: '500' },
  highlightText: { color: '#1E293B', fontWeight: '600', fontSize: 13 },
  modalDivider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 8 },
  boldText: { fontWeight: '600', fontSize: 14, color: '#1E293B' },
  boldTotal: { fontWeight: '700', fontSize: 18, color: '#DC2626' },

  // Footer
  footer: { position: 'absolute', bottom: 0, width: '100%', padding: 16, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  withdrawBtn: { backgroundColor: '#DC2626', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  withdrawText: { color: '#FFF', fontSize: 14, fontWeight: '600' },

  emptyContainer: { alignItems: 'center', marginTop: 32 },
  emptyText: { fontSize: 14, fontWeight: '600', color: '#64748B', marginTop: 12 },
  emptySub: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 32 }
});