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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../contexts/AuthContext';
import { router, useLocalSearchParams } from 'expo-router';
import AxiosInstance from '../../../contexts/axios';

interface PaymentFormData {
  account_name: string;
  mobile_number: string;
  is_default: boolean;
}

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

export default function AddPaymentMethodScreen() {
  const { userId } = useAuth();
  const { mode, payment } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [showNumber, setShowNumber] = useState(false);

  const [formData, setFormData] = useState<PaymentFormData>({
    account_name: '',
    mobile_number: '',
    is_default: false,
  });

  useEffect(() => {
    const initializeForm = async () => {
      setLoading(true);
      if (mode === 'edit' && payment) {
        setIsEditMode(true);
        try {
          const parsed = JSON.parse(payment as string);
          setPaymentId(parsed.payment_id);

          let mobile = '';
          if (parsed.full_account_number) {
            const full = parsed.full_account_number;
            if (full.startsWith('639') && full.length === 12) {
              mobile = full.slice(3);
            } else {
              mobile = full;
            }
          }

          setFormData({
            account_name: parsed.account_name || '',
            mobile_number: mobile,
            is_default: parsed.is_default || false,
          });
        } catch (error) {
          console.error('Error parsing payment data:', error);
          Alert.alert('Error', 'Failed to load payment method data');
          router.back();
        }
      } else {
        setIsEditMode(false);
        setFormData({
          account_name: '',
          mobile_number: '',
          is_default: false,
        });
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

  const validateForm = (): string | null => {
    if (!formData.account_name.trim()) return 'Account name is required';
    if (!validateMobileNumber(formData.mobile_number)) {
      return 'Please enter exactly 9 digits (e.g., 171234567)';
    }
    return null;
  };

  const buildPayload = () => {
    const fullNumber = `639${formData.mobile_number}`;
    return {
      payment_method: 'paymaya',
      account_name: formData.account_name.trim(),
      account_number: fullNumber,
      is_default: formData.is_default,
    };
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
        error.response?.data?.error ||
        error.response?.data?.message ||
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
        error.response?.data?.error ||
        error.response?.data?.message ||
        'Failed to update payment method'
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
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditMode ? 'Edit Maya Account' : 'Add Maya Account'}
        </Text>
        {isEditMode && (
          <TouchableOpacity style={styles.deleteHeaderButton} onPress={handleDeletePaymentMethod}>
            <Ionicons name="trash-outline" size={22} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Maya Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoIconContainer}>
            <Ionicons name="card-outline" size={28} color="#F97316" />
          </View>
          <Text style={styles.infoTitle}>Maya Wallet</Text>
          <Text style={styles.infoText}>
            Add your Maya account to receive payouts and withdrawals.
          </Text>
        </View>

        {/* Account Form */}
        <View style={styles.section}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Account Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.account_name}
              onChangeText={(text) => handleInputChange('account_name', text)}
              placeholder="e.g., Juan Dela Cruz"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Maya Mobile Number *
              <Text style={styles.phHint}> (PH Number)</Text>
            </Text>
            <View style={styles.numberInputContainer}>
              <View style={styles.phFlagContainer}>
                <Text style={styles.phFlag}>🇵🇭</Text>
                <Text style={styles.phPrefix}>+63</Text>
              </View>
              <View style={styles.numberWrapper}>
                <Text style={styles.ninePrefix}>9</Text>
                <TextInput
                  style={styles.numberInput}
                  value={formData.mobile_number}
                  onChangeText={handleMobileChange}
                  placeholder="XXXXXXXX"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                  maxLength={9}
                  secureTextEntry={!showNumber}
                />
              </View>
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
              Enter the 8 digits after the initial '9' (e.g., 71234567)
            </Text>
          </View>
        </View>

        {/* Default Switch */}
        <View style={styles.section}>
          <View style={styles.switchContainer}>
            <View style={styles.switchTextContainer}>
              <Text style={styles.switchLabel}>Set as default payment method</Text>
              <Text style={styles.switchSubLabel}>
                This account will be used for withdrawals by default
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => handleInputChange('is_default', !formData.is_default)}
              style={[
                styles.customSwitch,
                formData.is_default && styles.customSwitchActive
              ]}
            >
              <View style={[
                styles.switchThumb,
                formData.is_default && styles.switchThumbActive
              ]} />
            </TouchableOpacity>
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
              {isEditMode ? 'Update Maya Account' : 'Add Maya Account'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    height: Platform.OS === 'ios' ? 90 : 70,
    paddingTop: Platform.OS === 'ios' ? 40 : 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
    minWidth: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
    textAlign: 'center',
  },
  deleteHeaderButton: {
    padding: 4,
    minWidth: 40,
    alignItems: 'flex-end',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  infoCard: {
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  infoIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F97316',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#92400E',
    textAlign: 'center',
    lineHeight: 16,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
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
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  phFlagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  phFlag: {
    fontSize: 16,
    marginRight: 4,
  },
  phPrefix: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  numberWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  ninePrefix: {
    fontSize: 16,
    color: '#111827',
    paddingLeft: 8,
    fontWeight: '500',
  },
  numberInput: {
    flex: 1,
    paddingVertical: 12,
    paddingRight: 12,
    paddingLeft: 4,
    fontSize: 16,
    color: '#111827',
  },
  eyeButton: {
    padding: 12,
    paddingHorizontal: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#111827',
  },
  numberHint: {
    fontSize: 13,
    color: '#059669',
    marginTop: 8,
  },
  formatHint: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  switchSubLabel: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  customSwitch: {
    width: 48,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#D1D5DB',
    padding: 2,
  },
  customSwitchActive: {
    backgroundColor: '#F97316',
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  switchThumbActive: {
    transform: [{ translateX: 24 }],
  },
  submitButton: {
    backgroundColor: '#F97316',
    paddingVertical: 16,
    borderRadius: 12,
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
});