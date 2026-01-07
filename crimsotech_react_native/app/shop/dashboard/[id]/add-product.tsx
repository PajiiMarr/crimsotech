import { useAuth } from '@/contexts/AuthContext';
import { useShop } from '@/contexts/ShopContext';
import { API_CONFIG } from '@/utils/config';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    Dimensions,
    FlatList,
    Image,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;
const isLargeDevice = width > 414;

// Define product data type
type ProductData = {
  // Step 1 - Basic Info
  name: string;
  quantity: number;
  description: string;
  condition: string;
  price: number;
  category: string;
  categoryAdmin: string;
  
  // Step 2 - Media
  mediaFiles: Array<{
    id: string;
    uri: string;
    type: 'image' | 'video';
    isCover: boolean;
  }>;
  
  // Step 3 - Variations
  enableVariations: boolean;
  variationGroups: Array<{
    id: string;
    type: string; // Size, Color, etc.
    values: string[]; // Small, Medium, Large
  }>;
  generatedVariants: Array<{
    id: string;
    name: string;
    price: number;
    comparePrice: number;
    quantity: number;
    critical: number;
    length: number;
    width: number;
    height: number;
    weight: number;
    unit: string;
    skuCode: string;
    isActive: boolean;
    media: string | null;
  }>;
  
  // Step 4 - Dimensions
  length: number;
  width: number;
  height: number;
  weight: number;
  unit: string;
  
  // Step 5 - Swap Options
  enableSwap: boolean;
  swapType: string;
  minAdditionalPayment: number;
  maxAdditionalPayment: number;
  acceptedCategories: string[];
  swapDescription: string;
};

// Condition options
const conditionOptions = [
  'Brand New',
  'Like New',
  'Excellent',
  'Good',
  'Fair',
  'For Parts'
];

// Swap categories
const swapCategories = [
  'Audio & Headphones',
  'Cameras & Photography',
  'Computer Accessories',
  'Gaming Consoles & Accessories',
  'Home Electronics',
  'Laptops & Computers',
  'Mobile Accessories',
  'Smartphones & Tablets',
  'Smartwatches & Wearables',
  'TVs & Monitors'
];

export default function AddProductScreen() {
  const params = useLocalSearchParams();
  const shopId = params.id as string;
  const { user } = useAuth();
  const { dispatch } = useShop();
  
  // Navigation steps
  const [currentStep, setCurrentStep] = useState(1);
  const [productData, setProductData] = useState<ProductData>({
    name: '',
    quantity: 1,
    description: '',
    condition: 'Excellent',
    price: 0,
    category: '',
    categoryAdmin: '',
    mediaFiles: [],
    enableVariations: false,
    variationGroups: [],
    generatedVariants: [],
    length: 0,
    width: 0,
    height: 0,
    weight: 0,
    unit: 'kg',
    enableSwap: false,
    swapType: 'Direct Swap',
    minAdditionalPayment: 0,
    maxAdditionalPayment: 0,
    acceptedCategories: [],
    swapDescription: '',
  });
  
  // UI states
  const [isImagePickerModalVisible, setImagePickerModalVisible] = useState(false);
  const [conditionModalVisible, setConditionModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  
  // Add validation
  const validateStep = (step: number) => {
    switch(step) {
      case 1: // Basic info
        return productData.name.trim() !== '' && 
               productData.description.trim() !== '' && 
               productData.price > 0;
      case 2: // Media
        return productData.mediaFiles.length > 0 && 
               productData.mediaFiles.some(file => file.isCover); // At least one cover image
      case 3: // Variations
        if (productData.enableVariations) {
          return productData.generatedVariants.length > 0;
        }
        return true; // If variations are disabled, step is valid
      case 4: // Dimensions
        return true; // All fields are optional
      case 5: // Swap
        if (productData.enableSwap) {
          return productData.acceptedCategories.length > 0;
        }
        return true; // If swap is disabled, step is valid
      default:
        return false;
    }
  };
  
  // Navigation functions
  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 5) {
        setCurrentStep(currentStep + 1);
      } else {
        // Submit product
        handleSubmit();
      }
    } else {
      Alert.alert('Validation Error', `Please complete all required fields in Step ${currentStep}`);
    }
  };
  
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  // Handle product submission
  const handleSubmit = async () => {
    try {
      // First ensure the user is registered as a customer
      if (user && (user.user_id || user.id)) {
        const userId = user.user_id || user.id;
        try {
          // Import the API function to register user as customer
          const { registerUserAsCustomer } = await import('@/utils/api');
          await registerUserAsCustomer(userId);
        } catch (regError) {
          console.log('User might already be registered as customer:', regError);
          // Continue anyway since this might fail if already registered
        }
      }

      // Prepare product data for API submission
      const productPayload = new FormData();

      // Basic product info - make sure all required fields are present for the ModelViewSet create method
      // Append all product data
      productPayload.append('name', productData.name);
      productPayload.append('description', productData.description);
      productPayload.append('price', productData.price.toString() || '0');
      productPayload.append('quantity', productData.quantity.toString() || '1');
      productPayload.append('status', 'active');
      productPayload.append('condition', productData.condition || 'New');
      productPayload.append('upload_status', 'published'); // Add this to make products visible
      productPayload.append('category_admin_id', productData.categoryAdmin || 'none'); // The ModelViewSet expects 'category_admin_id'
      productPayload.append('shop', shopId); // From route params - make sure this is valid
      productPayload.append('customer_id', user?.user_id || user?.id || ''); // From auth context - the ModelViewSet expects 'customer_id'
      // Note: category field expects UUID, not name - don't send category name from AI suggestion

      // Dimensions
      productPayload.append('length', productData.length.toString());
      productPayload.append('width', productData.width.toString());
      productPayload.append('height', productData.height.toString());
      productPayload.append('weight', productData.weight.toString());
      productPayload.append('unit', productData.unit);

      // Add media files
      productData.mediaFiles.forEach((file, index) => {
        if (file.uri) {
          // Create a file object from the URI
          const filename = file.uri.split('/').pop();
          const fileExtension = filename?.split('.').pop();
          const mimeType = file.type === 'image' ? `image/${fileExtension}` : `video/${fileExtension}`;

          productPayload.append('media_files', {
            uri: file.uri,
            type: mimeType,
            name: filename || `product_media_${Date.now()}_${index}.${fileExtension || 'jpg'}`
          } as any);
        }
      });

      // Show loading indicator
      Alert.alert(
        'Confirm Submission',
        'Are you sure you want to create this product?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Submit',
            onPress: async () => {
              try {
                console.log('Sending product data to:', `${API_CONFIG.BASE_URL}/api/seller-products/`);

                // Use the seller products endpoint for shop-linked items
                const response = await fetch(`${API_CONFIG.BASE_URL}/api/seller-products/`, {
                  method: 'POST',
                  body: productPayload,
                });

                console.log('Response status:', response.status);

                // Clone the response to read it multiple times
                const responseClone = response.clone();

                // Attempt to parse JSON response
                let result;
                try {
                  result = await response.json();
                  console.log('Response data:', result);
                } catch (parseError) {
                  console.error('Error parsing response JSON:', parseError);
                  // If we can't parse JSON, try to get text response
                  try {
                    const responseText = await responseClone.text();
                    console.log('Response text:', responseText);
                    result = { error: `HTTP Error ${response.status}`, message: responseText || 'Response parsing error' };
                  } catch (textError) {
                    console.error('Error reading response text:', textError);
                    result = { error: `HTTP Error ${response.status}`, message: 'Could not read response' };
                  }
                }

                if (response.ok) {
                  // Map the created product into context state
                  const apiProduct = (result.products && result.products[0]) || result.product || result;
                  if (apiProduct) {
                    console.log('API Product media_files:', apiProduct.media_files);
                    
                    // Map media files to full URLs
                    const imageUrls = (apiProduct.media_files || []).map((m: any) => {
                      const path = m.url || m.file_data || m.file || '';
                      if (!path) return '';
                      
                      // If path is already a full URL, use it as-is
                      if (path.startsWith('http://') || path.startsWith('https://')) {
                        return path;
                      }
                      
                      // Otherwise, prepend the base URL
                      const cleanPath = path.startsWith('/') ? path : `/${path}`;
                      return `${API_CONFIG.BASE_URL}${cleanPath}`;
                    }).filter(Boolean);
                    
                    console.log('Mapped image URLs:', imageUrls);
                    
                    const mappedProduct = {
                      id: apiProduct.id,
                      name: apiProduct.name,
                      description: apiProduct.description,
                      price: Number(apiProduct.price) || 0,
                      quantity: apiProduct.quantity ?? 0,
                      condition: apiProduct.condition || 'Unknown',
                      category: apiProduct.category?.name || '',
                      productType: apiProduct.category_admin?.name || 'General',
                      brand: apiProduct.brand || '',
                      model: apiProduct.model || '',
                      color: apiProduct.color || '',
                      ram: apiProduct.ram || '',
                      rom: apiProduct.rom || '',
                      specifications: apiProduct.specifications || '',
                      packageContents: apiProduct.packageContents || '',
                      knownIssues: apiProduct.knownIssues || '',
                      targetBuyer: apiProduct.targetBuyer || 'daily users',
                      images: imageUrls,
                      shopId: apiProduct.shop?.id || shopId,
                      createdAt: apiProduct.created_at || new Date().toISOString(),
                      updatedAt: apiProduct.updated_at || new Date().toISOString(),
                      status: (apiProduct.status || 'active').toLowerCase(),
                    };

                    dispatch({ type: 'ADD_PRODUCT', payload: mappedProduct });
                  }

                  Alert.alert('Success', 'Product created successfully!', [
                    {
                      text: 'OK',
                      onPress: () => router.back()
                    }
                  ]);
                } else {
                  Alert.alert('Error', result.error || result.message || `Failed with status ${response.status}. Please try again.`);
                }
              } catch (error: any) {
                console.error('Product creation error:', error);
                console.error('Error details:', {
                  message: error.message,
                  name: error.name,
                  stack: error.stack
                });

                if (error.name === 'TypeError' && error.message.includes('Network')) {
                  Alert.alert(
                    'Network Error',
                    'Unable to connect to the server. Please check:\n\n' +
                    '1. Backend server is running on port 8000\n' +
                    '2. Your IP address is correct in utils/config.ts\n' +
                    '3. Both devices are on the same network\n' +
                    '4. Firewall is not blocking the connection\n\n' +
                    'Current API URL: ' + API_CONFIG.BASE_URL + '/api/seller-products/\n\n' +
                    'Error: ' + error.message,
                    [
                      {
                        text: 'OK',
                        onPress: () => {
                          console.log('Current API config:', API_CONFIG.BASE_URL);
                          console.log('User info:', user);
                          console.log('Shop ID:', shopId);
                        }
                      }
                    ]
                  );
                } else {
                  Alert.alert('Error', error.message || 'An error occurred while creating the product.');
                }
              }
            }
          }
        ]
      );
    } catch (error: any) {
      console.error('Submission error:', error);
      Alert.alert('Error', error.message || 'An error occurred while preparing product data.');
    }
  };
  
  // Update product data
  const updateProductData = (updates: Partial<ProductData>) => {
    setProductData(prev => ({ ...prev, ...updates }));
  };
  
  // Add media file
  const addMediaFile = (uri: string, type: 'image' | 'video' = 'image') => {
    const newFile = {
      id: Date.now().toString(),
      uri,
      type,
      isCover: productData.mediaFiles.length === 0 // First file is automatic cover
    };
    
    updateProductData({
      mediaFiles: [...productData.mediaFiles, newFile]
    });
  };
  
  // Toggle cover image
  const setAsCover = (id: string) => {
    const updatedFiles = productData.mediaFiles.map(file => ({
      ...file,
      isCover: file.id === id
    }));
    updateProductData({ mediaFiles: updatedFiles });
  };
  
  // Render step content
  const renderStepContent = () => {
    switch(currentStep) {
      case 1: // Step 1: AI Category Prediction
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Step 1: AI Category Prediction</Text>
            <Text style={styles.stepDescription}>
              Basic product details are entered here, and AI suggests the best category.
            </Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Product Name *</Text>
              <TextInput
                style={styles.input}
                value={productData.name}
                onChangeText={(text) => updateProductData({ name: text })}
                placeholder="Enter product name"
              />
            </View>
            
            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Quantity</Text>
                <TextInput
                  style={styles.input}
                  value={productData.quantity === 0 ? '' : productData.quantity.toString()}
                  onChangeText={(text) => {
                    const value = text === '' ? 0 : parseInt(text);
                    if (!isNaN(value) && value >= 0) {
                      updateProductData({ quantity: value });
                    }
                  }}
                  placeholder="1"
                  keyboardType="numeric"
                />
              </View>
              
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>Condition</Text>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setConditionModalVisible(true)}
                >
                  <Text style={[styles.pickerButtonText, !productData.condition && styles.pickerPlaceholder]}>
                    {productData.condition || 'Select condition'}
                  </Text>
                  <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={productData.description}
                onChangeText={(text) => updateProductData({ description: text })}
                placeholder="Enter product description"
                multiline
                numberOfLines={4}
              />
            </View>
            
            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Price *</Text>
                <TextInput
                  style={styles.input}
                  value={productData.price.toString()}
                  onChangeText={(text) => updateProductData({ price: parseFloat(text) || 0 })}
                  placeholder="0.00"
                  keyboardType="numeric"
                />
              </View>
              
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>AI Suggested Category</Text>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setCategoryModalVisible(true)}
                >
                  <Text style={[styles.pickerButtonText, !productData.category && styles.pickerPlaceholder]}>
                    {productData.category || 'Select category'}
                  </Text>
                  <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.aiPredictionSection}>
              <Text style={styles.aiPredictionTitle}>AI Category Prediction</Text>
              <Text style={styles.aiPredictionDescription}>
                Based on your product details, AI suggests: <Text style={styles.aiSuggestion}>{productData.category || 'No suggestion yet'}</Text>
              </Text>
              {productData.category && (
                <TouchableOpacity
                  style={styles.addCategoryButton}
                  onPress={() => {
                    if (productData.category && !productData.acceptedCategories.includes(productData.category)) {
                      updateProductData({ acceptedCategories: [...productData.acceptedCategories, productData.category] });
                      Alert.alert('Success', 'AI suggested category added to accepted categories');
                    }
                  }}
                >
                  <MaterialIcons name="add" size={16} color="#fff" />
                  <Text style={styles.addCategoryButtonText}>Add to Accepted Categories</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
        
      case 2: // Step 2: Product Media
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Step 2: Product Media</Text>
            <Text style={styles.stepDescription}>
              Upload main product images and videos. Max 9 files, 50MB each. 
              First file becomes the cover image.
            </Text>
            
            {productData.mediaFiles.length > 0 && (
              <View style={styles.mediaPreviewContainer}>
                <FlatList
                  data={productData.mediaFiles}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item, index }) => (
                    <TouchableOpacity 
                      style={[styles.mediaPreviewItem, item.isCover && styles.coverImage]}
                      onPress={() => setSelectedImageIndex(index)}
                    >
                      {item.type === 'image' ? (
                        <Image source={{ uri: item.uri }} style={styles.mediaPreview} resizeMode="cover" />
                      ) : (
                        <View style={[styles.mediaPreview, { backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' }]}>
                          <MaterialIcons name="videocam" size={40} color="#fff" />
                        </View>
                      )}
                      {item.isCover && (
                        <View style={styles.coverBadge}>
                          <Text style={styles.coverBadgeText}>Cover</Text>
                        </View>
                      )}
                      <TouchableOpacity 
                        style={styles.removeMediaButton}
                        onPress={() => {
                          const updated = productData.mediaFiles.filter(f => f.id !== item.id);
                          // If we removed the cover, make the first one the new cover
                          if (item.isCover && updated.length > 0) {
                            updated[0].isCover = true;
                          }
                          updateProductData({ mediaFiles: updated });
                        }}
                      >
                        <MaterialIcons name="close" size={16} color="#fff" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}
            
            <TouchableOpacity 
              style={styles.addMediaButton}
              onPress={() => setImagePickerModalVisible(true)}
              disabled={productData.mediaFiles.length >= 9}
            >
              <MaterialIcons name="add" size={24} color={productData.mediaFiles.length >= 9 ? "#ccc" : "#666"} />
              <Text style={[styles.addMediaText, productData.mediaFiles.length >= 9 && { color: '#ccc' }]}>
                Add Picture/Video
              </Text>
            </TouchableOpacity>
            
            <Text style={styles.mediaInfo}>
              {productData.mediaFiles.length}/9 files uploaded
            </Text>
          </View>
        );
        
      case 3: // Step 3: Variations
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Step 3: Variations (Optional)</Text>
            <View style={styles.toggleContainer}>
              <Text style={styles.toggleLabel}>Enable Product Variations</Text>
              <Switch
                value={productData.enableVariations}
                onValueChange={(value) => updateProductData({ enableVariations: value })}
                trackColor={{ false: "#767577", true: "#ff6d0b" }}
                thumbColor={productData.enableVariations ? "#fff" : "#f4f3f4"}
              />
            </View>
            
            {productData.enableVariations && (
              <View style={styles.variationContent}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Option Type (e.g., Size, Color)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Size"
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Option Value (e.g., Small)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Small"
                  />
                </View>
                
                <TouchableOpacity style={styles.addButton}>
                  <Text style={styles.addButtonText}>Add Option</Text>
                </TouchableOpacity>
                
                <Text style={styles.variationGroupTitle}>Generated Combinations</Text>
                
                {/* Table Header */}
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderText, styles.colImage]}>Image</Text>
                  <Text style={[styles.tableHeaderText, styles.colSize]}>Size</Text>
                  <Text style={[styles.tableHeaderText, styles.colPrice]}>Price</Text>
                  <Text style={[styles.tableHeaderText, styles.colCompare]}>Compare</Text>
                  <Text style={[styles.tableHeaderText, styles.colQuantity]}>Quantity</Text>
                  <Text style={[styles.tableHeaderText, styles.colCritical]}>Critical</Text>
                </View>
                
                {/* Table Rows */}
                <FlatList
                  data={productData.generatedVariants}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <View style={styles.tableRow}>
                      <View style={[styles.tableCell, styles.colImage]}>
                        <View style={styles.imagePlaceholder} />
                      </View>
                      <View style={[styles.tableCell, styles.colSize]}>
                        <TextInput
                          style={styles.tableInput}
                          value={item.name}
                          placeholder="Size"
                        />
                      </View>
                      <View style={[styles.tableCell, styles.colPrice]}>
                        <TextInput
                          style={styles.tableInput}
                          value={item.price.toString()}
                          keyboardType="numeric"
                        />
                      </View>
                      <View style={[styles.tableCell, styles.colCompare]}>
                        <TextInput
                          style={styles.tableInput}
                          value={item.comparePrice.toString()}
                          keyboardType="numeric"
                        />
                      </View>
                      <View style={[styles.tableCell, styles.colQuantity]}>
                        <TextInput
                          style={styles.tableInput}
                          value={item.quantity.toString()}
                          keyboardType="numeric"
                        />
                      </View>
                      <View style={[styles.tableCell, styles.colCritical]}>
                        <TextInput
                          style={styles.tableInput}
                          value={item.critical.toString()}
                          keyboardType="numeric"
                        />
                      </View>
                    </View>
                  )}
                />
                
                {/* Additional fields row */}
                <View style={styles.tableRow}>
                  <View style={[styles.tableCell, styles.colImage]}>
                    <Text style={styles.tableCellLabel}>L (cm)</Text>
                    <Text style={styles.tableCellLabel}>W (cm)</Text>
                    <Text style={styles.tableCellLabel}>H (cm)</Text>
                    <Text style={styles.tableCellLabel}>Weight</Text>
                    <Text style={styles.tableCellLabel}>Unit</Text>
                    <Text style={styles.tableCellLabel}>SKU Code</Text>
                    <Text style={styles.tableCellLabel}>Swap</Text>
                    <Text style={styles.tableCellLabel}>Active</Text>
                  </View>
                  <View style={[styles.tableCell, styles.colSize]}>
                    <TextInput style={styles.tableInput} placeholder="0" keyboardType="numeric" />
                    <TextInput style={styles.tableInput} placeholder="0" keyboardType="numeric" />
                    <TextInput style={styles.tableInput} placeholder="0" keyboardType="numeric" />
                    <TextInput style={styles.tableInput} placeholder="0" keyboardType="numeric" />
                    <View style={styles.pickerContainer}>
                      <TextInput style={[styles.input, styles.pickerInput]} placeholder="kg" />
                      <MaterialIcons name="expand-more" size={20} color="#666" />
                    </View>
                    <TextInput style={styles.tableInput} placeholder="SKU" />
                    <Switch style={styles.tableSwitch} value={false} trackColor={{ false: "#767577", true: "#81C784" }} thumbColor="#f4f3f4" />
                    <Switch style={styles.tableSwitch} value={true} trackColor={{ false: "#767577", true: "#81C784" }} thumbColor="#f4f3f4" />
                  </View>
                  <View style={[styles.tableCell, styles.colPrice]}>
                    <TextInput style={styles.tableInput} placeholder="0" keyboardType="numeric" />
                    <TextInput style={styles.tableInput} placeholder="0" keyboardType="numeric" />
                    <TextInput style={styles.tableInput} placeholder="0" keyboardType="numeric" />
                    <TextInput style={styles.tableInput} placeholder="0" keyboardType="numeric" />
                    <View style={styles.pickerContainer}>
                      <TextInput style={[styles.input, styles.pickerInput]} placeholder="kg" />
                      <MaterialIcons name="expand-more" size={20} color="#666" />
                    </View>
                    <TextInput style={styles.tableInput} placeholder="SKU" />
                    <Switch style={styles.tableSwitch} value={false} trackColor={{ false: "#767577", true: "#81C784" }} thumbColor="#f4f3f4" />
                    <Switch style={styles.tableSwitch} value={false} trackColor={{ false: "#767577", true: "#81C784" }} thumbColor="#f4f3f4" />
                  </View>
                  <View style={[styles.tableCell, styles.colCompare]}>
                    <TextInput style={styles.tableInput} placeholder="0" keyboardType="numeric" />
                    <TextInput style={styles.tableInput} placeholder="0" keyboardType="numeric" />
                    <TextInput style={styles.tableInput} placeholder="0" keyboardType="numeric" />
                    <TextInput style={styles.tableInput} placeholder="0" keyboardType="numeric" />
                    <View style={styles.pickerContainer}>
                      <TextInput style={[styles.input, styles.pickerInput]} placeholder="kg" />
                      <MaterialIcons name="expand-more" size={20} color="#666" />
                    </View>
                    <TextInput style={styles.tableInput} placeholder="SKU" />
                    <Switch style={styles.tableSwitch} value={false} trackColor={{ false: "#767577", true: "#81C784" }} thumbColor="#f4f3f4" />
                    <Switch style={styles.tableSwitch} value={false} trackColor={{ false: "#767577", true: "#81C784" }} thumbColor="#f4f3f4" />
                  </View>
                  <View style={[styles.tableCell, styles.colQuantity]}>
                    <TextInput style={styles.tableInput} placeholder="0" keyboardType="numeric" />
                    <TextInput style={styles.tableInput} placeholder="0" keyboardType="numeric" />
                    <TextInput style={styles.tableInput} placeholder="0" keyboardType="numeric" />
                    <TextInput style={styles.tableInput} placeholder="0" keyboardType="numeric" />
                    <View style={styles.pickerContainer}>
                      <TextInput style={[styles.input, styles.pickerInput]} placeholder="kg" />
                      <MaterialIcons name="expand-more" size={20} color="#666" />
                    </View>
                    <TextInput style={styles.tableInput} placeholder="SKU" />
                    <Switch style={styles.tableSwitch} value={false} trackColor={{ false: "#767577", true: "#81C784" }} thumbColor="#f4f3f4" />
                    <Switch style={styles.tableSwitch} value={false} trackColor={{ false: "#767577", true: "#81C784" }} thumbColor="#f4f3f4" />
                  </View>
                  <View style={[styles.tableCell, styles.colCritical]}>
                    <TextInput style={styles.tableInput} placeholder="0" keyboardType="numeric" />
                    <TextInput style={styles.tableInput} placeholder="0" keyboardType="numeric" />
                    <TextInput style={styles.tableInput} placeholder="0" keyboardType="numeric" />
                    <TextInput style={styles.tableInput} placeholder="0" keyboardType="numeric" />
                    <View style={styles.pickerContainer}>
                      <TextInput style={[styles.input, styles.pickerInput]} placeholder="kg" />
                      <MaterialIcons name="expand-more" size={20} color="#666" />
                    </View>
                    <TextInput style={styles.tableInput} placeholder="SKU" />
                    <Switch style={styles.tableSwitch} value={false} trackColor={{ false: "#767577", true: "#81C784" }} thumbColor="#f4f3f4" />
                    <Switch style={styles.tableSwitch} value={false} trackColor={{ false: "#767577", true: "#81C784" }} thumbColor="#f4f3f4" />
                  </View>
                </View>
              </View>
            )}
          </View>
        );
        
      case 4: // Step 4: Dimensions & Weight
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Step 4: Product Dimensions & Weight</Text>
            <Text style={styles.stepDescription}>
              Enter the physical dimensions of your product.
            </Text>
            
            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Length (cm)</Text>
                <TextInput
                  style={styles.input}
                  value={productData.length.toString()}
                  onChangeText={(text) => updateProductData({ length: parseFloat(text) || 0 })}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>
              
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>Width (cm)</Text>
                <TextInput
                  style={styles.input}
                  value={productData.width.toString()}
                  onChangeText={(text) => updateProductData({ width: parseFloat(text) || 0 })}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>
            </View>
            
            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Height (cm)</Text>
                <TextInput
                  style={styles.input}
                  value={productData.height.toString()}
                  onChangeText={(text) => updateProductData({ height: parseFloat(text) || 0 })}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>
              
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>Weight</Text>
                <View style={styles.pickerContainer}>
                  <TextInput
                    style={[styles.input, styles.pickerInput]}
                    value={productData.weight.toString()}
                    onChangeText={(text) => updateProductData({ weight: parseFloat(text) || 0 })}
                    placeholder="0"
                    keyboardType="numeric"
                  />
                  <MaterialIcons name="expand-more" size={20} color="#666" />
                </View>
              </View>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Unit</Text>
              <View style={styles.pickerContainer}>
                <MaterialIcons name="expand-more" size={20} color="#666" />
                <TextInput
                  style={[styles.input, styles.pickerInput]}
                  value={productData.unit}
                  onChangeText={(text) => updateProductData({ unit: text })}
                  placeholder="Select unit"
                />
              </View>
            </View>
          </View>
        );
        
      case 5: // Step 5: Swap Options
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Step 5: Swap Options (Optional)</Text>
            <View style={styles.toggleContainer}>
              <Text style={styles.toggleLabel}>Enable Swap Options</Text>
              <Switch
                value={productData.enableSwap}
                onValueChange={(value) => updateProductData({ enableSwap: value })}
                trackColor={{ false: "#767577", true: "#ff6d0b" }}
                thumbColor={productData.enableSwap ? "#fff" : "#f4f3f4"}
              />
            </View>
            
            {productData.enableSwap && (
              <View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Swap Type</Text>
                  <View style={styles.pickerContainer}>
                    <MaterialIcons name="expand-more" size={20} color="#666" />
                    <TextInput
                      style={[styles.input, styles.pickerInput]}
                      value={productData.swapType}
                      onChangeText={(text) => updateProductData({ swapType: text })}
                      placeholder="Select swap type"
                    />
                  </View>
                </View>
                
                <View style={styles.inputRow}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.label}>Minimum Additional Payment</Text>
                    <TextInput
                      style={styles.input}
                      value={productData.minAdditionalPayment.toString()}
                      onChangeText={(text) => updateProductData({ minAdditionalPayment: parseFloat(text) || 0 })}
                      placeholder="0.00"
                      keyboardType="numeric"
                    />
                  </View>
                  
                  <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={styles.label}>Maximum Additional Payment</Text>
                    <TextInput
                      style={styles.input}
                      value={productData.maxAdditionalPayment.toString()}
                      onChangeText={(text) => updateProductData({ maxAdditionalPayment: parseFloat(text) || 0 })}
                      placeholder="0.00"
                      keyboardType="numeric"
                    />
                  </View>
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Accepted Categories</Text>
                  <View style={styles.chipContainer}>
                    {swapCategories.map((category) => (
                      <TouchableOpacity
                        key={category}
                        style={[
                          styles.chip,
                          productData.acceptedCategories.includes(category) && styles.chipSelected
                        ]}
                        onPress={() => {
                          const updated = productData.acceptedCategories.includes(category)
                            ? productData.acceptedCategories.filter(c => c !== category)
                            : [...productData.acceptedCategories, category];
                          updateProductData({ acceptedCategories: updated });
                        }}
                      >
                        <Text style={[
                          styles.chipText,
                          productData.acceptedCategories.includes(category) && styles.chipTextSelected
                        ]}>
                          {category}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Swap Description (Optional)</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={productData.swapDescription}
                    onChangeText={(text) => updateProductData({ swapDescription: text })}
                    placeholder="Tell others what you're looking for in a swap..."
                    multiline
                    numberOfLines={4}
                  />
                </View>
              </View>
            )}
          </View>
        );
        
      default:
        return <Text>Step {currentStep}</Text>;
    }
  };
  
  // Render step indicators
  const renderStepIndicators = () => {
    return (
      <View style={styles.stepIndicators}>
        {[1, 2, 3, 4, 5].map((step) => (
          <View key={step} style={styles.stepIndicator}>
            <TouchableOpacity
              style={[
                styles.stepCircle,
                currentStep === step && styles.activeStepCircle,
                currentStep > step && styles.completedStepCircle
              ]}
              onPress={() => setCurrentStep(step)}
            >
              {currentStep > step ? (
                <MaterialIcons name="check" size={16} color="#fff" />
              ) : (
                <Text style={[
                  styles.stepNumber,
                  currentStep === step && styles.activeStepNumber
                ]}>
                  {step}
                </Text>
              )}
            </TouchableOpacity>
            <Text style={[
              styles.stepLabel,
              currentStep === step && styles.activeStepLabel
            ]}>
              {step === 1 && 'Basic'}
              {step === 2 && 'Media'}
              {step === 3 && 'Variations'}
              {step === 4 && 'Dimensions'}
              {step === 5 && 'Swap'}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Product</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Step Indicators */}
      {renderStepIndicators()}

      {/* Scrollable Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderStepContent()}
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={styles.buttonContainer}>
        {currentStep > 1 && (
          <TouchableOpacity style={styles.backButtonNav} onPress={handleBack}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>
            {currentStep === 5 ? 'Submit Product' : 'Next'}
          </Text>
          <MaterialIcons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Image Picker Modal */}
      <Modal
        visible={isImagePickerModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setImagePickerModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Media</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton} 
                onPress={() => setImagePickerModalVisible(false)}
              >
                <MaterialIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={async () => {
                const { status } = await ImagePicker.requestCameraPermissionsAsync();
                if (status !== 'granted') {
                  Alert.alert('Permission Required', 'Camera permission is needed to take photos.');
                  return;
                }

                const result = await ImagePicker.launchCameraAsync({
                  mediaTypes: ['images'],
                  allowsEditing: true,
                  aspect: [4, 3],
                  quality: 0.8,
                });

                if (!result.canceled && result.assets && result.assets[0]) {
                  addMediaFile(result.assets[0].uri, 'image');
                }
                setImagePickerModalVisible(false);
              }}
            >
              <MaterialIcons name="photo-camera" size={24} color="#666" />
              <Text style={styles.modalOptionText}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={async () => {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') {
                  Alert.alert('Permission Required', 'Media library permission is needed to select photos.');
                  return;
                }

                const result = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ['images'],
                  allowsEditing: false,
                  allowsMultipleSelection: true,
                  quality: 0.8,
                  selectionLimit: 9 - productData.mediaFiles.length,
                });

                if (!result.canceled && result.assets) {
                  result.assets.forEach(asset => {
                    addMediaFile(asset.uri, 'image');
                  });
                }
                setImagePickerModalVisible(false);
              }}
            >
              <MaterialIcons name="image" size={24} color="#666" />
              <Text style={styles.modalOptionText}>Choose from Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={async () => {
                const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
                if (cameraPermission.status !== 'granted') {
                  Alert.alert('Permission Required', 'Camera permission is needed to record videos.');
                  return;
                }

                const result = await ImagePicker.launchCameraAsync({
                  mediaTypes: ['videos'],
                  quality: 0.7,
                });

                if (!result.canceled && result.assets && result.assets[0]) {
                  addMediaFile(result.assets[0].uri, 'video');
                }
                setImagePickerModalVisible(false);
              }}
            >
              <MaterialIcons name="videocam" size={24} color="#666" />
              <Text style={styles.modalOptionText}>Record Video</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Image Preview Modal */}
      <Modal
        visible={selectedImageIndex !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedImageIndex(null)}
      >
        <View style={styles.imagePreviewModal}>
          <TouchableOpacity 
            style={styles.imagePreviewClose}
            onPress={() => setSelectedImageIndex(null)}
          >
            <MaterialIcons name="close" size={32} color="#fff" />
          </TouchableOpacity>
          
          {selectedImageIndex !== null && (
            <Image 
              source={{ uri: productData.mediaFiles[selectedImageIndex]?.uri }} 
              style={styles.imagePreview}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {/* Condition Picker Modal */}
      <Modal
        visible={conditionModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setConditionModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Condition</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton} 
                onPress={() => setConditionModalVisible(false)}
              >
                <MaterialIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {conditionOptions.map((condition) => (
              <TouchableOpacity
                key={condition}
                style={styles.modalOption}
                onPress={() => {
                  updateProductData({ condition });
                  setConditionModalVisible(false);
                }}
              >
                <Text style={styles.modalOptionText}>{condition}</Text>
                {productData.condition === condition && (
                  <MaterialIcons name="check" size={24} color="#ff6d0b" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Category Picker Modal */}
      <Modal
        visible={categoryModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton} 
                onPress={() => setCategoryModalVisible(false)}
              >
                <MaterialIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 400 }}>
              {swapCategories.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={styles.modalOption}
                  onPress={() => {
                    updateProductData({ category });
                    setCategoryModalVisible(false);
                  }}
                >
                  <Text style={styles.modalOptionText}>{category}</Text>
                  {productData.category === category && (
                    <MaterialIcons name="check" size={24} color="#ff6d0b" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
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
    fontSize: isSmallDevice ? 18 : 20,
    fontWeight: '700',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  stepIndicators: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  stepIndicator: {
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  activeStepCircle: {
    backgroundColor: '#ff6d0b',
  },
  completedStepCircle: {
    backgroundColor: '#4CAF50',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeStepNumber: {
    color: '#FFF',
  },
  stepLabel: {
    fontSize: 12,
    color: '#666',
  },
  activeStepLabel: {
    fontWeight: '600',
    color: '#333',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  stepContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  stepTitle: {
    fontSize: isSmallDevice ? 18 : 20,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    color: '#6C757D',
    marginBottom: 16,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#FFF',
    color: '#212529',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerInput: {
    flex: 1,
    borderWidth: 0,
    paddingVertical: 0,
  },
  inputRow: {
    flexDirection: 'row',
  },
  aiPredictionSection: {
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  aiPredictionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0066CC',
    marginBottom: 4,
  },
  aiPredictionDescription: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
  },
  aiSuggestion: {
    color: '#0066CC',
    fontWeight: '600',
  },
  addCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff6d0b',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  addCategoryButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFF',
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#212529',
  },
  pickerPlaceholder: {
    color: '#999',
  },
  mediaPreviewContainer: {
    marginBottom: 16,
  },
  mediaPreviewItem: {
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 8,
    position: 'relative',
  },
  coverImage: {
    borderWidth: 2,
    borderColor: '#ff6d0b',
  },
  mediaPreview: {
    width: '100%',
    height: '100%',
  },
  coverBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: '#ff6d0b',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  coverBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },
  removeMediaButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#F44336',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addMediaButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  addMediaText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    marginLeft: 8,
  },
  mediaInfo: {
    textAlign: 'center',
    marginTop: 8,
    fontSize: 12,
    color: '#666',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 16,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
  },
  variationContent: {
    marginTop: 16,
  },
  addButton: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  addButtonText: {
    color: '#1976D2',
    fontWeight: '600',
  },
  variationGroupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingVertical: 8,
    backgroundColor: '#F5F5F5',
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingVertical: 8,
  },
  tableCell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableInput: {
    width: '90%',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 6,
    fontSize: 12,
    textAlign: 'center',
    backgroundColor: '#FFF',
  },
  tableSwitch: {
    marginVertical: 4,
  },
  colImage: { width: '15%' },
  colSize: { width: '15%' },
  colPrice: { width: '15%' },
  colCompare: { width: '15%' },
  colQuantity: { width: '15%' },
  colCritical: { width: '15%' },
  imagePlaceholder: {
    width: 30,
    height: 30,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
  },
  tableCellLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#666',
    textAlign: 'center',
    marginVertical: 2,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  chip: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  chipSelected: {
    backgroundColor: '#E3F2FD',
  },
  chipText: {
    fontSize: 12,
    color: '#424242',
  },
  chipTextSelected: {
    color: '#1976D2',
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  backButtonNav: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  nextButton: {
    backgroundColor: '#ff6d0b',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginRight: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#212529',
    marginLeft: 12,
  },
  imagePreviewModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  imagePreviewClose: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 1,
    padding: 8,
  },
});