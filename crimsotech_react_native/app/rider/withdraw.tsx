import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import AxiosInstance from '../../contexts/axios';

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface WalletData {
  wallet_id: string;
  available_balance: number;
  pending_balance: number;
  total_balance: number;
}

interface WalletTransaction {
  transaction_id: string;
  amount: number;
  transaction_type: 'credit' | 'debit';
  source_type: string;
  status: string;
  created_at: string;
  formatted_created_at: string;
  order_number: string | null;
}

interface PaymentMethod {
  payment_id: string;
  payment_method: 'bank' | 'gcash' | 'paypal' | 'card';
  bank_name?: string;
  account_name: string;
  account_number: string;
  is_default: boolean;
}

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const formatCurrency = (amount: number) =>
  `â‚±${(amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (dateString: string) => {
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
};

const getPaymentIcon = (method: string) => {
  switch (method?.toLowerCase()) {
    case 'gcash': return 'cellphone';
    case 'paypal': return 'paypal';
    case 'bank': return 'bank';
    default: return 'credit-card';
  }
};

const getPaymentLabel = (pm: PaymentMethod) => {
  const base = pm.payment_method === 'bank' && pm.bank_name ? pm.bank_name : pm.payment_method.toUpperCase();
  return `${base} â€¢ ${pm.account_name}`;
};

// â”€â”€â”€ Withdrawal Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const WithdrawModal = ({
  visible, onClose, availableBalance, paymentMethods, userId, onSuccess,
}: {
  visible: boolean;
  onClose: () => void;
  availableBalance: number;
  paymentMethods: PaymentMethod[];
  userId: string;
  onSuccess: () => void;
}) => {
  const [amount, setAmount] = useState('');
  const [selectedMethodId, setSelectedMethodId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setSelectedMethodId(paymentMethods.find((m) => m.is_default)?.payment_id || '');
    } else {
      setAmount('');
      setSelectedMethodId('');
    }
  }, [visible, paymentMethods]);

  const parsedAmount = parseFloat(amount) || 0;
  const isValid = parsedAmount > 0 && parsedAmount <= availableBalance && selectedMethodId.length > 0 && !submitting;
  const selectedMethod = paymentMethods.find((m) => m.payment_id === selectedMethodId);

  const handleSubmit = async () => {
    if (!isValid) return;
    try {
      setSubmitting(true);
      const response = await AxiosInstance.post(
        '/withdrawal-requests/',
        { amount: parsedAmount, payment_method_id: selectedMethodId },
        { headers: { 'X-User-Id': userId } }
      );
      if (response.data?.success) {
        onClose();
        Alert.alert('Success', 'Withdrawal request submitted successfully!');
        onSuccess();
      } else {
        Alert.alert('Error', response.data?.error || 'Failed to submit withdrawal request');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to submit withdrawal request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>Request Withdrawal</Text>
            <TouchableOpacity onPress={onClose} disabled={submitting}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={{ backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14, marginBottom: 16 }}>
            <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 2 }}>Available Balance</Text>
            <Text style={{ fontSize: 22, fontWeight: '700', color: '#111827' }}>{formatCurrency(availableBalance)}</Text>
          </View>

          <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Amount</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: parsedAmount > availableBalance ? '#EF4444' : '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, marginBottom: 4 }}>
            <Text style={{ fontSize: 16, color: '#6B7280', marginRight: 4 }}>â‚±</Text>
            <TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#9CA3AF" style={{ flex: 1, paddingVertical: 12, fontSize: 16, color: '#111827' }} />
          </View>
          {parsedAmount > availableBalance && parsedAmount > 0 && (
            <Text style={{ fontSize: 11, color: '#EF4444', marginBottom: 8 }}>Amount exceeds available balance</Text>
          )}

          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16, marginTop: 8 }}>
            {[500, 1000, 2000, 5000].map((val) => (
              <TouchableOpacity key={val} onPress={() => setAmount(val.toString())} style={{ flex: 1, borderWidth: 1, borderColor: parsedAmount === val ? '#1F2937' : '#E5E7EB', backgroundColor: parsedAmount === val ? '#F3F4F6' : 'white', borderRadius: 8, paddingVertical: 7, alignItems: 'center' }}>
                <Text style={{ fontSize: 12, fontWeight: '500', color: parsedAmount === val ? '#111827' : '#6B7280' }}>â‚±{val}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Payment Method</Text>
          {paymentMethods.length === 0 ? (
            <View style={{ backgroundColor: '#FEF3C7', borderRadius: 10, padding: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="warning-outline" size={16} color="#D97706" />
              <Text style={{ fontSize: 13, color: '#92400E', marginLeft: 8, flex: 1 }}>No payment methods. Add one in Settings â†’ Payment Methods.</Text>
            </View>
          ) : (
            <View style={{ marginBottom: 16 }}>
              {paymentMethods.map((pm) => (
                <TouchableOpacity key={pm.payment_id} onPress={() => setSelectedMethodId(pm.payment_id)} style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: selectedMethodId === pm.payment_id ? '#1F2937' : '#E5E7EB', backgroundColor: selectedMethodId === pm.payment_id ? '#F9FAFB' : 'white', borderRadius: 10, padding: 12, marginBottom: 8 }}>
                  <View style={{ width: 36, height: 36, backgroundColor: '#F3F4F6', borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                    <MaterialCommunityIcons name={getPaymentIcon(pm.payment_method) as any} size={18} color="#374151" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: '#111827' }}>{getPaymentLabel(pm)}</Text>
                    <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 1 }}>â€¢â€¢â€¢â€¢{pm.account_number.slice(-4)}</Text>
                  </View>
                  {pm.is_default && (
                    <View style={{ backgroundColor: '#ECFDF5', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginRight: 6 }}>
                      <Text style={{ fontSize: 10, color: '#059669', fontWeight: '600' }}>Default</Text>
                    </View>
                  )}
                  {selectedMethodId === pm.payment_id && <Ionicons name="checkmark-circle" size={20} color="#111827" />}
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity onPress={handleSubmit} disabled={!isValid} style={{ backgroundColor: isValid ? '#1F2937' : '#D1D5DB', borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' }}>
            {submitting ? <ActivityIndicator size="small" color="white" /> : <Text style={{ fontSize: 15, fontWeight: '600', color: 'white' }}>Submit Request</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// â”€â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function WalletWithdraw() {
  const { user } = useAuth();
  const userId = user?.user_id || user?.id || '';

  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'credit' | 'debit'>('all');
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [walletRes, profileRes] = await Promise.all([
        AxiosInstance.get('/rider-wallet/?limit=30&offset=0', { headers: { 'X-User-Id': userId } }),
        AxiosInstance.get('/profile/', { headers: { 'X-User-Id': userId } }),
      ]);
      if (walletRes.data?.success) {
        setWallet(walletRes.data.wallet);
        setTransactions(walletRes.data.transactions || []);
      }
      if (profileRes.data?.success && profileRes.data.profile?.payment_methods) {
        setPaymentMethods(profileRes.data.profile.payment_methods);
      }
    } catch (error) {
      console.error('Error fetching wallet data:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const filteredTransactions = transactions.filter((t) =>
    filterType === 'all' ? true : t.transaction_type === filterType
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      {/* Header */}
      <View style={{ backgroundColor: '#1F2937', paddingBottom: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, marginBottom: 16 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 4, marginRight: 12 }}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: '600', color: 'white', flex: 1 }}>Wallet & Withdrawal</Text>
          <TouchableOpacity onPress={() => router.push('/rider/payment-methods' as any)} style={{ padding: 4 }}>
            <Ionicons name="settings-outline" size={22} color="white" />
          </TouchableOpacity>
        </View>

        {/* Balance Card */}
        <View style={{ paddingHorizontal: 16 }}>
          {isLoading ? (
            <View style={{ height: 100, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16 }} />
          ) : (
            <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View>
                  <Text style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>Available Balance</Text>
                  <Text style={{ fontSize: 30, fontWeight: '700', color: 'white' }}>
                    {showBalance ? formatCurrency(wallet?.available_balance || 0) : 'â‚± â€¢â€¢â€¢â€¢â€¢â€¢'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setShowBalance((v) => !v)} style={{ padding: 6 }}>
                  <Ionicons name={showBalance ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: 'row', marginTop: 12, gap: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: '#9CA3AF' }}>Pending</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: 'white', marginTop: 2 }}>
                    {showBalance ? formatCurrency(wallet?.pending_balance || 0) : 'â‚± â€¢â€¢â€¢'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: '#9CA3AF' }}>Total Earned</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: 'white', marginTop: 2 }}>
                    {showBalance ? formatCurrency(wallet?.total_balance || 0) : 'â‚± â€¢â€¢â€¢'}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* Actions */}
        <View style={{ flexDirection: 'row', padding: 16, gap: 12 }}>
          <TouchableOpacity onPress={() => setShowWithdrawModal(true)} style={{ flex: 1, backgroundColor: '#1F2937', borderRadius: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Ionicons name="arrow-up-circle-outline" size={18} color="white" />
            <Text style={{ fontSize: 14, fontWeight: '600', color: 'white' }}>Withdraw</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/rider/remit-amount' as any)} style={{ flex: 1, backgroundColor: '#EA580C', borderRadius: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Ionicons name="send-outline" size={18} color="white" />
            <Text style={{ fontSize: 14, fontWeight: '600', color: 'white' }}>Remit</Text>
          </TouchableOpacity>
        </View>

        {/* Transactions */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 32 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>Transactions</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {(['all', 'credit', 'debit'] as const).map((opt) => (
                <TouchableOpacity key={opt} onPress={() => setFilterType(opt)} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: filterType === opt ? '#1F2937' : '#F3F4F6' }}>
                  <Text style={{ fontSize: 11, fontWeight: '500', color: filterType === opt ? 'white' : '#6B7280' }}>
                    {opt === 'all' ? 'All' : opt === 'credit' ? 'Credits' : 'Debits'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {isLoading ? (
            [1, 2, 3].map((i) => <View key={i} style={{ height: 72, backgroundColor: 'white', borderRadius: 12, marginBottom: 8 }} />)
          ) : filteredTransactions.length === 0 ? (
            <View style={{ backgroundColor: 'white', borderRadius: 12, padding: 32, alignItems: 'center' }}>
              <Ionicons name="swap-horizontal-outline" size={32} color="#D1D5DB" />
              <Text style={{ fontSize: 14, color: '#9CA3AF', marginTop: 8 }}>No transactions found</Text>
            </View>
          ) : (
            filteredTransactions.map((txn) => (
              <View key={txn.transaction_id} style={{ backgroundColor: 'white', borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: txn.transaction_type === 'credit' ? '#D1FAE5' : '#FEE2E2', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Ionicons name={txn.transaction_type === 'credit' ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'} size={20} color={txn.transaction_type === 'credit' ? '#059669' : '#DC2626'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: '#111827' }}>
                    {txn.source_type ? txn.source_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : txn.transaction_type === 'credit' ? 'Earning' : 'Withdrawal'}
                  </Text>
                  {txn.order_number && <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 1 }}>Order #{txn.order_number}</Text>}
                  <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>{txn.formatted_created_at || formatDate(txn.created_at)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: txn.transaction_type === 'credit' ? '#059669' : '#DC2626' }}>
                    {txn.transaction_type === 'credit' ? '+' : '-'}{formatCurrency(txn.amount)}
                  </Text>
                  <View style={{ marginTop: 3, backgroundColor: txn.status === 'completed' ? '#ECFDF5' : '#FEF3C7', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 }}>
                    <Text style={{ fontSize: 10, color: txn.status === 'completed' ? '#059669' : '#D97706', fontWeight: '500' }}>{txn.status || 'pending'}</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <WithdrawModal visible={showWithdrawModal} onClose={() => setShowWithdrawModal(false)} availableBalance={wallet?.available_balance || 0} paymentMethods={paymentMethods} userId={userId} onSuccess={fetchData} />
    </SafeAreaView>
  );
}
