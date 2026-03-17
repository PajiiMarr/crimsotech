import type { Route } from "./+types/view_product"
import { UserProvider } from '~/components/providers/user-role-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '~/components/ui/carousel';
import { Separator } from '~/components/ui/separator';
import { 
  Store, 
  User, 
  Package, 
  AlertCircle,
  Star,
  MapPin,
  Trash2,
  Heart,
  Shield,
  Eye,
  Ban,
  XCircle,
  Archive,
  Send,
  Undo,
  CheckCircle,
  ChevronLeft,
  MoreVertical,
  Calendar,
  Tag,
  Box,
  Layers,
  TrendingUp,
  Image as ImageIcon,
  Scale,
  RefreshCw,
  Clock,
  Hash,
  DollarSign,
  Edit,
  Plus
} from 'lucide-react';
import AxiosInstance from "~/components/axios/Axios";
import { useState, useEffect } from 'react';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "~/components/ui/drawer";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useIsMobile } from "~/hooks/use-mobile";
import { useToast } from "~/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "~/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { Link, useParams } from "react-router";
// ── NEW: import the edit dialog ──────────────────────────────────────────────
import { EditProductDialog } from "~/components/seller/edit-product";

export function meta(): Route.MetaDescriptors {
    return [{ title: "View Product | Seller" }]
}

interface ProductData {
  id: string;
  name: string;
  description: string;
  quantity: number;
  used_for: string;
  price_range: { min: string; max: string; };
  upload_status: string;
  status: string;
  condition: string;
  is_refundable: boolean;
  refund_days: number;
  created_at: string;
  updated_at: string;
  is_removed: boolean;
  removal_reason: string | null;
  removed_at: string | null;
  active_report_count: number;
  favorites_count: number;
  average_rating: number;
  total_reviews: number;
  shop: {
    id: string; name: string; shop_picture: string | null; verified: boolean;
    city: string; barangay: string; street: string; contact_number: string;
    total_sales: string; created_at: string; is_suspended: boolean;
  } | null;
  customer: {
    id: string; username: string | null; email: string | null;
    first_name: string; last_name: string; contact_number: string;
    product_limit: number; current_product_count: number;
  } | null;
  category: { id: string; name: string; } | null;
  category_admin: { id: string; name: string; } | null;
  media: Array<{ id: string; file_data: string | null; file_type: string; }>;
  variants: Array<{
    id: string; title: string; sku_code: string | null; price: string | null;
    compare_price: string | null; quantity: number; weight: string | null;
    weight_unit: string; critical_trigger: number | null; is_active: boolean;
    is_refundable: boolean; refund_days: number; allow_swap: boolean; swap_type: string;
    original_price: string | null; usage_period: number | null; usage_unit: string | null;
    depreciation_rate: number | null; minimum_additional_payment: string;
    maximum_additional_payment: string; swap_description: string | null;
    critical_stock: number | null; image: string | null; option_title: string | null;
    option_ids: Array<any>; option_map: any;
    options: Array<{ id: string; name: string; value: string; title: string; }>;
    created_at: string | null; updated_at: string | null;
  }>;
  reviews: Array<{
    id: string; rating: number; comment: string | null;
    customer: { id: string | null; username: string | null; first_name: string | null; last_name: string | null; } | null;
    created_at: string; updated_at: string | null;
  }>;
  boost: {
    id: string; status: string;
    plan: { id: string; name: string; price: string; duration: number; time_unit: string; } | null;
    start_date: string | null; end_date: string | null; created_at: string | null;
  } | null;
  pending_boost: { id: string; created_at: string | null; } | null;
  issues: Array<{ id: string; description: string; }>;
  variant_stats: {
    total_variants: number; active_variants: number; total_stock: number;
    min_price: string | null; max_price: string | null;
    low_stock_variants: number; out_of_stock_variants: number;
  };
  reports: {
    active: number; resolved: number; total: number;
    active_reports: Array<{ id: string; reason: string; description: string; status: string; created_at: string; reporter: string | null; }>;
  };
}

interface LoaderData {
    user: any;
    product?: ProductData | null;
    error?: string;
}

interface CarouselImage {
  id: string; src: string; type: 'product' | 'variant'; variantTitle: string | null;
}

export async function loader({ request, context, params }: Route.LoaderArgs): Promise<LoaderData> {
    const { registrationMiddleware } = await import("~/middleware/registration.server");
    await registrationMiddleware({ request, context, params: {}, unstable_pattern: undefined } as any);
    const { requireRole } = await import("~/middleware/role-require.server");
    const { fetchUserRole } = await import("~/middleware/role.server");
    let user = (context as any).user;
    if (!user) user = await fetchUserRole({ request, context });
    await requireRole(request, context, ["isCustomer"]);
    const productId = params.productId;
    if (!productId) return { user, error: "No product ID provided" };
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(productId)) return { user, error: "Invalid product ID" };
    try {
        const { getSession } = await import('~/sessions.server');
        const session = await getSession(request.headers.get("Cookie"));
        const userId = session.get("userId");
        const response = await AxiosInstance.get(`/seller-products/${productId}/get_product/?user_id=${userId}`);
        return { user, product: response.data.product || response.data };
    } catch (error: any) {
        return { user, error: error.response?.data?.error || "Failed to load product data" };
    }
}

const actionConfigs = {
  edit: {
    title: "Edit Product", description: "Edit your product details.",
    confirmText: "Go to Edit", variant: "default" as const, icon: Edit,
    needsReason: false, needsSuspensionDays: false,
  },
  archive: {
    title: "Archive Product", description: "This will archive the product. It can be restored later if needed.",
    confirmText: "Archive", variant: "outline" as const, icon: Archive,
    needsReason: false, needsSuspensionDays: false,
  },
  restore: {
    title: "Restore Product", description: "This will restore the product to its previous state.",
    confirmText: "Restore", variant: "outline" as const, icon: Undo,
    needsReason: false, needsSuspensionDays: false,
  },
  remove: {
    title: "Remove Product", description: "This will remove the product from the platform. This action can be reversed.",
    confirmText: "Remove", variant: "destructive" as const, icon: XCircle,
    needsReason: true, needsSuspensionDays: false,
  },
  restoreRemoved: {
    title: "Restore Product", description: "This will restore the removed product and make it available again.",
    confirmText: "Restore", variant: "default" as const, icon: CheckCircle,
    needsReason: false, needsSuspensionDays: false,
  },
  deleteDraft: {
    title: "Delete Draft", description: "Are you sure you want to delete this draft product? This action cannot be undone.",
    confirmText: "Delete", variant: "destructive" as const, icon: Trash2,
    needsReason: false, needsSuspensionDays: false,
  },
};

export default function ViewProduct({ loaderData }: { loaderData: LoaderData }) {
    const { user } = loaderData;
    const params = useParams();
    const productId = params.product_id;

    const [product, setProduct] = useState<ProductData | null>(loaderData.product || null);
    const [error, setError] = useState<string | undefined>(loaderData.error);
    const [loading, setLoading] = useState(false);
    const [activeAction, setActiveAction] = useState<string | null>(null);
    const [showDialog, setShowDialog] = useState(false);
    const [reason, setReason] = useState("");
    const [processing, setProcessing] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
    // ── NEW: edit dialog state ───────────────────────────────────────────────
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [carouselKey, setCarouselKey] = useState(0);
    const [imageCacheBust, setImageCacheBust] = useState<number>(0);

    const isMobile = useIsMobile();
    const { toast } = useToast();

    const fetchProductData = async () => {
        if (!productId) return;
        setLoading(true);
        try {
            const response = await AxiosInstance.get(
                `/seller-products/${productId}/get_product/?user_id=${user.user_id}`
            );
            setProduct(response.data.product || response.data);
            setError(undefined);
        } catch (error: any) {
            setError(error.response?.data?.error || "Failed to load product data");
        } finally {
            setLoading(false);
        }
    };

    const handleSuccessfulAction = async () => {
        if (activeAction === 'deleteDraft') {
            setTimeout(() => { window.location.href = '/seller/products'; }, 100);
            return;
        }
        await fetchProductData();
    };

    const handleProductEdited = (updated: Partial<ProductData>) => {
        setProduct(prev => prev ? { ...prev, ...updated } : prev);
        if (!productId) return;
        AxiosInstance.get(
            `/seller-products/${productId}/get_product/?user_id=${user.user_id}`
        ).then((response) => {
            const fresh: ProductData = response.data.product || response.data;
            setProduct(fresh);
            setCarouselKey(k => k + 1);
            setImageCacheBust(Date.now()); // ← bust browser image cache
        }).catch(() => {});
    };

    const averageRating = product?.average_rating ||
        (product?.reviews && product.reviews.length > 0
            ? product.reviews.reduce((acc, r) => acc + r.rating, 0) / product.reviews.length
            : 0);

    const getAvailableActions = () => {
        if (!product) return [];
        const actions = [];
        actions.push({ id: "edit", label: "Edit Product", icon: Edit, variant: "default" as const });
        if (product.upload_status === 'draft') {
            actions.push({ id: "deleteDraft", label: "Delete Draft", icon: Trash2, variant: "destructive" as const });
        } else if (product.upload_status === 'published') {
            actions.push({ id: "archive", label: "Archive", icon: Archive, variant: "outline" as const });
        } else if (product.upload_status === 'archived') {
            actions.push({ id: "restore", label: "Restore", icon: Undo, variant: "outline" as const });
        }
        if (product.is_removed) {
            actions.push({ id: "restoreRemoved", label: "Restore Removed Product", icon: CheckCircle, variant: "default" as const });
        } else {
            actions.push({ id: "remove", label: "Remove Product", icon: XCircle, variant: "destructive" as const });
        }
        return actions;
    };

    const availableActions = getAvailableActions();
    const currentAction = activeAction ? actionConfigs[activeAction as keyof typeof actionConfigs] : null;

    const handleActionClick = (actionId: string) => {
        // ── CHANGED: intercept "edit" → open EditProductDialog instead ────────
        if (actionId === 'edit') {
            setEditDialogOpen(true);
            return;
        }
        setActiveAction(actionId);
        setReason("");
        setShowDialog(true);
    };

    const handleConfirm = async () => {
        if (!activeAction || !product) return;
        if (activeAction === 'addVariant') {
            window.location.href = `/seller/products/${product.id}/variants/add`;
            return;
        }
        if (activeAction === 'remove' && !reason.trim()) {
            toast({ title: "Validation Error", description: "Please provide a reason for removing the product", variant: "destructive" });
            return;
        }
        setProcessing(true);
        try {
            const requestData: any = { product_id: product.id, action_type: activeAction, user_id: user.user_id };
            if (reason.trim()) requestData.reason = reason;
            const response = await AxiosInstance.put('/seller-products/update_product_status/', requestData);
            toast({ title: "Success", description: response.data.message, variant: "success" });
            await handleSuccessfulAction();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.response?.data?.error || error.response?.data?.detail || "Failed to complete action. Please try again.",
                variant: "destructive",
            });
        } finally {
            setProcessing(false);
            setShowDialog(false);
            setActiveAction(null);
            setReason("");
        }
    };

    const handleCancel = () => {
        if (processing) return;
        setShowDialog(false);
        setActiveAction(null);
        setReason("");
    };

    const getUploadStatusBadge = (status: string) => {
        const statusConfig: Record<string, { variant: "default" | "secondary" | "outline" | "destructive", label: string }> = {
            draft: { variant: "secondary", label: "Draft" },
            published: { variant: "default", label: "Published" },
            archived: { variant: "outline", label: "Archived" }
        };
        const config = statusConfig[status] || statusConfig.draft;
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    const getConditionBadge = (condition: string) => {
        const conditionMap: Record<string, { variant: "default" | "secondary" | "outline", color: string }> = {
            'Like New': { variant: "default", color: "bg-green-500" },
            'New': { variant: "default", color: "bg-blue-500" },
            'Refurbished': { variant: "secondary", color: "" },
            'Used - Excellent': { variant: "secondary", color: "" },
            'Used - Good': { variant: "outline", color: "" },
        };
        const config = conditionMap[condition] || { variant: "outline", color: "" };
        return <Badge variant={config.variant} className={config.color}>{condition}</Badge>;
    };

    const renderDialogContent = () => {
        if (!currentAction || !product) return null;
        return (
            <div className="space-y-4">
                <div>
                    <h3 className="text-lg font-semibold">{currentAction.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{currentAction.description}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-sm font-medium">Product: {product.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        Current Status: {product.upload_status} • {product.status} • {product.is_removed ? 'Removed' : 'Active'}
                    </p>
                </div>
                {activeAction === 'remove' && (
                    <div className="space-y-2">
                        <Label htmlFor="reason" className="text-sm font-medium">
                            Reason for Removal <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Please provide a reason for removing this product..."
                            className="h-10"
                            required
                        />
                        <p className="text-xs text-muted-foreground">This reason will be recorded.</p>
                    </div>
                )}
                {currentAction.variant === "destructive" && (
                    <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
                        <p className="text-sm font-medium text-destructive flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            Warning: This action cannot be undone
                        </p>
                    </div>
                )}
            </div>
        );
    };

    const renderDesktopDialog = () => {
        if (!currentAction || !product) return null;
        return (
            <AlertDialog open={showDialog} onOpenChange={!processing ? setShowDialog : undefined}>
                <AlertDialogContent className="sm:max-w-[500px] max-w-[95vw]">
                    {renderDialogContent()}
                    <AlertDialogFooter className="mt-6 sm:flex-row flex-col gap-2">
                        <AlertDialogCancel onClick={handleCancel} disabled={processing} className="mt-0 sm:w-auto w-full order-2 sm:order-1">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirm}
                            className={`sm:w-auto w-full order-1 sm:order-2 ${currentAction.variant === "destructive" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}`}
                            disabled={processing || (activeAction === 'remove' && !reason.trim())}
                        >
                            {processing
                                ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />Processing...</>
                                : currentAction.confirmText}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        );
    };

    const renderMobileDialog = () => {
        if (!currentAction || !product) return null;
        return (
            <Drawer open={showDialog} onOpenChange={!processing ? setShowDialog : undefined}>
                <DrawerContent>
                    <DrawerHeader className="text-left">
                        <DrawerTitle>{currentAction.title}</DrawerTitle>
                        <DrawerDescription>{currentAction.description}</DrawerDescription>
                    </DrawerHeader>
                    <div className="px-4 pb-4">{renderDialogContent()}</div>
                    <DrawerFooter className="pt-2 flex-col sm:flex-row gap-2">
                        <Button
                            onClick={handleConfirm}
                            className={`sm:w-auto w-full ${currentAction.variant === "destructive" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}`}
                            disabled={processing || (activeAction === 'remove' && !reason.trim())}
                        >
                            {processing
                                ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />Processing...</>
                                : currentAction.confirmText}
                        </Button>
                        <DrawerClose asChild className="sm:w-auto w-full">
                            <Button variant="outline" onClick={handleCancel} disabled={processing}>Cancel</Button>
                        </DrawerClose>
                    </DrawerFooter>
                </DrawerContent>
            </Drawer>
        );
    };

    const getAllCarouselImages = (): CarouselImage[] => {
        if (!product) return [];
        const images: CarouselImage[] = [];
        const imageSet = new Set<string>();
        if (product.media?.length > 0) {
            product.media.forEach(media => {
                if (media.file_data) {
                    imageSet.add(media.file_data);
                    images.push({ id: media.id, src: media.file_data, type: 'product', variantTitle: null });
                }
            });
        }
        if (product.variants?.length > 0) {
            product.variants.forEach(variant => {
                if (variant.image && !imageSet.has(variant.image)) {
                    imageSet.add(variant.image);
                    images.push({ id: `variant-${variant.id}`, src: variant.image, type: 'variant', variantTitle: variant.title });
                }
            });
        }
        return images;
    };

    const priceDisplay = () => {
        if (!product) return "Price not available";
        if (selectedVariant && product.variants) {
            const variant = product.variants.find(v => v.id === selectedVariant);
            if (variant?.price) return `₱${parseFloat(variant.price).toLocaleString()}`;
        }
        if (product.price_range?.min && product.price_range?.max) {
            if (product.price_range.min === product.price_range.max)
                return `₱${parseFloat(product.price_range.min).toLocaleString()}`;
            return `₱${parseFloat(product.price_range.min).toLocaleString()} - ₱${parseFloat(product.price_range.max).toLocaleString()}`;
        }
        return "Price not available";
    };

    const handleVariantClick = (variantId: string) => {
        setSelectedVariant(variantId === selectedVariant ? null : variantId);
    };

    const carouselImages = product ? getAllCarouselImages() : [];

    if (loading && !product) {
        return (
            <UserProvider user={user}>
                <div className="container mx-auto p-4 sm:p-6">
                    <Card>
                        <CardContent className="p-8 sm:p-12 text-center">
                            <div className="flex flex-col items-center gap-4">
                                <div className="h-8 w-8 sm:h-10 sm:w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                                <p className="text-sm sm:text-base text-muted-foreground">Loading product data...</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </UserProvider>
        );
    }

    if (error) {
        return (
            <UserProvider user={user}>
                <div className="container mx-auto p-4 sm:p-6">
                    <Card>
                        <CardContent className="p-4 sm:p-6 text-center">
                            <AlertCircle className="w-8 h-8 sm:w-12 sm:h-12 text-red-500 mx-auto mb-3 sm:mb-4" />
                            <h2 className="text-lg sm:text-xl font-semibold mb-2">Error Loading Product</h2>
                            <p className="text-muted-foreground text-sm sm:text-base">{error}</p>
                            <Button variant="outline" className="mt-4" onClick={fetchProductData}>Try Again</Button>
                        </CardContent>
                    </Card>
                </div>
            </UserProvider>
        );
    }

    if (!product) {
        return (
            <UserProvider user={user}>
                <div className="container mx-auto p-4 sm:p-6">
                    <Card>
                        <CardContent className="p-4 sm:p-6 text-center">
                            <Package className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                            <h2 className="text-lg sm:text-xl font-semibold mb-2">Product Not Found</h2>
                            <p className="text-muted-foreground text-sm sm:text-base">The requested product could not be found.</p>
                            <Button variant="outline" className="mt-4" onClick={() => window.location.href = '/seller/products'}>Back to Products</Button>
                        </CardContent>
                    </Card>
                </div>
            </UserProvider>
        );
    }

    const allVariants = product.variants || [];

    return (
        <UserProvider user={user}>
            <TooltipProvider>
                <div className="container mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
                    {loading && (
                        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
                            <div className="flex flex-col items-center gap-2 bg-white p-6 rounded-lg shadow-lg">
                                <div className="h-6 w-6 sm:h-8 sm:w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                                <p className="text-xs sm:text-sm text-muted-foreground">Updating product data...</p>
                            </div>
                        </div>
                    )}

                    {product.is_removed && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="flex items-center gap-3">
                                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                                <div className="flex-1">
                                    <h3 className="font-medium text-red-800">This product has been removed</h3>
                                    <div className="text-sm text-red-700 mt-1 space-y-1">
                                        <p><strong>Removal Reason:</strong> {product.removal_reason || "No reason provided"}</p>
                                        <p><strong>Removed At:</strong> {product.removed_at ? new Date(product.removed_at).toLocaleString() : "Unknown date"}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <nav className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1 flex-wrap">
                            <a href="/seller" className="hover:text-primary hover:underline flex items-center gap-1">
                                <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span className="hidden xs:inline">Dashboard</span>
                            </a>
                            <span>&gt;</span>
                            <Link to="/seller/seller-product-list" className="hover:text-primary hover:underline">Products</Link>
                            <span>&gt;</span>
                            <span className="text-foreground font-medium truncate max-w-[120px] xs:max-w-[180px] sm:max-w-[250px]">
                                {product.name}
                            </span>
                        </nav>

                        {availableActions.length > 0 && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="ml-auto">
                                        <MoreVertical className="w-4 h-4 mr-2" />
                                        Manage Product
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                    {availableActions.map((action, index) => {
                                        const isDestructive = action.variant === "destructive";
                                        const prevAction = availableActions[index - 1];
                                        const needsSeparator = isDestructive && prevAction && prevAction.variant !== "destructive";
                                        return (
                                            <div key={action.id}>
                                                {needsSeparator && <DropdownMenuSeparator />}
                                                <DropdownMenuItem
                                                    onClick={() => handleActionClick(action.id)}
                                                    className={`flex items-center gap-2 cursor-pointer ${isDestructive ? "text-destructive focus:text-destructive" : ""}`}
                                                >
                                                    <action.icon className="w-4 h-4" />
                                                    {action.label}
                                                </DropdownMenuItem>
                                            </div>
                                        );
                                    })}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>

                    {/* ── rest of the layout is unchanged ─────────────────────────────────── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
                        <div className="lg:h-[800px]">
                            <Card key={carouselKey} className="h-full">
                                <CardContent className="p-3 sm:p-4 h-full">
                                    {carouselImages.length > 0 ? (
                                        <div className="h-full flex flex-col">
                                            <Carousel className="w-full flex-1">
                                                <CarouselContent className="h-full">
                                                    {carouselImages.map((image) => (
                                                        <CarouselItem key={image.id} className="h-full">
                                                            <div className="h-full flex items-center justify-center relative">
                                                                <div className="aspect-square w-full rounded-lg overflow-hidden cursor-pointer" onClick={() => setSelectedImage(image.src)}>
                                                                    <img
                                                                        src={`${image.src}${image.src.includes('?') ? '&' : '?'}t=${imageCacheBust}`}
                                                                        alt={image.type === 'variant' ? image.variantTitle || 'Variant image' : product.name}
                                                                        className="w-full h-full object-cover"
                                                                        loading="lazy"
                                                                    />
                                                                </div>
                                                                {image.type === 'variant' && (
                                                                    <div className="absolute top-2 left-2">
                                                                        <Badge variant="secondary" className="bg-blue-500 text-white">
                                                                            {image.variantTitle || 'Variant'}
                                                                        </Badge>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </CarouselItem>
                                                    ))}
                                                </CarouselContent>
                                                {carouselImages.length > 1 && (
                                                    <>
                                                        <CarouselPrevious className="hidden sm:flex -left-3" />
                                                        <CarouselNext className="hidden sm:flex -right-3" />
                                                    </>
                                                )}
                                            </Carousel>
                                            <div className="flex justify-center items-center gap-2 mt-3">
                                                <div className="flex gap-1">
                                                    {carouselImages.map((_, index) => (
                                                        <div key={index} className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                                                    ))}
                                                </div>
                                                <span className="text-xs text-muted-foreground">
                                                    {carouselImages.length} {carouselImages.length === 1 ? 'image' : 'images'}
                                                    {carouselImages.some(img => img.type === 'variant') && ' (includes variants)'}
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="h-full flex items-center justify-center">
                                            <div className="aspect-square w-full rounded-lg bg-muted flex flex-col items-center justify-center gap-2">
                                                <ImageIcon className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground" />
                                                <p className="text-sm text-muted-foreground">No images available</p>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        <div className="lg:h-[800px]">
                            <Card className="h-full flex flex-col">
                                <CardContent className="p-3 sm:p-4 flex-1 flex flex-col min-h-0">
                                    <div className="flex-shrink-0">
                                        <div className="flex flex-col xs:flex-row xs:items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight break-words">{product.name}</h1>
                                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                                    {getUploadStatusBadge(product.upload_status)}
                                                    {getConditionBadge(product.condition)}
                                                    {product.category && <Badge variant="outline" className="bg-blue-50">{product.category.name}</Badge>}
                                                    {product.is_removed && <Badge variant="destructive" className="animate-pulse"><XCircle className="w-3 h-3 mr-1" />Removed</Badge>}
                                                    {product.status === 'Suspended' && <Badge variant="destructive"><Ban className="w-3 h-3 mr-1" />Suspended</Badge>}
                                                </div>
                                            </div>
                                            <div className="text-left xs:text-right">
                                                <div className="text-xl sm:text-2xl font-bold text-primary">
                                                    {priceDisplay()}
                                                    {selectedVariant && <Badge variant="outline" className="ml-2 text-xs align-middle">Selected Variant</Badge>}
                                                </div>
                                                <div className="flex items-center gap-1 mt-1 xs:justify-end">
                                                    <Heart className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" />
                                                    <span className="text-xs sm:text-sm text-muted-foreground">{product.favorites_count || 0} favorites</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 sm:gap-4 mt-3 flex-wrap">
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center gap-1">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <Star key={star} className={`w-3 h-3 sm:w-4 sm:h-4 ${star <= Math.round(averageRating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                                                    ))}
                                                </div>
                                                <span className="text-xs sm:text-sm text-muted-foreground">
                                                    {averageRating.toFixed(1)} • ({product.total_reviews || product.reviews?.length || 0} reviews)
                                                </span>
                                            </div>
                                            {product.is_refundable && (
                                                <Badge variant="secondary" className="bg-green-100 text-green-800">
                                                    <RefreshCw className="w-3 h-3 mr-1" />
                                                    Refundable ({product.refund_days} days)
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    <Separator className="my-4" />

                                    <div className="flex-1 overflow-y-auto min-h-0 pr-2 space-y-4">
                                        <div className="grid grid-cols-2 gap-3">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div className="flex flex-col items-center p-3 border rounded-lg bg-muted/20 cursor-help">
                                                        <Box className="w-5 h-5 text-muted-foreground mb-2" />
                                                        <span className="text-xs text-muted-foreground mb-1">Total Stock</span>
                                                        <span className="font-semibold text-base">{product.variant_stats?.total_stock || product.quantity || 0} units</span>
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent><p>Total quantity across all variants</p></TooltipContent>
                                            </Tooltip>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div className="flex flex-col items-center p-3 border rounded-lg bg-muted/20 cursor-help">
                                                        <Layers className="w-5 h-5 text-muted-foreground mb-2" />
                                                        <span className="text-xs text-muted-foreground mb-1">Variants</span>
                                                        <span className="font-semibold text-base">{product.variant_stats?.total_variants || allVariants.length}</span>
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>Total variants: {product.variant_stats?.total_variants || 0}</p>
                                                    <p>Active variants: {product.variant_stats?.active_variants || 0}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                            <div className="flex flex-col items-center p-3 border rounded-lg bg-muted/20">
                                                <Calendar className="w-5 h-5 text-muted-foreground mb-2" />
                                                <span className="text-xs text-muted-foreground mb-1">Created</span>
                                                <span className="font-semibold text-xs text-center">{new Date(product.created_at).toLocaleDateString()}</span>
                                            </div>
                                            <div className="flex flex-col items-center p-3 border rounded-lg bg-muted/20">
                                                <TrendingUp className="w-5 h-5 text-muted-foreground mb-2" />
                                                <span className="text-xs text-muted-foreground mb-1">Updated</span>
                                                <span className="font-semibold text-xs text-center">{new Date(product.updated_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>

                                        {(product.variant_stats?.low_stock_variants || 0) > 0 && (
                                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                                <div className="flex items-center gap-2">
                                                    <AlertCircle className="w-4 h-4 text-yellow-600" />
                                                    <span className="text-sm text-yellow-800">
                                                        {product.variant_stats.low_stock_variants} variant(s) have low stock (less than 5 units)
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                        {(product.variant_stats?.out_of_stock_variants || 0) > 0 && (
                                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                                <div className="flex items-center gap-2">
                                                    <XCircle className="w-4 h-4 text-red-600" />
                                                    <span className="text-sm text-red-800">
                                                        {product.variant_stats.out_of_stock_variants} variant(s) are out of stock
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        <Separator />

                                        <div>
                                            <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
                                                <Package className="w-4 h-4" />Description
                                            </h3>
                                            <div className="bg-muted/10 p-4 rounded-lg">
                                                <p className="text-sm leading-relaxed whitespace-pre-line">{product.description}</p>
                                            </div>
                                        </div>

                                        {allVariants.length > 0 && (
                                            <>
                                                <Separator />
                                                <div>
                                                    <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
                                                        <Layers className="w-4 h-4" />Product Variants ({allVariants.length})
                                                    </h3>
                                                    <div className="space-y-3">
                                                        {allVariants.map((variant) => {
                                                            const isOutOfStock = variant.quantity === 0;
                                                            const isLowStock = variant.quantity > 0 && variant.quantity < 5;
                                                            const isSelected = selectedVariant === variant.id;
                                                            return (
                                                                <div
                                                                    key={variant.id}
                                                                    className={`border rounded-lg p-3 transition-all cursor-pointer ${isOutOfStock ? 'bg-muted/30 border-muted opacity-60' : isLowStock ? 'border-yellow-200 bg-yellow-50/30' : 'hover:border-primary/50'} ${isSelected ? 'border-primary ring-1 ring-primary bg-primary/5' : ''}`}
                                                                    onClick={() => handleVariantClick(variant.id)}
                                                                >
                                                                    <div className="flex flex-col sm:flex-row gap-3">
                                                                        {variant.image && (
                                                                            <div className="sm:w-24 sm:h-24 w-full h-32 flex-shrink-0">
                                                                                <img
                                                                                    src={`${variant.image}${variant.image!.includes('?') ? '&' : '?'}t=${imageCacheBust}`}
                                                                                    alt={variant.title}
                                                                                    className="w-full h-full object-cover rounded-md"
                                                                                    onError={(e) => { (e.target as HTMLImageElement).src = '/api/placeholder/200/200'; }}
                                                                                />
                                                                            </div>
                                                                        )}
                                                                        <div className="flex-1 space-y-2">
                                                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                                                <div>
                                                                                    <h4 className="font-medium text-sm">{variant.title}</h4>
                                                                                    {variant.sku_code && (
                                                                                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Hash className="w-3 h-3" />SKU: {variant.sku_code}</p>
                                                                                    )}
                                                                                </div>
                                                                                <Badge variant={isOutOfStock ? "outline" : isLowStock ? "destructive" : "default"} className="shrink-0">
                                                                                    {isOutOfStock ? "Out of stock" : `${variant.quantity} in stock`}
                                                                                </Badge>
                                                                            </div>
                                                                            {variant.options?.length > 0 && (
                                                                                <div className="flex flex-wrap gap-2">
                                                                                    {variant.options.map((opt, idx) => (
                                                                                        <Badge key={idx} variant="outline" className="bg-gray-50">{opt.name}: {opt.value}</Badge>
                                                                                    ))}
                                                                                </div>
                                                                            )}
                                                                            <div className="flex items-center gap-3">
                                                                                <span className="text-base font-semibold text-primary">₱{parseFloat(variant.price || "0").toLocaleString()}</span>
                                                                                {variant.compare_price && parseFloat(variant.compare_price) > 0 && (
                                                                                    <>
                                                                                        <span className="text-sm text-muted-foreground line-through">₱{parseFloat(variant.compare_price).toLocaleString()}</span>
                                                                                        <Badge variant="secondary" className="bg-green-100">Save {Math.round((1 - parseFloat(variant.price || "0") / parseFloat(variant.compare_price)) * 100)}%</Badge>
                                                                                    </>
                                                                                )}
                                                                            </div>
                                                                            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                                                                                {variant.weight && <span className="flex items-center gap-1"><Scale className="w-3 h-3" />{variant.weight} {variant.weight_unit}</span>}
                                                                                {variant.usage_period && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Used: {variant.usage_period} {variant.usage_unit}</span>}
                                                                                {variant.allow_swap && <Badge variant="outline" className="text-xs">Swap available ({variant.swap_type})</Badge>}
                                                                                {variant.is_refundable && <Badge variant="outline" className="text-xs text-green-600">Refundable ({variant.refund_days} days)</Badge>}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    <Accordion type="single" collapsible className="w-full" defaultValue="product-details">
                        <AccordionItem value="product-details">
                            <AccordionTrigger className="text-base sm:text-lg font-semibold hover:no-underline">
                                <div className="flex items-center gap-2"><Package className="w-4 h-4 sm:w-5 sm:h-5" />Product Details & Information</div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 p-4 sm:p-6">
                                        <div><p className="text-xs sm:text-sm text-muted-foreground">Total Stock</p><p className="font-medium text-sm sm:text-base">{product.variant_stats?.total_stock || product.quantity || 0} units</p></div>
                                        <div><p className="text-xs sm:text-sm text-muted-foreground">Category</p><p className="font-medium text-sm sm:text-base">{product.category?.name || "No Category"}</p></div>
                                        {product.category_admin && <div><p className="text-xs sm:text-sm text-muted-foreground">Admin Category</p><p className="font-medium text-sm sm:text-base">{product.category_admin.name}</p></div>}
                                        <div><p className="text-xs sm:text-sm text-muted-foreground">Condition</p><p className="font-medium text-sm sm:text-base">{product.condition}</p></div>
                                        <div><p className="text-xs sm:text-sm text-muted-foreground">Created</p><p className="font-medium text-xs sm:text-sm">{new Date(product.created_at).toLocaleDateString()}</p></div>
                                        <div><p className="text-xs sm:text-sm text-muted-foreground">Last Updated</p><p className="font-medium text-xs sm:text-sm">{new Date(product.updated_at).toLocaleDateString()}</p></div>
                                        <div><p className="text-xs sm:text-sm text-muted-foreground">Refund Policy</p><p className="font-medium text-sm sm:text-base">{product.is_refundable ? `Refundable (${product.refund_days} days)` : "Non-refundable"}</p></div>
                                        {product.is_removed && (
                                            <>
                                                <div><p className="text-xs sm:text-sm text-muted-foreground">Removal Status</p><p className="font-medium text-sm sm:text-base text-red-600">Removed</p></div>
                                                <div><p className="text-xs sm:text-sm text-muted-foreground">Removed At</p><p className="font-medium text-xs sm:text-sm">{product.removed_at ? new Date(product.removed_at).toLocaleString() : "Unknown"}</p></div>
                                                {product.removal_reason && <div className="col-span-3"><p className="text-xs sm:text-sm text-muted-foreground">Removal Reason</p><p className="font-medium text-sm sm:text-base">{product.removal_reason}</p></div>}
                                            </>
                                        )}
                                    </div>
                                    {product.description && (
                                        <div className="p-4 sm:p-6 pt-0">
                                            <p className="text-xs sm:text-sm text-muted-foreground mb-2">Full Description</p>
                                            <p className="text-sm break-words whitespace-pre-line">{product.description}</p>
                                        </div>
                                    )}
                                </div>
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="reviews-ratings">
                            <AccordionTrigger className="text-base sm:text-lg font-semibold hover:no-underline">
                                <div className="flex items-center gap-2">
                                    <Star className="w-4 h-4 sm:w-5 sm:h-5" />
                                    Reviews & Ratings
                                    <Badge variant="outline" className="ml-2">{product.total_reviews || product.reviews?.length || 0}</Badge>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="p-4 sm:p-6">
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
                                        <div className="flex flex-col items-center">
                                            <div className="text-2xl sm:text-3xl font-bold">{averageRating.toFixed(1)}</div>
                                            <div className="flex items-center gap-1 mt-1">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <Star key={star} className={`w-3 h-3 sm:w-4 sm:h-4 ${star <= Math.round(averageRating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                                                ))}
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-1">{product.total_reviews || product.reviews?.length || 0} reviews</div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
                                            <div>
                                                <div className="font-medium">{product.favorites_count || 0}</div>
                                                <div className="text-xs text-muted-foreground">favorites</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        {product.reviews?.length > 0 ? product.reviews.map((review) => (
                                            <div key={review.id} className="border rounded-lg p-4">
                                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                                                    <div className="flex items-center gap-1">
                                                        {[1, 2, 3, 4, 5].map((star) => (
                                                            <Star key={star} className={`w-3 h-3 ${star <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                                                        ))}
                                                    </div>
                                                    <span className="text-xs sm:text-sm font-medium">{review.customer?.username || review.customer?.first_name || "Anonymous"}</span>
                                                    <span className="text-xs text-muted-foreground">{new Date(review.created_at).toLocaleDateString()}</span>
                                                </div>
                                                <p className="text-xs sm:text-sm">{review.comment || "No comment provided"}</p>
                                            </div>
                                        )) : (
                                            <p className="text-center text-muted-foreground py-6 sm:py-8 text-sm sm:text-base">No reviews yet for this product.</p>
                                        )}
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="shop-information">
                            <AccordionTrigger className="text-base sm:text-lg font-semibold hover:no-underline">
                                <div className="flex items-center gap-2"><Store className="w-4 h-4 sm:w-5 sm:h-5" />Shop Information</div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="p-4 sm:p-6">
                                    {product.shop ? (
                                        <>
                                            <div className="flex items-center gap-3 mb-4">
                                                {product.shop.shop_picture ? (
                                                    <img src={product.shop.shop_picture} alt={product.shop.name} className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover" />
                                                ) : (
                                                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-muted rounded-lg flex items-center justify-center">
                                                        <Store className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <h3 className="font-semibold text-sm sm:text-base break-words">{product.shop.name}</h3>
                                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                                        <Badge variant={product.shop.verified ? "default" : "secondary"} className="w-fit">{product.shop.verified ? "Verified" : "Unverified"}</Badge>
                                                        {product.shop.is_suspended && <Badge variant="destructive" className="w-fit">Suspended</Badge>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4">
                                                <div><p className="text-xs sm:text-sm text-muted-foreground">Contact Number</p><p className="font-medium text-sm sm:text-base">{product.shop.contact_number || "Not provided"}</p></div>
                                                <div><p className="text-xs sm:text-sm text-muted-foreground">Total Sales</p><p className="font-medium text-sm sm:text-base">₱{parseFloat(product.shop.total_sales || "0").toLocaleString()}</p></div>
                                                <div><p className="text-xs sm:text-sm text-muted-foreground">Location</p><p className="font-medium text-sm sm:text-base">{product.shop.street}, {product.shop.barangay}, {product.shop.city}</p></div>
                                                <div><p className="text-xs sm:text-sm text-muted-foreground">Member Since</p><p className="font-medium text-xs sm:text-sm">{new Date(product.shop.created_at).toLocaleDateString()}</p></div>
                                            </div>
                                        </>
                                    ) : (
                                        <p className="text-center text-muted-foreground py-6 sm:py-8 text-sm sm:text-base">No shop information available.</p>
                                    )}
                                </div>
                            </AccordionContent>
                        </AccordionItem>

                        {product.boost && (
                            <AccordionItem value="boost-info">
                                <AccordionTrigger className="text-base sm:text-lg font-semibold hover:no-underline">
                                    <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />Boost Information</div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="p-4 sm:p-6">
                                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                            <div className="flex items-center gap-2 mb-3">
                                                <Badge variant="default" className="bg-purple-600">{product.boost.status}</Badge>
                                                {product.boost.plan && <Badge variant="outline" className="bg-white">{product.boost.plan.name}</Badge>}
                                            </div>
                                            {product.boost.plan && (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <div><p className="text-xs text-muted-foreground">Plan Price</p><p className="font-medium">₱{parseFloat(product.boost.plan.price).toLocaleString()}</p></div>
                                                    <div><p className="text-xs text-muted-foreground">Duration</p><p className="font-medium">{product.boost.plan.duration} {product.boost.plan.time_unit}</p></div>
                                                    <div><p className="text-xs text-muted-foreground">Start Date</p><p className="font-medium text-sm">{product.boost.start_date ? new Date(product.boost.start_date).toLocaleDateString() : "N/A"}</p></div>
                                                    <div><p className="text-xs text-muted-foreground">End Date</p><p className="font-medium text-sm">{product.boost.end_date ? new Date(product.boost.end_date).toLocaleDateString() : "N/A"}</p></div>
                                                </div>
                                            )}
                                        </div>
                                        {product.pending_boost && (
                                            <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                                <p className="text-sm text-yellow-800">Pending boost request submitted on {new Date(product.pending_boost.created_at || "").toLocaleDateString()}</p>
                                            </div>
                                        )}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        )}
                    </Accordion>

                    {/* Full-screen image lightbox */}
                    {selectedImage && (
                        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
                            <div className="relative max-w-4xl max-h-[90vh]">
                                <img src={selectedImage} alt="Product" className="w-full h-full object-contain" />
                                <Button variant="outline" size="icon" className="absolute top-2 right-2 bg-white" onClick={() => setSelectedImage(null)}>
                                    <XCircle className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {isMobile ? renderMobileDialog() : renderDesktopDialog()}
                    <EditProductDialog
                        open={editDialogOpen}
                        onOpenChange={setEditDialogOpen}
                        product={product as any}
                        userId={user.user_id ?? ''}
                        onSuccess={handleProductEdited as any}
                    />
                </div>
            </TooltipProvider>
        </UserProvider>
    );
}