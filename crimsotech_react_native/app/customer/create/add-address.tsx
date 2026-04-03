// app/customer/create/add-address.tsx
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
import AddressDropdowns from '../../components/address/AddressDropdowns';

interface AddressFormData {
  recipient_name: string;
  recipient_phone: string;
  street: string;
  barangay: string;
  city: string;
  province: string;
  zip_code: string;
  country: string;
  building_name: string;
  floor_number: string;
  unit_number: string;
  landmark: string;
  instructions: string;
  address_type: string;
  is_default: boolean;
}

export default function AddAddressPage() {
  const { user } = useAuth();
  const { mode, address } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [addressId, setAddressId] = useState<string | null>(null);
  const [formData, setFormData] = useState<AddressFormData>({
    recipient_name: '',
    recipient_phone: '',
    street: '',
    barangay: '',
    city: '',
    province: '',
    zip_code: '',
    country: 'Philippines',
    building_name: '',
    floor_number: '',
    unit_number: '',
    landmark: '',
    instructions: '',
    address_type: 'home',
    is_default: false,
  });
  const [errors, setErrors] = useState({
    province: '',
    city: '',
    barangay: '',
  });

  useEffect(() => {
    const initializeForm = async () => {
      setLoading(true);
      
      if (mode === 'edit' && address) {
        setIsEditMode(true);
        
        try {
          const parsedAddress = JSON.parse(address as string);
          setAddressId(parsedAddress.id);
          
          setFormData({
            recipient_name: parsedAddress.recipient_name || '',
            recipient_phone: parsedAddress.recipient_phone || '',
            street: parsedAddress.street || '',
            barangay: parsedAddress.barangay || '',
            city: parsedAddress.city || '',
            province: parsedAddress.province || '',
            zip_code: parsedAddress.zip_code || '',
            country: parsedAddress.country || 'Philippines',
            building_name: parsedAddress.building_name || '',
            floor_number: parsedAddress.floor_number || '',
            unit_number: parsedAddress.unit_number || '',
            landmark: parsedAddress.landmark || '',
            instructions: parsedAddress.instructions || '',
            address_type: parsedAddress.address_type || 'home',
            is_default: parsedAddress.is_default || false,
          });
        } catch (error) {
          console.error('Error parsing address data:', error);
          Alert.alert('Error', 'Failed to load address data');
          router.back();
        }
      } else {
        setIsEditMode(false);
      }
      
      setLoading(false);
    };

    initializeForm();
  }, [mode, address]);

  const handleInputChange = (field: keyof AddressFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddressChange = (addressData: {
    province: string;
    city: string;
    barangay: string;
    street?: string;
  }) => {
    setFormData(prev => ({
      ...prev,
      province: addressData.province,
      city: addressData.city,
      barangay: addressData.barangay,
      street: addressData.street || prev.street,
    }));
    setErrors({
      province: addressData.province ? '' : errors.province,
      city: addressData.city ? '' : errors.city,
      barangay: addressData.barangay ? '' : errors.barangay,
    });
  };

  const validateForm = (): boolean => {
    const newErrors = {
      province: '',
      city: '',
      barangay: '',
    };
    let isValid = true;

    if (!formData.province) {
      newErrors.province = 'Province is required';
      isValid = false;
    }
    if (!formData.city) {
      newErrors.city = 'City is required';
      isValid = false;
    }
    if (!formData.barangay) {
      newErrors.barangay = 'Barangay is required';
      isValid = false;
    }
    if (!formData.recipient_name) {
      isValid = false;
    }
    if (!formData.recipient_phone) {
      isValid = false;
    }
    if (!formData.street) {
      isValid = false;
    }
    if (!formData.zip_code) {
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleAddAddress = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'User not found');
      return;
    }

    if (!validateForm()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);
      const response = await AxiosInstance.post(
        '/shipping-address/add_shipping_address/',
        {
          user_id: user.id,
          ...formData
        }
      );
      
      if (response.data.success) {
        Alert.alert('Success', 'Address added successfully', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      }
    } catch (error: any) {
      console.error('Error adding address:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to add address'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateAddress = async () => {
    if (!user?.id || !addressId) {
      Alert.alert('Error', 'Missing required information');
      return;
    }

    if (!validateForm()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);
      const response = await AxiosInstance.put(
        '/shipping-address/update_shipping_address/',
        {
          address_id: addressId,
          user_id: user.id,
          ...formData
        }
      );
      
      if (response.data.success) {
        Alert.alert('Success', 'Address updated successfully', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      }
    } catch (error: any) {
      console.error('Error updating address:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to update address'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = () => {
    if (isEditMode) {
      handleUpdateAddress();
    } else {
      handleAddAddress();
    }
  };

  const handleDeleteAddress = () => {
    if (!user?.id || !addressId) return;

    Alert.alert(
      'Delete Address',
      'Are you sure you want to delete this address?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await AxiosInstance.delete(
                '/shipping-address/delete_shipping_address/',
                {
                  data: {
                    address_id: addressId,
                    user_id: user.id
                  }
                }
              );
              
              if (response.data.success) {
                Alert.alert('Success', 'Address deleted successfully', [
                  { text: 'OK', onPress: () => router.back() }
                ]);
              }
            } catch (error: any) {
              console.error('Error deleting address:', error);
              Alert.alert(
                'Error',
                error.response?.data?.error || 'Failed to delete address'
              );
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F97316" />
          <Text style={styles.loadingText}>
            {isEditMode ? 'Loading address...' : 'Loading...'}
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
            {isEditMode ? 'Edit Address' : 'Add New Address'}
          </Text>
          
          {isEditMode && (
            <TouchableOpacity 
              style={styles.deleteHeaderButton}
              onPress={handleDeleteAddress}
            >
              <Ionicons name="trash-outline" size={22} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Recipient Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.recipient_name}
              onChangeText={(text) => handleInputChange('recipient_name', text)}
              placeholder="Enter recipient name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number *</Text>
            <TextInput
              style={styles.input}
              value={formData.recipient_phone}
              onChangeText={(text) => handleInputChange('recipient_phone', text)}
              placeholder="Enter phone number"
              keyboardType="phone-pad"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Address Details</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Building/House Name</Text>
            <TextInput
              style={styles.input}
              value={formData.building_name}
              onChangeText={(text) => handleInputChange('building_name', text)}
              placeholder="Optional"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Floor</Text>
              <TextInput
                style={styles.input}
                value={formData.floor_number}
                onChangeText={(text) => handleInputChange('floor_number', text)}
                placeholder="Optional"
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Unit</Text>
              <TextInput
                style={styles.input}
                value={formData.unit_number}
                onChangeText={(text) => handleInputChange('unit_number', text)}
                placeholder="Optional"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Street *</Text>
            <TextInput
              style={styles.input}
              value={formData.street}
              onChangeText={(text) => handleInputChange('street', text)}
              placeholder="Enter street name"
            />
          </View>

          <AddressDropdowns
            value={{
              province: formData.province,
              city: formData.city,
              barangay: formData.barangay,
              street: formData.street,
            }}
            onChange={handleAddressChange}
            errors={errors}
          />

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Zip Code *</Text>
            <TextInput
              style={styles.input}
              value={formData.zip_code}
              onChangeText={(text) => handleInputChange('zip_code', text)}
              placeholder="Zip code"
              keyboardType="number-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Country</Text>
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={formData.country}
              placeholder="Philippines"
              editable={false}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Landmark</Text>
            <TextInput
              style={styles.input}
              value={formData.landmark}
              onChangeText={(text) => handleInputChange('landmark', text)}
              placeholder="Optional (e.g., near McDonald's)"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Delivery Instructions</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.instructions}
              onChangeText={(text) => handleInputChange('instructions', text)}
              placeholder="Optional delivery instructions"
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address Type</Text>
            <View style={styles.typeButtons}>
              {['home', 'work', 'other'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeButton,
                    formData.address_type === type && styles.typeButtonActive
                  ]}
                  onPress={() => handleInputChange('address_type', type)}
                >
                  <Text style={[
                    styles.typeButtonText,
                    formData.address_type === type && styles.typeButtonTextActive
                  ]}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => handleInputChange('is_default', !formData.is_default)}
          >
            <View style={[
              styles.checkbox,
              formData.is_default && styles.checkboxChecked
            ]}>
              {formData.is_default && (
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              )}
            </View>
            <Text style={styles.checkboxLabel}>
              Set as default shipping address
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>
              {isEditMode ? 'Update Address' : 'Save Address'}
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
  deleteHeaderButton: {
    padding: 4,
  },
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
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 6,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  disabledInput: {
    backgroundColor: '#F3F4F6',
    color: '#6B7280',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
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
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: '#F97316',
    borderColor: '#F97316',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#374151',
  },
  submitButton: {
    backgroundColor: '#F97316',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
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