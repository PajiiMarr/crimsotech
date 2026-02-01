import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  Dimensions,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

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
  uri: string;
  type: 'image' | 'video';
  fileName?: string;
}

interface VariantOption {
  id: string;
  title: string;
  image?: string;
}

interface VariantGroup {
  id: string;
  title: string;
  options: VariantOption[];
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

interface SKUCombination {
  id: string;
  option_ids: string[];
  option_map: Record<string, string>;
  quantity: number | '';
  length?: number | '';
  width?: number | '';
  height?: number | '';
  weight?: number | '';
  weight_unit?: 'g' | 'kg' | 'lb' | 'oz' | '';
  sku_code?: string;
  image?: string;
  critical_trigger?: number | '';
  is_active?: boolean;
}

interface CreateGiftFormProps {
  globalCategories: Category[];
  onSubmit: (formData: any) => void;
}

// --- REACT NATIVE COMPONENT ---

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isTablet = SCREEN_WIDTH >= 768;

export default function CreateGiftFormMobile({ globalCategories, onSubmit }: CreateGiftFormProps) {
  // Generate UUID
  const generateId = () => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  };

  // Form state
  const [giftName, setGiftName] = useState('');
  const [giftDescription, setGiftDescription] = useState('');
  const [giftQuantity, setGiftQuantity] = useState('');
  const [giftCondition, setGiftCondition] = useState('');
  const [mainMedia, setMainMedia] = useState<MediaPreview[]>([]);
  const [showVariants, setShowVariants] = useState(false);
  const [variantGroups, setVariantGroups] = useState<VariantGroup[]>([]);
  const [enableCriticalTrigger, setEnableCriticalTrigger] = useState(false);
  const [criticalThreshold, setCriticalThreshold] = useState('');
  const [skuCombinations, setSkuCombinations] = useState<SKUCombination[]>([]);
  const [productWeight, setProductWeight] = useState('');
  const [productWeightUnit, setProductWeightUnit] = useState<'g' | 'kg' | 'lb' | 'oz'>('g');
  const [productLength, setProductLength] = useState('');
  const [productWidth, setProductWidth] = useState('');
  const [productHeight, setProductHeight] = useState('');
  
  // Prediction state
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);
  const [showPrediction, setShowPrediction] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('none');

  const SAMPLE_CATEGORY = { id: 'sample-gift-category', name: 'Sample Gift Category' };

  // Check if prediction fields are valid
  const arePredictionFieldsValid = useCallback(() => {
    return (
      giftName.trim().length >= 2 &&
      giftDescription.trim().length >= 10 &&
      giftCondition !== '' &&
      giftQuantity !== '' && parseInt(giftQuantity) >= 0
    );
  }, [giftName, giftDescription, giftCondition, giftQuantity]);

  // Media picker
  const pickMedia = async () => {
    const maxMedia = 9;
    if (mainMedia.length >= maxMedia) {
      Alert.alert('Limit Reached', `Maximum ${maxMedia} media files allowed`);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      quality: 1,
    });

    if (!result.canceled && result.assets) {
      const availableSlots = maxMedia - mainMedia.length;
      const newMedia = result.assets.slice(0, availableSlots).map(asset => ({
        uri: asset.uri,
        type: asset.type === 'video' ? 'video' : 'image' as 'image' | 'video',
        fileName: asset.fileName,
      }));
      setMainMedia(prev => [...prev, ...newMedia]);
    }
  };

  const removeMedia = (index: number) => {
    setMainMedia(prev => prev.filter((_, i) => i !== index));
  };

  // Variant handlers
  const addVariantGroup = () => {
    setVariantGroups(prev => [
      ...prev,
      {
        id: generateId(),
        title: 'Color',
        options: [{ id: generateId(), title: 'Red' }],
      },
    ]);
  };

  const removeVariantGroup = (groupId: string) => {
    setVariantGroups(prev => prev.filter(group => group.id !== groupId));
  };

  const updateVariantGroupTitle = (groupId: string, newTitle: string) => {
    setVariantGroups(prev => prev.map(group =>
      group.id === groupId ? { ...group, title: newTitle } : group
    ));
  };

  const addOption = (groupId: string, title: string) => {
    if (!title.trim()) return;
    
    const newOption: VariantOption = {
      id: generateId(),
      title: title.trim(),
    };

    setVariantGroups(prev => prev.map(group =>
      group.id === groupId
        ? { ...group, options: [...group.options, newOption] }
        : group
    ));
  };

  const removeOption = (groupId: string, optionId: string) => {
    setVariantGroups(prev => prev.map(group =>
      group.id === groupId
        ? { ...group, options: group.options.filter(option => option.id !== optionId) }
        : group
    ));
  };

  // Generate SKU combinations
  const generateSkuCombinations = useCallback(() => {
    if (variantGroups.length === 0) {
      setSkuCombinations([]);
      return;
    }

    const arrays = variantGroups.map(g => g.options.map(o => ({ id: o.id, title: o.title })));
    let combos: any[] = [];
    
    arrays.forEach((arr, idx) => {
      if (idx === 0) {
        combos = arr.map((a) => ({
          option_ids: [a.id],
          option_map: { [variantGroups[0].id]: a.id },
          quantity: giftQuantity || '',
        }));
      } else {
        const groupId = variantGroups[idx].id;
        const newCombos: any[] = [];
        combos.forEach(existing => {
          arr.forEach((a) => {
            newCombos.push({
              option_ids: [...existing.option_ids, a.id],
              option_map: { ...existing.option_map, [groupId]: a.id },
              quantity: existing.quantity ?? giftQuantity ?? '',
            });
          });
        });
        combos = newCombos;
      }
    });

    setSkuCombinations(combos.map(c => ({
      id: generateId(),
      ...c,
      length: productLength || '',
      width: productWidth || '',
      height: productHeight || '',
      weight: productWeight || '',
      weight_unit: productWeightUnit || '',
      sku_code: '',
      critical_trigger: '',
      is_active: true,
    })));
  }, [variantGroups, giftQuantity, productLength, productWidth, productHeight, productWeight, productWeightUnit]);

  useEffect(() => {
    generateSkuCombinations();
  }, [variantGroups, giftQuantity, generateSkuCombinations]);

  // Predict category
  const predictCategory = useCallback(async () => {
    if (!arePredictionFieldsValid() || isPredicting) return;

    setIsPredicting(true);
    setShowPrediction(true);

    // Simulate API call with sample data
    setTimeout(() => {
      const sample = {
        success: true,
        predicted_category: {
          category_id: -1,
          category_uuid: SAMPLE_CATEGORY.id,
          category_name: SAMPLE_CATEGORY.name,
          confidence: 1.0,
        },
        alternative_categories: [],
        all_categories: [SAMPLE_CATEGORY.name],
        feature_insights: {},
      };

      setPredictionResult(sample as any);
      setSelectedCategoryId(SAMPLE_CATEGORY.id);
      setIsPredicting(false);
    }, 1500);
  }, [arePredictionFieldsValid, isPredicting, SAMPLE_CATEGORY.id, SAMPLE_CATEGORY.name]);

  // Auto-predict when fields are filled
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    if (arePredictionFieldsValid()) {
      timeout = setTimeout(() => {
        predictCategory();
      }, 1500);
    } else {
      setPredictionResult(null);
      setShowPrediction(false);
    }
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [arePredictionFieldsValid, predictCategory]);

  // Handle submit
  const handleSubmit = () => {
    if (!giftName || !giftDescription || !giftCondition || !giftQuantity) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    const formData = {
      name: giftName,
      description: giftDescription,
      condition: giftCondition,
      quantity: giftQuantity,
      category_id: selectedCategoryId,
      media: mainMedia,
      variants: showVariants ? variantGroups : null,
      skus: showVariants ? skuCombinations : null,
      dimensions: !showVariants ? {
        length: productLength,
        width: productWidth,
        height: productHeight,
        weight: productWeight,
        weight_unit: productWeightUnit,
      } : null,
      critical_trigger: enableCriticalTrigger ? criticalThreshold : null,
    };

    onSubmit(formData);
  };

  const numColumns = isTablet ? 3 : 2;
  const cardWidth = (SCREEN_WIDTH - 48 - (numColumns - 1) * 12) / numColumns;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Step 1: AI Category Prediction */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="sparkles" size={20} color="#9333ea" />
            <Text style={styles.cardTitle}>Step 1: AI Category Prediction</Text>
          </View>
          <Text style={styles.cardDescription}>
            Fill in these basic details first. Our AI will suggest the best category for your gift.
          </Text>
        </View>

        <View style={styles.cardContent}>
          {/* Gift Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Gift Name *</Text>
            <TextInput
              style={[styles.input, showPrediction && predictionResult && styles.inputSuccess]}
              value={giftName}
              onChangeText={setGiftName}
              placeholder="Enter gift name"
              placeholderTextColor="#9ca3af"
            />
          </View>

          {/* Condition */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Condition *</Text>
            <View style={[styles.pickerContainer, showPrediction && predictionResult && styles.inputSuccess]}>
              <Picker
                selectedValue={giftCondition}
                onValueChange={setGiftCondition}
                style={styles.picker}
              >
                <Picker.Item label="Select condition" value="" />
                <Picker.Item label="Like New" value="Like New" />
                <Picker.Item label="New" value="New" />
                <Picker.Item label="Refurbished" value="Refurbished" />
                <Picker.Item label="Used - Excellent" value="Used - Excellent" />
                <Picker.Item label="Used - Good" value="Used - Good" />
              </Picker>
            </View>
          </View>

          {/* Quantity */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Quantity *</Text>
            <TextInput
              style={[styles.input, showPrediction && predictionResult && styles.inputSuccess]}
              value={giftQuantity}
              onChangeText={setGiftQuantity}
              placeholder="0"
              keyboardType="numeric"
              placeholderTextColor="#9ca3af"
            />
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={[styles.textArea, showPrediction && predictionResult && styles.inputSuccess]}
              value={giftDescription}
              onChangeText={setGiftDescription}
              placeholder="Enter detailed gift description"
              multiline
              numberOfLines={4}
              placeholderTextColor="#9ca3af"
            />
          </View>

          {/* Predict Button */}
          <TouchableOpacity
            style={[styles.predictButton, (!arePredictionFieldsValid() || isPredicting) && styles.buttonDisabled]}
            onPress={predictCategory}
            disabled={!arePredictionFieldsValid() || isPredicting}
          >
            {isPredicting ? (
              <>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.buttonText}>Analyzing...</Text>
              </>
            ) : (
              <>
                <Ionicons name="sparkles" size={18} color="#fff" />
                <Text style={styles.buttonText}>Get AI Category Suggestion</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Prediction Result */}
          {showPrediction && (
            <View style={styles.predictionCard}>
              <View style={styles.predictionHeader}>
                <Ionicons name="sparkles" size={20} color="#9333ea" />
                <Text style={styles.predictionTitle}>AI Category Suggestion</Text>
              </View>

              {predictionResult && predictionResult.predicted_category ? (
                <View style={styles.predictionContent}>
                  <View style={styles.predictionResult}>
                    <Text style={styles.predictionCategoryName}>
                      {predictionResult.predicted_category.category_name}
                    </Text>
                    <View style={styles.confidenceBadge}>
                      <Text style={styles.confidenceText}>
                        {Math.round(predictionResult.predicted_category.confidence * 100)}% confidence
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.selectButton}
                    onPress={() => setSelectedCategoryId(predictionResult.predicted_category.category_id.toString())}
                  >
                    <Text style={styles.selectButtonText}>Select This Category</Text>
                  </TouchableOpacity>

                  {/* Manual Category Selection */}
                  <View style={styles.manualSelection}>
                    <Text style={styles.manualSelectionTitle}>Prefer a different category?</Text>
                    <View style={styles.pickerContainer}>
                      <Picker
                        selectedValue={selectedCategoryId}
                        onValueChange={setSelectedCategoryId}
                        style={styles.picker}
                      >
                        <Picker.Item label="No Category (Not Recommended)" value="none" />
                        <Picker.Item label={`Sample: ${SAMPLE_CATEGORY.name}`} value={SAMPLE_CATEGORY.id} />
                        {globalCategories.map(cat => (
                          <Picker.Item key={cat.id} label={cat.name} value={cat.id} />
                        ))}
                      </Picker>
                    </View>
                  </View>
                </View>
              ) : isPredicting ? (
                <View style={styles.predicting}>
                  <ActivityIndicator color="#9333ea" size="large" />
                  <Text style={styles.predictingText}>Analyzing your gift details...</Text>
                </View>
              ) : null}
            </View>
          )}
        </View>
      </View>

      {/* Step 2: Gift Media */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Step 2: Gift Media</Text>
          <Text style={styles.cardDescription}>
            Upload main gift images and videos (max 9 files)
          </Text>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.mediaGrid}>
            {mainMedia.map((item, index) => (
              <View key={index} style={[styles.mediaItem, { width: cardWidth }]}>
                <Image source={{ uri: item.uri }} style={styles.mediaImage} />
                {index === 0 && (
                  <View style={styles.coverBadge}>
                    <Text style={styles.coverText}>Cover</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.removeMediaButton}
                  onPress={() => removeMedia(index)}
                >
                  <Ionicons name="close" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}

            {mainMedia.length < 9 && (
              <TouchableOpacity
                style={[styles.addMediaButton, { width: cardWidth }]}
                onPress={pickMedia}
              >
                <Ionicons name="cloud-upload-outline" size={32} color="#6b7280" />
                <Text style={styles.addMediaText}>Add Media</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Step 3: Variations */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Step 3: Variations (Optional)</Text>
          <Text style={styles.cardDescription}>
            Define gift variants like size or color
          </Text>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Enable Variations</Text>
            <Switch
              value={showVariants}
              onValueChange={(checked) => {
                setShowVariants(checked);
                if (checked && variantGroups.length === 0) {
                  setVariantGroups([{
                    id: generateId(),
                    title: 'Size',
                    options: [{ id: generateId(), title: 'Small' }],
                  }]);
                }
              }}
            />
          </View>

          {showVariants ? (
            <View style={styles.variantsSection}>
              {variantGroups.map((group, groupIndex) => (
                <View key={group.id} style={styles.variantGroup}>
                  <View style={styles.variantHeader}>
                    <TextInput
                      style={styles.variantTitleInput}
                      value={group.title}
                      onChangeText={(text) => updateVariantGroupTitle(group.id, text)}
                      placeholder="e.g., Size, Color"
                    />
                    {variantGroups.length > 1 && (
                      <TouchableOpacity onPress={() => removeVariantGroup(group.id)}>
                        <Ionicons name="trash-outline" size={20} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.optionsList}>
                    {group.options.map((option) => (
                      <View key={option.id} style={styles.optionChip}>
                        <Text style={styles.optionText}>{option.title}</Text>
                        <TouchableOpacity onPress={() => removeOption(group.id, option.id)}>
                          <Ionicons name="close-circle" size={18} color="#6b7280" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>

                  <TextInput
                    style={styles.input}
                    placeholder="Type option and press Enter"
                    onSubmitEditing={(e) => {
                      const text = e.nativeEvent.text;
                      if (text.trim()) {
                        addOption(group.id, text);
                      }
                    }}
                  />
                </View>
              ))}

              <TouchableOpacity style={styles.addButton} onPress={addVariantGroup}>
                <Ionicons name="add-circle-outline" size={20} color="#6366f1" />
                <Text style={styles.addButtonText}>Add Option Type</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.dimensionsSection}>
              <Text style={styles.sectionTitle}>Gift Dimensions & Weight</Text>
              <View style={styles.dimensionsGrid}>
                <View style={styles.dimensionInput}>
                  <Text style={styles.label}>Length (cm)</Text>
                  <TextInput
                    style={styles.input}
                    value={productLength}
                    onChangeText={setProductLength}
                    placeholder="0.0"
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.dimensionInput}>
                  <Text style={styles.label}>Width (cm)</Text>
                  <TextInput
                    style={styles.input}
                    value={productWidth}
                    onChangeText={setProductWidth}
                    placeholder="0.0"
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.dimensionInput}>
                  <Text style={styles.label}>Height (cm)</Text>
                  <TextInput
                    style={styles.input}
                    value={productHeight}
                    onChangeText={setProductHeight}
                    placeholder="0.0"
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.dimensionInput}>
                  <Text style={styles.label}>Weight</Text>
                  <View style={styles.weightRow}>
                    <TextInput
                      style={[styles.input, styles.weightInput]}
                      value={productWeight}
                      onChangeText={setProductWeight}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                    />
                    <View style={styles.unitPicker}>
                      <Picker
                        selectedValue={productWeightUnit}
                        onValueChange={setProductWeightUnit}
                        style={{ height: 40 }}
                      >
                        <Picker.Item label="g" value="g" />
                        <Picker.Item label="kg" value="kg" />
                        <Picker.Item label="lb" value="lb" />
                        <Picker.Item label="oz" value="oz" />
                      </Picker>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Step 4: Stock (only when variants disabled) */}
      {!showVariants && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Step 4: Stock</Text>
            <Text style={styles.cardDescription}>
              Set initial stock quantity and configure low stock alerts
            </Text>
          </View>

          <View style={styles.cardContent}>
            <View style={styles.stockSection}>
              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchLabel}>Critical Stock Trigger ⚠️</Text>
                  <Text style={styles.switchDescription}>
                    Receive notification when stock is low
                  </Text>
                </View>
                <Switch
                  value={enableCriticalTrigger}
                  onValueChange={setEnableCriticalTrigger}
                />
              </View>

              {enableCriticalTrigger && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Critical Threshold</Text>
                  <TextInput
                    style={styles.input}
                    value={criticalThreshold}
                    onChangeText={setCriticalThreshold}
                    placeholder="e.g., 5"
                    keyboardType="numeric"
                  />
                </View>
              )}
            </View>
          </View>
        </View>
      )}

      {/* SKU Combinations */}
      {showVariants && skuCombinations.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Generated Combinations</Text>
            <Text style={styles.cardDescription}>
              All combinations generated from your variant choices
            </Text>
          </View>

          <View style={styles.cardContent}>
            <View style={styles.skuGrid}>
              {skuCombinations.map((sku, index) => (
                <View key={sku.id} style={[styles.skuCard, { width: isTablet ? '31%' : '100%' }]}>
                  {/* Header with Image and Variant Info */}
                  <View style={styles.skuCardHeader}>
                    <TouchableOpacity style={styles.skuImageContainer}>
                      {sku.image ? (
                        <Image source={{ uri: sku.image }} style={styles.skuImage} />
                      ) : (
                        <View style={styles.skuImagePlaceholder}>
                          <Ionicons name="image-outline" size={32} color="#9ca3af" />
                        </View>
                      )}
                    </TouchableOpacity>
                    
                    <View style={styles.skuVariantInfo}>
                      {variantGroups.map(g => (
                        <View key={g.id} style={styles.variantInfoRow}>
                          <Text style={styles.variantLabel}>{g.title}:</Text>
                          <Text style={styles.variantValue}>
                            {g.options.find(o => o.id === sku.option_map[g.id])?.title || ''}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Price and Compare Price */}
                  <View style={styles.skuPriceRow}>
                    <View style={styles.skuInputWrapper}>
                      <Text style={styles.skuInputLabel}>Price</Text>
                      <View style={styles.priceInputContainer}>
                        <Text style={styles.currencySymbol}>₱</Text>
                        <TextInput
                          style={styles.priceInput}
                          placeholder="0.00"
                          keyboardType="decimal-pad"
                        />
                      </View>
                    </View>
                    <View style={styles.skuInputWrapper}>
                      <Text style={styles.skuInputLabel}>Compare Price</Text>
                      <View style={styles.priceInputContainer}>
                        <Text style={styles.currencySymbol}>₱</Text>
                        <TextInput
                          style={styles.priceInput}
                          placeholder="0.00"
                          keyboardType="decimal-pad"
                        />
                      </View>
                    </View>
                  </View>

                  {/* Quantity and Critical */}
                  <View style={styles.skuRow}>
                    <View style={styles.skuInputWrapper}>
                      <Text style={styles.skuInputLabel}>Quantity</Text>
                      <TextInput
                        style={styles.skuInput}
                        value={sku.quantity.toString()}
                        placeholder="0"
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={styles.skuInputWrapper}>
                      <Text style={styles.skuInputLabel}>Critical</Text>
                      <TextInput
                        style={styles.skuInput}
                        value={sku.critical_trigger?.toString() || ''}
                        placeholder="0"
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  {/* Dimensions */}
                  <View style={styles.skuDimensionsRow}>
                    <View style={styles.skuDimensionInput}>
                      <Text style={styles.skuInputLabel}>L (cm)</Text>
                      <TextInput
                        style={styles.skuInput}
                        value={sku.length?.toString() || ''}
                        placeholder="0"
                        keyboardType="decimal-pad"
                      />
                    </View>
                    <View style={styles.skuDimensionInput}>
                      <Text style={styles.skuInputLabel}>W (cm)</Text>
                      <TextInput
                        style={styles.skuInput}
                        value={sku.width?.toString() || ''}
                        placeholder="0"
                        keyboardType="decimal-pad"
                      />
                    </View>
                    <View style={styles.skuDimensionInput}>
                      <Text style={styles.skuInputLabel}>H (cm)</Text>
                      <TextInput
                        style={styles.skuInput}
                        value={sku.height?.toString() || ''}
                        placeholder="0"
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>

                  {/* Weight and Unit */}
                  <View style={styles.skuRow}>
                    <View style={[styles.skuInputWrapper, { flex: 2 }]}>
                      <Text style={styles.skuInputLabel}>Weight</Text>
                      <TextInput
                        style={styles.skuInput}
                        value={sku.weight?.toString() || ''}
                        placeholder="0.00"
                        keyboardType="decimal-pad"
                      />
                    </View>
                    <View style={styles.skuInputWrapper}>
                      <Text style={styles.skuInputLabel}>Unit</Text>
                      <View style={styles.unitPickerWrapper}>
                        <Picker
                          selectedValue={sku.weight_unit || 'g'}
                          style={styles.unitPicker}
                        >
                          <Picker.Item label="g" value="g" />
                          <Picker.Item label="kg" value="kg" />
                          <Picker.Item label="lb" value="lb" />
                          <Picker.Item label="oz" value="oz" />
                        </Picker>
                      </View>
                    </View>
                  </View>

                  {/* SKU Code */}
                  <View style={styles.skuInputWrapper}>
                    <Text style={styles.skuInputLabel}>SKU Code</Text>
                    <TextInput
                      style={styles.skuInput}
                      value={sku.sku_code}
                      placeholder="Enter SKU code"
                    />
                  </View>

                  {/* Refundable and Active Switches */}
                  <View style={styles.skuSwitchesRow}>
                    <View style={styles.skuSwitchWrapper}>
                      <View style={styles.skuSwitchLabelRow}>
                        <Ionicons name="return-up-back" size={16} color="#6b7280" />
                        <Text style={styles.skuSwitchLabel}>Refundable</Text>
                      </View>
                      <Switch value={true} />
                    </View>
                    <View style={styles.skuSwitchWrapper}>
                      <View style={styles.skuSwitchLabelRow}>
                        <Ionicons name="checkmark-circle" size={16} color="#6b7280" />
                        <Text style={styles.skuSwitchLabel}>Active</Text>
                      </View>
                      <Switch value={sku.is_active ?? true} />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Submit Button */}
      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitButtonText}>Create Gift</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  cardDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  cardContent: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#fff',
  },
  inputSuccess: {
    borderColor: '#10b981',
    borderWidth: 2,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#111827',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  predictButton: {
    backgroundColor: '#9333ea',
    borderRadius: 8,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#d1d5db',
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  predictionCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#faf5ff',
    borderWidth: 1,
    borderColor: '#e9d5ff',
  },
  predictionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  predictionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  predictionContent: {
    gap: 12,
  },
  predictionResult: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  predictionCategoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  confidenceBadge: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065f46',
  },
  selectButton: {
    backgroundColor: '#10b981',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  manualSelection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  manualSelectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  predicting: {
    alignItems: 'center',
    padding: 24,
  },
  predictingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  mediaItem: {
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  coverBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  coverText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  removeMediaButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(239,68,68,0.9)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMediaButton: {
    aspectRatio: 1,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
  },
  addMediaText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  switchDescription: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  variantsSection: {
    gap: 16,
  },
  variantGroup: {
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  variantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  variantTitleInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    marginRight: 8,
  },
  optionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  optionText: {
    fontSize: 13,
    color: '#111827',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#6366f1',
    borderRadius: 8,
    borderStyle: 'dashed',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
  dimensionsSection: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  dimensionsGrid: {
    gap: 12,
  },
  dimensionInput: {
    marginBottom: 8,
  },
  weightRow: {
    flexDirection: 'row',
    gap: 8,
  },
  weightInput: {
    flex: 1,
  },
  unitPicker: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    width: 80,
    justifyContent: 'center',
  },
  stockSection: {
    gap: 16,
  },
  skuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  skuCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    marginBottom: 8,
  },
  skuCardHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  skuImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f9fafb',
  },
  skuImage: {
    width: '100%',
    height: '100%',
  },
  skuImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  skuVariantInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  variantInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  variantLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  variantValue: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '500',
  },
  skuPriceRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  skuRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  skuDimensionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  skuInputWrapper: {
    flex: 1,
  },
  skuDimensionInput: {
    flex: 1,
  },
  skuInputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  skuInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#fff',
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    backgroundColor: '#fff',
    paddingLeft: 8,
  },
  currencySymbol: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
    marginRight: 4,
  },
  priceInput: {
    flex: 1,
    padding: 8,
    fontSize: 14,
    color: '#111827',
  },
  unitPickerWrapper: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  skuSwitchesRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  skuSwitchWrapper: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skuSwitchLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  skuSwitchLabel: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#6366f1',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});