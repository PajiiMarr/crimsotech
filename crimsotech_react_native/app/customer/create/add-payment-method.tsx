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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../contexts/AuthContext';
import { router, useLocalSearchParams } from 'expo-router';
import AxiosInstance from '../../../contexts/axios';

interface PaymentFormData {
  payment_method: string;
  account_name: string;
  subscriber_number: string;    // 9 digits after the leading '9'
  bank_name: string;
  is_default: boolean;
}

export default function AddPaymentMethodScreen() {
  const { userId } = useAuth();
  const { mode, payment } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [showNumber, setShowNumber] = useState(false);
  const [formData, setFormData] = useState<PaymentFormData>({
    payment_method: 'gcash',
    account_name: '',
    subscriber_number: '',
    bank_name: '',
    is_default: false,
  });

  const paymentMethodOptions = [
    { label: 'GCash', value: 'gcash' },
    { label: 'PayMaya', value: 'paymaya' },
    { label: 'Bank Account', value: 'bank' },
  ];

  useEffect(() => {
    const initializeForm = async () => {
      setLoading(true);
      if (mode === 'edit' && payment) {
        setIsEditMode(true);
        try {
          const parsedPayment = JSON.parse(payment as string);
          setPaymentId(parsedPayment.payment_id);
          const fullNumber = parsedPayment.full_account_number || '';
          // Extract the 9 digits after the initial '639'
          // fullNumber is "639xxxxxxxxx" (12 digits)
          let subscriberNumber = '';
          if (fullNumber.startsWith('639') && fullNumber.length === 12) {
            subscriberNumber = fullNumber.slice(3); // remove "639"
          }
          setFormData({
            payment_method: parsedPayment.payment_method || 'gcash',
            account_name: parsedPayment.account_name || '',
            subscriber_number: subscriberNumber,
            bank_name: parsedPayment.bank_name || '',
            is_default: parsedPayment.is_default || false,
          });
          setShowNumber(true);
        } catch (error) {
          console.error('Error parsing payment data:', error);
          Alert.alert('Error', 'Failed to load payment method data');
          router.back();
        }
      } else {
        setIsEditMode(false);
        setFormData({
          payment_method: 'gcash',
          account_name: '',
          subscriber_number: '',
          bank_name: '',
          is_default: false,
        });
        setShowNumber(false);
      }
      setLoading(false);
    };
    initializeForm();
  }, [mode, payment]);

  const handleInputChange = (field: keyof PaymentFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Validate that the subscriber number is exactly 9 digits (all numbers)
  const validateSubscriberNumber = (number: string): boolean => {
    return /^\d{9}$/.test(number);
  };

  // Format the full number for display: 🇵🇭 +63 9XX XXX XXXX
  const formatDisplayNumber = (subscriberNumber: string): string => {
    if (subscriberNumber.length === 9) {
      return `🇵🇭 +63 9${subscriberNumber.slice(0, 2)} ${subscriberNumber.slice(2, 5)} ${subscriberNumber.slice(5)}`;
    }
    return `🇵🇭 +63 9${subscriberNumber}`;
  };

  // Clean input: only digits, limit to 9
  const cleanSubscriberInput = (text: string): string => {
    let cleaned = text.replace(/[^0-9]/g, '');
    if (cleaned.length > 9) {
      cleaned = cleaned.slice(0, 9);
    }
    return cleaned;
  };

  const handleNumberChange = (text: string) => {
    const cleaned = cleanSubscriberInput(text);
    handleInputChange('subscriber_number', cleaned);
  };

  const handleAddPaymentMethod = async () => {
    if (!userId) {
      Alert.alert('Error', 'User not found');
      return;
    }
    if (!formData.account_name.trim()) {
      Alert.alert('Error', 'Account name is required');
      return;
    }
    if (!validateSubscriberNumber(formData.subscriber_number)) {
      Alert.alert(
        'Invalid Number',
        'Please enter exactly 9 digits (e.g., 171234567)'
      );
      return;
    }
    if (formData.payment_method === 'bank' && !formData.bank_name.trim()) {
      Alert.alert('Error', 'Bank name is required');
      return;
    }

    try {
      setSaving(true);
      const fullNumber = `639${formData.subscriber_number}`;
      const payload: any = {
        payment_method: formData.payment_method,
        account_name: formData.account_name.trim(),
        account_number: fullNumber,
        is_default: formData.is_default,
      };
      if (formData.payment_method === 'bank') {
        payload.bank_name = formData.bank_name.trim();
      }

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
    if (!userId || !paymentId) {
      Alert.alert('Error', 'Missing required information');
      return;
    }
    if (!formData.account_name.trim()) {
      Alert.alert('Error', 'Account name is required');
      return;
    }
    if (!validateSubscriberNumber(formData.subscriber_number)) {
      Alert.alert(
        'Invalid Number',
        'Please enter exactly 9 digits (e.g., 171234567)'
      );
      return;
    }
    if (formData.payment_method === 'bank' && !formData.bank_name.trim()) {
      Alert.alert('Error', 'Bank name is required');
      return;
    }

    try {
      setSaving(true);
      const fullNumber = `639${formData.subscriber_number}`;
      const payload: any = {
        payment_method: formData.payment_method,
        account_name: formData.account_name.trim(),
        account_number: fullNumber,
        is_default: formData.is_default,
      };
      if (formData.payment_method === 'bank') {
        payload.bank_name = formData.bank_name.trim();
      }

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
        error.response?.data?.account_number?.[0] ||
        error.response?.data?.error ||
        'Failed to update payment method'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePaymentMethod = () => {
    if (!userId || !paymentId) return;

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
              Alert.alert(
                'Error',
                error.response?.data?.error || 'Failed to delete payment method'
              );
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
      <SafeAreaView style={styles.headerSafeArea}>
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
      </SafeAreaView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Payment Method Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <View style={styles.typeButtons}>
            {paymentMethodOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.typeButton,
                  formData.payment_method === option.value && styles.typeButtonActive,
                ]}
                onPress={() => handleInputChange('payment_method', option.value)}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    formData.payment_method === option.value && styles.typeButtonTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Bank Name (only for bank accounts) */}
        {formData.payment_method === 'bank' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bank Details</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Bank Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.bank_name}
                onChangeText={(text) => handleInputChange('bank_name', text)}
                placeholder="e.g., BDO, BPI, Metrobank"
              />
            </View>
          </View>
        )}

        {/* Account Information */}
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
          
          {formData.payment_method !== 'bank' && (
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
                  value={formData.subscriber_number}
                  onChangeText={handleNumberChange}
                  placeholder="XXXXXXXXX"   // 9 digits placeholder
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
              {formData.subscriber_number.length > 0 && (
                <Text style={styles.numberHint}>
                  {formatDisplayNumber(formData.subscriber_number)}
                </Text>
              )}
              <Text style={styles.formatHint}>
                Enter the 9 digits after the initial '9' (e.g., 171234567)
              </Text>
            </View>
          )}
        </View>

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
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
  headerSafeArea: { backgroundColor: '#FFF', paddingTop: Platform.OS === 'android' ? 40 : 0 },
  backButton: { marginRight: 20 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: 'black', flex: 1 },
  deleteHeaderButton: { padding: 4 },
  content: { flex: 1, padding: 16 },
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
  inputGroup: { marginBottom: 16 },
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
  numberHint: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    fontFamily: Platform.OS === 'ios' ? 'SFProDisplay' : undefined,
  },
  formatHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
    fontStyle: 'italic',
  },
  typeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    minWidth: '45%',
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
  submitButtonDisabled: { backgroundColor: '#FCA5A5' },
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