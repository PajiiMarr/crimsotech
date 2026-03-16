// app/seller/components/CreateProductForm.tsx
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
import { Ionicons } from '@expo/vector-icons';
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

interface Shop {
  id: string;
  name: string;
  description: string;
  shop_picture?: string;
}

interface FormErrors {
  message?: string;
  name?: string;
  description?: string;
  condition?: string;
  category_admin_id?: string;
  [key: string]: string | undefined;
}

interface MediaPreview {
  file: any;
  preview: string;
  type: 'image' | 'video';
}

interface Depreciation {
  originalPrice: number | '';
  usagePeriod: number | '';
  usageUnit: 'weeks' | 'months' | 'years';
  depreciationRate: number | '';
  calculatedPrice: number | '';
}

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
  depreciation: Depreciation;
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
  selectedShop: Shop | null;
  globalCategories: Category[];
  modelClasses: string[];
  errors: FormErrors;
}

const generateId = () => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

const conditionOptions = [
  'Like New',
  'New',
  'Refurbished',
  'Used - Excellent',
  'Used - Good'
];

const weightUnitOptions = ['g', 'kg', 'lb', 'oz'];

const usageUnitOptions = [
  { label: 'Weeks', value: 'weeks' },
  { label: 'Months', value: 'months' },
  { label: 'Years', value: 'years' }
];

export default function CreateProductForm({ 
  selectedShop, 
  globalCategories, 
  modelClasses,
  errors: externalErrors 
}: CreateProductFormProps) {
  const { userId } = useAuth();
  const fetcher = { state: 'idle', data: null, submit: () => {} }; // Mock fetcher for now

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
      title: '',
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
  const [predictionError, setPredictionError] = useState<string | null>(null);
  const [apiResponseError, setApiResponseError] = useState<string | null>(null);
  const [apiResponseMessage, setApiResponseMessage] = useState<string | null>(null);
  const predictionAbortController = useRef<AbortController | null>(null);
  const fileInputRef = useRef<any>(null);

  // Update first variant title when product name changes
  useEffect(() => {
    setVariants(prev => prev.map((variant, index) => 
      index === 0 ? { ...variant, title: productName || "Default" } : variant
    ));
  }, [productName]);

  // Calculate depreciated price
  const calculateDepreciatedPrice = (originalPrice: number, usagePeriod: number, usageUnit: string, depreciationRate: number): number => {
    if (!originalPrice || !usagePeriod || !depreciationRate) return originalPrice;
    
    let years = usagePeriod;
    if (usageUnit === 'months') {
      years = usagePeriod / 12;
    } else if (usageUnit === 'weeks') {
      years = usagePeriod / 52;
    }
    
    const rate = depreciationRate / 100;
    const depreciatedValue = originalPrice * Math.pow((1 - rate), years);
    return Math.max(0, Math.round(depreciatedValue * 100) / 100);
  };

  const handleDepreciationChange = (variantId: string, field: keyof Depreciation, value: any) => {
    setVariants(prev => prev.map(v => {
      if (v.id === variantId) {
        const updatedDepreciation = {
          ...v.depreciation,
          [field]: value
        };
        
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

  const normalizeText = (s: string) => {
    return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean).join(' ');
  };

  const tokenSimilarity = (a: string, b: string) => {
    const ta = new Set(normalizeText(a).split(' '));
    const tb = new Set(normalizeText(b).split(' '));
    if (ta.size === 0 || tb.size === 0) return 0;
    const inter = [...ta].filter(x => tb.has(x)).length;
    const union = new Set([...ta, ...tb]).size;
    return union === 0 ? 0 : inter / union;
  };

  const findBestCategoryMatch = (predictedName: string) => {
    const scores = globalCategories.map((gc) => ({
      category: gc,
      score: tokenSimilarity(predictedName, gc.name),
    }));
    scores.sort((a, b) => b.score - a.score);
    return scores[0] || null;
  };

  const handleCategoryChange = (value: string) => {
    const stringValue = String(value).trim();
    
    if (stringValue === "none" || stringValue === "") {
      setSelectedCategoryName("");
      return;
    }

    if (stringValue === 'Others' || stringValue === 'others') {
      setSelectedCategoryName('others');
      return;
    }

    setSelectedCategoryName(stringValue);
  };

  // Media handlers
 // Camera-only media picker for main product media
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
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    quality: 0.8,
  });

  if (!result.canceled && result.assets[0]) {
    const asset = result.assets[0];
    const fileName = asset.uri.split('/').pop() || `photo_${Date.now()}.jpg`;
    
    const newMedia = {
      file: {
        uri: asset.uri,
        name: fileName,
        type: 'image/jpeg',
      },
      preview: asset.uri,
      type: 'image' as const,
    };

    setMainMedia(prev => [...prev, newMedia]);

    // Auto-analyze images for category prediction
    analyzeImages([{
      uri: asset.uri,
      name: fileName,
      type: 'image/jpeg',
    }]);
  }
};

// Camera-only for variant images


  const removeMainMedia = (index: number) => {
    setMainMedia(prev => prev.filter((_, i) => i !== index));
  };

  const analyzeImages = async (files: any[]) => {
    if (files.length === 0) return;

    if (predictionAbortController.current) {
      predictionAbortController.current.abort();
    }
    predictionAbortController.current = new AbortController();

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
          headers: { 'Content-Type': 'multipart/form-data' },
          signal: predictionAbortController.current!.signal,
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

      if (mapped.predicted_category?.category_name && globalCategories) {
        const predictedName = mapped.predicted_category.category_name.toLowerCase();
        const found = globalCategories.find((gc: any) => gc.name.toLowerCase() === predictedName);
        if (found) {
          setSelectedCategoryName(found.name);
        }
      }

    } catch (error: any) {
      if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
        return;
      }
      setPredictionError('Prediction request failed');
    } finally {
      setIsPredicting(false);
      predictionAbortController.current = null;
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (predictionAbortController.current) {
        predictionAbortController.current.abort();
      }
      mainMedia.forEach(item => URL.revokeObjectURL(item.preview));
      variants.forEach(variant => {
        if (variant.imagePreview) URL.revokeObjectURL(variant.imagePreview);
      });
    };
  }, []);

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
    
    const variant = variants.find(v => v.id === variantId);
    if (variant?.imagePreview) {
      URL.revokeObjectURL(variant.imagePreview);
    }
    
    setVariants(prev => prev.filter(v => v.id !== variantId));
  };

  const updateVariantField = (variantId: string, field: keyof Variant, value: any) => {
    if (field === 'price') return;
    setVariants(prev => prev.map(v => v.id === variantId ? { ...v, [field]: value } : v));
  };

  const handleVariantImagePick = async (variantId: string) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
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
    const variant = variants.find(v => v.id === variantId);
    if (variant?.imagePreview) {
      URL.revokeObjectURL(variant.imagePreview);
    }
    setVariants(prev => prev.map(v => v.id === variantId ? { ...v, image: null, imagePreview: undefined } : v));
  };

  const toggleVariantExpand = (variantId: string) => {
    setExpandedVariants(prev => ({ ...prev, [variantId]: !prev[variantId] }));
  };

  const toggleAdvancedExpand = (variantId: string) => {
    setExpandedAdvanced(prev => ({ ...prev, [variantId]: !prev[variantId] }));
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
    setApiResponseError(null);

    try {
      const formData = new FormData();

      // Basic fields
      formData.append('name', productName.trim());
      formData.append('description', productDescription.trim());
      formData.append('condition', productCondition);
      formData.append('shop', selectedShop?.id ?? "");
      formData.append('status', "active");
      formData.append('customer_id', userId);

      // Category handling - exactly like web version
      if (selectedCategoryName?.trim()) {
        let match = globalCategories.find(gc => gc.name.toLowerCase() === selectedCategoryName.toLowerCase());
        if (!match) {
          const best = findBestCategoryMatch(selectedCategoryName);
          if (best && best.score >= 0.25) {
            match = best.category;
          }
        }

        if (match) {
          formData.append('category_admin_id', match.id);
        } else {
          const nameToSend = (selectedCategoryName && selectedCategoryName.toLowerCase() === 'others') ? 'others' : selectedCategoryName;
          formData.append('category_admin_name', nameToSend);
        }
      }

      // Add media files
      mainMedia.forEach(file => {
        if (file.file.size > 0) {
          formData.append('media_files', {
            uri: file.file.uri,
            name: file.file.name,
            type: file.file.type,
          } as any);
        }
      });

      // Add variants payload
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

      const response = await AxiosInstance.post('/seller-products/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        Alert.alert(
          'Success',
          'Product created successfully!',
          [
            {
              text: 'OK',
              onPress: () => router.replace(`/seller/product-list?shopId=${selectedShop?.id}`)
            }
          ]
        );
      } else {
        throw new Error(response.data.message || 'Product creation failed');
      }
    } catch (err: any) {
      console.error('Product creation failed:', err.response?.data || err.message);
      
      if (err.response?.data) {
        const apiErrors = err.response.data;
        if (typeof apiErrors === 'object') {
          const fieldErrors = Object.keys(apiErrors).map(field => 
            `${field}: ${Array.isArray(apiErrors[field]) ? apiErrors[field][0] : apiErrors[field]}`
          ).join('\n');
          setApiResponseError(fieldErrors);
        } else if (typeof apiErrors === 'string') {
          setApiResponseError(apiErrors);
        }
      } else {
        setApiResponseError(err.message || 'Product creation failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const formatPrice = (price: number | ''): string => {
    return typeof price === 'number' ? price.toFixed(2) : '0.00';
  };

  // Progress step indicator
  const StepIndicator = () => (
    <View style={styles.progressContainer}>
      <View style={[styles.stepBadge, currentStep >= 1 && styles.stepActive]}>
        <Text style={[styles.stepBadgeText, currentStep >= 1 && styles.stepTextActive]}>1. Basic</Text>
      </View>
      <View style={[styles.stepLine, currentStep >= 2 && styles.stepLineActive]} />
      
      <View style={[styles.stepBadge, currentStep >= 2 && mainMedia.length > 0 ? styles.stepActive : styles.stepInactive]}>
        <Text style={[styles.stepBadgeText, currentStep >= 2 && mainMedia.length > 0 && styles.stepTextActive]}>2. Media</Text>
      </View>
      <View style={[styles.stepLine, currentStep >= 3 && styles.stepLineActive]} />
      
      <View style={[styles.stepBadge, currentStep >= 3 && styles.stepActive]}>
        <Text style={[styles.stepBadgeText, currentStep >= 3 && styles.stepTextActive]}>3. Variants</Text>
      </View>
      <View style={[styles.stepLine, currentStep >= 4 && styles.stepLineActive]} />
      
      <View style={[styles.stepBadge, currentStep >= 4 && styles.stepActive]}>
        <Text style={[styles.stepBadgeText, currentStep >= 4 && styles.stepTextActive]}>4. Details</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StepIndicator />

      {/* STEP 1: Basic Information */}
      {currentStep === 1 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons name="sparkles" size={20} color="#3B82F6" />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Basic Information</Text>
              <Text style={styles.sectionSubtitle}>
                Start with product details. AI will suggest a category when you upload images.
              </Text>
            </View>
          </View>

          {/* Shop Info */}
          {selectedShop && (
            <View style={styles.shopInfoCard}>
              <Ionicons name="storefront-outline" size={16} color="#3B82F6" />
              <Text style={styles.shopInfoText}>Shop: {selectedShop.name}</Text>
            </View>
          )}

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
            {externalErrors.name && <Text style={styles.errorText}>{externalErrors.name}</Text>}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Condition <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setConditionModalVisible(true)}
            >
              <Text style={productCondition ? styles.selectButtonText : styles.placeholderText}>
                {productCondition || 'Select condition'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
            </TouchableOpacity>
            {externalErrors.condition && <Text style={styles.errorText}>{externalErrors.condition}</Text>}
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
            {externalErrors.description && <Text style={styles.errorText}>{externalErrors.description}</Text>}
          </View>

          <TouchableOpacity
            style={[styles.nextButton, styles.singleStepButton]}
            onPress={() => setCurrentStep(2)}
          >
            <Text style={styles.nextButtonText}>Next: Media</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* STEP 2: Media & Category */}
      {currentStep === 2 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons name="images" size={20} color="#3B82F6" />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Product Media</Text>
              <Text style={styles.sectionSubtitle}>
                Upload images/videos (max 9). First image is the cover.
              </Text>
            </View>
          </View>

          <View style={styles.mediaContainer}>
            <View style={styles.mediaHeader}>
              <Text style={styles.mediaLabel}>Media Files</Text>
              <View style={styles.mediaCount}>
                <Text style={styles.mediaCountText}>{mainMedia.length}/9</Text>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaScroll}>
             {/* In the Media section, update the add media button text */}
<TouchableOpacity style={styles.addMediaButton} onPress={pickMedia}>
  <Ionicons name="camera" size={32} color="#9CA3AF" />
  <Text style={styles.addMediaText}>Take Photo</Text>
</TouchableOpacity>

{/* Update the hint text */}
<Text style={styles.mediaHint}>Take photos with your camera (max 9). First photo is the cover.</Text>

              {mainMedia.map((item, index) => (
                <View key={index} style={styles.mediaItem}>
                  {item.type === 'image' ? (
                    <Image source={{ uri: item.preview }} style={styles.mediaImage} />
                  ) : (
                    <View style={[styles.mediaImage, styles.videoPreview]}>
                      <Ionicons name="videocam" size={24} color="#FFFFFF" />
                    </View>
                  )}
                  {index === 0 && (
                    <View style={styles.coverBadge}>
                      <Text style={styles.coverBadgeText}>Cover</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.removeMediaButton}
                    onPress={() => removeMainMedia(index)}
                  >
                    <Ionicons name="close-circle" size={22} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* AI Analysis Section */}
          <View style={styles.aiSection}>
            <TouchableOpacity 
              style={styles.aiHeader}
              onPress={() => {}}
            >
              <View style={styles.aiTitleContainer}>
                <Ionicons name="sparkles" size={18} color="#3B82F6" />
                <Text style={styles.aiTitle}>AI Category Prediction</Text>
              </View>
              {predictionResult && (
                <View style={styles.aiReadyBadge}>
                  <Text style={styles.aiReadyText}>Ready</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.aiContent}>
              <View style={styles.aiRow}>
                <Text style={styles.aiDescription}>Analyze images to get AI category suggestions</Text>
                <TouchableOpacity
                  style={[styles.analyzeButton, (mainMedia.length === 0 || isPredicting) && styles.analyzeButtonDisabled]}
                  onPress={() => analyzeImages(mainMedia.filter(m => m.type === 'image').map(m => m.file))}
                  disabled={mainMedia.length === 0 || isPredicting}
                >
                  {isPredicting ? (
                    <ActivityIndicator size="small" color="#3B82F6" />
                  ) : (
                    <Text style={styles.analyzeButtonText}>
                      {isPredicting ? 'Analyzing...' : 'Analyze Images'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Category</Text>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => setCategoryModalVisible(true)}
                >
                  <Text style={selectedCategoryName ? styles.selectButtonText : styles.placeholderText}>
                    {selectedCategoryName || 'Select category'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
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
          </View>

          <View style={styles.navigationButtons}>
            <TouchableOpacity
              style={[styles.backButton, styles.navButton]}
              onPress={() => setCurrentStep(1)}
            >
              <Ionicons name="arrow-back" size={20} color="#6B7280" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.nextButton, styles.navButton]}
              onPress={() => setCurrentStep(3)}
            >
              <Text style={styles.nextButtonText}>Next: Variants</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* STEP 3: Variants */}
      {currentStep === 3 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons name="cube" size={20} color="#3B82F6" />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Product Variants</Text>
              <Text style={styles.sectionSubtitle}>
                Each product must have at least one variant with price and stock
              </Text>
            </View>
          </View>

          <View style={styles.requiredBadge}>
            <Text style={styles.requiredBadgeText}>Required</Text>
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
                    <Ionicons 
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
                  {/* In the variant image section */}
<View style={styles.variantImageSection}>
  <View style={styles.variantImageContainer}>
    {variant.imagePreview ? (
      <>
        <Image source={{ uri: variant.imagePreview }} style={styles.variantImage} />
        <TouchableOpacity
          style={styles.removeVariantImage}
          onPress={() => removeVariantImage(variant.id)}
        >
          <Ionicons name="close-circle" size={20} color="#EF4444" />
        </TouchableOpacity>
      </>
    ) : (
      <TouchableOpacity
        style={styles.addVariantImage}
        onPress={() => handleVariantImagePick(variant.id)}
      >
        <Ionicons name="camera" size={24} color="#9CA3AF" />
        <Text style={styles.addVariantImageText}>Take Photo</Text>
      </TouchableOpacity>
    )}
  </View>
  <Text style={styles.variantImageHint}>Take a photo for this variant (optional)</Text>
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
                  </View>

                  <View style={styles.row}>
                    <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                      <Text style={styles.label}>
                        Final Price <Text style={styles.required}>*</Text>
                      </Text>
                      <View style={styles.priceInputContainer}>
                        <Text style={styles.currencySymbol}>₱</Text>
                        <TextInput
                          style={[styles.priceInput, styles.inputDisabled]}
                          value={variant.price ? variant.price.toString() : ''}
                          editable={false}
                          placeholder="Auto-calculated"
                          placeholderTextColor="#9CA3AF"
                        />
                      </View>
                      {variant.depreciation.calculatedPrice && (
                        <View style={styles.autoBadge}>
                          <Text style={styles.autoBadgeText}>Auto</Text>
                        </View>
                      )}
                    </View>

                    <View style={[styles.formGroup, { flex: 1 }]}>
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

                  {/* Depreciation Section */}
                  <View style={styles.depreciationSection}>
                    <View style={styles.depreciationHeader}>
                      <Ionicons name="calculator" size={16} color="#3B82F6" />
                      <Text style={styles.depreciationTitle}>Price Depreciation Calculator</Text>
                      <View style={styles.autoBadgeSmall}>
                        <Text style={styles.autoBadgeSmallText}>Auto-calculates final price</Text>
                      </View>
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Original Price</Text>
                      <View style={styles.priceInputContainer}>
                        <Text style={styles.currencySymbol}>₱</Text>
                        <TextInput
                          style={styles.priceInput}
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
                          <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Rate (%)</Text>
                      <TextInput
                        style={styles.input}
                        value={variant.depreciation.depreciationRate?.toString() || ''}
                        onChangeText={(text) => handleDepreciationChange(variant.id, 'depreciationRate', parseFloat(text) || '')}
                        keyboardType="numeric"
                        placeholder="10"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>

                    {variant.depreciation.originalPrice && variant.depreciation.usagePeriod && variant.depreciation.depreciationRate && (
                      <View style={styles.calculationInfo}>
                        <Text style={styles.calculationText}>
                          ₱{Number(variant.depreciation.originalPrice).toFixed(2)} × 
                          (1 - {variant.depreciation.depreciationRate}% ÷ 100)^{variant.depreciation.usagePeriod} {variant.depreciation.usageUnit} = 
                          <Text style={styles.calculationResult}> ₱{formatPrice(variant.depreciation.calculatedPrice || 0)}</Text>
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Status Toggles */}
                  <View style={styles.toggleRow}>
                    <View style={styles.toggleContainer}>
                      <Switch
                        value={variant.is_active !== false}
                        onValueChange={(value) => updateVariantField(variant.id, 'is_active', value)}
                        trackColor={{ false: '#E5E7EB', true: '#3B82F6' }}
                      />
                      <Text style={styles.toggleLabel}>Active</Text>
                    </View>
                    <View style={styles.toggleContainer}>
                      <Switch
                        value={variant.refundable !== false}
                        onValueChange={(value) => updateVariantField(variant.id, 'refundable', value)}
                        trackColor={{ false: '#E5E7EB', true: '#3B82F6' }}
                      />
                      <Text style={styles.toggleLabel}>Refundable</Text>
                    </View>
                  </View>

                  {/* Advanced Options */}
                  <TouchableOpacity
                    style={styles.advancedToggle}
                    onPress={() => toggleAdvancedExpand(variant.id)}
                  >
                    <Ionicons 
                      name={expandedAdvanced[variant.id] ? "chevron-up" : "chevron-down"} 
                      size={16} 
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
                          <View style={styles.row}>
                            <TextInput
                              style={[styles.input, { flex: 1, marginRight: 4 }]}
                              value={variant.weight?.toString() || ''}
                              onChangeText={(text) => updateVariantField(variant.id, 'weight', parseFloat(text) || '')}
                              keyboardType="numeric"
                              placeholder="0.00"
                              placeholderTextColor="#9CA3AF"
                            />
                            <TouchableOpacity
                              style={[styles.selectButton, { width: 60 }]}
                              onPress={() => setWeightUnitModalVisible(true)}
                            >
                              <Text style={styles.selectButtonText}>
                                {variant.weight_unit || 'g'}
                              </Text>
                              <Ionicons name="chevron-down" size={14} color="#9CA3AF" />
                            </TouchableOpacity>
                          </View>
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
            <Ionicons name="add" size={20} color="#3B82F6" />
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
              style={[styles.backButton, styles.navButton]}
              onPress={() => setCurrentStep(2)}
            >
              <Ionicons name="arrow-back" size={20} color="#6B7280" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.nextButton, styles.navButton]}
              onPress={() => setCurrentStep(4)}
            >
              <Text style={styles.nextButtonText}>Next: Details</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* STEP 4: Details & Submit */}
      {currentStep === 4 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Review & Submit</Text>
              <Text style={styles.sectionSubtitle}>
                Review your product details before creating
              </Text>
            </View>
          </View>

          <View style={styles.reviewCard}>
            <Text style={styles.reviewCardTitle}>Product Summary</Text>
            
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Shop:</Text>
              <Text style={styles.reviewValue}>{selectedShop?.name || 'No shop'}</Text>
            </View>
            
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

          {apiResponseError && (
            <View style={styles.apiErrorContainer}>
              <Ionicons name="alert-circle" size={20} color="#EF4444" />
              <Text style={styles.apiErrorText}>{apiResponseError}</Text>
            </View>
          )}

          {apiResponseMessage && (
            <View style={styles.apiSuccessContainer}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.apiSuccessText}>{apiResponseMessage}</Text>
            </View>
          )}

          <View style={styles.submitContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setCurrentStep(3)}
            >
              <Text style={styles.cancelButtonText}>Back</Text>
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
                  <Ionicons name="checkmark" size={20} color="#FFFFFF" />
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
                <Ionicons name="close" size={24} color="#374151" />
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
                    <Ionicons name="checkmark" size={20} color="#3B82F6" />
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
                <Ionicons name="close" size={24} color="#374151" />
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
                    <Ionicons name="checkmark" size={20} color="#3B82F6" />
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
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={weightUnitOptions}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => setWeightUnitModalVisible(false)}
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
                <Ionicons name="close" size={24} color="#374151" />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  stepBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  stepActive: {
    backgroundColor: '#3B82F6',
  },
  stepInactive: {
    backgroundColor: '#F3F4F6',
  },
  stepBadgeText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#6B7280',
  },
  stepTextActive: {
    color: '#FFFFFF',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 4,
  },
  stepLineActive: {
    backgroundColor: '#3B82F6',
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  shopInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  shopInfoText: {
    fontSize: 14,
    color: '#1E40AF',
    fontWeight: '500',
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
  placeholderText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  nextButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    minHeight: 50,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  singleStepButton: {
    marginTop: 20,
  },
  nextButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  navButton: {
    flex: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    minHeight: 50,
    paddingHorizontal: 14,
    gap: 8,
    backgroundColor: '#FFFFFF',
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
    fontWeight: '500',
    color: '#374151',
  },
  mediaCount: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  mediaCountText: {
    fontSize: 12,
    color: '#6B7280',
  },
  mediaScroll: {
    flexDirection: 'row',
  },
  // Add these to your StyleSheet
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
mediaHint: {
  fontSize: 12,
  color: '#6B7280',
  marginTop: 8,
  fontStyle: 'italic',
},
addVariantImage: {
  width: 80,
  height: 80,
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
variantImageHint: {
  fontSize: 11,
  color: '#9CA3AF',
  marginTop: 4,
},
  mediaItem: {
    position: 'relative',
    marginRight: 12,
  },
  mediaImage: {
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
    backgroundColor: '#3B82F6',
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
  },
  aiSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 20,
    overflow: 'hidden',
  },
  aiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
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
  aiContent: {
    padding: 16,
  },
  aiRow: {
    marginBottom: 16,
  },
  aiDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  analyzeButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  analyzeButtonDisabled: {
    borderColor: '#9CA3AF',
    opacity: 0.5,
  },
  analyzeButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#3B82F6',
  },
  predictionCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  predictionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E40AF',
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
    color: '#1E3A8A',
  },
  predictionConfidence: {
    fontSize: 12,
    color: '#2563EB',
  },
  alternativeText: {
    fontSize: 11,
    color: '#2563EB',
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
  requiredBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  requiredBadgeText: {
    fontSize: 12,
    color: '#1E40AF',
    fontWeight: '500',
  },
  variantCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    backgroundColor: '#3B82F6',
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
    color: '#3B82F6',
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
    position: 'relative',
    marginBottom: 4,
  },
  variantImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
 
  removeVariantImage: {
    position: 'absolute',
    top: -6,
    right: -6,
  },
  row: {
    flexDirection: 'row',
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
    paddingVertical: 12,
    paddingRight: 12,
    fontSize: 14,
    color: '#111827',
  },
  autoBadge: {
    position: 'absolute',
    top: -8,
    right: 8,
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
  depreciationSection: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  depreciationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  depreciationTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E40AF',
  },
  autoBadgeSmall: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  autoBadgeSmallText: {
    fontSize: 9,
    color: '#1E40AF',
  },
  calculationInfo: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  calculationText: {
    fontSize: 11,
    color: '#374151',
  },
  calculationResult: {
    fontWeight: '600',
    color: '#3B82F6',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
    borderColor: '#3B82F6',
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
    color: '#3B82F6',
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
    borderColor: '#E5E7EB',
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
  apiErrorContainer: {
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
  apiErrorText: {
    flex: 1,
    fontSize: 13,
    color: '#991B1B',
  },
  apiSuccessContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  apiSuccessText: {
    flex: 1,
    fontSize: 13,
    color: '#166534',
  },
  submitContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  submitButton: {
    flex: 2,
    backgroundColor: '#3B82F6',
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
    borderBottomColor: '#E5E7EB',
  },
  modalItemText: {
    fontSize: 15,
    color: '#374151',
  },
});