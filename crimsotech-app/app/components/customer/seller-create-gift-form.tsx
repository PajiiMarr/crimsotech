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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "~/components/ui/collapsible";
import { AlertCircle, Plus, X, Image as ImageIcon, Video, Upload, Package, Loader2, Sparkles, ChevronDown, ChevronUp, Info } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from 'react';
import AxiosInstance from '~/components/axios/Axios';
import { useFetcher } from "react-router"

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

// Variant interface - same as Add Product but without price
interface Variant {
  id: string;
  title: string;
  quantity: number | '';
  sku_code?: string;
  image?: File | null;
  imagePreview?: string;
  critical_trigger?: number | '';
  is_active?: boolean;
}

interface CreateGiftFormProps {
  selectedShop: Shop | null;
  globalCategories: Category[];
  modelClasses: string[];
  errors: FormErrors;
}

interface PredictedCategory {
  id?: string;
  uuid?: string;
  name?: string;
  [key: string]: any;
}

interface PredictionResult {
  success?: boolean;
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

export default function CreateGiftForm({ selectedShop, globalCategories, modelClasses, errors }: CreateGiftFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const mediaFilesRef = useRef<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fetcher = useFetcher();

  const generateId = () => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  };

  // Form state
  const [giftName, setGiftName] = useState('');
  const [giftDescription, setGiftDescription] = useState('');
  const [giftCondition, setGiftCondition] = useState('');

  // Critical stock trigger
  const [enableCriticalTrigger, setEnableCriticalTrigger] = useState(false);
  const [criticalStock, setCriticalStock] = useState<number | ''>('');

  const [mainMedia, setMainMedia] = useState<MediaPreview[]>([]);
  
  // Variants - exactly like Add Product but without price
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
  
  // Prediction state
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);
  const [showPrediction, setShowPrediction] = useState(false);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>('');

  const [predictionError, setPredictionError] = useState<string | null>(null);
  const [apiResponseError, setApiResponseError] = useState<string | null>(null);
  const [apiResponseMessage, setApiResponseMessage] = useState<string | null>(null);
  const predictionAbortController = useRef<AbortController | null>(null);

  const [closestMatch, setClosestMatch] = useState<{ name: string; score: number } | null>(null);

  // Update first variant title when gift name changes
  useEffect(() => {
    if (variants.length > 0) {
      setVariants(prev => prev.map((variant, index) => 
        index === 0 ? { ...variant, title: giftName || "Default" } : variant
      ));
    }
  }, [giftName]);

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

  // Prediction function
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
        errorMsg = 'Prediction endpoint not found.';
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

  // Clean up
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

  // Media handlers
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
      alert("Gifts must have at least one variant. You cannot remove the last variant.");
      return;
    }
    
    const variant = variants.find(v => v.id === variantId);
    if (variant?.imagePreview) {
      URL.revokeObjectURL(variant.imagePreview);
    }
    
    setVariants(prev => prev.filter(v => v.id !== variantId));
  };

  const updateVariantField = (variantId: string, field: keyof Variant, value: any) => {
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

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formRef.current) return;
    
    if (variants.length === 0) {
      alert("Gifts must have at least one variant.");
      return;
    }
    
    const invalidVariants = variants.filter(v => !v.quantity || Number(v.quantity) === 0);
    if (invalidVariants.length > 0) {
      alert("All variants must have a quantity set.");
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
    
    // Add critical stock
    if (enableCriticalTrigger && criticalStock) {
      formData.append('critical_stock', String(criticalStock));
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
    
    // Add variants
    const variantsPayload = variants.map(v => ({
      id: v.id,
      title: v.title,
      quantity: v.quantity,
      sku_code: v.sku_code,
      critical_trigger: v.critical_trigger || null,
      is_active: v.is_active ?? true,
    }));

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
    
    fetcher.submit(formData, {
      method: 'post',
      encType: 'multipart/form-data',
    });
  };

  useEffect(() => {
    if (fetcher && (fetcher.data)) {
      console.log('fetcher.data changed:', fetcher.data);
      if (fetcher.data.errors) {
        setApiResponseError(typeof fetcher.data.errors === 'string' ? fetcher.data.errors : JSON.stringify(fetcher.data.errors));
      } else if (fetcher.data.error) {
        setApiResponseError(fetcher.data.error);
      } else if (fetcher.data.success) {
        setApiResponseError(null);
        setApiResponseMessage(fetcher.data.message || 'Gift created');
      }
    }
  }, [fetcher.data]);

  useEffect(() => {
    if (predictionResult && predictionResult.predicted_category) {
      const predictedName = predictionResult.predicted_category.category_name || '';
      if (!selectedCategoryName?.trim() || selectedCategoryName === 'others') {
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
      {/* Progress Steps */}
      <div className="flex items-center space-x-2 mb-6">
        <Badge className="px-3 py-1 bg-purple-500 text-white">1. Basic Info</Badge>
        <div className="h-0.5 w-8 bg-gray-300"></div>
        <Badge variant={mainMedia.length > 0 ? "default" : "outline"} 
          className={`px-3 py-1 ${mainMedia.length > 0 ? 'bg-purple-500 text-white' : 'border-gray-300 text-gray-600'}`}>
          2. Media
        </Badge>
        <div className="h-0.5 w-8 bg-gray-300"></div>
        <Badge className="px-3 py-1 bg-purple-500 text-white">3. Variants</Badge>
        <div className="h-0.5 w-8 bg-gray-300"></div>
        <Badge variant={variants.every(v => v.quantity) ? "default" : "outline"} 
          className={`px-3 py-1 ${variants.every(v => v.quantity) ? 'bg-purple-500 text-white' : 'border-gray-300 text-gray-600'}`}>
          4. Stock
        </Badge>
      </div>

      {/* STEP 1: Basic Information */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100">
            <Sparkles className="h-4 w-4 text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Basic Information</h2>
            <p className="text-sm text-gray-500">Start with gift details. AI will suggest a category when you upload images.</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Gift Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-1 text-gray-700">
                Gift Name *
                <Info className="h-3 w-3 text-gray-400" />
              </Label>
              <Input 
                type="text" 
                id="name" 
                name="name" 
                required 
                placeholder="Enter gift name"
                value={giftName}
                onChange={(e) => setGiftName(e.target.value)}
                className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
              />
              {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
            </div>

            {/* Condition */}
            <div className="space-y-2">
              <Label htmlFor="condition" className="text-gray-700">Condition *</Label>
              <Select 
                name="condition" 
                required
                value={giftCondition}
                onValueChange={setGiftCondition}
              >
                <SelectTrigger className="border-gray-300 focus:border-purple-500 focus:ring-purple-500">
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
              placeholder="Describe your gift in detail..."
              value={giftDescription}
              onChange={(e) => setGiftDescription(e.target.value)}
              className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
            />
            {errors.description && <p className="text-sm text-red-600">{errors.description}</p>}
          </div>
        </div>
      </div>

      {/* STEP 2: Gift Media & Category */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100">
              <ImageIcon className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Gift Media</h2>
              <p className="text-sm text-gray-500">Upload images/videos (max 9). First image is the cover.</p>
            </div>
          </div>
          <Badge variant="outline" className="border-gray-300 text-gray-600">
            {mainMedia.length}/9
          </Badge>
        </div>

        <div className="space-y-6">
          {/* Media Upload Area */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-purple-400 transition-colors">
            <div className="text-center">
              <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
              <div className="text-xs text-gray-500 mb-4">Images or videos (max 9 files, 50MB each)</div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="border-gray-300 text-gray-700 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-300"
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
                    <Badge className="absolute top-2 left-2 bg-purple-500 text-white px-1.5 py-0.5 text-[10px]">
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
                <Label htmlFor="main-media-upload" className="cursor-pointer flex flex-col items-center justify-center aspect-square border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-purple-400 hover:text-purple-600 hover:bg-purple-50 transition-colors p-4">
                  <Plus className="h-6 w-6 mb-2" />
                  <span className="text-xs text-center">Add More</span>
                </Label>
              )}
            </div>
          )}

          {/* AI Analysis Section */}
          <Collapsible className="border border-gray-200 rounded-lg">
            <CollapsibleTrigger className="flex w-full items-center justify-between p-4 hover:bg-purple-50 transition-colors">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-600" />
                <span className="font-medium text-gray-700">AI Category Prediction</span>
                {predictionResult && (
                  <Badge variant="outline" className="ml-2 bg-purple-100 text-purple-700 border-purple-300">
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
                    className="border-gray-300 text-gray-700 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-300"
                  >
                    {isPredicting ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-2 text-purple-600" />
                    ) : null}
                    {isPredicting ? 'Analyzing...' : 'Analyze Images'}
                  </Button>
                </div>

                {/* Category Selection */}
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-gray-700">Category</Label>
                  <Select value={selectedCategoryName} onValueChange={handleCategoryChange}>
                    <SelectTrigger className="border-gray-300 focus:border-purple-500 focus:ring-purple-500">
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
                    <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-md">
                      <div className="font-medium text-sm text-purple-800 mb-1">AI Suggestion</div>
                      <div className="text-sm text-purple-700">
                        <span className="font-medium">{predictionResult.predicted_category?.category_name}</span>
                        <span className="ml-2 text-purple-600">
                          ({Math.round((predictionResult.predicted_category?.confidence || 0) * 100)}% confidence)
                        </span>
                      </div>
                      {predictionResult.alternative_categories && predictionResult.alternative_categories.length > 0 && (
                        <div className="text-xs text-purple-600 mt-1">
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

      {/* STEP 3: Gift Variants */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100">
              <Package className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Gift Variants</h2>
              <p className="text-sm text-gray-500">Each gift must have at least one variant with stock</p>
            </div>
          </div>
          <Badge className="bg-purple-100 text-purple-800 border-purple-300">
            Required
          </Badge>
        </div>

        <div className="space-y-6">
          {/* Variants List */}
          {variants.map((variant, index) => (
            <div 
              key={variant.id} 
              className="border border-gray-200 rounded-xl p-5 bg-white hover:border-purple-300 transition-colors relative"
            >
              {/* Variant Header */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-semibold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <span className="font-medium text-gray-800">Variant {index + 1}</span>
                    {index === 0 && (
                      <Badge className="ml-3 bg-purple-100 text-purple-700 border-0">
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
                        ? 'border-purple-400 shadow-sm' 
                        : 'border-dashed border-gray-300 hover:border-purple-400 bg-gray-50'
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
                        className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-purple-100 transition-colors"
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
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
                    className={`h-9 text-sm border-gray-300 focus:border-purple-500 focus:ring-purple-500 ${index === 0 ? 'bg-gray-50' : ''}`}
                    required
                    readOnly={index === 0}
                  />
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
                    className="h-9 text-sm border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                    required
                  />
                </div>

                {/* SKU Code */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-700">SKU Code</Label>
                  <Input
                    type="text"
                    value={variant.sku_code || ''}
                    onChange={(e) => updateVariantField(variant.id, 'sku_code', e.target.value)}
                    placeholder="Optional"
                    className="h-9 text-sm border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Critical Stock Trigger */}
              <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-medium text-gray-700">Critical Stock Trigger</span>
                  <Badge variant="outline" className="text-[10px] bg-white text-gray-700 border-gray-300">
                    Optional
                  </Badge>
                </div>
                
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-gray-700">Alert when stock falls below</Label>
                  <Input
                    type="number"
                    min="1"
                    value={variant.critical_trigger || ''}
                    onChange={(e) => updateVariantField(variant.id, 'critical_trigger', parseInt(e.target.value) || '')}
                    placeholder="e.g., 5"
                    className="h-8 text-sm border-gray-300 focus:border-purple-500 focus:ring-purple-500 max-w-xs"
                  />
                </div>
              </div>

              {/* Status Toggle */}
              <div className="flex items-center gap-6 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3">
                  <Switch
                    id={`active-${variant.id}`}
                    checked={variant.is_active !== false}
                    onCheckedChange={(checked) => updateVariantField(variant.id, 'is_active', checked)}
                    className="data-[state=checked]:bg-purple-500"
                  />
                  <Label htmlFor={`active-${variant.id}`} className="text-sm text-gray-700 cursor-pointer">
                    Active
                  </Label>
                </div>
              </div>
            </div>
          ))}

          {/* Add Variant Button */}
          <Button 
            type="button" 
            onClick={addVariant}
            variant="outline"
            className="w-full py-6 border-2 border-dashed border-gray-300 hover:border-purple-500 hover:bg-purple-50 text-gray-700 hover:text-purple-600 transition-colors"
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

     

      {/* Submit Button */}
      <div className="sticky bottom-6 bg-white border border-gray-200 rounded-lg shadow-lg p-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="font-medium text-gray-800">Ready to create your gift?</div>
            <div className="text-sm text-gray-600">
              {selectedShop ? `Creating gift for: ${selectedShop.name}` : 'Please create a shop first'}
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
              disabled={!selectedShop || fetcher.state === 'submitting' || variants.length === 0 || variants.some(v => !v.quantity)}
              className="min-w-[140px] bg-purple-500 hover:bg-purple-600 text-white disabled:bg-purple-300"
              size="lg"
            >
              {fetcher.state === 'submitting' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                'Create Gift'
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
          <Alert className="mt-4 bg-purple-50 border-purple-200 text-purple-800">
            <AlertDescription>{apiResponseMessage}</AlertDescription>
          </Alert>
        )}
      </div>
    </form>
  );
}