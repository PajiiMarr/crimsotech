import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AddressDropdowns from '../../components/address/AddressDropdowns';

interface FormData {
  name: string;
  description: string;
  province: string;
  city: string;
  barangay: string;
  street: string;
  contact_number: string;
  shop_picture: any | null;
}

interface FormErrors {
  name?: string;
  description?: string;
  province?: string;
  city?: string;
  barangay?: string;
  street?: string;
  contact_number?: string;
  shop_picture?: string;
}

interface CreateShopFormProps {
  onSubmit: (formData: FormData) => Promise<void>;
  submitting: boolean;
}

const CreateShopForm: React.FC<CreateShopFormProps> = ({ onSubmit, submitting }) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    province: '',
    city: '',
    barangay: '',
    street: '',
    contact_number: '',
    shop_picture: null,
  });

  const [errors, setErrors] = useState<FormErrors>({});

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Required field validations
    if (!formData.name.trim()) newErrors.name = 'Shop name is required';
    else if (formData.name.length > 50) newErrors.name = 'Shop name must be 50 characters or less';

    if (!formData.description.trim()) newErrors.description = 'Description is required';
    else if (formData.description.length > 200) newErrors.description = 'Description must be 200 characters or less';

    if (!formData.province.trim()) newErrors.province = 'Province is required';
    else if (formData.province.length > 50) newErrors.province = 'Province must be 50 characters or less';

    if (!formData.city.trim()) newErrors.city = 'City is required';
    else if (formData.city.length > 50) newErrors.city = 'City must be 50 characters or less';

    if (!formData.barangay.trim()) newErrors.barangay = 'Barangay is required';
    else if (formData.barangay.length > 50) newErrors.barangay = 'Barangay must be 50 characters or less';

    if (!formData.street.trim()) newErrors.street = 'Street is required';
    else if (formData.street.length > 50) newErrors.street = 'Street must be 50 characters or less';

    if (!formData.contact_number.trim()) newErrors.contact_number = 'Contact number is required';
    else if (formData.contact_number.length > 20) newErrors.contact_number = 'Contact number must be 20 characters or less';
    else if (!/^[0-9+\-\s()]+$/.test(formData.contact_number)) newErrors.contact_number = 'Enter a valid contact number';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const pickImage = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to upload images.');
        return;
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        // Check file size (5MB limit)
        if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
          Alert.alert('File Too Large', 'Image must be less than 5MB');
          return;
        }

        // Create proper file object for FormData
        const file = {
          uri: asset.uri,
          type: 'image/jpeg',
          name: `shop_picture_${Date.now()}.jpg`,
        };

        setFormData(prev => ({ ...prev, shop_picture: file }));
        if (errors.shop_picture) {
          setErrors(prev => ({ ...prev, shop_picture: undefined }));
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const removeImage = () => {
    setFormData(prev => ({ ...prev, shop_picture: null }));
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix all errors before submitting.');
      return;
    }

    await onSubmit(formData);
  };

  // Render helper instead of inline React component to avoid remounting on every render
  const renderInputField = ({
    label,
    field,
    placeholder,
    maxLength = 50,
    multiline = false,
    required = true,
  }: {
    label: string;
    field: keyof FormData;
    placeholder: string;
    maxLength?: number;
    multiline?: boolean;
    required?: boolean;
  }) => {
    return (
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>
          {label} {required && <Text style={styles.required}>*</Text>}
        </Text>
        <TextInput
          style={[
            styles.input,
            multiline && styles.textArea,
            errors[field] && styles.inputError,
          ]}
          value={formData[field] as string}
          onChangeText={(value) => handleInputChange(field, value)}
          placeholder={placeholder}
          maxLength={maxLength}
          multiline={multiline}
          numberOfLines={multiline ? 4 : 1}
          editable={!submitting}
        />
        {errors[field] && (
          <Text style={styles.errorText}>{errors[field]}</Text>
        )}
        <Text style={styles.charCount}>
          {formData[field]?.length || 0}/{maxLength}
        </Text>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Shop Picture Upload */}
      <View style={styles.imageSection}>
        <Text style={styles.sectionTitle}>Shop Picture (Optional)</Text>
        <Text style={styles.sectionSubtitle}>
          Add a profile picture for your shop. Recommended: 1:1 ratio, max 5MB
        </Text>
        
        {formData.shop_picture ? (
          <View style={styles.imagePreviewContainer}>
            <Image
              source={{ uri: formData.shop_picture.uri }}
              style={styles.imagePreview}
            />
            <TouchableOpacity
              style={styles.removeImageButton}
              onPress={removeImage}
              disabled={submitting}
            >
              <MaterialIcons name="close" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.imageUploadButton}
            onPress={pickImage}
            disabled={submitting}
          >
            <MaterialIcons name="add-photo-alternate" size={32} color="#9CA3AF" />
            <Text style={styles.imageUploadText}>Upload Picture</Text>
          </TouchableOpacity>
        )}
        
        {errors.shop_picture && (
          <Text style={styles.errorText}>{errors.shop_picture}</Text>
        )}
      </View>

      {/* Shop Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Shop Information</Text>
        
        {renderInputField({ label: 'Shop Name', field: 'name', placeholder: 'Enter your shop name', maxLength: 50 })}
        
        {renderInputField({ label: 'Description', field: 'description', placeholder: 'Describe what your shop sells', maxLength: 200, multiline: true })}
        
        {renderInputField({ label: 'Contact Number', field: 'contact_number', placeholder: 'e.g., +63 912 345 6789', maxLength: 20 })}
      </View>

      {/* Shop Location */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Shop Location</Text>

        <AddressDropdowns
          value={{
            province: formData.province,
            city: formData.city,
            barangay: formData.barangay,
            street: formData.street,
          }}
          onChange={(addr) => setFormData(prev => ({
            ...prev,
            province: addr.province,
            city: addr.city,
            barangay: addr.barangay,
            street: addr.street || '',
          }))}
          errors={{
            province: errors.province,
            city: errors.city,
            barangay: errors.barangay,
          }}
          disabled={submitting}
        />
      </View>

      {/* Submit Button */}
      <View style={styles.submitSection}>
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <MaterialIcons name="store" size={20} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>Create Shop</Text>
            </>
          )}
        </TouchableOpacity>
        
        <Text style={styles.termsText}>
          By creating a shop, you agree to our Terms of Service and Privacy Policy.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  imageSection: {
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 18,
  },
  imageUploadButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  imageUploadText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  imagePreviewContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  imagePreview: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#EF4444',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  required: {
    color: '#EF4444',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    minHeight: 44,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  charCount: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 4,
  },
  submitSection: {
    marginTop: 8,
    marginBottom: 24,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  termsText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 16,
  },
});

export default CreateShopForm;