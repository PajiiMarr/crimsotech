// add-gift-form.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  Ionicons,
  MaterialIcons,
  MaterialCommunityIcons,
  FontAwesome,
  Feather,
} from '@expo/vector-icons';
import AxiosInstance from '../../../contexts/axios';
import { useAuth } from '../../../contexts/AuthContext';
import { router } from 'expo-router';

interface Category {
  id: string;
  name: string;
  shop: string | null;
  user: {
    id: string;
    username: string;
  };
}

interface MediaFile {
  uri: string;
  type: 'image' | 'video';
  name: string;
  mimeType: string;
  file?: File;
}

interface VariantOption {
  id: string;
  title: string;
  image?: MediaFile | null;
}

interface VariantGroup {
  id: string;
  title: string;
  options: VariantOption[];
}

interface SkuCombination {
  id: string;
  option_ids: string[];
  option_map: Record<string, string>;
  quantity: number | string;
  length?: number | string;
  width?: number | string;
  height?: number | string;
  weight?: number | string;
  weight_unit?: 'g' | 'kg' | 'lb' | 'oz' | '';
  sku_code?: string;
  image?: MediaFile | null;
  critical_trigger?: number | string;
  is_active?: boolean;
}

interface PredictionCategory {
  category_id: number;
  category_name: string;
  confidence: number;
  category_uuid?: string;
}

interface PredictionResult {
  success: boolean;
  predicted_category: PredictionCategory;
  alternative_categories?: PredictionCategory[];
  all_categories?: string[];
  feature_insights?: any;
}

interface AddGiftFormProps {
  globalCategories: Category[];
}

const SAMPLE_CATEGORY = { id: 'sample-gift-category', name: 'Sample Gift Category' };

const generateId = () => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

export default function AddGiftForm({ globalCategories }: AddGiftFormProps) {
  const { user } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState<string>('');
  const [condition, setCondition] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('none');
  
  // Media state
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  
  // Variants state
  const [showVariants, setShowVariants] = useState(false);
  const [variantGroups, setVariantGroups] = useState<VariantGroup[]>([]);
  const [skuCombinations, setSkuCombinations] = useState<SkuCombination[]>([]);
  
  // Dimensions state
  const [productWeight, setProductWeight] = useState<string>('');
  const [productWeightUnit, setProductWeightUnit] = useState<'g' | 'kg' | 'lb' | 'oz'>('g');
  const [productLength, setProductLength] = useState<string>('');
  const [productWidth, setProductWidth] = useState<string>('');
  const [productHeight, setProductHeight] = useState<string>('');
  
  // Stock state
  const [enableCriticalTrigger, setEnableCriticalTrigger] = useState(false);
  const [criticalThreshold, setCriticalThreshold] = useState<string>('');
  
  // Prediction state
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);
  const [showPredictionModal, setShowPredictionModal] = useState(false);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const steps = [
    { id: 1, title: 'Basic Info' },
    { id: 2, title: 'Media' },
    { id: 3, title: 'Variants' },
    { id: 4, title: 'Stock & Submit' },
  ];

  // Check if prediction fields are valid
  const arePredictionFieldsValid = () => {
    return (
      name.trim().length >= 2 &&
      description.trim().length >= 10 &&
      condition !== '' &&
      quantity !== '' && parseInt(quantity) >= 0
    );
  };

  // Handle category prediction
  const predictCategory = async () => {
    if (!arePredictionFieldsValid() || isPredicting) return;

    setIsPredicting(true);
    try {
      // Call prediction API
      const response = await AxiosInstance.post('/customer-gift/predict_category/', {
        name,
        description,
        quantity: parseInt(quantity),
        condition,
      });

      if (response.data.success) {
        setPredictionResult(response.data);
        setShowPredictionModal(true);
        
        // Auto-select predicted category
        if (response.data.predicted_category?.category_uuid) {
          setSelectedCategoryId(response.data.predicted_category.category_uuid);
        }
      }
    } catch (error: any) {
      console.error('Prediction error:', error);
      Alert.alert('Error', 'Failed to predict category');
    } finally {
      setIsPredicting(false);
    }
  };

  // Auto-predict when fields are filled
  useEffect(() => {
    if (arePredictionFieldsValid()) {
      const timer = setTimeout(() => {
        predictCategory();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [name, description, quantity, condition]);

  // Generate SKU combinations when variants change
  useEffect(() => {
    if (variantGroups.length === 0) {
      setSkuCombinations([]);
      return;
    }

    // Build cartesian product
    const arrays = variantGroups.map(g => g.options.map(o => ({ id: o.id, title: o.title })));
    
    let combos: any[] = [];
    arrays.forEach((arr, idx) => {
      if (idx === 0) {
        combos = arr.map((a) => ({ 
          option_ids: [a.id], 
          option_map: { [variantGroups[0].id]: a.id }, 
          quantity: quantity || '' 
        }));
      } else {
        const groupId = variantGroups[idx].id;
        const newCombos: any[] = [];
        combos.forEach(existing => {
          arr.forEach((a) => {
            newCombos.push({
              option_ids: [...existing.option_ids, a.id],
              option_map: { ...existing.option_map, [groupId]: a.id },
              quantity: existing.quantity || quantity || '',
              length: existing.length || productLength || '',
              width: existing.width || productWidth || '',
              height: existing.height || productHeight || '',
              weight: existing.weight || productWeight || '',
              weight_unit: existing.weight_unit || productWeightUnit || '',
            });
          });
        });
        combos = newCombos;
      }
    });

    // Preserve existing SKU data
    setSkuCombinations((prev) => {
      const preserved = combos.map((c) => {
        const ids = c.option_ids.slice().sort().join('|');
        const found = prev.find(s => s.option_ids.slice().sort().join('|') === ids);
        return {
          id: found?.id || generateId(),
          option_ids: c.option_ids,
          option_map: c.option_map,
          quantity: found?.quantity || c.quantity || 0,
          length: found?.length || c.length || '',
          width: found?.width || c.width || '',
          height: found?.height || c.height || '',
          weight: found?.weight || c.weight || '',
          weight_unit: found?.weight_unit || c.weight_unit || '',
          sku_code: found?.sku_code || '',
          image: found?.image || null,
          critical_trigger: found?.critical_trigger || '',
          is_active: found?.is_active ?? true,
        };
      });
      return preserved;
    });
  }, [variantGroups, quantity, productLength, productWidth, productHeight, productWeight, productWeightUnit]);

  // Add variant group
  const addVariantGroup = () => {
    setVariantGroups(prev => [
      ...prev,
      {
        id: generateId(),
        title: "Color",
        options: [
          {
            id: generateId(),
            title: "Red",
          },
        ],
      },
    ]);
  };

  // Remove variant group
  const removeVariantGroup = (groupId: string) => {
    setVariantGroups(prev => prev.filter(group => group.id !== groupId));
  };

  // Update variant group title
  const updateVariantGroupTitle = (groupId: string, newTitle: string) => {
    setVariantGroups(prev => prev.map(group => 
      group.id === groupId ? { ...group, title: newTitle } : group
    ));
  };

  // Add option to variant group
  const addOption = (groupId: string, title: string) => {
    if (!title.trim()) return;
    
    setVariantGroups(prev => prev.map(group => 
      group.id === groupId
        ? { 
            ...group, 
            options: [...group.options, { 
              id: generateId(), 
              title: title.trim() 
            }] 
          }
        : group
    ));
  };

  // Remove option from variant group
  const removeOption = (groupId: string, optionId: string) => {
    setVariantGroups(prev => prev.map(group => 
      group.id === groupId
        ? { ...group, options: group.options.filter(option => option.id !== optionId) }
        : group
    ));
  };

  // Update SKU field
  const updateSkuField = (skuId: string, field: keyof SkuCombination, value: any) => {
    setSkuCombinations(prev => prev.map(sku => 
      sku.id === skuId ? { ...sku, [field]: value } : sku
    ));
  };

  // Pick media files
  const pickMedia = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        const newMedia: MediaFile[] = result.assets.map(asset => ({
          uri: asset.uri,
          type: (asset.type === 'video' ? 'video' : 'image') as 'video' | 'image',
          name: asset.fileName || `media_${Date.now()}`,
          mimeType: asset.mimeType || 'image/jpeg',
        }));

        setMediaFiles(prev => {
          const available = Math.max(0, 9 - prev.length);
          return [...prev, ...newMedia.slice(0, available)];
        });
      }
    } catch (error) {
      console.error('Error picking media:', error);
      Alert.alert('Error', 'Failed to pick media files');
    }
  };

  // Remove media file
  const removeMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Submit form
  const handleSubmit = async () => {
    // Validation
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter gift name');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter description');
      return;
    }
    if (!quantity || parseInt(quantity) < 0) {
      Alert.alert('Error', 'Please enter valid quantity');
      return;
    }
    if (!condition) {
      Alert.alert('Error', 'Please select condition');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      
      // Add basic fields
      formData.append('name', name.trim());
      formData.append('description', description.trim());
      formData.append('quantity', quantity);
      formData.append('condition', condition);
      formData.append('price', '0');
      formData.append('status', 'active');
      
      if (user?.id) {
        formData.append('customer_id', user.id);
      }
      
      if (selectedCategoryId && selectedCategoryId !== 'none') {
        formData.append('category_admin_id', selectedCategoryId);
      }
      
      // Add media files
      mediaFiles.forEach((file, index) => {
        // Convert URI to blob/file object
        const fileObject = {
          uri: file.uri,
          type: file.mimeType,
          name: file.name,
        };
        formData.append('media_files', fileObject as any);
      });
      
      // Add variants if enabled
      if (showVariants && variantGroups.length > 0) {
        formData.append('variants', JSON.stringify(variantGroups.map(group => ({
          title: group.title,
          options: group.options.map(opt => ({
            id: opt.id,
            title: opt.title,
          })),
        }))));
        
        if (skuCombinations.length > 0) {
          formData.append('skus', JSON.stringify(skuCombinations.map(sku => ({
            id: sku.id,
            option_ids: sku.option_ids,
            option_map: sku.option_map,
            quantity: sku.quantity,
            length: sku.length,
            width: sku.width,
            height: sku.height,
            weight: sku.weight,
            weight_unit: sku.weight_unit,
            sku_code: sku.sku_code,
            critical_trigger: sku.critical_trigger,
          }))));
        }
      }
      
      // Add dimensions
      if (productLength) formData.append('length', productLength);
      if (productWidth) formData.append('width', productWidth);
      if (productHeight) formData.append('height', productHeight);
      if (productWeight) {
        formData.append('weight', productWeight);
        formData.append('weight_unit', productWeightUnit);
      }
      
      // Make API call
      const response = await AxiosInstance.post('/customer-gift/create_gift/', formData, {
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
              onPress: () => router.back(),
            },
          ]
        );
      } else {
        throw new Error(response.data.message || 'Failed to create gift');
      }
    } catch (error: any) {
      console.error('Submit error:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || error.message || 'Failed to create gift'
      );
    } finally {
      setLoading(false);
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (activeStep) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            {/* Step 1: Basic Info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Basic Information</Text>
              
              {/* Gift Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Gift Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter gift name"
                  value={name}
                  onChangeText={setName}
                />
              </View>
              
              {/* Description */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Enter detailed gift description"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={4}
                />
              </View>
              
              {/* Condition */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Condition *</Text>
                <View style={styles.conditionContainer}>
                  {['New', 'Like New', 'Used - Good', 'Used - Fair', 'Refurbished'].map((cond) => (
                    <TouchableOpacity
                      key={cond}
                      style={[
                        styles.conditionOption,
                        condition === cond && styles.conditionOptionSelected,
                      ]}
                      onPress={() => setCondition(cond)}
                    >
                      <Text
                        style={[
                          styles.conditionOptionText,
                          condition === cond && styles.conditionOptionTextSelected,
                        ]}
                      >
                        {cond}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              {/* Quantity */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Quantity *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="numeric"
                />
              </View>
              
              {/* AI Prediction Button */}
              <TouchableOpacity
                style={styles.predictButton}
                onPress={predictCategory}
                disabled={!arePredictionFieldsValid() || isPredicting}
              >
                {isPredicting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="robot" size={20} color="#FFFFFF" />
                    <Text style={styles.predictButtonText}>Get AI Category Suggestion</Text>
                  </>
                )}
              </TouchableOpacity>
              
              {/* Category Selection */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Category</Text>
                <TouchableOpacity
                  style={styles.categorySelector}
                  onPress={() => setShowCategoryPicker(true)}
                >
                  <Text style={styles.categorySelectorText}>
                    {selectedCategoryId === 'none' 
                      ? 'Select category (optional)' 
                      : globalCategories.find(c => c.id === selectedCategoryId)?.name || 
                        (selectedCategoryId === SAMPLE_CATEGORY.id ? SAMPLE_CATEGORY.name : 'Selected category')
                    }
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );
        
      case 2:
        return (
          <View style={styles.stepContainer}>
            {/* Step 2: Media */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Upload Media</Text>
              <Text style={styles.sectionSubtitle}>
                Upload images or videos (max 9 files)
              </Text>
              
              {/* Media Grid */}
              <View style={styles.mediaGrid}>
                {mediaFiles.map((file, index) => (
                  <View key={index} style={styles.mediaItem}>
                    {file.type === 'image' ? (
                      <Image source={{ uri: file.uri }} style={styles.mediaImage} />
                    ) : (
                      <View style={styles.mediaVideo}>
                        <MaterialIcons name="videocam" size={24} color="#6B7280" />
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.removeMediaButton}
                      onPress={() => removeMedia(index)}
                    >
                      <Ionicons name="close-circle" size={20} color="#EF4444" />
                    </TouchableOpacity>
                    {index === 0 && (
                      <View style={styles.coverBadge}>
                        <Text style={styles.coverBadgeText}>Cover</Text>
                      </View>
                    )}
                  </View>
                ))}
                
                {mediaFiles.length < 9 && (
                  <TouchableOpacity style={styles.addMediaButton} onPress={pickMedia}>
                    <Ionicons name="add" size={32} color="#9CA3AF" />
                    <Text style={styles.addMediaText}>Add Media</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        );
        
      case 3:
        return (
          <View style={styles.stepContainer}>
            {/* Step 3: Variants */}
            <View style={styles.section}>
              <View style={styles.variantToggleContainer}>
                <Text style={styles.sectionTitle}>Gift Variations</Text>
                <TouchableOpacity
                  style={styles.toggleSwitch}
                  onPress={() => setShowVariants(!showVariants)}
                >
                  <Text style={styles.toggleText}>
                    {showVariants ? 'Enabled' : 'Disabled'}
                  </Text>
                  <View style={[styles.toggle, showVariants && styles.toggleActive]}>
                    <View style={[styles.toggleKnob, showVariants && styles.toggleKnobActive]} />
                  </View>
                </TouchableOpacity>
              </View>
              
              <Text style={styles.sectionSubtitle}>
                Define gift variants like size or color (optional)
              </Text>
              
              {showVariants ? (
                <View style={styles.variantsContainer}>
                  {/* Variant Groups */}
                  {variantGroups.map((group) => (
                    <View key={group.id} style={styles.variantGroup}>
                      <View style={styles.variantGroupHeader}>
                        <TextInput
                          style={styles.variantGroupTitle}
                          value={group.title}
                          onChangeText={(text) => updateVariantGroupTitle(group.id, text)}
                          placeholder="e.g., Size, Color"
                        />
                        <TouchableOpacity
                          style={styles.removeVariantGroupButton}
                          onPress={() => removeVariantGroup(group.id)}
                          disabled={variantGroups.length === 1}
                        >
                          <Ionicons name="trash" size={20} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                      
                      {/* Options */}
                      <View style={styles.optionsContainer}>
                        {group.options.map((option) => (
                          <View key={option.id} style={styles.optionItem}>
                            <Text style={styles.optionText}>{option.title}</Text>
                            <TouchableOpacity
                              style={styles.removeOptionButton}
                              onPress={() => removeOption(group.id, option.id)}
                            >
                              <Ionicons name="close" size={16} color="#6B7280" />
                            </TouchableOpacity>
                          </View>
                        ))}
                        <TouchableOpacity
                          style={styles.addOptionButton}
                          onPress={() => {
                            const newOptionTitle = `Option ${group.options.length + 1}`;
                            addOption(group.id, newOptionTitle);
                          }}
                        >
                          <Text style={styles.addOptionText}>+ Add Option</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                  
                  <TouchableOpacity
                    style={styles.addVariantGroupButton}
                    onPress={addVariantGroup}
                  >
                    <Ionicons name="add" size={20} color="#FF4500" />
                    <Text style={styles.addVariantGroupText}>Add Variant Type</Text>
                  </TouchableOpacity>
                  
                  {/* Generated Combinations */}
                  {skuCombinations.length > 0 && (
                    <View style={styles.skuContainer}>
                      <Text style={styles.skuTitle}>Generated Combinations</Text>
                      <Text style={styles.skuSubtitle}>
                        {skuCombinations.length} variant combinations created
                      </Text>
                      
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={styles.skuTable}>
                          <View style={styles.skuTableHeader}>
                            <Text style={styles.skuTableHeaderText}>Combination</Text>
                            <Text style={styles.skuTableHeaderText}>Qty</Text>
                          </View>
                          
                          {skuCombinations.map((sku) => (
                            <View key={sku.id} style={styles.skuTableRow}>
                              <Text style={styles.skuTableCell} numberOfLines={1}>
                                {Object.values(sku.option_map).map(optId => {
                                  const option = variantGroups
                                    .flatMap(g => g.options)
                                    .find(o => o.id === optId);
                                  return option?.title || '';
                                }).join(' / ')}
                              </Text>
                              <TextInput
                                style={styles.skuQuantityInput}
                                value={String(sku.quantity)}
                                onChangeText={(value) => updateSkuField(sku.id, 'quantity', value)}
                                keyboardType="numeric"
                              />
                            </View>
                          ))}
                        </View>
                      </ScrollView>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.dimensionsContainer}>
                  {/* Single Gift Dimensions */}
                  <Text style={styles.dimensionsTitle}>Gift Dimensions</Text>
                  
                  <View style={styles.dimensionsGrid}>
                    <View style={styles.dimensionInput}>
                      <Text style={styles.dimensionLabel}>Length (cm)</Text>
                      <TextInput
                        style={styles.dimensionField}
                        placeholder="0.0"
                        value={productLength}
                        onChangeText={setProductLength}
                        keyboardType="decimal-pad"
                      />
                    </View>
                    
                    <View style={styles.dimensionInput}>
                      <Text style={styles.dimensionLabel}>Width (cm)</Text>
                      <TextInput
                        style={styles.dimensionField}
                        placeholder="0.0"
                        value={productWidth}
                        onChangeText={setProductWidth}
                        keyboardType="decimal-pad"
                      />
                    </View>
                    
                    <View style={styles.dimensionInput}>
                      <Text style={styles.dimensionLabel}>Height (cm)</Text>
                      <TextInput
                        style={styles.dimensionField}
                        placeholder="0.0"
                        value={productHeight}
                        onChangeText={setProductHeight}
                        keyboardType="decimal-pad"
                      />
                    </View>
                    
                    <View style={styles.dimensionInput}>
                      <Text style={styles.dimensionLabel}>Weight</Text>
                      <View style={styles.weightContainer}>
                        <TextInput
                          style={[styles.dimensionField, styles.weightInput]}
                          placeholder="0.0"
                          value={productWeight}
                          onChangeText={setProductWeight}
                          keyboardType="decimal-pad"
                        />
                        <View style={styles.weightUnitSelector}>
                          <TouchableOpacity
                            style={[
                              styles.weightUnitOption,
                              productWeightUnit === 'g' && styles.weightUnitSelected,
                            ]}
                            onPress={() => setProductWeightUnit('g')}
                          >
                            <Text style={[
                              styles.weightUnitText,
                              productWeightUnit === 'g' && styles.weightUnitTextSelected,
                            ]}>g</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.weightUnitOption,
                              productWeightUnit === 'kg' && styles.weightUnitSelected,
                            ]}
                            onPress={() => setProductWeightUnit('kg')}
                          >
                            <Text style={[
                              styles.weightUnitText,
                              productWeightUnit === 'kg' && styles.weightUnitTextSelected,
                            ]}>kg</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              )}
            </View>
          </View>
        );
        
      case 4:
        return (
          <View style={styles.stepContainer}>
            {/* Step 4: Stock & Submit */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Stock Settings</Text>
              
              {/* Stock Quantity */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Quantity *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="numeric"
                />
              </View>
              
              {/* Critical Stock Alert */}
              <View style={styles.criticalStockContainer}>
                <View style={styles.criticalStockHeader}>
                  <View>
                    <Text style={styles.criticalStockTitle}>Critical Stock Alert</Text>
                    <Text style={styles.criticalStockSubtitle}>
                      Receive notification when stock is low
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.toggleSwitch}
                    onPress={() => setEnableCriticalTrigger(!enableCriticalTrigger)}
                  >
                    <View style={[styles.toggle, enableCriticalTrigger && styles.toggleActive]}>
                      <View style={[styles.toggleKnob, enableCriticalTrigger && styles.toggleKnobActive]} />
                    </View>
                  </TouchableOpacity>
                </View>
                
                {enableCriticalTrigger && (
                  <View style={styles.criticalThresholdContainer}>
                    <Text style={styles.label}>Critical Threshold</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., 5"
                      value={criticalThreshold}
                      onChangeText={setCriticalThreshold}
                      keyboardType="numeric"
                    />
                  </View>
                )}
              </View>
              
              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="gift" size={20} color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>Create Gift</Text>
                  </>
                )}
              </TouchableOpacity>
              
              {/* Form Summary */}
              <View style={styles.summaryContainer}>
                <Text style={styles.summaryTitle}>Summary</Text>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Gift Name:</Text>
                  <Text style={styles.summaryValue} numberOfLines={1}>{name || 'Not set'}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Condition:</Text>
                  <Text style={styles.summaryValue}>{condition || 'Not set'}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Quantity:</Text>
                  <Text style={styles.summaryValue}>{quantity || '0'}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Media Files:</Text>
                  <Text style={styles.summaryValue}>{mediaFiles.length}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Variants:</Text>
                  <Text style={styles.summaryValue}>
                    {showVariants ? `${variantGroups.length} types` : 'Disabled'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        );
        
      default:
        return null;
    }
  };

  // Category Picker Modal
  const CategoryPickerModal = () => (
    <Modal
      visible={showCategoryPicker}
      transparent
      animationType="slide"
      onRequestClose={() => setShowCategoryPicker(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Category</Text>
            <TouchableOpacity onPress={() => setShowCategoryPicker(false)}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={[
              { id: 'none', name: 'No Category (Not Recommended)' },
              { id: SAMPLE_CATEGORY.id, name: `Sample: ${SAMPLE_CATEGORY.name}` },
              ...globalCategories,
            ]}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.categoryOption,
                  selectedCategoryId === item.id && styles.categoryOptionSelected,
                ]}
                onPress={() => {
                  setSelectedCategoryId(item.id);
                  setShowCategoryPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.categoryOptionText,
                    selectedCategoryId === item.id && styles.categoryOptionTextSelected,
                  ]}
                >
                  {item.name}
                </Text>
                {selectedCategoryId === item.id && (
                  <Ionicons name="checkmark" size={20} color="#FF4500" />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );

  // Prediction Result Modal
  const PredictionModal = () => (
    <Modal
      visible={showPredictionModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowPredictionModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>AI Category Suggestion</Text>
            <TouchableOpacity onPress={() => setShowPredictionModal(false)}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          {predictionResult && predictionResult.predicted_category && (
            <View style={styles.predictionContent}>
              <View style={styles.predictionCard}>
                <View style={styles.predictionHeader}>
                  <MaterialCommunityIcons name="robot" size={24} color="#8B5CF6" />
                  <Text style={styles.predictionCategoryName}>
                    {predictionResult.predicted_category.category_name}
                  </Text>
                  <View style={styles.confidenceBadge}>
                    <Text style={styles.confidenceText}>
                      {Math.round(predictionResult.predicted_category.confidence * 100)}% confidence
                    </Text>
                  </View>
                </View>
                
                <Text style={styles.predictionDescription}>
                  Based on your gift details, this category seems to be the best fit.
                </Text>
                
                <TouchableOpacity
                  style={styles.usePredictionButton}
                  onPress={() => {
                    if (predictionResult.predicted_category.category_uuid) {
                      setSelectedCategoryId(predictionResult.predicted_category.category_uuid);
                    }
                    setShowPredictionModal(false);
                  }}
                >
                  <Text style={styles.usePredictionButtonText}>Use This Category</Text>
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity
                style={styles.chooseDifferentButton}
                onPress={() => {
                  setShowPredictionModal(false);
                  setShowCategoryPicker(true);
                }}
              >
                <Text style={styles.chooseDifferentText}>Choose Different Category</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Step Indicator */}
      <View style={styles.stepIndicator}>
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <TouchableOpacity
              style={[
                styles.step,
                activeStep === step.id && styles.stepActive,
                activeStep > step.id && styles.stepCompleted,
              ]}
              onPress={() => setActiveStep(step.id)}
            >
              {activeStep > step.id ? (
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              ) : (
                <Text style={[
                  styles.stepNumber,
                  activeStep === step.id && styles.stepNumberActive,
                  activeStep > step.id && styles.stepNumberCompleted,
                ]}>
                  {step.id}
                </Text>
              )}
            </TouchableOpacity>
            {index < steps.length - 1 && (
              <View style={[
                styles.stepLine,
                activeStep > step.id && styles.stepLineActive,
              ]} />
            )}
          </React.Fragment>
        ))}
      </View>
      
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Step Titles */}
        <View style={styles.stepTitles}>
          {steps.map((step) => (
            <Text
              key={step.id}
              style={[
                styles.stepTitle,
                activeStep === step.id && styles.stepTitleActive,
              ]}
            >
              {step.title}
            </Text>
          ))}
        </View>
        
        {/* Step Content */}
        {renderStepContent()}
        
        {/* Navigation Buttons */}
        <View style={styles.navigationButtons}>
          {activeStep > 1 && (
            <TouchableOpacity
              style={styles.prevButton}
              onPress={() => setActiveStep(prev => prev - 1)}
            >
              <Ionicons name="arrow-back" size={20} color="#FF4500" />
              <Text style={styles.prevButtonText}>Previous</Text>
            </TouchableOpacity>
          )}
          
          {activeStep < steps.length && (
            <TouchableOpacity
              style={styles.nextButton}
              onPress={() => setActiveStep(prev => prev + 1)}
            >
              <Text style={styles.nextButtonText}>Next</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
      
      {/* Modals */}
      <CategoryPickerModal />
      <PredictionModal />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  step: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepActive: {
    backgroundColor: '#FF4500',
  },
  stepCompleted: {
    backgroundColor: '#10B981',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  stepNumberActive: {
    color: '#FFFFFF',
  },
  stepNumberCompleted: {
    color: '#FFFFFF',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: '#10B981',
  },
  stepTitles: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9CA3AF',
    flex: 1,
    textAlign: 'center',
  },
  stepTitleActive: {
    color: '#FF4500',
    fontWeight: '600',
  },
  stepContainer: {
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  conditionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  conditionOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  conditionOptionSelected: {
    backgroundColor: '#FF4500',
    borderColor: '#FF4500',
  },
  conditionOptionText: {
    fontSize: 14,
    color: '#6B7280',
  },
  conditionOptionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  predictButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
    marginBottom: 16,
  },
  predictButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  categorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  categorySelectorText: {
    fontSize: 16,
    color: '#111827',
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mediaItem: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  mediaVideo: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeMediaButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 2,
  },
  coverBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  coverBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  addMediaButton: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  addMediaText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  variantToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  toggleSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleText: {
    fontSize: 14,
    color: '#6B7280',
  },
  toggle: {
    width: 48,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: '#10B981',
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    transform: [{ translateX: 0 }],
  },
  toggleKnobActive: {
    transform: [{ translateX: 24 }],
  },
  variantsContainer: {
    marginTop: 16,
  },
  variantGroup: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  variantGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  variantGroupTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  removeVariantGroupButton: {
    marginLeft: 8,
    padding: 4,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  optionText: {
    fontSize: 14,
    color: '#374151',
  },
  removeOptionButton: {
    padding: 2,
  },
  addOptionButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addOptionText: {
    fontSize: 14,
    color: '#6B7280',
  },
  addVariantGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FF4500',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 12,
    gap: 8,
    marginTop: 8,
  },
  addVariantGroupText: {
    fontSize: 16,
    color: '#FF4500',
    fontWeight: '500',
  },
  skuContainer: {
    marginTop: 24,
  },
  skuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  skuSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  skuTable: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: 300,
  },
  skuTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  skuTableHeaderText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  skuTableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  skuTableCell: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  skuQuantityInput: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlign: 'right',
  },
  dimensionsContainer: {
    marginTop: 16,
  },
  dimensionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  dimensionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  dimensionInput: {
    width: '48%',
  },
  dimensionLabel: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 6,
  },
  dimensionField: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
    color: '#111827',
  },
  weightContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  weightInput: {
    flex: 1,
  },
  weightUnitSelector: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    overflow: 'hidden',
  },
  weightUnitOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  weightUnitSelected: {
    backgroundColor: '#FF4500',
  },
  weightUnitText: {
    fontSize: 14,
    color: '#6B7280',
  },
  weightUnitTextSelected: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  criticalStockContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
  },
  criticalStockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  criticalStockTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  criticalStockSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  criticalThresholdContainer: {
    marginTop: 8,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF4500',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
    marginTop: 24,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  summaryContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    marginTop: 24,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
    flex: 1,
    marginLeft: 8,
    textAlign: 'right',
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  prevButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 6,
  },
  prevButtonText: {
    fontSize: 16,
    color: '#FF4500',
    fontWeight: '500',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF4500',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 6,
  },
  nextButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  categoryOptionSelected: {
    backgroundColor: '#FEF3F2',
  },
  categoryOptionText: {
    fontSize: 16,
    color: '#374151',
  },
  categoryOptionTextSelected: {
    color: '#FF4500',
    fontWeight: '500',
  },
  predictionContent: {
    padding: 20,
  },
  predictionCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  predictionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  predictionCategoryName: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  confidenceBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  predictionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  usePredictionButton: {
    backgroundColor: '#FF4500',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  usePredictionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  chooseDifferentButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  chooseDifferentText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
  },
});