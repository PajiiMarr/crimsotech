import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { router } from 'expo-router';
import AxiosInstance from '../../contexts/axios';

interface PaymentMethod {
  payment_id: string;
  payment_method: string;
  account_name: string;
  account_number: string;        // masked version (****...1234)
  display_number?: string;       // formatted with flag (full number)
  full_account_number?: string;  // full 639... number
  is_default: boolean;
  bank_name?: string | null;
}

export default function WalletScreen() {
  const { userId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  // Track which payment methods have the number visible
  const [visibleNumbers, setVisibleNumbers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (userId) fetchPaymentMethods();
  }, [userId]);

  const fetchPaymentMethods = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = await AxiosInstance.get('/user-payment-details/get_my_payment_methods/', {
        headers: { 'X-User-Id': userId }
      });
      setPaymentMethods(response.data || []);
    } catch (error: any) {
      console.error('Error fetching payment methods:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to load payment methods');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPaymentMethods();
  };

  const handleSetDefault = async (paymentId: string) => {
    try {
      const response = await AxiosInstance.post(
        `/user-payment-details/${paymentId}/set_default/`,
        {},
        { headers: { 'X-User-Id': userId } }
      );
      if (response.data.message) {
        Alert.alert('Success', 'Default payment method updated');
        fetchPaymentMethods();
      }
    } catch (error: any) {
      console.error('Set default error:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to set as default');
    }
  };

  const handleDelete = async (paymentId: string, accountName: string) => {
    Alert.alert(
      'Delete Payment Method',
      `Are you sure you want to delete "${accountName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await AxiosInstance.delete(
                `/user-payment-details/${paymentId}/delete_payment_method/`,
                { headers: { 'X-User-Id': userId } }
              );
              if (response.data.message) {
                Alert.alert('Success', 'Payment method deleted');
                fetchPaymentMethods();
              }
            } catch (error: any) {
              console.error('Delete error:', error);
              Alert.alert('Error', error.response?.data?.error || 'Failed to delete');
            }
          }
        }
      ]
    );
  };

  const handleEdit = (method: PaymentMethod) => {
    router.push({
      pathname: '/customer/create/add-payment-method',
      params: { mode: 'edit', payment: JSON.stringify(method) }
    });
  };

  const handleAdd = () => {
    router.push('/customer/create/add-payment-method');
  };

  const toggleNumberVisibility = (paymentId: string) => {
    setVisibleNumbers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(paymentId)) newSet.delete(paymentId);
      else newSet.add(paymentId);
      return newSet;
    });
  };

  const getDisplayNumber = (method: PaymentMethod, isVisible: boolean) => {
    if (method.payment_method === 'bank') {
      // For bank accounts, just show masked or full
      return isVisible ? method.full_account_number || method.account_number : method.account_number;
    }
    // For e-wallets: show formatted number when visible, otherwise masked
    if (isVisible && method.full_account_number) {
      // Use the already formatted display_number, or rebuild if needed
      return method.display_number || `🇵🇭 +63 ${method.full_account_number.slice(3, 6)} ${method.full_account_number.slice(6)}`;
    } else {
      return method.account_number; // already masked (****1234)
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'gcash':
        return <MaterialIcons name="account-balance-wallet" size={20} color="#00D4AA" />;
      case 'paymaya':
        return <MaterialIcons name="credit-card" size={20} color="#FF9900" />;
      case 'bank':
        return <MaterialIcons name="account-balance" size={20} color="#0066CC" />;
      default:
        return <MaterialIcons name="payment" size={20} color="#666" />;
    }
  };

  const getMethodDisplayName = (method: string) => {
    const map: Record<string, string> = {
      gcash: 'GCash',
      paymaya: 'PayMaya',
      bank: 'Bank Account',
    };
    return map[method] || method.charAt(0).toUpperCase() + method.slice(1);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F97316" />
          <Text style={styles.loadingText}>Loading payment methods...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <SafeAreaView style={styles.headerSafeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Wallet</Text>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#F97316']}
            tintColor="#F97316"
          />
        }
      >
        <TouchableOpacity style={[styles.addButton, { marginTop: 10 }]} onPress={handleAdd}>
          <Ionicons name="add-circle-outline" size={24} color="#F97316" />
          <Text style={styles.addButtonText}>Add New Payment Method</Text>
        </TouchableOpacity>

        {paymentMethods.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="wallet-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>No payment methods found</Text>
            <Text style={styles.emptySubtext}>Add your first payment method to get started</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={handleAdd}>
              <Text style={styles.emptyButtonText}>Add Payment Method</Text>
            </TouchableOpacity>
          </View>
        ) : (
          paymentMethods.map((method) => {
            const isVisible = visibleNumbers.has(method.payment_id);
            return (
              <TouchableOpacity
                key={method.payment_id}
                style={styles.card}
                onPress={() => handleEdit(method)}
                activeOpacity={0.85}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.methodTypeBadge}>
                    {getMethodIcon(method.payment_method)}
                    <Text style={styles.methodTypeText}>
                      {getMethodDisplayName(method.payment_method)}
                    </Text>
                  </View>
                  {method.is_default && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>Default</Text>
                    </View>
                  )}
                </View>

                <View style={styles.cardInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.accountName}>{method.account_name}</Text>
                  </View>
                  <View style={styles.numberRow}>
                    <Text style={styles.accountNumber}>
                      {getDisplayNumber(method, isVisible)}
                    </Text>
                    {method.payment_method !== 'bank' && ( // show eye for e-wallets only
                      <TouchableOpacity onPress={() => toggleNumberVisibility(method.payment_id)} style={styles.eyeIcon}>
                        <Ionicons
                          name={isVisible ? 'eye-off-outline' : 'eye-outline'}
                          size={20}
                          color="#666"
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                  {method.payment_method === 'bank' && method.bank_name && (
                    <Text style={styles.bankName}>{method.bank_name}</Text>
                  )}
                </View>

                <View style={styles.actionRow}>
                  {!method.is_default && (
                    <TouchableOpacity
                      style={styles.defaultToggle}
                      onPress={() => handleSetDefault(method.payment_id)}
                    >
                      <MaterialCommunityIcons
                        name="checkbox-blank-circle-outline"
                        size={22}
                        color="#CCC"
                      />
                      <Text style={styles.defaultText}>Set As Default</Text>
                    </TouchableOpacity>
                  )}
                  {method.is_default && <View style={{ flex: 1 }} />}

                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDelete(method.payment_id, method.account_name)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {paymentMethods.length > 0 && (
          <View style={styles.infoContainer}>
            <Ionicons name="information-circle-outline" size={16} color="#6B7280" />
            <Text style={styles.infoText}>Tap on a card to edit it</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  content: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  headerSafeArea: { backgroundColor: '#FFF', paddingTop: Platform.OS === 'android' ? 40 : 0 },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  backButton: { marginRight: 20 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'black', flex: 1 },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginTop: 10,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  addButtonText: {
    fontSize: 16,
    color: '#F97316',
    fontWeight: '600',
    marginLeft: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#F97316',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginTop: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  methodTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  methodTypeText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  defaultBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  defaultBadgeText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
  },
  cardInfo: {
    paddingBottom: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    justifyContent: 'space-between',
  },
  accountName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'black',
    flex: 1,
  },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accountNumber: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  eyeIcon: {
    padding: 4,
    marginLeft: 8,
  },
  bankName: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 50,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  defaultToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  defaultText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
    padding: 8,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    marginTop: 20,
  },
  infoText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8,
    flex: 1,
  },
});