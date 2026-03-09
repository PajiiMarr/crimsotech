import { useState, useEffect, useRef } from "react";
import { useIsMobile } from "~/hooks/use-mobile";
import { useToast } from "~/hooks/use-toast";
import AxiosInstance from "~/components/axios/Axios";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "~/components/ui/drawer";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Badge } from "~/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import {
  Loader2,
  Save,
  X,
  Package,
  Tag,
  RefreshCw,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Calculator,
  ImagePlus,
  ImageIcon,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Category {
  id: string;
  name: string;
}
interface MediaItem {
  id: string;
  file_data: string | null;
  file_type: string;
}
interface Variant {
  id: string;
  title: string;
  option_title?: string | null;
  option_ids?: any;
  option_map?: any;
  sku_code?: string | null;
  price?: number | null;
  compare_price?: number | null;
  quantity: number;
  weight?: number | null;
  weight_unit: string;
  critical_trigger?: number | null;
  is_active: boolean;
  is_refundable: boolean;
  refund_days: number;
  allow_swap: boolean;
  swap_type: string;
  original_price?: number | null;
  usage_period?: number | null;
  usage_unit?: string | null;
  depreciation_rate?: number | null;
  minimum_additional_payment: number;
  maximum_additional_payment: number;
  swap_description?: string | null;
  image?: string | null;
  critical_stock?: number | null;
  created_at: string;
  updated_at: string;
}
interface Product {
  id: string;
  name: string;
  description: string;
  condition: string;
  upload_status: string;
  status: string;
  is_refundable: boolean;
  refund_days: number;
  category_admin: Category | null;
  category: Category | null;
  total_stock: number;
  starting_price: string | null;
  variants?: Variant[];
  media?: MediaItem[];
}
interface EditProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  userId: string;
  onSuccess: (updatedProduct: Partial<Product>) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const CONDITION_OPTIONS = [
  "New",
  "Like New",
  "Refurbished",
  "Used - Excellent",
  "Used - Good",
] as const;
const USAGE_UNIT_OPTIONS = [
  { value: "weeks", label: "Weeks" },
  { value: "months", label: "Months" },
  { value: "years", label: "Years" },
] as const;
const WEIGHT_UNIT_OPTIONS = [
  { value: "g", label: "Grams (g)" },
  { value: "kg", label: "Kilograms (kg)" },
  { value: "lb", label: "Pounds (lb)" },
  { value: "oz", label: "Ounces (oz)" },
] as const;

// ─── Form State ───────────────────────────────────────────────────────────────
interface FormState {
  name: string;
  description: string;
  condition: string;
  upload_status: string;
  is_refundable: boolean;
  refund_days: number;
  category_admin_id: string;
}
interface VariantFormState {
  id?: string;
  title: string;
  sku_code: string;
  quantity: string;
  weight: string;
  weight_unit: string;
  critical_trigger: string;
  is_active: boolean;
  is_refundable: boolean;
  refund_days: string;
  allow_swap: boolean;
  swap_type: string;
  original_price: string;
  usage_period: string;
  usage_unit: string;
  depreciation_rate: string;
  minimum_additional_payment: string;
  maximum_additional_payment: string;
  swap_description: string;
  critical_stock: string;
  calculated_price?: string;
  isNew?: boolean;
  // image fields
  image?: string | null;           // existing image URL from server
  imagePending?: File | null;      // new file to upload
  imagePreview?: string | null;    // object URL for preview
  imageToDelete?: boolean;         // flag to remove existing
}
interface MediaFormState {
  existing: MediaItem[];
  toDelete: string[];
  pending: { preview: string; file: File }[];
}

function buildInitialForm(product: Product | null): FormState {
  return {
    name: product?.name ?? "",
    description: product?.description ?? "",
    condition: product?.condition ?? "New",
    upload_status: product?.upload_status ?? "draft",
    is_refundable: product?.is_refundable ?? false,
    refund_days: product?.refund_days ?? 0,
    category_admin_id: product?.category_admin?.id ?? "",
  };
}
function createEmptyVariant(): VariantFormState {
  return {
    title: "",
    sku_code: "",
    quantity: "0",
    weight: "",
    weight_unit: "g",
    critical_trigger: "",
    is_active: true,
    is_refundable: false,
    refund_days: "0",
    allow_swap: false,
    swap_type: "direct_swap",
    original_price: "",
    usage_period: "",
    usage_unit: "months",
    depreciation_rate: "10",
    minimum_additional_payment: "0",
    maximum_additional_payment: "0",
    swap_description: "",
    critical_stock: "",
    isNew: true,
    image: null,
    imagePending: null,
    imagePreview: null,
    imageToDelete: false,
  };
}
function variantToFormState(variant: Variant): VariantFormState {
  let calculated_price = "";
  if (variant.original_price && variant.usage_period && variant.depreciation_rate) {
    const originalPrice = Number(variant.original_price);
    const usagePeriod = Number(variant.usage_period);
    const usageUnit = variant.usage_unit || "months";
    const depreciationRate = Number(variant.depreciation_rate);
    let years = usagePeriod;
    if (usageUnit === "months") years = usagePeriod / 12;
    else if (usageUnit === "weeks") years = usagePeriod / 52;
    const rate = depreciationRate / 100;
    const depreciatedValue = originalPrice * Math.pow(1 - rate, years);
    calculated_price = Math.max(0, Math.round(depreciatedValue * 100) / 100).toString();
  }
  if (!calculated_price && variant.price) {
    calculated_price = Number(variant.price).toString();
  }
  return {
    id: variant.id,
    title: variant.title || "",
    sku_code: variant.sku_code || "",
    quantity: variant.quantity?.toString() || "0",
    weight: variant.weight?.toString() || "",
    weight_unit: variant.weight_unit || "g",
    critical_trigger: variant.critical_trigger?.toString() || "",
    is_active: variant.is_active,
    is_refundable: variant.is_refundable,
    refund_days: variant.refund_days?.toString() || "0",
    allow_swap: variant.allow_swap,
    swap_type: variant.swap_type || "direct_swap",
    original_price: variant.original_price?.toString() || "",
    usage_period: variant.usage_period?.toString() || "",
    usage_unit: variant.usage_unit || "months",
    depreciation_rate: variant.depreciation_rate?.toString() || "10",
    minimum_additional_payment: variant.minimum_additional_payment?.toString() || "0",
    maximum_additional_payment: variant.maximum_additional_payment?.toString() || "0",
    swap_description: variant.swap_description || "",
    critical_stock: variant.critical_stock?.toString() || "",
    calculated_price,
    isNew: false,
    image: variant.image ?? null,
    imagePending: null,
    imagePreview: null,
    imageToDelete: false,
  };
}

// ─── Inner Form ───────────────────────────────────────────────────────────────
function EditProductForm({
  product,
  userId,
  onSuccess,
  onCancel,
}: {
  product: Product;
  userId: string;
  onSuccess: (updated: Partial<Product>) => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const variantImageInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const [form, setForm] = useState<FormState>(() => buildInitialForm(product));
  const [variants, setVariants] = useState<VariantFormState[]>([]);
  const [media, setMedia] = useState<MediaFormState>({
    existing: product.media ?? [],
    toDelete: [],
    pending: [],
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingVariants, setLoadingVariants] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [expandedVariants, setExpandedVariants] = useState<Record<number, boolean>>({});

  useEffect(() => {
    setForm(buildInitialForm(product));
    setErrors({});
    setMedia({ existing: product.media ?? [], toDelete: [], pending: [] });
    loadVariants();
    loadMedia();
  }, [product.id]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await AxiosInstance.get("/seller-products/global-categories/");
        if (res.data.success) setCategories(res.data.categories ?? []);
      } catch {
        // non-critical
      } finally {
        setLoadingCategories(false);
      }
    };
    load();
  }, []);

  const loadMedia = async () => {
    try {
      const res = await AxiosInstance.get(`/seller-products/${product.id}/media/`);
      const items: MediaItem[] =
        res.data.media ?? (Array.isArray(res.data) ? res.data : []);
      setMedia((prev) => ({ ...prev, existing: items }));
    } catch {
      // fallback to prop media already set
    }
  };

  const loadVariants = async () => {
    setLoadingVariants(true);
    try {
      const res = await AxiosInstance.get(`/seller-products/${product.id}/variants/`);
      const raw: Variant[] =
        res.data.variants ?? (Array.isArray(res.data) ? res.data : []);
      if (raw.length > 0) {
        setVariants(raw.map(variantToFormState));
      } else if (product.variants && product.variants.length > 0) {
        setVariants(product.variants.map(variantToFormState));
      } else {
        setVariants([]);
      }
    } catch {
      if (product.variants && product.variants.length > 0) {
        setVariants(product.variants.map(variantToFormState));
      } else {
        setVariants([]);
      }
    } finally {
      setLoadingVariants(false);
    }
  };

  // ─── Product media helpers ────────────────────────────────────────────────
  const handleAddImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const newPending = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setMedia((prev) => ({ ...prev, pending: [...prev.pending, ...newPending] }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  const queueDeleteExisting = (id: string) => {
    setMedia((prev) => ({
      ...prev,
      existing: prev.existing.filter((m) => m.id !== id),
      toDelete: [...prev.toDelete, id],
    }));
  };
  const removePending = (index: number) => {
    setMedia((prev) => {
      URL.revokeObjectURL(prev.pending[index].preview);
      return { ...prev, pending: prev.pending.filter((_, i) => i !== index) };
    });
  };

  // ─── Variant image helpers ────────────────────────────────────────────────
  const handleVariantImageChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setVariants((prev) => {
      const updated = [...prev];
      // revoke old preview if any
      if (updated[index].imagePreview) {
        URL.revokeObjectURL(updated[index].imagePreview!);
      }
      updated[index] = {
        ...updated[index],
        imagePending: file,
        imagePreview: preview,
        imageToDelete: false,
      };
      return updated;
    });
    // reset input
    if (variantImageInputRefs.current[index]) {
      variantImageInputRefs.current[index]!.value = "";
    }
  };

  const removeVariantImage = (index: number) => {
    setVariants((prev) => {
      const updated = [...prev];
      if (updated[index].imagePreview) {
        URL.revokeObjectURL(updated[index].imagePreview!);
      }
      updated[index] = {
        ...updated[index],
        imagePending: null,
        imagePreview: null,
        image: null,
        imageToDelete: true,
      };
      return updated;
    });
  };

  const flushMedia = async () => {
    await Promise.allSettled(
      media.toDelete.map((id) =>
        AxiosInstance.delete(`/seller-products/${product.id}/media/${id}/`)
      )
    );
    await Promise.allSettled(
      media.pending.map(({ file }) => {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("product_id", product.id);
        return AxiosInstance.post(`/seller-products/${product.id}/media/`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      })
    );
  };

  // ─── Depreciation ─────────────────────────────────────────────────────────
  const calculateDepreciatedPrice = (
    originalPrice: number,
    usagePeriod: number,
    usageUnit: string,
    depreciationRate: number
  ): number => {
    if (!originalPrice || !usagePeriod || !depreciationRate) return originalPrice;
    let years = usagePeriod;
    if (usageUnit === "months") years = usagePeriod / 12;
    else if (usageUnit === "weeks") years = usagePeriod / 52;
    const rate = depreciationRate / 100;
    return Math.max(
      0,
      Math.round(originalPrice * Math.pow(1 - rate, years) * 100) / 100
    );
  };

  const updateVariantCalculatedPrice = (
    _index: number,
    v: VariantFormState
  ): VariantFormState => {
    if (v.original_price && v.usage_period && v.depreciation_rate) {
      return {
        ...v,
        calculated_price: calculateDepreciatedPrice(
          Number(v.original_price),
          Number(v.usage_period),
          v.usage_unit,
          Number(v.depreciation_rate)
        ).toString(),
      };
    }
    return { ...v, calculated_price: "" };
  };

  function validate(): boolean {
    const newErrors: typeof errors = {};

    // ── Product fields ──────────────────────────────────────────────────────
    if (!form.name.trim()) newErrors.name = "Product name is required.";
    else if (form.name.trim().length > 100) newErrors.name = "Max 100 characters.";

    if (!form.description.trim()) newErrors.description = "Description is required.";
    else if (form.description.trim().length > 1000)
      newErrors.description = "Max 1000 characters.";

    if (!form.condition) newErrors.condition = "Condition is required.";

    if (form.is_refundable && form.refund_days < 1)
      newErrors.refund_days = "Must be at least 1 day.";

    setErrors(newErrors);

    // ── Variant fields (collected separately so we can show a toast per issue) ─
    if (variants.length === 0) {
      toast({
        title: "Validation Error",
        description: "At least one variant is required.",
        variant: "destructive",
      });
      return false;
    }

    const variantIssues: string[] = [];

    variants.forEach((v, i) => {
      const label = v.title?.trim() ? `"${v.title}"` : `Variant ${i + 1}`;
      if (!v.title?.trim())
        variantIssues.push(`${label}: title is required.`);
      if (!v.quantity || Number(v.quantity) < 0)
        variantIssues.push(`${label}: quantity must be 0 or more.`);
      if (!v.original_price || Number(v.original_price) <= 0)
        variantIssues.push(`${label}: original price is required.`);
      if (!v.usage_period || Number(v.usage_period) <= 0)
        variantIssues.push(`${label}: usage period is required.`);
      if (!v.depreciation_rate || Number(v.depreciation_rate) < 0 || Number(v.depreciation_rate) > 100)
        variantIssues.push(`${label}: depreciation rate must be between 0–100.`);
      if (!v.calculated_price || Number(v.calculated_price) <= 0)
        variantIssues.push(`${label}: calculated price could not be determined.`);
      if (v.is_refundable && (!v.refund_days || Number(v.refund_days) < 1))
        variantIssues.push(`${label}: refund days must be at least 1 if refundable.`);
      if (v.allow_swap && v.swap_type === "swap_plus_payment") {
        if (Number(v.minimum_additional_payment) < 0)
          variantIssues.push(`${label}: min additional payment cannot be negative.`);
        if (Number(v.maximum_additional_payment) < Number(v.minimum_additional_payment))
          variantIssues.push(`${label}: max additional payment must be ≥ min.`);
      }
    });

    if (variantIssues.length > 0) {
      toast({
        title: `Fix ${variantIssues.length} variant issue${variantIssues.length > 1 ? "s" : ""}`,
        description: variantIssues.slice(0, 3).join(" • ") + (variantIssues.length > 3 ? ` (+${variantIssues.length - 3} more)` : ""),
        variant: "destructive",
      });
      return false;
    }

    return Object.keys(newErrors).length === 0;
  }

  // ─── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
  if (!validate()) return;  // ← validate() now covers everything

  setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        product_id: product.id,
        user_id: userId,
        name: form.name.trim(),
        description: form.description.trim(),
        condition: form.condition,
        upload_status: form.upload_status,
        is_refundable: form.is_refundable,
        refund_days: form.is_refundable ? form.refund_days : 0,
      };
      if (form.category_admin_id) payload.category_admin_id = form.category_admin_id;

      const res = await AxiosInstance.put(
        `/seller-products/${product.id}/update_product/`,
        payload
      );

      // variants bulk update
      const variantsPayload = variants.map((v) => ({
        id: v.id,
        title: v.title,
        sku_code: v.sku_code,
        price: v.calculated_price ? parseFloat(v.calculated_price) : null,
        quantity: parseInt(v.quantity) || 0,
        weight: v.weight ? parseFloat(v.weight) : null,
        weight_unit: v.weight_unit,
        critical_trigger: v.critical_trigger ? parseInt(v.critical_trigger) : null,
        is_active: v.is_active,
        is_refundable: v.is_refundable,
        refund_days: parseInt(v.refund_days) || 0,
        allow_swap: v.allow_swap,
        swap_type: v.swap_type,
        original_price: v.original_price ? parseFloat(v.original_price) : null,
        usage_period: v.usage_period ? parseFloat(v.usage_period) : null,
        usage_unit: v.usage_unit,
        depreciation_rate: v.depreciation_rate ? parseFloat(v.depreciation_rate) : null,
        minimum_additional_payment: parseFloat(v.minimum_additional_payment) || 0,
        maximum_additional_payment: parseFloat(v.maximum_additional_payment) || 0,
        swap_description: v.swap_description,
        critical_stock: v.critical_stock ? parseInt(v.critical_stock) : null,
      }));
      await AxiosInstance.put(
        `/seller-products/${product.id}/variants/bulk_update/`,
        { variants: variantsPayload }
      );

      // variant image uploads (best-effort)
      await Promise.allSettled(
        variants.map(async (v) => {
          if (!v.id) return;
          if (v.imagePending) {
            const fd = new FormData();
            fd.append("image", v.imagePending);
            await AxiosInstance.post(
              `/seller-products/${product.id}/variants/${v.id}/image/`,
              fd,
              { headers: { "Content-Type": "multipart/form-data" } }
            );
          } else if (v.imageToDelete) {
            await AxiosInstance.delete(
              `/seller-products/${product.id}/variants/${v.id}/image/`
            );
          }
        })
      );

      // product media
      await flushMedia();

      toast({ title: "Saved", description: res.data.message ?? "Product updated successfully.", variant: "success" });
      const selectedCategory = categories.find((c) => c.id === form.category_admin_id) ?? null;
      onSuccess({
        id: product.id,
        name: form.name.trim(),
        description: form.description.trim(),
        condition: form.condition,
        upload_status: form.upload_status,
        is_refundable: form.is_refundable,
        refund_days: form.is_refundable ? form.refund_days : 0,
        category_admin: selectedCategory,
      });
    } catch (err: any) {
      const msg =
        err.response?.data?.error ??
        err.response?.data?.detail ??
        "Failed to update product.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ─── Field helpers ────────────────────────────────────────────────────────
  const set =
    <K extends keyof FormState>(key: K) =>
    (value: FormState[K]) => {
      setForm((f) => ({ ...f, [key]: value }));
      if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
    };
  const fieldError = (key: keyof FormState) =>
    errors[key] ? <p className="text-xs text-destructive mt-1">{errors[key]}</p> : null;

  const addVariant = () => setVariants([...variants, createEmptyVariant()]);
  const removeVariant = (index: number) => {
    if (variants.length <= 1) {
      toast({ title: "Error", description: "Products must have at least one variant.", variant: "destructive" });
      return;
    }
    const v = variants[index];
    if (v.imagePreview) URL.revokeObjectURL(v.imagePreview);
    setVariants(variants.filter((_, i) => i !== index));
  };
  const updateVariant = (index: number, field: keyof VariantFormState, value: any) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    if (["original_price", "usage_period", "usage_unit", "depreciation_rate"].includes(field as string)) {
      updated[index] = updateVariantCalculatedPrice(index, updated[index]);
    }
    setVariants(updated);
  };
  const toggleVariantExpanded = (index: number) =>
    setExpandedVariants((prev) => ({ ...prev, [index]: !prev[index] }));
  const formatPrice = (price: string) =>
    price ? parseFloat(price).toFixed(2) : "0.00";

  const totalImageCount = media.existing.length + media.pending.length;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-0 h-full">
      <div className="flex-1 overflow-y-auto space-y-5 py-2 pr-1">

        {/* Meta pills */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="gap-1 text-xs">
            <Package className="w-3 h-3" />
            {product.total_stock} in stock
          </Badge>
          {product.starting_price && (
            <Badge variant="outline" className="gap-1 text-xs">
              <Tag className="w-3 h-3" />
              from ₱{parseFloat(product.starting_price).toLocaleString()}
            </Badge>
          )}
        </div>

        {/* ── Product Images ──────────────────────────────────────────────── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-muted-foreground" />
              Product Images
              <span className="text-xs font-normal text-muted-foreground">
                ({totalImageCount})
              </span>
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="border-orange-200 text-orange-600 hover:bg-orange-50"
            >
              <ImagePlus className="w-4 h-4 mr-1" />
              Add Images
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleAddImages}
            />
          </div>

          {totalImageCount === 0 ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed rounded-lg p-6 flex flex-col items-center gap-2 text-muted-foreground hover:border-orange-300 hover:text-orange-500 transition-colors"
            >
              <ImageIcon className="w-8 h-8" />
              <span className="text-sm">Click to add product images</span>
            </button>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {media.existing.map((m) => (
                <div
                  key={m.id}
                  className="relative group aspect-square rounded-lg overflow-hidden border bg-muted"
                >
                  {m.file_data ? (
                    <img src={m.file_data} alt="product" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => queueDeleteExisting(m.id)}
                    className="absolute top-1 right-1 bg-black/60 hover:bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {media.pending.map((p, i) => (
                <div
                  key={i}
                  className="relative group aspect-square rounded-lg overflow-hidden border-2 border-dashed border-orange-300 bg-orange-50"
                >
                  <img src={p.preview} alt="pending" className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 left-0 right-0 bg-orange-500/80 text-white text-[9px] text-center py-0.5">
                    New
                  </div>
                  <button
                    type="button"
                    onClick={() => removePending(i)}
                    className="absolute top-1 right-1 bg-black/60 hover:bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-lg border-2 border-dashed flex items-center justify-center text-muted-foreground hover:border-orange-300 hover:text-orange-500 transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Name */}
        <div className="space-y-1.5">
          <Label htmlFor="ep-name">
            Product Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="ep-name"
            value={form.name}
            onChange={(e) => set("name")(e.target.value)}
            maxLength={100}
            placeholder="Enter product name"
            className={errors.name ? "border-destructive" : ""}
          />
          <div className="flex justify-between items-start">
            {fieldError("name")}
            <span className="text-xs text-muted-foreground ml-auto">{form.name.length}/100</span>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Label htmlFor="ep-desc">
            Description <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="ep-desc"
            value={form.description}
            onChange={(e) => set("description")(e.target.value)}
            maxLength={1000}
            rows={4}
            placeholder="Describe your product…"
            className={`resize-none ${errors.description ? "border-destructive" : ""}`}
          />
          <div className="flex justify-between items-start">
            {fieldError("description")}
            <span className="text-xs text-muted-foreground ml-auto">{form.description.length}/1000</span>
          </div>
        </div>

        {/* Condition + Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Condition <span className="text-destructive">*</span></Label>
            <Select value={form.condition} onValueChange={set("condition")}>
              <SelectTrigger className={`w-full ${errors.condition ? "border-destructive" : ""}`}>
                <SelectValue placeholder="Select condition" />
              </SelectTrigger>
              <SelectContent>
                {CONDITION_OPTIONS.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldError("condition")}
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            {loadingCategories ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground h-10">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading categories…
              </div>
            ) : (
              <Select
                value={form.category_admin_id || "__none__"}
                onValueChange={(v) => set("category_admin_id")(v === "__none__" ? "" : v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="No category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No category</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* ── Variants ────────────────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Product Variants</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addVariant}
              className="border-orange-200 text-orange-600 hover:bg-orange-50"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Variant
            </Button>
          </div>

          {loadingVariants ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-orange-600" />
            </div>
          ) : variants.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed rounded-lg bg-muted/10">
              <Package className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No variants added yet</p>
              <Button type="button" variant="link" onClick={addVariant} className="text-orange-600 mt-2">
                Add your first variant
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {variants.map((variant, index) => {
                const currentImage = variant.imagePreview ?? variant.image ?? null;
                return (
                  <div key={index} className="border rounded-lg p-4 space-y-3 bg-white">
                    {/* header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {/* variant thumbnail */}
                        {currentImage ? (
                          <div className="w-8 h-8 rounded-md overflow-hidden border flex-shrink-0">
                            <img src={currentImage} alt="variant" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-md border bg-muted flex items-center justify-center flex-shrink-0">
                            <ImageIcon className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-700 font-semibold text-xs">
                          {index + 1}
                        </div>
                        <h4 className="font-medium text-sm">
                          {variant.title || `Variant ${index + 1}`}
                        </h4>
                        {variant.calculated_price && (
                          <Badge className="bg-orange-100 text-orange-700 border-orange-300 text-xs">
                            ₱{formatPrice(variant.calculated_price)}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button type="button" variant="ghost" size="sm" onClick={() => toggleVariantExpanded(index)} className="h-8 w-8 p-0">
                          {expandedVariants[index] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeVariant(index)} className="h-8 w-8 p-0 text-destructive hover:text-destructive/90">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Variant image */}
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Variant Image</Label>
                      <div className="flex items-center gap-3">
                        {currentImage ? (
                          <div className="relative group w-16 h-16 rounded-lg overflow-hidden border bg-muted flex-shrink-0">
                            <img src={currentImage} alt="variant" className="w-full h-full object-cover" />
                            {variant.imagePending && (
                              <div className="absolute bottom-0 left-0 right-0 bg-orange-500/80 text-white text-[9px] text-center py-0.5">New</div>
                            )}
                            <button
                              type="button"
                              onClick={() => removeVariantImage(index)}
                              className="absolute top-0.5 right-0.5 bg-black/60 hover:bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => variantImageInputRefs.current[index]?.click()}
                            className="w-16 h-16 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-orange-300 hover:text-orange-500 transition-colors flex-shrink-0"
                          >
                            <ImagePlus className="w-4 h-4" />
                            <span className="text-[9px]">Add</span>
                          </button>
                        )}
                        <div className="flex flex-col gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => variantImageInputRefs.current[index]?.click()}
                            className="text-xs h-7 border-orange-200 text-orange-600 hover:bg-orange-50"
                          >
                            <ImagePlus className="w-3 h-3 mr-1" />
                            {currentImage ? "Change" : "Upload"}
                          </Button>
                          {currentImage && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeVariantImage(index)}
                              className="text-xs h-7 text-destructive hover:text-destructive/90"
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Remove
                            </Button>
                          )}
                        </div>
                        <input
                          ref={(el) => { variantImageInputRefs.current[index] = el; }}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleVariantImageChange(index, e)}
                        />
                      </div>
                    </div>

                    {/* Title + Quantity + toggles */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Title *</Label>
                        <Input value={variant.title} onChange={(e) => updateVariant(index, "title", e.target.value)} placeholder="e.g., Small, Red, 1kg" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Quantity *</Label>
                        <Input type="number" min="0" value={variant.quantity} onChange={(e) => updateVariant(index, "quantity", e.target.value)} placeholder="0" />
                      </div>
                      <div className="flex items-center space-x-4 pt-6">
                        <div className="flex items-center space-x-2">
                          <Switch checked={variant.is_active} onCheckedChange={(v) => updateVariant(index, "is_active", v)} className="data-[state=checked]:bg-orange-600" />
                          <Label className="text-sm">Active</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch checked={variant.is_refundable} onCheckedChange={(v) => updateVariant(index, "is_refundable", v)} className="data-[state=checked]:bg-orange-600" />
                          <Label className="text-sm">Refundable</Label>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3" />

                    {/* Depreciation */}
                    <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="flex items-center gap-2 mb-3">
                        <Calculator className="h-4 w-4 text-orange-600" />
                        <span className="text-sm font-medium text-orange-800">Price Depreciation Calculator</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs font-medium text-orange-700">Original Price</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">₱</span>
                            <Input type="number" min="0" step="0.01" value={variant.original_price} onChange={(e) => updateVariant(index, "original_price", e.target.value)} placeholder="Original price" className="h-8 text-xs pl-8" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-medium text-orange-700">Usage Period</Label>
                          <div className="flex gap-2">
                            <Input type="number" min="0" step="0.1" value={variant.usage_period} onChange={(e) => updateVariant(index, "usage_period", e.target.value)} placeholder="Amount" className="h-8 text-xs flex-1" />
                            <Select value={variant.usage_unit} onValueChange={(v) => updateVariant(index, "usage_unit", v)}>
                              <SelectTrigger className="w-20 h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {USAGE_UNIT_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-medium text-orange-700">Rate (%)</Label>
                          <div className="relative">
                            <Input type="number" min="0" max="100" step="0.1" value={variant.depreciation_rate} onChange={(e) => updateVariant(index, "depreciation_rate", e.target.value)} placeholder="e.g., 10" className="h-8 text-xs pr-6" />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">%</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-medium text-orange-700">Calculated</Label>
                          <div className="h-8 px-3 bg-white border border-gray-300 rounded-md flex items-center">
                            {variant.calculated_price ? (
                              <span className="text-sm font-medium text-orange-600">₱{formatPrice(variant.calculated_price)}</span>
                            ) : (
                              <span className="text-xs text-gray-400">Fill fields</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Additional Details */}
                    <Collapsible open={expandedVariants[index]} onOpenChange={() => toggleVariantExpanded(index)}>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-full flex items-center justify-center gap-2 text-muted-foreground">
                          {expandedVariants[index] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          {expandedVariants[index] ? "Hide Additional Details" : "Show Additional Details"}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-3 pt-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1.5">
                            <Label>Weight</Label>
                            <Input type="number" min="0" step="0.01" value={variant.weight} onChange={(e) => updateVariant(index, "weight", e.target.value)} placeholder="0.00" />
                          </div>
                          <div className="space-y-1.5">
                            <Label>Unit</Label>
                            <Select value={variant.weight_unit} onValueChange={(v) => updateVariant(index, "weight_unit", v)}>
                              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {WEIGHT_UNIT_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1.5">
                            <Label>Critical Trigger</Label>
                            <Input type="number" min="0" value={variant.critical_trigger} onChange={(e) => updateVariant(index, "critical_trigger", e.target.value)} placeholder="Low stock alert at" />
                          </div>
                        </div>
                        <div className="space-y-2 border-t pt-2">
                          <div className="flex items-center space-x-2">
                            <Switch checked={variant.allow_swap} onCheckedChange={(v) => updateVariant(index, "allow_swap", v)} className="data-[state=checked]:bg-orange-600" />
                            <Label>Allow Swap</Label>
                          </div>
                          {variant.allow_swap && (
                            <>
                              <div className="space-y-1.5">
                                <Label>Swap Type</Label>
                                <Select value={variant.swap_type} onValueChange={(v) => updateVariant(index, "swap_type", v)}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="direct_swap">Direct swap</SelectItem>
                                    <SelectItem value="swap_plus_payment">Swap + payment</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1.5">
                                  <Label>Min Additional Payment</Label>
                                  <Input type="number" min="0" step="0.01" value={variant.minimum_additional_payment} onChange={(e) => updateVariant(index, "minimum_additional_payment", e.target.value)} placeholder="0.00" />
                                </div>
                                <div className="space-y-1.5">
                                  <Label>Max Additional Payment</Label>
                                  <Input type="number" min="0" step="0.01" value={variant.maximum_additional_payment} onChange={(e) => updateVariant(index, "maximum_additional_payment", e.target.value)} placeholder="0.00" />
                                </div>
                              </div>
                              <div className="space-y-1.5">
                                <Label>Swap Description</Label>
                                <Textarea value={variant.swap_description} onChange={(e) => updateVariant(index, "swap_description", e.target.value)} placeholder="Describe swap conditions..." rows={2} />
                              </div>
                            </>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex gap-2 pt-4 border-t mt-2 shrink-0 bg-white">
        <Button variant="outline" onClick={onCancel} disabled={saving} className="flex-1">
          <X className="w-4 h-4 mr-1.5" />
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={saving} className="flex-1 bg-orange-600 hover:bg-orange-700">
          {saving ? (
            <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Saving…</>
          ) : (
            <><Save className="w-4 h-4 mr-1.5" />Save Changes</>
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── Public Component ─────────────────────────────────────────────────────────
export function EditProductDialog({
  open,
  onOpenChange,
  product,
  userId,
  onSuccess,
}: EditProductDialogProps) {
  const isMobile = useIsMobile();
  const handleSuccess = (updated: Partial<Product>) => {
    onSuccess(updated);
    onOpenChange(false);
  };
  const handleCancel = () => onOpenChange(false);
  if (!product) return null;

  if (!isMobile) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[800px] h-[90vh] flex flex-col p-0">
          <DialogHeader className="shrink-0 px-6 pt-6 pb-2">
            <DialogTitle className="text-xl">Edit Product</DialogTitle>
            <DialogDescription className="line-clamp-1">
              Editing: <span className="font-medium text-foreground">{product.name}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 px-6 pb-0">
            <EditProductForm product={product} userId={userId} onSuccess={handleSuccess} onCancel={handleCancel} />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[92dvh] flex flex-col">
        <DrawerHeader className="text-left shrink-0 pb-2">
          <DrawerTitle className="text-lg">Edit Product</DrawerTitle>
          <DrawerDescription className="line-clamp-1">
            Editing: <span className="font-medium text-foreground">{product.name}</span>
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex-1 min-h-0 px-4">
          <EditProductForm product={product} userId={userId} onSuccess={handleSuccess} onCancel={handleCancel} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}