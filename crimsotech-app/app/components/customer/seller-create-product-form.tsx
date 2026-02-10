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
import { AlertCircle, Store, ArrowLeft, Plus, X, Image as ImageIcon, Video, Upload, Package, Truck, Loader2, Sparkles, Calculator, ChevronDown, ChevronUp, Info } from "lucide-react";
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
  selectedShop: Shop | null;
  globalCategories: Category[];
  modelClasses: string[];
  errors: FormErrors;
}

// --- PREDICTION STATE INTERFACE ---
// UPDATED: Based on actual API response (image-based prediction)

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
  const [productQuantity, setProductQuantity] = useState<number | ''>('');
  
  // New pricing state
  const [originalPrice, setOriginalPrice] = useState<number | ''>('');
  const [usageTime, setUsageTime] = useState<number | ''>('');
  const [usageUnit, setUsageUnit] = useState<'months' | 'years'>('months');
  const [calculatedPrice, setCalculatedPrice] = useState<number | ''>('');
  
  const [productCondition, setProductCondition] = useState('');



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
    // Whether this SKU is refundable (seller can toggle per-SKU)
    refundable?: boolean;
  }

  const [skuCombinations, setSkuCombinations] = useState<SKUCombination[]>([]);
  const [productWeight, setProductWeight] = useState<number | ''>('');
  const [productWeightUnit, setProductWeightUnit] = useState<'g' | 'kg' | 'lb' | 'oz'>('g');
  const [productLength, setProductLength] = useState<number | ''>('');
  // Product-level refundable toggle (for non-variant products) - default enabled
  const [productRefundable, setProductRefundable] = useState(true);
  const [productWidth, setProductWidth] = useState<number | ''>('');
  const [productHeight, setProductHeight] = useState<number | ''>('');
  const [shippingZones, setShippingZones] = useState<ShippingZone[]>([
    { id: generateId(), name: 'Local', fee: '', freeShipping: false },
    { id: generateId(), name: 'Nearby City', fee: '', freeShipping: false },
    { id: generateId(), name: 'Far Province', fee: '', freeShipping: false },
  ]);
  
  // Prediction state (image-based)
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);
  const [showPrediction, setShowPrediction] = useState(false);
  // Empty means no selection
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>('');

  const [predictionImagePreview, setPredictionImagePreview] = useState<string | null>(null);
  const [predictionImageFile, setPredictionImageFile] = useState<File | null>(null);
  const [predictionError, setPredictionError] = useState<string | null>(null);
  const [apiResponseError, setApiResponseError] = useState<string | null>(null);
  const [apiResponseMessage, setApiResponseMessage] = useState<string | null>(null);
  const predictionAbortController = useRef<AbortController | null>(null);

  // Calculate depreciation function
  const calculateDepreciation = useCallback((original: number, time: number, unit: 'months' | 'years') => {
    if (!original || !time) return '';
    
    let years = unit === 'years' ? time : time / 12;
    const depreciationRate = 0.20; // 20% per year
    
    // Calculate depreciated value: original * (1 - depreciationRate)^years
    const depreciatedValue = original * Math.pow((1 - depreciationRate), years);
    
    // Round to 2 decimal places
    return Math.max(0, parseFloat(depreciatedValue.toFixed(2)));
  }, []);

  // Update calculated price when original price or usage time changes
  useEffect(() => {
    if (originalPrice && usageTime) {
      const calculated = calculateDepreciation(originalPrice, usageTime, usageUnit);
      setCalculatedPrice(calculated);
    } else {
      setCalculatedPrice('');
    }
  }, [originalPrice, usageTime, usageUnit, calculateDepreciation]);

  // Note: Prediction is image-based now. Validation is performed when an image is provided.

  // Handle category selection change
const [closestMatch, setClosestMatch] = useState<{ name: string; score: number } | null>(null);
const [appliedCategory, setAppliedCategory] = useState<Category | null>(null);

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
  
  // Reset closest match and applied category when user manually picks
  setClosestMatch(null);
  setAppliedCategory(null);

  // If value is empty/none, clear the selection
  if (value === "none" || value === "") {
    setSelectedCategoryName("");
    return;
  }

  // If user selects "Others", set canonical name 'others' (no custom input allowed)
  if (value === 'Others' || value === 'others') {
    setSelectedCategoryName('others');
    return;
  }

  // For model classes or category names, we store the name directly
  setSelectedCategoryName(value);
};

  // Image-based prediction using the cover image (or provided file)
 // Image-based prediction using the cover image
const predictCategoryFromImage = async (file?: File) => {
  // Delegate to analyzeImages for single-file support
  const files = file ? [file] : (mainMedia.map(m => m.file).filter(Boolean) as File[]);
  await analyzeImages(files);
};

// Analyze multiple images and aggregate predictions
const analyzeImages = async (files: File[]) => {
  const imageFiles = (files || []).filter(f => f && f.type && f.type.startsWith('image/')) as File[];
  if (imageFiles.length === 0) {
    alert('No image files to analyze.');
    return;
  }

  // Abort any previous request
  if (predictionAbortController.current) {
    predictionAbortController.current.abort();
  }
  predictionAbortController.current = new AbortController();

  setIsPredicting(true);
  setPredictionError(null);

  try {
    // Send all images in parallel
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

    // Aggregate per-class probabilities
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

    // Average the scores
    Object.keys(aggregateScores).forEach(k => { aggregateScores[k] = aggregateScores[k] / count; });

    // Sort classes
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

    // Auto-select matching category by name when an exact match exists
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

    // Automatically analyze newly added image files (not videos)
    const newImageFiles = filesToAdd.filter(f => f.type.startsWith('image/'));
    if (newImageFiles.length > 0) {
      // Run analysis asynchronously (do not block UI)
      analyzeImages(newImageFiles as File[]).catch((err) => console.error('Auto image analysis failed:', err));
    }
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
        combos = arr.map((a) => ({ option_ids: [a.id], option_map: { [variantGroups[0].id]: a.id }, price: calculatedPrice || '', quantity: productQuantity || '' }));
      } else {
        const groupId = variantGroups[idx].id;
        const newCombos: any[] = [];
        combos.forEach(existing => {
          arr.forEach((a) => {
            newCombos.push({
              option_ids: [...existing.option_ids, a.id],
              option_map: { ...existing.option_map, [groupId]: a.id },
              price: existing.price ?? calculatedPrice ?? '',
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
          price: found?.price ?? c.price ?? calculatedPrice ?? '',
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
          // refundable: preserve existing value, default to product-level toggle or enabled
          refundable: found?.refundable ?? productRefundable ?? true,
        } as SKUCombination;
      });

      // Avoid unnecessary updates: if arrays are length-equal and every id matches prev, keep prev to prevent rerender loops
      if (preserved.length === prev.length && preserved.every((p, i) => p.id === prev[i].id && p.price === prev[i].price && p.quantity === prev[i].quantity && p.sku_code === prev[i].sku_code)) {
        return prev;
      }

      return preserved;
    });
  }, [variantGroups, calculatedPrice]);

  useEffect(() => {
    generateSkuCombinations();
  }, [variantGroups, calculatedPrice]);



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
    
    // Map selected model class name to actual category ID or send name for server to create
if (selectedCategoryName?.trim()) {
      // Exact match first
      let match = globalCategories.find(gc => gc.name.toLowerCase() === selectedCategoryName.toLowerCase());
      // Fuzzy match fallback (lower threshold)
      if (!match) {
        const best = findBestCategoryMatch(selectedCategoryName);
        if (best && best.score >= 0.25) {
          match = best.category;
        }
      }

      if (match) {
        formData.append('category_admin_id', match.id);
        // Keep UI consistent
        setSelectedCategoryName(match.name);
      } else {
        // Send the suggested name to backend so it can create a global category if needed
        const nameToSend = (selectedCategoryName && selectedCategoryName.toLowerCase() === 'others') ? 'others' : selectedCategoryName;
        formData.append('category_admin_name', nameToSend);
      }
    }
    
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
          const refundableFlag = !!s.refundable;
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
            // Send both keys for backend normalization
            refundable: refundableFlag,
            is_refundable: refundableFlag,
            is_active: s.is_active ?? true,
          };
        });

        // Debug: log skus payload before appending
        console.log('Submitting SKUs payload (seller):', skusPayload);

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
    
    // Debug: log FormData entries being submitted
    try {
      for (const [k, v] of (formData as any).entries()) {
        const preview = (v && typeof v === 'object' && 'name' in v) ? { name: v.name, size: v.size, type: v.type } : String(v).slice(0, 200);
        console.log('Submitting form entry ->', k, preview);
      }
    } catch (err) {
      console.log('Failed to iterate formData entries:', err);
    }

    // Submit using fetcher
    fetcher.submit(formData, {
      method: 'post',
      encType: 'multipart/form-data',
    });
  };

  // --- RENDER ---
  // Show API errors returned by the action (client-side feedback)
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

  // Auto-apply model suggestion to the category dropdown when prediction result updates
  useEffect(() => {
    if (predictionResult && predictionResult.predicted_category) {
      const predictedName = predictionResult.predicted_category.category_name || '';
      // Auto-set when user hasn't chosen a category yet or current selection is 'others'
      if (!selectedCategoryName?.trim() || selectedCategoryName === 'others') {
        console.log('Auto-applying predicted category to dropdown:', predictedName);
        setSelectedCategoryName(predictedName);
      }
    }
  }, [predictionResult, selectedCategoryName]);

  return (
    <form 
      ref={formRef}
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      {/* Hidden input for the calculated price to be submitted */}
      <input type="hidden" name="price" value={calculatedPrice} />
      
      {/* Progress Steps */}
      <div className="flex items-center space-x-2 mb-6">
        <Badge variant="default" className="px-3 py-1">1. Basic Info</Badge>
        <div className="h-0.5 w-8 bg-gray-300"></div>
        <Badge variant={mainMedia.length > 0 ? "default" : "outline"} className="px-3 py-1">2. Media</Badge>
        <div className="h-0.5 w-8 bg-gray-300"></div>
        <Badge variant={showVariants ? "default" : "outline"} className="px-3 py-1">3. Variations</Badge>
        <div className="h-0.5 w-8 bg-gray-300"></div>
        <Badge variant={calculatedPrice ? "default" : "outline"} className="px-3 py-1">4. Pricing & Stock</Badge>
      </div>

      {/* STEP 1: Basic Information */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100">
            <Sparkles className="h-4 w-4 text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Basic Information</h2>
            <p className="text-sm text-gray-500">Start with product details. AI will suggest a category when you upload images.</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Product Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-1">
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
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="flex items-center gap-1">
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
              className={showPrediction && predictionResult ? 'border-green-500' : ''}
            />
            {errors.description && <p className="text-sm text-red-600">{errors.description}</p>}
          </div>
        </div>
      </div>

      {/* STEP 2: Product Media & Category */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
              <ImageIcon className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Product Media</h2>
              <p className="text-sm text-gray-500">Upload images/videos (max 9). First image is the cover.</p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            {mainMedia.length}/9
          </Badge>
        </div>

        <div className="space-y-6">
          {/* Media Upload Area */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
            <div className="text-center">
              <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
              <Label htmlFor="main-media-upload" className="flex justify-center flex-col text-center cursor-pointer">
                <div className="text-xs text-gray-500 mb-4">Images or videos (max 9 files, 50MB each)</div>
                <Button type="button" variant="outline" size="sm">
                  Choose Files
                </Button>
              </Label>
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
                <div key={index} className="relative group aspect-square border rounded-lg overflow-hidden">
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
                    <Badge className="absolute top-2 left-2 bg-black/80 text-white px-1.5 py-0.5 text-[10px]">
                      Cover
                    </Badge>
                  )}
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 h-6 w-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeMainMedia(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              
              {mainMedia.length < 9 && (
                <Label htmlFor="main-media-upload" className="cursor-pointer flex flex-col items-center justify-center aspect-square border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-800 hover:bg-gray-50 transition-colors p-4">
                  <Plus className="h-6 w-6 mb-2" />
                  <span className="text-xs text-center">Add More</span>
                </Label>
              )}
            </div>
          )}

          {/* AI Analysis Section */}
          <Collapsible className="border rounded-lg">
            <CollapsibleTrigger className="flex w-full items-center justify-between p-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-600" />
                <span className="font-medium">AI Category Prediction</span>
                {predictionResult && (
                  <Badge variant="outline" className="ml-2 bg-green-50 text-green-700">
                    Ready
                  </Badge>
                )}
              </div>
              {predictionResult ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
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
                  >
                    {isPredicting ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-2" />
                    ) : null}
                    {isPredicting ? 'Analyzing...' : 'Analyze Images'}
                  </Button>
                </div>

                {/* Category Selection */}
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={selectedCategoryName} onValueChange={handleCategoryChange}>
                    <SelectTrigger>
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
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                      <div className="font-medium text-sm text-green-800 mb-1">AI Suggestion</div>
                      <div className="text-sm text-green-700">
                        <span className="font-medium">{predictionResult.predicted_category?.category_name}</span>
                        <span className="ml-2 text-green-600">
                          ({Math.round((predictionResult.predicted_category?.confidence || 0) * 100)}% confidence)
                        </span>
                      </div>
                      {predictionResult.alternative_categories && predictionResult.alternative_categories.length > 0 && (
                        <div className="text-xs text-green-600 mt-1">
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

      {/* STEP 3: Variations */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
              <Package className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Product Variations</h2>
              <p className="text-sm text-gray-500">Add options like size, color, etc. (Optional)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="variant-toggle" className="text-sm">Enable Variations</Label>
            <Switch
              id="variant-toggle"
              checked={showVariants}
              onCheckedChange={(checked) => {
                setShowVariants(checked);
                if (checked && variantGroups.length === 0) {
                  addVariantGroup();
                }
              }}
            />
          </div>
        </div>

        {showVariants ? (
          <div className="space-y-6">
            {/* Variant Groups */}
            {variantGroups.map((group) => (
              <div key={group.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={group.title}
                      onChange={(e) => updateVariantGroupTitle(group.id, e.target.value)}
                      placeholder="e.g., Size, Color"
                      className="w-32 font-medium"
                    />
                  </div>
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
                
                <div className="space-y-3">
                  <div className="text-sm font-medium text-gray-700">Options:</div>
                  <div className="flex flex-wrap gap-2">
                    {group.options.map((option) => (
                      <div key={option.id} className="flex items-center gap-1 bg-gray-100 rounded-full px-3 py-1">
                        <span className="text-sm">{option.title}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeOption(group.id, option.id)}
                          className="h-4 w-4 p-0 hover:bg-transparent"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    <input
                      type="text"
                      className="flex-1 min-w-[120px] text-sm border-0 focus:outline-none focus:ring-0 px-3 py-1"
                      placeholder="Add option..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (e.currentTarget.value.trim()) {
                            addOption(group.id, e.currentTarget.value.trim());
                            e.currentTarget.value = '';
                          }
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

            <Button 
              type="button" 
              onClick={addVariantGroup}
              variant="outline"
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Another Option Type
            </Button>

            {/* Generated SKU Combinations */}
            {skuCombinations.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">Generated Combinations ({skuCombinations.length})</h3>
                  <Badge variant="outline">{skuCombinations.length} SKUs</Badge>
                </div>
                <div className="overflow-x-auto border rounded-lg">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 font-medium text-left">Combination</th>
                        <th className="px-3 py-2 font-medium text-left">Price</th>
                        <th className="px-3 py-2 font-medium text-left">Qty</th>
                        <th className="px-3 py-2 font-medium text-left">SKU</th>
                      </tr>
                    </thead>
                    <tbody>
                      {skuCombinations.slice(0, 5).map((sku) => (
                        <tr key={sku.id} className="border-t">
                          <td className="px-3 py-2">
                            {variantGroups.map((g) => (
                              <span key={g.id} className="text-xs bg-gray-100 rounded px-2 py-1 mr-1">
                                {g.options.find(o => o.id === sku.option_map[g.id])?.title}
                              </span>
                            ))}
                          </td>
                          <td className="px-3 py-2">
                            <Input 
                              type="number" 
                              min="0" 
                              step="0.01" 
                              value={sku.price || ''} 
                              onChange={(e) => updateSkuField(sku.id, 'price', parseFloat(e.target.value) || '')}
                              className="w-24"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input 
                              type="number" 
                              min="0" 
                              value={sku.quantity || ''} 
                              onChange={(e) => updateSkuField(sku.id, 'quantity', parseInt(e.target.value) || '')}
                              className="w-20"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input 
                              type="text" 
                              value={sku.sku_code || ''} 
                              onChange={(e) => updateSkuField(sku.id, 'sku_code', e.target.value)}
                              placeholder="SKU"
                              className="w-32"
                            />
                          </td>
                        </tr>
                      ))}
                      {skuCombinations.length > 5 && (
                        <tr className="border-t bg-gray-50">
                          <td colSpan={4} className="px-3 py-2 text-center text-sm text-gray-500">
                            + {skuCombinations.length - 5} more combinations
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="font-medium text-gray-700 mb-1">No Variations</h3>
            <p className="text-sm text-gray-500 mb-4">Enable variations to add options like size, color, etc.</p>
            <Button 
              type="button" 
              variant="outline"
              onClick={() => {
                setShowVariants(true);
                if (variantGroups.length === 0) {
                  addVariantGroup();
                }
              }}
            >
              Enable Variations
            </Button>
          </div>
        )}
      </div>

      {/* STEP 4: Pricing & Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pricing Section */}
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
              <Calculator className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Pricing</h2>
              <p className="text-sm text-gray-500">Set original price and usage time for depreciation calculation</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Original Price */}
            <div className="space-y-2">
              <Label htmlFor="original_price" className="flex items-center gap-1">
                Original Price *
                <Info className="h-3 w-3 text-gray-400" />
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <Input
                  type="number"
                  id="original_price"
                  name="original_price"
                  required
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={originalPrice}
                  onChange={(e) => setOriginalPrice(parseFloat(e.target.value) || '')}
                  className="pl-8"
                />
              </div>
              {errors.price && <p className="text-sm text-red-600">{errors.price}</p>}
            </div>

            {/* Usage Time */}
            <div className="space-y-2">
              <Label htmlFor="usage_time" className="flex items-center gap-1">
                Usage Time *
                <Info className="h-3 w-3 text-gray-400" />
              </Label>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Input
                    type="number"
                    id="usage_time"
                    name="usage_time"
                    required
                    min="0"
                    step="0.1"
                    placeholder="0"
                    value={usageTime}
                    onChange={(e) => setUsageTime(parseFloat(e.target.value) || '')}
                  />
                </div>
                <Select value={usageUnit} onValueChange={(value: 'months' | 'years') => setUsageUnit(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="months">Months</SelectItem>
                    <SelectItem value="years">Years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-gray-500">How long the product has been used</p>
            </div>

            {/* Calculated Price */}
            <div className="space-y-2">
              <Label htmlFor="calculated_price">Calculated Selling Price</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <Input
                  type="number"
                  id="calculated_price"
                  name="calculated_price_display"
                  readOnly
                  value={calculatedPrice}
                  className="pl-8 bg-gray-50 font-medium"
                />
                <Badge 
                  variant={calculatedPrice ? "default" : "outline"} 
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  {calculatedPrice ? 'Auto-calculated' : 'Enter values'}
                </Badge>
              </div>
            </div>


            {/* Refundable Toggle */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="space-y-1">
                <div className="font-medium">Refundable</div>
                <div className="text-sm text-gray-500">Allow customers to request refunds</div>
              </div>
              <Switch 
                id="product-refundable" 
                checked={productRefundable} 
                onCheckedChange={setProductRefundable} 
              />
            </div>

            {/* Hidden inputs for FormData */}
            <input type="hidden" name="price" value={calculatedPrice} />
            <input type="hidden" name="usage_unit" value={usageUnit} />
            <input type="hidden" name="refundable" value={productRefundable ? 'true' : 'false'} />
          </div>
        </div>

        {/* Stock Section */}
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
              <Package className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Stock & Inventory</h2>
              <p className="text-sm text-gray-500">Set quantity and low stock alerts</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Quantity */}
            <div className="space-y-2">
              <Label htmlFor="quantity" className="flex items-center gap-1">
                Quantity *
                <Info className="h-3 w-3 text-gray-400" />
              </Label>
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

            {/* Critical Stock Alert */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="font-medium flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    Low Stock Alert
                  </div>
                  <div className="text-sm text-gray-500">Get notified when stock is low</div>
                </div>
                <Switch
                  checked={enableCriticalTrigger}
                  onCheckedChange={setEnableCriticalTrigger}
                />
              </div>

              {enableCriticalTrigger && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="critical_threshold">Alert When Stock Reaches</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        id="critical_threshold"
                        name="critical_threshold"
                        min="1"
                        placeholder="e.g., 5"
                        value={criticalThreshold}
                        onChange={(e) => setCriticalThreshold(parseInt(e.target.value) || '')}
                        className="flex-1"
                      />
                      <span className="text-sm text-gray-500">units</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    You'll receive a notification when stock falls to or below this level
                  </div>
                </div>
              )}
            </div>

            {/* Weight & Dimensions */}
            <div className="space-y-4 pt-4 border-t">
              <div className="font-medium">Shipping Details</div>
              <div className="grid grid-cols-2 gap-4">
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
                    <input type="hidden" name="weight_unit" value={productWeightUnit} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="sticky bottom-6 bg-white border rounded-lg shadow-lg p-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="font-medium">Ready to create your product?</div>
            <div className="text-sm text-gray-500">
              {selectedShop ? `Creating product for: ${selectedShop.name}` : 'Please create a shop first'}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => window.history.back()}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!selectedShop || fetcher.state === 'submitting'}
              variant="default"
              size="lg"
              className="min-w-[140px]"
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
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{apiResponseError}</AlertDescription>
          </Alert>
        )}

        {apiResponseMessage && (
          <Alert className="mt-4 bg-green-50 border-green-200 text-green-800">
            <AlertDescription>{apiResponseMessage}</AlertDescription>
          </Alert>
        )}
      </div>
    </form>
  );
}