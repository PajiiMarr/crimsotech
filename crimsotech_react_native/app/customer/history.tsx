import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, FlatList, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function SubscriptionHistory() {
  // Enhanced Mock Data
  const historyData = [
    {
      id: 'INV-88291',
      plan: 'Pro Plan',
      date: 'Jan 12, 2026',
      time: '02:45 PM',
      amount: '1,188.00',
      method: 'GCash',
      status: 'Success',
      refNo: '992011283'
    },
    {
      id: 'INV-77102',
      plan: 'Basic Plan',
      date: 'Dec 12, 2025',
      time: '10:15 AM',
      amount: '588.00',
      method: 'GCash',
      status: 'Success',
      refNo: '881022394'
    },
    {
      id: 'INV-66503',
      plan: 'Pro Plan',
      date: 'Nov 10, 2025',
      time: '11:20 PM',
      amount: '1,188.00',
      method: 'Visa **** 4242',
      status: 'Failed',
      refNo: 'N/A'
    },
  ];

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'Success': return { bg: '#ECFDF5', text: '#059669', icon: 'check-circle' };
      case 'Failed': return { bg: '#FEF2F2', text: '#DC2626', icon: 'alert-circle' };
      default: return { bg: '#F3F4F6', text: '#6B7280', icon: 'clock' };
    }
  };

  const HistoryItem = ({ item }: { item: typeof historyData[0] }) => {
    const config = getStatusConfig(item.status);
    
    return (
      <View style={styles.historyCard}>
        <View style={styles.cardTopRow}>
          <View style={styles.invoiceInfo}>
            <Text style={styles.invoiceLabel}>Invoice</Text>
            <Text style={styles.invoiceId}>{item.id}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
            <Text style={[styles.statusText, { color: config.text }]}>{item.status}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardMainContent}>
          <View style={styles.planIconBox}>
            <MaterialCommunityIcons name="crown-outline" size={24} color="#4B5563" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.planTitle}>{item.plan}</Text>
            <Text style={styles.metaText}>{item.date} at {item.time}</Text>
          </View>
          <Text style={styles.amountText}>₱{item.amount}</Text>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.paymentDetail}>
            <Feather name="credit-card" size={12} color="#9CA3AF" />
            <Text style={styles.footerDetailText}>{item.method}</Text>
          </View>
          <TouchableOpacity 
             style={styles.receiptBtn}
             onPress={() => console.log("Open Receipt", item.id)}
          >
            <Text style={styles.receiptBtnText}>View Receipt</Text>
            <Feather name="external-link" size={12} color="#2563EB" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Billing History</Text>
        <TouchableOpacity style={styles.filterBtn}>
          <Feather name="filter" size={20} color="#4B5563" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={historyData}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.summaryBox}>
            <View>
              <Text style={styles.summaryLabel}>Total Spending</Text>
              <Text style={styles.summaryAmount}>₱2,964.00</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View>
              <Text style={styles.summaryLabel}>Transactions</Text>
              <Text style={styles.summaryAmount}>{historyData.length}</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => <HistoryItem item={item} />}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  
  // Header
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    backgroundColor: '#FFF', 
    paddingHorizontal: 8,
    height: 60,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3 },
      android: { elevation: 3 }
    })
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  backBtn: { padding: 8 },
  filterBtn: { padding: 8 },

  // Summary Stats
  summaryBox: { 
    flexDirection: 'row', 
    backgroundColor: '#111827', 
    borderRadius: 16, 
    padding: 20, 
    marginBottom: 24, 
    alignItems: 'center',
    justifyContent: 'space-around'
  },
  summaryLabel: { fontSize: 12, color: '#9CA3AF', marginBottom: 4 },
  summaryAmount: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  summaryDivider: { width: 1, height: 30, backgroundColor: '#374151' },

  listContent: { padding: 16 },
  
  // Detailed Card Style
  historyCard: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 16, 
    marginBottom: 16, 
    borderWidth: 1,
    borderColor: '#F3F4F6',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10 },
      android: { elevation: 2 }
    })
  },
  cardTopRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12
  },
  invoiceInfo: { flexDirection: 'column' },
  invoiceLabel: { fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', fontWeight: '600' },
  invoiceId: { fontSize: 13, fontWeight: '700', color: '#374151' },
  
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700' },

  divider: { height: 1, backgroundColor: '#F3F4F6', marginHorizontal: 16 },

  cardMainContent: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16,
    gap: 12 
  },
  planIconBox: { 
    width: 44, 
    height: 44, 
    borderRadius: 12, 
    backgroundColor: '#F8F9FA', 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  planTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  metaText: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  amountText: { fontSize: 17, fontWeight: '800', color: '#111827' },

  cardFooter: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    backgroundColor: '#FAFBFC',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6'
  },
  paymentDetail: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerDetailText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  
  receiptBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  receiptBtnText: { fontSize: 12, color: '#2563EB', fontWeight: '700' }
});