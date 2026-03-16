// app/seller/components/CreateGiftForm.tsx
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

interface Variant {
  id: string;
  title: string;
  quantity: number | '';
  sku_code?: string;
  image?: any | null;
  imagePreview?: string;
  critical_trigger?: number | '';
  is_active?: boolean;
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

interface CreateGiftFormProps {
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

const guessMimeType = (uri: string) => {
  const ext = (uri.split('?')[0].match(/\.([a-zA-Z0-9]+)$/)?.[1] || 'jpg').toLowerCase();
  const map: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
  };
  return map[ext] || 'image/jpeg';
};

const normalizeUploadPart = (file: any, fallbackBase: string) => {
  const uri = String(file?.uri || '').trim();
  if (!uri) {
    return null;
  }

  const derivedName = uri.split('/').pop() || `${fallbackBase}_${Date.now()}.jpg`;
  const safeName = (String(file?.name || derivedName).trim() || derivedName).replace(/\s+/g, '_');
  const type = (typeof file?.type === 'string' && file.type.includes('/'))
    ? file.type
    : guessMimeType(uri);

  return { uri, name: safeName, type };
};

export default function CreateGiftForm({ 
  selectedShop, 
  globalCategories, 
  modelClasses,
  errors: externalErrors 
}: CreateGiftFormProps) {
  const { userId } = useAuth();

  // Form state
  const [giftName, setGiftName] = useState('');
  const [giftDescription, setGiftDescription] = useState('');
  const [giftCondition, setGiftCondition] = useState('');
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>('');

  // Critical stock trigger
  const [enableCriticalTrigger, setEnableCriticalTrigger] = useState(false);
  const [criticalStock, setCriticalStock] = useState<number | ''>('');

  // Media state
  const [mainMedia, setMainMedia] = useState<MediaPreview[]>([]);
  
  // Variants state
  const [variants, setVariants] = useState<Variant[]>([
    {
      id: generateId(),
      title: '',
      quantity: '',
      sku_code: '',
      is_active: true,
      critical_trigger: '',
    }
  ]);

  // UI state
  const [currentStep, setCurrentStep] = useState(1);
  const [expandedVariants, setExpandedVariants] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [conditionModalVisible, setConditionModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);

  // Prediction state
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);
  const [predictionError, setPredictionError] = useState<string | null>(null);
  const [apiResponseError, setApiResponseError] = useState<string | null>(null);
  const [apiResponseMessage, setApiResponseMessage] = useState<string | null>(null);
  const predictionAbortController = useRef<AbortController | null>(null);

  // Update first variant title when gift name changes
  useEffect(() => {
    setVariants(prev => prev.map((variant, index) => 
      index === 0 ? { ...variant, title: giftName || "Default" } : variant
    ));
  }, [giftName]);

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

  // Camera-only media picker
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
      const capturedImage = {
        uri: asset.uri,
        name: fileName,
        type: 'image/jpeg',
      };

      setTimeout(() => {
        analyzeImages([capturedImage]).catch(() => {
          // Keep media add flow non-blocking when AI prediction fails.
        });
      }, 0);
    }
  };

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

      let errorMsg = 'Prediction request failed';
      if (error.response?.status === 404) {
        errorMsg = 'Prediction endpoint not found.';
      } else if (error.response?.data?.error) {
        errorMsg = error.response.data.error;
      } else if (error.message) {
        errorMsg = error.message;
      }

      setPredictionError(errorMsg);
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
        quantity: '',
        sku_code: '',
        is_active: true,
        critical_trigger: '',
      }
    ]);
  };

  const removeVariant = (variantId: string) => {
    if (variants.length <= 1) {
      Alert.alert('Cannot Remove', 'Gifts must have at least one variant');
      return;
    }
    
    const variant = variants.find(v => v.id === variantId);
    if (variant?.imagePreview) {
      URL.revokeObjectURL(variant.imagePreview);
    }
    
    setVariants(prev => prev.filter(v => v.id !== variantId));
  };

  const updateVariantField = (variantId: string, field: keyof Variant, value: any) => {
    setVariants(prev => prev.map(v => v.id === variantId ? { ...v, [field]: value } : v));
  };

  // Camera-only for variant images
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
            name: asset.uri.split('/').pop() || `variant_${variantId}.jpg`,
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

  // Validation
  const validateForm = () => {
    if (!giftName.trim()) {
      Alert.alert('Validation Error', 'Gift name is required');
      return false;
    }
    if (giftName.length < 2) {
      Alert.alert('Validation Error', 'Gift name must be at least 2 characters');
      return false;
    }
    if (!giftDescription.trim()) {
      Alert.alert('Validation Error', 'Description is required');
      return false;
    }
    if (giftDescription.length < 10) {
      Alert.alert('Validation Error', 'Description must be at least 10 characters');
      return false;
    }
    if (!giftCondition) {
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
      formData.append('name', giftName.trim());
      formData.append('description', giftDescription.trim());
      formData.append('condition', giftCondition);
      formData.append('shop', selectedShop?.id ?? "");
      formData.append('status', "active");
      formData.append('customer_id', userId);
      
      // IMPORTANT: Set price to 0 for gifts
      formData.append('price', '0');
      
      // Set refundable to false for gifts
      formData.append('is_refundable', 'false');
      formData.append('refundable', 'false');
      
      // Set refund_days to 0
      formData.append('refund_days', '0');

      // Add critical stock if enabled
      if (enableCriticalTrigger && criticalStock) {
        formData.append('critical_stock', String(criticalStock));
      }

      // Category handling
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
        const uploadPart = normalizeUploadPart(file.file, 'media');
        if (uploadPart) {
          formData.append('media_files', uploadPart as any);
        }
      });

      // Add variants payload
      const variantsPayload = variants.map(v => ({
        id: v.id,
        title: v.title,
        quantity: v.quantity,
        sku_code: v.sku_code,
        critical_trigger: v.critical_trigger || null,
        is_active: v.is_active ?? true,
      }));

      formData.append('variants', JSON.stringify(variantsPayload));

      // Add variant images
      variants.forEach(v => {
        if (v.image) {
          const uploadPart = normalizeUploadPart(v.image, 'variant');
          if (uploadPart) {
            formData.append(`variant_image_${v.id}`, uploadPart as any);
          }
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
          'Gift created successfully!',
          [
            {
              text: 'OK',
              onPress: () => router.replace(`/seller/gifts?shopId=${selectedShop?.id}`)
            }
          ]
        );
      } else {
        throw new Error(response.data.message || 'Gift creation failed');
      }
    } catch (err: any) {
      console.error('Gift creation failed:', err.response?.data || err.message);
      
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
        setApiResponseError(err.message || 'Gift creation failed');
      }
    } finally {
      setSubmitting(false);
    }
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
        <Text style={[styles.stepBadgeText, currentStep >= 4 && styles.stepTextActive]}>4. Stock</Text>
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
              <Ionicons name="sparkles" size={20} color="#9333EA" />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Basic Information</Text>
              <Text style={styles.sectionSubtitle}>
                Start with gift details. AI will suggest a category when you upload images.
              </Text>
            </View>
          </View>

          {/* Shop Info */}
          {selectedShop && (
            <View style={styles.shopInfoCard}>
              <Ionicons name="storefront-outline" size={16} color="#9333EA" />
              <Text style={styles.shopInfoText}>Shop: {selectedShop.name}</Text>
            </View>
          )}

          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Gift Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={giftName}
              onChangeText={setGiftName}
              placeholder="Enter gift name"
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
              <Text style={giftCondition ? styles.selectButtonText : styles.placeholderText}>
                {giftCondition || 'Select condition'}
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
              value={giftDescription}
              onChangeText={setGiftDescription}
              placeholder="Describe your gift in detail..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              maxLength={1000}
              textAlignVertical="top"
            />
            {externalErrors.description && <Text style={styles.errorText}>{externalErrors.description}</Text>}
          </View>

          <TouchableOpacity
            style={styles.nextButton}
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
              <Ionicons name="images" size={20} color="#9333EA" />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Gift Media</Text>
              <Text style={styles.sectionSubtitle}>
                Take photos with your camera (max 9). First photo is the cover.
              </Text>
            </View>
          </View>

          <View style={styles.mediaContainer}>
            <View style={styles.mediaHeader}>
              <Text style={styles.mediaLabel}>Photos</Text>
              <View style={styles.mediaCount}>
                <Text style={styles.mediaCountText}>{mainMedia.length}/9</Text>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaScroll}>
              <TouchableOpacity style={styles.addMediaButton} onPress={pickMedia}>
                <Ionicons name="camera" size={32} color="#9CA3AF" />
                <Text style={styles.addMediaText}>Take Photo</Text>
              </TouchableOpacity>

              {mainMedia.map((item, index) => (
                <View key={index} style={styles.mediaItem}>
                  <Image source={{ uri: item.preview }} style={styles.mediaImage} />
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
            <Text style={styles.mediaHint}>Take photos with your camera (max 9). First photo is the cover.</Text>
          </View>

          {/* AI Analysis Section */}
          <View style={styles.aiSection}>
            <TouchableOpacity 
              style={styles.aiHeader}
              onPress={() => {}}
            >
              <View style={styles.aiTitleContainer}>
                <Ionicons name="sparkles" size={18} color="#9333EA" />
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
                  onPress={() => analyzeImages(mainMedia.map(m => m.file))}
                  disabled={mainMedia.length === 0 || isPredicting}
                >
                  {isPredicting ? (
                    <ActivityIndicator size="small" color="#9333EA" />
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
              style={styles.backButton}
              onPress={() => setCurrentStep(1)}
            >
              <Ionicons name="arrow-back" size={20} color="#6B7280" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.nextButton}
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
              <Ionicons name="cube" size={20} color="#9333EA" />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Gift Variants</Text>
              <Text style={styles.sectionSubtitle}>
                Each gift must have at least one variant with stock
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

                  {/* Variant Fields */}
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

                  {/* Critical Stock Trigger */}
                  <View style={styles.criticalStockSection}>
                    <View style={styles.criticalStockHeader}>
                      <Text style={styles.criticalStockTitle}>Critical Stock Trigger</Text>
                      <View style={styles.optionalBadgeSmall}>
                        <Text style={styles.optionalBadgeSmallText}>Optional</Text>
                      </View>
                    </View>
                    
                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Alert when stock falls below</Text>
                      <TextInput
                        style={styles.input}
                        value={variant.critical_trigger?.toString() || ''}
                        onChangeText={(text) => updateVariantField(variant.id, 'critical_trigger', parseInt(text) || '')}
                        keyboardType="numeric"
                        placeholder="e.g., 5"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                  </View>

                  {/* Status Toggle */}
                  <View style={styles.toggleRow}>
                    <View style={styles.toggleContainer}>
                      <Switch
                        value={variant.is_active !== false}
                        onValueChange={(value) => updateVariantField(variant.id, 'is_active', value)}
                        trackColor={{ false: '#E5E7EB', true: '#9333EA' }}
                      />
                      <Text style={styles.toggleLabel}>Active</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          ))}

          <TouchableOpacity style={styles.addVariantButton} onPress={addVariant}>
            <Ionicons name="add" size={20} color="#9333EA" />
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
              <Ionicons name="arrow-back" size={20} color="#6B7280" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.nextButton}
              onPress={() => setCurrentStep(4)}
            >
              <Text style={styles.nextButtonText}>Next: Stock</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* STEP 4: Stock Settings & Submit */}
      {currentStep === 4 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons name="warning" size={20} color="#9333EA" />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Stock Settings</Text>
              <Text style={styles.sectionSubtitle}>
                Configure global stock alerts for this gift
              </Text>
            </View>
          </View>

          <View style={styles.reviewCard}>
            <Text style={styles.reviewCardTitle}>Gift Summary</Text>
            
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Shop:</Text>
              <Text style={styles.reviewValue}>{selectedShop?.name || 'No shop'}</Text>
            </View>
            
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Name:</Text>
              <Text style={styles.reviewValue}>{giftName}</Text>
            </View>
            
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Condition:</Text>
              <Text style={styles.reviewValue}>{giftCondition}</Text>
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

            {enableCriticalTrigger && criticalStock && (
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Global Alert:</Text>
                <Text style={styles.reviewValue}>Below {criticalStock} units</Text>
              </View>
            )}
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
              onPress={() => router.back()}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
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
                  <Text style={styles.submitButtonText}>Create Gift</Text>
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
                    setGiftCondition(item);
                    setConditionModalVisible(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item}</Text>
                  {giftCondition === item && (
                    <Ionicons name="checkmark" size={20} color="#9333EA" />
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
                    <Ionicons name="checkmark" size={20} color="#9333EA" />
                  )}
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
    backgroundColor: '#9333EA',
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
    backgroundColor: '#9333EA',
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
    backgroundColor: '#FAF5FF',
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
    backgroundColor: '#FAF5FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  shopInfoText: {
    fontSize: 14,
    color: '#6B21A5',
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
  hintText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
  nextButton: {
    backgroundColor: '#9333EA',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 8,
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
  mediaItem: {
    position: 'relative',
    marginRight: 12,
  },
  mediaImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  coverBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: '#9333EA',
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
  mediaHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
    fontStyle: 'italic',
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
    borderColor: '#9333EA',
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
    color: '#9333EA',
  },
  predictionCard: {
    backgroundColor: '#FAF5FF',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  predictionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B21A5',
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
    color: '#4C1D95',
  },
  predictionConfidence: {
    fontSize: 12,
    color: '#6B21A5',
  },
  alternativeText: {
    fontSize: 11,
    color: '#6B21A5',
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
    backgroundColor: '#FAF5FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  requiredBadgeText: {
    fontSize: 12,
    color: '#6B21A5',
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
    backgroundColor: '#9333EA',
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
  variantHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  defaultBadge: {
    backgroundColor: '#FAF5FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B21A5',
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
  removeVariantImage: {
    position: 'absolute',
    top: -6,
    right: -6,
  },
  variantImageHint: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  criticalStockSection: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  criticalStockHeader: {
    marginBottom: 12,
  },
  criticalStockTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  criticalStockTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  optionalBadgeSmall: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  optionalBadgeSmallText: {
    fontSize: 9,
    color: '#6B7280',
  },
  toggleRow: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
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
  addVariantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#9333EA',
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
    color: '#9333EA',
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
    backgroundColor: '#9333EA',
    borderRadius: 8,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#C084FC',
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