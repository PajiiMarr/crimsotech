import { useAuth } from '@/contexts/AuthContext';
import { API_CONFIG } from '@/utils/config';
import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface Voucher {
  id: string;
  voucher_id: string;
  customer_id: string;
  claimed_at: string;
  voucher: {
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
  };
}

interface VoucherSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectVoucher: (voucher: any) => void;
}

export default function VoucherSelectionModal({
  visible,
  onClose,
  onSelectVoucher,
}: VoucherSelectionModalProps) {
  const { user } = useAuth();
  const [claimedVouchers, setClaimedVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchCode, setSearchCode] = useState('');

  useEffect(() => {
    if (visible) {
      loadClaimedVouchers();
    }
  }, [visible]);

  const loadClaimedVouchers = async () => {
    try {
      setLoading(true);
      const customerId = (user as any)?.user_id || (user as any)?.id;

      if (!customerId) {
        Alert.alert('Error', 'Please log in');
        return;
      }

      const response = await fetch(
        `${API_CONFIG.BASE_URL}/api/customer-vouchers/list_claimed_vouchers/?customer_id=${customerId}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setClaimedVouchers(data.vouchers || []);
      }
    } catch (error: any) {
      console.error('Error loading vouchers:', error);
      Alert.alert('Error', 'Failed to load vouchers');
    } finally {
      setLoading(false);
    }
  };

  const isVoucherExpired = (validUntil: string) => {
    return new Date(validUntil) < new Date();
  };

  const filteredVouchers = claimedVouchers.filter((cv) =>
    cv.voucher.code.toLowerCase().includes(searchCode.toLowerCase())
  );

  const renderVoucher = ({ item }: { item: Voucher }) => {
    const expired = isVoucherExpired(item.voucher.valid_until);

    return (
      <TouchableOpacity
        style={[styles.voucherItem, expired && styles.voucherItemDisabled]}
        onPress={() => {
          if (!expired) {
            onSelectVoucher(item.voucher);
            onClose();
          } else {
            Alert.alert('Expired', 'This voucher has expired and cannot be used');
          }
        }}
        disabled={expired}
      >
        <View style={styles.voucherItemContent}>
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
            {item.voucher.minimum_spend > 0 && (
              <Text style={styles.minSpendText}>Min: ₱{item.voucher.minimum_spend}</Text>
            )}
            {expired && <Text style={styles.expiredText}>Expired</Text>}
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
        {!expired && (
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => {
              onSelectVoucher(item.voucher);
              onClose();
            }}
          >
            <Text style={styles.selectButtonText}>Use</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Voucher</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color="#999" />
          <TextInput
            placeholder="Search by code..."
            value={searchCode}
            onChangeText={setSearchCode}
            style={styles.searchInput}
          />
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#ff6d0b" />
            <Text style={styles.loadingText}>Loading vouchers...</Text>
          </View>
        ) : filteredVouchers.length > 0 ? (
          <FlatList
            data={filteredVouchers}
            renderItem={renderVoucher}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="local-offer" size={64} color="#E0E0E0" />
            <Text style={styles.emptyTitle}>No Claimed Vouchers</Text>
            <Text style={styles.emptySubtitle}>
              You haven't claimed any vouchers yet. Go to My Vouchers to claim them.
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={onClose}>
              <Text style={styles.emptyButtonText}>Back to Checkout</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
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
  listContent: {
    padding: 16,
  },
  voucherItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  voucherItemDisabled: {
    opacity: 0.5,
    backgroundColor: '#F5F5F5',
  },
  voucherItemContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
    marginBottom: 4,
  },
  shopNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
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
  minSpendText: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  expiredText: {
    fontSize: 11,
    color: '#E53935',
    fontWeight: '600',
    marginTop: 4,
  },
  voucherDiscount: {
    alignItems: 'center',
    gap: 4,
    marginLeft: 12,
  },
  discountValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ff6d0b',
  },
  selectButton: {
    backgroundColor: '#ff6d0b',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 12,
  },
  selectButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
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
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: '#ff6d0b',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
