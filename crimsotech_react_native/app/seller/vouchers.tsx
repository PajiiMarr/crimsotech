// app/seller/vouchers.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View, Platform, Text, TouchableOpacity, FlatList, SafeAreaView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ticket, ShoppingBag, Plus, Search } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import AxiosInstance from '../../contexts/axios';

interface Voucher {
  id: string;
  name: string;
  code: string;
  voucher_type: 'shop' | 'product';
  discount_type: 'percentage' | 'fixed';
  value: number;
  minimum_spend: number;
  maximum_usage: number;
  current_usage: number;
  total_discount_given: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  status: 'active' | 'expired' | 'scheduled' | 'inactive';
}

const formatCurrency = (amount: number) => { return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount); };
const formatDate = (dateString: string) => { try { const date = new Date(dateString); return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return 'Invalid date'; } };

const VoucherCard = ({ item, onPress }: { item: Voucher; onPress: () => void; }) => {
  const getDiscountDisplay = () => { switch (item.discount_type) { case 'percentage': return `${item.value}%`; case 'fixed': return formatCurrency(item.value); default: return 'Unknown'; } };
  const getStatusColor = () => { switch (item.status) { case 'active': return '#4CAF50'; case 'expired': return '#F44336'; case 'scheduled': return '#FF9800'; default: return '#999'; } };
  
  return (
    <TouchableOpacity style={styles.voucherCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.leftSection}>
        <View style={[styles.iconCircle, { backgroundColor: item.voucher_type === 'shop' ? '#FFF3E0' : '#F3E5F5' }]}>
          {item.voucher_type === 'shop' ? <ShoppingBag size={20} color="#FF9800" /> : <Ticket size={20} color="#9C27B0" />}
        </View>
        <View style={styles.info}>
          <Text style={styles.voucherTitle}>{item.name}</Text>
          <Text style={styles.voucherCode}>{item.code}</Text>
          <View style={styles.detailsRow}>
            <Text style={styles.discountText}>{getDiscountDisplay()}</Text>
            <Text style={[styles.status, { color: getStatusColor() }]}>{item.status.toUpperCase()}</Text>
          </View>
          <Text style={styles.dateText}>Valid until {formatDate(item.end_date)}</Text>
          <Text style={styles.usageText}>Used: {item.current_usage} / {item.maximum_usage > 0 ? item.maximum_usage : '∞'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function SellerVouchersPage() {
  const router = useRouter();
  const { userId, shopId } = useAuth();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'shop' | 'product'>('shop');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchVouchers = useCallback(async (tab: string, search: string, isRefresh = false) => {
    if (!shopId) { setLoading(false); return; }
    if (!isRefresh) setLoading(true);
    try {
      const params: any = { shop_id: shopId, page: 1, page_size: 100 };
      if (search) params.search = search;
      if (tab === 'shop') params.voucher_type = 'shop';
      if (tab === 'product') params.voucher_type = 'product';
      const response = await AxiosInstance.get('/seller-vouchers/list_vouchers/', { params, headers: { 'X-User-Id': userId || '' } });
      if (response.data.success) { setVouchers(response.data.vouchers); } else { setVouchers([]); }
    } catch (err) { console.error('Error fetching vouchers:', err); setVouchers([]); } 
    finally { setLoading(false); setRefreshing(false); }
  }, [shopId, userId]);

  useEffect(() => { fetchVouchers(activeTab, searchQuery); }, [activeTab, searchQuery]);

  const handleRefresh = () => { setRefreshing(true); fetchVouchers(activeTab, searchQuery, true); };
  const handleCreatePress = () => { router.push(`/seller/components/create-voucher?type=${activeTab}` as any); };
const handleVoucherPress = (voucher: Voucher) => { router.push(`/seller/components/create-voucher?id=${voucher.id}&type=${voucher.voucher_type}` as any); };
  if (!shopId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}><Text style={styles.headerTitle}>Voucher Manager</Text></View>
        <View style={styles.emptyContainer}><Ticket size={64} color="#CCC" /><Text style={styles.emptyTitle}>No Shop Selected</Text><Text style={styles.emptyText}>Please select a shop first to manage vouchers.</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}><Text style={styles.headerTitle}>Voucher Manager</Text><TouchableOpacity style={styles.addButton} onPress={handleCreatePress}><Plus size={20} color="#FFF" /><Text style={styles.addButtonText}>Create</Text></TouchableOpacity></View>
      
      <View style={styles.searchContainer}><Search size={20} color="#999" /><TextInput style={styles.searchInput} placeholder="Search vouchers..." placeholderTextColor="#999" value={searchQuery} onChangeText={setSearchQuery} /></View>
      
      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === 'shop' && styles.activeTab]} onPress={() => setActiveTab('shop')}><Text style={[styles.tabText, activeTab === 'shop' && styles.activeTabText]}>Shop Vouchers</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'product' && styles.activeTab]} onPress={() => setActiveTab('product')}><Text style={[styles.tabText, activeTab === 'product' && styles.activeTabText]}>Product Vouchers</Text></TouchableOpacity>
      </View>
      
      <FlatList data={vouchers} renderItem={({ item }) => <VoucherCard item={item} onPress={() => handleVoucherPress(item)} />} keyExtractor={item => item.id} contentContainerStyle={styles.listContent} refreshing={refreshing} onRefresh={handleRefresh} ListEmptyComponent={!loading ? <View style={styles.emptyContainer}><Ticket size={64} color="#CCC" /><Text style={styles.emptyTitle}>No vouchers found</Text><Text style={styles.emptyText}>{activeTab === 'shop' ? 'Create your first shop voucher' : 'Create your first product voucher'}</Text></View> : <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#FF9800" /></View>} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#FFF' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#1A1A1A' },
  addButton: { flexDirection: 'row', backgroundColor: '#FF9800', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, alignItems: 'center' },
  addButtonText: { color: '#FFF', fontWeight: '600', marginLeft: 4 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', marginHorizontal: 15, marginBottom: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#EEE', gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#333', padding: 0 },
  tabContainer: { flexDirection: 'row', padding: 15, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#FF9800' },
  tabText: { color: '#666', fontWeight: '500' },
  activeTabText: { color: '#FF9800', fontWeight: 'bold' },
  listContent: { padding: 15 },
  voucherCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
  leftSection: { flexDirection: 'row' },
  iconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  info: { marginLeft: 12, flex: 1 },
  voucherTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 4 },
  voucherCode: { fontSize: 12, color: '#888', marginBottom: 6, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  detailsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  discountText: { fontSize: 15, fontWeight: 'bold', color: '#FF9800' },
  status: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  dateText: { fontSize: 11, color: '#999', marginBottom: 2 },
  usageText: { fontSize: 11, color: '#999' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#666', marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#999', textAlign: 'center' },
  loadingContainer: { paddingTop: 60, alignItems: 'center' },
});