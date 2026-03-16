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

// Variant interface - no price fields
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

export default function CreateGiftForm({ globalCategories, modelClasses }: CreateGiftFormProps) {
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
  
  // Variants state - no price fields
  const [variants, setVariants] = useState<Variant[]>([
    {
      id: generateId(),
      title: giftName || "Default",
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
  const [showPrediction, setShowPrediction] = useState(false);
  const [predictionError, setPredictionError] = useState<string | null>(null);

  // Update first variant title when gift name changes
  useEffect(() => {
    setVariants(prev => prev.map((variant, index) => 
      index === 0 ? { ...variant, title: giftName || "Default" } : variant
    ));
  }, [giftName]);

  // Normalize text for category matching
  const normalizeText = (s: string) => {
    return s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .join(' ');
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

  // Media handlers
  // Replace the existing pickMedia function with this camera version
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
      const capturedImage = {
        uri: asset.uri,
        name: fileName,
        type: 'image/jpeg',
      };

      analyzeImages([capturedImage]).catch(() => {
        // Keep media add flow non-blocking when AI prediction fails.
      });
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
      const noCategoriesYet = String(error?.response?.data?.error || error?.response?.data || '')
        .toLowerCase()
        .includes('no categories found in database');

      setPredictionError(
        noCategoriesYet
          ? 'AI prediction is temporarily unavailable. Please choose a category manually.'
          : 'Prediction request failed'
      );
      console.warn('Image prediction unavailable:', error?.message || error);
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
    
    setVariants(prev => prev.filter(v => v.id !== variantId));
  };

  const updateVariantField = (variantId: string, field: keyof Variant, value: any) => {
    setVariants(prev => prev.map(v => 
      v.id === variantId ? { ...v, [field]: value } : v
    ));
  };

// Replace the existing handleVariantImagePick function with this camera version
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

    try {
      const formData = new FormData();

      // Basic fields
      formData.append('name', giftName.trim());
      formData.append('description', giftDescription.trim());
      formData.append('condition', giftCondition);
      formData.append('status', 'active');
      formData.append('upload_status', 'draft');
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
      mainMedia.forEach((media) => {
        formData.append('media_files', {
          uri: media.file.uri,
          name: media.file.name,
          type: media.file.type,
        } as any);
      });

      // Prepare variants payload - no price fields
      const variantsPayload = variants.map(v => ({
        id: v.id,
        title: v.title,
        quantity: v.quantity,
        sku_code: v.sku_code,
        critical_trigger: v.critical_trigger || null,
        is_active: v.is_active ?? true,
        // Set price to 0 for all variants
        price: 0,
        compare_price: null,
        is_refundable: false,
        refundable: false,
        refund_days: 0
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
          'Gift created successfully!',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/customer/comgift')
            }
          ]
        );
      } else {
        setError(response.data.message || 'Gift creation failed');
      }
    } catch (err: any) {
      console.error('Error creating gift:', err);
      setError(err.response?.data?.error || err.message || 'Failed to create gift');
    } finally {
      setSubmitting(false);
    }
  };

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 1:
        return giftName.trim() && giftDescription.trim() && giftCondition;
      case 2:
        return true; // Media is optional
      case 3:
        return variants.length > 0 && variants.every(v => v.quantity);
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
        <Text style={[styles.stepLabel, currentStep >= 4 && styles.stepLabelActive]}>Stock</Text>
      </View>

      {/* STEP 1: Basic Information */}
      {currentStep === 1 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <MaterialIcons name="info" size={20} color="#8B5CF6" />
            </View>
            <Text style={styles.sectionTitle}>Basic Information</Text>
          </View>

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
              <Text style={giftCondition ? styles.selectButtonText : styles.selectButtonPlaceholder}>
                {giftCondition || 'Select condition'}
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
              value={giftDescription}
              onChangeText={setGiftDescription}
              placeholder="Describe your gift in detail..."
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
              <MaterialIcons name="photo-library" size={20} color="#8B5CF6" />
            </View>
            <Text style={styles.sectionTitle}>Gift Media</Text>
          </View>

          <View style={styles.mediaContainer}>
            <View style={styles.mediaHeader}>
              <Text style={styles.mediaLabel}>Upload images/videos (max 9)</Text>
              <Text style={styles.mediaCount}>{mainMedia.length}/9</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaScroll}>
              <TouchableOpacity style={styles.addMediaButton} onPress={pickMedia}>
                <MaterialIcons name="photo-camera" size={32} color="#9CA3AF" /> {/* Changed icon */}
                <Text style={styles.addMediaText}>Take Photo</Text> {/* Changed text */}
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
                <MaterialIcons name="auto-awesome" size={20} color="#8B5CF6" />
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
                <ActivityIndicator size="small" color="#8B5CF6" />
              ) : (
                <>
                  <MaterialIcons name="analytics" size={20} color="#8B5CF6" />
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

      {/* STEP 3: Gift Variants */}
      {currentStep === 3 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <MaterialIcons name="layers" size={20} color="#8B5CF6" />
            </View>
            <Text style={styles.sectionTitle}>Gift Variants</Text>
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
                        <MaterialIcons name="photo-camera" size={24} color="#9CA3AF" /> {/* Changed icon */}
                        <Text style={styles.addVariantImageText}>Take Photo</Text> {/* Changed text */}
                        </TouchableOpacity>
                      )}
                    </View>
                    <Text style={styles.variantImageHint}>Optional variant-specific image</Text>
                  </View>

                  {/* Main Variant Fields */}
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
                        First variant title is linked to gift name
                      </Text>
                    )}
                  </View>
                  
                  {/* Quantity */}
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

                  {/* SKU Code */}
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
                      <View style={styles.optionalBadge}>
                        <Text style={styles.optionalBadgeText}>Optional</Text>
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
                      <Text style={styles.toggleLabel}>Active</Text>
                      <Switch
                        value={variant.is_active !== false}
                        onValueChange={(value) => updateVariantField(variant.id, 'is_active', value)}
                        trackColor={{ false: '#E5E7EB', true: '#8B5CF6' }}
                        thumbColor="#FFFFFF"
                      />
                    </View>
                  </View>
                </View>
              )}
            </View>
          ))}

          <TouchableOpacity style={styles.addVariantButton} onPress={addVariant}>
            <MaterialIcons name="add" size={20} color="#8B5CF6" />
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
              <Text style={styles.nextButtonText}>Next: Stock</Text>
              <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* STEP 4: Stock & Submit */}
      {currentStep === 4 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <MaterialIcons name="inventory" size={20} color="#8B5CF6" />
            </View>
            <Text style={styles.sectionTitle}>Stock Settings</Text>
          </View>

          {/* Global Critical Stock Trigger */}
          <View style={styles.globalCriticalStock}>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Enable Critical Stock Alert</Text>
              <Switch
                value={enableCriticalTrigger}
                onValueChange={setEnableCriticalTrigger}
                trackColor={{ false: '#E5E7EB', true: '#8B5CF6' }}
                thumbColor="#FFFFFF"
              />
            </View>

            {enableCriticalTrigger && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Global Critical Stock Level</Text>
                <TextInput
                  style={styles.input}
                  value={criticalStock?.toString() || ''}
                  onChangeText={(text) => setCriticalStock(parseInt(text) || '')}
                  keyboardType="numeric"
                  placeholder="Enter stock level for alerts"
                  placeholderTextColor="#9CA3AF"
                />
                <Text style={styles.hintText}>
                  This will apply to all variants that don't have their own trigger
                </Text>
              </View>
            )}
          </View>

          {/* Submit Button */}
          <View style={styles.submitSection}>
            <Text style={styles.submitTitle}>Ready to create your gift?</Text>
            <Text style={styles.submitSubtitle}>Create a personal gift listing (no shop required)</Text>

            {error && (
              <View style={styles.errorContainer}>
                <MaterialIcons name="error-outline" size={20} color="#EF4444" />
                <Text style={styles.errorContainerText}>{error}</Text>
              </View>
            )}

            <View style={styles.submitButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => router.back()}
                disabled={submitting}
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
                    <MaterialIcons name="check" size={20} color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>Create Gift</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
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
                    setGiftCondition(item);
                    setConditionModalVisible(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item}</Text>
                  {giftCondition === item && (
                    <MaterialIcons name="check" size={20} color="#8B5CF6" />
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
                    <MaterialIcons name="check" size={20} color="#8B5CF6" />
                  )}
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
    backgroundColor: '#8B5CF6',
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
    backgroundColor: '#8B5CF6',
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
    color: '#8B5CF6',
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
    backgroundColor: '#EDE9FE',
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
    backgroundColor: '#8B5CF6',
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
    color: '#8B5CF6',
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
    backgroundColor: '#8B5CF6',
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
    borderColor: '#8B5CF6',
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
    color: '#8B5CF6',
  },
  predictionCard: {
    backgroundColor: '#EDE9FE',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  predictionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6D28D9',
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
    color: '#5B21B6',
  },
  predictionConfidence: {
    fontSize: 12,
    color: '#6D28D9',
  },
  alternativeText: {
    fontSize: 11,
    color: '#6D28D9',
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
    backgroundColor: '#8B5CF6',
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
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6D28D9',
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
  criticalStockSection: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  criticalStockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  criticalStockTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
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
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  addVariantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#8B5CF6',
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
    color: '#8B5CF6',
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
  globalCriticalStock: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  submitSection: {
    marginTop: 20,
  },
  submitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  submitSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
  },
  submitButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 14,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  submitButton: {
    flex: 2,
    backgroundColor: '#8B5CF6',
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