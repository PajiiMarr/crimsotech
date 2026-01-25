import type { Route } from "./+types/view_products"
import { UserProvider } from '~/components/providers/user-role-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '~/components/ui/carousel';
import { Separator } from '~/components/ui/separator';
import { 
  Store, 
  User, 
  Package, 
  AlertCircle,
  Star,
  MapPin,
  Heart,
  Shield,
  Eye,
  Ban,
  Trash2,
  Archive,
  Send,
  Undo,
  CheckCircle,
  XCircle,
  ChevronLeft,
  Menu,
  MoreVertical
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
} from "~/components/ui/dropdown-menu";

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "View Product",
    }
  ]
}

interface ProductData {
  id: string;
  name: string;
  description: string;
  quantity: number;
  used_for: string;
  price: string;
  upload_status: string;
  status: string;
  condition: string;
  created_at: string;
  updated_at: string;
  is_removed: boolean;
  removal_reason: string | null;
  removed_at: string | null;
  active_report_count: number;
  favorites_count: number;
  shop: {
    id: string;
    name: string;
    verified: boolean;
    city: string;
    barangay: string;
    total_sales: string;
    created_at: string;
    is_suspended: boolean;
  } | null;
  customer: {
    username: string | null;
    email: string | null;
    contact_number: string;
    product_limit: number;
    current_product_count: number;
  } | null;
  category: {
    id: string;
    name: string;
  } | null;
  category_admin: {
    id: string;
    name: string;
  } | null;
  media: Array<{
    id: string;
    file_data: string | null;
    file_type: string;
  }>;
  variants: Array<{
    id: string;
    title: string;
    options: Array<{
      id: string;
      title: string;
      quantity: number;
      price: string;
    }>;
  }>;
  reviews: Array<{
    id: string;
    rating: number;
    comment: string | null;
    customer: string | null;
    created_at: string;
  }>;
  boost: {
    id: string;
    status: string;
    plan: string | null;
    end_date: string;
  } | null;
  reports: {
    active: number;
    total: number;
  };
}

interface LoaderData {
  user: any;
  product: ProductData | null;
  error?: string;
}

export async function loader({ request, context, params}: Route.LoaderArgs): Promise<LoaderData> {
  const { registrationMiddleware } = await import("~/middleware/registration.server");
  await registrationMiddleware({ request, context, params: {}, unstable_pattern: undefined } as any);
  const { requireRole } = await import("~/middleware/role-require.server");
  const { fetchUserRole } = await import("~/middleware/role.server");
  const { product_id } = params;

  let user = (context as any).user;
  if (!user) {
    user = await fetchUserRole({ request, context });
  }

  await requireRole(request, context, ["isModerator"]);

  // Get session for authentication
  const { getSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get("Cookie"));

  if (product_id && !isValidProductId(product_id)) {
    throw new Response("Not found", { status: 404 });
  }

  try {
    // Fetch product data from API
    const response = await AxiosInstance.get(`/admin-products/get_product/?product_id=${product_id}`);
    const product = response.data;

    return { user, product };
  } catch (error: any) {
    console.error('Error fetching product:', error);
    
    if (error.response?.status === 404) {
      throw new Response("Product not found", { status: 404 });
    }
    
    return { 
      user, 
      product: null, 
      error: error.response?.data?.error || "Failed to load product data" 
    };
  }
}

function isValidProductId(id: string): boolean {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidPattern.test(id);
}

// Action configurations
const actionConfigs = {
  publish: {
    title: "Publish Product",
    description: "Are you sure you want to publish this product? This will make it visible to customers.",
    confirmText: "Publish",
    variant: "default" as const,
    icon: Send,
    needsReason: false,
    needsSuspensionDays: false,
  },
  deleteDraft: {
    title: "Delete Draft",
    description: "This action cannot be undone. This will permanently delete the draft product.",
    confirmText: "Delete Draft",
    variant: "destructive" as const,
    icon: Trash2,
    needsReason: false,
    needsSuspensionDays: false,
  },
  unpublish: {
    title: "Unpublish Product",
    description: "This will unpublish the product and make it invisible to customers.",
    confirmText: "Unpublish",
    variant: "outline" as const,
    icon: Eye,
    needsReason: false,
    needsSuspensionDays: false,
  },
  archive: {
    title: "Archive Product",
    description: "This will archive the product. It can be restored later if needed.",
    confirmText: "Archive",
    variant: "outline" as const,
    icon: Archive,
    needsReason: false,
    needsSuspensionDays: false,
  },
  restore: {
    title: "Restore Product",
    description: "This will restore the product to its previous state.",
    confirmText: "Restore",
    variant: "outline" as const,
    icon: Undo,
    needsReason: false,
    needsSuspensionDays: false,
  },
  remove: {
    title: "Remove Product",
    description: "This will remove the product from the platform. This action can be reversed.",
    confirmText: "Remove",
    variant: "destructive" as const,
    icon: XCircle,
    needsReason: true,
    needsSuspensionDays: false,
  },
  restoreRemoved: {
    title: "Restore Product",
    description: "This will restore the removed product and make it available again.",
    confirmText: "Restore",
    variant: "default" as const,
    icon: CheckCircle,
    needsReason: false,
    needsSuspensionDays: false,
  },
  suspend: {
    title: "Suspend Product",
    description: "This will suspend the product temporarily. Customers won't be able to view or purchase it.",
    confirmText: "Suspend",
    variant: "outline" as const,
    icon: Ban,
    needsReason: false,
    needsSuspensionDays: true,
  },
  unsuspend: {
    title: "Unsuspend Product",
    description: "This will unsuspend the product and make it available to customers again.",
    confirmText: "Unsuspend",
    variant: "outline" as const,
    icon: CheckCircle,
    needsReason: false,
    needsSuspensionDays: false,
  },
};

export default function ViewProduct({ loaderData }: { loaderData: LoaderData }) {
  const { user, product: initialProduct, error: initialError } = loaderData;

  const baseUrl = import.meta.env.VITE_MEDIA_URL;

  console.log("Base URL:", baseUrl);
  
  // State for dynamic product data
  const [product, setProduct] = useState<ProductData | null>(initialProduct);
  const [error, setError] = useState<string | undefined>(initialError);
  const [loading, setLoading] = useState(false);
  
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [reason, setReason] = useState("");
  const [suspensionDays, setSuspensionDays] = useState(7);
  const [processing, setProcessing] = useState(false);
  const isMobile = useIsMobile();
  const { toast } = useToast();

  // Function to fetch updated product data
  const fetchProductData = async () => {
    if (!product?.id) return;
    
    setLoading(true);
    try {
      const response = await AxiosInstance.get(`/admin-products/get_product/?product_id=${product.id}`);
      setProduct(response.data);
      setError(undefined);
    } catch (error: any) {
      console.error('Error refreshing product data:', error);
      setError(error.response?.data?.error || "Failed to refresh product data");
    } finally {
      setLoading(false);
    }
  };

  // Function to handle successful action and refresh data
  const handleSuccessfulAction = async () => {
    // For deleteDraft action, redirect to products list
    if (activeAction === 'deleteDraft') {
      setTimeout(() => {
        window.location.href = '/moderator/products';
      }, 100);
      return;
    }
    
    // For other actions, fetch updated product data
    await fetchProductData();
  };

  const averageRating = product?.reviews && product.reviews.length > 0 
    ? product.reviews.reduce((acc, review) => acc + review.rating, 0) / product.reviews.length 
    : 0;

  // Determine available actions based on status and upload_status
  const getAvailableActions = () => {
    if (!product) return [];
    
    const actions = [];
    
    // Actions based on upload_status
    if (product.upload_status === 'draft') {
      actions.push(
        {
          id: "publish",
          label: "Publish Product",
          icon: Send,
          variant: "default" as const,
        },
        {
          id: "deleteDraft",
          label: "Delete Draft",
          icon: Trash2,
          variant: "destructive" as const,
        }
      );
    } else if (product.upload_status === 'published') {
      actions.push(
        {
          id: "unpublish",
          label: "Unpublish",
          icon: Eye,
          variant: "outline" as const,
        },
        {
          id: "archive",
          label: "Archive",
          icon: Archive,
          variant: "outline" as const,
        }
      );
    } else if (product.upload_status === 'archived') {
      actions.push(
        {
          id: "restore",
          label: "Restore",
          icon: Undo,
          variant: "outline" as const,
        }
      );
    }

    // Actions based on removal status
    if (product.is_removed) {
      actions.push(
        {
          id: "restoreRemoved",
          label: "Restore Product",
          icon: CheckCircle,
          variant: "default" as const,
        }
      );
    } else {
      actions.push(
        {
          id: "remove",
          label: "Remove Product",
          icon: XCircle,
          variant: "destructive" as const,
        }
      );
    }

    // Actions based on general status
    if (product.status === 'Active' && !product.is_removed) {
      actions.push(
        {
          id: "suspend",
          label: "Suspend Product",
          icon: Ban,
          variant: "outline" as const,
        }
      );
    } else if (product.status === 'Suspended') {
      actions.push(
        {
          id: "unsuspend",
          label: "Unsuspend",
          icon: CheckCircle,
          variant: "outline" as const,
        }
      );
    }

    return actions;
  };

  const availableActions = getAvailableActions();
  const currentAction = activeAction ? actionConfigs[activeAction as keyof typeof actionConfigs] : null;

  const handleActionClick = (actionId: string) => {
    setActiveAction(actionId);
    setReason("");
    setSuspensionDays(7);
    setShowDialog(true);
  };

  const handleConfirm = async () => {
    if (!activeAction || !product) return;
    
    // Validate required reason for remove action
    if (activeAction === 'remove' && !reason.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide a reason for removing the product",
        variant: "destructive",
      });
      return;
    }
    
    setProcessing(true);
    try {
      const requestData: any = {
        product_id: product.id,
        action_type: activeAction,
        user_id: user.user_id
      };
      
      // Add reason for applicable actions
      if (reason.trim()) {
        requestData.reason = reason;
      }
      
      // Add suspension days for suspend action
      if (activeAction === 'suspend') {
        requestData.suspension_days = suspensionDays;
      }
      
      const response = await AxiosInstance.put(
        '/admin-products/update_product_status/',
        requestData
      );
      
      toast({
        title: "Success",
        description: response.data.message,
        variant: "success",
      });
      
      // Handle successful action (fetch updated data)
      await handleSuccessfulAction();
      
    } catch (error: any) {
      console.error('Error executing action:', error);
      
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.detail || 
                          "Failed to complete action. Please try again.";
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
      setShowDialog(false);
      setActiveAction(null);
      setReason("");
      setSuspensionDays(7);
    }
  };

  const handleCancel = () => {
    if (processing) return;
    setShowDialog(false);
    setActiveAction(null);
    setReason("");
    setSuspensionDays(7);
  };

  const getUploadStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { variant: "secondary" as const, label: "Draft" },
      published: { variant: "default" as const, label: "Published" },
      archived: { variant: "outline" as const, label: "Archived" }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const renderDialogContent = () => {
    if (!currentAction || !product) return null;

    return (
      <>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">{currentAction.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {currentAction.description}
            </p>
          </div>
          
          {/* Product info */}
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-sm font-medium">Product: {product.name}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Current Status: {product.upload_status} • {product.status} • {product.is_removed ? 'Removed' : 'Active'}
            </p>
          </div>
          
          {/* Reason input for remove action */}
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
              <p className="text-xs text-muted-foreground">
                This reason will be recorded and may be shared with the seller.
              </p>
            </div>
          )}
          
          {/* Reason and suspension days for suspend action */}
          {activeAction === 'suspend' && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="reason-suspend" className="text-sm font-medium">
                  Reason for Suspension (Optional)
                </Label>
                <Input
                  id="reason-suspend"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Optional: Provide a reason for suspension..."
                  className="h-10"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="suspension-days" className="text-sm font-medium">
                  Suspension Duration
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="suspension-days"
                    type="number"
                    min="1"
                    max="365"
                    value={suspensionDays}
                    onChange={(e) => setSuspensionDays(Math.max(1, parseInt(e.target.value) || 7))}
                    className="h-10 w-24"
                  />
                  <span className="text-sm text-muted-foreground">days</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  The product will be automatically unsuspended after this period.
                </p>
              </div>
            </div>
          )}
          
          {/* Warning message for destructive actions */}
          {currentAction.variant === "destructive" && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
              <p className="text-sm font-medium text-destructive flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                Warning: This action cannot be undone
              </p>
            </div>
          )}
        </div>
      </>
    );
  };

  const renderDesktopDialog = () => {
    if (!currentAction || !product) return null;

    return (
      <AlertDialog open={showDialog} onOpenChange={!processing ? setShowDialog : undefined}>
        <AlertDialogContent className="sm:max-w-[500px] max-w-[95vw]">
          {renderDialogContent()}
          <AlertDialogFooter className="mt-6 sm:flex-row flex-col gap-2">
            <AlertDialogCancel 
              onClick={handleCancel}
              disabled={processing}
              className="mt-0 sm:w-auto w-full order-2 sm:order-1"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirm}
              className={
                `sm:w-auto w-full order-1 sm:order-2 ${
                  currentAction.variant === "destructive" 
                    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" 
                    : ""
                }`
              }
              disabled={processing || (activeAction === 'remove' && !reason.trim())}
            >
              {processing ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                  Processing...
                </>
              ) : (
                currentAction.confirmText
              )}
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
          <div className="px-4 pb-4">
            {renderDialogContent()}
          </div>
          <DrawerFooter className="pt-2 flex-col sm:flex-row gap-2">
            <Button 
              onClick={handleConfirm}
              className={
                `sm:w-auto w-full ${
                  currentAction.variant === "destructive" 
                    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" 
                    : ""
                }`
              }
              disabled={processing || (activeAction === 'remove' && !reason.trim())}
            >
              {processing ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                  Processing...
                </>
              ) : (
                currentAction.confirmText
              )}
            </Button>
            <DrawerClose asChild className="sm:w-auto w-full">
              <Button variant="outline" onClick={handleCancel} disabled={processing}>
                Cancel
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  };

  if (error) {
    return (
      <UserProvider user={user}>
        <div className="container mx-auto p-4 sm:p-6">
          <Card>
            <CardContent className="p-4 sm:p-6 text-center">
              <AlertCircle className="w-8 h-8 sm:w-12 sm:h-12 text-red-500 mx-auto mb-3 sm:mb-4" />
              <h2 className="text-lg sm:text-xl font-semibold mb-2">Error Loading Product</h2>
              <p className="text-muted-foreground text-sm sm:text-base">{error}</p>
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
            </CardContent>
          </Card>
        </div>
      </UserProvider>
    );
  }

  return (
    <UserProvider user={user}>
      <div className="container mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
        {/* Loading indicator */}
        {loading && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="flex flex-col items-center gap-2">
              <div className="h-6 w-6 sm:h-8 sm:w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-xs sm:text-sm text-muted-foreground">Updating product data...</p>
            </div>
          </div>
        )}

        {/* Responsive Header with Mobile Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Breadcrumb */}
          <nav className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1 flex-wrap">
            <a href="/moderator" className="hover:text-primary hover:underline flex items-center gap-1">
              <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Admin</span>
            </a>
            <span>&gt;</span>
            <a href="/moderator/products" className="hover:text-primary hover:underline">
              Products
            </a>
            <span>&gt;</span>
            <span className="text-foreground font-medium truncate max-w-[120px] xs:max-w-[180px] sm:max-w-[250px]">
              {product.name}
            </span>
          </nav>

          {/* Mobile Actions Dropdown */}
          {isMobile && availableActions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="ml-auto">
                  <Menu className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {availableActions.map((action, index) => (
                  <DropdownMenuItem
                    key={index}
                    onClick={() => handleActionClick(action.id)}
                    className={`flex items-center gap-2 ${
                      action.variant === "destructive" 
                        ? "text-destructive focus:text-destructive" 
                        : ""
                    }`}
                  >
                    <action.icon className="w-4 h-4" />
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          {/* Left Column - Images */}
          <div className="space-y-3 sm:space-y-4">
            <Card>
              <CardContent className="p-3 sm:p-4">
                {product.media.length > 0 ? (
                  <Carousel className="w-full">
                    <CarouselContent>
                      {product.media.map((media) => (
                        <CarouselItem key={media.id}>
                          <div className="aspect-square rounded-lg overflow-hidden">
                            <img
                              src={baseUrl + media.file_data || "/api/placeholder/600/400"}
                              alt={product.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    <CarouselPrevious className="hidden sm:flex -left-3" />
                    <CarouselNext className="hidden sm:flex -right-3" />
                    {/* Mobile carousel indicators */}
                    <div className="flex justify-center gap-2 mt-3 sm:hidden">
                      {product.media.map((_, index) => (
                        <div
                          key={index}
                          className="w-2 h-2 rounded-full bg-muted"
                        />
                      ))}
                    </div>
                  </Carousel>
                ) : (
                  <div className="aspect-square rounded-lg bg-muted flex items-center justify-center">
                    <Package className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground" />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Product Details */}
          <div className="space-y-4 sm:space-y-6">
            <div>
              <div className="flex flex-col xs:flex-row xs:items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight break-words">
                    {product.name}
                  </h1>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {getUploadStatusBadge(product.upload_status)}
                    <Badge variant={product.condition === "Excellent" ? "default" : "secondary"}>
                      {product.condition} Condition
                    </Badge>
                    <Badge variant="outline">
                      {product.category?.name || "No Category"}
                    </Badge>
                  </div>
                </div>
                <div className="text-left xs:text-right">
                  <div className="text-xl sm:text-2xl font-bold text-primary">
                    ₱{parseFloat(product.price).toLocaleString()}
                  </div>
                  <div className="flex items-center gap-1 mt-1 xs:justify-end">
                    <Heart className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" />
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      {product.favorites_count} favorites
                    </span>
                  </div>
                </div>
              </div>

              {/* Rating and Engagement */}
              <div className="flex items-center gap-3 sm:gap-4 mt-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-3 h-3 sm:w-4 sm:h-4 ${
                          star <= Math.round(averageRating)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    {averageRating.toFixed(1)} • ({product.reviews.length} reviews)
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Heart className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" />
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    {product.favorites_count} favorites
                  </span>
                </div>
              </div>
            </div>

            {/* Key Details */}
            <Card>
              <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Package className="w-4 h-4 sm:w-5 sm:h-5" />
                  Product Details
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 py-3 sm:px-6 sm:py-4 space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Stock Quantity</p>
                    <p className="font-medium text-sm sm:text-base">{product.quantity} units</p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Category</p>
                    <p className="font-medium text-sm sm:text-base">{product.category?.name || "No Category"}</p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Used For</p>
                    <p className="font-medium text-xs sm:text-sm break-words">{product.used_for}</p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Condition</p>
                    <p className="font-medium text-sm sm:text-base">{product.condition}</p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Created</p>
                    <p className="font-medium text-xs sm:text-sm">
                      {new Date(product.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Last Updated</p>
                    <p className="font-medium text-xs sm:text-sm">
                      {new Date(product.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Favorites Count</p>
                    <div className="flex items-center gap-1">
                      <Heart className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" />
                      <p className="font-medium text-sm sm:text-base">{product.favorites_count}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Upload Status</p>
                    <p className="font-medium text-sm sm:text-base capitalize">{product.upload_status}</p>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-2">Description</p>
                  <p className="text-xs sm:text-sm break-words">{product.description}</p>
                </div>
              </CardContent>
            </Card>

            {/* Variants */}
            {product.variants.length > 0 && (
              <Card>
                <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
                  <CardTitle className="text-base sm:text-lg">Product Variants</CardTitle>
                </CardHeader>
                <CardContent className="px-4 py-3 sm:px-6 sm:py-4 space-y-3 sm:space-y-4">
                  {product.variants.map((variant) => (
                    <div key={variant.id}>
                      <p className="font-medium text-sm sm:text-base mb-2">{variant.title}</p>
                      <div className="flex gap-2 flex-wrap">
                        {variant.options.map((option) => (
                          <Badge key={option.id} variant="outline" className="text-xs">
                            {option.title} (₱{parseFloat(option.price).toLocaleString()})
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Product Status Overview - Full Width */}
          <Card className="col-span-1 lg:col-span-2">
            <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
                Product Status Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 py-3 sm:px-6 sm:py-4">
              <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                <div className="flex flex-col items-center justify-center p-3 sm:p-4 border rounded-lg bg-muted/50">
                  <span className="text-xs sm:text-sm text-muted-foreground mb-2 text-center">Upload Status</span>
                  {getUploadStatusBadge(product.upload_status)}
                </div>
                <div className="flex flex-col items-center justify-center p-3 sm:p-4 border rounded-lg bg-muted/50">
                  <span className="text-xs sm:text-sm text-muted-foreground mb-2 text-center">Product Status</span>
                  <Badge variant={product.status === "Active" ? "default" : "secondary"}>
                    {product.status}
                  </Badge>
                </div>
                <div className="flex flex-col items-center justify-center p-3 sm:p-4 border rounded-lg bg-muted/50">
                  <span className="text-xs sm:text-sm text-muted-foreground mb-2 text-center">Boost Status</span>
                  <Badge variant={product.boost?.status === "active" ? "default" : "outline"} className="bg-purple-500">
                    {product.boost?.status === "active" ? "Boosted" : "Not Boosted"}
                  </Badge>
                </div>
                <div className="flex flex-col items-center justify-center p-3 sm:p-4 border rounded-lg bg-muted/50">
                  <span className="text-xs sm:text-sm text-muted-foreground mb-2 text-center">Removal Status</span>
                  <Badge variant={product.is_removed ? "destructive" : "outline"}>
                    {product.is_removed ? "Removed" : "Active"}
                  </Badge>
                </div>
                <div className="flex flex-col items-center justify-center p-3 sm:p-4 border rounded-lg bg-muted/50">
                  <span className="text-xs sm:text-sm text-muted-foreground mb-2 text-center">Favorites</span>
                  <div className="flex items-center gap-1">
                    <Heart className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" />
                    <span className="font-medium text-base sm:text-lg">{product.favorites_count}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Section - Tabs */}
        <Tabs defaultValue="reviews" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto min-h-[2.5rem]">
            <TabsTrigger value="reviews" className="text-xs sm:text-sm py-2 px-2">
              Reviews & Ratings
            </TabsTrigger>
            <TabsTrigger value="shop" className="text-xs sm:text-sm py-2 px-2">
              Shop Information
            </TabsTrigger>
            <TabsTrigger value="seller" className="text-xs sm:text-sm py-2 px-2">
              Seller Details
            </TabsTrigger>
            <TabsTrigger value="reports" className="text-xs sm:text-sm py-2 px-2">
              Reports & Moderation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reviews" className="space-y-3 sm:space-y-4">
            <Card>
              <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
                <CardTitle className="text-base sm:text-lg">Customer Reviews</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  {product.reviews.length} total reviews • {averageRating.toFixed(1)} average rating • {product.favorites_count} favorites
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 py-3 sm:px-6 sm:py-4 space-y-3 sm:space-y-4">
                {product.reviews.map((review) => (
                  <div key={review.id} className="border-b pb-3 sm:pb-4 last:border-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-2">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3 h-3 ${
                              star <= review.rating
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs sm:text-sm font-medium">{review.customer || "Anonymous"}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm">{review.comment || "No comment provided"}</p>
                  </div>
                ))}
                {product.reviews.length === 0 && (
                  <p className="text-center text-muted-foreground py-6 sm:py-8 text-sm sm:text-base">
                    No reviews yet for this product.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="shop">
            <Card>
              <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Store className="w-4 h-4 sm:w-5 sm:h-5" />
                  Shop Information
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 py-3 sm:px-6 sm:py-4 space-y-3 sm:space-y-4">
                {product.shop ? (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                        <Store className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm sm:text-base break-words">{product.shop.name}</h3>
                        <div className="flex flex-col xs:flex-row xs:items-center gap-1 xs:gap-2 mt-1 flex-wrap">
                          <Badge variant={product.shop.verified ? "default" : "secondary"} className="w-fit">
                            {product.shop.verified ? "Verified" : "Unverified"}
                          </Badge>
                          <Badge variant={product.shop.is_suspended ? "destructive" : "outline"} className="w-fit">
                            {product.shop.is_suspended ? "Suspended" : "Active"}
                          </Badge>
                          <span className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{product.shop.city}, {product.shop.barangay}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <p className="text-xs sm:text-sm text-muted-foreground">Total Sales</p>
                        <p className="font-medium text-sm sm:text-base">₱{parseFloat(product.shop.total_sales).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm text-muted-foreground">Member Since</p>
                        <p className="font-medium text-xs sm:text-sm">
                          {new Date(product.shop.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-center text-muted-foreground py-6 sm:py-8 text-sm sm:text-base">
                    No shop information available.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="seller">
            <Card>
              <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <User className="w-4 h-4 sm:w-5 sm:h-5" />
                  Seller Details
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 py-3 sm:px-6 sm:py-4 space-y-3 sm:space-y-4">
                {product.customer ? (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm sm:text-base break-words">{product.customer.username || "Unknown User"}</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">{product.customer.contact_number || "No contact number"}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">{product.customer.email || "No email"}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <p className="text-xs sm:text-sm text-muted-foreground">Product Limit</p>
                        <p className="font-medium text-sm sm:text-base">{product.customer.product_limit} products</p>
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm text-muted-foreground">Current Products</p>
                        <p className="font-medium text-sm sm:text-base">{product.customer.current_product_count} products</p>
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm text-muted-foreground">Total Favorites</p>
                        <div className="flex items-center gap-1">
                          <Heart className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" />
                          <p className="font-medium text-sm sm:text-base">{product.favorites_count}</p>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-center text-muted-foreground py-6 sm:py-8 text-sm sm:text-base">
                    No seller information available.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <Card>
              <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                  Reports & Moderation
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 py-3 sm:px-6 sm:py-4 space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Active Reports</p>
                    <p className={`font-medium text-sm sm:text-base ${product.reports.active > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {product.reports.active} active
                    </p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Total Reports</p>
                    <p className="font-medium text-sm sm:text-base">{product.reports.total} total</p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Favorites Count</p>
                    <div className="flex items-center gap-1">
                      <Heart className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" />
                      <p className="font-medium text-sm sm:text-base">{product.favorites_count}</p>
                    </div>
                  </div>
                </div>
                
                {product.reports.total > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs sm:text-sm font-medium">Report Summary:</p>
                    <div className="text-xs sm:text-sm text-muted-foreground space-y-1">
                      <p>• {product.reports.active} active reports requiring attention</p>
                      <p>• {product.reports.total - product.reports.active} resolved reports</p>
                    </div>
                  </div>
                )}
                
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                    View All Reports
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                    Moderate Product
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Admin Actions - Desktop only, mobile has dropdown */}
        {!isMobile && availableActions.length > 0 && (
          <Card>
            <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
                Admin Actions
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Available actions based on product status: {product.upload_status} • {product.status} • {product.is_removed ? 'Removed' : 'Active'}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 py-3 sm:px-6 sm:py-4">
              <div className="flex gap-2 flex-wrap">
                {availableActions.map((action, index) => (
                  <Button
                    key={index}
                    variant={action.variant}
                    className="flex items-center gap-2 text-xs sm:text-sm"
                    onClick={() => handleActionClick(action.id)}
                    disabled={processing}
                    size="sm"
                  >
                    <action.icon className="w-3 h-3 sm:w-4 sm:h-4" />
                    {action.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Responsive Dialog */}
        {isMobile ? renderMobileDialog() : renderDesktopDialog()}
      </div>
    </UserProvider>
  );
}