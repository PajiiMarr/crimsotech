import React, { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AxiosInstance from '../../contexts/axios';
import { useAuth } from '../../contexts/AuthContext';

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
  source_type?: string;
  status?: string;
  created_at?: string;
}

interface PaymentMethod {
  payment_id: string;
  payment_method: 'bank' | 'gcash' | 'paypal' | 'card';
  bank_name?: string;
  account_name: string;
  account_number: string;
  is_default: boolean;
}

interface WithdrawModalProps {
  visible: boolean;
  onClose: () => void;
  availableBalance: number;
  paymentMethods: PaymentMethod[];
  userId?: string;
  onSuccess: () => void;
}

function WithdrawModal({ visible, onClose, availableBalance, paymentMethods, userId, onSuccess }: WithdrawModalProps) {
  const [amount, setAmount] = useState('');
  const [selectedPaymentId, setSelectedPaymentId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      const defaultMethod = paymentMethods.find((m) => m.is_default);
      setSelectedPaymentId(defaultMethod?.payment_id || paymentMethods[0]?.payment_id || '');
      setAmount('');
    }
  }, [visible, paymentMethods]);

  const quickAmounts = [500, 1000, 2000, 5000];

  const submitWithdraw = async () => {
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid withdrawal amount.');
      return;
    }
    if (parsedAmount > availableBalance) {
      Alert.alert('Insufficient Balance', 'Your available balance is not enough.');
      return;
    }
    if (!selectedPaymentId) {
      Alert.alert('Payment Method Required', 'Please select a payment method.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await AxiosInstance.post(
        '/withdrawal-requests/',
        {
          amount: parsedAmount,
          payment_method_id: selectedPaymentId,
          notes: 'Requested from rider mobile app',
        },
        { headers: { 'X-User-Id': userId } },
      );

      if (res.data?.success) {
        Alert.alert('Success', 'Withdrawal request submitted successfully.');
        onClose();
        onSuccess();
      } else {
        Alert.alert('Request Failed', res.data?.message || 'Could not submit withdrawal request.');
      }
    } catch (error: any) {
      Alert.alert('Request Failed', error?.response?.data?.message || 'Could not submit withdrawal request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: '85%' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: '#111827' }}>Withdraw Funds</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>
            Available Balance: PHP {availableBalance.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>

          <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Amount</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="Enter amount"
            style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 }}
          />

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 14 }}>
            {quickAmounts.map((value) => (
              <TouchableOpacity
                key={value}
                onPress={() => setAmount(String(value))}
                style={{ backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, marginRight: 8, marginBottom: 8 }}
              >
                <Text style={{ color: '#374151', fontWeight: '600', fontSize: 12 }}>PHP {value}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Payment Method</Text>
          <ScrollView style={{ maxHeight: 180 }}>
            {paymentMethods.length === 0 ? (
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  router.push('/rider/payment-methods');
                }}
                style={{ borderWidth: 1, borderColor: '#D1D5DB', borderStyle: 'dashed', borderRadius: 10, padding: 12 }}
              >
                <Text style={{ fontSize: 13, color: '#374151', textAlign: 'center' }}>No payment methods yet. Tap to add one.</Text>
              </TouchableOpacity>
            ) : (
              paymentMethods.map((m) => (
                <TouchableOpacity
                  key={m.payment_id}
                  onPress={() => setSelectedPaymentId(m.payment_id)}
                  style={{
                    borderWidth: 1,
                    borderColor: selectedPaymentId === m.payment_id ? '#1F2937' : '#E5E7EB',
                    borderRadius: 10,
                    padding: 12,
                    marginBottom: 8,
                    backgroundColor: selectedPaymentId === m.payment_id ? '#F9FAFB' : 'white',
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>{m.account_name}</Text>
                  <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                    {(m.bank_name || m.payment_method).toUpperCase()} | {m.account_number}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>

          <TouchableOpacity
            onPress={submitWithdraw}
            disabled={submitting}
            style={{ backgroundColor: '#1F2937', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 14 }}
          >
            {submitting ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: '700' }}>Submit Withdrawal</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function WalletWithdraw() {
  const { user } = useAuth();
  const userId = user?.user_id || user?.id;

  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const [filter, setFilter] = useState<'all' | 'credit' | 'debit'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'delivery_fee' | 'withdrawal'>('all');

  const fetchData = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      params.append('limit', '30');
      params.append('offset', '0');
      if (filter !== 'all') params.append('type', filter);
      if (sourceFilter !== 'all') params.append('source', sourceFilter);

      const [walletRes, profileRes] = await Promise.all([
        AxiosInstance.get(`/rider-wallet/?${params.toString()}`, {
          headers: { 'X-User-Id': userId },
        }),
        AxiosInstance.get('/profile/', {
          headers: { 'X-User-Id': userId },
        }),
      ]);

      if (walletRes.data?.success) {
        setWallet(walletRes.data.wallet || null);
        setTransactions(walletRes.data.transactions || []);
      } else {
        setWallet(null);
        setTransactions([]);
      }

      if (profileRes.data?.success && profileRes.data.profile?.payment_methods) {
        setPaymentMethods(profileRes.data.profile.payment_methods);
      } else {
        setPaymentMethods([]);
      }
    } catch (error) {
      console.error('Failed to fetch wallet data:', error);
      setWallet(null);
      setTransactions([]);
      setPaymentMethods([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filter, sourceFilter]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const filteredTransactions = useMemo(() => transactions, [transactions]);

  const formatAmount = (amount: number) =>
    `PHP ${Number(amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <View style={{ backgroundColor: '#1F2937', paddingHorizontal: 16, paddingVertical: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ color: 'white', fontSize: 20, fontWeight: '700' }}>Wallet</Text>
            <Text style={{ color: '#D1D5DB', fontSize: 12, marginTop: 2 }}>Manage balance, withdrawals, and remittance</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/rider/payment-methods')} style={{ marginLeft: 10 }}>
            <Ionicons name="settings-outline" size={22} color="white" />
          </TouchableOpacity>
        </View>

        <View style={{ backgroundColor: 'white', borderRadius: 14, padding: 16, marginTop: 12, borderWidth: 1, borderColor: '#E5E7EB' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 13, color: '#6B7280' }}>Available Balance</Text>
            <TouchableOpacity onPress={() => setShowBalance((prev) => !prev)}>
              <Ionicons name={showBalance ? 'eye-off-outline' : 'eye-outline'} size={18} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize: 30, fontWeight: '800', color: '#111827', marginTop: 4 }}>
            {showBalance ? formatAmount(wallet?.available_balance || 0) : '******'}
          </Text>
          <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
            Pending: {formatAmount(wallet?.pending_balance || 0)}
          </Text>

          <View style={{ flexDirection: 'row', marginTop: 14 }}>
            <TouchableOpacity
              onPress={() => setShowWithdrawModal(true)}
              style={{ flex: 1, backgroundColor: '#1F2937', paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginRight: 6 }}
            >
              <Text style={{ color: 'white', fontWeight: '700' }}>Withdraw</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/rider/remit-amount')}
              style={{ flex: 1, backgroundColor: '#EA580C', paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginLeft: 6 }}
            >
              <Text style={{ color: 'white', fontWeight: '700' }}>Remit Amount</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={{ flexDirection: 'row', marginBottom: 12 }}>
          {(['all', 'credit', 'debit'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setFilter(tab)}
              style={{
                marginRight: 8,
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 16,
                backgroundColor: filter === tab ? '#111827' : '#F3F4F6',
              }}
            >
              <Text style={{ color: filter === tab ? 'white' : '#4B5563', fontSize: 12, fontWeight: '600' }}>
                {tab === 'all' ? 'All' : tab === 'credit' ? 'Credits' : 'Debits'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ flexDirection: 'row', marginBottom: 12 }}>
          {([
            { id: 'all', label: 'All Sources' },
            { id: 'delivery_fee', label: 'Delivery' },
            { id: 'withdrawal', label: 'Withdrawal' },
          ] as const).map((tab) => (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setSourceFilter(tab.id)}
              style={{
                marginRight: 8,
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 16,
                backgroundColor: sourceFilter === tab.id ? '#111827' : '#F3F4F6',
              }}
            >
              <Text style={{ color: sourceFilter === tab.id ? 'white' : '#4B5563', fontSize: 12, fontWeight: '600' }}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 10 }}>Transactions</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#111827" style={{ marginTop: 30 }} />
        ) : filteredTransactions.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 30 }}>
            <Ionicons name="receipt-outline" size={38} color="#D1D5DB" />
            <Text style={{ color: '#9CA3AF', marginTop: 8 }}>No transactions yet</Text>
          </View>
        ) : (
          filteredTransactions.map((txn) => (
            <View
              key={txn.transaction_id}
              style={{ backgroundColor: 'white', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB' }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#111827' }}>
                    {(txn.source_type || 'Wallet transaction').replace('_', ' ')}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>
                    {txn.created_at ? new Date(txn.created_at).toLocaleString() : 'Unknown time'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '700',
                      color: txn.transaction_type === 'credit' ? '#059669' : '#DC2626',
                    }}
                  >
                    {txn.transaction_type === 'credit' ? '+' : '-'}{formatAmount(txn.amount)}
                  </Text>
                  <Text style={{ fontSize: 10, color: '#6B7280', marginTop: 3 }}>{txn.status || 'pending'}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <WithdrawModal
        visible={showWithdrawModal}
        onClose={() => setShowWithdrawModal(false)}
        availableBalance={wallet?.available_balance || 0}
        paymentMethods={paymentMethods}
        userId={userId}
        onSuccess={fetchData}
      />
    </SafeAreaView>
  );
}
