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

// ── Types ─────────────────────────────────────────────────────────────────────

interface FormData {
  // Base fields
  name: string;
  description: string;
  province: string;
  city: string;
  barangay: string;
  street: string;
  contact_number: string;
  shop_picture: any | null;
  // Legal — Business Registration
  business_registration_type: 'DTI' | 'SEC' | '';
  business_registration_number: string;
  business_registration_image: any | null;
  // Legal — Government ID
  government_id_type: string;
  government_id_number: string;
  government_id_image_front: any | null;
  government_id_image_back: any | null;
  // Legal — Business Permit
  business_permit_number: string;
  business_permit_image: any | null;
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
  business_registration_type?: string;
  business_registration_number?: string;
  business_registration_image?: string;
  government_id_type?: string;
  government_id_number?: string;
  government_id_image_front?: string;
  government_id_image_back?: string;
  business_permit_number?: string;
  business_permit_image?: string;
}

interface CreateShopFormProps {
  onSubmit: (formData: FormData) => Promise<void>;
  submitting: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const GOVERNMENT_ID_TYPES = [
  'PhilSys (National ID)',
  "Driver's License",
  'Passport',
  'SSS ID',
  'GSIS ID',
  'Voter\'s ID',
  'PRC ID',
  'Postal ID',
];

// ── Component ─────────────────────────────────────────────────────────────────

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
    business_registration_type: '',
    business_registration_number: '',
    business_registration_image: null,
    government_id_type: '',
    government_id_number: '',
    government_id_image_front: null,
    government_id_image_back: null,
    business_permit_number: '',
    business_permit_image: null,
  });

  const [errors, setErrors] = useState<FormErrors>({});

  // ── Validation ──────────────────────────────────────────────────────────────

  const validateForm = (): boolean => {
    const e: FormErrors = {};

    // Base fields
    if (!formData.name.trim()) e.name = 'Shop name is required';
    else if (formData.name.length > 50) e.name = 'Max 50 characters';

    if (!formData.description.trim()) e.description = 'Description is required';
    else if (formData.description.length > 200) e.description = 'Max 200 characters';

    if (!formData.province.trim()) e.province = 'Province is required';
    if (!formData.city.trim()) e.city = 'City is required';
    if (!formData.barangay.trim()) e.barangay = 'Barangay is required';
    if (!formData.street.trim()) e.street = 'Street is required';

    if (!formData.contact_number.trim()) e.contact_number = 'Contact number is required';
    else if (!/^[0-9+\-\s()]+$/.test(formData.contact_number))
      e.contact_number = 'Enter a valid contact number';

    // Business registration
    if (!formData.business_registration_type)
      e.business_registration_type = 'Please select DTI or SEC';
    if (!formData.business_registration_number.trim())
      e.business_registration_number = 'Registration number is required';
    if (!formData.business_registration_image)
      e.business_registration_image = 'Please upload your registration certificate';

    // Government ID
    if (!formData.government_id_type)
      e.government_id_type = 'Please select an ID type';
    if (!formData.government_id_number.trim())
      e.government_id_number = 'ID number is required';
    if (!formData.government_id_image_front)
      e.government_id_image_front = 'Please upload the front of your ID';

    // Business permit
    if (!formData.business_permit_number.trim())
      e.business_permit_number = 'Permit number is required';
    if (!formData.business_permit_image)
      e.business_permit_image = 'Please upload your business permit';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const pickImage = async (field: keyof FormData) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera roll permission is needed to upload images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
        Alert.alert('File Too Large', 'Image must be less than 5MB');
        return;
      }
      const file = {
        uri: asset.uri,
        type: 'image/jpeg',
        name: `${field}_${Date.now()}.jpg`,
      };
      setFormData(prev => ({ ...prev, [field]: file }));
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const removeImage = (field: keyof FormData) => {
    setFormData(prev => ({ ...prev, [field]: null }));
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix all errors before submitting.');
      return;
    }
    await onSubmit(formData);
  };

  // ── Reusable renderers ──────────────────────────────────────────────────────

  const renderInput = (
    label: string,
    field: keyof FormData,
    placeholder: string,
    options?: { maxLength?: number; multiline?: boolean; required?: boolean; keyboardType?: any }
  ) => {
    const { maxLength = 100, multiline = false, required = true } = options || {};
    return (
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>
          {label} {required && <Text style={styles.required}>*</Text>}
        </Text>
        <TextInput
          style={[styles.input, multiline && styles.textArea, errors[field as keyof FormErrors] && styles.inputError]}
          value={formData[field] as string}
          onChangeText={v => handleInputChange(field, v)}
          placeholder={placeholder}
          maxLength={maxLength}
          multiline={multiline}
          numberOfLines={multiline ? 4 : 1}
          editable={!submitting}
          keyboardType={options?.keyboardType}
        />
        {errors[field as keyof FormErrors] && (
          <Text style={styles.errorText}>{errors[field as keyof FormErrors]}</Text>
        )}
        <Text style={styles.charCount}>{(formData[field] as string)?.length || 0}/{maxLength}</Text>
      </View>
    );
  };

  const renderImageUpload = (
    label: string,
    field: keyof FormData,
    hint?: string,
    required = true
  ) => {
    const imageValue = formData[field] as any;
    return (
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>
          {label} {required && <Text style={styles.required}>*</Text>}
        </Text>
        {hint && <Text style={styles.fieldHint}>{hint}</Text>}

        {imageValue ? (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: imageValue.uri }} style={styles.documentPreview} />
            <TouchableOpacity
              style={styles.removeImageButton}
              onPress={() => removeImage(field)}
              disabled={submitting}
            >
              <MaterialIcons name="close" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.imageUploadButton,
              errors[field as keyof FormErrors] && styles.imageUploadButtonError,
            ]}
            onPress={() => pickImage(field)}
            disabled={submitting}
          >
            <MaterialIcons name="cloud-upload" size={28} color="#9CA3AF" />
            <Text style={styles.imageUploadText}>Tap to upload</Text>
            <Text style={styles.imageUploadSubtext}>JPEG, PNG — max 5MB</Text>
          </TouchableOpacity>
        )}

        {errors[field as keyof FormErrors] && (
          <Text style={styles.errorText}>{errors[field as keyof FormErrors]}</Text>
        )}
      </View>
    );
  };

  const renderSelectRow = (
    label: string,
    field: keyof FormData,
    options: string[],
    required = true
  ) => {
    return (
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>
          {label} {required && <Text style={styles.required}>*</Text>}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            {options.map(opt => {
              const selected = formData[field] === opt;
              return (
                <TouchableOpacity
                  key={opt}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => {
                    setFormData(prev => ({ ...prev, [field]: opt }));
                    setErrors(prev => ({ ...prev, [field]: undefined }));
                  }}
                  disabled={submitting}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
        {errors[field as keyof FormErrors] && (
          <Text style={styles.errorText}>{errors[field as keyof FormErrors]}</Text>
        )}
      </View>
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* ── Shop Picture ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Shop Picture</Text>
        <Text style={styles.sectionSubtitle}>Optional — recommended 1:1 ratio, max 5MB</Text>
        {formData.shop_picture ? (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: formData.shop_picture.uri }} style={styles.shopPicturePreview} />
            <TouchableOpacity style={styles.removeImageButton} onPress={() => removeImage('shop_picture')} disabled={submitting}>
              <MaterialIcons name="close" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.imageUploadButton} onPress={() => pickImage('shop_picture')} disabled={submitting}>
            <MaterialIcons name="add-photo-alternate" size={32} color="#9CA3AF" />
            <Text style={styles.imageUploadText}>Upload Picture</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Shop Information ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Shop Information</Text>
        {renderInput('Shop Name', 'name', 'Enter your shop name', { maxLength: 50 })}
        {renderInput('Description', 'description', 'Describe what your shop sells', { maxLength: 200, multiline: true })}
        {renderInput('Contact Number', 'contact_number', '+63 912 345 6789', { maxLength: 20, keyboardType: 'phone-pad' })}
      </View>

      {/* ── Shop Location ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Shop Location</Text>
        <AddressDropdowns
          value={{ province: formData.province, city: formData.city, barangay: formData.barangay, street: formData.street }}
          onChange={addr => setFormData(prev => ({ ...prev, ...addr, street: addr.street || '' }))}
          errors={{ province: errors.province, city: errors.city, barangay: errors.barangay }}
          disabled={submitting}
        />
      </View>

      {/* ── Business Registration ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="business" size={18} color="#6366F1" />
          <Text style={styles.sectionTitle}>Business Registration</Text>
        </View>
        <Text style={styles.sectionSubtitle}>
          Provide your DTI or SEC registration details and upload a copy of the certificate.
        </Text>

        {renderSelectRow('Registration Type', 'business_registration_type', ['DTI', 'SEC'])}
        {renderInput('Registration Number', 'business_registration_number', 'e.g. 2024-1234567-00', { maxLength: 100 })}
        {renderImageUpload(
          'Registration Certificate',
          'business_registration_image',
          'Upload a clear photo or scan of your DTI or SEC certificate'
        )}
      </View>

      {/* ── Government ID ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="badge" size={18} color="#6366F1" />
          <Text style={styles.sectionTitle}>Valid Government ID</Text>
        </View>
        <Text style={styles.sectionSubtitle}>
          Provide one valid government-issued ID. Back side is optional for IDs that only have a front.
        </Text>

        {renderSelectRow('ID Type', 'government_id_type', GOVERNMENT_ID_TYPES)}
        {renderInput('ID Number', 'government_id_number', 'Enter your ID number', { maxLength: 100 })}
        {renderImageUpload('Front of ID', 'government_id_image_front', 'Upload a clear photo of the front side of your ID')}
        {renderImageUpload('Back of ID', 'government_id_image_back', 'Upload a clear photo of the back side (if applicable)', false)}
      </View>

      {/* ── Business Permit ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="verified" size={18} color="#6366F1" />
          <Text style={styles.sectionTitle}>Business Permit</Text>
        </View>
        <Text style={styles.sectionSubtitle}>
          Provide your local government business permit number and upload a copy.
        </Text>

        {renderInput('Permit Number', 'business_permit_number', 'e.g. BP-2024-00123', { maxLength: 100 })}
        {renderImageUpload('Business Permit', 'business_permit_image', 'Upload a clear photo or scan of your business permit')}
      </View>

      {/* ── Submit ── */}
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
              <MaterialIcons name="send" size={20} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>Submit for Approval</Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.termsText}>
          Your documents will be reviewed by our team. By submitting, you agree to our Terms of Service and Privacy Policy.
        </Text>
      </View>
    </ScrollView>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  section: { marginBottom: 28 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  sectionSubtitle: { fontSize: 13, color: '#6B7280', marginBottom: 16, lineHeight: 18 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 6 },
  required: { color: '#EF4444' },
  fieldHint: { fontSize: 12, color: '#9CA3AF', marginBottom: 8 },
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
  textArea: { minHeight: 100, textAlignVertical: 'top', paddingTop: 12 },
  inputError: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
  errorText: { fontSize: 12, color: '#EF4444', marginTop: 4 },
  charCount: { fontSize: 12, color: '#9CA3AF', textAlign: 'right', marginTop: 4 },
  // chips
  chipRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
  },
  chipSelected: { borderColor: '#6366F1', backgroundColor: '#EEF2FF' },
  chipText: { fontSize: 13, color: '#6B7280' },
  chipTextSelected: { color: '#6366F1', fontWeight: '600' },
  // images
  imageUploadButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 110,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 12,
    gap: 4,
  },
  imageUploadButtonError: { borderColor: '#EF4444' },
  imageUploadText: { fontSize: 14, color: '#6B7280' },
  imageUploadSubtext: { fontSize: 11, color: '#9CA3AF' },
  imagePreviewContainer: { position: 'relative', alignItems: 'flex-start' },
  shopPicturePreview: { width: 120, height: 120, borderRadius: 12, backgroundColor: '#F3F4F6' },
  documentPreview: { width: '100%', height: 160, borderRadius: 10, backgroundColor: '#F3F4F6' },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#EF4444',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3 },
      android: { elevation: 3 },
    }),
  },
  // submit
  submitSection: { marginTop: 8, marginBottom: 32 },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    borderRadius: 10,
    gap: 8,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  submitButtonDisabled: { backgroundColor: '#9CA3AF' },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  termsText: { fontSize: 12, color: '#6B7280', textAlign: 'center', marginTop: 12, lineHeight: 16 },
});

export default CreateShopForm;