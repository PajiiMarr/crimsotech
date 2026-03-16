import React, { useState, useEffect, useCallback } from 'react';
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
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
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

const METHOD_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  bank: 'business-outline',
  gcash: 'phone-portrait-outline',
  paypal: 'logo-paypal',
  card: 'card-outline',
};

const METHOD_LABELS: Record<string, string> = {
  bank: 'Bank Transfer',
  gcash: 'GCash',
  paypal: 'PayPal',
  card: 'Debit/Credit Card',
};

const METHOD_TYPES: PaymentMethod['payment_method'][] = ['bank', 'gcash', 'paypal', 'card'];

const COLORS = {
  pageBg: '#F3F4F6',
  card: '#FFFFFF',
  text: '#111827',
  subText: '#6B7280',
  primary: '#1F2937',
  border: '#E5E7EB',
  danger: '#DC2626',
  dangerBg: '#FEE2E2',
  soft: '#F9FAFB',
};

export default function PaymentMethods() {
  const { user } = useAuth();
  const userId = user?.user_id || user?.id;

  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<{
    payment_method: PaymentMethod['payment_method'];
    bank_name: string;
    account_name: string;
    account_number: string;
    is_default: boolean;
  }>({
    payment_method: 'bank',
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

  useEffect(() => { fetchMethods(); }, [fetchMethods]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMethods();
  };

  const resetForm = () => {
    setForm({ payment_method: 'bank', bank_name: '', account_name: '', account_number: '', is_default: false });
  };

  const handleAddMethod = async () => {
    if (!form.account_name.trim() || !form.account_number.trim()) {
      Alert.alert('Validation', 'Please fill in all required fields.');
      return;
    }
    try {
      setSaving(true);
      const res = await AxiosInstance.post('/profile/', {
        action: 'add_payment_method',
        payment_method: form.payment_method,
        bank_name: form.bank_name,
        account_name: form.account_name,
        account_number: form.account_number,
        is_default: form.is_default,
      }, { headers: { 'X-User-Id': userId } });
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
      const res = await AxiosInstance.post('/profile/', {
        action: 'set_default_payment',
        payment_id: paymentId,
      }, { headers: { 'X-User-Id': userId } });
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
    Alert.alert(
      'Remove Payment Method',
      'Are you sure you want to remove this payment method?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await AxiosInstance.post('/profile/', {
                action: 'delete_payment_method',
                payment_id: paymentId,
              }, { headers: { 'X-User-Id': userId } });
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
      ],
    );
  };

  const formatAccountPreview = (value: string) => {
    if (!value) return '-';
    if (value.length <= 4) return value;
    return `****${value.slice(-4)}`;
  };

  const closeModal = () => {
    setShowAddModal(false);
    resetForm();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={22} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Methods</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="add-circle-outline" size={26} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={styles.loadingSpinner} />
        ) : methods.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="card-outline" size={40} color="#9CA3AF" />
            </View>
            <Text style={styles.emptyTitle}>No Payment Methods</Text>
            <Text style={styles.emptySubtitle}>
              Add a bank account or e-wallet{'\n'}to receive your earnings.
            </Text>
            <TouchableOpacity onPress={() => setShowAddModal(true)} style={[styles.primaryButton, styles.emptyPrimaryButton]}>
              <Text style={styles.primaryButtonText}>Add Payment Method</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.sectionLabel}>
              {methods.length} payment method{methods.length !== 1 ? 's' : ''} saved
            </Text>
            {methods.map((m) => (
              <View key={m.payment_id} style={[styles.methodCard, m.is_default && styles.defaultMethodCard]}>
                <View style={styles.methodTopRow}>
                  <View style={styles.methodIconWrap}>
                    <Ionicons name={METHOD_ICONS[m.payment_method] || 'card-outline'} size={20} color="#374151" />
                  </View>
                  <View style={styles.methodTitleWrap}>
                    <View style={styles.methodTitleRow}>
                      <Text style={styles.methodTitle}>{METHOD_LABELS[m.payment_method] || m.payment_method}</Text>
                      {m.is_default && (
                        <View style={styles.defaultBadge}>
                          <Text style={styles.defaultBadgeText}>DEFAULT</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.methodSubtitle}>{m.bank_name || 'No bank name provided'}</Text>
                  </View>
                </View>

                <View style={styles.methodDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Account Name</Text>
                    <Text style={styles.detailValue}>{m.account_name}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>
                      {m.payment_method === 'gcash' ? 'Mobile No.' : m.payment_method === 'paypal' ? 'Email' : 'Account No.'}
                    </Text>
                    <Text style={styles.detailValue}>{formatAccountPreview(m.account_number)}</Text>
                  </View>
                </View>

                <View style={styles.actionRow}>
                  {!m.is_default && (
                    <TouchableOpacity
                      onPress={() => handleSetDefault(m.payment_id)}
                      style={styles.secondaryButton}
                    >
                      <Text style={styles.secondaryButtonText}>Set Default</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => handleDelete(m.payment_id)}
                    style={[styles.removeButton, m.is_default && styles.removeButtonFull]}
                  >
                    <Text style={styles.removeButtonText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.addAnotherButton}>
              <Ionicons name="add-circle-outline" size={16} color={COLORS.primary} />
              <Text style={styles.addAnotherText}>Add Another Method</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <Modal visible={showAddModal} animationType="slide" transparent onRequestClose={closeModal}>
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 16 : 0}
            style={styles.modalKeyboardWrap}
          >
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>Add Payment Method</Text>
                <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalContent}>
                <Text style={styles.inputLabel}>Method Type</Text>
                <View style={styles.methodGrid}>
                {METHOD_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setForm({ ...form, payment_method: type })}
                    style={[styles.methodChoice, form.payment_method === type && styles.methodChoiceActive]}
                  >
                    <Ionicons
                      name={METHOD_ICONS[type] || 'card-outline'}
                      size={18}
                      color={form.payment_method === type ? 'white' : '#6B7280'}
                    />
                    <Text style={[styles.methodChoiceText, form.payment_method === type && styles.methodChoiceTextActive]}>
                      {METHOD_LABELS[type]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {(form.payment_method === 'bank' || form.payment_method === 'card') && (
                <>
                    <Text style={styles.inputLabel}>Bank Name</Text>
                  <TextInput
                    value={form.bank_name}
                    onChangeText={(v) => setForm({ ...form, bank_name: v })}
                    placeholder="e.g. BDO, BPI, Metrobank"
                    placeholderTextColor="#9CA3AF"
                    style={styles.input}
                  />
                </>
              )}

                <Text style={styles.inputLabel}>
                Account Name <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>
              <TextInput
                value={form.account_name}
                onChangeText={(v) => setForm({ ...form, account_name: v })}
                placeholder="Full name on the account"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
              />

                <Text style={styles.inputLabel}>
                {form.payment_method === 'gcash' ? 'Mobile Number' : form.payment_method === 'paypal' ? 'PayPal Email' : 'Account Number'}{' '}
                <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>
              <TextInput
                value={form.account_number}
                onChangeText={(v) => setForm({ ...form, account_number: v })}
                placeholder={
                  form.payment_method === 'gcash'
                    ? '09XX XXX XXXX'
                    : form.payment_method === 'paypal'
                    ? 'email@example.com'
                    : 'Account number'
                }
                placeholderTextColor="#9CA3AF"
                keyboardType={form.payment_method === 'bank' || form.payment_method === 'card' ? 'numeric' : form.payment_method === 'gcash' ? 'phone-pad' : 'email-address'}
                style={styles.input}
              />

              <TouchableOpacity
                onPress={() => setForm({ ...form, is_default: !form.is_default })}
                  style={styles.checkboxRow}
              >
                  <View style={[styles.checkbox, form.is_default && styles.checkboxChecked]}>
                  {form.is_default && <Ionicons name="checkmark" size={14} color="white" />}
                </View>
                  <Text style={styles.checkboxText}>Set as default payment method</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleAddMethod}
                disabled={saving}
                  style={[styles.primaryButton, saving && styles.primaryButtonDisabled]}
              >
                {saving ? (
                  <ActivityIndicator color="white" />
                ) : (
                    <Text style={styles.primaryButtonText}>Add Payment Method</Text>
                )}
              </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.pageBg },
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginLeft: 12, flex: 1 },
  scroll: { flex: 1 },
  contentContainer: { padding: 16, paddingBottom: 32 },
  loadingSpinner: { marginTop: 80 },
  emptyState: { alignItems: 'center', marginTop: 80 },
  emptyIconWrap: {
    backgroundColor: '#E5E7EB',
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#374151' },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.subText,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 20,
  },
  sectionLabel: { fontSize: 13, color: COLORS.subText, marginBottom: 12 },
  methodCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  defaultMethodCard: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  methodTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  methodIconWrap: {
    backgroundColor: '#F3F4F6',
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  methodTitleWrap: { flex: 1 },
  methodTitleRow: { flexDirection: 'row', alignItems: 'center' },
  methodTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  methodSubtitle: { fontSize: 12, color: COLORS.subText, marginTop: 2 },
  defaultBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  defaultBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  methodDetails: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  detailRow: { flexDirection: 'row', marginBottom: 4 },
  detailLabel: { fontSize: 12, color: '#9CA3AF', width: 90 },
  detailValue: { fontSize: 13, color: COLORS.text, fontWeight: '500', flex: 1 },
  actionRow: { flexDirection: 'row', marginTop: 14 },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
  },
  secondaryButtonText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  removeButton: {
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: COLORS.dangerBg,
  },
  removeButtonFull: { flex: 1, paddingHorizontal: 0 },
  removeButtonText: { fontSize: 12, fontWeight: '600', color: COLORS.danger },
  addAnotherButton: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  addAnotherText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalKeyboardWrap: { width: '100%' },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    maxHeight: '90%',
  },
  modalHandle: {
    alignSelf: 'center',
    width: 54,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#D1D5DB',
    marginBottom: 12,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  modalContent: { paddingBottom: 8 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  methodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    marginHorizontal: -4,
  },
  methodChoice: {
    width: '50%',
    paddingHorizontal: 4,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    minHeight: 72,
    justifyContent: 'center',
    alignItems: 'center',
  },
  methodChoiceActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  methodChoiceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 6,
    textAlign: 'center',
  },
  methodChoiceTextActive: { color: '#FFFFFF' },
  input: {
    backgroundColor: COLORS.soft,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 13,
    fontSize: 14,
    marginBottom: 14,
    color: COLORS.text,
  },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxChecked: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  checkboxText: { fontSize: 14, color: '#374151' },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: { opacity: 0.7 },
  emptyPrimaryButton: { marginTop: 24 },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
