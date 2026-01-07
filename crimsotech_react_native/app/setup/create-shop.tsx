// app/main/create-shop.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { createShop, registerUserAsCustomer } from '@/utils/api';


export default function CreateShopScreen() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    province: '',
    city: '',
    barangay: '',
    street: '',
    contact_number: '',
  });
  const [shopPicture, setShopPicture] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Shop name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Shop name must be at least 2 characters';
    } else if (formData.name.length > 50) {
      newErrors.name = 'Shop name must be 50 characters or less';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    } else if (formData.description.length > 200) {
      newErrors.description = 'Description must be 200 characters or less';
    }

    if (!formData.province.trim()) {
      newErrors.province = 'Province is required';
    }
    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }
    if (!formData.barangay.trim()) {
      newErrors.barangay = 'Barangay is required';
    }
    if (!formData.street.trim()) {
      newErrors.street = 'Street address is required';
    }
    if (!formData.contact_number.trim()) {
      newErrors.contact_number = 'Contact number is required';
    } else if (!/^\+?[\d\s-()]{10,}$/.test(formData.contact_number)) {
      newErrors.contact_number = 'Please enter a valid contact number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'We need access to your photos to upload a shop picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setShopPicture(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    if (!user?.user_id && !user?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    setLoading(true);

    try {
      // First, try to register the user as a customer if they're not already
      const userId = user.user_id || user.id;
      try {
        await registerUserAsCustomer(userId);
      } catch (regError: any) {
        console.log('User might already be registered as customer:', regError.message);
        // Continue anyway since this might fail if already registered
      }

      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name.trim());
      formDataToSend.append('description', formData.description.trim());
      formDataToSend.append('province', formData.province.trim());
      formDataToSend.append('city', formData.city.trim());
      formDataToSend.append('barangay', formData.barangay.trim());
      formDataToSend.append('street', formData.street.trim());
      formDataToSend.append('contact_number', formData.contact_number.trim());
      formDataToSend.append('customer', String(userId));

      if (shopPicture) {
        const filename = shopPicture.split('/').pop() || 'shop.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        // For React Native, we need to handle file upload differently
        formDataToSend.append('shop_picture', {
          uri: Platform.OS === 'android' ? shopPicture : shopPicture.replace('file://', ''),
          name: filename,
          type,
        } as any);
      }

      const response = await createShop(formDataToSend);

      if (response.success || response.id) {
        Alert.alert('Success', 'Shop created successfully!', [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]);
      } else {
        throw new Error(response.error || 'Failed to create shop');
      }
    } catch (error: any) {
      console.error('Create shop error:', error);

      if (error.response) {
        const errorResponse = error.response;
        const errorMessages: string[] = [];

        Object.keys(errorResponse).forEach(key => {
          if (Array.isArray(errorResponse[key])) {
            errorMessages.push(`${key}: ${errorResponse[key][0]}`);
          } else {
            errorMessages.push(`${key}: ${errorResponse[key]}`);
          }
        });

        Alert.alert('Error', errorMessages.join('\n') || 'Failed to create shop');
      } else {
        Alert.alert('Error', error.message || 'Failed to create shop. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Shop</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.content}>
          {/* Shop Picture */}
          <View style={styles.section}>
            <Text style={styles.label}>Shop Picture (Optional)</Text>
            <TouchableOpacity
              style={styles.imagePicker}
              onPress={pickImage}
            >
              {shopPicture ? (
                <View style={styles.imagePreview}>
                  <Text style={styles.imagePreviewText}>Image selected</Text>
                  <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
                </View>
              ) : (
                <View style={styles.imagePlaceholder}>
                  <MaterialIcons name="add-photo-alternate" size={40} color="#999" />
                  <Text style={styles.imagePlaceholderText}>Tap to add photo</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Shop Name */}
          <View style={styles.section}>
            <Text style={styles.label}>Shop Name *</Text>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              placeholder="Enter shop name"
              value={formData.name}
              onChangeText={(text) => updateFormData('name', text)}
              maxLength={50}
            />
            {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea, errors.description && styles.inputError]}
              placeholder="Describe your shop"
              value={formData.description}
              onChangeText={(text) => updateFormData('description', text)}
              multiline
              numberOfLines={4}
              maxLength={200}
            />
            {errors.description ? <Text style={styles.errorText}>{errors.description}</Text> : null}
          </View>

          {/* Address Fields */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Address</Text>
            
            <Text style={styles.label}>Province *</Text>
            <TextInput
              style={[styles.input, errors.province && styles.inputError]}
              placeholder="Enter province"
              value={formData.province}
              onChangeText={(text) => updateFormData('province', text)}
            />
            {errors.province ? <Text style={styles.errorText}>{errors.province}</Text> : null}

            <Text style={styles.label}>City *</Text>
            <TextInput
              style={[styles.input, errors.city && styles.inputError]}
              placeholder="Enter city"
              value={formData.city}
              onChangeText={(text) => updateFormData('city', text)}
            />
            {errors.city ? <Text style={styles.errorText}>{errors.city}</Text> : null}

            <Text style={styles.label}>Barangay *</Text>
            <TextInput
              style={[styles.input, errors.barangay && styles.inputError]}
              placeholder="Enter barangay"
              value={formData.barangay}
              onChangeText={(text) => updateFormData('barangay', text)}
            />
            {errors.barangay ? <Text style={styles.errorText}>{errors.barangay}</Text> : null}

            <Text style={styles.label}>Street *</Text>
            <TextInput
              style={[styles.input, errors.street && styles.inputError]}
              placeholder="Enter street address"
              value={formData.street}
              onChangeText={(text) => updateFormData('street', text)}
            />
            {errors.street ? <Text style={styles.errorText}>{errors.street}</Text> : null}
          </View>

          {/* Contact Number */}
          <View style={styles.section}>
            <Text style={styles.label}>Contact Number *</Text>
            <TextInput
              style={[styles.input, errors.contact_number && styles.inputError]}
              placeholder="Enter contact number"
              value={formData.contact_number}
              onChangeText={(text) => updateFormData('contact_number', text)}
              keyboardType="phone-pad"
            />
            {errors.contact_number ? <Text style={styles.errorText}>{errors.contact_number}</Text> : null}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitButtonText}>Create Shop</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#FFF',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#F44336',
  },
  errorText: {
    color: '#F44336',
    fontSize: 12,
    marginTop: 4,
  },
  imagePicker: {
    marginTop: 8,
  },
  imagePlaceholder: {
    height: 150,
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  imagePlaceholderText: {
    marginTop: 8,
    color: '#999',
    fontSize: 14,
  },
  imagePreview: {
    height: 150,
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    flexDirection: 'row',
    gap: 8,
  },
  imagePreviewText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#ff6d0bff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

