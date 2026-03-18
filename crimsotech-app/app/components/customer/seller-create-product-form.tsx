import { Link } from "react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Badge } from "~/components/ui/badge";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Switch } from "~/components/ui/switch";
import { Separator } from "~/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import { Slider } from "~/components/ui/slider";
import {
  AlertCircle,
  Store,
  ArrowLeft,
  Plus,
  X,
  Image as ImageIcon,
  Video,
  Upload,
  Package,
  Truck,
  Loader2,
  Sparkles,
  Calculator,
  ChevronDown,
  ChevronUp,
  Info,
  GripVertical,
  Percent,
  Clock,
  Camera,
  Shield,
  Star,
  CalendarIcon,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import AxiosInstance from "~/components/axios/Axios";
import { useFetcher } from "react-router";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Calendar } from "~/components/ui/calendar";
import {
  format,
  differenceInMonths,
  differenceInWeeks,
  differenceInYears,
} from "date-fns";
import { cn } from "~/lib/utils";

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
  type: "image" | "video";
}

interface ShippingZone {
  id: string;
  name: "Local" | "Nearby City" | "Far Province";
  fee: number | "";
  freeShipping: boolean;
}

interface Depreciation {
  originalPrice: number | "";
  usagePeriod: number | "";
  usageUnit: "weeks" | "months" | "years";
  depreciationRate: number | "";
  calculatedPrice: number | "";
  purchaseDate?: Date | null;
}

interface Variant {
  id: string;
  title: string;
  price: number | "";
  compare_price?: number | "";
  quantity: number | "";
  sku_code?: string;
  image?: File | null;
  imagePreview?: string;
  proofImage?: File | null;
  proofImagePreview?: string;
  length?: number | "";
  width?: number | "";
  height?: number | "";
  weight?: number | "";
  weight_unit?: "g" | "kg" | "lb" | "oz";
  critical_trigger?: number | "";
  is_active?: boolean;
  refundable?: boolean;
  depreciation: Depreciation;
  attributes?: Record<string, string>;
}

interface CreateProductFormProps {
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

interface ImagePredictions {
  predicted_class?: string;
  confidence?: number;
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

// Condition scale constants
const CONDITION_SCALE = {
  1: {
    label: "Poor - Heavy signs of use, may not function perfectly",
    color: "bg-red-100 text-red-800 border-red-300",
    icon: "★",
  },
  2: {
    label: "Fair - Visible wear, fully functional",
    color: "bg-orange-100 text-orange-800 border-orange-300",
    icon: "★★",
  },
  3: {
    label: "Good - Normal wear, well-maintained",
    color: "bg-yellow-100 text-yellow-800 border-yellow-300",
    icon: "★★★",
  },
  4: {
    label: "Very Good - Minimal wear, almost like new",
    color: "bg-blue-100 text-blue-800 border-blue-300",
    icon: "★★★★",
  },
  5: {
    label: "Like New - No signs of use, original packaging",
    color: "bg-green-100 text-green-800 border-green-300",
    icon: "★★★★★",
  },
} as const;

type ConditionValue = keyof typeof CONDITION_SCALE;

export default function CreateProductForm({
  selectedShop,
  globalCategories,
  modelClasses,
  errors,
}: CreateProductFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const mediaFilesRef = useRef<File[]>([]);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const variantImageInputRefs = useRef<Record<string, HTMLInputElement>>({});
  const proofImageInputRefs = useRef<Record<string, HTMLInputElement>>({});
  const fetcher = useFetcher();

  const generateId = () => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  };

  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productCondition, setProductCondition] = useState<ConditionValue | "">(
    "",
  );
  const [mainMedia, setMainMedia] = useState<MediaPreview[]>([]);
  const [variants, setVariants] = useState<Variant[]>([
    {
      id: generateId(),
      title: productName || "Default",
      price: "",
      quantity: "",
      sku_code: "",
      weight_unit: "g",
      is_active: true,
      refundable: true,
      depreciation: {
        originalPrice: "",
        usagePeriod: "",
        usageUnit: "months",
        depreciationRate: 10,
        calculatedPrice: "",
        purchaseDate: null,
      },
    },
  ]);
  const [productRefundable, setProductRefundable] = useState(true);
  const [shippingZones, setShippingZones] = useState<ShippingZone[]>([
    { id: generateId(), name: "Local", fee: "", freeShipping: false },
    { id: generateId(), name: "Nearby City", fee: "", freeShipping: false },
    { id: generateId(), name: "Far Province", fee: "", freeShipping: false },
  ]);
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictionResult, setPredictionResult] =
    useState<PredictionResult | null>(null);
  const [showPrediction, setShowPrediction] = useState(false);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>("");
  const [predictionError, setPredictionError] = useState<string | null>(null);
  const [apiResponseError, setApiResponseError] = useState<string | null>(null);
  const [apiResponseMessage, setApiResponseMessage] = useState<string | null>(
    null,
  );
  const predictionAbortController = useRef<AbortController | null>(null);
  const [closestMatch, setClosestMatch] = useState<{
    name: string;
    score: number;
  } | null>(null);
  const [appliedCategory, setAppliedCategory] = useState<Category | null>(null);

  const calculateDepreciatedPrice = (
    originalPrice: number,
    usagePeriod: number,
    usageUnit: string,
    depreciationRate: number,
  ): number => {
    if (!originalPrice || !usagePeriod || !depreciationRate)
      return originalPrice;
    let years = usagePeriod;
    if (usageUnit === "months") {
      years = usagePeriod / 12;
    } else if (usageUnit === "weeks") {
      years = usagePeriod / 52;
    }
    const rate = depreciationRate / 100;
    const depreciatedValue = originalPrice * Math.pow(1 - rate, years);
    return Math.max(0, Math.round(depreciatedValue * 100) / 100);
  };

  const calculateUsagePeriod = (
    purchaseDate: Date,
    unit: "weeks" | "months" | "years",
  ): number => {
    const today = new Date();
    switch (unit) {
      case "weeks":
        return differenceInWeeks(today, purchaseDate);
      case "months":
        return differenceInMonths(today, purchaseDate);
      case "years":
        return differenceInYears(today, purchaseDate);
      default:
        return 0;
    }
  };

  const handlePurchaseDateChange = (
    variantId: string,
    date: Date | undefined,
  ) => {
    setVariants((prev) =>
      prev.map((v) => {
        if (v.id === variantId) {
          const updatedDepreciation = { ...v.depreciation, purchaseDate: date };
          if (date) {
            const usagePeriod = calculateUsagePeriod(
              date,
              v.depreciation.usageUnit || "months",
            );
            updatedDepreciation.usagePeriod = usagePeriod;

            if (
              updatedDepreciation.originalPrice &&
              updatedDepreciation.depreciationRate
            ) {
              const calculatedPrice = calculateDepreciatedPrice(
                Number(updatedDepreciation.originalPrice),
                usagePeriod,
                v.depreciation.usageUnit || "months",
                Number(updatedDepreciation.depreciationRate),
              );
              updatedDepreciation.calculatedPrice = calculatedPrice;
              return {
                ...v,
                depreciation: updatedDepreciation,
                price: calculatedPrice,
              };
            }
          }
          return { ...v, depreciation: updatedDepreciation };
        }
        return v;
      }),
    );
  };

  const handleUsageUnitChange = (
    variantId: string,
    value: "weeks" | "months" | "years",
  ) => {
    setVariants((prev) =>
      prev.map((v) => {
        if (v.id === variantId) {
          const updatedDepreciation = { ...v.depreciation, usageUnit: value };
          if (v.depreciation.purchaseDate) {
            const usagePeriod = calculateUsagePeriod(
              v.depreciation.purchaseDate,
              value,
            );
            updatedDepreciation.usagePeriod = usagePeriod;

            if (
              updatedDepreciation.originalPrice &&
              updatedDepreciation.depreciationRate
            ) {
              const calculatedPrice = calculateDepreciatedPrice(
                Number(updatedDepreciation.originalPrice),
                usagePeriod,
                value,
                Number(updatedDepreciation.depreciationRate),
              );
              updatedDepreciation.calculatedPrice = calculatedPrice;
              return {
                ...v,
                depreciation: updatedDepreciation,
                price: calculatedPrice,
              };
            }
          }
          return { ...v, depreciation: updatedDepreciation };
        }
        return v;
      }),
    );
  };

  const handleDepreciationChange = (
    variantId: string,
    field: keyof Depreciation,
    value: any,
  ) => {
    setVariants((prev) =>
      prev.map((v) => {
        if (v.id === variantId) {
          const updatedDepreciation = { ...v.depreciation, [field]: value };

          // Recalculate if we have all required fields
          if (
            updatedDepreciation.originalPrice &&
            updatedDepreciation.usagePeriod &&
            updatedDepreciation.depreciationRate
          ) {
            const calculatedPrice = calculateDepreciatedPrice(
              Number(updatedDepreciation.originalPrice),
              Number(updatedDepreciation.usagePeriod),
              updatedDepreciation.usageUnit || "months",
              Number(updatedDepreciation.depreciationRate),
            );
            updatedDepreciation.calculatedPrice = calculatedPrice;
            return {
              ...v,
              depreciation: updatedDepreciation,
              price: calculatedPrice,
            };
          }
          return { ...v, depreciation: updatedDepreciation };
        }
        return v;
      }),
    );
  };

  const handleDepreciationRateChange = (variantId: string, value: number[]) => {
    setVariants((prev) =>
      prev.map((v) => {
        if (v.id === variantId) {
          const rate = value[0];
          const updatedDepreciation = {
            ...v.depreciation,
            depreciationRate: rate,
          };

          if (
            updatedDepreciation.originalPrice &&
            updatedDepreciation.usagePeriod
          ) {
            const calculatedPrice = calculateDepreciatedPrice(
              Number(updatedDepreciation.originalPrice),
              Number(updatedDepreciation.usagePeriod),
              updatedDepreciation.usageUnit || "months",
              rate,
            );
            updatedDepreciation.calculatedPrice = calculatedPrice;
            return {
              ...v,
              depreciation: updatedDepreciation,
              price: calculatedPrice,
            };
          }
          return { ...v, depreciation: updatedDepreciation };
        }
        return v;
      }),
    );
  };

  const normalizeText = (s: string) => {
    return s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean)
      .join(" ");
  };

  const tokenSimilarity = (a: string, b: string) => {
    const ta = new Set(normalizeText(a).split(" "));
    const tb = new Set(normalizeText(b).split(" "));
    if (ta.size === 0 || tb.size === 0) return 0;
    const inter = [...ta].filter((x) => tb.has(x)).length;
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
    setClosestMatch(null);
    setAppliedCategory(null);
    const stringValue = String(value).trim();
    if (stringValue === "none" || stringValue === "") {
      setSelectedCategoryName("");
      return;
    }
    if (stringValue === "Others" || stringValue === "others") {
      setSelectedCategoryName("others");
      return;
    }
    setSelectedCategoryName(stringValue);
  };

  const analyzeImages = async (files: File[]) => {
    const imageFiles = (files || []).filter(
      (f) => f && f.type && f.type.startsWith("image/"),
    ) as File[];
    if (imageFiles.length === 0) {
      alert("No image files to analyze.");
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
        form.append("image", file);
        return AxiosInstance.post("/predict/", form, {
          signal: predictionAbortController.current!.signal,
        });
      });
      const settled = await Promise.allSettled(requests);
      const successful = settled.filter(
        (s) => s.status === "fulfilled",
      ) as PromiseFulfilledResult<any>[];
      if (successful.length === 0) {
        setPredictionError("All image predictions failed");
        return;
      }
      const aggregateScores: Record<string, number> = {};
      let count = 0;
      successful.forEach((res) => {
        const data = res.value?.data;
        if (!data || !data.success || !data.predictions) return;
        const p = data.predictions;
        if (p.all_predictions && typeof p.all_predictions === "object") {
          Object.entries(p.all_predictions).forEach(([cls, score]) => {
            aggregateScores[cls] =
              (aggregateScores[cls] || 0) + Number(score || 0);
          });
        } else if (p.predicted_class) {
          const cls = String(p.predicted_class);
          const conf = Number(p.confidence || 1);
          aggregateScores[cls] = (aggregateScores[cls] || 0) + conf;
        }
        count += 1;
      });
      if (count === 0) {
        setPredictionError("No valid predictions received");
        return;
      }
      Object.keys(aggregateScores).forEach((k) => {
        aggregateScores[k] = aggregateScores[k] / count;
      });
      const sorted = Object.entries(aggregateScores).sort(
        (a, b) => b[1] - a[1],
      );
      const topClass = sorted[0]?.[0] || "Unknown";
      const topConfidence = Number(sorted[0]?.[1] || 0);
      const mapped: PredictionResult = {
        success: true,
        predicted_category: {
          category_name: topClass,
          confidence: topConfidence,
          category_uuid: null,
        } as any,
        alternative_categories: sorted
          .slice(1, 4)
          .map((s) => ({ category_name: s[0], confidence: s[1] })),
        all_categories: globalCategories
          ? globalCategories.map((c: Category) => ({
              uuid: c.id,
              name: c.name,
              id: c.id,
            }))
          : [],
        all_predictions: Object.fromEntries(sorted),
        predicted_class: topClass,
        analyzed_images_count: count,
      };
      setPredictionResult(mapped);
      setShowPrediction(true);
      if (mapped.predicted_category?.category_name && globalCategories) {
        const predictedName =
          mapped.predicted_category.category_name.toLowerCase();
        const found = globalCategories.find(
          (gc: any) => gc.name.toLowerCase() === predictedName,
        );
        if (found) {
          setSelectedCategoryName(found.name);
        }
      }
    } catch (error: any) {
      if (error.name === "AbortError" || error.code === "ERR_CANCELED") return;
      let errorMsg = "Prediction request failed";
      if (error.response?.status === 404) {
        errorMsg = "Prediction endpoint not found.";
      } else if (error.response?.data?.error) {
        errorMsg = error.response.data.error;
      } else if (error.message) {
        errorMsg = error.message;
      }
      setPredictionError(errorMsg);
    } finally {
      setIsPredicting(false);
      predictionAbortController.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (predictionAbortController.current)
        predictionAbortController.current.abort();
      mainMedia.forEach((item) => URL.revokeObjectURL(item.preview));
      variants.forEach((variant) => {
        if (variant.imagePreview) URL.revokeObjectURL(variant.imagePreview);
        if (variant.proofImagePreview)
          URL.revokeObjectURL(variant.proofImagePreview);
      });
    };
  }, []);

  const updateShippingZoneFee = (zoneId: string, fee: number | "") => {
    setShippingZones((prev) =>
      prev.map((zone) => (zone.id === zoneId ? { ...zone, fee } : zone)),
    );
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxMedia = 9;
    const validFiles = files.filter((file) => file.type.startsWith("image/"));
    const availableSlots = maxMedia - mainMedia.length;
    const filesToAdd = validFiles.slice(0, availableSlots);
    if (filesToAdd.length === 0 && files.length > 0) {
      alert(
        `Only image files are supported and the maximum limit is ${maxMedia} total media files.`,
      );
      return;
    }
    const newMedia = filesToAdd.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      type: "image" as "image" | "video",
    }));
    mediaFilesRef.current = [...mediaFilesRef.current, ...filesToAdd];
    setMainMedia((prev) => [...prev, ...newMedia]);
    if (filesToAdd.length > 0) {
      analyzeImages(filesToAdd as File[]).catch((err) =>
        console.error("Auto image analysis failed:", err),
      );
    }
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const removeMainMedia = (index: number) => {
    URL.revokeObjectURL(mainMedia[index].preview);
    mediaFilesRef.current = mediaFilesRef.current.filter((_, i) => i !== index);
    setMainMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleZoneFreeShipping = (zoneId: string) => {
    setShippingZones((prev) =>
      prev.map((zone) => {
        if (zone.id === zoneId) {
          const newFreeShipping = !zone.freeShipping;
          return {
            ...zone,
            freeShipping: newFreeShipping,
            fee: newFreeShipping ? 0 : "",
          };
        }
        return zone;
      }),
    );
  };

  const addVariant = () => {
    setVariants((prev) => [
      ...prev,
      {
        id: generateId(),
        title: `Variant ${prev.length + 1}`,
        price: "",
        quantity: "",
        sku_code: "",
        weight_unit: "g",
        is_active: true,
        refundable: productRefundable,
        depreciation: {
          originalPrice: "",
          usagePeriod: "",
          usageUnit: "months",
          depreciationRate: 10,
          calculatedPrice: "",
          purchaseDate: null,
        },
      },
    ]);
  };

  const removeVariant = (variantId: string) => {
    if (variants.length <= 1) {
      alert("Products must have at least one variant.");
      return;
    }
    const variant = variants.find((v) => v.id === variantId);
    if (variant?.imagePreview) URL.revokeObjectURL(variant.imagePreview);
    if (variant?.proofImagePreview)
      URL.revokeObjectURL(variant.proofImagePreview);
    setVariants((prev) => prev.filter((v) => v.id !== variantId));
  };

  const updateVariantField = (
    variantId: string,
    field: keyof Variant,
    value: any,
  ) => {
    if (field === "price") return;
    setVariants((prev) =>
      prev.map((v) => (v.id === variantId ? { ...v, [field]: value } : v)),
    );
  };

  const handleVariantImageChange = (
    variantId: string,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const preview = URL.createObjectURL(file);
      setVariants((prev) =>
        prev.map((v) =>
          v.id === variantId ? { ...v, image: file, imagePreview: preview } : v,
        ),
      );
    }
    e.target.value = "";
  };

  const handleVariantProofImageChange = (
    variantId: string,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const preview = URL.createObjectURL(file);
      setVariants((prev) =>
        prev.map((v) =>
          v.id === variantId
            ? { ...v, proofImage: file, proofImagePreview: preview }
            : v,
        ),
      );
    }
    e.target.value = "";
  };

  const openVariantCamera = (variantId: string) => {
    variantImageInputRefs.current[variantId]?.click();
  };

  const openProofCamera = (variantId: string) => {
    proofImageInputRefs.current[variantId]?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRef.current) return;
    if (variants.length === 0) {
      alert("Products must have at least one variant.");
      return;
    }
    const invalidVariants = variants.filter(
      (v) => v.price === "" || !v.quantity || Number(v.quantity) === 0,
    );
    if (invalidVariants.length > 0) {
      alert(
        "All variants must have a price (from depreciation calculation) and quantity set.",
      );
      return;
    }
    const formData = new FormData();
    const basicFormData = new FormData(formRef.current);
    for (const [key, value] of basicFormData.entries()) {
      if (
        key !== "media_files" &&
        !key.startsWith("variant_image_") &&
        !key.startsWith("proof_image_")
      ) {
        if (value instanceof File) {
          formData.append(key, value);
        } else {
          formData.append(key, value.toString());
        }
      }
    }

    // Add condition as integer value
    if (productCondition) {
      formData.append("condition", productCondition.toString());
    }

    if (selectedCategoryName?.trim()) {
      let match = globalCategories.find(
        (gc) => gc.name.toLowerCase() === selectedCategoryName.toLowerCase(),
      );
      if (!match) {
        const best = findBestCategoryMatch(selectedCategoryName);
        if (best && best.score >= 0.25) match = best.category;
      }
      if (match) {
        formData.append("category_admin_id", match.id);
        setSelectedCategoryName(match.name);
      } else {
        const nameToSend =
          selectedCategoryName &&
          selectedCategoryName.toLowerCase() === "others"
            ? "others"
            : selectedCategoryName;
        formData.append("category_admin_name", nameToSend);
      }
    }
    mediaFilesRef.current.forEach((file) => {
      if (file.size > 0) formData.append("media_files", file);
    });
    const variantsPayload = variants.map((v) => ({
      id: v.id,
      title: v.title,
      price: v.price,
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
      original_price: v.depreciation.originalPrice,
      usage_period: v.depreciation.usagePeriod,
      usage_unit: v.depreciation.usageUnit,
      depreciation_rate: v.depreciation.depreciationRate,
      purchase_date: v.depreciation.purchaseDate
        ? v.depreciation.purchaseDate.toISOString()
        : null,
      attributes: v.attributes || {},
    }));
    formData.append("variants", JSON.stringify(variantsPayload));
    variants.forEach((v) => {
      if (v.image) formData.append(`variant_image_${v.id}`, v.image);
      if (v.proofImage) formData.append(`proof_image_${v.id}`, v.proofImage);
    });
    if (selectedShop) formData.append("shop", selectedShop.id);
    fetcher.submit(formData, {
      method: "post",
      encType: "multipart/form-data",
    });
  };

  useEffect(() => {
    if (fetcher && fetcher.data) {
      if (fetcher.data.errors) {
        setApiResponseError(
          typeof fetcher.data.errors === "string"
            ? fetcher.data.errors
            : JSON.stringify(fetcher.data.errors),
        );
      } else if (fetcher.data.error) {
        setApiResponseError(fetcher.data.error);
      } else if (fetcher.data.success) {
        setApiResponseError(null);
        setApiResponseMessage(fetcher.data.message || "Product created");
      }
    }
  }, [fetcher.data]);

  useEffect(() => {
    if (predictionResult && predictionResult.predicted_category) {
      const predictedName =
        predictionResult.predicted_category.category_name || "";
      if (!selectedCategoryName?.trim() || selectedCategoryName === "others") {
        setSelectedCategoryName(predictedName);
      }
    }
  }, [predictionResult, selectedCategoryName]);

  const formatPrice = (price: number | ""): string => {
    if (typeof price === "number") return price.toFixed(2);
    return "0.00";
  };

  // Condition badge component
  const ConditionBadge = ({ value }: { value: ConditionValue }) => {
    const condition = CONDITION_SCALE[value];
    return (
      <Badge className={`${condition.color} border flex items-center gap-1`}>
        <span className="text-yellow-500">{condition.icon}</span>
        <span>{condition.label}</span>
      </Badge>
    );
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center space-x-2 mb-6">
        <Badge className="px-3 py-1 bg-orange-500 text-white">
          1. Basic Info
        </Badge>
        <div className="h-0.5 w-8 bg-gray-300"></div>
        <Badge
          variant={mainMedia.length > 0 ? "default" : "outline"}
          className={`px-3 py-1 ${mainMedia.length > 0 ? "bg-orange-500 text-white" : "border-gray-300 text-gray-600"}`}
        >
          2. Media
        </Badge>
        <div className="h-0.5 w-8 bg-gray-300"></div>
        <Badge className="px-3 py-1 bg-orange-500 text-white">
          3. Variants
        </Badge>
        <div className="h-0.5 w-8 bg-gray-300"></div>
        <Badge
          variant={
            variants.every((v) => v.price && v.quantity) ? "default" : "outline"
          }
          className={`px-3 py-1 ${variants.every((v) => v.price && v.quantity) ? "bg-orange-500 text-white" : "border-gray-300 text-gray-600"}`}
        >
          4. Details
        </Badge>
      </div>

      {/* STEP 1: Basic Information */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100">
            <Sparkles className="h-4 w-4 text-orange-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              Basic Information
            </h2>
            <p className="text-sm text-gray-500">
              Start with product details. AI will suggest a category when you
              upload images.
            </p>
          </div>
        </div>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label
                htmlFor="name"
                className="flex items-center gap-1 text-gray-700"
              >
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
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="condition"
                className="flex items-center gap-1 text-gray-700"
              >
                Condition Rating *
              </Label>
              <Select
                name="condition"
                required
                value={productCondition ? productCondition.toString() : ""}
                onValueChange={(value) =>
                  setProductCondition(parseInt(value) as ConditionValue)
                }
              >
                <SelectTrigger className="border-gray-300 focus:border-orange-500 focus:ring-orange-500">
                  <SelectValue placeholder="Select condition rating">
                    {productCondition && (
                      <div className="flex items-center gap-2">
                        <span className="text-yellow-500">
                          {CONDITION_SCALE[productCondition].icon}
                        </span>
                        <span>{CONDITION_SCALE[productCondition].label}</span>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CONDITION_SCALE).map(
                    ([value, { label, icon }]) => (
                      <SelectItem
                        key={value}
                        value={value}
                        className="flex items-center gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-yellow-500">{icon}</span>
                          <span>{label}</span>
                        </div>
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
              {errors.condition && (
                <p className="text-sm text-red-600">{errors.condition}</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="description"
              className="flex items-center gap-1 text-gray-700"
            >
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
            {errors.description && (
              <p className="text-sm text-red-600">{errors.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* STEP 2: Product Media & Category */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100">
              <Camera className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">
                Product Photos
              </h2>
              <p className="text-sm text-gray-500">
                Take photos with your camera (max 9). First photo is the cover.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="border-gray-300 text-gray-600">
            {mainMedia.length}/9
          </Badge>
        </div>
        <div className="space-y-6">
          {/* Camera Capture Area */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-orange-400 transition-colors">
            <div className="text-center">
              <Camera className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <div className="text-xs text-gray-500 mb-4">
                Take photos of your product (max 9 photos)
              </div>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => cameraInputRef.current?.click()}
                className="border-gray-300 text-gray-700 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300"
              >
                <Camera className="h-4 w-4 mr-2" />
                Open Camera
              </Button>
              <Input
                ref={cameraInputRef}
                type="file"
                id="camera-capture"
                accept="image/*"
                capture="environment"
                onChange={handleCameraCapture}
                className="hidden"
              />
            </div>
          </div>

          {/* Media Preview Grid */}
          {mainMedia.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {mainMedia.map((item, index) => (
                <div
                  key={index}
                  className="relative group aspect-square border border-gray-200 rounded-lg overflow-hidden"
                >
                  <img
                    src={item.preview}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
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
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50 transition-colors p-4 cursor-pointer"
                >
                  <Camera className="h-6 w-6 mb-2" />
                  <span className="text-xs text-center">Take Another</span>
                </button>
              )}
            </div>
          )}

          {/* AI Analysis Section */}
          <Collapsible className="border border-gray-200 rounded-lg">
            <CollapsibleTrigger className="flex w-full items-center justify-between p-4 hover:bg-orange-50 transition-colors">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-orange-600" />
                <span className="font-medium text-gray-700">
                  AI Category Prediction
                </span>
                {predictionResult && (
                  <Badge
                    variant="outline"
                    className="ml-2 bg-orange-100 text-orange-700 border-orange-300"
                  >
                    Ready
                  </Badge>
                )}
              </div>
              {predictionResult ? (
                <ChevronUp className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Analyze photos to get AI category suggestions
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => analyzeImages(mainMedia.map((m) => m.file))}
                    disabled={mainMedia.length === 0 || isPredicting}
                    className="border-gray-300 text-gray-700 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300"
                  >
                    {isPredicting && (
                      <Loader2 className="h-3 w-3 animate-spin mr-2 text-orange-600" />
                    )}
                    {isPredicting ? "Analyzing..." : "Analyze Photos"}
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-gray-700">
                    Category
                  </Label>
                  <Select
                    value={selectedCategoryName}
                    onValueChange={handleCategoryChange}
                  >
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
                  {selectedCategoryName &&
                    (!modelClasses ||
                      !modelClasses.includes(selectedCategoryName)) && (
                      <p className="text-xs text-gray-600">
                        Selected: {selectedCategoryName}
                      </p>
                    )}
                  {predictionResult && !predictionError && (
                    <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-md">
                      <div className="font-medium text-sm text-orange-800 mb-1">
                        AI Suggestion
                      </div>
                      <div className="text-sm text-orange-700">
                        <span className="font-medium">
                          {predictionResult.predicted_category?.category_name}
                        </span>
                        <span className="ml-2 text-orange-600">
                          (
                          {Math.round(
                            (predictionResult.predicted_category?.confidence ||
                              0) * 100,
                          )}
                          % confidence)
                        </span>
                      </div>
                      {predictionResult.alternative_categories &&
                        predictionResult.alternative_categories.length > 0 && (
                          <div className="text-xs text-orange-600 mt-1">
                            Also considered:{" "}
                            {predictionResult.alternative_categories
                              .map((a) => a.category_name)
                              .join(", ")}
                          </div>
                        )}
                    </div>
                  )}
                  {predictionError && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                      <div className="text-sm text-red-700">
                        {predictionError}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>

      {/* STEP 3: Variants */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100">
              <Package className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">
                Product Variants
              </h2>
              <p className="text-sm text-gray-500">
                Each product must have at least one variant with price and stock
              </p>
            </div>
          </div>
          <Badge className="bg-orange-100 text-orange-800 border-orange-300">
            Required
          </Badge>
        </div>
        <div className="space-y-6">
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
                    <span className="font-medium text-gray-800">
                      Variant {index + 1}
                    </span>
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

              {/* Variant Image */}
              <div className="mb-5">
                <Label className="text-xs font-medium text-gray-700 mb-2 block">
                  Variant Image
                </Label>
                <div className="flex items-center gap-4">
                  <div
                    className={`relative w-24 h-24 border-2 rounded-lg overflow-hidden transition-all ${variant.imagePreview ? "border-orange-400 shadow-sm" : "border-dashed border-gray-300 hover:border-orange-400 bg-gray-50"}`}
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
                            updateVariantField(variant.id, "image", null);
                            updateVariantField(
                              variant.id,
                              "imagePreview",
                              undefined,
                            );
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center w-full h-full">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => openVariantCamera(variant.id)}
                          className="flex flex-col items-center justify-center w-full h-full hover:bg-orange-100 transition-colors"
                        >
                          <Camera className="h-6 w-6 text-gray-400 mb-1" />
                          <span className="text-[10px] text-gray-500">
                            Add Photo
                          </span>
                        </Button>
                        <Input
                          ref={(el) => {
                            if (el)
                              variantImageInputRefs.current[variant.id] = el;
                          }}
                          id={`variant-image-${variant.id}`}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) =>
                            handleVariantImageChange(variant.id, e)
                          }
                          className="hidden"
                        />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    Main product image for this variant
                  </p>
                </div>
              </div>

              {/* Main Variant Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                    Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    value={variant.title}
                    onChange={(e) =>
                      updateVariantField(variant.id, "title", e.target.value)
                    }
                    placeholder="e.g., Small, Red, etc."
                    className="h-9 text-sm border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                    Final Price <span className="text-red-500">*</span>
                    {variant.depreciation.calculatedPrice && (
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-orange-100 text-orange-700 border-orange-300"
                      >
                        Auto
                      </Badge>
                    )}
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                      ₱
                    </span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={variant.price}
                      disabled
                      placeholder={
                        variant.depreciation.calculatedPrice
                          ? "Auto-calculated"
                          : "Fill fields"
                      }
                      className={`h-9 text-sm pl-8 bg-gray-50 cursor-not-allowed border-gray-300 ${variant.depreciation.calculatedPrice ? "text-orange-600 font-medium" : "text-gray-400"}`}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                    Stock <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    value={variant.quantity}
                    onChange={(e) =>
                      updateVariantField(
                        variant.id,
                        "quantity",
                        parseInt(e.target.value) || "",
                      )
                    }
                    placeholder="0"
                    className="h-9 text-sm border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                    required
                  />
                </div>
              </div>

              {/* Depreciation Section */}
              <div className="mb-4 p-4 bg-orange-50 rounded-lg border border-orange-200 grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="gap-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Calculator className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-800">
                      Price Depreciation Calculator
                    </span>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-orange-700">
                      Original Price
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">
                        ₱
                      </span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={variant.depreciation.originalPrice || ""}
                        onChange={(e) =>
                          handleDepreciationChange(
                            variant.id,
                            "originalPrice",
                            parseFloat(e.target.value) || "",
                          )
                        }
                        placeholder="Original price"
                        className="h-8 text-xs pl-8 border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                      />
                    </div>
                  </div>

                  {/* Purchase Date Calendar Picker */}
                  <div className="space-y-1 my-2">
                    <Label className="text-xs font-medium text-orange-700">
                      Purchase Date
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full h-8 text-xs justify-start text-left font-normal border-gray-300",
                            !variant.depreciation.purchaseDate &&
                              "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-3 w-3" />
                          {variant.depreciation.purchaseDate ? (
                            format(variant.depreciation.purchaseDate, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={
                            variant.depreciation.purchaseDate || undefined
                          }
                          onSelect={(date) =>
                            handlePurchaseDateChange(variant.id, date)
                          }
                          initialFocus
                          disabled={(date) => date > new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  {/* Depreciation Rate with Slider */}
                  <div className="space-y-4 bg-orange-50/50 p-4 rounded-lg border border-orange-200 h-fit">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Percent className="h-4 w-4 text-orange-600" />
                        <Label className="text-sm font-medium text-orange-800">
                          Annual Depreciation Rate
                        </Label>
                      </div>
                      <Badge
                        variant="outline"
                        className="bg-white text-orange-700 border-orange-300 font-semibold text-base px-3 py-1"
                      >
                        {variant.depreciation.depreciationRate || 0}%
                      </Badge>
                    </div>

                    <div className="pt-2 pb-1">
                      <Slider
                        value={[variant.depreciation.depreciationRate || 0]}
                        onValueChange={(value) =>
                          handleDepreciationRateChange(variant.id, value)
                        }
                        max={100}
                        step={0.5}
                        className="w-full [&_[role=slider]]:bg-orange-600 [&_[role=slider]]:border-orange-600 [&_.relative]:bg-orange-200"
                      />
                    </div>

                    <div className="flex justify-between text-xs font-medium text-gray-600 px-1">
                      <span className="flex flex-col items-center">
                        <span className="text-gray-400">|</span>
                        <span>0%</span>
                      </span>
                      <span className="flex flex-col items-center">
                        <span className="text-gray-400">|</span>
                        <span>25%</span>
                      </span>
                      <span className="flex flex-col items-center">
                        <span className="text-gray-400">|</span>
                        <span>50%</span>
                      </span>
                      <span className="flex flex-col items-center">
                        <span className="text-gray-400">|</span>
                        <span>75%</span>
                      </span>
                      <span className="flex flex-col items-center">
                        <span className="text-gray-400">|</span>
                        <span>100%</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-5 shadow-md flex flex-col h-full min-h-[180px] border">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-white/90" />
                    <Label className="text-xs font-medium text-white/80 uppercase tracking-wider">
                      Calculated Price
                    </Label>
                  </div>

                  <div className="flex-1 flex flex-col justify-center">
                    {variant.depreciation.calculatedPrice ? (
                      <div className="space-y-2">
                        <div className="text-4xl font-bold text-white tracking-tight">
                          ₱
                          {Number(
                            variant.depreciation.calculatedPrice,
                          ).toLocaleString("en-PH", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-white/70 bg-white/10 p-2 rounded-md">
                          <CalendarIcon className="h-3 w-3" />
                          <span>
                            Based on {variant.depreciation.usagePeriod}{" "}
                            {variant.depreciation.usageUnit} of use
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="text-3xl font-light text-white/50">
                          —
                        </div>
                        <div className="flex items-center gap-2 text-xs bg-white/10 px-3 py-2 rounded-full text-white/80">
                          <Info className="h-3 w-3" />
                          <span>Fill in original price & purchase date</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Toggles */}
              <div className="flex items-center gap-6 mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3">
                  <Switch
                    id={`active-${variant.id}`}
                    checked={variant.is_active !== false}
                    onCheckedChange={(checked) =>
                      updateVariantField(variant.id, "is_active", checked)
                    }
                    className="data-[state=checked]:bg-orange-500"
                  />
                  <Label
                    htmlFor={`active-${variant.id}`}
                    className="text-sm text-gray-700 cursor-pointer"
                  >
                    Active
                  </Label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    id={`refundable-${variant.id}`}
                    checked={variant.refundable !== false}
                    onCheckedChange={(checked) =>
                      updateVariantField(variant.id, "refundable", checked)
                    }
                    className="data-[state=checked]:bg-orange-500"
                  />
                  <Label
                    htmlFor={`refundable-${variant.id}`}
                    className="text-sm text-gray-700 cursor-pointer"
                  >
                    Refundable
                  </Label>
                </div>
              </div>

              {/* Additional Details - Always Visible */}
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium text-gray-700">
                    Additional Details
                  </span>
                </div>

                {/* Weight and Stock Alert - First Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Weight */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-gray-700 block">
                      Weight
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={variant.weight || ""}
                        onChange={(e) =>
                          updateVariantField(
                            variant.id,
                            "weight",
                            parseFloat(e.target.value) || "",
                          )
                        }
                        placeholder="0.00"
                        className="h-8 text-xs flex-1 border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                      />
                      <Select
                        value={variant.weight_unit || "g"}
                        onValueChange={(value: "g" | "kg" | "lb" | "oz") =>
                          updateVariantField(variant.id, "weight_unit", value)
                        }
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

                  {/* Low Stock Alert */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-gray-700 block">
                      Low Stock Alert
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      value={variant.critical_trigger || ""}
                      onChange={(e) =>
                        updateVariantField(
                          variant.id,
                          "critical_trigger",
                          parseInt(e.target.value) || "",
                        )
                      }
                      placeholder="Alert when stock below"
                      className="h-8 text-xs border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                    />
                  </div>
                </div>

                {/* Proof Image - Second Row */}
                <div>
                  <Label className="text-xs font-medium text-gray-700 mb-2 block flex items-center gap-1">
                    <Shield className="h-3 w-3 text-orange-600" />
                    Proof Image
                  </Label>
                  <div className="flex items-center gap-4">
                    <div
                      className={`relative w-24 h-24 border-2 rounded-lg overflow-hidden transition-all ${variant.proofImagePreview ? "border-green-400 shadow-sm" : "border-dashed border-gray-300 hover:border-orange-400 bg-gray-50"}`}
                    >
                      {variant.proofImagePreview ? (
                        <>
                          <img
                            src={variant.proofImagePreview}
                            alt="Proof"
                            className="w-full h-full object-cover"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-1 right-1 h-5 w-5 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600"
                            onClick={() => {
                              URL.revokeObjectURL(variant.proofImagePreview!);
                              updateVariantField(
                                variant.id,
                                "proofImage",
                                null,
                              );
                              updateVariantField(
                                variant.id,
                                "proofImagePreview",
                                undefined,
                              );
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center w-full h-full">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => openProofCamera(variant.id)}
                            className="flex flex-col items-center justify-center w-full h-full hover:bg-orange-100 transition-colors"
                          >
                            <Camera className="h-6 w-6 text-gray-400 mb-1" />
                            <span className="text-[10px] text-gray-500">
                              Add Proof
                            </span>
                          </Button>
                          <Input
                            ref={(el) => {
                              if (el)
                                proofImageInputRefs.current[variant.id] = el;
                            }}
                            id={`proof-image-${variant.id}`}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={(e) =>
                              handleVariantProofImageChange(variant.id, e)
                            }
                            className="hidden"
                          />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      Upload proof of authenticity or condition (receipt,
                      certificate, etc.)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <Button
            type="button"
            onClick={addVariant}
            variant="outline"
            className="w-full py-6 border-2 border-dashed border-gray-300 hover:border-orange-500 hover:bg-orange-50 text-gray-700 hover:text-orange-600 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Another Variant
          </Button>

          <div className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-200">
            <span>Total Variants: {variants.length}</span>
            <span>
              Total Stock:{" "}
              {variants.reduce((sum, v) => sum + (Number(v.quantity) || 0), 0)}{" "}
              units
            </span>
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="sticky bottom-6 bg-white border border-gray-200 rounded-lg shadow-lg p-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="font-medium text-gray-800">
              Ready to create your product?
            </div>
            <div className="text-sm text-gray-600">
              {selectedShop
                ? `Creating product for: ${selectedShop.name}`
                : "Please create a shop first"}
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
              disabled={
                !selectedShop ||
                fetcher.state === "submitting" ||
                variants.length === 0 ||
                variants.some((v) => !v.depreciation.calculatedPrice) ||
                !productCondition
              }
              className="min-w-[140px] bg-orange-500 hover:bg-orange-600 text-white disabled:bg-orange-300"
              size="lg"
            >
              {fetcher.state === "submitting" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                "Create Product"
              )}
            </Button>
          </div>
        </div>
        {apiResponseError && (
          <Alert
            variant="destructive"
            className="mt-4 border-red-200 bg-red-50"
          >
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">
              {apiResponseError}
            </AlertDescription>
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
