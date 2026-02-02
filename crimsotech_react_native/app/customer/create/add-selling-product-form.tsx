import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Switch,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';

import { Ionicons } from '@expo/vector-icons';

interface Category {
  id: string;
  name: string;
}

interface MediaPreview {
  uri: string;
  type: 'image' | 'video';
}

interface VariantOption {
  id: string;
  title: string;
  imageUri?: string;
}

interface VariantGroup {
  id: string;
  title: string;
  options: VariantOption[];
}

interface SKUCombination {
  id: string;
  option_ids: string[];
  option_map: Record<string, string>;
  price: number | '';
  compare_price?: number | '';
  quantity: number | '';
  length?: number | '';
  width?: number | '';
  height?: number | '';
  weight?: number | '';
  weight_unit?: 'g' | 'kg' | 'lb' | 'oz' | '';
  sku_code?: string;
  imageUri?: string;
  critical_trigger?: number | '';
  is_active?: boolean;
  is_refundable?: boolean;
}

interface PredictionCategory {
  category_id: number;
  category_name: string;
  confidence: number;
}

interface PredictionResult {
  success: boolean;
  predicted_category: PredictionCategory;
  alternative_categories?: PredictionCategory[];
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CreateProductFormMobile() {
  const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

  // Form state
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productQuantity, setProductQuantity] = useState<string>('');
  const [productPrice, setProductPrice] = useState<string>('');
  const [productCondition, setProductCondition] = useState('');
  const [isRefundable, setIsRefundable] = useState(true);
  
  const [mainMedia, setMainMedia] = useState<MediaPreview[]>([]);
  const [showVariants, setShowVariants] = useState(false);
  const [variantGroups, setVariantGroups] = useState<VariantGroup[]>([]);
  
  const [enableCriticalTrigger, setEnableCriticalTrigger] = useState(false);
  const [criticalThreshold, setCriticalThreshold] = useState<string>('');
  
  const [productWeight, setProductWeight] = useState<string>('');
  const [productWeightUnit, setProductWeightUnit] = useState<'g' | 'kg' | 'lb' | 'oz'>('g');
  const [productLength, setProductLength] = useState<string>('');
  const [productWidth, setProductWidth] = useState<string>('');
  const [productHeight, setProductHeight] = useState<string>('');
  
  // Prediction state
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);
  const [showPrediction, setShowPrediction] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('none');
  
  const [skuCombinations, setSkuCombinations] = useState<SKUCombination[]>([]);
  
  // Mock categories - replace with actual data
  const globalCategories: Category[] = [
    { id: '1', name: 'Electronics' },
    { id: '2', name: 'Clothing' },
    { id: '3', name: 'Home & Garden' },
  ];

  // Check if prediction fields are valid
  const arePredictionFieldsValid = useCallback(() => {
    return (
      productName.trim().length >= 2 &&
      productDescription.trim().length >= 10 &&
      productPrice !== '' && parseFloat(productPrice) > 0 &&
      productCondition !== '' &&
      productQuantity !== '' && parseInt(productQuantity) >= 0
    );
  }, [productName, productDescription, productPrice, productCondition, productQuantity]);

  // Handle media selection
  const handleSelectMedia = async () => {
    if (mainMedia.length >= 9) {
      Alert.alert('Limit Reached', 'Maximum 9 media files allowed');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      quality: 1,
    });

    if (!result.canceled) {
      const newMedia = result.assets.map(asset => ({
        uri: asset.uri,
        type: asset.type === 'video' ? 'video' : 'image' as 'image' | 'video',
      }));
      
      const availableSlots = 9 - mainMedia.length;
      setMainMedia(prev => [...prev, ...newMedia.slice(0, availableSlots)]);
    }
  };

  const removeMainMedia = (index: number) => {
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

  const [newOptionText, setNewOptionText] = useState<Record<string, string>>({});

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
          price: productPrice || '',
          quantity: productQuantity || '',
        }));
      } else {
        const groupId = variantGroups[idx].id;
        const newCombos: any[] = [];
        combos.forEach(existing => {
          arr.forEach((a) => {
            newCombos.push({
              option_ids: [...existing.option_ids, a.id],
              option_map: { ...existing.option_map, [groupId]: a.id },
              price: existing.price ?? productPrice ?? '',
              quantity: existing.quantity ?? productQuantity ?? '',
            });
          });
        });
        combos = newCombos;
      }
    });

    setSkuCombinations(combos.map(c => ({
      id: generateId(),
      option_ids: c.option_ids,
      option_map: c.option_map,
      price: c.price,
      quantity: c.quantity || 0,
      is_active: true,
      is_refundable: isRefundable,
    })));
  }, [variantGroups, productPrice, productQuantity, isRefundable]);

  useEffect(() => {
    generateSkuCombinations();
  }, [variantGroups, generateSkuCombinations]);

  const handleManualPredict = () => {
    if (arePredictionFieldsValid() && !isPredicting) {
      setIsPredicting(true);
      setShowPrediction(true);
      
      // Simulate API call
      setTimeout(() => {
        setPredictionResult({
          success: true,
          predicted_category: {
            category_id: 1,
            category_name: 'Electronics',
            confidence: 0.95,
          },
          alternative_categories: [
            { category_id: 2, category_name: 'Clothing', confidence: 0.03 },
          ],
        });
        setSelectedCategoryId('1');
        setIsPredicting(false);
      }, 2000);
    }
  };

  const handleSubmit = () => {
    Alert.alert('Success', 'Product created successfully!');
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Step 1: AI Category Prediction */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.titleRow}>
            <Ionicons name="sparkles" size={20} color="#9333ea" />
            <Text style={styles.cardTitle}>Step 1: AI Category Prediction</Text>
          </View>
          <Text style={styles.cardDescription}>
            Fill in these basic details first. Our AI will suggest the best category for your product.
          </Text>
        </View>

        <View style={styles.cardContent}>
          {/* Product Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Product Name *</Text>
            <TextInput
              style={[styles.input, showPrediction && predictionResult && styles.inputSuccess]}
              value={productName}
              onChangeText={setProductName}
              placeholder="Enter product name"
              placeholderTextColor="#9ca3af"
            />
          </View>

          {/* Condition */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Condition *</Text>
            <View style={[styles.pickerContainer, showPrediction && predictionResult && styles.inputSuccess]}>
              <Picker
                selectedValue={productCondition}
                onValueChange={setProductCondition}
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

          {/* Quantity and Price in row */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.flex1, styles.marginRight]}>
              <Text style={styles.label}>Quantity *</Text>
              <TextInput
                style={[styles.input, showPrediction && predictionResult && styles.inputSuccess]}
                value={productQuantity}
                onChangeText={setProductQuantity}
                placeholder="0"
                keyboardType="numeric"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={[styles.inputGroup, styles.flex1]}>
              <Text style={styles.label}>Price *</Text>
              <TextInput
                style={[styles.input, showPrediction && predictionResult && styles.inputSuccess]}
                value={productPrice}
                onChangeText={setProductPrice}
                placeholder="0.00"
                keyboardType="decimal-pad"
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={[styles.textArea, showPrediction && predictionResult && styles.inputSuccess]}
              value={productDescription}
              onChangeText={setProductDescription}
              placeholder="Enter detailed product description"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              placeholderTextColor="#9ca3af"
            />
          </View>

          {/* Predict Button */}
          <TouchableOpacity
            style={[styles.button, (!arePredictionFieldsValid() || isPredicting) && styles.buttonDisabled]}
            onPress={handleManualPredict}
            disabled={!arePredictionFieldsValid() || isPredicting}
          >
            {isPredicting ? (
              <>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.buttonText}>Analyzing...</Text>
              </>
            ) : (
              <>
                <Ionicons name="sparkles" size={16} color="#fff" />
                <Text style={styles.buttonText}>Get AI Category Suggestion</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Prediction Result */}
          {showPrediction && predictionResult && (
            <View style={styles.predictionCard}>
              <View style={styles.predictionHeader}>
                <Ionicons name="sparkles" size={20} color="#9333ea" />
                <Text style={styles.predictionTitle}>AI Category Suggestion</Text>
              </View>

              <View style={styles.predictionResult}>
                <View style={styles.predictionContent}>
                  <Text style={styles.predictedCategory}>
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
                  <Text style={styles.selectButtonText}>Select</Text>
                </TouchableOpacity>
              </View>

              {/* Manual Category Selection */}
              <View style={styles.manualSelection}>
                <Text style={styles.sectionSubtitle}>Prefer a different category?</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={selectedCategoryId}
                    onValueChange={setSelectedCategoryId}
                    style={styles.picker}
                  >
                    <Picker.Item label="No Category (Not Recommended)" value="none" />
                    {globalCategories.map((category) => (
                      <Picker.Item key={category.id} label={category.name} value={category.id} />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Step 2: Product Media */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Step 2: Product Media</Text>
          <Text style={styles.cardDescription}>
            Upload main product images and videos (max 9 files)
          </Text>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.mediaCountRow}>
            <Text style={styles.mediaHint}>* First image/video will be the cover</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{mainMedia.length}/9</Text>
            </View>
          </View>

          <View style={styles.mediaGrid}>
            {mainMedia.map((item, index) => (
              <View key={index} style={styles.mediaItem}>
                <Image source={{ uri: item.uri }} style={styles.mediaImage} />
                {index === 0 && (
                  <View style={styles.coverBadge}>
                    <Text style={styles.coverBadgeText}>Cover</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeMainMedia(index)}
                >
                  <Ionicons name="close" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}

            {mainMedia.length < 9 && (
              <TouchableOpacity style={styles.uploadBox} onPress={handleSelectMedia}>
                <Ionicons name="cloud-upload-outline" size={32} color="#6b7280" />
                <Text style={styles.uploadText}>Add Media</Text>
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
            Define product variants like size or color
          </Text>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.switchRow}>
            <View style={styles.flex1}>
              <Text style={styles.switchLabel}>Enable Product Variations</Text>
              <Text style={styles.switchDescription}>
                Add variant groups (e.g., Size, Color)
              </Text>
            </View>
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

          {showVariants && (
            <View style={styles.variantSection}>
              {variantGroups.map((group) => (
                <View key={group.id} style={styles.variantGroup}>
                  <View style={styles.variantHeader}>
                    <TextInput
                      style={styles.variantInput}
                      value={group.title}
                      onChangeText={(text) => updateVariantGroupTitle(group.id, text)}
                      placeholder="e.g., Size, Color"
                      placeholderTextColor="#9ca3af"
                    />
                    <TouchableOpacity
                      onPress={() => removeVariantGroup(group.id)}
                      disabled={variantGroups.length === 1}
                    >
                      <Ionicons name="close-circle" size={24} color={variantGroups.length === 1 ? '#d1d5db' : '#ef4444'} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.optionsContainer}>
                    {group.options.map((option) => (
                      <View key={option.id} style={styles.optionChip}>
                        <Text style={styles.optionText}>{option.title}</Text>
                        <TouchableOpacity onPress={() => removeOption(group.id, option.id)}>
                          <Ionicons name="close" size={16} color="#6b7280" />
                        </TouchableOpacity>
                      </View>
                    ))}
                    <TextInput
                      style={styles.optionInput}
                      placeholder="Type and press enter..."
                      placeholderTextColor="#9ca3af"
                      value={newOptionText[group.id] || ''}
                      onChangeText={(text) => setNewOptionText(prev => ({ ...prev, [group.id]: text }))}
                      onSubmitEditing={() => {
                        const text = newOptionText[group.id];
                        if (text?.trim()) {
                          addOption(group.id, text.trim());
                          setNewOptionText(prev => ({ ...prev, [group.id]: '' }));
                        }
                      }}
                    />
                  </View>
                </View>
              ))}

              <TouchableOpacity style={styles.addButton} onPress={addVariantGroup}>
                <Ionicons name="add" size={20} color="#6b7280" />
                <Text style={styles.addButtonText}>Add more option type</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Dimensions for non-variant products */}
          {!showVariants && (
            <View style={styles.dimensionsSection}>
              <Text style={styles.sectionTitle}>Product Dimensions & Weight</Text>
              
              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.flex1, styles.marginRight]}>
                  <Text style={styles.label}>Length (cm)</Text>
                  <TextInput
                    style={styles.input}
                    value={productLength}
                    onChangeText={setProductLength}
                    placeholder="0.0"
                    keyboardType="decimal-pad"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
                <View style={[styles.inputGroup, styles.flex1]}>
                  <Text style={styles.label}>Width (cm)</Text>
                  <TextInput
                    style={styles.input}
                    value={productWidth}
                    onChangeText={setProductWidth}
                    placeholder="0.0"
                    keyboardType="decimal-pad"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.flex1, styles.marginRight]}>
                  <Text style={styles.label}>Height (cm)</Text>
                  <TextInput
                    style={styles.input}
                    value={productHeight}
                    onChangeText={setProductHeight}
                    placeholder="0.0"
                    keyboardType="decimal-pad"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
                <View style={[styles.inputGroup, styles.flex1]}>
                  <Text style={styles.label}>Weight</Text>
                  <View style={styles.row}>
                    <TextInput
                      style={[styles.input, styles.flex1, styles.marginRight]}
                      value={productWeight}
                      onChangeText={setProductWeight}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                      placeholderTextColor="#9ca3af"
                    />
                    <View style={styles.unitPicker}>
                      <Picker
                        selectedValue={productWeightUnit}
                        onValueChange={(value) => setProductWeightUnit(value as any)}
                        style={styles.picker}
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

      {/* Step 4: Refundable Option (for non-variant products) */}
      {!showVariants && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Step 4: Refund Options</Text>
            <Text style={styles.cardDescription}>
              Configure refund eligibility for this product
            </Text>
          </View>

          <View style={styles.cardContent}>
            <View style={styles.switchRow}>
              <View style={styles.flex1}>
                <Text style={styles.switchLabel}>Refundable</Text>
                <Text style={styles.switchDescription}>
                  Whether this product is eligible for refunds
                </Text>
              </View>
              <Switch value={isRefundable} onValueChange={setIsRefundable} />
            </View>
          </View>
        </View>
      )}

      {/* Step 5: Critical Stock Alert (for non-variant products) */}
      {!showVariants && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Step 5: Stock Alerts</Text>
            <Text style={styles.cardDescription}>
              Set up low stock notifications
            </Text>
          </View>

          <View style={styles.cardContent}>
            <View style={styles.switchRow}>
              <View style={styles.flex1}>
                <Text style={styles.switchLabel}>Critical Stock Trigger ⚠️</Text>
                <Text style={styles.switchDescription}>
                  Receive notification when stock is low
                </Text>
              </View>
              <Switch value={enableCriticalTrigger} onValueChange={setEnableCriticalTrigger} />
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
                  placeholderTextColor="#9ca3af"
                />
              </View>
            )}
          </View>
        </View>
      )}

      {/* SKU Combinations (for variant products) */}
      {showVariants && skuCombinations.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Generated Combinations</Text>
            <Text style={styles.cardDescription}>
              All combinations from your variant choices
            </Text>
          </View>

          <View style={styles.cardContent}>
            {skuCombinations.map((sku, index) => (
              <View key={sku.id} style={styles.skuCard}>
                <View style={styles.skuCardHeader}>
                  <Text style={styles.skuCardTitle}>
                    Combination {index + 1}: {variantGroups.map((g) => 
                      g.options.find(o => o.id === sku.option_map[g.id])?.title
                    ).join(' / ')}
                  </Text>
                  <View style={styles.activeSwitchContainer}>
                    <Text style={styles.activeSwitchLabel}>Active</Text>
                    <Switch
                      value={sku.is_active ?? true}
                      onValueChange={(checked) => {
                        setSkuCombinations(prev => prev.map(s => 
                          s.id === sku.id ? { ...s, is_active: checked } : s
                        ));
                      }}
                    />
                  </View>
                </View>

                {/* Image Upload Section */}
                <View style={styles.skuImageSection}>
                  <Text style={styles.skuSectionTitle}>Product Image</Text>
                  <TouchableOpacity 
                    style={styles.skuImageUpload}
                    onPress={async () => {
                      const result = await ImagePicker.launchImageLibraryAsync({
                        mediaTypes: ImagePicker.MediaTypeOptions.Images,
                        allowsEditing: true,
                        quality: 1,
                      });
                      
                      if (!result.canceled) {
                        setSkuCombinations(prev => prev.map(s => 
                          s.id === sku.id ? { ...s, imageUri: result.assets[0].uri } : s
                        ));
                      }
                    }}
                  >
                    {sku.imageUri ? (
                      <Image source={{ uri: sku.imageUri }} style={styles.skuImage} />
                    ) : (
                      <View style={styles.skuImagePlaceholder}>
                        <Ionicons name="image-outline" size={32} color="#9ca3af" />
                        <Text style={styles.uploadImageText}>Tap to upload</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  {sku.imageUri && (
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => {
                        setSkuCombinations(prev => prev.map(s => 
                          s.id === sku.id ? { ...s, imageUri: undefined } : s
                        ));
                      }}
                    >
                      <Ionicons name="trash-outline" size={16} color="#ef4444" />
                      <Text style={styles.removeImageText}>Remove Image</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Variant Info (Read-only) */}
                <View style={styles.variantInfoSection}>
                  <Text style={styles.skuSectionTitle}>Variant Information</Text>
                  <View style={styles.threeColumnGrid}>
                    <View style={styles.gridItem}>
                      <Text style={styles.gridLabel}>Size</Text>
                      <Text style={styles.gridValue}>
                        {variantGroups.find(g => g.title.toLowerCase().includes('size'))?.options.find(o => o.id === sku.option_map[variantGroups.find(g => g.title.toLowerCase().includes('size'))?.id || ''])?.title || 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.gridItem}>
                      <Text style={styles.gridLabel}>Color</Text>
                      <Text style={styles.gridValue}>
                        {variantGroups.find(g => g.title.toLowerCase().includes('color'))?.options.find(o => o.id === sku.option_map[variantGroups.find(g => g.title.toLowerCase().includes('color'))?.id || ''])?.title || 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.gridItem}>
                      <Text style={styles.gridLabel}>SKU Code</Text>
                      <TextInput
                        style={styles.gridInput}
                        value={sku.sku_code || ''}
                        onChangeText={(text) => {
                          setSkuCombinations(prev => prev.map(s => 
                            s.id === sku.id ? { ...s, sku_code: text } : s
                          ));
                        }}
                        placeholder="Enter SKU"
                        placeholderTextColor="#9ca3af"
                      />
                    </View>
                  </View>
                </View>

                {/* Pricing Section */}
                <View style={styles.section}>
                  <Text style={styles.skuSectionTitle}>Pricing & Stock</Text>
                  <View style={styles.threeColumnGrid}>
                    <View style={styles.gridItem}>
                      <Text style={styles.gridLabel}>Price *</Text>
                      <TextInput
                        style={styles.gridInput}
                        value={sku.price?.toString() || ''}
                        onChangeText={(text) => {
                          setSkuCombinations(prev => prev.map(s => 
                            s.id === sku.id ? { ...s, price: parseFloat(text) || '' } : s
                          ));
                        }}
                        placeholder="0.00"
                        keyboardType="decimal-pad"
                        placeholderTextColor="#9ca3af"
                      />
                    </View>
                    <View style={styles.gridItem}>
                      <Text style={styles.gridLabel}>Compare Price</Text>
                      <TextInput
                        style={styles.gridInput}
                        value={sku.compare_price?.toString() || ''}
                        onChangeText={(text) => {
                          setSkuCombinations(prev => prev.map(s => 
                            s.id === sku.id ? { ...s, compare_price: parseFloat(text) || '' } : s
                          ));
                        }}
                        placeholder="0.00"
                        keyboardType="decimal-pad"
                        placeholderTextColor="#9ca3af"
                      />
                    </View>
                    <View style={styles.gridItem}>
                      <Text style={styles.gridLabel}>Quantity *</Text>
                      <TextInput
                        style={styles.gridInput}
                        value={sku.quantity?.toString() || ''}
                        onChangeText={(text) => {
                          setSkuCombinations(prev => prev.map(s => 
                            s.id === sku.id ? { ...s, quantity: parseInt(text) || '' } : s
                          ));
                        }}
                        placeholder="0"
                        keyboardType="numeric"
                        placeholderTextColor="#9ca3af"
                      />
                    </View>
                  </View>
                </View>

                {/* Critical Stock Section */}
                <View style={styles.section}>
                  <Text style={styles.skuSectionTitle}>Stock Alert</Text>
                  <View style={styles.threeColumnGrid}>
                    <View style={styles.gridItem}>
                      <Text style={styles.gridLabel}>Critical Threshold</Text>
                      <TextInput
                        style={styles.gridInput}
                        value={sku.critical_trigger?.toString() || ''}
                        onChangeText={(text) => {
                          setSkuCombinations(prev => prev.map(s => 
                            s.id === sku.id ? { ...s, critical_trigger: parseInt(text) || '' } : s
                          ));
                        }}
                        placeholder="5"
                        keyboardType="numeric"
                        placeholderTextColor="#9ca3af"
                      />
                    </View>
                    <View style={styles.gridItem}>
                      <Text style={styles.gridLabel}>Refundable</Text>
                      <Switch
                        value={sku.is_refundable ?? false}
                        onValueChange={(checked) => {
                          setSkuCombinations(prev => prev.map(s => 
                            s.id === sku.id ? { ...s, is_refundable: checked } : s
                          ));
                        }}
                      />
                    </View>
                  </View>
                </View>

                {/* Dimensions Section */}
                <View style={styles.section}>
                  <Text style={styles.skuSectionTitle}>Dimensions (cm)</Text>
                  <View style={styles.threeColumnGrid}>
                    <View style={styles.gridItem}>
                      <Text style={styles.gridLabel}>Length</Text>
                      <TextInput
                        style={styles.gridInput}
                        value={sku.length?.toString() || ''}
                        onChangeText={(text) => {
                          setSkuCombinations(prev => prev.map(s => 
                            s.id === sku.id ? { ...s, length: parseFloat(text) || '' } : s
                          ));
                        }}
                        placeholder="0.0"
                        keyboardType="decimal-pad"
                        placeholderTextColor="#9ca3af"
                      />
                    </View>
                    <View style={styles.gridItem}>
                      <Text style={styles.gridLabel}>Width</Text>
                      <TextInput
                        style={styles.gridInput}
                        value={sku.width?.toString() || ''}
                        onChangeText={(text) => {
                          setSkuCombinations(prev => prev.map(s => 
                            s.id === sku.id ? { ...s, width: parseFloat(text) || '' } : s
                          ));
                        }}
                        placeholder="0.0"
                        keyboardType="decimal-pad"
                        placeholderTextColor="#9ca3af"
                      />
                    </View>
                    <View style={styles.gridItem}>
                      <Text style={styles.gridLabel}>Height</Text>
                      <TextInput
                        style={styles.gridInput}
                        value={sku.height?.toString() || ''}
                        onChangeText={(text) => {
                          setSkuCombinations(prev => prev.map(s => 
                            s.id === sku.id ? { ...s, height: parseFloat(text) || '' } : s
                          ));
                        }}
                        placeholder="0.0"
                        keyboardType="decimal-pad"
                        placeholderTextColor="#9ca3af"
                      />
                    </View>
                  </View>
                </View>

                {/* Weight Section */}
                <View style={styles.section}>
                  <Text style={styles.skuSectionTitle}>Weight</Text>
                  <View style={styles.threeColumnGrid}>
                    <View style={[styles.gridItem, styles.gridItemWide]}>
                      <Text style={styles.gridLabel}>Weight Value</Text>
                      <TextInput
                        style={styles.gridInput}
                        value={sku.weight?.toString() || ''}
                        onChangeText={(text) => {
                          setSkuCombinations(prev => prev.map(s => 
                            s.id === sku.id ? { ...s, weight: parseFloat(text) || '' } : s
                          ));
                        }}
                        placeholder="0.00"
                        keyboardType="decimal-pad"
                        placeholderTextColor="#9ca3af"
                      />
                    </View>
                    <View style={styles.gridItem}>
                      <Text style={styles.gridLabel}>Unit</Text>
                      <View style={styles.gridPickerContainer}>
                        <Picker
                          selectedValue={sku.weight_unit || ''}
                          onValueChange={(value) => {
                            setSkuCombinations(prev => prev.map(s => 
                              s.id === sku.id ? { ...s, weight_unit: value as any } : s
                            ));
                          }}
                          style={styles.gridPicker}
                        >
                          <Picker.Item label="Unit" value="" />
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
            ))}
          </View>
        </View>
      )}

      {/* Submit Button */}
      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitButtonText}>Create Product</Text>
      </TouchableOpacity>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  cardHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
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
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#fff',
  },
  inputSuccess: {
    borderColor: '#10b981',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#fff',
    minHeight: 100,
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
  row: {
    flexDirection: 'row',
  },
  flex1: {
    flex: 1,
  },
  marginRight: {
    marginRight: 8,
  },
  button: {
    backgroundColor: '#9333ea',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#d1d5db',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  predictionCard: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
  },
  predictionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  predictionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  predictionResult: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  predictionContent: {
    marginBottom: 8,
  },
  predictedCategory: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  confidenceBadge: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  confidenceText: {
    fontSize: 12,
    color: '#065f46',
    fontWeight: '500',
  },
  selectButton: {
    backgroundColor: '#10b981',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignSelf: 'flex-start',
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
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  mediaCountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mediaHint: {
    fontSize: 12,
    color: '#6b7280',
  },
  badge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 12,
    color: '#374151',
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mediaItem: {
    width: (SCREEN_WIDTH - 64) / 3,
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
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  coverBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ef4444',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadBox: {
    width: (SCREEN_WIDTH - 64) / 3,
    aspectRatio: 1,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#d1d5db',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  switchDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  variantSection: {
    marginTop: 16,
  },
  variantGroup: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  variantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  variantInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#fff',
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
  },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  optionText: {
    fontSize: 13,
    color: '#111827',
  },
  optionInput: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
    minWidth: 100,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 8,
  },
  addButtonText: {
    fontSize: 14,
    color: '#6b7280',
  },
  dimensionsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  unitPicker: {
    width: 80,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    overflow: 'hidden',
  },
  skuCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  skuCardHeader: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  skuCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  activeSwitchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  activeSwitchLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  skuImageSection: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  skuSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  skuImageUpload: {
    width: 120,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#d1d5db',
    alignSelf: 'center',
  },
  skuImage: {
    width: '100%',
    height: '100%',
  },
  skuImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadImageText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  removeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 8,
  },
  removeImageText: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '500',
  },
  variantInfoSection: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  section: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  threeColumnGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    width: (SCREEN_WIDTH - 80) / 3,
    minWidth: 100,
  },
  gridItemWide: {
    width: ((SCREEN_WIDTH - 80) / 3) * 2 + 12,
  },
  gridLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 6,
  },
  gridValue: {
    fontSize: 14,
    color: '#111827',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  gridInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#111827',
    backgroundColor: '#fff',
  },
  gridPickerContainer: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  gridPicker: {
    height: 40,
  },
  skuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  skuTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  submitButton: {
    backgroundColor: '#9333ea',
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 32,
  },
});