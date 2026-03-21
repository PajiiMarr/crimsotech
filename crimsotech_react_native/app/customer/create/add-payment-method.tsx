import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
  Switch,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../contexts/AuthContext';
import { router, useLocalSearchParams } from 'expo-router';
import AxiosInstance from '../../../contexts/axios';

interface PaymentFormData {
  methodType: 'ewallet' | 'bank';
  ewalletProvider: string;   // 'gcash' or 'paymaya'
  account_name: string;
  mobile_number: string;       // for e‑wallet, 9 digits after 639
  bank_name: string;
  account_number: string;      // for bank – stored as raw digits (no spaces)
  is_default: boolean;
  security_code: string;       // frontend only, 3 digits
}

// Common Philippine banks for dropdown
const phBanks = [
  'BDO Unibank',
  'BPI (Bank of the Philippine Islands)',
  'Metrobank',
  'Landbank',
  'PNB (Philippine National Bank)',
  'Security Bank',
  'UnionBank',
  'RCBC (Rizal Commercial Banking Corp)',
  'China Bank',
  'EastWest Bank',
  'Maybank',
  'CIMB Bank',
  'ING',
  'Other',
];

const ewalletProviders = [
  { label: 'GCash', value: 'gcash' },
  { label: 'PayMaya', value: 'paymaya' },
];

// Helper to clean and validate mobile number (9 digits)
const cleanMobileInput = (text: string): string => {
  let cleaned = text.replace(/[^0-9]/g, '');
  if (cleaned.length > 9) cleaned = cleaned.slice(0, 9);
  return cleaned;
};

const validateMobileNumber = (number: string): boolean => /^\d{9}$/.test(number);

const formatDisplayNumber = (subscriberNumber: string): string => {
  if (subscriberNumber.length === 9) {
    return `🇵🇭 +63 9${subscriberNumber.slice(0, 2)} ${subscriberNumber.slice(2, 5)} ${subscriberNumber.slice(5)}`;
  }
  return `🇵🇭 +63 9${subscriberNumber}`;
};

// Format bank account number: insert spaces every 4 digits for display
const formatAccountNumber = (raw: string): string => {
  const digits = raw.replace(/\s/g, '');
  if (digits.length === 0) return '';
  const groups = [];
  for (let i = 0; i < digits.length; i += 4) {
    groups.push(digits.slice(i, i + 4));
  }
  return groups.join(' ');
};

// Extract raw digits from formatted string
const extractRawDigits = (formatted: string): string => {
  return formatted.replace(/\s/g, '');
};

export default function AddPaymentMethodScreen() {
  const { userId } = useAuth();
  const { mode, payment } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [showNumber, setShowNumber] = useState(false);
  const [displayAccountNumber, setDisplayAccountNumber] = useState(''); // for visual formatting

  // Dropdown modals
  const [showEwalletModal, setShowEwalletModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);

  const [formData, setFormData] = useState<PaymentFormData>({
    methodType: 'ewallet',
    ewalletProvider: 'gcash',
    account_name: '',
    mobile_number: '',
    bank_name: '',
    account_number: '',
    is_default: false,
    security_code: '',
  });

  useEffect(() => {
    const initializeForm = async () => {
      setLoading(true);
      if (mode === 'edit' && payment) {
        setIsEditMode(true);
        try {
          const parsed = JSON.parse(payment as string);
          setPaymentId(parsed.payment_id);

          // Determine method type and populate fields
          const method = parsed.payment_method;
          const isBank = method === 'bank';
          const isGCash = method === 'gcash';
          const isPayMaya = method === 'paymaya';

          let mobile = '';
          if (!isBank && parsed.full_account_number) {
            const full = parsed.full_account_number;
            if (full.startsWith('639') && full.length === 12) {
              mobile = full.slice(3);
            } else {
              mobile = full;
            }
          }

          const rawAccountNumber = parsed.account_number || '';
          setDisplayAccountNumber(formatAccountNumber(rawAccountNumber));

          setFormData({
            methodType: isBank ? 'bank' : 'ewallet',
            ewalletProvider: isGCash ? 'gcash' : isPayMaya ? 'paymaya' : 'gcash',
            account_name: parsed.account_name || '',
            mobile_number: mobile,
            bank_name: parsed.bank_name || '',
            account_number: rawAccountNumber,
            is_default: parsed.is_default || false,
            security_code: '',
          });
        } catch (error) {
          console.error('Error parsing payment data:', error);
          Alert.alert('Error', 'Failed to load payment method data');
          router.back();
        }
      } else {
        setIsEditMode(false);
        setFormData({
          methodType: 'ewallet',
          ewalletProvider: 'gcash',
          account_name: '',
          mobile_number: '',
          bank_name: '',
          account_number: '',
          is_default: false,
          security_code: '',
        });
        setDisplayAccountNumber('');
      }
      setLoading(false);
    };
    initializeForm();
  }, [mode, payment]);

  const handleInputChange = <K extends keyof PaymentFormData>(field: K, value: PaymentFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleMobileChange = (text: string) => {
    const cleaned = cleanMobileInput(text);
    handleInputChange('mobile_number', cleaned);
  };

  const handleAccountNumberChange = (text: string) => {
    // Remove any spaces first, then limit to 16 digits
    let raw = text.replace(/\s/g, '');
    raw = raw.replace(/[^0-9]/g, '');
    if (raw.length > 16) raw = raw.slice(0, 16);
    const formatted = formatAccountNumber(raw);
    setDisplayAccountNumber(formatted);
    handleInputChange('account_number', raw);
  };

  const validateForm = (): string | null => {
    if (!formData.account_name.trim()) return 'Account name is required';

    if (formData.methodType === 'ewallet') {
      if (!validateMobileNumber(formData.mobile_number)) {
        return 'Please enter exactly 9 digits (e.g., 171234567)';
      }
    } else { // bank
      if (!formData.bank_name.trim()) return 'Please select a bank';
      if (!formData.account_number) return 'Account number is required';
      if (formData.account_number.length !== 16) {
        return 'Account number must be exactly 16 digits';
      }
      // Security code is frontend only, no validation needed for submission
    }
    return null;
  };

  const buildPayload = () => {
    const payload: any = {
      payment_method: '',
      account_name: formData.account_name.trim(),
      is_default: formData.is_default,
    };

    if (formData.methodType === 'ewallet') {
      const fullNumber = `639${formData.mobile_number}`; // 12 digits
      payload.account_number = fullNumber;
      payload.payment_method = formData.ewalletProvider; // 'gcash' or 'paymaya'
    } else {
      payload.payment_method = 'bank';
      payload.account_number = formData.account_number; // raw 16 digits
      payload.bank_name = formData.bank_name.trim();
    }

    return payload;
  };

  const handleAddPaymentMethod = async () => {
    const validationError = validateForm();
    if (validationError) {
      Alert.alert('Error', validationError);
      return;
    }

    try {
      setSaving(true);
      const payload = buildPayload();

      const response = await AxiosInstance.post(
        '/user-payment-details/add_payment_method/',
        payload,
        { headers: { 'X-User-Id': userId } }
      );

      if (response.data.message) {
        Alert.alert('Success', 'Payment method added successfully', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      }
    } catch (error: any) {
      console.error('Error adding payment method:', error);
      Alert.alert(
        'Error',
        error.response?.data?.account_number?.[0] ||
        error.response?.data?.error ||
        'Failed to add payment method'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePaymentMethod = async () => {
    const validationError = validateForm();
    if (validationError) {
      Alert.alert('Error', validationError);
      return;
    }

    try {
      setSaving(true);
      const payload = buildPayload();

      const response = await AxiosInstance.put(
        `/user-payment-details/${paymentId}/update_payment_method/`,
        payload,
        { headers: { 'X-User-Id': userId } }
      );

      if (response.data.message) {
        Alert.alert('Success', 'Payment method updated successfully', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      }
    } catch (error: any) {
      console.error('Error updating payment method:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to update payment method'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePaymentMethod = () => {
    if (!paymentId) return;

    Alert.alert(
      'Delete Payment Method',
      'Are you sure you want to delete this payment method?',
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
                Alert.alert('Success', 'Payment method deleted successfully', [
                  { text: 'OK', onPress: () => router.back() }
                ]);
              }
            } catch (error: any) {
              console.error('Error deleting payment method:', error);
              Alert.alert('Error', error.response?.data?.error || 'Failed to delete payment method');
            }
          }
        }
      ]
    );
  };

  const handleSubmit = () => {
    if (isEditMode) {
      handleUpdatePaymentMethod();
    } else {
      handleAddPaymentMethod();
    }
  };

  const selectEwallet = (value: string) => {
    handleInputChange('ewalletProvider', value);
    setShowEwalletModal(false);
  };

  const selectBank = (bank: string) => {
    if (bank === 'Other') {
      // Open a prompt for custom bank name
      Alert.prompt(
        'Enter Bank Name',
        'Please specify the bank name:',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'OK',
            onPress: (text) => {
              if (text && text.trim()) {
                handleInputChange('bank_name', text.trim());
              }
            },
          },
        ],
        'plain-text'
      );
    } else {
      handleInputChange('bank_name', bank);
    }
    setShowBankModal(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F97316" />
          <Text style={styles.loadingText}>
            {isEditMode ? 'Loading payment method...' : 'Loading...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditMode ? 'Edit Payment Method' : 'Add Payment Method'}
        </Text>
        {isEditMode && (
          <TouchableOpacity style={styles.deleteHeaderButton} onPress={handleDeletePaymentMethod}>
            <Ionicons name="trash-outline" size={22} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Top-level method type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Type</Text>
          <View style={styles.typeButtons}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                formData.methodType === 'ewallet' && styles.typeButtonActive,
              ]}
              onPress={() => handleInputChange('methodType', 'ewallet')}
            >
              <Text
                style={[
                  styles.typeButtonText,
                  formData.methodType === 'ewallet' && styles.typeButtonTextActive,
                ]}
              >
                E‑Wallet
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeButton,
                formData.methodType === 'bank' && styles.typeButtonActive,
              ]}
              onPress={() => handleInputChange('methodType', 'bank')}
            >
              <Text
                style={[
                  styles.typeButtonText,
                  formData.methodType === 'bank' && styles.typeButtonTextActive,
                ]}
              >
                Bank Account
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* E‑Wallet section */}
        {formData.methodType === 'ewallet' && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>E‑Wallet Provider</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setShowEwalletModal(true)}
              >
                <Text style={styles.dropdownText}>
                  {formData.ewalletProvider === 'gcash' ? 'GCash' : 'PayMaya'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Account Information</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Account Name *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.account_name}
                  onChangeText={(text) => handleInputChange('account_name', text)}
                  placeholder="e.g., Juan Dela Cruz"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Mobile Number *
                  <Text style={styles.phHint}> (PH)</Text>
                </Text>
                <View style={styles.numberInputContainer}>
                  <View style={styles.phFlagContainer}>
                    <Text style={styles.phFlag}>🇵🇭</Text>
                    <Text style={styles.phPrefix}>+63 9</Text>
                  </View>
                  <TextInput
                    style={[
                      styles.numberInput,
                      Platform.OS === 'ios' && { paddingLeft: 80 }
                    ]}
                    value={formData.mobile_number}
                    onChangeText={handleMobileChange}
                    placeholder="XXXXXXXXX"
                    keyboardType="phone-pad"
                    maxLength={9}
                    secureTextEntry={!showNumber}
                    placeholderTextColor="#9CA3AF"
                  />
                  <TouchableOpacity 
                    style={styles.eyeButton} 
                    onPress={() => setShowNumber(!showNumber)}
                    activeOpacity={0.7}
                  >
                    <Ionicons 
                      name={showNumber ? "eye-off" : "eye"} 
                      size={20} 
                      color="#6B7280" 
                    />
                  </TouchableOpacity>
                </View>
                {formData.mobile_number.length > 0 && (
                  <Text style={styles.numberHint}>
                    {formatDisplayNumber(formData.mobile_number)}
                  </Text>
                )}
                <Text style={styles.formatHint}>
                  Enter the 9 digits after the initial '9' (e.g., 171234567)
                </Text>
              </View>
            </View>
          </>
        )}

        {/* Bank section */}
        {formData.methodType === 'bank' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bank Details</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Bank Name *</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setShowBankModal(true)}
              >
                <Text style={styles.dropdownText}>
                  {formData.bank_name || 'Select bank'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Account Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.account_name}
                onChangeText={(text) => handleInputChange('account_name', text)}
                placeholder="Full name as it appears in bank records"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Account Number *</Text>
              <TextInput
                style={styles.input}
                value={displayAccountNumber}
                onChangeText={handleAccountNumberChange}
                placeholder="1234 5678 9012 3456"
                keyboardType="numeric"
              />
              <Text style={styles.formatHint}>
                Exactly 16 digits. Spaces will be added automatically.
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Security Code (3 digits)</Text>
              <TextInput
                style={[styles.input, styles.securityCodeInput]}
                value={formData.security_code}
                onChangeText={(text) => {
                  let cleaned = text.replace(/[^0-9]/g, '');
                  if (cleaned.length > 3) cleaned = cleaned.slice(0, 3);
                  handleInputChange('security_code', cleaned);
                }}
                placeholder="e.g., 123"
                keyboardType="numeric"
                maxLength={3}
                secureTextEntry
              />
              <Text style={styles.formatHint}>
                For verification purposes (this code is not stored)
              </Text>
            </View>
          </View>
        )}

        {/* Default Switch */}
        <View style={styles.section}>
          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Set as default payment method</Text>
            <Switch
              value={formData.is_default}
              onValueChange={(value) => handleInputChange('is_default', value)}
              trackColor={{ false: '#D1D5DB', true: '#F97316' }}
              thumbColor={formData.is_default ? '#FFFFFF' : '#f4f3f4'}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, saving && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>
              {isEditMode ? 'Update Payment Method' : 'Save Payment Method'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* E‑Wallet Provider Modal */}
      <Modal
        visible={showEwalletModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEwalletModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowEwalletModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select E‑Wallet</Text>
              <TouchableOpacity onPress={() => setShowEwalletModal(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={ewalletProviders}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => selectEwallet(item.value)}
                >
                  <Text style={styles.modalItemText}>{item.label}</Text>
                  {formData.ewalletProvider === item.value && (
                    <Ionicons name="checkmark" size={20} color="#F97316" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Bank Modal */}
      <Modal
        visible={showBankModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBankModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowBankModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Bank</Text>
              <TouchableOpacity onPress={() => setShowBankModal(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={phBanks}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => selectBank(item)}
                >
                  <Text style={styles.modalItemText}>{item}</Text>
                  {formData.bank_name === item && (
                    <Ionicons name="checkmark" size={20} color="#F97316" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  backButton: {
    marginRight: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'black',
    flex: 1,
  },
  deleteHeaderButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 6,
    fontWeight: '500',
  },
  phHint: {
    fontSize: 12,
    color: '#F97316',
    fontWeight: '500',
  },
  numberInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  phFlagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
  },
  phFlag: {
    fontSize: 18,
    marginRight: 4,
  },
  phPrefix: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  numberInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  eyeButton: {
    padding: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  securityCodeInput: {
    width: 120,
  },
  numberHint: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  formatHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
    fontStyle: 'italic',
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#F97316',
    borderColor: '#F97316',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  typeButtonTextActive: {
    color: '#FFFFFF',
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  dropdownText: {
    fontSize: 16,
    color: '#111827',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },
  submitButton: {
    backgroundColor: '#F97316',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
  },
  submitButtonDisabled: {
    backgroundColor: '#FCA5A5',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '80%',
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalItemText: {
    fontSize: 16,
    color: '#374151',
  },
});