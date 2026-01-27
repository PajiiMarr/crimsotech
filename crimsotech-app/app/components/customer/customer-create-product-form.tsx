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
import { useFetcher } from "react-router"

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
  image?: File | null;
  imagePreview?: string;
} 

interface VariantGroup {
  id: string;
  title: string;
  options: VariantOption[];
}



interface CreateProductFormProps {
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

export default function CreateProductForm({ globalCategories, errors }: CreateProductFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const mediaFilesRef = useRef<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fetcher = useFetcher();

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

  // Refundable flag
  const [isRefundable, setIsRefundable] = useState(false);

  const [mainMedia, setMainMedia] = useState<MediaPreview[]>([]);
  const [showVariants, setShowVariants] = useState(false);
  const [variantGroups, setVariantGroups] = useState<VariantGroup[]>([]);
  const variantsEnabled = variantGroups.length > 0;
  const [enableCriticalTrigger, setEnableCriticalTrigger] = useState(false);
  const [criticalThreshold, setCriticalThreshold] = useState<number | ''>('');

  // SKU combinations generated from variant groups (cartesian product)
  interface SKUCombination {
    id: string;
    option_ids: string[]; // ordered by group order
    option_map: Record<string, string>; // groupId -> optionId
    price: number | '';
    compare_price?: number | '';
    quantity: number | '';
    length?: number | '';
    width?: number | '';
    height?: number | '';
    weight?: number | '';
    weight_unit?: 'g' | 'kg' | 'lb' | 'oz' | '';
    sku_code?: string;
    // New: per-SKU image and critical stock trigger
    image?: File | null;
    imagePreview?: string;
    critical_trigger?: number | '';
    // Whether this combination is active (seller can disable combinations)
    is_active?: boolean;
    // Whether this SKU is refundable (derived from option-level flags or explicitly toggled)
    is_refundable?: boolean;
  }

  const [skuCombinations, setSkuCombinations] = useState<SKUCombination[]>([]);
  // per-SKU refundable flag handled on SKU objects as `is_refundable`
  const hasSkuRefundable = skuCombinations.some(s => !!s.is_refundable);
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
      
      // Revoke object URLs to prevent memory leaks
      mainMedia.forEach(item => {
        URL.revokeObjectURL(item.preview);
      });
      
      variantGroups.forEach(group => {
        group.options.forEach(option => {
          if (option.imagePreview) {
            URL.revokeObjectURL(option.imagePreview);
          }
        });
      });
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
    
    const validFiles = files.filter(file => 
      file.type.startsWith('image/') || file.type.startsWith('video/')
    );
    
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

    // Store files in ref
    mediaFilesRef.current = [...mediaFilesRef.current, ...filesToAdd];
    setMainMedia(prev => [...prev, ...newMedia]);
  };

  const removeMainMedia = (index: number) => {
    // Revoke the object URL
    URL.revokeObjectURL(mainMedia[index].preview);
    
    // Remove from ref
    mediaFilesRef.current = mediaFilesRef.current.filter((_, i) => i !== index);
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
          },
        ],
      },
    ]);
  };

  const removeVariantGroup = (groupId: string) => {
    // Clean up image previews
    const group = variantGroups.find(g => g.id === groupId);
    if (group) {
      group.options.forEach(option => {
        if (option.imagePreview) {
          URL.revokeObjectURL(option.imagePreview);
        }
      });
    }
    
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

  // Create cartesian product of variant options and preserve existing SKU edits
  const generateSkuCombinations = useCallback(() => {
    if (variantGroups.length === 0) {
      setSkuCombinations([]);
      return;
    }

    // Build arrays of options per group
    const arrays = variantGroups.map(g => g.options.map(o => ({ id: o.id, title: o.title })));

    // Cartesian product
    let combos: any[] = [];
    arrays.forEach((arr, idx) => {
      if (idx === 0) {
        combos = arr.map((a) => ({ option_ids: [a.id], option_map: { [variantGroups[0].id]: a.id }, price: productPrice || '', quantity: productQuantity || '' }));
      } else {
        const groupId = variantGroups[idx].id;
        const newCombos: any[] = [];
        combos.forEach(existing => {
          arr.forEach((a) => {
            newCombos.push({
              option_ids: [...existing.option_ids, a.id],
              option_map: { ...existing.option_map, [groupId]: a.id },
              price: existing.price ?? productPrice ?? '',
              compare_price: existing.compare_price ?? undefined,
              quantity: existing.quantity ?? productQuantity ?? '',
              length: existing.length ?? productLength ?? '',
              width: existing.width ?? productWidth ?? '',
              height: existing.height ?? productHeight ?? '',
              weight: existing.weight ?? productWeight ?? '',
              weight_unit: existing.weight_unit ?? productWeightUnit ?? '',
            });
          });
        });
        combos = newCombos;
      }
    });

    // Preserve existing skus where option_ids match (order-independent) by using a functional update
    setSkuCombinations((prev) => {
      const preserved = combos.map((c) => {
        const ids = c.option_ids.slice().sort().join('|');
        const found = prev.find(s => s.option_ids.slice().sort().join('|') === ids);
        return {
          id: found?.id || generateId(),
          option_ids: c.option_ids,
          option_map: c.option_map,
          price: found?.price ?? c.price ?? productPrice ?? '',
          compare_price: found?.compare_price ?? c.compare_price ?? undefined,
          quantity: found?.quantity ?? c.quantity ?? 0,
          length: found?.length ?? c.length ?? productLength ?? '',
          width: found?.width ?? c.width ?? productWidth ?? '',
          height: found?.height ?? c.height ?? productHeight ?? '',
          weight: found?.weight ?? c.weight ?? productWeight ?? '',
          weight_unit: found?.weight_unit ?? c.weight_unit ?? productWeightUnit ?? '',
          sku_code: found?.sku_code || '',
          // Preserve per-sku fields if user already edited them
          image: found?.image ?? undefined,
          imagePreview: found?.imagePreview ?? undefined,
          critical_trigger: found?.critical_trigger ?? '',
          is_active: found?.is_active ?? true,
          // is_refundable: preserve existing value, default false
          is_refundable: found?.is_refundable ?? false,
        } as SKUCombination;
      });

      // Avoid unnecessary updates: if arrays are length-equal and every id matches prev, keep prev to prevent rerender loops
      if (preserved.length === prev.length && preserved.every((p, i) => p.id === prev[i].id && p.price === prev[i].price && p.quantity === prev[i].quantity && p.sku_code === prev[i].sku_code)) {
        return prev;
      }

      return preserved;
    });
  }, [variantGroups, productPrice]);

  useEffect(() => {
    generateSkuCombinations();
  }, [variantGroups, productPrice]);



  const removeOption = (groupId: string, optionId: string) => {
    // Clean up image preview if exists
    const group = variantGroups.find(g => g.id === groupId);
    if (group) {
      const option = group.options.find(o => o.id === optionId);
      if (option?.imagePreview) {
        URL.revokeObjectURL(option.imagePreview);
      }
    }
    
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
          } else if (field === 'image') {
            // Clean up previous image preview
            if (updatedOption.imagePreview) {
              URL.revokeObjectURL(updatedOption.imagePreview);
            }
            
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

    // small delay to allow variantGroups to update before regenerating skus
    setTimeout(() => generateSkuCombinations(), 50);
  };

  // Update SKU fields (price / quantity / sku_code)
  const updateSkuField = (skuId: string, field: keyof SKUCombination, value: any) => {
    setSkuCombinations(prev => prev.map(sku => sku.id === skuId ? { ...sku, [field]: value } : sku));
  };

  const setSkuIsRefundable = (skuId: string, checked: boolean) => {
    updateSkuField(skuId, 'is_refundable', checked);
  };

  // Handle SKU image upload (per combination)
  const handleSkuImageChange = (skuId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const preview = URL.createObjectURL(file);
      setSkuCombinations(prev => prev.map(sku => sku.id === skuId ? { ...sku, image: file, imagePreview: preview } : sku));
    }
    e.target.value = '';
  };

  // Handle variant image upload
  const handleVariantImageChange = (groupId: string, optionId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      updateOption(groupId, optionId, 'image', file);
    }
    e.target.value = '';
  };

  // --- FORM SUBMISSION HANDLER ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formRef.current) return;
    
    // Create FormData
    const formData = new FormData();
    
    // Add basic form fields
    const basicFormData = new FormData(formRef.current);
    for (const [key, value] of basicFormData.entries()) {
      // Don't add file inputs that we'll handle separately
      if (key !== 'media_files' && !key.startsWith('variant_image_')) {
        if (value instanceof File) {
          formData.append(key, value);
        } else {
          formData.append(key, value.toString());
        }
      }
    }
    
    // Add category
    formData.append('category_admin_id', selectedCategoryId);
    
    // Add media files from ref
    mediaFilesRef.current.forEach(file => {
      if (file.size > 0) {
        formData.append('media_files', file);
      }
    });
    
    // Add variant data
    if (variantGroups.length > 0) {
      variantGroups.forEach((group) => {
        formData.append(`variant_group_${group.id}_title`, group.title);
        group.options.forEach((option) => {
          formData.append(`variant_group_${group.id}_option_${option.id}_title`, option.title);

          // Add variant image if exists
          if (option.image) {
            formData.append(`variant_image_${group.id}_${option.id}`, option.image);
          }
        });
      });

      // Add auto-generated SKU combinations (if any)
      if (skuCombinations.length > 0) {
        const skusPayload = skuCombinations.map(s => {
          // Ensure explicit boolean for refundable and include both keys to match backend normalization
          const refundableFlag = !!s.is_refundable;
          return {
            id: s.id,
            option_ids: s.option_ids,
            price: s.price,
            compare_price: s.compare_price,
            quantity: s.quantity,
            length: s.length,
            width: s.width,
            height: s.height,
            weight: s.weight,
            weight_unit: s.weight_unit,
            sku_code: s.sku_code,
            critical_trigger: s.critical_trigger || null,
            // Send both `is_refundable` and `refundable` to avoid backend mismatches
            is_refundable: refundableFlag,
            refundable: refundableFlag,
            is_active: s.is_active ?? true,
          };
        });

        // Debug: log skus payload before appending
        console.log('Submitting SKUs payload:', skusPayload);

        formData.append('skus', JSON.stringify(skusPayload));

        // Append any SKU images as files with keys sku_image_<skuId>
        skuCombinations.forEach(s => {
          if (s.image) {
            formData.append(`sku_image_${s.id}`, s.image);
          }
        });
      }
    }
    
    // Add shipping zones
    shippingZones.forEach((zone) => {
      formData.append(`shipping_zone_${zone.id}_name`, zone.name);
      formData.append(`shipping_zone_${zone.id}_fee`, String(zone.fee));
      formData.append(`shipping_zone_${zone.id}_freeShipping`, String(zone.freeShipping));
    });
    
    // Submit using fetcher
    fetcher.submit(formData, {
      method: 'post',
      encType: 'multipart/form-data',
    });
  };

  // --- RENDER ---
  return (
    <form 
      ref={formRef}
      onSubmit={handleSubmit}
      className="space-y-8"
    >
      {/* Hidden category field for form submission */}
      <input type="hidden" name="category_admin_id" value={selectedCategoryId} />
      
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
                    ref={fileInputRef}
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
                              if (e.key === 'Enter') {
                                // Prevent form submission when pressing Enter
                                e.preventDefault();
                                if (e.currentTarget.value.trim()) {
                                  addOption(group.id, e.currentTarget.value.trim());
                                  e.currentTarget.value = '';
                                }
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

                {/* Variant Dimensions */}
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-medium">Variant Dimensions</h4>
                  <p className="text-sm text-muted-foreground">
                    Dimensions and weights are now set per generated combination in the "Generated Combinations" table below.
                  </p>
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
                        {/* Hidden input to include product weight unit in FormData */}
                        <input type="hidden" name="weight_unit" value={productWeightUnit} />
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
      {!showVariants && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pricing Card (only for non-variant products) */}
        <Card id="pricing">
          <CardHeader>
            <CardTitle>Step 4: Pricing</CardTitle>
            <CardDescription>
              Set the base price and compare price for the product
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-6">
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

                {/* Product-level refundable toggle (placed on Pricing card) */}
                <div className="space-y-2 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Refundable</h4>
                      <p className="text-sm text-muted-foreground">Whether this product is eligible for refunds.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="is_refundable">Refundable</Label>
                      <Switch
                        id="is_refundable"
                        checked={isRefundable}
                        onCheckedChange={(checked) => setIsRefundable(checked)}
                      />
                    </div>
                  </div>

                  {/* Hidden input so the value is submitted with the form */}
                  <input type="hidden" name="is_refundable" value={isRefundable ? 'true' : 'false'} />
                </div>
              </div>
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
                        <div key={option.id} className="flex items-center justify-between gap-3">
                          {/* Option Label */}
                          <div>
                            <span className="text-sm font-medium">{group.title}: {option.title}</span>
                          </div>

                          {/* Variant Image Uploader */}
                          <div>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleVariantImageChange(group.id, option.id, e)}
                              className="text-sm"
                            />
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
      )}

      {/* Generated Combinations (SKUs) */}
      {showVariants && variantGroups.length > 0 && (
        <Card id="generated-combinations">
          <CardHeader>
            <CardTitle>Generated Combinations</CardTitle>
            <CardDescription>
              All combinations generated from your variant choices. Edit per-combination price, quantity, dimensions, or SKU code before saving.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="px-2 py-2 font-medium">Image</th>
                    {variantGroups.map((g) => (
                      <th key={g.id} className="px-2 py-2 font-medium">{g.title}</th>
                    ))}
                    <th className="px-2 py-2 font-medium">Price</th>
                    <th className="px-2 py-2 font-medium">Compare Price</th>
                    <th className="px-2 py-2 font-medium">Quantity</th>
                    <th className="px-2 py-2 font-medium">Critical</th>
                    <th className="px-2 py-2 font-medium">L (cm)</th>
                    <th className="px-2 py-2 font-medium">W (cm)</th>
                    <th className="px-2 py-2 font-medium">H (cm)</th>
                    <th className="px-2 py-2 font-medium">Weight</th>
                    <th className="px-2 py-2 font-medium">Unit</th>
                    <th className="px-2 py-2 font-medium">SKU Code</th>
                    <th className="px-2 py-2 font-medium">Refundable</th>
                    <th className="px-2 py-2 font-medium">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {skuCombinations.map((sku) => (
                    <tr key={sku.id} className="border-t">
                      <td className="px-2 py-2 align-top">
                        <div className="relative w-12 h-12 rounded overflow-hidden bg-gray-100 flex items-center justify-center">
                          {sku.imagePreview ? (
                            <img src={sku.imagePreview} alt="sku" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="h-5 w-5 text-gray-400" />
                          )}

                          <input
                            type="file"
                            id={`sku_image_${sku.id}`}
                            accept="image/*"
                            onChange={(e) => handleSkuImageChange(sku.id, e)}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                        </div>
                        {sku.imagePreview && (
                          <div className="mt-1">
                            <Button type="button" variant="ghost" size="sm" onClick={() => updateSkuField(sku.id, 'image', null)}>Remove</Button>
                          </div>
                        )}
                      </td>
                      {variantGroups.map((g) => (
                        <td key={g.id} className="px-2 py-2 align-top">
                          {g.options.find(o => o.id === sku.option_map[g.id])?.title || ''}
                        </td>
                      ))}
                      <td className="px-2 py-2">
                        <Input type="number" min="0" step="0.01" value={sku.price || ''} onChange={(e) => updateSkuField(sku.id, 'price', parseFloat(e.target.value) || '')} />
                      </td>
                      <td className="px-2 py-2">
                        <Input type="number" min="0" step="0.01" value={sku.compare_price || ''} onChange={(e) => updateSkuField(sku.id, 'compare_price', parseFloat(e.target.value) || '')} />
                      </td>
                      <td className="px-2 py-2">
                        <Input type="number" min="0" value={sku.quantity || ''} onChange={(e) => updateSkuField(sku.id, 'quantity', parseInt(e.target.value) || '')} />
                      </td>
                      <td className="px-2 py-2">
                        <Input type="number" min="1" placeholder="Threshold" value={sku.critical_trigger || ''} onChange={(e) => updateSkuField(sku.id, 'critical_trigger', parseInt(e.target.value) || '')} className="w-20 text-xs" />
                      </td>
                      <td className="px-2 py-2">
                        <Input type="number" min="0" step="0.1" value={sku.length || ''} onChange={(e) => updateSkuField(sku.id, 'length', parseFloat(e.target.value) || '')} />
                      </td>
                      <td className="px-2 py-2">
                        <Input type="number" min="0" step="0.1" value={sku.width || ''} onChange={(e) => updateSkuField(sku.id, 'width', parseFloat(e.target.value) || '')} />
                      </td>
                      <td className="px-2 py-2">
                        <Input type="number" min="0" step="0.1" value={sku.height || ''} onChange={(e) => updateSkuField(sku.id, 'height', parseFloat(e.target.value) || '')} />
                      </td>
                      <td className="px-2 py-2">
                        <Input type="number" min="0" step="0.01" value={sku.weight || ''} onChange={(e) => updateSkuField(sku.id, 'weight', parseFloat(e.target.value) || '')} />
                      </td>
                      <td className="px-2 py-2">
                        <select className="border rounded p-1 text-sm" value={sku.weight_unit || ''} onChange={(e) => updateSkuField(sku.id, 'weight_unit', e.target.value as any)}>
                          <option value="">Unit</option>
                          <option value="g">g</option>
                          <option value="kg">kg</option>
                          <option value="lb">lb</option>
                          <option value="oz">oz</option>
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <Input type="text" value={sku.sku_code || ''} onChange={(e) => updateSkuField(sku.id, 'sku_code', e.target.value)} />
                      </td>

                      {/* Refundable toggle per SKU */}
                      <td className="px-2 py-2">
                        <Switch checked={sku.is_refundable ?? false} onCheckedChange={(checked) => setSkuIsRefundable(sku.id, checked)} />
                      </td>

                      <td className="px-2 py-2">
                        <Switch checked={sku.is_active ?? true} onCheckedChange={(checked) => updateSkuField(sku.id, 'is_active', checked)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 5: Refund Options */}
      {showVariants && (
      <Card id="refund-options">
        <CardHeader>
          <CardTitle>Step 5: Refund Options</CardTitle>
          <CardDescription>
            Configure refunds for individual combinations when variations are enabled.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <p className="text-sm text-muted-foreground">
            Since this product has variations, you can set refunds per generated combination using the <strong>Refundable</strong> switches in the "Generated Combinations" table above.
          </p>
        </CardContent>
      </Card>
      )}

      {/* Submit Button */}


      {/* Submit Button */}
      <div className="pt-6">
        <Button
          type="submit"
          variant="default"
          size="lg"
          className="w-full"
        >
          Create Product
        </Button>
      </div>
    </form>
  );
}