import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Modal,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { router } from 'expo-router';
import { getRiderOrderHistory } from '../../services/api';

// --- Types & Mock Data ---
interface ParcelItem {
  id: string;
  type: 'Used Smartphone' | 'Second-hand Laptop' | 'Unused Accessories';
  amount: number;
  baseFee: number;
  handlingFee: number;
  distanceFee: number;
  status: 'Delivered';
  time: string;
  route: string;
  condition: 'Used' | 'Unused';
}

const EARNINGS_DATA: ParcelItem[] = [
  { 
    id: 'ELX-9901', 
    type: 'Used Smartphone', 
    amount: 230.00, 
    baseFee: 80, 
    handlingFee: 50, 
    distanceFee: 100, 
    status: 'Delivered', 
    time: 'Today, 2:45 PM', 
    route: 'Quezon City → Makati', 
    condition: 'Used' 
  },
  { 
    id: 'ELX-9902', 
    type: 'Second-hand Laptop', 
    amount: 450.00, 
    baseFee: 150, 
    handlingFee: 150, 
    distanceFee: 150, 
    status: 'Delivered', 
    time: 'Yesterday, 4:10 PM', 
    route: 'Pasig → Taguig', 
    condition: 'Used' 
  },
];

export default function EarningsPage() {
  const { userRole, userId } = useAuth();
  const [activeTab, setActiveTab] = useState('This Week');
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [earningsData, setEarningsData] = useState<any>(null);

  // Fetch earnings data
  const fetchEarningsData = async () => {
    if (!userId) return;
    
    try {
      setError(null);
      // Calculate date range based on active tab
      const { startDate, endDate } = getDateRange(activeTab);
      
      const data = await getRiderOrderHistory(userId, {
        startDate,
        endDate,
        status: 'completed', // Only show completed deliveries
      });
      
      setEarningsData(data);
    } catch (err: any) {
      console.error('Error fetching earnings:', err);
      setError(err.message || 'Failed to load earnings data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEarningsData();
  }, [userId, activeTab]);

  // Helper function to get date range
  const getDateRange = (tab: string) => {
    const now = new Date();
    let startDate = new Date();
    const endDate = now.toISOString().split('T')[0];

    switch (tab) {
      case 'Today':
        startDate = now;
        break;
      case 'This Week':
        startDate = new Date(now.setDate(now.getDate() - now.getDay()));
        break;
      case 'This Month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate,
    };
  };

  const metrics = earningsData?.metrics || {
    total_earnings: 0,
    delivered_count: 0,
    avg_rating: 0,
  };

  const deliveries = earningsData?.deliveries || [];

  if (userRole && userRole !== 'rider') {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>Not authorized to view this page</Text>
      </View>
    );
  }

  const renderParcelItem = (item: ParcelItem) => (
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
              name={item.type.includes('Laptop') ? "laptop" : item.type.includes('Smartphone') ? "cellphone" : "headphones"} 
              size={22} 
              color="#F97316" 
            />
          </View>
          <View>
            <Text style={styles.parcelType}>{item.type}</Text>
            <Text style={styles.parcelRoute}>{item.route}</Text>
          </View>
        </View>
        <View style={styles.amountColumn}>
          <Text style={styles.parcelAmount}>₱{item.amount.toFixed(2)}</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.cardBottom}>
        <Text style={styles.conditionText}>Condition: <Text style={{fontWeight:'600'}}>{item.condition}</Text></Text>
        <Text style={styles.timeText}>{item.time}</Text>
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
          <Text style={styles.totalAmount}>₱3,450.00</Text>
          <Text style={styles.totalPeriod}>{activeTab}</Text>
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

        {/* 5. Handling Fee / Risk Pay Info */}
        <View style={styles.riskCard}>
          <MaterialCommunityIcons name="shield-alert-outline" size={20} color="#F97316" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.riskTitle}>Fragile / High-Value Handling</Text>
            <Text style={styles.riskSub}>Extra protection fee included per item</Text>
          </View>
          <Text style={styles.riskAmount}>+₱50.00</Text>
        </View>

        {/* 6. Bonus Section */}
        <View style={styles.bonusCard}>
          <View style={styles.bonusLeft}>
            <Text style={styles.bonusEmoji}>🎯</Text>
            <View>
              <Text style={styles.bonusTitle}>Electronics Bonus</Text>
              <Text style={styles.bonusGoal}>5/5 gadget deliveries</Text>
            </View>
          </View>
          <Text style={styles.bonusEarned}>₱200.00</Text>
        </View>

        {/* 4. Parcel List */}
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Recent Deliveries</Text>
        </View>
        
        {EARNINGS_DATA.length > 0 ? (
          <View style={{ paddingHorizontal: 20 }}>
            {EARNINGS_DATA.map((item) => renderParcelItem(item))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="package-variant" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>No deliveries yet</Text>
            <Text style={styles.emptySub}>Accept an electronics delivery to start earning.</Text>
          </View>
        )}
      </ScrollView>

      {/* 7. Earnings Breakdown Modal */}
      <Modal visible={!!selectedItem} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Earnings Breakdown</Text>
              <TouchableOpacity onPress={() => setSelectedItem(null)}>
                <Feather name="x" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            {selectedItem && (
              <View style={styles.modalBody}>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Base Delivery Fee</Text>
                  <Text style={styles.modalValue}>₱{selectedItem.baseFee.toFixed(2)}</Text>
                </View>
                
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Distance Fee</Text>
                  <Text style={styles.modalValue}>₱{selectedItem.distanceFee.toFixed(2)}</Text>
                </View>
                
                <View style={styles.modalRow}>
                  <Text style={styles.highlightText}>Handling Fee (Electronics)</Text>
                  <Text style={styles.highlightText}>₱{selectedItem.handlingFee.toFixed(2)}</Text>
                </View>
                
                <View style={styles.modalDivider} />
                
                <View style={styles.modalRow}>
                  <Text style={styles.boldText}>Total Earned</Text>
                  <Text style={styles.boldTotal}>₱{selectedItem.amount.toFixed(2)}</Text>
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
  container: { flex: 1, backgroundColor: '#FDFDFD' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  message: { fontSize: 16, color: '#6B7280' },
  
  // Header
  topBar: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 20, 
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  topBarTitle: { fontSize: 24, fontWeight: '700', color: '#111827' },
  topBarSubtext: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  
  // New Header Actions
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { 
    padding: 10, 
    backgroundColor: '#F3F4F6', 
    borderRadius: 12,
    position: 'relative' 
  },
  notifBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DC2626',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },

  // Total Card
  totalCard: { margin: 20, padding: 24, borderRadius: 24, backgroundColor: '#FFF', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10 },
  totalLabel: { fontSize: 14, color: '#6B7280', marginBottom: 4 },
  totalAmount: { fontSize: 32, fontWeight: '800', color: '#111827' },
  totalPeriod: { fontSize: 12, color: '#F97316', fontWeight: '600', marginTop: 4 },

  // Tabs
  tabWrapper: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 20, gap: 8 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center' },
  tabActive: { backgroundColor: '#F97316' },
  tabText: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  tabTextActive: { color: '#FFF' },

  // Parcel Card
  parcelCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F3F4F6', marginHorizontal: 20 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between' },
  iconInfoRow: { flexDirection: 'row', gap: 12, flex: 1 },
  deviceIconBg: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FFF7ED', justifyContent: 'center', alignItems: 'center' },
  parcelType: { fontSize: 15, fontWeight: '700', color: '#111827' },
  parcelRoute: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  amountColumn: { alignItems: 'flex-end' },
  parcelAmount: { fontSize: 16, fontWeight: '800', color: '#111827' },
  statusBadge: { backgroundColor: '#ECFDF5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
  statusText: { fontSize: 10, color: '#059669', fontWeight: '700' },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, borderTopWidth: 1, borderTopColor: '#F9FAFB', paddingTop: 8 },
  conditionText: { fontSize: 11, color: '#6B7280' },
  timeText: { fontSize: 11, color: '#9CA3AF' },

  // Risk Card
  riskCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, padding: 12, borderRadius: 12, backgroundColor: '#FFF7ED', marginBottom: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: '#FDBA74' },
  riskTitle: { fontSize: 13, fontWeight: '700', color: '#C2410C' },
  riskSub: { fontSize: 11, color: '#9A3412' },
  riskAmount: { fontWeight: '800', color: '#C2410C' },

  // Bonus Card
  bonusCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 20, padding: 16, borderRadius: 16, backgroundColor: '#111827', marginBottom: 20 },
  bonusLeft: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  bonusEmoji: { fontSize: 24 },
  bonusTitle: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  bonusGoal: { color: '#9CA3AF', fontSize: 11 },
  bonusEarned: { color: '#F97316', fontWeight: '800', fontSize: 16 },

  // List Utils
  listHeader: { paddingHorizontal: 20, marginBottom: 12 },
  listTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalBody: { gap: 16 },
  modalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalLabel: { fontSize: 14, color: '#6B7280' },
  modalValue: { fontSize: 14, color: '#111827', fontWeight: '500' },
  highlightText: { color: '#F97316', fontWeight: '600', fontSize: 14 },
  modalDivider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 8 },
  boldText: { fontWeight: '700', fontSize: 16, color: '#111827' },
  boldTotal: { fontWeight: '800', fontSize: 20, color: '#F97316' },

  // Footer
  footer: { position: 'absolute', bottom: 0, width: '100%', padding: 20, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  withdrawBtn: { backgroundColor: '#F97316', paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  withdrawText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  
  emptyContainer: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#6B7280', marginTop: 12 },
  emptySub: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 40 }
});