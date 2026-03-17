import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import AxiosInstance from '../../contexts/axios';

interface PaymentMethod {
  payment_id: string;
  payment_method: 'bank' | 'gcash' | 'paypal' | 'card';
  bank_name?: string;
  account_name: string;
  account_number: string;
  is_default: boolean;
}

const METHOD_LABELS: Record<string, string> = {
  bank: 'Bank Transfer',
  gcash: 'GCash',
  paypal: 'PayPal',
  card: 'Debit/Credit Card',
};

const METHOD_TYPES: PaymentMethod['payment_method'][] = ['bank', 'gcash', 'paypal', 'card'];

export default function PaymentMethods() {
  const { user } = useAuth();
  const userId = user?.user_id || user?.id;

  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    payment_method: 'bank' as PaymentMethod['payment_method'],
    bank_name: '',
    account_name: '',
    account_number: '',
    is_default: false,
  });

  const fetchMethods = useCallback(async () => {
    try {
      const res = await AxiosInstance.get('/profile/', {
        headers: { 'X-User-Id': userId },
      });
      if (res.data?.success && res.data.profile?.payment_methods) {
        setMethods(res.data.profile.payment_methods);
      } else {
        setMethods([]);
      }
    } catch {
      setMethods([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchMethods();
  }, [fetchMethods]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMethods();
  };

  const resetForm = () => {
    setForm({
      payment_method: 'bank',
      bank_name: '',
      account_name: '',
      account_number: '',
      is_default: false,
    });
  };

  const handleAddMethod = async () => {
    if (!form.account_name.trim() || !form.account_number.trim()) {
      Alert.alert('Validation', 'Please fill in all required fields.');
      return;
    }

    try {
      setSaving(true);
      const res = await AxiosInstance.post(
        '/profile/',
        {
          action: 'add_payment_method',
          payment_method: form.payment_method,
          bank_name: form.bank_name,
          account_name: form.account_name,
          account_number: form.account_number,
          is_default: form.is_default,
        },
        { headers: { 'X-User-Id': userId } },
      );

      if (res.data?.success) {
        setShowAddModal(false);
        resetForm();
        fetchMethods();
      } else {
        Alert.alert('Error', res.data?.message || 'Failed to add payment method.');
      }
    } catch {
      Alert.alert('Error', 'Could not add payment method. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (paymentId: string) => {
    try {
      const res = await AxiosInstance.post(
        '/profile/',
        {
          action: 'set_default_payment',
          payment_id: paymentId,
        },
        { headers: { 'X-User-Id': userId } },
      );

      if (res.data?.success) {
        fetchMethods();
      } else {
        Alert.alert('Error', res.data?.message || 'Failed to set default.');
      }
    } catch {
      Alert.alert('Error', 'Could not update default method.');
    }
  };

  const handleDelete = (paymentId: string) => {
    Alert.alert('Remove Payment Method', 'Are you sure you want to remove this payment method?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await AxiosInstance.post(
              '/profile/',
              {
                action: 'delete_payment_method',
                payment_id: paymentId,
              },
              { headers: { 'X-User-Id': userId } },
            );

            if (res.data?.success) {
              fetchMethods();
            } else {
              Alert.alert('Error', res.data?.message || 'Failed to remove.');
            }
          } catch {
            Alert.alert('Error', 'Could not remove payment method.');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <View style={{ backgroundColor: '#1F2937', paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="white" />
        </TouchableOpacity>
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={{ color: 'white', fontSize: 18, fontWeight: '700' }}>Payment Methods</Text>
          <Text style={{ color: '#D1D5DB', fontSize: 12, marginTop: 2 }}>Where your withdrawals will be sent</Text>
        </View>
        <TouchableOpacity onPress={() => setShowAddModal(true)}>
          <Ionicons name="add-circle-outline" size={26} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <ActivityIndicator size="large" color="#1F2937" style={{ marginTop: 80 }} />
        ) : methods.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 80 }}>
            <Ionicons name="card-outline" size={48} color="#9CA3AF" />
            <Text style={{ fontSize: 17, fontWeight: '700', color: '#374151', marginTop: 12 }}>No Payment Methods</Text>
            <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 6, textAlign: 'center' }}>
              Add a bank account or e-wallet to receive your earnings.
            </Text>
            <TouchableOpacity
              onPress={() => setShowAddModal(true)}
              style={{ marginTop: 20, backgroundColor: '#1F2937', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
            >
              <Text style={{ color: 'white', fontWeight: '700' }}>Add Payment Method</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {methods.map((m) => (
              <View
                key={m.payment_id}
                style={{ backgroundColor: 'white', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: m.is_default ? 2 : 1, borderColor: m.is_default ? '#1F2937' : '#E5E7EB' }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>{METHOD_LABELS[m.payment_method] || m.payment_method}</Text>
                    <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{m.account_name}</Text>
                    <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{m.bank_name || m.account_number}</Text>
                  </View>
                  {m.is_default && (
                    <View style={{ backgroundColor: '#1F2937', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ fontSize: 10, color: 'white', fontWeight: '700' }}>DEFAULT</Text>
                    </View>
                  )}
                </View>

                <View style={{ flexDirection: 'row', marginTop: 12 }}>
                  {!m.is_default && (
                    <TouchableOpacity
                      onPress={() => handleSetDefault(m.payment_id)}
                      style={{ flex: 1, backgroundColor: '#F3F4F6', paddingVertical: 10, borderRadius: 10, alignItems: 'center', marginRight: 6 }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151' }}>Set Default</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => handleDelete(m.payment_id)}
                    style={{ flex: m.is_default ? 1 : undefined, backgroundColor: '#FEE2E2', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, alignItems: 'center' }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#DC2626' }}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => { setShowAddModal(false); resetForm(); }}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: '88%' }}>
            <View style={{ alignSelf: 'center', width: 48, height: 5, borderRadius: 3, backgroundColor: '#D1D5DB', marginBottom: 10 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: '#111827' }}>Add Payment Method</Text>
              <TouchableOpacity onPress={() => { setShowAddModal(false); resetForm(); }}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Method Type</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
              {METHOD_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setForm({ ...form, payment_method: type })}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: form.payment_method === type ? '#1F2937' : '#E5E7EB',
                    backgroundColor: form.payment_method === type ? '#1F2937' : 'white',
                    marginRight: 8,
                    marginBottom: 8,
                  }}
                >
                  <Text style={{ fontSize: 12, color: form.payment_method === type ? 'white' : '#6B7280', fontWeight: '600' }}>
                    {METHOD_LABELS[type]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {(form.payment_method === 'bank' || form.payment_method === 'card') && (
              <>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Bank Name</Text>
                <TextInput
                  value={form.bank_name}
                  onChangeText={(v) => setForm({ ...form, bank_name: v })}
                  placeholder="e.g. BDO, BPI"
                  style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 }}
                />
              </>
            )}

            <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Account Name *</Text>
            <TextInput
              value={form.account_name}
              onChangeText={(v) => setForm({ ...form, account_name: v })}
              placeholder="Full name on the account"
              style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 }}
            />

            <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
              {form.payment_method === 'gcash' ? 'Mobile Number' : form.payment_method === 'paypal' ? 'PayPal Email' : 'Account Number'} *
            </Text>
            <TextInput
              value={form.account_number}
              onChangeText={(v) => setForm({ ...form, account_number: v })}
              placeholder={form.payment_method === 'paypal' ? 'email@example.com' : 'Enter account number'}
              keyboardType={form.payment_method === 'paypal' ? 'email-address' : 'numeric'}
              style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 14 }}
            />

            <TouchableOpacity
              onPress={() => setForm({ ...form, is_default: !form.is_default })}
              style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  borderWidth: 1.5,
                  borderColor: form.is_default ? '#1F2937' : '#D1D5DB',
                  backgroundColor: form.is_default ? '#1F2937' : 'white',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 10,
                }}
              >
                {form.is_default && <Ionicons name="checkmark" size={14} color="white" />}
              </View>
              <Text style={{ color: '#374151' }}>Set as default payment method</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleAddMethod}
              disabled={saving}
              style={{ backgroundColor: '#1F2937', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
            >
              {saving ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: '700' }}>Add Payment Method</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
