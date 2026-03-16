// app/components/customer/CreateProductForm.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  Switch,
  Platform
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import AxiosInstance from '../../../contexts/axios';
import { useAuth } from '../../../contexts/AuthContext';

// --- INTERFACE DEFINITIONS ---

interface User {
  id: string;
  username: string;
}

interface Category {
  id: string;
  name: string;
  shop: string | null;
  user: User;
}

interface MediaPreview {
  file: any;
  preview: string;
  type: 'image' | 'video';
}

// Depreciation interface
interface Depreciation {
  originalPrice: number | '';
  usagePeriod: number | '';
  usageUnit: 'weeks' | 'months' | 'years';
  depreciationRate: number | '';
  calculatedPrice: number | '';
}

// Variant interface
interface Variant {
  id: string;
  title: string;
  price: number | '';
  compare_price?: number | '';
  quantity: number | '';
  sku_code?: string;
  image?: any | null;
  imagePreview?: string;
  length?: number | '';
  width?: number | '';
  height?: number | '';
  weight?: number | '';
  weight_unit?: 'g' | 'kg' | 'lb' | 'oz';
  critical_trigger?: number | '';
  is_active?: boolean;
  refundable?: boolean;
  // Depreciation fields
  depreciation: Depreciation;
  // Optional attributes for grouping/filtering
  attributes?: Record<string, string>;
}

interface PredictionResult {
  success?: boolean;
  predicted_category?: {
    category_name: string;
    confidence: number;
    category_uuid?: string | null;
  };
  alternative_categories?: Array<{ category_name: string; confidence: number }>;
  all_predictions?: Record<string, number>;
  predicted_class?: string;
  error?: string;
}

interface CreateProductFormProps {
  globalCategories: Category[];
  modelClasses: string[];
}

// Generate a simple UUID function
const generateId = () => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

// Condition options
const conditionOptions = [
  'Like New',
  'New',
  'Refurbished',
  'Used - Excellent',
  'Used - Good'
];

// Weight unit options
const weightUnitOptions = ['g', 'kg', 'lb', 'oz'];

// Usage unit options
const usageUnitOptions = [
  { label: 'Weeks', value: 'weeks' },
  { label: 'Months', value: 'months' },
  { label: 'Years', value: 'years' }
];

export default function CreateProductForm({ globalCategories, modelClasses }: CreateProductFormProps) {
  const { userId } = useAuth();

  // Form state
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productCondition, setProductCondition] = useState('');
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>('');
  const [productRefundable, setProductRefundable] = useState(true);

  // Media state
  const [mainMedia, setMainMedia] = useState<MediaPreview[]>([]);
  
  // Variants state
  const [variants, setVariants] = useState<Variant[]>([
    {
      id: generateId(),
      title: '', // Start empty, will be updated by productName
      price: '',
      quantity: '',
      sku_code: '',
      weight_unit: 'g',
      is_active: true,
      refundable: true,
      depreciation: {
        originalPrice: '',
        usagePeriod: '',
        usageUnit: 'months',
        depreciationRate: 10,
        calculatedPrice: '',
      }
    }
  ]);

  // UI state
  const [currentStep, setCurrentStep] = useState(1);
  const [expandedVariants, setExpandedVariants] = useState<Record<string, boolean>>({});
  const [expandedAdvanced, setExpandedAdvanced] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [conditionModalVisible, setConditionModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [weightUnitModalVisible, setWeightUnitModalVisible] = useState(false);
  const [usageUnitModalVisible, setUsageUnitModalVisible] = useState<{ visible: boolean; variantId: string | null }>({
    visible: false,
    variantId: null
  });

  // Prediction state
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);
  const [showPrediction, setShowPrediction] = useState(false);
  const [predictionError, setPredictionError] = useState<string | null>(null);

  // Update first variant title when product name changes - exactly like web version
  useEffect(() => {
    setVariants(prev => prev.map((variant, index) => 
      index === 0 ? { ...variant, title: productName || "Default" } : variant
    ));
  }, [productName]);

  // Calculate depreciated price
  const calculateDepreciatedPrice = (originalPrice: number, usagePeriod: number, usageUnit: string, depreciationRate: number): number => {
    if (!originalPrice || !usagePeriod || !depreciationRate) return originalPrice;
    
    // Convert usage period to years for calculation
    let years = usagePeriod;
    if (usageUnit === 'months') {
      years = usagePeriod / 12;
    } else if (usageUnit === 'weeks') {
      years = usagePeriod / 52;
    }
    
    // Calculate depreciated value: original * (1 - rate/100)^years
    const rate = depreciationRate / 100;
    const depreciatedValue = originalPrice * Math.pow((1 - rate), years);
    
    // Ensure price doesn't go below 0 and round to 2 decimal places
    return Math.max(0, Math.round(depreciatedValue * 100) / 100);
  };

  // Handle depreciation field changes
  const handleDepreciationChange = (variantId: string, field: keyof Depreciation, value: any) => {
    setVariants(prev => prev.map(v => {
      if (v.id === variantId) {
        const updatedDepreciation = {
          ...v.depreciation,
          [field]: value
        };
        
        // Calculate new price if all required fields are present
        if (updatedDepreciation.originalPrice && 
            updatedDepreciation.usagePeriod && 
            updatedDepreciation.depreciationRate) {
          
          const calculatedPrice = calculateDepreciatedPrice(
            Number(updatedDepreciation.originalPrice),
            Number(updatedDepreciation.usagePeriod),
            updatedDepreciation.usageUnit || 'months',
            Number(updatedDepreciation.depreciationRate)
          );
          
          updatedDepreciation.calculatedPrice = calculatedPrice;
          
          // Auto-update the variant price (read-only field)
          return {
            ...v,
            depreciation: updatedDepreciation,
            price: calculatedPrice
          };
        }
        
        return {
          ...v,
          depreciation: updatedDepreciation
        };
      }
      return v;
    }));
  };

  // Media handlers - Camera only
  const pickMedia = async () => {
    if (mainMedia.length >= 9) {
      Alert.alert('Limit Reached', 'Maximum 9 media files allowed');
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your camera');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const isVideo = asset.type?.startsWith('video') || false;
      const fileName = asset.uri.split('/').pop() || 'file';
      
      const newMedia = {
        file: {
          uri: asset.uri,
          name: fileName,
          type: isVideo ? 'video/mp4' : 'image/jpeg',
        },
        preview: asset.uri,
        type: isVideo ? 'video' : 'image' as 'image' | 'video',
      };

      setMainMedia(prev => [...prev, newMedia]);

      // Auto-analyze images for category prediction
      if (!isVideo) {
        analyzeImages([{
          uri: asset.uri,
          name: fileName,
          type: 'image/jpeg',
        }]);
      }
    }
  };

  const removeMedia = (index: number) => {
    setMainMedia(prev => prev.filter((_, i) => i !== index));
  };

  // Image-based prediction
  const analyzeImages = async (files: any[]) => {
    if (files.length === 0) return;

    setIsPredicting(true);
    setPredictionError(null);

    try {
      const requests = files.map((file) => {
        const formData = new FormData();
        formData.append('image', {
          uri: file.uri,
          name: file.name,
          type: file.type,
        } as any);
        
        return AxiosInstance.post('/predict/', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      });

      const settled = await Promise.allSettled(requests);
      const successful = settled.filter(s => s.status === 'fulfilled') as PromiseFulfilledResult<any>[];

      if (successful.length === 0) {
        setPredictionError('All image predictions failed');
        return;
      }

      const aggregateScores: Record<string, number> = {};
      let count = 0;

      successful.forEach(res => {
        const data = res.value?.data;
        if (!data || !data.success || !data.predictions) return;
        const p = data.predictions;

        if (p.all_predictions && typeof p.all_predictions === 'object') {
          Object.entries(p.all_predictions).forEach(([cls, score]) => {
            aggregateScores[cls] = (aggregateScores[cls] || 0) + Number(score || 0);
          });
        } else if (p.predicted_class) {
          const cls = String(p.predicted_class);
          const conf = Number(p.confidence || 1);
          aggregateScores[cls] = (aggregateScores[cls] || 0) + conf;
        }

        count += 1;
      });

      if (count === 0) {
        setPredictionError('No valid predictions received');
        return;
      }

      Object.keys(aggregateScores).forEach(k => { aggregateScores[k] = aggregateScores[k] / count; });

      const sorted = Object.entries(aggregateScores).sort((a, b) => b[1] - a[1]);
      const topClass = sorted[0]?.[0] || 'Unknown';
      const topConfidence = Number(sorted[0]?.[1] || 0);

      const mapped: PredictionResult = {
        success: true,
        predicted_category: {
          category_name: topClass,
          confidence: topConfidence,
          category_uuid: null
        },
        alternative_categories: sorted.slice(1, 4).map(s => ({ category_name: s[0], confidence: s[1] })),
        all_predictions: Object.fromEntries(sorted),
        predicted_class: topClass,
      };

      setPredictionResult(mapped);
      setShowPrediction(true);

      if (mapped.predicted_category?.category_name && globalCategories) {
        const predictedName = mapped.predicted_category.category_name.toLowerCase();
        const found = globalCategories.find((gc: any) => gc.name.toLowerCase() === predictedName);
        if (found) {
          setSelectedCategoryName(found.name);
        }
      }

    } catch (error: any) {
      setPredictionError('Prediction request failed');
      console.error('Image prediction failed:', error);
    } finally {
      setIsPredicting(false);
    }
  };

  // Variant handlers
  const addVariant = () => {
    setVariants(prev => [
      ...prev,
      {
        id: generateId(),
        title: `Variant ${prev.length + 1}`,
        price: '',
        quantity: '',
        sku_code: '',
        weight_unit: 'g',
        is_active: true,
        refundable: productRefundable,
        depreciation: {
          originalPrice: '',
          usagePeriod: '',
          usageUnit: 'months',
          depreciationRate: 10,
          calculatedPrice: '',
        }
      }
    ]);
  };

  const removeVariant = (variantId: string) => {
    if (variants.length <= 1) {
      Alert.alert('Cannot Remove', 'Products must have at least one variant');
      return;
    }
    
    setVariants(prev => prev.filter(v => v.id !== variantId));
  };

  const updateVariantField = (variantId: string, field: keyof Variant, value: any) => {
    if (field === 'price') {
      return; // Price is auto-calculated
    }
    
    setVariants(prev => prev.map(v => 
      v.id === variantId ? { ...v, [field]: value } : v
    ));
  };

  const handleVariantImagePick = async (variantId: string) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your camera');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      
      setVariants(prev => prev.map(v => 
        v.id === variantId ? { 
          ...v, 
          image: {
            uri: asset.uri,
            name: asset.uri.split('/').pop() || 'image.jpg',
            type: 'image/jpeg',
          },
          imagePreview: asset.uri 
        } : v
      ));
    }
  };

  const removeVariantImage = (variantId: string) => {
    setVariants(prev => prev.map(v => 
      v.id === variantId ? { ...v, image: null, imagePreview: undefined } : v
    ));
  };

  const toggleVariantExpand = (variantId: string) => {
    setExpandedVariants(prev => ({
      ...prev,
      [variantId]: !prev[variantId]
    }));
  };

  const toggleAdvancedExpand = (variantId: string) => {
    setExpandedAdvanced(prev => ({
      ...prev,
      [variantId]: !prev[variantId]
    }));
  };

  // Validation
  const validateForm = () => {
    if (!productName.trim()) {
      Alert.alert('Validation Error', 'Product name is required');
      return false;
    }
    if (productName.length < 2) {
      Alert.alert('Validation Error', 'Product name must be at least 2 characters');
      return false;
    }
    if (!productDescription.trim()) {
      Alert.alert('Validation Error', 'Description is required');
      return false;
    }
    if (productDescription.length < 10) {
      Alert.alert('Validation Error', 'Description must be at least 10 characters');
      return false;
    }
    if (!productCondition) {
      Alert.alert('Validation Error', 'Condition is required');
      return false;
    }
    if (variants.length === 0) {
      Alert.alert('Validation Error', 'At least one variant is required');
      return false;
    }

    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      if (!v.title) {
        Alert.alert('Validation Error', `Variant ${i + 1} title is required`);
        return false;
      }
      if (!v.depreciation.calculatedPrice) {
        Alert.alert('Validation Error', `Variant ${i + 1} must have all depreciation fields filled to calculate price`);
        return false;
      }
      if (!v.quantity || Number(v.quantity) <= 0) {
        Alert.alert('Validation Error', `Variant ${i + 1} quantity must be greater than 0`);
        return false;
      }
    }

    return true;
  };

  // Submit handler
  const handleSubmit = async () => {
    if (!validateForm()) return;
    if (!userId) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();

      // Basic fields
      formData.append('name', productName.trim());
      formData.append('description', productDescription.trim());
      formData.append('condition', productCondition);
      formData.append('status', 'active');
      formData.append('upload_status', 'draft');
      formData.append('customer_id', userId);

      // Handle category
      if (selectedCategoryName?.trim()) {
        const match = globalCategories.find(gc => gc.name.toLowerCase() === selectedCategoryName.toLowerCase());
        if (match) {
          formData.append('category_admin_id', match.id);
        } else {
          formData.append('category_admin_name', selectedCategoryName);
        }
      }

      // Add media files
      mainMedia.forEach((media, index) => {
        formData.append('media_files', {
          uri: media.file.uri,
          name: media.file.name,
          type: media.file.type,
        } as any);
      });

      // Prepare variants payload
      const variantsPayload = variants.map(v => ({
        id: v.id,
        title: v.title,
        price: v.price,
        compare_price: v.compare_price,
        quantity: v.quantity,
        length: v.length,
        width: v.width,
        height: v.height,
        weight: v.weight,
        weight_unit: v.weight_unit,
        sku_code: v.sku_code,
        critical_trigger: v.critical_trigger || null,
        refundable: v.refundable ?? productRefundable,
        is_refundable: v.refundable ?? productRefundable,
        is_active: v.is_active ?? true,
        original_price: v.depreciation.originalPrice,
        usage_period: v.depreciation.usagePeriod,
        usage_unit: v.depreciation.usageUnit,
        depreciation_rate: v.depreciation.depreciationRate,
        attributes: v.attributes || {},
      }));

      formData.append('variants', JSON.stringify(variantsPayload));

      // Add variant images
      variants.forEach(v => {
        if (v.image) {
          formData.append(`variant_image_${v.id}`, {
            uri: v.image.uri,
            name: v.image.name,
            type: v.image.type,
          } as any);
        }
      });

      const response = await AxiosInstance.post('/customer-products-viewset/create_product/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'X-User-Id': userId,
        },
      });

      if (response.data.success) {
        Alert.alert(
          'Success',
          'Product created successfully!',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/customer/product-listing')
            }
          ]
        );
      } else {
        setError(response.data.message || 'Product creation failed');
      }
    } catch (err: any) {
      console.error('Error creating product:', err);
      setError(err.response?.data?.error || err.message || 'Failed to create product');
    } finally {
      setSubmitting(false);
    }
  };

  const formatPrice = (price: number | ''): string => {
    if (typeof price === 'number') {
      return price.toFixed(2);
    }
    return '0.00';
  };

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 1:
        return productName.trim() && productDescription.trim() && productCondition;
      case 2:
        return true; // Media is optional
      case 3:
        return variants.length > 0 && variants.every(v => v.depreciation.calculatedPrice && v.quantity);
      default:
        return true;
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Progress Steps */}
      <View style={styles.progressContainer}>
        <TouchableOpacity 
          style={[styles.stepIndicator, currentStep >= 1 && styles.stepActive]} 
          onPress={() => setCurrentStep(1)}
        >
          <Text style={[styles.stepText, currentStep >= 1 && styles.stepTextActive]}>1</Text>
        </TouchableOpacity>
        <View style={[styles.stepLine, currentStep >= 2 && styles.stepLineActive]} />
        
        <TouchableOpacity 
          style={[styles.stepIndicator, currentStep >= 2 && styles.stepActive]} 
          onPress={() => currentStep >= 2 && setCurrentStep(2)}
          disabled={currentStep < 2}
        >
          <Text style={[styles.stepText, currentStep >= 2 && styles.stepTextActive]}>2</Text>
        </TouchableOpacity>
        <View style={[styles.stepLine, currentStep >= 3 && styles.stepLineActive]} />
        
        <TouchableOpacity 
          style={[styles.stepIndicator, currentStep >= 3 && styles.stepActive]} 
          onPress={() => currentStep >= 3 && setCurrentStep(3)}
          disabled={currentStep < 3}
        >
          <Text style={[styles.stepText, currentStep >= 3 && styles.stepTextActive]}>3</Text>
        </TouchableOpacity>
        <View style={[styles.stepLine, currentStep >= 4 && styles.stepLineActive]} />
        
        <View style={[styles.stepIndicator, currentStep >= 4 && styles.stepActive]}>
          <Text style={[styles.stepText, currentStep >= 4 && styles.stepTextActive]}>4</Text>
        </View>
      </View>

      <View style={styles.stepLabels}>
        <Text style={[styles.stepLabel, currentStep >= 1 && styles.stepLabelActive]}>Basic</Text>
        <Text style={[styles.stepLabel, currentStep >= 2 && styles.stepLabelActive]}>Media</Text>
        <Text style={[styles.stepLabel, currentStep >= 3 && styles.stepLabelActive]}>Variants</Text>
        <Text style={[styles.stepLabel, currentStep >= 4 && styles.stepLabelActive]}>Review</Text>
      </View>

      {/* STEP 1: Basic Information */}
      {currentStep === 1 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <MaterialIcons name="info" size={20} color="#F97316" />
            </View>
            <Text style={styles.sectionTitle}>Basic Information</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Product Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={productName}
              onChangeText={setProductName}
              placeholder="Enter product name"
              placeholderTextColor="#9CA3AF"
              maxLength={100}
            />
            <Text style={styles.hintText}>
              This will be used as the title for the first variant
            </Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Condition <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setConditionModalVisible(true)}
            >
              <Text style={productCondition ? styles.selectButtonText : styles.selectButtonPlaceholder}>
                {productCondition || 'Select condition'}
              </Text>
              <MaterialIcons name="arrow-drop-down" size={24} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Description <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={productDescription}
              onChangeText={setProductDescription}
              placeholder="Describe your product in detail..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              maxLength={1000}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
            style={[styles.nextButton, !canProceedToNextStep() && styles.nextButtonDisabled]}
            onPress={() => setCurrentStep(2)}
            disabled={!canProceedToNextStep()}
          >
            <Text style={styles.nextButtonText}>Next: Media</Text>
            <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* STEP 2: Media & Category */}
      {currentStep === 2 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <MaterialIcons name="photo-library" size={20} color="#F97316" />
            </View>
            <Text style={styles.sectionTitle}>Product Media</Text>
          </View>

          <View style={styles.mediaContainer}>
            <View style={styles.mediaHeader}>
              <Text style={styles.mediaLabel}>Take photos/videos (max 9)</Text>
              <Text style={styles.mediaCount}>{mainMedia.length}/9</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaScroll}>
              <TouchableOpacity style={styles.addMediaButton} onPress={pickMedia}>
                <MaterialIcons name="photo-camera" size={32} color="#9CA3AF" />
                <Text style={styles.addMediaText}>Take Photo</Text>
              </TouchableOpacity>

              {mainMedia.map((item, index) => (
                <View key={index} style={styles.mediaPreviewContainer}>
                  {item.type === 'image' ? (
                    <Image source={{ uri: item.preview }} style={styles.mediaPreview} />
                  ) : (
                    <View style={[styles.mediaPreview, styles.videoPreview]}>
                      <MaterialIcons name="play-circle-fill" size={32} color="#FFFFFF" />
                    </View>
                  )}
                  {index === 0 && (
                    <View style={styles.coverBadge}>
                      <Text style={styles.coverBadgeText}>Cover</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.removeMediaButton}
                    onPress={() => removeMedia(index)}
                  >
                    <MaterialIcons name="close" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* AI Category Prediction */}
          <View style={styles.aiSection}>
            <View style={styles.aiHeader}>
              <View style={styles.aiTitleContainer}>
                <MaterialIcons name="auto-awesome" size={20} color="#F97316" />
                <Text style={styles.aiTitle}>AI Category Prediction</Text>
              </View>
              {predictionResult && (
                <View style={styles.aiReadyBadge}>
                  <Text style={styles.aiReadyText}>Ready</Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[styles.analyzeButton, (mainMedia.length === 0 || isPredicting) && styles.analyzeButtonDisabled]}
              onPress={() => analyzeImages(mainMedia.filter(m => m.type === 'image').map(m => m.file))}
              disabled={mainMedia.length === 0 || isPredicting}
            >
              {isPredicting ? (
                <ActivityIndicator size="small" color="#F97316" />
              ) : (
                <>
                  <MaterialIcons name="analytics" size={20} color="#F97316" />
                  <Text style={styles.analyzeButtonText}>Analyze Images</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Category</Text>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => setCategoryModalVisible(true)}
              >
                <Text style={selectedCategoryName ? styles.selectButtonText : styles.selectButtonPlaceholder}>
                  {selectedCategoryName || 'Select category'}
                </Text>
                <MaterialIcons name="arrow-drop-down" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {predictionResult && predictionResult.predicted_category && (
              <View style={styles.predictionCard}>
                <Text style={styles.predictionTitle}>AI Suggestion</Text>
                <View style={styles.predictionRow}>
                  <Text style={styles.predictionCategory}>
                    {predictionResult.predicted_category.category_name}
                  </Text>
                  <Text style={styles.predictionConfidence}>
                    {Math.round((predictionResult.predicted_category.confidence || 0) * 100)}% confidence
                  </Text>
                </View>
                {predictionResult.alternative_categories && predictionResult.alternative_categories.length > 0 && (
                  <Text style={styles.alternativeText}>
                    Also considered: {predictionResult.alternative_categories.map(a => a.category_name).join(', ')}
                  </Text>
                )}
              </View>
            )}

            {predictionError && (
              <View style={styles.errorCard}>
                <Text style={styles.errorCardText}>{predictionError}</Text>
              </View>
            )}
          </View>

          <View style={styles.navigationButtons}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setCurrentStep(1)}
            >
              <MaterialIcons name="arrow-back" size={20} color="#6B7280" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.nextButton}
              onPress={() => setCurrentStep(3)}
            >
              <Text style={styles.nextButtonText}>Next: Variants</Text>
              <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* STEP 3: Variants */}
      {currentStep === 3 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <MaterialIcons name="layers" size={20} color="#F97316" />
            </View>
            <Text style={styles.sectionTitle}>Product Variants</Text>
          </View>

          {variants.map((variant, index) => (
            <View key={variant.id} style={styles.variantCard}>
              {/* Variant Header */}
              <TouchableOpacity 
                style={styles.variantHeader}
                onPress={() => toggleVariantExpand(variant.id)}
              >
                <View style={styles.variantHeaderLeft}>
                  <View style={styles.variantNumber}>
                    <Text style={styles.variantNumberText}>{index + 1}</Text>
                  </View>
                  <View>
                    <Text style={styles.variantTitle}>{variant.title}</Text>
                    {variant.depreciation.calculatedPrice && (
                      <Text style={styles.variantPrice}>₱{formatPrice(variant.depreciation.calculatedPrice)}</Text>
                    )}
                  </View>
                </View>
                <View style={styles.variantHeaderRight}>
                  {index === 0 && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>Default</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    onPress={() => removeVariant(variant.id)}
                    disabled={variants.length === 1}
                  >
                    <MaterialIcons 
                      name="close" 
                      size={20} 
                      color={variants.length === 1 ? '#D1D5DB' : '#EF4444'} 
                    />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>

              {expandedVariants[variant.id] && (
                <View style={styles.variantContent}>
                  {/* Variant Image */}
                  <View style={styles.variantImageSection}>
                    <View style={styles.variantImageContainer}>
                      {variant.imagePreview ? (
                        <>
                          <Image source={{ uri: variant.imagePreview }} style={styles.variantImage} />
                          <TouchableOpacity
                            style={styles.removeVariantImageButton}
                            onPress={() => removeVariantImage(variant.id)}
                          >
                            <MaterialIcons name="close" size={16} color="#FFFFFF" />
                          </TouchableOpacity>
                        </>
                      ) : (
                        <TouchableOpacity
                          style={styles.addVariantImageButton}
                          onPress={() => handleVariantImagePick(variant.id)}
                        >
                          <MaterialIcons name="photo-camera" size={24} color="#9CA3AF" />
                          <Text style={styles.addVariantImageText}>Take Photo</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <Text style={styles.variantImageHint}>Optional variant-specific image</Text>
                  </View>

                  {/* Basic Variant Fields */}
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>
                      Title <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                      style={[styles.input, index === 0 && styles.inputDisabled]}
                      value={variant.title}
                      onChangeText={(text) => {
                        if (index !== 0) {
                          updateVariantField(variant.id, 'title', text);
                        }
                      }}
                      placeholder="e.g., Small, Red, etc."
                      placeholderTextColor="#9CA3AF"
                      editable={index !== 0}
                    />
                    {index === 0 && (
                      <Text style={styles.hintText}>
                        First variant title is linked to product name
                      </Text>
                    )}
                  </View>

                  {/* Depreciation Section */}
                  <View style={styles.depreciationSection}>
                    <View style={styles.depreciationHeader}>
                      <MaterialIcons name="calculate" size={18} color="#F97316" />
                      <Text style={styles.depreciationTitle}>Price Depreciation Calculator</Text>
                      <View style={styles.autoBadge}>
                        <Text style={styles.autoBadgeText}>Auto</Text>
                      </View>
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Original Price</Text>
                      <View style={styles.priceInputContainer}>
                        <Text style={styles.currencySymbol}>₱</Text>
                        <TextInput
                          style={[styles.input, styles.priceInput]}
                          value={variant.depreciation.originalPrice?.toString() || ''}
                          onChangeText={(text) => handleDepreciationChange(variant.id, 'originalPrice', parseFloat(text) || '')}
                          keyboardType="numeric"
                          placeholder="0.00"
                          placeholderTextColor="#9CA3AF"
                        />
                      </View>
                    </View>

                    <View style={styles.row}>
                      <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                        <Text style={styles.label}>Usage Period</Text>
                        <TextInput
                          style={styles.input}
                          value={variant.depreciation.usagePeriod?.toString() || ''}
                          onChangeText={(text) => handleDepreciationChange(variant.id, 'usagePeriod', parseFloat(text) || '')}
                          keyboardType="numeric"
                          placeholder="0"
                          placeholderTextColor="#9CA3AF"
                        />
                      </View>
                      <View style={[styles.formGroup, { flex: 1 }]}>
                        <Text style={styles.label}>Unit</Text>
                        <TouchableOpacity
                          style={styles.selectButton}
                          onPress={() => setUsageUnitModalVisible({ visible: true, variantId: variant.id })}
                        >
                          <Text style={styles.selectButtonText}>
                            {variant.depreciation.usageUnit}
                          </Text>
                          <MaterialIcons name="arrow-drop-down" size={24} color="#9CA3AF" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Depreciation Rate (%)</Text>
                      <TextInput
                        style={styles.input}
                        value={variant.depreciation.depreciationRate?.toString() || ''}
                        onChangeText={(text) => handleDepreciationChange(variant.id, 'depreciationRate', parseFloat(text) || '')}
                        keyboardType="numeric"
                        placeholder="10"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={styles.label}>
                        Final Price <Text style={styles.required}>*</Text>
                      </Text>
                      <View style={[styles.priceInputContainer, styles.calculatedPriceContainer]}>
                        <Text style={styles.currencySymbol}>₱</Text>
                        <Text style={styles.calculatedPrice}>
                          {variant.depreciation.calculatedPrice ? formatPrice(variant.depreciation.calculatedPrice) : '0.00'}
                        </Text>
                      </View>
                    </View>

                    {variant.depreciation.calculatedPrice && (
                      <View style={styles.calculationInfo}>
                        <Text style={styles.calculationText}>
                          ₱{Number(variant.depreciation.originalPrice).toFixed(2)} × (1 - {variant.depreciation.depreciationRate}% ÷ 100)^{variant.depreciation.usagePeriod} {variant.depreciation.usageUnit}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>
                      Stock <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                      style={styles.input}
                      value={variant.quantity?.toString() || ''}
                      onChangeText={(text) => updateVariantField(variant.id, 'quantity', parseInt(text) || '')}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>SKU Code</Text>
                    <TextInput
                      style={styles.input}
                      value={variant.sku_code || ''}
                      onChangeText={(text) => updateVariantField(variant.id, 'sku_code', text)}
                      placeholder="Optional"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>

                  {/* Status Toggles */}
                  <View style={styles.toggleRow}>
                    <View style={styles.toggleContainer}>
                      <Text style={styles.toggleLabel}>Active</Text>
                      <Switch
                        value={variant.is_active !== false}
                        onValueChange={(value) => updateVariantField(variant.id, 'is_active', value)}
                        trackColor={{ false: '#E5E7EB', true: '#F97316' }}
                        thumbColor="#FFFFFF"
                      />
                    </View>
                    <View style={styles.toggleContainer}>
                      <Text style={styles.toggleLabel}>Refundable</Text>
                      <Switch
                        value={variant.refundable !== false}
                        onValueChange={(value) => updateVariantField(variant.id, 'refundable', value)}
                        trackColor={{ false: '#E5E7EB', true: '#F97316' }}
                        thumbColor="#FFFFFF"
                      />
                    </View>
                  </View>

                  {/* Advanced Options */}
                  <TouchableOpacity
                    style={styles.advancedToggle}
                    onPress={() => toggleAdvancedExpand(variant.id)}
                  >
                    <MaterialIcons 
                      name={expandedAdvanced[variant.id] ? "expand-less" : "expand-more"} 
                      size={20} 
                      color="#6B7280" 
                    />
                    <Text style={styles.advancedToggleText}>Additional Details</Text>
                    <View style={styles.optionalBadge}>
                      <Text style={styles.optionalBadgeText}>Optional</Text>
                    </View>
                  </TouchableOpacity>

                  {expandedAdvanced[variant.id] && (
                    <View style={styles.advancedContent}>
                      <View style={styles.row}>
                        <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                          <Text style={styles.label}>Weight</Text>
                          <TextInput
                            style={styles.input}
                            value={variant.weight?.toString() || ''}
                            onChangeText={(text) => updateVariantField(variant.id, 'weight', parseFloat(text) || '')}
                            keyboardType="numeric"
                            placeholder="0.00"
                            placeholderTextColor="#9CA3AF"
                          />
                        </View>
                        <View style={[styles.formGroup, { flex: 1 }]}>
                          <Text style={styles.label}>Unit</Text>
                          <TouchableOpacity
                            style={styles.selectButton}
                            onPress={() => setWeightUnitModalVisible(true)}
                          >
                            <Text style={styles.selectButtonText}>
                              {variant.weight_unit || 'g'}
                            </Text>
                            <MaterialIcons name="arrow-drop-down" size={24} color="#9CA3AF" />
                          </TouchableOpacity>
                        </View>
                      </View>

                      <View style={styles.formGroup}>
                        <Text style={styles.label}>Low Stock Alert</Text>
                        <TextInput
                          style={styles.input}
                          value={variant.critical_trigger?.toString() || ''}
                          onChangeText={(text) => updateVariantField(variant.id, 'critical_trigger', parseInt(text) || '')}
                          keyboardType="numeric"
                          placeholder="Alert when stock below"
                          placeholderTextColor="#9CA3AF"
                        />
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>
          ))}

          <TouchableOpacity style={styles.addVariantButton} onPress={addVariant}>
            <MaterialIcons name="add" size={20} color="#F97316" />
            <Text style={styles.addVariantButtonText}>Add Another Variant</Text>
          </TouchableOpacity>

          <View style={styles.variantSummary}>
            <Text style={styles.variantSummaryText}>
              Total Variants: {variants.length}
            </Text>
            <Text style={styles.variantSummaryText}>
              Total Stock: {variants.reduce((sum, v) => sum + (Number(v.quantity) || 0), 0)} units
            </Text>
          </View>

          <View style={styles.navigationButtons}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setCurrentStep(2)}
            >
              <MaterialIcons name="arrow-back" size={20} color="#6B7280" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.nextButton, !canProceedToNextStep() && styles.nextButtonDisabled]}
              onPress={() => setCurrentStep(4)}
              disabled={!canProceedToNextStep()}
            >
              <Text style={styles.nextButtonText}>Next: Review</Text>
              <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* STEP 4: Review & Submit */}
      {currentStep === 4 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <MaterialIcons name="check-circle" size={20} color="#F97316" />
            </View>
            <Text style={styles.sectionTitle}>Review & Submit</Text>
          </View>

          <View style={styles.reviewCard}>
            <Text style={styles.reviewCardTitle}>Product Summary</Text>
            
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Name:</Text>
              <Text style={styles.reviewValue}>{productName}</Text>
            </View>
            
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Condition:</Text>
              <Text style={styles.reviewValue}>{productCondition}</Text>
            </View>
            
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Category:</Text>
              <Text style={styles.reviewValue}>{selectedCategoryName || 'Not selected'}</Text>
            </View>
            
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Media:</Text>
              <Text style={styles.reviewValue}>{mainMedia.length} files</Text>
            </View>
            
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Variants:</Text>
              <Text style={styles.reviewValue}>{variants.length}</Text>
            </View>
            
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Total Stock:</Text>
              <Text style={styles.reviewValue}>
                {variants.reduce((sum, v) => sum + (Number(v.quantity) || 0), 0)} units
              </Text>
            </View>
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <MaterialIcons name="error-outline" size={20} color="#EF4444" />
              <Text style={styles.errorContainerText}>{error}</Text>
            </View>
          )}

          <View style={styles.navigationButtons}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setCurrentStep(3)}
            >
              <MaterialIcons name="arrow-back" size={20} color="#6B7280" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <MaterialIcons name="check" size={20} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>Create Product</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Condition Modal */}
      <Modal
        visible={conditionModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setConditionModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setConditionModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Condition</Text>
              <TouchableOpacity onPress={() => setConditionModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={conditionOptions}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setProductCondition(item);
                    setConditionModalVisible(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item}</Text>
                  {productCondition === item && (
                    <MaterialIcons name="check" size={20} color="#F97316" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Category Modal */}
      <Modal
        visible={categoryModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setCategoryModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity onPress={() => setCategoryModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={['Others', ...modelClasses]}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setSelectedCategoryName(item);
                    setCategoryModalVisible(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item}</Text>
                  {selectedCategoryName === item && (
                    <MaterialIcons name="check" size={20} color="#F97316" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Weight Unit Modal */}
      <Modal
        visible={weightUnitModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setWeightUnitModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setWeightUnitModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Weight Unit</Text>
              <TouchableOpacity onPress={() => setWeightUnitModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={weightUnitOptions}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setWeightUnitModalVisible(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Usage Unit Modal */}
      <Modal
        visible={usageUnitModalVisible.visible}
        transparent
        animationType="slide"
        onRequestClose={() => setUsageUnitModalVisible({ visible: false, variantId: null })}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setUsageUnitModalVisible({ visible: false, variantId: null })}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Time Unit</Text>
              <TouchableOpacity onPress={() => setUsageUnitModalVisible({ visible: false, variantId: null })}>
                <MaterialIcons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={usageUnitOptions}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    if (usageUnitModalVisible.variantId) {
                      handleDepreciationChange(usageUnitModalVisible.variantId, 'usageUnit', item.value);
                    }
                    setUsageUnitModalVisible({ visible: false, variantId: null });
                  }}
                >
                  <Text style={styles.modalItemText}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  stepIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepActive: {
    backgroundColor: '#F97316',
  },
  stepText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  stepTextActive: {
    color: '#FFFFFF',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 4,
  },
  stepLineActive: {
    backgroundColor: '#F97316',
  },
  stepLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  stepLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    width: 60,
    textAlign: 'center',
  },
  stepLabelActive: {
    color: '#F97316',
    fontWeight: '600',
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  required: {
    color: '#EF4444',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  hintText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
  inputDisabled: {
    backgroundColor: '#F3F4F6',
    color: '#9CA3AF',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  selectButtonText: {
    fontSize: 14,
    color: '#111827',
  },
  selectButtonPlaceholder: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  nextButton: {
    backgroundColor: '#F97316',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 8,
  },
  nextButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  backButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 14,
    gap: 8,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  mediaContainer: {
    marginBottom: 20,
  },
  mediaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mediaLabel: {
    fontSize: 14,
    color: '#374151',
  },
  mediaCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F97316',
  },
  mediaScroll: {
    flexDirection: 'row',
  },
  addMediaButton: {
    width: 100,
    height: 100,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: '#F9FAFB',
  },
  addMediaText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  mediaPreviewContainer: {
    position: 'relative',
    marginRight: 12,
  },
  mediaPreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  videoPreview: {
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: '#F97316',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  coverBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  removeMediaButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#EF4444',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  aiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  aiTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  aiReadyBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  aiReadyText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F97316',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  analyzeButtonDisabled: {
    borderColor: '#9CA3AF',
    opacity: 0.5,
  },
  analyzeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F97316',
  },
  predictionCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  predictionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0369A1',
    marginBottom: 4,
  },
  predictionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  predictionCategory: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0C4A6E',
  },
  predictionConfidence: {
    fontSize: 12,
    color: '#0369A1',
  },
  alternativeText: {
    fontSize: 11,
    color: '#0369A1',
    marginTop: 4,
  },
  errorCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  errorCardText: {
    fontSize: 12,
    color: '#991B1B',
  },
  variantCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    overflow: 'hidden',
  },
  variantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#F9FAFB',
  },
  variantHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  variantNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  variantNumberText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  variantTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  variantPrice: {
    fontSize: 12,
    color: '#F97316',
  },
  variantHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  defaultBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1E40AF',
  },
  variantContent: {
    padding: 16,
  },
  variantImageSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  variantImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 4,
  },
  variantImage: {
    width: '100%',
    height: '100%',
  },
  addVariantImageButton: {
    width: '100%',
    height: '100%',
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  addVariantImageText: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
  removeVariantImageButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#EF4444',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  variantImageHint: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  depreciationSection: {
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  depreciationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
    flexWrap: 'wrap',
  },
  depreciationTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0369A1',
  },
  autoBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  autoBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#1E40AF',
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  currencySymbol: {
    fontSize: 14,
    color: '#374151',
    paddingLeft: 12,
  },
  priceInput: {
    flex: 1,
    borderWidth: 0,
  },
  calculatedPriceContainer: {
    backgroundColor: '#F9FAFB',
  },
  calculatedPrice: {
    flex: 1,
    fontSize: 14,
    color: '#F97316',
    fontWeight: '600',
    paddingVertical: 12,
  },
  calculationInfo: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#E6F7FF',
    borderRadius: 6,
  },
  calculationText: {
    fontSize: 11,
    color: '#0369A1',
  },
  row: {
    flexDirection: 'row',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleLabel: {
    fontSize: 14,
    color: '#374151',
  },
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  advancedToggleText: {
    fontSize: 14,
    color: '#6B7280',
  },
  optionalBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  optionalBadgeText: {
    fontSize: 9,
    color: '#6B7280',
  },
  advancedContent: {
    marginTop: 12,
  },
  addVariantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#F97316',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
    gap: 8,
  },
  addVariantButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F97316',
  },
  variantSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  variantSummaryText: {
    fontSize: 13,
    color: '#4B5563',
  },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  reviewCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  reviewLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  reviewValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorContainerText: {
    flex: 1,
    fontSize: 13,
    color: '#991B1B',
  },
  submitButton: {
    flex: 2,
    backgroundColor: '#F97316',
    borderRadius: 8,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
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
    fontSize: 15,
    color: '#374151',
  },
});