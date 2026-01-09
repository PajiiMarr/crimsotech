import { useAuth } from '@/contexts/AuthContext';
import { API_CONFIG } from '@/utils/config';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;

interface ShopVoucher {
  id: string;
  shop_id: string;
  shop_name: string;
  name: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  value: number;
  minimum_spend: number;
  valid_until: string;
  is_active: boolean;
  is_admin_voucher?: boolean;
}

interface ClaimedVoucher {
  id: string;
  voucher_id: string;
  customer_id: string;
  claimed_at: string;
  voucher: ShopVoucher;
}

export default function MyVouchersScreen() {
  const { user } = useAuth();
  const [claimedVouchers, setClaimedVouchers] = useState<ClaimedVoucher[]>([]);
  const [availableVouchers, setAvailableVouchers] = useState<ShopVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'claimed' | 'available'>('claimed');
  const [searchCode, setSearchCode] = useState('');
  const [claimingVoucherId, setClaimingVoucherId] = useState<string | null>(null);

  useEffect(() => {
    loadVouchers();
  }, [user]);

  const loadVouchers = async () => {
    try {
      setLoading(true);
      const customerId = (user as any)?.user_id || (user as any)?.id;

      if (!customerId) {
        Alert.alert('Error', 'Please log in');
        return;
      }

      // Load claimed vouchers
      const claimedResp = await fetch(
        `${API_CONFIG.BASE_URL}/api/customer-vouchers/list_claimed_vouchers/?customer_id=${customerId}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (claimedResp.ok) {
        const claimedData = await claimedResp.json();
        setClaimedVouchers(claimedData.vouchers || []);
      }

      // Load available vouchers
      const availResp = await fetch(
        `${API_CONFIG.BASE_URL}/api/customer-vouchers/list_available_vouchers/?customer_id=${customerId}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (availResp.ok) {
        const availData = await availResp.json();
        setAvailableVouchers(availData.vouchers || []);
      }
    } catch (error: any) {
      console.error('Error loading vouchers:', error);
      Alert.alert('Error', 'Failed to load vouchers');
    } finally {
      setLoading(false);
    }
  };

  const handleClaimVoucher = async (voucher: ShopVoucher) => {
    try {
      setClaimingVoucherId(voucher.id);
      const customerId = (user as any)?.user_id || (user as any)?.id;

      const resp = await fetch(`${API_CONFIG.BASE_URL}/api/customer-vouchers/claim_voucher/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customerId,
          voucher_id: voucher.id,
        }),
      });

      const data = await resp.json();

      if (data.success) {
        Alert.alert('Success', `Voucher "${voucher.code}" claimed!`);
        loadVouchers();
      } else {
        Alert.alert('Error', data.error || 'Failed to claim voucher');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to claim voucher');
    } finally {
      setClaimingVoucherId(null);
    }
  };

  const isVoucherExpired = (validUntil: string) => {
    return new Date(validUntil) < new Date();
  };

  const filteredClaimed = claimedVouchers.filter((cv) =>
    cv.voucher.code.toLowerCase().includes(searchCode.toLowerCase())
  );

  const filteredAvailable = availableVouchers.filter((av) =>
    av.code.toLowerCase().includes(searchCode.toLowerCase())
  );

  const renderClaimedVoucher = ({ item }: { item: ClaimedVoucher }) => {
    const expired = isVoucherExpired(item.voucher.valid_until);

    return (
      <View style={[styles.voucherCard, expired && styles.voucherCardExpired]}>
        <View style={styles.voucherHeader}>
          <View style={styles.voucherInfo}>
            <Text style={styles.voucherCode}>{item.voucher.code}</Text>
            <Text style={styles.voucherName}>{item.voucher.name}</Text>
            <View style={styles.shopNameRow}>
              <Text style={styles.shopName}>{item.voucher.shop_name}</Text>
              {item.voucher.is_admin_voucher && (
                <View style={styles.platformBadge}>
                  <Text style={styles.platformBadgeText}>Platform</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.voucherDiscount}>
            <MaterialIcons name="local-offer" size={24} color="#ff6d0b" />
            <Text style={styles.discountValue}>
              {item.voucher.discount_type === 'percentage'
                ? `${item.voucher.value}%`
                : `₱${item.voucher.value}`}
            </Text>
          </View>
        </View>

        <View style={styles.voucherFooter}>
          <Text style={[styles.validUntilText, expired && { color: '#E53935' }]}>
            {expired
              ? 'Expired'
              : `Valid until: ${new Date(item.voucher.valid_until).toLocaleDateString()}`}
          </Text>
          {item.voucher.minimum_spend > 0 && (
            <Text style={styles.minSpendText}>Min: ₱{item.voucher.minimum_spend}</Text>
          )}
        </View>
      </View>
    );
  };

  const renderAvailableVoucher = ({ item }: { item: ShopVoucher }) => {
    const expired = isVoucherExpired(item.valid_until);
    const isClaiming = claimingVoucherId === item.id;

    return (
      <View style={[styles.voucherCard, expired && styles.voucherCardExpired]}>
        <View style={styles.voucherHeader}>
          <View style={styles.voucherInfo}>
            <Text style={styles.voucherCode}>{item.code}</Text>
            <Text style={styles.voucherName}>{item.name}</Text>
            <View style={styles.shopNameRow}>
              <Text style={styles.shopName}>{item.shop_name}</Text>
              {item.is_admin_voucher && (
                <View style={styles.platformBadge}>
                  <Text style={styles.platformBadgeText}>Platform</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.voucherDiscount}>
            <MaterialIcons name="local-offer" size={24} color="#ff6d0b" />
            <Text style={styles.discountValue}>
              {item.discount_type === 'percentage' ? `${item.value}%` : `₱${item.value}`}
            </Text>
          </View>
        </View>

        <View style={styles.voucherFooter}>
          <Text style={[styles.validUntilText, expired && { color: '#E53935' }]}>
            {expired
              ? 'Expired'
              : `Valid until: ${new Date(item.valid_until).toLocaleDateString()}`}
          </Text>
          {item.minimum_spend > 0 && (
            <Text style={styles.minSpendText}>Min: ₱{item.minimum_spend}</Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.claimButton, (expired || isClaiming) && { opacity: 0.6 }]}
          disabled={expired || isClaiming}
          onPress={() => handleClaimVoucher(item)}
        >
          {isClaiming ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <MaterialIcons name="add" size={18} color="#fff" />
              <Text style={styles.claimButtonText}>Claim</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Vouchers</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color="#999" />
        <TextInput
          placeholder="Search voucher code..."
          value={searchCode}
          onChangeText={setSearchCode}
          style={styles.searchInput}
        />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#ff6d0b" />
          <Text style={styles.loadingText}>Loading vouchers...</Text>
        </View>
      ) : (
        <>
          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'claimed' && styles.tabActive]}
              onPress={() => setActiveTab('claimed')}
            >
              <Text style={[styles.tabText, activeTab === 'claimed' && styles.tabTextActive]}>
                Claimed ({claimedVouchers.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'available' && styles.tabActive]}
              onPress={() => setActiveTab('available')}
            >
              <Text style={[styles.tabText, activeTab === 'available' && styles.tabTextActive]}>
                Available ({availableVouchers.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          {activeTab === 'claimed' ? (
            filteredClaimed.length > 0 ? (
              <FlatList
                data={filteredClaimed}
                renderItem={renderClaimedVoucher}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="local-offer" size={64} color="#E0E0E0" />
                <Text style={styles.emptyTitle}>No Claimed Vouchers</Text>
                <Text style={styles.emptySubtitle}>
                  Check the Available tab to claim vouchers from your favorite shops
                </Text>
              </View>
            )
          ) : filteredAvailable.length > 0 ? (
            <FlatList
              data={filteredAvailable}
              renderItem={renderAvailableVoucher}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="card-giftcard" size={64} color="#E0E0E0" />
              <Text style={styles.emptyTitle}>No Available Vouchers</Text>
              <Text style={styles.emptySubtitle}>
                Shop owners haven't released any vouchers yet
              </Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 10,
    fontSize: 14,
    color: '#333',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#ff6d0b',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#999',
  },
  tabTextActive: {
    color: '#ff6d0b',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  voucherCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  voucherCardExpired: {
    opacity: 0.6,
    backgroundColor: '#F5F5F5',
  },
  voucherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  voucherInfo: {
    flex: 1,
  },
  voucherCode: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ff6d0b',
    marginBottom: 4,
  },
  voucherName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  shopNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shopName: {
    fontSize: 12,
    color: '#666',
  },
  platformBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  platformBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1976D2',
  },
  voucherDiscount: {
    alignItems: 'center',
    gap: 4,
  },
  discountValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ff6d0b',
  },
  voucherFooter: {
    gap: 6,
    marginBottom: 12,
  },
  validUntilText: {
    fontSize: 12,
    color: '#666',
  },
  minSpendText: {
    fontSize: 12,
    color: '#999',
  },
  claimButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff6d0b',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  claimButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
