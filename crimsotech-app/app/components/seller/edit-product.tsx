import { useState, useEffect } from "react";
import { useIsMobile } from "~/hooks/use-mobile";
import { useToast } from "~/hooks/use-toast";
import AxiosInstance from "~/components/axios/Axios";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "~/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
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
import { Loader2, Save, X, Package, Tag, RefreshCw } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Category {
  id: string;
  name: string;
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

const UPLOAD_STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
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
  const [form, setForm] = useState<FormState>(() => buildInitialForm(product));
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  // Reset form whenever product changes
  useEffect(() => {
    setForm(buildInitialForm(product));
    setErrors({});
  }, [product.id]);

  // Fetch global categories
  useEffect(() => {
    const load = async () => {
      try {
        const res = await AxiosInstance.get("/seller-products/global-categories/");
        if (res.data.success) setCategories(res.data.categories ?? []);
      } catch {
        // non-critical — category select just stays empty
      } finally {
        setLoadingCategories(false);
      }
    };
    load();
  }, []);

  // ─── Validation ─────────────────────────────────────────────────────────────

  function validate(): boolean {
    const newErrors: typeof errors = {};
    if (!form.name.trim()) newErrors.name = "Product name is required.";
    else if (form.name.trim().length > 100) newErrors.name = "Max 100 characters.";
    if (!form.description.trim()) newErrors.description = "Description is required.";
    else if (form.description.trim().length > 1000) newErrors.description = "Max 1000 characters.";
    if (!form.condition) newErrors.condition = "Condition is required.";
    if (form.is_refundable && form.refund_days < 1)
      newErrors.refund_days = "Must be at least 1 day.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // ─── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!validate()) return;
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

      toast({
        title: "Saved",
        description: res.data.message ?? "Product updated successfully.",
        variant: "success",
      });

      const selectedCategory =
        categories.find((c) => c.id === form.category_admin_id) ?? null;

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

  // ─── Field helpers ───────────────────────────────────────────────────────────

  const set = <K extends keyof FormState>(key: K) =>
    (value: FormState[K]) => {
      setForm((f) => ({ ...f, [key]: value }));
      if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
    };

  const fieldError = (key: keyof FormState) =>
    errors[key] ? (
      <p className="text-xs text-destructive mt-1">{errors[key]}</p>
    ) : null;

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-1 space-y-5 pb-2">

        {/* Product meta pill */}
        <div className="flex flex-wrap gap-2 pt-1">
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
            <span className="text-xs text-muted-foreground ml-auto">
              {form.name.length}/100
            </span>
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
            <span className="text-xs text-muted-foreground ml-auto">
              {form.description.length}/1000
            </span>
          </div>
        </div>

        {/* Condition + Upload Status — side by side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>
              Condition <span className="text-destructive">*</span>
            </Label>
            <Select value={form.condition} onValueChange={set("condition")}>
              <SelectTrigger className={errors.condition ? "border-destructive" : ""}>
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
            <Label>Upload Status</Label>
            <Select value={form.upload_status} onValueChange={set("upload_status")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UPLOAD_STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Category */}
        <div className="space-y-1.5">
          <Label>Global Category</Label>
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
              <SelectTrigger>
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

        {/* Refund policy */}
        <div className="space-y-3 rounded-lg border p-4 bg-muted/20">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="ep-refundable" className="flex items-center gap-2 cursor-pointer">
                <RefreshCw className="w-4 h-4 text-muted-foreground" />
                Refundable
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Allow buyers to request refunds
              </p>
            </div>
            <Switch
              id="ep-refundable"
              checked={form.is_refundable}
              onCheckedChange={set("is_refundable")}
            />
          </div>

          {form.is_refundable && (
            <div className="space-y-1.5">
              <Label htmlFor="ep-refund-days">
                Refund Window (days) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ep-refund-days"
                type="number"
                min={1}
                max={365}
                value={form.refund_days}
                onChange={(e) =>
                  set("refund_days")(Math.max(0, parseInt(e.target.value, 10) || 0))
                }
                className={`w-32 ${errors.refund_days ? "border-destructive" : ""}`}
              />
              {fieldError("refund_days")}
            </div>
          )}
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex gap-2 pt-4 border-t mt-2 shrink-0">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={saving}
          className="flex-1 sm:flex-none"
        >
          <X className="w-4 h-4 mr-1.5" />
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={saving}
          className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700"
        >
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

  // ── Desktop Modal ──────────────────────────────────────────────────────────
  if (!isMobile) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-xl">Edit Product</DialogTitle>
            <DialogDescription className="line-clamp-1">
              Editing: <span className="font-medium text-foreground">{product.name}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            <EditProductForm
              product={product}
              userId={userId}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Mobile Drawer ──────────────────────────────────────────────────────────
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92dvh] flex flex-col">
        <DrawerHeader className="text-left shrink-0 pb-2">
          <DrawerTitle className="text-lg">Edit Product</DrawerTitle>
          <DrawerDescription className="line-clamp-1">
            Editing: <span className="font-medium text-foreground">{product.name}</span>
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 overflow-hidden px-4 pb-safe">
          <EditProductForm
            product={product}
            userId={userId}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}