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
  const [productPrice, setProductPrice] = useState<number | ''>('');
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
      className="space-y-8"
    >
      {/* No hidden category ID field; map class name to ID on submit */}
      
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

            <div className="flex justify-end">
              <p className="text-sm text-gray-500">Category prediction is image-based. Upload a cover image in Step 2 and click "Analyze Cover Image".</p>
            </div>
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
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {mainMedia.length}/9
                </Badge>
                <Button type="button" variant="outline" size="sm" onClick={() => analyzeImages(mainMedia.map(m => m.file))} disabled={mainMedia.length === 0 || isPredicting}>
                  {isPredicting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Analyze All Images'
                  )}
                </Button>
              </div>
            </div> 
            
            <div className="flex flex-col gap-4">
              <div className="flex-1">
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

                {/* Inline: Category Panel (below images) */}
                <div className="mt-4 p-3 border rounded bg-gray-50 space-y-2">
                  <div className="text-sm font-medium">Category</div>
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
                          No model classes available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>

                  {/* If selected name isn't among the model classes, show it explicitly so the user sees the AI suggestion */}
                  {selectedCategoryName && (!modelClasses || !modelClasses.includes(selectedCategoryName)) && (
                    <div className="text-xs text-gray-600 mt-1">Selected: {selectedCategoryName}</div>
                  )}



      

                  <p className="text-xs text-gray-500">Select a category here to override AI suggestion or to set it manually.</p>

                  {predictionError && (
                    <div className="mt-2 p-2 border rounded bg-red-50 text-sm text-red-700">
                      {predictionError}
                    </div>
                  )}

                  {predictionResult && !predictionError && (
                    <div className="mt-2 p-2 border rounded bg-green-50 text-sm text-green-800 space-y-2">
                      <div className="font-medium">Suggested Category</div>
                      <div>
                        {predictionResult.predicted_category?.category_name || 'Unknown'}
                        {typeof predictionResult.predicted_category?.confidence === 'number' && (
                          <span className="ml-1 text-green-700">(
                            {Math.round((predictionResult.predicted_category.confidence || 0) * 100)}%
                          )</span>
                        )}
                      </div>
                      {predictionResult.alternative_categories && predictionResult.alternative_categories.length > 0 && (
                        <div className="text-xs text-green-700">
                          Alternatives: {predictionResult.alternative_categories.map(a => a.category_name).join(', ')}
                        </div>
                      )}
                      <div className="space-y-2">
                        

                        {closestMatch && (
                          <div className="mt-2 p-2 border rounded bg-yellow-50 text-sm text-yellow-800">
                            Closest match: <strong>{closestMatch.name}</strong> ({Math.round(closestMatch.score * 100)}%)
                            <div className="mt-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedCategoryName(closestMatch.name);
                                  setAppliedCategory(globalCategories.find(gc => gc.name === closestMatch.name) || null);
                                  setClosestMatch(null);
                                  setPredictionError(null);
                                }}
                              >
                                Use Closest Match
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
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

                  {/* Product-level refundable toggle for non-variant products */}
                  <div className="flex items-center justify-between mt-3">
                    <div>
                      <h4 className="font-medium">Refundable</h4>
                      <p className="text-sm text-muted-foreground">Allow customers to request refunds for this product.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="product-refundable">Refundable</Label>
                      <Switch id="product-refundable" checked={productRefundable} onCheckedChange={setProductRefundable} />
                    </div>
                  </div>

                  {/* Hidden input so the value is included in FormData */}
                  <input type="hidden" name="refundable" value={productRefundable ? 'true' : 'false'} />
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

                      {/* Refundable toggle per SKU (seller can mark if this SKU is refundable) */}
                      <td className="px-2 py-2">
                        <Switch checked={sku.refundable ?? false} onCheckedChange={(checked) => updateSkuField(sku.id, 'refundable', checked)} />
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



      {/* Submit Button */}
      <div className="pt-6 space-y-3">
        <Button
          type="submit"
          disabled={!selectedShop || fetcher.state === 'submitting'}
          variant="default"
          size="lg"
          className="w-full"
        >
          {fetcher.state === 'submitting' ? 'Creating...' : (selectedShop ? 'Create Product' : 'Create Shop First')}
        </Button>

        {apiResponseError && (
          <div className="p-3 border rounded bg-red-50 text-sm text-red-700">
            <div className="font-medium">Failed to create product</div>
            <div className="mt-1 whitespace-pre-wrap">{apiResponseError}</div>
          </div>
        )}

        {apiResponseMessage && (
          <div className="p-3 border rounded bg-green-50 text-sm text-green-800">
            {apiResponseMessage}
          </div>
        )}
      </div>
    </form>
  );
}