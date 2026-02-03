import React, { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  StatusBar,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import AxiosInstance from '../../contexts/axios';

// --- Theme Colors ---
const COLORS = {
  primary: '#F97316', // Your Brand Orange
  secondary: '#2563EB', // Blue for Free Shipping
  dark: '#111827',
  muted: '#6B7280',
  bg: '#F3F4F6',
  white: '#FFFFFF',
  border: '#E5E7EB',
  success: '#10B981',
  discountBg: '#FFF7ED',
};

type VoucherStatus = 'active' | 'expired' | 'scheduled';

type Voucher = {
  id: string;
  name: string;
  code: string;
  shopName?: string;
  discount_type?: string;
  value?: number;
  valid_until?: string;
  status?: VoucherStatus;
};

export default function MyVouchersPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('Available');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [voucherCode, setVoucherCode] = useState('');

  useEffect(() => {
    fetchVouchers();
  }, [activeTab, user?.id]);

  const fetchVouchers = async (searchText?: string) => {
    try {
      setLoading(true);
      const statusParam = activeTab === 'Available' ? 'active' : activeTab === 'Expired' ? 'expired' : '';
      const response = await AxiosInstance.get('/admin-vouchers/vouchers_list/', {
        params: {
          page: 1,
          page_size: 50,
          status: statusParam || undefined,
          search: searchText || undefined,
        },
        headers: {
          'X-User-Id': String(user?.id || ''),
        },
      });

      const list = response.data?.vouchers || [];
      setVouchers(list);
    } catch (error) {
      console.error('Error fetching vouchers:', error);
      setVouchers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onApplyCode = () => {
    fetchVouchers(voucherCode.trim());
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchVouchers(voucherCode.trim());
  };

  const visibleVouchers = useMemo(() => {
    if (activeTab === 'Used') return [];
    if (activeTab === 'Available') return vouchers.filter((v) => v.status === 'active' || v.status === 'scheduled');
    if (activeTab === 'Expired') return vouchers.filter((v) => v.status === 'expired');
    return vouchers;
  }, [activeTab, vouchers]);

  const isUrgent = (validUntil?: string) => {
    if (!validUntil) return false;
    const expiry = new Date(validUntil).getTime();
    return expiry - Date.now() <= 1000 * 60 * 60 * 24;
  };

  const formatExpiry = (validUntil?: string) => {
    if (!validUntil) return 'No expiry date';
    const date = new Date(validUntil).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    return `Valid until ${date}`;
  };

  const renderVoucher = ({ item }: { item: Voucher }) => {
    const voucherType = item.discount_type?.toLowerCase() === 'shipping' ? 'Shipping' : 'Discount';
    const urgent = isUrgent(item.valid_until);
    return (
      <View style={styles.voucherWrapper}>
        <View style={styles.voucherCard}>
          {/* Left Section: Icon/Type */}
          <View style={[
            styles.leftSection, 
            { backgroundColor: voucherType === 'Shipping' ? COLORS.secondary : COLORS.primary }
          ]}>
             <MaterialCommunityIcons 
              name={voucherType === 'Shipping' ? "truck-fast" : "ticket-percent"} 
              size={32} 
              color="#FFF" 
            />
            <Text style={styles.typeLabel}>{voucherType.toUpperCase()}</Text>
            
            {/* Decorative Semi-circles for Ticket effect */}
            <View style={styles.semiCircleTop} />
            <View style={styles.semiCircleBottom} />
          </View>

          {/* Right Section: Info */}
          <View style={styles.rightSection}>
            <View style={styles.mainInfo}>
              <Text style={styles.brandText}>{item.shopName || 'Platform Wide'}</Text>
              <Text style={styles.titleText}>{item.name || 'Voucher'}</Text>
              <Text style={styles.minSpendText}>Code: {item.code}</Text>
            </View>

            <View style={styles.footer}>
              <View style={styles.expiryContainer}>
                <Feather 
                  name="clock" 
                  size={12} 
                  color={urgent ? COLORS.primary : COLORS.muted} 
                />
                <Text style={[styles.expiryText, urgent && styles.urgentText]}>
                  {formatExpiry(item.valid_until)}
                </Text>
              </View>
              
              <TouchableOpacity style={styles.useButton} onPress={() => router.push('/')}>
                <Text style={styles.useButtonText}>USE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Custom Customer Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={COLORS.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Vouchers</Text>
        <TouchableOpacity>
          <Text style={styles.historyText}>History</Text>
        </TouchableOpacity>
      </View>

      {/* Voucher Code Input */}
      <View style={styles.inputCard}>
        <View style={styles.inputWrapper}>
          <TextInput 
            placeholder="Enter voucher code" 
            style={styles.input}
            placeholderTextColor={COLORS.muted}
            value={voucherCode}
            onChangeText={setVoucherCode}
          />
          <TouchableOpacity style={styles.applyBtn} onPress={onApplyCode}>
            <Text style={styles.applyBtnText}>Apply</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {['Available', 'Used', 'Expired'].map((tab) => (
          <TouchableOpacity 
            key={tab} 
            onPress={() => setActiveTab(tab)}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
          >
            <Text style={[styles.tabLabel, activeTab === tab && styles.activeTabLabel]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading vouchers...</Text>
        </View>
      ) : (
        <FlatList
          data={visibleVouchers}
          keyExtractor={(item) => item.id}
          renderItem={renderVoucher}
          contentContainerStyle={styles.listPadding}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListHeaderComponent={
            <View style={styles.suggestedContainer}>
              <Text style={styles.suggestedTitle}>Suggested for you</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                {activeTab === 'Used' ? 'No used vouchers.' : 'No vouchers available.'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.dark },
  historyText: { color: COLORS.muted, fontSize: 14 },

  // Input Section
  inputCard: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  inputWrapper: {
    flexDirection: 'row',
    backgroundColor: COLORS.bg,
    borderRadius: 8,
    paddingLeft: 12,
    alignItems: 'center',
  },
  input: { flex: 1, height: 44, fontSize: 14, color: COLORS.dark },
  applyBtn: {
    backgroundColor: COLORS.primary,
    height: 44,
    paddingHorizontal: 20,
    justifyContent: 'center',
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  applyBtnText: { color: COLORS.white, fontWeight: '700' },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    marginBottom: 8,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: COLORS.primary },
  tabLabel: { fontSize: 14, color: COLORS.muted, fontWeight: '500' },
  activeTabLabel: { color: COLORS.primary, fontWeight: '700' },

  // Voucher List
  listPadding: { paddingBottom: 30 },
  suggestedContainer: { paddingHorizontal: 16, paddingTop: 16, marginBottom: 8 },
  suggestedTitle: { fontSize: 15, fontWeight: '700', color: COLORS.dark },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { marginTop: 10, color: COLORS.muted },
  emptyState: { alignItems: 'center', padding: 24 },
  emptyText: { color: COLORS.muted },

  // Voucher Card UI
  voucherWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  voucherCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    height: 110,
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  leftSection: {
    width: 100,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  typeLabel: { color: '#FFF', fontSize: 10, fontWeight: '800', marginTop: 5 },
  semiCircleTop: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.bg,
    top: -8,
    right: -8,
  },
  semiCircleBottom: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.bg,
    bottom: -8,
    right: -8,
  },

  // Right Side
  rightSection: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  mainInfo: { flex: 1 },
  brandText: { fontSize: 11, color: COLORS.muted, fontWeight: '600', textTransform: 'uppercase' },
  titleText: { fontSize: 15, fontWeight: '700', color: COLORS.dark, marginTop: 2 },
  minSpendText: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  expiryContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  expiryText: { fontSize: 11, color: COLORS.muted },
  urgentText: { color: COLORS.primary, fontWeight: '600' },
  
  useButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 20,
  },
  useButtonText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
});