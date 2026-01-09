// app/shop/dashboard/[id]/edit-product/[productId].tsx
import { useAuth } from '@/contexts/AuthContext';
import { useShop } from '@/contexts/ShopContext';
import { API_CONFIG } from '@/utils/config';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface FormData {
  name: string;
  description: string;
  price: string;
  quantity: string;
  condition: string;
  category: string;
  productType: string;
  brand: string;
  model: string;
  color: string;
  ram: string;
  rom: string;
  specifications: string;
  packageContents: string;
  knownIssues: string;
  targetBuyer: 'daily users' | 'resellers' | 'recyclers';
}

const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;
const isLargeDevice = width > 414;

export default function EditProductScreen() {
  const { user } = useAuth();
  const { state, dispatch } = useShop();
  const params = useLocalSearchParams();
  const shopId = params.id as string;
  const productId = params.productId as string;

  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    price: '',
    quantity: '',
    condition: 'New',
    category: '',
    productType: 'electronics',
    brand: '',
    model: '',
    color: '',
    ram: '',
    rom: '',
    specifications: '',
    packageContents: '',
    knownIssues: '',
    targetBuyer: 'daily users',
  });

  const [productImages, setProductImages] = useState<string[]>([]);
  const [newMediaFiles, setNewMediaFiles] = useState<{ uri: string; type: string; name: string }[]>([]);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData | 'productImages', string>>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const productToEdit = state.products.find(p => p.id === productId);
    if (productToEdit) {
      setFormData({
        name: productToEdit.name,
        description: productToEdit.description,
        price: productToEdit.price.toString(),
        quantity: productToEdit.quantity.toString(),
        condition: productToEdit.condition,
        category: productToEdit.category,
        productType: productToEdit.productType || 'electronics',
        brand: productToEdit.brand || '',
        model: productToEdit.model || '',
        color: productToEdit.color || '',
        ram: productToEdit.ram || '',
        rom: productToEdit.rom || '',
        specifications: productToEdit.specifications || '',
        packageContents: productToEdit.packageContents || '',
        knownIssues: productToEdit.knownIssues || '',
        targetBuyer: productToEdit.targetBuyer || 'daily users',
      });
      setProductImages(productToEdit.images || []);
    } else {
      Alert.alert('Error', 'Product not found in this shop.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }
    setLoading(false);
  }, [productId, state.products]);

  const updateFormData = (key: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData | 'productImages', string>> = {};

    if (!formData.name.trim()) newErrors.name = 'Product name is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.price || parseFloat(formData.price) <= 0) newErrors.price = 'Valid price is required';
    if (!formData.quantity || parseInt(formData.quantity) < 0) newErrors.quantity = 'Valid quantity is required';
    if (!formData.condition) newErrors.condition = 'Condition is required';
    if (!formData.category) newErrors.category = 'Category is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'We need access to your photos to upload product images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 5 - productImages.length,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const newUris = result.assets.map(asset => asset.uri);
      setProductImages(prev => [...prev, ...newUris]);
      const mappedNew = result.assets.map(asset => ({
        uri: asset.uri,
        type: asset.mimeType || 'image/jpeg',
        name: asset.fileName || `product_media_${Date.now()}`
      }));
      setNewMediaFiles(prev => [...prev, ...mappedNew]);
    }
  };

  const removeImage = (index: number) => {
    setProductImages(prev => prev.filter((_, i) => i !== index));
    if (errors.productImages) {
      setErrors(prev => ({ ...prev, productImages: '' }));
    }
  };

  const handleUpdateProduct = async () => {
    if (!validateForm()) return;
    if (productImages.length === 0) {
      Alert.alert('Error', 'Please add at least one product image.');
      return;
    }

    const existing = state.products.find(p => p.id === productId);
    if (!existing) {
      Alert.alert('Error', 'Product not found. Please refresh the dashboard.');
      return;
    }

    setLoading(true);
    try {
      // Prepare FormData payload similar to add-product
      const payload = new FormData();
      payload.append('name', formData.name);
      payload.append('description', formData.description);
      payload.append('price', formData.price);
      payload.append('quantity', formData.quantity);
      payload.append('condition', formData.condition);
      payload.append('shop', shopId);
      payload.append('customer_id', user?.user_id || user?.id || '');
      payload.append('category', formData.category || '');
      payload.append('category_admin_id', 'none');
      payload.append('upload_status', 'published');
      payload.append('status', 'active');

      // Attach only newly added media files (existing remote URLs stay untouched server-side)
      newMediaFiles.forEach(file => {
        payload.append('media_files', {
          uri: file.uri,
          type: file.type,
          name: file.name,
        } as any);
      });

      const response = await fetch(`${API_CONFIG.BASE_URL}/api/seller-products/${productId}/`, {
        method: 'PUT',
        body: payload,
      });

      let result: any = null;
      try {
        result = await response.json();
      } catch (err) {
        // ignore parse error; keep result null
      }

      if (!response.ok) {
        Alert.alert('Error', result?.error || result?.message || `Failed with status ${response.status}`);
      } else {
        // Map API response back into state shape
        const apiProduct = result?.product || result;
        const mappedStatus = ((apiProduct?.status || 'active') as string).toLowerCase() as 'active' | 'draft' | 'archived';

        const mapped = {
          id: apiProduct?.id || productId,
          name: apiProduct?.name || formData.name,
          description: apiProduct?.description || formData.description,
          price: Number(apiProduct?.price ?? formData.price) || 0,
          quantity: apiProduct?.quantity ?? parseInt(formData.quantity),
          condition: apiProduct?.condition || formData.condition,
          category: apiProduct?.category?.name || formData.category,
          productType: apiProduct?.category_admin?.name || formData.productType,
          brand: apiProduct?.brand || formData.brand,
          model: apiProduct?.model || formData.model,
          color: apiProduct?.color || formData.color,
          ram: apiProduct?.ram || formData.ram,
          rom: apiProduct?.rom || formData.rom,
          specifications: apiProduct?.specifications || formData.specifications,
          packageContents: apiProduct?.packageContents || formData.packageContents,
          knownIssues: apiProduct?.knownIssues || formData.knownIssues,
          targetBuyer: apiProduct?.targetBuyer || formData.targetBuyer,
          images: (apiProduct?.media_files || []).map((m: any) => m.url || m.file_data || m.file || '').filter(Boolean).length > 0
            ? (apiProduct?.media_files || []).map((m: any) => m.url || m.file_data || m.file || '').filter(Boolean)
            : productImages,
          shopId: apiProduct?.shop?.id || shopId,
          createdAt: apiProduct?.created_at || existing.createdAt || new Date().toISOString(),
          updatedAt: apiProduct?.updated_at || new Date().toISOString(),
          status: mappedStatus,
        };

        dispatch({ type: 'UPDATE_PRODUCT', payload: mapped });
        Alert.alert('Product Updated!', `"${formData.name}" has been updated successfully!`, [
          { text: 'OK', onPress: () => router.push(`/shop/dashboard/${shopId}`) },
        ]);
      }
    } catch (error: any) {
      console.error('Update product error:', error);
      Alert.alert('Error', error.message || 'Failed to update product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff6d0b" />
        <Text style={styles.loadingText}>Loading product...</Text>
      </View>
    );
  }

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
          <Text style={styles.headerTitle}>Edit Product</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.content}>
          {/* Basic Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Product Name *</Text>
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                value={formData.name}
                onChangeText={(text) => updateFormData('name', text)}
                placeholder="Enter product name"
              />
              {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
            </View>

            {/* Product Images */}
            <View style={styles.section}>
              <Text style={styles.label}>Product Images *</Text>
              <TouchableOpacity
                style={styles.imagePicker}
                onPress={pickImages}
                disabled={productImages.length >= 5}
              >
                <View style={styles.imagePickerContent}>
                  <MaterialIcons name="add-photo-alternate" size={32} color={productImages.length >= 5 ? "#ccc" : "#999"} />
                  <Text style={[styles.imagePickerText, productImages.length >= 5 && { color: '#ccc' }]}>
                    {productImages.length >= 5 ? 'Maximum images reached' : 'Add or replace images'}
                  </Text>
                  <Text style={styles.imagePickerSubtext}>
                    {productImages.length}/5 images
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Display selected images */}
              {productImages.length > 0 && (
                <View style={styles.selectedImagesContainer}>
                  {productImages.map((imageUri, index) => (
                    <View key={index} style={styles.selectedImageItem}>
                      <Image 
                        source={{ uri: imageUri }} 
                        style={styles.selectedImage}
                        resizeMode="cover"
                      />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => removeImage(index)}
                      >
                        <MaterialIcons name="close" size={16} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
              
              {errors.productImages && <Text style={styles.errorText}>{errors.productImages}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea, errors.description && styles.inputError]}
                value={formData.description}
                onChangeText={(text) => updateFormData('description', text)}
                placeholder="Enter product description"
                multiline
                numberOfLines={4}
              />
              {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Price *</Text>
                <TextInput
                  style={[styles.input, errors.price && styles.inputError]}
                  value={formData.price}
                  onChangeText={(text) => updateFormData('price', text)}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                />
                {errors.price && <Text style={styles.errorText}>{errors.price}</Text>}
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Quantity *</Text>
                <TextInput
                  style={[styles.input, errors.quantity && styles.inputError]}
                  value={formData.quantity}
                  onChangeText={(text) => updateFormData('quantity', text)}
                  placeholder="0"
                  keyboardType="number-pad"
                />
                {errors.quantity && <Text style={styles.errorText}>{errors.quantity}</Text>}
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => router.back()}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleUpdateProduct}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Update Product</Text>
              )}
            </TouchableOpacity>
          </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  // Ensure the ScrollView's contentContainerStyle has a defined style
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
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
  inputGroup: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
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
    fontSize: 14,
    color: '#333',
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#F44336',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#F44336',
    fontSize: 12,
    marginTop: 4,
  },
  imagePicker: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  imagePickerContent: {
    alignItems: 'center',
  },
  imagePickerText: {
    marginTop: 8,
    color: '#999',
    fontSize: 14,
    fontWeight: '500',
  },
  imagePickerSubtext: {
    color: '#999',
    fontSize: 12,
  },
  selectedImagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  selectedImageItem: {
    position: 'relative',
  },
  selectedImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#F44336',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 32,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#ff6d0b',
  },
  submitButtonDisabled: {
    backgroundColor: '#ffb380',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});