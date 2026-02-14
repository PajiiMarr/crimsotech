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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "~/components/ui/collapsible";
import { AlertCircle, Store, ArrowLeft, Plus, X, Image as ImageIcon, Video, Upload, Package, Truck, Loader2, Sparkles, Calculator, ChevronDown, ChevronUp, Info, GripVertical, Percent, Clock } from "lucide-react";
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

// Depreciation interface
interface Depreciation {
  originalPrice: number | '';
  usagePeriod: number | '';
  usageUnit: 'weeks' | 'months' | 'years';
  depreciationRate: number | '';
  calculatedPrice: number | '';
}

// Simplified Variant interface - each variant is independent, not a combination
interface Variant {
  id: string;
  title: string;
  price: number | '';  // This will now be auto-calculated and read-only
  compare_price?: number | '';
  quantity: number | '';
  sku_code?: string;
  image?: File | null;
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
  depreciation: Depreciation; // Make it required instead of optional
  // Optional attributes for grouping/filtering (can be added later)
  attributes?: Record<string, string>;
}

interface CreateProductFormProps {
  selectedShop: Shop | null;
  globalCategories: Category[];
  modelClasses: string[];
  errors: FormErrors;
}

// --- PREDICTION STATE INTERFACE ---
interface PredictedCategory {
  id?: string;
  uuid?: string;
  name?: string;
  [key: string]: any;
}

interface ImagePredictions {
  predicted_class?: string;
  confidence?: number;
  // any additional fields returned by the model
  [key: string]: any;
}

interface PredictionResult {
  success?: boolean;
  predictions?: ImagePredictions;
  all_categories?: Array<string | PredictedCategory>;
  error?: string;
  predicted_category?: {
    category_name: string;
    confidence: number;
    category_uuid?: string | null;
  };
  alternative_categories?: Array<{ category_name: string; confidence: number }>;
  all_predictions?: Record<string, number>;
  predicted_class?: string;
  [key: string]: any;
}

// --- REACT COMPONENT ---

export default function CreateProductForm({ selectedShop, globalCategories, modelClasses, errors }: CreateProductFormProps) {
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
  const [productCondition, setProductCondition] = useState('');

  const [mainMedia, setMainMedia] = useState<MediaPreview[]>([]);
  
  // Simplified variants - just a list of independent variants
  const [variants, setVariants] = useState<Variant[]>([
    // Initialize with one default variant using product name as title
    {
      id: generateId(),
      title: productName || "Default",
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
        depreciationRate: 10, // Default 10% depreciation rate
        calculatedPrice: '',
      }
    }
  ]);
  
  const [productRefundable, setProductRefundable] = useState(true);
  
  const [shippingZones, setShippingZones] = useState<ShippingZone[]>([
    { id: generateId(), name: 'Local', fee: '', freeShipping: false },
    { id: generateId(), name: 'Nearby City', fee: '', freeShipping: false },
    { id: generateId(), name: 'Far Province', fee: '', freeShipping: false },
  ]);
  
  // Prediction state (image-based)
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);
  const [showPrediction, setShowPrediction] = useState(false);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>('');

  const [predictionError, setPredictionError] = useState<string | null>(null);
  const [apiResponseError, setApiResponseError] = useState<string | null>(null);
  const [apiResponseMessage, setApiResponseMessage] = useState<string | null>(null);
  const predictionAbortController = useRef<AbortController | null>(null);

  // Handle category selection change
  const [closestMatch, setClosestMatch] = useState<{ name: string; score: number } | null>(null);
  const [appliedCategory, setAppliedCategory] = useState<Category | null>(null);

  // Update first variant title when product name changes
  useEffect(() => {
    if (variants.length > 0) {
      setVariants(prev => prev.map((variant, index) => 
        index === 0 ? { ...variant, title: productName || "Default" } : variant
      ));
    }
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

  const handleCategoryChange = (value: string) => {
    console.log('Category changed to:', value);
    
    setClosestMatch(null);
    setAppliedCategory(null);

    // Ensure value is a string before comparisons
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

  // Image-based prediction
  const analyzeImages = async (files: File[]) => {
    const imageFiles = (files || []).filter(f => f && f.type && f.type.startsWith('image/')) as File[];
    if (imageFiles.length === 0) {
      alert('No image files to analyze.');
      return;
    }

    if (predictionAbortController.current) {
      predictionAbortController.current.abort();
    }
    predictionAbortController.current = new AbortController();

    setIsPredicting(true);
    setPredictionError(null);

    try {
      const requests = imageFiles.map((file) => {
        const form = new FormData();
        form.append('image', file);
        return AxiosInstance.post('/predict/', form, {
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
        } as any,
        alternative_categories: sorted.slice(1, 4).map(s => ({ category_name: s[0], confidence: s[1] })),
        all_categories: globalCategories ? globalCategories.map((c: Category) => ({ uuid: c.id, name: c.name, id: c.id })) : [],
        all_predictions: Object.fromEntries(sorted),
        predicted_class: topClass,
        analyzed_images_count: count
      };

      setPredictionResult(mapped);
      setShowPrediction(true);

      if (mapped.predicted_category?.category_name && globalCategories) {
        const predictedName = mapped.predicted_category.category_name.toLowerCase();
        const found = globalCategories.find((gc: any) => gc.name.toLowerCase() === predictedName);
        if (found) {
          setSelectedCategoryName(found.name);
          console.log('Auto-selected category:', found.name);
        }
      }

    } catch (error: any) {
      if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
        console.log('Prediction request cancelled');
        return;
      }

      let errorMsg = 'Prediction request failed';
      if (error.response?.status === 404) {
        errorMsg = 'Prediction endpoint not found. Make sure the Django endpoint is configured.';
      } else if (error.response?.data?.error) {
        errorMsg = error.response.data.error;
      } else if (error.message) {
        errorMsg = error.message;
      }

      setPredictionError(errorMsg);
      console.error('Image prediction failed:', error);
    } finally {
      setIsPredicting(false);
      predictionAbortController.current = null;
    }
  };

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (predictionAbortController.current) {
        predictionAbortController.current.abort();
      }
      
      mainMedia.forEach(item => {
        URL.revokeObjectURL(item.preview);
      });
      
      variants.forEach(variant => {
        if (variant.imagePreview) {
          URL.revokeObjectURL(variant.imagePreview);
        }
      });
    };
  }, []);

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

    mediaFilesRef.current = [...mediaFilesRef.current, ...filesToAdd];
    setMainMedia(prev => [...prev, ...newMedia]);

    const newImageFiles = filesToAdd.filter(f => f.type.startsWith('image/'));
    if (newImageFiles.length > 0) {
      analyzeImages(newImageFiles as File[]).catch((err) => console.error('Auto image analysis failed:', err));
    }
  };

  const removeMainMedia = (index: number) => {
    URL.revokeObjectURL(mainMedia[index].preview);
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

  // --- SIMPLIFIED VARIANT HANDLERS ---
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
    // Don't allow removing the last variant - products must have at least one variant
    if (variants.length <= 1) {
      alert("Products must have at least one variant. You cannot remove the last variant.");
      return;
    }
    
    const variant = variants.find(v => v.id === variantId);
    if (variant?.imagePreview) {
      URL.revokeObjectURL(variant.imagePreview);
    }
    
    setVariants(prev => prev.filter(v => v.id !== variantId));
  };

  const updateVariantField = (variantId: string, field: keyof Variant, value: any) => {
    // Prevent manual updates to price field
    if (field === 'price') {
      return;
    }
    
    setVariants(prev => prev.map(v => 
      v.id === variantId ? { ...v, [field]: value } : v
    ));
  };

  const handleVariantImageChange = (variantId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const preview = URL.createObjectURL(file);
      setVariants(prev => prev.map(v => 
        v.id === variantId ? { ...v, image: file, imagePreview: preview } : v
      ));
    }
    e.target.value = '';
  };

  // --- FORM SUBMISSION HANDLER ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formRef.current) return;
    
    // Validate that at least one variant exists
    if (variants.length === 0) {
      alert("Products must have at least one variant.");
      return;
    }
    
    // Validate that each variant has price (from depreciation) and quantity
    const invalidVariants = variants.filter(v => !v.price || v.price === '' || !v.quantity || v.quantity === '' || v.quantity === 0);
    if (invalidVariants.length > 0) {
      alert("All variants must have a price (from depreciation calculation) and quantity set.");
      return;
    }
    
    const formData = new FormData();
    
    // Add basic form fields
    const basicFormData = new FormData(formRef.current);
    for (const [key, value] of basicFormData.entries()) {
      if (key !== 'media_files' && !key.startsWith('variant_image_')) {
        if (value instanceof File) {
          formData.append(key, value);
        } else {
          formData.append(key, value.toString());
        }
      }
    }
    
    // Add category
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
        setSelectedCategoryName(match.name);
      } else {
        const nameToSend = (selectedCategoryName && selectedCategoryName.toLowerCase() === 'others') ? 'others' : selectedCategoryName;
        formData.append('category_admin_name', nameToSend);
      }
    }
    
    // Add media files
    mediaFilesRef.current.forEach(file => {
      if (file.size > 0) {
        formData.append('media_files', file);
      }
    });
    
    // Add simplified variants payload with depreciation data
    const variantsPayload = variants.map(v => {
      return {
        id: v.id,
        title: v.title,
        price: v.price, // This is the calculated price from depreciation
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
        // Depreciation data
        original_price: v.depreciation.originalPrice,
        usage_period: v.depreciation.usagePeriod,
        usage_unit: v.depreciation.usageUnit,
        depreciation_rate: v.depreciation.depreciationRate,
        // Attributes can be added later for filtering
        attributes: v.attributes || {},
      };
    });

    console.log('Submitting variants payload:', variantsPayload);
    formData.append('variants', JSON.stringify(variantsPayload));

    // Append variant images
    variants.forEach(v => {
      if (v.image) {
        formData.append(`variant_image_${v.id}`, v.image);
      }
    });
    
    
    // Add shop ID
    if (selectedShop) {
      formData.append('shop', selectedShop.id);
    }
    
    // Submit using fetcher
    fetcher.submit(formData, {
      method: 'post',
      encType: 'multipart/form-data',
    });
  };

  // --- RENDER ---
  useEffect(() => {
    if (fetcher && (fetcher.data)) {
      console.log('fetcher.data changed:', fetcher.data);
      if (fetcher.data.errors) {
        setApiResponseError(typeof fetcher.data.errors === 'string' ? fetcher.data.errors : JSON.stringify(fetcher.data.errors));
      } else if (fetcher.data.error) {
        setApiResponseError(fetcher.data.error);
      } else if (fetcher.data.success) {
        setApiResponseError(null);
        setApiResponseMessage(fetcher.data.message || 'Product created');
      }
    }
  }, [fetcher.data]);

  useEffect(() => {
    if (predictionResult && predictionResult.predicted_category) {
      const predictedName = predictionResult.predicted_category.category_name || '';
      if (!selectedCategoryName?.trim() || selectedCategoryName === 'others') {
        console.log('Auto-applying predicted category to dropdown:', predictedName);
        setSelectedCategoryName(predictedName);
      }
    }
  }, [predictionResult, selectedCategoryName]);

  // Helper function to safely format price
  const formatPrice = (price: number | ''): string => {
    if (typeof price === 'number') {
      return price.toFixed(2);
    }
    return '0.00';
  };

  return (
    <form 
      ref={formRef}
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      {/* Progress Steps - Orange accents only on active/completed steps */}
      <div className="flex items-center space-x-2 mb-6">
        <Badge className="px-3 py-1 bg-orange-500 text-white">1. Basic Info</Badge>
        <div className="h-0.5 w-8 bg-gray-300"></div>
        <Badge variant={mainMedia.length > 0 ? "default" : "outline"} 
          className={`px-3 py-1 ${mainMedia.length > 0 ? 'bg-orange-500 text-white' : 'border-gray-300 text-gray-600'}`}>
          2. Media
        </Badge>
        <div className="h-0.5 w-8 bg-gray-300"></div>
        <Badge className="px-3 py-1 bg-orange-500 text-white">3. Variants</Badge>
        <div className="h-0.5 w-8 bg-gray-300"></div>
        <Badge variant={variants.every(v => v.price && v.quantity) ? "default" : "outline"} 
          className={`px-3 py-1 ${variants.every(v => v.price && v.quantity) ? 'bg-orange-500 text-white' : 'border-gray-300 text-gray-600'}`}>
          4. Details
        </Badge>
      </div>

      {/* STEP 1: Basic Information - Clean white with subtle orange accent */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100">
            <Sparkles className="h-4 w-4 text-orange-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Basic Information</h2>
            <p className="text-sm text-gray-500">Start with product details. AI will suggest a category when you upload images.</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Product Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-1 text-gray-700">
                Product Name *
                <Info className="h-3 w-3 text-gray-400" />
              </Label>
              <Input 
                type="text" 
                id="name" 
                name="name" 
                required 
                placeholder="Enter product name"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="border-gray-300 focus:border-orange-500 focus:ring-orange-500"
              />
              {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
            </div>

            {/* Condition */}
            <div className="space-y-2">
              <Label htmlFor="condition" className="text-gray-700">Condition *</Label>
              <Select 
                name="condition" 
                required
                value={productCondition}
                onValueChange={setProductCondition}
              >
                <SelectTrigger className="border-gray-300 focus:border-orange-500 focus:ring-orange-500">
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
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="flex items-center gap-1 text-gray-700">
              Description *
              <Info className="h-3 w-3 text-gray-400" />
            </Label>
            <Textarea 
              id="description" 
              name="description" 
              required 
              rows={4} 
              placeholder="Describe your product in detail..."
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
              className="border-gray-300 focus:border-orange-500 focus:ring-orange-500"
            />
            {errors.description && <p className="text-sm text-red-600">{errors.description}</p>}
          </div>
        </div>
      </div>

      {/* STEP 2: Product Media & Category - Clean white with subtle orange accent */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100">
              <ImageIcon className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Product Media</h2>
              <p className="text-sm text-gray-500">Upload images/videos (max 9). First image is the cover.</p>
            </div>
          </div>
          <Badge variant="outline" className="border-gray-300 text-gray-600">
            {mainMedia.length}/9
          </Badge>
        </div>

        <div className="space-y-6">
          {/* Media Upload Area */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-orange-400 transition-colors">
            <div className="text-center">
              <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
              <div className="text-xs text-gray-500 mb-4">Images or videos (max 9 files, 50MB each)</div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="border-gray-300 text-gray-700 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300"
              >
                Choose Files
              </Button>
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
            </div>
          </div>

          {/* Media Preview Grid */}
          {mainMedia.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {mainMedia.map((item, index) => (
                <div key={index} className="relative group aspect-square border border-gray-200 rounded-lg overflow-hidden">
                  {item.type === 'image' ? (
                    <img
                      src={item.preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <Video className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  {index === 0 && (
                    <Badge className="absolute top-2 left-2 bg-orange-500 text-white px-1.5 py-0.5 text-[10px]">
                      Cover
                    </Badge>
                  )}
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 h-6 w-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600"
                    onClick={() => removeMainMedia(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              
              {mainMedia.length < 9 && (
                <Label htmlFor="main-media-upload" className="cursor-pointer flex flex-col items-center justify-center aspect-square border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50 transition-colors p-4">
                  <Plus className="h-6 w-6 mb-2" />
                  <span className="text-xs text-center">Add More</span>
                </Label>
              )}
            </div>
          )}

          {/* AI Analysis Section - Orange only for interactive elements */}
          <Collapsible className="border border-gray-200 rounded-lg">
            <CollapsibleTrigger className="flex w-full items-center justify-between p-4 hover:bg-orange-50 transition-colors">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-orange-600" />
                <span className="font-medium text-gray-700">AI Category Prediction</span>
                {predictionResult && (
                  <Badge variant="outline" className="ml-2 bg-orange-100 text-orange-700 border-orange-300">
                    Ready
                  </Badge>
                )}
              </div>
              {predictionResult ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">Analyze images to get AI category suggestions</p>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={() => analyzeImages(mainMedia.map(m => m.file))} 
                    disabled={mainMedia.length === 0 || isPredicting}
                    className="border-gray-300 text-gray-700 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300"
                  >
                    {isPredicting ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-2 text-orange-600" />
                    ) : null}
                    {isPredicting ? 'Analyzing...' : 'Analyze Images'}
                  </Button>
                </div>

                {/* Category Selection */}
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-gray-700">Category</Label>
                  <Select value={selectedCategoryName} onValueChange={handleCategoryChange}>
                    <SelectTrigger className="border-gray-300 focus:border-orange-500 focus:ring-orange-500">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="others">Others</SelectItem>
                      {modelClasses && modelClasses.length > 0 ? (
                        modelClasses.map((name) => (
                          <SelectItem key={name} value={name}>
                            {name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>
                          No categories available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  
                  {selectedCategoryName && (!modelClasses || !modelClasses.includes(selectedCategoryName)) && (
                    <p className="text-xs text-gray-600">Selected: {selectedCategoryName}</p>
                  )}

                  {predictionResult && !predictionError && (
                    <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-md">
                      <div className="font-medium text-sm text-orange-800 mb-1">AI Suggestion</div>
                      <div className="text-sm text-orange-700">
                        <span className="font-medium">{predictionResult.predicted_category?.category_name}</span>
                        <span className="ml-2 text-orange-600">
                          ({Math.round((predictionResult.predicted_category?.confidence || 0) * 100)}% confidence)
                        </span>
                      </div>
                      {predictionResult.alternative_categories && predictionResult.alternative_categories.length > 0 && (
                        <div className="text-xs text-orange-600 mt-1">
                          Also considered: {predictionResult.alternative_categories.map(a => a.category_name).join(', ')}
                        </div>
                      )}
                    </div>
                  )}

                  {predictionError && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                      <div className="text-sm text-red-700">{predictionError}</div>
                    </div>
                  )}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>

      {/* STEP 3: Variants - Orange used for important elements */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100">
              <Package className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Product Variants</h2>
              <p className="text-sm text-gray-500">Each product must have at least one variant with price and stock</p>
            </div>
          </div>
          <Badge className="bg-orange-100 text-orange-800 border-orange-300">
            Required
          </Badge>
        </div>

        <div className="space-y-6">
          {/* Variants List */}
          {variants.map((variant, index) => (
            <div 
              key={variant.id} 
              className="border border-gray-200 rounded-xl p-5 bg-white hover:border-orange-300 transition-colors relative"
            >
              {/* Variant Header */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 text-orange-700 font-semibold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <span className="font-medium text-gray-800">Variant {index + 1}</span>
                    {index === 0 && (
                      <Badge className="ml-3 bg-orange-100 text-orange-700 border-0">
                        Default
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeVariant(variant.id)}
                  disabled={variants.length === 1}
                  className="h-8 w-8 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Image Preview Section */}
              <div className="mb-5">
                <div className="flex items-center gap-4">
                  {/* Image Upload Area */}
                  <div 
                    className={`relative w-24 h-24 border-2 rounded-lg overflow-hidden transition-all ${
                      variant.imagePreview 
                        ? 'border-orange-400 shadow-sm' 
                        : 'border-dashed border-gray-300 hover:border-orange-400 bg-gray-50'
                    }`}
                  >
                    {variant.imagePreview ? (
                      <>
                        <img 
                          src={variant.imagePreview} 
                          alt={variant.title}
                          className="w-full h-full object-cover"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-1 right-1 h-5 w-5 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600"
                          onClick={() => {
                            URL.revokeObjectURL(variant.imagePreview!);
                            updateVariantField(variant.id, 'image', null);
                            updateVariantField(variant.id, 'imagePreview', undefined);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </>
                    ) : (
                      <label 
                        htmlFor={`variant-image-${variant.id}`}
                        className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-orange-100 transition-colors"
                      >
                        <ImageIcon className="h-6 w-6 text-gray-400 mb-1" />
                        <span className="text-[10px] text-gray-500">Upload</span>
                        <Input
                          id={`variant-image-${variant.id}`}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleVariantImageChange(variant.id, e)}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700 mb-1">Variant Image</p>
                    <p className="text-xs text-gray-500">
                      Upload a specific image for this variant
                    </p>
                  </div>
                </div>
              </div>

              {/* Main Variant Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                {/* Variant Title */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                    Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    value={variant.title}
                    onChange={(e) => updateVariantField(variant.id, 'title', e.target.value)}
                    placeholder="e.g., Small, Red, etc."
                    className={`h-9 text-sm border-gray-300 focus:border-orange-500 focus:ring-orange-500 ${index === 0 ? 'bg-gray-50' : ''}`}
                    required
                    readOnly={index === 0}
                  />
                </div>
                
                {/* Final Price - DISABLED and auto-calculated */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                    Final Price <span className="text-red-500">*</span>
                    {variant.depreciation.calculatedPrice && (
                      <Badge variant="outline" className="text-[10px] bg-orange-100 text-orange-700 border-orange-300">
                        Auto
                      </Badge>
                    )}
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₱</span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={variant.price}
                      disabled
                      placeholder={variant.depreciation.calculatedPrice ? "Auto-calculated" : "Fill fields"}
                      className={`h-9 text-sm pl-8 bg-gray-50 cursor-not-allowed border-gray-300 ${
                        variant.depreciation.calculatedPrice ? 'text-orange-600 font-medium' : 'text-gray-400'
                      }`}
                    />
                  </div>
                </div>
                
                {/* Quantity */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                    Stock <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    value={variant.quantity}
                    onChange={(e) => updateVariantField(variant.id, 'quantity', parseInt(e.target.value) || '')}
                    placeholder="0"
                    className="h-9 text-sm border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                    required
                  />
                </div>
                
              </div>

              {/* Depreciation Section - Orange background to highlight this important feature */}
              <div className="mb-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-center gap-2 mb-3">
                  <Calculator className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium text-orange-800">Price Depreciation Calculator</span>
                  <Badge variant="outline" className="text-[10px] bg-white text-orange-700 border-orange-300">
                    Auto-calculates final price
                  </Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Original Price */}
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-orange-700">Original Price</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">₱</span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={variant.depreciation.originalPrice || ''}
                        onChange={(e) => handleDepreciationChange(variant.id, 'originalPrice', parseFloat(e.target.value) || '')}
                        placeholder="Original price"
                        className="h-8 text-xs pl-8 border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                      />
                    </div>
                  </div>

                  {/* Usage Period */}
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-orange-700">Usage Period</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.1"
                        value={variant.depreciation.usagePeriod || ''}
                        onChange={(e) => handleDepreciationChange(variant.id, 'usagePeriod', parseFloat(e.target.value) || '')}
                        placeholder="Amount"
                        className="h-8 text-xs flex-1 border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                      />
                      <Select 
                        value={variant.depreciation.usageUnit} 
                        onValueChange={(value: 'weeks' | 'months' | 'years') => 
                          handleDepreciationChange(variant.id, 'usageUnit', value)
                        }
                      >
                        <SelectTrigger className="w-20 h-8 text-xs border-gray-300 focus:border-orange-500 focus:ring-orange-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weeks">Weeks</SelectItem>
                          <SelectItem value="months">Months</SelectItem>
                          <SelectItem value="years">Years</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Depreciation Rate */}
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-orange-700">Rate (%)</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={variant.depreciation.depreciationRate || ''}
                        onChange={(e) => handleDepreciationChange(variant.id, 'depreciationRate', parseFloat(e.target.value) || '')}
                        placeholder="e.g., 10"
                        className="h-8 text-xs border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">%</span>
                    </div>
                  </div>

                  {/* Calculated Result */}
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-orange-700">Calculated</Label>
                    <div className="h-8 px-3 bg-white border border-gray-300 rounded-md flex items-center">
                      {variant.depreciation.calculatedPrice ? (
                        <span className="text-sm font-medium text-orange-600">
                          ₱{formatPrice(variant.depreciation.calculatedPrice)}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Fill fields</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Info */}
                {variant.depreciation.originalPrice && variant.depreciation.usagePeriod && variant.depreciation.depreciationRate && (
                  <div className="mt-3 text-xs text-gray-600 bg-white p-2 rounded border border-orange-200">
                    <span className="font-medium">Calculation:</span> ₱{Number(variant.depreciation.originalPrice).toFixed(2)} × 
                    (1 - {variant.depreciation.depreciationRate}% ÷ 100)^{variant.depreciation.usagePeriod} {variant.depreciation.usageUnit} = 
                    <span className="font-bold text-orange-600 ml-1">₱{formatPrice(variant.depreciation.calculatedPrice || 0)}</span>
                  </div>
                )}
              </div>

              {/* Status Toggles - Subtle orange for active states */}
              <div className="flex items-center gap-6 mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3">
                  <Switch
                    id={`active-${variant.id}`}
                    checked={variant.is_active !== false}
                    onCheckedChange={(checked) => updateVariantField(variant.id, 'is_active', checked)}
                    className="data-[state=checked]:bg-orange-500"
                  />
                  <Label htmlFor={`active-${variant.id}`} className="text-sm text-gray-700 cursor-pointer">
                    Active
                  </Label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    id={`refundable-${variant.id}`}
                    checked={variant.refundable !== false}
                    onCheckedChange={(checked) => updateVariantField(variant.id, 'refundable', checked)}
                    className="data-[state=checked]:bg-orange-500"
                  />
                  <Label htmlFor={`refundable-${variant.id}`} className="text-sm text-gray-700 cursor-pointer">
                    Refundable
                  </Label>
                </div>
              </div>

              {/* Advanced Options Accordion */}
              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-2 text-sm text-gray-600 hover:text-orange-600 transition-colors group">
                  <div className="p-1 rounded-full group-hover:bg-orange-100">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                  <span>Additional Details</span>
                  <Badge variant="outline" className="ml-2 text-xs border-gray-300 text-gray-600">
                    Optional
                  </Badge>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">

                    {/* Weight */}
                    <div className="space-y-3">
                      <Label className="text-xs font-medium text-gray-700 block">Weight</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={variant.weight || ''}
                          onChange={(e) => updateVariantField(variant.id, 'weight', parseFloat(e.target.value) || '')}
                          placeholder="0.00"
                          className="h-8 text-xs flex-1 border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                        />
                        <Select 
                          value={variant.weight_unit || 'g'} 
                          onValueChange={(value: 'g' | 'kg' | 'lb' | 'oz') => updateVariantField(variant.id, 'weight_unit', value)}
                        >
                          <SelectTrigger className="w-16 h-8 text-xs border-gray-300 focus:border-orange-500 focus:ring-orange-500">
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

                    {/* Critical Stock Alert */}
                    <div className="space-y-3">
                      <Label className="text-xs font-medium text-gray-700 block">Low Stock Alert</Label>
                      <Input
                        type="number"
                        min="1"
                        value={variant.critical_trigger || ''}
                        onChange={(e) => updateVariantField(variant.id, 'critical_trigger', parseInt(e.target.value) || '')}
                        placeholder="Alert when stock below"
                        className="h-8 text-xs border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                      />
                    </div>

                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          ))}

          {/* Add Variant Button - Orange outline on hover */}
          <Button 
            type="button" 
            onClick={addVariant}
            variant="outline"
            className="w-full py-6 border-2 border-dashed border-gray-300 hover:border-orange-500 hover:bg-orange-50 text-gray-700 hover:text-orange-600 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Another Variant
          </Button>

          {/* Variants Summary */}
          <div className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-200">
            <span>Total Variants: {variants.length}</span>
            <span>Total Stock: {variants.reduce((sum, v) => sum + (Number(v.quantity) || 0), 0)} units</span>
          </div>
        </div>
      </div>

      {/* Submit Button - Orange primary CTA */}
      <div className="sticky bottom-6 bg-white border border-gray-200 rounded-lg shadow-lg p-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="font-medium text-gray-800">Ready to create your product?</div>
            <div className="text-sm text-gray-600">
              {selectedShop ? `Creating product for: ${selectedShop.name}` : 'Please create a shop first'}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => window.history.back()}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!selectedShop || fetcher.state === 'submitting' || variants.length === 0 || variants.some(v => !v.depreciation.calculatedPrice)}
              className="min-w-[140px] bg-orange-500 hover:bg-orange-600 text-white disabled:bg-orange-300"
              size="lg"
            >
              {fetcher.state === 'submitting' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                'Create Product'
              )}
            </Button>
          </div>
        </div>

        {apiResponseError && (
          <Alert variant="destructive" className="mt-4 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">{apiResponseError}</AlertDescription>
          </Alert>
        )}

        {apiResponseMessage && (
          <Alert className="mt-4 bg-orange-50 border-orange-200 text-orange-800">
            <AlertDescription>{apiResponseMessage}</AlertDescription>
          </Alert>
        )}
      </div>
    </form>
  );
}