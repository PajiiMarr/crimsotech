import { Link } from "react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Badge } from "~/components/ui/badge";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Switch } from "~/components/ui/switch";
import { Separator } from "~/components/ui/separator";
import { AlertCircle, Store, ArrowLeft, Plus, X, Image as ImageIcon, Video, Upload, Package, Truck, Loader2, Sparkles } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from 'react';
import AxiosInstance from '~/components/axios/Axios';

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
}

interface FormErrors {
  message?: string;
  name?: string;
  description?: string;
  quantity?: string;
  price?: string;
  compare_price?: string;
  condition?: string;
  shop?: string;
  category_admin_id?: string;
  [key: string]: string | undefined;
}

interface MediaPreview {
  file: File;
  preview: string;
  type: 'image' | 'video';
}

interface ShippingZone {
  id: string;
  name: 'Local' | 'Nearby City' | 'Far Province';
  fee: number | '';
  freeShipping: boolean;
}
interface VariantOption {
  id: string;
  title: string;
  quantity: number | '';
  price: number | '';
  compare_price?: number | '';
  critical_trigger?: number | '';
  enable_critical_trigger?: boolean;
  image?: File | null;
  imagePreview?: string;
  length?: number | '';
  width?: number | '';
  height?: number | '';
  weight?: number | '';
  weight_unit?: 'g' | 'kg' | 'lb' | 'oz';
}

interface VariantGroup {
  id: string;
  title: string;
  options: VariantOption[];
}

interface CreateProductFormProps {
  selectedShop: Shop | null;
  globalCategories: Category[];
  errors: FormErrors;
}

// --- PREDICTION STATE INTERFACE ---
// UPDATED: Based on actual API response
interface PredictionCategory {
  category_id: number;
  category_name: string;
  confidence: number;
}

interface PredictionResult {
  success: boolean;
  predicted_category: PredictionCategory; // Changed from number to object
  alternative_categories?: PredictionCategory[];
  all_categories?: string[];
  feature_insights?: any;
}

// --- REACT COMPONENT ---

export default function CreateProductForm({ selectedShop, globalCategories, errors }: CreateProductFormProps) {
  // Generate a simple UUID function
  const generateId = () => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  };

  // Form state
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productQuantity, setProductQuantity] = useState<number | ''>('');
  const [productPrice, setProductPrice] = useState<number | ''>('');
  const [productCondition, setProductCondition] = useState('');
  
  const [mainMedia, setMainMedia] = useState<MediaPreview[]>([]);
  const [showVariants, setShowVariants] = useState(false);
  const [variantGroups, setVariantGroups] = useState<VariantGroup[]>([]);
  const [enableCriticalTrigger, setEnableCriticalTrigger] = useState(false);
  const [criticalThreshold, setCriticalThreshold] = useState<number | ''>('');
  const [productWeight, setProductWeight] = useState<number | ''>('');
  const [productWeightUnit, setProductWeightUnit] = useState<'g' | 'kg' | 'lb' | 'oz'>('g');
  const [productLength, setProductLength] = useState<number | ''>('');
  const [productWidth, setProductWidth] = useState<number | ''>('');
  const [productHeight, setProductHeight] = useState<number | ''>('');
  const [shippingZones, setShippingZones] = useState<ShippingZone[]>([
    { id: generateId(), name: 'Local', fee: '', freeShipping: false },
    { id: generateId(), name: 'Nearby City', fee: '', freeShipping: false },
    { id: generateId(), name: 'Far Province', fee: '', freeShipping: false },
  ]);
  
  // Prediction state
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);
  const [showPrediction, setShowPrediction] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('none');
  
  // Refs for preventing duplicate requests
  const predictionInProgress = useRef(false);
  const predictionAbortController = useRef<AbortController | null>(null);
  const lastPredictionTime = useRef<number>(0);
  const predictionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if all required prediction fields are filled
  const arePredictionFieldsValid = useCallback(() => {
    return (
      productName.trim().length >= 2 &&
      productDescription.trim().length >= 10 &&
      productPrice !== '' && productPrice > 0 &&
      productCondition !== '' &&
      productQuantity !== '' && productQuantity >= 0
    );
  }, [productName, productDescription, productPrice, productCondition, productQuantity]);

  // Handle category selection change
  const handleCategoryChange = (value: string) => {
    console.log('Category changed to:', value);
    setSelectedCategoryId(value);
    
    // Also update the hidden form field
    const categoryInput = document.getElementById('category_admin_id') as HTMLSelectElement;
    if (categoryInput) {
      categoryInput.value = value;
    }
  };

  // Function to trigger category prediction
  const predictCategory = useCallback(async (source: string = 'auto') => {
    console.log(`predictCategory called from: ${source}. Valid:`, arePredictionFieldsValid(), 'In progress:', predictionInProgress.current);
    
    if (!arePredictionFieldsValid()) {
      console.log('Prediction blocked: fields not valid');
      return;
    }
    
    // Prevent duplicate requests
    if (predictionInProgress.current) {
      console.log('Prediction already in progress, skipping...');
      return;
    }
    
    // Debounce: Don't make requests too frequently
    const now = Date.now();
    if (now - lastPredictionTime.current < 2000) { // 2 second cooldown
      console.log('Prediction debounced: too soon since last request');
      return;
    }
    
    // Abort any previous request
    if (predictionAbortController.current) {
      predictionAbortController.current.abort();
    }
    
    // Create new abort controller
    predictionAbortController.current = new AbortController();
    
    setIsPredicting(true);
    setShowPrediction(true);
    predictionInProgress.current = true;
    lastPredictionTime.current = now;
    
    try {
      const predictionData = {
        quantity: productQuantity,
        price: productPrice,
        condition: productCondition,
        name: productName,
        description: productDescription
      };
      
      console.log('Sending prediction request with data:', predictionData);
      
      const response = await AxiosInstance.post('/seller-products/global-categories/predict/', predictionData, {
        signal: predictionAbortController.current.signal
      });
      
      console.log('Prediction API response:', response.data);
      console.log('Predicted category object:', response.data.predicted_category);
      
      if (response.data.success) {
        setPredictionResult(response.data);
        
        // Auto-select the predicted category
        if (response.data.predicted_category?.category_uuid) {
          const predictedCategoryId = response.data.predicted_category.category_uuid.toString();
          console.log('Setting selected category to:', predictedCategoryId);
          setSelectedCategoryId(predictedCategoryId);
          
          const categoryInput = document.getElementById('category_admin_id') as HTMLSelectElement;
          if (categoryInput) {
            categoryInput.value = predictedCategoryId;
          }
        }
      } else {
        console.error('Prediction API returned success: false', response.data);
      }
    } catch (error: any) {
      // Don't log if error is from abort
      if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
        console.log('Prediction request was cancelled');
        return;
      }
      
      console.error('Category prediction failed:', error);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      } else if (error.request) {
        console.error('No response received');
      } else {
        console.error('Error setting up request:', error.message);
      }
    } finally {
      setIsPredicting(false);
      predictionInProgress.current = false;
      predictionAbortController.current = null;
    }
  }, [arePredictionFieldsValid, productQuantity, productPrice, productCondition, productName, productDescription]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      // Clear any pending timeout
      if (predictionTimeoutRef.current) {
        clearTimeout(predictionTimeoutRef.current);
      }
      
      // Abort any pending request
      if (predictionAbortController.current) {
        predictionAbortController.current.abort();
      }
    };
  }, []);

  // Auto-predict when all fields are filled - with better debouncing
  useEffect(() => {
    if (arePredictionFieldsValid()) {
      // Clear any existing timeout
      if (predictionTimeoutRef.current) {
        clearTimeout(predictionTimeoutRef.current);
      }
      
      // Set new timeout with debounce
      predictionTimeoutRef.current = setTimeout(() => {
        predictCategory('auto');
      }, 1500); // Increased debounce time
      
      return () => {
        if (predictionTimeoutRef.current) {
          clearTimeout(predictionTimeoutRef.current);
        }
      };
    } else {
      // Reset prediction when fields are not valid
      setPredictionResult(null);
      setShowPrediction(false);
    }
  }, [arePredictionFieldsValid, predictCategory]);

  // Manual trigger for prediction
  const handleManualPredict = () => {
    console.log('Manual predict button clicked');
    if (arePredictionFieldsValid() && !isPredicting) {
      // Clear auto-prediction timeout if exists
      if (predictionTimeoutRef.current) {
        clearTimeout(predictionTimeoutRef.current);
        predictionTimeoutRef.current = null;
      }
      
      predictCategory('manual');
    }
  };

  const updateShippingZoneFee = (zoneId: string, fee: number | '') => {
    setShippingZones(prev => prev.map(zone => 
      zone.id === zoneId ? { ...zone, fee } : zone
    ));
  };

  // --- MAIN MEDIA HANDLERS ---
  const handleMainMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxMedia = 9;
    
    // Filter files to only accept images and videos
    const validFiles = files.filter(file => 
      file.type.startsWith('image/') || file.type.startsWith('video/')
    );
    
    // Calculate available slots
    const availableSlots = maxMedia - mainMedia.length;
    const filesToAdd = validFiles.slice(0, availableSlots);
    
    if (filesToAdd.length === 0 && files.length > 0) {
      alert(`Only image or video files are supported and the maximum limit is ${maxMedia} total media files.`);
      return;
    }

    const newMedia = filesToAdd.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      type: file.type.startsWith('image/') ? 'image' : 'video' as 'image' | 'video'
    }));

    setMainMedia(prev => [...prev, ...newMedia]);
    e.target.value = '';
  };

  const removeMainMedia = (index: number) => {
    setMainMedia(prev => prev.filter((_, i) => i !== index));
  };

  const toggleZoneFreeShipping = (zoneId: string) => {
    setShippingZones(prev => prev.map(zone => {
      if (zone.id === zoneId) {
        const newFreeShipping = !zone.freeShipping;
        return {
          ...zone,
          freeShipping: newFreeShipping,
          fee: newFreeShipping ? 0 : ''
        };
      }
      return zone;
    }));
  };

  // --- VARIANT HANDLERS ---
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
            quantity: 0,
            price: 0,
            weight_unit: 'g' as const,
          },
        ],
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
      quantity: 0,
      price: 0,
      weight_unit: 'g' as const,
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

  const updateOption = (groupId: string, optionId: string, field: keyof VariantOption, value: string | number | boolean | File | null) => {
    setVariantGroups(prev => prev.map(group => {
      if (group.id !== groupId) return group;
      
      return {
        ...group,
        options: group.options.map(option => {
          if (option.id !== optionId) return option;
          
          let updatedOption = { ...option };
          
          if (field === 'title') {
            updatedOption.title = value as string;
          } else if (field === 'weight_unit') {
            updatedOption.weight_unit = value as 'g' | 'kg' | 'lb' | 'oz';
          } else if (field === 'quantity' || field === 'length' || field === 'width' || field === 'height' || field === 'weight') {
            const numValue = parseInt(value as string);
            updatedOption[field] = numValue >= 0 ? numValue : '';
          } else if (field === 'price' || field === 'compare_price' || field === 'critical_trigger') {
            const numValue = parseFloat(value as string);
            updatedOption[field] = numValue >= 0 ? numValue : '';
          } else if (field === 'enable_critical_trigger') {
            updatedOption.enable_critical_trigger = value as boolean;
          } else if (field === 'image') {
            updatedOption.image = value as File | null;
            if (value instanceof File) {
              updatedOption.imagePreview = URL.createObjectURL(value);
            } else if (value === null) {
              updatedOption.imagePreview = undefined;
            }
          }
          
          return updatedOption;
        }),
      };
    }));
  };

  // Handle variant image upload
  const handleVariantImageChange = (groupId: string, optionId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      updateOption(groupId, optionId, 'image', file);
    }
    e.target.value = '';
  };

  // --- RENDER ---
  return (
    <form method="post" encType="multipart/form-data" className="space-y-8">
      {/* Hidden category field for form submission */}
      <input type="hidden" id="category_admin_id" name="category_admin_id" value={selectedCategoryId} />
      
      {/* STEP 1: AI Category Prediction Section */}
      <Card id="ai-category-prediction">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Step 1: AI Category Prediction
          </CardTitle>
          <CardDescription>
            Fill in these basic details first. Our AI will suggest the best category for your product.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-6">
            {/* Model Required Fields Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Product Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input 
                  type="text" 
                  id="name" 
                  name="name" 
                  required 
                  placeholder="Enter product name"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className={showPrediction && predictionResult ? 'border-green-500' : ''}
                />
                {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
              </div>

              {/* Condition */}
              <div className="space-y-2">
                <Label htmlFor="condition">Condition *</Label>
                <Select 
                  name="condition" 
                  required
                  value={productCondition}
                  onValueChange={setProductCondition}
                >
                  <SelectTrigger className={showPrediction && predictionResult ? 'border-green-500' : ''}>
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Like New">Like New</SelectItem>
                    <SelectItem value="New">New</SelectItem>
                    <SelectItem value="Refurbished">Refurbished</SelectItem>
                    <SelectItem value="Used - Excellent">Used - Excellent</SelectItem>
                    <SelectItem value="Used - Good">Used - Good</SelectItem>
                  </SelectContent>
                </Select>
                {errors.condition && <p className="text-sm text-red-600">{errors.condition}</p>}
              </div>

              {/* Quantity */}
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  type="number"
                  id="quantity"
                  name="quantity"
                  required
                  min="0"
                  placeholder="0"
                  value={productQuantity}
                  onChange={(e) => setProductQuantity(parseInt(e.target.value) || '')}
                  className={showPrediction && predictionResult ? 'border-green-500' : ''}
                />
                {errors.quantity && <p className="text-sm text-red-600">{errors.quantity}</p>}
              </div>
              
              {/* Price */}
              <div className="space-y-2">
                <Label htmlFor="price">Price *</Label>
                <Input
                  type="number"
                  id="price"
                  name="price"
                  required
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={productPrice}
                  onChange={(e) => setProductPrice(parseFloat(e.target.value) || '')}
                  className={showPrediction && predictionResult ? 'border-green-500' : ''}
                />
                {errors.price && <p className="text-sm text-red-600">{errors.price}</p>}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea 
                id="description" 
                name="description" 
                required 
                rows={4} 
                placeholder="Enter detailed product description"
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                className={showPrediction && predictionResult ? 'border-green-500' : ''}
              />
              {errors.description && <p className="text-sm text-red-600">{errors.description}</p>}
            </div>

            {/* Manual Predict Button */}
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleManualPredict}
                disabled={!arePredictionFieldsValid() || isPredicting}
                className="flex items-center gap-2"
              >
                {isPredicting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Get AI Category Suggestion
                  </>
                )}
              </Button>
            </div>

            {/* AI Prediction Result */}
            {showPrediction && (
              <div className="space-y-4 p-4 border rounded-lg bg-gradient-to-r from-purple-50 to-blue-50">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                    AI Category Suggestion
                  </h3>
                  {isPredicting && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyzing...
                    </div>
                  )}
                </div>
                
                {predictionResult && predictionResult.predicted_category ? (
                  <>
                    {/* Top Prediction */}
                    <div className="p-4 bg-white border rounded-lg shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="font-medium text-lg">
                            {predictionResult.predicted_category.category_name}
                          </span>
                          <Badge className="ml-2 bg-green-100 text-green-800 hover:bg-green-100">
                            {/* Convert confidence from decimal (e.g., 0.9991) to percentage */}
                            {Math.round(predictionResult.predicted_category.confidence * 100)}% confidence
                          </Badge>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleCategoryChange(predictionResult.predicted_category.category_id.toString())}
                          className="border-green-500 text-green-700 hover:bg-green-50"
                        >
                          Select This Category
                        </Button>
                      </div>
                      <p className="text-sm text-gray-600">
                        Based on your product details, this category seems to be the best fit.
                      </p>
                    </div>

                    {/* Alternative Categories (Optional) */}
                    {predictionResult.alternative_categories && predictionResult.alternative_categories.length > 0 && (
                      <div className="pt-4 border-t">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Alternative Suggestions:</h4>
                        <div className="space-y-2">
                          {predictionResult.alternative_categories.map((category, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <span className="text-sm">{category.category_name}</span>
                              <Badge variant="outline" className="text-xs">
                                {Math.round(category.confidence * 100)}%
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Manual Category Selection (Optional) */}
                    <div className="pt-4 border-t">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-700">Prefer a different category?</h4>
                        <Badge variant="outline" className="text-xs">
                          Optional
                        </Badge>
                      </div>
                      <Select 
                        value={selectedCategoryId} 
                        onValueChange={handleCategoryChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose from available categories" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Category (Not Recommended)</SelectItem>
                          {globalCategories && globalCategories.length > 0 ? (
                            globalCategories.map((category: Category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="none" disabled>
                              No categories available
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500 mt-1">
                        You can override the AI suggestion by selecting a different category here.
                      </p>
                    </div>
                  </>
                ) : isPredicting ? (
                  <div className="p-4 bg-white border rounded-lg shadow-sm text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Analyzing your product details...</p>
                  </div>
                ) : (
                  <div className="p-4 bg-white border rounded-lg shadow-sm text-center">
                    <p className="text-sm text-gray-600">No prediction available yet. Fill all required fields above.</p>
                  </div>
                )}
                
                {/* Prediction Status */}
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <div className={`h-2 w-2 rounded-full ${arePredictionFieldsValid() ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  {arePredictionFieldsValid() 
                    ? 'All required fields filled ✓' 
                    : 'Fill all required fields above for AI prediction'}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* STEP 2: Product Media */}
      <Card id="media">
        <CardHeader>
          <CardTitle>Step 2: Product Media</CardTitle>
          <CardDescription>
            Upload main product images and videos (max 9 files, 50MB each)
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  * First image/video will be used as the cover image
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                {mainMedia.length}/9
              </Badge>
            </div>
            
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {mainMedia.map((item, index) => (
                <div key={index} className="relative group aspect-square border rounded-md overflow-hidden">
                  {item.type === 'image' ? (
                    <img
                      src={item.preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <Video className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                  {index === 0 && (
                    <Badge className="absolute bottom-0 left-0 rounded-none bg-black/80 text-white px-1.5 py-0.5 text-[10px]">
                      Cover
                    </Badge>
                  )}
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-1 right-1 h-5 w-5 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    onClick={() => removeMainMedia(index)}
                  >
                    <X className="h-2.5 w-2.5" />
                  </Button>
                </div>
              ))}
              
              {mainMedia.length < 9 && (
                <div className="aspect-square">
                  <Input 
                    type="file" 
                    id="main-media-upload" 
                    name="media_files"
                    multiple 
                    accept="image/*,video/*" 
                    onChange={handleMainMediaChange}
                    className="hidden" 
                  />
                  <Label htmlFor="main-media-upload" className="cursor-pointer flex flex-col items-center justify-center aspect-square border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-gray-400 hover:text-gray-800 hover:bg-gray-50 transition-colors h-full w-full p-2">
                    <Upload className="h-5 w-5 mb-1" />
                    <span className="text-xs text-center">Add Picture/Video</span>
                  </Label>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* STEP 3: Variations */}
      <Card id="variations">
        <CardHeader>
          <CardTitle>Step 3: Variations (Optional)</CardTitle>
          <CardDescription>
            Define product variants like size or color with individual images and dimensions.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">Enable Product Variations</h3>
                <p className="text-sm text-muted-foreground">
                  Enable this to add variant groups (e.g., Size, Color) with individual images and dimensions.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="variant-toggle">Enable Variations</Label>
                <Switch
                  id="variant-toggle"
                  checked={showVariants}
                  onCheckedChange={(checked) => {
                    setShowVariants(checked);
                    if (checked && variantGroups.length === 0) {
                      setVariantGroups([
                        {
                          id: generateId(),
                          title: "Size",
                          options: [
                            {
                              id: generateId(),
                              title: "Small",
                              quantity: 0,
                              price: 0,
                              weight_unit: 'g' as const,
                            },
                          ],
                        },
                      ]);
                    }
                  }}
                />
              </div>
            </div>

            {showVariants ? (
              <div className="space-y-6 p-4 border rounded-lg bg-gray-50">
                
                {/* Variant Options Definition */}
                <div className="space-y-4">
                  {variantGroups.map((group) => (
                    <div key={group.id} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm font-medium text-gray-700">
                        <div>Option type</div>
                        <div>Option value</div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 items-start">
                        <div className="flex items-center gap-2">
                          <Input
                            type="text"
                            value={group.title}
                            onChange={(e) => updateVariantGroupTitle(group.id, e.target.value)}
                            placeholder="e.g., Size, Color"
                            className="flex-1"
                          />
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm"
                            onClick={() => removeVariantGroup(group.id)}
                            disabled={variantGroups.length === 1}
                            className="h-8 w-8 p-0 text-gray-500 hover:text-red-500"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="min-h-[2.5rem] px-3 py-2 border rounded-md bg-white flex flex-wrap items-center gap-1">
                          {group.options.map((option, index) => (
                            <div key={option.id} className="flex items-center">
                              <span className="text-sm px-2 py-1 bg-gray-100 rounded">
                                {option.title}
                              </span>
                              {index < group.options.length - 1 && (
                                <span className="mx-1 text-gray-400">×</span>
                              )}
                            </div>
                          ))}
                          
                          <input
                            type="text"
                            className="flex-1 min-w-[100px] text-sm border-0 focus:outline-none focus:ring-0 px-2 py-1"
                            placeholder="Type and press Enter..."
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                addOption(group.id, e.currentTarget.value.trim());
                                e.currentTarget.value = '';
                              } else if (e.key === 'Backspace' && e.currentTarget.value === '' && group.options.length > 0) {
                                const lastOption = group.options[group.options.length - 1];
                                removeOption(group.id, lastOption.id);
                              }
                            }}
                            onBlur={(e) => {
                              if (e.target.value.trim()) {
                                addOption(group.id, e.target.value.trim());
                                e.target.value = '';
                              }
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Variant Dimensions Section */}
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-medium">Variant Dimensions</h4>
                  <p className="text-sm text-muted-foreground">
                    Set dimensions and weight for each variant option.
                  </p>
                  
                  <div className="overflow-x-auto">
                    {variantGroups.map((group) => (
                      <div key={group.id} className="space-y-3 mb-4">
                        <div className="text-sm font-medium text-gray-700 mb-2">{group.title} Options:</div>
                        
                        <div className="min-w-[800px]">
                          {group.options.map((option) => (
                            <div key={option.id} className="grid grid-cols-7 gap-3 items-center mb-3 p-3 border rounded-lg bg-white">
                              {/* Option Label */}
                              <div className="col-span-1">
                                <span className="text-sm font-medium">{group.title}: {option.title}</span>
                              </div>
                              
                              {/* Length */}
                              <div>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.1"
                                  placeholder="L (cm)"
                                  value={option.length || ''}
                                  onChange={(e) => updateOption(group.id, option.id, 'length', e.target.value)}
                                  className="w-full text-sm"
                                />
                              </div>
                              
                              {/* Width */}
                              <div>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.1"
                                  placeholder="W (cm)"
                                  value={option.width || ''}
                                  onChange={(e) => updateOption(group.id, option.id, 'width', e.target.value)}
                                  className="w-full text-sm"
                                />
                              </div>
                              
                              {/* Height */}
                              <div>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.1"
                                  placeholder="H (cm)"
                                  value={option.height || ''}
                                  onChange={(e) => updateOption(group.id, option.id, 'height', e.target.value)}
                                  className="w-full text-sm"
                                />
                              </div>
                              
                              {/* Weight */}
                              <div>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="Weight"
                                  value={option.weight || ''}
                                  onChange={(e) => updateOption(group.id, option.id, 'weight', e.target.value)}
                                  className="w-full text-sm"
                                />
                              </div>
                              
                              {/* Weight Unit */}
                              <div>
                                <Select 
                                  value={option.weight_unit || 'g'} 
                                  onValueChange={(value: 'g' | 'kg' | 'lb' | 'oz') => updateOption(group.id, option.id, 'weight_unit', value)}
                                >
                                  <SelectTrigger className="w-full h-9 text-sm">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="g">g</SelectItem>
                                    <SelectItem value="kg">kg</SelectItem>
                                    <SelectItem value="lb">lb</SelectItem>
                                    <SelectItem value="oz">oz</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Button 
                  type="button" 
                  onClick={addVariantGroup}
                  variant="outline"
                  className="w-full border-dashed mt-4"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add more option type
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Single Product Dimensions (when variants disabled) */}
                <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                  <h3 className="text-lg font-medium">Product Dimensions & Weight</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="length">Length (cm)</Label>
                      <Input
                        type="number"
                        id="length"
                        name="length"
                        min="0"
                        step="0.1"
                        placeholder="0.0"
                        value={productLength}
                        onChange={(e) => setProductLength(parseFloat(e.target.value) || '')}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="width">Width (cm)</Label>
                      <Input
                        type="number"
                        id="width"
                        name="width"
                        min="0"
                        step="0.1"
                        placeholder="0.0"
                        value={productWidth}
                        onChange={(e) => setProductWidth(parseFloat(e.target.value) || '')}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="height">Height (cm)</Label>
                      <Input
                        type="number"
                        id="height"
                        name="height"
                        min="0"
                        step="0.1"
                        placeholder="0.0"
                        value={productHeight}
                        onChange={(e) => setProductHeight(parseFloat(e.target.value) || '')}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="weight">Weight</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          id="weight"
                          name="weight"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={productWeight}
                          onChange={(e) => setProductWeight(parseFloat(e.target.value) || '')}
                          className="flex-1"
                        />
                        <Select value={productWeightUnit} onValueChange={(value: 'g' | 'kg' | 'lb' | 'oz') => setProductWeightUnit(value)}>
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="g">g</SelectItem>
                            <SelectItem value="kg">kg</SelectItem>
                            <SelectItem value="lb">lb</SelectItem>
                            <SelectItem value="oz">oz</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* STEP 4: Pricing & Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pricing Card */}
        <Card id="pricing">
          <CardHeader>
            <CardTitle>Step 4: Pricing</CardTitle>
            <CardDescription>
              {showVariants 
                ? "Set price and compare price for each variant option" 
                : "Set the base price and compare price for the product"}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-6">
              {showVariants && variantGroups.length > 0 ? (
                <div className="space-y-4">
                  <Label className="text-lg font-medium">Variant Pricing</Label>
                  
                  {variantGroups.map((group) => (
                    <div key={group.id} className="space-y-3">
                      <div className="text-sm font-medium text-gray-700 mb-2">{group.title} Options:</div>
                      
                      {group.options.map((option, optionIndex) => (
                        <div key={option.id} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
                          {/* Option Label */}
                          <div className="md:col-span-1">
                            <span className="text-sm font-medium">{group.title}: {option.title}</span>
                          </div>
                          
                          {/* Small Image Box */}
                          <div className="md:col-span-1">
                            {option.imagePreview ? (
                              <div className="relative h-12 w-12 rounded-md overflow-hidden border">
                                <img 
                                  src={option.imagePreview} 
                                  alt={`${option.title} variant`}
                                  className="h-full w-full object-cover"
                                />
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  className="absolute top-0 right-0 h-4 w-4 rounded-full p-0"
                                  onClick={() => updateOption(group.id, option.id, 'image', null)}
                                >
                                  <X className="h-2 w-2" />
                                </Button>
                              </div>
                            ) : (
                              <div>
                                <Input 
                                  type="file" 
                                  id={`variant-image-${group.id}-${option.id}`}
                                  accept="image/*"
                                  onChange={(e) => handleVariantImageChange(group.id, option.id, e)}
                                  className="hidden"
                                />
                                <Label 
                                  htmlFor={`variant-image-${group.id}-${option.id}`}
                                  className="cursor-pointer flex items-center justify-center h-12 w-12 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-gray-400 hover:text-gray-800 hover:bg-gray-50"
                                  title="Upload variant image"
                                >
                                  <ImageIcon className="h-5 w-5" />
                                </Label>
                              </div>
                            )}
                          </div>
                          
                          {/* Price */}
                          <div className="md:col-span-1">
                            <Input
                              type="number"
                              name={optionIndex === 0 ? `variant_option_price` : `option_price_${group.id}_${option.id}`}
                              min="0"
                              step="0.01"
                              placeholder="Price"
                              value={option.price === 0 ? '' : option.price}
                              onChange={(e) => updateOption(group.id, option.id, 'price', e.target.value)}
                              className="w-full"
                            />
                          </div>
                          
                          {/* Compare Price */}
                          <div className="md:col-span-2">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="Compare Price (Optional)"
                              value={option.compare_price || ''}
                              onChange={(e) => updateOption(group.id, option.id, 'compare_price', e.target.value)}
                              className="w-full"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="price">Price *</Label>
                    <Input
                      type="number"
                      id="price"
                      name="price"
                      required
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={productPrice}
                      onChange={(e) => setProductPrice(parseFloat(e.target.value) || '')}
                    />
                    {errors.price && <p className="text-sm text-red-600">{errors.price}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="compare_price">Compare Price (Optional)</Label>
                    <Input
                      type="number"
                      id="compare_price"
                      name="compare_price"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                    />
                    <p className="text-xs text-gray-500">
                      Original price to show as crossed out
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stock Card */}
        <Card id="stock">
          <CardHeader>
            <CardTitle>Step 4: Stock</CardTitle>
            <CardDescription>
              Set initial stock quantity and configure low stock alerts.
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-6">
              {/* Main Product Stock (when variants disabled) */}
              {!showVariants && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantity *</Label>
                      <Input
                        type="number"
                        id="quantity"
                        name="quantity"
                        required
                        min="0"
                        placeholder="0"
                        value={productQuantity}
                        onChange={(e) => setProductQuantity(parseInt(e.target.value) || '')}
                      />
                      {errors.quantity && <p className="text-sm text-red-600">{errors.quantity}</p>}
                    </div>
                    
                    <div className="space-y-4 border p-4 rounded-lg bg-red-50/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Critical Stock Trigger ⚠️</h4>
                          <p className="text-sm text-muted-foreground">
                            Receive notification when stock is low
                          </p>
                        </div>
                        <Switch
                          checked={enableCriticalTrigger}
                          onCheckedChange={setEnableCriticalTrigger}
                        />
                      </div>

                      {enableCriticalTrigger && (
                        <div className="space-y-2">
                          <Label htmlFor="critical_threshold">Critical Threshold</Label>
                          <Input
                            type="number"
                            id="critical_threshold"
                            name="critical_threshold"
                            min="1"
                            placeholder="e.g., 5"
                            value={criticalThreshold}
                            onChange={(e) => setCriticalThreshold(parseInt(e.target.value) || '')}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Variant Stock (when variants enabled) */}
              {showVariants && variantGroups.length > 0 && (
                <div className="space-y-4">
                  <Label className="text-lg font-medium">Variant Stock</Label>
                  
                  {variantGroups.map((group) => (
                    <div key={group.id} className="space-y-3">
                      <div className="text-sm font-medium text-gray-700 mb-2">{group.title} Options:</div>
                      
                      {group.options.map((option, optionIndex) => (
                        <div key={option.id} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                          {/* Option Label */}
                          <div>
                            <span className="text-sm font-medium">{group.title}: {option.title}</span>
                          </div>
                          
                          {/* Quantity */}
                          <div>
                            <Input
                              type="number"
                              name={optionIndex === 0 ? `variant_option_quantity` : `option_quantity_${group.id}_${option.id}`}
                              min="0"
                              placeholder="Quantity"
                              value={option.quantity}
                              onChange={(e) => updateOption(group.id, option.id, 'quantity', e.target.value)}
                              className="w-full"
                            />
                          </div>
                          
                          {/* Critical Trigger */}
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={option.enable_critical_trigger || false}
                                onCheckedChange={(checked) => updateOption(group.id, option.id, 'enable_critical_trigger', checked)}
                                className="h-4 w-8"
                              />
                              <span className="text-sm">Critical</span>
                            </div>
                            
                            {option.enable_critical_trigger && (
                              <Input
                                type="number"
                                min="1"
                                placeholder="Threshold"
                                value={option.critical_trigger || ''}
                                onChange={(e) => updateOption(group.id, option.id, 'critical_trigger', e.target.value)}
                                className="w-24"
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Submit Button */}
      <div className="pt-6">
        <Button
          type="submit"
          disabled={!selectedShop}
          variant="default"
          size="lg"
          className="w-full"
        >
          {selectedShop ? "Create Product" : "Create Shop First"}
        </Button>
      </div>
    </form>
  );
}