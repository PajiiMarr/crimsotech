// app/seller/shop-contacts.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import AxiosInstance from '../../contexts/axios';
import AddressDropdowns from '../components/address/AddressDropdowns';

interface ContactAddress {
  province: string;
  city: string;
  barangay: string;
  street: string;
  contact_number: string;
  full_address: string;
}

interface FormErrors {
  province?: string;
  city?: string;
  barangay?: string;
  street?: string;
  contact_number?: string;
}

export default function ShopContacts() {
  const router = useRouter();
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  const { userId } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [address, setAddress] = useState<ContactAddress>({
    province: '',
    city: '',
    barangay: '',
    street: '',
    contact_number: '',
    full_address: '',
  });
  const [originalAddress, setOriginalAddress] = useState<ContactAddress | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (shopId && userId) {
      fetchReturnAddress();
    }
  }, [shopId, userId]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!address.province.trim()) newErrors.province = 'Province is required';
    if (!address.city.trim()) newErrors.city = 'City is required';
    if (!address.barangay.trim()) newErrors.barangay = 'Barangay is required';
    if (!address.street.trim()) newErrors.street = 'Street address is required';
    
    if (!address.contact_number.trim()) {
      newErrors.contact_number = 'Contact number is required';
    } else if (address.contact_number.length > 20) {
      newErrors.contact_number = 'Contact number must be 20 characters or less';
    } else if (!/^[0-9+\-\s()]+$/.test(address.contact_number)) {
      newErrors.contact_number = 'Enter a valid contact number';
    } else {
      // Check if it's a valid Philippine number format (63 followed by 10 digits)
      const cleanNumber = address.contact_number.replace(/[\s\-()]/g, '');
      const phoneRegex = /^63\d{10}$/;
      if (!phoneRegex.test(cleanNumber)) {
        newErrors.contact_number = 'Enter a valid Philippine number (e.g., 63 912 345 6789)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof ContactAddress, value: string) => {
    setAddress(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const formatPhoneNumber = (text: string) => {
    // Remove all non-digit characters
    let cleaned = text.replace(/\D/g, '');
    
    // Format as 63 912 345 6789
    if (cleaned.length >= 2) {
      const countryCode = cleaned.substring(0, 2);
      const rest = cleaned.substring(2, 12);
      
      if (rest.length <= 3) {
        return `${countryCode} ${rest}`;
      } else if (rest.length <= 6) {
        const firstThree = rest.substring(0, 3);
        const secondThree = rest.substring(3, 6);
        return `${countryCode} ${firstThree} ${secondThree}`;
      } else {
        const firstThree = rest.substring(0, 3);
        const secondThree = rest.substring(3, 6);
        const lastFour = rest.substring(6, 10);
        return `${countryCode} ${firstThree} ${secondThree} ${lastFour}`;
      }
    }
    
    return cleaned;
  };

  const fetchReturnAddress = async () => {
    try {
      setLoading(true);
      const response = await AxiosInstance.get('/customer-shops/', {
        params: {
          customer_id: userId,
        },
        headers: { 'X-User-Id': userId }
      });
      
      if (response.data.success && response.data.shops) {
        const shop = response.data.shops.find((s: any) => s.id === shopId);
        
        if (shop) {
          let formattedPhone = shop.contact_number || '';
          // Format the phone number for display
          if (formattedPhone) {
            const cleanPhone = formattedPhone.replace(/\D/g, '');
            if (cleanPhone.startsWith('63') && cleanPhone.length === 12) {
              formattedPhone = formatPhoneNumber(cleanPhone);
            }
          }
          
          const addressData = {
            province: shop.province || '',
            city: shop.city || '',
            barangay: shop.barangay || '',
            street: shop.street || '',
            contact_number: formattedPhone,
            full_address: shop.address || `${shop.street || ''}, ${shop.barangay || ''}, ${shop.city || ''}, ${shop.province || ''}`
          };
          
          setAddress(addressData);
          setOriginalAddress(addressData);
        } else {
          Alert.alert('Error', 'Shop not found');
        }
      } else {
        Alert.alert('Error', 'Failed to load shop data');
      }
    } catch (error: any) {
      console.error('Error fetching return address:', error);
      Alert.alert('Error', error?.response?.data?.error || 'Failed to load return address');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix all errors before saving.');
      return;
    }

    try {
      setSaving(true);
      
      // Clean phone number (remove spaces, dashes, parentheses)
      const cleanPhone = address.contact_number.replace(/[\s\-()]/g, '');
      
      const payload = {
        customer_id: userId,
        action: 'return_address',
        shop_id: shopId,
        province: address.province,
        city: address.city,
        barangay: address.barangay,
        street: address.street,
        contact_number: cleanPhone,
      };
      
      await AxiosInstance.put('/customer-shops/', payload, {
        headers: { 'X-User-Id': userId }
      });
      
      Alert.alert('Success', 'Contact address updated successfully');
      router.back();
    } catch (error: any) {
      console.error('Error saving return address:', error);
      Alert.alert('Error', error?.response?.data?.error || 'Failed to save return address');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = () => {
    if (!originalAddress) return false;
    // Compare cleaned phone numbers (remove formatting)
    const currentPhone = address.contact_number.replace(/[\s\-()]/g, '');
    const originalPhone = originalAddress.contact_number.replace(/[\s\-()]/g, '');
    
    return (
      address.province !== originalAddress.province ||
      address.city !== originalAddress.city ||
      address.barangay !== originalAddress.barangay ||
      address.street !== originalAddress.street ||
      currentPhone !== originalPhone
    );
  };

  const getFullAddressPreview = () => {
    const parts = [address.street, address.barangay, address.city, address.province];
    return parts.filter(p => p && p.trim()).join(', ');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#EE4D2D" />
          <Text style={styles.loadingText}>Loading contact address...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Contact Address</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Info Banner */}
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle-outline" size={20} color="#3B82F6" />
            <Text style={styles.infoText}>
              This address and contact number will be used for customer returns and inquiries. 
              Make sure the information is accurate and complete.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            {/* Contact Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Contact Number <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.contact_number && styles.inputError]}
                placeholder="e.g., 63 912 345 6789"
                value={address.contact_number}
                onChangeText={(text) => {
                  const formatted = formatPhoneNumber(text);
                  handleInputChange('contact_number', formatted);
                }}
                keyboardType="phone-pad"
                maxLength={16}
              />
              <Text style={styles.helperText}>
                Format: 63 followed by 10-digit number (e.g., 63 912 345 6789)
              </Text>
              {errors.contact_number && (
                <Text style={styles.errorText}>{errors.contact_number}</Text>
              )}
            </View>

            <View style={styles.divider} />

            {/* Address Dropdowns */}
            <AddressDropdowns
              value={{
                province: address.province,
                city: address.city,
                barangay: address.barangay,
                street: address.street,
              }}
              onChange={(data) => {
                setAddress(prev => ({
                  ...prev,
                  province: data.province,
                  city: data.city,
                  barangay: data.barangay,
                  street: data.street || prev.street,
                }));
                // Clear errors for changed fields
                if (data.province && errors.province) {
                  setErrors(prev => ({ ...prev, province: undefined }));
                }
                if (data.city && errors.city) {
                  setErrors(prev => ({ ...prev, city: undefined }));
                }
                if (data.barangay && errors.barangay) {
                  setErrors(prev => ({ ...prev, barangay: undefined }));
                }
              }}
              errors={{
                province: errors.province,
                city: errors.city,
                barangay: errors.barangay,
              }}
            />
          </View>

          {/* Address Preview */}
          <View style={styles.previewContainer}>
            <Text style={styles.previewTitle}>Address Preview</Text>
            <View style={styles.previewCard}>
              <View style={styles.previewRow}>
                <MaterialIcons name="location-on" size={16} color="#EE4D2D" />
                <Text style={styles.previewLabel}>Return Address:</Text>
              </View>
              <Text style={styles.previewAddress}>{getFullAddressPreview() || 'No address entered'}</Text>
              <View style={styles.previewRow}>
                <MaterialIcons name="phone" size={16} color="#EE4D2D" />
                <Text style={styles.previewLabel}>Contact Number:</Text>
              </View>
              <Text style={styles.previewContact}>{address.contact_number || 'Not set'}</Text>
            </View>
          </View>

          {/* Tips Section */}
          <View style={styles.tipsSection}>
            <MaterialIcons name="lightbulb" size={20} color="#F59E0B" />
            <View style={styles.tipsContent}>
              <Text style={styles.tipsTitle}>Important Tips</Text>
              <Text style={styles.tipsText}>
                • Ensure your contact number is active and reachable{'\n'}
                • Provide complete address for accurate delivery{'\n'}
                • Double-check all fields before saving{'\n'}
                • Keep your contact details up to date
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.saveButton, (!hasChanges() || saving) && styles.disabledButton]}
              onPress={handleSave}
              disabled={!hasChanges() || saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <MaterialIcons name="save" size={20} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => router.back()}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 12 : 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    margin: 16,
    padding: 12,
    borderRadius: 8,
    alignItems: 'flex-start',
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#1E40AF',
    lineHeight: 16,
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  required: {
    color: '#EF4444',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  helperText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },
  errorText: {
    fontSize: 11,
    color: '#EF4444',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  previewContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  previewCard: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  previewAddress: {
    fontSize: 14,
    color: '#111827',
    marginBottom: 12,
    lineHeight: 20,
    paddingLeft: 24,
  },
  previewContact: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
    paddingLeft: 24,
  },
  tipsSection: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  tipsContent: {
    flex: 1,
    marginLeft: 12,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 6,
  },
  tipsText: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 24,
    gap: 12,
    marginTop: 8,
  },
  saveButton: {
    backgroundColor: '#EE4D2D',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#FCD34D',
    opacity: 0.7,
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
  },
});